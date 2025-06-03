# VectorCodeLens Developer Guide

## Overview

VectorCodeLens is a semantic codebase analysis platform that uses vector embeddings and LLMs to understand and query codebases. It's built as a Model Context Protocol (MCP) server component and uses TypeScript with Node.js.

## Tech Stack

### Core Technologies
- **Language**: TypeScript 5.3.3 (with NodeNext modules)
- **Runtime**: Node.js (v20.17.25+)
- **Architecture**: Modular MCP server component

### Major Dependencies
- **@modelcontextprotocol/sdk** (1.0.1) - Core MCP SDK
- **@qdrant/js-client-rest** (^1.13.0) - Vector database client
- **zod** (^3.24.1) - Schema validation
- **fs-extra** (^11.3.0) - Enhanced file operations
- **glob** (^8.1.0) - File pattern matching
- **lru-cache** (^11.0.2) - Caching system
- **node-fetch** (^2.7.0) - HTTP requests
- **node-windows** (^1.0.0-beta.8) - Windows service management

### External Services
1. **Qdrant Vector Database** (Port 6333)
   - For storing code embeddings and metadata
   - Local installation or Docker container required

2. **Ollama LLM Service** (Port 11434)
   - Provides LLM capabilities for code analysis
   - Uses Ollama and/or Claude API
   - Must be running before starting VectorCodeLens

## Project Structure

```
VectorCodeLens/
├── src/                    # Source code
│   ├── analysis/           # LLM analysis module
│   │   ├── llm-analyzer.ts # Core LLM integration
│   │   └── index.ts
│   ├── claude/            # Claude integration (optional)
│   ├── scanner/           # Code scanning module
│   ├── services/          # Service modules
│   │   ├── llm/           # LLM service integration
│   │   │   ├── index.ts   # Service exports and factory
│   │   │   └── llmService.ts # LLM service implementation
│   │   ├── preprocessing/ # Preprocessing service
│   │   ├── storage/       # Storage service
│   │   └── progressiveEnhancer.ts # Service orchestration
│   ├── storage/           # Vector database module
│   │   ├── vector-db.ts   # Qdrant integration
│   │   ├── embedding.ts   # Embedding generation
│   │   └── index.ts
│   ├── tools/             # MCP tool implementations
│   │   ├── helpers.ts     # Tool helper functions
│   │   ├── index.ts       # Tool exports and interfaces
│   │   └── vectorLensTool.ts # Unified MCP tool
│   ├── utils/             # Utility functions
│   ├── config.ts          # Configuration management
│   ├── controller.ts      # Main controller logic
│   ├── server.ts          # Server setup
│   └── index.ts           # Entry point
├── dist/                  # Compiled JavaScript (generated)
├── test/                  # Test files
│   └── vectorLensTool.test.js # Tool tests
├── tests/                 # Additional test files
├── test_files/            # Test data
├── package.json           # Package configuration
├── tsconfig.json          # TypeScript configuration
└── README.md              # Project documentation
```

## Key Modules

### 1. CodeScannerModule
**Location**: `src/codeScannerModule.js`
- Recursive directory traversal
- File pattern matching and filtering
- Context-preserving chunking algorithm
- Language detection

### 2. CodeAnalysisModule  
**Location**: `src/codeAnalysisModule.js`
- LLM provider abstraction (Claude/Ollama)
- Multiple analysis types (semantic, documentation, complexity)
- Retry logic with exponential backoff
- Response parsing and normalization

### 3. StorageModule
**Location**: `src/storageModule.js`
- Qdrant vector database integration
- Embedding generation and management
- Metadata-enhanced vector search
- CRUD operations for analysis results

### 4. Unified MCP Tool
**Location**: `src/tools/vectorLensTool.ts`
- Single unified interface for all operations
- Progressive enhancement with feature flags
- Comprehensive parameter validation
- Operation-specific handling logic

### 5. ProgressiveEnhancer
**Location**: `src/services/progressiveEnhancer.ts`
- Service orchestration and integration
- Feature-based capability management
- Fallback mechanisms for graceful degradation
- Advanced features activation based on configuration

## Setup Instructions

### Prerequisites
1. Install Qdrant Vector Database
   ```bash
   # Using Docker (recommended)
   docker run -p 6333:6333 qdrant/qdrant
   ```

2. Set up LLM Service
   ```bash
   # Ensure Ollama is running on port 11434
   # Or configure Claude API key
   ```

### Installation
```bash
# Clone the repository
cd VectorCodeLens

# Install dependencies
npm install

# Build the project
npm run build

# Run the service
npm start
# or
node dist/index.js
```

### Configuration
Edit `dist/config.js` after building:
```javascript
export const config = {
  qdrantUrl: 'http://127.0.0.1:6333',
  llmServiceUrl: 'http://localhost:11434',
  claudeApiKey: 'your-api-key-here', // Optional
  claudeModel: 'claude-3-5-sonnet',
  chunkSize: 100,
  chunkOverlap: 20
};
```

## Development Workflow

### Scripts
- `npm run build` - Compile TypeScript to JavaScript
- `npm run watch` - Watch mode for development
- `npm start` - Start the server
- `npm test` - Run tests

### Testing
- Unit tests: `npm test`
- Integration tests: `node test_code_analysis.js`
- Service checks: `node check-dependencies.js`

### Debugging
1. Use `debug_run.bat` for detailed logging
2. Check `debug_run.log` for error messages
3. Use `mock_services.js` for local development without external dependencies

## Architecture

### MCP Protocol Integration
The application implements the Model Context Protocol with:
- Unified vectorCodeLens tool (new)
- Legacy tool handlers for codeAnalyzer and queryCodebase
- Standardized request/response format
- Error handling and validation

### Unified MCP Tool Architecture

The Unified MCP Tool follows DeepView MCP patterns, providing a streamlined interface with progressive enhancement capabilities:

#### 1. Single Entry Point
The `vectorCodeLensTool` provides a unified interface for all operations (analyze, query, extract) through a consistent parameter structure:
```typescript
// Example usage
const result = await vectorCodeLensTool.handler({
  operation: 'query',
  query: 'How does the authentication system work?',
  codebasePath: '/path/to/project',
  options: { maxResults: 10 }
});
```

#### 2. Progressive Enhancement
The implementation supports progressive enhancement through feature flags:
- **Basic Mode**: Works with minimal dependencies
- **Enhanced Mode**: Activates advanced features when available
- **Feature Toggles**: Enable/disable Git analysis, local embeddings, etc.
- **Fallback Mechanisms**: Graceful degradation when services are unavailable

#### 3. Service Orchestration
The ProgressiveEnhancer manages the interaction between services:
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

#### 4. Operation Handler Workflow
Each operation follows a consistent workflow pattern:
1. **Validation**: Check parameters and file existence
2. **Preparation**: Configure options with defaults 
3. **Execution**: Invoke the operation via ProgressiveEnhancer
4. **Result Processing**: Format results with metadata
5. **Error Handling**: Graceful error recovery and reporting

### Module Design
- Factory pattern for module creation
- Dependency injection for configuration
- Clean interface boundaries
- Comprehensive error handling

### Data Flow
1. File scanning and chunking
2. Code analysis using LLMs
3. Vector embedding generation
4. Storage in Qdrant
5. Query processing with semantic search

## Performance Considerations

### Optimization Strategies
- Parallel processing for large codebases
- LRU caching for embeddings
- Batch operations for vector database
- Configurable chunk sizes and overlap

### Resource Management
- Depth-limited directory traversal
- File size filtering options
- Connection pooling for external services
- Graceful degradation on service failures

## Troubleshooting

### Common Issues
1. **Service startup failures**
   - Check if Qdrant is running: `curl http://127.0.0.1:6333`
   - Verify Ollama service: `curl http://localhost:11434`
   - Review logs in `debug_run.log`

2. **Windows Service Configuration**
   - The application requires manual startup by default
   - Consider using `node-windows` for service installation
   - Ensure proper service dependencies are configured

3. **API Errors**
   - Verify Claude API key if using
   - Check Ollama model availability
   - Monitor retry mechanisms in logs

### Debugging Tools
- `diagnose.js` - Comprehensive system check
- `check-dependencies.js` - Verify external services
- `test_ollama.js` - Test LLM integration
- `debug_vector_code_lens.js` - Full system debugging

## Development Best Practices

1. **Code Style**
   - Follow TypeScript strict mode
   - Use consistent naming conventions
   - Implement proper error handling
   - Document complex algorithms

2. **Testing Strategy**
   - Test each module independently
   - Mock external services for unit tests
   - Maintain test data in test_files directory
   - Verify integration points

3. **Configuration Management**
   - Use environment variables for sensitive data
   - Maintain sensible defaults
   - Validate configuration on startup
   - Support configuration override

## Migrating to the Unified MCP Tool

### Why Migrate?
The new unified `vectorCodeLensTool` offers several advantages over the legacy tools:
- Simplified interface with consistent parameters
- Enhanced feature set with progressive capabilities
- Better error handling and validation
- Improved performance with background processing
- More flexible configuration options

### Migration Guide

#### 1. From codeAnalyzer to vectorCodeLensTool

**Legacy code:**
```javascript
import { codeAnalyzer } from '@modelcontextprotocol/vector-code-lens';

const result = await codeAnalyzer.handler({
  directory: '/path/to/your/codebase',
  filePatterns: ['*.js', '*.ts'],
  maxDepth: 3
});
```

**New unified approach:**
```javascript
import { vectorCodeLensTool } from '@modelcontextprotocol/vector-code-lens';

const result = await vectorCodeLensTool.handler({
  operation: 'analyze',
  codebasePath: '/path/to/your/codebase',
  options: {
    // Optional parameters
    includeGit: true,
    deep: true
  }
});
```

#### 2. From queryCodebase to vectorCodeLensTool

**Legacy code:**
```javascript
import { queryCodebase } from '@modelcontextprotocol/vector-code-lens';

const result = await queryCodebase.handler({
  query: 'How is error handling implemented?',
  limit: 5
});
```

**New unified approach:**
```javascript
import { vectorCodeLensTool } from '@modelcontextprotocol/vector-code-lens';

const result = await vectorCodeLensTool.handler({
  operation: 'query',
  query: 'How is error handling implemented?',
  codebasePath: '/path/to/your/codebase',  // Optional, will use all codebases if omitted
  options: {
    maxResults: 5,
    threshold: 0.75
  }
});
```

#### 3. New Extract Operation

The new unified tool adds extraction capabilities not previously available:

```javascript
import { vectorCodeLensTool } from '@modelcontextprotocol/vector-code-lens';

const result = await vectorCodeLensTool.handler({
  operation: 'extract',
  query: 'Find all authentication-related functions',
  codebasePath: '/path/to/your/codebase',
  options: {
    type: 'function',
    format: 'markdown',
    includeContext: true
  }
});
```

### Backwards Compatibility

The legacy tools will remain available for backward compatibility but are considered deprecated. New features will only be added to the unified tool.

## Future Enhancements

1. **Middleware Integration**
   - Consider implementing API Gateway middleware
   - Standardize LLM communication across projects
   - Enhance provider abstraction

2. **Service Configuration**
   - Implement as Windows service automatically
   - Add dependency checking on startup
   - Improve error recovery mechanisms

3. **Performance Improvements**
   - Optimize chunking algorithm
   - Implement caching strategies
   - Add parallel processing capabilities

4. **Unified Tool Enhancements**
   - Add bulk operations support
   - Implement streaming responses
   - Add cross-codebase relationship analysis
   - Improve Git integration capabilities

## Support

For issues or questions:
1. Check archive/troubleshooting.md
2. Review archive/lessons_learned.md
3. Consult API documentation in CLAUDE.md
4. Check existing test files for examples

## License

MIT License - See LICENSE file for details
