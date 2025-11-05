import fs from "fs/promises";
import path from "path";

export enum SimilarityMetric {
    COSINE = "cosine",
    EUCLIDEAN = "euclidean",
    DOT_PRODUCT = "dot",
    MANHATTAN = "manhattan",
}

export interface VectorIndexOptions {
    dimension?: number;
    similarityMetric?: SimilarityMetric;
    persistPath?: string;
    autoPersist?: boolean;
}

export interface SearchOptions {
    topK?: number;
    minScore?: number;
    includeVectors?: boolean;
    filterIds?: string[];
}

export class VectorIndex {
    private vectors: Map<string, number[]> = new Map();
    private dimension: number;
    private similarityMetric: SimilarityMetric;
    private persistPath: string | null;
    private autoPersist: boolean;
    private isDirty: boolean = false;

    constructor(options: VectorIndexOptions = {}) {
        this.dimension = options.dimension || 384;
        this.similarityMetric = options.similarityMetric || SimilarityMetric.COSINE;
        this.persistPath = options.persistPath || null;
        this.autoPersist = options.autoPersist || false;
    }

    // Add / update a vector with the given ID

    add(id: string, vector: number[]): void {
        this.validateVector(vector);
        this.vectors.set(id, vector);
        this.isDirty = true;
        if (this.autoPersist) {
            this.persist().catch(console.error);
        }
    }

    // Add multiple vectors in batch
    addBatch(vectors: Array<{id: string, vector: number[]}>): void {
        for (const {id, vector} of vectors) {
            this.validateVector(vector);
            this.vectors.set(id, vector);
        }
        this.isDirty = true;
        if (this.autoPersist) {
            this.persist().catch(console.error);
        }
    }

    // search for similar vectors

    search(queryVec: number[], options: SearchOptions = {}): Array<{id: string; score: number; vector?: number[] }> {
        this.validateVector(queryVec);

        const {
            topK = 5,
            minScore = -Infinity,
            includeVectors = false,
            filterIds
        } = options;

        const results: Array<{id: string; score: number; vector?: number[]}> = [];
        const entries = Array.from(this.vectors.entries());

        // Filter by IDs if specified
        const filteredEntries = filterIds
            ? entries.filter(([id]) => filterIds.includes(id))
            : entries;

        // calculate similarity scores
        for (const[id, vec] of filteredEntries) {
            const score = this.calculateSimilarity(queryVec, vec);
            if (score >= minScore) {
                const result: any = { id, score };
                if (includeVectors) {
                    result.vector = [...vec];
                }
                results.push(result);
            }
        }

        // sort by score in descending order and limit results
        return results
            .sort((a, b) => b.score - a.score)
            .slice(0, topK);
    }

    // get vector by id
    get(id: string): number[] | undefined {
        const vec = this.vectors.get(id);
        return vec ? [...vec] : undefined;
    }

    // remove a vector by id
    remove(id: string): boolean {
        const deleted = this.vectors.delete(id);
        if (deleted) {
            this.isDirty = true;
            if (this.autoPersist) {
                this.persist().catch(console.error);
            }
        }
        return deleted;
    }

    // clear all vectors
    clear(): void {
        this.vectors.clear();
        this.isDirty = true;
        if (this.autoPersist) {
            this.persist().catch(console.error);
        }
    }

    // get the number of vectors in index
    size(): number {
        return this.vectors.size;
    }

    // save index to disk
    async persist(filePath?: string): Promise<void> {
        if (!this.isDirty) return;
        
        const savePath = filePath || this.persistPath;
        if (!savePath) {
            throw new Error('No file path provided for persistence');
        }

        const data = {
            dimension: this.dimension,
            similarityMetric: this.similarityMetric,
            vectors: Object.fromEntries(this.vectors)
        };

        await fs.mkdir(path.dirname(savePath), { recursive: true });
        await fs.writeFile(savePath, JSON.stringify(data), 'utf-8');
        this.isDirty = false;
    }

    // load index from disk
    static async load(filePath: string): Promise<VectorIndex> {
        try {
            const data = JSON.parse(await fs.readFile(filePath, 'utf-8'));
            const index = new VectorIndex({
                dimension: data.dimension,
                similarityMetric: data.similarityMetric,
                persistPath: filePath
            });
            
            for (const [id, vector] of Object.entries(data.vectors)) {
                index.vectors.set(id, vector as number[]);
            }

            return index;
        } catch (error) {
            throw new Error(`Failed to load vector index: ${(error as Error).message}`);
        }
    }

    private validateVector(vector: number[]) : void {
        if (!Array.isArray(vector)) {
            throw new Error('Vector must be an array of numbers');
        }

        if (vector.length !== this.dimension) {
            throw new Error(`Vector dimension mismatch. Expected ${this.dimension}, got ${vector.length}`);
        }

        if (!vector.every(Number.isFinite)) {
            throw new Error('Vector contains non-finite values');
        }
    }

    private calculateSimilarity(a: number[], b: number[]): number {
        switch (this.similarityMetric) {
            case SimilarityMetric.COSINE:
                return this.cosineSimilarity(a, b);
            case SimilarityMetric.EUCLIDEAN:
                return this.euclideanSimilarity(a, b);
            case SimilarityMetric.DOT_PRODUCT:
                return this.dotProduct(a, b);
            case SimilarityMetric.MANHATTAN:
                return this.manhattanSimilarity(a, b);
            default:
                throw new Error(`Unknown similarity metric: ${this.similarityMetric}`);
        }
    }

    private cosineSimilarity(a: number[], b: number[]): number {
        let dot = 0, na = 0, nb = 0;
        for (let i = 0; i < a.length; i++) {
            const aVal = a[i] ?? 0;
            const bVal = b[i] ?? 0;
            dot += aVal * bVal;
            na += aVal * aVal;
            nb += bVal * bVal;
        }
        return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-12);
    }

    private euclideanSimilarity(a: number[], b: number[]): number {
        let sum = 0;
        for (let i = 0; i < a.length; i++) {
            sum += Math.pow((a[i] ?? 0) - (b[i] ?? 0), 2);
        }
        // Convert to similarity score (higher is more similar)
        return 1 / (1 + Math.sqrt(sum));
    }

    private dotProduct(a: number[], b: number[]): number {
        let dot = 0;
        for (let i = 0; i < a.length; i++) {
            dot += (a[i] ?? 0) * (b[i] ?? 0);
        }
        return dot;
    }

    private manhattanSimilarity(a: number[], b: number[]): number {
        let sum = 0;
        for (let i = 0; i < a.length; i++) {
            sum += Math.abs((a[i] ?? 0) - (b[i] ?? 0));
        }
        // Convert to similarity score (higher is more similar)
        return 1 / (1 + sum);
    }
}