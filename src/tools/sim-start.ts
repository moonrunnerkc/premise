/**
 * premise-sim-start: Initialize interactive simulation session.
 *
 * Assembles the counterparty persona from position analysis, makes the
 * first API call with the user's opening, and returns the initial
 * session state blob along with the counterparty's first response.
 */

import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { SimStartInput, SimStartOutput } from "../types/schemas.js";
import type {
  SessionStateInternal,
  CounterpartyPersona,
} from "../types/session.js";
import type { CounterpartyStyle, CounterpartyInnerState } from "../types/negotiation.js";
import { findCounterparty } from "../types/negotiation.js";
import { encodeSessionState } from "../lib/session-codec.js";
import { sendAnthropicRequest } from "../lib/anthropic.js";
import {
  buildCounterpartySystemPrompt,
  buildCounterpartyUserMessage,
} from "../prompts/counterparty.js";
import {
  buildTacticalCoachSystemPrompt,
  buildTacticalCoachUserMessage,
} from "../prompts/tactical-coach.js";
import { logInfo, logError } from "../lib/logger.js";

const TOOL_NAME = "premise-sim-start";
const DEFAULT_MAX_ROUNDS = 8;
const DEFAULT_STYLE: CounterpartyStyle = "analytical";

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

export async function handleSimStart(
  input: SimStartInput
): Promise<CallToolResult> {
  const maxRounds = input.max_rounds ?? DEFAULT_MAX_ROUNDS;
  const style = input.counterparty_style ?? DEFAULT_STYLE;

  logInfo(
    TOOL_NAME,
    `Starting simulation for ${input.negotiation_id}, style: ${style}, max rounds: ${maxRounds}`
  );

  try {
    // Build the counterparty persona from position analysis
    const persona = buildPersona(input, style);

    // Build the system prompt for the counterparty
    const counterpartySystemPrompt = buildCounterpartySystemPrompt(
      input.analysis,
      input.positions,
      style
    );

    // Get the counterparty's response to the user's opening
    const counterpartyUserMsg = buildCounterpartyUserMessage(input.your_opening);
    const { parsed: counterpartyResponse } =
      await sendAnthropicRequest<CounterpartyRawResponse>(
        { systemPrompt: counterpartySystemPrompt, userMessage: counterpartyUserMsg },
        "sim-start-salary.json"
      );

    // Get tactical coaching for this exchange
    const innerState: CounterpartyInnerState = {
      round: 1,
      private_thoughts: counterpartyResponse.hidden_metadata.private_thoughts,
      concession_readiness: counterpartyResponse.hidden_metadata.concession_readiness,
      probing_intent: counterpartyResponse.hidden_metadata.probing_intent,
    };

    const coachSystemPrompt = buildTacticalCoachSystemPrompt();
    const coachUserMsg = buildTacticalCoachUserMessage(
      1,
      maxRounds,
      input.your_opening,
      counterpartyResponse.dialogue,
      counterpartyResponse.hidden_metadata,
      []
    );
    const { parsed: coachResponse } =
      await sendAnthropicRequest<TacticalCoachResponse>(
        { systemPrompt: coachSystemPrompt, userMessage: coachUserMsg },
        "sim-start-coach.json"
      );

    // Build session state
    const sessionState: SessionStateInternal = {
      negotiation_id: input.negotiation_id,
      persona,
      conversation_history: [
        { role: "user", content: counterpartyUserMsg },
        {
          role: "assistant",
          content: JSON.stringify(counterpartyResponse),
        },
      ],
      inner_states: [innerState],
      tactical_notes: [coachResponse.tactical_note],
      round: 1,
      max_rounds: maxRounds,
      system_prompt: counterpartySystemPrompt,
    };

    const output: SimStartOutput = {
      session_state: encodeSessionState(sessionState),
      counterparty_response: counterpartyResponse.dialogue,
      tactical_note: coachResponse.tactical_note,
      round: 1,
      max_rounds: maxRounds,
      status: "active",
    };

    logInfo(TOOL_NAME, "Simulation started, round 1 complete");

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
          text: JSON.stringify({
            error: `Simulation start failed: ${message}`,
            negotiation_id: input.negotiation_id,
          }),
        },
      ],
      isError: true,
    };
  }
}

function buildPersona(
  input: SimStartInput,
  style: CounterpartyStyle
): CounterpartyPersona {
  const counterparty = findCounterparty(input.analysis.parties);
  const theirPosition = input.positions.their_estimated_position;

  return {
    name: counterparty.name,
    role: counterparty.role,
    style,
    estimated_target: theirPosition.likely_target,
    estimated_reservation: theirPosition.likely_reservation,
    estimated_batna: theirPosition.likely_batna,
    constraints: theirPosition.constraints,
    incentives: theirPosition.incentives,
    personality_notes: `${style} style negotiator`,
  };
}
