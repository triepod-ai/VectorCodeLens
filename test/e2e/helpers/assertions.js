/**
 * Custom assertions for testing CodeAnalyzerMCP
 * 
 * Provides specialized assertions for validating code analysis results
 */
const assert = require('assert');
const path = require('path');

/**
 * Asserts that an analysis result is valid
 * @param {Object} result - Analysis result from codeAnalyzer.handler
 * @returns {void}
 * @throws {AssertionError} - If assertion fails
 */
function assertValidAnalysisResult(result) {
  assert.ok(result, 'Analysis result should not be null');
  assert.strictEqual(typeof result, 'object', 'Analysis result should be an object');
  
  // Check required fields
  assert.ok('filesAnalyzed' in result, 'Analysis result should have filesAnalyzed field');
  assert.ok('chunksAnalyzed' in result, 'Analysis result should have chunksAnalyzed field');
  assert.ok('errors' in result, 'Analysis result should have errors field');
  
  // Check types
  assert.strictEqual(typeof result.filesAnalyzed, 'number', 'filesAnalyzed should be a number');
  assert.strictEqual(typeof result.chunksAnalyzed, 'number', 'chunksAnalyzed should be a number');
  assert.ok(Array.isArray(result.errors), 'errors should be an array');
  
  // Check if stats are included
  if (result.stats) {
    assert.strictEqual(typeof result.stats, 'object', 'stats should be an object');
  }
}

/**
 * Asserts that query result is valid
 * @param {Object} result - Query result from queryCodebase.handler
 * @returns {void}
 * @throws {AssertionError} - If assertion fails
 */
function assertValidQueryResult(result) {
  assert.ok(result, 'Query result should not be null');
  assert.strictEqual(typeof result, 'object', 'Query result should be an object');
  
  // Check required fields
  assert.ok('query' in result, 'Query result should have query field');
  assert.ok('matches' in result, 'Query result should have matches field');
  assert.ok('results' in result, 'Query result should have results field');
  assert.ok('executionTimeMs' in result, 'Query result should have executionTimeMs field');
  
  // Check types
  assert.strictEqual(typeof result.query, 'string', 'query should be a string');
  assert.strictEqual(typeof result.matches, 'number', 'matches should be a number');
  assert.ok(Array.isArray(result.results), 'results should be an array');
  assert.strictEqual(typeof result.executionTimeMs, 'number', 'executionTimeMs should be a number');
  
  // Check individual results if any
  if (result.results.length > 0) {
    const firstResult = result.results[0];
    assert.ok('filePath' in firstResult, 'Result should have filePath field');
    assert.ok('codeSnippet' in firstResult, 'Result should have codeSnippet field');
    assert.ok('summary' in firstResult, 'Result should have summary field');
  }
}

/**
 * Asserts that code was analyzed correctly
 * @param {Object} result - Analysis result from codeAnalyzer.handler
 * @param {Object} expectations - Expected values
 * @returns {void}
 * @throws {AssertionError} - If assertion fails
 */
function assertCodeAnalyzed(result, {
  minFilesAnalyzed = 1,
  minChunksAnalyzed = 1,
  maxErrors = 0,
  shouldHaveStats = true
} = {}) {
  assertValidAnalysisResult(result);
  
  // Check expected values
  assert.ok(
    result.filesAnalyzed >= minFilesAnalyzed,
    `Should have analyzed at least ${minFilesAnalyzed} files, got ${result.filesAnalyzed}`
  );
  
  assert.ok(
    result.chunksAnalyzed >= minChunksAnalyzed,
    `Should have analyzed at least ${minChunksAnalyzed} chunks, got ${result.chunksAnalyzed}`
  );
  
  assert.ok(
    result.errors.length <= maxErrors,
    `Should have at most ${maxErrors} errors, got ${result.errors.length}: ${result.errors.join(', ')}`
  );
  
  if (shouldHaveStats) {
    assert.ok(result.stats, 'Analysis result should include stats');
    assert.ok('totalPoints' in result.stats, 'Stats should include totalPoints');
    assert.ok(Array.isArray(result.stats.filesAnalyzed), 'Stats should include filesAnalyzed array');
  }
}

/**
 * Asserts that query found relevant results
 * @param {Object} result - Query result from queryCodebase.handler
 * @param {Object} expectations - Expected values
 * @returns {void}
 * @throws {AssertionError} - If assertion fails
 */
function assertQueryFound(result, {
  minMatches = 1,
  queryTerms = [],
  mustIncludeFile = null
} = {}) {
  assertValidQueryResult(result);
  
  // Check expected values
  assert.ok(
    result.matches >= minMatches,
    `Should have found at least ${minMatches} matches, got ${result.matches}`
  );
  
  // Check if results contain query terms
  if (queryTerms.length > 0 && result.results.length > 0) {
    const combinedText = result.results
      .map(r => `${r.codeSnippet} ${r.summary}`)
      .join(' ')
      .toLowerCase();
    
    for (const term of queryTerms) {
      assert.ok(
        combinedText.includes(term.toLowerCase()),
        `Results should contain the term "${term}"`
      );
    }
  }
  
  // Check if specific file is included
  if (mustIncludeFile && result.results.length > 0) {
    const normalizedMustInclude = path.normalize(mustIncludeFile).toLowerCase();
    const found = result.results.some(r => {
      const normalizedPath = path.normalize(r.filePath).toLowerCase();
      return normalizedPath.includes(normalizedMustInclude);
    });
    
    assert.ok(
      found,
      `Results should include a file matching "${mustIncludeFile}"`
    );
  }
}

/**
 * Asserts that a storage operation was successful
 * @param {Object} storageModule - Storage module instance
 * @param {string} collectionName - Collection name to check
 * @param {number} expectedPoints - Expected number of points
 * @returns {Promise<void>}
 * @throws {AssertionError} - If assertion fails
 */
async function assertStorageContains(storageModule, collectionName, expectedPoints) {
  assert.ok(storageModule, 'Storage module should not be null');
  
  const stats = await storageModule.getStats();
  
  assert.ok(stats, 'Storage stats should not be null');
  assert.ok('totalPoints' in stats, 'Stats should include totalPoints');
  assert.ok(Array.isArray(stats.filesAnalyzed), 'Stats should include filesAnalyzed array');
  
  assert.strictEqual(
    stats.totalPoints,
    expectedPoints,
    `Storage should contain ${expectedPoints} points, got ${stats.totalPoints}`
  );
}

module.exports = {
  assertValidAnalysisResult,
  assertValidQueryResult,
  assertCodeAnalyzed,
  assertQueryFound,
  assertStorageContains
};
