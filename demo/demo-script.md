# Demo Script: Premise Walkthrough

This script covers the exact prompts to type during a video walkthrough or Claude Desktop demo. It follows the full lifecycle from empty workspace to populated Notion pages with debrief.

## Prerequisites

1. Claude Desktop running with both Premise and Notion MCP servers configured
2. A clean Notion workspace with a parent page ready (or let Premise create one)
3. The workflow template from `workflow/premise-workflow.md` pasted into Claude Desktop project instructions

## Phase 1: Intake

### Prompt 1 (Negotiation Description)

```
I need to prepare for a salary negotiation. Here's my situation:

I'm a senior software engineer at a mid-size fintech company (Series C, ~400 employees). I've been here 2.5 years, promoted from mid-level to senior 8 months ago. My current base is $175K.

I'm meeting with my manager Sarah Chen next Thursday for our annual review. I led the migration of our payment processing system from a legacy monolith to microservices over the last year, which reduced transaction failures by 40% and saved the company roughly $2M annually in operational costs.

I have a competing offer from a FAANG company at $210K base + RSUs, but I'd prefer to stay because I like my team and the company trajectory. Two of my peers with similar experience recently left for $195-205K packages. The company just closed a Series C at $1.2B valuation and hired 80 people in Q4.

My target is $195K base with an equity refresh. My walk-away point is $185K. I'd rather stay here than take the FAANG offer, but I need to feel valued.
```

**Expected behavior:** Claude calls `premise-analyze`, presents a summary of parties, stakes, timeline, power dynamics, and emotional factors. Asks for confirmation before proceeding.

### Response to Confirmation

```
Yes, that looks right. Let's continue to position mapping.
```

## Phase 2: Position Mapping

**Expected behavior:** Claude calls `premise-position` with your target ($195K) and minimum ($185K). Presents the full position map: your position, their estimated position, ZOPA, leverage points, risk factors, and tradeable issues. Flags any concerns.

### Response to Position Map

```
This is helpful. I hadn't considered the retention cost angle. Let's build the scenario tree.
```

## Phase 3: Scenario Generation + Notion Workspace

**Expected behavior:** Claude calls `premise-scenarios`, then uses Notion MCP to:
1. Create the parent page "Premise: Salary Review with Sarah Chen"
2. Create the Position Analysis child page with formatted content
3. Create the Scenario Database with all properties
4. Populate scenario entries with relations

### Key Moment (Video)

Show the Notion workspace appearing in real time. Switch to Notion briefly to show the page hierarchy and the scenario database with its properties.

### Response After Workspace Creation

```
Perfect. Let's practice with a simulation. Make Sarah analytical - she's data-driven.
```

## Phase 4: Interactive Simulation

### Opening Line (Prompt)

```
Sarah, thanks for making time for this. I wanted to talk about my compensation. Over the past year, I led the payment system migration that's saving us $2M annually, and I feel my current salary of $175K doesn't reflect my contributions or the market. I'd like to discuss bringing my compensation in line with $195K.
```

**Expected behavior:** Claude calls `premise-sim-start`, then relays Sarah's response in dialogue format with a coaching note.

### Round 2 Response

```
I've based the $195-210K range on Levels.fyi data for senior engineers at Series C fintech companies, cross-referenced with Glassdoor and Blind. Two teammates who left in the past 6 months confirmed offers in that range. As for the competing offer, I can share the offer letter if that would help. The $2M figure comes directly from our Q3 operations review - you can verify it with the infrastructure team's cost analysis report.
```

### Round 3 Response

```
I understand budget constraints are real, and I'm not asking you to break the bank. Replacing me would cost 6-9 months of lost productivity plus recruiting fees easily exceeding $150K. I'm asking for $195K base, which is below my competing offer. I'm open to creative structures: a signing bonus, accelerated equity vesting, or a guaranteed review in 6 months. The key thing is I want to feel valued here.
```

### Round 4 Response

```
Here's what I'm thinking: $192K base effective this quarter, plus an additional equity grant to close the gap with my competing offer. In return, I'll commit to leading the API platform initiative and mentoring two junior engineers on infrastructure. Can we make that work?
```

**Expected behavior:** After rounds complete (or when deal is reached/breakdown occurs), Claude calls `premise-sim-end` and presents the post-mortem.

### Key Moment (Video): Inner State Reveal

The post-mortem includes the counterparty's private thoughts from each round. This is the money shot. "Sarah was ready to concede in Round 3 but you didn't push hard enough on the specific number." Capture this moment clearly.

### Response After Simulation

```
That was eye-opening. I need to work on closing when I sense readiness. Save the transcript and post-mortem to Notion.
```

## Phase 5: Debrief (After Real Negotiation)

This phase happens after the actual conversation. Return to Claude Desktop days later.

### Debrief Prompt

```
The negotiation happened. Here's how it went:

I got $192K base with 2000 additional RSUs vesting over 2 years. Sarah also agreed to a guaranteed comp review in 6 months. The FAANG offer carried more weight than I expected - she said it was the main factor in getting VP approval quickly.

Surprises: Sarah was more collaborative than the simulation predicted. She volunteered to talk to the VP before I even asked. The budget constraint was real but less rigid than we estimated.

Sarah's behavior: Analytical throughout, lots of questions about my data sources. But once she was satisfied, she moved quickly. Very different from the slow, cautious approach in the simulation.
```

**Expected behavior:** Claude calls `premise-debrief`, then:
1. Creates a Debrief page in Notion
2. Updates each scenario database entry with verdict (happened/didn't happen)
3. Adds comments with debrief notes
4. Updates the parent page with a completion banner

### Key Moment (Video): Completed Workspace

Show the final Notion workspace with all pages populated. Switch to the Scenario Database and show the Outcome column now filled in with verdicts. This closes the feedback loop.

## Demo Timing Guide

| Section | Approximate Duration |
|---------|---------------------|
| Phase 1: Intake | 30 seconds |
| Phase 2: Position | 30 seconds |
| Phase 3: Scenarios + Notion | 60 seconds |
| Phase 4: Simulation (4 rounds) | 90 seconds |
| Phase 4: Post-mortem reveal | 30 seconds |
| Phase 5: Debrief + updates | 30 seconds |
| **Total** | **~4.5 minutes** |

## Editing Notes

- Cut any API latency pauses longer than 2 seconds
- Add captions on the inner state reveal moment
- Show the empty Notion workspace at the start, the full workspace at the end
- Ensure font sizes are readable at blog embed resolution
