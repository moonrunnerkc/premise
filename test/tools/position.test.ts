/**
 * Unit tests for premise-position tool handler.
 *
 * Tests output structure, ZOPA consistency, leverage point identification,
 * and error handling.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { resolve } from "node:path";
import { handlePosition } from "../../src/tools/position.js";
import { resetConfig } from "../../src/lib/config.js";
import type { AnalyzeOutput } from "../../src/types/schemas.js";

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
  negotiation_id: "test-id-123",
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
    your_downside: "Stagnant compensation",
    their_upside: "Retain talent",
    their_downside: "Lose key engineer",
  },
  timeline: {
    negotiation_date: "Next Tuesday",
    decision_deadline: "End of comp cycle",
    time_pressure_level: "medium",
  },
  power_dynamics: {
    who_needs_whom_more: "Roughly balanced",
    information_asymmetry: "They know their budget ceiling",
    relationship_value: "High on both sides",
  },
  emotional_factors: {
    your_anxiety_points: ["Fear of seeming greedy"],
    their_likely_anxiety_points: ["Retention risk"],
  },
};

describe("handlePosition", () => {
  it("returns complete position analysis structure", async () => {
    const result = await handlePosition({
      negotiation_id: "test-id-123",
      analysis: mockAnalysis,
      your_target: "$195K total comp",
      your_minimum: "$185K base",
      your_batna: "Competing offer at $200K",
      market_context: "Senior engineers: $185-200K",
    });

    expect(result.isError).toBeUndefined();
    const output = JSON.parse(
      (result.content[0] as { type: "text"; text: string }).text
    );

    // Your position
    expect(output.your_position.target).toBeTruthy();
    expect(output.your_position.reservation_point).toBeTruthy();
    expect(output.your_position.batna_strength).toMatch(/^(strong|moderate|weak)$/);
    expect(output.your_position.anchor_recommendation).toBeTruthy();
    expect(output.your_position.rationale).toBeTruthy();

    // Their position
    expect(output.their_estimated_position.likely_target).toBeTruthy();
    expect(output.their_estimated_position.constraints).toBeInstanceOf(Array);
    expect(output.their_estimated_position.constraints.length).toBeGreaterThan(0);

    // ZOPA
    expect(typeof output.zopa.exists).toBe("boolean");

    // Leverage points
    expect(output.leverage_points.length).toBeGreaterThan(0);
    expect(output.leverage_points[0]).toHaveProperty("factor");
    expect(output.leverage_points[0]).toHaveProperty("who_it_favors");
    expect(output.leverage_points[0]).toHaveProperty("how_to_use_it");

    // Risk factors
    expect(output.risk_factors.length).toBeGreaterThan(0);
    expect(output.risk_factors[0]).toHaveProperty("risk");
    expect(output.risk_factors[0]).toHaveProperty("mitigation");

    // Tradeable issues
    expect(output.tradeable_issues.length).toBeGreaterThan(0);
  });

  it("preserves the negotiation_id in output", async () => {
    const result = await handlePosition({
      negotiation_id: "preserve-this-id",
      analysis: mockAnalysis,
      your_target: "$195K",
      your_minimum: "$185K",
    });

    const output = JSON.parse(
      (result.content[0] as { type: "text"; text: string }).text
    );
    expect(output.negotiation_id).toBe("preserve-this-id");
  });

  it("works without optional BATNA and market_context", async () => {
    const result = await handlePosition({
      negotiation_id: "test-id-456",
      analysis: mockAnalysis,
      your_target: "$195K",
      your_minimum: "$185K",
    });

    expect(result.isError).toBeUndefined();
  });
});
