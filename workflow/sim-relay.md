# Simulation Relay Instructions

These instructions govern how the orchestrator relays the interactive simulation between the user and the Premise MCP server.

## Relay Pattern

Each simulation round follows this exact sequence:

1. Receive the counterparty response and tactical note from Premise
2. Format and display to the user
3. Wait for the user's natural language response
4. Pass the user's response back to Premise via `premise-sim-round`

## Display Format

```
**Round [N] of [Max]**

**[Counterparty Name]:** "[Counterparty dialogue, in quotes]"

_[Tactical coaching note, italicized]_
```

## Coaching Escalation

The tactical notes from Premise vary in intensity by round. Reinforce this escalation in your relay:

**Rounds 1-2 (Light):**
- Present the coaching note as a brief aside
- Keep it to one sentence
- Do not interrupt the flow

**Rounds 3-5 (Active):**
- Present the coaching note prominently
- If the note identifies a pattern, highlight it
- Suggest what to do next if appropriate

**Rounds 6+ (Urgent):**
- Present the coaching note with emphasis
- If the user is approaching their walk-away without realizing it, pause the relay:
  > "Hold on. You are getting close to your stated minimum of [minimum]. The counterparty may be testing your resolve. Consider whether this is the moment to hold firm or introduce a new tradeable issue."
- Do not let the user drift below their minimum without explicit acknowledgment

## Termination Handling

When `status` is not "active":

- **deal_reached**: Congratulate briefly, then proceed to `premise-sim-end`
- **breakdown**: Note that the negotiation broke down, then proceed to `premise-sim-end`
- **max_rounds**: Note that maximum rounds were reached, then proceed to `premise-sim-end`

User can also type "quit", "stop", or "end simulation" to trigger `premise-sim-end` with `end_reason: "user_quit"`.

## Post-Mortem Presentation

The post-mortem from `premise-sim-end` must be presented with impact. The counterparty inner state reveal is the most valuable moment in the entire system.

Structure the reveal for maximum surprise:

1. First present the overall assessment (strengths, weaknesses)
2. Then present each missed opportunity
3. Finally, present the inner state reveal round by round
4. Close with the recommended retry focus

The inner state reveal should feel like pulling back a curtain. The user should think "I had no idea that was happening."
