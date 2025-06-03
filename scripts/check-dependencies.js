// check-dependencies.js
import http from 'http';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Create log file stream
const logFile = fs.createWriteStream(path.join(logsDir, `vectorcodelens-${new Date().toISOString().replace(/:/g, '-')}.log`), { flags: 'a' });

function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  console.log(logMessage);
  logFile.write(logMessage + '\n');
}

function checkService(url, serviceName) {
  return new Promise((resolve, reject) => {
    log(`Checking ${serviceName} at ${url}...`);
    
    const request = http.get(url, (res) => {
      if (res.statusCode >= 200 && res.statusCode < 400) {
        log(`✅ ${serviceName} is running (status code: ${res.statusCode})`);
        resolve(true);
      } else {
        log(`❌ ${serviceName} returned status code ${res.statusCode}`);
        resolve(false);
      }
    });
    
    request.on('error', (err) => {
      log(`❌ ${serviceName} is not running: ${err.message}`);
      resolve(false);
    });
    
    // Set a timeout for the request
    request.setTimeout(5000, () => {
      log(`❌ ${serviceName} check timed out after 5 seconds`);
      request.abort();
      resolve(false);
    });
  });
}

async function startService(command, args, serviceName) {
  return new Promise((resolve, reject) => {
    log(`Attempting to start ${serviceName}...`);
    
    const service = spawn(command, args, {
      detached: true,
      stdio: 'ignore'
    });
    
    service.unref();
    
    // Give it some time to start
    setTimeout(async () => {
      if (serviceName === 'Qdrant Vector DB') {
        const isRunning = await checkService('http://127.0.0.1:6333/collections', serviceName);
        resolve(isRunning);
      } else if (serviceName === 'LLM Service') {
        const isRunning = await checkService('http://localhost:8020', serviceName);
        resolve(isRunning);
      } else {
        resolve(true); // Assume success for other services
      }
    }, 5000);
  });
}

async function checkAllServices() {
  log('Starting dependency check for VectorCodeLens');
  
  // Check Qdrant Vector DB
  let qdrantRunning = await checkService('http://127.0.0.1:6333/collections', 'Qdrant Vector DB');
  
  // Try to start Qdrant if it's not running
  if (!qdrantRunning) {
    // This is a placeholder - replace with your actual command to start Qdrant
    // Example if using Docker:
    // qdrantRunning = await startService('docker', ['start', 'qdrant'], 'Qdrant Vector DB');
    log('⚠️ Qdrant Vector DB is not running and must be started manually');
  }
  
  // Check LLM Service
  let llmRunning = await checkService('http://localhost:8020', 'LLM Service');
  
  // Try to start LLM service if it's not running
  if (!llmRunning) {
    // This is a placeholder - replace with your actual command to start LLM service
    log('⚠️ LLM Service is not running and must be started manually');
  }
  
  if (qdrantRunning && llmRunning) {
    log('All dependencies are running, starting VectorCodeLens...');
    
    // Start the main application
    try {
      // You can either import the module or spawn a new process
      const { default: main } = await import('../dist/index.js');
      if (typeof main === 'function') main();
      log('VectorCodeLens started successfully');
    } catch (error) {
      log(`Error starting VectorCodeLens: ${error.message}`);
      process.exit(1);
    }
  } else {
    log('Some dependencies are not running. VectorCodeLens cannot start.');
    log('Please refer to the troubleshooting.md file for instructions on starting dependencies.');
    process.exit(1);
  }
}

// Run the checks
checkAllServices();
