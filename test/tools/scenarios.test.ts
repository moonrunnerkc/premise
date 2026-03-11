/**
 * Unit tests for premise-scenarios tool handler.
 *
 * Tests decision tree structure, branch specificity, parent-child relationships,
 * and error handling.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { resolve } from "node:path";
import { handleScenarios } from "../../src/tools/scenarios.js";
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
  negotiation_id: "test-id",
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
    who_needs_whom_more: "Roughly balanced",
    information_asymmetry: "They know budget",
    relationship_value: "High",
  },
  emotional_factors: {
    your_anxiety_points: ["Fear of seeming greedy"],
    their_likely_anxiety_points: ["Retention risk"],
  },
};

const mockPositions: PositionOutput = {
  negotiation_id: "test-id",
  your_position: {
    target: "$195K",
    reservation_point: "$185K",
    batna: "Competing offer at $200K",
    batna_strength: "moderate",
    anchor_recommendation: "Open at $200K",
    rationale: "Anchoring above target",
  },
  their_estimated_position: {
    likely_target: "$180K-185K",
    likely_reservation: "$192K",
    likely_batna: "Backfill at market rate",
    constraints: ["Budget bands", "Internal equity"],
    incentives: ["Retain migration knowledge", "Avoid backfill cost"],
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
      how_to_use_it: "Mention ongoing optimization work",
    },
  ],
  risk_factors: [
    {
      risk: "VP approval stalls",
      probability: "medium",
      mitigation: "Get specific timeline",
    },
  ],
  tradeable_issues: [
    {
      issue: "Promotion timeline",
      your_priority: "high",
      their_likely_priority: "medium",
    },
  ],
};

describe("handleScenarios", () => {
  it("generates a valid decision tree with root and branches", async () => {
    const result = await handleScenarios({
      negotiation_id: "test-id",
      analysis: mockAnalysis,
      positions: mockPositions,
      depth: 2,
    });

    expect(result.isError).toBeUndefined();
    const output = JSON.parse(
      (result.content[0] as { type: "text"; text: string }).text
    );

    expect(output.root.description).toBeTruthy();
    expect(output.branches).toBeInstanceOf(Array);
    expect(output.branches.length).toBeGreaterThanOrEqual(3);
  });

  it("includes both root-level and child branches", async () => {
    const result = await handleScenarios({
      negotiation_id: "test-id",
      analysis: mockAnalysis,
      positions: mockPositions,
    });

    const output = JSON.parse(
      (result.content[0] as { type: "text"; text: string }).text
    );

    const rootBranches = output.branches.filter(
      (b: { parent_id: string | null }) => b.parent_id === null
    );
    const childBranches = output.branches.filter(
      (b: { parent_id: string | null }) => b.parent_id !== null
    );

    expect(rootBranches.length).toBeGreaterThan(0);
    expect(childBranches.length).toBeGreaterThan(0);
  });

  it("each branch has required fields and valid enums", async () => {
    const result = await handleScenarios({
      negotiation_id: "test-id",
      analysis: mockAnalysis,
      positions: mockPositions,
    });

    const output = JSON.parse(
      (result.content[0] as { type: "text"; text: string }).text
    );

    for (const branch of output.branches) {
      expect(branch.id).toBeTruthy();
      expect(branch.counterparty_move).toBeTruthy();
      expect(branch.probability).toMatch(/^(high|medium|low)$/);
      expect(branch.emotional_temperature).toMatch(/^(calm|tense|heated)$/);
      expect(branch.page_title).toBeTruthy();
      expect(branch.recommended_responses.length).toBeGreaterThan(0);
      for (const resp of branch.recommended_responses) {
        expect(resp.response).toBeTruthy();
        expect(resp.rationale).toBeTruthy();
      }
    }
  });
});
