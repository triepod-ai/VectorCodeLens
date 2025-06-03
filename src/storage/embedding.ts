// src/storage/embedding.ts
import fetch from 'node-fetch';
import config from '../config.js';

export interface EmbeddingOptions {
  url?: string;
  dimensions?: number;
}

export async function generateEmbedding(
  text: string,
  options: EmbeddingOptions = {}
): Promise<number[]> {
  const url = options.url || config.llm.embeddingsUrl;
  console.log(`Generating embedding using: ${url}`);
  
  try {
    // Using Ollama's embedding API
    const response = await fetch(url, {
      method: 'POST',
      headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(
              url.endsWith('/v1/embeddings') 
                ? { model: config.ollama.model, input: text } // Use "input" for /v1/embeddings
                : { model: config.ollama.model, prompt: text } // Use "prompt" otherwise
            )
        });
    
    if (!response.ok) {
      console.error(`Embedding API returned ${response.status}: ${response.statusText}`);
      throw new Error(`Embedding API returned ${response.status}`);
    }
    
    const result: any = await response.json();

    // Handle different response formats based on the endpoint used
    if (url.endsWith('/v1/embeddings')) {
      // OpenAI-compatible format
      if (result.data && Array.isArray(result.data) && result.data[0]?.embedding && Array.isArray(result.data[0].embedding)) {
        return result.data[0].embedding;
      }
    } else {
      // Original Ollama format (assuming /api/embeddings or similar)
      if (result.embedding && Array.isArray(result.embedding)) {
        return result.embedding;
      }
    }
    
    // If neither format matches
    console.error('Unexpected embedding response format:', result);
    throw new Error('Unexpected embedding response format');
  } catch (error) {
    console.error(`Error with Ollama embedding endpoint ${url}:`, error);
    throw new Error(`Failed to generate embedding: Could not connect to Ollama embedding service at ${url}`);
  }
}
