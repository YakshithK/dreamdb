import { DBConnector } from "./dbConnector.js";
import { VectorIndex } from "./vectorIndex.js";
import { embedText } from "./embedder.js";

export async function processQuery(
    query: string, 
    db: DBConnector,
    index: VectorIndex,
    top = 5
) {
    console.log("🔍 [DEBUG] Starting query:", query);
    
    // Check if embedder service is reachable
    const queryVec = await embedText(query);
    console.log("✅ [DEBUG] Query embedded, vector length:", queryVec.length);
    
    const candidates = index.search(queryVec, top*2);
    console.log("📊 [DEBUG] Candidates found:", candidates.length);
    console.log("📋 [DEBUG] Candidates:", JSON.stringify(candidates, null, 2));
    
    if (candidates.length === 0) {
        console.log("⚠️ [DEBUG] No candidates found! VectorIndex might be empty.");
        return [];
    }
    
    const rowIds = candidates.map((c: {id: string; score: number}) => c.id.split("_")[1]).filter((id): id is string => id !== undefined);
    console.log("🆔 [DEBUG] Extracted rowIds:", rowIds);
    
    const table = candidates[0]?.id.split("_")[0] || "unknown";
    console.log("📁 [DEBUG] Detected table:", table);
    
    const rows = db.fetchRowsByIds(table, rowIds);
    console.log("💾 [DEBUG] Rows fetched from DB:", rows.length);
    console.log("📄 [DEBUG] Rows:", JSON.stringify(rows, null, 2));
    
    const results = rows.map((r: any) => {
        // Use r.id instead of r.rowid since we're querying by 'id' column
        const semanticScore = candidates.find((c: {id: string; score: number}) => c.id.endsWith(r.id))?.score || 0;
        return {id: r.id, payload: r, score: semanticScore, explanation: "semantic match"};
    }).sort((a: any, b: any) => b.score - a.score).slice(0, top);
    
    console.log("🎯 [DEBUG] Final results:", results.length);
    return results;
}