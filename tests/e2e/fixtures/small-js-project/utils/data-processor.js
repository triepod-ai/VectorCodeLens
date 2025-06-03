/**
 * Data processing utility functions
 * Handles various data transformations and validations
 */

/**
 * Processes input data according to specified options
 * @param {string|Object} data - Input data to process
 * @param {Object} options - Processing options
 * @returns {Promise<Object>} - Processed data
 */
async function processData(data, options = {}) {
  // Default options
  const { format = 'json', validate = true } = options;
  
  // Parse the data if it's a string
  let processedData = typeof data === 'string' ? parseData(data, format) : data;
  
  // Validate the data if requested
  if (validate) {
    validateData(processedData);
  }
  
  // Transform the data
  processedData = transformData(processedData);
  
  // Simulate some async processing
  await new Promise(resolve => setTimeout(resolve, 100));
  
  return {
    originalFormat: format,
    processed: processedData,
    timestamp: new Date().toISOString()
  };
}

/**
 * Parses string data into an object
 * @param {string} data - String data to parse
 * @param {string} format - Format of the data (json, csv, etc.)
 * @returns {Object} - Parsed data
 * @throws {Error} - If parsing fails
 */
function parseData(data, format) {
  try {
    switch (format.toLowerCase()) {
      case 'json':
        return JSON.parse(data);
      case 'csv':
        return parseCsv(data);
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  } catch (error) {
    throw new Error(`Failed to parse data: ${error.message}`);
  }
}

/**
 * Simple CSV parser (for demonstration purposes)
 * @param {string} data - CSV string
 * @returns {Array<Object>} - Parsed data
 */
function parseCsv(data) {
  const lines = data.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  
  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim());
    const row = {};
    
    headers.forEach((header, index) => {
      row[header] = values[index];
    });
    
    return row;
  });
}

/**
 * Validates the data structure
 * @param {Object} data - Data to validate
 * @throws {Error} - If validation fails
 */
function validateData(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('Data must be an object or array');
  }
  
  // Additional validation logic could go here
}

/**
 * Transforms the data (e.g., calculating derived values)
 * @param {Object} data - Data to transform
 * @returns {Object} - Transformed data
 */
function transformData(data) {
  // Just a simple transformation for demonstration
  if (Array.isArray(data)) {
    return data.map(item => ({
      ...item,
      processed: true
    }));
  }
  
  return {
    ...data,
    processed: true
  };
}

module.exports = {
  processData,
  parseData,
  validateData,
  transformData
};
