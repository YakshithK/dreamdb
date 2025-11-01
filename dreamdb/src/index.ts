import { DBConnector } from "./dbConnector.js";
import { VectorIndex } from "./vectorIndex.js";
import { embedText, rowToText } from "./embedder.js";
import { processQuery } from "./queryProcessor.js";
import crypto from "crypto";

export class DreamDB {
    db!: DBConnector;
    index!: VectorIndex;

    constructor(opts?: { connectionString?: string; path?: string }) {
        if (opts) {
            const connectionString = opts.connectionString || opts.path || ":memory:";
            this.db = new DBConnector(connectionString);
            this.index = new VectorIndex();
        }
    }

    static async connect (opts: { connectionString: string}) {
        const instance = new DreamDB();
        instance.db = new DBConnector(opts.connectionString);
        instance.index = new VectorIndex();
        return instance
    }

    async insert(table: string, row: any) {
        const rowId = row.id || crypto.randomUUID();
        console.log("➕ [DEBUG] Inserting into table:", table, "rowId:", rowId);
        
        // Ensure id is included in the row object for database insertion
        const rowWithId = { ...row, id: rowId };
        const fingerprint = this.db.insert(table, rowId, rowWithId);
        console.log("✅ [DEBUG] Row inserted into SQLite");

        const text = rowToText(rowWithId);
        console.log("📝 [DEBUG] Row text:", text);
        
        const vec = await embedText(text);
        console.log("🔢 [DEBUG] Vector created, length:", vec.length);
        
        const vectorKey = `${table}_${rowId}`;
        this.index.add(vectorKey, vec);
        console.log("💾 [DEBUG] Vector stored with key:", vectorKey);
        console.log("📊 [DEBUG] Total vectors in index:", this.index.vectors.size);

        return rowId;
    }

    async ask(query: string, top = 5) {
        return processQuery(query, this.db, this.index, top);
    }

    async query(query: string, top = 5) {
        return this.ask(query, top);
    }
}