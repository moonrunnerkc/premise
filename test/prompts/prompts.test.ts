/**
 * Tests for prompt template builders.
 * Verifies that prompts are assembled correctly from structured inputs.
 */

import { describe, it, expect } from "vitest";
import {
  buildAnalysisSystemPrompt,
  buildAnalysisUserMessage,
} from "../../src/prompts/analysis.js";
import {
  buildCounterpartySystemPrompt,
  buildCounterpartyUserMessage,
} from "../../src/prompts/counterparty.js";
import {
  buildScenarioGenSystemPrompt,
  buildScenarioGenUserMessage,
} from "../../src/prompts/scenario-gen.js";
import type { AnalyzeOutput, PositionOutput } from "../../src/types/schemas.js";

const SAMPLE_ANALYSIS: AnalyzeOutput = {
  negotiation_id: "test-123",
  parties: [
    {
      name: "Sarah Chen",
      role: "Engineering Manager",
      relationship: "Direct manager for 2 years",
      estimated_power_level: "high",
    },
  ],
  stakes: {
    your_upside: "15% salary increase",
    your_downside: "Strained relationship, no raise",
    their_upside: "Retain a strong engineer at reasonable cost",
    their_downside: "Lose engineer, expensive replacement",
  },
  timeline: {
    negotiation_date: "2026-03-20",
    decision_deadline: "2026-04-01",
    time_pressure_level: "medium",
  },
  power_dynamics: {
    who_needs_whom_more: "Roughly balanced; you have offers, they have retention budget",
    information_asymmetry: "They know the budget ceiling; you know the competing offer",
    relationship_value: "High; two-year working relationship with mutual respect",
  },
  emotional_factors: {
    your_anxiety_points: ["Appearing greedy", "Damaging the relationship"],
    their_likely_anxiety_points: ["Losing a key team member", "Setting a precedent"],
  },
};

const SAMPLE_POSITIONS: PositionOutput = {
  negotiation_id: "test-123",
  your_position: {
    target: "$145,000",
    reservation_point: "$135,000",
    batna: "Competing offer at $140,000",
    batna_strength: "strong",
    anchor_recommendation: "Open at $150,000",
    rationale: "Strong BATNA supports an aggressive anchor",
  },
  their_estimated_position: {
    likely_target: "$128,000",
    likely_reservation: "$142,000",
    likely_batna: "Promote from within at lower cost",
    constraints: ["Q3 budget freeze", "Company-wide raise cap at 12%"],
    incentives: ["Avoid replacement costs ($50k+)", "Retain domain expertise"],
  },
  zopa: {
    exists: true,
    estimated_range: "$135,000 - $142,000",
    confidence_level: "medium",
  },
  leverage_points: [
    {
      factor: "Competing offer",
      who_it_favors: "you",
      how_to_use_it: "Mention it factually, not as a threat",
    },
  ],
  risk_factors: [
    {
      risk: "Manager feels cornered",
      probability: "medium",
      mitigation: "Frame as collaborative problem-solving",
    },
  ],
  tradeable_issues: [
    {
      issue: "Remote work days",
      your_priority: "medium",
      their_likely_priority: "low",
    },
  ],
};

describe("analysis prompt", () => {
  it("builds a system prompt requesting JSON output", () => {
    const prompt = buildAnalysisSystemPrompt();
    expect(prompt).toContain("JSON");
    expect(prompt).toContain("parties");
    expect(prompt).toContain("stakes");
    expect(prompt).toContain("power_dynamics");
  });

  it("builds user message with context", () => {
    const message = buildAnalysisUserMessage({
      context: "I need a raise from my manager Sarah.",
    });
    expect(message).toContain("I need a raise from my manager Sarah.");
  });

  it("includes negotiation type when provided", () => {
    const message = buildAnalysisUserMessage({
      context: "Salary discussion",
      negotiation_type: "salary",
    });
    expect(message).toContain("salary");
  });

  it("includes email context when provided", () => {
    const message = buildAnalysisUserMessage({
      context: "Negotiation context",
      counterparty_emails: ["Budget is tight this quarter."],
    });
    expect(message).toContain("Email History");
    expect(message).toContain("Budget is tight this quarter.");
  });
});

describe("counterparty prompt", () => {
  it("builds persona for aggressive style", () => {
    const prompt = buildCounterpartySystemPrompt(
      SAMPLE_ANALYSIS,
      SAMPLE_POSITIONS,
      "aggressive"
    );
    expect(prompt).toContain("Sarah Chen");
    expect(prompt).toContain("aggressive");
    expect(prompt).toContain("$128,000");
    expect(prompt).toContain("hidden_metadata");
  });

  it("builds persona for collaborative style", () => {
    const prompt = buildCounterpartySystemPrompt(
      SAMPLE_ANALYSIS,
      SAMPLE_POSITIONS,
      "collaborative"
    );
    expect(prompt).toContain("collaborative");
    expect(prompt).toContain("mutually beneficial");
  });

  it("wraps user dialogue correctly", () => {
    const message = buildCounterpartyUserMessage("I'd like to discuss a raise.");
    expect(message).toContain("I'd like to discuss a raise.");
    expect(message).toContain("other party says");
  });
});

describe("scenario-gen prompt", () => {
  it("builds system prompt requesting branch structure", () => {
    const prompt = buildScenarioGenSystemPrompt();
    expect(prompt).toContain("branches");
    expect(prompt).toContain("counterparty_move");
    expect(prompt).toContain("recommended_responses");
  });

  it("includes position data in user message", () => {
    const message = buildScenarioGenUserMessage(
      SAMPLE_ANALYSIS,
      SAMPLE_POSITIONS,
      2,
      undefined
    );
    expect(message).toContain("$145,000");
    expect(message).toContain("$128,000");
    expect(message).toContain("Competing offer");
  });

  it("includes focus area when specified", () => {
    const message = buildScenarioGenUserMessage(
      SAMPLE_ANALYSIS,
      SAMPLE_POSITIONS,
      2,
      "What if they bring up the budget freeze?"
    );
    expect(message).toContain("budget freeze");
    expect(message).toContain("Special Focus");
  });
});
