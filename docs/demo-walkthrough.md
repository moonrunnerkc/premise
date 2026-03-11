# Demo Walkthrough: Step-by-Step with Expected Outputs

This document walks through the `demo.sh` offline demo and a live API session, showing what each tool produces at every step. All outputs below were captured from real Anthropic API calls on a salary negotiation scenario.

## Scenario

**Senior Software Engineer** at a fintech company (Series C, ~400 employees).
- Current salary: $175K
- Target: $195K + equity refresh
- Walk-away: $185K
- BATNA: $210K competing offer from a FAANG company
- Manager: Sarah Chen (Engineering Manager)
- Key leverage: Led payment system migration saving $2M/year

---

## Step 1: `premise-analyze`

**Input:** Free-text negotiation description (the scenario above).

**Output structure:**

| Field | Value |
|-------|-------|
| **Parties** | You (Senior Software Engineer, medium power) and Sarah Chen (Engineering Manager, medium power) |
| **Your upside** | Salary increase to $195-210K range, staying with preferred team |
| **Your downside** | Remaining at below-market $175K, resentment, or forced to take external offer |
| **Their upside** | Retaining high-performing engineer at reasonable cost increase |
| **Their downside** | Losing proven performer, disrupting team, expensive replacement |
| **Time pressure** | Medium (next Thursday, likely 2-4 weeks for decision) |
| **Power balance** | Roughly balanced: strong external alternative vs. preferred internal stay |
| **Information asymmetry** | You know exact offer details and peer salary data; they know budget constraints |

**Emotional factors identified:**
- Your anxiety: Being perceived as disloyal, manager lacking budget authority, damaging team relationship
- Their anxiety: Losing high performer, setting precedent for other engineers, budget constraints despite funding

---

## Step 2: `premise-position`

**Inputs:** Analysis from Step 1, target $195K, minimum $185K, BATNA of $210K FAANG offer.

**Key outputs:**

### ZOPA (Zone of Possible Agreement)
- Exists: **Yes**
- Estimated range: **$185K-$195K base** with equity as additional variable
- Confidence: **High**

### Leverage Points

| Factor | Favors | How to use it |
|--------|--------|---------------|
| Peer departure precedent | You | Reference specific peer salaries ($195-205K) as market validation |
| Replacement cost analysis | You | Highlight that external hires cost $190-200K plus 3-6 months productivity loss |
| Timing and budget cycles | Them | They may push for delayed effective date or equity-heavy package |

### Tradeable Issues
The position map identifies issues where priorities differ between parties: base salary, equity grants, signing bonus, title/scope changes, review timeline. These create room for creative package structures.

---

## Step 3: `premise-scenarios`

**Inputs:** Analysis + positions from Steps 1-2, depth 2.

**Output:** 8 scenario branches organized as a decision tree.

### Branch Overview

| ID | Counterparty Move | Probability |
|----|-------------------|-------------|
| branch-1 | Acknowledges value, counters with structured package below $195K | High |
| branch-1a | Pushes back on budget flexibility, offers equity/timeline trade | High |
| branch-1b | Raises internal equity concern about setting precedent | Medium |
| branch-2 | Questions commitment: "Are you actually planning to leave?" | Medium |
| branch-2a | Believes you want to stay, becomes more direct about constraints | High |
| branch-3 | Cites 15% over-budget on engineering headcount | Medium |
| branch-3a | Offers VP meeting but warns VP is rigid on base salary | Medium |
| branch-4 | Quick acceptance: "You're right, we can't afford to lose you" | Low |

Each branch includes recommended responses with rationale and tradeoffs, plus an emotional temperature rating.

---

## Step 4: `premise-sim-start`

**Inputs:** Analysis + positions, counterparty style "analytical", opening statement about the $195K target.

**Counterparty response (Sarah, Round 1):**

> "I appreciate you bringing this up directly, and I definitely want to acknowledge the significant impact of the payment system migration, that $2M in annual savings is substantial. Before we dive into specific numbers, I'd like to understand your methodology for arriving at $195K. What market data sources are you using, and how are you benchmarking against comparable roles and experience levels?"

**Hidden metadata (not shown during simulation):**
- Private thought: "They're starting exactly at my reservation point ceiling, that's concerning."
- Concession readiness: Considering
- Probing intent: Need to understand their research methodology
- Emotional state: Alert and analytical

**Coaching note:** Analytical opening from Sarah. She's validating your data before committing to anything.

---

## Step 5: `premise-sim-round` (x3 rounds)

The user provides responses across 3 additional rounds. Each round returns:
- In-character counterparty dialogue
- Hidden metadata with updated private thoughts and concession readiness
- Tactical coaching note

Concession readiness progression across rounds: **firm → considering → considering → ready**

This progression is invisible during the simulation but reveals itself in the post-mortem.

---

## Step 6: `premise-sim-end`

**Post-mortem analysis after 4 rounds:**

### Strengths
1. Strong opening with concrete value proposition ($2M savings)
2. Excellent use of multiple data points (market research, departing teammates, competing offer)
3. Smart pivot to replacement cost analysis when sensing resistance
4. Tactical concession from $195K to $192K while adding mentoring commitment

### Weaknesses
1. Opened exactly at counterparty's reservation point without leaving negotiation room
2. Failed to provide specific methodology details when directly asked
3. Missed the counterparty's clear signal of readiness in Round 3

### Missed Opportunities
- **Round 3:** Counterparty was "ready" to make concessions and found the replacement cost argument compelling, but you didn't capitalize by proposing specific next steps
- **Round 2:** When counterparty questioned individual contribution vs. team effort on the $2M savings, could have prepared specific role examples

### Inner State Reveal

This is the highest-value moment. The post-mortem reveals what Sarah was thinking at each round:

- **Round 1:** "They're starting exactly at my reservation point ceiling, that's concerning."
- **Round 2:** Considering, probing for weaknesses in research
- **Round 3:** **Ready to concede**, found replacement cost argument compelling
- **Round 4:** Evaluating the $192K + mentoring trade

The key insight: **Sarah was ready to make concessions in Round 3, but you kept building your case instead of proposing specific terms.** Recognizing and acting on concession signals is the primary practice area.

### Retry Recommendation
"Learning to recognize and capitalize on counterparty concession signals. When they validate your arguments or show readiness, immediately propose concrete next steps rather than continuing to build your case."

---

## Step 7: `premise-debrief`

**Input (after real negotiation):** Free-text outcome description.

**Key outputs:**

| Metric | Score |
|--------|-------|
| Position accuracy | How well the estimated positions matched reality |
| Scenario accuracy | How many predicted scenarios actually occurred |
| Simulation accuracy | How realistic the practice session was |
| Effectiveness score | Overall preparation helpfulness (7/10 in test run) |

### Lessons Learned
Each lesson includes evidence from the real negotiation and guidance for future conversations.

### Scenario Verdicts
Each scenario from Step 3 gets a verdict:
- **Happened**: The counterparty move occurred as predicted
- **Partially happened**: Similar but with differences
- **Did not happen**: Scenario was not triggered
- **Happened differently**: The move occurred but played out differently than predicted

These verdicts are written back to the Notion Scenario Database, closing the feedback loop between preparation and reality.

---

## Running the Offline Demo

```bash
bash scripts/demo.sh
```

This exercises all 7 tools sequentially using the mock responses captured above. No API key required. Output is formatted with tool names and truncated JSON for readability.

## Running Against Live API

```bash
# Full pipeline test (requires ANTHROPIC_API_KEY in .env)
npx tsx scripts/test-live-simulation.ts
```

Expect ~2-3 minutes total (9 API calls). Each call takes 10-30 seconds depending on complexity.
