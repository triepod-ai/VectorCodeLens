// src/config.ts
// Simplified configuration based on MCP pattern
import path from 'path';
import fs from 'fs';

// Try to load .env file for environment variables
try {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match && match[1] && match[2]) {
        process.env[match[1].trim()] = match[2].trim();
      }
    });
  }
} catch (error) {
  console.warn('Failed to load .env file:', error);
}

// Configuration with sensible defaults
export interface Config {
  // Core settings
  vectorDbUrl: string;
  llmServiceUrl: string;
  claudeApiKey?: string;
  
  // LLM settings
  defaultLlmModel: string;
  claudeModel: string;
  
  // Vector database settings
  vectorCollection: string;
  vectorDimensions: number;
  vectorDistance: string;
  
  // Feature flags
  useLocalEmbeddings: boolean;
  enableGitAnalysis: boolean;
  
  // Performance settings
  chunkSize: number;
  chunkOverlap: number;
  
  // Preprocessing settings
  defaultExcludePatterns: string[];
  
  // Runtime settings
  logLevel: string;
  
  // Computed properties
  isClaudeEnabled: boolean;
  isLocalLlmEnabled: boolean;

  // Nested config structures for backward compatibility
  llm: {
    url: string;
    embeddingsUrl: string;
    temperature: number;
    maxTokens: number;
    retryAttempts: number;
    retryDelay: number;
  };
  
  ollama: {
    enabled: boolean;
    model: string;
  };
  
  scanner: {
    maxDepth: number;
    defaultIncludePatterns: string[];
    defaultExcludePatterns: string[];
    maxFileSize: number;
    chunkSize: number;
    overlapSize: number;
  };
  
  vectorDb: {
    url: string;
    collection: string;
    dimensions: number;
    distance: string;
  };
}

export const config: Config = {
  // Core settings
  vectorDbUrl: process.env.VECTOR_DB_URL || 'http://localhost:6333',
  llmServiceUrl: process.env.LLM_SERVICE_URL || 'http://localhost:11434',
  claudeApiKey: process.env.CLAUDE_API_KEY, // Optional, can be undefined
  
  // LLM settings
  defaultLlmModel: process.env.LLM_MODEL || 'rjmalagon/gte-qwen2-1.5b-instruct-embed-f16',
  claudeModel: process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-20240620',
  
  // Vector database settings
  vectorCollection: process.env.VECTOR_COLLECTION || 'code_analysis',
  vectorDimensions: parseInt(process.env.VECTOR_DIMENSIONS || '1536', 10),
  vectorDistance: process.env.VECTOR_DISTANCE || 'Cosine',
  
  // Feature flags for progressive enhancement
  useLocalEmbeddings: process.env.USE_LOCAL_EMBEDDINGS === 'true',
  enableGitAnalysis: process.env.ENABLE_GIT_ANALYSIS === 'true',
  
  // Performance settings
  chunkSize: parseInt(process.env.CHUNK_SIZE || '100', 10),
  chunkOverlap: parseInt(process.env.CHUNK_OVERLAP || '20', 10),
  
  // Preprocessing settings
  defaultExcludePatterns: [
    '**/node_modules/**', 
    '**/dist/**', 
    '**/.git/**', 
    '**/build/**', 
    '**/__pycache__/**'
  ],
  
  // Runtime settings
  logLevel: process.env.LOG_LEVEL || 'INFO',
  
  // Nested config structures for backward compatibility
  llm: {
    url: process.env.LLM_SERVICE_URL || 'http://localhost:11434',
    embeddingsUrl: process.env.LLM_EMBEDDINGS_URL || process.env.LLM_SERVICE_URL || 'http://localhost:11434',
    temperature: parseFloat(process.env.LLM_TEMPERATURE || '0.7'),
    maxTokens: parseInt(process.env.LLM_MAX_TOKENS || '2048', 10),
    retryAttempts: parseInt(process.env.LLM_RETRY_ATTEMPTS || '3', 10),
    retryDelay: parseInt(process.env.LLM_RETRY_DELAY || '1000', 10)
  },
  
  ollama: {
    enabled: process.env.OLLAMA_ENABLED !== 'false', // Default to true unless explicitly disabled
    model: process.env.OLLAMA_MODEL || process.env.LLM_MODEL || 'rjmalagon/gte-qwen2-1.5b-instruct-embed-f16'
  },
  
  scanner: {
    maxDepth: parseInt(process.env.SCANNER_MAX_DEPTH || '10', 10),
    defaultIncludePatterns: (process.env.SCANNER_INCLUDE_PATTERNS || '**/*.{ts,js,py,java,cpp,c,h,hpp,cs,rb,go,rs,php,kt,swift}').split(','),
    defaultExcludePatterns: [
      '**/node_modules/**', 
      '**/dist/**', 
      '**/.git/**', 
      '**/build/**', 
      '**/__pycache__/**',
      '**/target/**',
      '**/vendor/**',
      '**/.vscode/**',
      '**/.idea/**'
    ],
    maxFileSize: parseInt(process.env.SCANNER_MAX_FILE_SIZE || '1048576', 10), // 1MB default
    chunkSize: parseInt(process.env.SCANNER_CHUNK_SIZE || '100', 10),
    overlapSize: parseInt(process.env.SCANNER_OVERLAP_SIZE || '20', 10)
  },
  
  vectorDb: {
    url: process.env.VECTOR_DB_URL || 'http://localhost:6333',
    collection: process.env.VECTOR_COLLECTION || 'code_analysis',
    dimensions: parseInt(process.env.VECTOR_DIMENSIONS || '1536', 10),
    distance: process.env.VECTOR_DISTANCE || 'Cosine'
  },
  
  // Check if services are enabled
  get isClaudeEnabled(): boolean {
    return !!this.claudeApiKey;
  },
  
  get isLocalLlmEnabled(): boolean {
    return !this.isClaudeEnabled || this.useLocalEmbeddings;
  }
};

export default config;
