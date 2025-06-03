# Claude Integration for VectorCodeLens

This document outlines the integration of Claude API with VectorCodeLens, along with best practices and important considerations.

## Configuration

Claude API can be configured using environment variables:

- `CLAUDE_API_KEY`: Your Anthropic API key
- `CLAUDE_API_URL`: Claude API endpoint (default: https://api.anthropic.com/v1/messages)
- `CLAUDE_MODEL`: Claude model to use (default: claude-3-5-sonnet-20240620)

You can also enable Ollama as a fallback option:

- `USE_OLLAMA_FALLBACK`: Set to 'true' to use Ollama when Claude API is not available
- `OLLAMA_URL`: Ollama API endpoint (default: http://localhost:11434)
- `OLLAMA_MODEL`: Ollama model to use (default: llama3)

## Best Practices

### 1. Prompt Engineering

When analyzing code with Claude:

- Include precise, well-formatted prompts
- Use code fence markers (```language) to properly format code
- Request structured JSON responses for consistency
- Provide explicit instructions for output format
- Use system prompts to set context

Example:
```javascript
const prompt = `
I need you to analyze this JavaScript code:

\`\`\`javascript
${codeSnippet}
\`\`\`

Provide your analysis in JSON format only. 
Include fields for: summary, purpose, complexity, and suggestions.
`;
```

### 2. Response Handling

Claude API responses follow this structure:
- The API returns a JSON object with `content` array
- Each item in the content array has a `type` (usually "text")
- Extract text content using the helper function:

```javascript
function extractTextFromResponse(response) {
  if (response.content && Array.isArray(response.content)) {
    let text = '';
    response.content.forEach(block => {
      if (block.type === 'text') {
        text += block.text;
      }
    });
    return text.trim();
  }
  return "Failed to extract text from response";
}
```

### 3. Error Handling

Implement robust error handling:
- Use retries with exponential backoff
- Provide fallback strategies (like Ollama)
- Extract and log detailed error messages
- Set appropriate timeouts

### 4. API Versioning

Always specify the Anthropic API version in your headers:
```javascript
headers: {
  'Content-Type': 'application/json',
  'x-api-key': finalConfig.claudeApiKey,
  'anthropic-version': '2023-06-01'
}
```

## Examples

### Code Analysis Example

```javascript
const result = await callClaudeApi({
  prompt: `Analyze this code: \`\`\`${language}\n${code}\n\`\`\``,
  format: 'json'
});

const analysis = processAnalysisResult(result);
console.log(`Code complexity: ${analysis.complexity}/10`);
```

### Query Summarization Example

```javascript
const summary = await generateResultsSummary(results, "How does error handling work?");
console.log(`Summary: ${summary}`);
```

## Performance Considerations

- Use Claude for complex code understanding tasks
- For embedding generation, simpler models may be more cost-effective
- Batch related requests when possible
- Consider caching responses for identical queries
- Monitor token usage for cost optimization

## Debugging

If you encounter issues:
1. Check API key and environment variables
2. Verify network connectivity to Anthropic API
3. Review logs for detailed error messages
4. Test with simple prompts to isolate issues
5. Verify JSON parsing logic

## Initialization

Always initialize both the code analyzer and query module at application startup:

```javascript
const analyzer = createAnalyzer();
const queryModule = createQueryModule();

await analyzer.init();
await queryModule.init();
```

## Future Improvements

- Implement streaming responses for large analyses
- Add support for multimodal analysis (code + diagrams)
- Enhance prompt templates with few-shot examples
- Explore Claude function calling for structured extraction