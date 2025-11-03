// tests/stress/large-dataset.test.ts
import { DreamDB } from "@yakshith/dreamdb";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import faker from "faker";
import { cleanupTestDb, getTestDbPath } from "../utils/test-helpers";

describe("Large Dataset Stress tests", () => {
    const dbPath = getTestDbPath("large-dataset");
    let db: DreamDB;

    beforeAll(async () => {
        db = new DreamDB({ path: dbPath });
    });

    afterAll (() => {
        cleanupTestDb(dbPath);
    });

    it("should insert 10,000 records", async () => {
        const start = Date.now();
        const promises = [];

        for (let i = 0; i < 10000; i ++) {
            promises.push(
                db.insert("users", {
                    name: faker.name.findName(),
                    email: faker.internet.email(),
                    age: faker.datatype.number({ min: 18, max: 80})
                })
            )
        }

        const ids = await Promise.all(promises);
        const duration = Date.now() - start;

        expect(ids).toHaveLength(10000);
        expect(db.index.vectors.size).toBe(10000);
        expect(duration).toBeLessThan(120000);

        console.log(`Inserted 10,000 records in ${duration}ms (${(1000 / (duration / 1000)).toFixed(2)} inserts/sec)`);
    })

    it("should query efficiently with 10,000 records", async () => {
        const start = Date.now();
        const results = await db.query("active users", 10);
        const duration = Date.now() - start;

        expect(results).toHaveLength(10);
        expect(duration).toBeLessThan(5000);
        console.log(`Query over 10,000 records took ${duration}ms`);
    });

    it ("should handle concurrent inserts", async () => {
        const concurrent = 100;
        const perBatch = 50;

        const batches = Array.from({  length: concurrent }, () =>
            Array.from({ length: perBatch }, () => 
                db.insert("concurrent", {
                    name: faker.name.findName(),
                    value: faker.datatype.number()
                })
            )
        );

        const start = Date.now();
        await Promise.all(batches.map(batch => Promise.all(batch)));
        const duration = Date.now() - start;

        expect(db.index.vectors.size).toBeGreaterThanOrEqual(concurrent * perBatch);
        console.log(`Concurrent inserts (${concurrent}x${perBatch}) completed in ${duration}ms`);
    });
});