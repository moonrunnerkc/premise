# Copilot Instructions: Premise

This file governs all code generation, documentation, and content for this repository. Every rule in Section 1 is a hard constraint. Copilot must follow them on every generation without exception. Sections 2+ provide project context, architecture, and contracts that inform what to generate.

---

# Section 1: Engineering Rules

These rules are non-negotiable. They apply to every file, function, type, test, comment, commit message, README paragraph, and error message in this repository.

## 1.1 Truthfulness and Verification

No hallucinations or invented claims. Every claim must be backed by code, tests, logs, or reproducible runs. If something is uncertain, say so explicitly rather than presenting it with false confidence.

Correct false assumptions immediately before proposing solutions. Do not let errors propagate through subsequent code or reasoning.

Treat the repo as source of truth. Do not claim changes, runs, or commits without evidence. If a function doesn't exist yet, say so. If a test hasn't been run, say so.

## 1.2 Real Code Only

Code must be real, complete, and logically sound. No placeholders, pseudocode, or partial implementations. Every function that exists must do something. Every branch that's handled must be handled correctly.

No mocks, fake integrations, or toy logic unless explicitly temporary and tracked with removal steps. If a mock exists, it has a corresponding TODO with a concrete removal plan and the mock is clearly labeled in the code.

Logic must be fully implemented and testable. Avoid speculative or decorative architecture. Do not build abstractions for hypothetical future needs. If a wrapper, factory, manager, helper, or utility doesn't solve a concrete duplication or complexity problem that exists today, do not create it.

## 1.3 Deterministic Behavior

Deterministic behavior where feasible. Use explicit seeds, stable ordering, and reproducible configs. Document limits where nondeterminism is unavoidable (LLM responses, network calls).

Surface hidden risks: nondeterminism, dependency drift, security exposure, misleading benchmarks. If a test passes nondeterministically, that test is broken.

## 1.4 Code Quality

Code quality bar: elegant and clear. Not minimal to the point of fragility. Not bloated or overengineered. The code should look like it was written by an experienced developer who knows when to stop.

Remove redundancy. Actively detect duplicate logic, dead code, and unnecessary abstractions. If two functions do the same thing, one of them should not exist.

Clear architecture and contracts. DRY, SOLID, explicit boundaries, minimal hidden state. Every module has a clear responsibility. Every function has a clear contract (inputs, outputs, side effects, failure modes).

One change at a time for risky refactors. Each change must include tests and verification.

## 1.5 Naming

Functions describe actions: `buildCounterpartyPersona`, `serializeSessionState`, `extractTacticalNote`. Not `processData`, `handleResponse`, `doStuff`.

Boolean variables read as questions: `isTerminated`, `hasReachedDeal`, `shouldEscalateCoaching`. Not `terminated`, `deal`, `escalate`.

Constants are descriptive: `MAX_SIMULATION_ROUNDS`, `DEFAULT_COUNTERPARTY_STYLE`. Not `MAX`, `DEFAULT`, `N`.

File names match their primary export. `sim-round.ts` exports the sim-round tool handler. `session-codec.ts` exports session serialization functions. No `utils.ts` dumping grounds.

No generic variable names when a specific name exists. A variable holding a negotiation analysis is `analysis`, not `data`. A variable holding the counterparty's move is `counterpartyMove`, not `result`.

## 1.6 TypeScript Specifics

No `any` type. Every function parameter and return type is explicitly typed. If the type is complex, define it in `src/types/`. If a third-party library returns `any`, cast it with a type assertion and a comment explaining why.

Prefer `const` over `let`. Prefer `readonly` on object properties that shouldn't change. Immutability by default; mutability when justified.

Imports are explicit. No wildcard imports (`import * as`) unless the library is designed for it (like `zod`). Named imports only.

Early returns over deep nesting. Guard clauses at the top, happy path at the bottom.

Functions do one thing. If a function has an "and" in its natural description ("parse the input AND validate it AND transform it"), split it.

## 1.7 Error Handling and Observability

Structured logging and observable failure modes. Errors must be actionable. Every error message tells the developer what went wrong, where, and what to do about it.

Every Anthropic API call has a try/catch with a meaningful error message. Not `catch (e) { throw e }`. Not `catch (e) { console.log(e) }`. Catch, contextualize, rethrow or return a structured error.

No empty catch blocks. No swallowed errors. No `// TODO: handle this later` without a tracked removal step.

## 1.8 Testing

Maintain strong tests: unit, integration, invariants, and regression coverage. Tests must validate real behavior, not just exercise code paths.

Every tool handler has at least one test that verifies correct output structure for valid input and at least one test that verifies error handling for invalid input.

Integration tests use mocked Anthropic responses captured from real API calls. The mock responses in `demo/mock-responses/` serve double duty: demo infrastructure AND test fixtures.

## 1.9 Documentation

Update docs and README as changes land. No inflated claims. State limitations plainly. If a feature is partially implemented, the README says so.

Code examples in documentation must be correct and runnable. No illustrative pseudocode in user-facing docs.

Comments explain WHY, not WHAT. Do not comment `// Initialize the server` above a line that initializes the server. If the code needs a WHAT comment, the code is unclear and should be rewritten.

## 1.10 Content and Writing

Public-facing content must be human-written in tone and structure. Zero AI tells or footprints. This applies to the README, the dev.to blog post, commit messages, error messages, and every user-facing string.

Never use em dashes in any content, code comments, documentation, or commit messages. Use commas, colons, semicolons, parentheses, or separate sentences instead. No exceptions.

Banned vocabulary in public content: "delve", "dive into", "unpack", "landscape" (as metaphor), "foster", "cultivate" (outside agriculture), "leverage" (as verb), "utilize" (use "use"), "seamlessly", "effortlessly", "elevate", "empower", "streamline", "robust", "cutting-edge", "game-changer", "it's worth noting", "at the end of the day", "the reality is", "let's be honest" (when nothing controversial follows).

No artificial symmetry in writing. Not every section the same length. Not every list the same number of items. Real writing has uneven emphasis.

---

# Section 2: Project Context

## What This Is

Premise is an evidence-grounded preparation system built on Notion MCP for the Notion MCP Challenge on dev.to. Deadline: March 29, 2026. Individual submission. Prize: $500 + chat with Ivan Zhao (Notion CEO).

A user describes an upcoming high-stakes conversation in natural language: salary discussion, contract renewal, client pitch, performance review, vendor deal. The system builds a complete preparation workspace in Notion with structured position analysis, scenario decision trees, interactive adversarial simulation, and outcome tracking. Everything lives in Notion. Notion IS the database. The tagline: "Build your premise before any high-stakes conversation."

## Stack

TypeScript, MCP SDK (`@modelcontextprotocol/sdk`), Zod, Notion MCP (`@notionhq/notion-mcp-server`), Gmail MCP (optional), Anthropic API (`claude-sonnet-4-20250514`).

## Architecture

Three MCP servers coordinate through a single orchestrating LLM (Claude Desktop or Claude Code).

**Orchestrator** (Claude Desktop / Claude Code): User interaction, workflow sequencing, Notion/Gmail operations. No custom code. Controlled via the workflow template in `workflow/premise-workflow.md`.

**Notion MCP** (Official, `@notionhq/notion-mcp-server`): All workspace operations. We consume it, not build it. Available tools: `notion-search`, `notion-fetch`, `notion-create-pages`, `notion-update-page`, `notion-create-database`, `notion-create-comment`, and others documented at developers.notion.com/guides/mcp/mcp-supported-tools. Rate limits: 180 requests/min general, 30 searches/min.

**Gmail MCP** (Optional): Reads email history for counterparty context. Degrades gracefully if unavailable. Start without it; add if time allows.

**Premise MCP Server** (Custom, this repo): The core deliverable. 7 tools providing negotiation-specific intelligence. Calls the Anthropic API internally. Stateless between requests (simulation state carried by orchestrator via session_state blob).

### Data Flow

1. User describes negotiation to Claude
2. Claude calls `premise-analyze`, gets structured metadata
3. Claude optionally searches Gmail for counterparty emails
4. Claude calls `premise-position` with analysis + user's target/minimum/BATNA
5. Claude calls Notion MCP to create Premise workspace (parent page, position page, scenario database)
6. Claude calls `premise-scenarios` for decision tree, populates scenario database via Notion MCP
7. User starts simulation. Claude calls `premise-sim-start` with opening line
8. Claude relays counterparty response + coaching note. User responds. Claude calls `premise-sim-round`. Loop continues.
9. On termination, Claude calls `premise-sim-end`, gets post-mortem with counterparty inner state reveal
10. Claude writes transcript + post-mortem to Notion
11. After real negotiation, user triggers debrief
12. Claude calls `premise-debrief`, updates each scenario in Notion database with verdict

### Why Three MCPs

Separation of concerns: Premise focuses on negotiation logic, never needs Notion credentials. Technical complexity: multi-MCP orchestration is harder and more impressive than a single server. The official Notion MCP handles pagination, rate limits, and schema management better than anything we'd write.

---

# Section 3: File Structure

```
premise/
├── .github/
│   └── copilot-instructions.md        # THIS FILE
├── README.md                          # Challenge submission quick-start
├── LICENSE                            # MIT
├── package.json
├── tsconfig.json
├── .env.example                       # Template for required env vars
│
├── src/
│   ├── index.ts                       # Server entry point, transport setup
│   ├── server.ts                      # McpServer instance, tool registration
│   │
│   ├── tools/                         # One file per MCP tool
│   │   ├── analyze.ts                 # Intake analysis: parse negotiation context
│   │   ├── position.ts                # Position mapping: BATNA, ZOPA, leverage
│   │   ├── scenarios.ts               # Decision tree generation
│   │   ├── sim-start.ts               # Initialize interactive simulation session
│   │   ├── sim-round.ts               # Process one round of interactive simulation
│   │   ├── sim-end.ts                 # Generate post-mortem from simulation session
│   │   └── debrief.ts                 # Post-negotiation outcome logging + scenario verdicts
│   │
│   ├── prompts/                       # Versioned prompt templates
│   │   ├── analysis.ts                # System prompt for negotiation parsing
│   │   ├── counterparty.ts            # Adversary persona calibration
│   │   ├── scenario-gen.ts            # Decision branch generation
│   │   ├── tactical-coach.ts          # Per-round tactical observation generation
│   │   └── debrief-reflection.ts      # Outcome analysis + scenario verdict prompt
│   │
│   ├── types/                         # Shared TypeScript types
│   │   ├── negotiation.ts             # Core domain types
│   │   ├── session.ts                 # Simulation session state types
│   │   └── schemas.ts                 # Zod schemas for tool inputs/outputs
│   │
│   └── lib/                           # Shared utilities
│       ├── anthropic.ts               # Anthropic API client wrapper
│       ├── formatting.ts              # Markdown formatting for Notion content
│       ├── session-codec.ts           # Serialize/deserialize simulation session state
│       └── context.ts                 # Email/comms context assembly
│
├── workflow/                          # Orchestrator prompt templates
│   ├── premise-workflow.md            # Full workflow prompt for Claude Desktop
│   ├── sim-relay.md                   # Interactive simulation relay instructions
│   └── debrief-followthrough.md       # Post-debrief Notion update instructions
│
├── notion-templates/
│   └── workspace-structure.md         # Documents the Notion workspace layout
│
├── scripts/
│   ├── setup-notion.sh                # Creates required Notion databases via API
│   └── demo.sh                        # Runs scripted demo with mocked API responses
│
├── demo/
│   ├── mock-responses/                # Pre-recorded API responses for demo.sh
│   │   ├── analyze-salary.json
│   │   ├── position-salary.json
│   │   ├── scenarios-salary.json
│   │   ├── sim-start-salary.json
│   │   ├── sim-rounds-salary.json     # Array of round responses
│   │   └── sim-end-salary.json
│   ├── demo-script.md                 # Exact prompts to type for the video walkthrough
│   └── notion-screenshots/            # Screenshots captured during demo for blog post
│
├── docs/
│   ├── architecture.md                # Architecture doc (for the dev.to post)
│   └── demo-walkthrough.md            # Step-by-step demo with expected outputs
│
└── test/
    ├── tools/
    │   ├── analyze.test.ts
    │   ├── position.test.ts
    │   ├── scenarios.test.ts
    │   ├── sim-start.test.ts
    │   ├── sim-round.test.ts
    │   ├── sim-end.test.ts
    │   └── debrief.test.ts
    └── integration/
        └── full-workflow.test.ts      # End-to-end with mocked Anthropic responses
```

Each tool gets its own file because each is independently testable with distinct input/output schemas. The simulation is split into three tools (start, round, end) because MCP tools are request/response; the interactive loop lives in the orchestrator, not the server.

Prompts are separate from tools because they evolve independently. You tune the adversary persona without touching simulation orchestration code.

The `workflow/` directory is NOT code. It contains markdown instructions for the orchestrating LLM, scripting the exact tool-call sequence for reliability and demo reproducibility.

The `demo/` directory holds everything for offline demos: pre-recorded responses captured from real API calls, the exact prompts for the video, and a screenshots folder.

---

# Section 4: Environment Variables

```
# Required
ANTHROPIC_API_KEY=sk-ant-...          # Premise server's internal LLM calls
NOTION_TOKEN=ntn_...                   # For the Notion MCP server (not used by Premise directly)

# Optional (Gmail integration)
GOOGLE_CREDENTIALS_FILE=credentials.json
GOOGLE_TOKEN_FILE=token.json

# Server config
PREMISE_MODEL=claude-sonnet-4-20250514   # Model for analysis/simulation
PREMISE_LOG_LEVEL=info                    # debug | info | warn | error
PREMISE_MOCK_DIR=                         # When set, reads responses from this dir instead of API
```

---

# Section 5: Tool API Contracts

Every tool returns structured JSON as text content in the MCP response. The Premise server never touches Notion directly. It returns data; the orchestrator calls Notion MCP to create pages.

## 5.1 `premise-analyze`

Intake analysis. Takes raw natural language description, returns structured negotiation metadata.

**Inputs:**
- `context` (string, required): Free-text negotiation description
- `counterparty_emails` (string[], optional): Email snippets from Gmail MCP
- `negotiation_type` (enum, optional): "salary" | "contract" | "vendor" | "freelance" | "lease" | "other"

**Outputs:**
- `parties`: Array of { name, role, relationship, estimated_power_level }
- `stakes`: { your_upside, your_downside, their_upside, their_downside }
- `timeline`: { negotiation_date, decision_deadline, time_pressure_level }
- `power_dynamics`: { who_needs_whom_more, information_asymmetry, relationship_value }
- `emotional_factors`: { your_anxiety_points, their_likely_anxiety_points }
- `negotiation_id`: UUID generated server-side, ties all subsequent calls together

**Failure mode:** If context is too vague, return a structured clarification request. Do not hallucinate details.

## 5.2 `premise-position`

Position analysis for both sides.

**Inputs:**
- `negotiation_id` (string, required)
- `analysis` (object, required): Output from premise-analyze
- `your_target` (string, required): What you're aiming for
- `your_minimum` (string, required): Walk-away point
- `your_batna` (string, optional): Best alternative if no deal
- `market_context` (string, optional): Market data, benchmarks, comparables

**Outputs:**
- `your_position`: { target, reservation_point, batna, batna_strength, anchor_recommendation, rationale }
- `their_estimated_position`: { likely_target, likely_reservation, likely_batna, constraints, incentives }
- `zopa`: { exists (boolean), estimated_range, confidence_level }
- `leverage_points`: Array of { factor, who_it_favors, how_to_use_it }
- `risk_factors`: Array of { risk, probability, mitigation }
- `tradeable_issues`: Array of { issue, your_priority, their_likely_priority }

**Design contract:** The user provides their own target and minimum. The system validates realism, flags if target is outside estimated ZOPA, and surfaces leverage points the user may not have considered. The system does not override the user's positions.

## 5.3 `premise-scenarios`

Decision tree generation.

**Inputs:**
- `negotiation_id` (string, required)
- `analysis` (object, required)
- `positions` (object, required)
- `depth` (number, optional, default 2): Levels deep (1-3)
- `focus` (string, optional): Specific concern to explore

**Outputs:** Tree structure:
- `root`: { description }
- `branches`: Array of nodes, each with:
  - `id`: Unique identifier
  - `parent_id`: Links to parent (null for root children)
  - `counterparty_move`: What they might say/do
  - `probability`: high | medium | low
  - `recommended_responses`: Array of { response, rationale, tradeoffs, leads_to }
  - `emotional_temperature`: How tense this branch gets
  - `page_title`: Pre-formatted for Notion

**Contract:** Branches must be specific to THIS negotiation, not generic advice. The `focus` parameter drills into a specific anxiety rather than generating generic branches.

## 5.4 `premise-sim-start`

Initialize interactive simulation session.

**Inputs:**
- `negotiation_id` (string, required)
- `analysis` (object, required)
- `positions` (object, required)
- `counterparty_style` (enum, optional): "collaborative" | "aggressive" | "avoidant" | "analytical"
- `your_opening` (string, required): How the user starts the negotiation
- `max_rounds` (number, optional, default 8)

**Outputs:**
- `session_state`: Opaque JSON blob (full Anthropic conversation history, persona config, round counter). Orchestrator passes this back on each sim-round call.
- `counterparty_response`: In-character dialogue
- `tactical_note`: Coach's observation on this exchange
- `round`: 1
- `max_rounds`: Echo of configured max
- `status`: "active"

**Session state contract:** The blob is opaque to the orchestrator. The server serializes it, the orchestrator carries it, the server deserializes it on the next call. Same pattern as JWT. The `session-codec.ts` utility is the single point of serialization format definition. Expected size: 4-8KB for 8 rounds.

**Counterparty persona includes:**
- Estimated position and BATNA from position analysis
- Personality style from email tone analysis or user selection
- Negotiation-type-specific pressure tactics
- Structured output: in-character dialogue AND hidden metadata block (private thoughts, concession readiness, probing intent). Hidden metadata feeds tactical notes without being shown to user during simulation.

## 5.5 `premise-sim-round`

Process one round of interactive simulation.

**Inputs:**
- `session_state` (object, required): From previous sim-start or sim-round
- `your_response` (string, required): What the user says/does

**Outputs:**
- `session_state`: Updated blob
- `counterparty_response`: In-character dialogue
- `tactical_note`: Coach's observation
- `round`: Current round number
- `status`: "active" | "deal_reached" | "breakdown" | "max_rounds"
- `deal_terms` (present if status is "deal_reached"): What was agreed

**Termination conditions:**
- Counterparty explicitly accepts (status: "deal_reached")
- Counterparty walks away or conversation breaks down (status: "breakdown")
- Max rounds reached (status: "max_rounds")
- Termination signals parsed from counterparty's hidden metadata

## 5.6 `premise-sim-end`

Post-mortem analysis from completed simulation.

**Inputs:**
- `session_state` (object, required): Final state
- `end_reason` (enum, optional): "completed" | "user_quit" | "restart"

**Outputs:**
- `transcript`: Array of { round, speaker, message, tactical_note }
- `outcome`: { deal_reached, final_terms, rounds_taken }
- `post_mortem`: { strengths, weaknesses, missed_opportunities, suggested_adjustments }
- `counterparty_inner_state`: Array of private thoughts per round (the reveal moment)
- `recommended_retry_focus`: What to practice differently
- `scenario_matches`: Scenario IDs from the tree that came up during simulation

**The counterparty_inner_state reveal is the highest-value moment in the system.** "They were ready to concede on salary in round 3 but you didn't push. Instead you switched topics." This must produce genuine surprise. If it doesn't, the counterparty persona prompt needs more depth.

## 5.7 `premise-debrief`

Post-negotiation retrospective.

**Inputs:**
- `negotiation_id` (string, required)
- `outcome` (string, required): Free-text description
- `deal_terms` (string, optional)
- `surprises` (string, optional)
- `counterparty_behavior` (string, optional)

**Outputs:**
- `outcome_summary`: Structured version of free-text outcome
- `prep_vs_reality`: { position_accuracy, scenario_accuracy, simulation_accuracy }
- `lessons`: Array of { lesson, evidence, applies_to_future }
- `pattern_update`: What to remember for future negotiations
- `effectiveness_score`: Did the Premise help?
- `scenario_verdicts`: Array of { scenario_id, verdict, notes }. Verdict: "happened" | "partially_happened" | "did_not_happen" | "happened_differently"
- `simulation_comparison`: { most_realistic_round, least_realistic_round, counterparty_accuracy }

**Debrief follow-through contract:** The orchestrator uses `scenario_verdicts` to update each Scenario Database entry via Notion MCP: sets the Outcome property, adds a comment with debrief notes. This closes the feedback loop. The Scenario Database becomes a historical record of prediction vs. reality.

---

# Section 6: Notion Workspace Structure

Created by the orchestrator via Notion MCP. The Premise server never touches Notion directly.

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

### Scenario Database Properties

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
| Outcome | Select | (Set by debrief) Happened / Partially Happened / Did Not Happen / Happened Differently |
| Debrief Notes | Rich text | (Set by debrief) What actually occurred vs. predicted |

---

# Section 7: Internal Architecture

## Anthropic API Usage

The Premise server is an MCP server that internally calls the Anthropic API. The orchestrator (Claude Desktop) handles user interaction and Notion/Gmail operations. The Premise server handles negotiation domain logic using Claude as an internal reasoning engine. These are separate responsibilities, not redundancy.

Single Anthropic client created on startup, reused across tool calls. Each tool assembles a prompt from its template, sends it with context, parses the structured response.

## State Management

The server is stateless between MCP tool calls. All state is passed explicitly through inputs. `negotiation_id` ties calls together. The `analysis` and `positions` objects are passed forward.

The simulation session is the exception. The `session_state` blob carries the full Anthropic conversation history, persona config, and round counter. But the state is carried by the orchestrator (client-side), not stored on the server. The `session-codec.ts` utility handles serialization: JSON-stringify, optional compression above a threshold, base64 encoding. This is the single point where session state format is defined.

For debrief comparison, the orchestrator reads stored analysis from Notion pages via `notion-fetch`.

## Prompt Versioning

Each prompt template is a TypeScript function that takes structured inputs and returns a complete prompt string. Templates live in `src/prompts/` and are imported by the tools that use them. Compiled into the server, not loaded at runtime.

## Output Formatting

Every tool returns structured JSON as text content. The Premise server includes Notion-friendly markdown in certain fields (scenario descriptions, post-mortem analysis) so the orchestrator can pass them through to Notion page content.

---

# Section 8: Orchestrator Workflow

The workflow template lives at `workflow/premise-workflow.md` and ships with the server. Users paste it into their Claude Desktop project instructions. It scripts the exact tool-call sequence for reliability.

The full template is committed in the `workflow/` directory. Key structural rules the workflow enforces:

**Phase 1 (Intake):** Call `premise-analyze`, present summary, get user confirmation before proceeding. If Gmail is available, search for counterparty emails.

**Phase 2 (Position Mapping):** Call `premise-position`, present full map, flag concerns directly (target outside ZOPA, weak BATNA). Get confirmation.

**Phase 3 (Build Notion Workspace):** Create parent page, Position Analysis child page, Raw Analysis child page, Scenario Database with full property schema, populate scenarios as database entries with relations.

**Phase 4 (Interactive Simulation):** Call `premise-sim-start`. Relay counterparty response in natural dialogue format with coaching note. Wait for user response. Call `premise-sim-round`. Loop until termination. Call `premise-sim-end`. Write transcript + post-mortem to Notion.

Simulation relay formatting:
- Counterparty: bold name, quoted dialogue
- Coaching notes: italicized, one or two sentences max
- Round counter shown at start of each relay
- Coaching intensity escalates: light in rounds 1-2, active in 3-5, urgent in 6+
- If user approaches their stated walk-away without realizing, pause and flag

**Phase 5 (Debrief):** Call `premise-debrief`. Create Debrief page. Update each scenario database entry with verdict via `notion-update-page`. Add comments with debrief notes. Update parent page with completion banner.

**General rules for the orchestrator:** Never fabricate negotiation advice from own knowledge (all strategy comes from Premise tools). Relay counterparty responses as dialogue, not JSON. If any tool call fails, tell user and offer retry.

---

# Section 9: Gmail Integration

Optional. Email context for counterparty analysis: tone, past agreements, power dynamics, relationship signals.

Implementation priority: Start without Gmail (hardcode counterparty context in user prompt for first 25 hours of development). Add lightweight custom Gmail MCP server (~100 lines, `gmail.readonly` scope, two tools: `gmail-search` and `gmail-read`) if time allows after core system is solid. The core submission must not depend on Gmail.

---

# Section 10: Demo Strategy

Two approaches: `demo.sh` for reproducibility, recorded video for the blog post.

### demo.sh

The server accepts `PREMISE_MOCK_DIR` env var. When set, reads responses from JSON files instead of calling the Anthropic API. Mock responses are captured during development from real API calls.

Shows: server startup, tool registration, analyze, position, scenarios, sim-start, two sim-rounds, sim-end with post-mortem. Does NOT show Notion workspace creation (requires real account) or Gmail.

### Video

Target 3-5 minutes. Recorded in Claude Desktop with screen capture. Script in `demo/demo-script.md`. Key moments: Notion workspace appearing in real time, interactive simulation rounds with coaching, counterparty inner state reveal, scenario database after debrief with Outcome properties populated.

---

# Section 11: Risk Register

**Simulation quality:** Counterparty too easy/generic/character-breaking. Mitigation: invest in persona prompt, test across negotiation types, calibrate from position analysis not generic templates.

**Notion workspace creation:** Linked databases and relation properties via MCP are fiddly. Rate limits. Mitigation: test exact tool call sequence, start with minimal structure, add database as iteration.

**Scenario tree scope creep:** Deep trees (3+ levels) produce too much content. Mitigation: default to depth 2, show depth 2 working cleanly in demo.

**Blog post underinvestment:** Judges read the post, not the code. Mitigation: 4+ hours allocated, screenshots throughout development, write hook and structure before final code polish.

**Demo reproducibility:** Live APIs are flaky. Mitigation: `demo.sh` with mocks as backup, video as primary demo. Capture mocks during development.

**Orchestrator workflow adherence:** Claude Desktop may skip tool calls or invent advice. Mitigation: imperative language in workflow template, confirmation gates between phases, test 3+ times before recording.

---

# Section 12: Implementation Phases

See **Section 20** for the day-by-day build schedule. The phases below define what each stage produces and its quality gate (Section 16). The schedule in Section 20 maps these phases to calendar days.

### Phase 1: Foundation (Hours 1-8)

Milestone: Server runs, registers all 7 tools as stubs, connects via stdio.

1. Initialize TypeScript project with MCP SDK and Zod
2. Set up `src/index.ts` with stdio transport
3. Set up `src/server.ts` with McpServer instance
4. Create stub files for all 7 tools with input schemas defined in Zod
5. Register all tools in server.ts (returning placeholder outputs that match the contract shapes)
6. Test with MCP Inspector (`npx @modelcontextprotocol/inspector`)
7. Set up Anthropic client wrapper in `src/lib/anthropic.ts`
8. Configure Notion MCP server locally, verify standalone

Decision gate: All 7 tools invocable from MCP Inspector with structured stub responses.

### Phase 2: Analysis + Position (Hours 9-16)

Milestone: `premise-analyze` and `premise-position` produce real, useful outputs.

1. Write analysis prompt template
2. Implement `premise-analyze` with Anthropic API integration
3. Test with 3 negotiation types: salary, freelance rate, vendor contract
4. Write position mapping prompt template
5. Implement `premise-position`
6. Test internal consistency (ZOPA makes sense given both sides)
7. Build Notion workspace creation flow in Claude Desktop with Premise + Notion MCP connected
8. Iterate on Notion page structure based on what renders well

Decision gate: Position analysis feels genuinely useful. You would actually use this before a negotiation. If output reads like generic advice, prompt templates need work.

### Phase 3: Scenario Generation (Hours 17-22)

Milestone: `premise-scenarios` produces navigable decision tree that maps to Notion pages.

1. Write scenario generation prompt template
2. Implement `premise-scenarios` with tree structure output
3. Test orchestrator flow: analyze, position, scenarios, Notion page creation
4. Tune scenario quality: branches specific to THIS negotiation, not generic
5. Implement Notion database creation for scenarios (relation properties, select options)
6. Test full flow end-to-end with salary negotiation scenario

Decision gate: Scenario tree in Notion makes you feel prepared. Branches reveal things you hadn't considered.

### Phase 4: Interactive Simulation (Hours 23-30)

Milestone: sim-start, sim-round, sim-end produce compelling interactive experience with insightful post-mortem.

1. Write counterparty persona prompt with hidden metadata structure
2. Implement `premise-sim-start`: persona assembly, first API call, session state serialization
3. Implement `premise-sim-round`: state deserialization, conversation append, response, re-serialization
4. Write tactical coach prompt for per-round observations
5. Implement termination detection from counterparty's hidden metadata
6. Implement `premise-sim-end`: transcript extraction, post-mortem, inner state reveal, scenario matching
7. Test full interactive loop via MCP Inspector: start, 3 rounds, end
8. Test with multiple counterparty styles
9. Tune realism: counterparty tough but not cartoonish, hidden metadata shows realistic reasoning
10. Wire up orchestrator workflow, test relay pattern in Claude Desktop

Decision gate: Someone who didn't build the system runs through the simulation cold. The inner state reveal surprises them.

### Phase 5: Debrief + Demo Infrastructure (Hours 31-36)

Milestone: Complete lifecycle works. Debrief closes feedback loop. Demo assets captured.

1. Implement `premise-debrief` with scenario verdict generation
2. Build prep-vs-reality comparison
3. Test debrief-to-Notion-update flow: verdicts on scenarios, comments, parent page updated
4. Test full lifecycle: intake through debrief through scenario updates
5. Implement mock mode (`PREMISE_MOCK_DIR`)
6. Run full workflow with live APIs, capture every response to `demo/mock-responses/`
7. Build `demo.sh` using captured responses
8. Write `demo/demo-script.md` for video
9. Gmail integration if time allows
10. Polish: error handling, edge cases, input validation

### Phase 6: Video + Blog Post + Submission (Hours 37-42)

Milestone: Published dev.to submission with embedded demo video.

1. Clean Notion workspace for video
2. Record video following `demo/demo-script.md` (3-5 min)
3. Edit video: cut latency pauses, add captions
4. Upload video
5. Write blog post: hook (personal negotiation story), architecture, demo walkthrough with screenshots, simulation money shot, technical deep dive, debrief feedback loop, what's next
6. Embed video
7. Run `demo.sh` one final time, include terminal screenshot in post
8. Publish

---

# Section 13: Claude Desktop Configuration

```json
{
  "mcpServers": {
    "notion": {
      "command": "npx",
      "args": ["-y", "@notionhq/notion-mcp-server"],
      "env": {
        "NOTION_TOKEN": "ntn_..."
      }
    },
    "premise": {
      "command": "node",
      "args": ["path/to/premise/dist/index.js"],
      "env": {
        "ANTHROPIC_API_KEY": "sk-ant-..."
      }
    },
    "gmail": {
      "command": "npx",
      "args": ["-y", "@anthropic/gmail-mcp-server"],
      "env": {
        "GOOGLE_CREDENTIALS_FILE": "path/to/credentials.json"
      }
    }
  }
}
```

The Gmail server reference is illustrative. Package name may differ. Gmail is the component most likely to change during development.

---

# Section 14: Submission Strategy

## Timing

Submit in the final 48 hours before the March 29 deadline. Not the final hour (risks technical issues with dev.to publishing), but late enough that:

- The full competitive field is visible. Monitor submissions weekly to confirm no one is building in this space.
- Maximum polish time is used. Every day between "feature complete" and submission is polish, testing, and blog post refinement.
- Judges see you last. Recency bias is real. The last strong entries they read carry disproportionate weight, especially when scoring happens shortly after the deadline.
- Less time for others to see your concept and pivot toward it.

Target submission: **March 28, evening**. This gives a full day buffer for any publishing issues while still landing in the final batch.

## Dev.to Engagement (Tiebreaker Insurance)

The FAQ states: "In the event of a tie in scoring between judges, the judges will select the entry that received the highest number of positive reactions on their DEV post." Three reaction types matter: hearts (agreement), unicorns (impressive), and reading list (bookmarks).

To maximize reactions after publishing:
- Share the post on X/Twitter with a compelling one-liner and a screenshot of the Notion workspace. Tag @NotionHQ and @ThePracticalDev.
- Post in relevant communities: r/notion, r/programming, Hacker News (Show HN), relevant Discord servers.
- The blog post itself must be structured to earn all three reaction types: the personal hook earns hearts, the simulation demo earns unicorns, the architecture deep dive earns bookmarks.
- Respond to every comment quickly and substantively. Engagement in comments signals quality to judges who scan the post.

---

# Section 15: Dev.to Blog Post Structure

This is as important as the code. Judges read the post, watch the video, and maybe skim the repo. The post must be structured for maximum impact within a 5-7 minute reading time.

## Front Matter

```
---
title: "I Built an AI That Stress-Tests Your Arguments Before Any High-Stakes Conversation"
published: true
description: "Premise uses 3 MCP servers to build evidence-grounded preparation workspaces in Notion, with interactive adversarial simulation that reveals what your counterpart is really thinking."
tags: notionchallenge, devchallenge, mcp, ai
cover_image: [screenshot of the full Premise workspace in Notion, zoomed to show depth]
---
```

Title strategy: The title must make someone stop scrolling. "I Built an AI That Stress-Tests Your Arguments" is specific, surprising, and implies a demo worth seeing. Avoid generic titles like "My Notion MCP Integration" or "Building with Notion MCP."

## Post Structure

**Section 1: The Hook (3-4 paragraphs)**

Open with a personal story. Not "I built a tool." A specific moment where being unprepared for a conversation cost something real. Salary left on the table, a client pitch that fell apart under pushback, a performance review where you couldn't articulate your contributions. The reader must think "that's happened to me" within 30 seconds.

Then the pivot: "So I built a system that makes poor preparation impossible."

**Section 2: What I Built (1 paragraph + video embed)**

One-sentence description: "Premise builds evidence-grounded preparation workspaces in Notion for any high-stakes conversation: salary discussions, contract renewals, client pitches, performance reviews."

Embed the demo video immediately. Most readers will watch the video before reading further. If the video is compelling, they'll read the rest. If it's not, the text won't save it.

**Section 3: How It Works (walkthrough with screenshots)**

Walk through a single scenario (salary negotiation) step by step. Each step gets a screenshot of the Notion workspace at that stage. Show:

1. The intake analysis (screenshot of Position Analysis page)
2. The scenario database with decision tree (screenshot of database view)
3. The interactive simulation, 2-3 rounds (screenshot of Claude Desktop showing the relay format)
4. The counterparty inner state reveal (screenshot of the post-mortem, highlight the "they were ready to concede in round 3" moment)
5. The debrief with scenario verdicts (screenshot showing Outcome properties populated)

Each screenshot has a one-sentence caption explaining what the reader is seeing. Do not over-explain. Let the screenshots carry the weight.

**Section 4: Architecture (for the Technical Complexity score)**

The three-MCP diagram. Explain why three servers instead of one. Explain the session state pattern for interactive simulation. Explain the debrief feedback loop. This section earns the "bookmark" reaction from technical readers who want to reference the architecture later.

Keep it visual. Include the component diagram. Do not write walls of text about architecture; use the diagram and annotate it.

**Section 5: The Interesting Technical Problems (2-3 short subsections)**

Pick the 2-3 most interesting challenges and how they were solved:
- How the counterparty persona is calibrated from position analysis (not a generic "tough negotiator")
- How session state enables interactive multi-turn simulation over stateless MCP
- How debrief verdicts flow back into the scenario database

Each subsection is 3-5 sentences max. Technical readers want density, not fluff.

**Section 6: What's Next (short)**

Vision for where this goes: team preparation (multiple people prep for the same conversation with different roles), pattern library across conversations (which strategies work against which personality types), Slack integration for post-conversation logging. This shows judges you're thinking beyond the hackathon.

**Section 7: Try It / Links**

GitHub repo link. Setup instructions (or link to README). The `demo.sh` command for anyone who wants to see it work without API keys.

## Writing Rules for the Post

All rules from Section 1.10 apply. Additionally:
- No "In this blog post, I will..." openings. Start with the story.
- No "Let's dive in" or "Without further ado." Just start the next section.
- Vary paragraph length. Some one-sentence paragraphs for emphasis. Some longer ones for explanation.
- Use dev.to's built-in syntax highlighting for any code snippets.
- Liquid tags for embedded content: `{% embed https://youtube.com/... %}` for the video.
- No more than 2 code snippets in the entire post. This is a product demo, not a tutorial.
- End with a question that invites comments: "What conversation would you prepare for first?" Engagement in comments is the tiebreaker signal.

---

# Section 16: Quality Gates

Each phase has a specific, testable quality bar. Do not proceed to the next phase until the gate is passed. If a gate fails, fix it before moving forward. Shipping a broken phase to "make progress" creates compounding debt that kills polish time.

## Phase 1 Gate: Foundation

- All 7 tools invocable from MCP Inspector with correctly-shaped stub responses
- TypeScript compiles with zero errors and zero warnings
- Anthropic client wrapper makes a successful test call and returns parsed JSON
- Notion MCP server runs standalone and can create a test page

## Phase 2 Gate: Analysis + Position

- `premise-analyze` produces output that a real person would find useful for a real negotiation they have coming up. Test with YOUR OWN real upcoming conversation, not a hypothetical.
- `premise-position` correctly identifies at least one leverage point or risk factor that wasn't obvious from the input.
- The ZOPA estimate is internally consistent (their reservation point is on the correct side of yours).
- Position analysis for a salary negotiation, a freelance rate discussion, and a vendor contract each produce meaningfully different outputs. Not three variations of the same template.

## Phase 3 Gate: Scenarios

- Scenario branches are specific to the negotiation context, not generic advice. "They might counter with a lower number" is a failure. "They'll cite the Q3 budget freeze and propose a title bump instead of a raise" is a pass.
- The Notion database renders correctly with all properties populated and relation links working.
- At least one scenario branch makes you think "I hadn't considered that."

## Phase 4 Gate: Interactive Simulation

- Someone who did not build the system can run through a simulation and feel like they're negotiating with a person, not a chatbot.
- The counterparty inner state reveal in the post-mortem produces at least one "I didn't realize that was happening" moment.
- The tactical coaching notes add value beyond what's obvious from the dialogue. "They're being aggressive" is a failure. "They just shifted from budget constraints to timeline pressure, which means the budget objection was a bluff" is a pass.
- The simulation runs 4+ rounds without the counterparty breaking character or becoming repetitive.
- Session state serialization/deserialization works correctly across all rounds with no data loss.

## Phase 5 Gate: Debrief + Demo

- Full lifecycle test passes: intake through debrief through scenario database updates. Every Notion page exists and is correctly populated.
- `demo.sh` runs from a clean state and produces formatted output for every tool.
- Mock responses in `demo/mock-responses/` were captured from real API calls, not hand-written.
- The demo script in `demo/demo-script.md` has been rehearsed at least twice.

## Phase 6 Gate: Submission

- Video is under 5 minutes and shows the complete arc from empty workspace to populated Premise workspace.
- The counterparty inner state reveal moment is clearly visible in the video.
- Blog post has been read aloud to check for awkward phrasing. If any sentence sounds like it was written by an AI, rewrite it.
- All screenshots in the blog post show real Notion workspaces, not mockups.
- The GitHub repo README has setup instructions that actually work when followed from scratch.
- `demo.sh` runs successfully one final time after all changes are committed.

---

# Section 17: Polish Checklist (Final 72 Hours)

This checklist runs after all features are complete and all phase gates have passed. It covers the delta between "works" and "wins."

## Code Polish
- [ ] Remove all `console.log` statements that aren't part of structured logging
- [ ] Remove all TODO comments (either do them or delete them)
- [ ] Run `tsc --noEmit` one final time, zero errors zero warnings
- [ ] Every error message is actionable (tells what went wrong, where, what to do)
- [ ] README setup instructions tested from a clean clone on a different machine if possible

## Simulation Polish
- [ ] Run 3 full simulations with different negotiation types and counterparty styles
- [ ] Verify coaching notes escalate in intensity across rounds (light early, urgent late)
- [ ] Verify counterparty doesn't repeat the same objection twice in one simulation
- [ ] Verify the inner state reveal contains at least one non-obvious insight per simulation
- [ ] Verify termination conditions all work: deal reached, breakdown, max rounds, user quit

## Notion Workspace Polish
- [ ] Every page has clean formatting (no raw JSON visible to user, no broken markdown)
- [ ] Scenario database sorts and filters correctly (by probability, by status, by outcome)
- [ ] Relation links between parent/child scenarios work correctly
- [ ] Debrief updates are visible: Outcome properties set, comments added, parent page banner updated
- [ ] The workspace looks good in screenshots (no truncated text, no empty fields, clean layout)

## Blog Post Polish
- [ ] Title tested: would you click on this if you saw it in a feed?
- [ ] First two lines work as a standalone hook (dev.to truncates at ~210 chars on mobile)
- [ ] Video loads and plays correctly when embedded
- [ ] All screenshots are high-resolution and legible at blog width
- [ ] No AI vocabulary from the banned list (Section 1.10) appears anywhere
- [ ] No em dashes anywhere in the post
- [ ] Post read aloud start to finish. Every sentence that sounds robotic is rewritten.
- [ ] Closing question invites genuine responses, not performative engagement
- [ ] Tags are exactly: notionchallenge, devchallenge, mcp, ai (required for valid submission)

## Video Polish
- [ ] Opens with the empty workspace, closes with the full workspace (visual transformation)
- [ ] No API latency pauses longer than 2 seconds visible (edit them out)
- [ ] Font size in Claude Desktop is large enough to read at blog embed size
- [ ] Captions on key moments (especially the inner state reveal)
- [ ] No personal data visible in any Notion workspace shown
- [ ] Video title and description are compelling (judges may see them on YouTube)

---

# Section 18: Competitive Monitoring

Check the dev.to challenge page weekly to track new submissions:
https://dev.to/challenges/notion-2026-03-04

For each new submission, assess:
- Does it operate in the same domain (conversation preparation, negotiation, argumentation)?
- Does it match or exceed the technical complexity (multi-MCP, custom server, interactive simulation)?
- Does the blog post have strong engagement (reactions, comments)?

If a submission appears that's genuinely competitive:
- Identify what they do better and see if it can be incorporated before submission
- Identify what they're missing that Premise has, and emphasize that gap in the blog post
- If someone builds in the exact same space, the differentiator is the interactive simulation and the debrief feedback loop. No one else will build both.

As of March 10, 2026: zero submissions in the preparation/argumentation domain. The field is task trackers, dashboards, agent control planes, and content generators.

---

# Section 19: Win Conditions

The submission is optimized to score highest on all three criteria simultaneously.

**Originality & Creativity (Criterion #1, highest weight):**
- Unoccupied domain: no other entry uses Notion for high-stakes conversation preparation
- Interactive adversarial simulation: no other entry has real-time practice with AI counterparty
- Debrief feedback loop: no other entry retroactively updates predictions with outcomes
- The concept itself ("build your premise") expands what people imagine Notion can do

**Technical Complexity (Criterion #2):**
- Three-MCP orchestration (Notion + Gmail + custom Premise server)
- 7-tool custom MCP server with distinct input/output schemas
- Client-side session state pattern for interactive multi-turn simulation over stateless MCP
- Structured counterparty persona with hidden metadata for tactical coaching
- Debrief-to-database feedback loop with per-scenario verdict updates

**Practical Implementation (Criterion #3):**
- Everyone has high-stakes conversations: salary, contracts, pitches, reviews
- The dev.to audience specifically negotiates salary (immediate relatability)
- The system actually works end-to-end (demo.sh proves it, video shows it)
- The Notion workspace is genuinely useful as a preparation tool

The blog post structure in Section 15 maps each section to a criterion: the hook and concept earn Originality, the architecture and technical problems earn Technical Complexity, the walkthrough and "try it" section earn Practical Implementation.

---

# Section 20: Build Schedule (Day-by-Day)

Optimized for late submission with maximum polish.

## Week 1: March 10-16 (Core Build)

**Days 1-2 (March 10-11):** Foundation + Analysis + Position
- Project scaffold, all 7 tool stubs registered and testable
- `premise-analyze` and `premise-position` fully implemented
- Phase 1 and Phase 2 gates passed

**Days 3-4 (March 12-13):** Scenarios + Notion Integration
- `premise-scenarios` implemented
- Full orchestrator workflow tested: analyze, position, scenarios, Notion workspace creation
- Phase 3 gate passed

**Days 5-7 (March 14-16):** Interactive Simulation
- `premise-sim-start`, `premise-sim-round`, `premise-sim-end` implemented
- Counterparty persona prompt iterated until Phase 4 gate passes
- Orchestrator relay pattern tested in Claude Desktop

## Week 2: March 17-23 (Complete + Polish)

**Days 8-9 (March 17-18):** Debrief + Full Lifecycle
- `premise-debrief` with scenario verdicts implemented
- Full lifecycle test: intake through debrief through Notion updates
- Phase 5 gate passed (minus demo assets)

**Days 10-11 (March 19-20):** Demo Infrastructure
- Mock mode implemented
- Real API responses captured to `demo/mock-responses/`
- `demo.sh` built and verified
- Gmail integration attempted if ahead of schedule

**Days 12-14 (March 21-23):** Polish Round 1
- Run full simulation with 3 different negotiation types
- Tune counterparty persona, coaching notes, post-mortem quality
- Fix every rough edge found during testing
- Start drafting blog post structure and hook

## Week 3: March 24-28 (Ship)

**Day 15 (March 24):** Video Recording
- Set up clean Notion workspace
- Rehearse demo script twice
- Record video (expect 2-3 takes)
- Edit video

**Day 16 (March 25):** Blog Post Draft
- Write complete first draft following Section 15 structure
- Capture all screenshots from the demo workspace
- Embed video

**Day 17 (March 26):** Blog Post Polish
- Read aloud, rewrite anything that sounds robotic
- AI tells review (Section 1.10 banned vocabulary check)
- Second pair of eyes on the post if possible

**Day 18 (March 27):** Final Polish
- Run Section 17 checklist completely
- `demo.sh` final verification
- README final verification from clean clone
- Competitive field final check

**Day 19 (March 28, evening):** Submit
- Publish dev.to post
- Share on social channels
- Respond to early comments
