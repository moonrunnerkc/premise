# Premise

Build your premise before any high-stakes conversation.

Premise is an MCP server that builds evidence-grounded preparation workspaces in Notion for salary discussions, contract renewals, client pitches, performance reviews, and vendor deals. It provides structured position analysis, scenario decision trees, interactive adversarial simulation with a coached AI counterparty, and post-negotiation outcome tracking.

**Status:** All 7 tools implemented and validated against the live Anthropic API across 3 negotiation types (salary, freelance, vendor). Mock responses captured from real API calls. 55 tests passing. Full simulation pipeline tested end-to-end.

## Quick Start

```bash
# Clone and install
git clone https://github.com/your-username/premise.git
cd premise
npm install

# Set up environment
cp .env.example .env
# Edit .env with your ANTHROPIC_API_KEY

# Build and run
npm run build
npm start
```

### Run the demo (no API key needed)

```bash
bash scripts/demo.sh
```

This exercises all 7 tools using pre-recorded responses from a salary negotiation scenario.

## Architecture

Three MCP servers coordinate through Claude Desktop (or Claude Code) as orchestrator:

1. **Premise MCP** (this repo): 7 tools providing negotiation intelligence. Calls the Anthropic API internally.
2. **Notion MCP** (official `@notionhq/notion-mcp-server`): Creates and manages the Notion preparation workspace.
3. **Gmail MCP** (optional): Reads email history for counterparty context.

## Tools

| Tool | Purpose |
|------|---------|
| `premise-analyze` | Parse negotiation context into structured metadata |
| `premise-position` | Map both sides' positions, ZOPA, leverage, risks |
| `premise-scenarios` | Generate decision tree of counterparty moves |
| `premise-sim-start` | Initialize interactive adversarial simulation |
| `premise-sim-round` | Process one round of simulation |
| `premise-sim-end` | Generate post-mortem with inner state reveal |
| `premise-debrief` | Post-negotiation retrospective with scenario verdicts |

## Claude Desktop Configuration

```json
{
  "mcpServers": {
    "premise": {
      "command": "node",
      "args": ["/path/to/premise/dist/index.js"],
      "env": {
        "ANTHROPIC_API_KEY": "sk-ant-..."
      }
    },
    "notion": {
      "command": "npx",
      "args": ["-y", "@notionhq/notion-mcp-server"],
      "env": {
        "NOTION_TOKEN": "ntn_..."
      }
    }
  }
}
```

## Development

```bash
npm run build        # Compile TypeScript
npm run dev          # Watch mode
npm run typecheck    # Type check without emitting
npm test             # Run tests
bash scripts/demo.sh # Run demo with mock responses
```

### Live API Testing

Requires `ANTHROPIC_API_KEY` in `.env`:

```bash
# Test analysis, position, and scenarios across 3 negotiation types
npx tsx scripts/test-live-api.ts

# Test full simulation pipeline (analyze → position → sim-start → rounds → sim-end → debrief)
npx tsx scripts/test-live-simulation.ts
```

To capture fresh mock responses from real API calls:

```bash
PREMISE_CAPTURE_DIR=demo/mock-responses npx tsx scripts/test-live-simulation.ts
```

## Project Structure

```
src/
├── tools/           # One file per MCP tool (7 handlers)
├── prompts/         # Versioned prompt templates
├── types/           # Zod schemas and TypeScript types
├── lib/             # Anthropic client, session codec, formatting
├── server.ts        # McpServer with tool registration
└── index.ts         # Entry point with stdio transport

workflow/            # Orchestrator prompt templates for Claude Desktop
demo/mock-responses/ # Pre-recorded API responses for offline demo
test/                # Unit tests (tools, lib) and integration tests
```

## License

MIT
