/**
 * Error handling utilities
 * Provides consistent error handling across the application
 */

const config = require('../config');

/**
 * Error types for categorization
 * @enum {string}
 */
const ErrorTypes = {
  VALIDATION: 'ValidationError',
  PARSING: 'ParsingError',
  NETWORK: 'NetworkError',
  TIMEOUT: 'TimeoutError',
  UNEXPECTED: 'UnexpectedError'
};

/**
 * Handles errors in a consistent way
 * @param {Error} error - The error object
 * @param {string} context - The context where the error occurred
 * @returns {Object} - Formatted error information
 */
function handleError(error, context = 'unknown') {
  // Get current environment settings
  const envConfig = config.getEnvironmentConfig();
  
  // Determine error type
  const errorType = determineErrorType(error);
  
  // Standardize error message
  const errorInfo = {
    type: errorType,
    message: error.message,
    context,
    timestamp: new Date().toISOString()
  };
  
  // Add stack trace in non-production environments
  if (envConfig.logLevel === 'debug') {
    errorInfo.stack = error.stack;
  }
  
  // Log the error based on environment settings
  logError(errorInfo, envConfig);
  
  return errorInfo;
}

/**
 * Determines the type of error
 * @param {Error} error - The error to categorize
 * @returns {string} - The error type
 */
function determineErrorType(error) {
  if (error.name === 'SyntaxError' || error.message.includes('parse')) {
    return ErrorTypes.PARSING;
  }
  
  if (error.message.includes('validate') || error.message.includes('invalid')) {
    return ErrorTypes.VALIDATION;
  }
  
  if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
    return ErrorTypes.NETWORK;
  }
  
  if (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
    return ErrorTypes.TIMEOUT;
  }
  
  return ErrorTypes.UNEXPECTED;
}

/**
 * Logs the error based on environment configuration
 * @param {Object} errorInfo - Formatted error information
 * @param {Object} envConfig - Environment configuration
 */
function logError(errorInfo, envConfig) {
  if (envConfig.enableVerboseLogging) {
    console.error('ERROR DETAILS:', JSON.stringify(errorInfo, null, 2));
  } else {
    console.error(`Error [${errorInfo.type}]: ${errorInfo.message} (in ${errorInfo.context})`);
  }
  
  // In a real application, you might log to a file or service here
}

module.exports = {
  handleError,
  ErrorTypes
};
