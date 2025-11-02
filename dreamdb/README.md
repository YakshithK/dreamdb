# @yakshith/dreamdb

A drop-in semantic wrapper for any existing SQLite database. Add AI-powered semantic search to your SQLite databases without schema changes.

[![npm version](https://img.shields.io/npm/v/@yakshith/dreamdb)](https://www.npmjs.com/package/@yakshith/dreamdb)
[![Node.js Version](https://img.shields.io/node/v/@yakshith/dreamdb)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## ✨ Features

- 🚀 **Zero Configuration**: Works with any existing SQLite database
- 🔍 **Semantic Search**: Query your database using natural language
- ⚡ **Fast Performance**: In-memory HNSW index for sub-millisecond search
- 📦 **Auto Schema**: Automatically creates tables if they don't exist
- 🎯 **Type Safe**: Full TypeScript support with type definitions
- 💾 **Persistent**: All data stored in SQLite, vectors cached in memory

## 📦 Installation

```bash
npm install @yakshith/dreamdb
```

## 🚀 Quick Start

```javascript
import { DreamDB } from "@yakshith/dreamdb";

// Create a new database connection
const db = new DreamDB({ path: "users.db" });

// Insert some data
await db.insert("users", {
  name: "Alice",
  email: "alice@example.com",
  notes: "Took a 3 month break then returned"
});

// Query with natural language
const results = await db.query("users who paused a while");
console.log(results);
// [
//   {
//     id: "uuid-here",
//     payload: { name: "Alice", ... },
//     score: 0.85,
//     explanation: "semantic match"
//   }
// ]
```

## 📚 API Reference

### `new DreamDB(options)`

Creates a new DreamDB instance.

**Parameters:**
- `options` (object, optional):
  - `path` (string): Path to SQLite database file (e.g., `"users.db"`)
  - `connectionString` (string): Alternative to `path`, supports any SQLite connection string

**Example:**
```javascript
// Using path
const db = new DreamDB({ path: "data.db" });

// Using connectionString
const db = new DreamDB({ connectionString: "./data.db" });

// In-memory database
const db = new DreamDB({ path: ":memory:" });
```

### `DreamDB.connect(options)`

Static factory method (alternative to constructor).

**Parameters:**
- `options` (object):
  - `connectionString` (string): SQLite connection string

**Example:**
```javascript
const db = await DreamDB.connect({ connectionString: "users.db" });
```

### `db.insert(table, row)`

Inserts a row into a table and automatically creates an embedding.

**Parameters:**
- `table` (string): Table name
- `row` (object): Row data (object with key-value pairs)
  - If `row.id` is provided, it will be used; otherwise, a UUID is generated

**Returns:** `Promise<string>` - The row ID

**Example:**
```javascript
const id = await db.insert("users", {
  name: "Bob",
  age: 30,
  bio: "Active user, loves hiking",
  isPremium: true
});
```

**Note:** The table will be automatically created if it doesn't exist.

### `db.query(query, top?)`

Performs a semantic search query.

**Parameters:**
- `query` (string): Natural language query
- `top` (number, optional): Number of results to return (default: 5)

**Returns:** `Promise<Array>` - Array of results with structure:
```typescript
{
  id: string;
  payload: any;      // The original row data
  score: number;     // Similarity score (0-1)
  explanation: string;
}[]
```

**Example:**
```javascript
const results = await db.query("premium users who are active", 10);
```

### `db.ask(query, top?)`

Alias for `db.query()`. Same functionality.

## 💡 Examples

### Example 1: E-commerce Products

```javascript
import { DreamDB } from "@yakshith/dreamdb";

const db = new DreamDB({ path: "products.db" });

// Insert products
await db.insert("products", {
  name: "Wireless Headphones",
  price: 99.99,
  category: "Electronics",
  description: "High-quality Bluetooth headphones with noise cancellation"
});

await db.insert("products", {
  name: "Running Shoes",
  price: 79.99,
  category: "Sports",
  description: "Comfortable athletic shoes for running and jogging"
});

// Search for products
const results = await db.query("audio equipment under 100");
// Finds the headphones based on semantic similarity
```

### Example 2: User Database

```javascript
const db = new DreamDB({ path: "users.db" });

// Insert users
await db.insert("users", {
  name: "Alice",
  city: "New York",
  subscriptionType: "premium",
  lastActive: "2025-01-15"
});

await db.insert("users", {
  name: "Bob",
  city: "Los Angeles",
  subscriptionType: "free",
  lastActive: "2024-12-01"
});

// Query users
const premiumUsers = await db.query("premium subscribers");
const inactiveUsers = await db.query("users who haven't been active recently");
```

### Example 3: Orders Database

```javascript
const db = new DreamDB({ path: "orders.db" });

// Insert orders
await db.insert("orders", {
  userId: "user-123",
  productId: "prod-456",
  total: 149.99,
  status: "delivered",
  orderDate: "2025-01-10"
});

// Find recent deliveries
const recentDeliveries = await db.query("recent orders that were delivered");
```

## 🔧 Configuration

### Embedder Service

By default, DreamDB uses a hosted embedding service. You can configure a custom service URL:

```javascript
process.env.EMBEDDER_URL = "https://your-embedder-service.com";
```

The embedder service should accept POST requests to `/embed` with:
```json
{
  "text": ["text to embed"]
}
```

And return:
```json
{
  "vectors": [[0.1, 0.2, ...]]
}
```

### Environment Variables

- `EMBEDDER_URL`: Custom embedder service URL (default: `https://dreamdb-embedder-service.onrender.com`)

## ⚠️ Important Notes

1. **In-Memory Index**: The vector index is stored in memory. On application restart, you'll need to rebuild it by re-inserting data or loading from cache.

2. **First Query**: The embedder service may take 60+ seconds to load on the first request (cold start). Subsequent requests are much faster.

3. **Table Creation**: Tables are automatically created with column types inferred from the first row. Make sure your first insert has representative data types.

4. **ID Requirement**: Each row should have an `id` field (automatically generated as UUID if not provided). This is used for vector indexing.

## 📊 Performance

Based on stress testing with 2,000+ records:

- **Insert**: ~70ms average per insert
- **Query**: ~67ms average per query (including network latency to embedder)
- **Throughput**: ~13 inserts/sec, ~0.34 queries/sec
- **Scalability**: Handles thousands of records efficiently

## 🐛 Troubleshooting

### "Cannot connect to embedder service"

- Check your internet connection
- Verify the embedder service is running
- Wait 60+ seconds for first request (cold start)
- Set `EMBEDDER_URL` environment variable if using custom service

### "No candidates found! VectorIndex might be empty"

- Make sure you've inserted data before querying
- Check that `db.insert()` completed successfully
- Verify the vector index is populated (check debug logs)

### "no such table"

- This shouldn't happen as tables are auto-created
- Ensure the database file has write permissions
- Check that the connection string is valid

## 📝 TypeScript Support

Full TypeScript definitions are included:

```typescript
import { DreamDB } from "@yakshith/dreamdb";

const db = new DreamDB({ path: "users.db" });

// TypeScript will infer types
const results = await db.query("active users");
// results: Array<{ id: string; payload: any; score: number; explanation: string }>
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT

## 🔗 Links

- [npm package](https://www.npmjs.com/package/@yakshith/dreamdb)
- [GitHub repository](https://github.com/yakshith/dreamdb)
- [Issues](https://github.com/yakshith/dreamdb/issues)

## 🙏 Acknowledgments

Built with:
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) - Fast SQLite3 database
- [hnswlib-node](https://github.com/yoshoku/hnswlib-node) - Fast vector search
- [node-fetch](https://github.com/node-fetch/node-fetch) - HTTP client

---

**Made with ❤️ by Yakshith**

