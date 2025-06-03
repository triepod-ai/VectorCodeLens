#!/usr/bin/env node

/**
 * Verification script to check that all moved scripts are accessible
 * and paths are correctly configured after repository reorganization.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

console.log('🔍 Verifying VectorCodeLens script paths after reorganization...\n');

// List of scripts that should be in the scripts directory
const expectedScripts = [
  'check-dependencies.js',
  'check_ports.js',
  'diagnose.js',
  'mcp_test.js',
  'mock_services.js',
  'install-service.js',
  'quick_test.js',
  'simple_test.js',
  'test_code_analysis.js',
  'test_file_scanner.js',
  'test_import.js',
  'test_ollama.js',
  'test_ollama_models.js',
  'test_vector_code_lens.js',
  'debug_vector_code_lens.js',
  'file-scan-test.js'
];

// List of batch files that should be in the scripts directory
const expectedBatchFiles = [
  'build.bat',
  'check_ports.bat',
  'debug_run.bat',
  'package-install.bat',
  'quick_test.bat',
  'run_diagnosis.bat',
  'run_inspector.bat',
  'run_mcp_test.bat',
  'run_server.bat',
  'run_tests.bat',
  'run_with_mocks.bat',
  'start.bat',
  'start_mock_services.bat',
  'test_code_analysis.bat',
  'test_dependencies.bat',
  'test_import.bat',
  'test_ollama.bat',
  'test_ollama_models.bat'
];

let allGood = true;

// Check JavaScript files
console.log('📂 Checking JavaScript files in scripts directory:');
for (const script of expectedScripts) {
  const scriptPath = path.join(__dirname, script);
  if (fs.existsSync(scriptPath)) {
    console.log(`  ✅ ${script}`);
  } else {
    console.log(`  ❌ ${script} - NOT FOUND`);
    allGood = false;
  }
}

console.log('\n📂 Checking batch files in scripts directory:');
for (const batchFile of expectedBatchFiles) {
  const batchPath = path.join(__dirname, batchFile);
  if (fs.existsSync(batchPath)) {
    console.log(`  ✅ ${batchFile}`);
  } else {
    console.log(`  ❌ ${batchFile} - NOT FOUND`);
    allGood = false;
  }
}

// Check that essential project files are in the root
console.log('\n📂 Checking essential files in project root:');
const essentialFiles = [
  'package.json',
  'tsconfig.json',
  'README.md',
  'CLAUDE.md',
  '.env.example',
  '.gitignore'
];

for (const file of essentialFiles) {
  const filePath = path.join(projectRoot, file);
  if (fs.existsSync(filePath)) {
    console.log(`  ✅ ${file}`);
  } else {
    console.log(`  ❌ ${file} - NOT FOUND`);
    allGood = false;
  }
}

// Check important directories
console.log('\n📂 Checking directory structure:');
const expectedDirs = ['src', 'specs', 'docs', 'test', 'scripts'];

for (const dir of expectedDirs) {
  const dirPath = path.join(projectRoot, dir);
  if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
    console.log(`  ✅ ${dir}/`);
  } else {
    console.log(`  ❌ ${dir}/ - NOT FOUND`);
    allGood = false;
  }
}

// Final result
console.log('\n' + '='.repeat(50));
if (allGood) {
  console.log('🎉 All paths verified successfully!');
  console.log('📁 Repository reorganization completed correctly.');
  console.log('\nNext steps:');
  console.log('• npm install');
  console.log('• npm run build');
  console.log('• npm run check-deps');
} else {
  console.log('⚠️  Some issues found with file organization.');
  console.log('Please check the missing files listed above.');
  process.exit(1);
}