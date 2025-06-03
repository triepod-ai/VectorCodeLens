// mcp_test.js - A custom MCP inspector for VectorCodeLens
const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Log function
function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  console.log(logMessage);
}

// Mock LLM server
const mockLlmServer = http.createServer((req, res) => {
  log(`Mock LLM server received request: ${req.url}`);
  
  if (req.url === '/embeddings') {
    // Mock embeddings endpoint
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      embedding: Array(1536).fill(0).map(() => Math.random() - 0.5),
      tokenCount: 100
    }));
    return;
  }
  
  // Default response
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    message: 'Mock LLM server is running',
    status: 'OK',
    generated_text: 'This is a mock response from the LLM service'
  }));
});

// Mock Qdrant server
const mockQdrantServer = http.createServer((req, res) => {
  log(`Mock Qdrant server received request: ${req.url}`);
  
  if (req.url === '/collections') {
    // Mock collections endpoint
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      result: {
        collections: [{
          name: 'code_analysis',
          status: 'active'
        }]
      },
      status: 'ok',
      time: 0.001
    }));
    return;
  }
  
  // Default response
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    status: 'ok',
    message: 'Mock Qdrant server is running'
  }));
});

// Start mock servers
async function startMockServers() {
  return new Promise((resolve, reject) => {
    try {
      // Start LLM mock server
      mockLlmServer.listen(11434, () => {
        log('Mock LLM server started on http://localhost:11434');
        
        // Start Qdrant mock server
        mockQdrantServer.listen(6333, () => {
          log('Mock Qdrant server started on http://127.0.0.1:6333');
          resolve();
        });
      });
    } catch (error) {
      log(`Error starting mock servers: ${error.message}`);
      reject(error);
    }
  });
}

// Test VectorCodeLens server
async function testVectorCodeLens() {
  try {
    // Start mock dependencies
    await startMockServers();
    
    // Wait for servers to initialize
    log('Mock services started. Waiting 2 seconds before initializing VectorCodeLens...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Start VectorCodeLens
    log('Starting VectorCodeLens server...');
    const vectorCodeLens = spawn('node', ['dist/index.js'], {
      stdio: 'pipe'
    });
    
    // Log output from VectorCodeLens
    vectorCodeLens.stdout.on('data', (data) => {
      log(`VectorCodeLens stdout: ${data}`);
    });
    
    vectorCodeLens.stderr.on('data', (data) => {
      log(`VectorCodeLens stderr: ${data}`);
    });
    
    vectorCodeLens.on('close', (code) => {
      log(`VectorCodeLens process exited with code ${code}`);
    });
    
    // Wait for VectorCodeLens to initialize
    log('Waiting 5 seconds for VectorCodeLens to initialize...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Test API functionality
    log('Testing VectorCodeLens analyze functionality...');
    const testDirectory = path.join(__dirname, 'test_files');
    if (!fs.existsSync(testDirectory)) {
      fs.mkdirSync(testDirectory);
    }
    
    // Create a test file
    const testFilePath = path.join(testDirectory, 'test.js');
    fs.writeFileSync(testFilePath, `
    // This is a test file for VectorCodeLens
    function testFunction() {
      console.log('Hello from VectorCodeLens test!');
      return 'Test successful';
    }
    module.exports = testFunction;
    `);
    
    // Log test complete
    log('Tests initialized. Please check logs for any errors.');
    log('You can now connect to the VectorCodeLens server and test its functionality.');
    log('Mock dependencies will continue running until this script is terminated.');
    
  } catch (error) {
    log(`Error in test process: ${error.message}`);
  }
}

// Run the tests
testVectorCodeLens();

// Handle script termination
process.on('SIGINT', () => {
  log('Shutting down mock servers...');
  mockLlmServer.close();
  mockQdrantServer.close();
  process.exit(0);
});
