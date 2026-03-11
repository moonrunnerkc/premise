/**
 * Full Orchestrator Flow Test
 *
 * Simulates what Claude Desktop does when following workflow/premise-workflow.md:
 * 1. Call premise-analyze with a negotiation description
 * 2. Call premise-position with analysis + user targets
 * 3. Call premise-scenarios with analysis + positions
 * 4. Create full Notion workspace from the results
 * 5. Call premise-sim-start, premise-sim-round, premise-sim-end
 * 6. Write simulation results to Notion
 * 7. Call premise-debrief, update scenario verdicts in Notion
 *
 * Uses PREMISE_MOCK_DIR for Premise tool calls (no Anthropic API needed).
 * Uses real Notion API for workspace creation.
 *
 * Usage: npx tsx scripts/test-orchestrator-flow.ts
 * Requires: NOTION_TOKEN and NOTION_PARENT_PAGE_ID in .env
 */

import { config } from "dotenv";
config();

import { Client } from "@notionhq/client";
import { handleAnalyze } from "../src/tools/analyze.js";
import { handlePosition } from "../src/tools/position.js";
import { handleScenarios } from "../src/tools/scenarios.js";
import { handleSimStart } from "../src/tools/sim-start.js";
import { handleSimRound } from "../src/tools/sim-round.js";
import { handleSimEnd } from "../src/tools/sim-end.js";
import { handleDebrief } from "../src/tools/debrief.js";
import { resetConfig } from "../src/lib/config.js";
import { formatPositionAnalysis } from "../src/lib/formatting.js";
import type {
  AnalyzeOutput,
  PositionOutput,
  ScenariosOutput,
  SimStartOutput,
  SimRoundOutput,
  SimEndOutput,
  DebriefOutput,
} from "../src/types/schemas.js";
import type { ScenarioBranch } from "../src/types/negotiation.js";

// Force mock mode for Premise tool calls
process.env.PREMISE_MOCK_DIR = "demo/mock-responses";
resetConfig();

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const PARENT_PAGE_ID = process.env.NOTION_PARENT_PAGE_ID;

if (!NOTION_TOKEN) {
  console.error("NOTION_TOKEN not set in .env");
  process.exit(1);
}
if (!PARENT_PAGE_ID) {
  console.error("NOTION_PARENT_PAGE_ID not set in .env");
  process.exit(1);
}

const notion = new Client({ auth: NOTION_TOKEN });

function formatId(id: string): string {
  return id.replace(/-/g, "");
}

function extractJson<T>(result: { content: Array<{ text?: string }> }): T {
  const text = result.content[0]?.text ?? "";
  return JSON.parse(text) as T;
}

async function step(name: string, fn: () => Promise<void>): Promise<void> {
  process.stdout.write(`  ${name}... `);
  try {
    await fn();
    console.log("OK");
  } catch (error) {
    console.log("FAILED");
    const message = error instanceof Error ? error.message : String(error);
    console.error(`    Error: ${message}`);
    throw error;
  }
}

async function main(): Promise<void> {
  console.log("Full Orchestrator Flow Test");
  console.log("==========================");
  console.log("Mode: Mock Premise tools + Real Notion API\n");

  // Track created resources for cleanup
  const createdPageIds: string[] = [];
  let workspacePageId: string | null = null;
  let scenarioDataSourceId: string | null = null;

  try {
    // ═══════════════════════════════════════════════════════════════
    // Phase 1: Intake Analysis
    // ═══════════════════════════════════════════════════════════════
    console.log("Phase 1: Intake Analysis");

    let analysis: AnalyzeOutput;
    await step("Call premise-analyze", async () => {
      const result = await handleAnalyze({
        context:
          "I have a salary negotiation coming up with my manager Sarah Chen at TechCorp. I've been a Senior Engineer for 2 years, currently making $120k. I've led the migration to microservices and mentored 3 junior devs. I have a competing offer from StartupX for $150k but I'd prefer to stay.",
        negotiation_type: "salary",
      });
      analysis = extractJson<AnalyzeOutput>(result);
      console.log(`(${analysis.parties.length} parties, id: ${analysis.negotiation_id.slice(0, 8)})`);
    });

    // ═══════════════════════════════════════════════════════════════
    // Phase 2: Position Mapping
    // ═══════════════════════════════════════════════════════════════
    console.log("\nPhase 2: Position Mapping");

    let positions: PositionOutput;
    await step("Call premise-position", async () => {
      const result = await handlePosition({
        negotiation_id: analysis!.negotiation_id,
        analysis: analysis!,
        your_target: "$145,000 base salary",
        your_minimum: "$130,000 base salary",
        your_batna: "Competing offer from StartupX at $150,000",
        market_context:
          "Senior engineers in the area earn $130-160k. TechCorp recently raised Series C.",
      });
      positions = extractJson<PositionOutput>(result);
      console.log(`(ZOPA exists: ${positions.zopa.exists}, ${positions.leverage_points.length} leverage points)`);
    });

    // ═══════════════════════════════════════════════════════════════
    // Phase 3: Scenario Generation
    // ═══════════════════════════════════════════════════════════════
    console.log("\nPhase 3: Scenario Generation");

    let scenarios: ScenariosOutput;
    await step("Call premise-scenarios", async () => {
      const result = await handleScenarios({
        negotiation_id: analysis!.negotiation_id,
        analysis: analysis!,
        positions: positions!,
        depth: 2,
      });
      scenarios = extractJson<ScenariosOutput>(result);
      console.log(`(${scenarios.branches.length} branches)`);
    });

    // ═══════════════════════════════════════════════════════════════
    // Phase 4: Build Notion Workspace
    // ═══════════════════════════════════════════════════════════════
    console.log("\nPhase 4: Build Notion Workspace");

    // 4a: Create parent page
    await step("Create workspace parent page", async () => {
      const response = await notion.pages.create({
        parent: { page_id: PARENT_PAGE_ID! },
        icon: { type: "emoji", emoji: "🎯" },
        properties: {
          title: [
            {
              text: {
                content: `Premise: Salary Negotiation with ${analysis!.parties[1]?.name ?? "Counterparty"}`,
              },
            },
          ],
        },
        children: [
          {
            object: "block",
            type: "callout",
            callout: {
              icon: { type: "emoji", emoji: "📋" },
              rich_text: [
                {
                  text: {
                    content: `Preparation workspace for salary negotiation. Created ${new Date().toLocaleDateString()}.`,
                  },
                },
              ],
            },
          },
        ],
      });
      workspacePageId = response.id;
      createdPageIds.push(response.id);
    });

    // 4b: Create Position Analysis page from real tool output
    await step("Create Position Analysis page", async () => {
      const markdown = formatPositionAnalysis(positions!);
      const blocks = markdownToNotionBlocks(markdown);

      const response = await notion.pages.create({
        parent: { page_id: workspacePageId! },
        icon: { type: "emoji", emoji: "📊" },
        properties: {
          title: [{ text: { content: "Position Analysis" } }],
        },
        children: blocks,
      });
      createdPageIds.push(response.id);
    });

    // 4c: Create Raw Analysis page
    await step("Create Raw Analysis page", async () => {
      const response = await notion.pages.create({
        parent: { page_id: workspacePageId! },
        icon: { type: "emoji", emoji: "📄" },
        properties: {
          title: [{ text: { content: "Raw Analysis" } }],
        },
        children: [
          {
            object: "block",
            type: "toggle",
            toggle: {
              rich_text: [{ text: { content: "premise-analyze output" } }],
              children: [
                {
                  object: "block",
                  type: "code",
                  code: {
                    rich_text: [{ text: { content: JSON.stringify(analysis!, null, 2).slice(0, 2000) } }],
                    language: "json",
                  },
                },
              ],
            },
          },
          {
            object: "block",
            type: "toggle",
            toggle: {
              rich_text: [{ text: { content: "premise-position output" } }],
              children: [
                {
                  object: "block",
                  type: "code",
                  code: {
                    rich_text: [{ text: { content: JSON.stringify(positions!, null, 2).slice(0, 2000) } }],
                    language: "json",
                  },
                },
              ],
            },
          },
          {
            object: "block",
            type: "toggle",
            toggle: {
              rich_text: [{ text: { content: "premise-scenarios output" } }],
              children: [
                {
                  object: "block",
                  type: "code",
                  code: {
                    rich_text: [{ text: { content: JSON.stringify(scenarios!, null, 2).slice(0, 2000) } }],
                    language: "json",
                  },
                },
              ],
            },
          },
        ],
      });
      createdPageIds.push(response.id);
    });

    // 4d: Create Scenario Database
    let scenarioDatabaseId: string;
    await step("Create Scenario Database", async () => {
      const response = await notion.databases.create({
        parent: { type: "page_id", page_id: workspacePageId! },
        title: [{ text: { content: "Scenario Decision Tree" } }],
        icon: { type: "emoji", emoji: "🌳" },
        initial_data_source: {
          properties: {
            Title: { title: {} },
            Probability: {
              select: {
                options: [
                  { name: "High", color: "red" },
                  { name: "Medium", color: "yellow" },
                  { name: "Low", color: "gray" },
                ],
              },
            },
            "Emotional Temperature": {
              select: {
                options: [
                  { name: "Calm", color: "green" },
                  { name: "Tense", color: "yellow" },
                  { name: "Heated", color: "red" },
                ],
              },
            },
            Status: {
              select: {
                options: [
                  { name: "Unexplored", color: "default" },
                  { name: "Prepared", color: "blue" },
                  { name: "Practiced", color: "green" },
                ],
              },
            },
            Outcome: {
              select: {
                options: [
                  { name: "Happened", color: "green" },
                  { name: "Partially Happened", color: "yellow" },
                  { name: "Did Not Happen", color: "gray" },
                  { name: "Happened Differently", color: "orange" },
                ],
              },
            },
            "Recommended Response": { rich_text: {} },
            Rationale: { rich_text: {} },
            Tradeoffs: { rich_text: {} },
            "Debrief Notes": { rich_text: {} },
          },
        },
      });
      scenarioDatabaseId = response.id;
      // Extract data source ID from response
      const responseObj = response as Record<string, unknown>;
      if ("data_sources" in responseObj && Array.isArray(responseObj.data_sources)) {
        const dataSources = responseObj.data_sources as Array<{ id: string }>;
        scenarioDataSourceId = dataSources[0]?.id ?? null;
      }
    });

    // 4e: Add self-relation
    await step("Add Parent Scenario relation", async () => {
      const dsId = scenarioDataSourceId ?? scenarioDatabaseId!;
      await notion.dataSources.update({
        data_source_id: dsId,
        properties: {
          "Parent Scenario": {
            relation: {
              data_source_id: dsId,
              type: "single_property",
              single_property: {},
            },
          },
        },
      });
    });

    // 4f: Populate scenarios from tool output
    const scenarioPageIds = new Map<string, string>();
    const dsId = scenarioDataSourceId ?? scenarioDatabaseId!;

    await step(`Populate ${scenarios!.branches.length} scenario entries`, async () => {
      // Create root-level branches first (parent_id === null)
      const rootBranches = scenarios!.branches.filter((b: ScenarioBranch) => b.parent_id === null);
      const childBranches = scenarios!.branches.filter((b: ScenarioBranch) => b.parent_id !== null);

      for (const branch of rootBranches) {
        const response = await notion.pages.create({
          parent: { data_source_id: dsId },
          properties: buildScenarioProperties(branch),
        });
        scenarioPageIds.set(branch.id, response.id);
        createdPageIds.push(response.id);
      }

      // Then child branches with relations
      for (const branch of childBranches) {
        const parentNotionId = branch.parent_id ? scenarioPageIds.get(branch.parent_id) : null;
        const props = buildScenarioProperties(branch);
        if (parentNotionId) {
          (props as Record<string, unknown>)["Parent Scenario"] = {
            relation: [{ id: parentNotionId }],
          };
        }
        const response = await notion.pages.create({
          parent: { data_source_id: dsId },
          properties: props,
        });
        scenarioPageIds.set(branch.id, response.id);
        createdPageIds.push(response.id);
      }
      console.log(`(${rootBranches.length} root + ${childBranches.length} children)`);
    });

    // ═══════════════════════════════════════════════════════════════
    // Phase 5: Interactive Simulation
    // ═══════════════════════════════════════════════════════════════
    console.log("\nPhase 5: Interactive Simulation");

    let simStart: SimStartOutput;
    await step("Call premise-sim-start", async () => {
      const result = await handleSimStart({
        negotiation_id: analysis!.negotiation_id,
        analysis: analysis!,
        positions: positions!,
        counterparty_style: "analytical",
        your_opening:
          "Thank you for meeting with me, Sarah. I wanted to discuss my compensation. I've been here two years, led the microservices migration, and I believe my contributions warrant a salary adjustment.",
        max_rounds: 4,
      });
      simStart = extractJson<SimStartOutput>(result);
      console.log(`(round ${simStart.round}, status: ${simStart.status})`);
    });

    let simRound: SimRoundOutput;
    await step("Call premise-sim-round", async () => {
      const result = await handleSimRound({
        session_state: simStart!.session_state,
        your_response:
          "Based on my research and the competing offer I have, I'm looking for $145,000. That reflects both my market value and the impact I've had on the team.",
      });
      simRound = extractJson<SimRoundOutput>(result);
      console.log(`(round ${simRound.round}, status: ${simRound.status})`);
    });

    let simEnd: SimEndOutput;
    await step("Call premise-sim-end", async () => {
      const result = await handleSimEnd({
        session_state: simRound!.session_state,
        end_reason: "user_quit",
      });
      simEnd = extractJson<SimEndOutput>(result);
      console.log(`(${simEnd.transcript.length} rounds, deal: ${simEnd.outcome.deal_reached})`);
    });

    // 5b: Write simulation to Notion
    await step("Write Simulation Log to Notion", async () => {
      const blocks: Array<Record<string, unknown>> = [];

      blocks.push({
        object: "block",
        type: "heading_2",
        heading_2: { rich_text: [{ text: { content: "Transcript" } }] },
      });

      for (const entry of simEnd!.transcript) {
        blocks.push({
          object: "block",
          type: "paragraph",
          paragraph: {
            rich_text: [
              { text: { content: `Round ${entry.round}` }, annotations: { bold: true } },
            ],
          },
        });

        blocks.push({
          object: "block",
          type: "quote",
          quote: {
            rich_text: [
              { text: { content: `${entry.speaker}: ` }, annotations: { bold: true } },
              { text: { content: entry.message.slice(0, 1900) } },
            ],
          },
        });

        if (entry.tactical_note) {
          blocks.push({
            object: "block",
            type: "paragraph",
            paragraph: {
              rich_text: [
                { text: { content: entry.tactical_note.slice(0, 1900) }, annotations: { italic: true } },
              ],
            },
          });
        }
      }

      blocks.push({
        object: "block",
        type: "divider",
        divider: {},
      });

      blocks.push({
        object: "block",
        type: "heading_2",
        heading_2: { rich_text: [{ text: { content: "Post-Mortem" } }] },
      });

      const pm = simEnd!.post_mortem;
      if (pm.strengths.length > 0) {
        blocks.push({
          object: "block",
          type: "paragraph",
          paragraph: {
            rich_text: [{ text: { content: "Strengths:" }, annotations: { bold: true } }],
          },
        });
        for (const s of pm.strengths) {
          blocks.push({
            object: "block",
            type: "bulleted_list_item",
            bulleted_list_item: { rich_text: [{ text: { content: s.slice(0, 1900) } }] },
          });
        }
      }

      if (pm.weaknesses.length > 0) {
        blocks.push({
          object: "block",
          type: "paragraph",
          paragraph: {
            rich_text: [{ text: { content: "Weaknesses:" }, annotations: { bold: true } }],
          },
        });
        for (const w of pm.weaknesses) {
          blocks.push({
            object: "block",
            type: "bulleted_list_item",
            bulleted_list_item: { rich_text: [{ text: { content: w.slice(0, 1900) } }] },
          });
        }
      }

      blocks.push({
        object: "block",
        type: "divider",
        divider: {},
      });

      blocks.push({
        object: "block",
        type: "heading_2",
        heading_2: { rich_text: [{ text: { content: "Counterparty Inner State Reveal" } }] },
      });

      for (const state of simEnd!.counterparty_inner_state) {
        blocks.push({
          object: "block",
          type: "callout",
          callout: {
            icon: { type: "emoji", emoji: "🧠" },
            rich_text: [
              { text: { content: `Round ${state.round}: ` }, annotations: { bold: true } },
              { text: { content: state.private_thoughts.slice(0, 1800) } },
            ],
          },
        });
      }

      const response = await notion.pages.create({
        parent: { page_id: workspacePageId! },
        icon: { type: "emoji", emoji: "🎭" },
        properties: {
          title: [{ text: { content: "Simulation Log" } }],
        },
        children: blocks as Parameters<typeof notion.pages.create>[0]["children"],
      });
      createdPageIds.push(response.id);
    });

    // ═══════════════════════════════════════════════════════════════
    // Phase 6: Debrief
    // ═══════════════════════════════════════════════════════════════
    console.log("\nPhase 6: Debrief");

    let debrief: DebriefOutput;
    await step("Call premise-debrief", async () => {
      const result = await handleDebrief({
        negotiation_id: analysis!.negotiation_id,
        outcome:
          "We agreed on $138,000 base with a 10% performance bonus. Title bumped to Staff Engineer.",
        deal_terms: "$138k base + 10% bonus + Staff title",
        surprises: "She was more open to the title change than I expected.",
        counterparty_behavior:
          "Very analytical, kept referencing budget reports. Warmed up when I mentioned the microservices impact on revenue.",
      });
      debrief = extractJson<DebriefOutput>(result);
      console.log(`(effectiveness: ${debrief.effectiveness_score}, ${debrief.scenario_verdicts.length} verdicts)`);
    });

    // 6b: Update scenario verdicts in Notion
    await step("Update scenario verdicts", async () => {
      let updated = 0;
      for (const verdict of debrief!.scenario_verdicts) {
        const notionPageId = scenarioPageIds.get(verdict.scenario_id);
        if (!notionPageId) continue;

        const outcomeMap: Record<string, string> = {
          happened: "Happened",
          partially_happened: "Partially Happened",
          did_not_happen: "Did Not Happen",
          happened_differently: "Happened Differently",
        };

        await notion.pages.update({
          page_id: notionPageId,
          properties: {
            Outcome: { select: { name: outcomeMap[verdict.verdict] ?? "Did Not Happen" } },
            "Debrief Notes": {
              rich_text: [{ text: { content: verdict.notes.slice(0, 1900) } }],
            },
          },
        });
        updated++;
      }
      console.log(`(${updated} scenarios updated)`);
    });

    // 6c: Create Debrief page
    await step("Create Debrief page", async () => {
      const blocks: Array<Record<string, unknown>> = [];

      blocks.push({
        object: "block",
        type: "heading_2",
        heading_2: { rich_text: [{ text: { content: "Outcome" } }] },
      });
      blocks.push({
        object: "block",
        type: "paragraph",
        paragraph: {
          rich_text: [{ text: { content: debrief!.outcome_summary.slice(0, 1900) } }],
        },
      });

      blocks.push({
        object: "block",
        type: "divider",
        divider: {},
      });

      blocks.push({
        object: "block",
        type: "heading_2",
        heading_2: { rich_text: [{ text: { content: "Prep vs. Reality" } }] },
      });
      const pvr = debrief!.prep_vs_reality;
      blocks.push({
        object: "block",
        type: "bulleted_list_item",
        bulleted_list_item: {
          rich_text: [
            { text: { content: "Position Accuracy: " }, annotations: { bold: true } },
            { text: { content: pvr.position_accuracy.slice(0, 1800) } },
          ],
        },
      });
      blocks.push({
        object: "block",
        type: "bulleted_list_item",
        bulleted_list_item: {
          rich_text: [
            { text: { content: "Scenario Accuracy: " }, annotations: { bold: true } },
            { text: { content: pvr.scenario_accuracy.slice(0, 1800) } },
          ],
        },
      });
      blocks.push({
        object: "block",
        type: "bulleted_list_item",
        bulleted_list_item: {
          rich_text: [
            { text: { content: "Simulation Accuracy: " }, annotations: { bold: true } },
            { text: { content: pvr.simulation_accuracy.slice(0, 1800) } },
          ],
        },
      });

      blocks.push({
        object: "block",
        type: "divider",
        divider: {},
      });

      blocks.push({
        object: "block",
        type: "heading_2",
        heading_2: { rich_text: [{ text: { content: "Lessons Learned" } }] },
      });
      for (const lesson of debrief!.lessons) {
        blocks.push({
          object: "block",
          type: "numbered_list_item",
          numbered_list_item: {
            rich_text: [
              { text: { content: lesson.lesson.slice(0, 1900) } },
            ],
          },
        });
      }

      blocks.push({
        object: "block",
        type: "divider",
        divider: {},
      });

      blocks.push({
        object: "block",
        type: "heading_2",
        heading_2: { rich_text: [{ text: { content: "Pattern Update" } }] },
      });
      blocks.push({
        object: "block",
        type: "paragraph",
        paragraph: {
          rich_text: [{ text: { content: debrief!.pattern_update.slice(0, 1900) } }],
        },
      });

      const response = await notion.pages.create({
        parent: { page_id: workspacePageId! },
        icon: { type: "emoji", emoji: "📝" },
        properties: {
          title: [{ text: { content: "Debrief" } }],
        },
        children: blocks as Parameters<typeof notion.pages.create>[0]["children"],
      });
      createdPageIds.push(response.id);
    });

    // 6d: Update parent page with completion banner
    await step("Add completion banner", async () => {
      await notion.blocks.children.append({
        block_id: workspacePageId!,
        children: [
          {
            object: "block",
            type: "callout",
            callout: {
              icon: { type: "emoji", emoji: "✅" },
              rich_text: [
                {
                  text: {
                    content: `Preparation complete. Effectiveness score: ${debrief!.effectiveness_score}. ${debrief!.scenario_verdicts.length} scenarios tracked.`,
                  },
                },
              ],
              color: "green_background",
            },
          },
        ],
      });
    });

    // ═══════════════════════════════════════════════════════════════
    // Summary
    // ═══════════════════════════════════════════════════════════════
    console.log("\n═══════════════════════════════════════════════════");
    console.log("Full orchestrator flow completed successfully!");
    console.log("═══════════════════════════════════════════════════");
    console.log(`\nWorkspace: https://www.notion.so/${formatId(workspacePageId!)}`);
    console.log(`Pages created: ${createdPageIds.length}`);
    console.log(`Scenarios in database: ${scenarioPageIds.size}`);

  } catch (error) {
    console.error("\n\nOrchestrator flow FAILED.");
    throw error;
  } finally {
    const readline = await import("readline");
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const answer = await new Promise<string>((resolve) => {
      rl.question(
        "\nClean up test workspace? (y/n, default: n): ",
        (ans: string) => {
          rl.close();
          resolve(ans.trim().toLowerCase() || "n");
        }
      );
    });

    if (answer === "y") {
      console.log("Cleaning up...");
      for (const pageId of createdPageIds.reverse()) {
        try {
          await notion.pages.update({ page_id: pageId, archived: true });
        } catch {
          // Parent archival cascades
        }
      }
      console.log("Done.");
    } else {
      console.log("Workspace preserved for inspection.");
    }
  }
}

// ─── Helpers ──────────────────────────────────────────────────────

function buildScenarioProperties(branch: ScenarioBranch): Record<string, unknown> {
  const firstResponse = branch.recommended_responses[0];

  const probabilityMap: Record<string, string> = {
    high: "High",
    medium: "Medium",
    low: "Low",
  };

  const temperatureMap: Record<string, string> = {
    calm: "Calm",
    tense: "Tense",
    heated: "Heated",
  };

  return {
    Title: {
      title: [{ text: { content: (branch.page_title ?? branch.counterparty_move).slice(0, 200) } }],
    },
    Probability: {
      select: { name: probabilityMap[branch.probability] ?? "Medium" },
    },
    "Emotional Temperature": {
      select: { name: temperatureMap[branch.emotional_temperature] ?? "Calm" },
    },
    Status: { select: { name: "Unexplored" } },
    "Recommended Response": {
      rich_text: firstResponse
        ? [{ text: { content: firstResponse.response.slice(0, 1900) } }]
        : [],
    },
    Rationale: {
      rich_text: firstResponse
        ? [{ text: { content: firstResponse.rationale.slice(0, 1900) } }]
        : [],
    },
    Tradeoffs: {
      rich_text: firstResponse
        ? [{ text: { content: firstResponse.tradeoffs.slice(0, 1900) } }]
        : [],
    },
  };
}

/**
 * Converts simple markdown to Notion block objects.
 * Handles headings (##), bold (**), bullet lists (-), tables, and paragraphs.
 */
function markdownToNotionBlocks(markdown: string): Array<Record<string, unknown>> {
  const blocks: Array<Record<string, unknown>> = [];
  const lines = markdown.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith("## ")) {
      blocks.push({
        object: "block",
        type: "heading_2",
        heading_2: {
          rich_text: [{ text: { content: trimmed.slice(3) } }],
        },
      });
    } else if (trimmed.startsWith("- **")) {
      // Bullet with bold prefix: "- **Factor** (rest)"
      const boldMatch = trimmed.match(/^- \*\*(.+?)\*\*(.*)$/);
      if (boldMatch) {
        blocks.push({
          object: "block",
          type: "bulleted_list_item",
          bulleted_list_item: {
            rich_text: [
              { text: { content: boldMatch[1] }, annotations: { bold: true } },
              { text: { content: boldMatch[2] } },
            ],
          },
        });
      }
    } else if (trimmed.startsWith("- ")) {
      blocks.push({
        object: "block",
        type: "bulleted_list_item",
        bulleted_list_item: {
          rich_text: [{ text: { content: trimmed.slice(2) } }],
        },
      });
    } else if (trimmed.startsWith("| ") && !trimmed.startsWith("| ---")) {
      // Table row as paragraph (Notion doesn't have tables in blocks API easily)
      blocks.push({
        object: "block",
        type: "paragraph",
        paragraph: {
          rich_text: [{ text: { content: trimmed } }],
        },
      });
    } else if (trimmed.startsWith("**")) {
      // Bold label line: "**Target:** $145,000"
      const boldMatch = trimmed.match(/^\*\*(.+?)\*\*\s*(.*)$/);
      if (boldMatch) {
        blocks.push({
          object: "block",
          type: "paragraph",
          paragraph: {
            rich_text: [
              { text: { content: boldMatch[1] + " " }, annotations: { bold: true } },
              { text: { content: boldMatch[2] } },
            ],
          },
        });
      } else {
        blocks.push({
          object: "block",
          type: "paragraph",
          paragraph: { rich_text: [{ text: { content: trimmed } }] },
        });
      }
    } else {
      blocks.push({
        object: "block",
        type: "paragraph",
        paragraph: { rich_text: [{ text: { content: trimmed } }] },
      });
    }
  }

  return blocks;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
