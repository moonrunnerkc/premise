/**
 * Full workflow integration test using mock responses.
 *
 * Exercises all 7 tools in sequence: analyze -> position -> scenarios ->
 * sim-start -> sim-round -> sim-end -> debrief. Uses PREMISE_MOCK_DIR
 * to read pre-recorded responses instead of calling the Anthropic API.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { resolve } from "node:path";
import { handleAnalyze } from "../../src/tools/analyze.js";
import { handlePosition } from "../../src/tools/position.js";
import { handleScenarios } from "../../src/tools/scenarios.js";
import { handleSimStart } from "../../src/tools/sim-start.js";
import { handleSimRound } from "../../src/tools/sim-round.js";
import { handleSimEnd } from "../../src/tools/sim-end.js";
import { handleDebrief } from "../../src/tools/debrief.js";
import { resetConfig } from "../../src/lib/config.js";
import type { AnalyzeOutput, PositionOutput, ScenariosOutput } from "../../src/types/schemas.js";

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

function parseToolOutput<T>(result: { content: Array<{ type: string; text?: string }> }): T {
  const textContent = result.content.find((c) => c.type === "text");
  if (!textContent || !("text" in textContent)) {
    throw new Error("No text content in tool result");
  }
  return JSON.parse(textContent.text as string) as T;
}

describe("Full salary negotiation workflow", () => {
  let analysisOutput: AnalyzeOutput;
  let positionOutput: PositionOutput;
  let scenariosOutput: ScenariosOutput;
  let sessionState: { version: 1; encoded: string };

  it("premise-analyze: parses negotiation context", async () => {
    const result = await handleAnalyze({
      context:
        "I am a senior software engineer making $170K. I led the platform migration project " +
        "this year and my annual review with my manager Sarah Chen is next Tuesday. " +
        "I want a raise to at least $185K, ideally $195K. Market rate for my level is $185K-200K. " +
        "I have been getting recruiter interest from other companies.",
      negotiation_type: "salary",
    });

    expect(result.isError).toBeUndefined();

    const output = parseToolOutput<AnalyzeOutput>(result);
    analysisOutput = output;

    expect(output.negotiation_id).toBeTruthy();
    expect(output.parties.length).toBeGreaterThanOrEqual(2);
    // parties[0] is the user, parties[1] is the counterparty
    expect(output.parties.some((p) => p.name === "Sarah Chen")).toBe(true);
    expect(output.stakes.your_upside).toBeTruthy();
    expect(output.stakes.their_downside).toBeTruthy();
    expect(output.timeline.time_pressure_level).toMatch(/^(high|medium|low)$/);
    expect(output.power_dynamics.who_needs_whom_more).toBeTruthy();
    expect(output.emotional_factors.your_anxiety_points.length).toBeGreaterThan(0);
    expect(output.emotional_factors.their_likely_anxiety_points.length).toBeGreaterThan(0);
  });

  it("premise-position: maps both sides' positions", async () => {
    const result = await handlePosition({
      negotiation_id: analysisOutput.negotiation_id,
      analysis: analysisOutput,
      your_target: "$195K total compensation",
      your_minimum: "$185K base salary",
      your_batna: "Competing offer from Dataflow Systems at $200K",
      market_context: "Senior engineers with platform experience: $185K-200K in this market",
    });

    expect(result.isError).toBeUndefined();

    const output = parseToolOutput<PositionOutput>(result);
    positionOutput = output;

    // Verify position structure
    expect(output.your_position.target).toBeTruthy();
    expect(output.your_position.batna_strength).toMatch(/^(strong|moderate|weak)$/);
    expect(output.your_position.anchor_recommendation).toBeTruthy();

    // Verify their position
    expect(output.their_estimated_position.likely_target).toBeTruthy();
    expect(output.their_estimated_position.constraints.length).toBeGreaterThan(0);
    expect(output.their_estimated_position.incentives.length).toBeGreaterThan(0);

    // Verify ZOPA
    expect(typeof output.zopa.exists).toBe("boolean");
    expect(output.zopa.exists).toBe(true);
    expect(output.zopa.estimated_range).toBeTruthy();

    // Verify leverage points
    expect(output.leverage_points.length).toBeGreaterThanOrEqual(3);
    for (const lp of output.leverage_points) {
      expect(lp.who_it_favors).toMatch(/^(you|them|neutral)$/);
    }

    // Verify risk factors
    expect(output.risk_factors.length).toBeGreaterThan(0);

    // Verify tradeable issues
    expect(output.tradeable_issues.length).toBeGreaterThan(0);
  });

  it("premise-scenarios: generates decision tree", async () => {
    const result = await handleScenarios({
      negotiation_id: analysisOutput.negotiation_id,
      analysis: analysisOutput,
      positions: positionOutput,
      depth: 2,
    });

    expect(result.isError).toBeUndefined();

    const output = parseToolOutput<ScenariosOutput>(result);
    scenariosOutput = output;

    expect(output.root.description).toBeTruthy();
    expect(output.branches.length).toBeGreaterThanOrEqual(3);

    // Check branch structure
    for (const branch of output.branches) {
      expect(branch.id).toBeTruthy();
      expect(branch.counterparty_move).toBeTruthy();
      expect(branch.probability).toMatch(/^(high|medium|low)$/);
      expect(branch.recommended_responses.length).toBeGreaterThan(0);
      expect(branch.emotional_temperature).toMatch(/^(calm|tense|heated)$/);
      expect(branch.page_title).toBeTruthy();
    }

    // Verify tree has root-level and child branches
    const rootBranches = output.branches.filter((b) => b.parent_id === null);
    const childBranches = output.branches.filter((b) => b.parent_id !== null);
    expect(rootBranches.length).toBeGreaterThan(0);
    expect(childBranches.length).toBeGreaterThan(0);

    // Verify child branches reference valid parent IDs
    const branchIds = new Set(output.branches.map((b) => b.id));
    for (const child of childBranches) {
      expect(branchIds.has(child.parent_id!)).toBe(true);
    }
  });

  it("premise-sim-start: initializes simulation", async () => {
    const result = await handleSimStart({
      negotiation_id: analysisOutput.negotiation_id,
      analysis: analysisOutput,
      positions: positionOutput,
      counterparty_style: "analytical",
      your_opening:
        "Sarah, thanks for making time for this. I wanted to talk about my compensation " +
        "and where I see myself contributing going forward. The platform migration was a " +
        "major milestone and I have been thinking about what market-competitive pay looks " +
        "like for the scope I am operating at.",
      max_rounds: 8,
    });

    expect(result.isError).toBeUndefined();

    const output = parseToolOutput<{
      session_state: { version: 1; encoded: string };
      counterparty_response: string;
      tactical_note: string;
      round: number;
      max_rounds: number;
      status: string;
    }>(result);

    expect(output.session_state.version).toBe(1);
    expect(output.session_state.encoded).toBeTruthy();
    expect(output.counterparty_response).toBeTruthy();
    expect(output.counterparty_response.length).toBeGreaterThan(50);
    expect(output.tactical_note).toBeTruthy();
    expect(output.round).toBe(1);
    expect(output.max_rounds).toBe(8);
    expect(output.status).toBe("active");

    sessionState = output.session_state;
  });

  it("premise-sim-round: processes one round", async () => {
    const result = await handleSimRound({
      session_state: sessionState,
      your_response:
        "I appreciate the recognition, Sarah. I want to share some context. " +
        "Based on conversations with recruiters and comp data I have gathered, " +
        "the market range for someone with my experience and this year's scope is " +
        "$185K to $200K. I am not looking to leave, but I want to make sure my " +
        "compensation reflects where the market is. Given the migration's impact " +
        "on the Q2 roadmap, I think $195K is a fair target. Can we talk about " +
        "how to get there?",
    });

    expect(result.isError).toBeUndefined();

    const output = parseToolOutput<{
      session_state: { version: 1; encoded: string };
      counterparty_response: string;
      tactical_note: string;
      round: number;
      status: string;
    }>(result);

    expect(output.session_state.version).toBe(1);
    expect(output.counterparty_response).toBeTruthy();
    expect(output.counterparty_response.length).toBeGreaterThan(50);
    expect(output.tactical_note).toBeTruthy();
    expect(output.round).toBe(2);
    expect(output.status).toMatch(/^(active|deal_reached|breakdown|max_rounds)$/);

    sessionState = output.session_state;
  });

  it("premise-sim-end: generates post-mortem", async () => {
    const result = await handleSimEnd({
      session_state: sessionState,
      end_reason: "completed",
    });

    expect(result.isError).toBeUndefined();

    const output = parseToolOutput<{
      transcript: Array<{ round: number; speaker: string; message: string }>;
      outcome: { deal_reached: boolean; rounds_taken: number };
      post_mortem: {
        strengths: string[];
        weaknesses: string[];
        missed_opportunities: string[];
        suggested_adjustments: string[];
      };
      counterparty_inner_state: Array<{
        round: number;
        private_thoughts: string;
        concession_readiness: string;
      }>;
      recommended_retry_focus: string;
      scenario_matches: string[];
    }>(result);

    // Transcript
    expect(output.transcript.length).toBeGreaterThan(0);
    for (const entry of output.transcript) {
      expect(entry.speaker).toMatch(/^(user|counterparty)$/);
      expect(entry.message).toBeTruthy();
    }

    // Post-mortem quality
    expect(output.post_mortem.strengths.length).toBeGreaterThan(0);
    expect(output.post_mortem.weaknesses.length).toBeGreaterThan(0);
    expect(output.post_mortem.missed_opportunities.length).toBeGreaterThan(0);
    expect(output.post_mortem.suggested_adjustments.length).toBeGreaterThan(0);

    // Inner state reveal
    expect(output.counterparty_inner_state.length).toBeGreaterThan(0);
    for (const state of output.counterparty_inner_state) {
      expect(state.private_thoughts).toBeTruthy();
      expect(state.concession_readiness).toMatch(/^(ready|considering|firm)$/);
    }

    // Scenario matches (may be empty if LLM found no matching scenario IDs)
    expect(Array.isArray(output.scenario_matches)).toBe(true);
    expect(output.recommended_retry_focus).toBeTruthy();
  });

  it("premise-debrief: compares prep vs reality", async () => {
    const result = await handleDebrief({
      negotiation_id: analysisOutput.negotiation_id,
      outcome:
        "Negotiated to $190K base with a written Staff Engineer promotion path including " +
        "quarterly check-ins. Sarah got VP approval within the week.",
      deal_terms: "$190K base salary, Staff promotion criteria documented, quarterly check-ins",
      surprises: "Sarah was warmer than expected and volunteered the VP conversation without being pushed",
      counterparty_behavior:
        "Collaborative, opened with standard band but quickly moved to problem-solving mode when I showed market data",
    });

    expect(result.isError).toBeUndefined();

    const output = parseToolOutput<{
      outcome_summary: string;
      prep_vs_reality: {
        position_accuracy: string;
        scenario_accuracy: string;
        simulation_accuracy: string;
      };
      lessons: Array<{ lesson: string; evidence: string; applies_to_future: string }>;
      pattern_update: string;
      effectiveness_score: number;
      scenario_verdicts: Array<{ scenario_id: string; verdict: string; notes: string }>;
      simulation_comparison: {
        most_realistic_round: number | null;
        counterparty_accuracy: string;
      };
    }>(result);

    expect(output.outcome_summary).toBeTruthy();
    expect(output.prep_vs_reality.position_accuracy).toBeTruthy();
    expect(output.prep_vs_reality.scenario_accuracy).toBeTruthy();
    expect(output.prep_vs_reality.simulation_accuracy).toBeTruthy();

    expect(output.lessons.length).toBeGreaterThan(0);
    for (const lesson of output.lessons) {
      expect(lesson.lesson).toBeTruthy();
      expect(lesson.evidence).toBeTruthy();
      expect(lesson.applies_to_future).toBeTruthy();
    }

    expect(output.effectiveness_score).toBeGreaterThanOrEqual(1);
    expect(output.effectiveness_score).toBeLessThanOrEqual(10);

    expect(output.scenario_verdicts.length).toBeGreaterThan(0);
    for (const verdict of output.scenario_verdicts) {
      expect(verdict.verdict).toMatch(
        /^(happened|partially_happened|did_not_happen|happened_differently)$/
      );
    }

    expect(output.pattern_update).toBeTruthy();
  });
});
