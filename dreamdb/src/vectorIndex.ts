export class VectorIndex {
    vectors: Map<string, number[]> = new Map();

    add(rowId: string, vector: number[]) {
        this.vectors.set(rowId, vector);
    }

    search(queryVec: number[], topK: number = 5) {
        console.log("🔍 [DEBUG] VectorIndex.search - vectors in index:", this.vectors.size);
        
        const results: Array<{id: string; score: number }> = [];

        for (const [id, vec] of this.vectors.entries()) {
            const score = cosine(queryVec, vec);
            results.push({id, score});
        }

        results.sort((a, b) => b.score - a.score);
        const topResults = results.slice(0, topK);
        console.log("📊 [DEBUG] Top results:", topResults.map(r => ({ id: r.id, score: r.score.toFixed(4) })));
        
        return topResults;
    }
}

function cosine(a: number[], b: number[]): number {
    let dot = 0,
        na = 0,
        nb = 0;

    for (let i = 0; i < a.length; i++) {
        const aVal = a[i] ?? 0;
        const bVal = b[i] ?? 0;
        dot += aVal * bVal;
        na += aVal * aVal;
        nb += bVal * bVal;
    }

    return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-12);
}