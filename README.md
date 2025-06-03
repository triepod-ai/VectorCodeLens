# VectorCodeLens

A semantic codebase analysis platform that uses vector embeddings and LLMs to understand and query codebases through natural language.

## Features

- **Semantic Code Analysis**: Understand code structure, patterns, and relationships
- **Natural Language Queries**: Ask questions about your codebase in plain English
- **Vector Embeddings**: Semantic search powered by vector similarity
- **Progressive Enhancement**: Works with or without external AI services
- **MCP Integration**: Model Context Protocol for AI tool integration

## Quick Start

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd VectorCodeLens

# Install dependencies
npm install

# Build the project
npm run build
```

### Configuration

1. Copy the environment template:
```bash
cp .env.example .env
```

2. Configure your services in `.env`:
```bash
# Required: Qdrant Vector Database
VECTOR_DB_URL=http://127.0.0.1:6333

# Optional: Local LLM for embeddings
LLM_SERVICE_URL=http://localhost:11434

# Optional: Claude API for advanced analysis
CLAUDE_API_KEY=your_api_key_here
```

### Running the Service

```bash
# Start external services (optional)
docker run -p 6333:6333 qdrant/qdrant  # Vector database
ollama serve                            # Local LLM

# Start VectorCodeLens
npm start
```

## Usage Examples

### Analyze a Codebase

```typescript
// Using the MCP tool interface
const result = await codeAnalyzer({
  directory: "/path/to/your/project",
  filePatterns: ["*.ts", "*.js"],
  includeSummary: true
});
```

### Query Your Code

```typescript
// Ask natural language questions
const results = await queryCodebase({
  query: "How are errors handled in this codebase?",
  limit: 5
});
```

## Architecture

VectorCodeLens uses a modular architecture with progressive enhancement:

- **Scanner**: Discovers and chunks code files intelligently
- **Analysis**: Uses LLMs to understand code structure and patterns
- **Storage**: Stores analysis and embeddings in vector database
- **Query**: Provides semantic search capabilities

## Documentation

- [Architecture Overview](./specs/ARCHITECTURE.md)
- [API Documentation](./specs/API_SPECIFICATION.md)
- [Deployment Guide](./specs/DEPLOYMENT_GUIDE.md)
- [Development Guide](./specs/DEVELOPMENT_GUIDE.md)

## Project Structure

```
VectorCodeLens/
├── src/                # TypeScript source code
├── specs/              # Technical specifications
├── scripts/            # Build and utility scripts
├── docs/               # Additional documentation
├── test/               # Test files and fixtures
└── logs/              # Runtime logs
```

## Development

### Prerequisites

- Node.js 18.x or higher
- TypeScript 5.x
- Optional: Docker for services

### Development Workflow

```bash
# Install dependencies
npm install

# Watch mode for development
npm run watch

# Run tests
npm test

# Check dependencies
npm run check-deps
```

## Services Integration

### Qdrant Vector Database
```bash
docker run -p 6333:6333 -p 6334:6334 qdrant/qdrant
```

### Ollama (Local LLM)
```bash
ollama serve
ollama pull rjmalagon/gte-qwen2-1.5b-instruct-embed-f16
```

### Claude API
Set your API key in the `.env` file for enhanced analysis capabilities.

## Contributing

This is a demonstration project showcasing AI-powered code analysis techniques. See [Development Guide](./specs/DEVELOPMENT_GUIDE.md) for detailed contribution guidelines.

## License

MIT License - see [LICENSE](./LICENSE) file for details.

---

## Status

✅ **Production Ready** - All TypeScript compilation errors resolved  
✅ **MCP Integration** - Fully functional Model Context Protocol server  
✅ **Vector Storage** - Qdrant integration with robust error handling  
✅ **Progressive Enhancement** - Works with or without external AI services  

## Recent Updates

- Fixed all TypeScript compilation issues
- Updated Qdrant client integration to latest API
- Implemented robust error handling and retry logic
- Added comprehensive test coverage
- ES modules fully operational

**Note**: This is a portfolio/demo project demonstrating modern approaches to semantic code analysis using vector embeddings and large language models.