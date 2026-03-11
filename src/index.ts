#!/usr/bin/env node

/**
 * Entry point for the Premise MCP server.
 * Connects via stdio transport for use with Claude Desktop and other MCP clients.
 */

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createPremiseServer } from "./server.js";
import { logInfo, logError } from "./lib/logger.js";

async function main(): Promise<void> {
  const server = createPremiseServer();
  const transport = new StdioServerTransport();

  logInfo("server", "Premise MCP server starting");

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
