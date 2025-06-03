/**
 * Main entry point for the medium TypeScript project
 * Demonstrates TypeScript features for testing
 */

import { DataProcessor } from './services/data-processor';
import { Logger } from './utils/logger';
import { ConfigManager } from './config/config-manager';
import { AppError, ErrorType } from './types/errors';

/**
 * Application class that coordinates the components
 */
export class Application {
  private dataProcessor: DataProcessor;
  private logger: Logger;
  private config: ConfigManager;
  
  /**
   * Creates a new Application instance
   * @param configPath - Path to configuration file
   */
  constructor(configPath: string = 'default') {
    this.config = new ConfigManager(configPath);
    this.logger = new Logger(this.config.getLogLevel());
    this.dataProcessor = new DataProcessor(this.config.getProcessingOptions());
    
    this.logger.info('Application initialized with config:', configPath);
  }
  
  /**
   * Starts the application
   * @param inputData - Optional input data to process
   * @returns Processing result
   */
  public async start(inputData?: any): Promise<any> {
    try {
      this.logger.info('Starting application...');
      
      // Get input data from config if not provided
      const data = inputData || this.config.getDefaultData();
      
      // Process the data
      const result = await this.dataProcessor.processData(data);
      
      this.logger.info('Data processing completed');
      return {
        success: true,
        result,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      const appError = error instanceof AppError 
        ? error 
        : new AppError(
            ErrorType.UNEXPECTED,
            error instanceof Error ? error.message : 'Unknown error',
            error
          );
      
      this.logger.error('Application error:', appError);
      
      return {
        success: false,
        error: {
          type: appError.type,
          message: appError.message
        },
        timestamp: new Date().toISOString()
      };
    }
  }
  
  /**
   * Stops the application and performs cleanup
   */
  public async stop(): Promise<void> {
    this.logger.info('Stopping application...');
    
    // Cleanup any resources
    await this.dataProcessor.cleanup();
    
    this.logger.info('Application stopped');
  }
}

// Export other key components
export * from './services/data-processor';
export * from './utils/logger';
export * from './config/config-manager';
export * from './types/errors';

// If running directly, create and start the application
if (require.main === module) {
  const app = new Application(process.env.CONFIG_PATH);
  
  app.start()
    .then(result => console.log('Result:', result))
    .catch(err => console.error('Fatal error:', err))
    .finally(() => app.stop());
}
