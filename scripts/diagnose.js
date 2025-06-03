// diagnose.js - A diagnostic script for VectorCodeLens
import http from 'http';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const config = {
  llmServiceUrl: 'http://localhost:11434',
  qdrantUrl: 'http://127.0.0.1:6333',
};

// Output diagnostics to a file
const outputFile = path.join(__dirname, '../logs/vectorcodelens-diagnosis.log');
const output = fs.createWriteStream(outputFile, { flags: 'w' });

// Logging function
function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  console.log(logMessage);
  output.write(logMessage + '\n');
}

// Check if a service is running
function checkService(url, name) {
  return new Promise((resolve) => {
    log(`Checking ${name} at ${url}...`);
    
    const req = http.get(url, (res) => {
      log(`${name} responded with status code: ${res.statusCode}`);
      resolve(res.statusCode >= 200 && res.statusCode < 400);
    });
    
    req.on('error', (err) => {
      log(`Error connecting to ${name}: ${err.message}`);
      resolve(false);
    });
    
    req.setTimeout(3000, () => {
      log(`Connection to ${name} timed out after 3 seconds`);
      req.abort();
      resolve(false);
    });
  });
}

// Check Node.js version
function checkNodeVersion() {
  return new Promise((resolve) => {
    exec('node --version', (error, stdout, stderr) => {
      if (error) {
        log(`Error checking Node.js version: ${error.message}`);
        log(`Node.js may not be installed or not in PATH`);
        resolve(false);
        return;
      }
      
      const version = stdout.trim();
      log(`Node.js version: ${version}`);
      
      // Check if version is acceptable (v16+)
      const majorVersion = parseInt(version.substring(1).split('.')[0], 10);
      const isValid = majorVersion >= 16;
      
      if (!isValid) {
        log(`WARNING: Node.js version should be v16 or higher`);
      }
      
      resolve(isValid);
    });
  });
}

// Check if required files exist
function checkRequiredFiles() {
  const requiredFiles = [
    'dist/index.js',
    'package.json',
    'tsconfig.json'
  ];
  
  let allExist = true;
  
  log('Checking for required files:');
  for (const file of requiredFiles) {
    const exists = fs.existsSync(path.join(__dirname, '..', file));
    log(`  ${file}: ${exists ? 'Found' : 'MISSING'}`);
    if (!exists) {
      allExist = false;
    }
  }
  
  return allExist;
}

// Check npm dependencies
function checkDependencies() {
  return new Promise((resolve) => {
    log('Checking npm dependencies:');
    
    try {
      const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));
      
      // Check for MCP SDK
      const hasMcpSdk = !!packageJson.dependencies['@modelcontextprotocol/sdk'];
      log(`  @modelcontextprotocol/sdk: ${hasMcpSdk ? `Found (${packageJson.dependencies['@modelcontextprotocol/sdk']})` : 'MISSING'}`);
      
      // Check for vector DB client
      const hasVectorDbClient = !!packageJson.dependencies['@qdrant/js-client-rest'];
      log(`  @qdrant/js-client-rest: ${hasVectorDbClient ? `Found (${packageJson.dependencies['@qdrant/js-client-rest']})` : 'MISSING'}`);
      
      resolve(hasMcpSdk && hasVectorDbClient);
    } catch (error) {
      log(`Error checking dependencies: ${error.message}`);
      resolve(false);
    }
  });
}

// Run diagnostics
async function runDiagnostics() {
  log('=== VectorCodeLens Diagnostic Report ===');
  log(`Date: ${new Date().toISOString()}`);
  log(`Working directory: ${path.join(__dirname, '..')}`);
  log('');
  
  // System checks
  log('--- System Checks ---');
  const nodeVersionOk = await checkNodeVersion();
  
  // File checks
  log('');
  log('--- File Checks ---');
  const filesOk = checkRequiredFiles();
  
  // Dependency checks
  log('');
  log('--- Dependency Checks ---');
  const dependenciesOk = await checkDependencies();
  
  // Service checks
  log('');
  log('--- Service Checks ---');
  const llmServiceOk = await checkService(config.llmServiceUrl, 'LLM Service');
  const qdrantOk = await checkService(config.qdrantUrl, 'Qdrant Vector DB');
  
  // Summary
  log('');
  log('=== Diagnostic Summary ===');
  log(`Node.js version check: ${nodeVersionOk ? 'PASS' : 'FAIL'}`);
  log(`Required files check: ${filesOk ? 'PASS' : 'FAIL'}`);
  log(`Dependencies check: ${dependenciesOk ? 'PASS' : 'FAIL'}`);
  log(`LLM Service check: ${llmServiceOk ? 'PASS' : 'FAIL'}`);
  log(`Qdrant Vector DB check: ${qdrantOk ? 'PASS' : 'FAIL'}`);
  
  const overallStatus = nodeVersionOk && filesOk && dependenciesOk && llmServiceOk && qdrantOk;
  
  log('');
  log(`Overall status: ${overallStatus ? 'PASS - System should be operational' : 'FAIL - See details above for issues'}`);
  
  if (!llmServiceOk || !qdrantOk) {
    log('');
    log('Dependency services are not running. VectorCodeLens requires:');
    log('1. LLM Service on http://localhost:11434');
    log('2. Qdrant Vector DB on http://127.0.0.1:6333');
    log('');
    log('Please refer to troubleshooting.md for instructions on starting these services.');
  }
  
  log('');
  log(`Diagnostic results saved to: ${outputFile}`);
  
  output.end();
}

// Run the diagnostics
runDiagnostics().catch(error => {
  log(`Error running diagnostics: ${error.message}`);
  output.end();
});
