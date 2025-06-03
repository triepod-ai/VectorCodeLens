// src/claude/query-handler.ts
import { generateEmbedding } from '../storage/embedding.js';
import { CodeVectorStorage, StoredAnalysis } from '../storage/vector-db.js';
import fetch from 'node-fetch';
import config from '../config.js';

export interface QueryResult {
  query: string;
  matches: number;
  results: Array<{
    filePath: string;
    relativePath: string;
    language: string;
    startLine: number;
    endLine: number;
    codeSnippet: string;
    summary: string;
    similarity: number;
  }>;
  executionTimeMs: number;
}

export async function handleCodeQuery(
  query: string,
  storage: CodeVectorStorage,
  limit: number = 5
): Promise<QueryResult> {
  const startTime = Date.now();
  
  try {
    // Check if Ollama is enabled before generating query embedding
    if (!config.ollama.enabled) {
      throw new Error("Ollama is disabled or the configured model is unavailable. Cannot generate embedding for query.");
    }

    // Generate embedding for the query
    const embedding = await generateEmbedding(query);
    
    // Search for similar code
    const results = await storage.searchSimilarCode(embedding, limit);
    
    // Format the results
    const formattedResults = results.map(result => ({
      filePath: result.filePath as any,
      relativePath: result.relativePath as any,
      language: result.language as any,
      startLine: result.startLine as any,
      endLine: result.endLine as any,
      codeSnippet: result.codeSnippet as any,
      summary: (result.analysis as any).summary,
      similarity: 0  // We'll calculate this
    }));
    
    // Calculate execution time
    const executionTimeMs = Date.now() - startTime;
    
    return {
      query,
      matches: formattedResults.length,
      results: formattedResults,
      executionTimeMs
    };
  } catch (error) {
    console.error('Error handling code query:', error);
    throw error;
  }
}

export interface SummarizeRequest {
  query: string;
  results: StoredAnalysis[];
}

export async function summarizeQueryResults(
  request: SummarizeRequest
): Promise<string> {
  try {
    // Create a prompt for the LLM to summarize the results
    const prompt = `
You are assisting in summarizing code analysis results. 
The user searched for: "${request.query}"

Here are the top matches from the codebase:

${request.results.map((result, index) => `
Match ${index + 1}: ${result.relativePath as any} (lines ${result.startLine as any + 1}-${result.endLine as any + 1})
Language: ${result.language as any}
Summary: ${(result.analysis as any).summary}
Purpose: ${(result.analysis as any).purpose}
`).join('\n')}

Please provide a concise summary of these results, highlighting key findings and patterns across the matches.
Explain how they relate to the user's query and what insights can be drawn from the analysis.
`;

    // Call the Ollama LLM
    const response = await fetch(`${config.llm.url}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: config.ollama.model,
        prompt,
        temperature: 0.3,
        max_tokens: 500,
        stream: false
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result: any = await response.json();
    return result.response || 'No summary available';
  } catch (error) {
    console.error('Error summarizing query results:', error);
    return `Error generating summary: ${(error as any).message}`;
  }
}
