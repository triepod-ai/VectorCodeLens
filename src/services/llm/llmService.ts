// src/services/llm/llmService.ts
import fetch from 'node-fetch';

/**
 * LlmService handles interactions with language models for code analysis
 * and query response generation.
 */
export class LlmService {
  private llmUrl: string;
  private claudeApiKey: string | undefined;
  private claudeApiUrl: string;
  private claudeModel: string;
  private isClaudeEnabled: boolean;
  
  constructor(config: any) {
    this.llmUrl = config.llmServiceUrl || 'http://localhost:11434';
    this.claudeApiKey = config.claudeApiKey;
    this.claudeApiUrl = config.llm?.claudeApiUrl || 'https://api.anthropic.com/v1/messages';
    this.claudeModel = config.claudeModel || 'claude-3-haiku-20240307';
    this.isClaudeEnabled = !!this.claudeApiKey;
  }
  
  /**
   * Generate a response to a user query based on search results
   */
  async generateResponse(query: string, searchResults: any[]): Promise<string> {
    try {
      // Build context from search results
      const context = this.buildContext(searchResults);
      
      // Generate prompt
      const prompt = this.buildPrompt(query, context);
      
      // Use Claude if available, otherwise use local LLM
      if (this.isClaudeEnabled) {
        return await this.callClaude(prompt);
      } else {
        return await this.callLocalLlm(prompt);
      }
    } catch (error) {
      console.error('Error generating response:', error);
      throw new Error(`Failed to generate response: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Format extraction results using LLM
   */
  async formatExtractionResults(query: string, extractionResults: any[]): Promise<any> {
    try {
      // Build context from extraction results
      const context = this.buildContext(extractionResults);
      
      // Generate extraction prompt
      const prompt = this.buildExtractionPrompt(query, context);
      
      // Use Claude if available, otherwise use local LLM
      let response;
      if (this.isClaudeEnabled) {
        response = await this.callClaude(prompt);
      } else {
        response = await this.callLocalLlm(prompt);
      }
      
      // Try to parse the response as JSON
      try {
        return JSON.parse(response);
      } catch (parseError) {
        // If parsing fails, return the raw response
        return { content: response };
      }
    } catch (error) {
      console.error('Error formatting extraction results:', error);
      throw new Error(`Failed to format extraction results: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Call Claude API
   */
  private async callClaude(prompt: string): Promise<string> {
    if (!this.claudeApiKey) {
      throw new Error('Claude API key not configured');
    }
    
    try {
      const response = await fetch(this.claudeApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.claudeApiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: this.claudeModel,
          messages: [
            { role: 'user', content: prompt }
          ],
          max_tokens: 2000
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Claude API error: ${response.status} - ${errorText}`);
      }
      
      const data = await response.json() as any;
      return data.content[0]?.text || 'No response from Claude';
    } catch (error) {
      console.error('Error calling Claude API:', error);
      throw new Error(`Claude API call failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Call local LLM (Ollama)
   */
  private async callLocalLlm(prompt: string): Promise<string> {
    try {
      const response = await fetch(`${this.llmUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'codellama',
          prompt: prompt,
          temperature: 0.1,
          max_tokens: 2000
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Local LLM error: ${response.status} - ${errorText}`);
      }
      
      const data = await response.json() as any;
      return data.response || 'No response from local LLM';
    } catch (error) {
      console.error('Error calling local LLM:', error);
      throw new Error(`Local LLM call failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Build context from search results
   */
  private buildContext(searchResults: any[]): string {
    // Combine search results into a single context string
    return searchResults.map((result, index) => {
      return `[CHUNK ${index + 1}]\nFile: ${result.fileName}\nLines: ${result.lineStart}-${result.lineEnd}\n\n${result.chunk}\n`;
    }).join('\n\n');
  }
  
  /**
   * Build prompt for query response generation
   */
  private buildPrompt(query: string, context: string): string {
    return `You are an AI assistant that answers questions about code. 
    
Below is a selection of code chunks from a codebase that might be relevant to the query.

${context}

USER QUERY: ${query}

Please provide a helpful, accurate, and concise response to the query based on the code chunks above. 
If the provided code chunks do not contain enough information to answer the query, please state that clearly.`;
  }
  
  /**
   * Build prompt for extraction tasks
   */
  private buildExtractionPrompt(query: string, context: string): string {
    return `You are an AI assistant that extracts specific information from code. 
    
Below is a selection of code chunks from a codebase:

${context}

EXTRACTION TASK: ${query}

Please extract the specific information requested and format your response as a JSON object with these fields:
{
  "extractedContent": "The specific content extracted",
  "location": "File and line numbers where the content was found",
  "confidence": "High, Medium, or Low based on how confident you are in the extraction"
}

If the requested information is not found in the provided code chunks, set extractedContent to null and add a reason field explaining why.`;
  }
}
