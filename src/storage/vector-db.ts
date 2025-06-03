// src/storage/vector-db.ts
import { QdrantClient } from '@qdrant/js-client-rest';
import config from '../config.js';
import { CodeChunk } from '../scanner/chunker.js';
import { AnalysisResult } from '../analysis/llm-analyzer.js';

export interface VectorStorageOptions {
  url?: string;
  collectionName?: string;
  dimensions?: number;
  distance?: 'Cosine' | 'Euclid' | 'Dot';
}

export interface StoredAnalysis {
  chunkId: string;
  filePath: string;
  relativePath: string;
  language: string;
  startLine: number;
  endLine: number;
  codeSnippet: string;
  analysis: AnalysisResult;
  embedding: number[]; // Keep this required, search results should always have embeddings
  timestamp: string;
}

export class CodeVectorStorage {
  private client: QdrantClient;
  private collection: string;
  private dimensions: number;
  private distance: 'Cosine' | 'Euclid' | 'Dot';

  constructor(options: VectorStorageOptions = {}) {
    this.client = new QdrantClient({
      url: options.url || config.vectorDb.url,
      checkCompatibility: false
    });

    this.collection = options.collectionName || config.vectorDb.collection;
    this.dimensions = options.dimensions || config.vectorDb.dimensions;
    this.distance = options.distance || (config.vectorDb.distance as 'Cosine' | 'Euclid' | 'Dot');
  }

  async initialize(): Promise<void> {
    try {
      // Check if collection exists
      const collections = await this.client.getCollections();

      if (!collections.collections.some((c: any) => c.name === this.collection)) {
        console.log(`Creating collection: ${this.collection}`);

        await this.client.createCollection(this.collection, {
          vectors: {
            size: this.dimensions,
            distance: this.distance
          }
        });
      }
    } catch (error) {
      console.error('Error initializing vector storage:', error);
      throw error;
    }
  }

  async storeAnalysis(
    chunkId: string,
    chunk: CodeChunk,
    analysis: AnalysisResult,
    embedding: number[] | undefined // Allow embedding to be optional
  ): Promise<void> {
    try {
      const { fileInfo, code, startLine, endLine } = chunk;

      // Construct the point data, initially without the vector
      const pointData: any = {
        id: chunkId,
        payload: {
          filePath: fileInfo.path,
          relativePath: fileInfo.relativePath,
          language: fileInfo.language,
          startLine,
          endLine,
          codeSnippet: code,
          analysis,
          timestamp: new Date().toISOString()
        }
      };

      // Only include the vector if embedding is provided
      if (embedding) {
        pointData.vector = embedding;
      } else {
        // Qdrant allows points without vectors in a collection
        console.log(`Storing analysis for chunk ${chunkId} without embedding.`);
      }

      // Store the analysis in the vector database
      await this.client.upsert(this.collection, {
        wait: true,
        points: [pointData]
      });
    } catch (error) {
      console.error('Error storing analysis:', error);
      throw error;
    }
  }

  async searchSimilarCode(
    embedding: number[],
    limit: number = 5,
    scoreThreshold: number = 0.7
  ): Promise<StoredAnalysis[]> {
    try {
      const results = await this.client.search(this.collection, {
        vector: embedding, // Search requires an embedding
        limit,
        score_threshold: scoreThreshold,
        with_payload: true,
        with_vector: true // Request vector to ensure we only get points with embeddings
      });

      // Filter results to ensure they have an embedding vector before mapping
      // Qdrant search with a vector query should only return points with vectors,
      // but this adds an extra layer of safety.
      return results
        .filter((result: any) => result.vector && Array.isArray(result.vector))
        .map((result: any) => {
          const payload = result.payload as any;

          // Ensure the returned object matches the StoredAnalysis interface
          return {
            chunkId: result.id as string,
            filePath: payload.filePath,
            relativePath: payload.relativePath,
            language: payload.language,
            startLine: payload.startLine,
            endLine: payload.endLine,
            codeSnippet: payload.codeSnippet,
            analysis: payload.analysis,
            embedding: result.vector as number[], // Vector is guaranteed by filter
            timestamp: payload.timestamp
          };
        });
    } catch (error) {
      console.error('Error searching similar code:', error);
      throw error;
    }
  }

  async deleteAnalysis(chunkId: string): Promise<void> {
    try {
      await this.client.delete(this.collection, {
        points: [chunkId],
        wait: true
      });
    } catch (error) {
      console.error('Error deleting analysis:', error);
      throw error;
    }
  }

  async deleteAnalysisForFile(filePath: string): Promise<void> {
    try {
      // Find all points with the specified file path
      const filter = {
        must: [
          {
            key: 'filePath',
            match: {
              value: filePath
            }
          }
        ]
      };

      // Search for points with this file path
      const results = await this.client.scroll(this.collection, {
        filter,
        limit: 100,
        with_payload: false
      });

      if (results.points.length > 0) {
        // Delete the points
        await this.client.delete(this.collection, {
          points: results.points.map((p: any) => p.id),
          wait: true
        });
      }
    } catch (error) {
      console.error('Error deleting analysis for file:', error);
      throw error;
    }
  }

  async getStats(): Promise<{
    totalPoints: number;
    filesAnalyzed: string[];
    languageCounts: Record<string, number>;
  }> {
    try {
      // Get collection info
      const collectionInfo = await this.client.getCollection(this.collection);

      // Get unique file paths and language counts
      const uniqueFilePaths = new Set<string>();
      const languageCounts: Record<string, number> = {};

      // Use scroll to get all points
      let nextPageOffset: string | null = null;
      do {
        const scrollResult = await this.client.scroll(this.collection, {
          limit: 100,
          with_payload: true,
          with_vector: false,
          offset: nextPageOffset ?? null
        });

        for (const point of scrollResult.points) {
          const payload = point.payload as any;
          uniqueFilePaths.add(payload.filePath);

          const language = payload.language;
          languageCounts[language] = (languageCounts[language] || 0) + 1;
        }

        nextPageOffset = scrollResult.next_page_offset as string | null;
      } while (nextPageOffset);

      return {
        totalPoints: collectionInfo.points_count || 0,
        filesAnalyzed: Array.from(uniqueFilePaths),
        languageCounts
      };
    } catch (error) {
      console.error('Error getting stats:', error);
      throw error;
    }
  }
}
