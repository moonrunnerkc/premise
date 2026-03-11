#!/usr/bin/env node

/**
 * Entry point for the Premise MCP server.
 * Connects via stdio transport for use with Claude Desktop and other MCP clients.
 */

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { getConfig } from "./lib/config.js";
import { logError, logInfo } from "./lib/logger.js";
import { createPremiseServer } from "./server.js";

async function main(): Promise<void> {
  const server = createPremiseServer();
  const transport = new StdioServerTransport();

  logInfo("server", "Premise MCP server starting");
  const config = getConfig();
  logInfo(
    "server",
    `Mode: ${config.mockDir ? "mock" : "live"}; model: ${config.model}`
  );

  try {
    await server.connect(transport);
    logInfo("server", "Premise MCP server connected via stdio");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logError("server", `Failed to start: ${message}`);
    process.exit(1);
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`[FATAL] Premise server crashed: ${message}\n`);
  process.exit(1);
});
