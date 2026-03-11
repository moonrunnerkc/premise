/**
 * premise-analyze: Intake analysis tool.
 *
 * Parses a free-text negotiation description into structured metadata:
 * parties, stakes, timeline, power dynamics, emotional factors.
 * Generates a negotiation_id that ties all subsequent tool calls together.
 */

import { randomUUID } from "node:crypto";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { AnalyzeInput, AnalyzeOutput } from "../types/schemas.js";
import { AnalyzeOutputSchema } from "../types/schemas.js";
import { sendAnthropicRequest } from "../lib/anthropic.js";
import {
  buildAnalysisSystemPrompt,
  buildAnalysisUserMessage,
} from "../prompts/analysis.js";
import { logInfo, logError } from "../lib/logger.js";

const TOOL_NAME = "premise-analyze";

export async function handleAnalyze(
  input: AnalyzeInput
): Promise<CallToolResult> {
  logInfo(TOOL_NAME, `Analyzing negotiation context (${input.context.length} chars)`);

  const negotiationId = randomUUID();

  try {
    const systemPrompt = buildAnalysisSystemPrompt();
    const userMessage = buildAnalysisUserMessage(input);

    const { parsed } = await sendAnthropicRequest<AnalyzeOutput>(
      { systemPrompt, userMessage },
      "analyze-salary.json"
    );

    // Check if the LLM returned a clarification request
    const rawParsed = parsed as Record<string, unknown>;
    if ("clarification_needed" in rawParsed) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              clarification_needed: rawParsed["clarification_needed"],
              negotiation_id: negotiationId,
            }),
          },
        ],
      };
    }

    // Validate the output structure with server-generated negotiation_id attached
    const validation = AnalyzeOutputSchema.safeParse({
      ...parsed,
      negotiation_id: negotiationId,
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
              error: "Analysis produced invalid structure. Retrying may help.",
              details: validation.error.issues,
            }),
          },
        ],
        isError: true,
      };
    }

    const output: AnalyzeOutput = validation.data;

    logInfo(TOOL_NAME, `Analysis complete: ${output.parties.length} parties identified`);

    return {
      content: [{ type: "text", text: JSON.stringify(output) }],
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error);
    logError(TOOL_NAME, `Failed: ${message}`);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            error: `Analysis failed: ${message}`,
            negotiation_id: negotiationId,
          }),
        },
      ],
      isError: true,
    };
  }
}
