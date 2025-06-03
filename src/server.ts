#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

// Import the tools defined in index.ts
import { codeAnalyzer, queryCodebase } from "./index.js";

// Define the tools map with explicit string keys
const tools: Record<string, typeof codeAnalyzer | typeof queryCodebase> = {
  'codeAnalyzer': codeAnalyzer,
  'queryCodebase': queryCodebase,
};

// Define a simple Zod schema for tool arguments (adjust as needed)
const ToolArgumentsSchema = z.record(z.any());

class VectorCodeLensServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        // Define server metadata
        name: "vector-code-lens-server",
        version: "0.1.0", // Consider reading from package.json
      },
      {
        capabilities: {
          tools: {}, // Indicate tool capability
        },
      }
    );

    this.setupHandlers();
  }

  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: Object.entries(tools).map(([name, tool]) => ({
          name: name,
          description: tool.description,
          inputSchema: tool.parameters, // Assuming parameters is the JSON schema
        })),
      };
    });

    // Handle tool execution
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const toolName = request.params.name;

      // Check if the toolName is a valid key in our tools map
      if (!(toolName in tools)) {
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${toolName}`
        );
      }

      // Now TypeScript knows tool is one of the defined tool types
      const tool = tools[toolName];

      if (!tool) { // This check might be redundant now but safe to keep
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${toolName}`
        );
      }

      try {
        // Validate arguments using the schema defined within the tool object
        // Assuming tool.parameters is a Zod schema or compatible structure
        // For simplicity, we'll parse broadly; enhance validation if needed
        const parsedArgs = ToolArgumentsSchema.parse(request.params.arguments);

        // Call the tool's handler
        const result = await tool.handler(parsedArgs);

        // Check if the handler returned an error object
        if (result && typeof result === 'object' && 'error' in result) {
           return {
             content: [{ type: "text", text: `Error executing tool ${toolName}: ${result.error}` }],
             isError: true,
           };
        }

        // Format successful result (assuming result is JSON-compatible)
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          isError: false,
        };

      } catch (error) {
         // Handle Zod validation errors
         if (error instanceof z.ZodError) {
           throw new McpError(
             ErrorCode.InvalidParams,
             `Invalid arguments for tool ${toolName}: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`
           );
         }
         // Handle errors from the tool handler itself
         const errorMessage = error instanceof Error ? error.message : String(error);
         console.error(`Error executing tool ${toolName}:`, error);
         // Return error in MCP format
         return {
           content: [{ type: "text", text: `Error executing tool ${toolName}: ${errorMessage}` }],
           isError: true,
         };
      }
    });
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("VectorCodeLens MCP Server running on stdio");
  }
}

// Start the server
const serverInstance = new VectorCodeLensServer();
serverInstance.run().catch((error) => {
  console.error("Fatal error starting VectorCodeLens MCP Server:", error);
  process.exit(1);
});
