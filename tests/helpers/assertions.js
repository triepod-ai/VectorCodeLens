/**
 * Custom assertions for validating code analysis results
 */
const { expect } = require('chai');

/**
 * Validates code analysis results
 * @param {Object} analysis - Analysis results from CodeAnalysisModule
 * @param {string} language - Programming language of analyzed code
 */
function assertValidAnalysis(analysis, language) {
  expect(analysis).to.be.an('object');
  expect(analysis.summary).to.be.a('string').and.not.empty;
  expect(analysis.complexity).to.be.a('number').and.to.be.at.least(1);
  expect(analysis.purpose).to.be.a('string').and.not.empty;
  expect(analysis.language).to.equal(language);
  expect(analysis.entities).to.be.an('array');
  
  // Analysis should include some detected entities
  if (analysis.entities.length > 0) {
    const entity = analysis.entities[0];
    expect(entity).to.have.property('name');
    expect(entity).to.have.property('type');
    expect(entity).to.have.property('description');
  }
}

/**
 * Validates vector storage results
 * @param {Object} storageResult - Result from StorageModule
 */
function assertValidStorageResult(storageResult) {
  expect(storageResult).to.be.an('object');
  expect(storageResult.id).to.be.a('string').and.not.empty;
  expect(storageResult.status).to.equal('success');
  
  if (storageResult.vectorId) {
    expect(storageResult.vectorId).to.be.a('string').and.not.empty;
  }
}

/**
 * Validates query results
 * @param {Object} queryResult - Result from ClaudeQueryModule
 * @param {string} queryText - Original query text
 */
function assertValidQueryResult(queryResult, queryText) {
  expect(queryResult).to.be.an('object');
  expect(queryResult.query).to.equal(queryText);
  expect(queryResult.results).to.be.an('array');
  expect(queryResult.timing).to.be.an('object');
  expect(queryResult.timing.total).to.be.a('number').and.to.be.above(0);
  
  if (queryResult.results.length > 0) {
    const result = queryResult.results[0];
    expect(result).to.have.property('score');
    expect(result).to.have.property('content');
    expect(result.score).to.be.a('number').and.to.be.within(0, 1);
  }
}

module.exports = {
  assertValidAnalysis,
  assertValidStorageResult,
  assertValidQueryResult
};
