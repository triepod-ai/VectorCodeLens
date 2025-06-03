/**
 * Performance tests for CodeAnalyzerMCP
 * Tests system performance with progressively larger codebases
 */
const { describe, it, before, after } = require('mocha');
const { expect } = require('chai');
const path = require('path');
const fs = require('fs');
const { performance } = require('perf_hooks');

// Import helpers
const { setupTestEnvironment, cleanupTestEnvironment } = require('../helpers/setup');

// Import modules to test
const { createScanner } = require('../../src/codeScannerModule');
const { createAnalyzer } = require('../../src/codeAnalysisModule');
const { createStorage } = require('../../src/storageModule');
const { createQueryEngine } = require('../../src/claudeQueryModule');

describe('Performance Tests', () => {
  let scanner, analyzer, storage, queryEngine;
  const testFixturesPath = path.join(__dirname, '../fixtures');
  const performanceResultsPath = path.join(__dirname, '../results');
  
  // Timing results storage
  const timingResults = {
    scanning: {},
    analysis: {},
    storage: {},
    querying: {}
  };
  
  before(async () => {
    // Create results directory if it doesn't exist
    if (!fs.existsSync(performanceResultsPath)) {
      fs.mkdirSync(performanceResultsPath, { recursive: true });
    }
    
    await setupTestEnvironment();
    
    // Create instances with default settings
    scanner = createScanner();
    analyzer = createAnalyzer();
    storage = createStorage();
    queryEngine = createQueryEngine();
    queryEngine.setStorage(storage);
  });
  
  after(async () => {
    await cleanupTestEnvironment();
    
    // Save performance results to file
    fs.writeFileSync(
      path.join(performanceResultsPath, 'performance-results.json'),
      JSON.stringify(timingResults, null, 2)
    );
    
    console.log('Performance results saved to:', path.join(performanceResultsPath, 'performance-results.json'));
  });
  
  /**
   * Helper function to measure execution time
   * @param {Function} fn - Function to measure
   * @param {string} category - Category for results (scanning, analysis, etc.)
   * @param {string} label - Label for this specific test
   * @returns {Promise<any>} - Return value of the function
   */
  async function measureTime(fn, category, label) {
    const startTime = performance.now();
    const result = await fn();
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    // Store timing results
    if (!timingResults[category][label]) {
      timingResults[category][label] = [];
    }
    timingResults[category][label].push(duration);
    
    console.log(`${category} - ${label}: ${duration.toFixed(2)}ms`);
    return result;
  }
  
  /**
   * Helper function to generate test files
   * @param {string} dir - Directory to create files in
   * @param {number} count - Number of files to create
   * @param {number} linesPerFile - Lines per file
   * @param {string} extension - File extension
   */
  function generateTestFiles(dir, count, linesPerFile, extension = 'js') {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    for (let i = 0; i < count; i++) {
      const filePath = path.join(dir, `test-${i}.${extension}`);
      let content = '';
      
      // Generate realistic-looking code
      content += `/**\n * Test file ${i}\n * Generated for performance testing\n */\n\n`;
      
      // Add imports
      content += `import { Component } from 'library';\n`;
      content += `import { useState, useEffect } from 'react';\n\n`;
      
      // Add a class
      content += `class TestClass${i} {\n`;
      content += `  constructor() {\n`;
      content += `    this.value = ${i};\n`;
      content += `  }\n\n`;
      
      // Add methods
      for (let j = 0; j < Math.min(5, linesPerFile / 10); j++) {
        content += `  method${j}() {\n`;
        content += `    // Method implementation\n`;
        content += `    console.log("Method ${j} called");\n`;
        content += `    return this.value + ${j};\n`;
        content += `  }\n\n`;
      }
      
      content += `}\n\n`;
      
      // Add functions
      for (let j = 0; j < Math.min(10, linesPerFile / 5); j++) {
        content += `function testFunction${i}_${j}(param1, param2) {\n`;
        content += `  // Function implementation\n`;
        content += `  const result = param1 + param2;\n`;
        content += `  return result * ${j};\n`;
        content += `}\n\n`;
      }
      
      // Add a React component if needed to reach line count
      const remainingLines = linesPerFile - content.split('\n').length;
      if (remainingLines > 10) {
        content += `const TestComponent${i} = () => {\n`;
        content += `  const [state, setState] = useState(0);\n\n`;
        content += `  useEffect(() => {\n`;
        content += `    // Effect implementation\n`;
        content += `    console.log("Component mounted");\n`;
        content += `    return () => console.log("Component unmounted");\n`;
        content += `  }, []);\n\n`;
        
        // Add render logic
        content += `  return (\n`;
        content += `    <div className="test-component">\n`;
        content += `      <h1>Test Component ${i}</h1>\n`;
        content += `      <p>State value: {state}</p>\n`;
        content += `      <button onClick={() => setState(state + 1)}>Increment</button>\n`;
        
        // Add more elements to reach line count
        while (content.split('\n').length < linesPerFile - 5) {
          content += `      <div>Additional content line</div>\n`;
        }
        
        content += `    </div>\n`;
        content += `  );\n`;
        content += `};\n\n`;
        
        content += `export default TestComponent${i};\n`;
      }
      
      fs.writeFileSync(filePath, content);
    }
  }
  
  describe('Scanner Performance', () => {
    it('should handle small codebase efficiently (10 files)', async () => {
      const smallProjectPath = path.join(testFixturesPath, 'small-project');
      
      // Generate test files
      generateTestFiles(smallProjectPath, 10, 50);
      
      try {
        // Measure scanning time
        const files = await measureTime(
          () => scanner.scanDirectory(smallProjectPath),
          'scanning',
          'small-project'
        );
        
        expect(files).to.be.an('array');
        expect(files.length).to.equal(10);
      } finally {
        // Clean up is in after() hook
      }
    });
    
    it('should handle medium codebase efficiently (50 files)', async () => {
      const mediumProjectPath = path.join(testFixturesPath, 'medium-project');
      
      // Generate test files
      generateTestFiles(mediumProjectPath, 50, 100);
      
      try {
        // Measure scanning time
        const files = await measureTime(
          () => scanner.scanDirectory(mediumProjectPath),
          'scanning',
          'medium-project'
        );
        
        expect(files).to.be.an('array');
        expect(files.length).to.equal(50);
      } finally {
        // Clean up is in after() hook
      }
    });
    
    it('should handle large codebase efficiently (200 files)', async () => {
      const largeProjectPath = path.join(testFixturesPath, 'large-project');
      
      // Generate test files
      generateTestFiles(largeProjectPath, 200, 150);
      
      try {
        // Measure scanning time
        const files = await measureTime(
          () => scanner.scanDirectory(largeProjectPath),
          'scanning',
          'large-project'
        );
        
        expect(files).to.be.an('array');
        expect(files.length).to.equal(200);
      } finally {
        // Clean up is in after() hook
      }
    });
    
    it('should scale linearly with project size', () => {
      const smallTime = timingResults.scanning['small-project'][0];
      const mediumTime = timingResults.scanning['medium-project'][0];
      const largeTime = timingResults.scanning['large-project'][0];
      
      console.log('Scanning time ratios:');
      console.log(`Small (10 files): ${smallTime.toFixed(2)}ms (baseline)`);
      console.log(`Medium (50 files): ${mediumTime.toFixed(2)}ms (${(mediumTime/smallTime).toFixed(2)}x)`);
      console.log(`Large (200 files): ${largeTime.toFixed(2)}ms (${(largeTime/smallTime).toFixed(2)}x)`);
      
      // The ratio should be roughly proportional to the number of files
      // Medium is 5x files, should be <10x time
      expect(mediumTime / smallTime).to.be.lessThan(10);
      
      // Large is 20x files, should be <40x time
      expect(largeTime / smallTime).to.be.lessThan(40);
    });
  });
  
  describe('Analyzer Performance', () => {
    it('should analyze JavaScript file efficiently', async () => {
      const testFile = {
        path: path.join(testFixturesPath, 'test-analyze.js'),
        content: `
          /**
           * Test file for analyzer performance
           */
          function testFunction(a, b) {
            return a + b;
          }
          
          class TestClass {
            constructor() {
              this.value = 0;
            }
            
            increment() {
              this.value++;
              return this.value;
            }
          }
          
          module.exports = { testFunction, TestClass };
        `,
        language: 'javascript'
      };
      
      const analysis = await measureTime(
        () => analyzer.analyzeCode(testFile),
        'analysis',
        'js-file'
      );
      
      expect(analysis).to.exist;
      expect(analysis.purpose).to.exist;
    });
    
    it('should analyze TypeScript file efficiently', async () => {
      const testFile = {
        path: path.join(testFixturesPath, 'test-analyze.ts'),
        content: `
          /**
           * Test file for analyzer performance
           */
          interface TestInterface {
            id: number;
            name: string;
          }
          
          function testFunction(a: number, b: number): number {
            return a + b;
          }
          
          class TestClass {
            private value: number;
            
            constructor() {
              this.value = 0;
            }
            
            increment(): number {
              this.value++;
              return this.value;
            }
          }
          
          export { testFunction, TestClass, TestInterface };
        `,
        language: 'typescript'
      };
      
      const analysis = await measureTime(
        () => analyzer.analyzeCode(testFile),
        'analysis',
        'ts-file'
      );
      
      expect(analysis).to.exist;
      expect(analysis.purpose).to.exist;
    });
    
    it('should analyze Python file efficiently', async () => {
      const testFile = {
        path: path.join(testFixturesPath, 'test-analyze.py'),
        content: `
          """
          Test file for analyzer performance
          """
          
          def test_function(a, b):
              """Add two numbers"""
              return a + b
              
          class TestClass:
              """Test class implementation"""
              
              def __init__(self):
                  self.value = 0
                  
              def increment(self):
                  """Increment the value"""
                  self.value += 1
                  return self.value
          
          if __name__ == "__main__":
              obj = TestClass()
              print(obj.increment())
              print(test_function(5, 10))
        `,
        language: 'python'
      };
      
      const analysis = await measureTime(
        () => analyzer.analyzeCode(testFile),
        'analysis',
        'py-file'
      );
      
      expect(analysis).to.exist;
      expect(analysis.purpose).to.exist;
    });
    
    it('should handle batch analysis efficiently', async () => {
      const batchSize = 5;
      const testFiles = [];
      
      // Create test files
      for (let i = 0; i < batchSize; i++) {
        testFiles.push({
          path: path.join(testFixturesPath, `batch-test-${i}.js`),
          content: `
            // Test file ${i} for batch analysis
            function test${i}(a, b) {
              return a * b + ${i};
            }
            
            module.exports = { test${i} };
          `,
          language: 'javascript'
        });
      }
      
      // Analyze in batch
      const batchAnalysis = await measureTime(
        () => Promise.all(testFiles.map(file => analyzer.analyzeCode(file))),
        'analysis',
        'batch-analysis'
      );
      
      expect(batchAnalysis).to.be.an('array');
      expect(batchAnalysis.length).to.equal(batchSize);
      
      // Compare to sequential analysis
      const sequentialStart = performance.now();
      for (let i = 0; i < batchSize; i++) {
        await analyzer.analyzeCode(testFiles[i]);
      }
      const sequentialDuration = performance.now() - sequentialStart;
      
      console.log(`Sequential analysis: ${sequentialDuration.toFixed(2)}ms`);
      console.log(`Batch analysis: ${timingResults.analysis['batch-analysis'][0].toFixed(2)}ms`);
      console.log(`Speedup: ${(sequentialDuration / timingResults.analysis['batch-analysis'][0]).toFixed(2)}x`);
      
      // Batch should be faster than sequential
      expect(timingResults.analysis['batch-analysis'][0]).to.be.lessThan(sequentialDuration);
    });
  });
  
  describe('Storage Performance', () => {
    it('should store and retrieve embeddings efficiently', async () => {
      const testAnalysis = {
        id: 'perf-test-id',
        path: path.join(testFixturesPath, 'perf-test.js'),
        content: 'function perfTest() { return "Performance Test"; }',
        language: 'javascript',
        analysis: { purpose: 'Performance testing', complexity: 'Simple' }
      };
      
      // Store the analysis
      const storeResult = await measureTime(
        () => storage.storeAnalysis(testAnalysis),
        'storage',
        'store-analysis'
      );
      
      expect(storeResult.success).to.be.true;
      
      // Retrieve the analysis
      const retrieveResult = await measureTime(
        () => storage.getAnalysis(testAnalysis.id),
        'storage',
        'get-analysis'
      );
      
      expect(retrieveResult).to.exist;
      expect(retrieveResult.id).to.equal(testAnalysis.id);
    });
    
    it('should handle batch storage efficiently', async () => {
      const batchSize = 10;
      const testItems = [];
      
      // Create test items
      for (let i = 0; i < batchSize; i++) {
        testItems.push({
          id: `batch-store-${i}`,
          path: path.join(testFixturesPath, `batch-store-${i}.js`),
          content: `function batchTest${i}() { return "Batch Test ${i}"; }`,
          language: 'javascript',
          analysis: { purpose: `Batch test ${i}`, complexity: 'Simple' }
        });
      }
      
      // Store in batch
      const batchStore = await measureTime(
        () => Promise.all(testItems.map(item => storage.storeAnalysis(item))),
        'storage',
        'batch-store'
      );
      
      expect(batchStore).to.be.an('array');
      expect(batchStore.length).to.equal(batchSize);
      expect(batchStore.every(result => result.success)).to.be.true;
      
      // Compare to sequential storage
      const sequentialStart = performance.now();
      for (let i = 0; i < batchSize; i++) {
        await storage.storeAnalysis(testItems[i]);
      }
      const sequentialDuration = performance.now() - sequentialStart;
      
      console.log(`Sequential storage: ${sequentialDuration.toFixed(2)}ms`);
      console.log(`Batch storage: ${timingResults.storage['batch-store'][0].toFixed(2)}ms`);
      console.log(`Speedup: ${(sequentialDuration / timingResults.storage['batch-store'][0]).toFixed(2)}x`);
      
      // Batch should be significantly faster than sequential
      expect(timingResults.storage['batch-store'][0]).to.be.lessThan(sequentialDuration * 0.9);
    });
    
    it('should search efficiently with different result sizes', async () => {
      // Search with small result set
      const smallSearch = await measureTime(
        () => storage.searchEmbeddings('simple function test', { limit: 5 }),
        'storage',
        'search-small'
      );
      
      expect(smallSearch).to.exist;
      expect(smallSearch.matches).to.be.an('array');
      
      // Search with medium result set
      const mediumSearch = await measureTime(
        () => storage.searchEmbeddings('simple function test', { limit: 20 }),
        'storage',
        'search-medium'
      );
      
      expect(mediumSearch).to.exist;
      expect(mediumSearch.matches).to.be.an('array');
      
      // Search with large result set
      const largeSearch = await measureTime(
        () => storage.searchEmbeddings('simple function test', { limit: 50 }),
        'storage',
        'search-large'
      );
      
      expect(largeSearch).to.exist;
      expect(largeSearch.matches).to.be.an('array');
      
      // Compare search times
      console.log('Search time comparison:');
      console.log(`Small (5 results): ${timingResults.storage['search-small'][0].toFixed(2)}ms`);
      console.log(`Medium (20 results): ${timingResults.storage['search-medium'][0].toFixed(2)}ms`);
      console.log(`Large (50 results): ${timingResults.storage['search-large'][0].toFixed(2)}ms`);
      
      // Search time should scale sub-linearly with result size
      // Medium has 4x results, should be <4x time
      expect(timingResults.storage['search-medium'][0] / timingResults.storage['search-small'][0]).to.be.lessThan(4);
      
      // Large has 10x results, should be <10x time
      expect(timingResults.storage['search-large'][0] / timingResults.storage['search-small'][0]).to.be.lessThan(10);
    });
  });
  
  describe('Query Engine Performance', () => {
    it('should handle simple queries efficiently', async () => {
      const simpleQuery = await measureTime(
        () => queryEngine.query('simple test function'),
        'querying',
        'simple-query'
      );
      
      expect(simpleQuery).to.exist;
      expect(simpleQuery.matches).to.be.an('array');
    });
    
    it('should handle complex queries efficiently', async () => {
      const complexQuery = await measureTime(
        () => queryEngine.query('find functions that handle error cases with try-catch blocks'),
        'querying',
        'complex-query'
      );
      
      expect(complexQuery).to.exist;
      expect(complexQuery.matches).to.be.an('array');
    });
    
    it('should handle queries with result filtering efficiently', async () => {
      const filteredQuery = await measureTime(
        () => queryEngine.query('find JavaScript functions', { 
          filters: { language: 'javascript' } 
        }),
        'querying',
        'filtered-query'
      );
      
      expect(filteredQuery).to.exist;
      expect(filteredQuery.matches).to.be.an('array');
      expect(filteredQuery.matches.every(match => 
        match.metadata && match.metadata.language === 'javascript'
      )).to.be.true;
    });
    
    it('should generate summaries efficiently', async () => {
      const summarizedQuery = await measureTime(
        () => queryEngine.query('find utility functions', { generateSummary: true }),
        'querying',
        'summarized-query'
      );
      
      expect(summarizedQuery).to.exist;
      expect(summarizedQuery.matches).to.be.an('array');
      expect(summarizedQuery.summary).to.exist;
    });
  });
  
  describe('Full Pipeline Performance', () => {
    it('should process small project end-to-end efficiently', async () => {
      const smallProjectPath = path.join(testFixturesPath, 'small-e2e-project');
      
      // Generate test files if they don't exist
      if (!fs.existsSync(smallProjectPath)) {
        generateTestFiles(smallProjectPath, 5, 50);
      }
      
      // Measure full pipeline execution time
      const startTime = performance.now();
      
      // Step 1: Scan directory
      const files = await scanner.scanDirectory(smallProjectPath);
      expect(files).to.be.an('array');
      expect(files.length).to.equal(5);
      
      // Step 2: Analyze files
      const analysisPromises = files.map(file => analyzer.analyzeCode(file));
      const analyses = await Promise.all(analysisPromises);
      expect(analyses).to.be.an('array');
      expect(analyses.length).to.equal(5);
      
      // Step 3: Store analyses
      const storagePromises = files.map((file, index) => {
        return storage.storeAnalysis({
          ...file,
          analysis: analyses[index]
        });
      });
      const storageResults = await Promise.all(storagePromises);
      expect(storageResults).to.be.an('array');
      expect(storageResults.length).to.equal(5);
      expect(storageResults.every(result => result.success)).to.be.true;
      
      // Step 4: Query the stored analyses
      const queryResult = await queryEngine.query('find functions in the project', { generateSummary: true });
      expect(queryResult).to.exist;
      expect(queryResult.matches).to.be.an('array');
      expect(queryResult.summary).to.exist;
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Store results
      timingResults.fullPipeline = {
        'small-e2e-project': duration
      };
      
      console.log(`Full pipeline for small project: ${duration.toFixed(2)}ms`);
      
      // The pipeline should complete within a reasonable time
      // Actual threshold depends on hardware, adjust as needed
      expect(duration).to.be.lessThan(30000); // 30 seconds
    });
  });
  
  describe('Memory Consumption', () => {
    it('should track memory usage during processing', async () => {
      // Create a medium-sized project
      const memoryTestPath = path.join(testFixturesPath, 'memory-test-project');
      generateTestFiles(memoryTestPath, 30, 100);
      
      // Record baseline memory usage
      const baseline = process.memoryUsage();
      
      // Record memory at each pipeline stage
      const memoryUsage = {
        baseline: { ...baseline },
        afterScanning: null,
        afterAnalysis: null,
        afterStorage: null,
        afterQuerying: null
      };
      
      // Step 1: Scan
      const files = await scanner.scanDirectory(memoryTestPath);
      memoryUsage.afterScanning = process.memoryUsage();
      
      // Step 2: Analyze (just a sample of 5 files to keep test duration reasonable)
      const sampleFiles = files.slice(0, 5);
      const analyses = await Promise.all(sampleFiles.map(file => analyzer.analyzeCode(file)));
      memoryUsage.afterAnalysis = process.memoryUsage();
      
      // Step 3: Store
      const storageResults = await Promise.all(sampleFiles.map((file, index) => {
        return storage.storeAnalysis({
          ...file,
          analysis: analyses[index]
        });
      }));
      memoryUsage.afterStorage = process.memoryUsage();
      
      // Step 4: Query
      const queryResult = await queryEngine.query('find functions in the project');
      memoryUsage.afterQuerying = process.memoryUsage();
      
      // Log memory usage
      console.log('Memory Usage (MB):');
      for (const [stage, usage] of Object.entries(memoryUsage)) {
        if (usage) {
          console.log(`${stage}: RSS=${(usage.rss/1024/1024).toFixed(2)}, Heap=${(usage.heapUsed/1024/1024).toFixed(2)}`);
        }
      }
      
      // Calculate increases
      const rssIncrease = memoryUsage.afterQuerying.rss - memoryUsage.baseline.rss;
      const heapIncrease = memoryUsage.afterQuerying.heapUsed - memoryUsage.baseline.heapUsed;
      
      console.log(`Total Increase: RSS=${(rssIncrease/1024/1024).toFixed(2)}MB, Heap=${(heapIncrease/1024/1024).toFixed(2)}MB`);
      
      // Store memory usage in results
      timingResults.memoryUsage = memoryUsage;
      
      // Check memory usage stays within reasonable bounds
      // Actual thresholds depend on hardware, adjust as needed
      expect(rssIncrease).to.be.lessThan(500 * 1024 * 1024); // 500MB max increase
      expect(heapIncrease).to.be.lessThan(300 * 1024 * 1024); // 300MB max heap increase
    });
  });
});
