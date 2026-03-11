# Premise Architecture

## System Overview

Premise coordinates three MCP servers through a single orchestrating LLM (Claude Desktop or Claude Code):

```
┌─────────────────────────────────────────────────────────┐
│                   Claude Desktop                         │
│                   (Orchestrator)                          │
│                                                          │
│  Sequences tool calls, manages workflow, relays          │
│  simulation dialogue, handles user interaction           │
└───────┬──────────────────┬──────────────────┬───────────┘
        │                  │                  │
   MCP stdio          MCP stdio          MCP stdio
        │                  │                  │
┌───────▼───────┐  ┌───────▼───────┐  ┌───────▼───────┐
│  Premise MCP  │  │  Notion MCP   │  │  Gmail MCP    │
│   (Custom)    │  │  (Official)   │  │  (Optional)   │
│               │  │               │  │               │
│ 7 tools:      │  │ Page CRUD     │  │ Email search  │
│ - analyze     │  │ Database ops  │  │ Email read    │
│ - position    │  │ Comments      │  │               │
│ - scenarios   │  │ Search        │  │               │
│ - sim-start   │  │               │  │               │
│ - sim-round   │  │               │  │               │
│ - sim-end     │  │               │  │               │
│ - debrief     │  │               │  │               │
│               │  │               │  │               │
│ Calls         │  │               │  │               │
│ Anthropic API │  │               │  │               │
│ internally    │  │               │  │               │
└───────────────┘  └───────────────┘  └───────────────┘
```

## Data Flow

1. User describes negotiation to Claude
2. Claude calls `premise-analyze`, gets structured metadata
3. Claude optionally searches Gmail for counterparty emails
4. Claude calls `premise-position` with analysis + targets
5. Claude calls Notion MCP to create the preparation workspace
6. Claude calls `premise-scenarios`, populates Scenario Database via Notion MCP
7. User starts simulation; Claude calls `premise-sim-start`
8. Claude relays responses in dialogue format with coaching. Loop with `premise-sim-round`.
9. On termination, Claude calls `premise-sim-end` for post-mortem
10. Claude writes transcript and reveal to Notion
11. After the real negotiation, Claude calls `premise-debrief`
12. Claude updates each scenario in Notion with verdict

## Session State Pattern

The simulation is interactive and multi-turn, but MCP tools are stateless request/response. The solution: client-side session state.

```
sim-start → returns session_state blob (opaque to orchestrator)
     ↓
orchestrator carries blob unchanged
     ↓
sim-round(session_state, user_response) → updated session_state blob
     ↓
orchestrator carries updated blob
     ↓
sim-round(session_state, user_response) → updated session_state blob
     ↓
... (repeat until termination)
     ↓
sim-end(session_state) → full post-mortem
```

The blob contains: full Anthropic conversation history, counterparty persona config, inner state records per round, round counter. Serialized as JSON, base64 encoded, wrapped in a versioned envelope. Expected size: 4-8KB for 8 rounds.

## Separation of Concerns

Premise focuses on negotiation intelligence and never needs Notion credentials. Notion MCP handles workspace operations with proper pagination and rate limiting. Gmail MCP handles email access with OAuth. The orchestrator sequences everything.

This separation means:
- Each server has a single responsibility
- Credentials are isolated (Premise only needs Anthropic, Notion MCP only needs Notion)
- The Notion MCP handles schema details better than anything custom
- Technical complexity demonstrates multi-MCP orchestration
