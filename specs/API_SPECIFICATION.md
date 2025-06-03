# VectorCodeLens API Specification

## MCP Tools Interface

VectorCodeLens exposes two primary MCP tools for code analysis and querying.

### Tool: codeAnalyzer

Analyzes a codebase to extract key information about structure, dependencies, API usage, and architectural patterns.

#### Parameters

```typescript
interface CodeAnalyzerParams {
  directory: string;                    // Required: Path to codebase directory
  chunkingStrategy?: 'fixed' | 'sentence' | 'paragraph';  // Default: 'paragraph'
  filePatterns?: string[];              // File patterns to include (e.g. ['*.ts', '*.js'])
  includeChunks?: boolean;              // Include chunked content in analysis (default: false)
  includeSummary?: boolean;             // Include natural language summary (default: true)
  maxDepth?: number;                    // Maximum directory depth (default: 3)
  maxFileSize?: number;                 // Maximum file size in KB (default: 500)
}
```

#### Response Format

```typescript
interface CodeAnalyzerResponse {
  filesAnalyzed: number;
  chunksAnalyzed: number;
  errors: string[];
  stats: {
    totalChunks: number;
    totalFiles: number;
    // Additional storage statistics
  };
}
```

#### Example Usage

```json
{
  "directory": "/path/to/project",
  "filePatterns": ["*.ts", "*.js"],
  "maxDepth": 5,
  "includeSummary": true
}
```

### Tool: queryCodebase

Queries the analyzed codebase using natural language to find relevant code patterns and structures.

#### Parameters

```typescript
interface QueryCodebaseParams {
  query: string;                        // Required: Natural language query
  limit?: number;                       // Maximum results to return (default: 5)
}
```

#### Response Format

```typescript
interface QueryCodebaseResponse {
  results: CodeMatch[];
  totalMatches: number;
  query: string;
  executionTime: number;
}

interface CodeMatch {
  score: number;                        // Similarity score
  filePath: string;                     // File path
  startLine: number;                    // Start line number
  endLine: number;                      // End line number
  code: string;                         // Code content
  analysis?: LLMAnalysis;               // Optional LLM analysis
  context?: {
    functions: string[];
    classes: string[];
    imports: string[];
  };
}
```

#### Example Usage

```json
{
  "query": "How are errors handled in this codebase?",
  "limit": 10
}
```

## Controller API

### CodeAnalyzerController

#### Methods

##### analyzeDirectory(directoryPath: string, options?: AnalysisOptions)

```typescript
interface AnalysisOptions {
  maxDepth?: number;                    // Directory traversal depth
  includePatterns?: string[];           // File patterns to include
  excludePatterns?: string[];           // File patterns to exclude
  maxFileSize?: number;                 // Maximum file size in bytes
}
```

Returns analysis results and error information.

##### queryCodebase(query: string, options?: QueryOptions)

```typescript
interface QueryOptions {
  limit?: number;                       // Result limit
  threshold?: number;                   // Similarity threshold
}
```

Returns semantic search results.

##### getStorageStats()

Returns vector database statistics and storage information.

## Storage Interface

### CodeVectorStorage

#### Methods

##### storeAnalysis(chunkId: string, chunk: EnhancedChunk, analysis: LLMAnalysis, embedding?: number[])

Stores code analysis with optional vector embedding.

##### queryByEmbedding(embedding: number[], limit: number)

Performs similarity search using vector embeddings.

##### getStats()

Returns storage statistics including chunk count and database size.

## Configuration Interface

### Environment Variables

```bash
# Core Settings
VECTOR_DB_URL=http://127.0.0.1:6333
LLM_SERVICE_URL=http://localhost:11434
CLAUDE_API_KEY=optional_claude_key

# LLM Models
LLM_MODEL=rjmalagon/gte-qwen2-1.5b-instruct-embed-f16
CLAUDE_MODEL=claude-3-5-sonnet-20240620

# Vector Database
VECTOR_COLLECTION=code_analysis
VECTOR_DIMENSIONS=1536
VECTOR_DISTANCE=Cosine

# Feature Flags
USE_LOCAL_EMBEDDINGS=true
ENABLE_GIT_ANALYSIS=false

# Performance
CHUNK_SIZE=100
CHUNK_OVERLAP=20

# Logging
LOG_LEVEL=INFO
```

### Config Object Structure

```typescript
interface Config {
  vectorDbUrl: string;
  llmServiceUrl: string;
  claudeApiKey?: string;
  defaultLlmModel: string;
  claudeModel: string;
  vectorCollection: string;
  vectorDimensions: number;
  vectorDistance: string;
  useLocalEmbeddings: boolean;
  enableGitAnalysis: boolean;
  chunkSize: number;
  chunkOverlap: number;
  defaultExcludePatterns: string[];
  logLevel: string;
  isClaudeEnabled: boolean;
  isLocalLlmEnabled: boolean;
}
```

## Error Handling

### Error Categories

1. **Configuration Errors**: Invalid or missing configuration
2. **Service Availability Errors**: External service unavailability
3. **File System Errors**: Permission or path issues
4. **Analysis Errors**: LLM or processing failures
5. **Storage Errors**: Vector database issues

### Error Response Format

```typescript
interface ErrorResponse {
  error: string;                        // Error message
  code?: string;                        // Error code
  details?: any;                        // Additional details
}
```

### Error Recovery

- Graceful degradation for optional services
- Detailed error logging with context
- Partial success handling (some files/chunks may fail)
- Retry mechanisms for transient failures

## Rate Limiting and Performance

### Chunking Limits
- Default chunk size: 100 lines
- Default overlap: 20 lines
- Maximum file size: 500KB (configurable)
- Maximum depth: 3 levels (configurable)

### Service Timeouts
- LLM requests: 30 seconds
- Vector operations: 10 seconds
- File operations: 5 seconds

### Batch Processing
- Files processed sequentially
- Chunks processed in parallel where possible
- Error isolation per chunk/file