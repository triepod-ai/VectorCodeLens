// src/tools/helpers.ts
import fs from 'fs';
import path from 'path';
import { AnalyzeParams, QueryParams, ExtractParams, ToolResponse } from './index.js';

/**
 * Helper function to check if a file exists
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.promises.access(filePath, fs.constants.F_OK);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Generate a unique operation ID
 */
export function generateOperationId(): string {
  return 'op-' + Math.random().toString(36).substring(2, 15);
}

/**
 * Check if a codebase is small enough for synchronous processing
 */
export function isSmallCodebase(codebasePath: string, stats: fs.Stats, isDirectory: boolean): boolean {
  // If it's a file and less than 1MB, it's small
  if (!isDirectory && stats.size < 1024 * 1024) {
    return true;
  }
  
  // If it's a directory, it's considered small only if it has few files
  if (isDirectory) {
    try {
      const entries = fs.readdirSync(codebasePath);
      return entries.length < 10;
    } catch (error) {
      console.error('Error checking directory size:', error);
      return false;
    }
  }
  
  return false;
}

/**
 * Get the size of a directory
 */
export async function getDirectorySize(dirPath: string): Promise<number> {
  try {
    let totalSize = 0;
    const files = await fs.promises.readdir(dirPath);
    
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stats = await fs.promises.stat(filePath);
      
      if (stats.isDirectory()) {
        totalSize += await getDirectorySize(filePath);
      } else {
        totalSize += stats.size;
      }
    }
    
    return totalSize;
  } catch (error) {
    console.error('Error calculating directory size:', error);
    return 0;
  }
}

/**
 * Analyze a codebase
 * 
 * @param enhancer Progressive enhancer instance
 * @param codebasePath Path to the codebase
 * @param options Analysis options
 * @returns Analysis results
 */
export async function analyzeCodebase(
  enhancer: any, 
  codebasePath: string, 
  options: AnalyzeParams['options'] = {}
): Promise<ToolResponse> {
  console.log(`Analyzing codebase: ${codebasePath}`, options);
  
  try {
    // Get detailed codebase stats
    const stats = fs.statSync(codebasePath);
    const isDirectory = stats.isDirectory();
    
    // Generate operation ID for tracking
    const operationId = generateOperationId();
    
    // Default response with useful metadata
    const baseResponse: ToolResponse = {
      success: true,
      message: 'Codebase analysis started',
      operationId,
      codebasePath,
      isDirectory,
      timestamp: new Date().toISOString(),
      options
    };
    
    // Start analysis in background
    const analysisPromise = enhancer.analyzeCodebase(codebasePath, {
      ...options,
      operationId
    });
    
    // For small codebases, we can wait for completion
    if (isSmallCodebase(codebasePath, stats, isDirectory)) {
      const results = await analysisPromise;
      return {
        ...baseResponse,
        ...results,
        message: 'Codebase analysis complete',
        status: 'complete'
      };
    }
    
    // For larger codebases, return immediately with operation ID
    return {
      ...baseResponse,
      status: 'processing',
      estimatedSize: isDirectory ? await getDirectorySize(codebasePath) : stats.size,
      message: 'Codebase analysis started. Use the operationId to check status.'
    };
  } catch (error) {
    console.error('Error analyzing codebase:', error);
    return {
      success: false,
      error: `Analysis failed: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Query a codebase
 * 
 * @param enhancer Progressive enhancer instance
 * @param query Query text
 * @param codebasePath Optional codebase path
 * @param options Query options
 * @returns Query results
 */
export async function queryCodebase(
  enhancer: any,
  query: string,
  codebasePath?: string,
  options: QueryParams['options'] = {}
): Promise<ToolResponse> {
  console.log(`Querying codebase with: "${query}"`, { codebasePath, options });
  
  try {
    // If no codebase specified, query across all available codebases
    if (!codebasePath) {
      return await enhancer.queryAllCodebases(query, options);
    }
    
    // If codebase specified but not yet analyzed, analyze it first
    const isAnalyzed = await enhancer.isCodebaseAnalyzed(codebasePath);
    
    if (!isAnalyzed) {
      console.log(`Codebase ${codebasePath} not yet analyzed, analyzing first...`);
      const analysisResult = await enhancer.analyzeCodebase(codebasePath);
      
      if (!analysisResult.success) {
        return {
          success: false,
          error: `Could not analyze codebase: ${analysisResult.error}`,
          query
        };
      }
    }
    
    // Perform the query with enhanced options
    const queryResults = await enhancer.queryCodebase(query, codebasePath, {
      maxResults: 10,
      includeContext: true,
      ...options
    });
    
    // Format the results for better readability
    return {
      ...queryResults,
      query,
      codebasePath,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error querying codebase:', error);
    return {
      success: false,
      error: `Query failed: ${error instanceof Error ? error.message : String(error)}`,
      query
    };
  }
}

/**
 * Extract information from a codebase
 * 
 * @param enhancer Progressive enhancer instance
 * @param query Extraction query
 * @param codebasePath Path to the codebase
 * @param options Extraction options
 * @returns Extraction results
 */
export async function extractFromCodebase(
  enhancer: any,
  query: string,
  codebasePath: string,
  options: ExtractParams['options'] = {}
): Promise<ToolResponse> {
  console.log(`Extracting from codebase: "${query}"`, { codebasePath, options });
  
  try {
    // Ensure codebase is analyzed
    const isAnalyzed = await enhancer.isCodebaseAnalyzed(codebasePath);
    
    if (!isAnalyzed) {
      console.log(`Codebase ${codebasePath} not yet analyzed, analyzing first...`);
      const analysisResult = await enhancer.analyzeCodebase(codebasePath);
      
      if (!analysisResult.success) {
        return {
          success: false,
          error: `Could not analyze codebase: ${analysisResult.error}`,
          query
        };
      }
    }
    
    // Perform the extraction with enhanced options
    const extractionResults = await enhancer.extractFromCodebase(query, codebasePath, {
      ...options,
      format: options.format || 'markdown'
    });
    
    // Format the results based on requested format
    const format = options.format || 'markdown';
    
    return {
      ...extractionResults,
      query,
      codebasePath,
      format,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error extracting from codebase:', error);
    return {
      success: false,
      error: `Extraction failed: ${error instanceof Error ? error.message : String(error)}`,
      query
    };
  }
}
