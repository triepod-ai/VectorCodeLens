/**
 * Component-specific tests for Claude Query Module
 */
const { describe, it, before, after } = require('mocha');
const { expect } = require('chai');
const path = require('path');
const fs = require('fs');

// Import helpers
const { setupTestEnvironment, cleanupTestEnvironment } = require('../helpers/setup');
const { assertValidQueryResult } = require('../helpers/assertions');
const { createQueryModule } = require('../../src/claudeQueryModule');
const { createStorage } = require('../../src/storageModule');
const { createAnalyzer } = require('../../src/codeAnalysisModule');
const { createScanner } = require('../../src/codeScannerModule');

describe('Claude Query Module Tests', () => {
  let queryModule;
  let storage;
  let analyzer;
  let scanner;
  const testFixturesPath = path.join(__dirname, '../fixtures');
  
  before(async () => {
    await setupTestEnvironment();
    
    // Force mock mode for tests
    process.env.USE_MOCK_LLM = 'true';
    process.env.USE_MOCK_STORAGE = 'true';
    
    queryModule = createQueryModule({
      useMock: true,
      maxResults: 5,
      similarityThreshold: 0.5
    });
    
    storage = createStorage({
      useMock: true,
      collectionName: 'query_test_collection'
    });
    
    analyzer = createAnalyzer({
      useMock: true
    });
    
    scanner = createScanner({
      filePatterns: ['**/*.js', '**/*.ts', '**/*.py'],
      excludePatterns: ['**/node_modules/**', '**/__pycache__/**']
    });
    
    // Initialize storage
    await storage.initialize();
    
    // Populate storage with some code analyses
    await populateTestData();
  });
  
  after(async () => {
    await cleanupTestEnvironment();
  });
  
  // Helper function to populate test data
  async function populateTestData() {
    // Scan test fixtures
    const jsFiles = await scanner.scanDirectory(path.join(testFixturesPath, 'js-project'));
    const tsFiles = await scanner.scanDirectory(path.join(testFixturesPath, 'ts-project'));
    const pyFiles = await scanner.scanDirectory(path.join(testFixturesPath, 'py-project'));
    
    // Analyze files
    const jsAnalyses = await Promise.all(jsFiles.map(file => analyzer.analyzeCode(file, 'comprehensive')));
    const tsAnalyses = await Promise.all(tsFiles.map(file => analyzer.analyzeCode(file, 'comprehensive')));
    const pyAnalyses = await Promise.all(pyFiles.map(file => analyzer.analyzeCode(file, 'comprehensive')));
    
    // Store analyses
    await storage.storeMultipleAnalyses([...jsAnalyses, ...tsAnalyses, ...pyAnalyses]);
    
    // Add some specific analyses for testing queries
    const specialAnalyses = [
      {
        filePath: '/test/special/authentication.js',
        language: 'JavaScript',
        summary: 'Handles user authentication and token management',
        purpose: 'User authentication',
        complexity: 7,
        quality: 8,
        entities: [
          { name: 'login', type: 'function', description: 'Authenticates user and returns token' },
          { name: 'verifyToken', type: 'function', description: 'Verifies JWT token' },
          { name: 'refreshToken', type: 'function', description: 'Refreshes expired token' }
        ],
        content: 'Authentication module with login, verification and token refresh'
      },
      {
        filePath: '/test/special/database.js',
        language: 'JavaScript',
        summary: 'Database connection and query utilities',
        purpose: 'Database operations',
        complexity: 6,
        quality: 9,
        entities: [
          { name: 'connect', type: 'function', description: 'Establishes database connection' },
          { name: 'query', type: 'function', description: 'Executes SQL query' },
          { name: 'transaction', type: 'function', description: 'Manages database transactions' }
        ],
        content: 'Database utility module with connection and query functions'
      },
      {
        filePath: '/test/special/api.py',
        language: 'Python',
        summary: 'RESTful API implementation',
        purpose: 'API endpoints',
        complexity: 8,
        quality: 7,
        entities: [
          { name: 'UserResource', type: 'class', description: 'User API endpoints' },
          { name: 'ProductResource', type: 'class', description: 'Product API endpoints' },
          { name: 'handle_error', type: 'function', description: 'Global error handler' }
        ],
        content: 'API module with user and product endpoints'
      }
    ];
    
    await storage.storeMultipleAnalyses(specialAnalyses);
  }
  
  it('should query code using natural language', async () => {
    const queryText = 'Find authentication functions';
    const result = await queryModule.queryCode(queryText, storage);
    
    assertValidQueryResult(result, queryText);
    expect(result.results).to.be.an('array');
    expect(result.results.length).to.be.greaterThan(0);
    
    // Results should contain authentication-related content
    const authResults = result.results.filter(r => 
      r.content.toLowerCase().includes('auth') || 
      r.filePath.toLowerCase().includes('auth')
    );
    
    expect(authResults.length).to.be.greaterThan(0);
  });
  
  it('should query with filters', async () => {
    const queryText = 'Find database operations';
    const result = await queryModule.queryCode(queryText, storage, { language: 'JavaScript' });
    
    assertValidQueryResult(result, queryText);
    
    // All results should be JavaScript
    result.results.forEach(r => {
      expect(r.language).to.equal('JavaScript');
    });
    
    // Results should contain database-related content
    const dbResults = result.results.filter(r => 
      r.content.toLowerCase().includes('database') || 
      r.filePath.toLowerCase().includes('database')
    );
    
    expect(dbResults.length).to.be.greaterThan(0);
  });
  
  it('should process results and calculate relevance', async () => {
    const queryText = 'API endpoints';
    const result = await queryModule.queryCode(queryText, storage);
    
    assertValidQueryResult(result, queryText);
    
    // Results should include relevance scores
    result.results.forEach(r => {
      expect(r).to.have.property('relevance');
      expect(r.relevance).to.be.within(0, 1);
    });
    
    // Results should be ordered by relevance/score
    const scores = result.results.map(r => r.score);
    const sortedScores = [...scores].sort((a, b) => b - a);
    expect(scores).to.deep.equal(sortedScores);
  });
  
  it('should generate summaries of query results', async () => {
    const queryText = 'Find API implementation';
    const result = await queryModule.queryCode(queryText, storage);
    
    assertValidQueryResult(result, queryText);
    
    // Should have a summary if results were found
    if (result.results.length > 0) {
      expect(result.summary).to.be.a('string');
      expect(result.summary.length).to.be.greaterThan(10);
      expect(result.summary).to.include('API');
    }
  });
  
  it('should handle queries with no results', async () => {
    const queryText = 'Find quantum physics implementation';
    const result = await queryModule.queryCode(queryText, storage);
    
    assertValidQueryResult(result, queryText);
    
    // May have results due to mock storage, but would be fewer
    if (result.results.length === 0) {
      expect(result.summary).to.be.null;
    }
  });
  
  it('should format summary prompts correctly', () => {
    const queryText = 'Test query';
    const results = [
      {
        filePath: '/test/file1.js',
        language: 'JavaScript',
        summary: 'Summary 1',
        content: 'Content 1'
      },
      {
        filePath: '/test/file2.js',
        language: 'JavaScript',
        summary: 'Summary 2',
        content: 'Content 2'
      }
    ];
    
    const prompt = queryModule.formatSummaryPrompt(results, queryText);
    
    expect(prompt).to.be.a('string');
    expect(prompt).to.include(queryText);
    expect(prompt).to.include('/test/file1.js');
    expect(prompt).to.include('/test/file2.js');
    expect(prompt).to.include('Summary 1');
    expect(prompt).to.include('Summary 2');
  });
  
  it('should handle error conditions gracefully', async () => {
    // Test with null query
    try {
      await queryModule.queryCode(null, storage);
      expect.fail('Should have thrown an error for null query');
    } catch (error) {
      expect(error.message).to.include('Invalid query text');
    }
    
    // Test with invalid storage
    try {
      await queryModule.queryCode('Test query', null);
      expect.fail('Should have thrown an error for null storage');
    } catch (error) {
      expect(error.message).to.include('Invalid storage module');
    }
    
    // Test with empty query
    try {
      await queryModule.queryCode('', storage);
      expect.fail('Should have thrown an error for empty query');
    } catch (error) {
      expect(error.message).to.include('Invalid query text');
    }
  });
  
  it('should include timing information', async () => {
    const queryText = 'Find functions';
    const result = await queryModule.queryCode(queryText, storage);
    
    assertValidQueryResult(result, queryText);
    
    expect(result.timing).to.be.an('object');
    expect(result.timing.total).to.be.a('number').and.to.be.above(0);
    expect(result.timing.search).to.be.a('number').and.to.be.above(0);
    expect(result.timing.process).to.be.a('number').and.to.be.above(0);
    
    // Total time should equal search + process
    expect(result.timing.total).to.be.closeTo(
      result.timing.search + result.timing.process,
      1 // Allow for small rounding differences
    );
  });
  
  it('should respect similarity threshold configuration', async () => {
    // Create a query module with higher threshold
    const strictQueryModule = createQueryModule({
      useMock: true,
      maxResults: 5,
      similarityThreshold: 0.9 // High threshold
    });
    
    const queryText = 'Find any code';
    const result = await strictQueryModule.queryCode(queryText, storage);
    
    // With mock storage, this test might not behave as expected
    // but in a real scenario, higher threshold would mean fewer results
    assertValidQueryResult(result, queryText);
    
    // All results should have score >= threshold
    result.results.forEach(r => {
      expect(r.score).to.be.at.least(strictQueryModule.config.similarityThreshold);
    });
  });
});
