import Database from "better-sqlite3";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { existsSync, unlinkSync } from "fs";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// Path to the database file
const dbPath = join(__dirname, "database.sqlite");
if (existsSync(dbPath)) {
    console.log("Removing existing database...");
    unlinkSync(dbPath);
}
// Create new database
const db = new Database(dbPath);
console.log("Creating database.sqlite...");
// Execute the SQL queries
const sql = `
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  name TEXT,
  last_active TEXT,
  notes TEXT
);

INSERT INTO users VALUES ('u1','Alice','2025-06-12','Took a 3 month break then returned');
INSERT INTO users VALUES ('u2','Bob','2025-03-05','Active continuously');
`;
// Split by semicolon and execute each statement
const statements = sql
    .split(";")
    .map(s => s.trim())
    .filter(s => s.length > 0);
for (const statement of statements) {
    db.exec(statement);
}
db.close();
console.log("Database created successfully at:", dbPath);
//# sourceMappingURL=setup-database.js.map