// src/tools/vectorLensTool.ts
import { config } from '../config.js';
import { createProgressiveEnhancer } from '../services/progressiveEnhancer.js';
import { 
  ToolOperation, 
  ToolResponse, 
  AnalyzeParams, 
  QueryParams, 
  ExtractParams, 
  VectorCodeLensParams 
} from './index.js';
import { 
  fileExists, 
  analyzeCodebase, 
  queryCodebase, 
  extractFromCodebase 
} from './helpers.js';

/**
 * Unified VectorCodeLens Tool
 * 
 * Following DeepView MCP patterns, this unified tool provides a single interface
 * for analyzing, querying, and extracting information from codebases.
 * It uses progressive enhancement to offer both basic and advanced functionality.
 */
export const vectorCodeLensTool = {
  name: "vectorCodeLens",
  description: "Analyze and query codebases semantically using vector embeddings and LLMs",
  version: "1.0.0",
  
  // Simplified parameter structure following DeepView MCP pattern
  parameters: {
    type: "object",
    properties: {
      operation: {
        type: "string",
        enum: ["analyze", "query", "extract"],
        description: "Operation to perform"
      },
      query: {
        type: "string",
        description: "Question or query about the codebase"
      },
      codebasePath: {
        type: "string",
        description: "Path to codebase file or directory",
        required: false
      },
      options: {
        type: "object",
        description: "Additional operation options",
        required: false,
        properties: {
          // Common options
          maxResults: {
            type: "number",
            description: "Maximum number of results to return",
            default: 5
          },
          threshold: {
            type: "number",
            description: "Similarity threshold (0.0-1.0)",
            default: 0.7
          },
          
          // Analyze operation options
          deep: {
            type: "boolean",
            description: "Perform deep analysis (for analyze operation)",
            default: false
          },
          includeGit: {
            type: "boolean",
            description: "Include Git history analysis (for analyze operation)",
            default: false
          },
          updateExisting: {
            type: "boolean",
            description: "Update existing analysis (for analyze operation)",
            default: false
          },
          
          // Query operation options
          language: {
            type: "string",
            description: "Filter results by programming language (for query operation)",
            required: false
          },
          context: {
            type: "array",
            items: { type: "string" },
            description: "Additional context for query (for query operation)",
            required: false
          },
          
          // Extract operation options
          type: {
            type: "string",
            enum: ["function", "class", "interface", "variable", "import"],
            description: "Type of code to extract (for extract operation)",
            required: false
          },
          includeContext: {
            type: "boolean",
            description: "Include surrounding context (for extract operation)",
            default: true
          },
          format: {
            type: "string",
            enum: ["json", "markdown", "text"],
            description: "Output format (for extract operation)",
            default: "markdown"
          }
        }
      }
    },
    required: ["operation"]
  },
  
  /**
   * Unified handler function for all vectorCodeLens operations
   * 
   * @param params Tool parameters
   * @returns Tool response
   */
  async handler(params: VectorCodeLensParams): Promise<ToolResponse> {
    const { operation, query, codebasePath, options = {} } = params;
    
    // Validate operation
    if (!Object.values(ToolOperation).includes(operation as ToolOperation)) {
      return {
        success: false,
        error: `Invalid operation: ${operation}. Must be one of: ${Object.values(ToolOperation).join(', ')}`
      };
    }
    
    // Validate basic parameters
    if ((operation === ToolOperation.Query || operation === ToolOperation.Extract) && !query) {
      return {
        success: false,
        error: "Missing required parameter: query"
      };
    }
    
    if ((operation === ToolOperation.Analyze || operation === ToolOperation.Extract) && !codebasePath) {
      return {
        success: false,
        error: "Missing required parameter: codebasePath"
      };
    }
    
    // Check if codebasePath exists when provided
    if (codebasePath && !await fileExists(codebasePath)) {
      return {
        success: false,
        error: `Codebase path does not exist: ${codebasePath}`
      };
    }
    
    try {
      // Initialize service with progressive enhancement
      const enhancer = createProgressiveEnhancer(config);
      
      // Process based on operation type
      switch (operation) {
        case ToolOperation.Analyze:
          return await analyzeCodebase(enhancer, codebasePath!, options as AnalyzeParams['options']);
          
        case ToolOperation.Query:
          return await queryCodebase(enhancer, query!, codebasePath, options as QueryParams['options']);
          
        case ToolOperation.Extract:
          return await extractFromCodebase(enhancer, query!, codebasePath!, options as ExtractParams['options']);
          
        default:
          return {
            success: false,
            error: `Unsupported operation: ${operation}`
          };
      }
    } catch (error) {
      console.error(`Error in vectorCodeLens tool:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
};
