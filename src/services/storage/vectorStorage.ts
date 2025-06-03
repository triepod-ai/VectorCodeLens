// src/services/storage/vectorStorage.ts
import { QdrantClient } from '@qdrant/js-client-rest';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { 
  VectorStorageConfig, 
  SearchResult, 
  CollectionStats, 
  DEFAULT_COLLECTION_CONFIG 
} from './index.js';

/**
 * VectorStorage service handles all operations related to vector storage
 * using Qdrant as the backend vector database.
 * 
 * Following DeepView MCP patterns, this implementation focuses on:
 * 1. Simplified interface with progressive enhancement
 * 2. Robust error handling and connection management
 * 3. Sensible defaults for configuration
 */
export class VectorStorage {
  private client: QdrantClient;
  private collection: string;
  private dimensions: number;
  private initialized: boolean = false;
  private retryAttempts: number;
  private timeoutMs: number;
  private cachingEnabled: boolean;
  private url: string;
  
  constructor(config: VectorStorageConfig) {
    // Initialize Qdrant client with enhanced configuration
    this.url = config.vectorDbUrl || 'http://localhost:6333';
    this.client = new QdrantClient({ 
      url: this.url,
      timeout: config.timeoutMs || 30000,
      apiKey: process.env.QDRANT_API_KEY // Support for API key if needed
    });
    
    this.collection = config.vectorCollection || 'code_analysis';
    this.dimensions = config.vectorDimensions || 1536;
    this.retryAttempts = config.retryAttempts || 3;
    this.timeoutMs = config.timeoutMs || 30000;
    this.cachingEnabled = config.cachingEnabled !== undefined ? config.cachingEnabled : true;
    
    // Log configuration (without sensitive data)
    console.log(`VectorStorage initialized with collection: ${this.collection}, dimensions: ${this.dimensions}`);
  }
  
  /**
   * Initialize the vector storage
   * Sets up the collection and ensures it's ready for use
   * Uses retry logic for better reliability
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }
    
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        // Check if the Qdrant server is available
        await this.pingServer();
        
        // Check if collection exists
        const collections = await this.client.getCollections();
        const collectionExists = collections.collections.some(c => c.name === this.collection);
        
        if (!collectionExists) {
          console.log(`Creating collection: ${this.collection}`);
          
          // Create the collection with enhanced configuration
          await this.client.createCollection(this.collection, {
            ...DEFAULT_COLLECTION_CONFIG,
            vectors: {
              ...DEFAULT_COLLECTION_CONFIG.vectors,
              size: this.dimensions
            }
          });
          
          // Create required collection indexes for better search performance
          await this.createCollectionIndexes();
        } else {
          console.log(`Collection ${this.collection} already exists`);
          
          // Verify collection schema matches our requirements
          const collectionInfo = await this.client.getCollection(this.collection);
          
          if (collectionInfo.config?.params?.vectors?.size !== this.dimensions) {
            console.warn(`Collection ${this.collection} has dimension ${collectionInfo.config?.params?.vectors?.size}, but we expected ${this.dimensions}`);
          }
        }
        
        this.initialized = true;
        console.log('Vector storage initialized successfully');
        return;
      } catch (error) {
        console.error(`Initialization attempt ${attempt} failed:`, error);
        
        if (attempt < this.retryAttempts) {
          // Exponential backoff for retries
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
          console.log(`Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          throw new Error(`Vector database initialization failed after ${this.retryAttempts} attempts: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    }
  }
  
  /**
   * Simple ping to check if Qdrant server is available
   */
  private async pingServer(): Promise<boolean> {
    try {
      const response = await fetch(`${this.url}/healthz`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });
      
      return response.ok;
    } catch (error) {
      console.error('Qdrant server ping failed:', error);
      return false;
    }
  }
  
  /**
   * Create collection indexes for better search performance
   */
  private async createCollectionIndexes(): Promise<void> {
    try {
      // Create payload index for source file path (improves filtering)
      await this.client.createPayloadIndex(this.collection, {
        field_name: 'sourcePath',
        field_schema: 'keyword',
        wait: true
      });
      
      // Create payload index for file name
      await this.client.createPayloadIndex(this.collection, {
        field_name: 'fileName',
        field_schema: 'keyword',
        wait: true
      });
      
      // Create payload index for language
      await this.client.createPayloadIndex(this.collection, {
        field_name: 'language',
        field_schema: 'keyword',
        wait: true
      });
      
      console.log('Collection indexes created successfully');
    } catch (error) {
      console.warn('Failed to create collection indexes:', error);
      // Non-critical error, don't throw
    }
  }
  
  /**
   * Store a codebase in the vector database
   * Takes a preprocessed codebase file and stores it with vector embeddings
   * 
   * @param codebasePath Path to the preprocessed codebase file
   * @param embeddings Optional pre-computed embeddings (for optimized workflows)
   * @returns ID of the operation for tracking
   */
  async storeCodebase(codebasePath: string, embeddings?: number[][]): Promise<string> {
    await this.initialize();
    
    // Generate a unique operation ID for tracking
    const operationId = crypto.randomUUID();
    console.log(`Starting codebase storage operation: ${operationId}`);
    
    try {
      // Read the codebase file
      const content = await fs.promises.readFile(codebasePath, 'utf-8');
      
      // Basic XML parsing to extract file chunks
      // In a real implementation, we would use a proper XML parser
      // but for simplicity we use a basic approach
      const files: Array<{
        path: string;
        language: string;
        content: string;
        size: number;
        lastModified: string;
      }> = [];
      
      // Extract files from XML
      const fileRegex = /<file path="([^"]+)" language="([^"]+)" size="([^"]+)" lastModified="([^"]+)">\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*<\/file>/g;
      let match;
      
      while ((match = fileRegex.exec(content)) !== null) {
        files.push({
          path: match[1],
          language: match[2],
          size: parseInt(match[3], 10),
          lastModified: match[4],
          content: match[5]
        });
      }
      
      // If no files were found, try a simpler approach
      if (files.length === 0) {
        console.log('No files found with detailed metadata, trying simpler parsing');
        
        const simpleFileRegex = /<file path="([^"]+)">\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*<\/file>/g;
        while ((match = simpleFileRegex.exec(content)) !== null) {
          files.push({
            path: match[1],
            language: this.getLanguageFromExtension(path.extname(match[1])),
            size: match[2].length,
            lastModified: new Date().toISOString(),
            content: match[2]
          });
        }
      }
      
      console.log(`Found ${files.length} files in codebase`);
      
      // Process files in batches to avoid overwhelming the vector database
      const batchSize = 10;
      const chunks: Array<{
        id: string;
        content: string;
        embedding: number[];
        metadata: any;
      }> = [];
      
      // Simple chunking strategy - each file is a chunk
      // For more advanced implementations, we would split large files
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const chunkId = this.generateChunkId(codebasePath, i);
        
        // Use provided embeddings or generate placeholder
        // In a real implementation, this would call an embedding service
        const embedding = embeddings?.[i] || this.generatePlaceholderEmbedding();
        
        chunks.push({
          id: chunkId,
          content: file.content,
          embedding,
          metadata: {
            sourcePath: codebasePath,
            fileName: file.path,
            fileSize: file.size,
            lastModified: file.lastModified,
            language: file.language,
            chunkIndex: i,
            totalChunks: files.length,
            operationId
          }
        });
      }
      
      // Store chunks in batches
      for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = chunks.slice(i, i + batchSize);
        
        // Use a more robust upsert with retry logic
        await this.upsertWithRetry(batch);
        
        console.log(`Stored batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(chunks.length / batchSize)}`);
      }
      
      console.log(`Successfully stored codebase with ${chunks.length} chunks`);
      return operationId;
    } catch (error) {
      console.error('Error storing codebase:', error);
      throw new Error(`Failed to store codebase: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Insert or update points with retry logic
   */
  private async upsertWithRetry(chunks: Array<{
    id: string;
    content: string;
    embedding: number[];
    metadata: any;
  }>): Promise<void> {
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        await this.client.upsert(this.collection, {
          wait: true,
          points: chunks.map(chunk => ({
            id: chunk.id,
            vector: chunk.embedding,
            payload: {
              chunk: chunk.content,
              ...chunk.metadata
            }
          }))
        });
        return;
      } catch (error) {
        console.error(`Upsert attempt ${attempt} failed:`, error);
        
        if (attempt < this.retryAttempts) {
          // Exponential backoff for retries
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
          console.log(`Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          throw new Error(`Upsert failed after ${this.retryAttempts} attempts: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    }
  }
  
  /**
   * Generate a placeholder embedding vector
   * In a real implementation, this would be replaced with actual embeddings
   */
  private generatePlaceholderEmbedding(): number[] {
    const embedding = new Array(this.dimensions).fill(0);
    
    // Add some randomness to make vectors distinguishable
    for (let i = 0; i < 10; i++) {
      const index = Math.floor(Math.random() * this.dimensions);
      embedding[index] = Math.random();
    }
    
    // Normalize the vector
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map(val => val / (magnitude || 1));
  }
  
  /**
   * Check if a codebase is already analyzed and stored
   * @param codebasePath Path to the codebase file
   * @returns Whether the codebase is already analyzed and stored
   */
  async isCodebaseAnalyzed(codebasePath: string): Promise<boolean> {
    await this.initialize();
    
    try {
      // Use a more robust approach to check if the codebase is analyzed
      const results = await this.client.scroll(this.collection, {
        limit: 1,
        filter: {
          must: [
            {
              key: 'sourcePath',
              match: {
                value: codebasePath
              }
            }
          ]
        },
        with_payload: false,
        with_vector: false
      });
      
      return results.points.length > 0;
    } catch (error) {
      console.error('Error checking if codebase is analyzed:', error);
      return false;
    }
  }
  
  /**
   * Get statistics about a stored codebase
   * @param codebasePath Path to the codebase file
   * @returns Statistics about the stored codebase or null if not found
   */
  async getCodebaseStats(codebasePath: string): Promise<CollectionStats | null> {
    await this.initialize();
    
    try {
      // Count points for this codebase
      const countResults = await this.client.scroll(this.collection, {
        limit: 1,
        filter: {
          must: [
            {
              key: 'sourcePath',
              match: {
                value: codebasePath
              }
            }
          ]
        },
        with_payload: {
          include: ['totalChunks', 'operationId']
        },
        with_vector: false
      });
      
      if (countResults.points.length === 0) {
        return null;
      }
      
      // Get collection info
      const collectionInfo = await this.client.getCollection(this.collection);
      
      // Find most recent point for last updated
      const latestResults = await this.client.scroll(this.collection, {
        limit: 1,
        filter: {
          must: [
            {
              key: 'sourcePath',
              match: {
                value: codebasePath
              }
            }
          ]
        },
        with_payload: {
          include: ['lastModified']
        },
        with_vector: false,
        order_by: {
          key: 'lastModified',
          direction: 'desc'
        }
      });
      
      // Get unique file count
      const fileCountResults = await this.client.scroll(this.collection, {
        limit: 1000, // Limit to reasonable number of files
        filter: {
          must: [
            {
              key: 'sourcePath',
              match: {
                value: codebasePath
              }
            }
          ]
        },
        with_payload: {
          include: ['fileName']
        },
        with_vector: false
      });
      
      // Count unique file names
      const uniqueFiles = new Set();
      fileCountResults.points.forEach(point => {
        if (point.payload?.fileName) {
          uniqueFiles.add(point.payload.fileName);
        }
      });
      
      // Get total chunks from first point
      const totalChunks = (countResults.points[0].payload?.totalChunks as number) || fileCountResults.points.length;
      
      return {
        vectorCount: totalChunks as number,
        indexedFiles: uniqueFiles.size,
        totalChunks: totalChunks as number,
        memoryUsage: ((collectionInfo.config?.params?.vectors?.size as number) || 0) * (totalChunks as number) * 4, // Rough estimate: dimensions * vectors * 4 bytes
        lastUpdated: new Date((latestResults.points[0].payload?.lastModified as number) || Date.now())
      };
    } catch (error) {
      console.error('Error getting codebase stats:', error);
      return null;
    }
  }
  
  /**
   * Search the vector database with advanced filtering
   * @param query Search query string
   * @param params Additional search parameters
   * @returns Array of search results
   */
  async search(query: string, params: {
    limit?: number;
    offset?: number;
    filter?: Record<string, any>;
    language?: string;
    scoreThreshold?: number;
  } = {}): Promise<SearchResult[]> {
    await this.initialize();
    
    const {
      limit = 10,
      offset = 0,
      filter = {},
      language,
      scoreThreshold = 0.6
    } = params;
    
    try {
      // Build filter query
      const must: any[] = [];
      
      // Add language filter if specified
      if (language) {
        must.push({
          key: 'language',
          match: {
            value: language
          }
        });
      }
      
      // Add custom filters
      Object.entries(filter).forEach(([key, value]) => {
        must.push({
          key,
          match: {
            value
          }
        });
      });
      
      // For the MVP, we use a simplified search approach with text matching
      // In a production implementation, this would be replaced with actual vector search
      // using query embeddings
      const results = await this.client.scroll(this.collection, {
        limit: limit + offset,
        with_payload: true,
        with_vector: false,
        filter: must.length > 0 ? { must } : undefined
      });
      
      // Apply text-based filtering and scoring as a placeholder
      // This simulates vector search
      const filteredResults = results.points
        .map(point => {
          const chunk = point.payload?.chunk || '';
          
          // Simple scoring function based on text similarity
          // This is a placeholder for actual vector similarity
          let score = 0;
          if (chunk && typeof chunk === 'string') {
            const normalizedChunk = chunk.toLowerCase();
            const normalizedQuery = query.toLowerCase();
            
            if (normalizedChunk.includes(normalizedQuery)) {
              // Direct match has high score
              score = 0.9;
            } else {
              // Count matching terms
              const chunkTerms = new Set(normalizedChunk.split(/\s+/));
              const queryTerms = normalizedQuery.split(/\s+/);
              let matchCount = 0;
              
              queryTerms.forEach(term => {
                if (chunkTerms.has(term)) {
                  matchCount++;
                }
              });
              
              score = matchCount / Math.max(1, queryTerms.length) * 0.8;
            }
          }
          
          return {
            score,
            chunk: (point.payload?.chunk as string) || '',
            sourcePath: (point.payload?.sourcePath as string) || '',
            fileName: (point.payload?.fileName as string) || '',
            lineStart: (point.payload?.lineStart as number) || 0,
            lineEnd: (point.payload?.lineEnd as number) || 0,
            language: (point.payload?.language as string) || '',
            metadata: { ...point.payload }
          };
        })
        .filter(result => result.score >= scoreThreshold)
        .sort((a, b) => b.score - a.score)
        .slice(offset, offset + limit);
      
      return filteredResults;
    } catch (error) {
      console.error('Error searching vector database:', error);
      throw new Error(`Search failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Extract specific information from the codebase
   * Specialized search for information extraction
   * 
   * @param query Extraction query string
   * @param params Additional extraction parameters
   * @returns Array of search results
   */
  async extract(query: string, params: {
    limit?: number;
    type?: 'function' | 'class' | 'interface' | 'type' | 'variable' | 'import';
    language?: string;
    fileName?: string;
  } = {}): Promise<SearchResult[]> {
    const {
      limit = 5,
      type,
      language,
      fileName
    } = params;
    
    // Build filter object
    const filter: Record<string, any> = {};
    
    if (type) {
      // For extraction, we can use custom filters based on code patterns
      // For MVP, we use simplified text matching
      const typePatterns: Record<string, string> = {
        'function': 'function',
        'class': 'class',
        'interface': 'interface',
        'type': 'type',
        'variable': 'const|let|var',
        'import': 'import'
      };
      
      // Include pattern in query rather than filter for MVP
      query = `${query} ${typePatterns[type] || ''}`;
    }
    
    if (fileName) {
      filter.fileName = fileName;
    }
    
    // Use the standard search with custom parameters
    return this.search(query, {
      limit,
      filter,
      language,
      scoreThreshold: 0.5 // Lower threshold for extractions
    });
  }
  
  /**
   * Delete a codebase from the vector database
   * @param codebasePath Path to the codebase file
   * @returns Whether the deletion was successful
   */
  async deleteCodebase(codebasePath: string): Promise<boolean> {
    await this.initialize();
    
    try {
      // First, find all points for this codebase
      const results = await this.client.scroll(this.collection, {
        limit: 10000, // Set a reasonable limit
        filter: {
          must: [
            {
              key: 'sourcePath',
              match: {
                value: codebasePath
              }
            }
          ]
        },
        with_payload: false,
        with_vector: false
      });
      
      if (results.points.length === 0) {
        console.log(`No points found for codebase: ${codebasePath}`);
        return true;
      }
      
      // Extract point IDs
      const pointIds = results.points.map(point => point.id);
      
      console.log(`Deleting ${pointIds.length} points for codebase: ${codebasePath}`);
      
      // Delete in batches to avoid overwhelming the database
      const batchSize = 100;
      
      for (let i = 0; i < pointIds.length; i += batchSize) {
        const batch = pointIds.slice(i, i + batchSize);
        
        await this.client.delete(this.collection, {
          points: batch,
          wait: true
        });
        
        console.log(`Deleted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(pointIds.length / batchSize)}`);
      }
      
      console.log(`Successfully deleted codebase: ${codebasePath}`);
      return true;
    } catch (error) {
      console.error('Error deleting codebase:', error);
      throw new Error(`Failed to delete codebase: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Get a list of all stored codebases
   * @returns Array of codebase paths
   */
  async listCodebases(): Promise<string[]> {
    await this.initialize();
    
    try {
      // Scroll through all points and collect unique source paths
      let offset = 0;
      const limit = 100;
      const codebasePaths = new Set<string>();
      
      while (true) {
        const results = await this.client.scroll(this.collection, {
          limit,
          offset,
          with_payload: {
            include: ['sourcePath']
          },
          with_vector: false
        });
        
        if (results.points.length === 0) {
          break;
        }
        
        // Add unique source paths
        results.points.forEach(point => {
          if (point.payload?.sourcePath) {
            codebasePaths.add(point.payload.sourcePath as string);
          }
        });
        
        if (results.points.length < limit) {
          break;
        }
        
        offset += limit;
      }
      
      return Array.from(codebasePaths);
    } catch (error) {
      console.error('Error listing codebases:', error);
      throw new Error(`Failed to list codebases: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Get information about the vector database
   * @returns Statistics about the vector database
   */
  async getStorageInfo(): Promise<{
    totalVectors: number;
    totalCodebases: number;
    memoryUsageBytes: number;
  }> {
    await this.initialize();
    
    try {
      // Get collection info
      const collectionInfo = await this.client.getCollection(this.collection);
      
      // Get list of codebases
      const codebases = await this.listCodebases();
      
      return {
        totalVectors: collectionInfo.vectors_count || 0,
        totalCodebases: codebases.length,
        memoryUsageBytes: ((collectionInfo.config?.params?.vectors?.size as number) || 0) * 
                          (collectionInfo.vectors_count || 0) * 4 // Rough estimate: dimensions * vectors * 4 bytes
      };
    } catch (error) {
      console.error('Error getting storage info:', error);
      throw new Error(`Failed to get storage info: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Generate a consistent chunk ID
   * @param sourcePath Path to the source file
   * @param chunkIndex Index of the chunk
   * @returns Unique ID for the chunk
   */
  private generateChunkId(sourcePath: string, chunkIndex: number): string {
    const idString = `${sourcePath}:${chunkIndex}`;
    return crypto.createHash('md5').update(idString).digest('hex');
  }
  
  /**
   * Determine programming language from file extension
   * @param extension File extension with dot
   * @returns Programming language name
   */
  private getLanguageFromExtension(extension: string): string {
    const languageMap: Record<string, string> = {
      '.js': 'JavaScript',
      '.jsx': 'JavaScript',
      '.ts': 'TypeScript',
      '.tsx': 'TypeScript',
      '.py': 'Python',
      '.java': 'Java',
      '.c': 'C',
      '.cpp': 'C++',
      '.cs': 'C#',
      '.go': 'Go',
      '.rs': 'Rust',
      '.rb': 'Ruby',
      '.php': 'PHP',
      '.html': 'HTML',
      '.css': 'CSS',
      '.scss': 'SCSS',
      '.json': 'JSON',
      '.md': 'Markdown',
      '.sql': 'SQL',
      '.sh': 'Shell',
      '.bat': 'Batch',
      '.ps1': 'PowerShell'
    };
    
    return languageMap[extension.toLowerCase()] || 'Unknown';
  }
}
