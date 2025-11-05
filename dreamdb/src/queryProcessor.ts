import { DBConnector } from "./dbConnector.js";
import { VectorIndex } from "./vectorIndex.js";
import { embedText } from "./embedder.js";
import type { SearchResult, SearchCandidate } from "./types.js";

export async function processQuery(
    query: string, 
    db: DBConnector,
    index: VectorIndex,
    top = 5
): Promise<SearchResult[]> {
    const queryVec = await embedText(query);
    const candidates = index.search(queryVec, { topK: top*2 });
    
    if (candidates.length === 0) {
        return [];
    }

    const tableGroups = candidates.reduce<Record<string, Array<SearchCandidate & { rowId: string }>>>((acc, candidate) => {
        const [table, rowId] = candidate.id.split('_');
        if (!table || !rowId) return acc;
        
        if (!acc[table]) {
            acc[table] = [];
        }
        acc[table].push({ ...candidate, rowId });
        return acc;
    }, {});

    let allResults: SearchResult[] = [];

    // Process each table's results
    for (const [table, tableCandidates] of Object.entries(tableGroups)) {
        if (!tableCandidates?.length) continue;

        const rowIds = tableCandidates.map(c => c.rowId).filter((id): id is string => Boolean(id));
        const rows = db.fetchRowsByIds(table, rowIds);

        // Create result objects with scores
        const tableResults = rows.map((row) => {
            const candidate = (tableCandidates as any[]).find(c => c.rowId === row.id);
            const score = candidate?.score || 0;
            
            // Apply business logic based on query context
            const explanation = getExplanation(query, row, score);
            
            return {
                id: row.id,
                payload: row,
                score: calculateAdjustedScore(query, row, score),
                explanation
            };
        });

        allResults = [...allResults, ...tableResults];
    }

    // Sort by score and limit results
    return allResults
        .sort((a, b) => b.score - a.score)
        .slice(0, top);
}

// Helper function to generate explanation for search results
function getExplanation(query: string, row: any, baseScore: number): string {
    const explanations: string[] = [];
    
    // Add semantic match explanation
    if (baseScore > 0.7) {
        explanations.push("excellent semantic match");
    } else if (baseScore > 0.4) {
        explanations.push("good semantic match");
    } else {
        explanations.push("partial semantic match");
    }

    // Add business-specific explanations
    if (row.inStock === false) {
        explanations.push("currently out of stock");
    }
    
    if (row.rating > 4.5) {
        explanations.push("highly rated product");
    } else if (row.rating > 4.0) {
        explanations.push("well-rated product");
    }

    return explanations.join(", ");
}

// Helper function to adjust scores based on business rules
function calculateAdjustedScore(query: string, row: any, baseScore: number): number {
    let adjustedScore = baseScore;
    const queryLower = query.toLowerCase();
    const queryTerms = queryLower.split(/\s+/).filter(Boolean);
    
    // Add text matching bonus for better differentiation
    let textMatchScore = 0;
    const searchableFields = ['name', 'description', 'title', 'category', 'brand'];
    
    for (const field of searchableFields) {
        if (row[field] && typeof row[field] === 'string') {
            const fieldValue = row[field].toLowerCase();
            for (const term of queryTerms) {
                if (fieldValue.includes(term)) {
                    // Exact match gets higher boost
                    if (fieldValue === term) {
                        textMatchScore += 0.3;
                    } else if (fieldValue.split(/\s+/).includes(term)) {
                        textMatchScore += 0.2;
                    } else {
                        textMatchScore += 0.1;
                    }
                }
            }
        }
    }
    
    adjustedScore += textMatchScore;
    
    // Boost in-stock items
    if (row.inStock === true) {
        adjustedScore *= 1.15;
    } else if (row.inStock === false) {
        adjustedScore *= 0.8;
    }
    
    // Boost highly rated items
    if (row.rating && typeof row.rating === 'number') {
        adjustedScore *= (0.95 + (row.rating / 20));
    }
    
    // Apply category-specific boosts
    if (row.category && queryTerms.some(term => row.category.toLowerCase().includes(term))) {
        adjustedScore *= 1.25;
    }
    
    // Status-based filtering/boosting
    if (row.status) {
        const statusLower = row.status.toLowerCase();
        if (queryTerms.some(term => statusLower.includes(term))) {
            adjustedScore *= 1.3;
        }
    }
    
    // Payment method matching
    if (row.paymentMethod && queryTerms.some(term => 
        row.paymentMethod.toLowerCase().includes(term)
    )) {
        adjustedScore *= 1.3;
    }
    
    return Math.max(0, adjustedScore);
}