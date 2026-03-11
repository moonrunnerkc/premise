/**
 * Unit tests for premise-sim-end tool handler.
 *
 * Tests post-mortem generation, transcript extraction, counterparty inner
 * state reveal, and error handling independently.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { resolve } from "node:path";
import { handleSimStart } from "../../src/tools/sim-start.js";
import { handleSimRound } from "../../src/tools/sim-round.js";
import { handleSimEnd } from "../../src/tools/sim-end.js";
import { resetConfig } from "../../src/lib/config.js";
import type { AnalyzeOutput, PositionOutput } from "../../src/types/schemas.js";
import type { SessionStateBlob } from "../../src/types/session.js";

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
  negotiation_id: "end-test",
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
  negotiation_id: "end-test",
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

/** Helper: run sim-start and one sim-round to build up a 2-round session */
async function getTwoRoundSessionState(): Promise<SessionStateBlob> {
  const startResult = await handleSimStart({
    negotiation_id: "end-test",
    analysis: mockAnalysis,
    positions: mockPositions,
    counterparty_style: "analytical",
    your_opening: "Sarah, I wanted to discuss my compensation.",
    max_rounds: 8,
  });
  const startOutput = JSON.parse(
    (startResult.content[0] as { type: "text"; text: string }).text
  );

  const roundResult = await handleSimRound({
    session_state: startOutput.session_state,
    your_response: "I have market data showing $185-200K for my level.",
  });
  const roundOutput = JSON.parse(
    (roundResult.content[0] as { type: "text"; text: string }).text
  );

  return roundOutput.session_state;
}

describe("handleSimEnd", () => {
  it("generates post-mortem with transcript and inner state reveal", async () => {
    const sessionState = await getTwoRoundSessionState();

    const result = await handleSimEnd({
      session_state: sessionState,
      end_reason: "completed",
    });

    expect(result.isError).toBeUndefined();

    const output = JSON.parse(
      (result.content[0] as { type: "text"; text: string }).text
    );

    // Transcript contains entries from all rounds
    expect(output.transcript.length).toBeGreaterThan(0);
    for (const entry of output.transcript) {
      expect(entry.round).toBeGreaterThanOrEqual(1);
      expect(entry.speaker).toMatch(/^(user|counterparty)$/);
      expect(entry.message).toBeTruthy();
    }

    // Outcome structure
    expect(typeof output.outcome.deal_reached).toBe("boolean");
    expect(output.outcome.rounds_taken).toBe(2);
    expect(output.outcome).toHaveProperty("final_terms");
  });

  it("includes post-mortem with strengths, weaknesses, and missed opportunities", async () => {
    const sessionState = await getTwoRoundSessionState();

    const result = await handleSimEnd({
      session_state: sessionState,
      end_reason: "completed",
    });
    const output = JSON.parse(
      (result.content[0] as { type: "text"; text: string }).text
    );

    expect(Array.isArray(output.post_mortem.strengths)).toBe(true);
    expect(Array.isArray(output.post_mortem.weaknesses)).toBe(true);
    expect(Array.isArray(output.post_mortem.missed_opportunities)).toBe(true);
    expect(Array.isArray(output.post_mortem.suggested_adjustments)).toBe(true);
    expect(output.post_mortem.strengths.length).toBeGreaterThan(0);
  });

  it("reveals counterparty inner state per round (the money shot)", async () => {
    const sessionState = await getTwoRoundSessionState();

    const result = await handleSimEnd({
      session_state: sessionState,
      end_reason: "completed",
    });
    const output = JSON.parse(
      (result.content[0] as { type: "text"; text: string }).text
    );

    // Inner state reveal must have entries for each round with the counterparty
    expect(output.counterparty_inner_state.length).toBe(2);
    for (const state of output.counterparty_inner_state) {
      expect(state.round).toBeGreaterThanOrEqual(1);
      expect(state.private_thoughts).toBeTruthy();
      expect(state.concession_readiness).toMatch(
        /^(ready|considering|firm)$/
      );
      expect(state.probing_intent).toBeTruthy();
    }
  });

  it("includes recommended retry focus and scenario matches", async () => {
    const sessionState = await getTwoRoundSessionState();

    const result = await handleSimEnd({
      session_state: sessionState,
      end_reason: "completed",
    });
    const output = JSON.parse(
      (result.content[0] as { type: "text"; text: string }).text
    );

    expect(output.recommended_retry_focus).toBeTruthy();
    expect(Array.isArray(output.scenario_matches)).toBe(true);
  });

  it("accepts user_quit as end_reason", async () => {
    const sessionState = await getTwoRoundSessionState();

    const result = await handleSimEnd({
      session_state: sessionState,
      end_reason: "user_quit",
    });

    expect(result.isError).toBeUndefined();
    const output = JSON.parse(
      (result.content[0] as { type: "text"; text: string }).text
    );
    expect(output.transcript.length).toBeGreaterThan(0);
  });

  it("errors gracefully with invalid session state", async () => {
    const result = await handleSimEnd({
      session_state: { version: 1, encoded: "corrupted-data" },
      end_reason: "completed",
    });

    expect(result.isError).toBe(true);
    const output = JSON.parse(
      (result.content[0] as { type: "text"; text: string }).text
    );
    expect(output.error).toContain("Post-mortem failed");
  });

  it("errors gracefully with empty session state", async () => {
    const result = await handleSimEnd({
      session_state: { version: 1, encoded: "" },
      end_reason: "completed",
    });

    expect(result.isError).toBe(true);
    const output = JSON.parse(
      (result.content[0] as { type: "text"; text: string }).text
    );
    expect(output.error).toBeTruthy();
  });
});
