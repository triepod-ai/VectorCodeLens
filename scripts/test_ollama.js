import fetch from 'node-fetch';

// Test Ollama connection
async function testOllamaConnection() {
  const url = 'http://localhost:11434/api/models';
  
  try {
    console.log(`Testing Ollama connection at: ${url}`);
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error(`Error: HTTP status ${response.status}`);
      console.error(await response.text());
      return false;
    }
    
    const data = await response.json();
    console.log('Available models:', data);
    return true;
  } catch (error) {
    console.error('Connection error:', error.message);
    return false;
  }
}

// Main function
async function main() {
  console.log('Testing Ollama connection...');
  const ollamaConnected = await testOllamaConnection();
  
  if (ollamaConnected) {
    console.log('✅ Successfully connected to Ollama!');
  } else {
    console.log('❌ Failed to connect to Ollama.');
  }
}

// Run the main function
main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});