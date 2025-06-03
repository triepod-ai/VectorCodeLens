/**
 * Configuration for the small JavaScript project
 * Contains default options and settings
 */

module.exports = {
  // Default options for the application
  defaultOptions: {
    data: 'sample-data',
    format: 'json',
    validate: true,
    timeout: 5000
  },
  
  // Environment-specific settings
  environments: {
    development: {
      logLevel: 'debug',
      enableVerboseLogging: true,
      mockExternalServices: true
    },
    test: {
      logLevel: 'info',
      enableVerboseLogging: false,
      mockExternalServices: true
    },
    production: {
      logLevel: 'error',
      enableVerboseLogging: false,
      mockExternalServices: false
    }
  },
  
  // Current environment
  currentEnvironment: process.env.NODE_ENV || 'development',
  
  // Helper function to get environment config
  getEnvironmentConfig() {
    return this.environments[this.currentEnvironment];
  }
};
