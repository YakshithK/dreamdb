import { DreamDB } from "../src/index.js";
async function demo() {
    try {
        const db = await DreamDB.connect({ connectionString: "./demo/database.sqlite" });
        console.log("✅ Connected to database");
        // Check if index is empty (it will be on first run)
        console.log("📊 Vectors in index before insert:", db.index.vectors.size);
        // Insert new row
        console.log("\n➕ Inserting Charlie...");
        const rowId = await db.insert("users", { name: "Charlie", last_active: "2025-10-10", notes: "Paused 2 months" });
        console.log("✅ Inserted with rowId:", rowId);
        console.log("📊 Vectors in index after insert:", db.index.vectors.size);
        // Ask
        console.log("\n🔍 Querying...");
        const res = await db.ask("users who took a multi-month break");
        console.log("\n📋 Final Results:");
        console.log(JSON.stringify(res, null, 2));
    }
    catch (error) {
        console.error("❌ Error:", error);
        if (error instanceof Error) {
            console.error("Message:", error.message);
            console.error("Stack:", error.stack);
        }
    }
}
demo();
//# sourceMappingURL=demo.js.map