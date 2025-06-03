# VectorCodeLens Implementation Summary

## Overview

This project implements a code analysis tool that can scan, analyze, and enable natural language querying of codebases. It uses a local LLM for code analysis and a vector database (Qdrant) for storage and retrieval.

## Components

### 1. Scanner
- **file-scanner.ts**: Scans directories for code files, supports filtering by patterns and file size
- **chunker.ts**: Chunks code files into smaller pieces for analysis, detects functions and classes

### 2. Analysis
- **llm-analyzer.ts**: Analyzes code chunks using an LLM, extracts purpose, complexity, issues, etc.

### 3. Storage
- **vector-db.ts**: Stores code analysis in Qdrant vector database
- **embedding.ts**: Generates embeddings for code chunks to enable semantic search

### 4. LLM Services
- **llm/llmService.ts**: Provides LLM capabilities with provider abstraction
- **query-handler.ts**: Handles natural language queries about the codebase

### 5. Tools
- **vectorLensTool.ts**: New unified MCP tool for all operations
- **helpers.ts**: Helper functions for tool operations

### 6. Services
- **progressiveEnhancer.ts**: Service orchestration with progressive enhancement
- **preprocessing/**: Code preprocessing services
- **storage/**: Vector storage services

### 7. Core
- **controller.ts**: Orchestrates the entire analysis process
- **config.ts**: Configuration for scanner, LLM, and vector database
- **index.ts**: Export functions for the MCP server

## Usage

Build the project with `npm run build` and then use it:

### Legacy Interface
```javascript
import { codeAnalyzer, queryCodebase } from '@modelcontextprotocol/vector-code-lens';

// Analyze a codebase
const result = await codeAnalyzer.handler({
  directory: '/path/to/your/codebase'
});

// Query the analyzed codebase
const queryResult = await queryCodebase.handler({
  query: 'How is error handling implemented?'
});
```

### New Unified Interface
```javascript
import { vectorCodeLensTool } from '@modelcontextprotocol/vector-code-lens';

// Analyze a codebase
const result = await vectorCodeLensTool.handler({
  operation: 'analyze',
  codebasePath: '/path/to/your/codebase',
  options: {
    deep: true,
    includeGit: true
  }
});

// Query the analyzed codebase
const queryResult = await vectorCodeLensTool.handler({
  operation: 'query',
  query: 'How is error handling implemented?',
  options: {
    maxResults: 10
  }
});

// Extract specific code elements
const extractResult = await vectorCodeLensTool.handler({
  operation: 'extract',
  query: 'Find all authentication functions',
  codebasePath: '/path/to/your/codebase',
  options: {
    type: 'function',
    format: 'markdown'
  }
});
```

## Dependencies

- `@modelcontextprotocol/sdk`: For MCP server integration
- `@qdrant/js-client-rest`: For vector database operations
- `node-fetch`: For communicating with the LLM API
- `fs-extra` and `glob`: For file system operations
- `zod`: For schema validation and parameter checking
- `lru-cache`: For efficient caching of results
- Other utility libraries

## Key Features

1. **Unified MCP Tool**: Single interface for all code analysis operations
2. **Progressive Enhancement**: Feature flags for advanced capabilities
3. **Git Integration**: Analyze commit history and code relationships
4. **Multi-codebase Support**: Query across multiple analyzed codebases
5. **Extraction Capabilities**: Extract specific code elements by type
6. **Parallel Processing**: Efficient handling of large codebases

## Next Steps

1. Add more language-specific code structure detection
2. Improve chunking strategies beyond simple line-based chunking
3. Add code relationship analysis (e.g., function call graphs)
4. Implement incremental updates to avoid reanalyzing unchanged files
5. Add visualization of code relationships and insights
6. Expand unified MCP tool capabilities with streaming responses
7. Add support for cross-language analysis and relationship detection
8. Implement advanced Git-based analysis features
