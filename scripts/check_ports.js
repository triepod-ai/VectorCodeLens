// check_ports.js - Check if the required ports are in use
const net = require('net');

function checkPort(port, host) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let status = 'closed';
    
    // Socket connection established - port is open
    socket.on('connect', () => {
      status = 'open';
      socket.destroy();
    });
    
    // Error connecting - port is closed or host is unreachable
    socket.on('error', () => {
      status = 'closed';
    });
    
    // Connection closed - resolve with port status
    socket.on('close', () => {
      resolve(status);
    });
    
    // Set timeout to 3 seconds
    socket.setTimeout(3000);
    socket.on('timeout', () => {
      status = 'closed';
      socket.destroy();
    });
    
    // Connect to the host and port
    socket.connect(port, host || 'localhost');
  });
}

async function main() {
  console.log('=== Checking port availability ===');
  
  // Check LLM service port
  const llmPortStatus = await checkPort(8020);
  console.log(`LLM Service port (8020): ${llmPortStatus}`);
  
  // Check Qdrant port
  const qdrantPortStatus = await checkPort(6333, '127.0.0.1');
  console.log(`Qdrant Vector DB port (6333): ${qdrantPortStatus}`);
  
  console.log('\nResults:');
  console.log(`- LLM Service port (8020): ${llmPortStatus === 'open' ? 'IN USE - Service might be running' : 'AVAILABLE - Service is not running'}`);
  console.log(`- Qdrant port (6333): ${qdrantPortStatus === 'open' ? 'IN USE - Service might be running' : 'AVAILABLE - Service is not running'}`);
  
  console.log('\nConclusion:');
  if (llmPortStatus === 'open' && qdrantPortStatus === 'open') {
    console.log('Both services appear to be running. VectorCodeLens should be able to connect to them.');
  } else if (llmPortStatus === 'open') {
    console.log('LLM Service appears to be running, but Qdrant Vector DB is not.');
    console.log('You need to start the Qdrant Vector DB service before VectorCodeLens can function properly.');
  } else if (qdrantPortStatus === 'open') {
    console.log('Qdrant Vector DB appears to be running, but LLM Service is not.');
    console.log('You need to start the LLM Service before VectorCodeLens can function properly.');
  } else {
    console.log('Both services appear to be offline.');
    console.log('You need to start both the LLM Service and Qdrant Vector DB before VectorCodeLens can function properly.');
  }
}

// Run the port check
main().catch(error => {
  console.error('Error checking ports:', error);
});
