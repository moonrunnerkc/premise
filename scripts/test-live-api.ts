/**
 * Live API test script.
 *
 * Exercises premise-analyze and premise-position against the real Anthropic API
 * to validate prompt quality per the Phase 2 Gate criteria:
 *
 * - Analysis produces output a real person would find useful
 * - Position identifies at least one non-obvious leverage point
 * - ZOPA is internally consistent
 * - Different negotiation types produce meaningfully different outputs
 *
 * Usage: npx tsx scripts/test-live-api.ts
 * Requires: ANTHROPIC_API_KEY set in .env or environment
 *
 * Captures raw API responses to demo/mock-responses/ for later use as test fixtures.
 */

import { config } from "dotenv";
config();

import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { handleAnalyze } from "../src/tools/analyze.js";
import { handlePosition } from "../src/tools/position.js";
import { handleScenarios } from "../src/tools/scenarios.js";
import { resetConfig } from "../src/lib/config.js";
import type { AnalyzeOutput, PositionOutput, ScenariosOutput } from "../src/types/schemas.js";

// Force fresh config load (picks up .env)
resetConfig();

const MOCK_DIR = join(import.meta.dirname, "..", "demo", "mock-responses");

interface TestScenario {
  readonly name: string;
  readonly context: string;
  readonly negotiationType: "salary" | "contract" | "vendor" | "freelance" | "lease" | "other";
  readonly yourTarget: string;
  readonly yourMinimum: string;
  readonly yourBatna?: string;
  readonly marketContext?: string;
}

const SCENARIOS: readonly TestScenario[] = [
  {
    name: "salary",
    context: `I'm a senior software engineer at a mid-size fintech company (Series C, ~400 employees). 
I've been here 2.5 years, promoted from mid-level to senior 8 months ago. My current base is $175K. 
I'm meeting with my manager Sarah Chen next Thursday for our annual review. 
I led the migration of our payment processing system from a legacy monolith to microservices over the last year, 
which reduced transaction failures by 40% and saved the company roughly $2M annually in operational costs. 
I have a competing offer from a FAANG company at $210K base + RSUs, but I'd prefer to stay because 
I like my team and the company trajectory. Two of my peers with similar experience recently left for 
$195-205K packages. The company just closed a Series C at $1.2B valuation and hired 80 people in Q4.`,
    negotiationType: "salary",
    yourTarget: "$195,000 base salary with a $15K signing bonus for equity gap",
    yourMinimum: "$185,000 base salary",
    yourBatna: "FAANG offer at $210K base + RSUs, but would require relocation and starting fresh",
    marketContext: "Senior SWE market rate in this metro: $185-215K for fintech. Two peers left for $195-205K. Company raised Series C at $1.2B, aggressive hiring.",
  },
  {
    name: "freelance",
    context: `I'm a freelance UX designer who has been working with a startup client (Trellis, seed-stage, 
12 employees) for the past 6 months on a month-to-month contract at $95/hr. They want me to sign 
a 6-month retainer agreement. The founder, Jake Rivera, has mentioned they are about to close their 
Series A and will need a full redesign of their B2B SaaS dashboard. I've been the sole designer 
and know their product deeply. They tried to hire a full-time designer 3 months ago but the candidate 
declined. My other clients are steady but not growing. The project would be 25-30 hours per week.`,
    negotiationType: "freelance",
    yourTarget: "$130/hr on a 6-month retainer with a minimum 20hr/week guarantee",
    yourMinimum: "$115/hr with a 15hr/week guarantee",
    yourBatna: "Continue month-to-month with current clients at $95/hr, stable but no growth",
    marketContext: "Senior UX contractors in B2B SaaS: $110-150/hr. Retainers typically command 10-15% premium over hourly for guaranteed availability.",
  },
  {
    name: "vendor",
    context: `Our company (a 200-person marketing agency) is renewing our annual contract with DataPulse, 
a marketing analytics SaaS provider. We've been their customer for 3 years. Our current contract 
is $84,000/year for 50 seats. They've sent a renewal proposal at $96,000/year (14% increase), 
citing "enhanced AI features." I'm negotiating with their account manager, Priya Sharma. We use 
about 35 of the 50 seats actively. A competitor, Metric360, quoted us $72,000/year for equivalent 
functionality but migration would take 2 months and disrupt our Q2 client campaigns. Our team has 
built custom integrations with DataPulse that would take ~3 weeks to rebuild.`,
    negotiationType: "vendor",
    yourTarget: "$78,000/year for 40 seats with price lock for 2 years",
    yourMinimum: "$88,000/year for current 50 seats",
    yourBatna: "Switch to Metric360 at $72K/year, accepting 2-month migration disruption",
    marketContext: "Marketing analytics SaaS: $1,500-2,000 per seat/year is typical. DataPulse charges $1,680/seat current, $1,920/seat proposed. Metric360 at $1,440/seat.",
  },
];

function extractOutput<T>(result: { content: Array<{ type: string; text?: string }> }): T {
  const textContent = result.content.find((c) => c.type === "text");
  if (!textContent || !("text" in textContent)) {
    throw new Error("No text content in tool result");
  }
  return JSON.parse(textContent.text as string) as T;
}

async function testScenario(scenario: TestScenario): Promise<void> {
  const divider = "=".repeat(70);
  console.log(`\n${divider}`);
  console.log(`SCENARIO: ${scenario.name.toUpperCase()}`);
  console.log(divider);

  // Step 1: Analyze
  console.log("\n--- premise-analyze ---");
  const analyzeStart = Date.now();
  const analyzeResult = await handleAnalyze({
    context: scenario.context,
    negotiation_type: scenario.negotiationType,
  });
  const analyzeMs = Date.now() - analyzeStart;

  if ("isError" in analyzeResult && analyzeResult.isError) {
    console.error("ANALYZE FAILED:", analyzeResult.content);
    return;
  }

  const analysis = extractOutput<AnalyzeOutput>(analyzeResult);
  console.log(`  Time: ${analyzeMs}ms`);
  console.log(`  Negotiation ID: ${analysis.negotiation_id}`);
  console.log(`  Parties: ${analysis.parties.map((p) => `${p.name} (${p.role}, power: ${p.estimated_power_level})`).join(", ")}`);
  console.log(`  Stakes: upside="${analysis.stakes.your_upside}", downside="${analysis.stakes.your_downside}"`);
  console.log(`  Timeline: pressure=${analysis.timeline.time_pressure_level}`);
  console.log(`  Power: ${analysis.power_dynamics.who_needs_whom_more}`);
  console.log(`  Emotional: your anxiety=${JSON.stringify(analysis.emotional_factors.your_anxiety_points)}`);

  // Step 2: Position
  console.log("\n--- premise-position ---");
  const positionStart = Date.now();
  const positionResult = await handlePosition({
    negotiation_id: analysis.negotiation_id,
    analysis,
    your_target: scenario.yourTarget,
    your_minimum: scenario.yourMinimum,
    your_batna: scenario.yourBatna,
    market_context: scenario.marketContext,
  });
  const positionMs = Date.now() - positionStart;

  if ("isError" in positionResult && positionResult.isError) {
    console.error("POSITION FAILED:", positionResult.content);
    return;
  }

  const positions = extractOutput<PositionOutput>(positionResult);
  console.log(`  Time: ${positionMs}ms`);
  console.log(`  Your target: ${positions.your_position.target}`);
  console.log(`  Your anchor recommendation: ${positions.your_position.anchor_recommendation}`);
  console.log(`  Their likely target: ${positions.their_estimated_position.likely_target}`);
  console.log(`  Their likely reservation: ${positions.their_estimated_position.likely_reservation}`);
  console.log(`  ZOPA: exists=${positions.zopa.exists}, range="${positions.zopa.estimated_range}", confidence=${positions.zopa.confidence_level}`);
  console.log(`  Leverage points (${positions.leverage_points.length}):`);
  for (const lp of positions.leverage_points) {
    console.log(`    - [${lp.who_it_favors}] ${lp.factor}: ${lp.how_to_use_it}`);
  }
  console.log(`  Risk factors (${positions.risk_factors.length}):`);
  for (const rf of positions.risk_factors) {
    console.log(`    - [${rf.probability}] ${rf.risk}`);
  }
  console.log(`  Tradeable issues (${positions.tradeable_issues.length}):`);
  for (const ti of positions.tradeable_issues) {
    console.log(`    - ${ti.issue} (you: ${ti.your_priority}, them: ${ti.their_likely_priority})`);
  }

  // Step 3: Scenarios
  console.log("\n--- premise-scenarios ---");
  const scenariosStart = Date.now();
  const scenariosResult = await handleScenarios({
    negotiation_id: analysis.negotiation_id,
    analysis,
    positions,
    depth: 2,
  });
  const scenariosMs = Date.now() - scenariosStart;

  if ("isError" in scenariosResult && scenariosResult.isError) {
    console.error("SCENARIOS FAILED:", scenariosResult.content);
    return;
  }

  const scenarios = extractOutput<ScenariosOutput>(scenariosResult);
  console.log(`  Time: ${scenariosMs}ms`);
  console.log(`  Root: ${scenarios.root.description}`);
  console.log(`  Branches (${scenarios.branches.length}):`);
  for (const branch of scenarios.branches) {
    const indent = branch.parent_id ? "      " : "    ";
    console.log(`${indent}- [${branch.probability}] ${branch.counterparty_move}`);
    console.log(`${indent}  Page: "${branch.page_title}" | Temp: ${branch.emotional_temperature}`);
  }

  // Save responses for the first scenario (salary) as mock fixtures
  if (scenario.name === "salary") {
    console.log("\n--- Saving salary responses as mock fixtures ---");
    await mkdir(MOCK_DIR, { recursive: true });

    // Strip negotiation_id from analysis before saving (server generates it)
    const { negotiation_id: _stripId, ...analysisWithoutId } = analysis;
    await writeFile(
      join(MOCK_DIR, "analyze-salary.json"),
      JSON.stringify(analysisWithoutId, null, 2)
    );

    const { negotiation_id: _stripPosId, ...positionsWithoutId } = positions;
    await writeFile(
      join(MOCK_DIR, "position-salary.json"),
      JSON.stringify(positionsWithoutId, null, 2)
    );

    await writeFile(
      join(MOCK_DIR, "scenarios-salary.json"),
      JSON.stringify(scenarios, null, 2)
    );

    console.log("  Saved: analyze-salary.json, position-salary.json, scenarios-salary.json");
  }

  console.log(`\n  TOTAL: ${analyzeMs + positionMs + scenariosMs}ms`);
}

async function main(): Promise<void> {
  console.log("Premise Live API Test");
  console.log("=====================");
  console.log(`Model: ${process.env["PREMISE_MODEL"] ?? "claude-sonnet-4-20250514"}`);
  console.log(`API Key: ${process.env["ANTHROPIC_API_KEY"]?.slice(0, 12)}...`);

  for (const scenario of SCENARIOS) {
    await testScenario(scenario);
  }

  console.log("\n\nDone. Review outputs above against Phase 2 Gate criteria.");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
