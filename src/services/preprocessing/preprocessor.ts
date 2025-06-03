// src/services/preprocessing/preprocessor.ts
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import crypto from 'crypto';
import { DEFAULT_EXCLUDE_PATTERNS, PreprocessorType } from './index.js';

const writeFileAsync = promisify(fs.writeFile);
const readFileAsync = promisify(fs.readFile);
const mkdirAsync = promisify(fs.mkdir);
const existsAsync = promisify(fs.exists);

/**
 * Configuration interface for the Preprocessor
 */
export interface PreprocessorConfig {
  excludePatterns?: string[];
  outputDir?: string;
  cacheResults?: boolean;
  maxFileSizeKb?: number;
  type?: PreprocessorType;
  includePatterns?: string[];
}

/**
 * Preprocessor service handles codebase preprocessing using external tools
 * like repomix to create a unified codebase file for analysis.
 * 
 * Following DeepView MCP patterns, this implementation focuses on:
 * 1. Simplified external preprocessing approach
 * 2. Progressive enhancement with feature flags
 * 3. Robust fallback mechanisms
 */
export class Preprocessor {
  private excludePatterns: string[];
  private includePatterns: string[];
  private outputDir: string;
  private cacheResults: boolean;
  private maxFileSizeKb: number;
  private type: PreprocessorType;
  
  constructor(config: PreprocessorConfig = {}) {
    // Apply default configuration with sensible defaults
    this.excludePatterns = config.excludePatterns || DEFAULT_EXCLUDE_PATTERNS;
    this.includePatterns = config.includePatterns || [
      '**/*.js', '**/*.ts', '**/*.py', '**/*.java',
      '**/*.jsx', '**/*.tsx', '**/*.go', '**/*.rs',
      '**/*.c', '**/*.cpp', '**/*.cs', '**/*.rb',
      '**/*.php', '**/*.html', '**/*.css', '**/*.scss'
    ];
    this.cacheResults = config.cacheResults !== undefined ? config.cacheResults : true;
    this.maxFileSizeKb = config.maxFileSizeKb || 1024; // Default 1MB max file size
    this.type = config.type || PreprocessorType.Basic;
    
    // Create output directory in the system temp directory
    const tempDir = process.env.TEMP || process.env.TMP || '/tmp';
    this.outputDir = config.outputDir || path.join(tempDir, 'vectorlens-preprocessed');
    
    // Ensure output directory exists
    this.ensureOutputDir();
  }
  
  /**
   * Ensure the output directory exists
   */
  private ensureOutputDir(): void {
    if (!fs.existsSync(this.outputDir)) {
      try {
        fs.mkdirSync(this.outputDir, { recursive: true });
      } catch (error) {
        console.warn(`Failed to create output directory: ${error instanceof Error ? error.message : String(error)}`);
        // Fall back to a different location if creation fails
        this.outputDir = path.join(process.cwd(), 'temp');
        if (!fs.existsSync(this.outputDir)) {
          fs.mkdirSync(this.outputDir, { recursive: true });
        }
      }
    }
  }
  
  /**
   * Process a codebase directory into a single file
   * Takes a codebase path and returns the path to the processed file
   * 
   * @param codebasePath Path to the codebase directory or file
   * @param forceReprocess Whether to force reprocessing even if cached version exists
   * @returns Path to the processed output file
   */
  async processCodebase(codebasePath: string, forceReprocess: boolean = false): Promise<string> {
    try {
      // Check if path exists
      if (!fs.existsSync(codebasePath)) {
        throw new Error(`Codebase path does not exist: ${codebasePath}`);
      }
      
      // Check if path is a directory or file
      const stats = fs.statSync(codebasePath);
      
      if (stats.isFile()) {
        // If already a file, either return it directly or make a copy
        if (this.isSupportedCodeFile(codebasePath)) {
          // For single code files, copy to output directory to maintain consistent interface
          const outputFileName = path.basename(codebasePath);
          const outputPath = path.join(this.outputDir, outputFileName);
          
          fs.copyFileSync(codebasePath, outputPath);
          return outputPath;
        }
        return codebasePath;
      }
      
      // Generate a consistent output file name based on the input path
      const outputFileName = this.generateOutputFileName(codebasePath);
      const outputPath = path.join(this.outputDir, outputFileName);
      
      // Check cache if enabled and not forcing reprocess
      if (this.cacheResults && !forceReprocess && fs.existsSync(outputPath)) {
        const codebaseStats = fs.statSync(codebasePath);
        const outputStats = fs.statSync(outputPath);
        
        // If the output file is newer than the codebase directory, reuse it
        if (outputStats.mtime > codebaseStats.mtime) {
          console.log(`Using cached preprocessed codebase: ${outputPath}`);
          return outputPath;
        }
      }
      
      console.log(`Processing codebase: ${codebasePath}`);
      
      // Enhanced selection logic for preprocessing method
      if (this.type === PreprocessorType.Advanced && this.isToolAvailable('npx')) {
        // Advanced processing with external tool (repomix)
        return await this.useRepomix(codebasePath, outputPath);
      } else {
        // Basic processing with internal logic
        return await this.concatenateFiles(codebasePath, outputPath);
      }
    } catch (error) {
      console.error('Error preprocessing codebase:', error);
      throw new Error(`Failed to preprocess codebase: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Check if a file is a supported code file
   */
  private isSupportedCodeFile(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    const supportedExtensions = [
      '.js', '.ts', '.py', '.java', '.jsx', '.tsx', '.go', '.rs',
      '.c', '.cpp', '.cs', '.rb', '.php', '.html', '.css', '.scss'
    ];
    
    return supportedExtensions.includes(ext);
  }
  
  /**
   * Use repomix for preprocessing if available
   * This is the advanced preprocessing approach using external tools
   * 
   * @param codebasePath Path to the codebase directory
   * @param outputPath Path to the output file
   * @returns Path to the processed output file
   */
  private async useRepomix(codebasePath: string, outputPath: string): Promise<string> {
    try {
      // Create a temporary config file for repomix
      const configPath = path.join(this.outputDir, 'repomix.config.json');
      
      // Enhanced repomix configuration
      const config = {
        include: this.includePatterns,
        exclude: this.excludePatterns,
        output: {
          format: 'xml',
          filename: path.basename(outputPath)
        },
        options: {
          maxFileSizeKb: this.maxFileSizeKb,
          includeMetadata: true,
          preserveStructure: true
        }
      };
      
      // Write config file
      await writeFileAsync(configPath, JSON.stringify(config, null, 2));
      
      // Run repomix with better error handling
      console.log(`Running repomix on ${codebasePath}`);
      try {
        execSync(`npx repomix --config "${configPath}" --cwd "${codebasePath}" --output-dir "${this.outputDir}"`, {
          stdio: 'pipe',
          timeout: 120000 // 2 minute timeout
        });
      } catch (execError) {
        // Get more detailed error information
        console.error(`repomix execution failed: ${execError instanceof Error ? execError.message : String(execError)}`);
        
        // Try alternate approach with global installation
        try {
          console.log('Trying alternative repomix installation...');
          execSync(`repomix --config "${configPath}" --cwd "${codebasePath}" --output-dir "${this.outputDir}"`, {
            stdio: 'pipe',
            timeout: 120000
          });
        } catch (altError) {
          // Both approaches failed, throw and let it fall back
          throw new Error('Both npx and global repomix installations failed');
        }
      }
      
      // Check if the output file was created
      if (!fs.existsSync(outputPath)) {
        throw new Error('repomix did not generate the expected output file');
      }
      
      console.log(`Successfully processed codebase with repomix: ${outputPath}`);
      return outputPath;
    } catch (error) {
      console.error('Error using repomix:', error);
      console.log('Falling back to simple concatenation method');
      
      // Fallback to concatenation
      return await this.concatenateFiles(codebasePath, outputPath);
    }
  }
  
  /**
   * Simple concatenation of code files as fallback
   * This is the basic preprocessing approach using internal logic
   * It creates a simple XML file with code content that can be easily processed
   * 
   * @param codebasePath Path to the codebase directory
   * @param outputPath Path to the output file
   * @returns Path to the processed output file
   */
  private async concatenateFiles(codebasePath: string, outputPath: string): Promise<string> {
    try {
      // Create a simple XML-like format that can be processed easily
      let output = '<?xml version="1.0" encoding="UTF-8"?>\n';
      output += `<codebase path="${codebasePath}" timestamp="${new Date().toISOString()}">\n`;
      output += `  <metadata>\n`;
      output += `    <processor>VectorCodeLens Basic Preprocessor</processor>\n`;
      output += `    <version>1.0.0</version>\n`;
      output += `  </metadata>\n`;
      
      // Track statistics
      let fileCount = 0;
      let totalSize = 0;
      let skippedFiles = 0;
      
      // Create a promise-based file walker
      const processFiles = new Promise<void>((resolve, reject) => {
        try {
          // Walk the directory and concatenate files
          this.walkDirectory(codebasePath, (filePath, relativePath) => {
            try {
              // Skip binary files and files matching exclude patterns
              if (this.shouldSkipFile(filePath, relativePath)) {
                skippedFiles++;
                return;
              }
              
              // Read file content with error handling
              const content = fs.readFileSync(filePath, 'utf-8');
              
              // Get file metadata
              const stats = fs.statSync(filePath);
              const extension = path.extname(filePath);
              const language = this.getLanguageFromExtension(extension);
              
              // Add file entry to the output
              output += `  <file path="${relativePath}" language="${language}" size="${stats.size}" lastModified="${stats.mtime.toISOString()}">\n`;
              output += `    <![CDATA[\n${content}\n]]>\n`;
              output += `  </file>\n`;
              
              // Update statistics
              fileCount++;
              totalSize += stats.size;
            } catch (error) {
              console.warn(`Error processing file ${filePath}:`, error);
            }
          });
          
          resolve();
        } catch (error) {
          reject(error);
        }
      });
      
      // Wait for file processing to complete
      await processFiles;
      
      // Add statistics to output
      output += `  <statistics>\n`;
      output += `    <filesProcessed>${fileCount}</filesProcessed>\n`;
      output += `    <filesSkipped>${skippedFiles}</filesSkipped>\n`;
      output += `    <totalSizeBytes>${totalSize}</totalSizeBytes>\n`;
      output += `  </statistics>\n`;
      output += '</codebase>';
      
      // Write output file
      await writeFileAsync(outputPath, output);
      
      console.log(`Successfully processed codebase with basic preprocessor: ${outputPath}`);
      console.log(`Processed ${fileCount} files, skipped ${skippedFiles} files`);
      
      return outputPath;
    } catch (error) {
      console.error('Error concatenating files:', error);
      throw new Error(`Failed to concatenate files: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Determine programming language from file extension
   */
  private getLanguageFromExtension(extension: string): string {
    const languageMap: Record<string, string> = {
      '.js': 'JavaScript',
      '.jsx': 'JavaScript',
      '.ts': 'TypeScript',
      '.tsx': 'TypeScript',
      '.py': 'Python',
      '.java': 'Java',
      '.c': 'C',
      '.cpp': 'C++',
      '.cs': 'C#',
      '.go': 'Go',
      '.rs': 'Rust',
      '.rb': 'Ruby',
      '.php': 'PHP',
      '.html': 'HTML',
      '.css': 'CSS',
      '.scss': 'SCSS',
      '.json': 'JSON',
      '.md': 'Markdown',
      '.sql': 'SQL',
      '.sh': 'Shell',
      '.bat': 'Batch',
      '.ps1': 'PowerShell'
    };
    
    return languageMap[extension.toLowerCase()] || 'Unknown';
  }
  
  /**
   * Walk directory and process each file
   * 
   * @param dirPath Directory to walk
   * @param callback Function to call for each file
   * @param basePath Base path for relative path calculation
   */
  private walkDirectory(
    dirPath: string, 
    callback: (filePath: string, relativePath: string) => void, 
    basePath: string = dirPath
  ): void {
    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        const relativePath = path.relative(basePath, fullPath);
        
        if (entry.isDirectory()) {
          // Skip directories matching exclude patterns
          if (this.shouldSkipDirectory(fullPath, relativePath)) {
            continue;
          }
          
          // Recursively walk subdirectories
          this.walkDirectory(fullPath, callback, basePath);
        } else if (entry.isFile()) {
          // Check include patterns first
          let includeFile = false;
          
          // If no include patterns specified, include all files
          if (this.includePatterns.length === 0) {
            includeFile = true;
          } else {
            // Check if file matches any include pattern
            for (const pattern of this.includePatterns) {
              if (this.matchesPattern(relativePath, pattern)) {
                includeFile = true;
                break;
              }
            }
          }
          
          // Skip if not matching include patterns
          if (!includeFile) {
            continue;
          }
          
          // Process files
          callback(fullPath, relativePath);
        }
      }
    } catch (error) {
      console.warn(`Error walking directory ${dirPath}:`, error);
    }
  }
  
  /**
   * Check if we should skip a file based on patterns and binary detection
   * 
   * @param filePath Full path to the file
   * @param relativePath Relative path from the base directory
   * @returns Whether the file should be skipped
   */
  private shouldSkipFile(filePath: string, relativePath: string): boolean {
    // Check exclude patterns
    for (const pattern of this.excludePatterns) {
      if (this.matchesPattern(relativePath, pattern)) {
        return true;
      }
    }
    
    // Skip files with certain extensions
    const skipExtensions = ['.exe', '.dll', '.so', '.o', '.obj', '.pyc', '.jar', '.war', '.ear', '.zip', '.tar', '.gz', 
                            '.bin', '.dat', '.db', '.sqlite', '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.ico', 
                            '.mp3', '.mp4', '.avi', '.mov', '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx'];
    
    if (skipExtensions.some(ext => filePath.toLowerCase().endsWith(ext))) {
      return true;
    }
    
    // Skip large files
    try {
      const stats = fs.statSync(filePath);
      if (stats.size > this.maxFileSizeKb * 1024) {
        return true;
      }
    } catch (error) {
      // If we can't stat the file, skip it
      return true;
    }
    
    // Simple binary file check
    try {
      // Read just the first 1KB to check for binary content
      const fd = fs.openSync(filePath, 'r');
      const buffer = Buffer.alloc(1024);
      const bytesRead = fs.readSync(fd, buffer, 0, 1024, 0);
      fs.closeSync(fd);
      
      // Check for null bytes which typically indicate binary content
      for (let i = 0; i < bytesRead; i++) {
        if (buffer[i] === 0) {
          return true;
        }
      }
    } catch (error) {
      // If we can't read the file, skip it
      return true;
    }
    
    return false;
  }
  
  /**
   * Check if we should skip a directory based on patterns
   * 
   * @param dirPath Full path to the directory
   * @param relativePath Relative path from the base directory
   * @returns Whether the directory should be skipped
   */
  private shouldSkipDirectory(dirPath: string, relativePath: string): boolean {
    // Skip common directories to exclude
    const skipDirs = [
      'node_modules', '.git', 'dist', 'build', '__pycache__', 
      'venv', '.venv', '.idea', '.vscode', 'coverage',
      'tmp', 'temp', 'target', 'bin', 'obj'
    ];
    
    const dirName = path.basename(dirPath);
    
    if (skipDirs.includes(dirName)) {
      return true;
    }
    
    // Check exclude patterns
    for (const pattern of this.excludePatterns) {
      if (this.matchesPattern(relativePath, pattern)) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Simple glob pattern matching
   * Converts a glob pattern to a regex and tests against it
   * 
   * @param testPath Path to test
   * @param pattern Glob pattern to match against
   * @returns Whether the path matches the pattern
   */
  private matchesPattern(testPath: string, pattern: string): boolean {
    // Normalize path separators
    testPath = testPath.replace(/\\/g, '/');
    
    // Convert glob pattern to regex
    let regexPattern = pattern
      .replace(/\\/g, '/') // Normalize separators
      .replace(/\./g, '\\.') // Escape dots
      .replace(/\?/g, '.') // ? matches a single character
      .replace(/\*\*/g, '__GLOBSTAR__') // Temporarily replace ** with a placeholder
      .replace(/\*/g, '[^/]*') // * matches anything except /
      .replace(/__GLOBSTAR__/g, '.*'); // ** matches anything including /
    
    // Ensure pattern matches the whole string
    if (!regexPattern.startsWith('^')) {
      regexPattern = '^' + regexPattern;
    }
    
    if (!regexPattern.endsWith('$')) {
      regexPattern = regexPattern + '$';
    }
    
    const regex = new RegExp(regexPattern);
    return regex.test(testPath);
  }
  
  /**
   * Generate a consistent output file name based on input path
   * Uses hashing to create a unique but reproducible filename
   * 
   * @param inputPath Path to the input directory or file
   * @returns Generated output filename
   */
  private generateOutputFileName(inputPath: string): string {
    // Create a hash of the absolute path
    const hash = crypto.createHash('md5').update(path.resolve(inputPath)).digest('hex').substring(0, 8);
    
    // Use the directory name as part of the file name
    const dirName = path.basename(inputPath).replace(/[^a-zA-Z0-9-_]/g, '_');
    
    // Append timestamp for uniqueness
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').substring(0, 14);
    
    return `${dirName}-${hash}-${timestamp}.xml`;
  }
  
  /**
   * Check if a command-line tool is available
   * 
   * @param command Command to check
   * @returns Whether the command is available
   */
  private isToolAvailable(command: string): boolean {
    try {
      execSync(`${command} --version`, { stdio: 'ignore', timeout: 5000 });
      return true;
    } catch (error) {
      return false;
    }
  }
  
  /**
   * Clean up old preprocessed files
   * Removes files older than the specified age in days
   * 
   * @param maxAgeDays Maximum age in days for files to keep
   */
  public async cleanupOldFiles(maxAgeDays: number = 7): Promise<void> {
    try {
      const files = fs.readdirSync(this.outputDir);
      const now = new Date().getTime();
      let cleanedCount = 0;
      
      for (const file of files) {
        const filePath = path.join(this.outputDir, file);
        
        try {
          const stats = fs.statSync(filePath);
          const fileAge = (now - stats.mtime.getTime()) / (1000 * 60 * 60 * 24);
          
          if (fileAge > maxAgeDays) {
            fs.unlinkSync(filePath);
            cleanedCount++;
          }
        } catch (error) {
          console.warn(`Error processing file during cleanup: ${filePath}`, error);
        }
      }
      
      console.log(`Cleaned up ${cleanedCount} old preprocessed files`);
    } catch (error) {
      console.warn(`Error cleaning up old files:`, error);
    }
  }
}
