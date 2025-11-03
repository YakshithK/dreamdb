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
        // Validate input
        if (!table || !row) {
            throw new Error('Table name and row data are required');
        }

        // Sanitize table name
        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(table)) {
            throw new Error('Invalid table name');
        }

        // Ensure table exists with proper schema
        this.ensureTable(table, row);

        // Sanitize and prepare data
        const sanitizedRow = this.sanitizeData(row);
        const payload = JSON.stringify(sanitizedRow);
        const fingerprint = crypto.createHash('sha256').update(payload).digest('hex');

        // Build and execute the query
        const keys = Object.keys(sanitizedRow);
        const placeholders = keys.map(() => '?').join(', ');
        const values = keys.map(key => {
            const value = sanitizedRow[key];
            // Convert boolean to 1/0 for SQLite
            if (typeof value === 'boolean') return value ? 1 : 0;
            // Convert null to NULL
            if (value === null) return null;
            // Convert arrays and objects to JSON strings
            if (typeof value === 'object') return JSON.stringify(value);
            return value;
        });

        const query = `INSERT OR REPLACE INTO ${this.escapeIdentifier(table)} (${keys.map(k => this.escapeIdentifier(k)).join(', ')}) VALUES (${placeholders})`;
        
        try {
            this.db.prepare(query).run(values);
            return fingerprint;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('Error executing query:', { query, values, error: errorMessage });
            throw new Error(`Database operation failed: ${errorMessage}`);
        }
    }

    private sanitizeData(data: any): any {
        if (data === null || data === undefined) {
            return null;
        }

        // Handle different data types
        switch (typeof data) {
            case 'string':
                // Trim whitespace and handle empty strings
                return data.trim() || null;
            case 'number':
            case 'boolean':
                return data;
            case 'object':
                if (Array.isArray(data)) {
                    return data.map(item => this.sanitizeData(item));
                }
                // Handle Date objects
                if (data instanceof Date) {
                    return data.toISOString();
                }
                // Handle plain objects
                const sanitized: Record<string, any> = {};
                for (const [key, value] of Object.entries(data)) {
                    sanitized[key] = this.sanitizeData(value);
                }
                return sanitized;
            default:
                return String(data);
        }
    }

    public fetchRowsByIds(table: string, rowIds: string[]): any[] {
        if (!table || !rowIds || !Array.isArray(rowIds) || rowIds.length === 0) {
            return [];
        }

        // Sanitize input
        const sanitizedIds = rowIds
            .filter((id): id is string => typeof id === 'string' && id.length > 0)
            .map(id => id.trim())
            .filter(Boolean);

        if (sanitizedIds.length === 0) {
            return [];
        }

        const placeholders = sanitizedIds.map(() => '?').join(',');
        const query = `SELECT * FROM ${this.escapeIdentifier(table)} WHERE id IN (${placeholders})`;
        
        try {
            return this.db.prepare(query).all(...sanitizedIds);
        } catch (error) {
            console.error('Error fetching rows:', { query, error });
            return [];
        }
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
                if (key === "id") {
                    return 'id TEXT PRIMARY KEY'
                }

                let type = "TEXT";

                // enhanced type inference
                switch (typeof value) {
                    case 'number': 
                        type = Number.isInteger(value) ? "INTEGER": "REAL";
                        break;
                    case "boolean":
                        type = "INTEGER";
                        break;
                    case "object":
                        if (value === null) {
                            type = "TEXT";
                        } else if (Array.isArray(value)) {
                            type = "TEXT";
                        } else if (value instanceof Date) {
                            type = "TEXT";
                        }
                        break;
                }

                return `${key} ${type}`;
            }).filter(Boolean).join(", ")

            this.db.exec(`CREATE TABLE IF NOT EXISTS ${this.escapeIdentifier(table)} (${columns})`);
        }
    }

    private escapeIdentifier(identifier: string): string {
        // Properly escape SQL identifiers by wrapping in double quotes
        return `"${identifier.replace(/"/g, '""')}"`;
    }
}