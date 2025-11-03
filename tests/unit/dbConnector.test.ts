// tests/unit/dbConnector.test.ts
import { DBConnector } from "../../dreamdb/src/dbConnector";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { cleanupTestDb, getTestDbPath } from "../utils/test-helpers";

describe("DBConnector", () => {
    const dbPath = getTestDbPath("dbconnector-unit");

    beforeEach(() => cleanupTestDb(dbPath));
    afterEach(() => cleanupTestDb(dbPath));

    it("should create database file", () => {
        const connector = new DBConnector(dbPath);
        expect(connector).toBeDefined();
    });

    it('should auto-create table on first insert', () => {
        const connector = new DBConnector(dbPath);
        const row = { id: "test-1", name: "Test", age: 25};
        connector.insert("users", "test-1", row);

        const result = connector.fetchRowsByIds("users", ["test-1"]);
        expect(result).toEqual([row]);
        expect(result[0].id).toBe("test-1");
    });

    it("should infer correct SQLite types", () => {
        const connector = new DBConnector(dbPath);
        const row = {
            id: "test-1", 
            name: "Text", 
            age: 30,
            price: 99.99,
            isActive: true,
            nullable: null
        };
        connector.insert("test", "test-1", row);

        const result = connector.fetchRowsByIds("test", ["test-1"]);
        expect(result[0].age).toBe(30);
        expect(result[0].price).toBe(99.99);
    });

    it("should handle empty rowIds array", () => {
        const connector = new DBConnector(dbPath);
        const result = connector.fetchRowsByIds("users", []);
        expect(result).toEqual([]);
    });

    it("should update existing row with same ID", () => {
        const connector = new DBConnector(dbPath);
        connector.insert("users", "test-1", { id: "test-1", name: "Old" });
        connector.insert("users", "test-1", { id: "test-1", name: "New"});

        const result = connector.fetchRowsByIds("users", ["test-1"]);
        expect(result[0].name).toBe("New")
    })
})