/**
 * Core domain types for negotiation analysis, position mapping, and scenario planning.
 *
 * These types define the data contracts between tools. Each tool's output
 * matches these structures so downstream tools can consume them directly.
 */

export interface Party {
  readonly name: string;
  readonly role: string;
  readonly relationship: string;
  readonly estimated_power_level: "high" | "medium" | "low";
}

export interface Stakes {
  readonly your_upside: string;
  readonly your_downside: string;
  readonly their_upside: string;
  readonly their_downside: string;
}

export interface Timeline {
  readonly negotiation_date: string | null;
  readonly decision_deadline: string | null;
  readonly time_pressure_level: "high" | "medium" | "low";
}

export interface PowerDynamics {
  readonly who_needs_whom_more: string;
  readonly information_asymmetry: string;
  readonly relationship_value: string;
}

export interface EmotionalFactors {
  readonly your_anxiety_points: readonly string[];
  readonly their_likely_anxiety_points: readonly string[];
}

export interface NegotiationAnalysis {
  readonly negotiation_id: string;
  readonly parties: readonly Party[];
  readonly stakes: Stakes;
  readonly timeline: Timeline;
  readonly power_dynamics: PowerDynamics;
  readonly emotional_factors: EmotionalFactors;
}

export type NegotiationType =
  | "salary"
  | "contract"
  | "vendor"
  | "freelance"
  | "lease"
  | "other";

export interface YourPosition {
  readonly target: string;
  readonly reservation_point: string;
  readonly batna: string;
  readonly batna_strength: "strong" | "moderate" | "weak";
  readonly anchor_recommendation: string;
  readonly rationale: string;
}

export interface TheirEstimatedPosition {
  readonly likely_target: string;
  readonly likely_reservation: string;
  readonly likely_batna: string;
  readonly constraints: readonly string[];
  readonly incentives: readonly string[];
}

export interface ZOPA {
  readonly exists: boolean;
  readonly estimated_range: string;
  readonly confidence_level: "high" | "medium" | "low";
}

export interface LeveragePoint {
  readonly factor: string;
  readonly who_it_favors: "you" | "them" | "neutral";
  readonly how_to_use_it: string;
}

export interface RiskFactor {
  readonly risk: string;
  readonly probability: "high" | "medium" | "low";
  readonly mitigation: string;
}

export interface TradeableIssue {
  readonly issue: string;
  readonly your_priority: "high" | "medium" | "low";
  readonly their_likely_priority: "high" | "medium" | "low";
}

export interface PositionAnalysis {
  readonly negotiation_id: string;
  readonly your_position: YourPosition;
  readonly their_estimated_position: TheirEstimatedPosition;
  readonly zopa: ZOPA;
  readonly leverage_points: readonly LeveragePoint[];
  readonly risk_factors: readonly RiskFactor[];
  readonly tradeable_issues: readonly TradeableIssue[];
}

export interface RecommendedResponse {
  readonly response: string;
  readonly rationale: string;
  readonly tradeoffs: string;
  readonly leads_to: string | null;
}

export interface ScenarioBranch {
  readonly id: string;
  readonly parent_id: string | null;
  readonly counterparty_move: string;
  readonly probability: "high" | "medium" | "low";
  readonly recommended_responses: readonly RecommendedResponse[];
  readonly emotional_temperature: "calm" | "tense" | "heated";
  readonly page_title: string;
}

export interface ScenarioTree {
  readonly negotiation_id: string;
  readonly root: { readonly description: string };
  readonly branches: readonly ScenarioBranch[];
}

export type CounterpartyStyle =
  | "collaborative"
  | "aggressive"
  | "avoidant"
  | "analytical";

export type SimulationStatus =
  | "active"
  | "deal_reached"
  | "breakdown"
  | "max_rounds";

export interface TranscriptEntry {
  readonly round: number;
  readonly speaker: "user" | "counterparty";
  readonly message: string;
  readonly tactical_note: string | null;
}

export interface SimulationOutcome {
  readonly deal_reached: boolean;
  readonly final_terms: string | null;
  readonly rounds_taken: number;
}

export interface PostMortem {
  readonly strengths: readonly string[];
  readonly weaknesses: readonly string[];
  readonly missed_opportunities: readonly string[];
  readonly suggested_adjustments: readonly string[];
}

export interface CounterpartyInnerState {
  readonly round: number;
  readonly private_thoughts: string;
  readonly concession_readiness: "ready" | "considering" | "firm";
  readonly probing_intent: string;
}

export interface PrepVsReality {
  readonly position_accuracy: string;
  readonly scenario_accuracy: string;
  readonly simulation_accuracy: string;
}

export interface Lesson {
  readonly lesson: string;
  readonly evidence: string;
  readonly applies_to_future: string;
}

export type ScenarioVerdict =
  | "happened"
  | "partially_happened"
  | "did_not_happen"
  | "happened_differently";

export interface ScenarioVerdictEntry {
  readonly scenario_id: string;
  readonly verdict: ScenarioVerdict;
  readonly notes: string;
}

export interface SimulationComparison {
  readonly most_realistic_round: number | null;
  readonly least_realistic_round: number | null;
  readonly counterparty_accuracy: string;
}
