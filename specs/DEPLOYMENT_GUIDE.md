# VectorCodeLens Deployment Guide

## Prerequisites

### System Requirements
- Node.js 18.x or higher
- NPM 8.x or higher
- Minimum 2GB RAM
- 1GB available disk space

### External Services
- Qdrant Vector Database (optional but recommended)
- Ollama for local LLM embeddings (optional)
- Claude API access (optional)

## Installation Methods

### Method 1: Development Setup

1. **Clone Repository**
```bash
git clone <repository-url>
cd VectorCodeLens
```

2. **Install Dependencies**
```bash
npm install
```

3. **Build TypeScript**
```bash
npm run build
```

4. **Configure Environment**
```bash
cp .env.example .env
# Edit .env with your configuration
```

5. **Start Services**
```bash
# Start Qdrant (optional)
docker run -p 6333:6333 -p 6334:6334 qdrant/qdrant

# Start Ollama (optional)
ollama serve

# Start VectorCodeLens
npm start
```

### Method 2: Docker Deployment

```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY dist/ ./dist/
COPY .env.example ./.env

EXPOSE 3000
CMD ["npm", "start"]
```

### Method 3: Windows Service

Use the provided service installation script:

```bash
node scripts/install-service.js
```

## Configuration

### Environment Variables

Create a `.env` file based on `.env.example`:

```bash
# Required Settings
VECTOR_DB_URL=http://127.0.0.1:6333

# Optional Settings
LLM_SERVICE_URL=http://localhost:11434
CLAUDE_API_KEY=your_claude_api_key_here
DEFAULT_LLM_MODEL=rjmalagon/gte-qwen2-1.5b-instruct-embed-f16
CLAUDE_MODEL=claude-3-5-sonnet-20240620

# Feature Flags
USE_LOCAL_EMBEDDINGS=true
ENABLE_GIT_ANALYSIS=false

# Performance Settings
CHUNK_SIZE=100
CHUNK_OVERLAP=20
LOG_LEVEL=info
```

### Service Dependencies

#### Qdrant Vector Database

**Using Docker:**
```bash
docker run -d --name qdrant \
  -p 6333:6333 -p 6334:6334 \
  -v qdrant_storage:/qdrant/storage \
  qdrant/qdrant
```

**Using Docker Compose:**
```yaml
version: '3.8'
services:
  qdrant:
    image: qdrant/qdrant
    ports:
      - "6333:6333"
      - "6334:6334"
    volumes:
      - qdrant_storage:/qdrant/storage

volumes:
  qdrant_storage:
```

#### Ollama Service

**Installation:**
```bash
# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Pull embedding model
ollama pull rjmalagon/gte-qwen2-1.5b-instruct-embed-f16

# Start service
ollama serve
```

## Deployment Scenarios

### Scenario 1: Full Feature Deployment

All services enabled for maximum functionality:

```bash
# Environment configuration
VECTOR_DB_URL=http://127.0.0.1:6333
LLM_SERVICE_URL=http://localhost:11434
CLAUDE_API_KEY=your_api_key
USE_LOCAL_EMBEDDINGS=true
```

**Services Required:**
- Qdrant Vector Database
- Ollama Service
- Claude API access

### Scenario 2: Local-Only Deployment

No external API dependencies:

```bash
# Environment configuration
VECTOR_DB_URL=http://127.0.0.1:6333
LLM_SERVICE_URL=http://localhost:11434
USE_LOCAL_EMBEDDINGS=true
# No CLAUDE_API_KEY
```

**Services Required:**
- Qdrant Vector Database
- Ollama Service

### Scenario 3: Minimal Deployment

Basic functionality without vector search:

```bash
# Environment configuration
# No external services required
LOG_LEVEL=info
```

**Services Required:**
- None (basic file analysis only)

## Monitoring and Maintenance

### Health Checks

Use the provided diagnostic scripts:

```bash
# Check all dependencies
node scripts/check-dependencies.js

# Test specific services
node scripts/check_ports.js

# Run diagnostics
node scripts/diagnose.js
```

### Logging

Log files are generated in the `logs/` directory:
- `error.log`: Error messages
- `access.log`: Access logs
- `debug.log`: Debug information

### Backup Procedures

#### Vector Database Backup
```bash
# Backup Qdrant data
docker exec qdrant tar czf - /qdrant/storage > qdrant_backup.tar.gz
```

#### Configuration Backup
```bash
# Backup environment and configuration
cp .env config_backup.env
tar czf config_backup.tar.gz .env package.json
```

## Troubleshooting

### Common Issues

#### Service Not Starting
1. Check port availability: `node scripts/check_ports.js`
2. Verify Node.js installation: `node --version`
3. Check logs: `tail -f logs/error.log`

#### Qdrant Connection Issues
1. Verify Qdrant is running: `curl http://127.0.0.1:6333/collections`
2. Check firewall settings
3. Verify Docker container status: `docker ps`

#### Ollama Model Issues
1. Check available models: `ollama list`
2. Pull required model: `ollama pull model-name`
3. Verify service status: `curl http://localhost:11434`

### Performance Optimization

#### Memory Usage
- Reduce `CHUNK_SIZE` for lower memory usage
- Limit `maxDepth` in analysis options
- Use file pattern filtering

#### Processing Speed
- Increase `CHUNK_SIZE` for faster processing
- Enable parallel processing where possible
- Use SSD storage for better I/O performance

#### Network Optimization
- Deploy services on same network
- Use local Ollama for embeddings
- Cache frequently accessed data

## Security Considerations

### Access Control
- Restrict network access to required ports only
- Use environment variables for sensitive configuration
- Implement proper authentication for production use

### Data Privacy
- Keep analysis data local when possible
- Review external service privacy policies
- Implement data retention policies

### Network Security
- Use HTTPS for external API calls
- Implement rate limiting
- Monitor for unusual access patterns

## Scaling Considerations

### Horizontal Scaling
- Deploy multiple VectorCodeLens instances
- Use load balancer for distribution
- Share Qdrant database across instances

### Vertical Scaling
- Increase memory allocation
- Use faster CPU for analysis tasks
- Optimize disk I/O with SSD storage

### Resource Planning
- 1GB RAM per concurrent analysis
- 100MB storage per 1000 code chunks
- Network bandwidth for external API calls