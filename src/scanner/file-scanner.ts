// src/scanner/file-scanner.ts
import fs from 'fs-extra';
import path from 'path';
import pkg from 'glob';
const { glob } = pkg;
import config from '../config.js';

export interface FileInfo {
  path: string;
  relativePath: string;
  size: number;
  lastModified: Date;
  language: string;
  extension: string;
  content?: string;
}

export interface ScanOptions {
  maxDepth?: number;
  includePatterns?: string[];
  excludePatterns?: string[];
  maxFileSize?: number;
  includeContent?: boolean;
}

export async function scanDirectory(
  rootDir: string,
  options: ScanOptions = {}
): Promise<FileInfo[]> {
  // Merge default options with provided options
  const mergedOptions: Required<ScanOptions> = {
    maxDepth: options.maxDepth ?? config.scanner.maxDepth,
    includePatterns: options.includePatterns ?? config.scanner.defaultIncludePatterns,
    excludePatterns: options.excludePatterns ?? config.scanner.defaultExcludePatterns,
    maxFileSize: options.maxFileSize ?? config.scanner.maxFileSize,
    includeContent: options.includeContent ?? false
  };

  // Create a combined pattern for glob
  const includePattern = `{${mergedOptions.includePatterns.join(',')}}`;
  
  // Create depth pattern based on maxDepth
  const depthPattern = mergedOptions.maxDepth > 0 
    ? Array(mergedOptions.maxDepth).fill('*/').join('')
    : '**';
  
  // Combine patterns
  const pattern = path.join(rootDir, depthPattern, includePattern);
  
  // Find files
  const files = glob.sync(pattern, {
    ignore: mergedOptions.excludePatterns,
    nodir: true
  });
  
  // Process each file
  const filePromises = files.map(async (filePath: string) => {
    try {
      const stats = await fs.stat(filePath);
      
      // Skip if file is too large
      if (stats.size > mergedOptions.maxFileSize) {
        console.warn(`Skipping large file: ${filePath} (${stats.size} bytes)`);
        return null;
      }
      
      const extension = path.extname(filePath).slice(1);
      const language = getLanguageFromExtension(extension);
      const relativePath = path.relative(rootDir, filePath);
      
      const fileInfo: FileInfo = {
        path: filePath,
        relativePath,
        size: stats.size,
        lastModified: stats.mtime,
        language,
        extension
      };
      
      // Include content if requested
      if (mergedOptions.includeContent) {
        fileInfo.content = await fs.readFile(filePath, 'utf8');
      }
      
      return fileInfo;
    } catch (error) {
      console.error(`Error processing file ${filePath}:`, error);
      return null;
    }
  });
  
  // Wait for all promises and filter out nulls
  const fileInfos = await Promise.all(filePromises);
  return fileInfos.filter((fi): fi is FileInfo => fi !== null);
}

function getLanguageFromExtension(extension: string): string {
  const extensionMap: Record<string, string> = {
    js: 'javascript',
    jsx: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    py: 'python',
    java: 'java',
    go: 'go',
    rs: 'rust',
    c: 'c',
    cpp: 'cpp',
    cs: 'csharp',
    php: 'php',
    rb: 'ruby',
    swift: 'swift',
    kt: 'kotlin',
    r: 'r',
    scala: 'scala',
    sh: 'bash',
    html: 'html',
    css: 'css',
    scss: 'scss',
    less: 'less',
    json: 'json',
    md: 'markdown',
    yaml: 'yaml',
    yml: 'yaml',
    toml: 'toml',
    xml: 'xml'
  };
  
  return extensionMap[extension.toLowerCase()] || 'unknown';
}

export function isBinaryFile(fileInfo: FileInfo): boolean {
  // List of extensions that are likely to be binary files
  const binaryExtensions = [
    'exe', 'dll', 'so', 'dylib',
    'zip', 'tar', 'gz', 'xz', 'bz2',
    'jpg', 'jpeg', 'png', 'gif', 'bmp', 'ico', 'tiff',
    'mp3', 'mp4', 'wav', 'avi', 'mov', 'flv', 'mkv',
    'pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx'
  ];
  
  return binaryExtensions.includes(fileInfo.extension.toLowerCase());
}
