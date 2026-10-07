#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./config.js";
import { createServer } from "./server.js";
import { startHttpServer } from "./http.js";
import { ensureSshTunnel, stopSshTunnel } from "./ssh-tunnel.js";

async function main(): Promise<void> {
  const config = loadConfig();

  process.on("SIGINT", () => {
    stopSshTunnel();
    process.exit(0);
  });
  process.on("SIGTERM", () => {
    stopSshTunnel();
    process.exit(0);
  });

  await ensureSshTunnel(config);

  if (config.transport === "http") {
    await startHttpServer(config);
    return;
  }

  const server = createServer(config);
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("luceed-mcp running on stdio");
}

main().catch((err) => {
  console.error("Fatal:", err instanceof Error ? err.message : err);
  stopSshTunnel();
  process.exit(1);
});
