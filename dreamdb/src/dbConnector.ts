import Database from "better-sqlite3";
import crypto from "crypto";

export class DBConnector { 
    db: Database;

    constructor(connectionString: string) {
        this.db = new Database(connectionString);

        // metadata table to store embeddings
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS dreamdb_meta (
              table_name TEXT,
              row_id TEXT,
              vector BLOB,
              fingerprint TEXT,
              PRIMARY KEY (table_name, row_id)
            )
        `);
    }

    insert(table: string, rowId: string, row: any) {
        const payload = JSON.stringify(row);
        const fingerprint = crypto.createHash('sha256').update(payload).digest('hex');

        // insert rows into user db
        const keys = Object.keys(row).join(", ");
        const placeholders = Object.keys(row).map(() => "?").join(", ")
        const values = Object.values(row);

        this.db.prepare(`INSERT or REPLACE INTO ${table} (${keys}) VALUES (${placeholders})`).run(values);

        return fingerprint;
    }

    fetchRowsByIds(table: string, rowIds: string[]) {
        if (rowIds.length === 0) return [];
        const placeholders = rowIds.map(() => "?").join(", ");
        const stmt = this.db.prepare(`SELECT rowid as id, * FROM ${table} WHERE rowid IN (${placeholders})`);
        return stmt.all(...rowIds);
    }
}