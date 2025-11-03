// tests/integration/insert-query.test.ts
import { DreamDB } from "@yakshith/dreamdb";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { cleanupTestDb, getTestDbPath } from "../utils/test-helpers";

describe("Insert -> Query Integration", () => {
    const dbPath = getTestDbPath("integration");
    let db: DreamDB;

    beforeEach(async () => {
        db = new DreamDB({ path: dbPath });
    });

    afterEach(() => {
        cleanupTestDb(dbPath)
    })

    it("should find inserted record by semantic query", async () => {
        await db.insert("users", {
            name: "Alice", 
            role: "premium subscriber",
            lastActive: "2025-01-15"
        });

        const results = await db.query("premium users");
        expect(results.length).toBe(1);
        expect(results[0].payload.name).toBe("Alice");
    });

    it("should return top K results sorted by relevance", async () => {
        // Insert records with varying relevance
        await db.insert("products", { name: "Wireless Headphones", price: 99, category: "Electronics" });
        await db.insert("products", { name: "Bluetooth Speaker", price: 49, category: "Electronics" });
        await db.insert("products", { name: "Running Shoes", price: 79, category: "Sports" });
        
        const results = await db.query("audio equipment", 2);
        expect(results.length).toBe(2);
        // Headphones and speaker should rank higher than shoes
        expect(results[0].score).toBeGreaterThan(results[1].score);
    });
    
    it("should handle multiple tables independently", async () => {
        await db.insert("users", { name: "Alice", type: "user" });
        await db.insert("products", { name: "Product A", type: "product" });
        
        const userResults = await db.query("users");
        const productResults = await db.query("products");
        
        expect(userResults.length).toBeGreaterThan(0);
        expect(productResults.length).toBeGreaterThan(0);
    });
})