/**
 * Component-specific tests for Storage Module
 */
const { describe, it, before, after, beforeEach } = require('mocha');
const { expect } = require('chai');
const path = require('path');
const fs = require('fs');

// Import helpers
const { setupTestEnvironment, cleanupTestEnvironment } = require('../helpers/setup');
const { assertValidStorageResult } = require('../helpers/assertions');
const { createStorage } = require('../../src/storageModule');
const { createAnalyzer } = require('../../src/codeAnalysisModule');
const { createScanner } = require('../../src/codeScannerModule');

describe('Storage Module Tests', () => {
  let storage;
  let analyzer;
  let scanner;
  const testFixturesPath = path.join(__dirname, '../fixtures');
  let sampleAnalysis;
  
  before(async () => {
    await setupTestEnvironment();
    
    // Force mock mode for tests
    process.env.USE_MOCK_LLM = 'true';
    process.env.USE_MOCK_STORAGE = 'true';
    
    storage = createStorage({
      useMock: true,
      collectionName: 'code_analysis_test'
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
    
    // Generate a sample analysis for testing
    const jsProjectPath = path.join(testFixturesPath, 'js-project');
    const jsFiles = await scanner.scanDirectory(jsProjectPath);
    const testFile = jsFiles.find(f => path.basename(f.path) === 'utils.js');
    sampleAnalysis = await analyzer.analyzeCode(testFile, 'comprehensive');
  });
  
  after(async () => {
    await cleanupTestEnvironment();
  });
  
  it('should initialize storage successfully', async () => {
    const newStorage = createStorage({
      useMock: true,
      collectionName: 'new_test_collection'
    });
    
    const result = await newStorage.initialize();
    expect(result).to.be.true;
    
    const stats = await newStorage.getStats();
    expect(stats).to.have.property('pointsCount');
    expect(stats.pointsCount).to.equal(0);
  });
  
  it('should store analysis and generate valid result', async () => {
    const result = await storage.storeAnalysis(sampleAnalysis);
    
    assertValidStorageResult(result);
    expect(result.status).to.equal('success');
    
    // Save ID for later tests
    sampleAnalysis.id = result.id;
  });
  
  it('should store multiple analyses in batch', async () => {
    // Create multiple analyses
    const analyses = [];
    for (let i = 0; i < 3; i++) {
      analyses.push({
        ...sampleAnalysis,
        id: undefined, // Force new IDs
        summary: `Sample analysis ${i}`
      });
    }
    
    const results = await storage.storeMultipleAnalyses(analyses);
    
    expect(results).to.be.an('array');
    expect(results.length).to.equal(3);
    
    results.forEach(result => {
      assertValidStorageResult(result);
      expect(result.status).to.equal('success');
    });
  });
  
  it('should search code using vector similarity', async () => {
    // Store some analyses first to ensure we have data
    const analyses = [];
    for (let i = 0; i < 5; i++) {
      analyses.push({
        ...sampleAnalysis,
        id: undefined,
        summary: `Test analysis about ${['functions', 'classes', 'variables', 'methods', 'interfaces'][i]}`,
        purpose: `Demo purpose ${i}`
      });
    }
    
    await storage.storeMultipleAnalyses(analyses);
    
    // Search
    const searchResult = await storage.searchCode('Find code with functions');
    
    expect(searchResult).to.have.property('results');
    expect(searchResult.results).to.be.an('array');
    expect(searchResult.timing).to.have.property('total');
    
    // Should find at least one result
    expect(searchResult.results.length).to.be.greaterThan(0);
    
    // Check result structure
    const firstResult = searchResult.results[0];
    expect(firstResult).to.have.property('id');
    expect(firstResult).to.have.property('score');
    expect(firstResult.score).to.be.within(0, 1);
    expect(firstResult).to.have.property('content');
  });
  
  it('should search with filters', async () => {
    // Store analyses with specific languages
    const analyses = [
      {
        ...sampleAnalysis,
        id: undefined,
        language: 'JavaScript',
        summary: 'JavaScript code analysis'
      },
      {
        ...sampleAnalysis,
        id: undefined,
        language: 'TypeScript',
        summary: 'TypeScript code analysis'
      },
      {
        ...sampleAnalysis,
        id: undefined,
        language: 'Python',
        summary: 'Python code analysis'
      }
    ];
    
    await storage.storeMultipleAnalyses(analyses);
    
    // Search with language filter
    const searchResult = await storage.searchCode('Find code', { language: 'JavaScript' });
    
    expect(searchResult.results).to.be.an('array');
    expect(searchResult.results.length).to.be.greaterThan(0);
    
    // All results should be JavaScript
    searchResult.results.forEach(result => {
      expect(result.language).to.equal('JavaScript');
    });
  });
  
  it('should delete analysis by ID', async () => {
    // Store an analysis to delete
    const analysisToDelete = {
      ...sampleAnalysis,
      id: undefined,
      summary: 'This analysis will be deleted'
    };
    
    const storeResult = await storage.storeAnalysis(analysisToDelete);
    const idToDelete = storeResult.id;
    
    // Delete it
    const deleteResult = await storage.deleteAnalysis(idToDelete);
    expect(deleteResult).to.be.true;
    
    // Search for it - should not be found
    const searchResult = await storage.searchCode('This analysis will be deleted');
    
    // In mock mode we might still get results, but in real mode this would validate the deletion
    if (searchResult.results.length > 0) {
      expect(searchResult.results.some(r => r.id === idToDelete)).to.be.false;
    }
  });
  
  it('should handle error conditions gracefully', async () => {
    // Test with null input
    try {
      await storage.storeAnalysis(null);
      expect.fail('Should have thrown an error for null input');
    } catch (error) {
      expect(error.message).to.include('Invalid analysis');
    }
    
    // Test with empty analyses array
    try {
      await storage.storeMultipleAnalyses([]);
      expect.fail('Should have thrown an error for empty array');
    } catch (error) {
      expect(error.message).to.include('Invalid analyses');
    }
    
    // Test delete with invalid ID
    try {
      await storage.deleteAnalysis('');
      expect.fail('Should have thrown an error for empty ID');
    } catch (error) {
      expect(error.message).to.include('Invalid ID');
    }
  });
  
  it('should generate embeddings from text', async () => {
    const testText = 'This is a test string for embedding generation';
    const embedding = await storage.generateEmbedding(testText);
    
    expect(embedding).to.be.an('array');
    expect(embedding.length).to.equal(storage.config.embeddingDimension);
    expect(embedding.every(val => typeof val === 'number')).to.be.true;
    
    // Same input should produce same embedding (deterministic in mock mode)
    const embedding2 = await storage.generateEmbedding(testText);
    expect(embedding).to.deep.equal(embedding2);
    
    // Different input should produce different embedding
    const differentText = 'This is a completely different string';
    const differentEmbedding = await storage.generateEmbedding(differentText);
    expect(embedding).to.not.deep.equal(differentEmbedding);
  });
  
  it('should prepare metadata correctly from analysis', () => {
    const metadata = storage.prepareMetadata(sampleAnalysis);
    
    expect(metadata).to.have.property('id');
    expect(metadata).to.have.property('filePath');
    expect(metadata).to.have.property('language');
    expect(metadata).to.have.property('summary');
    expect(metadata).to.have.property('purpose');
    expect(metadata).to.have.property('complexity');
    expect(metadata).to.have.property('timestamp');
    expect(metadata).to.have.property('content');
    
    // Should handle missing fields gracefully
    const minimalAnalysis = {
      summary: 'Minimal analysis'
    };
    
    const minimalMetadata = storage.prepareMetadata(minimalAnalysis);
    expect(minimalMetadata).to.have.property('id');
    expect(minimalMetadata).to.have.property('summary');
    expect(minimalMetadata.entityCount).to.equal(0);
  });
  
  it('should extract embedding text from analysis', () => {
    const text = storage.getEmbeddingText(sampleAnalysis);
    
    expect(text).to.be.a('string');
    expect(text).to.include(sampleAnalysis.summary);
    expect(text).to.include(sampleAnalysis.purpose);
    
    if (sampleAnalysis.entities && sampleAnalysis.entities.length > 0) {
      sampleAnalysis.entities.forEach(entity => {
        expect(text).to.include(entity.name);
      });
    }
  });
  
  it('should retrieve storage statistics', async () => {
    const stats = await storage.getStats();
    
    expect(stats).to.have.property('pointsCount');
    expect(stats.pointsCount).to.be.a('number');
    
    // In mock mode, we should have collections data
    if (stats.collections) {
      expect(stats.collections).to.be.an('array');
      expect(stats.collections.some(c => c.name === storage.config.collectionName)).to.be.true;
    }
  });
});
