import fetch from "node-fetch";

const EMBEDDER_URL = "https://dreamdb-embedder-service.onrender.com";

async function testEmbedder() {
    console.log(`\n🧪 Testing embedder service at: ${EMBEDDER_URL}\n`);
    
    // 1. Test health
    try {
        console.log("1️⃣ Testing /health endpoint...");
        const healthRes = await fetch(`${EMBEDDER_URL}/health`, {
            signal: AbortSignal.timeout(10000) // 10 second timeout
        });
        const healthData = await healthRes.json();
        console.log(`✅ Health check passed:`, healthData);
    } catch (error) {
        console.error("❌ Health check failed:", error);
        return;
    }
    
    // 2. Test embed (this will be slow on first call)
    try {
        console.log("\n2️⃣ Testing /embed endpoint (this may take 60+ seconds on first call)...");
        console.log("   Model needs to load - please be patient...\n");
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minutes
        
        const embedRes = await fetch(`${EMBEDDER_URL}/embed`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: ["hello world"] }),
            signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        if (!embedRes.ok) {
            const errorText = await embedRes.text();
            console.error(`❌ Embed failed (${embedRes.status}):`, errorText);
            return;
        }
        
        const embedData = await embedRes.json();
        console.log(`✅ Embed successful!`);
        console.log(`   Vector length: ${embedData.vectors[0]?.length || 0}`);
        console.log(`   First 5 values:`, embedData.vectors[0]?.slice(0, 5));
    } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
            console.error("❌ Request timed out after 2 minutes. Check Render logs to see if model is loading.");
        } else {
            console.error("❌ Embed test failed:", error);
        }
    }
}

testEmbedder();
