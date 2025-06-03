/**
 * Test environment cleanup helpers
 */
const { exec } = require('child_process');
const fs = require('fs-extra');
const path = require('path');

/**
 * Stop and remove Docker container
 * @param {string} containerId - Docker container ID or name
 * @returns {Promise<void>} - Resolves when container is removed
 */
async function stopContainer(containerId) {
  return new Promise((resolve, reject) => {
    exec(`docker stop ${containerId} && docker rm ${containerId}`, (error, stdout, stderr) => {
      if (error) {
        console.warn(`Warning: Failed to stop container ${containerId}: ${error.message}`);
        console.warn('You may need to manually remove the container.');
        resolve(); // Continue cleanup despite error
        return;
      }
      
      console.log(`Container ${containerId} stopped and removed`);
      resolve();
    });
  });
}

/**
 * Shutdown an HTTP server
 * @param {http.Server} server - HTTP server instance
 * @returns {Promise<void>} - Resolves when server is closed
 */
async function shutdownServer(server) {
  return new Promise((resolve, reject) => {
    if (!server) {
      resolve();
      return;
    }
    
    server.close((err) => {
      if (err) {
        console.warn(`Warning: Failed to close server: ${err.message}`);
        resolve(); // Continue cleanup despite error
        return;
      }
      
      console.log('HTTP server closed');
      resolve();
    });
  });
}

/**
 * Cleanup temporary data directory
 * @param {string} dirPath - Path to directory
 * @param {boolean} removeRoot - Whether to remove the root directory
 * @returns {Promise<void>} - Resolves when directory is cleaned
 */
async function cleanupDataDir(dirPath, removeRoot = false) {
  try {
    if (removeRoot) {
      await fs.remove(dirPath);
      console.log(`Removed directory: ${dirPath}`);
    } else {
      const entries = await fs.readdir(dirPath);
      
      for (const entry of entries) {
        const entryPath = path.join(dirPath, entry);
        await fs.remove(entryPath);
        console.log(`Removed: ${entryPath}`);
      }
    }
  } catch (error) {
    console.warn(`Warning: Failed to clean up directory ${dirPath}: ${error.message}`);
    // Continue cleanup despite error
  }
}

/**
 * Cleanup the test environment
 * @param {Object} env - Environment info from setupTestEnvironment
 * @param {Object} options - Cleanup options
 * @returns {Promise<void>} - Resolves when cleanup is complete
 */
async function cleanupTestEnvironment(env, {
  stopQdrant = true,
  stopLLM = true,
  cleanData = true,
  removeDataDir = false
} = {}) {
  console.log('Cleaning up test environment...');
  
  try {
    // Stop Qdrant container if we started it
    if (stopQdrant && env.services?.qdrant?.isNew && env.services?.qdrant?.containerId) {
      await stopContainer(env.services.qdrant.containerId);
    }
    
    // Stop mock LLM server if we started it
    if (stopLLM && env.services?.llm?.isNew && env.services?.llm?.server) {
      await shutdownServer(env.services.llm.server);
    }
    
    // Clean up test data
    if (cleanData && env.testDataDir) {
      await cleanupDataDir(env.testDataDir, removeDataDir);
    }
    
    console.log('Test environment cleanup complete');
  } catch (error) {
    console.error('Error during test environment cleanup:', error);
    throw error;
  }
}

/**
 * Reset Qdrant collections
 * @param {string} collectionName - Collection to reset
 * @param {Object} options - Reset options
 * @returns {Promise<void>} - Resolves when collection is reset
 */
async function resetQdrantCollection(collectionName, {
  host = '127.0.0.1',
  port = 6333,
  recreate = true,
  dimensions = 1536,
  distance = 'Cosine'
} = {}) {
  const fetch = require('node-fetch');
  
  try {
    // Delete collection if it exists
    try {
      await fetch(`http://${host}:${port}/collections/${collectionName}`, {
        method: 'DELETE'
      });
      console.log(`Deleted Qdrant collection: ${collectionName}`);
    } catch (error) {
      // Ignore error if collection doesn't exist
      console.log(`Collection ${collectionName} may not exist or could not be deleted`);
    }
    
    // Create collection if requested
    if (recreate) {
      const response = await fetch(`http://${host}:${port}/collections/${collectionName}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          vectors: {
            size: dimensions,
            distance
          }
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create collection: ${await response.text()}`);
      }
      
      console.log(`Created Qdrant collection: ${collectionName}`);
    }
  } catch (error) {
    console.error(`Error resetting Qdrant collection ${collectionName}:`, error);
    throw error;
  }
}

module.exports = {
  cleanupTestEnvironment,
  resetQdrantCollection,
  stopContainer,
  shutdownServer,
  cleanupDataDir
};
