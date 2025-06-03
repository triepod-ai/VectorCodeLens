# VectorCodeLens Project Prompt

## Quick Start

VectorCodeLens is a TypeScript/Node.js MCP server for semantic code analysis using vector embeddings and LLMs.

### Essential Commands
```bash
npm install           # Install dependencies
npm run build        # Compile TypeScript
npm start            # Run the server
```

### Required Services
1. **Qdrant** (Port 6333): Vector database for code embeddings
2. **LLM Service** (Port 8020): Ollama/Claude for code analysis

### Core Technologies
- **Runtime**: Node.js 20+ with TypeScript 5.3.3
- **Database**: Qdrant vector database
- **AI**: Claude API / Ollama
- **Architecture**: Model Context Protocol (MCP)

### Main Dependencies
```json
{
  "@modelcontextprotocol/sdk": "1.0.1",
  "@qdrant/js-client-rest": "^1.13.0",
  "fs-extra": "^11.3.0",
  "glob": "^8.1.0",
  "node-fetch": "^2.7.0",
  "zod": "^3.24.1"
}
```

### Source Structure
- `src/scanner/` - File traversal and chunking
- `src/analysis/` - LLM integration and code analysis
- `src/storage/` - Vector database operations
- `src/controller.ts` - Main orchestration
- `dist/` - Compiled output

### Configuration
After building, edit `dist/config.js`:
```javascript
export const config = {
  qdrantUrl: 'http://127.0.0.1:6333',
  llmServiceUrl: 'http://localhost:8020',
  claudeApiKey: 'optional-key'
}
```

### API Endpoints
- `codeAnalyzer` - Analyze code with LLMs
- `queryCodebase` - Semantic search across code

### Troubleshooting
- Verify services: `node check-dependencies.js`
- Debug mode: `debug_run.bat`
- Mock services: `node mock_services.js`

### Project Status
- TypeScript application with modular architecture
- Three core self-developed modules
- Production-ready error handling
- Windows service compatible
