/**
 * Tests for session-codec: serialize/deserialize simulation session state.
 */

import { describe, it, expect } from "vitest";
import { encodeSessionState, decodeSessionState } from "../../src/lib/session-codec.js";
import type { SessionStateInternal } from "../../src/types/session.js";

const SAMPLE_STATE: SessionStateInternal = {
  negotiation_id: "test-id-123",
  persona: {
    name: "Jane Manager",
    role: "Engineering Manager",
    style: "analytical",
    estimated_target: "Keep raise under 5%",
    estimated_reservation: "Will go up to 10% to retain",
    estimated_batna: "Promote from within pipeline",
    constraints: ["Q3 budget freeze", "Headcount approval pending"],
    incentives: ["Avoid recruitment costs", "Retain domain knowledge"],
    personality_notes: "analytical style negotiator",
  },
  conversation_history: [
    { role: "user", content: "I'd like to discuss my compensation." },
    { role: "assistant", content: '{"dialogue":"Sure, let\'s talk about that."}' },
  ],
  inner_states: [
    {
      round: 1,
      private_thoughts: "They seem prepared. I should listen first.",
      concession_readiness: "firm",
      probing_intent: "Understand their market alternatives",
    },
  ],
  round: 1,
  max_rounds: 8,
  system_prompt: "You are playing the role of Jane Manager...",
};

describe("session-codec", () => {
  it("round-trips session state without data loss", () => {
    const encoded = encodeSessionState(SAMPLE_STATE);
    const decoded = decodeSessionState(encoded);

    expect(decoded.negotiation_id).toBe(SAMPLE_STATE.negotiation_id);
    expect(decoded.persona.name).toBe("Jane Manager");
    expect(decoded.persona.style).toBe("analytical");
    expect(decoded.conversation_history).toHaveLength(2);
    expect(decoded.inner_states).toHaveLength(1);
    expect(decoded.round).toBe(1);
    expect(decoded.max_rounds).toBe(8);
    expect(decoded.system_prompt).toBe(SAMPLE_STATE.system_prompt);
  });

  it("produces a versioned blob structure", () => {
    const encoded = encodeSessionState(SAMPLE_STATE);

    expect(encoded.version).toBe(1);
    expect(typeof encoded.encoded).toBe("string");
    expect(encoded.encoded.length).toBeGreaterThan(0);
  });

  it("rejects blobs with wrong version", () => {
    expect(() =>
      decodeSessionState({ version: 1, encoded: "not-valid-base64!!!" })
    ).toThrow();
  });

  it("rejects blobs with version mismatch", () => {
    const blob = { version: 99 as 1, encoded: "dGVzdA==" };
    expect(() => decodeSessionState(blob)).toThrow("version mismatch");
  });

  it("rejects corrupt base64 data", () => {
    const blob = { version: 1 as const, encoded: Buffer.from("not json").toString("base64") };
    expect(() => decodeSessionState(blob)).toThrow();
  });

  it("preserves conversation history across multiple rounds", () => {
    const multiRoundState: SessionStateInternal = {
      ...SAMPLE_STATE,
      conversation_history: [
        { role: "user", content: "Round 1 user" },
        { role: "assistant", content: "Round 1 assistant" },
        { role: "user", content: "Round 2 user" },
        { role: "assistant", content: "Round 2 assistant" },
        { role: "user", content: "Round 3 user" },
        { role: "assistant", content: "Round 3 assistant" },
      ],
      inner_states: [
        { round: 1, private_thoughts: "t1", concession_readiness: "firm", probing_intent: "p1" },
        { round: 2, private_thoughts: "t2", concession_readiness: "considering", probing_intent: "p2" },
        { round: 3, private_thoughts: "t3", concession_readiness: "ready", probing_intent: "p3" },
      ],
      round: 3,
    };

    const encoded = encodeSessionState(multiRoundState);
    const decoded = decodeSessionState(encoded);

    expect(decoded.conversation_history).toHaveLength(6);
    expect(decoded.inner_states).toHaveLength(3);
    expect(decoded.inner_states[2].concession_readiness).toBe("ready");
  });
});
