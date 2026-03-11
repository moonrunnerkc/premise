/**
 * Notion Integration Test Script
 *
 * Tests the full Notion workspace creation flow that the orchestrator
 * would perform using Notion MCP. This script calls the Notion API
 * directly (mimicking what the Notion MCP server does) to verify:
 *
 * 1. Token and page access work
 * 2. Parent workspace page creation
 * 3. Position Analysis child page with formatted markdown
 * 4. Scenario Database with full property schema
 * 5. Scenario entries with relations
 * 6. Simulation Log page
 * 7. Debrief page with scenario verdict updates
 * 8. Cleanup (delete test workspace)
 *
 * Usage: npx tsx scripts/test-notion-integration.ts
 *
 * Requires NOTION_TOKEN and NOTION_PARENT_PAGE_ID in .env
 */

import "dotenv/config";
import { Client } from "@notionhq/client";

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

// Track created resources for cleanup
const createdPageIds: string[] = [];
let scenarioDatabaseId: string | null = null;
let scenarioDataSourceId: string | null = null;

function formatId(id: string): string {
  return id.replace(/-/g, "");
}

async function step(name: string, fn: () => Promise<void>): Promise<void> {
  process.stdout.write(`  ${name}... `);
  try {
    await fn();
    console.log("✓");
  } catch (error) {
    console.log("✗");
    const message = error instanceof Error ? error.message : String(error);
    console.error(`    Error: ${message}`);
    throw error;
  }
}

async function cleanup(): Promise<void> {
  console.log("\n🧹 Cleaning up test workspace...");

  // Archive (soft-delete) pages in reverse order
  for (const pageId of createdPageIds.reverse()) {
    try {
      await notion.pages.update({
        page_id: pageId,
        archived: true,
      });
    } catch {
      // Ignore cleanup errors; parent archival cascades to children
    }
  }

  if (scenarioDatabaseId) {
    try {
      await notion.databases.update({
        database_id: scenarioDatabaseId,
        archived: true,
      });
    } catch {
      // Already archived via parent
    }
  }

  console.log("  Cleanup complete.");
}

async function main(): Promise<void> {
  console.log("Notion Integration Test");
  console.log("=======================\n");

  let workspacePageId: string | null = null;

  try {
    // ─── Step 1: Verify token and page access ───────────────────────
    console.log("Phase 1: Connection");

    await step("Verify API token", async () => {
      const me = await notion.users.me({});
      console.log(`(bot: ${me.name})`);
    });

    await step("Access parent page", async () => {
      const page = await notion.pages.retrieve({ page_id: PARENT_PAGE_ID! });
      const title =
        "properties" in page &&
        "title" in (page.properties as Record<string, unknown>)
          ? "accessible"
          : "accessible";
      console.log(`(${title})`);
    });

    // ─── Step 2: Create workspace parent page ───────────────────────
    console.log("\nPhase 2: Workspace Creation");

    await step("Create workspace parent page", async () => {
      const response = await notion.pages.create({
        parent: { page_id: PARENT_PAGE_ID! },
        icon: { type: "emoji", emoji: "🎯" },
        properties: {
          title: [
            {
              text: { content: "Premise: Test Salary Negotiation (Integration Test)" },
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
                    content:
                      "This is an automated integration test workspace. It will be cleaned up automatically.",
                  },
                },
              ],
            },
          },
        ],
      });
      workspacePageId = response.id;
      createdPageIds.push(response.id);
      console.log(`(id: ${formatId(response.id)})`);
    });

    // ─── Step 3: Create Position Analysis page ──────────────────────
    await step("Create Position Analysis page", async () => {
      const response = await notion.pages.create({
        parent: { page_id: workspacePageId! },
        icon: { type: "emoji", emoji: "📊" },
        properties: {
          title: [{ text: { content: "Position Analysis" } }],
        },
        children: [
          {
            object: "block",
            type: "heading_2",
            heading_2: {
              rich_text: [{ text: { content: "Your Position" } }],
            },
          },
          {
            object: "block",
            type: "paragraph",
            paragraph: {
              rich_text: [
                { text: { content: "Target: " }, annotations: { bold: true } },
                { text: { content: "$145,000 base salary" } },
              ],
            },
          },
          {
            object: "block",
            type: "paragraph",
            paragraph: {
              rich_text: [
                { text: { content: "Reservation Point: " }, annotations: { bold: true } },
                { text: { content: "$130,000" } },
              ],
            },
          },
          {
            object: "block",
            type: "paragraph",
            paragraph: {
              rich_text: [
                { text: { content: "BATNA: " }, annotations: { bold: true } },
                { text: { content: "Current role at $120,000 with pending promotion" } },
              ],
            },
          },
          {
            object: "block",
            type: "divider",
            divider: {},
          },
          {
            object: "block",
            type: "heading_2",
            heading_2: {
              rich_text: [{ text: { content: "Their Estimated Position" } }],
            },
          },
          {
            object: "block",
            type: "paragraph",
            paragraph: {
              rich_text: [
                { text: { content: "Likely Target: " }, annotations: { bold: true } },
                { text: { content: "$125,000 (budget midpoint)" } },
              ],
            },
          },
          {
            object: "block",
            type: "divider",
            divider: {},
          },
          {
            object: "block",
            type: "heading_2",
            heading_2: {
              rich_text: [{ text: { content: "ZOPA Analysis" } }],
            },
          },
          {
            object: "block",
            type: "paragraph",
            paragraph: {
              rich_text: [
                { text: { content: "A ZOPA likely exists in the $128,000-$140,000 range with moderate confidence." } },
              ],
            },
          },
          {
            object: "block",
            type: "divider",
            divider: {},
          },
          {
            object: "block",
            type: "heading_2",
            heading_2: {
              rich_text: [{ text: { content: "Leverage Points" } }],
            },
          },
          {
            object: "block",
            type: "bulleted_list_item",
            bulleted_list_item: {
              rich_text: [
                { text: { content: "Competing offer" }, annotations: { bold: true } },
                { text: { content: " (favors you): Creates urgency and validates market rate" } },
              ],
            },
          },
          {
            object: "block",
            type: "bulleted_list_item",
            bulleted_list_item: {
              rich_text: [
                { text: { content: "Specialized skills" }, annotations: { bold: true } },
                { text: { content: " (favors you): Hard to replace, reduces their alternatives" } },
              ],
            },
          },
        ],
      });
      createdPageIds.push(response.id);
    });

    // ─── Step 4: Create Scenario Database ───────────────────────────
    await step("Create Scenario Database with full schema", async () => {
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
      // Extract data source ID from the creation response
      const responseObj = response as Record<string, unknown>;
      if ("data_sources" in responseObj && Array.isArray(responseObj.data_sources)) {
        const dataSources = responseObj.data_sources as Array<{ id: string; name: string }>;
        scenarioDataSourceId = dataSources[0]?.id ?? null;
      }
      console.log(`(db: ${formatId(response.id)}, ds: ${scenarioDataSourceId ? formatId(scenarioDataSourceId) : "none"})`);
    });

    // Add self-relation for Parent Scenario after database creation
    // In v5 SDK, databases and data sources are separate. The relation property
    // must reference the data source ID, not the database ID.
    await step("Add Parent Scenario self-relation", async () => {
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

    // ─── Step 5: Create scenario entries with relations ─────────────
    console.log("\nPhase 3: Scenario Population");

    let rootScenarioId: string | null = null;

    const dsId = scenarioDataSourceId ?? scenarioDatabaseId!;

    await step("Create root scenario entry", async () => {
      const response = await notion.pages.create({
        parent: { data_source_id: dsId },
        properties: {
          Title: {
            title: [{ text: { content: "They counter with budget constraints" } }],
          },
          Probability: { select: { name: "High" } },
          "Emotional Temperature": { select: { name: "Tense" } },
          Status: { select: { name: "Unexplored" } },
          "Recommended Response": {
            rich_text: [
              {
                text: {
                  content:
                    "Acknowledge the constraint, then reframe: 'I understand budget pressure. Could we structure this as a base plus performance bonus that activates after Q2?'",
                },
              },
            ],
          },
          Rationale: {
            rich_text: [
              {
                text: {
                  content:
                    "Reframing from fixed cost to performance-linked compensation addresses their budget concern while preserving your total compensation target.",
                },
              },
            ],
          },
          Tradeoffs: {
            rich_text: [
              {
                text: {
                  content:
                    "Introduces variable pay risk. Base might be lower than target. Requires clear, measurable performance criteria.",
                },
              },
            ],
          },
        },
      });
      rootScenarioId = response.id;
      createdPageIds.push(response.id);
    });

    await step("Create child scenario with relation", async () => {
      const response = await notion.pages.create({
        parent: { data_source_id: dsId },
        properties: {
          Title: {
            title: [
              { text: { content: "They accept performance bonus structure but cap at 10%" } },
            ],
          },
          Probability: { select: { name: "Medium" } },
          "Emotional Temperature": { select: { name: "Calm" } },
          Status: { select: { name: "Unexplored" } },
          "Parent Scenario": {
            relation: [{ id: rootScenarioId! }],
          },
          "Recommended Response": {
            rich_text: [
              {
                text: {
                  content:
                    "Push for 15% bonus cap with quarterly milestones. Offer to define specific, measurable targets they can verify.",
                },
              },
            ],
          },
          Rationale: {
            rich_text: [
              {
                text: {
                  content:
                    "10% cap signals willingness to negotiate structure. Pushing to 15% with accountability shows you're invested in outcomes, not just pay.",
                },
              },
            ],
          },
          Tradeoffs: {
            rich_text: [
              {
                text: {
                  content:
                    "Higher bonus cap means higher performance bar. Need to ensure targets are achievable within the role.",
                },
              },
            ],
          },
        },
      });
      createdPageIds.push(response.id);
    });

    await step("Create second root scenario", async () => {
      const response = await notion.pages.create({
        parent: { data_source_id: dsId },
        properties: {
          Title: {
            title: [
              { text: { content: "They offer title bump instead of salary increase" } },
            ],
          },
          Probability: { select: { name: "Medium" } },
          "Emotional Temperature": { select: { name: "Tense" } },
          Status: { select: { name: "Unexplored" } },
          "Recommended Response": {
            rich_text: [
              {
                text: {
                  content:
                    "Thank them for the title consideration, but clarify: 'A title change is meaningful for my growth, and I appreciate it. For this discussion, I want to make sure the compensation reflects the market rate for the responsibilities I am taking on.'",
                },
              },
            ],
          },
          Rationale: {
            rich_text: [
              {
                text: {
                  content:
                    "Accept the title as a bonus, not a substitute. Redirects conversation to compensation without rejecting their offer entirely.",
                },
              },
            ],
          },
          Tradeoffs: {
            rich_text: [
              {
                text: {
                  content:
                    "Might come across as ungrateful if not framed carefully. The title itself has long-term career value.",
                },
              },
            ],
          },
        },
      });
      createdPageIds.push(response.id);
    });

    // ─── Step 6: Create Simulation Log page ─────────────────────────
    console.log("\nPhase 4: Simulation & Debrief Pages");

    await step("Create Simulation Log page", async () => {
      const response = await notion.pages.create({
        parent: { page_id: workspacePageId! },
        icon: { type: "emoji", emoji: "🎭" },
        properties: {
          title: [{ text: { content: "Simulation Log" } }],
        },
        children: [
          {
            object: "block",
            type: "heading_2",
            heading_2: {
              rich_text: [{ text: { content: "Transcript" } }],
            },
          },
          {
            object: "block",
            type: "paragraph",
            paragraph: {
              rich_text: [
                { text: { content: "Round 1" }, annotations: { bold: true } },
              ],
            },
          },
          {
            object: "block",
            type: "quote",
            quote: {
              rich_text: [
                { text: { content: "You: " }, annotations: { bold: true } },
                {
                  text: {
                    content:
                      "Thank you for the offer. I am excited about the role, and I want to discuss the compensation package.",
                  },
                },
              ],
            },
          },
          {
            object: "block",
            type: "quote",
            quote: {
              rich_text: [
                { text: { content: "Sarah Chen: " }, annotations: { bold: true } },
                {
                  text: {
                    content:
                      "Of course. We have a range in mind for this position. What are your expectations?",
                  },
                },
              ],
            },
          },
          {
            object: "block",
            type: "paragraph",
            paragraph: {
              rich_text: [
                {
                  text: { content: "Coach: They are letting you anchor first. This is an advantage if your number is well-researched." },
                  annotations: { italic: true },
                },
              ],
            },
          },
          {
            object: "block",
            type: "divider",
            divider: {},
          },
          {
            object: "block",
            type: "heading_2",
            heading_2: {
              rich_text: [{ text: { content: "Post-Mortem" } }],
            },
          },
          {
            object: "block",
            type: "paragraph",
            paragraph: {
              rich_text: [
                {
                  text: {
                    content: "Simulation completed after 4 rounds. No deal reached (max rounds).",
                  },
                },
              ],
            },
          },
          {
            object: "block",
            type: "divider",
            divider: {},
          },
          {
            object: "block",
            type: "heading_2",
            heading_2: {
              rich_text: [{ text: { content: "Counterparty Inner State Reveal" } }],
            },
          },
          {
            object: "block",
            type: "callout",
            callout: {
              icon: { type: "emoji", emoji: "🧠" },
              rich_text: [
                {
                  text: {
                    content:
                      "Round 1: 'They seem well-prepared. I need to test whether they have a competing offer or if they are bluffing.'",
                  },
                },
              ],
            },
          },
          {
            object: "block",
            type: "callout",
            callout: {
              icon: { type: "emoji", emoji: "🧠" },
              rich_text: [
                {
                  text: {
                    content:
                      "Round 3: 'Their performance bonus proposal is smart. I was ready to go to $135K base but they might accept $130K plus bonus. I should hold firm on the base.'",
                  },
                },
              ],
            },
          },
        ],
      });
      createdPageIds.push(response.id);
    });

    // ─── Step 7: Create Raw Analysis page ───────────────────────────
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
                    rich_text: [
                      {
                        text: {
                          content: JSON.stringify(
                            {
                              parties: [
                                { name: "You", role: "Senior Engineer candidate" },
                                { name: "Sarah Chen", role: "Engineering Manager / Hiring Manager" },
                              ],
                              negotiation_id: "test-integration-001",
                            },
                            null,
                            2
                          ),
                        },
                      },
                    ],
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

    // ─── Step 8: Test debrief updates ───────────────────────────────
    console.log("\nPhase 5: Debrief Updates");

    await step("Update scenario with debrief verdict", async () => {
      await notion.pages.update({
        page_id: rootScenarioId!,
        properties: {
          Outcome: { select: { name: "Happened" } },
          Status: { select: { name: "Practiced" } },
          "Debrief Notes": {
            rich_text: [
              {
                text: {
                  content:
                    "They cited the Q3 budget freeze exactly as predicted. The performance bonus reframe worked well. They agreed to 12% bonus cap, splitting the difference.",
                },
              },
            ],
          },
        },
      });
    });

    await step("Add debrief comment to scenario", async () => {
      await notion.comments.create({
        parent: { page_id: rootScenarioId! },
        rich_text: [
          {
            text: {
              content:
                "Debrief: This scenario played out almost exactly as predicted. The budget constraint was genuine (confirmed by their Q3 earnings report). The reframe to performance bonus was the key move.",
            },
          },
        ],
      });
    });

    // ─── Step 9: Create Debrief page ────────────────────────────────
    await step("Create Debrief page", async () => {
      const response = await notion.pages.create({
        parent: { page_id: workspacePageId! },
        icon: { type: "emoji", emoji: "📝" },
        properties: {
          title: [{ text: { content: "Debrief" } }],
        },
        children: [
          {
            object: "block",
            type: "heading_2",
            heading_2: {
              rich_text: [{ text: { content: "Outcome Summary" } }],
            },
          },
          {
            object: "block",
            type: "paragraph",
            paragraph: {
              rich_text: [
                {
                  text: {
                    content:
                      "Deal reached: $132,000 base + 12% performance bonus (quarterly). Total potential compensation: $147,840.",
                  },
                },
              ],
            },
          },
          {
            object: "block",
            type: "heading_2",
            heading_2: {
              rich_text: [{ text: { content: "Prep vs. Reality" } }],
            },
          },
          {
            object: "block",
            type: "bulleted_list_item",
            bulleted_list_item: {
              rich_text: [
                { text: { content: "Position Accuracy: " }, annotations: { bold: true } },
                { text: { content: "High. Their reservation point was close to our estimate ($128K vs actual ~$130K)." } },
              ],
            },
          },
          {
            object: "block",
            type: "bulleted_list_item",
            bulleted_list_item: {
              rich_text: [
                { text: { content: "Scenario Accuracy: " }, annotations: { bold: true } },
                { text: { content: "2 of 3 scenarios occurred. Budget constraint was the primary objection as predicted." } },
              ],
            },
          },
          {
            object: "block",
            type: "heading_2",
            heading_2: {
              rich_text: [{ text: { content: "Lessons Learned" } }],
            },
          },
          {
            object: "block",
            type: "numbered_list_item",
            numbered_list_item: {
              rich_text: [
                {
                  text: {
                    content:
                      "Reframing from fixed to variable compensation is a strong play when budget is the genuine constraint.",
                  },
                },
              ],
            },
          },
          {
            object: "block",
            type: "numbered_list_item",
            numbered_list_item: {
              rich_text: [
                {
                  text: {
                    content:
                      "Should have pushed for equity or RSU component earlier. Did not explore this lane enough.",
                  },
                },
              ],
            },
          },
        ],
      });
      createdPageIds.push(response.id);
    });

    // ─── Step 10: Update parent page with completion banner ─────────
    await step("Update parent with completion banner", async () => {
      // Append a completion callout to the workspace parent
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
                    content:
                      "Preparation complete. Debrief filed. 2 of 3 scenarios occurred as predicted. Effectiveness score: 8/10.",
                  },
                },
              ],
              color: "green_background",
            },
          },
        ],
      });
    });

    // ─── Summary ────────────────────────────────────────────────────
    console.log("\n═══════════════════════════════════════");
    console.log("All Notion integration tests passed! ✓");
    console.log("═══════════════════════════════════════");
    console.log(`\nWorkspace created: ${workspacePageId}`);
    console.log(`Scenario database: ${scenarioDatabaseId}`);
    console.log(`Total pages created: ${createdPageIds.length}`);
    console.log(`\nView at: https://www.notion.so/${formatId(workspacePageId!)}`);

  } catch (error) {
    console.error("\n\nIntegration test FAILED.");
    throw error;
  } finally {
    // Ask user before cleanup
    const readline = await import("readline");
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const answer = await new Promise<string>((resolve) => {
      rl.question(
        "\nClean up test workspace? (y/n, default: y): ",
        (ans: string) => {
          rl.close();
          resolve(ans.trim().toLowerCase() || "y");
        }
      );
    });

    if (answer === "y") {
      await cleanup();
    } else {
      console.log("  Workspace preserved for inspection.");
      if (workspacePageId) {
        console.log(
          `  View: https://www.notion.so/${formatId(workspacePageId)}`
        );
      }
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
