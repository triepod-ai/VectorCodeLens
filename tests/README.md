# CodeAnalyzerMCP Test Suite

This repository contains the comprehensive E2E test suite for the CodeAnalyzerMCP system. The test suite is organized into three phases as outlined in the CodeAnalyzerTestPlan.

## Test Structure

The test suite is organized as follows:

```
tests/
├── component/                # Component-specific tests
│   ├── test-scanning.js      # Tests for CodeScannerModule
│   ├── test-analysis.js      # Tests for CodeAnalysisModule
│   ├── test-storage.js       # Tests for StorageModule
│   ├── test-querying.js      # Tests for ClaudeQueryModule
│   ├── test-error-handling.js # Tests for error recovery mechanisms
│   └── test-performance.js   # Tests for performance and scalability
├── fixtures/                 # Test fixtures for various test cases
├── helpers/                  # Test helper utilities
│   ├── setup.js              # Environment setup utilities
│   └── benchmark.js          # Performance benchmarking utilities
└── results/                  # Directory for test results and reports
```

## Test Phases

The test suite is implemented in three phases as defined in the CodeAnalyzerTestPlan:

### Phase 1: Core Test Infrastructure
- Basic test fixtures for different languages and project sizes
- Test helpers for environment configuration and cleanup
- Core pipeline test for end-to-end verification

### Phase 2: Component-Specific Tests
- Detailed tests for each component in the system
- Tests for specific functionality like file scanning, code analysis, and vector storage
- Tests for various edge cases and boundary conditions

### Phase 3: Error Handling and Performance
- Tests for error recovery and resilience
- Performance tests with progressively larger codebases
- Resource usage measurement and optimization

## Running Tests

Use the `run_tests.bat` script in the repository root to run all tests:

```
.\run_tests.bat
```

To run specific test phases or components:

```
npx mocha tests/component/test-scanning.js
npx mocha tests/component/test-error-handling.js
npx mocha tests/component/test-performance.js
```

## Performance Testing

The performance tests measure various aspects of the system's efficiency:

1. **Scanning Performance**: Tests how efficiently the system can scan codebases of various sizes
2. **Analysis Performance**: Tests the speed of code analysis for different languages and file types
3. **Storage Performance**: Tests vector database operations efficiency
4. **Query Performance**: Tests semantic search and results summarization
5. **Full Pipeline Performance**: Tests end-to-end performance of all components together
6. **Memory Consumption**: Tracks memory usage during processing

Performance test results are saved to the `tests/results` directory as both JSON data and HTML reports.

## Error Handling Tests

The error handling tests verify the system's resilience to various failure scenarios:

1. **Scanner Errors**: Non-existent directories, permission issues, and malformed files
2. **LLM Analysis Errors**: Server failures, rate limiting, and malformed responses
3. **Storage Errors**: Database connection issues and invalid data
4. **Query Errors**: Empty results and invalid parameters
5. **End-to-End Recovery**: Testing the entire pipeline's ability to recover from failures

## Environment Setup

The test suite uses mock dependencies when external services are unavailable:

- **Mock LLM Server**: For testing without a real LLM service
- **Mock Storage**: For testing without a real vector database

Environment variables can be used to configure test behavior:

- `USE_MOCK_LLM`: Set to "true" to use the mock LLM server (default: true)
- `USE_MOCK_STORAGE`: Set to "true" to use mock vector storage (default: auto-detected)
- `QDRANT_URL`: URL for Qdrant vector database (default: http://localhost:6333)
- `LLM_SERVER_URL`: URL for Ollama LLM server (default: http://localhost:11434)

## Test Fixtures

The test fixtures directory contains sample code for testing:

- **JavaScript Project**: Simple JS project with multiple files
- **TypeScript Project**: TS project with interfaces and classes
- **Python Project**: Python files for cross-language testing
- **Generated Projects**: Test fixtures of varying sizes for performance testing

## Benchmarking Utilities

The benchmark.js helper provides utilities for performance measurement:

- **PerformanceMetrics**: Class for tracking execution times and memory usage
- **Memory Snapshots**: Function for recording memory consumption
- **HTML Reports**: Functions for generating visual performance reports
