// test/test.js
import { codeAnalyzer, queryCodebase } from '../dist/index.js';

async function runTest() {
  try {
    console.log('Testing code analyzer...');
    
    // Analyze a simple directory
    const testDir = process.argv[2] || './src';
    
    console.log(`Analyzing directory: ${testDir}`);
    
    const analysisResult = await codeAnalyzer.handler({
      directory: testDir,
      filePatterns: ['*.js', '*.ts'],
      maxDepth: 5
    });
    
    console.log('Analysis result:', JSON.stringify(analysisResult, null, 2));
    
    // Test query if analysis was successful
    if (analysisResult.filesAnalyzed > 0) {
      console.log('Testing codebase query...');
      
      const queryResult = await queryCodebase.handler({
        query: 'How is code chunking implemented?',
        limit: 3
      });
      
      console.log('Query result:', JSON.stringify(queryResult, null, 2));
    }
    
    console.log('Test completed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

runTest();