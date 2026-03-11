/**
 * premise-position: Position mapping tool.
 *
 * Takes the analysis output plus user's target/minimum/BATNA and produces
 * a full position analysis: both sides' positions, ZOPA, leverage points,
 * risk factors, and tradeable issues.
 */

import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { PositionInput, PositionOutput } from "../types/schemas.js";
import { PositionOutputSchema } from "../types/schemas.js";
import { sendAnthropicRequest } from "../lib/anthropic.js";
import { logInfo, logError } from "../lib/logger.js";

const TOOL_NAME = "premise-position";

function buildPositionSystemPrompt(): string {
  return `You are an expert negotiation strategist. Given an analysis of a negotiation and the user's stated targets, produce a comprehensive position map for both sides.

You must return ONLY a JSON object with this exact structure:

{
  "your_position": {
    "target": "string (restatement of user's target with context)",
    "reservation_point": "string (user's walk-away point, contextualized)",
    "batna": "string (user's best alternative)",
    "batna_strength": "strong" | "moderate" | "weak",
    "anchor_recommendation": "string (what to open with and why)",
    "rationale": "string (strategic reasoning for the recommended anchor)"
  },
  "their_estimated_position": {
    "likely_target": "string (what they are probably aiming for)",
    "likely_reservation": "string (where they would likely walk away)",
    "likely_batna": "string (their best alternative)",
    "constraints": ["string (things limiting their flexibility)"],
    "incentives": ["string (things motivating them to make a deal)"]
  },
  "zopa": {
    "exists": boolean,
    "estimated_range": "string (the overlap zone if it exists)",
    "confidence_level": "high" | "medium" | "low"
  },
  "leverage_points": [
    {
      "factor": "string (the leverage factor)",
      "who_it_favors": "you" | "them" | "neutral",
      "how_to_use_it": "string (specific tactical advice)"
    }
  ],
  "risk_factors": [
    {
      "risk": "string (what could go wrong)",
      "probability": "high" | "medium" | "low",
      "mitigation": "string (how to reduce this risk)"
    }
  ],
  "tradeable_issues": [
    {
      "issue": "string (something that can be traded)",
      "your_priority": "high" | "medium" | "low",
      "their_likely_priority": "high" | "medium" | "low"
    }
  ]
}

RULES:
- The ZOPA must be internally consistent. If your reservation point is X and their estimated reservation is Y, the ZOPA is the overlap.
- Flag if the user's target appears to be outside the estimated ZOPA.
- Surface at least one leverage point or risk factor that is not obvious from the raw input.
- Tradeable issues should include non-monetary items (timeline, scope, reporting structure, title, flexibility) when relevant.
- BATNA strength assessment must be honest. A weak BATNA is a weak BATNA; do not sugarcoat it.`;
}

function buildPositionUserMessage(input: PositionInput): string {
  const analysis = input.analysis;
  let message = `## Negotiation Context
Parties: ${analysis.parties.map((p) => `${p.name} (${p.role})`).join(", ")}
Stakes: Your upside is "${analysis.stakes.your_upside}"; downside is "${analysis.stakes.your_downside}"
Power dynamics: ${analysis.power_dynamics.who_needs_whom_more}
Information asymmetry: ${analysis.power_dynamics.information_asymmetry}
Relationship value: ${analysis.power_dynamics.relationship_value}
Time pressure: ${analysis.timeline.time_pressure_level}

## Your Stated Position
Target: ${input.your_target}
Minimum (walk-away): ${input.your_minimum}`;

  if (input.your_batna) {
    message += `\nBATNA: ${input.your_batna}`;
  }

  if (input.market_context) {
    message += `\n\n## Market Context\n${input.market_context}`;
  }

  message += "\n\nProduce the position analysis JSON.";

  return message;
}

export async function handlePosition(
  input: PositionInput
): Promise<CallToolResult> {
  logInfo(TOOL_NAME, `Mapping positions for negotiation ${input.negotiation_id}`);

  try {
    const systemPrompt = buildPositionSystemPrompt();
    const userMessage = buildPositionUserMessage(input);

    const { parsed } = await sendAnthropicRequest<PositionOutput>(
      { systemPrompt, userMessage },
      "position-salary.json"
    );

    const validation = PositionOutputSchema.safeParse({
      ...parsed,
      negotiation_id: input.negotiation_id,
    });

    if (!validation.success) {
      logError(
        TOOL_NAME,
        `Output validation failed: ${JSON.stringify(validation.error.issues)}`
      );
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              error: "Position analysis produced invalid structure.",
              details: validation.error.issues,
            }),
          },
        ],
        isError: true,
      };
    }

    logInfo(
      TOOL_NAME,
      `Position mapped: ZOPA ${validation.data.zopa.exists ? "exists" : "may not exist"}, ` +
        `${validation.data.leverage_points.length} leverage points identified`
    );

    return {
      content: [{ type: "text", text: JSON.stringify(validation.data) }],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logError(TOOL_NAME, `Failed: ${message}`);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            error: `Position analysis failed: ${message}`,
            negotiation_id: input.negotiation_id,
          }),
        },
      ],
      isError: true,
    };
  }
}
