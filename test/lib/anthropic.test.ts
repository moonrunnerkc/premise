/**
 * Tests for Anthropic client utility functions.
 *
 * Covers extractAndParseJson which handles multiple JSON extraction
 * strategies from LLM responses: direct parse, markdown fences,
 * and brace-matching from mixed text.
 */

import { describe, it, expect } from "vitest";
import { extractAndParseJson } from "../../src/lib/anthropic.js";

describe("extractAndParseJson", () => {
  it("parses pure JSON object", () => {
    const input = '{"name": "Alice", "score": 42}';
    const result = extractAndParseJson<{ name: string; score: number }>(input);
    expect(result).toEqual({ name: "Alice", score: 42 });
  });

  it("parses pure JSON array", () => {
    const input = '[1, 2, 3]';
    const result = extractAndParseJson<number[]>(input);
    expect(result).toEqual([1, 2, 3]);
  });

  it("extracts JSON from markdown code fences", () => {
    const input = `Here is the analysis:

\`\`\`json
{"strengths": ["good opening"], "score": 8}
\`\`\`

That completes the review.`;
    const result = extractAndParseJson<{ strengths: string[]; score: number }>(input);
    expect(result).toEqual({ strengths: ["good opening"], score: 8 });
  });

  it("extracts JSON from fences without language tag", () => {
    const input = `\`\`\`
{"key": "value"}
\`\`\``;
    const result = extractAndParseJson<{ key: string }>(input);
    expect(result).toEqual({ key: "value" });
  });

  it("extracts JSON from mixed text with preamble", () => {
    const input = `I analyzed the negotiation and here are my findings:

{"parties": [{"name": "You"}, {"name": "Sarah"}], "confidence": "high"}

I hope this helps with your preparation.`;
    const result = extractAndParseJson<{
      parties: Array<{ name: string }>;
      confidence: string;
    }>(input);
    expect(result.parties).toHaveLength(2);
    expect(result.confidence).toBe("high");
  });

  it("handles nested JSON objects with braces in strings", () => {
    const input = '{"text": "Use {curly braces} carefully", "count": 1}';
    const result = extractAndParseJson<{ text: string; count: number }>(input);
    expect(result.text).toBe("Use {curly braces} carefully");
    expect(result.count).toBe(1);
  });

  it("handles escaped quotes in JSON strings", () => {
    const input = '{"dialogue": "She said \\"hello\\" first"}';
    const result = extractAndParseJson<{ dialogue: string }>(input);
    expect(result.dialogue).toBe('She said "hello" first');
  });

  it("throws on text with no JSON", () => {
    expect(() => extractAndParseJson("No JSON content here at all")).toThrow(
      "No JSON found"
    );
  });

  it("throws on unbalanced JSON", () => {
    expect(() => extractAndParseJson('{"key": "value"')).toThrow(
      "Unbalanced JSON"
    );
  });

  it("handles whitespace around JSON", () => {
    const input = "   \n  {\"key\": \"value\"}  \n  ";
    const result = extractAndParseJson<{ key: string }>(input);
    expect(result).toEqual({ key: "value" });
  });
});
