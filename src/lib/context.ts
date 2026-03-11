/**
 * Email and communication context assembly.
 *
 * Takes raw email snippets (from Gmail MCP) and formats them
 * for inclusion in analysis prompts.
 *
 * Gmail integration is optional. This module degrades gracefully
 * when no email context is available.
 */

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
