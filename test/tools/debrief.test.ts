/**
 * Unit tests for premise-debrief tool handler.
 *
 * Tests outcome summary, scenario verdicts, lessons, and error handling.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { resolve } from "node:path";
import { handleDebrief } from "../../src/tools/debrief.js";
import { resetConfig } from "../../src/lib/config.js";

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

describe("handleDebrief", () => {
  it("returns comprehensive debrief with scenario verdicts", async () => {
    const result = await handleDebrief({
      negotiation_id: "test-debrief",
      outcome: "Got $190K with promotion path to Staff Engineer",
      deal_terms: "$190K base, Staff criteria documented, quarterly check-ins",
      surprises: "Sarah was more collaborative than expected",
      counterparty_behavior: "Opened with standard band, quickly moved to problem-solving",
    });

    expect(result.isError).toBeUndefined();

    const output = JSON.parse(
      (result.content[0] as { type: "text"; text: string }).text
    );

    expect(output.outcome_summary).toBeTruthy();
    expect(output.prep_vs_reality.position_accuracy).toBeTruthy();
    expect(output.prep_vs_reality.scenario_accuracy).toBeTruthy();
    expect(output.prep_vs_reality.simulation_accuracy).toBeTruthy();

    // Lessons
    expect(output.lessons.length).toBeGreaterThan(0);
    for (const lesson of output.lessons) {
      expect(lesson.lesson).toBeTruthy();
      expect(lesson.evidence).toBeTruthy();
      expect(lesson.applies_to_future).toBeTruthy();
    }

    // Effectiveness score
    expect(output.effectiveness_score).toBeGreaterThanOrEqual(1);
    expect(output.effectiveness_score).toBeLessThanOrEqual(10);

    // Scenario verdicts
    expect(output.scenario_verdicts.length).toBeGreaterThan(0);
    for (const verdict of output.scenario_verdicts) {
      expect(verdict.scenario_id).toBeTruthy();
      expect(verdict.verdict).toMatch(
        /^(happened|partially_happened|did_not_happen|happened_differently)$/
      );
      expect(verdict.notes).toBeTruthy();
    }

    // Simulation comparison
    expect(output.simulation_comparison.counterparty_accuracy).toBeTruthy();

    // Pattern update
    expect(output.pattern_update).toBeTruthy();
  });

  it("works with only required fields", async () => {
    const result = await handleDebrief({
      negotiation_id: "minimal-debrief",
      outcome: "Got the raise",
    });

    expect(result.isError).toBeUndefined();
  });

  it("handles gracefully when mock is unavailable", async () => {
    // Temporarily point to a non-existent mock dir
    process.env["PREMISE_MOCK_DIR"] = "/nonexistent/dir";
    resetConfig();

    const result = await handleDebrief({
      negotiation_id: "bad-mock-test",
      outcome: "Test outcome",
    });

    expect(result.isError).toBe(true);
    const output = JSON.parse(
      (result.content[0] as { type: "text"; text: string }).text
    );
    expect(output.error).toContain("Debrief failed");

    // Restore
    process.env["PREMISE_MOCK_DIR"] = MOCK_DIR;
    resetConfig();
  });
});
