/**
 * Component-specific tests for Code Scanner Module
 */
const { describe, it, before, after } = require('mocha');
const { expect } = require('chai');
const path = require('path');
const fs = require('fs');

// Import helpers
const { setupTestEnvironment, cleanupTestEnvironment } = require('../helpers/setup');
const { createScanner } = require('../../src/codeScannerModule');

describe('Code Scanner Module Tests', () => {
  let scanner;
  const testFixturesPath = path.join(__dirname, '../fixtures');
  
  before(async () => {
    await setupTestEnvironment();
    scanner = createScanner({
      maxFileSize: 1024 * 100, // 100KB
      maxDepth: 5,
      filePatterns: ['**/*.js', '**/*.ts', '**/*.py'],
      excludePatterns: ['**/node_modules/**', '**/__pycache__/**', '**/*.test.*']
    });
    
    // Set up test fixtures
    await setupTestFixtures();
  });
  
  after(async () => {
    await cleanupTestEnvironment();
    await cleanupTestFixtures();
  });
  
  // Helper function to set up test fixtures
  async function setupTestFixtures() {
    // Create JS project fixture
    const jsProjectPath = path.join(testFixturesPath, 'js-project');
    if (!fs.existsSync(jsProjectPath)) {
      fs.mkdirSync(jsProjectPath, { recursive: true });
      
      // Create index.js
      fs.writeFileSync(path.join(jsProjectPath, 'index.js'), `
        const utils = require('./utils');
        
        function main() {
          console.log('Hello from JS project!');
          console.log('2 + 3 =', utils.add(2, 3));
        }
        
        main();
      `);
      
      // Create utils.js
      fs.writeFileSync(path.join(jsProjectPath, 'utils.js'), `
        function add(a, b) {
          return a + b;
        }
        
        function subtract(a, b) {
          return a - b;
        }
        
        module.exports = { add, subtract };
      `);
    }
    
    // Create TS project fixture
    const tsProjectPath = path.join(testFixturesPath, 'ts-project');
    if (!fs.existsSync(tsProjectPath)) {
      fs.mkdirSync(tsProjectPath, { recursive: true });
      
      // Create interfaces.ts
      fs.writeFileSync(path.join(tsProjectPath, 'interfaces.ts'), `
        export interface User {
          id: number;
          name: string;
          email: string;
        }
        
        export interface Post {
          id: number;
          title: string;
          content: string;
          authorId: number;
        }
      `);
      
      // Create index.ts
      fs.writeFileSync(path.join(tsProjectPath, 'index.ts'), `
        import { User, Post } from './interfaces';
        
        class UserService {
          private users: User[] = [];
          
          constructor() {
            console.log('UserService initialized');
          }
          
          addUser(name: string, email: string): User {
            const id = this.users.length + 1;
            const user: User = { id, name, email };
            this.users.push(user);
            return user;
          }
          
          getUser(id: number): User | undefined {
            return this.users.find(user => user.id === id);
          }
        }
        
        const service = new UserService();
        console.log(service.addUser('John Doe', 'john@example.com'));
      `);
    }
    
    // Create Python project fixture
    const pyProjectPath = path.join(testFixturesPath, 'py-project');
    if (!fs.existsSync(pyProjectPath)) {
      fs.mkdirSync(pyProjectPath, { recursive: true });
      
      // Create main.py
      fs.writeFileSync(path.join(pyProjectPath, 'main.py'), `
        from utils import calculate_area
        
        def main():
            print("Hello from Python project!")
            radius = 5
            print(f"Area of circle with radius {radius}: {calculate_area(radius)}")
        
        if __name__ == "__main__":
            main()
      `);
      
      // Create utils.py
      fs.writeFileSync(path.join(pyProjectPath, 'utils.py'), `
        import math
        
        def calculate_area(radius):
            """Calculate the area of a circle with the given radius."""
            return math.pi * radius ** 2
        
        def calculate_circumference(radius):
            """Calculate the circumference of a circle with the given radius."""
            return 2 * math.pi * radius
      `);
    }
  }
  
  // Helper function to clean up test fixtures
  async function cleanupTestFixtures() {
    // We'll keep the fixtures for now for other tests
    // If you want to clean up, uncomment the following:
    /*
    if (fs.existsSync(testFixturesPath)) {
      fs.rmSync(testFixturesPath, { recursive: true, force: true });
    }
    */
  }
  
  it('should scan JavaScript project and find all JS files', async () => {
    const jsProjectPath = path.join(testFixturesPath, 'js-project');
    const files = await scanner.scanDirectory(jsProjectPath);
    
    expect(files).to.be.an('array');
    expect(files.length).to.be.greaterThan(0);
    expect(files.every(file => file.path.endsWith('.js'))).to.be.true;
    
    // Verify important files were found
    const fileNames = files.map(f => path.basename(f.path));
    expect(fileNames).to.include('index.js');
    expect(fileNames).to.include('utils.js');
  });
  
  it('should scan TypeScript project and find all TS files', async () => {
    const tsProjectPath = path.join(testFixturesPath, 'ts-project');
    const files = await scanner.scanDirectory(tsProjectPath);
    
    expect(files).to.be.an('array');
    expect(files.length).to.be.greaterThan(0);
    expect(files.every(file => file.path.endsWith('.ts'))).to.be.true;
    
    // Verify important files were found
    const fileNames = files.map(f => path.basename(f.path));
    expect(fileNames).to.include('index.ts');
    expect(fileNames).to.include('interfaces.ts');
  });
  
  it('should scan Python project and find all Python files', async () => {
    const pyProjectPath = path.join(testFixturesPath, 'py-project');
    const files = await scanner.scanDirectory(pyProjectPath);
    
    expect(files).to.be.an('array');
    expect(files.length).to.be.greaterThan(0);
    expect(files.every(file => file.path.endsWith('.py'))).to.be.true;
    
    // Verify important files were found
    const fileNames = files.map(f => path.basename(f.path));
    expect(fileNames).to.include('main.py');
    expect(fileNames).to.include('utils.py');
  });
  
  it('should respect file pattern filters', async () => {
    const customScanner = createScanner({
      maxFileSize: 1024 * 100,
      maxDepth: 5,
      filePatterns: ['**/*.js'], // Only JS files
      excludePatterns: ['**/node_modules/**', '**/__pycache__/**']
    });
    
    // Should find JS files but not TS or PY files
    const jsFiles = await customScanner.scanDirectory(path.join(testFixturesPath, 'js-project'));
    expect(jsFiles.length).to.be.greaterThan(0);
    
    const tsFiles = await customScanner.scanDirectory(path.join(testFixturesPath, 'ts-project'));
    // Should find no TS files as we're only scanning for JS
    expect(tsFiles.length).to.equal(0);
  });
  
  it('should respect exclude patterns', async () => {
    const jsProjectPath = path.join(testFixturesPath, 'js-project');
    
    // Create a test file in a directory that should be excluded
    const testDir = path.join(jsProjectPath, 'node_modules');
    const testFile = path.join(testDir, 'test.js');
    
    // Ensure directory exists
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    
    // Create test file
    fs.writeFileSync(testFile, 'console.log("This should be excluded");');
    
    const files = await scanner.scanDirectory(jsProjectPath);
    
    // Verify no files from node_modules are included
    expect(files.some(file => file.path.includes('node_modules'))).to.be.false;
    
    // Clean up
    if (fs.existsSync(testFile)) {
      fs.unlinkSync(testFile);
    }
    if (fs.existsSync(testDir)) {
      fs.rmdirSync(testDir);
    }
  });
  
  it('should detect code structures like functions and classes', async () => {
    const files = await scanner.scanDirectory(path.join(testFixturesPath, 'js-project'));
    
    // Find the utils.js file which should have function structures
    const utilsFile = files.find(f => path.basename(f.path) === 'utils.js');
    
    expect(utilsFile).to.exist;
    expect(utilsFile.structures).to.be.an('array');
    expect(utilsFile.structures.length).to.be.at.least(2); // add and subtract functions
    
    // Verify function detection
    const addFunction = utilsFile.structures.find(s => s.name === 'add');
    expect(addFunction).to.exist;
    expect(addFunction.type).to.equal('function');
    
    // Check TypeScript class detection
    const tsFiles = await scanner.scanDirectory(path.join(testFixturesPath, 'ts-project'));
    const indexTs = tsFiles.find(f => path.basename(f.path) === 'index.ts');
    
    expect(indexTs).to.exist;
    expect(indexTs.structures).to.be.an('array');
    
    // Find UserService class
    const userServiceClass = indexTs.structures.find(s => s.name === 'UserService');
    expect(userServiceClass).to.exist;
    expect(userServiceClass.type).to.equal('class');
  });
  
  it('should properly chunk large files', async () => {
    const jsProjectPath = path.join(testFixturesPath, 'js-project');
    const largeFilePath = path.join(jsProjectPath, 'large.js');
    
    // Create a large JavaScript file
    const largeContent = Array(200).fill('// This is a comment line\nfunction dummyFunction() { return true; }\n').join('');
    fs.writeFileSync(largeFilePath, largeContent);
    
    // Create a scanner with small chunk size for testing
    const chunkedScanner = createScanner({
      maxFileSize: 1024 * 1024,
      filePatterns: ['**/*.js'],
      chunkSize: 50, // Small chunk size (lines)
      chunkOverlap: 10
    });
    
    const files = await chunkedScanner.scanDirectory(jsProjectPath);
    const largeFile = files.find(f => path.basename(f.path) === 'large.js');
    
    expect(largeFile).to.exist;
    expect(largeFile.chunks).to.be.an('array');
    expect(largeFile.chunks.length).to.be.greaterThan(1);
    
    // Verify chunk overlap works correctly
    for (let i = 1; i < largeFile.chunks.length; i++) {
      const prevChunk = largeFile.chunks[i-1];
      const currChunk = largeFile.chunks[i];
      
      // The end lines of the previous chunk should overlap with start lines of current chunk
      expect(prevChunk.endLine).to.be.greaterThan(currChunk.startLine);
    }
    
    // Clean up
    if (fs.existsSync(largeFilePath)) {
      fs.unlinkSync(largeFilePath);
    }
  });
});
