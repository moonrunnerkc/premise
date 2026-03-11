/**
 * Server configuration, loaded from environment variables.
 * Single source of truth for all config values.
 */

export interface PremiseConfig {
  readonly anthropicApiKey: string | undefined;
  readonly model: string;
  readonly logLevel: "debug" | "info" | "warn" | "error";
  readonly mockDir: string | undefined;
}

let cachedConfig: PremiseConfig | null = null;

export function getConfig(): PremiseConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const logLevel = (process.env["PREMISE_LOG_LEVEL"] ?? "info") as PremiseConfig["logLevel"];
  const validLevels = ["debug", "info", "warn", "error"] as const;
  if (!validLevels.includes(logLevel)) {
    throw new Error(
      `Invalid PREMISE_LOG_LEVEL "${logLevel}". Must be one of: ${validLevels.join(", ")}`
    );
  }

  const mockDir = process.env["PREMISE_MOCK_DIR"] || undefined;

  cachedConfig = {
    anthropicApiKey: process.env["ANTHROPIC_API_KEY"],
    model: process.env["PREMISE_MODEL"] ?? "claude-sonnet-4-20250514",
    logLevel,
    mockDir,
  };

  return cachedConfig;
}

/** Reset cached config (for testing) */
export function resetConfig(): void {
  cachedConfig = null;
}
