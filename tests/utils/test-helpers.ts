// tests/utils/test-helpers.ts
import { DreamDB } from "@yakshith/dreamdb";
import { unlinkSync, existsSync } from "fs";
import { join } from "path";

export function getTestDbPath(name: string): string {
    return join(process.cwd(), `test-${name}.db`);
}

export function cleanupTestDb(path: string) {
    if (existsSync(path)) {
        unlinkSync(path);
    }
}

export async function createTestDb(name: string): Promise<DreamDB> {
    const path = getTestDbPath(name);
    cleanupTestDb(path);
    return new DreamDB({path});
}

export function generateTestData(count: number, generator: (i: number) => any): any[] {
    return Array.from({ length: count }, (_, i) => generator(i));
}