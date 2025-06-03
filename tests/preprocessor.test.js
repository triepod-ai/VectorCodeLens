// test/preprocessor.test.js
const { Preprocessor, processCodebase, createPreprocessor, PreprocessorType, DEFAULT_EXCLUDE_PATTERNS } = require('../dist/services/preprocessing');
const fs = require('fs');
const path = require('path');
const assert = require('assert');

// Simple test suite for preprocessor
async function runTests() {
  console.log('Running Preprocessor Tests...');
  
  // Test 1: Basic factory function
  try {
    console.log('Test 1: Create preprocessor using factory function');
    const preprocessor = createPreprocessor();
    assert(preprocessor instanceof Preprocessor, 'Factory function should create a Preprocessor instance');
    console.log('✅ Test 1 passed');
  } catch (error) {
    console.error('❌ Test 1 failed:', error);
  }
  
  // Test 2: Process a simple directory
  try {
    console.log('Test 2: Process a simple directory');
    
    // Create a temporary test directory
    const testDir = path.join(__dirname, 'test_files');
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    
    // Create test files
    const testFile1 = path.join(testDir, 'test1.js');
    const testFile2 = path.join(testDir, 'test2.ts');
    
    fs.writeFileSync(testFile1, 'console.log("Hello World");');
    fs.writeFileSync(testFile2, 'const greeting: string = "TypeScript Test";');
    
    // Process the directory
    const outputPath = await processCodebase(testDir);
    
    // Verify the output file exists
    assert(fs.existsSync(outputPath), 'Output file should exist');
    
    // Check file content contains our test code
    const content = fs.readFileSync(outputPath, 'utf-8');
    assert(content.includes('Hello World'), 'Output should contain content from test1.js');
    assert(content.includes('TypeScript Test'), 'Output should contain content from test2.ts');
    
    console.log('✅ Test 2 passed');
    
    // Clean up
    fs.unlinkSync(testFile1);
    fs.unlinkSync(testFile2);
    fs.rmdirSync(testDir);
    try { fs.unlinkSync(outputPath); } catch (e) { /* ignore */ }
  } catch (error) {
    console.error('❌ Test 2 failed:', error);
  }
  
  // Test 3: Exclude patterns
  try {
    console.log('Test 3: Exclude patterns');
    
    // Verify default exclude patterns
    assert(DEFAULT_EXCLUDE_PATTERNS.includes('**/node_modules/**'), 'Should exclude node_modules by default');
    
    // Create custom preprocessor with specific exclude pattern
    const customPreprocessor = new Preprocessor({
      excludePatterns: ['**/*.log', '**/ignore_dir/**']
    });
    
    // Create test directory structure
    const testDir = path.join(__dirname, 'test_exclude');
    const ignoreDir = path.join(testDir, 'ignore_dir');
    
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    
    if (!fs.existsSync(ignoreDir)) {
      fs.mkdirSync(ignoreDir, { recursive: true });
    }
    
    // Create test files
    fs.writeFileSync(path.join(testDir, 'include.js'), 'console.log("Include this file");');
    fs.writeFileSync(path.join(testDir, 'test.log'), 'This should be excluded');
    fs.writeFileSync(path.join(ignoreDir, 'ignored.js'), 'console.log("This should be excluded");');
    
    // Process the directory
    const outputPath = await customPreprocessor.processCodebase(testDir);
    
    // Check file content
    const content = fs.readFileSync(outputPath, 'utf-8');
    assert(content.includes('Include this file'), 'Output should contain included file');
    assert(!content.includes('This should be excluded'), 'Output should not contain excluded files');
    
    console.log('✅ Test 3 passed');
    
    // Clean up
    fs.unlinkSync(path.join(testDir, 'include.js'));
    fs.unlinkSync(path.join(testDir, 'test.log'));
    fs.unlinkSync(path.join(ignoreDir, 'ignored.js'));
    fs.rmdirSync(ignoreDir);
    fs.rmdirSync(testDir);
    try { fs.unlinkSync(outputPath); } catch (e) { /* ignore */ }
  } catch (error) {
    console.error('❌ Test 3 failed:', error);
  }
  
  console.log('All preprocessor tests completed');
}

// Run tests
runTests().catch(console.error);
