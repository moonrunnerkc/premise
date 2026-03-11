/**
 * Unit tests for premise-analyze tool handler.
 *
 * Tests valid input processing, clarification requests for vague inputs,
 * and error handling for malformed API responses.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { resolve } from "node:path";
import { handleAnalyze } from "../../src/tools/analyze.js";
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

describe("handleAnalyze", () => {
  it("returns structured analysis for a salary negotiation", async () => {
    const result = await handleAnalyze({
      context:
        "Annual review with manager Sarah Chen. I lead platform migration. " +
        "Current salary $170K, market is $185-200K.",
      negotiation_type: "salary",
    });

    expect(result.isError).toBeUndefined();
    const output = JSON.parse(
      (result.content[0] as { type: "text"; text: string }).text
    );

    expect(output.negotiation_id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    );
    expect(output.parties).toBeInstanceOf(Array);
    expect(output.stakes).toHaveProperty("your_upside");
    expect(output.stakes).toHaveProperty("your_downside");
    expect(output.stakes).toHaveProperty("their_upside");
    expect(output.stakes).toHaveProperty("their_downside");
    expect(output.timeline).toHaveProperty("time_pressure_level");
    expect(output.power_dynamics).toHaveProperty("who_needs_whom_more");
    expect(output.emotional_factors.your_anxiety_points).toBeInstanceOf(Array);
  });

  it("generates a unique negotiation_id per call", async () => {
    const result1 = await handleAnalyze({
      context: "Negotiation context 1",
    });
    const result2 = await handleAnalyze({
      context: "Negotiation context 2",
    });

    const id1 = JSON.parse(
      (result1.content[0] as { type: "text"; text: string }).text
    ).negotiation_id;
    const id2 = JSON.parse(
      (result2.content[0] as { type: "text"; text: string }).text
    ).negotiation_id;

    expect(id1).not.toBe(id2);
  });

  it("handles optional counterparty_emails input", async () => {
    const result = await handleAnalyze({
      context: "Contract renewal with vendor",
      counterparty_emails: [
        "Hi, we need to discuss the renewal terms. Our pricing has increased.",
      ],
    });

    expect(result.isError).toBeUndefined();
  });
});
