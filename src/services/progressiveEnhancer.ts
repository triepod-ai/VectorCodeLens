// src/services/progressiveEnhancer.ts
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// Import service interfaces
import { createVectorStorage, VectorStorageConfig } from './storage/index.js';
import { createLlmService, LlmServiceConfig } from './llm/index.js';
import { createPreprocessor, PreprocessorConfig, PreprocessorType } from './preprocessing/index.js';

// Configuration interface
export interface ProgressiveEnhancerConfig {
  // Core configuration
  vectorDbUrl?: string;
  vectorCollection?: string;
  vectorDimensions?: number;
  llmServiceUrl?: string;
  claudeApiKey?: string;
  
  // Feature flags
  enableGitAnalysis?: boolean;
  useLocalEmbeddings?: boolean;
  useAdvancedPreprocessing?: boolean;
  enableAsyncProcessing?: boolean;
  cacheResults?: boolean;
  
  // Advanced options
  retryAttempts?: number;
  timeoutMs?: number;
  maxFileSizeKb?: number;
  
  // Additional configurations
  storage?: VectorStorageConfig;
  llm?: LlmServiceConfig;
  preprocessing?: PreprocessorConfig;
}

/**
 * ProgressiveEnhancer orchestrates the integration of various services
 * to provide a unified interface for code analysis operations.
 * 
 * It follows DeepView MCP patterns by:
 * 1. Providing a simple unified interface
 * 2. Supporting progressive enhancement via feature flags
 * 3. Implementing fallback mechanisms when advanced features are unavailable
 */
export class ProgressiveEnhancer {
  private vectorStorage: any;
  private llmService: any;
  private preprocessor: any;
  
  // Feature flags from configuration
  private enableGitAnalysis: boolean;
  private useLocalEmbeddings: boolean;
  private useAdvancedPreprocessing: boolean;
  private enableAsyncProcessing: boolean;
  
  /**
   * Create a new ProgressiveEnhancer
   * 
   * @param config Configuration options
   */
  constructor(config: ProgressiveEnhancerConfig = {}) {
    // Initialize feature flags with sensible defaults
    this.enableGitAnalysis = config.enableGitAnalysis || false;
    this.useLocalEmbeddings = config.useLocalEmbeddings || false;
    this.useAdvancedPreprocessing = config.useAdvancedPreprocessing || false;
    this.enableAsyncProcessing = config.enableAsyncProcessing || false;
    
    // Initialize core services with progressive enhancement support
    this.vectorStorage = createVectorStorage({
      vectorDbUrl: config.vectorDbUrl,
      vectorCollection: config.vectorCollection,
      vectorDimensions: config.vectorDimensions,
      ...config.storage
    });
    
    this.llmService = createLlmService({
      llmServiceUrl: config.llmServiceUrl,
      claudeApiKey: config.claudeApiKey,
      ...config.llm
    });
    
    this.preprocessor = createPreprocessor({
      cacheResults: config.cacheResults,
      maxFileSizeKb: config.maxFileSizeKb,
      type: this.useAdvancedPreprocessing ? PreprocessorType.Advanced : PreprocessorType.Basic,
      ...config.preprocessing
    });
    
    console.log('ProgressiveEnhancer initialized with feature flags:', {
      enableGitAnalysis: this.enableGitAnalysis,
      useLocalEmbeddings: this.useLocalEmbeddings,
      useAdvancedPreprocessing: this.useAdvancedPreprocessing,
      enableAsyncProcessing: this.enableAsyncProcessing
    });
  }
  
  /**
   * Check if a codebase has been analyzed
   * 
   * @param codebasePath Path to the codebase
   * @returns Whether the codebase has been analyzed
   */
  async isCodebaseAnalyzed(codebasePath: string): Promise<boolean> {
    return this.vectorStorage.isCodebaseAnalyzed(codebasePath);
  }
  
  /**
   * Get statistics about a codebase
   * 
   * @param codebasePath Path to the codebase
   * @returns Statistics about the codebase
   */
  async getCodebaseStats(codebasePath: string): Promise<any> {
    return this.vectorStorage.getCodebaseStats(codebasePath);
  }
  
  /**
   * Analyzes a codebase and stores the results in the vector database
   * 
   * @param codebasePath Path to the codebase
   * @param options Analysis options
   * @returns Analysis results
   */
  async analyzeCodebase(codebasePath: string, options: any = {}): Promise<any> {
    try {
      // Step 1: Preprocess the codebase
      const preprocessedPath = await this.preprocessor.processCodebase(
        codebasePath, 
        options.updateExisting || false
      );
      
      // Step 2: Analyze core functionality
      const analysisStart = Date.now();
      const basicAnalysis = await this.performBasicAnalysis(preprocessedPath, options);
      const analysisEnd = Date.now();
      
      // Step 3: Apply progressive enhancements if enabled
      let enhancedResults = { ...basicAnalysis };
      
      if (this.enableGitAnalysis && options.includeGit !== false) {
        const gitAnalysis = await this.performGitAnalysis(codebasePath);
        enhancedResults.gitAnalysis = gitAnalysis;
      }
      
      // Step 4: Generate embeddings if needed
      if (this.useLocalEmbeddings && options.deep) {
        enhancedResults.embeddingStatus = 'enabled';
        // In a real implementation, this would call the embedding service
      }
      
      // Return comprehensive results
      return {
        success: true,
        message: 'Codebase analysis complete',
        codebasePath,
        filesAnalyzed: basicAnalysis.filesAnalyzed || 0,
        chunksAnalyzed: basicAnalysis.chunksAnalyzed || 0,
        processingTimeMs: analysisEnd - analysisStart,
        timestamp: new Date().toISOString(),
        operationId: options.operationId || `op-${Date.now()}`,
        ...enhancedResults
      };
    } catch (error) {
      console.error('Error analyzing codebase:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /**
   * Queries the codebase using semantic search
   * 
   * @param query Query string
   * @param codebasePath Optional codebase path to scope the query
   * @param options Query options
   * @returns Query results
   */
  async queryCodebase(query: string, codebasePath: string | null = null, options: any = {}): Promise<any> {
    try {
      // If codebase path provided, ensure it's analyzed first
      if (codebasePath) {
        const isAnalyzed = await this.isCodebaseAnalyzed(codebasePath);
        
        if (!isAnalyzed) {
          console.log(`Codebase ${codebasePath} not yet analyzed, analyzing first...`);
          const analysisResult = await this.analyzeCodebase(codebasePath);
          
          if (!analysisResult.success) {
            return {
              success: false,
              error: `Could not analyze codebase: ${analysisResult.error}`,
              query
            };
          }
        }
      }
      
      // Prepare search parameters
      const searchParams = {
        limit: options.maxResults || 10,
        filter: {},
        scoreThreshold: options.threshold || 0.7
      };
      
      // Add language filter if specified
      if (options.language) {
        searchParams.filter = {
          ...searchParams.filter,
          language: options.language
        };
      }
      
      // Perform the search
      const searchStart = Date.now();
      const searchResults = await this.vectorStorage.search(query, searchParams);
      const searchEnd = Date.now();
      
      // Generate response using LLM
      const llmContext = options.context || [];
      const llmResponse = await this.llmService.generateResponse(query, searchResults, llmContext);
      
      return {
        success: true,
        query,
        codebasePath,
        results: searchResults,
        response: llmResponse,
        searchTimeMs: searchEnd - searchStart,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error querying codebase:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /**
   * Query across all available codebases
   * 
   * @param query Query string
   * @param options Query options
   * @returns Query results across all codebases
   */
  async queryAllCodebases(query: string, options: any = {}): Promise<any> {
    try {
      // Get list of all available codebases
      const codebases = await this.vectorStorage.listCodebases();
      
      if (codebases.length === 0) {
        return {
          success: false,
          error: 'No codebases available for querying',
          query
        };
      }
      
      console.log(`Querying across ${codebases.length} codebases`);
      
      // Perform the query without codebase restriction
      const searchParams = {
        limit: options.maxResults || 10,
        filter: {},
        scoreThreshold: options.threshold || 0.7
      };
      
      // Add language filter if specified
      if (options.language) {
        searchParams.filter = {
          ...searchParams.filter,
          language: options.language
        };
      }
      
      // Perform the search
      const searchStart = Date.now();
      const searchResults = await this.vectorStorage.search(query, searchParams);
      const searchEnd = Date.now();
      
      // Generate response using LLM
      const llmContext = options.context || [];
      const llmResponse = await this.llmService.generateResponse(query, searchResults, llmContext);
      
      return {
        success: true,
        query,
        codebases,
        results: searchResults,
        response: llmResponse,
        searchTimeMs: searchEnd - searchStart,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error querying all codebases:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /**
   * Extracts specific information from the codebase
   * 
   * @param query Extraction query
   * @param codebasePath Path to the codebase
   * @param options Extraction options
   * @returns Extraction results
   */
  async extractFromCodebase(query: string, codebasePath: string, options: any = {}): Promise<any> {
    try {
      // Ensure codebase is analyzed
      const isAnalyzed = await this.isCodebaseAnalyzed(codebasePath);
      
      if (!isAnalyzed) {
        console.log(`Codebase ${codebasePath} not yet analyzed, analyzing first...`);
        const analysisResult = await this.analyzeCodebase(codebasePath);
        
        if (!analysisResult.success) {
          return {
            success: false,
            error: `Could not analyze codebase: ${analysisResult.error}`,
            query
          };
        }
      }
      
      // Prepare extraction parameters
      const extractionParams = {
        limit: options.maxResults || 5,
        type: options.type,
        language: options.language,
        fileName: options.fileName
      };
      
      // Perform the extraction
      const extractionStart = Date.now();
      const extractionResults = await this.vectorStorage.extract(query, extractionParams);
      const extractionEnd = Date.now();
      
      // Process and format the results
      const formattedResults = await this.llmService.formatExtractionResults(
        query, 
        extractionResults, 
        options.includeContext !== false,
        options.format || 'markdown'
      );
      
      return {
        success: true,
        query,
        codebasePath,
        format: options.format || 'markdown',
        results: formattedResults,
        extractionTimeMs: extractionEnd - extractionStart,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error extracting from codebase:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  // Private methods
  
  /**
   * Performs basic analysis of the codebase
   * 
   * @param preprocessedPath Path to the preprocessed codebase
   * @param options Analysis options
   * @returns Basic analysis results
   */
  private async performBasicAnalysis(preprocessedPath: string, options: any = {}): Promise<any> {
    console.log(`Performing basic analysis of ${preprocessedPath}`);
    
    const fileStats = fs.statSync(preprocessedPath);
    const fileContent = fs.readFileSync(preprocessedPath, 'utf-8');
    
    // Count files and lines from XML
    let fileCount = 0;
    let lineCount = 0;
    let totalSize = 0;
    
    // Extract files from XML using regex for simplicity
    // In a production implementation, use a proper XML parser
    const fileRegex = /<file[^>]*>/g;
    let match;
    while ((match = fileRegex.exec(fileContent)) !== null) {
      fileCount++;
    }
    
    lineCount = fileContent.split('\n').length;
    
    // Determine chunk size and count
    const chunkSize = options.maxChunkSize || 100;
    const chunksCount = Math.ceil(lineCount / chunkSize);
    
    // Store in vector database
    // For deep analysis, we'll create proper embeddings
    const deep = options.deep === true;
    
    // Generate placeholder embeddings if not using real embeddings
    const embeddings = deep && this.useLocalEmbeddings
      ? await this.llmService.generateEmbeddings(preprocessedPath)
      : undefined;
    
    // Store in vector database
    await this.vectorStorage.storeCodebase(preprocessedPath, embeddings);
    
    return {
      filesAnalyzed: fileCount || 1,
      chunksAnalyzed: chunksCount,
      fileSizeBytes: fileStats.size,
      lineCount,
      deep
    };
  }
  
  /**
   * Performs git analysis if enabled
   * 
   * @param codebasePath Path to the codebase
   * @returns Git analysis results
   */
  private async performGitAnalysis(codebasePath: string): Promise<any> {
    if (!this.enableGitAnalysis) {
      return {
        available: false,
        reason: 'Git analysis not enabled'
      };
    }
    
    try {
      // Check if git is available
      const isGitRepo = fs.existsSync(path.join(codebasePath, '.git'));
      if (!isGitRepo) {
        return {
          available: false,
          reason: 'Not a git repository'
        };
      }
      
      console.log(`Performing Git analysis of ${codebasePath}`);
      
      // Get git commit count
      const commitCount = execSync('git -C "' + codebasePath + '" rev-list --count HEAD', { timeout: 5000 }).toString().trim();
      
      // Get recent contributors
      const contributors = execSync('git -C "' + codebasePath + '" shortlog -sne --no-merges HEAD', { timeout: 5000 }).toString().trim();
      
      // Get recent commit history
      const recentCommits = execSync('git -C "' + codebasePath + '" log --pretty=format:"%h|%an|%ad|%s" -n 10 --date=short', { timeout: 5000 }).toString().trim();
      
      // Process the commit history
      const commits = recentCommits.split('\n').map(line => {
        const [hash, author, date, message] = line.split('|');
        return { hash, author, date, message };
      });
      
      // Process contributors
      const contributorsList = contributors.split('\n').map(line => {
        const match = line.trim().match(/^\s*(\d+)\s+(.+)$/);
        return match ? { commits: parseInt(match[1], 10), author: match[2].trim() } : null;
      }).filter(Boolean);
      
      return {
        available: true,
        commitCount: parseInt(commitCount, 10),
        contributors: contributorsList,
        recentCommits: commits
      };
    } catch (error) {
      console.error('Error performing git analysis:', error);
      return {
        available: false,
        reason: error instanceof Error ? error.message : String(error)
      };
    }
  }
}

/**
 * Create a new ProgressiveEnhancer with default configuration
 * 
 * @param config Configuration options
 * @returns ProgressiveEnhancer instance
 */
export function createProgressiveEnhancer(config: ProgressiveEnhancerConfig = {}): ProgressiveEnhancer {
  return new ProgressiveEnhancer(config);
}
