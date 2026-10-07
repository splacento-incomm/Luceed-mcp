import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { AppConfig } from "./config.js";
import { LuceedClient } from "./luceed/client.js";
import { registerTools } from "./tools/index.js";

export const SERVER_NAME = "luceed-mcp";
export const SERVER_VERSION = "1.0.0";

export function createServer(config: AppConfig): McpServer {
  const server = new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION,
  });

  const client = new LuceedClient(config);
  registerTools(server, client);
  return server;
}
