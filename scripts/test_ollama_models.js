import fetch from 'node-fetch';
import config from './dist/config.js';

// Test Ollama connection and models
async function testOllamaConnection() {
  try {
    console.log(`Testing Ollama connection at: ${config.llm.url}`);
    
    // Get available models
    const modelsResponse = await fetch(`${config.llm.url}/api/tags`);
    
    if (!modelsResponse.ok) {
      console.error(`Error: HTTP status ${modelsResponse.status}`);
      console.error(await modelsResponse.text());
      return false;
    }
    
    const modelsData = await modelsResponse.json();
    console.log('Available models:');
    modelsData.models.forEach(model => {
      console.log(`- ${model.name} (${model.details.parameter_size}, ${model.details.quantization_level})`);
    });
    
    // Test the configured model
    console.log(`\nTesting configured model: ${config.ollama.model}`);
    const testResponse = await fetch(`${config.llm.url}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: config.ollama.model,
        prompt: 'Say hello world',
        stream: false
      })
    });
    
    if (!testResponse.ok) {
      console.error(`Error: HTTP status ${testResponse.status}`);
      console.error(await testResponse.text());
      return false;
    }
    
    const testData = await testResponse.json();
    console.log('Model response:', testData.response);
    
    return true;
  } catch (error) {
    console.error('Connection error:', error);
    return false;
  }
}

// Main function
async function main() {
  console.log('Testing Ollama connection and models...');
  const ollamaConnected = await testOllamaConnection();
  
  if (ollamaConnected) {
    console.log('\n✅ Successfully connected to Ollama!');
  } else {
    console.log('\n❌ Failed to connect to Ollama.');
  }
}

// Run the main function
main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});