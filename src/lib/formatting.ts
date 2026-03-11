/**
 * Markdown formatting utilities for Notion-compatible content.
 *
 * These functions produce markdown that renders well in Notion pages
 * when passed through the Notion MCP's page creation tools.
 */

import type { PositionAnalysis, ScenarioTree, ScenarioBranch } from "../types/negotiation.js";

/**
 * Formats position analysis as markdown suitable for a Notion rich text page.
 */
export function formatPositionAnalysis(position: PositionAnalysis): string {
  const sections: string[] = [];

  sections.push("## Your Position\n");
  sections.push(`**Target:** ${position.your_position.target}`);
  sections.push(
    `**Reservation Point:** ${position.your_position.reservation_point}`
  );
  sections.push(`**BATNA:** ${position.your_position.batna}`);
  sections.push(
    `**BATNA Strength:** ${position.your_position.batna_strength}`
  );
  sections.push(
    `**Anchor Recommendation:** ${position.your_position.anchor_recommendation}`
  );
  sections.push(`**Rationale:** ${position.your_position.rationale}\n`);

  sections.push("## Their Estimated Position\n");
  sections.push(
    `**Likely Target:** ${position.their_estimated_position.likely_target}`
  );
  sections.push(
    `**Likely Reservation:** ${position.their_estimated_position.likely_reservation}`
  );
  sections.push(
    `**Likely BATNA:** ${position.their_estimated_position.likely_batna}`
  );
  if (position.their_estimated_position.constraints.length > 0) {
    sections.push("\n**Constraints:**");
    for (const constraint of position.their_estimated_position.constraints) {
      sections.push(`- ${constraint}`);
    }
  }
  if (position.their_estimated_position.incentives.length > 0) {
    sections.push("\n**Incentives:**");
    for (const incentive of position.their_estimated_position.incentives) {
      sections.push(`- ${incentive}`);
    }
  }

  sections.push("\n## ZOPA Analysis\n");
  sections.push(`**Exists:** ${position.zopa.exists ? "Yes" : "No"}`);
  sections.push(`**Estimated Range:** ${position.zopa.estimated_range}`);
  sections.push(`**Confidence:** ${position.zopa.confidence_level}\n`);

  if (position.leverage_points.length > 0) {
    sections.push("## Leverage Points\n");
    for (const point of position.leverage_points) {
      sections.push(
        `- **${point.factor}** (favors: ${point.who_it_favors}): ${point.how_to_use_it}`
      );
    }
    sections.push("");
  }

  if (position.risk_factors.length > 0) {
    sections.push("## Risk Factors\n");
    for (const risk of position.risk_factors) {
      sections.push(
        `- **${risk.risk}** (${risk.probability} probability): ${risk.mitigation}`
      );
    }
    sections.push("");
  }

  if (position.tradeable_issues.length > 0) {
    sections.push("## Tradeable Issues\n");
    sections.push(
      "| Issue | Your Priority | Their Likely Priority |"
    );
    sections.push("| --- | --- | --- |");
    for (const issue of position.tradeable_issues) {
      sections.push(
        `| ${issue.issue} | ${issue.your_priority} | ${issue.their_likely_priority} |`
      );
    }
  }

  return sections.join("\n");
}

/**
 * Formats a single scenario branch for a Notion database entry's rich text field.
 */
export function formatScenarioBranch(branch: ScenarioBranch): string {
  const sections: string[] = [];

  sections.push(`**Counterparty Move:** ${branch.counterparty_move}\n`);
  sections.push(`**Probability:** ${branch.probability}`);
  sections.push(
    `**Emotional Temperature:** ${branch.emotional_temperature}\n`
  );

  if (branch.recommended_responses.length > 0) {
    sections.push("### Recommended Responses\n");
    for (const resp of branch.recommended_responses) {
      sections.push(`**Response:** ${resp.response}`);
      sections.push(`*Rationale:* ${resp.rationale}`);
      sections.push(`*Tradeoffs:* ${resp.tradeoffs}`);
      if (resp.leads_to) {
        sections.push(`*Leads to:* ${resp.leads_to}`);
      }
      sections.push("");
    }
  }

  return sections.join("\n");
}

/**
 * Formats the full scenario tree as an overview markdown page.
 */
export function formatScenarioTreeOverview(tree: ScenarioTree): string {
  const sections: string[] = [];

  sections.push(`# Scenario Decision Tree\n`);
  sections.push(`${tree.root.description}\n`);

  const rootBranches = tree.branches.filter((b) => b.parent_id === null);
  const childBranches = tree.branches.filter((b) => b.parent_id !== null);

  for (const branch of rootBranches) {
    sections.push(`## ${branch.page_title}\n`);
    sections.push(`${branch.counterparty_move}`);
    sections.push(`*Probability: ${branch.probability}*\n`);

    const children = childBranches.filter((c) => c.parent_id === branch.id);
    if (children.length > 0) {
      for (const child of children) {
        sections.push(`### ${child.page_title}`);
        sections.push(`${child.counterparty_move}`);
        sections.push(`*Probability: ${child.probability}*\n`);
      }
    }
  }

  return sections.join("\n");
}

/**
 * Formats simulation transcript for a Notion page.
 */
export function formatSimulationTranscript(
  transcript: ReadonlyArray<{
    readonly round: number;
    readonly speaker: string;
    readonly message: string;
    readonly tactical_note: string | null;
  }>
): string {
  const sections: string[] = [];
  let currentRound = 0;

  for (const entry of transcript) {
    if (entry.round !== currentRound) {
      currentRound = entry.round;
      sections.push(`\n---\n\n## Round ${currentRound}\n`);
    }

    const speakerLabel = entry.speaker === "user" ? "**You**" : "**Counterparty**";
    sections.push(`${speakerLabel}: ${entry.message}\n`);

    if (entry.tactical_note) {
      sections.push(`> *Coach: ${entry.tactical_note}*\n`);
    }
  }

  return sections.join("\n");
}
