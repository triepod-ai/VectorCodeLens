/**
 * Test environment setup helpers
 */
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs-extra');
const http = require('http');

/**
 * Check if a server is running on the specified port
 * @param {string} host - Host address
 * @param {number} port - Port number
 * @returns {Promise<boolean>} - Whether the server is running
 */
async function isServerRunning(host, port) {
  return new Promise((resolve) => {
    const req = http.get({
      host,
      port,
      path: '/',
      timeout: 3000
    }, () => {
      resolve(true);
    });

    req.on('error', () => {
      resolve(false);
    });

    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

/**
 * Ensures the Qdrant server is running or starts it
 * @param {Object} options - Qdrant options
 * @returns {Promise<Object>} - Server info
 */
async function ensureQdrantServer({
  host = '127.0.0.1',
  port = 6333,
  dataDir = path.join(__dirname, '..', 'data', 'qdrant')
} = {}) {
  console.log('Checking if Qdrant server is running...');
  
  const isRunning = await isServerRunning(host, port);
  
  if (isRunning) {
    console.log(`Qdrant server already running at ${host}:${port}`);
    return { host, port, isNew: false };
  }
  
  console.log('Starting Qdrant server...');
  
  // Create data directory if it doesn't exist
  await fs.ensureDir(dataDir);
  
  // Start Qdrant using Docker
  const qdrantProcess = spawn('docker', [
    'run',
    '-d',
    '--name', 'test-qdrant',
    '-p', `${port}:6333`,
    '-v', `${dataDir}:/qdrant/storage`,
    'qdrant/qdrant'
  ]);
  
  return new Promise((resolve, reject) => {
    let output = '';
    
    qdrantProcess.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    qdrantProcess.stderr.on('data', (data) => {
      output += data.toString();
    });
    
    qdrantProcess.on('close', (code) => {
      if (code !== 0) {
        console.error(`Failed to start Qdrant: ${output}`);
        reject(new Error(`Failed to start Qdrant: ${output}`));
        return;
      }
      
      // Wait for Qdrant to be ready
      const maxRetries = 10;
      let retries = 0;
      
      const checkInterval = setInterval(async () => {
        const running = await isServerRunning(host, port);
        
        if (running) {
          clearInterval(checkInterval);
          console.log(`Qdrant server started at ${host}:${port}`);
          resolve({ host, port, isNew: true, containerId: output.trim() });
        } else if (retries >= maxRetries) {
          clearInterval(checkInterval);
          reject(new Error(`Timed out waiting for Qdrant to start: ${output}`));
        }
        
        retries++;
      }, 1000);
    });
    
    qdrantProcess.on('error', (err) => {
      reject(new Error(`Failed to start Qdrant: ${err.message}`));
    });
  });
}

/**
 * Ensures the LLM server is running or starts it
 * @param {Object} options - LLM server options
 * @returns {Promise<Object>} - Server info
 */
async function ensureLLMServer({
  host = 'localhost',
  port = 11434,
  mockResponses = true
} = {}) {
  console.log('Checking if LLM server is running...');
  
  const isRunning = await isServerRunning(host, port);
  
  if (isRunning) {
    console.log(`LLM server already running at ${host}:${port}`);
    return { host, port, isNew: false };
  }
  
  if (mockResponses) {
    console.log('Starting mock LLM server...');
    
    // Start a simple HTTP server that returns mock responses
    const server = http.createServer((req, res) => {
      res.setHeader('Content-Type', 'application/json');
      
      // Handle different endpoint types
      if (req.url === '/v1/chat/completions') {
        // Mock chat completion response
        res.end(JSON.stringify({
          choices: [{
            message: {
              content: JSON.stringify({
                summary: "This function handles error logging",
                purpose: "To centralize error handling",
                dependencies: ["logger"],
                complexity: 3,
                potentialIssues: [],
                bestPractices: ["Good error categorization"],
                documentation: {
                  quality: 7,
                  suggestions: []
                }
              })
            }
          }]
        }));
      } else if (req.url === '/embeddings') {
        // Mock embeddings response
        const mockEmbedding = Array(1536).fill(0).map(() => Math.random());
        res.end(JSON.stringify({
          embedding: mockEmbedding
        }));
      } else {
        res.statusCode = 404;
        res.end(JSON.stringify({ error: 'Not found' }));
      }
    });
    
    server.listen(port, host);
    
    console.log(`Mock LLM server started at ${host}:${port}`);
    return { host, port, isNew: true, server };
  }
  
  throw new Error('Cannot start real LLM server. Use mockResponses=true or start server manually.');
}

/**
 * Creates a clean test environment
 * @param {Object} options - Setup options
 * @returns {Promise<Object>} - Environment info
 */
async function setupTestEnvironment({
  useQdrant = true,
  useLLM = true,
  mockLLM = true,
  testDataDir = path.join(__dirname, '..', 'data')
} = {}) {
  console.log('Setting up test environment...');
  
  // Create test data directory
  await fs.ensureDir(testDataDir);
  
  const env = {
    testDataDir,
    services: {}
  };
  
  try {
    // Start Qdrant if needed
    if (useQdrant) {
      env.services.qdrant = await ensureQdrantServer({
        dataDir: path.join(testDataDir, 'qdrant')
      });
    }
    
    // Start LLM server if needed
    if (useLLM) {
      env.services.llm = await ensureLLMServer({
        mockResponses: mockLLM
      });
    }
    
    console.log('Test environment setup complete');
    return env;
  } catch (error) {
    console.error('Failed to set up test environment:', error);
    throw error;
  }
}

module.exports = {
  setupTestEnvironment,
  ensureQdrantServer,
  ensureLLMServer,
  isServerRunning
};
