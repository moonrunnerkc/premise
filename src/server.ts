/**
 * McpServer instance with all 7 Premise tools registered.
 *
 * Each tool uses Zod schemas for input validation (handled by the MCP SDK)
 * and delegates to its handler function for the actual logic.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  AnalyzeInputSchema,
  PositionInputSchema,
  ScenariosInputSchema,
  SimStartInputSchema,
  SimRoundInputSchema,
  SimEndInputSchema,
  DebriefInputSchema,
} from "./types/schemas.js";
import type {
  AnalyzeInput,
  PositionInput,
  ScenariosInput,
  SimStartInput,
  SimRoundInput,
  SimEndInput,
  DebriefInput,
} from "./types/schemas.js";
import { handleAnalyze } from "./tools/analyze.js";
import { handlePosition } from "./tools/position.js";
import { handleScenarios } from "./tools/scenarios.js";
import { handleSimStart } from "./tools/sim-start.js";
import { handleSimRound } from "./tools/sim-round.js";
import { handleSimEnd } from "./tools/sim-end.js";
import { handleDebrief } from "./tools/debrief.js";

export function createPremiseServer(): McpServer {
  const server = new McpServer({
    name: "premise",
    version: "0.1.0",
  });

  // ─── premise-analyze ───
  server.registerTool(
    "premise-analyze",
    {
      title: "Analyze Negotiation",
      description:
        "Parse a free-text negotiation description into structured metadata: " +
        "parties, stakes, timeline, power dynamics, and emotional factors. " +
        "Returns a negotiation_id that ties all subsequent tool calls together.",
      inputSchema: AnalyzeInputSchema,
    },
    async ({ context, counterparty_emails, negotiation_type }: AnalyzeInput) => {
      return handleAnalyze({ context, counterparty_emails, negotiation_type });
    }
  );

  // ─── premise-position ───
  server.registerTool(
    "premise-position",
    {
      title: "Map Positions",
      description:
        "Build a complete position map for both sides of the negotiation: " +
        "your position, their estimated position, ZOPA analysis, leverage points, " +
        "risk factors, and tradeable issues. Requires output from premise-analyze.",
      inputSchema: PositionInputSchema,
    },
    async (input: PositionInput) => {
      return handlePosition(input);
    }
  );

  // ─── premise-scenarios ───
  server.registerTool(
    "premise-scenarios",
    {
      title: "Generate Scenarios",
      description:
        "Generate a decision tree of anticipated counterparty moves with " +
        "recommended responses. Each branch is specific to this negotiation context. " +
        "Requires output from both premise-analyze and premise-position.",
      inputSchema: ScenariosInputSchema,
    },
    async (input: ScenariosInput) => {
      return handleScenarios(input);
    }
  );

  // ─── premise-sim-start ───
  server.registerTool(
    "premise-sim-start",
    {
      title: "Start Simulation",
      description:
        "Initialize an interactive adversarial simulation session. " +
        "Provide your opening line and the system returns the counterparty's response, " +
        "a tactical coaching note, and an opaque session_state to pass to subsequent rounds.",
      inputSchema: SimStartInputSchema,
    },
    async (input: SimStartInput) => {
      return handleSimStart(input);
    }
  );

  // ─── premise-sim-round ───
  server.registerTool(
    "premise-sim-round",
    {
      title: "Simulation Round",
      description:
        "Process one round of the interactive simulation. " +
        "Pass the session_state from the previous round and your response. " +
        "Returns the counterparty's next move, coaching, and updated session_state.",
      inputSchema: SimRoundInputSchema,
    },
    async (input: SimRoundInput) => {
      return handleSimRound(input);
    }
  );

  // ─── premise-sim-end ───
  server.registerTool(
    "premise-sim-end",
    {
      title: "End Simulation",
      description:
        "Generate a post-mortem analysis from a completed simulation. " +
        "Returns the full transcript, counterparty inner state reveal (what they were " +
        "really thinking each round), strengths, weaknesses, and missed opportunities.",
      inputSchema: SimEndInputSchema,
    },
    async (input: SimEndInput) => {
      return handleSimEnd(input);
    }
  );

  // ─── premise-debrief ───
  server.registerTool(
    "premise-debrief",
    {
      title: "Debrief",
      description:
        "Post-negotiation retrospective. Compare what actually happened against " +
        "the preparation: position accuracy, scenario verdicts, simulation comparison, " +
        "and lessons learned. Updates the Notion Scenario Database with outcome verdicts.",
      inputSchema: DebriefInputSchema,
    },
    async (input: DebriefInput) => {
      return handleDebrief(input);
    }
  );

  return server;
}
