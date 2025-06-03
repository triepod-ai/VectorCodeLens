# VectorCodeLens v0.1.1

A semantic codebase analysis platform that uses vector embeddings and LLMs to understand and query codebases.

## Features

- Scan and analyze codebases of various languages
- Extract key information about code structure, purpose, and complexity
- Query the codebase using natural language
- Store analysis in a vector database for efficient retrieval

## Prerequisites

- Node.js (v16+)
- An LLM server (local or remote) for code analysis
- Qdrant vector database (for storage and retrieval)

## Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Build the project:

```bash
npm run build
```

## Configuration

Edit the `src/config.ts` file to configure:

- Ollama LLM server URL (`llm.url`, default: http://localhost:11434)
- Ollama embedding endpoint (`llm.embeddingsUrl`, default: http://localhost:11434/v1/embeddings)
- Ollama model (`ollama.model`, default: `rjmalagon/gte-qwen2-1.5b-instruct-embed-f16`)
- Vector database URL (`vectorDb.url`, default: http://127.0.0.1:6333)
- Vector database dimension (`vectorDb.dimensions`, default: 1536 - **Must match the output dimension of the chosen Ollama model**)
- Scanner settings (file patterns, chunk size, etc.)

### Ollama Integration

VectorCodeLens now uses Ollama for LLM capabilities. Ensure you have Ollama running locally with at least one model installed. You can test the connection by running the provided test script:

```bash
./test_ollama.bat
```

To install Ollama models:

```bash
ollama pull rjmalagon/gte-qwen2-1.5b-instruct-embed-f16
```

You can customize which model to use by changing the `ollama.model` value in `src/config.ts`. Ensure the `vectorDb.dimensions` value in the configuration matches the output dimension of the selected Ollama embedding model. The application now checks if the configured model exists on the Ollama server during initialization.

## Usage

### Legacy Interface
```javascript
import { codeAnalyzer, queryCodebase } from '@modelcontextprotocol/vector-code-lens';

// Analyze a codebase
const result = await codeAnalyzer.handler({
  directory: '/path/to/your/codebase',
  filePatterns: ['*.js', '*.ts'],
  maxDepth: 3
});

// Query the analyzed codebase
const queryResult = await queryCodebase.handler({
  query: 'How is error handling implemented?',
  limit: 5
});
```

### New Unified MCP Interface

```javascript
import { vectorCodeLensTool } from '@modelcontextprotocol/vector-code-lens';

// Analyze a codebase
const analysisResult = await vectorCodeLensTool.handler({
  operation: 'analyze',
  codebasePath: '/path/to/your/codebase',
  options: {
    deep: true,
    includeGit: true,
    updateExisting: false
  }
});

// Query the analyzed codebase
const queryResult = await vectorCodeLensTool.handler({
  operation: 'query',
  query: 'How is error handling implemented?',
  codebasePath: '/path/to/your/codebase',
  options: {
    maxResults: 10,
    language: 'TypeScript'
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

## API Reference

### Legacy Tools

#### codeAnalyzer

Analyzes a codebase to extract key information.

Parameters:
- `directory` - Path to the codebase directory
- `filePatterns` - Array of file patterns to include (optional)
- `maxDepth` - Maximum directory depth to analyze (optional, default: 3)
- `maxFileSize` - Maximum file size in KB to analyze (optional, default: 500)

#### queryCodebase

Queries the analyzed codebase using natural language.

Parameters:
- `query` - Natural language query about the codebase
- `limit` - Maximum number of results to return (optional, default: 5)

### Unified MCP Tool

The new unified `vectorCodeLensTool` provides a simplified interface for all operations.

#### Common Parameters

- `operation` - Operation to perform: "analyze", "query", or "extract"
- `codebasePath` - Path to codebase file or directory (required for analyze and extract)
- `query` - Question or query about the codebase (required for query and extract)
- `options` - Additional operation-specific options

#### Operation: "analyze"

Options:
- `deep` - Perform deep analysis (boolean, default: false)
- `includeGit` - Include Git history analysis (boolean, default: false)
- `updateExisting` - Update existing analysis (boolean, default: false)
- `maxChunkSize` - Maximum chunk size for code analysis (number)

#### Operation: "query"

Options:
- `maxResults` - Maximum number of results to return (number, default: 10)
- `threshold` - Similarity threshold from 0.0 to 1.0 (number, default: 0.7)
- `language` - Filter results by programming language (string)
- `context` - Additional context for query (string array)

#### Operation: "extract"

Options:
- `maxResults` - Maximum number of results to return (number, default: 5)
- `type` - Type of code to extract: "function", "class", "interface", "variable", "import"
- `includeContext` - Include surrounding context (boolean, default: true)
- `format` - Output format: "json", "markdown", "text" (default: "markdown")

## License

MIT
