// src/index.ts
import { CodeAnalyzerController } from './controller.js';

// Define ToolOptions interface for API handlers
export interface ToolOptions {
  [key: string]: any;
}

// Create a singleton instance of the controller
const controller = new CodeAnalyzerController();

export const codeAnalyzer = {
  description: 'Analyzes a codebase to extract key information about structure, dependencies, API usage, and architectural patterns.',
  parameters: {
    type: 'object',
    properties: {
      directory: {
        type: 'string',
        description: 'Path to the codebase directory to analyze'
      },
      chunkingStrategy: {
        type: 'string',
        enum: ['fixed', 'sentence', 'paragraph'],
        description: 'Strategy to use for chunking (fixed, sentence, paragraph)',
        default: 'paragraph'
      },
      filePatterns: {
        type: 'array',
        items: {
          type: 'string'
        },
        description: "File patterns to include (e.g. ['*.ts', '*.js']). Default is to analyze all files."
      },
      includeChunks: {
        type: 'boolean',
        description: 'Whether to include chunked file contents in the analysis',
        default: false
      },
      includeSummary: {
        type: 'boolean',
        description: 'Whether to include a natural language summary of the codebase',
        default: true
      },
      maxDepth: {
        type: 'number',
        description: 'Maximum directory depth to analyze (default: 3)',
        default: 3
      },
      maxFileSize: {
        type: 'number',
        description: 'Maximum file size in KB to analyze (default: 500)',
        default: 500
      }
    },
    required: ['directory']
  },
  handler: async (options: ToolOptions) => {
    try {
      const {
        directory,
        filePatterns,
        maxDepth = 3,
        maxFileSize = 500
      } = options;
      
      // Convert file patterns to include patterns
      const includePatterns = filePatterns 
        ? (Array.isArray(filePatterns) ? filePatterns : [filePatterns]) 
        : undefined;
      
      // Analyze the directory
      const result = await controller.analyzeDirectory(directory, {
        maxDepth,
        includePatterns,
        maxFileSize: maxFileSize * 1024 // Convert KB to bytes
      });
      
      // Get storage stats
      const stats = await controller.getStorageStats();
      
      return {
        ...result,
        stats
      };
    } catch (error) {
      console.error('Error in code analyzer handler:', error);
      return {
        error: (error as any).message
      };
    }
  }
};

export const queryCodebase = {
  description: 'Queries the analyzed codebase using natural language to find relevant code patterns and structures.',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Natural language query about the codebase'
      },
      limit: {
        type: 'number',
        description: 'Maximum number of results to return',
        default: 5
      }
    },
    required: ['query']
  },
  handler: async (options: ToolOptions) => {
    try {
      const { query, limit = 5 } = options;
      
      // Query the codebase
      const results = await controller.queryCodebase(query, { limit });
      
      return results;
    } catch (error) {
      console.error('Error in query codebase handler:', error);
      return {
        error: (error as any).message
      };
    }
  }
};

export default {
  codeAnalyzer,
  queryCodebase
};