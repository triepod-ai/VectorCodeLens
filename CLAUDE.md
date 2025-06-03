# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Commands

### Build and Development
- `npm install` - Install dependencies
- `npm run build` - Build TypeScript to JavaScript
- `npm run watch` - Build in watch mode for development
- `npm start` - Start the MCP server (requires build first)
- `npm test` - Run test suite

### Testing Commands
- `npm test` - Run basic tests
- `npm run test:analysis` - Test code analysis functionality  
- `npm run test:ollama` - Test Ollama integration
- `npm run diagnose` - Run diagnostic checks
- `npm run check-deps` - Check all service dependencies

## Architecture Overview

VectorCodeLens is a semantic codebase analysis platform that uses vector embeddings and LLMs to understand and query codebases. It follows the Model Context Protocol (MCP) pattern.

### Core Components

1. **Controller Layer** (`src/controller.ts`): Main orchestration layer that coordinates analysis workflow
2. **Scanner Module** (`src/scanner/`): Handles file discovery, content extraction, and code chunking
3. **Analysis Module** (`src/analysis/`): LLM-based code analysis and understanding
4. **Storage Layer** (`src/storage/`): Vector database integration and embedding management
5. **Query Handler** (`src/claude/`): Natural language query processing
6. **Tools Interface** (`src/tools/`): MCP tool definitions and handlers

### Data Flow

1. **Analysis Phase**: Directory scanning → File chunking → LLM analysis → Vector embedding → Storage
2. **Query Phase**: Natural language query → Embedding generation → Vector similarity search → Result aggregation

### Key Architectural Patterns

- **Progressive Enhancement**: Graceful degradation when Ollama or Claude services are unavailable
- **Modular Design**: Clear separation between scanning, analysis, storage, and querying
- **Configurable Pipeline**: Flexible chunking strategies and analysis options
- **Error Recovery**: Robust error handling with detailed logging

### Configuration

The system uses environment variables with fallbacks defined in `src/config.ts`. Key services:
- **Qdrant Vector DB**: Default port 6333 for vector storage
- **Ollama**: Default port 11434 for local LLM embeddings
- **Claude API**: Optional external LLM integration

### Important Implementation Details

- **Chunk ID Generation**: Uses MD5 hash of `filepath:startLine-endLine` for unique chunk identification
- **Binary File Detection**: Automatically skips binary files during analysis
- **Embedding Strategy**: Falls back gracefully if embedding generation fails
- **Storage Strategy**: Can operate without embeddings for analysis-only mode

### Development Notes

- Build outputs to `dist/` directory
- Main entry point exports MCP tool definitions (`codeAnalyzer`, `queryCodebase`)
- TypeScript configuration in `tsconfig.json` targets ES2020
- All imports use ES modules (type: "module" in package.json)