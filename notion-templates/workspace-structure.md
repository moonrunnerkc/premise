# Notion Workspace Structure

This document describes the Notion workspace layout that the orchestrator creates via Notion MCP. The Premise server never touches Notion directly; it returns data, and the orchestrator calls Notion MCP to build pages.

## Page Hierarchy

```
Premise: [Negotiation Title]                Parent page
├── Position Analysis                       Rich text page
│   ├── Your Position (target, reservation, BATNA)
│   ├── Their Estimated Position
│   ├── ZOPA Analysis
│   └── Leverage Points
├── Scenario Database                       Notion database
│   ├── [Scenario: "They counter with X"]   Database entries
│   ├── [Scenario: "They say budget frozen"]
│   └── ... (linked by Parent Scenario relation)
├── Simulation Log                          Rich text page
│   ├── Transcript with tactical notes
│   ├── Post-mortem analysis
│   └── Counterparty inner state reveal
├── Debrief                                 Rich text page (post-negotiation)
│   ├── Outcome summary
│   ├── Prep vs. Reality comparison
│   └── Lessons learned
└── Raw Analysis                            Collapsed page
    └── Full JSON outputs from all tools
```

## Scenario Database Properties

| Property | Type | Purpose |
|----------|------|---------|
| Title | Title | Scenario description |
| Parent Scenario | Relation (self) | Links to parent node in tree |
| Probability | Select | High / Medium / Low |
| Emotional Temperature | Select | Calm / Tense / Heated |
| Recommended Response | Rich text | What to say/do |
| Rationale | Rich text | Why this response works |
| Tradeoffs | Rich text | What you give up |
| Status | Select | Unexplored / Prepared / Practiced |
| Outcome | Select | (Set by debrief) Happened / Partially / Did Not / Happened Differently |
| Debrief Notes | Rich text | (Set by debrief) What actually occurred vs. predicted |

## Creation Sequence

The orchestrator creates pages in this order to ensure relations work:

1. Parent page: `Premise: [Title]`
2. Raw Analysis page (child of parent)
3. Position Analysis page (child of parent, formatted markdown)
4. Scenario Database (child of parent, with full property schema)
5. Scenario entries (in the database, top-level first for relations)
6. Simulation Log (child of parent, after simulation completes)
7. Debrief page (child of parent, after real negotiation)

## Notion MCP Tools Used

- `notion-create-pages`: Parent page, child pages
- `notion-create-database`: Scenario Database with properties
- `notion-update-page`: Set scenario outcomes during debrief
- `notion-create-comment`: Add debrief notes to scenarios
- `notion-search`: Find existing workspaces
- `notion-fetch`: Read stored analysis for debrief comparison
