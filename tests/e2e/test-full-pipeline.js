/**
 * End-to-end test for the complete CodeAnalyzerMCP pipeline
 * 
 * Tests the entire flow from scanning to querying
 */
const path = require('path');
const { describe, it, before, after } = require('mocha');
const { assert } = require('chai');

// Import the CodeAnalyzer modules
const { CodeAnalyzerController } = require('../dist/controller');

// Import test helpers
const { setupTestEnvironment } = require('./helpers/setup');
const { cleanupTestEnvironment, resetQdrantCollection } = require('./helpers/cleanup');
const { 
  assertCodeAnalyzed, 
  assertQueryFound 
} = require('./helpers/assertions');

// Test configuration
const TEST_COLLECTION = 'test_code_analysis';
const SMALL_JS_PROJECT_PATH = path.join(__dirname, 'fixtures', 'small-js-project');

describe('CodeAnalyzerMCP Full Pipeline E2E Tests', function() {
  // Increase timeout for E2E tests
  this.timeout(30000);
  
  let controller;
  let testEnv;
  
  before(async function() {
    // Set up test environment
    testEnv = await setupTestEnvironment({
      useQdrant: true,
      useLLM: true,
      mockLLM: true
    });
    
    // Reset Qdrant collection
    await resetQdrantCollection(TEST_COLLECTION, {
      recreate: true
    });
    
    // Create controller with test configuration
    controller = new CodeAnalyzerController();
    
    // Configure controller to use test environment
    controller.storage.collectionName = TEST_COLLECTION;
    
    // Initialize controller
    await controller.initialize();
  });
  
  after(async function() {
    // Clean up test environment
    await cleanupTestEnvironment(testEnv, {
      cleanData: true,
      removeDataDir: false
    });
  });
  
  it('should analyze a small JavaScript project', async function() {
    // Analyze the small JavaScript project
    const result = await controller.analyzeDirectory(SMALL_JS_PROJECT_PATH, {
      maxDepth: 3,
      includePatterns: ['**/*.js'],
      maxFileSize: 1000 * 1024 // 1MB
    });
    
    // Verify analysis results
    assertCodeAnalyzed(result, {
      minFilesAnalyzed: 3, // index.js, config.js, data-processor.js, error-handler.js
      minChunksAnalyzed: 5,
      maxErrors: 0,
      shouldHaveStats: true
    });
    
    // Make sure we have files analyzed
    assert.isAtLeast(result.filesAnalyzed, 3, 'Should analyze at least 3 files');
    
    // Verify stats
    assert.property(result, 'stats', 'Should include stats');
    assert.isArray(result.stats.filesAnalyzed, 'Should have filesAnalyzed array');
    assert.isObject(result.stats.languageCounts, 'Should have languageCounts object');
    
    // Verify language counts
    assert.property(result.stats.languageCounts, 'javascript', 'Should count JavaScript files');
    assert.isAtLeast(result.stats.languageCounts.javascript, 3, 'Should have at least 3 JavaScript files');
  });
  
  it('should query the analyzed codebase', async function() {
    // Query for error handling
    const queryResult = await controller.queryCodebase(
      'How is error handling implemented?',
      { limit: 5 }
    );
    
    // Verify query results
    assertQueryFound(queryResult, {
      minMatches: 1,
      queryTerms: ['error', 'handling'],
      mustIncludeFile: 'error-handler.js'
    });
    
    // Verify query content
    assert.isString(queryResult.query, 'Should include the query');
    assert.isNumber(queryResult.executionTimeMs, 'Should include execution time');
    assert.isArray(queryResult.results, 'Should include results array');
    assert.isAtLeast(queryResult.results.length, 1, 'Should have at least one result');
    
    // Check first result
    const firstResult = queryResult.results[0];
    assert.property(firstResult, 'filePath', 'Result should have filePath');
    assert.property(firstResult, 'relativePath', 'Result should have relativePath');
    assert.property(firstResult, 'language', 'Result should have language');
    assert.property(firstResult, 'codeSnippet', 'Result should have codeSnippet');
    assert.property(firstResult, 'summary', 'Result should have summary');
  });
  
  it('should get storage stats', async function() {
    // Get storage stats
    const stats = await controller.getStorageStats();
    
    // Verify stats
    assert.isObject(stats, 'Should return stats object');
    assert.property(stats, 'totalPoints', 'Should include totalPoints');
    assert.property(stats, 'filesAnalyzed', 'Should include filesAnalyzed');
    assert.property(stats, 'languageCounts', 'Should include languageCounts');
    
    // Verify counts
    assert.isAtLeast(stats.totalPoints, 5, 'Should have at least 5 points');
    assert.isAtLeast(stats.filesAnalyzed.length, 3, 'Should have at least 3 files');
    assert.property(stats.languageCounts, 'javascript', 'Should count JavaScript files');
  });
});
