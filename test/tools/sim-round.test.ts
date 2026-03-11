/**
 * Unit tests for premise-sim-round tool handler.
 *
 * Tests round processing, status determination, state updates,
 * and error handling independently from sim-start and sim-end.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { resolve } from "node:path";
import { handleSimStart } from "../../src/tools/sim-start.js";
import { handleSimRound } from "../../src/tools/sim-round.js";
import { resetConfig } from "../../src/lib/config.js";
import { encodeSessionState } from "../../src/lib/session-codec.js";
import type { AnalyzeOutput, PositionOutput } from "../../src/types/schemas.js";
import type { SessionStateBlob, SessionStateInternal } from "../../src/types/session.js";

const MOCK_DIR = resolve(import.meta.dirname, "../../demo/mock-responses");

beforeAll(() => {
  process.env["PREMISE_MOCK_DIR"] = MOCK_DIR;
  process.env["PREMISE_LOG_LEVEL"] = "error";
  resetConfig();
});

afterAll(() => {
  delete process.env["PREMISE_MOCK_DIR"];
  delete process.env["PREMISE_LOG_LEVEL"];
  resetConfig();
});

const mockAnalysis: AnalyzeOutput = {
  negotiation_id: "round-test",
  parties: [
    {
      name: "You",
      role: "Senior Software Engineer",
      relationship: "Direct report",
      estimated_power_level: "medium",
    },
    {
      name: "Sarah Chen",
      role: "Engineering Manager",
      relationship: "Direct manager",
      estimated_power_level: "high",
    },
  ],
  stakes: {
    your_upside: "Higher salary",
    your_downside: "Stagnant comp",
    their_upside: "Retain talent",
    their_downside: "Lose engineer",
  },
  timeline: {
    negotiation_date: "Next Tuesday",
    decision_deadline: null,
    time_pressure_level: "medium",
  },
  power_dynamics: {
    who_needs_whom_more: "Balanced",
    information_asymmetry: "They know budget",
    relationship_value: "High",
  },
  emotional_factors: {
    your_anxiety_points: ["Fear of seeming greedy"],
    their_likely_anxiety_points: ["Retention risk"],
  },
};

const mockPositions: PositionOutput = {
  negotiation_id: "round-test",
  your_position: {
    target: "$195K",
    reservation_point: "$185K",
    batna: "Competing offer",
    batna_strength: "moderate",
    anchor_recommendation: "Open at $200K",
    rationale: "Anchoring above target",
  },
  their_estimated_position: {
    likely_target: "$180K-185K",
    likely_reservation: "$192K",
    likely_batna: "Backfill at market rate",
    constraints: ["Budget bands"],
    incentives: ["Retain migration knowledge"],
  },
  zopa: {
    exists: true,
    estimated_range: "$185K-192K",
    confidence_level: "medium",
  },
  leverage_points: [
    {
      factor: "Migration knowledge",
      who_it_favors: "you",
      how_to_use_it: "Highlight ongoing work",
    },
  ],
  risk_factors: [
    {
      risk: "VP approval stalls",
      probability: "medium",
      mitigation: "Get timeline",
    },
  ],
  tradeable_issues: [
    {
      issue: "Promotion path",
      your_priority: "high",
      their_likely_priority: "medium",
    },
  ],
};

/** Helper: get a valid session state by running sim-start */
async function getInitialSessionState(): Promise<SessionStateBlob> {
  const result = await handleSimStart({
    negotiation_id: "round-test",
    analysis: mockAnalysis,
    positions: mockPositions,
    counterparty_style: "analytical",
    your_opening: "Sarah, I wanted to discuss my compensation.",
    max_rounds: 8,
  });

  const output = JSON.parse(
    (result.content[0] as { type: "text"; text: string }).text
  );
  return output.session_state;
}

describe("handleSimRound", () => {
  it("processes a round and returns valid output structure", async () => {
    const sessionState = await getInitialSessionState();

    const result = await handleSimRound({
      session_state: sessionState,
      your_response: "I have market data showing $185-200K for my level and role.",
    });

    expect(result.isError).toBeUndefined();

    const output = JSON.parse(
      (result.content[0] as { type: "text"; text: string }).text
    );

    expect(output.round).toBe(2);
    expect(output.session_state).toBeTruthy();
    expect(output.session_state.version).toBe(1);
    expect(typeof output.session_state.encoded).toBe("string");
    expect(output.counterparty_response.length).toBeGreaterThan(10);
    expect(output.tactical_note.length).toBeGreaterThan(10);
    expect(output.status).toMatch(/^(active|deal_reached|breakdown|max_rounds)$/);
  });

  it("chains multiple rounds with incrementing round counter", async () => {
    const sessionState = await getInitialSessionState();

    const round2Result = await handleSimRound({
      session_state: sessionState,
      your_response: "Based on market data, I believe $195K is fair.",
    });
    const round2Output = JSON.parse(
      (round2Result.content[0] as { type: "text"; text: string }).text
    );
    expect(round2Output.round).toBe(2);

    const round3Result = await handleSimRound({
      session_state: round2Output.session_state,
      your_response: "I understand budget constraints. What about equity?",
    });
    const round3Output = JSON.parse(
      (round3Result.content[0] as { type: "text"; text: string }).text
    );
    expect(round3Output.round).toBe(3);
  });

  it("returns deal_terms when status is deal_reached", async () => {
    const sessionState = await getInitialSessionState();

    const result = await handleSimRound({
      session_state: sessionState,
      your_response: "Let me accept your offer. $192K base with the equity package works for me.",
    });
    const output = JSON.parse(
      (result.content[0] as { type: "text"; text: string }).text
    );

    // The mock response determines the status; verify the contract shape
    if (output.status === "deal_reached") {
      expect(output.deal_terms).toBeTruthy();
    } else {
      // deal_terms should be null when not deal_reached
      expect(output.deal_terms).toBeNull();
    }
  });

  it("errors gracefully with invalid session state blob", async () => {
    const result = await handleSimRound({
      session_state: { version: 1, encoded: "not-valid-base64-!!!" },
      your_response: "Test response",
    });

    expect(result.isError).toBe(true);
    const output = JSON.parse(
      (result.content[0] as { type: "text"; text: string }).text
    );
    expect(output.error).toContain("Simulation round failed");
  });

  it("errors gracefully with empty encoded state", async () => {
    const result = await handleSimRound({
      session_state: { version: 1, encoded: "" },
      your_response: "Test response",
    });

    expect(result.isError).toBe(true);
    const output = JSON.parse(
      (result.content[0] as { type: "text"; text: string }).text
    );
    expect(output.error).toBeTruthy();
  });

  it("errors gracefully with structurally invalid session state", async () => {
    // Valid base64 but missing required fields
    const bogusState: SessionStateInternal = {
      negotiation_id: "",
      persona: {
        name: "",
        role: "",
        style: "analytical",
        estimated_target: "",
        estimated_reservation: "",
        estimated_batna: "",
        constraints: [],
        incentives: [],
        personality_notes: "",
      },
      conversation_history: [],
      inner_states: [],
      tactical_notes: [],
      round: 0,
      max_rounds: 8,
      system_prompt: "",
    };
    const blob = encodeSessionState(bogusState);

    const result = await handleSimRound({
      session_state: blob,
      your_response: "Test",
    });

    // Should fail on missing required fields in decode or on API call
    expect(result.isError).toBe(true);
  });
});
