@echo off
echo Running CodeAnalyzerMCP E2E Tests

echo.
echo --- Phase 1: Core Pipeline Tests ---
npx mocha tests/component/test-full-pipeline.js

echo.
echo --- Phase 2: Component-Specific Tests ---
npx mocha tests/component/test-scanning.js
npx mocha tests/component/test-analysis.js
npx mocha tests/component/test-storage.js
npx mocha tests/component/test-querying.js

echo.
echo --- Phase 3: Error Handling Tests ---
npx mocha tests/component/test-error-handling.js

echo.
echo --- Phase 3: Performance Tests ---
npx mocha tests/component/test-performance.js

echo.
echo All tests completed!
