/**
 * System prompt for scenario decision tree generation.
 *
 * Produces a tree of counterparty moves with recommended responses,
 * grounded in the specific negotiation context from analysis and position mapping.
 */

import type { AnalyzeOutput, PositionOutput } from "../types/schemas.js";

export function buildScenarioGenSystemPrompt(): string {
  return `You are an expert negotiation strategist building a decision tree for an upcoming negotiation. Your job is to anticipate specific counterparty moves and provide concrete, actionable responses.

You must return ONLY a JSON object with this exact structure:

{
  "root": {
    "description": "string (one-sentence summary of the negotiation starting point)"
  },
  "branches": [
    {
      "id": "string (unique identifier, e.g., 'branch-1')",
      "parent_id": null (for top-level branches) or "string (parent branch id)",
      "counterparty_move": "string (specific thing they might say or do, with quotes if dialogue)",
      "probability": "high" | "medium" | "low",
      "recommended_responses": [
        {
          "response": "string (exact words or actions to take)",
          "rationale": "string (why this works given the power dynamics)",
          "tradeoffs": "string (what you might give up or risk)",
          "leads_to": "string (what this response likely triggers) or null"
        }
      ],
      "emotional_temperature": "calm" | "tense" | "heated",
      "page_title": "string (concise Notion page title for this scenario)"
    }
  ]
}

CRITICAL RULES:
- Every counterparty_move must be specific to THIS negotiation. Not "they might counter with a lower number." Instead: "They say your ask is 15% above what they budgeted for Q3 and point to the team restructuring as justification."
- Each branch should have 1-3 recommended responses representing different strategic approaches (assertive, collaborative, creative trade).
- Emotional temperature should escalate realistically. Not every branch is heated.
- page_title should be short and descriptive enough to scan in a Notion database (max 60 chars).
- Branch IDs must be stable and unique. Child branch parent_id must reference an existing branch ID.
- Probability assessments should be calibrated relative to each other, not absolute.`;
}

export function buildScenarioGenUserMessage(
  analysis: AnalyzeOutput,
  positions: PositionOutput,
  depth: number,
  focus: string | undefined
): string {
  let message = `Generate a decision tree for this negotiation:

## Context
Parties: ${analysis.parties.map((p) => `${p.name} (${p.role})`).join(", ")}
Stakes: Your upside is "${analysis.stakes.your_upside}"; your downside is "${analysis.stakes.your_downside}"
Power dynamics: ${analysis.power_dynamics.who_needs_whom_more}
Time pressure: ${analysis.timeline.time_pressure_level}

## Positions
Your target: ${positions.your_position.target}
Your reservation: ${positions.your_position.reservation_point}
Their likely target: ${positions.their_estimated_position.likely_target}
Their likely reservation: ${positions.their_estimated_position.likely_reservation}
Their constraints: ${positions.their_estimated_position.constraints.join("; ") || "None identified"}

## ZOPA
Exists: ${positions.zopa.exists ? "Yes" : "No"}
Range: ${positions.zopa.estimated_range}

## Leverage Points
${positions.leverage_points.map((lp) => `- ${lp.factor} (favors ${lp.who_it_favors}): ${lp.how_to_use_it}`).join("\n")}

## Risk Factors
${positions.risk_factors.map((rf) => `- ${rf.risk} (${rf.probability}): ${rf.mitigation}`).join("\n")}

## Tree Parameters
Depth: ${depth} levels
Generate ${depth === 1 ? "3-5" : depth === 2 ? "3-4 top-level with 2-3 children each" : "3 top-level with 2-3 children, each with 1-2 grandchildren"} branches.`;

  if (focus) {
    message += `\n\n## Special Focus\nThe user is particularly concerned about: "${focus}"\nEnsure at least 2 branches specifically address this concern.`;
  }

  return message;
}
