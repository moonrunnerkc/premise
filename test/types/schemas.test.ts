/**
 * Tests for Zod schemas: validates that schemas accept valid inputs
 * and reject invalid inputs correctly.
 */

import { describe, it, expect } from "vitest";
import {
  AnalyzeInputSchema,
  PositionInputSchema,
  ScenariosInputSchema,
  SimStartInputSchema,
  SimRoundInputSchema,
  SimEndInputSchema,
  DebriefInputSchema,
} from "../../src/types/schemas.js";

describe("AnalyzeInputSchema", () => {
  it("accepts valid minimal input", () => {
    const result = AnalyzeInputSchema.safeParse({
      context: "I need to negotiate a salary raise with my manager next week.",
    });
    expect(result.success).toBe(true);
  });

  it("accepts input with all optional fields", () => {
    const result = AnalyzeInputSchema.safeParse({
      context: "Salary negotiation with my manager Sarah.",
      counterparty_emails: ["Hi team, budgets are tight this quarter..."],
      negotiation_type: "salary",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing context", () => {
    const result = AnalyzeInputSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects invalid negotiation_type", () => {
    const result = AnalyzeInputSchema.safeParse({
      context: "Some negotiation",
      negotiation_type: "invalid_type",
    });
    expect(result.success).toBe(false);
  });
});

describe("SimRoundInputSchema", () => {
  it("accepts valid input with session state blob", () => {
    const result = SimRoundInputSchema.safeParse({
      session_state: {
        version: 1,
        encoded: "dGVzdA==",
      },
      your_response: "I believe my contributions warrant a higher number.",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing session_state", () => {
    const result = SimRoundInputSchema.safeParse({
      your_response: "Some response",
    });
    expect(result.success).toBe(false);
  });

  it("rejects wrong version in session state", () => {
    const result = SimRoundInputSchema.safeParse({
      session_state: {
        version: 2,
        encoded: "dGVzdA==",
      },
      your_response: "Some response",
    });
    expect(result.success).toBe(false);
  });
});

describe("DebriefInputSchema", () => {
  it("accepts valid minimal input", () => {
    const result = DebriefInputSchema.safeParse({
      negotiation_id: "test-uuid-123",
      outcome: "Got a 12% raise, which was between my target and minimum.",
    });
    expect(result.success).toBe(true);
  });

  it("accepts input with all optional fields", () => {
    const result = DebriefInputSchema.safeParse({
      negotiation_id: "test-uuid-123",
      outcome: "Got the raise.",
      deal_terms: "12% raise effective next month",
      surprises: "They offered a title change too",
      counterparty_behavior: "More collaborative than expected",
    });
    expect(result.success).toBe(true);
  });
});

describe("SimEndInputSchema", () => {
  it("accepts valid input", () => {
    const result = SimEndInputSchema.safeParse({
      session_state: { version: 1, encoded: "dGVzdA==" },
      end_reason: "completed",
    });
    expect(result.success).toBe(true);
  });

  it("accepts without optional end_reason", () => {
    const result = SimEndInputSchema.safeParse({
      session_state: { version: 1, encoded: "dGVzdA==" },
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid end_reason", () => {
    const result = SimEndInputSchema.safeParse({
      session_state: { version: 1, encoded: "dGVzdA==" },
      end_reason: "other_reason",
    });
    expect(result.success).toBe(false);
  });
});
