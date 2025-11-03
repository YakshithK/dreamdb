// tests/functional/ecommerce.test.ts
import { DreamDB } from "@yakshith/dreamdb";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import faker from "faker";
import { cleanupTestDb, getTestDbPath } from "../utils/test-helpers";

describe("E-commerce Functional Tests", () => {
    const dbPath = getTestDbPath("ecommerce");
    let db: DreamDB;

    beforeEach(async () => {
        db = new DreamDB({ path: dbPath });
        
        // Seed e-commerce data
        await db.insert("products", {
            name: "Wireless Bluetooth Headphones",
            brand: "Sony",
            price: 149.99,
            category: "Electronics",
            description: "Premium noise-cancelling wireless headphones with 30-hour battery",
            inStock: true,
            rating: 4.5,
            reviewCount: 1250
        });

        await db.insert("products", {
            name: "Running Athletic Shoes",
            brand: "Nike",
            price: 89.99,
            category: "Sports",
            description: "Lightweight running shoes with cushioned sole for long-distance running",
            inStock: true,
            rating: 4.7,
            reviewCount: 890
        });

        await db.insert("products", {
            name: "Mechanical Gaming Keyboard",
            brand: "Corsair",
            price: 129.99,
            category: "Electronics",
            description: "RGB mechanical keyboard with Cherry MX switches for gaming",
            inStock: false,
            rating: 4.3,
            reviewCount: 567
        });

        await db.insert("products", {
            name: "Yoga Mat Premium",
            brand: "Lululemon",
            price: 68.00,
            category: "Sports",
            description: "Non-slip yoga mat with extra cushioning for comfort",
            inStock: true,
            rating: 4.6,
            reviewCount: 432
        });
    });

    afterEach(() => {
        cleanupTestDb(dbPath);
    });

    it("should find audio equipment when searching for headphones", async () => {
        const results = await db.query("audio equipment headphones", 5);
        
        expect(results.length).toBeGreaterThan(0);
        const headphones = results.find(r => r.payload.name.includes("Headphones"));
        expect(headphones).toBeDefined();
        expect(headphones!.payload.category).toBe("Electronics");
    });

    it("should find sports equipment with athletic search terms", async () => {
        const results = await db.query("athletic sports equipment", 5);
        
        expect(results.length).toBeGreaterThan(0);
        const hasSportsItems = results.some(r => 
            r.payload.category === "Sports"
        );
        expect(hasSportsItems).toBe(true);
    });

    it("should find expensive premium products", async () => {
        const results = await db.query("premium expensive products", 5);
        
        expect(results.length).toBeGreaterThan(0);
        // Should prioritize higher-priced items
        const prices = results.map(r => r.payload.price);
        expect(Math.max(...prices)).toBeGreaterThan(100);
    });

    it("should find products that are in stock", async () => {
        const results = await db.query("available products in stock", 5);
        
        expect(results.length).toBeGreaterThan(0);
        const allInStock = results.every(r => r.payload.inStock === true);
        expect(allInStock).toBe(true);
    });

    it("should find highly rated products", async () => {
        const results = await db.query("best rated top products", 5);
        
        expect(results.length).toBeGreaterThan(0);
        // Results should be sorted by relevance/rating
        expect(results[0].score).toBeGreaterThan(0);
    });

    it("should handle complex product searches", async () => {
        const results = await db.query("gaming peripherals for PC", 5);
        
        // Should find keyboard which is gaming-related
        const hasGaming = results.some(r => 
            r.payload.name.toLowerCase().includes("gaming") ||
            r.payload.description.toLowerCase().includes("gaming")
        );
        expect(hasGaming).toBe(true);
    });
});