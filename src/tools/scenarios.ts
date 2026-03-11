/**
 * premise-scenarios: Decision tree generation tool.
 *
 * Produces a tree of anticipated counterparty moves with recommended responses,
 * grounded in the specific negotiation context. Each branch includes a page_title
 * formatted for the Notion Scenario Database.
 */

import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ScenariosInput, ScenariosOutput } from "../types/schemas.js";
import { ScenariosOutputSchema } from "../types/schemas.js";
import { sendAnthropicRequest } from "../lib/anthropic.js";
import {
  buildScenarioGenSystemPrompt,
  buildScenarioGenUserMessage,
} from "../prompts/scenario-gen.js";
import { logInfo, logError } from "../lib/logger.js";

const TOOL_NAME = "premise-scenarios";
const DEFAULT_DEPTH = 2;

export async function handleScenarios(
  input: ScenariosInput
): Promise<CallToolResult> {
  const depth = input.depth ?? DEFAULT_DEPTH;
  logInfo(
    TOOL_NAME,
    `Generating scenario tree (depth ${depth}) for negotiation ${input.negotiation_id}`
  );

  try {
    const systemPrompt = buildScenarioGenSystemPrompt();
    const userMessage = buildScenarioGenUserMessage(
      input.analysis,
      input.positions,
      depth,
      input.focus
    );

    const { parsed } = await sendAnthropicRequest<ScenariosOutput>(
      { systemPrompt, userMessage, maxTokens: 8192 },
      "scenarios-salary.json"
    );

    const validation = ScenariosOutputSchema.safeParse({
      ...parsed,
      negotiation_id: input.negotiation_id,
    });

    if (!validation.success) {
      logError(
        TOOL_NAME,
        `Output validation failed: ${JSON.stringify(validation.error.issues)}`
      );
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              error: "Scenario generation produced invalid structure.",
              details: validation.error.issues,
            }),
          },
        ],
        isError: true,
      };
    }

    logInfo(
      TOOL_NAME,
      `Generated ${validation.data.branches.length} scenario branches`
    );

    return {
      content: [{ type: "text", text: JSON.stringify(validation.data) }],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logError(TOOL_NAME, `Failed: ${message}`);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            error: `Scenario generation failed: ${message}`,
            negotiation_id: input.negotiation_id,
          }),
        },
      ],
      isError: true,
    };
  }
}
