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

    const rowIds = candidates.map((c: {id: string; score: number}) => c.id.split("_")[1]).filter((id): id is string => id !== undefined);
    const table = candidates[0]?.id.split("_")[0] || "unknown";
    const rows = db.fetchRowsByIds(table, rowIds);

    return rows.map((r: any) => {
        const semanticScore = candidates.find((c: {id: string; score: number}) => c.id.endsWith(r.rowid))?.score || 0;
        return {id: r.rowid, payload: r, score: semanticScore, explanation: "semantic match"};
    }).sort((a: any, b: any) => b.score - a.score).slice(0, top);
}