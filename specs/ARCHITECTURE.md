# VectorCodeLens Architecture Specification

## Overview
VectorCodeLens is a semantic codebase analysis platform that uses vector embeddings and LLMs to understand and query codebases. It follows the Model Context Protocol (MCP) pattern and implements a progressive enhancement strategy for service dependencies.

## System Architecture

### High-Level Components

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   MCP Client    │───▶│  VectorCodeLens  │───▶│  External LLMs  │
│   (Claude)      │    │     Server       │    │  (Claude API)   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │   Qdrant Vector  │
                    │    Database      │
                    └──────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  Ollama Service  │
                    │  (Embeddings)    │
                    └──────────────────┘
```

### Core Modules

1. **Controller Layer** (`src/controller.ts`)
   - Orchestrates the entire analysis workflow
   - Manages service initialization and dependencies
   - Provides main entry points for analysis and querying

2. **Scanner Module** (`src/scanner/`)
   - `file-scanner.ts`: File discovery and content extraction
   - `code-scanner.ts`: Code-specific scanning logic
   - `chunker.ts`: Intelligent code chunking with structural awareness

3. **Analysis Module** (`src/analysis/`)
   - `llm-analyzer.ts`: LLM-based code analysis
   - `code-analyzer.ts`: Pattern recognition and structure analysis

4. **Storage Layer** (`src/storage/`)
   - `vector-db.ts`: Qdrant vector database integration
   - `storage-manager.ts`: Storage abstraction layer
   - `embedding.ts`: Embedding generation and management

5. **Query System** (`src/claude/`)
   - `query-handler.ts`: Natural language query processing
   - Semantic search and result aggregation

6. **Tools Interface** (`src/tools/`)
   - `vectorLensTool.ts`: MCP tool definitions
   - `helpers.ts`: Utility functions for tool operations

## Data Flow

### Analysis Pipeline
1. **Discovery Phase**: File system scanning with configurable patterns
2. **Chunking Phase**: Code segmentation with structural awareness
3. **Analysis Phase**: LLM-based understanding and categorization
4. **Embedding Phase**: Vector representation generation (optional)
5. **Storage Phase**: Persistent storage with metadata

### Query Pipeline
1. **Query Processing**: Natural language input parsing
2. **Embedding Generation**: Query vector creation
3. **Similarity Search**: Vector database querying
4. **Result Aggregation**: Relevant chunk collection
5. **Response Generation**: Structured output formatting

## Progressive Enhancement Strategy

The system implements progressive enhancement to gracefully handle service availability:

### Service Tiers
1. **Core Functionality**: Works without external dependencies
2. **Enhanced Analysis**: Requires LLM services (Ollama/Claude)
3. **Semantic Search**: Requires vector database (Qdrant)
4. **Full Features**: All services available

### Fallback Mechanisms
- Analysis continues without embeddings if Ollama unavailable
- Structural analysis works without LLM services
- Error recovery with detailed logging

## Configuration Management

### Environment Variables
- Service URLs (Qdrant, Ollama, Claude)
- Feature flags for progressive enhancement
- Performance tuning parameters
- Logging configuration

### Default Values
- All services have localhost defaults
- Reasonable chunk sizes and overlap
- Conservative timeout values

## Integration Points

### External Services
- **Qdrant**: Vector storage and similarity search
- **Ollama**: Local LLM for embeddings
- **Claude API**: External LLM for advanced analysis

### MCP Protocol
- Tool definitions for `codeAnalyzer` and `queryCodebase`
- Structured parameter validation
- Error handling and response formatting

## Performance Considerations

### Chunking Strategy
- Configurable chunk sizes (default: 100 lines)
- Overlap for context preservation (default: 20 lines)
- Structure-aware boundaries (functions, classes)

### Caching
- File content caching
- Embedding caching
- Analysis result caching

### Error Handling
- Graceful degradation
- Detailed error logging
- Recovery mechanisms

## Security Features

### Privacy Protection
- No hardcoded credentials
- Environment variable configuration
- Comprehensive .gitignore
- Sensitive data exclusion patterns

### Data Handling
- Local processing by default
- Optional external service integration
- Configurable data retention