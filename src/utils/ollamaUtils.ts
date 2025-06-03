import fetch from 'node-fetch';
import config from '../config.js';

/**
 * Checks if a specific model exists on the configured Ollama server.
 * @param modelName The name of the model to check.
 * @returns True if the model exists, false otherwise.
 */
export async function checkOllamaModelExists(modelName: string): Promise<boolean> {
  if (!config.ollama.enabled) {
    console.log('Ollama is disabled in config, skipping model check.');
    return false; // Assume model doesn't "exist" for the app if Ollama is disabled
  }

  const url = `${config.llm.url}/api/show`;
  console.log(`Checking for Ollama model '${modelName}' at ${url}...`);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: modelName }),
    });

    if (response.ok) {
      console.log(`Model '${modelName}' found.`);
      return true;
    } else if (response.status === 404) {
      console.warn(`Model '${modelName}' not found on Ollama server.`);
      return false;
    } else {
      console.error(`Error checking model '${modelName}': Ollama API returned status ${response.status} ${response.statusText}`);
      return false; // Treat other errors as model not available
    }
  } catch (error: any) {
    console.error(`Error connecting to Ollama at ${url} to check model '${modelName}': ${error.message}`);
    return false; // Connection error means model is not available
  }
}
