// tests/functional/orders-crm.test.ts
import { DreamDB } from "@yakshith/dreamdb";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { cleanupTestDb, getTestDbPath } from "../utils/test-helpers";

describe("Orders & CRM Functional Tests", () => {
    const dbPath = getTestDbPath("orders-crm");
    let db: DreamDB;

    beforeEach(async () => {
        db = new DreamDB({ path: dbPath });

        // Seed orders data
        await db.insert("orders", {
            orderId: "ORD-001",
            userId: "user-123",
            productId: "prod-456",
            quantity: 2,
            total: 299.98,
            status: "delivered",
            orderDate: "2025-01-10",
            shippingAddress: "123 Main St, San Francisco, CA",
            paymentMethod: "credit_card"
        });

        await db.insert("orders", {
            orderId: "ORD-002",
            userId: "user-456",
            productId: "prod-789",
            quantity: 1,
            total: 89.99,
            status: "pending",
            orderDate: "2025-01-14",
            shippingAddress: "456 Oak Ave, New York, NY",
            paymentMethod: "paypal"
        });

        await db.insert("orders", {
            orderId: "ORD-003",
            userId: "user-123",
            productId: "prod-101",
            quantity: 3,
            total: 449.97,
            status: "shipped",
            orderDate: "2025-01-12",
            shippingAddress: "123 Main St, San Francisco, CA",
            paymentMethod: "credit_card"
        });

        await db.insert("orders", {
            orderId: "ORD-004",
            userId: "user-789",
            productId: "prod-456",
            quantity: 1,
            total: 149.99,
            status: "cancelled",
            orderDate: "2025-01-08",
            shippingAddress: "789 Pine Rd, Los Angeles, CA",
            paymentMethod: "credit_card"
        });
    });

    afterEach(() => {
        cleanupTestDb(dbPath);
    });

    it("should find delivered orders", async () => {
        const results = await db.query("orders that were delivered", 10);
        
        expect(results.length).toBeGreaterThan(0);
        const allDelivered = results.every(r => r.payload.status === "delivered");
        expect(allDelivered).toBe(true);
    });

    it("should find pending orders that need processing", async () => {
        const results = await db.query("pending orders that need processing", 10);
        
        expect(results.length).toBeGreaterThan(0);
        const allPending = results.every(r => r.payload.status === "pending");
        expect(allPending).toBe(true);
    });

    it("should find high value orders", async () => {
        const results = await db.query("expensive orders with high total amount", 10);
        
        expect(results.length).toBeGreaterThan(0);
        // Should prioritize higher totals
        const totals = results.map(r => r.payload.total);
        expect(Math.max(...totals)).toBeGreaterThan(200);
    });

    it("should find recent orders", async () => {
        const results = await db.query("recent orders from this week", 10);
        
        expect(results.length).toBeGreaterThan(0);
        // Should find orders from recent dates
        expect(results[0].payload.orderDate).toBeDefined();
    });

    it("should find orders by shipping location", async () => {
        const results = await db.query("orders shipping to San Francisco California", 10);
        
        expect(results.length).toBeGreaterThan(0);
        const hasSFOrders = results.some(r => 
            r.payload.shippingAddress?.toLowerCase().includes("san francisco")
        );
        expect(hasSFOrders).toBe(true);
    });

    it("should find cancelled orders", async () => {
        const results = await db.query("cancelled or refunded orders", 10);
        
        expect(results.length).toBeGreaterThan(0);
        const allCancelled = results.every(r => r.payload.status === "cancelled");
        expect(allCancelled).toBe(true);
    });

    it("should find orders by payment method", async () => {
        const results = await db.query("orders paid with PayPal", 10);
        
        expect(results.length).toBeGreaterThan(0);
        const allPayPal = results.every(r => 
            r.payload.paymentMethod?.toLowerCase() === "paypal"
        );
        expect(allPayPal).toBe(true);
    });
});