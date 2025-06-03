/**
 * Logger utility for application logging
 */

import { LogLevel } from '../config/config-manager';

/**
 * Log entry structure
 */
interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  data?: any;
}

/**
 * Logger class for consistent logging
 */
export class Logger {
  /**
   * Creates a new Logger
   * @param level - Minimum log level to output
   */
  constructor(private level: LogLevel = LogLevel.INFO) {}
  
  /**
   * Sets the log level
   * @param level - New log level
   */
  public setLevel(level: LogLevel): void {
    this.level = level;
  }
  
  /**
   * Logs a debug message
   * @param message - Log message
   * @param data - Optional data to log
   */
  public debug(message: string, ...data: any[]): void {
    this.log(LogLevel.DEBUG, message, ...data);
  }
  
  /**
   * Logs an info message
   * @param message - Log message
   * @param data - Optional data to log
   */
  public info(message: string, ...data: any[]): void {
    this.log(LogLevel.INFO, message, ...data);
  }
  
  /**
   * Logs a warning message
   * @param message - Log message
   * @param data - Optional data to log
   */
  public warn(message: string, ...data: any[]): void {
    this.log(LogLevel.WARN, message, ...data);
  }
  
  /**
   * Logs an error message
   * @param message - Log message
   * @param data - Optional data to log
   */
  public error(message: string, ...data: any[]): void {
    this.log(LogLevel.ERROR, message, ...data);
  }
  
  /**
   * Internal logging method
   * @param level - Log level
   * @param message - Log message
   * @param data - Optional data to log
   */
  private log(level: LogLevel, message: string, ...data: any[]): void {
    // Only log if level is high enough
    if (this.shouldLog(level)) {
      const entry: LogEntry = {
        level,
        message,
        timestamp: new Date().toISOString()
      };
      
      if (data && data.length > 0) {
        entry.data = data.length === 1 ? data[0] : data;
      }
      
      this.output(entry);
    }
  }
  
  /**
   * Checks if a log level should be output
   * @param level - Log level to check
   * @returns Whether to log at this level
   */
  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    const configIndex = levels.indexOf(this.level);
    const levelIndex = levels.indexOf(level);
    
    return levelIndex >= configIndex;
  }
  
  /**
   * Outputs a log entry
   * @param entry - Log entry to output
   */
  private output(entry: LogEntry): void {
    // In a real app, might write to file or service
    // For this test fixture, just output to console
    
    const prefix = `[${entry.timestamp}] [${entry.level.toUpperCase()}]`;
    
    switch (entry.level) {
      case LogLevel.ERROR:
        console.error(prefix, entry.message, entry.data || '');
        break;
      case LogLevel.WARN:
        console.warn(prefix, entry.message, entry.data || '');
        break;
      case LogLevel.INFO:
        console.info(prefix, entry.message, entry.data || '');
        break;
      case LogLevel.DEBUG:
        console.debug(prefix, entry.message, entry.data || '');
        break;
    }
  }
}
