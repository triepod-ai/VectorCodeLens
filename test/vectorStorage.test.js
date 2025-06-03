// test/vectorStorage.test.js
const { 
  VectorStorage, 
  createVectorStorage, 
  getVectorStorage, 
  DEFAULT_COLLECTION_CONFIG 
} = require('../dist/services/storage');
const fs = require('fs');
const path = require('path');
const assert = require('assert');

// Simple test suite for vector storage
async function runTests() {
  console.log('Running Vector Storage Tests...');
  
  // Test 1: Basic factory function
  try {
    console.log('Test 1: Create vector storage using factory function');
    const storage = createVectorStorage();
    assert(storage instanceof VectorStorage, 'Factory function should create a VectorStorage instance');
    console.log('✅ Test 1 passed');
  } catch (error) {
    console.error('❌ Test 1 failed:', error);
  }
  
  // Test 2: Initialize vector storage
  try {
    console.log('Test 2: Initialize vector storage');
    const storage = createVectorStorage({
      vectorDbUrl: process.env.QDRANT_URL || 'http://localhost:6333',
      vectorCollection: 'vector_code_lens_test',
      vectorDimensions: 4 // Use small dimensions for testing
    });
    
    await storage.initialize();
    console.log('✅ Test 2 passed');
  } catch (error) {
    console.error('❌ Test 2 failed:', error);
  }
  
  // Test 3: Store and retrieve from vector database
  try {
    console.log('Test 3: Store and retrieve from vector database');
    
    // Create a simple test file
    const testDir = path.join(__dirname, 'test_files');
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    
    const testFileName = 'test_codebase.xml';
    const testFilePath = path.join(testDir, testFileName);
    
    // Create a simple XML file with code content
    const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<codebase path="${testDir}" timestamp="${new Date().toISOString()}">
  <metadata>
    <processor>VectorCodeLens Test</processor>
    <version>1.0.0</version>
  </metadata>
  <file path="example.js" language="JavaScript" size="100" lastModified="${new Date().toISOString()}">
    <![CDATA[
function helloWorld() {
  console.log("Hello, Vector Code Lens!");
  return "Hello";
}
    ]]>
  </file>
  <statistics>
    <filesProcessed>1</filesProcessed>
    <filesSkipped>0</filesSkipped>
    <totalSizeBytes>100</totalSizeBytes>
  </statistics>
</codebase>`;
    
    fs.writeFileSync(testFilePath, xmlContent);
    
    // Create vector storage
    const storage = createVectorStorage({
      vectorDbUrl: process.env.QDRANT_URL || 'http://localhost:6333',
      vectorCollection: 'vector_code_lens_test',
      vectorDimensions: 4 // Use small dimensions for testing
    });
    
    // Store the codebase
    const operationId = await storage.storeCodebase(testFilePath);
    console.log(`Stored with operation ID: ${operationId}`);
    
    // Check if the codebase is analyzed
    const isAnalyzed = await storage.isCodebaseAnalyzed(testFilePath);
    assert(isAnalyzed, 'Codebase should be marked as analyzed');
    
    // Get codebase stats
    const stats = await storage.getCodebaseStats(testFilePath);
    assert(stats, 'Should get codebase stats');
    assert(stats.indexedFiles > 0, 'Should have indexed files');
    
    // Search for content
    const searchResults = await storage.search('Hello');
    assert(searchResults.length > 0, 'Should find search results');
    assert(searchResults[0].chunk.includes('Hello'), 'Search result should contain the search term');
    
    // Delete the codebase
    const deleted = await storage.deleteCodebase(testFilePath);
    assert(deleted, 'Should delete codebase successfully');
    
    // Clean up test file
    fs.unlinkSync(testFilePath);
    fs.rmdirSync(testDir);
    
    console.log('✅ Test 3 passed');
  } catch (error) {
    console.error('❌ Test 3 failed:', error);
  }
  
  console.log('All vector storage tests completed');
}

// Run tests
runTests().catch(console.error);
