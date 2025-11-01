import fetch from "node-fetch";

// Get embedder URL from environment variable or default to localhost
const EMBEDDER_URL = process.env.EMBEDDER_URL || "http://localhost:6789";

export async function embedText(text: string): Promise<number[]> {
    const url = `${EMBEDDER_URL}/embed`;
    
    try {
        const res = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                text: [text],  // Service expects array
            }),
        });

        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`Failed to embed text: ${res.statusText} - ${errorText}`);
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
    } catch (error) {
        if (error instanceof TypeError && error.message.includes("fetch")) {
            throw new Error(`Cannot connect to embedder service at ${url}. Is it running?`);
        }
        throw error;
    }
}

export function rowToText(row: any): string {
    return Object.entries(row).map(([k, v]) => `${k}: ${v}`).join("; ");
}