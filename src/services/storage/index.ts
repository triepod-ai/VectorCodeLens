// src/services/storage/index.ts
import { VectorStorage } from './vectorStorage.js';

export { VectorStorage };

/**
 * Configuration interface for the VectorStorage
 */
export interface VectorStorageConfig {
  vectorDbUrl?: string;
  vectorCollection?: string;
  vectorDimensions?: number;
  embeddingModel?: string;
  retryAttempts?: number;
  timeoutMs?: number;
  connectionPoolSize?: number;
  cachingEnabled?: boolean;
}

/**
 * Factory function to create a VectorStorage instance with default configuration
 */
export function createVectorStorage(config: VectorStorageConfig = {}): VectorStorage {
  // Provide sensible defaults
  const defaultConfig: VectorStorageConfig = {
    vectorDbUrl: 'http://localhost:6333',
    vectorCollection: 'code_analysis',
    vectorDimensions: 1536,
    embeddingModel: 'text-embedding-ada-002',
    retryAttempts: 3,
    timeoutMs: 30000,
    connectionPoolSize: 5,
    cachingEnabled: true,
    ...config
  };
  
  return new VectorStorage(defaultConfig);
}

/**
 * Simplified function to get vector storage instance
 * This provides a streamlined interface for the common case
 */
export async function getVectorStorage(config: VectorStorageConfig = {}): Promise<VectorStorage> {
  const storage = createVectorStorage(config);
  await storage.initialize();
  return storage;
}

// Vector search result interface
export interface SearchResult {
  score: number;
  chunk: string;
  sourcePath: string;
  fileName: string;
  lineStart: number;
  lineEnd: number;
  language?: string;
  metadata?: Record<string, any>;
}

// Vector storage collection statistics interface
export interface CollectionStats {
  vectorCount: number;
  indexedFiles: number;
  totalChunks: number;
  memoryUsage: number;
  lastUpdated: Date;
}

// Default collection configuration
export const DEFAULT_COLLECTION_CONFIG = {
  vectors: {
    size: 1536,
    distance: 'Cosine' as const
  },
  optimizers_config: {
    default_segment_number: 2
  },
  replication_factor: 1,
  write_consistency_factor: 1
};
