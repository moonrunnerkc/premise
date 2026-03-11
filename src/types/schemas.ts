/**
 * Zod schemas for all tool inputs and outputs.
 *
 * Each tool's input schema is exported as a Zod object that the MCP SDK
 * validates automatically. Output schemas define the structure returned
 * to the orchestrator as JSON text content.
 */

import { z } from "zod";

// Shared enums
const NegotiationTypeSchema = z.enum([
  "salary",
  "contract",
  "vendor",
  "freelance",
  "lease",
  "other",
]);

const PriorityLevelSchema = z.enum(["high", "medium", "low"]);

const CounterpartyStyleSchema = z.enum([
  "collaborative",
  "aggressive",
  "avoidant",
  "analytical",
]);

const SimulationStatusSchema = z.enum([
  "active",
  "deal_reached",
  "breakdown",
  "max_rounds",
]);

const ScenarioVerdictSchema = z.enum([
  "happened",
  "partially_happened",
  "did_not_happen",
  "happened_differently",
]);

// ─── premise-analyze ───

export const AnalyzeInputSchema = z.object({
  context: z
    .string()
    .describe("Free-text description of the upcoming negotiation"),
  counterparty_emails: z
    .array(z.string())
    .optional()
    .describe("Email snippets from Gmail MCP for counterparty context"),
  negotiation_type: NegotiationTypeSchema.optional().describe(
    "Type of negotiation if known"
  ),
});

export type AnalyzeInput = z.infer<typeof AnalyzeInputSchema>;

export const AnalyzeOutputSchema = z.object({
  negotiation_id: z.string(),
  parties: z.array(
    z.object({
      name: z.string(),
      role: z.string(),
      relationship: z.string(),
      estimated_power_level: PriorityLevelSchema,
    })
  ),
  stakes: z.object({
    your_upside: z.string(),
    your_downside: z.string(),
    their_upside: z.string(),
    their_downside: z.string(),
  }),
  timeline: z.object({
    negotiation_date: z.string().nullable(),
    decision_deadline: z.string().nullable(),
    time_pressure_level: PriorityLevelSchema,
  }),
  power_dynamics: z.object({
    who_needs_whom_more: z.string(),
    information_asymmetry: z.string(),
    relationship_value: z.string(),
  }),
  emotional_factors: z.object({
    your_anxiety_points: z.array(z.string()),
    their_likely_anxiety_points: z.array(z.string()),
  }),
});

export type AnalyzeOutput = z.infer<typeof AnalyzeOutputSchema>;

// ─── premise-position ───

export const PositionInputSchema = z.object({
  negotiation_id: z
    .string()
    .describe("ID from premise-analyze linking this negotiation"),
  analysis: AnalyzeOutputSchema.describe("Full output from premise-analyze"),
  your_target: z.string().describe("What you are aiming for in this negotiation"),
  your_minimum: z.string().describe("Your walk-away point"),
  your_batna: z
    .string()
    .optional()
    .describe("Your best alternative to a negotiated agreement"),
  market_context: z
    .string()
    .optional()
    .describe("Market data, benchmarks, or comparables"),
});

export type PositionInput = z.infer<typeof PositionInputSchema>;

export const PositionOutputSchema = z.object({
  negotiation_id: z.string(),
  your_position: z.object({
    target: z.string(),
    reservation_point: z.string(),
    batna: z.string(),
    batna_strength: z.enum(["strong", "moderate", "weak"]),
    anchor_recommendation: z.string(),
    rationale: z.string(),
  }),
  their_estimated_position: z.object({
    likely_target: z.string(),
    likely_reservation: z.string(),
    likely_batna: z.string(),
    constraints: z.array(z.string()),
    incentives: z.array(z.string()),
  }),
  zopa: z.object({
    exists: z.boolean(),
    estimated_range: z.string(),
    confidence_level: PriorityLevelSchema,
  }),
  leverage_points: z.array(
    z.object({
      factor: z.string(),
      who_it_favors: z.enum(["you", "them", "neutral"]),
      how_to_use_it: z.string(),
    })
  ),
  risk_factors: z.array(
    z.object({
      risk: z.string(),
      probability: PriorityLevelSchema,
      mitigation: z.string(),
    })
  ),
  tradeable_issues: z.array(
    z.object({
      issue: z.string(),
      your_priority: PriorityLevelSchema,
      their_likely_priority: PriorityLevelSchema,
    })
  ),
});

export type PositionOutput = z.infer<typeof PositionOutputSchema>;

// ─── premise-scenarios ───

export const ScenariosInputSchema = z.object({
  negotiation_id: z.string().describe("ID from premise-analyze"),
  analysis: AnalyzeOutputSchema.describe("Full output from premise-analyze"),
  positions: PositionOutputSchema.describe("Full output from premise-position"),
  depth: z
    .number()
    .min(1)
    .max(3)
    .optional()
    .describe("Levels deep for the decision tree (default 2)"),
  focus: z
    .string()
    .optional()
    .describe("Specific concern or anxiety to explore in depth"),
});

export type ScenariosInput = z.infer<typeof ScenariosInputSchema>;

const RecommendedResponseSchema = z.object({
  response: z.string(),
  rationale: z.string(),
  tradeoffs: z.string(),
  leads_to: z.string().nullable(),
});

const ScenarioBranchSchema = z.object({
  id: z.string(),
  parent_id: z.string().nullable(),
  counterparty_move: z.string(),
  probability: PriorityLevelSchema,
  recommended_responses: z.array(RecommendedResponseSchema),
  emotional_temperature: z.enum(["calm", "tense", "heated"]),
  page_title: z.string(),
});

export const ScenariosOutputSchema = z.object({
  negotiation_id: z.string(),
  root: z.object({ description: z.string() }),
  branches: z.array(ScenarioBranchSchema),
});

export type ScenariosOutput = z.infer<typeof ScenariosOutputSchema>;

// ─── premise-sim-start ───

export const SimStartInputSchema = z.object({
  negotiation_id: z.string().describe("ID from premise-analyze"),
  analysis: AnalyzeOutputSchema.describe("Full output from premise-analyze"),
  positions: PositionOutputSchema.describe("Full output from premise-position"),
  counterparty_style: CounterpartyStyleSchema.optional().describe(
    "Counterparty personality style for the simulation"
  ),
  your_opening: z
    .string()
    .describe("How you open the negotiation conversation"),
  max_rounds: z
    .number()
    .min(1)
    .max(20)
    .optional()
    .describe("Maximum simulation rounds (default 8)"),
});

export type SimStartInput = z.infer<typeof SimStartInputSchema>;

/** Session state blob is opaque to the orchestrator */
const SessionStateBlobSchema = z.object({
  version: z.literal(1),
  encoded: z.string(),
});

export const SimStartOutputSchema = z.object({
  session_state: SessionStateBlobSchema,
  counterparty_response: z.string(),
  tactical_note: z.string(),
  round: z.number(),
  max_rounds: z.number(),
  status: z.literal("active"),
});

export type SimStartOutput = z.infer<typeof SimStartOutputSchema>;

// ─── premise-sim-round ───

export const SimRoundInputSchema = z.object({
  session_state: SessionStateBlobSchema.describe(
    "Opaque session state from previous sim-start or sim-round"
  ),
  your_response: z
    .string()
    .describe("What you say or do in this round of the negotiation"),
});

export type SimRoundInput = z.infer<typeof SimRoundInputSchema>;

export const SimRoundOutputSchema = z.object({
  session_state: SessionStateBlobSchema,
  counterparty_response: z.string(),
  tactical_note: z.string(),
  round: z.number(),
  status: SimulationStatusSchema,
  deal_terms: z.string().nullable().optional(),
});

export type SimRoundOutput = z.infer<typeof SimRoundOutputSchema>;

// ─── premise-sim-end ───

export const SimEndInputSchema = z.object({
  session_state: SessionStateBlobSchema.describe("Final session state"),
  end_reason: z
    .enum(["completed", "user_quit", "restart"])
    .optional()
    .describe("Why the simulation ended"),
});

export type SimEndInput = z.infer<typeof SimEndInputSchema>;

const TranscriptEntrySchema = z.object({
  round: z.number(),
  speaker: z.enum(["user", "counterparty"]),
  message: z.string(),
  tactical_note: z.string().nullable(),
});

const CounterpartyInnerStateSchema = z.object({
  round: z.number(),
  private_thoughts: z.string(),
  concession_readiness: z.enum(["ready", "considering", "firm"]),
  probing_intent: z.string(),
});

export const SimEndOutputSchema = z.object({
  transcript: z.array(TranscriptEntrySchema),
  outcome: z.object({
    deal_reached: z.boolean(),
    final_terms: z.string().nullable(),
    rounds_taken: z.number(),
  }),
  post_mortem: z.object({
    strengths: z.array(z.string()),
    weaknesses: z.array(z.string()),
    missed_opportunities: z.array(z.string()),
    suggested_adjustments: z.array(z.string()),
  }),
  counterparty_inner_state: z.array(CounterpartyInnerStateSchema),
  recommended_retry_focus: z.string(),
  scenario_matches: z.array(z.string()),
});

export type SimEndOutput = z.infer<typeof SimEndOutputSchema>;

// ─── premise-debrief ───

export const DebriefInputSchema = z.object({
  negotiation_id: z.string().describe("ID from premise-analyze"),
  outcome: z
    .string()
    .describe("Free-text description of how the real negotiation went"),
  deal_terms: z.string().optional().describe("What was agreed, if anything"),
  surprises: z
    .string()
    .optional()
    .describe("What surprised you during the negotiation"),
  counterparty_behavior: z
    .string()
    .optional()
    .describe("How the counterparty actually behaved"),
});

export type DebriefInput = z.infer<typeof DebriefInputSchema>;

export const DebriefOutputSchema = z.object({
  outcome_summary: z.string(),
  prep_vs_reality: z.object({
    position_accuracy: z.string(),
    scenario_accuracy: z.string(),
    simulation_accuracy: z.string(),
  }),
  lessons: z.array(
    z.object({
      lesson: z.string(),
      evidence: z.string(),
      applies_to_future: z.string(),
    })
  ),
  pattern_update: z.string(),
  effectiveness_score: z.number().min(1).max(10),
  scenario_verdicts: z.array(
    z.object({
      scenario_id: z.string(),
      verdict: ScenarioVerdictSchema,
      notes: z.string(),
    })
  ),
  simulation_comparison: z.object({
    most_realistic_round: z.number().nullable(),
    least_realistic_round: z.number().nullable(),
    counterparty_accuracy: z.string(),
  }),
});

export type DebriefOutput = z.infer<typeof DebriefOutputSchema>;
