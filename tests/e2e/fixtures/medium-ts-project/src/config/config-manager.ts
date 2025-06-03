/**
 * Configuration management for the application
 */

import { ConfigError } from '../types/errors';

/**
 * Log levels for the application
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

/**
 * Processing options for data processor
 */
export interface ProcessingOptions {
  validate: boolean;
  transform: boolean;
  timeout: number;
  retryCount: number;
}

/**
 * Environment configuration
 */
export interface EnvironmentConfig {
  logLevel: LogLevel;
  processingOptions: ProcessingOptions;
  defaultData: any;
  mockServices: boolean;
}

/**
 * Manages application configuration
 */
export class ConfigManager {
  private config: EnvironmentConfig;
  
  /**
   * Creates a new ConfigManager
   * @param configPath - Path to config file or predefined env
   */
  constructor(configPath: string = 'default') {
    // In a real app, would load config from file
    // Here we'll just use predefined configs
    this.config = this.loadConfig(configPath);
  }
  
  /**
   * Loads configuration from a source
   * @param source - Config source identifier
   * @returns Configuration object
   */
  private loadConfig(source: string): EnvironmentConfig {
    switch (source) {
      case 'development':
        return {
          logLevel: LogLevel.DEBUG,
          processingOptions: {
            validate: true,
            transform: true,
            timeout: 30000,
            retryCount: 3
          },
          defaultData: { sample: 'dev-data' },
          mockServices: true
        };
        
      case 'test':
        return {
          logLevel: LogLevel.INFO,
          processingOptions: {
            validate: true,
            transform: true,
            timeout: 5000,
            retryCount: 0
          },
          defaultData: { sample: 'test-data' },
          mockServices: true
        };
        
      case 'production':
        return {
          logLevel: LogLevel.ERROR,
          processingOptions: {
            validate: true,
            transform: true,
            timeout: 60000,
            retryCount: 5
          },
          defaultData: { sample: 'prod-data' },
          mockServices: false
        };
        
      case 'default':
        return this.loadConfig(process.env.NODE_ENV || 'development');
        
      default:
        try {
          // In a real app, would load JSON from file
          return {
            logLevel: LogLevel.INFO,
            processingOptions: {
              validate: true,
              transform: true,
              timeout: 30000,
              retryCount: 3
            },
            defaultData: { sample: 'custom-data' },
            mockServices: false
          };
        } catch (error) {
          throw new ConfigError(`Failed to load config from ${source}`, error);
        }
    }
  }
  
  /**
   * Gets the configured log level
   */
  public getLogLevel(): LogLevel {
    return this.config.logLevel;
  }
  
  /**
   * Gets the processing options
   */
  public getProcessingOptions(): ProcessingOptions {
    return { ...this.config.processingOptions };
  }
  
  /**
   * Gets the default data
   */
  public getDefaultData(): any {
    return this.config.defaultData;
  }
  
  /**
   * Checks if services should be mocked
   */
  public shouldMockServices(): boolean {
    return this.config.mockServices;
  }
  
  /**
   * Updates a config value
   * @param key - Config key path (dot notation)
   * @param value - New value
   */
  public updateConfig(key: string, value: any): void {
    const parts = key.split('.');
    let current: any = this.config;
    
    for (let i = 0; i < parts.length - 1; i++) {
      if (!current[parts[i]]) {
        current[parts[i]] = {};
      }
      current = current[parts[i]];
    }
    
    current[parts[parts.length - 1]] = value;
  }
}
