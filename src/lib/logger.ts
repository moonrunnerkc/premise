/**
 * Structured logging for the Premise MCP server.
 *
 * Writes to stderr to avoid conflicting with MCP's stdio transport on stdout.
 * Log levels: debug < info < warn < error
 */

import { getConfig } from "./config.js";

type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function shouldLog(level: LogLevel): boolean {
  const config = getConfig();
  return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[config.logLevel];
}

function formatMessage(level: LogLevel, tool: string, message: string): string {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [${level.toUpperCase()}] [${tool}] ${message}`;
}

export function logDebug(tool: string, message: string): void {
  if (shouldLog("debug")) {
    process.stderr.write(formatMessage("debug", tool, message) + "\n");
  }
}

export function logInfo(tool: string, message: string): void {
  if (shouldLog("info")) {
    process.stderr.write(formatMessage("info", tool, message) + "\n");
  }
}

export function logWarn(tool: string, message: string): void {
  if (shouldLog("warn")) {
    process.stderr.write(formatMessage("warn", tool, message) + "\n");
  }
}

export function logError(tool: string, message: string): void {
  if (shouldLog("error")) {
    process.stderr.write(formatMessage("error", tool, message) + "\n");
  }
}
