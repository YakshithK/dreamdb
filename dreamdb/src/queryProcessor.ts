import { DBConnector } from "./dbConnector.js";
import { VectorIndex } from "./vectorIndex.js";
import { embedText } from "./embedder.js";

export async function processQuery(
    query: string, 
    db: DBConnector,
    index: VectorIndex,
    top = 5
) {
    const queryVec = await embedText(query);
    const candidates = index.search(queryVec, top*2);
    
    if (candidates.length === 0) {
        return [];
    }
    
    const rowIds = candidates.map((c: {id: string; score: number}) => c.id.split("_")[1]).filter((id): id is string => id !== undefined);
    const table = candidates[0]?.id.split("_")[0] || "unknown";
    const rows = db.fetchRowsByIds(table, rowIds);
    
    const results = rows.map((r: any) => {
        // Use r.id instead of r.rowid since we're querying by 'id' column
        const semanticScore = candidates.find((c: {id: string; score: number}) => c.id.endsWith(r.id))?.score || 0;
        return {id: r.id, payload: r, score: semanticScore, explanation: "semantic match"};
    }).sort((a: any, b: any) => b.score - a.score).slice(0, top);
    
    return results;
}