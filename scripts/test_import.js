// test_import.js - Test importing VectorCodeLens modules
const fs = require('fs');

// Log function
function log(message) {
  console.log(`[${new Date().toISOString()}] ${message}`);
  fs.appendFileSync('test_import.log', `[${new Date().toISOString()}] ${message}\n`);
}

async function testImport() {
  try {
    log('Starting VectorCodeLens module import test');
    
    // Make sure log file is empty
    fs.writeFileSync('test_import.log', '');
    
    // Try to import the index module
    log('Attempting to import index.js');
    const vectorCodeLens = require('./dist/index.js');
    
    log('Successfully imported index.js');
    log(`Module keys: ${Object.keys(vectorCodeLens).join(', ')}`);
    
    // Check for the exported functions
    if (vectorCodeLens.codeAnalyzer) {
      log('codeAnalyzer function exists');
      log(`codeAnalyzer description: ${vectorCodeLens.codeAnalyzer.description}`);
    } else {
      log('WARNING: codeAnalyzer function not found');
    }
    
    if (vectorCodeLens.queryCodebase) {
      log('queryCodebase function exists');
      log(`queryCodebase description: ${vectorCodeLens.queryCodebase.description}`);
    } else {
      log('WARNING: queryCodebase function not found');
    }
    
    log('Import test completed successfully');
  } catch (error) {
    log(`ERROR during import test: ${error.message}`);
    log(`Error stack: ${error.stack}`);
  }
}

// Run the test
testImport();
