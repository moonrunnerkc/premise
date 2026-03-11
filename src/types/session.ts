/**
 * Session state types for the interactive simulation.
 *
 * The session_state blob is opaque to the orchestrator. The server serializes it,
 * the orchestrator carries it, the server deserializes it on the next call.
 * Only session-codec.ts touches these internals.
 */

import type { CounterpartyStyle, CounterpartyInnerState } from "./negotiation.js";

/** Shape of each message in the Anthropic conversation history stored in session state */
export interface ConversationMessage {
  readonly role: "user" | "assistant";
  readonly content: string;
}

/** Persona configuration embedded in session state, derived from position analysis */
export interface CounterpartyPersona {
  readonly name: string;
  readonly role: string;
  readonly style: CounterpartyStyle;
  readonly estimated_target: string;
  readonly estimated_reservation: string;
  readonly estimated_batna: string;
  readonly constraints: readonly string[];
  readonly incentives: readonly string[];
  readonly personality_notes: string;
}

/** Full internal session state. Serialized by session-codec, never exposed to orchestrator. */
export interface SessionStateInternal {
  readonly negotiation_id: string;
  readonly persona: CounterpartyPersona;
  readonly conversation_history: readonly ConversationMessage[];
  readonly inner_states: readonly CounterpartyInnerState[];
  readonly tactical_notes: readonly string[];
  readonly round: number;
  readonly max_rounds: number;
  readonly system_prompt: string;
}

/**
 * The opaque blob shape returned to the orchestrator.
 * Contains the encoded session data that the orchestrator passes back unchanged.
 */
export interface SessionStateBlob {
  readonly version: 1;
  readonly encoded: string;
}
