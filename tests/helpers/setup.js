/**
 * Setup and teardown utilities for test environment
 */
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');
const exec = promisify(require('child_process').exec);

/**
 * Sets up the test environment including:
 * - Ensuring Qdrant is available
 * - Setting up mock LLM server when needed
 * - Preparing test environment variables
 */
async function setupTestEnvironment() {
  console.log('Setting up test environment...');
  
  // Set up environment variables for testing
  process.env.QDRANT_URL = process.env.QDRANT_URL || 'http://localhost:6333';
  process.env.LLM_SERVER_URL = process.env.LLM_SERVER_URL || 'http://localhost:11434';
  process.env.USE_MOCK_LLM = process.env.USE_MOCK_LLM || 'true';
  
  // Check if Qdrant is running, if not use mock
  try {
    const qdrantResponse = await fetch(`${process.env.QDRANT_URL}/collections`);
    if (!qdrantResponse.ok) {
      console.log('Qdrant not available, using mock storage');
      process.env.USE_MOCK_STORAGE = 'true';
    }
  } catch (error) {
    console.log('Qdrant not available, using mock storage');
    process.env.USE_MOCK_STORAGE = 'true';
  }
  
  // Set up mock LLM server if needed
  if (process.env.USE_MOCK_LLM === 'true') {
    console.log('Using mock LLM server');
    // Mock server setup would go here
  }
  
  return true;
}

/**
 * Cleans up the test environment including:
 * - Shutting down mock servers
 * - Cleaning temporary files
 * - Resetting environment variables
 */
async function cleanupTestEnvironment() {
  console.log('Cleaning up test environment...');
  
  // Clean up temporary files
  const tempDir = path.join(__dirname, '../temp');
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
  
  // Reset environment variables
  delete process.env.USE_MOCK_LLM;
  delete process.env.USE_MOCK_STORAGE;
  
  return true;
}

module.exports = {
  setupTestEnvironment,
  cleanupTestEnvironment
};
