import fetch from 'node-fetch';

// Common Ollama configurations to test
const OLLAMA_CONFIGS = [
  { name: 'Default', url: 'http://localhost:11434' },
  { name: 'Alternative localhost', url: 'http://127.0.0.1:11434' },
  { name: 'WSL/Docker bridge', url: 'http://host.docker.internal:11434' },
  { name: 'Custom port 8020', url: 'http://localhost:8020' },
  { name: 'Custom port 8080', url: 'http://localhost:8080' }
];

// Test a single Ollama configuration
async function testOllamaConfig(config) {
  const url = `${config.url}/api/models`;
  
  try {
    console.log(`Testing ${config.name} at: ${url}`);
    const response = await fetch(url, { timeout: 5000 });
    
    if (!response.ok) {
      console.log(`  ❌ HTTP ${response.status}: ${response.statusText}`);
      return null;
    }
    
    const data = await response.json();
    console.log(`  ✅ Connected successfully!`);
    console.log(`  📋 Available models: ${data.models?.length || 0}`);
    return { ...config, models: data.models || [] };
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log(`  ❌ Connection refused - service not running`);
    } else if (error.name === 'FetchError') {
      console.log(`  ❌ Network error: ${error.message}`);
    } else {
      console.log(`  ❌ Error: ${error.message}`);
    }
    return null;
  }
}

// Test specific model availability
async function testModelAvailability(config, modelName = 'rjmalagon/gte-qwen2-1.5b-instruct-embed-f16') {
  const url = `${config.url}/api/generate`;
  
  try {
    console.log(`Testing model "${modelName}" at ${config.url}...`);
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: modelName,
        prompt: 'test',
        stream: false,
        options: { num_predict: 1 }
      }),
      timeout: 10000
    });
    
    if (!response.ok) {
      console.log(`  ❌ Model test failed: HTTP ${response.status}`);
      return false;
    }
    
    const data = await response.json();
    console.log(`  ✅ Model "${modelName}" is working`);
    return true;
  } catch (error) {
    console.log(`  ❌ Model test error: ${error.message}`);
    return false;
  }
}

// Main test function
async function main() {
  console.log('🔍 Testing Ollama connectivity across multiple configurations...\n');
  
  let workingConfig = null;
  
  // Test each configuration
  for (const config of OLLAMA_CONFIGS) {
    const result = await testOllamaConfig(config);
    if (result) {
      workingConfig = result;
      break; // Stop at first working configuration
    }
    console.log(''); // Add spacing between tests
  }
  
  if (!workingConfig) {
    console.log('❌ No working Ollama configuration found!\n');
    console.log('📋 Troubleshooting steps:');
    console.log('   1. Start Ollama: `ollama serve`');
    console.log('   2. Check if running: `ps aux | grep ollama`');
    console.log('   3. Check port: `netstat -tulpn | grep 11434`');
    console.log('   4. Try alternative ports or hosts');
    console.log('   5. Check firewall settings\n');
    process.exit(1);
  }
  
  console.log(`\n✅ Working configuration found: ${workingConfig.name}`);
  console.log(`   URL: ${workingConfig.url}`);
  console.log(`   Models available: ${workingConfig.models.length}\n`);
  
  // Test the specific model we need
  if (workingConfig.models.length > 0) {
    const modelToTest = 'rjmalagon/gte-qwen2-1.5b-instruct-embed-f16';
    const hasTargetModel = workingConfig.models.some(m => m.name === modelToTest);
    
    if (hasTargetModel) {
      console.log(`✅ Target model "${modelToTest}" is available`);
      await testModelAvailability(workingConfig, modelToTest);
    } else {
      console.log(`❌ Target model "${modelToTest}" not found`);
      console.log('   Available models:');
      workingConfig.models.forEach(model => {
        console.log(`   - ${model.name}`);
      });
      console.log(`\n   To install the target model: ollama pull ${modelToTest}`);
    }
  }
  
  // Generate suggested .env configuration
  console.log('\n📝 Suggested .env configuration:');
  console.log(`LLM_SERVICE_URL=${workingConfig.url}`);
  console.log(`OLLAMA_ENABLED=true`);
  console.log(`OLLAMA_MODEL=rjmalagon/gte-qwen2-1.5b-instruct-embed-f16`);
}

// Run the test
main().catch(error => {
  console.error('🚨 Unhandled error:', error);
  process.exit(1);
});