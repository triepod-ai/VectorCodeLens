# Lessons Learned: Debugging `test_code_analysis.bat`

This document outlines the steps taken and lessons learned while debugging the failing `test_code_analysis.bat` script for the VectorCodeLens project.

## Initial Problem

The test script failed with errors related to generating embeddings via the Ollama API.

## Debugging Steps & Findings

1.  **Initial Error (404 Not Found - `/api/embeddings`):**
    *   **Observation:** The script failed to connect to `http://localhost:11434/api/embeddings`.
    *   **Verification:** Confirmed the Ollama server was running (`ollama list`) and accessible at the base URL (`http://localhost:11434`).
    *   **Hypothesis:** The `/api/embeddings` endpoint path was incorrect for the running Ollama version.
    *   **Action:** Searched Ollama documentation/community issues for the correct embedding endpoint. Found suggestions for `/embeddings` and `/v1/embeddings`.
    *   **Result:** Trying `/embeddings` still resulted in 404. Trying `/v1/embeddings` changed the error.

2.  **Second Error (400 Bad Request - `/v1/embeddings`):**
    *   **Observation:** The `/v1/embeddings` endpoint responded, but with a "Bad Request" error.
    *   **Hypothesis:** The request payload format was incorrect for this endpoint, likely expecting an OpenAI-compatible format.
    *   **Action:** Searched for the expected request format for `/v1/embeddings`. Found that it expects `"input"` instead of `"prompt"`. Modified `src/storage/embedding.ts` to use `"input"` when the URL ends with `/v1/embeddings`.
    *   **Result:** The 400 error was resolved, leading to a new error.

3.  **Third Error (500 Internal Server Error - `/v1/embeddings`):**
    *   **Observation:** The server received the request correctly but failed internally when using the configured `gemma3:12b` model.
    *   **Hypothesis:** The issue might be specific to the `gemma3:12b` model's compatibility with the embedding endpoint or an internal Ollama issue with that model.
    *   **Action:** Switched the configured model in `src/config.ts` to `nomic-embed-text` as a test.
    *   **Result:** The 500 error was resolved, but a new error related to vector dimensions appeared.

4.  **Fourth Error (Qdrant Dimension Mismatch):**
    *   **Observation:** Qdrant reported a dimension mismatch: `expected dim: 1536 got 768`.
    *   **Hypothesis:** The `nomic-embed-text` model outputs 768 dimensions, while the Qdrant collection `code_analysis` was configured for 1536 dimensions.
    *   **Action 1 (Attempted):** Changed Qdrant dimension in `src/config.ts` to 768.
    *   **Feedback:** User indicated the database dimension should remain 1536.
    *   **Action 2:** Reverted Qdrant dimension to 1536. Searched for a 1536-dimension Ollama embedding model. Found `rjmalagon/gte-qwen2-1.5b-instruct-embed-f16`. Updated `src/config.ts` to use this model.
    *   **Result:** The dimension mismatch error was resolved.

5.  **Fifth Error (Unexpected Embedding Response Format):**
    *   **Observation:** The `/v1/embeddings` endpoint (with the new model) returned a successful response, but the format didn't match the code's expectation (`result.embedding`). The actual embedding was nested under `result.data[0].embedding`.
    *   **Hypothesis:** The response parsing logic in `src/storage/embedding.ts` needed to handle the OpenAI-compatible format returned by `/v1/embeddings`.
    *   **Action:** Updated `src/storage/embedding.ts` to check the URL and parse `result.data[0].embedding` if `/v1/embeddings` was used.
    *   **Result:** The embedding generation and parsing succeeded.

6.  **Final Success & Remaining Issue:**
    *   **Observation:** The test script completed successfully (`✅ Test completed successfully!`).
    *   **Remaining Issue:** The log still shows `Found 0 files to analyze`, indicating a potential problem with the file scanning logic in the test environment that needs separate investigation.

## Key Lessons

*   **API Endpoint Verification:** Always verify the exact API endpoint path required by the specific server version being used. Standard paths like `/api/embeddings` might not always apply. OpenAI-compatible endpoints like `/v1/embeddings` are common alternatives.
*   **API Request/Response Formats:** Different API endpoints (even on the same server) can expect different request payload structures (e.g., `"input"` vs. `"prompt"`) and return different response structures. Code must be adapted accordingly.
*   **Model/Database Dimension Consistency:** Ensure the output dimension of the chosen embedding model exactly matches the dimension configured in the vector database collection.
*   **Configuration Management:** Changes made directly to compiled files (in `dist/`) can be overwritten by the build process. Modify source files (`src/`) and rebuild for persistent changes.
*   **Runtime Checks:** Implement runtime checks (like verifying model existence or feature flags) to handle potential configuration issues gracefully. Ensure subsequent code paths respect the outcome of these checks.
*   **Iterative Debugging:** Address errors one step at a time. Resolving one error often reveals the next underlying issue.
