// Test script for VectorCodeLens
const path = require('path');
const fs = require('fs');

// Get the current timestamp for log file names
const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
const logFile = path.join('L:', 'source-repos', 'VectorCodeLens', 'logs', `test-run-${timestamp}.log`);

// Create a write stream for logging
const logStream = fs.createWriteStream(logFile, { flags: 'a' });

// Function to log messages both to console and to file
function log(message) {
  const timestamp = new Date().toISOString();
  const formattedMessage = `[${timestamp}] ${message}`;
  console.log(formattedMessage);
  logStream.write(formattedMessage + '\n');
}

async function testCodeAnalyzer() {
  log('Starting VectorCodeLens test...');
  log('=================================');
  
  try {
    // Import the module
    log('Loading VectorCodeLens module...');
    const vectorCodeLens = require('./VectorCodeLens/dist/index.js');
    log('Module loaded successfully');
    
    // Check what was exported
    log('Module exports:');
    log(JSON.stringify(Object.keys(vectorCodeLens)));
    
    const { codeAnalyzer, queryCodebase } = vectorCodeLens;
    
    // Define a test directory to analyze
    const testDirectory = path.resolve('L:/source-repos/VectorCodeLens/src');
    log(`Analyzing directory: ${testDirectory}`);
    log(`Directory exists: ${fs.existsSync(testDirectory)}`);
    
    if (!fs.existsSync(testDirectory)) {
      throw new Error(`Test directory does not exist: ${testDirectory}`);
    }
    
    // List files in the directory to confirm it has content
    log('Directory contents:');
    fs.readdirSync(testDirectory).forEach(file => {
      log(` - ${file}`);
    });
    
    // Run the code analyzer
    log('Starting code analysis...');
    const result = await codeAnalyzer.handler({
      directory: testDirectory,
      maxDepth: 5,
      filePatterns: ['*.ts', '*.js'],
      includeChunks: true,
      includeSummary: true
    });
    
    log('Analysis completed successfully:');
    log(`Files analyzed: ${result.filesAnalyzed}`);
    log(`Chunks analyzed: ${result.chunksAnalyzed}`);
    
    if (result.errors && result.errors.length > 0) {
      log('Errors encountered:');
      result.errors.forEach((error, index) => {
        log(`  ${index + 1}. ${error}`);
      });
    }
    
    log('Storage stats:');
    log(JSON.stringify(result.stats, null, 2));
    
    // Only attempt a query if we analyzed some files
    if (result.filesAnalyzed > 0) {
      // Test querying the analyzed codebase
      log('Testing codebase query...');
      const queryResult = await queryCodebase.handler({
        query: 'How does the file scanning process work?',
        limit: 3
      });
      
      log(`Query returned ${queryResult.matches} matches in ${queryResult.executionTimeMs}ms`);
      
      if (queryResult.results && queryResult.results.length > 0) {
        log('Top matches:');
        queryResult.results.forEach((match, index) => {
          log(`\nMatch ${index + 1}: ${match.relativePath} (lines ${match.startLine}-${match.endLine})`);
          log(`Summary: ${match.summary}`);
          log('Code snippet:');
          log('----------------------------------------');
          log(match.codeSnippet);
          log('----------------------------------------');
        });
      } else {
        log('No matches found.');
      }
    } else {
      log('Skipping query test since no files were analyzed.');
    }
    
    log('Test completed successfully!');
  } catch (error) {
    log(`Error during test: ${error.message}`);
    log(error.stack);
  } finally {
    // Close the log stream
    logStream.end();
  }
}

// Run the test
testCodeAnalyzer().catch(error => {
  log(`Unhandled error: ${error.message}`);
  log(error.stack);
  logStream.end();
});
