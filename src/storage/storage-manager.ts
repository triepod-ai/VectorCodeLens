/**
 * Storage module responsible for storing code analysis in vector database
 */
import fetch from 'node-fetch';
import { Analysis } from '../analysis/code-analyzer.js';

export interface StorageConfig {
  qdrantUrl?: string;
  collectionName?: string;
  embeddingDimension?: number;
  useMock?: boolean;
  llmServerUrl?: string;
  maxRetries?: number;
  retryDelay?: number;
}

export interface SearchFilters {
  [key: string]: any;
}

export interface SearchResult {
  query: number[];
  results: Array<{
    id: string;
    score: number;
    content?: string;
    filePath?: string;
    language?: string;
    [key: string]: any;
  }>;
  timing: {
    total: number;
    search: number;
    process: number;
  };
}

export interface StorageStats {
  collection?: any;
  pointsCount: number;
  collections?: any[];
}

export interface StorageManager {
  initialize: () => Promise<boolean>;
  storeAnalysis: (analysis: Analysis) => Promise<any>;
  storeMultipleAnalyses: (analyses: Analysis[]) => Promise<any[]>;
  searchCode: (query: string, filters?: SearchFilters, limit?: number) => Promise<SearchResult>;
  deleteAnalysis: (id: string) => Promise<boolean>;
  getStats: () => Promise<StorageStats>;
  generateEmbedding: (text: string) => Promise<number[]>;
  prepareMetadata: (analysis: Analysis) => any;
  getEmbeddingText: (analysis: Analysis) => string;
  config: StorageConfig;
}

// Mock storage for testing
interface MockStorage {
  collections: {
    [key: string]: {
      name: string;
      vectors_count: number;
    };
  };
  vectors: {
    [key: string]: {
      id: string;
      vector: number[];
      payload: any;
    };
  };
  pointsCount: number;
}

/**
 * Creates a storage module with the specified configuration
 * @param config - Storage configuration
 * @returns Storage module instance
 */
export function createStorage(config: StorageConfig = {}): StorageManager {
  const defaultConfig: StorageConfig = {
    qdrantUrl: process.env.QDRANT_URL || 'http://localhost:6333',
    collectionName: 'code_analysis',
    embeddingDimension: 1536,
    useMock: process.env.USE_MOCK_STORAGE === 'true',
    llmServerUrl: process.env.LLM_SERVER_URL || 'http://localhost:11434',
    maxRetries: 3,
    retryDelay: 1000
  };

  const finalConfig: StorageConfig = { ...defaultConfig, ...config };
  let mockStorage: MockStorage = {
    collections: {},
    vectors: {},
    pointsCount: 0
  };

  /**
   * Initialize the storage service
   * @returns Success status
   */
  async function initialize(): Promise<boolean> {
    if (finalConfig.useMock) {
      console.log('Using mock storage');
      mockStorage = {
        collections: {},
        vectors: {},
        pointsCount: 0
      };
      mockStorage.collections[finalConfig.collectionName!] = {
        name: finalConfig.collectionName!,
        vectors_count: 0
      };
      return true;
    }
    
    try {
      // Check if collection exists
      const response = await fetch(`${finalConfig.qdrantUrl}/collections/${finalConfig.collectionName}`);
      
      if (response.status === 404) {
        // Create collection
        return await createCollection();
      } else if (response.ok) {
        return true;
      } else {
        throw new Error(`Failed to check collection: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to initialize storage:', error);
      throw error;
    }
  }

  /**
   * Create a new vector collection
   * @returns Success status
   */
  async function createCollection(): Promise<boolean> {
    if (finalConfig.useMock) {
      mockStorage.collections[finalConfig.collectionName!] = {
        name: finalConfig.collectionName!,
        vectors_count: 0
      };
      return true;
    }
    
    try {
      const response = await fetch(`${finalConfig.qdrantUrl}/collections/${finalConfig.collectionName}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vectors: {
            size: finalConfig.embeddingDimension,
            distance: 'Cosine'
          }
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create collection: ${response.status} ${response.statusText}`);
      }
      
      return true;
    } catch (error) {
      console.error('Failed to create collection:', error);
      throw error;
    }
  }

  /**
   * Store code analysis in the vector database
   * @param analysis - Code analysis result
   * @returns Storage result
   */
  async function storeAnalysis(analysis: Analysis): Promise<any> {
    if (!analysis) {
      throw new Error('Invalid analysis: null or undefined');
    }
    
    // Generate embedding for the analysis
    const embedding = await generateEmbedding(getEmbeddingText(analysis));
    
    // Prepare metadata
    const metadata = prepareMetadata(analysis);
    
    // Store in vector DB
    return await storeVector(embedding, metadata);
  }

  /**
   * Store multiple analyses in batch
   * @param analyses - Array of code analysis results
   * @returns Storage results
   */
  async function storeMultipleAnalyses(analyses: Analysis[]): Promise<any[]> {
    if (!Array.isArray(analyses) || analyses.length === 0) {
      throw new Error('Invalid analyses: empty or not an array');
    }
    
    const results = await Promise.all(
      analyses.map(analysis => storeAnalysis(analysis))
    );
    
    return results;
  }

  /**
   * Search for code using vector similarity
   * @param query - Search query
   * @param filters - Optional metadata filters
   * @param limit - Max results to return
   * @returns Search results
   */
  async function searchCode(query: string, filters: SearchFilters = {}, limit = 10): Promise<SearchResult> {
    // Generate embedding for the query
    const embedding = await generateEmbedding(query);
    
    // Search vectors
    return await searchVectors(embedding, filters, limit);
  }

  /**
   * Generate embedding from text using LLM service
   * @param text - Text to embed
   * @returns Embedding vector
   */
  async function generateEmbedding(text: string): Promise<number[]> {
    if (!text) {
      throw new Error('Invalid text for embedding: null, undefined or empty');
    }
    
    // Use mock for testing if configured
    if (finalConfig.useMock) {
      return mockEmbedding(text);
    }
    
    let attempt = 0;
    let lastError: Error | undefined;
    
    while (attempt < (finalConfig.maxRetries || 3)) {
      try {
        // Try different endpoint formats based on different LLM servers
        try {
          // Try OpenAI-compatible format first
          const response = await fetch(`${finalConfig.llmServerUrl}/v1/embeddings`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              input: text,
              model: 'text-embedding-ada-002'
            }),
          });
          
          if (response.ok) {
            const result = await response.json();
            return result.data[0].embedding;
          }
        } catch (openaiError) {
          // Fall back to simpler embedding endpoint
          const response = await fetch(`${finalConfig.llmServerUrl}/embeddings`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              text
            }),
          });
          
          if (!response.ok) {
            throw new Error(`Embedding API error: ${response.status} ${response.statusText}`);
          }
          
          const result = await response.json();
          return result.embedding;
        }
      } catch (error) {
        lastError = error as Error;
        attempt++;
        
        if (attempt < (finalConfig.maxRetries || 3)) {
          await new Promise(resolve => setTimeout(resolve, finalConfig.retryDelay || 1000));
        }
      }
    }
    
    throw new Error(`Failed to generate embedding after ${finalConfig.maxRetries} attempts: ${lastError?.message}`);
  }

  /**
   * Store vector in the database
   * @param vector - Embedding vector
   * @param metadata - Metadata to store
   * @returns Storage result
   */
  async function storeVector(vector: number[], metadata: any): Promise<any> {
    if (!vector || !Array.isArray(vector)) {
      throw new Error('Invalid vector: null, undefined or not an array');
    }
    
    // Generate ID for the point
    const id = metadata.id || `code-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
    
    if (finalConfig.useMock) {
      mockStorage.vectors[id] = {
        id,
        vector,
        payload: metadata
      };
      mockStorage.pointsCount++;
      mockStorage.collections[finalConfig.collectionName!].vectors_count++;
      
      return {
        id,
        status: 'success',
        vectorId: id
      };
    }
    
    try {
      const response = await fetch(`${finalConfig.qdrantUrl}/collections/${finalConfig.collectionName}/points`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          points: [
            {
              id,
              vector,
              payload: metadata
            }
          ]
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to store vector: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      
      return {
        id,
        status: 'success',
        vectorId: id,
        result
      };
    } catch (error) {
      console.error('Failed to store vector:', error);
      throw error;
    }
  }

  /**
   * Search vectors by similarity
   * @param vector - Query vector
   * @param filters - Metadata filters
   * @param limit - Max results
   * @returns Search results
   */
  async function searchVectors(vector: number[], filters: SearchFilters = {}, limit = 10): Promise<SearchResult> {
    if (!vector || !Array.isArray(vector)) {
      throw new Error('Invalid vector: null, undefined or not an array');
    }
    
    if (finalConfig.useMock) {
      // Simple mock search
      const results = Object.values(mockStorage.vectors)
        .map(item => ({
          id: item.id,
          payload: item.payload,
          score: Math.random() * 0.3 + 0.7 // Random score between 0.7 and 1.0
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
      
      return {
        query: vector,
        results: results.map(item => ({
          id: item.id,
          score: item.score,
          content: item.payload.content || item.payload.summary,
          filePath: item.payload.filePath,
          language: item.payload.language,
          ...item.payload
        })),
        timing: {
          total: 5,
          search: 3,
          process: 2
        }
      };
    }
    
    try {
      // Prepare filter object if needed
      let filterObj = null;
      if (Object.keys(filters).length > 0) {
        filterObj = {
          must: Object.entries(filters).map(([key, value]) => ({
            key,
            match: {
              value
            }
          }))
        };
      }
      
      const startTime = Date.now();
      
      const response = await fetch(`${finalConfig.qdrantUrl}/collections/${finalConfig.collectionName}/points/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vector,
          filter: filterObj,
          limit,
          with_payload: true
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to search vectors: ${response.status} ${response.statusText}`);
      }
      
      const searchTime = Date.now();
      const result = await response.json();
      
      // Format results
      const formattedResults = result.result.map((item: any) => ({
        id: item.id,
        score: item.score,
        content: item.payload.content || item.payload.summary,
        filePath: item.payload.filePath,
        language: item.payload.language,
        ...item.payload
      }));
      
      const endTime = Date.now();
      
      return {
        query: vector,
        results: formattedResults,
        timing: {
          total: endTime - startTime,
          search: searchTime - startTime,
          process: endTime - searchTime
        }
      };
    } catch (error) {
      console.error('Failed to search vectors:', error);
      throw error;
    }
  }

  /**
   * Delete analysis from storage
   * @param id - Analysis ID
   * @returns Success status
   */
  async function deleteAnalysis(id: string): Promise<boolean> {
    if (!id) {
      throw new Error('Invalid ID: null, undefined or empty');
    }
    
    if (finalConfig.useMock) {
      if (mockStorage.vectors[id]) {
        delete mockStorage.vectors[id];
        mockStorage.pointsCount--;
        mockStorage.collections[finalConfig.collectionName!].vectors_count--;
        return true;
      }
      return false;
    }
    
    try {
      const response = await fetch(`${finalConfig.qdrantUrl}/collections/${finalConfig.collectionName}/points/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to delete vector: ${response.status} ${response.statusText}`);
      }
      
      return true;
    } catch (error) {
      console.error('Failed to delete vector:', error);
      throw error;
    }
  }

  /**
   * Get storage statistics
   * @returns Storage stats
   */
  async function getStats(): Promise<StorageStats> {
    if (finalConfig.useMock) {
      return {
        pointsCount: mockStorage.pointsCount,
        collections: Object.values(mockStorage.collections)
      };
    }
    
    try {
      const response = await fetch(`${finalConfig.qdrantUrl}/collections/${finalConfig.collectionName}`);
      
      if (!response.ok) {
        throw new Error(`Failed to get collection stats: ${response.status} ${response.statusText}`);
      }
      
      const collection = await response.json();
      
      // Get points count
      const countResponse = await fetch(`${finalConfig.qdrantUrl}/collections/${finalConfig.collectionName}/points/count`);
      let pointsCount = 0;
      
      if (countResponse.ok) {
        const countResult = await countResponse.json();
        pointsCount = countResult.result.count;
      }
      
      return {
        collection: collection.result,
        pointsCount
      };
    } catch (error) {
      console.error('Failed to get stats:', error);
      throw error;
    }
  }

  /**
   * Prepare metadata from analysis for storage
   * @param analysis - Analysis object
   * @returns Prepared metadata
   */
  function prepareMetadata(analysis: Analysis): any {
    // Flatten and format metadata for storage
    return {
      id: analysis.id || `code-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`,
      filePath: analysis.filePath,
      language: analysis.language,
      summary: analysis.summary,
      purpose: analysis.purpose,
      complexity: analysis.complexity,
      quality: analysis.quality || null,
      timestamp: analysis.timestamp || new Date().toISOString(),
      content: analysis.content || getEmbeddingText(analysis),
      analysisType: analysis.analysisType || 'comprehensive',
      entityCount: (analysis.entities && analysis.entities.length) || 0
    };
  }

  /**
   * Extract text for embedding from analysis
   * @param analysis - Analysis object
   * @returns Text for embedding
   */
  function getEmbeddingText(analysis: Analysis): string {
    // Combine relevant analysis fields for embedding
    let text = '';
    
    if (analysis.summary) text += `Summary: ${analysis.summary}\n`;
    if (analysis.purpose) text += `Purpose: ${analysis.purpose}\n`;
    
    if (analysis.entities && analysis.entities.length > 0) {
      text += 'Entities:\n';
      analysis.entities.forEach(entity => {
        text += `- ${entity.type} ${entity.name}: ${entity.description || ''}\n`;
      });
    }
    
    return text;
  }

  /**
   * Generate mock embedding for testing
   * @param text - Input text
   * @returns Mock embedding vector
   */
  function mockEmbedding(text: string): number[] {
    // Generate deterministic mock embedding based on text
    const vector: number[] = [];
    const seed = text.length;
    
    for (let i = 0; i < (finalConfig.embeddingDimension || 1536); i++) {
      // Pseudo-random but deterministic for the same input
      const val = Math.sin(i * seed) * 0.5 + 0.5;
      vector.push(val);
    }
    
    return vector;
  }

  return {
    initialize,
    storeAnalysis,
    storeMultipleAnalyses,
    searchCode,
    deleteAnalysis,
    getStats,
    generateEmbedding,
    prepareMetadata,
    getEmbeddingText,
    config: finalConfig
  };
}
