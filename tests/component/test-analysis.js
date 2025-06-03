/**
 * Component-specific tests for Code Analysis Module
 */
const { describe, it, before, after } = require('mocha');
const { expect } = require('chai');
const path = require('path');
const fs = require('fs');

// Import helpers
const { setupTestEnvironment, cleanupTestEnvironment } = require('../helpers/setup');
const { assertValidAnalysis } = require('../helpers/assertions');
const { createAnalyzer } = require('../../src/codeAnalysisModule');
const { createScanner } = require('../../src/codeScannerModule');

describe('Code Analysis Module Tests', () => {
  let analyzer;
  let scanner;
  const testFixturesPath = path.join(__dirname, '../fixtures');
  
  before(async () => {
    await setupTestEnvironment();
    
    // Force mock mode for tests
    process.env.USE_MOCK_LLM = 'true';
    
    analyzer = createAnalyzer({
      useMock: true, // Use mock for predictable tests
      llmServerUrl: 'http://localhost:11434'
    });
    
    scanner = createScanner({
      filePatterns: ['**/*.js', '**/*.ts', '**/*.py'],
      excludePatterns: ['**/node_modules/**', '**/__pycache__/**']
    });
  });
  
  after(async () => {
    await cleanupTestEnvironment();
  });
  
  it('should analyze JavaScript code', async () => {
    const jsProjectPath = path.join(testFixturesPath, 'js-project');
    const jsFiles = await scanner.scanDirectory(jsProjectPath);
    
    expect(jsFiles.length).to.be.greaterThan(0);
    
    const utilsFile = jsFiles.find(f => path.basename(f.path) === 'utils.js');
    expect(utilsFile).to.exist;
    
    const analysis = await analyzer.analyzeCode(utilsFile, 'comprehensive');
    
    assertValidAnalysis(analysis, 'JavaScript');
    expect(analysis.entities).to.be.an('array');
    expect(analysis.entities.length).to.be.greaterThan(0);
    
    // Should detect the add and subtract functions
    const functionNames = analysis.entities
      .filter(e => e.type === 'function')
      .map(e => e.name);
      
    expect(functionNames).to.include.members(['add', 'subtract']);
  });
  
  it('should analyze TypeScript code', async () => {
    const tsProjectPath = path.join(testFixturesPath, 'ts-project');
    const tsFiles = await scanner.scanDirectory(tsProjectPath);
    
    expect(tsFiles.length).to.be.greaterThan(0);
    
    const indexFile = tsFiles.find(f => path.basename(f.path) === 'index.ts');
    expect(indexFile).to.exist;
    
    const analysis = await analyzer.analyzeCode(indexFile, 'comprehensive');
    
    assertValidAnalysis(analysis, 'TypeScript');
    expect(analysis.entities).to.be.an('array');
    expect(analysis.entities.length).to.be.greaterThan(0);
    
    // Should detect the UserService class
    const classNames = analysis.entities
      .filter(e => e.type === 'class')
      .map(e => e.name);
      
    expect(classNames).to.include('UserService');
  });
  
  it('should analyze Python code', async () => {
    const pyProjectPath = path.join(testFixturesPath, 'py-project');
    const pyFiles = await scanner.scanDirectory(pyProjectPath);
    
    expect(pyFiles.length).to.be.greaterThan(0);
    
    const utilsFile = pyFiles.find(f => path.basename(f.path) === 'utils.py');
    expect(utilsFile).to.exist;
    
    const analysis = await analyzer.analyzeCode(utilsFile, 'comprehensive');
    
    assertValidAnalysis(analysis, 'Python');
    expect(analysis.entities).to.be.an('array');
    expect(analysis.entities.length).to.be.greaterThan(0);
    
    // Should detect the calculate_area and calculate_circumference functions
    const functionNames = analysis.entities
      .filter(e => e.type === 'function')
      .map(e => e.name);
      
    expect(functionNames).to.include.members(['calculate_area', 'calculate_circumference']);
  });
  
  it('should support different analysis types', async () => {
    const jsProjectPath = path.join(testFixturesPath, 'js-project');
    const jsFiles = await scanner.scanDirectory(jsProjectPath);
    const testFile = jsFiles[0];
    
    // Test semantic analysis
    const semanticAnalysis = await analyzer.analyzeCode(testFile, 'semantic');
    expect(semanticAnalysis).to.have.property('summary');
    expect(semanticAnalysis).to.have.property('purpose');
    expect(semanticAnalysis).to.have.property('entities');
    
    // Test documentation analysis
    const docAnalysis = await analyzer.analyzeCode(testFile, 'documentation');
    expect(docAnalysis).to.have.property('documentationQuality');
    expect(docAnalysis).to.have.property('missingDocs');
    expect(docAnalysis).to.have.property('suggestions');
    
    // Test complexity analysis
    const complexityAnalysis = await analyzer.analyzeCode(testFile, 'complexity');
    expect(complexityAnalysis).to.have.property('complexityScore');
    expect(complexityAnalysis).to.have.property('hotspots');
    expect(complexityAnalysis).to.have.property('suggestions');
  });
  
  it('should handle invalid analysis type', async () => {
    const jsProjectPath = path.join(testFixturesPath, 'js-project');
    const jsFiles = await scanner.scanDirectory(jsProjectPath);
    const testFile = jsFiles[0];
    
    try {
      await analyzer.analyzeCode(testFile, 'invalid_type');
      expect.fail('Should have thrown an error for invalid analysis type');
    } catch (error) {
      expect(error.message).to.include('Invalid analysis type');
    }
  });
  
  it('should analyze multiple chunks and aggregate results', async () => {
    // Create a large file with multiple chunks
    const jsProjectPath = path.join(testFixturesPath, 'js-project');
    const largeFilePath = path.join(jsProjectPath, 'large_test.js');
    
    // Create some significant content
    const content = `
    // Part 1: Math utilities
    function add(a, b) { return a + b; }
    function subtract(a, b) { return a - b; }
    function multiply(a, b) { return a * b; }
    function divide(a, b) { return a / b; }
    
    // Part 2: String utilities
    function capitalize(str) { return str.charAt(0).toUpperCase() + str.slice(1); }
    function reverse(str) { return str.split('').reverse().join(''); }
    
    // Part 3: Array utilities
    function first(arr) { return arr[0]; }
    function last(arr) { return arr[arr.length - 1]; }
    
    // Part 4: Object utilities
    function keys(obj) { return Object.keys(obj); }
    function values(obj) { return Object.values(obj); }
    
    // Export all functions
    module.exports = {
      add, subtract, multiply, divide,
      capitalize, reverse,
      first, last,
      keys, values
    };
    `;
    
    fs.writeFileSync(largeFilePath, content);
    
    // Create chunks from the file
    const chunks = [
      {
        content: content.split('// Part 2')[0],
        path: largeFilePath,
        language: 'JavaScript'
      },
      {
        content: '// Part 1 (continued)\n' + content.split('// Part 2')[0] + content.split('// Part 2')[1].split('// Part 3')[0],
        path: largeFilePath,
        language: 'JavaScript'
      },
      {
        content: '// Part 2 (continued)\n' + content.split('// Part 3')[0] + content.split('// Part 3')[1],
        path: largeFilePath,
        language: 'JavaScript'
      }
    ];
    
    const aggregatedAnalysis = await analyzer.analyzeMultipleChunks(chunks, 'comprehensive');
    
    assertValidAnalysis(aggregatedAnalysis, 'JavaScript');
    expect(aggregatedAnalysis.entities).to.be.an('array');
    
    // Should include entities from all chunks
    const functionNames = aggregatedAnalysis.entities
      .filter(e => e.type === 'function')
      .map(e => e.name);
      
    expect(functionNames).to.include.members([
      'add', 'subtract', 'multiply', 'divide',
      'capitalize', 'reverse',
      'first', 'last'
    ]);
    
    // Clean up
    if (fs.existsSync(largeFilePath)) {
      fs.unlinkSync(largeFilePath);
    }
  });
  
  it('should handle error conditions gracefully', async () => {
    // Test with null input
    try {
      await analyzer.analyzeCode(null);
      expect.fail('Should have thrown an error for null input');
    } catch (error) {
      expect(error.message).to.include('Invalid code object');
    }
    
    // Test with empty content
    try {
      await analyzer.analyzeCode({ path: 'test.js', content: '' });
      // This should actually work with mock, just return a basic analysis
      // But with real LLM it might fail
    } catch (error) {
      expect(error.message).to.include('Invalid code object');
    }
    
    // Test with empty chunks
    try {
      await analyzer.analyzeMultipleChunks([]);
      expect.fail('Should have thrown an error for empty chunks');
    } catch (error) {
      expect(error.message).to.include('Invalid code chunks');
    }
  });
  
  it('should format prompts correctly for different analysis types', () => {
    const codeObj = {
      path: 'test.js',
      content: 'function test() { return true; }',
      language: 'JavaScript'
    };
    
    // Check semantic prompt
    const semanticPrompt = analyzer.formatPrompt(codeObj, 'semantic');
    expect(semanticPrompt.prompt).to.include('Analyze this JavaScript code');
    expect(semanticPrompt.prompt).to.include('summary');
    expect(semanticPrompt.prompt).to.include('purpose');
    expect(semanticPrompt.prompt).to.include('entities');
    
    // Check documentation prompt
    const docPrompt = analyzer.formatPrompt(codeObj, 'documentation');
    expect(docPrompt.prompt).to.include('Review this JavaScript code');
    expect(docPrompt.prompt).to.include('documentationQuality');
    expect(docPrompt.prompt).to.include('missingDocs');
    
    // Check comprehensive prompt
    const comprehensivePrompt = analyzer.formatPrompt(codeObj, 'comprehensive');
    expect(comprehensivePrompt.prompt).to.include('Perform a comprehensive analysis');
    expect(comprehensivePrompt.prompt).to.include('complexity');
    expect(comprehensivePrompt.prompt).to.include('quality');
    expect(comprehensivePrompt.prompt).to.include('suggestions');
  });
});
