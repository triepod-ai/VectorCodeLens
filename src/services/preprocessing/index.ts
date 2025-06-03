// src/services/preprocessing/index.ts
import { Preprocessor } from './preprocessor.js';

export { Preprocessor };

/**
 * Factory function to create a preprocessor instance with default configuration
 */
export function createPreprocessor(config: any = {}): Preprocessor {
  return new Preprocessor(config);
}

/**
 * Process a codebase in a simplified manner
 * This helper function provides a streamlined interface for the common case
 */
export async function processCodebase(codebasePath: string, config: any = {}): Promise<string> {
  const preprocessor = createPreprocessor(config);
  return await preprocessor.processCodebase(codebasePath);
}

// Progressive enhancement types
export enum PreprocessorType {
  Basic = 'basic',
  Advanced = 'advanced'
}

// Configuration interface for the Preprocessor
export interface PreprocessorConfig {
  excludePatterns?: string[];
  includePatterns?: string[];
  maxFileSize?: number;
  type?: PreprocessorType;
}

// Default exclude patterns for code preprocessing
export const DEFAULT_EXCLUDE_PATTERNS = [
  '**/node_modules/**', 
  '**/dist/**', 
  '**/.git/**', 
  '**/build/**', 
  '**/__pycache__/**',
  '**/coverage/**',
  '**/tmp/**',
  '**/temp/**',
  '**/.vscode/**',
  '**/.idea/**'
];
