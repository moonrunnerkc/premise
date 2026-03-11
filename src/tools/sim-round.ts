/**
 * premise-sim-round: Process one round of interactive simulation.
 *
 * Deserializes session state, appends the user's response to conversation
 * history, gets the counterparty's next move, generates tactical coaching,
 * and re-serializes the updated session state.
 */

import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { SimRoundInput, SimRoundOutput } from "../types/schemas.js";
import type { SimulationStatus, CounterpartyInnerState } from "../types/negotiation.js";
import type { SessionStateInternal, ConversationMessage } from "../types/session.js";
import { decodeSessionState, encodeSessionState } from "../lib/session-codec.js";
import { sendAnthropicConversation, sendAnthropicRequest } from "../lib/anthropic.js";
import { buildCounterpartyUserMessage } from "../prompts/counterparty.js";
import {
  buildTacticalCoachSystemPrompt,
  buildTacticalCoachUserMessage,
} from "../prompts/tactical-coach.js";
import { logInfo, logError } from "../lib/logger.js";

const TOOL_NAME = "premise-sim-round";

interface CounterpartyRawResponse {
  readonly dialogue: string;
  readonly hidden_metadata: {
    readonly private_thoughts: string;
    readonly concession_readiness: "ready" | "considering" | "firm";
    readonly probing_intent: string;
    readonly emotional_state: string;
    readonly is_terminal: boolean;
    readonly terminal_reason: string | null;
  };
}

interface TacticalCoachResponse {
  readonly tactical_note: string;
}

export async function handleSimRound(
  input: SimRoundInput
): Promise<CallToolResult> {
  logInfo(TOOL_NAME, "Processing simulation round");

  try {
    // Decode session state from opaque blob
    const state = decodeSessionState(input.session_state);
    const nextRound = state.round + 1;

    logInfo(
      TOOL_NAME,
      `Round ${nextRound} of ${state.max_rounds} for ${state.negotiation_id}`
    );

    // Append user's response to conversation history
    const userMsg = buildCounterpartyUserMessage(input.your_response);
    const updatedHistory: ConversationMessage[] = [
      ...state.conversation_history,
      { role: "user" as const, content: userMsg },
    ];

    // Get counterparty response with full conversation context
    const { parsed: counterpartyResponse } =
      await sendAnthropicConversation<CounterpartyRawResponse>(
        state.system_prompt,
        updatedHistory,
        4096,
        "sim-rounds-salary.json"
      );

    // Determine simulation status
    const status = determineStatus(
      counterpartyResponse,
      nextRound,
      state.max_rounds
    );

    // Build inner state record for this round
    const innerState: CounterpartyInnerState = {
      round: nextRound,
      private_thoughts: counterpartyResponse.hidden_metadata.private_thoughts,
      concession_readiness: counterpartyResponse.hidden_metadata.concession_readiness,
      probing_intent: counterpartyResponse.hidden_metadata.probing_intent,
    };

    // Get tactical coaching with real previous notes to avoid repeating observations
    const coachSystemPrompt = buildTacticalCoachSystemPrompt();
    const coachUserMsg = buildTacticalCoachUserMessage(
      nextRound,
      state.max_rounds,
      input.your_response,
      counterpartyResponse.dialogue,
      counterpartyResponse.hidden_metadata,
      state.tactical_notes ?? []
    );
    const { parsed: coachResponse } =
      await sendAnthropicRequest<TacticalCoachResponse>(
        { systemPrompt: coachSystemPrompt, userMessage: coachUserMsg },
        "sim-round-coach.json"
      );

    // Update session state
    const updatedState: SessionStateInternal = {
      ...state,
      conversation_history: [
        ...updatedHistory,
        {
          role: "assistant" as const,
          content: JSON.stringify(counterpartyResponse),
        },
      ],
      inner_states: [...state.inner_states, innerState],
      tactical_notes: [...(state.tactical_notes ?? []), coachResponse.tactical_note],
      round: nextRound,
    };

    const output: SimRoundOutput = {
      session_state: encodeSessionState(updatedState),
      counterparty_response: counterpartyResponse.dialogue,
      tactical_note: coachResponse.tactical_note,
      round: nextRound,
      status,
      deal_terms: status === "deal_reached" ? counterpartyResponse.dialogue : null,
    };

    logInfo(TOOL_NAME, `Round ${nextRound} complete, status: ${status}`);

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
          text: JSON.stringify({ error: `Simulation round failed: ${message}` }),
        },
      ],
      isError: true,
    };
  }
}

function determineStatus(
  response: CounterpartyRawResponse,
  round: number,
  maxRounds: number
): SimulationStatus {
  if (response.hidden_metadata.is_terminal) {
    const reason = response.hidden_metadata.terminal_reason;
    if (reason === "deal_reached") return "deal_reached";
    if (reason === "breakdown") return "breakdown";
  }

  if (round >= maxRounds) return "max_rounds";

  return "active";
}
