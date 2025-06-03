/**
 * Data processing service
 */

import { ProcessingOptions } from '../config/config-manager';
import { ValidationError, ParsingError, TimeoutError } from '../types/errors';

/**
 * Interface for processed data result
 */
export interface ProcessedData {
  id: string;
  originalData: any;
  processedData: any;
  metadata: {
    processingTime: number;
    timestamp: string;
    steps: string[];
  };
}

/**
 * Service for processing data
 */
export class DataProcessor {
  private activeProcesses: Map<string, Promise<ProcessedData>> = new Map();
  
  /**
   * Creates a new DataProcessor
   * @param options - Processing options
   */
  constructor(private options: ProcessingOptions) {}
  
  /**
   * Processes data according to options
   * @param data - Data to process
   * @returns Processed data
   */
  public async processData(data: any): Promise<ProcessedData> {
    // Generate a process ID
    const processId = this.generateProcessId();
    
    // Create processing promise
    const processingPromise = this.createProcessingPromise(processId, data);
    
    // Store in active processes
    this.activeProcesses.set(processId, processingPromise);
    
    try {
      // Wait for processing to complete
      const result = await processingPromise;
      
      // Remove from active processes
      this.activeProcesses.delete(processId);
      
      return result;
    } catch (error) {
      // Remove from active processes
      this.activeProcesses.delete(processId);
      
      // Re-throw the error
      throw error;
    }
  }
  
  /**
   * Creates a promise that processes the data
   * @param processId - Unique process ID
   * @param data - Data to process
   * @returns Promise that resolves to processed data
   */
  private createProcessingPromise(processId: string, data: any): Promise<ProcessedData> {
    return new Promise<ProcessedData>((resolve, reject) => {
      // Create timeout if configured
      const timeoutId = this.options.timeout > 0
        ? setTimeout(() => {
            reject(new TimeoutError(`Processing timed out after ${this.options.timeout}ms`));
          }, this.options.timeout)
        : null;
      
      // Process the data asynchronously
      this.executeProcessing(processId, data)
        .then(result => {
          // Clear timeout if set
          if (timeoutId) clearTimeout(timeoutId);
          resolve(result);
        })
        .catch(error => {
          // Clear timeout if set
          if (timeoutId) clearTimeout(timeoutId);
          reject(error);
        });
    });
  }
  
  /**
   * Executes the actual data processing
   * @param processId - Unique process ID
   * @param data - Data to process
   * @returns Processed data
   */
  private async executeProcessing(processId: string, data: any): Promise<ProcessedData> {
    const startTime = Date.now();
    const steps: string[] = [];
    
    try {
      // Validate data if enabled
      let validatedData = data;
      if (this.options.validate) {
        steps.push('validation');
        validatedData = await this.validateData(data);
      }
      
      // Transform data if enabled
      let transformedData = validatedData;
      if (this.options.transform) {
        steps.push('transformation');
        transformedData = await this.transformData(validatedData);
      }
      
      // Create the result
      const result: ProcessedData = {
        id: processId,
        originalData: data,
        processedData: transformedData,
        metadata: {
          processingTime: Date.now() - startTime,
          timestamp: new Date().toISOString(),
          steps
        }
      };
      
      return result;
    } catch (error) {
      // Add processing time to error
      const processingTime = Date.now() - startTime;
      
      // Re-throw with additional context
      if (error instanceof Error) {
        error.message = `${error.message} (Process ${processId}, Time: ${processingTime}ms)`;
      }
      
      throw error;
    }
  }
  
  /**
   * Validates input data
   * @param data - Data to validate
   * @returns Validated data
   */
  private async validateData(data: any): Promise<any> {
    // Simulate some async validation
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Simple validation for demonstration
    if (!data) {
      throw new ValidationError('Data cannot be null or undefined');
    }
    
    if (typeof data === 'string') {
      try {
        // Try to parse as JSON
        return JSON.parse(data);
      } catch (error) {
        throw new ParsingError('Failed to parse string data as JSON', error);
      }
    }
    
    // Return the data if it passes validation
    return data;
  }
  
  /**
   * Transforms the data
   * @param data - Data to transform
   * @returns Transformed data
   */
  private async transformData(data: any): Promise<any> {
    // Simulate async transformation
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Simple transformation for demonstration
    if (Array.isArray(data)) {
      return data.map(item => ({
        ...item,
        transformed: true,
        timestamp: new Date().toISOString()
      }));
    }
    
    if (typeof data === 'object' && data !== null) {
      return {
        ...data,
        transformed: true,
        timestamp: new Date().toISOString()
      };
    }
    
    // Primitive value, just return as is
    return data;
  }
  
  /**
   * Generates a unique process ID
   * @returns Process ID
   */
  private generateProcessId(): string {
    return `process-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Cleans up any resources
   */
  public async cleanup(): Promise<void> {
    // Cancel any active processes
    // In a real app, would have a way to cancel each process
    this.activeProcesses.clear();
  }
}
