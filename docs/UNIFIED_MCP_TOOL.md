# Unified MCP Tool for VectorCodeLens

## Overview

The Unified MCP Tool for VectorCodeLens provides a streamlined interface for code analysis operations while maintaining progressive enhancement capabilities. This document explains the design, implementation, and usage of the unified tool.

## Key Features

### 1. Single Unified Interface

The core of this implementation is a single `vectorCodeLens` tool that handles all operations (analyze, query, extract) through a consistent parameter structure. This follows the DeepView MCP approach of simplifying the API surface while maintaining powerful functionality.

```typescript
// Example usage:
const result = await vectorCodeLensTool.handler({
  operation: 'query',
  query: 'How does the authentication system work?',
  codebasePath: '/path/to/project',
  options: {
    maxResults: 10,
    language: 'TypeScript'
  }
});
```

### 2. Progressive Enhancement

The implementation supports progressive enhancement through feature flags and configuration options:

- **Basic Mode**: Works out-of-the-box with minimal dependencies
- **Enhanced Mode**: Activates advanced features when available
- **Feature Toggles**: Enable/disable Git analysis, local embeddings, etc.
- **Fallback Mechanisms**: Graceful degradation when services are unavailable

### 3. Robust Error Handling

Comprehensive error handling ensures reliability and clear feedback:

- Parameter validation with descriptive error messages
- File existence checks before operations
- Operation ID tracking for long-running tasks
- Detailed status reporting and timestamps

### 4. Operation-Specific Features

Each operation has been enhanced with specialized functionality:

- **Analyze**: Includes automatic sizing detection, metadata collection, and performance tracking
- **Query**: Supports cross-codebase searches and automatic analysis of unanalyzed codebases
- **Extract**: Added format options (JSON, Markdown, Text) and type filtering for targeted extraction

## Implementation Details

### Architecture

The Unified MCP Tool follows a modular architecture with these key components:

1. **VectorCodeLens Tool**: The unified entry point with standardized parameters
2. **ProgressiveEnhancer**: Orchestrates the various services and handles feature flags
3. **Service Interfaces**: Clean abstractions for preprocessing, storage, and LLM services
4. **Helper Functions**: Utility functions for common operations

```
┌─────────────────┐
│                 │
│  vectorLensTool │
│                 │
└────────┬────────┘
         │
         ▼
┌─────────────────┐    ┌─────────────┐
│                 │    │             │
│ ProgressiveEnh- │───►│ LLM Service │
│     ancer       │    │             │
│                 │    └─────────────┘
└────┬───┬────────┘
     │   │          ┌─────────────┐
     │   └─────────►│             │
     │              │  Storage    │
     │              │             │
     │              └─────────────┘
     │
     │              ┌─────────────┐
     └─────────────►│             │
                    │Preprocessing│
                    │             │
                    └─────────────┘
```

### Files Implemented

- `src/tools/vectorLensTool.ts`: Main unified tool implementation
- `src/tools/index.ts`: Type definitions and exports
- `src/tools/helpers.ts`: Helper functions for operations
- `src/services/progressiveEnhancer.ts`: Service orchestration
- `src/services/llm/index.ts`: LLM service factory and interfaces
- `test/vectorLensTool.test.js`: Test suite for the unified tool

## Usage Guide

### Basic Operations

#### Analyzing a Codebase

```typescript
const result = await vectorCodeLensTool.handler({
  operation: 'analyze',
  codebasePath: '/path/to/codebase',
  options: {
    deep: true,         // Perform thorough analysis
    includeGit: true    // Include Git history analysis
  }
});
```

#### Querying a Codebase

```typescript
const result = await vectorCodeLensTool.handler({
  operation: 'query',
  query: 'How is authentication implemented?',
  codebasePath: '/path/to/codebase',  // Optional
  options: {
    maxResults: 10,
    language: 'TypeScript',
    threshold: 0.75     // Similarity threshold
  }
});
```

#### Extracting from a Codebase

```typescript
const result = await vectorCodeLensTool.handler({
  operation: 'extract',
  query: 'Find all error handling functions',
  codebasePath: '/path/to/codebase',
  options: {
    type: 'function',
    format: 'markdown',
    includeContext: true
  }
});
```

### Advanced Features

#### Asynchronous Processing

For large codebases, operations can run asynchronously:

```typescript
// Start analysis
const initResult = await vectorCodeLensTool.handler({
  operation: 'analyze',
  codebasePath: '/path/to/large/codebase'
});

// Get operation ID
const { operationId } = initResult;

// Check status later
const statusResult = await checkOperationStatus(operationId);
```

#### Cross-Codebase Querying

To query across all analyzed codebases:

```typescript
const result = await vectorCodeLensTool.handler({
  operation: 'query',
  query: 'How is logging implemented?',
  // Omit codebasePath to search all codebases
  options: {
    maxResults: 15
  }
});
```

## Configuration Options

The unified tool can be configured through the ProgressiveEnhancer:

```typescript
import { createProgressiveEnhancer } from '../services/progressiveEnhancer';
import { config } from '../config';

// Create custom configuration
const customConfig = {
  ...config,
  enableGitAnalysis: true,
  useLocalEmbeddings: true,
  useAdvancedPreprocessing: true,
  enableAsyncProcessing: true
};

// Create enhanced service
const enhancer = createProgressiveEnhancer(customConfig);

// Use with tool
// ...
```

## Response Format

All operations return a consistent response structure:

```typescript
{
  success: boolean,      // Operation success status
  message?: string,      // Success message if applicable
  error?: string,        // Error message if applicable
  operationId?: string,  // ID for tracking long operations
  timestamp: string,     // ISO timestamp
  
  // Operation-specific data
  // ...
}
```

## Error Handling

The unified tool provides detailed error information:

```typescript
try {
  const result = await vectorCodeLensTool.handler({
    operation: 'analyze',
    codebasePath: '/invalid/path'
  });
  
  if (!result.success) {
    console.error(`Error: ${result.error}`);
  }
} catch (error) {
  console.error('Unexpected error:', error);
}
```

## Best Practices

1. **Pre-validating Parameters**: Check parameters before calling the handler
2. **Operation ID Tracking**: Store operation IDs for long-running tasks
3. **Progressive Feature Adoption**: Start with basic functionality and enable advanced features as needed
4. **Error Handling**: Always check `success` property in responses
5. **Background Processing**: For large codebases, use the asynchronous pattern with operation IDs

## Conclusion

The Unified MCP Tool represents a significant enhancement to VectorCodeLens, offering a more intuitive, powerful, and flexible interface while maintaining backward compatibility with existing systems. By following the DeepView MCP patterns, it establishes a foundation for future extensions and improvements to codebase analysis capabilities.
