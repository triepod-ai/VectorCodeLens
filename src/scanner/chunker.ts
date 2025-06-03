// src/scanner/chunker.ts
import config from '../config.js';
import { FileInfo } from './file-scanner.js';

export interface CodeChunk {
  fileInfo: FileInfo;
  code: string;
  startLine: number;
  endLine: number;
  isFunction: boolean;
  isClass: boolean;
  identifier?: string;
}

export function chunkCodeFile(fileInfo: FileInfo): CodeChunk[] {
  const content = fileInfo.content;
  
  if (!content) {
    throw new Error(`File content not available for ${fileInfo.path}`);
  }
  
  // Split by lines
  const lines = content.split('\n');
  
  // For more advanced chunking, we'd identify functions, classes, etc.
  // For this simple version, we'll just chunk by lines
  const { chunkSize, overlapSize } = config.scanner;
  const chunks: CodeChunk[] = [];
  
  for (let i = 0; i < lines.length; i += chunkSize - overlapSize) {
    const startLine = i;
    const endLine = Math.min(i + chunkSize - 1, lines.length - 1);
    
    // Get the lines for this chunk
    const chunkLines = lines.slice(startLine, endLine + 1);
    
    chunks.push({
      fileInfo,
      code: chunkLines.join('\n'),
      startLine,
      endLine,
      isFunction: false, // We'd set this with proper parsing
      isClass: false, // We'd set this with proper parsing
    });
  }
  
  return chunks;
}

// For a more advanced implementation, we would parse the code
// to identify functions, classes, and other significant structures
export function identifyCodeStructures(chunk: CodeChunk): CodeChunk {
  // This would use language-specific parsers to identify code structures
  // For now, we'll return the chunk as is
  const languagePatterns: Record<string, RegExp[]> = {
    javascript: [
      // Function declarations
      /function\s+([a-zA-Z0-9_$]+)\s*\(/g,
      // Class declarations
      /class\s+([a-zA-Z0-9_$]+)/g,
      // Arrow functions assigned to variables
      /const\s+([a-zA-Z0-9_$]+)\s*=\s*\([^)]*\)\s*=>/g
    ],
    typescript: [
      // Same as JavaScript plus interfaces and types
      /function\s+([a-zA-Z0-9_$]+)\s*\(/g,
      /class\s+([a-zA-Z0-9_$]+)/g,
      /interface\s+([a-zA-Z0-9_$]+)/g,
      /type\s+([a-zA-Z0-9_$]+)\s*=/g
    ],
    python: [
      // Function declarations
      /def\s+([a-zA-Z0-9_]+)\s*\(/g,
      // Class declarations
      /class\s+([a-zA-Z0-9_]+)\s*(\(|:)/g
    ]
  };

  const patterns = languagePatterns[chunk.fileInfo.language] || [];
  
  // This is very basic detection and would be improved in a real implementation
  for (const pattern of patterns) {
    pattern.lastIndex = 0; // Reset regex state
    const match = pattern.exec(chunk.code);
    
    if (match) {
      if (pattern.source.includes('function') || pattern.source.includes('def')) {
        chunk.isFunction = true;
        chunk.identifier = match[1];
      } else if (pattern.source.includes('class')) {
        chunk.isClass = true;
        chunk.identifier = match[1];
      }
    }
  }
  
  return chunk;
}