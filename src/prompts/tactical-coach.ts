/**
 * System prompt for per-round tactical coaching.
 *
 * Analyzes each exchange in the simulation and produces a concise
 * tactical observation. Coaching intensity escalates across rounds:
 * light in rounds 1-2, active in 3-5, urgent in 6+.
 */

export function buildTacticalCoachSystemPrompt(): string {
  return `You are an expert negotiation coach observing a live simulation. After each exchange, you provide a single tactical observation to the person you are coaching.

You must return ONLY a JSON object:

{
  "tactical_note": "string (1-2 sentences of actionable coaching)"
}

COACHING RULES:
- Observe what just happened in the exchange, not what might happen.
- Reference specific words or moves from both parties.
- Surface patterns the user might not notice: shifts in the counterparty's position, emotional changes, strategic pivots, bluffs being tested.
- Never give generic advice like "Stay calm" or "Be firm." Every note must reference THIS exchange.
- Do not repeat observations you have already made in previous rounds.`;
}

export function buildTacticalCoachUserMessage(
  round: number,
  maxRounds: number,
  userMessage: string,
  counterpartyResponse: string,
  counterpartyHiddenMetadata: {
    readonly private_thoughts: string;
    readonly concession_readiness: string;
    readonly probing_intent: string;
    readonly emotional_state: string;
  },
  previousNotes: readonly string[]
): string {
  const intensity = getCoachingIntensity(round, maxRounds);

  let message = `## Round ${round} of ${maxRounds}

**Coaching intensity:** ${intensity}

**User said:** "${userMessage}"

**Counterparty responded:** "${counterpartyResponse}"

**Counterparty's hidden state (the user cannot see this):**
- Private thoughts: ${counterpartyHiddenMetadata.private_thoughts}
- Concession readiness: ${counterpartyHiddenMetadata.concession_readiness}
- Probing intent: ${counterpartyHiddenMetadata.probing_intent}
- Emotional state: ${counterpartyHiddenMetadata.emotional_state}`;

  if (previousNotes.length > 0) {
    message += `\n\n**Previous coaching notes (do not repeat these):**\n${previousNotes.map((n, i) => `- Round ${i + 1}: ${n}`).join("\n")}`;
  }

  message += `\n\nProvide your tactical observation. Intensity level "${intensity}" means:`;
  message += getIntensityDescription(intensity);

  return message;
}

type CoachingIntensity = "light" | "active" | "urgent";

function getCoachingIntensity(
  round: number,
  maxRounds: number
): CoachingIntensity {
  const remainingRatio = (maxRounds - round) / maxRounds;

  if (round <= 2 && remainingRatio > 0.5) {
    return "light";
  }

  if (round >= 6 || remainingRatio <= 0.25) {
    return "urgent";
  }

  return "active";
}

function getIntensityDescription(intensity: CoachingIntensity): string {
  switch (intensity) {
    case "light":
      return "\n- Brief, observational. Point out one thing they noticed.\n- Do not direct strategy yet. Let the user find their rhythm.";

    case "active":
      return "\n- Substantive tactical advice. Point out what the counterparty is really doing.\n- Suggest a specific pivot or question if the user is missing an opportunity.\n- Flag if the counterparty's hidden state suggests they are closer to conceding than they appear.";

    case "urgent":
      return "\n- Direct and specific. Time is running out.\n- If the user is approaching their walk-away without realizing it, say so clearly.\n- If there is an opening the user is missing, state exactly what to say.\n- If the counterparty is ready to concede, tell the user to push NOW.";
  }
}
