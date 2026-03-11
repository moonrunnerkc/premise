/**
 * Tests for formatting utilities.
 */

import { describe, it, expect } from "vitest";
import {
  formatPositionAnalysis,
  formatScenarioBranch,
  formatSimulationTranscript,
} from "../../src/lib/formatting.js";
import type { PositionAnalysis, ScenarioBranch } from "../../src/types/negotiation.js";

describe("formatPositionAnalysis", () => {
  it("produces markdown with all sections", () => {
    const position: PositionAnalysis = {
      negotiation_id: "test",
      your_position: {
        target: "$145,000",
        reservation_point: "$135,000",
        batna: "Competing offer at $140,000",
        batna_strength: "strong",
        anchor_recommendation: "Open at $150,000",
        rationale: "Strong BATNA supports aggressive anchor",
      },
      their_estimated_position: {
        likely_target: "$128,000",
        likely_reservation: "$142,000",
        likely_batna: "Promote from within",
        constraints: ["Budget freeze"],
        incentives: ["Avoid replacement costs"],
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
          how_to_use_it: "Mention factually",
        },
      ],
      risk_factors: [
        {
          risk: "Manager feels cornered",
          probability: "medium",
          mitigation: "Frame collaboratively",
        },
      ],
      tradeable_issues: [
        {
          issue: "Remote days",
          your_priority: "medium",
          their_likely_priority: "low",
        },
      ],
    };

    const markdown = formatPositionAnalysis(position);
    expect(markdown).toContain("## Your Position");
    expect(markdown).toContain("$145,000");
    expect(markdown).toContain("## Their Estimated Position");
    expect(markdown).toContain("## ZOPA Analysis");
    expect(markdown).toContain("## Leverage Points");
    expect(markdown).toContain("## Risk Factors");
    expect(markdown).toContain("## Tradeable Issues");
    expect(markdown).toContain("Remote days");
  });
});

describe("formatScenarioBranch", () => {
  it("formats a branch with recommended responses", () => {
    const branch: ScenarioBranch = {
      id: "branch-1",
      parent_id: null,
      counterparty_move: 'They say "budgets are frozen until Q4"',
      probability: "high",
      recommended_responses: [
        {
          response: "Ask about non-monetary alternatives",
          rationale: "Shifts to tradeable issues",
          tradeoffs: "May signal you will accept less cash",
          leads_to: "Title/equity discussion",
        },
      ],
      emotional_temperature: "tense",
      page_title: "Budget Freeze Objection",
    };

    const markdown = formatScenarioBranch(branch);
    expect(markdown).toContain("budgets are frozen");
    expect(markdown).toContain("Recommended Responses");
    expect(markdown).toContain("non-monetary alternatives");
  });
});

describe("formatSimulationTranscript", () => {
  it("formats a multi-round transcript", () => {
    const transcript = [
      { round: 1, speaker: "user", message: "I'd like a raise.", tactical_note: null },
      { round: 1, speaker: "counterparty", message: "Let's discuss that.", tactical_note: "They're open to hearing your case." },
      { round: 2, speaker: "user", message: "I have a competing offer.", tactical_note: null },
      { round: 2, speaker: "counterparty", message: "Tell me more.", tactical_note: "They shifted to information gathering." },
    ];

    const markdown = formatSimulationTranscript(transcript);
    expect(markdown).toContain("## Round 1");
    expect(markdown).toContain("## Round 2");
    expect(markdown).toContain("**You**");
    expect(markdown).toContain("**Counterparty**");
    expect(markdown).toContain("Coach:");
  });
});
