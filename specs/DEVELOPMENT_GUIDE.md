# VectorCodeLens Development Guide

## Development Environment Setup

### Prerequisites
- Node.js 18.x or higher
- TypeScript 5.x
- Git
- VS Code (recommended) or similar IDE

### Getting Started

1. **Clone and Setup**
```bash
git clone <repository-url>
cd VectorCodeLens
npm install
```

2. **Build and Watch**
```bash
# Build once
npm run build

# Watch mode for development
npm run watch
```

3. **Run Tests**
```bash
npm test
```

## Project Structure

```
VectorCodeLens/
├── src/                    # Source TypeScript files
│   ├── analysis/          # Code analysis modules
│   ├── claude/            # Claude API integration
│   ├── scanner/           # File scanning and chunking
│   ├── storage/           # Vector database and storage
│   ├── tools/             # MCP tool definitions
│   └── utils/             # Utility functions
├── dist/                  # Compiled JavaScript output
├── docs/                  # Documentation
├── specs/                 # Technical specifications
├── scripts/               # Build and utility scripts
├── test/                  # Test files
└── logs/                  # Runtime logs
```

## Development Workflow

### Code Style and Standards

#### TypeScript Configuration
- ES2020 target
- Strict type checking enabled
- ES modules (import/export)
- Path mapping for clean imports

#### Naming Conventions
- PascalCase for classes and interfaces
- camelCase for functions and variables
- kebab-case for file names
- UPPER_CASE for constants

#### Import Organization
```typescript
// External libraries first
import { someLibrary } from 'external-lib';

// Internal modules by category
import { Controller } from './controller';
import { Scanner } from './scanner';
import { Storage } from './storage';

// Types and interfaces last
import type { AnalysisOptions, QueryOptions } from './types';
```

### Development Best Practices

#### Error Handling
```typescript
try {
  const result = await riskyOperation();
  return { success: true, data: result };
} catch (error) {
  console.error('Operation failed:', error);
  return { 
    success: false, 
    error: error instanceof Error ? error.message : 'Unknown error' 
  };
}
```

#### Logging
```typescript
import { logger } from './utils/logger';

// Use structured logging
logger.info('Analysis started', { 
  directory: directoryPath, 
  options: analysisOptions 
});

logger.error('Analysis failed', { 
  error: error.message, 
  stack: error.stack 
});
```

#### Configuration Management
```typescript
import config from './config';

// Always use config object, never hardcode
const vectorDbUrl = config.vectorDbUrl;
const isFeatureEnabled = config.enableGitAnalysis;
```

### Testing Strategy

#### Unit Tests
- Test individual functions and classes
- Mock external dependencies
- Focus on business logic

#### Integration Tests
- Test component interactions
- Use real external services when possible
- Test error scenarios

#### End-to-End Tests
- Test complete workflows
- Use test fixtures
- Validate output format

#### Test File Structure
```
test/
├── unit/                  # Unit tests
├── integration/           # Integration tests
├── e2e/                   # End-to-end tests
├── fixtures/              # Test data
└── helpers/               # Test utilities
```

## Adding New Features

### Step-by-Step Process

1. **Design Phase**
   - Update specifications in `specs/`
   - Design interfaces and data flow
   - Consider backward compatibility

2. **Implementation Phase**
   - Create TypeScript interfaces
   - Implement core logic
   - Add error handling
   - Update configuration if needed

3. **Testing Phase**
   - Write unit tests
   - Add integration tests
   - Test error scenarios
   - Validate performance impact

4. **Documentation Phase**
   - Update API documentation
   - Add usage examples
   - Update CHANGELOG.md

### Example: Adding New Analysis Feature

1. **Define Interface**
```typescript
// src/analysis/types.ts
export interface NewAnalysisOptions {
  featureEnabled: boolean;
  customParameter?: string;
}

export interface NewAnalysisResult {
  analysisData: any;
  metadata: {
    processingTime: number;
    itemsProcessed: number;
  };
}
```

2. **Implement Feature**
```typescript
// src/analysis/new-analyzer.ts
export class NewAnalyzer {
  async analyze(
    input: any, 
    options: NewAnalysisOptions
  ): Promise<NewAnalysisResult> {
    // Implementation here
  }
}
```

3. **Integrate with Controller**
```typescript
// src/controller.ts
import { NewAnalyzer } from './analysis/new-analyzer';

export class CodeAnalyzerController {
  private newAnalyzer = new NewAnalyzer();

  async analyzeWithNewFeature(options: NewAnalysisOptions) {
    return await this.newAnalyzer.analyze(input, options);
  }
}
```

4. **Add Tests**
```typescript
// test/analysis/new-analyzer.test.js
describe('NewAnalyzer', () => {
  test('should analyze input correctly', async () => {
    const analyzer = new NewAnalyzer();
    const result = await analyzer.analyze(testInput, testOptions);
    expect(result.analysisData).toBeDefined();
  });
});
```

## Working with External Services

### Qdrant Vector Database
```typescript
import { QdrantVectorDb } from './storage/vector-db';

// Initialize with error handling
const vectorDb = new QdrantVectorDb(config.vectorDbUrl);
await vectorDb.initialize();

// Always check if service is available
if (await vectorDb.isHealthy()) {
  await vectorDb.store(data);
}
```

### Ollama Integration
```typescript
import { generateEmbedding } from './storage/embedding';

// Check model availability first
if (await checkOllamaModelExists(config.ollamaModel)) {
  const embedding = await generateEmbedding(text);
}
```

### Claude API
```typescript
import { handleCodeQuery } from './claude/query-handler';

// Check API key availability
if (config.isClaudeEnabled) {
  const result = await handleCodeQuery(query, storage, limit);
}
```

## Debugging and Troubleshooting

### Debug Configuration
```typescript
// Set environment variable
process.env.LOG_LEVEL = 'debug';

// Enable verbose logging
logger.debug('Detailed debug information', { context: data });
```

### Common Issues

#### TypeScript Compilation Errors
```bash
# Clean build
rm -rf dist/
npm run build

# Check TypeScript configuration
npx tsc --showConfig
```

#### Service Connection Issues
```bash
# Test individual services
node scripts/check_ports.js
node scripts/diagnose.js

# Check logs
tail -f logs/error.log
```

#### Memory Issues
```bash
# Monitor memory usage
node --max-old-space-size=4096 dist/index.js

# Profile memory usage
node --inspect dist/index.js
```

### Performance Profiling

#### Execution Time Monitoring
```typescript
const startTime = Date.now();
await performOperation();
const duration = Date.now() - startTime;
logger.info('Operation completed', { duration });
```

#### Memory Usage Tracking
```typescript
const memBefore = process.memoryUsage();
await performOperation();
const memAfter = process.memoryUsage();
logger.info('Memory usage', { 
  heapUsed: memAfter.heapUsed - memBefore.heapUsed 
});
```

## Code Review Guidelines

### Review Checklist
- [ ] TypeScript types are properly defined
- [ ] Error handling is comprehensive
- [ ] Logging is appropriate and structured
- [ ] Configuration uses config object
- [ ] Tests cover new functionality
- [ ] Documentation is updated
- [ ] No hardcoded values or credentials
- [ ] Performance impact is considered

### Security Considerations
- Never commit API keys or secrets
- Use environment variables for configuration
- Validate all external inputs
- Implement proper error handling
- Follow principle of least privilege

## Release Process

1. **Version Bump**
```bash
npm version patch  # or minor, major
```

2. **Update Documentation**
   - Update CHANGELOG.md
   - Review API documentation
   - Update version references

3. **Build and Test**
```bash
npm run build
npm test
```

4. **Tag Release**
```bash
git tag v1.0.0
git push origin v1.0.0
```

## Contributing Guidelines

### Pull Request Process
1. Create feature branch from main
2. Implement changes with tests
3. Update documentation
4. Submit pull request
5. Address review feedback
6. Merge after approval

### Commit Message Format
```
type(scope): description

body (optional)

footer (optional)
```

Examples:
- `feat(analysis): add new pattern recognition`
- `fix(storage): handle connection timeout errors`
- `docs(api): update query parameters documentation`