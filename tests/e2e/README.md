# CodeAnalyzerMCP E2E Tests

End-to-end tests for the CodeAnalyzerMCP system.

## Overview

These tests validate the entire system workflow from scanning code files through analysis and storage to querying the results. They ensure all components work together correctly in a real-world scenario.

## Test Structure

- **fixtures/** - Test codebases of various languages and sizes
- **helpers/** - Test utilities for setup, cleanup, and assertions
- **test-full-pipeline.js** - Tests the complete analysis and query flow
- Additional component-specific tests (to be implemented)

## Prerequisites

- Node.js v16+
- Docker (for running Qdrant vector database)
- Local LLM server running (or use the mock server)

## Setup

1. Build the main project:
   ```
   cd ../../
   npm run build
   ```

2. Install test dependencies:
   ```
   cd test/e2e
   npm install
   ```

3. Configure test environment:

   By default, the tests:
   - Start a Docker container for Qdrant (required for storage tests)
   - Start a mock LLM server (for analysis tests)

   You can modify this behavior in the `before` hook of each test.

## Running Tests

Run the complete test suite:
```
npm test
```

Run only the full pipeline test:
```
npm run test:full
```

## Test Coverage

The e2e tests cover:

1. **Code Scanning**: Tests the ability to find and extract code files
2. **Code Analysis**: Tests LLM-based code analysis and structure detection
3. **Vector Storage**: Tests storing analysis in vector database and retrieving it
4. **Natural Language Querying**: Tests searching the code with natural language

## Adding New Tests

1. Create a new test file (e.g., `test-new-feature.js`)
2. Use the test helpers for consistent setup/cleanup
3. Add the test to the scripts in package.json

## Mocking

The tests use mock LLM responses by default to ensure consistent behavior. To test with a real LLM server:

1. Start your LLM server manually
2. Modify the `setupTestEnvironment` options in the test file:
   ```javascript
   testEnv = await setupTestEnvironment({
     mockLLM: false
   });
   ```
