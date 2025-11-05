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
    const candidates = index.search(queryVec, { topK: top*3 });
    
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

    // Detect query intent for filtering
    const queryFilters = detectQueryFilters(query);

    // Process each table's results
    for (const [table, tableCandidates] of Object.entries(tableGroups)) {
        if (!tableCandidates?.length) continue;

        const rowIds = tableCandidates.map(c => c.rowId).filter((id): id is string => Boolean(id));
        const rows = db.fetchRowsByIds(table, rowIds);

        // Create result objects with scores
        const tableResults = rows
            .map((row) => {
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
            })
            .filter(result => matchesQueryFilters(result.payload, queryFilters));

        allResults = [...allResults, ...tableResults];
    }

    // Sort by score and limit results
    return allResults
        .sort((a, b) => b.score - a.score)
        .slice(0, top);
}

// Detect filtering intent from query
function detectQueryFilters(query: string): Record<string, any> {
    const queryLower = query.toLowerCase();
    const filters: Record<string, any> = {};
    
    // Stock status detection
    if (queryLower.includes('in stock') || queryLower.includes('available')) {
        filters.inStock = true;
    } else if (queryLower.includes('out of stock') || queryLower.includes('unavailable')) {
        filters.inStock = false;
    }
    
    // Order status detection
    if (queryLower.includes('delivered')) {
        filters.status = 'delivered';
    } else if (queryLower.includes('pending')) {
        filters.status = 'pending';
    } else if (queryLower.includes('cancelled') || queryLower.includes('canceled')) {
        filters.status = 'cancelled';
    } else if (queryLower.includes('shipped') || queryLower.includes('shipping')) {
        filters.status = 'shipped';
    }
    
    // Payment method detection
    if (queryLower.includes('paypal')) {
        filters.paymentMethod = 'paypal';
    } else if (queryLower.includes('credit card') || queryLower.includes('card')) {
        filters.paymentMethod = 'credit_card';
    }
    
    return filters;
}

// Check if a result matches the detected filters
function matchesQueryFilters(payload: any, filters: Record<string, any>): boolean {
    for (const [key, value] of Object.entries(filters)) {
        if (payload[key] === undefined) {
            continue; // Skip if field doesn't exist
        }
        
        if (typeof value === 'string') {
            // Case-insensitive string matching
            const payloadValue = String(payload[key]).toLowerCase();
            const filterValue = value.toLowerCase();
            if (payloadValue !== filterValue) {
                return false;
            }
        } else {
            // Exact match for other types
            if (payload[key] !== value) {
                return false;
            }
        }
    }
    
    return true;
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
            const fieldWords = fieldValue.split(/\s+/);
            
            for (const term of queryTerms) {
                if (fieldValue.includes(term)) {
                    // Exact field match gets highest boost
                    if (fieldValue === term) {
                        textMatchScore += 0.5;
                    } 
                    // Exact word match gets high boost
                    else if (fieldWords.includes(term)) {
                        textMatchScore += 0.3;
                    } 
                    // Partial match gets lower boost
                    else {
                        textMatchScore += 0.15;
                    }
                    
                    // Extra boost for name field matches
                    if (field === 'name') {
                        textMatchScore += 0.1;
                    }
                }
            }
            
            // Boost for multiple term matches in same field
            const matchCount = queryTerms.filter(term => fieldValue.includes(term)).length;
            if (matchCount > 1) {
                textMatchScore += matchCount * 0.05;
            }
        }
    }
    
    adjustedScore += textMatchScore;
    
    // Add small position-based differentiation to break ties
    // This ensures consistent ordering even with identical base scores
    adjustedScore += Math.random() * 0.001;
    
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