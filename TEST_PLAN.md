# VectorCodeLens Testing Plan
**For Implementation by Claude Code**

## Overview

This document outlines a comprehensive testing strategy for the refactored VectorCodeLens TypeScript implementation. The test plan is organized into logical phases, starting with basic environment verification and advancing to complete end-to-end testing.

## Phase 1: Environment Setup & Verification

### 1.1 Prerequisite Verification
- [ ] Verify Node.js version (v20.17.25+)
- [ ] Check Qdrant availability (port 6333)
- [ ] Verify Ollama LLM service availability (port 11434)
- [ ] Create verification script that checks all dependencies

### 1.2 Project Build Verification
- [ ] Test npm install process
- [ ] Verify build process (npm run build)
- [ ] Confirm generated files in dist/ directory
- [ ] Validate TypeScript compilation

### 1.3 Configuration Verification
- [ ] Test .env file creation from example
- [ ] Verify environment variable loading
- [ ] Test configuration validation
- [ ] Check fallback to default values

## Phase 2: Unit Testing

### 2.1 Scanner Module Testing
- [ ] Test file pattern matching
- [ ] Verify directory exclusion logic
- [ ] Test language detection
- [ ] Validate chunking algorithm
- [ ] Test code structure detection
- [ ] Create comprehensive scanner-test.js

### 2.2 Analysis Module Testing
- [ ] Test prompt formatting
- [ ] Verify mock analysis mode
- [ ] Test API response parsing
- [ ] Validate error handling
- [ ] Test analysis aggregation
- [ ] Create analyzer-test.js

### 2.3 Storage Module Testing
- [ ] Test Qdrant connection
- [ ] Verify collection creation
- [ ] Test vector insertion
- [ ] Validate querying functionality
- [ ] Test metadata storage
- [ ] Create storage-test.js

## Phase 3: Integration Testing

### 3.1 Basic Workflow Testing
- [ ] Test scan → analyze → store workflow
- [ ] Verify query functionality
- [ ] Test handling of various file types
- [ ] Create workflow-test.js

### 3.2 Controller Testing
- [ ] Test end-to-end processing
- [ ] Verify error handling
- [ ] Test configuration validation
- [ ] Validate directory traversal
- [ ] Create controller-test.js

## Phase 4: Performance Testing

### 4.1 Resource Usage Testing
- [ ] Measure memory usage with large files
- [ ] Track CPU usage during analysis
- [ ] Record processing time for various file sizes
- [ ] Create performance-test.js

### 4.2 Scaling Tests
- [ ] Test with increasing file counts
- [ ] Measure response times with larger repositories
- [ ] Validate performance with monorepos
- [ ] Create scaling-test.js

## Phase 5: Error Handling & Edge Cases

### 5.1 Service Failure Testing
- [ ] Test behavior when Qdrant is unavailable
- [ ] Verify graceful degradation when LLM service fails
- [ ] Test recovery from temporary network issues
- [ ] Create resilience-test.js

### 5.2 Input Edge Cases
- [ ] Test with empty files
- [ ] Validate handling of binary files
- [ ] Test with extremely large files
- [ ] Verify behavior with unsupported file types
- [ ] Create edge-case-test.js

## Phase 6: End-to-End System Testing

### 6.1 Server Verification
- [ ] Test server startup
- [ ] Verify health endpoint
- [ ] Test shutdown procedure
- [ ] Create server-test.js

### 6.2 MCP Protocol Testing
- [ ] Test codeAnalyzer MCP function
- [ ] Verify queryCodebase MCP function
- [ ] Test parameter validation
- [ ] Create mcp-test.js

## Immediate Implementation Plan

Priority test implementation order:

1. Basic scanner module tests (test_file_scanner.js)
2. Analyzer mock mode tests (test_code_analysis.js)
3. Controller workflow tests (test_vector_code_lens.js)
4. Server startup and health check (quick_test.js)

## Test File Templates

### Example Scanner Test
```javascript
// test/scanner-test.js
import { createScanner } from '../dist/scanner/code-scanner.js';

// Test file pattern matching
const scanner = createScanner({
  filePatterns: ['**/*.js'],
  excludePatterns: ['**/node_modules/**']
});

// Assert isMatchingFile works correctly
console.assert(scanner.isMatchingFile('test.js') === true, 'Should match .js files');
console.assert(scanner.isMatchingFile('test.py') === false, 'Should not match .py files');

// Test directory exclusion
console.assert(scanner.isExcluded('node_modules/test.js') === true, 'Should exclude node_modules');
```

### Example Analyzer Test
```javascript
// test/analyzer-test.js
import { createAnalyzer } from '../dist/analysis/code-analyzer.js';

// Test with mock mode enabled
const analyzer = createAnalyzer({ useMock: true });

// Test prompt formatting
const promptData = analyzer.formatPrompt({ 
  content: 'function test() { return true; }', 
  language: 'JavaScript' 
}, 'semantic');

console.assert(promptData.language === 'JavaScript', 'Should preserve language');
console.assert(promptData.format === 'json', 'Should use JSON format');
```

## Automated Test Runner

```bash
#!/bin/bash
# run_full_tests.sh

echo "===== VectorCodeLens Test Suite ====="

# 1. Environment checks
echo "Checking environment..."
node --version
curl -s http://127.0.0.1:6333 > /dev/null
if [ $? -ne 0 ]; then
  echo "ERROR: Qdrant is not running!"
  exit 1
fi

# 2. Build project
echo "Building project..."
npm run build

# 3. Run unit tests
echo "Running unit tests..."
node test/scanner-test.js
node test/analyzer-test.js
node test/storage-test.js

# 4. Run integration tests
echo "Running integration tests..."
node test/workflow-test.js
node test/controller-test.js

# 5. Run performance tests
echo "Running performance tests..."
node test/performance-test.js

# 6. Run MCP tests
echo "Running MCP protocol tests..."
node test/mcp-test.js

echo "===== Test Suite Complete ====="
```

## Reporting

Test reports should include:
- Pass/fail status for each test case
- Performance metrics (time, memory usage)
- Coverage statistics
- Failure details and stack traces

## Implementation Notes

- All tests should work with TypeScript ESM modules
- Tests should be idempotent and clean up after themselves
- Mock services should be used when possible for unit tests
- Real services should be used for integration tests
- All tests should have descriptive console output
