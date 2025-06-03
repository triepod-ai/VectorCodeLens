// Simple test script to verify file scanner functionality
import fs from 'fs';
import path from 'path';
import pkg from 'glob';
const { glob } = pkg;

async function testScanner() {
  try {
    console.log('Testing file scanner directly...');
    const testDir = './test_files';
    const fullPath = path.resolve(testDir);
    
    console.log(`Scanning directory: ${testDir} (full path: ${fullPath})`);
    
    // Try different glob patterns
    const patterns = [
      path.join(testDir, '**/*.js'),      // relative with joining
      `${testDir}/**/*.js`,              // relative with template string
      `${testDir}/*.js`,                 // simpler pattern (no subdirectories)
      `test_files/*.js`,                 // hardcoded path
      './**/*.js',                       // all js files from current directory
      path.resolve(testDir, '**/*.js'),  // absolute path
      path.resolve(testDir, '*.js')      // absolute path, simple pattern
    ];
    
    patterns.forEach(pattern => {
      console.log(`\nTrying glob pattern: ${pattern}`);
      try {
        const files = glob.sync(pattern, { nodir: true });
        console.log(`Found ${files.length} files`);
        files.forEach(file => console.log(` - ${file}`));
      } catch (err) {
        console.error(`Error with pattern ${pattern}:`, err.message);
      }
    });
    
    // Manual filesystem listing for comparison
    console.log('\nDirectory lookup using fs module:');
    console.log(`Directory exists: ${fs.existsSync(testDir)}`);
    const dirFiles = fs.readdirSync(testDir);
    console.log(`Found ${dirFiles.length} files with fs.readdir`);
    dirFiles.forEach(file => {
      const filePath = path.join(testDir, file);
      const stats = fs.statSync(filePath);
      console.log(` - ${file} (size: ${stats.size} bytes)`);
    });
    
    console.log('\nTest completed!');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testScanner();
