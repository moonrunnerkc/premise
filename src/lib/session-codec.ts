/**
 * Session state serialization and deserialization.
 *
 * This is the single point of truth for how simulation session state
 * is encoded for transport between the server and orchestrator.
 * The orchestrator treats the blob as opaque; only this module
 * knows how to pack and unpack it.
 *
 * Format: JSON stringified, then base64 encoded.
 * Wrapped in a versioned envelope for forward compatibility.
 */

import type { SessionStateInternal, SessionStateBlob } from "../types/session.js";

const CURRENT_VERSION = 1 as const;

/**
 * Serialize internal session state into an opaque blob for the orchestrator.
 */
export function encodeSessionState(
  state: SessionStateInternal
): SessionStateBlob {
  const json = JSON.stringify(state);
  const encoded = Buffer.from(json, "utf-8").toString("base64");

  return {
    version: CURRENT_VERSION,
    encoded,
  };
}

/**
 * Deserialize an opaque blob back into internal session state.
 * Throws with actionable error if the blob is corrupt or incompatible.
 */
export function decodeSessionState(
  blob: SessionStateBlob
): SessionStateInternal {
  if (blob.version !== CURRENT_VERSION) {
    throw new Error(
      `Session state version mismatch: expected ${CURRENT_VERSION}, got ${blob.version}. ` +
        `This session was created with a different version of the Premise server. ` +
        `Start a new simulation session.`
    );
  }

  try {
    const json = Buffer.from(blob.encoded, "base64").toString("utf-8");
    const parsed = JSON.parse(json) as SessionStateInternal;

    // Validate required fields are present
    if (!parsed.negotiation_id || !parsed.persona || !parsed.system_prompt) {
      throw new Error("Missing required fields in decoded session state");
    }

    // Normalize fields added after initial version to handle older session blobs
    return {
      ...parsed,
      tactical_notes: parsed.tactical_notes ?? [],
    };
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(
        "Session state blob is corrupt: invalid base64 or JSON. " +
          "The session_state must be passed through unchanged from the previous " +
          "sim-start or sim-round response. Start a new simulation session."
      );
    }
    throw error;
  }
}
