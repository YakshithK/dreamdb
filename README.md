# DreamDB

**DreamDB** is a drop-in semantic wrapper for any existing SQLite database. It adds AI-powered semantic search capabilities to your SQLite databases without requiring any schema changes.

## 🎯 Overview

DreamDB enables you to query your SQLite database using natural language. Instead of writing complex SQL queries, you can ask questions like:
- "users who took a multi-month break"
- "expensive products above 500"
- "recent orders that were delivered"

The library automatically:
- Creates vector embeddings for your data
- Builds an in-memory vector index using HNSW (Hierarchical Navigable Small World)
- Enables fast semantic similarity search
- Returns relevant results ranked by semantic similarity

## 📁 Project Structure

```
dreamdb/
├── dreamdb/              # Main npm package
│   ├── src/              # TypeScript source code
│   ├── dist/             # Compiled JavaScript output
│   ├── demo/             # Demo examples
│   └── package.json      # Package configuration
├── embedder/             # Python embedding service
│   ├── service.py         # Flask service using TF-IDF
│   └── requirements.txt   # Python dependencies
├── tests/       # Stress testing suite
│   └── stress.ts         # Comprehensive stress test
└── .github/workflows/    # CI/CD pipelines
```

## 🚀 Quick Start

### Installation

```bash
npm install @yakshith/dreamdb
```

### Basic Usage

```javascript
import { DreamDB } from "@yakshith/dreamdb";

// Connect to a database
const db = new DreamDB({ path: "users.db" });

// Insert data
await db.insert("users", { 
  name: "Alice", 
  notes: "Took a 3 month break then returned" 
});

// Query with natural language
const results = await db.query("users who paused a while");
console.log(results);
```

See the [package README](./dreamdb/README.md) for detailed documentation.

## 🏗️ Architecture

DreamDB consists of three main components:

1. **TypeScript Library** (`dreamdb/`)
   - Main package that wraps SQLite databases
   - Uses HNSW for fast vector similarity search
   - Automatically creates tables if they don't exist
   - Converts database rows to text for embedding

2. **Embedding Service** (`embedder/`)
   - Python Flask service deployed on Render
   - Uses TF-IDF vectorization (384 dimensions)
   - Lightweight, no model downloads required
   - Accessible at `https://dreamdb-embedder-service.onrender.com`

3. **Vector Index**
   - In-memory HNSW index (using `hnswlib-node`)
   - Fast approximate nearest neighbor search
   - Cosine similarity for semantic matching

## 🛠️ Development

### Prerequisites

- Node.js >= 18.0.0
- npm or yarn
- Python 3.11+ (for embedder service)

### Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd dreamdb
   ```

2. **Install package dependencies**
   ```bash
   cd dreamdb
   npm install
   ```

3. **Build the package**
   ```bash
   npm run build
   ```

4. **Run demo**
   ```bash
   npm run dev
   ```

### Running Tests

The project includes a comprehensive stress test:

```bash
cd tests
npm install
npm run stress
```

The stress test:
- Inserts 3,500 records across multiple tables
- Runs 50 semantic queries
- Measures performance metrics (latency, throughput)
- Provides detailed statistics

### Embedder Service Setup

The embedding service is a standalone Python Flask application:

```bash
cd embedder
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python service.py
```

For production deployment, see `embedder/render.yaml` for Render configuration.

## 📊 Performance

Based on stress testing with 2,000+ records:

- **Insert Performance**: ~70ms average, 13.4 inserts/sec
- **Query Performance**: ~67ms average per query
- **Vector Index**: Handles thousands of vectors in-memory
- **Throughput**: Scales well with larger datasets

## 🔧 CI/CD

The project uses GitHub Actions for continuous integration:

- **Build & Test**: Runs on every push/PR
  - TypeScript compilation
  - Demo execution
  - Stress test suite

- **Publish**: Automatically publishes to npm on version tags (`v*.*.*`)
  - Only runs if all tests pass
  - Requires `NPM_TOKEN` secret

## 📝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests (`npm run build && npm test`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) - Fast SQLite3 database library
- [hnswlib-node](https://github.com/yoshoku/hnswlib-node) - Fast approximate nearest neighbor search
- [scikit-learn](https://scikit-learn.org/) - TF-IDF vectorization

## 📞 Support

For issues, questions, or contributions, please open an issue on GitHub.

---

**Made with ❤️ by Yakshith**

