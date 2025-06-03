// Simple test for VectorCodeLens
const path = require('path');
const fs = require('fs');

// Set up logging with timestamp in filename to avoid overwriting
const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\./g, '-');
const logFile = path.join('L:', 'source-repos', 'VectorCodeLens', 'logs', `simple-test-${timestamp}.log`);
const logStream = fs.createWriteStream(logFile, { flags: 'w' });

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
          if (data.length > 200) {
            log(`Ollama response: ${data.substring(0, 200)}...`);
          } else {
            log(`Ollama response: ${data}`);
          }
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

// Run directly with the run_server.bat script
async function runServerScript() {
  return new Promise((resolve, reject) => {
    log('Attempting to run VectorCodeLens server script...');
    
    const { exec } = require('child_process');
    const process = exec('L:\\source-repos\\VectorCodeLens\\run_server.bat', { 
      windowsHide: false,
      maxBuffer: 10 * 1024 * 1024 // 10MB buffer
    });
    
    process.stdout.on('data', (data) => {
      log(`Server output: ${data.trim()}`);
    });
    
    process.stderr.on('data', (data) => {
      log(`Server error: ${data.trim()}`);
    });
    
    process.on('exit', (code) => {
      log(`Server process exited with code ${code}`);
      resolve(code === 0);
    });
    
    // Wait 10 seconds then resolve anyway to continue the test
    setTimeout(() => {
      log('Continuing with test after server startup...');
      resolve(true);
    }, 10000);
  });
}

async function runTest() {
  try {
    log('Starting VectorCodeLens simple test...');
    
    // Check if Ollama is running
    const ollamaRunning = await checkOllama();
    log(`Ollama running: ${ollamaRunning}`);
    
    if (!ollamaRunning) {
      log('Ollama is not running. The test may fail without it.');
    }
    
    // Run the server script
    const serverStarted = await runServerScript();
    log(`Server started: ${serverStarted}`);
    
    log('Test setup completed!');
  } catch (error) {
    log(`Error during test: ${error.message}`);
    log(error.stack);
  } finally {
    log('Finishing test...');
    logStream.end();
  }
}

// Run the test
runTest().catch(error => {
  log(`Unhandled error: ${error.message}`);
  log(error.stack);
  logStream.end();
});
