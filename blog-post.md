---
title: "I Built an AI That Stress-Tests Your Arguments Before Any High-Stakes Conversation"
published: true
description: "Premise uses 3 MCP servers to build evidence-grounded preparation workspaces in Notion, with interactive adversarial simulation that reveals what your counterpart is really thinking."
tags: notionchallenge, devchallenge, mcp, ai
cover_image: ./demo/notion-screenshots/full-workspace.png
---

Two years ago I walked into a salary review and froze.

I had the data. I knew what my peers were making. I'd even rehearsed my opening line in the shower that morning. But when my manager pushed back with "budget constraints" and "market adjustments," I folded in under three minutes. I walked out at the same salary I walked in with, and worse, I'd tipped my hand about the competing offer without getting anything in return.

The frustrating part wasn't the outcome. It was knowing I could have done better if I'd prepared for what she was actually going to say instead of what I hoped she'd say.

So I built a system that makes that kind of failure impossible.

## What Premise Does

Premise builds evidence-grounded preparation workspaces in Notion for any high-stakes conversation: salary discussions, contract renewals, client pitches, performance reviews, vendor deals.

You describe your situation in plain language. The system analyzes both sides, maps out position ranges and leverage, generates a decision tree of what the other person might say, then lets you practice against an AI counterparty calibrated to your specific situation. After your real conversation, it compares what happened to what it predicted.

Everything lives in Notion.

{% embed VIDEO_URL_HERE %}

## How It Works

Here's what Premise builds for a salary negotiation, step by step.

### 1. Intake Analysis

You tell Claude about your situation: role, tenure, accomplishments, what you want, your walk-away point, and anything you know about the other side. Premise analyzes it into structured metadata: who has power, what's at stake, where the anxiety is.

![Position Analysis page in Notion showing your position, their estimated position, and ZOPA analysis](./demo/notion-screenshots/position-analysis.png)

The position map shows you things you hadn't considered. In this case, Premise flagged that the $2M cost savings from a migration project gave me replacement-cost leverage I wasn't planning to use. It also estimated the other side's likely reservation point and identified tradeable issues (equity, title, review timeline) I could offer in exchange for salary.

### 2. Scenario Decision Tree

Premise generates a tree of what the counterparty might say, with recommended responses for each branch. Not generic advice like "they might counter lower." Specific, contextualized moves: "They'll cite the Q3 budget freeze and propose a title bump instead of a raise."

![Scenario database in Notion showing scenarios with probability, emotional temperature, and recommended responses](./demo/notion-screenshots/scenario-database.png)

Each scenario is a row in a Notion database with properties for probability, emotional temperature, recommended response, rationale, and tradeoffs. Parent-child relations link the branches into a navigable tree.

### 3. Interactive Simulation

This is where it gets interesting. Premise runs an adversarial simulation where you practice your negotiation against an AI counterparty built from the position analysis. Not a generic chatbot. A persona calibrated with the other side's estimated position, BATNA, constraints, and personality style.

You open with your pitch. They push back. A coaching note appears after each exchange with observations about what just happened tactically. The coaching escalates: light observations early, active pattern-spotting in the middle, urgent flags near the end if you're drifting toward your walk-away point without realizing it.

![Claude Desktop showing the simulation relay format with counterparty dialogue and coaching notes](./demo/notion-screenshots/simulation-rounds.png)

### 4. The Reveal

After the simulation ends, the post-mortem shows you what the counterparty was actually thinking in each round, internal thoughts that were hidden during the practice session.

Round 1: "They're starting exactly at my reservation point ceiling, that's concerning."

Round 3: "The replacement cost argument landed. I need to get VP approval fast before they take the competing offer."

Round 4: "The added responsibilities give me justification to push this through. This feels like a deal I can get approved."

This is the moment. Seeing that your opponent was ready to concede two rounds before you noticed, or that something you said landed harder than you thought, changes how you walk into the real conversation.

![Post-mortem showing counterparty inner state reveal per round](./demo/notion-screenshots/inner-state-reveal.png)

### 5. Debrief

After your real conversation, you come back and tell Premise what happened. It compares the actual outcome against its predictions: which scenarios played out, how accurate the position estimates were, what the simulation got right and wrong. It updates each scenario in the Notion database with a verdict (happened, partially happened, did not happen, happened differently) and adds notes.

![Scenario database with Outcome column populated after debrief](./demo/notion-screenshots/debrief-verdicts.png)

The workspace becomes a historical record: prediction vs. reality. Over multiple conversations, patterns emerge about which strategies work in which contexts.

## Architecture

Premise coordinates three MCP servers through Claude as the orchestrator:

```
┌──────────────────────────────────────────────────┐
│                Claude Desktop                     │
│              (Orchestrator LLM)                   │
│                                                   │
│  Sequences tool calls, relays simulation          │
│  dialogue, manages Notion workspace               │
└───────┬──────────────────┬──────────────┬────────┘
        │                  │              │
   MCP stdio          MCP stdio      MCP stdio
        │                  │              │
┌───────▼───────┐  ┌───────▼──────┐  ┌───▼────────┐
│  Premise MCP  │  │  Notion MCP  │  │ Gmail MCP  │
│   (Custom)    │  │  (Official)  │  │ (Optional) │
│               │  │              │  │            │
│ 7 tools for   │  │ Pages, DBs   │  │ Email      │
│ negotiation   │  │ Comments     │  │ context    │
│ intelligence  │  │ Search       │  │            │
│               │  │              │  │            │
│ Anthropic API │  │ Notion API   │  │ Gmail API  │
└───────────────┘  └──────────────┘  └────────────┘
```

Premise never touches Notion. It returns structured JSON; Claude takes that data and creates Notion pages through the official Notion MCP. This separation means Premise focuses purely on negotiation logic, the Notion MCP handles pagination and rate limits properly, and credentials stay isolated.

## The Interesting Technical Problems

### Counterparty Persona Calibration

The simulation counterparty is not a generic "tough negotiator." Premise builds the persona from the position analysis: their estimated target, reservation point, BATNA, constraints, and incentives. The counterparty's system prompt includes hidden metadata instructions that produce private thoughts, concession readiness levels, and probing intent alongside each dialogue turn. These hidden signals feed the coaching notes without being visible during the practice session.

### Interactive Simulation Over Stateless MCP

MCP tools are stateless request/response, but a simulation is multi-turn and conversational. The solution: client-side session state. `premise-sim-start` returns an opaque blob containing the full Anthropic conversation history, persona config, and round counter. The orchestrator carries this blob unchanged and passes it back on each `premise-sim-round` call. Same pattern as a JWT: the server encodes it, the client carries it, the server decodes it. Expected size is 4-8KB for an 8-round simulation.

### Debrief Feedback Loop

The debrief does not just summarize what happened. It maps the real outcome back to the scenario database: which predictions came true, which didn't, and what happened differently than expected. The orchestrator uses Notion MCP to update each scenario entry's Outcome property and adds a comment with debrief notes. This closes a loop that turns the preparation workspace from a planning tool into a learning record.

## What's Next

Team preparation: multiple people prepare for the same conversation with different roles. A sales team where one person plays the buyer during practice, with all the same hidden state and coaching infrastructure.

A pattern library across conversations: which strategies work against which personality types, built from the debrief data across multiple negotiations.

Slack integration for post-conversation logging, so debriefs happen in the 10 minutes after the meeting while memory is fresh, not days later when the details have faded.

## Try It

The code is open source: [github.com/moonrunnerkc/premise](https://github.com/moonrunnerkc/premise)

To see it work without any API keys:

```bash
git clone git@github.com:moonrunnerkc/premise.git
cd premise && npm install && npm run build
bash scripts/demo.sh
```

This runs all 7 tools against pre-recorded responses from a real salary negotiation scenario. To use it with Claude Desktop and Notion, follow the setup instructions in the README.

What conversation would you prepare for first?
