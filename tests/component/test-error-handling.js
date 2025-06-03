/**
 * Error handling tests for CodeAnalyzerMCP
 * Tests various failure scenarios and recovery strategies
 */
const { describe, it, before, after } = require('mocha');
const { expect } = require('chai');
const path = require('path');
const fs = require('fs');
const sinon = require('sinon');

// Import helpers
const { setupTestEnvironment, cleanupTestEnvironment } = require('../helpers/setup');

// Import modules to test
const { createScanner } = require('../../src/codeScannerModule');
const { createAnalyzer } = require('../../src/codeAnalysisModule');
const { createStorage } = require('../../src/storageModule');
const { createQueryEngine } = require('../../src/claudeQueryModule');

describe('Error Handling Tests', () => {
  let scanner, analyzer, storage, queryEngine;
  const testFixturesPath = path.join(__dirname, '../fixtures');
  
  before(async () => {
    await setupTestEnvironment();
    
    // Create instances with default settings
    scanner = createScanner();
    analyzer = createAnalyzer();
    storage = createStorage();
    queryEngine = createQueryEngine();
  });
  
  after(async () => {
    await cleanupTestEnvironment();
  });
  
  describe('Scanner Error Handling', () => {
    it('should handle non-existent directories gracefully', async () => {
      const nonExistentPath = path.join(testFixturesPath, 'does-not-exist');
      
      try {
        await scanner.scanDirectory(nonExistentPath);
        // If we get here without an error, fail the test
        expect.fail('Should have thrown an error for non-existent directory');
      } catch (error) {
        // Verify error is handled properly
        expect(error).to.be.an('error');
        expect(error.message).to.include('not exist');
      }
    });
    
    it('should handle permission denied errors', async () => {
      // Create a directory with restricted permissions
      const restrictedPath = path.join(testFixturesPath, 'restricted-dir');
      if (!fs.existsSync(restrictedPath)) {
        fs.mkdirSync(restrictedPath, { recursive: true });
      }
      
      // Create a file we'll try to read
      const testFile = path.join(restrictedPath, 'test.js');
      fs.writeFileSync(testFile, 'console.log("Test file");');
      
      // Simulate permission denied by stubbing fs.promises.readFile
      const originalReadFile = fs.promises.readFile;
      fs.promises.readFile = async () => {
        throw new Error('EACCES: permission denied');
      };
      
      try {
        await scanner.scanDirectory(restrictedPath);
        // Even with permission errors, it should complete but with warnings
        expect(scanner.warnings).to.be.an('array');
        expect(scanner.warnings.length).to.be.greaterThan(0);
        expect(scanner.warnings[0]).to.include('permission denied');
      } finally {
        // Restore original function
        fs.promises.readFile = originalReadFile;
        
        // Clean up
        if (fs.existsSync(testFile)) {
          fs.unlinkSync(testFile);
        }
        if (fs.existsSync(restrictedPath)) {
          fs.rmdirSync(restrictedPath, { recursive: true });
        }
      }
    });
    
    it('should handle corrupted files gracefully', async () => {
      // Create a binary file that can't be properly processed as text
      const corruptedPath = path.join(testFixturesPath, 'corrupted-file.js');
      
      // Create a file with some binary content
      const buffer = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46]);
      fs.writeFileSync(corruptedPath, buffer);
      
      try {
        const files = await scanner.scanDirectory(testFixturesPath);
        // It should continue processing other files
        expect(files).to.be.an('array');
        
        // Should have a warning about the corrupted file
        expect(scanner.warnings).to.be.an('array');
        expect(scanner.warnings.some(warning => 
          warning.includes('corrupted') || 
          warning.includes('binary') || 
          warning.includes('encoding')
        )).to.be.true;
      } finally {
        // Clean up
        if (fs.existsSync(corruptedPath)) {
          fs.unlinkSync(corruptedPath);
        }
      }
    });
  });
  
  describe('LLM Analysis Error Handling', () => {
    it('should handle LLM server failures with retry', async () => {
      // Create a simple file to analyze
      const testFile = {
        path: path.join(testFixturesPath, 'test.js'),
        content: 'function test() { return "Hello, world!"; }',
        language: 'javascript'
      };
      
      // Mock the LLM server to fail on first attempt but succeed on retry
      let attemptCount = 0;
      const originalSendToLLM = analyzer.sendToLLM;
      
      analyzer.sendToLLM = async (prompt) => {
        attemptCount++;
        if (attemptCount === 1) {
          throw new Error('LLM server unavailable');
        } else {
          return { analysis: { purpose: 'Test function', complexity: 'Simple' } };
        }
      };
      
      try {
        const analysis = await analyzer.analyzeCode(testFile);
        
        // Should succeed after retry
        expect(analysis).to.exist;
        expect(analysis.purpose).to.include('Test function');
        expect(attemptCount).to.be.greaterThan(1);
      } finally {
        // Restore original function
        analyzer.sendToLLM = originalSendToLLM;
      }
    });
    
    it('should handle malformed LLM responses gracefully', async () => {
      // Create a simple file to analyze
      const testFile = {
        path: path.join(testFixturesPath, 'test.js'),
        content: 'function test() { return "Hello, world!"; }',
        language: 'javascript'
      };
      
      // Mock the LLM server to return malformed response
      const originalSendToLLM = analyzer.sendToLLM;
      
      analyzer.sendToLLM = async (prompt) => {
        return "This is not a valid JSON response";
      };
      
      try {
        const analysis = await analyzer.analyzeCode(testFile);
        
        // Should provide a default analysis with error info
        expect(analysis).to.exist;
        expect(analysis.error).to.exist;
        expect(analysis.error).to.include('malformed');
      } finally {
        // Restore original function
        analyzer.sendToLLM = originalSendToLLM;
      }
    });
    
    it('should handle rate limit errors with backoff', async () => {
      // Create a simple file to analyze
      const testFile = {
        path: path.join(testFixturesPath, 'test.js'),
        content: 'function test() { return "Hello, world!"; }',
        language: 'javascript'
      };
      
      // Mock the LLM server to simulate rate limiting
      let attemptCount = 0;
      const originalSendToLLM = analyzer.sendToLLM;
      const clock = sinon.useFakeTimers();
      
      analyzer.sendToLLM = async (prompt) => {
        attemptCount++;
        if (attemptCount <= 2) {
          const error = new Error('Rate limit exceeded');
          error.status = 429;
          throw error;
        } else {
          return { analysis: { purpose: 'Test function', complexity: 'Simple' } };
        }
      };
      
      const analyzePromise = analyzer.analyzeCode(testFile);
      
      // Fast-forward time to simulate waiting for backoff
      clock.tick(2000); // 2 second first backoff
      clock.tick(4000); // 4 second second backoff
      
      try {
        const analysis = await analyzePromise;
        
        // Should succeed after backoff and retry
        expect(analysis).to.exist;
        expect(analysis.purpose).to.include('Test function');
        expect(attemptCount).to.be.greaterThan(2);
      } finally {
        // Restore original function and clock
        analyzer.sendToLLM = originalSendToLLM;
        clock.restore();
      }
    });
  });
  
  describe('Storage Error Handling', () => {
    it('should handle database connection failures', async () => {
      // Create test data to store
      const testData = {
        id: 'test-id',
        content: 'Test content',
        embedding: new Array(384).fill(0.1)
      };
      
      // Mock the database connection to fail
      const originalStoreEmbedding = storage.storeEmbedding;
      
      storage.storeEmbedding = async (data) => {
        throw new Error('Database connection failed');
      };
      
      try {
        const result = await storage.storeAnalysis(testData);
        
        // Should fail gracefully with error information
        expect(result.success).to.be.false;
        expect(result.error).to.exist;
        expect(result.error).to.include('Database connection');
      } finally {
        // Restore original function
        storage.storeEmbedding = originalStoreEmbedding;
      }
    });
    
    it('should handle invalid embedding format', async () => {
      // Create test data with invalid embedding
      const testData = {
        id: 'test-id',
        content: 'Test content',
        embedding: 'not-a-valid-embedding' // Should be an array of numbers
      };
      
      try {
        const result = await storage.storeAnalysis(testData);
        
        // Should fail gracefully with validation error
        expect(result.success).to.be.false;
        expect(result.error).to.exist;
        expect(result.error).to.include('embedding');
      } catch (error) {
        // Or if it throws, should be a validation error
        expect(error.message).to.include('embedding');
      }
    });
    
    it('should handle failed embedding generation but still store metadata', async () => {
      // Create test data without embedding
      const testData = {
        id: 'test-id',
        content: 'Test content',
        metadata: {
          fileName: 'test.js',
          language: 'javascript'
        }
        // No embedding provided
      };
      
      // Mock the embedding generation to fail
      const originalGenerateEmbedding = storage.generateEmbedding;
      
      storage.generateEmbedding = async (text) => {
        throw new Error('Embedding generation failed');
      };
      
      try {
        const result = await storage.storeAnalysis(testData);
        
        // Should still store metadata even without embedding
        expect(result.success).to.be.true;
        expect(result.id).to.equal('test-id');
        expect(result.warning).to.include('embedding');
      } finally {
        // Restore original function
        storage.generateEmbedding = originalGenerateEmbedding;
      }
    });
  });
  
  describe('Query Engine Error Handling', () => {
    it('should handle empty search results gracefully', async () => {
      // Mock the storage search to return empty results
      const originalSearch = storage.searchEmbeddings;
      
      storage.searchEmbeddings = async (query, options) => {
        return { matches: [] };
      };
      
      queryEngine.setStorage(storage);
      
      try {
        const results = await queryEngine.query('find something that does not exist');
        
        // Should return empty results with helpful message
        expect(results).to.exist;
        expect(results.matches).to.be.an('array');
        expect(results.matches.length).to.equal(0);
        expect(results.message).to.include('No matching');
      } finally {
        // Restore original function
        storage.searchEmbeddings = originalSearch;
      }
    });
    
    it('should handle invalid query parameters', async () => {
      try {
        const results = await queryEngine.query('');
        
        // Should fail with error about empty query
        expect(results.error).to.exist;
        expect(results.error).to.include('query');
      } catch (error) {
        // Or if it throws, should be about empty query
        expect(error.message).to.include('query');
      }
    });
    
    it('should handle summary generation failures', async () => {
      // Create some test results
      const testResults = {
        matches: [
          { content: 'Test content 1', score: 0.9 },
          { content: 'Test content 2', score: 0.8 }
        ]
      };
      
      // Mock the storage search to return test results
      const originalSearch = storage.searchEmbeddings;
      storage.searchEmbeddings = async (query, options) => {
        return testResults;
      };
      
      // Mock the summary generation to fail
      const originalSummarize = queryEngine.summarizeResults;
      queryEngine.summarizeResults = async (results, query) => {
        throw new Error('Summary generation failed');
      };
      
      queryEngine.setStorage(storage);
      
      try {
        const results = await queryEngine.query('test query', { generateSummary: true });
        
        // Should still return results even if summary fails
        expect(results).to.exist;
        expect(results.matches).to.be.an('array');
        expect(results.matches.length).to.equal(2);
        expect(results.summary).to.not.exist;
        expect(results.error).to.include('summary');
      } finally {
        // Restore original functions
        storage.searchEmbeddings = originalSearch;
        queryEngine.summarizeResults = originalSummarize;
      }
    });
  });
  
  describe('End-to-End Error Recovery', () => {
    it('should recover from LLM failures during full pipeline execution', async () => {
      // Create a test file
      const testFilePath = path.join(testFixturesPath, 'e2e-test.js');
      fs.writeFileSync(testFilePath, `
        // Test file for E2E error recovery
        function recoverableTest() {
          return "This function tests error recovery";
        }
      `);
      
      // Mock LLM to fail initially then recover
      let llmAttempts = 0;
      const originalSendToLLM = analyzer.sendToLLM;
      analyzer.sendToLLM = async (prompt) => {
        llmAttempts++;
        if (llmAttempts === 1) {
          throw new Error('LLM service temporarily unavailable');
        }
        return { analysis: { purpose: 'Test function', complexity: 'Simple' } };
      };
      
      // Clear any existing analysis
      await storage.deleteAnalysisByPath(testFilePath);
      
      try {
        // Scan the directory
        const files = await scanner.scanDirectory(testFixturesPath);
        expect(files).to.be.an('array');
        expect(files.some(f => f.path === testFilePath)).to.be.true;
        
        // Get the test file
        const testFile = files.find(f => f.path === testFilePath);
        
        // Analyze the file (this should retry on LLM failure)
        const analysis = await analyzer.analyzeCode(testFile);
        expect(analysis).to.exist;
        expect(analysis.purpose).to.include('Test function');
        
        // Store the analysis
        const storageResult = await storage.storeAnalysis({
          ...testFile,
          analysis
        });
        expect(storageResult.success).to.be.true;
        
        // Query for the analysis
        const queryResult = await queryEngine.query('test error recovery');
        expect(queryResult).to.exist;
        expect(queryResult.matches).to.be.an('array');
        expect(queryResult.matches.length).to.be.greaterThan(0);
        
        // Verify retry happened
        expect(llmAttempts).to.be.greaterThan(1);
      } finally {
        // Restore original function
        analyzer.sendToLLM = originalSendToLLM;
        
        // Clean up
        if (fs.existsSync(testFilePath)) {
          fs.unlinkSync(testFilePath);
        }
      }
    });
    
    it('should handle concurrent operation failures gracefully', async () => {
      // Create multiple test files
      const testFiles = [];
      for (let i = 0; i < 3; i++) {
        const filePath = path.join(testFixturesPath, `concurrent-test-${i}.js`);
        fs.writeFileSync(filePath, `
          // Test file ${i} for concurrent operations
          function test${i}() {
            return "This is test function ${i}";
          }
        `);
        testFiles.push(filePath);
      }
      
      // Mock storage to fail for one file but succeed for others
      const originalStoreAnalysis = storage.storeAnalysis;
      storage.storeAnalysis = async (data) => {
        if (data.path.includes('concurrent-test-1')) {
          throw new Error('Storage failure for test-1');
        }
        return { success: true, id: data.id || 'test-id' };
      };
      
      try {
        // Scan the directory
        const files = await scanner.scanDirectory(testFixturesPath);
        const concurrentFiles = files.filter(f => f.path.includes('concurrent-test'));
        expect(concurrentFiles.length).to.equal(3);
        
        // Process files concurrently
        const results = await Promise.allSettled(concurrentFiles.map(async (file) => {
          const analysis = await analyzer.analyzeCode(file);
          return storage.storeAnalysis({ ...file, analysis });
        }));
        
        // Should have 2 fulfilled and 1 rejected
        expect(results.filter(r => r.status === 'fulfilled').length).to.equal(2);
        expect(results.filter(r => r.status === 'rejected').length).to.equal(1);
        
        // The rejected one should be for concurrent-test-1
        const rejected = results.find(r => r.status === 'rejected');
        expect(rejected.reason.message).to.include('test-1');
      } finally {
        // Restore original function
        storage.storeAnalysis = originalStoreAnalysis;
        
        // Clean up
        for (const file of testFiles) {
          if (fs.existsSync(file)) {
            fs.unlinkSync(file);
          }
        }
      }
    });
  });
});
