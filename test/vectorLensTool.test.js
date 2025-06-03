// test/vectorLensTool.test.js
const { vectorCodeLensTool } = require('../dist/tools');
const fs = require('fs');
const path = require('path');
const assert = require('assert');

// Mock services for testing
jest.mock('../dist/services/progressiveEnhancer', () => {
  return {
    createProgressiveEnhancer: () => ({
      isCodebaseAnalyzed: jest.fn().mockResolvedValue(true),
      analyzeCodebase: jest.fn().mockResolvedValue({
        success: true,
        filesAnalyzed: 5,
        chunksAnalyzed: 10,
        status: 'complete'
      }),
      queryCodebase: jest.fn().mockResolvedValue({
        success: true,
        results: [{ fileName: 'test.js', chunk: 'console.log("test");' }],
        response: 'This is a test response.'
      }),
      extractFromCodebase: jest.fn().mockResolvedValue({
        success: true,
        results: { extractedContent: 'function test() {}' }
      })
    })
  };
});

// Simple test suite for the unified tool
async function runTests() {
  console.log('Running Unified MCP Tool Tests...');
  
  // Test 1: Analyze operation
  try {
    console.log('Test 1: Analyze operation');
    
    // Create a test directory
    const testDir = path.join(__dirname, 'test_mcp');
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    
    // Create a test file
    const testFile = path.join(testDir, 'test.js');
    fs.writeFileSync(testFile, 'console.log("Test file for MCP tool");');
    
    // Call the analyze operation
    const result = await vectorCodeLensTool.handler({
      operation: 'analyze',
      codebasePath: testDir
    });
    
    // Verify result
    assert(result.success, 'Analyze operation should succeed');
    assert(result.status === 'complete', 'Status should be complete');
    
    // Clean up
    fs.unlinkSync(testFile);
    fs.rmdirSync(testDir);
    
    console.log('✅ Test 1 passed');
  } catch (error) {
    console.error('❌ Test 1 failed:', error);
  }
  
  // Test 2: Query operation
  try {
    console.log('Test 2: Query operation');
    
    // Call the query operation
    const result = await vectorCodeLensTool.handler({
      operation: 'query',
      query: 'How does the code work?',
      codebasePath: 'test'
    });
    
    // Verify result
    assert(result.success, 'Query operation should succeed');
    assert(result.response === 'This is a test response.', 'Response should match expected');
    
    console.log('✅ Test 2 passed');
  } catch (error) {
    console.error('❌ Test 2 failed:', error);
  }
  
  // Test 3: Extract operation
  try {
    console.log('Test 3: Extract operation');
    
    // Call the extract operation
    const result = await vectorCodeLensTool.handler({
      operation: 'extract',
      query: 'Find all functions',
      codebasePath: 'test',
      options: {
        type: 'function',
        format: 'json'
      }
    });
    
    // Verify result
    assert(result.success, 'Extract operation should succeed');
    assert(result.results.extractedContent === 'function test() {}', 'Extracted content should match expected');
    
    console.log('✅ Test 3 passed');
  } catch (error) {
    console.error('❌ Test 3 failed:', error);
  }
  
  // Test 4: Invalid operation
  try {
    console.log('Test 4: Invalid operation');
    
    // Call with invalid operation
    const result = await vectorCodeLensTool.handler({
      operation: 'invalid'
    });
    
    // Verify result
    assert(!result.success, 'Invalid operation should fail');
    assert(result.error.includes('Invalid operation'), 'Error should mention invalid operation');
    
    console.log('✅ Test 4 passed');
  } catch (error) {
    console.error('❌ Test 4 failed:', error);
  }
  
  // Test 5: Missing required parameters
  try {
    console.log('Test 5: Missing required parameters');
    
    // Call query without query parameter
    const result = await vectorCodeLensTool.handler({
      operation: 'query'
    });
    
    // Verify result
    assert(!result.success, 'Missing required parameter should fail');
    assert(result.error.includes('Missing required parameter'), 'Error should mention missing parameter');
    
    console.log('✅ Test 5 passed');
  } catch (error) {
    console.error('❌ Test 5 failed:', error);
  }
  
  console.log('All Unified MCP Tool tests completed');
}

// Run tests
runTests().catch(console.error);
