/**
 * Main entry point for the small JavaScript project
 * Used for testing the CodeAnalyzerMCP system
 */

const { processData } = require('./utils/data-processor');
const { handleError } = require('./utils/error-handler');
const config = require('./config');

/**
 * Initializes the application and processes data
 * @param {Object} options - Configuration options
 * @returns {Promise<Object>} - Processing results
 */
async function main(options = {}) {
  try {
    console.log('Starting application with options:', options);
    
    // Merge provided options with defaults
    const mergedOptions = {
      ...config.defaultOptions,
      ...options
    };
    
    // Process the data
    const results = await processData(mergedOptions.data, {
      format: mergedOptions.format,
      validate: mergedOptions.validate
    });
    
    console.log('Data processing completed successfully');
    return {
      success: true,
      results,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    // Handle any errors
    handleError(error, 'main');
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

// Export for use in other modules
module.exports = {
  main
};

// Run directly if called from command line
if (require.main === module) {
  const options = {
    data: process.argv[2] || 'default-data',
    format: process.argv[3] || 'json',
    validate: process.argv[4] !== 'false'
  };
  
  main(options)
    .then(result => console.log('Result:', result))
    .catch(err => console.error('Fatal error:', err));
}
