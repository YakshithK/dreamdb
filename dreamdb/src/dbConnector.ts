import Database from "better-sqlite3";
import crypto from "crypto";

export class DBConnector { 
    db: Database.Database;

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
        // Ensure table exists, create it if it doesn't
        this.ensureTable(table, row);

        const payload = JSON.stringify(row);
        const fingerprint = crypto.createHash('sha256').update(payload).digest('hex');

        // insert rows into user db
        const keys = Object.keys(row).join(", ");
        const placeholders = Object.keys(row).map(() => "?").join(", ")
        const values = Object.values(row);

        this.db.prepare(`INSERT or REPLACE INTO ${table} (${keys}) VALUES (${placeholders})`).run(values);

        return fingerprint;
    }

    private ensureTable(table: string, sampleRow: any) {
        // Check if table exists
        const tableExists = this.db.prepare(`
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name=?
        `).get(table);

        if (!tableExists) {
            // Create table based on sample row
            const columns = Object.entries(sampleRow).map(([key, value]) => {
                let type = 'TEXT';
                if (typeof value === 'number') {
                    type = Number.isInteger(value) ? 'INTEGER' : 'REAL';
                } else if (typeof value === 'boolean') {
                    type = 'INTEGER';
                } else if (value === null || value === undefined) {
                    type = 'TEXT';
                }
                // Make id column PRIMARY KEY if it exists
                const pk = key === 'id' ? ' PRIMARY KEY' : '';
                return `${key} ${type}${pk}`;
            }).join(', ');

            this.db.exec(`CREATE TABLE IF NOT EXISTS ${table} (${columns})`);
        }
    }

    fetchRowsByIds(table: string, rowIds: string[]) {
        if (rowIds.length === 0) return [];
        const placeholders = rowIds.map(() => "?").join(", ");
        // Query by 'id' column instead of 'rowid' since we use UUIDs
        const stmt = this.db.prepare(`SELECT id, * FROM ${table} WHERE id IN (${placeholders})`);
        return stmt.all(...rowIds);
    }
}