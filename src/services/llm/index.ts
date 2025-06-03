// src/services/llm/index.ts
import { LlmService } from './llmService.js';

export { LlmService };

/**
 * Configuration interface for the LLM service
 */
export interface LlmServiceConfig {
  llmServiceUrl?: string;
  claudeApiKey?: string;
  claudeApiUrl?: string;
  claudeModel?: string;
  temperature?: number;
  maxTokens?: number;
  retryAttempts?: number;
  timeoutMs?: number;
}

/**
 * LLM Model options
 */
export enum LlmModel {
  CodeLlama = 'codellama',
  Claude3Haiku = 'claude-3-haiku-20240307',
  Claude3Sonnet = 'claude-3-sonnet-20240229',
  Claude3Opus = 'claude-3-opus-20240229'
}

/**
 * Factory function to create an LLM service instance with default configuration
 */
export function createLlmService(config: LlmServiceConfig = {}): LlmService {
  return new LlmService({
    llmServiceUrl: config.llmServiceUrl || 'http://localhost:11434',
    claudeApiKey: config.claudeApiKey,
    llm: {
      claudeApiUrl: config.claudeApiUrl || 'https://api.anthropic.com/v1/messages',
      claudeModel: config.claudeModel || LlmModel.Claude3Haiku,
      temperature: config.temperature || 0.1,
      maxTokens: config.maxTokens || 2000,
      retryAttempts: config.retryAttempts || 3,
      timeoutMs: config.timeoutMs || 30000
    }
  });
}
