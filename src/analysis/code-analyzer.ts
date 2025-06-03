/**
 * Code analysis module responsible for analyzing code chunks using Claude API
 */
import fetch from 'node-fetch';

export interface AnalyzerConfig {
  claudeApiKey?: string;
  claudeApiUrl?: string;
  claudeModel?: string;
  maxRetries?: number;
  retryDelay?: number;
  useMock?: boolean;
  analysisTypes?: string[];
  ollamaFallback?: {
    enabled: boolean;
    url: string;
    model: string;
  };
}

export interface CodeObject {
  content: string;
  path?: string;
  language?: string;
}

export interface PromptData {
  prompt: string;
  language: string;
  analysisType: string;
  format: string;
}

export interface Entity {
  name: string;
  type: string;
  description: string;
}

export interface Analysis {
  summary?: string;
  purpose?: string;
  entities?: Entity[];
  complexity?: number;
  quality?: number;
  suggestions?: string[];
  documentation?: {
    quality?: number;
    suggestions?: string[];
  };
  language?: string;
  filePath?: string;
  analysisType?: string;
  timestamp?: string;
  documentationQuality?: number;
  missingDocs?: string[];
  complexityScore?: number;
  hotspots?: string[];
  id?: string;
  content?: string;
}

export interface Analyzer {
  analyzeCode: (codeObj: CodeObject, analysisType?: string) => Promise<Analysis>;
  analyzeMultipleChunks: (codeChunks: CodeObject[], analysisType?: string) => Promise<Analysis>;
  formatPrompt: (codeObj: CodeObject, analysisType: string) => PromptData;
  processAnalysisResult: (result: any, codeObj: CodeObject, analysisType: string) => Analysis;
  aggregateAnalyses: (analyses: Analysis[], analysisType: string) => Analysis;
  init: () => Promise<void>;
  config: AnalyzerConfig;
}

/**
 * Creates a code analysis module with the specified configuration
 * @param config - Analysis configuration
 * @returns Code analysis module instance
 */
export function createAnalyzer(config: AnalyzerConfig = {}): Analyzer {
  const defaultConfig: AnalyzerConfig = {
    claudeApiKey: process.env.CLAUDE_API_KEY,
    claudeApiUrl: process.env.CLAUDE_API_URL || 'https://api.anthropic.com/v1/messages',
    claudeModel: process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-20240620',
    maxRetries: 3,
    retryDelay: 1000,
    useMock: process.env.USE_MOCK_LLM === 'true',
    analysisTypes: ['semantic', 'documentation', 'complexity', 'comprehensive'],
    ollamaFallback: {
      enabled: process.env.USE_OLLAMA_FALLBACK === 'true',
      url: process.env.OLLAMA_URL || 'http://localhost:11434',
      model: process.env.OLLAMA_MODEL || 'llama3',
    }
  };

  const finalConfig: AnalyzerConfig = { ...defaultConfig, ...config };

  /**
   * Analyze code using Claude
   * @param codeObj - Code object to analyze
   * @param analysisType - Type of analysis to perform
   * @returns Analysis result
   */
  async function analyzeCode(codeObj: CodeObject, analysisType = 'comprehensive'): Promise<Analysis> {
    if (!codeObj || !codeObj.content) {
      throw new Error('Invalid code object: missing content');
    }

    // Validate analysis type
    if (!finalConfig.analysisTypes?.includes(analysisType)) {
      throw new Error(`Invalid analysis type: ${analysisType}`);
    }

    // Use mock for testing if configured
    if (finalConfig.useMock) {
      return mockAnalysis(codeObj, analysisType);
    }

    // Format prompt based on analysis type
    const promptData = formatPrompt(codeObj, analysisType);
    
    // Call Claude API with retries
    let attempt = 0;
    let lastError: Error | undefined;
    
    while (attempt < (finalConfig.maxRetries || 3)) {
      try {
        // Try using Claude API
        if (finalConfig.claudeApiKey) {
          const result = await callClaudeApi(promptData);
          return processAnalysisResult(result, codeObj, analysisType);
        } 
        // Fallback to Ollama if configured
        else if (finalConfig.ollamaFallback?.enabled) {
          const result = await callOllamaApi(promptData);
          return processAnalysisResult(result, codeObj, analysisType);
        }
        // No valid API configuration
        else {
          throw new Error('No LLM API configuration available. Set CLAUDE_API_KEY or enable Ollama fallback.');
        }
      } catch (error) {
        lastError = error as Error;
        attempt++;
        
        if (attempt < (finalConfig.maxRetries || 3)) {
          await new Promise(resolve => setTimeout(resolve, finalConfig.retryDelay || 1000));
        }
      }
    }
    
    throw new Error(`Failed to analyze code after ${finalConfig.maxRetries} attempts: ${lastError?.message}`);
  }

  /**
   * Analyze multiple code chunks and aggregate results
   * @param codeChunks - Array of code chunks to analyze
   * @param analysisType - Type of analysis to perform
   * @returns Aggregated analysis
   */
  async function analyzeMultipleChunks(codeChunks: CodeObject[], analysisType = 'comprehensive'): Promise<Analysis> {
    if (!Array.isArray(codeChunks) || codeChunks.length === 0) {
      throw new Error('Invalid code chunks: empty or not an array');
    }
    
    const analyses = await Promise.all(
      codeChunks.map(chunk => analyzeCode(chunk, analysisType))
    );
    
    return aggregateAnalyses(analyses, analysisType);
  }

  /**
   * Formats Claude prompt based on code and analysis type
   * @param codeObj - Code object
   * @param analysisType - Type of analysis
   * @returns Formatted prompt
   */
  function formatPrompt(codeObj: CodeObject, analysisType: string): PromptData {
    const language = codeObj.language || detectLanguage(codeObj.path || '');
    let promptText = '';
    const includeInstructions = 'Provide your analysis in JSON format only. Do not include any other text before or after the JSON.';
    
    switch (analysisType) {
      case 'semantic':
        promptText = `
        I need you to analyze this ${language} code and explain what it does:
        
        \`\`\`${language}
        ${codeObj.content}
        \`\`\`
        
        ${includeInstructions}
        Use the following JSON structure:
        {
          "summary": "A concise summary of what the code does",
          "purpose": "The main purpose of this code",
          "entities": [{"name": "entityName", "type": "function|class|variable", "description": "what this entity does"}],
          "complexity": A numeric rating from 1-10
        }
        `;
        break;
        
      case 'documentation':
        promptText = `
        I need you to review this ${language} code and analyze its documentation:
        
        \`\`\`${language}
        ${codeObj.content}
        \`\`\`
        
        ${includeInstructions}
        Use the following JSON structure:
        {
          "documentationQuality": A rating from 1-10,
          "missingDocs": ["Function or class names that need documentation"],
          "suggestions": ["Specific documentation improvements"]
        }
        `;
        break;
        
      case 'complexity':
        promptText = `
        I need you to analyze the complexity of this ${language} code:
        
        \`\`\`${language}
        ${codeObj.content}
        \`\`\`
        
        ${includeInstructions}
        Use the following JSON structure:
        {
          "complexityScore": A rating from 1-10,
          "hotspots": ["Areas of high complexity"],
          "suggestions": ["Specific simplification suggestions"]
        }
        `;
        break;
        
      case 'comprehensive':
      default:
        promptText = `
        I need you to perform a comprehensive analysis of this ${language} code:
        
        \`\`\`${language}
        ${codeObj.content}
        \`\`\`
        
        ${includeInstructions}
        Use the following JSON structure:
        {
          "summary": "A concise summary of what the code does",
          "purpose": "The main purpose of this code",
          "entities": [{"name": "entityName", "type": "function|class|variable", "description": "what this entity does"}],
          "complexity": A numeric rating from 1-10,
          "quality": A numeric rating from 1-10,
          "suggestions": ["Specific improvement suggestions"],
          "documentation": {"quality": A rating from 1-10, "suggestions": ["Documentation improvements"]},
          "language": "The programming language"
        }
        `;
        break;
    }
    
    return {
      prompt: promptText.trim(),
      language,
      analysisType,
      format: 'json'
    };
  }

  /**
   * Calls Claude API with the given prompt
   * @param promptData - Formatted prompt data
   * @returns Claude API response
   */
  async function callClaudeApi(promptData: PromptData): Promise<any> {
    const response = await fetch(finalConfig.claudeApiUrl || 'https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': finalConfig.claudeApiKey || '',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: finalConfig.claudeModel,
        max_tokens: 1000,
        temperature: 0.1,
        messages: [
          {
            role: "user",
            content: promptData.prompt
          }
        ],
        system: "You are a code analysis expert. Analyze code precisely and return results in JSON format only."
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Claude API error: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    return await response.json();
  }

  /**
   * Calls Ollama API with the given prompt (fallback)
   * @param promptData - Formatted prompt data
   * @returns Ollama API response
   */
  async function callOllamaApi(promptData: PromptData): Promise<any> {
    const response = await fetch(`${finalConfig.ollamaFallback?.url || 'http://localhost:11434'}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: finalConfig.ollamaFallback?.model || 'llama3',
        messages: [
          { role: 'system', content: 'You are a code analysis expert. Analyze code precisely and return results in JSON format only.' },
          { role: 'user', content: promptData.prompt }
        ],
        temperature: 0.1,
        stream: false
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    
    // Convert Ollama response format to match Claude format
    return {
      content: [
        {
          type: "text",
          text: result.message?.content || ""
        }
      ]
    };
  }

  /**
   * Processes raw LLM API result into structured analysis
   * @param result - Raw API result
   * @param codeObj - Original code object
   * @param analysisType - Type of analysis performed
   * @returns Processed analysis
   */
  function processAnalysisResult(result: any, codeObj: CodeObject, analysisType: string): Analysis {
    let analysis: Analysis;
    
    try {
      // Extract JSON from result
      let responseText = "";
      
      // Handle Claude API response
      if (result.content && Array.isArray(result.content)) {
        result.content.forEach((block: any) => {
          if (block.type === "text") {
            responseText += block.text;
          }
        });
      }
      // Handle Ollama fallback response
      else if (result.message && result.message.content) {
        responseText = result.message.content;
      }
      else {
        throw new Error('Unsupported API response format');
      }

      // Extract JSON from the response text
      const jsonMatch = responseText.match(/(\{[\s\S]*\})/);
      
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[1]);
      } else {
        throw new Error('Could not extract JSON from LLM response');
      }
    } catch (error) {
      throw new Error(`Failed to parse LLM response: ${(error as Error).message}`);
    }
    
    // Add metadata to analysis
    return {
      ...analysis,
      filePath: codeObj.path,
      language: codeObj.language || detectLanguage(codeObj.path || ''),
      analysisType,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Aggregates multiple analyses into a single result
   * @param analyses - Array of analysis results
   * @param analysisType - Type of analysis performed
   * @returns Aggregated analysis
   */
  function aggregateAnalyses(analyses: Analysis[], analysisType: string): Analysis {
    if (!Array.isArray(analyses) || analyses.length === 0) {
      throw new Error('Invalid analyses: empty or not an array');
    }
    
    // Start with the first analysis as a base
    const firstAnalysis = analyses[0];
    const aggregated: Analysis = { ...firstAnalysis };
    
    // Combine entities from all analyses
    if (analysisType === 'comprehensive' || analysisType === 'semantic') {
      aggregated.entities = analyses.flatMap(analysis => analysis.entities || []);
      
      // Remove duplicates by name
      const uniqueEntities: Record<string, Entity> = {};
      aggregated.entities?.forEach(entity => {
        if (!uniqueEntities[entity.name]) {
          uniqueEntities[entity.name] = entity;
        }
      });
      
      aggregated.entities = Object.values(uniqueEntities);
    }
    
    // Average numeric ratings
    ['complexity', 'quality', 'documentationQuality'].forEach(field => {
      const values = analyses
        .map(analysis => analysis[field as keyof Analysis])
        .filter(value => typeof value === 'number') as number[];
      
      if (values.length > 0) {
        // @ts-ignore - We know these fields are numbers
        aggregated[field] = values.reduce((sum, value) => sum + value, 0) / values.length;
      }
    });
    
    // Combine suggestions
    if (aggregated.suggestions) {
      aggregated.suggestions = analyses.flatMap(analysis => analysis.suggestions || []);
    }
    
    return aggregated;
  }

  /**
   * Detects programming language from file path
   * @param filePath - Path to file
   * @returns Detected language
   */
  function detectLanguage(filePath: string): string {
    if (!filePath) return 'Unknown';
    
    const ext = filePath.split('.').pop()?.toLowerCase() || '';
    const langMap: Record<string, string> = {
      'js': 'JavaScript',
      'jsx': 'JavaScript',
      'ts': 'TypeScript',
      'tsx': 'TypeScript',
      'py': 'Python',
      'rb': 'Ruby',
      'java': 'Java',
      'cs': 'C#',
      'c': 'C',
      'cpp': 'C++',
      'cc': 'C++',
      'h': 'C/C++ Header',
      'hpp': 'C++ Header',
      'go': 'Go',
      'php': 'PHP',
      'rs': 'Rust',
      'swift': 'Swift',
      'kt': 'Kotlin',
      'scala': 'Scala',
      'html': 'HTML',
      'css': 'CSS',
      'scss': 'SCSS',
      'json': 'JSON',
      'md': 'Markdown',
      'yaml': 'YAML',
      'yml': 'YAML',
      'sh': 'Shell',
      'bash': 'Bash',
      'sql': 'SQL',
      'r': 'R'
    };
    
    return langMap[ext] || 'Unknown';
  }

  /**
   * Generates mock analysis for testing
   * @param codeObj - Code object
   * @param analysisType - Type of analysis
   * @returns Mock analysis result
   */
  function mockAnalysis(codeObj: CodeObject, analysisType: string): Analysis {
    const language = codeObj.language || detectLanguage(codeObj.path || '');
    
    // Extract some basic info from the code to make mock more realistic
    const lines = codeObj.content.split('\n');
    const functionMatches = codeObj.content.match(/function\s+(\w+)/g) || [];
    const classMatches = codeObj.content.match(/class\s+(\w+)/g) || [];
    
    // Basic analysis structure
    const mockResult: Analysis = {
      summary: `This ${language} code contains ${lines.length} lines, ${functionMatches.length} functions, and ${classMatches.length} classes.`,
      purpose: "This code appears to be for demonstration or testing purposes.",
      complexity: 5 + Math.floor(Math.random() * 3), // Random 5-7
      quality: 6 + Math.floor(Math.random() * 3), // Random 6-8
      language,
      filePath: codeObj.path,
      analysisType,
      timestamp: new Date().toISOString(),
      entities: []
    };
    
    // Add mock entities based on code content
    functionMatches.forEach(match => {
      const name = match.replace('function ', '');
      mockResult.entities?.push({
        name,
        type: 'function',
        description: `A function named ${name}`
      });
    });
    
    classMatches.forEach(match => {
      const name = match.replace('class ', '');
      mockResult.entities?.push({
        name,
        type: 'class',
        description: `A class named ${name}`
      });
    });
    
    // Add documentation analysis if requested
    if (analysisType === 'documentation' || analysisType === 'comprehensive') {
      mockResult.documentationQuality = 5 + Math.floor(Math.random() * 3);
      mockResult.missingDocs = mockResult.entities
        ?.slice(0, Math.floor((mockResult.entities?.length || 0) / 2))
        .map(entity => entity.name);
      mockResult.suggestions = [
        'Add JSDoc comments to functions',
        'Include parameter descriptions',
        'Add usage examples'
      ];
    }
    
    // Add complexity analysis if requested
    if (analysisType === 'complexity' || analysisType === 'comprehensive') {
      mockResult.complexityScore = mockResult.complexity;
      mockResult.hotspots = mockResult.entities
        ?.slice(0, Math.floor((mockResult.entities?.length || 0) / 3))
        .map(entity => entity.name);
      mockResult.suggestions = [
        'Break down larger functions',
        'Reduce nesting levels',
        'Extract complex logic into helper functions'
      ];
    }
    
    return mockResult;
  }

  /**
   * Initialize the analyzer with current configuration
   * @returns Promise that resolves when initialization is complete
   */
  async function init(): Promise<void> {
    // Validate configuration
    if (!finalConfig.claudeApiKey && !finalConfig.ollamaFallback?.enabled && !finalConfig.useMock) {
      console.warn('Warning: No valid LLM configuration found. Set CLAUDE_API_KEY or enable Ollama fallback.');
    }
    
    if (finalConfig.claudeApiKey) {
      console.log('Initialized code analyzer with Claude API');
    } else if (finalConfig.ollamaFallback?.enabled) {
      console.log(`Initialized code analyzer with Ollama fallback (model: ${finalConfig.ollamaFallback.model})`);
    } else if (finalConfig.useMock) {
      console.log('Initialized code analyzer with mock mode');
    }
  }

  return {
    analyzeCode,
    analyzeMultipleChunks,
    formatPrompt,
    processAnalysisResult,
    aggregateAnalyses,
    init,
    config: finalConfig
  };
}
