/**
 * Error types and classes for the application
 */

/**
 * Enumeration of error types
 */
export enum ErrorType {
  VALIDATION = 'ValidationError',
  PARSING = 'ParsingError',
  NETWORK = 'NetworkError',
  TIMEOUT = 'TimeoutError',
  CONFIG = 'ConfigurationError',
  UNEXPECTED = 'UnexpectedError'
}

/**
 * Base application error class
 */
export class AppError extends Error {
  /**
   * @param type - Error type from ErrorType enum
   * @param message - Error message
   * @param originalError - Original error if this is a wrapped error
   */
  constructor(
    public readonly type: ErrorType,
    message: string,
    public readonly originalError?: unknown
  ) {
    super(message);
    this.name = type;
    
    // Maintain proper stack trace for where our error was thrown (only V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }
}

/**
 * Validation error for invalid inputs
 */
export class ValidationError extends AppError {
  constructor(message: string, originalError?: unknown) {
    super(ErrorType.VALIDATION, message, originalError);
  }
}

/**
 * Parsing error for issues with parsing data
 */
export class ParsingError extends AppError {
  constructor(message: string, originalError?: unknown) {
    super(ErrorType.PARSING, message, originalError);
  }
}

/**
 * Network error for connection issues
 */
export class NetworkError extends AppError {
  constructor(message: string, originalError?: unknown) {
    super(ErrorType.NETWORK, message, originalError);
  }
}

/**
 * Timeout error for operations that take too long
 */
export class TimeoutError extends AppError {
  constructor(message: string, originalError?: unknown) {
    super(ErrorType.TIMEOUT, message, originalError);
  }
}

/**
 * Configuration error for issues with config
 */
export class ConfigError extends AppError {
  constructor(message: string, originalError?: unknown) {
    super(ErrorType.CONFIG, message, originalError);
  }
}
