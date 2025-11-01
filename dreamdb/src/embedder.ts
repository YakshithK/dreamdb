import fetch from "node-fetch";

// Get embedder URL from environment variable or default to localhost
const EMBEDDER_URL = process.env.EMBEDDER_URL || "https://dreamdb-embedder-service.onrender.com";

export async function embedText(text: string): Promise<number[]> {
    const url = `${EMBEDDER_URL}/embed`;
    console.log(`🔗 [DEBUG] Calling embedder at: ${url}`);
    
    try {
        // Create AbortController for 2 minute timeout (model loading can take 60s+)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minutes
        
        const res = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                text: [text],  // Service expects array
            }),
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!res.ok) {
            const errorText = await res.text();
            console.error(`❌ [DEBUG] Embedder error ${res.status}: ${errorText}`);
            
            // Better error messages
            if (res.status === 502) {
                throw new Error(`Bad Gateway - Service might be loading the model. This can take 60+ seconds on first request. Please try again in a minute.`);
            }
            if (res.status === 503) {
                throw new Error(`Service Unavailable - Service is temporarily down or spinning up.`);
            }
            if (res.status === 504) {
                throw new Error(`Gateway Timeout - Request took too long. Model might be loading.`);
            }
            
            throw new Error(`Failed to embed text: ${res.statusText} (${res.status}) - ${errorText}`);
        }

        const data = await res.json() as { vectors: number[][] };
        const vector = data.vectors[0];
        if (!vector) {
            throw new Error("No vector returned from embedder service");
        }
        if (!Array.isArray(vector) || vector.length === 0) {
            throw new Error(`Invalid vector format: expected array, got ${typeof vector}`);
        }
        
        console.log(`✅ [DEBUG] Successfully got vector of length: ${vector.length}`);
        return vector;
    } catch (error) {
        if (error instanceof Error) {
            if (error.name === 'AbortError') {
                throw new Error(`Request to ${url} timed out after 2 minutes. The model might still be loading. Check Render logs.`);
            }
            if (error.message.includes("fetch")) {
                throw new Error(`Cannot connect to embedder service at ${url}. Is it running?`);
            }
        }
        throw error;
    }
}

export function rowToText(row: any): string {
    return Object.entries(row).map(([k, v]) => `${k}: ${v}`).join("; ");
}