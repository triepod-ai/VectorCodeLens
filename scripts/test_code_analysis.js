import { CodeAnalyzerController } from '../dist/controller.js';
import fs from 'fs';
import path from 'path';

// Create a temporary test file
function createTestFile() {
  const testDir = path.join(process.cwd(), 'test_temp');
  const testFilePath = path.join(testDir, 'test_code.js');
  
  // Create test directory if it doesn't exist
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }
  
  // Sample code to analyze
  const testCode = `
// A simple calculator function
function calculator(a, b, operation) {
  // Validate inputs
  if (typeof a !== 'number' || typeof b !== 'number') {
    throw new Error('Inputs must be numbers');
  }
  
  // Perform the requested operation
  switch (operation) {
    case 'add':
      return a + b;
    case 'subtract':
      return a - b;
    case 'multiply':
      return a * b;
    case 'divide':
      if (b === 0) {
        throw new Error('Division by zero');
      }
      return a / b;
    default:
      throw new Error('Unknown operation: ' + operation);
  }
}

// Export the calculator function
export default calculator;
`;

  // Write the test file
  fs.writeFileSync(testFilePath, testCode);
  
  return { testDir, testFilePath };
}

// Main function
async function main() {
  console.log('Creating test environment...');
  const { testDir, testFilePath } = createTestFile();
  console.log(`Test file created at: ${testFilePath}`);
  
  try {
    // Initialize the controller
    console.log('Initializing code analyzer...');
    const controller = new CodeAnalyzerController();
    
    // Analyze the test directory
    console.log('Analyzing test code...');
    const result = await controller.analyzeDirectory(testDir, {
      maxDepth: 1,
      maxFileSize: 10 * 1024 // 10KB
    });
    
    console.log('Analysis results:', JSON.stringify(result, null, 2));
    
    // Query the codebase
    console.log('Testing code query...');
    const queryResult = await controller.queryCodebase('What does this calculator function do?', { limit: 1 });
    
    console.log('Query results:', JSON.stringify(queryResult, null, 2));
    
    console.log('✅ Test completed successfully!');
  } catch (error) {
    console.error('Test failed with error:', error);
  } finally {
    // Clean up
    console.log('Cleaning up test environment...');
    try {
      fs.rmSync(testDir, { recursive: true, force: true });
      console.log('Test directory removed.');
    } catch (cleanupError) {
      console.error('Error during cleanup:', cleanupError);
    }
  }
}

// Run the main function
main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});