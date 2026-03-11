/**
 * Unit tests for simulation tools: sim-start, sim-round, sim-end.
 *
 * Tests the full simulation lifecycle using mock responses:
 * initialization, round processing, state transitions, and post-mortem generation.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { resolve } from "node:path";
import { handleSimStart } from "../../src/tools/sim-start.js";
import { handleSimRound } from "../../src/tools/sim-round.js";
import { handleSimEnd } from "../../src/tools/sim-end.js";
import { resetConfig } from "../../src/lib/config.js";
import type { AnalyzeOutput, PositionOutput } from "../../src/types/schemas.js";

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
  negotiation_id: "sim-test",
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
  negotiation_id: "sim-test",
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

describe("Simulation lifecycle", () => {
  let sessionState: { version: 1; encoded: string };

  it("sim-start: initializes session with counterparty response and coaching", async () => {
    const result = await handleSimStart({
      negotiation_id: "sim-test",
      analysis: mockAnalysis,
      positions: mockPositions,
      counterparty_style: "analytical",
      your_opening: "Sarah, I wanted to discuss my compensation.",
      max_rounds: 8,
    });

    expect(result.isError).toBeUndefined();

    const output = JSON.parse(
      (result.content[0] as { type: "text"; text: string }).text
    );

    expect(output.session_state.version).toBe(1);
    expect(output.session_state.encoded).toBeTruthy();
    expect(typeof output.session_state.encoded).toBe("string");
    expect(output.counterparty_response.length).toBeGreaterThan(20);
    expect(output.tactical_note.length).toBeGreaterThan(20);
    expect(output.round).toBe(1);
    expect(output.max_rounds).toBe(8);
    expect(output.status).toBe("active");

    sessionState = output.session_state;
  });

  it("sim-round: processes a round and increments counter", async () => {
    const result = await handleSimRound({
      session_state: sessionState,
      your_response: "I have market data showing $185-200K for my level.",
    });

    expect(result.isError).toBeUndefined();

    const output = JSON.parse(
      (result.content[0] as { type: "text"; text: string }).text
    );

    expect(output.round).toBe(2);
    expect(output.session_state.version).toBe(1);
    expect(output.counterparty_response).toBeTruthy();
    expect(output.tactical_note).toBeTruthy();
    expect(output.status).toMatch(/^(active|deal_reached|breakdown|max_rounds)$/);

    sessionState = output.session_state;
  });

  it("sim-end: generates transcript and post-mortem from session", async () => {
    const result = await handleSimEnd({
      session_state: sessionState,
      end_reason: "completed",
    });

    expect(result.isError).toBeUndefined();

    const output = JSON.parse(
      (result.content[0] as { type: "text"; text: string }).text
    );

    // Transcript must have entries for all rounds
    expect(output.transcript.length).toBeGreaterThan(0);
    expect(output.transcript[0].speaker).toMatch(/^(user|counterparty)$/);

    // Outcome
    expect(typeof output.outcome.deal_reached).toBe("boolean");
    expect(output.outcome.rounds_taken).toBe(2);

    // Post-mortem quality checks
    expect(output.post_mortem.strengths.length).toBeGreaterThan(0);
    expect(output.post_mortem.missed_opportunities.length).toBeGreaterThan(0);

    // Inner state reveal (the money shot)
    expect(output.counterparty_inner_state.length).toBe(2);
    expect(output.counterparty_inner_state[0].private_thoughts).toBeTruthy();
    expect(output.counterparty_inner_state[0].concession_readiness).toMatch(
      /^(ready|considering|firm)$/
    );

    expect(output.recommended_retry_focus).toBeTruthy();
  });

  it("sim-round: errors gracefully with invalid session state", async () => {
    const result = await handleSimRound({
      session_state: { version: 1, encoded: "invalid-base64" },
      your_response: "Test",
    });

    expect(result.isError).toBe(true);
    const output = JSON.parse(
      (result.content[0] as { type: "text"; text: string }).text
    );
    expect(output.error).toBeTruthy();
  });

  it("sim-end: errors gracefully with invalid session state", async () => {
    const result = await handleSimEnd({
      session_state: { version: 1, encoded: "invalid-base64" },
      end_reason: "completed",
    });

    expect(result.isError).toBe(true);
    const output = JSON.parse(
      (result.content[0] as { type: "text"; text: string }).text
    );
    expect(output.error).toBeTruthy();
  });
});
