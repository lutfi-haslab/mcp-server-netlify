import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  CallToolResult,
  GetPromptResult,
  ReadResourceResult,
} from "@modelcontextprotocol/sdk/types.js";


export const setupMCPServer = (): McpServer => {

  const server = new McpServer(
    {
      name: "stateless-server",
      version: "1.0.0",
    },
    { capabilities: { logging: {} } }
  );

  // Register a prompt template that allows the server to
  // provide the context structure and (optionally) the variables
  // that should be placed inside of the prompt for client to fill in.
  server.prompt(
    "greeting-template",
    "A simple greeting prompt template",
    {
      name: z.string().describe("Name to include in greeting"),
    },
    async ({ name }): Promise<GetPromptResult> => {
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `Please greet ${name} in a friendly manner.`,
            },
          },
        ],
      };
    }
  );

  server.tool(
    "reverse-text",
    "Reverses a given string",
    {
      text: z.string().describe("The text to reverse"),
    },
    async ({ text }): Promise<CallToolResult> => {
      const reversed = text.split("").reverse().join("");
      return {
        content: [
          {
            type: "text",
            text: `Reversed text: ${reversed}`,
          },
        ],
      };
    }
  );

  server.tool(
    "generate-random-number",
    "Generates a random number between min and max",
    {
      min: z.number().default(0),
      max: z.number().default(100),
    },
    async ({ min, max }): Promise<CallToolResult> => {
      const rand = Math.floor(Math.random() * (max - min + 1)) + min;
      return {
        content: [
          {
            type: "text",
            text: `Generated random number: ${rand}`,
          },
        ],
      };
    }
  );

  server.tool(
    "echo-json",
    "Returns the exact input JSON for testing serialization",
    {
      input: z.record(z.any()).describe("JSON object to echo back"),
    },
    async ({ input }): Promise<CallToolResult> => {
      return {
        content: [
          {
            type: "text",
            text: `Echoed JSON: ${JSON.stringify(input, null, 2)}`,
          },
        ],
      };
    }
  );

  // Register a tool specifically for testing the ability
  // to resume notification streams to the client
  server.tool(
    "start-notification-stream",
    "Starts sending periodic notifications for testing resumability",
    {
      interval: z
        .number()
        .describe("Interval in milliseconds between notifications")
        .default(100),
      count: z
        .number()
        .describe("Number of notifications to send (0 for 100)")
        .default(10),
    },
    async (
      { interval, count },
      { sendNotification }
    ): Promise<CallToolResult> => {
      const sleep = (ms: number) =>
        new Promise((resolve) => setTimeout(resolve, ms));
      let counter = 0;

      while (count === 0 || counter < count) {
        counter++;
        try {
          await sendNotification({
            method: "notifications/message",
            params: {
              level: "info",
              data: `Periodic notification #${counter} at ${new Date().toISOString()}`,
            },
          });
        } catch (error) {
          console.error("Error sending notification:", error);
        }
        // Wait for the specified interval
        await sleep(interval);
      }

      return {
        content: [
          {
            type: "text",
            text: `Started sending periodic notifications every ${interval}ms`,
          },
        ],
      };
    }
  );

  // Create a resource that can be fetched by the client through
  // this MCP server.
  server.resource(
    "greeting-resource",
    "https://example.com/greetings/default",
    { mimeType: "text/plain" },
    async (): Promise<ReadResourceResult> => {
      return {
        contents: [
          {
            uri: "https://example.com/greetings/default",
            text: "Hello, world!",
          },
        ],
      };
    }
  );
  return server;
};
