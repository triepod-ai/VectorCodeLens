/**
 * Code scanner module responsible for scanning directories and extracting code files
 */
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

const readFile = promisify(fs.readFile);
const stat = promisify(fs.stat);
const readdir = promisify(fs.readdir);

export interface ScannerConfig {
  maxFileSize?: number;
  maxDepth?: number;
  filePatterns?: string[];
  excludePatterns?: string[];
  chunkSize?: number;
  chunkOverlap?: number;
  detectStructures?: boolean;
}

export interface FileChunk {
  content: string;
  startLine: number;
  endLine: number;
  filePath: string;
}

export interface CodeStructure {
  type: string;
  name: string;
  startPos: number;
  signature: string;
  extends?: string;
}

export interface FileObject {
  path: string;
  size: number;
  content: string;
  language: string;
  chunks?: FileChunk[];
  structures?: CodeStructure[];
}

export interface Scanner {
  scanDirectory: (dirPath: string, depth?: number) => Promise<FileObject[]>;
  isExcluded: (filePath: string) => boolean;
  isMatchingFile: (fileName: string) => boolean;
  detectLanguage: (filePath: string) => string;
  chunkFile: (content: string, filePath: string) => FileChunk[];
  detectCodeStructures: (content: string, language: string) => CodeStructure[];
  config: ScannerConfig;
}

/**
 * Creates a new scanner with the specified configuration
 * @param config - Scanner configuration
 * @returns Scanner instance
 */
export function createScanner(config: ScannerConfig = {}): Scanner {
  const defaultConfig: ScannerConfig = {
    maxFileSize: 1024 * 1024, // 1MB
    maxDepth: 10,
    filePatterns: ['**/*.js', '**/*.ts', '**/*.py', '**/*.jsx', '**/*.tsx'],
    excludePatterns: ['**/node_modules/**', '**/.git/**', '**/dist/**', '**/build/**', '**/__pycache__/**'],
    chunkSize: 1000, // lines
    chunkOverlap: 50, // lines
    detectStructures: true
  };

  const finalConfig: ScannerConfig = { ...defaultConfig, ...config };

  /**
   * Scans a directory recursively for code files
   * @param dirPath - Path to directory
   * @param depth - Current recursion depth
   * @returns Array of file objects
   */
  async function scanDirectory(dirPath: string, depth = 0): Promise<FileObject[]> {
    if (depth > (finalConfig.maxDepth || 10)) {
      return [];
    }

    const entries = await readdir(dirPath, { withFileTypes: true });
    let results: FileObject[] = [];

    for (const entry of entries) {
      const entryPath = path.join(dirPath, entry.name);
      
      // Skip excluded patterns
      if (isExcluded(entryPath)) {
        continue;
      }

      if (entry.isDirectory()) {
        const subResults = await scanDirectory(entryPath, depth + 1);
        results = results.concat(subResults);
      } else if (entry.isFile() && isMatchingFile(entry.name)) {
        const fileStat = await stat(entryPath);
        
        if (fileStat.size <= (finalConfig.maxFileSize || 1024 * 1024)) {
          const fileContent = await readFile(entryPath, 'utf8');
          const fileObj: FileObject = {
            path: entryPath,
            size: fileStat.size,
            content: fileContent,
            language: detectLanguage(entryPath)
          };
          
          if ((finalConfig.chunkSize || 0) > 0) {
            fileObj.chunks = chunkFile(fileContent, entryPath);
          }
          
          if (finalConfig.detectStructures) {
            fileObj.structures = detectCodeStructures(fileContent, fileObj.language);
          }
          
          results.push(fileObj);
        }
      }
    }

    return results;
  }

  /**
   * Checks if a file path matches the exclude patterns
   * @param filePath - Path to check
   * @returns True if excluded
   */
  function isExcluded(filePath: string): boolean {
    return (finalConfig.excludePatterns || []).some(pattern => {
      // Convert glob pattern to regex
      const regexPattern = pattern
        .replace(/\./g, '\\.') // Escape dots
        .replace(/\*\*/g, '.*') // ** matches any path
        .replace(/\*/g, '[^/]*'); // * matches any character except path separator
      
      const regex = new RegExp(regexPattern);
      return regex.test(filePath);
    });
  }

  /**
   * Checks if a file name matches the file patterns
   * @param fileName - File name to check
   * @returns True if matching
   */
  function isMatchingFile(fileName: string): boolean {
    return (finalConfig.filePatterns || []).some(pattern => {
      // Extract file extension from pattern
      const extMatch = pattern.match(/\*(\.[a-zA-Z0-9]+)$/);
      if (extMatch) {
        return fileName.endsWith(extMatch[1]);
      }
      return false;
    });
  }

  /**
   * Detects the programming language from file extension
   * @param filePath - Path to file
   * @returns Detected language
   */
  function detectLanguage(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const langMap: Record<string, string> = {
      '.js': 'JavaScript',
      '.jsx': 'JavaScript',
      '.ts': 'TypeScript',
      '.tsx': 'TypeScript',
      '.py': 'Python',
      '.rb': 'Ruby',
      '.java': 'Java',
      '.cs': 'C#',
      '.c': 'C',
      '.cpp': 'C++',
      '.go': 'Go',
      '.php': 'PHP',
      '.rs': 'Rust',
      '.swift': 'Swift',
      '.kt': 'Kotlin',
      '.scala': 'Scala'
    };
    
    return langMap[ext] || 'Unknown';
  }

  /**
   * Chunks a file into smaller pieces
   * @param content - File content
   * @param filePath - Path to file
   * @returns Array of chunks
   */
  function chunkFile(content: string, filePath: string): FileChunk[] {
    const lines = content.split('\n');
    const chunks: FileChunk[] = [];
    const chunkSize = finalConfig.chunkSize || 1000;
    const chunkOverlap = finalConfig.chunkOverlap || 50;
    
    for (let i = 0; i < lines.length; i += chunkSize - chunkOverlap) {
      const chunkLines = lines.slice(i, i + chunkSize);
      const chunkContent = chunkLines.join('\n');
      
      chunks.push({
        content: chunkContent,
        startLine: i,
        endLine: i + chunkLines.length - 1,
        filePath
      });
      
      if (i + chunkSize >= lines.length) {
        break;
      }
    }
    
    return chunks;
  }

  /**
   * Detects code structures like functions and classes
   * @param content - File content
   * @param language - Programming language
   * @returns Array of detected structures
   */
  function detectCodeStructures(content: string, language: string): CodeStructure[] {
    const structures: CodeStructure[] = [];
    
    // Simple regex-based detection
    if (language === 'JavaScript' || language === 'TypeScript') {
      // Function declarations
      const functionRegex = /function\s+([a-zA-Z0-9_$]+)\s*\([^)]*\)/g;
      let match;
      while ((match = functionRegex.exec(content)) !== null) {
        structures.push({
          type: 'function',
          name: match[1],
          startPos: match.index,
          signature: match[0]
        });
      }
      
      // Arrow functions with identifiers
      const arrowFunctionRegex = /const\s+([a-zA-Z0-9_$]+)\s*=\s*(\([^)]*\)|[a-zA-Z0-9_$]+)\s*=>/g;
      while ((match = arrowFunctionRegex.exec(content)) !== null) {
        structures.push({
          type: 'function',
          name: match[1],
          startPos: match.index,
          signature: match[0]
        });
      }
      
      // Classes
      const classRegex = /class\s+([a-zA-Z0-9_$]+)(?:\s+extends\s+([a-zA-Z0-9_$.]+))?\s*\{/g;
      while ((match = classRegex.exec(content)) !== null) {
        structures.push({
          type: 'class',
          name: match[1],
          extends: match[2],
          startPos: match.index,
          signature: match[0]
        });
      }
    } else if (language === 'Python') {
      // Python functions
      const functionRegex = /def\s+([a-zA-Z0-9_]+)\s*\([^)]*\):/g;
      let match;
      while ((match = functionRegex.exec(content)) !== null) {
        structures.push({
          type: 'function',
          name: match[1],
          startPos: match.index,
          signature: match[0]
        });
      }
      
      // Python classes
      const classRegex = /class\s+([a-zA-Z0-9_]+)(?:\s*\(\s*([a-zA-Z0-9_, ]+)\s*\))?\s*:/g;
      while ((match = classRegex.exec(content)) !== null) {
        structures.push({
          type: 'class',
          name: match[1],
          extends: match[2],
          startPos: match.index,
          signature: match[0]
        });
      }
    }
    
    return structures;
  }

  return {
    scanDirectory,
    isExcluded,
    isMatchingFile,
    detectLanguage,
    chunkFile,
    detectCodeStructures,
    config: finalConfig
  };
}
