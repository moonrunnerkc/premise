/**
 * premise-sim-end: Post-mortem analysis from completed simulation.
 *
 * Extracts the full transcript, counterparty inner states (the reveal moment),
 * and generates a post-mortem analysis of strengths, weaknesses, and missed
 * opportunities.
 */

import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { SimEndInput, SimEndOutput } from "../types/schemas.js";
import type { TranscriptEntry } from "../types/negotiation.js";
import { decodeSessionState } from "../lib/session-codec.js";
import { sendAnthropicRequest } from "../lib/anthropic.js";
import { logInfo, logError } from "../lib/logger.js";

const TOOL_NAME = "premise-sim-end";

interface PostMortemRawResponse {
  readonly strengths: readonly string[];
  readonly weaknesses: readonly string[];
  readonly missed_opportunities: readonly string[];
  readonly suggested_adjustments: readonly string[];
  readonly recommended_retry_focus: string;
  readonly scenario_matches: readonly string[];
}

export async function handleSimEnd(
  input: SimEndInput
): Promise<CallToolResult> {
  logInfo(TOOL_NAME, `Generating post-mortem (reason: ${input.end_reason ?? "completed"})`);

  try {
    const state = decodeSessionState(input.session_state);

    // Extract transcript from conversation history
    const transcript = extractTranscript(state.conversation_history, state.inner_states);

    // Determine outcome
    const lastInnerState = state.inner_states[state.inner_states.length - 1];
    const isDealReached =
      lastInnerState?.concession_readiness === "ready" ||
      input.end_reason === "completed";

    // Generate post-mortem via LLM
    const postMortemPrompt = buildPostMortemSystemPrompt();
    const postMortemUserMsg = buildPostMortemUserMessage(
      transcript,
      state.inner_states,
      input.end_reason ?? "completed"
    );
    const { parsed: postMortem } =
      await sendAnthropicRequest<PostMortemRawResponse>(
        { systemPrompt: postMortemPrompt, userMessage: postMortemUserMsg, maxTokens: 4096 },
        "sim-end-salary.json"
      );

    const output: SimEndOutput = {
      transcript,
      outcome: {
        deal_reached: isDealReached,
        final_terms: null,
        rounds_taken: state.round,
      },
      post_mortem: {
        strengths: [...postMortem.strengths],
        weaknesses: [...postMortem.weaknesses],
        missed_opportunities: [...postMortem.missed_opportunities],
        suggested_adjustments: [...postMortem.suggested_adjustments],
      },
      counterparty_inner_state: state.inner_states.map((is) => ({
        round: is.round,
        private_thoughts: is.private_thoughts,
        concession_readiness: is.concession_readiness,
        probing_intent: is.probing_intent,
      })),
      recommended_retry_focus: postMortem.recommended_retry_focus,
      scenario_matches: [...postMortem.scenario_matches],
    };

    logInfo(
      TOOL_NAME,
      `Post-mortem complete: ${output.post_mortem.strengths.length} strengths, ` +
        `${output.post_mortem.missed_opportunities.length} missed opportunities`
    );

    return {
      content: [{ type: "text", text: JSON.stringify(output) }],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logError(TOOL_NAME, `Failed: ${message}`);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ error: `Post-mortem failed: ${message}` }),
        },
      ],
      isError: true,
    };
  }
}

function extractTranscript(
  conversationHistory: ReadonlyArray<{ readonly role: string; readonly content: string }>,
  innerStates: ReadonlyArray<{ readonly round: number; readonly private_thoughts: string }>
): TranscriptEntry[] {
  const transcript: TranscriptEntry[] = [];
  let round = 0;

  for (const msg of conversationHistory) {
    if (msg.role === "user") {
      round++;
      // Extract the user's actual message from the prompt wrapper
      const userText = extractUserDialogue(msg.content);
      transcript.push({
        round,
        speaker: "user",
        message: userText,
        tactical_note: null,
      });
    } else if (msg.role === "assistant") {
      try {
        const parsed = JSON.parse(msg.content) as { dialogue: string };
        const matchingState = innerStates.find((is) => is.round === round);
        transcript.push({
          round,
          speaker: "counterparty",
          message: parsed.dialogue,
          tactical_note: matchingState
            ? `[Hidden: ${matchingState.private_thoughts}]`
            : null,
        });
      } catch {
        transcript.push({
          round,
          speaker: "counterparty",
          message: msg.content,
          tactical_note: null,
        });
      }
    }
  }

  return transcript;
}

function extractUserDialogue(promptContent: string): string {
  // The user message is wrapped in: The other party says:\n\n"..."\n\n
  const match = promptContent.match(/The other party says:\s*\n\n"(.+?)"\s*\n/s);
  if (match) return match[1];
  return promptContent;
}

function buildPostMortemSystemPrompt(): string {
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

function buildPostMortemUserMessage(
  transcript: ReadonlyArray<TranscriptEntry>,
  innerStates: ReadonlyArray<{ readonly round: number; readonly private_thoughts: string; readonly concession_readiness: string; readonly probing_intent: string }>,
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
