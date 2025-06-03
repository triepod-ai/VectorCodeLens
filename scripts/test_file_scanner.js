// Test File Scanner
const path = require('path');
const fs = require('fs');

// Log file setup
const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
const logFile = path.join('L:', 'source-repos', 'VectorCodeLens', 'logs', `file-scan-test-${timestamp}.log`);
const logStream = fs.createWriteStream(logFile, { flags: 'a' });

function log(message) {
  const timestamp = new Date().toISOString();
  const formattedMessage = `[${timestamp}] ${message}`;
  console.log(formattedMessage);
  logStream.write(formattedMessage + '\n');
}

async function testFileScanner() {
  try {
    log('Starting file scanner test...');
    
    const rootDir = path.resolve('L:/source-repos/VectorCodeLens/src');
    log(`Root directory: ${rootDir}`);
    log(`Directory exists: ${fs.existsSync(rootDir)}`);
    
    // Test direct listing
    log('Directory contents with fs.readdir:');
    fs.readdirSync(rootDir).forEach(file => {
      log(` - ${file}`);
    });
    
    // Check for .ts and .js files manually
    log('\nManually finding .ts and .js files:');
    let fileCount = 0;
    
    // Function to recursively search for files
    function searchFiles(dir, depth = 0) {
      if (depth > 5) return; // Limit recursion depth
      
      const items = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const item of items) {
        const itemPath = path.join(dir, item.name);
        
        if (item.isDirectory()) {
          searchFiles(itemPath, depth + 1);
        } else if (item.isFile()) {
          const ext = path.extname(item.name).toLowerCase();
          if (ext === '.ts' || ext === '.js') {
            log(` - ${itemPath}`);
            fileCount++;
          }
        }
      }
    }
    
    searchFiles(rootDir);
    log(`Total .ts and .js files found: ${fileCount}`);
    
    log('File scanner test completed');
  } catch (error) {
    log(`Error during test: ${error.message}`);
    log(error.stack);
  } finally {
    logStream.end();
  }
}

// Run the test
testFileScanner().catch(error => {
  log(`Unhandled error: ${error.message}`);
  log(error.stack);
  logStream.end();
});
