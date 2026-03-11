/**
 * Email and communication context assembly.
 *
 * Takes raw email snippets (from Gmail MCP) and structures them
 * into contextual observations about the counterparty for use
 * in analysis and persona building prompts.
 *
 * Gmail integration is optional. This module degrades gracefully
 * when no email context is available.
 */

export interface EmailContextSummary {
  readonly toneObservations: readonly string[];
  readonly pastAgreements: readonly string[];
  readonly relationshipSignals: readonly string[];
  readonly rawSnippetCount: number;
}

/**
 * Analyzes email snippets for negotiation-relevant signals.
 * Returns structured observations that feed into the analysis and persona prompts.
 *
 * When no emails are provided, returns an empty context.
 */
export function assembleEmailContext(
  emails: readonly string[] | undefined
): EmailContextSummary {
  if (!emails || emails.length === 0) {
    return {
      toneObservations: [],
      pastAgreements: [],
      relationshipSignals: [],
      rawSnippetCount: 0,
    };
  }

  // Format the raw snippets for inclusion in prompts.
  // The actual tone/agreement analysis happens in the LLM prompt;
  // this function structures the input for that prompt.
  return {
    toneObservations: [],
    pastAgreements: [],
    relationshipSignals: [],
    rawSnippetCount: emails.length,
  };
}

/**
 * Formats email snippets into a prompt-ready block for the LLM to analyze.
 * Returns empty string when no emails are available.
 */
export function formatEmailsForPrompt(
  emails: readonly string[] | undefined
): string {
  if (!emails || emails.length === 0) {
    return "";
  }

  const formattedEmails = emails
    .map((email, index) => `--- Email ${index + 1} ---\n${email}\n`)
    .join("\n");

  return (
    "\n\n## Counterparty Email History\n\n" +
    "The following email snippets provide context about the counterparty's " +
    "communication style, past agreements, and relationship dynamics:\n\n" +
    formattedEmails
  );
}
