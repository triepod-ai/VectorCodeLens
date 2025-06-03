// Debug script for VectorCodeLens
const path = require('path');
const fs = require('fs');

// Set up logging
const logFile = path.join('L:', 'source-repos', 'VectorCodeLens', 'logs', 'debug-run.log');
const logStream = fs.createWriteStream(logFile, { flags: 'w' }); // Overwrite existing log

function log(message) {
  const timestamp = new Date().toISOString();
  const formattedMessage = `[${timestamp}] ${message}`;
  console.log(formattedMessage);
  logStream.write(formattedMessage + '\n');
}

// Check if Ollama is running
async function checkOllama() {
  try {
    log('Checking if Ollama is running...');
    const http = require('http');
    
    return new Promise((resolve, reject) => {
      const req = http.get('http://localhost:11434/api/tags', (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          log(`Ollama status: ${res.statusCode}`);
          log(`Ollama response: ${data.substring(0, 200)}...`);
          resolve(res.statusCode === 200);
        });
      });
      
      req.on('error', (error) => {
        log(`Error connecting to Ollama: ${error.message}`);
        resolve(false);
      });
      
      req.end();
    });
  } catch (error) {
    log(`Error checking Ollama: ${error.message}`);
    return false;
  }
}

// Modify the file scanner to be more verbose
async function patchFileScanner() {
  try {
    log('Patching file scanner for more verbose logging...');
    const fileScannerPath = path.join('L:', 'source-repos', 'VectorCodeLens', 'dist', 'scanner', 'file-scanner.js');
    
    if (fs.existsSync(fileScannerPath)) {
      let content = fs.readFileSync(fileScannerPath, 'utf8');
      
      // Add more logging to the scanDirectory function
      content = content.replace(
        'async function scanDirectory(',
        `async function scanDirectory(
  rootDir,
  options = {}
) {
  console.log('*** scanDirectory called with rootDir:', rootDir);
  console.log('*** options:', JSON.stringify(options));
  `
      );
      
      // Add logging for the glob pattern
      content = content.replace(
        'const pattern = path.join(rootDir, depthPattern, includePattern);',
        `const pattern = path.join(rootDir, depthPattern, includePattern);
  console.log('*** glob pattern:', pattern);`
      );
      
      // Add logging for the found files
      content = content.replace(
        'const files = glob.sync(pattern, {',
        `console.log('*** Executing glob.sync with pattern:', pattern);
  const files = glob.sync(pattern, {`
      );
      
      content = content.replace(
        'const filePromises = files.map(async (filePath) => {',
        `console.log('*** Found files count:', files.length);
  console.log('*** Found files:', files);
  const filePromises = files.map(async (filePath) => {`
      );
      
      fs.writeFileSync(fileScannerPath, content);
      log('File scanner patched successfully');
      return true;
    } else {
      log(`File scanner not found at ${fileScannerPath}`);
      return false;
    }
  } catch (error) {
    log(`Error patching file scanner: ${error.message}`);
    return false;
  }
}

async function runTest() {
  try {
    log('Starting VectorCodeLens debug test...');
    
    // Check if Ollama is running
    const ollamaRunning = await checkOllama();
    log(`Ollama running: ${ollamaRunning}`);
    
    // Patch the file scanner for more verbose logging
    const scannerPatched = await patchFileScanner();
    
    if (!scannerPatched) {
      log('Could not patch file scanner, continuing with original version');
    }
    
    // Import the module
    log('Loading VectorCodeLens module...');
    const vectorCodeLens = require('./VectorCodeLens/dist/index.js');
    log('Module loaded successfully');
    
    const { codeAnalyzer } = vectorCodeLens;
    
    // Define a test directory to analyze
    const testDirectory = path.resolve('L:/source-repos/VectorCodeLens/src');
    log(`Analyzing directory: ${testDirectory}`);
    
    // Run the code analyzer with all file types
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
    
    log('Test completed successfully!');
  } catch (error) {
    log(`Error during test: ${error.message}`);
    log(error.stack);
  } finally {
    logStream.end();
  }
}

// Run the test
runTest().catch(error => {
  log(`Unhandled error: ${error.message}`);
  log(error.stack);
  logStream.end();
});
