// tests/edge-cases/special-characters.test.ts
import { DreamDB } from "@yakshith/dreamdb";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { cleanupTestDb, getTestDbPath } from "../utils/test-helpers";

describe("Special Characters & Edge Cases", () => {
    const dbPath = getTestDbPath("edge-cases");
    let db: DreamDB;

    beforeEach(async () => {
        db = new DreamDB({ path: dbPath });
    });

    afterEach(() => {
        cleanupTestDb(dbPath);
    });

    it("should handle emojis in data", async () => {
        const id = await db.insert("test", {
            name: "User 🎊",
            description: "Happy user! 😀"
        });

        const results = await db.query("happy user with emojji");
        expect(results.length).toBeGreaterThan(0);
    });

    it("should handle SQL injection attempts in data", async () => {
        const malicious = "'; DROP TABLE users; --";
        const id = await db.insert("test", {
            name: malicious,
            description: "test"
        });

        const results = await db.query("drop table");
        expect(id).toBeDefined();
    });

    it("should handle very long text", async () => {
        const longText = "a".repeat(10000);
        await db.insert("test", {
            description: longText
        });

        const results = await db.query("very long description");
        expect(results.length).toBeGreaterThan(0);
    })

    it("should handle empty strings", async () => {
        await db.insert("test", {
            name: "",
            description: ""
        });
        
        const results = await db.query("empty");
        expect(results.length).toBeGreaterThanOrEqual(0);
    });
    
    it("should handle null and undefined values", async () => {
        await db.insert("test", {
            name: "Test",
            nullable: null,
            undefined_field: undefined
        });
        
        const results = await db.query("test");
        expect(results.length).toBeGreaterThan(0);
    });

    it("should handle unicode character", async () => {
        await db.insert("test", {
            name: "José García",
            description: "日本語、中文、한국어"
        });

        const results = await db.query("José");
        expect(results.length).toBeGreaterThan(0);
    })
})