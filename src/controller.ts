// src/controller.ts
import { scanDirectory, isBinaryFile } from './scanner/file-scanner.js';
import { chunkCodeFile, identifyCodeStructures } from './scanner/chunker.js';
import { analyzeCodeChunk } from './analysis/llm-analyzer.js';
import { CodeVectorStorage } from './storage/vector-db.js';
import { generateEmbedding } from './storage/embedding.js';
import { handleCodeQuery, summarizeQueryResults } from './claude/query-handler.js';
import { createHash } from 'crypto';
import fs from 'fs';
import config from './config.js';
import { checkOllamaModelExists } from './utils/ollamaUtils.js';

export interface AnalysisOptions {
  maxDepth?: number;
  includePatterns?: string[];
  excludePatterns?: string[];
  maxFileSize?: number;
}

export interface QueryOptions {
  limit?: number;
  threshold?: number;
}

export class CodeAnalyzerController {
  private storage: CodeVectorStorage;
  private isInitialized: boolean = false;
  
  constructor() {
    this.storage = new CodeVectorStorage();
  }
  
  async initialize(): Promise<void> {
    if (!this.isInitialized) {
      await this.storage.initialize();

      // Check if the configured Ollama model exists
      if (config.ollama.enabled) {
        const modelExists = await checkOllamaModelExists(config.ollama.model);
        if (!modelExists) {
          console.warn(`Disabling Ollama features because model '${config.ollama.model}' was not found.`);
          config.ollama.enabled = false; // Disable Ollama for this session if model not found
        }
      }

      this.isInitialized = true;
    }
  }
  
  async analyzeDirectory(
    directoryPath: string, 
    options: AnalysisOptions = {}
  ): Promise<{
    filesAnalyzed: number;
    chunksAnalyzed: number;
    errors: string[];
  }> {
    await this.initialize();
    
    const errors: string[] = [];
    let filesAnalyzed = 0;
    let chunksAnalyzed = 0;
    
    try {
      // Scan directory for files
      const files = await scanDirectory(directoryPath, {
        ...options,
        includeContent: true
      });
      
      console.log(`Found ${files.length} files to analyze`);
      
      // Process each file
      for (const file of files) {
        try {
          // Skip binary files
          if (isBinaryFile(file)) {
            console.log(`Skipping binary file: ${file.path}`);
            continue;
          }
          
          console.log(`Analyzing file: ${file.path}`);
          
          // Chunk the file
          const chunks = chunkCodeFile(file);
          
          // Process each chunk
          for (const chunk of chunks) {
            try {
              // Identify code structures (functions, classes, etc.)
              const enhancedChunk = identifyCodeStructures(chunk);
              
              // Generate a unique ID for this chunk
              const chunkId = createChunkId(enhancedChunk);
              
              // Analyze the chunk with LLM
              const analysis = await analyzeCodeChunk(enhancedChunk);
              
              let embedding: number[] | undefined = undefined;
              if (config.ollama.enabled) {
                try {
                  // Generate embedding for the chunk only if Ollama is enabled
                  embedding = await generateEmbedding(enhancedChunk.code);
                } catch (embeddingError) {
                   console.error(`Failed to generate embedding for chunk (${file.path}, lines ${chunk.startLine}-${chunk.endLine}): ${(embeddingError as any).message}`);
                   // Decide if you want to store without embedding or skip
                }
              } else {
                 console.log(`Skipping embedding generation for chunk (${file.path}, lines ${chunk.startLine}-${chunk.endLine}) as Ollama is disabled.`);
              }
              
              // Store in vector database (handle potentially undefined embedding)
              await this.storage.storeAnalysis(chunkId, enhancedChunk, analysis, embedding);
              
              chunksAnalyzed++;
            } catch (error) {
              const errorMessage = `Error processing chunk (${file.path}, lines ${chunk.startLine}-${chunk.endLine}): ${(error as any).message}`;
              console.error(errorMessage);
              errors.push(errorMessage);
            }
          }
          
          filesAnalyzed++;
        } catch (error) {
          const errorMessage = `Error processing file ${file.path}: ${(error as any).message}`;
          console.error(errorMessage);
          errors.push(errorMessage);
        }
      }
      
      console.log(`Analysis complete. Analyzed ${filesAnalyzed} files and ${chunksAnalyzed} chunks.`);
      
      return {
        filesAnalyzed,
        chunksAnalyzed,
        errors
      };
    } catch (error) {
      const errorMessage = `Error analyzing directory ${directoryPath}: ${(error as any).message}`;
      console.error(errorMessage);
      errors.push(errorMessage);
      
      return {
        filesAnalyzed,
        chunksAnalyzed,
        errors
      };
    }
  }
  
  async queryCodebase(
    query: string,
    options: QueryOptions = {}
  ): Promise<any> {
    await this.initialize();
    
    try {
      // Handle the query
      const queryResult = await handleCodeQuery(
        query,
        this.storage,
        options.limit || 5
      );
      
      return queryResult;
    } catch (error) {
      console.error(`Error querying codebase: ${(error as any).message}`);
      throw error;
    }
  }
  
  async getStorageStats(): Promise<any> {
    await this.initialize();
    
    try {
      return await this.storage.getStats();
    } catch (error) {
      console.error(`Error getting storage stats: ${(error as any).message}`);
      throw error;
    }
  }
}

function createChunkId(chunk: any): string {
  const { path, relativePath } = chunk.fileInfo;
  const { startLine, endLine } = chunk;
  
  // Create a unique ID based on file path and line numbers
  const idString = `${relativePath}:${startLine}-${endLine}`;
  
  // Create a hash of the ID string
  return createHash('md5').update(idString).digest('hex');
}
