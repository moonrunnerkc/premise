/**
 * Anthropic API client wrapper.
 *
 * Creates a single client on import, reused across all tool calls.
 * Handles structured JSON response parsing and contextual error messages.
 * When PREMISE_MOCK_DIR is set, reads responses from disk instead of calling the API.
 */

import Anthropic from "@anthropic-ai/sdk";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { existsSync } from "node:fs";
import { getConfig } from "./config.js";

let clientInstance: Anthropic | null = null;

function getClient(): Anthropic {
  if (clientInstance) {
    return clientInstance;
  }

  const config = getConfig();

  if (!config.anthropicApiKey && !config.mockDir) {
    throw new Error(
      "ANTHROPIC_API_KEY is required when PREMISE_MOCK_DIR is not set. " +
        "Set it in your environment or .env file."
    );
  }

  clientInstance = new Anthropic({
    apiKey: config.anthropicApiKey ?? "mock-key-unused",
  });

  return clientInstance;
}

export interface AnthropicRequest {
  readonly systemPrompt: string;
  readonly userMessage: string;
  readonly maxTokens?: number;
}

export interface AnthropicJsonResponse<T> {
  readonly parsed: T;
  readonly rawText: string;
}

/**
 * Sends a message to the Anthropic API and parses the JSON response.
 *
 * When PREMISE_MOCK_DIR is set and a matching mock file exists,
 * reads the response from disk. The mockFileName parameter controls
 * which file is loaded.
 *
 * Nondeterminism: LLM responses are inherently nondeterministic.
 * Callers must validate returned structure with Zod schemas.
 */
export async function sendAnthropicRequest<T>(
  request: AnthropicRequest,
  mockFileName?: string
): Promise<AnthropicJsonResponse<T>> {
  const config = getConfig();

  if (config.mockDir && mockFileName) {
    return loadMockResponse<T>(config.mockDir, mockFileName);
  }

  const client = getClient();
  const model = config.model;

  try {
    const response = await client.messages.create({
      model,
      max_tokens: request.maxTokens ?? 4096,
      system: request.systemPrompt,
      messages: [{ role: "user", content: request.userMessage }],
    });

    const textBlock = response.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error(
        `Anthropic returned no text content. Stop reason: ${response.stop_reason}. ` +
          `Check that the prompt requests JSON output.`
      );
    }

    const rawText = textBlock.text;
    const parsed = extractAndParseJson<T>(rawText);

    await captureResponseIfEnabled(mockFileName, parsed);

    return { parsed, rawText };
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      throw new Error(
        `Anthropic API error (${error.status}): ${error.message}. ` +
          `Tool: ${mockFileName ?? "unknown"}. ` +
          `Check your API key and account limits.`
      );
    }
    throw error;
  }
}

/**
 * Sends a conversation-style request with full message history.
 * Used by the simulation tools where multi-turn context is needed.
 */
export async function sendAnthropicConversation<T>(
  systemPrompt: string,
  messages: ReadonlyArray<{ readonly role: "user" | "assistant"; readonly content: string }>,
  maxTokens?: number,
  mockFileName?: string
): Promise<AnthropicJsonResponse<T>> {
  const config = getConfig();

  if (config.mockDir && mockFileName) {
    return loadMockResponse<T>(config.mockDir, mockFileName);
  }

  const client = getClient();
  const model = config.model;

  try {
    const response = await client.messages.create({
      model,
      max_tokens: maxTokens ?? 4096,
      system: systemPrompt,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    });

    const textBlock = response.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error(
        `Anthropic returned no text content in conversation. Stop reason: ${response.stop_reason}.`
      );
    }

    const rawText = textBlock.text;
    const parsed = extractAndParseJson<T>(rawText);
    await captureResponseIfEnabled(mockFileName, parsed);
    return { parsed, rawText };
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      throw new Error(
        `Anthropic API error (${error.status}): ${error.message}. ` +
          `Tool: ${mockFileName ?? "unknown conversation"}. ` +
          `Check your API key and account limits.`
      );
    }
    throw error;
  }
}

/**
 * Extracts JSON from a response that may contain markdown fences or preamble text.
 * Looks for the first { ... } or [ ... ] block, trying the largest match first.
 */
function extractAndParseJson<T>(text: string): T {
  const trimmed = text.trim();

  // Try direct parse first (response is pure JSON)
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    // Not pure JSON; extract from markdown or surrounding text
  }

  // Strip markdown code fences if present
  const fenceMatch = trimmed.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (fenceMatch) {
    try {
      return JSON.parse(fenceMatch[1].trim()) as T;
    } catch {
      // Fence content wasn't valid JSON either
    }
  }

  // Find the first JSON object or array
  const jsonStart = trimmed.search(/[{[]/);
  if (jsonStart === -1) {
    throw new Error(
      `No JSON found in Anthropic response. First 200 chars: "${trimmed.slice(0, 200)}"`
    );
  }

  const openChar = trimmed[jsonStart];
  const closeChar = openChar === "{" ? "}" : "]";
  let depth = 0;
  let inString = false;
  let escapeNext = false;

  for (let i = jsonStart; i < trimmed.length; i++) {
    const char = trimmed[i];

    if (escapeNext) {
      escapeNext = false;
      continue;
    }

    if (char === "\\") {
      escapeNext = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (char === openChar) depth++;
    if (char === closeChar) depth--;

    if (depth === 0) {
      const jsonStr = trimmed.slice(jsonStart, i + 1);
      try {
        return JSON.parse(jsonStr) as T;
      } catch (parseError) {
        throw new Error(
          `Found JSON-like block but failed to parse. Error: ${parseError instanceof Error ? parseError.message : String(parseError)}. ` +
            `First 200 chars of block: "${jsonStr.slice(0, 200)}"`
        );
      }
    }
  }

  throw new Error(
    `Unbalanced JSON in Anthropic response starting at position ${jsonStart}. ` +
      `First 200 chars: "${trimmed.slice(0, 200)}"`
  );
}

async function loadMockResponse<T>(
  mockDir: string,
  fileName: string
): Promise<AnthropicJsonResponse<T>> {
  const filePath = join(mockDir, fileName);

  if (!existsSync(filePath)) {
    throw new Error(
      `Mock response file not found: ${filePath}. ` +
        `Set PREMISE_MOCK_DIR to a directory containing pre-recorded responses, ` +
        `or unset it to use the live Anthropic API.`
    );
  }

  const rawText = await readFile(filePath, "utf-8");
  const parsed = JSON.parse(rawText) as T;

  return { parsed, rawText };
}

/**
 * Saves parsed API responses to PREMISE_CAPTURE_DIR when set.
 * Used during development to capture real API responses as mock fixtures.
 * The mockFileName parameter becomes the output file name.
 */
async function captureResponseIfEnabled<T>(
  mockFileName: string | undefined,
  parsed: T
): Promise<void> {
  const captureDir = process.env["PREMISE_CAPTURE_DIR"];
  if (!captureDir || !mockFileName) return;

  await mkdir(captureDir, { recursive: true });
  const filePath = join(captureDir, mockFileName);
  await writeFile(filePath, JSON.stringify(parsed, null, 2));
}
