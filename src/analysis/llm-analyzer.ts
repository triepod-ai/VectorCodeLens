// src/analysis/llm-analyzer.ts
import fetch from 'node-fetch';
import config from '../config.js';
import { CodeChunk } from '../scanner/chunker.js';

export interface AnalysisOptions {
  serverUrl?: string;
  temperature?: number;
  maxTokens?: number;
  analysisType?: AnalysisType;
}

export type AnalysisType = 'semantic' | 'documentation' | 'flow' | 'comprehensive';

export interface AnalysisResult {
  summary: string;
  purpose: string;
  dependencies: string[];
  complexity: number;
  potentialIssues: string[];
  bestPractices: string[];
  documentation: {
    quality: number;
    suggestions: string[];
  };
  raw?: any; // Raw LLM response
}

export async function analyzeCodeChunk(
  chunk: CodeChunk,
  options: AnalysisOptions = {}
): Promise<AnalysisResult> {
  // Merge default options
  const mergedOptions: Required<AnalysisOptions> = {
    serverUrl: options.serverUrl ?? config.llm.url,
    temperature: options.temperature ?? config.llm.temperature,
    maxTokens: options.maxTokens ?? config.llm.maxTokens,
    analysisType: options.analysisType ?? 'comprehensive'
  };
  
  // Create the prompt based on analysis type
  const prompt = createAnalysisPrompt(chunk, mergedOptions.analysisType);
  
  // Call the LLM
  let response;
  let attempts = 0;
  
  while (attempts < config.llm.retryAttempts) {
    try {
      // Use Ollama's chat completions endpoint
      response = await fetch(`${mergedOptions.serverUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: config.ollama.model,
          messages: [
            { role: 'system', content: 'You are a code analysis expert.' },
            { role: 'user', content: prompt }
          ],
          temperature: mergedOptions.temperature,
          max_tokens: mergedOptions.maxTokens,
          stream: false
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result: any = await response.json();
      // Extract the message content from the Ollama chat response
      const output = result.message?.content || '';
      return processLLMResponse(output, mergedOptions.analysisType);
    } catch (error) {
      attempts++;
      
      if (attempts >= config.llm.retryAttempts) {
        throw new Error(`Failed to analyze code after ${attempts} attempts: ${error}`);
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, config.llm.retryDelay));
    }
  }
  
  // This should never happen due to the throw above, but TypeScript needs this
  throw new Error('Failed to analyze code');
}

function createAnalysisPrompt(chunk: CodeChunk, analysisType: AnalysisType): string {
  const { language, relativePath } = chunk.fileInfo;
  const { code, startLine, endLine } = chunk;
  
  // Base prompt information
  let prompt = `
Analyze the following code snippet from file ${relativePath} (lines ${startLine + 1}-${endLine + 1}):

\`\`\`${language}
${code}
\`\`\`

`;

  // Analysis-specific instructions
  switch (analysisType) {
    case 'semantic':
      prompt += `
Please analyze what this code does, its purpose, and how it works.
Your analysis should be in JSON format with the following structure:
{
  "summary": "A concise explanation of what this code does",
  "purpose": "The intended purpose of this code",
  "dependencies": ["Any external dependencies or imports used"],
  "complexity": "A numerical score from 1-10 indicating complexity",
  "potentialIssues": ["Any potential issues, bugs, or edge cases"]
}
`;
      break;
    
    case 'documentation':
      prompt += `
Please analyze the documentation quality of this code.
Your analysis should be in JSON format with the following structure:
{
  "documentationQuality": "A numerical score from 1-10",
  "summary": "What the code does",
  "documentationSuggestions": ["Specific suggestions for improving documentation"],
  "missingDocumentation": ["Areas where documentation is missing"]
}
`;
      break;
      
    case 'flow':
      prompt += `
Please analyze the code flow, including function calls, data transformations, and control structures.
Your analysis should be in JSON format with the following structure:
{
  "summary": "A concise explanation of the code flow",
  "entryPoints": ["The main entry points or exported functions"],
  "callSequence": ["The sequence of function calls or operations"],
  "dataFlow": ["How data is transformed through the code"],
  "controlStructures": ["Key control structures and their purpose"]
}
`;
      break;
      
    case 'comprehensive':
    default:
      prompt += `
Please provide a comprehensive analysis of this code.
Your analysis should be in JSON format with the following structure:
{
  "summary": "A concise explanation of what this code does",
  "purpose": "The intended purpose of this code",
  "dependencies": ["Any external dependencies or imports used"],
  "complexity": "A numerical score from 1-10 indicating complexity",
  "potentialIssues": ["Any potential issues, bugs, or edge cases"],
  "bestPractices": ["Good practices used or recommendations"],
  "documentation": {
    "quality": "A numerical score from 1-10",
    "suggestions": ["Suggestions for improving documentation"]
  }
}
`;
      break;
  }
  
  return prompt;
}

function processLLMResponse(response: string, analysisType: AnalysisType): AnalysisResult {
  try {
    // Try to parse the JSON response
    const jsonStart = response.indexOf('{');
    const jsonEnd = response.lastIndexOf('}') + 1;
    
    if (jsonStart === -1 || jsonEnd === -1) {
      throw new Error('Could not find JSON in response');
    }
    
    const jsonString = response.substring(jsonStart, jsonEnd);
    const parsedResponse = JSON.parse(jsonString);
    
    // Process based on analysis type
    switch (analysisType) {
      case 'semantic':
        return {
          summary: parsedResponse.summary || '',
          purpose: parsedResponse.purpose || '',
          dependencies: parsedResponse.dependencies || [],
          complexity: parsedResponse.complexity || 0,
          potentialIssues: parsedResponse.potentialIssues || [],
          bestPractices: [],
          documentation: {
            quality: 0,
            suggestions: []
          },
          raw: parsedResponse
        };
        
      case 'documentation':
        return {
          summary: parsedResponse.summary || '',
          purpose: '',
          dependencies: [],
          complexity: 0,
          potentialIssues: [],
          bestPractices: [],
          documentation: {
            quality: parsedResponse.documentationQuality || 0,
            suggestions: parsedResponse.documentationSuggestions || []
          },
          raw: parsedResponse
        };
        
      case 'flow':
        return {
          summary: parsedResponse.summary || '',
          purpose: '',
          dependencies: [],
          complexity: 0,
          potentialIssues: [],
          bestPractices: [],
          documentation: {
            quality: 0,
            suggestions: []
          },
          raw: parsedResponse
        };
        
      case 'comprehensive':
      default:
        return {
          summary: parsedResponse.summary || '',
          purpose: parsedResponse.purpose || '',
          dependencies: parsedResponse.dependencies || [],
          complexity: parsedResponse.complexity || 0,
          potentialIssues: parsedResponse.potentialIssues || [],
          bestPractices: parsedResponse.bestPractices || [],
          documentation: {
            quality: parsedResponse.documentation?.quality || 0,
            suggestions: parsedResponse.documentation?.suggestions || []
          },
          raw: parsedResponse
        };
    }
  } catch (error) {
    console.error('Error processing LLM response:', error);
    console.error('Raw response:', response);
    
    // Return a default structure
    return {
      summary: "Failed to process LLM response",
      purpose: "",
      dependencies: [],
      complexity: 0,
      potentialIssues: ["LLM response processing failed"],
      bestPractices: [],
      documentation: {
        quality: 0,
        suggestions: []
      },
      raw: response
    };
  }
}