import { config } from '../config.js';

// Log levels and their numeric values
const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

// Current log level from configuration
const currentLogLevel = LOG_LEVELS[config.logLevel.toLowerCase() as keyof typeof LOG_LEVELS] || LOG_LEVELS.info;

/**
 * Simple logger with log level filtering
 */
export const logger = {
  error: (message: string, ...args: any[]) => {
    if (currentLogLevel >= LOG_LEVELS.error) {
      console.error(`[ERROR] ${message}`, ...args);
    }
  },
  
  warn: (message: string, ...args: any[]) => {
    if (currentLogLevel >= LOG_LEVELS.warn) {
      console.warn(`[WARN] ${message}`, ...args);
    }
  },
  
  info: (message: string, ...args: any[]) => {
    if (currentLogLevel >= LOG_LEVELS.info) {
      console.info(`[INFO] ${message}`, ...args);
    }
  },
  
  debug: (message: string, ...args: any[]) => {
    if (currentLogLevel >= LOG_LEVELS.debug) {
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  }
};