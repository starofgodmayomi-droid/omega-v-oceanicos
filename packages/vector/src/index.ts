/**
 * Ω∞v VECTOR MEMORY — QDRANT INTEGRATION
 * ────────────────────────────────────────
 * Connects to Qdrant's HTTP API for dense vector similarity search.
 * Stores block embeddings and enables semantic recall across the ledger.
 *
 * Zero-friction fallback: When Qdrant is unavailable, returns empty results
 * so tests and offline mode work identically.
 *
 * Iron Law: Attest, don't assert. Evidence before trust.
 */

import crypto from 'crypto';

// ─── Types ───────────────────────────────────────────────────────────

export interface SimilarBlock {
  readonly id: string;
  readonly score: number;
  readonly blockHash: string;
  readonly metadata: Record<string, unknown>;
}

export interface VectorMemoryStatus {
  readonly available: boolean;
  readonly url: string;
  readonly collectionName: string;
  readonly vectorCount: number;
  readonly lastChecked: string;
}

export interface VectorMemoryConfig {
  /** Qdrant HTTP API URL (default: http://localhost:6333) */
  url: string;
  /** Collection name for block embeddings */
  collectionName: string;
  /** Vector dimension (default: 384 — matches MiniLM) */
  vectorDimension: number;
  /** Whether to fall back to empty results when Qdrant is unreachable */
  fallbackToEmpty: boolean;
  /** Request timeout in milliseconds */
  timeoutMs: number;
}

const DEFAULT_CONFIG: VectorMemoryConfig = {
  url: process.env.QDRANT_URL || 'http://localhost:6333',
  collectionName: 'oceanicos_blocks',
  vectorDimension: 384,
  fallbackToEmpty: true,
  timeoutMs: 10_000,
};

// ─── Vector Memory Engine ────────────────────────────────────────────

export class VectorMemory {
  private readonly config: VectorMemoryConfig;
  private cachedAvailability: boolean | null = null;
  private lastHealthCheck = 0;
  private readonly healthCacheTtlMs = 10_000;
  private collectionInitialized = false;

  constructor(config?: Partial<VectorMemoryConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Check if Qdrant is reachable and ready to serve requests.
   * Caches the result for 10 seconds to avoid excessive health checks.
   */
  public async isAvailable(): Promise<boolean> {
    const now = Date.now();
    if (this.cachedAvailability !== null && now - this.lastHealthCheck < this.healthCacheTtlMs) {
      return this.cachedAvailability;
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(`${this.config.url}/readyz`, {
        signal: controller.signal,
      });
      clearTimeout(timeout);

      this.cachedAvailability = response.ok;
      this.lastHealthCheck = now;
      return this.cachedAvailability;
    } catch {
      this.cachedAvailability = false;
      this.lastHealthCheck = now;
      return false;
    }
  }

  /**
   * Ensure the collection exists, creating it if necessary.
   */
  private async ensureCollection(): Promise<boolean> {
    if (this.collectionInitialized) return true;

    const available = await this.isAvailable();
    if (!available) return false;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);

      // Check if collection exists
      const checkResponse = await fetch(
        `${this.config.url}/collections/${this.config.collectionName}`,
        { signal: controller.signal }
      );

      if (checkResponse.ok) {
        clearTimeout(timeout);
        this.collectionInitialized = true;
        return true;
      }

      // Create collection
      const createResponse = await fetch(
        `${this.config.url}/collections/${this.config.collectionName}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            vectors: {
              size: this.config.vectorDimension,
              distance: 'Cosine',
            },
          }),
          signal: controller.signal,
        }
      );
      clearTimeout(timeout);

      this.collectionInitialized = createResponse.ok;
      return this.collectionInitialized;
    } catch {
      return false;
    }
  }

  /**
   * Store a block embedding in the vector database.
   *
   * @param blockHash - The SHA-256 hash of the block
   * @param embedding - Dense vector representation of the block
   * @param metadata - Additional metadata to store alongside the vector
   */
  public async store(
    blockHash: string,
    embedding: number[],
    metadata: Record<string, unknown> = {}
  ): Promise<boolean> {
    const collectionReady = await this.ensureCollection();
    if (!collectionReady) {
      if (this.config.fallbackToEmpty) return false;
      throw new Error(`Vector memory unavailable at ${this.config.url}`);
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);

      // Generate a deterministic point ID from the block hash
      const pointId = this.hashToPointId(blockHash);

      const response = await fetch(
        `${this.config.url}/collections/${this.config.collectionName}/points`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            points: [
              {
                id: pointId,
                vector: embedding,
                payload: {
                  blockHash,
                  storedAt: new Date().toISOString(),
                  ...metadata,
                },
              },
            ],
          }),
          signal: controller.signal,
        }
      );
      clearTimeout(timeout);

      return response.ok;
    } catch {
      if (this.config.fallbackToEmpty) return false;
      throw new Error('Failed to store vector in Qdrant');
    }
  }

  /**
   * Recall similar blocks by nearest-neighbor search.
   *
   * @param query - Query vector for similarity search
   * @param topK - Number of nearest neighbors to return (default: 5)
   */
  public async recall(query: number[], topK: number = 5): Promise<SimilarBlock[]> {
    const available = await this.isAvailable();
    if (!available) {
      if (this.config.fallbackToEmpty) return [];
      throw new Error(`Vector memory unavailable at ${this.config.url}`);
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);

      const response = await fetch(
        `${this.config.url}/collections/${this.config.collectionName}/points/search`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            vector: query,
            limit: topK,
            with_payload: true,
          }),
          signal: controller.signal,
        }
      );
      clearTimeout(timeout);

      if (!response.ok) {
        if (this.config.fallbackToEmpty) return [];
        throw new Error(`Vector search failed: ${response.status}`);
      }

      const data = (await response.json()) as {
        result?: Array<{
          id: number | string;
          score: number;
          payload?: Record<string, unknown>;
        }>;
      };

      return (data.result || []).map(hit => ({
        id: String(hit.id),
        score: hit.score,
        blockHash: (hit.payload?.blockHash as string) || '',
        metadata: hit.payload || {},
      }));
    } catch {
      if (this.config.fallbackToEmpty) return [];
      throw new Error('Vector recall failed');
    }
  }

  /**
   * Get detailed status information about the vector memory engine.
   */
  public async getStatus(): Promise<VectorMemoryStatus> {
    const available = await this.isAvailable();
    let vectorCount = 0;

    if (available) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);

        const response = await fetch(
          `${this.config.url}/collections/${this.config.collectionName}`,
          { signal: controller.signal }
        );
        clearTimeout(timeout);

        if (response.ok) {
          const data = (await response.json()) as {
            result?: { points_count?: number; vectors_count?: number };
          };
          vectorCount = data.result?.vectors_count || data.result?.points_count || 0;
        }
      } catch {
        // Swallow — we already have available=false path
      }
    }

    return {
      available,
      url: this.config.url,
      collectionName: this.config.collectionName,
      vectorCount,
      lastChecked: new Date().toISOString(),
    };
  }

  /**
   * Generate a simple embedding from text (for testing/offline mode).
   * In production, this would use a sentence transformer model.
   */
  public static generateSimpleEmbedding(text: string, dimension: number = 384): number[] {
    const hash = crypto.createHash('sha256').update(text).digest();
    const embedding: number[] = [];
    for (let i = 0; i < dimension; i++) {
      // Use hash bytes cyclically, normalize to [-1, 1]
      embedding.push((hash[i % hash.length] / 127.5) - 1.0);
    }
    // L2 normalize
    const norm = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0));
    if (norm > 0) {
      for (let i = 0; i < embedding.length; i++) {
        embedding[i] /= norm;
      }
    }
    return embedding;
  }

  // ─── Private Helpers ─────────────────────────────────────────────

  /**
   * Convert a block hash string to a numeric point ID for Qdrant.
   */
  private hashToPointId(blockHash: string): number {
    // Take first 8 hex chars → parse as integer (stays within safe JS range)
    const hex = blockHash.replace(/^0x/, '').slice(0, 8);
    return parseInt(hex, 16) || Date.now();
  }
}

export default VectorMemory;
