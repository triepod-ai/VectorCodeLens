// src/tools/index.ts
import { vectorCodeLensTool } from './vectorLensTool.js';

export { vectorCodeLensTool };

// Tool operation types
export enum ToolOperation {
  Analyze = 'analyze',
  Query = 'query',
  Extract = 'extract'
}

// Common response interface
export interface ToolResponse {
  success: boolean;
  message?: string;
  error?: string;
  [key: string]: any;
}

// Tool operation parameters interfaces
export interface AnalyzeParams {
  codebasePath: string;
  options?: {
    deep?: boolean;
    includeGit?: boolean;
    maxChunkSize?: number;
    updateExisting?: boolean;
  };
}

export interface QueryParams {
  query: string;
  codebasePath?: string;
  options?: {
    maxResults?: number;
    threshold?: number;
    language?: string;
    context?: string[];
  };
}

export interface ExtractParams {
  query: string;
  codebasePath: string;
  options?: {
    maxResults?: number;
    type?: 'function' | 'class' | 'interface' | 'variable' | 'import';
    includeContext?: boolean;
    format?: 'json' | 'markdown' | 'text';
  };
}

// Unified tool parameters
export interface VectorCodeLensParams {
  operation: ToolOperation | string;
  query?: string;
  codebasePath?: string;
  options?: Record<string, any>;
}
