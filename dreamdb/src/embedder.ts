import fetch from "node-fetch";

export async function embedText(text: string): Promise<number[]> {
    const res = await fetch("http://localhost:6789/embed", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            text: [text],  // Service expects array
        }),
    });

    if (!res.ok) {
        throw new Error(`Failed to embed text: ${res.statusText}`);
    }

    const data = await res.json() as { vectors: number[][] };
    const vector = data.vectors[0];
    if (!vector) {
        throw new Error("No vector returned from embedder service");
    }
    if (!Array.isArray(vector) || vector.length === 0) {
        throw new Error(`Invalid vector format: expected array, got ${typeof vector}`);
    }
    return vector;
}

export function rowToText(row: any): string {
    return Object.entries(row).map(([k, v]) => `${k}: ${v}`).join("; ");
}