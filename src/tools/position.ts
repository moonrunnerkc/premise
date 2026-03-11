/**
 * premise-position: Position mapping tool.
 *
 * Takes the analysis output plus user's target/minimum/BATNA and produces
 * a full position analysis: both sides' positions, ZOPA, leverage points,
 * risk factors, and tradeable issues.
 */

import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { PositionInput, PositionOutput } from "../types/schemas.js";
import { PositionOutputSchema } from "../types/schemas.js";
import { sendAnthropicRequest } from "../lib/anthropic.js";
import { logInfo, logError } from "../lib/logger.js";
import {
  buildPositionSystemPrompt,
  buildPositionUserMessage,
} from "../prompts/position.js";

const TOOL_NAME = "premise-position";

export async function handlePosition(
  input: PositionInput
): Promise<CallToolResult> {
  logInfo(TOOL_NAME, `Mapping positions for negotiation ${input.negotiation_id}`);

  try {
    const systemPrompt = buildPositionSystemPrompt();
    const userMessage = buildPositionUserMessage(input);

    const { parsed } = await sendAnthropicRequest<PositionOutput>(
      { systemPrompt, userMessage },
      "position-salary.json"
    );

    const validation = PositionOutputSchema.safeParse({
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
              error: "Position analysis produced invalid structure.",
              details: validation.error.issues,
            }),
          },
        ],
        isError: true,
      };
    }

    logInfo(
      TOOL_NAME,
      `Position mapped: ZOPA ${validation.data.zopa.exists ? "exists" : "may not exist"}, ` +
        `${validation.data.leverage_points.length} leverage points identified`
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
            error: `Position analysis failed: ${message}`,
            negotiation_id: input.negotiation_id,
          }),
        },
      ],
      isError: true,
    };
  }
}
