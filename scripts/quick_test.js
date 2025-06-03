import fetch from 'node-fetch';

// Simple test to check Ollama models
async function listModels() {
  try {
    // Get available models
    const response = await fetch('http://localhost:11434/api/tags');
    const data = await response.json();
    
    console.log('Available Ollama models:');
    for (const model of data.models) {
      console.log(`- ${model.name}`);
    }
    
    console.log('\nTest complete!');
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Run it
listModels();