/**
 * Prompt templates for simulation post-mortem analysis.
 *
 * Generates the system prompt and user message for analyzing a completed
 * simulation session, producing strengths, weaknesses, missed opportunities,
 * and a recommended retry focus.
 */

import type { TranscriptEntry } from "../types/negotiation.js";

export function buildPostMortemSystemPrompt(): string {
  return `You are an expert negotiation coach analyzing a completed simulation. Review the full transcript and counterparty inner states, then produce a post-mortem analysis.

Return ONLY a JSON object:

{
  "strengths": ["string (specific things the user did well, referencing exact moments)"],
  "weaknesses": ["string (specific things the user could improve, referencing exact moments)"],
  "missed_opportunities": ["string (moments where a different move would have changed the outcome)"],
  "suggested_adjustments": ["string (concrete changes for next time)"],
  "recommended_retry_focus": "string (the single most important thing to practice)",
  "scenario_matches": ["string (scenario IDs from the tree that came up, if any)"]
}

RULES:
- Every observation must reference a specific round and what happened.
- Missed opportunities should cite the counterparty's hidden state to show what was possible.
- The recommended_retry_focus should be a single, specific skill or technique.`;
}

export function buildPostMortemUserMessage(
  transcript: ReadonlyArray<TranscriptEntry>,
  innerStates: ReadonlyArray<{
    readonly round: number;
    readonly private_thoughts: string;
    readonly concession_readiness: string;
    readonly probing_intent: string;
  }>,
  endReason: string
): string {
  let message = `## Simulation Transcript\n\n`;

  for (const entry of transcript) {
    const speaker = entry.speaker === "user" ? "User" : "Counterparty";
    message += `**Round ${entry.round} - ${speaker}:** ${entry.message}\n`;
  }

  message += `\n## Counterparty Hidden States\n\n`;
  for (const state of innerStates) {
    message += `**Round ${state.round}:**\n`;
    message += `- Thoughts: ${state.private_thoughts}\n`;
    message += `- Concession readiness: ${state.concession_readiness}\n`;
    message += `- Probing intent: ${state.probing_intent}\n\n`;
  }

  message += `\n## End Reason: ${endReason}\n`;
  message += `\nAnalyze this simulation and produce the post-mortem JSON.`;

  return message;
}
