# VectorCodeLens Specifications

This directory contains comprehensive technical specifications for the VectorCodeLens project.

## Documents Overview

### [ARCHITECTURE.md](./ARCHITECTURE.md)
Detailed system architecture including:
- High-level component overview
- Data flow diagrams
- Progressive enhancement strategy
- Integration points and service dependencies
- Performance and security considerations

### [API_SPECIFICATION.md](./API_SPECIFICATION.md)
Complete API documentation covering:
- MCP tools interface (`codeAnalyzer`, `queryCodebase`)
- Controller methods and parameters
- Storage interface definitions
- Configuration options
- Error handling and response formats

### [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
Production deployment instructions including:
- System requirements and prerequisites
- Multiple installation methods (development, Docker, Windows service)
- Service dependency setup (Qdrant, Ollama, Claude API)
- Configuration management
- Monitoring, backup, and troubleshooting procedures

### [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md)
Developer-focused documentation including:
- Development environment setup
- Code style and standards
- Testing strategy and best practices
- Feature development workflow
- Integration with external services
- Debugging and performance profiling

## Quick Reference

### Core Concepts
- **MCP (Model Context Protocol)**: Communication protocol for AI model integration
- **Vector Embeddings**: Mathematical representations of code for semantic search
- **Progressive Enhancement**: Graceful degradation when services are unavailable
- **Chunking**: Intelligent code segmentation for analysis

### Key Components
- **Controller**: Main orchestration layer
- **Scanner**: File discovery and content extraction
- **Analysis**: LLM-based code understanding
- **Storage**: Vector database and embedding management
- **Tools**: MCP interface definitions

### External Dependencies
- **Qdrant**: Vector database for semantic search
- **Ollama**: Local LLM service for embeddings
- **Claude API**: External LLM for advanced analysis

## Project Goals

VectorCodeLens aims to provide:
1. **Semantic Code Understanding**: Beyond syntax analysis to understand code intent
2. **Natural Language Querying**: Ask questions about codebases in plain English
3. **Scalable Architecture**: Handle projects of varying sizes efficiently
4. **Flexible Deployment**: Support for local, cloud, and hybrid deployments
5. **Developer-Friendly**: Easy integration and clear documentation

## Getting Started

1. **For Users**: See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for setup instructions
2. **For Developers**: See [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md) for contribution guidelines
3. **For Integrators**: See [API_SPECIFICATION.md](./API_SPECIFICATION.md) for interface details
4. **For Architects**: See [ARCHITECTURE.md](./ARCHITECTURE.md) for system design

## Support and Contributing

This is a demonstration project showcasing modern AI-powered code analysis techniques. The specifications provide a complete picture of the system design and implementation approach.

For technical questions about the architecture or implementation details, refer to the relevant specification document above.