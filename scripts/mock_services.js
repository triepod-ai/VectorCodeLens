// mock_services.js - Mock implementation of LLM and Vector DB services
const http = require('http');
const fs = require('fs');
const path = require('path');

// Configuration
const config = {
  llmPort: 8020,
  qdrantPort: 6333,
  logToFile: true
};

// Set up logging
let logFile;
if (config.logToFile) {
  const logDir = path.join(__dirname, 'logs');
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
  }
  
  const logPath = path.join(logDir, `mock-services-${new Date().toISOString().replace(/:/g, '-')}.log`);
  logFile = fs.createWriteStream(logPath, { flags: 'a' });
}

// Logging function
function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  console.log(logMessage);
  
  if (config.logToFile && logFile) {
    logFile.write(logMessage + '\n');
  }
}

// Create mock LLM server
const llmServer = http.createServer((req, res) => {
  log(`LLM Service received request: ${req.url}`);
  
  // Handle different endpoints
  if (req.url === '/embeddings') {
    // Handle embedding requests
    log('Handling embedding request');
    
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        log(`Embedding request for text: ${data.text ? data.text.substring(0, 50) + '...' : 'No text provided'}`);
        
        // Generate a mock embedding (1536 dimensions, typical for models like OpenAI's)
        const embedding = Array(1536).fill(0).map(() => Math.random() * 2 - 1);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          embedding,
          model: 'mock-embedding-model',
          tokenCount: data.text ? Math.ceil(data.text.length / 4) : 0 // Approximate token count
        }));
      } catch (error) {
        log(`Error processing embedding request: ${error.message}`);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
    });
    
    return;
  }
  
  // Default response for any other request
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    message: 'Mock LLM Service is running',
    status: 'OK',
    modelInfo: {
      name: 'mock-llm-model',
      version: '1.0.0'
    }
  }));
});

// Create mock Qdrant server
const qdrantServer = http.createServer((req, res) => {
  log(`Qdrant Vector DB received request: ${req.url}`);
  
  // Handle different endpoints
  if (req.url === '/collections') {
    // List collections
    log('Handling collections request');
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      result: {
        collections: [{
          name: 'code_analysis',
          vectors_count: 1000,
          status: 'active',
          optimizers_status: 'finished'
        }]
      },
      status: 'ok',
      time: 0.001
    }));
    
    return;
  }
  
  if (req.url.includes('/collections/code_analysis/points/search')) {
    // Handle vector search
    log('Handling vector search request');
    
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        log(`Search request with ${data.vector ? 'vector' : 'no vector'} and limit ${data.limit || 'default'}`);
        
        // Generate mock search results
        const results = [];
        const count = data.limit || 10;
        
        for (let i = 0; i < count; i++) {
          results.push({
            id: `doc-${i + 1}`,
            score: 0.9 - (i * 0.05),
            payload: {
              content: `Mock code snippet ${i + 1}`,
              file_path: `src/example${i + 1}.js`,
              language: 'javascript',
              line_start: 10 + i,
              line_end: 20 + i
            }
          });
        }
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          result: results,
          status: 'ok',
          time: 0.005
        }));
      } catch (error) {
        log(`Error processing search request: ${error.message}`);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'error', error: error.message }));
      }
    });
    
    return;
  }
  
  // Default response for any other request
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    status: 'ok',
    message: 'Mock Qdrant Vector DB is running'
  }));
});

// Start the servers
function startServers() {
  // Start LLM server
  llmServer.listen(config.llmPort, () => {
    log(`Mock LLM Service started on http://localhost:${config.llmPort}`);
  });
  
  // Start Qdrant server
  qdrantServer.listen(config.qdrantPort, () => {
    log(`Mock Qdrant Vector DB started on http://localhost:${config.qdrantPort}`);
  });
  
  log('Mock services started. Press Ctrl+C to stop.');
}

// Handle shutdown
function shutdown() {
  log('Shutting down mock services...');
  
  llmServer.close(() => {
    log('LLM Service stopped');
    
    qdrantServer.close(() => {
      log('Qdrant Vector DB stopped');
      
      if (logFile) {
        logFile.end();
      }
      
      process.exit(0);
    });
  });
}

// Register shutdown handlers
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Start the servers
startServers();
