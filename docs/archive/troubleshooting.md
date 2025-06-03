# VectorCodeLens Troubleshooting Guide

## System Overview
VectorCodeLens is a code analysis tool that uses vector embeddings and LLMs to understand and query codebases. It was formerly known as CodeAnalizeMCP and is implemented as a Model Context Protocol (MCP) server component.

## Dependencies
VectorCodeLens depends on the following services:

1. **Qdrant Vector Database**
   - Configuration in `config.js`: `http://127.0.0.1:6333`
   - Collection name: `code_analysis`
   - Used for storing code embeddings and enabling semantic search

2. **LLM Service**
   - Configuration in `config.js`: `http://localhost:8020`
   - Used for embeddings: `http://localhost:8020/embeddings`
   - Required for code analysis and natural language processing

## Startup Instructions
To run VectorCodeLens:

1. Start the Qdrant vector database:
   ```
   # If using Docker (recommended)
   docker run -p 6333:6333 -p 6334:6334 qdrant/qdrant
   
   # Or start the service if installed directly
   qdrant
   ```

2. Ensure the LLM service is running:
   ```
   # This depends on your LLM setup
   # Check that it's accessible at http://localhost:8020
   ```

3. Start VectorCodeLens:
   ```
   cd /path/to/VectorCodeLens
   npm start
   ```

## Common Issues

### Application Not Starting After Reboot
The most likely causes are:

1. **Qdrant Vector Database Not Running**
   - Qdrant needs to be running before VectorCodeLens can start
   - Check if it's running: `curl http://127.0.0.1:6333/collections`
   - Start Qdrant if it's not running

2. **LLM Service Not Running**
   - The LLM service must be accessible at http://localhost:8020
   - Check if it's running: `curl http://localhost:8020`
   - Start the LLM service if it's not running

3. **Node.js Application Not Set as a Service**
   - VectorCodeLens is a Node.js application and doesn't appear to be configured as a Windows service
   - It needs to be manually started after each reboot or configured as a service

## Setting Up as a Windows Service

To ensure VectorCodeLens starts automatically after a reboot, you can set it up as a Windows service using a tool like `node-windows`:

1. Install node-windows:
   ```
   npm install node-windows --save
   ```

2. Create a service installation script (`install-service.js`):
   ```javascript
   const Service = require('node-windows').Service;
   const path = require('path');

   // Create a new service object
   const svc = new Service({
     name: 'VectorCodeLens',
     description: 'Semantic codebase analysis platform using vector embeddings and LLMs',
     script: path.join(process.cwd(), 'dist', 'index.js'),
     nodeOptions: [],
     workingDirectory: process.cwd(),
     allowServiceLogon: true
   });

   // Listen for the "install" event
   svc.on('install', function() {
     svc.start();
     console.log('Service installed and started');
   });

   // Install the service
   svc.install();
   ```

3. Run the installation script:
   ```
   node install-service.js
   ```

## Logging
To aid in troubleshooting, consider adding logging to a file:

1. Install Winston logging:
   ```
   npm install winston --save
   ```

2. Create a logger module and use it in the application

## Checking Service Status
You can use Windows tools to check service status:

1. Open Services console (`services.msc`)
2. Look for "VectorCodeLens" service
3. Check its status and set it to "Automatic" startup

## Startup Validation
Create a simple script to check all dependencies are running before starting the service:

```javascript
// check-dependencies.js
const http = require('http');

function checkService(url, serviceName) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      if (res.statusCode >= 200 && res.statusCode < 400) {
        console.log(`✅ ${serviceName} is running`);
        resolve(true);
      } else {
        console.error(`❌ ${serviceName} returned status code ${res.statusCode}`);
        resolve(false);
      }
    }).on('error', (err) => {
      console.error(`❌ ${serviceName} is not running: ${err.message}`);
      resolve(false);
    });
  });
}

async function checkAllServices() {
  const qdrantRunning = await checkService('http://127.0.0.1:6333/collections', 'Qdrant Vector DB');
  const llmRunning = await checkService('http://localhost:8020', 'LLM Service');
  
  if (qdrantRunning && llmRunning) {
    console.log('All dependencies are running, starting VectorCodeLens...');
    // Start the application here
    require('./dist/index.js');
  } else {
    console.error('Some dependencies are not running. Please start them before running VectorCodeLens.');
    process.exit(1);
  }
}

checkAllServices();
```

Use this script as the entry point for your service.
