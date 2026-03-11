/**
 * premise-debrief: Post-negotiation retrospective tool.
 *
 * Compares actual negotiation outcomes against preparation artifacts
 * and produces scenario verdicts, lessons, and an effectiveness score.
 */

import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { DebriefInput, DebriefOutput } from "../types/schemas.js";
import { DebriefOutputSchema } from "../types/schemas.js";
import { sendAnthropicRequest } from "../lib/anthropic.js";
import {
  buildDebriefSystemPrompt,
  buildDebriefUserMessage,
} from "../prompts/debrief-reflection.js";
import { logInfo, logError } from "../lib/logger.js";

const TOOL_NAME = "premise-debrief";

export async function handleDebrief(
  input: DebriefInput
): Promise<CallToolResult> {
  logInfo(TOOL_NAME, `Running debrief for negotiation ${input.negotiation_id}`);

  try {
    const systemPrompt = buildDebriefSystemPrompt();
    const userMessage = buildDebriefUserMessage(
      input.negotiation_id,
      input.outcome,
      input.deal_terms,
      input.surprises,
      input.counterparty_behavior
    );

    const { parsed } = await sendAnthropicRequest<DebriefOutput>(
      { systemPrompt, userMessage },
      "debrief-salary.json"
    );

    const validation = DebriefOutputSchema.safeParse(parsed);
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
              error: "Debrief produced invalid structure.",
              details: validation.error.issues,
            }),
          },
        ],
        isError: true,
      };
    }

    logInfo(
      TOOL_NAME,
      `Debrief complete: effectiveness score ${validation.data.effectiveness_score}/10, ` +
        `${validation.data.lessons.length} lessons, ` +
        `${validation.data.scenario_verdicts.length} scenario verdicts`
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
            error: `Debrief failed: ${message}`,
            negotiation_id: input.negotiation_id,
          }),
        },
      ],
      isError: true,
    };
  }
}
