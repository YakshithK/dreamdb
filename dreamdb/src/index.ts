import { DBConnector } from "./dbConnector.js";
import { VectorIndex } from "./vectorIndex.js";
import { embedText, rowToText } from "./embedder.js";
import { processQuery } from "./queryProcessor.js";
import crypto from "crypto";

export class DreamDB {
    db!: DBConnector;
    index!: VectorIndex;

    static async connect (opts: { connectionString: string}) {
        const instance = new DreamDB();
        instance.db = new DBConnector(opts.connectionString);
        instance.index = new VectorIndex();
        return instance
    }

    async insert(table: string, row: any) {
        const rowId = row.id || crypto.randomUUID();
        const fingerprint = this.db.insert(table, rowId, row);

        const text = rowToText(row);
        const vec = await embedText(text);
        this.index.add(`${table}_${rowId}`, vec);

        return rowId;
    }

    async ask(query: string, top = 5) {
        return processQuery(query, this.db, this.index, top);
    }
}