#!/usr/bin/env bash
#
# demo.sh: Runs a scripted demo of all 7 Premise tools using mock responses.
#
# Uses pre-recorded API responses from demo/mock-responses/ so no API key is needed.
# Sends MCP JSON-RPC messages to the Premise server via stdin and captures responses.
#
# Usage: ./scripts/demo.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
DIST_DIR="$PROJECT_DIR/dist"
MOCK_DIR="$PROJECT_DIR/demo/mock-responses"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
RESET='\033[0m'

# Check that the project is built
if [[ ! -f "$DIST_DIR/index.js" ]]; then
  echo -e "${YELLOW}Building project...${RESET}"
  (cd "$PROJECT_DIR" && npm run build)
fi

header() {
  echo ""
  echo -e "${BOLD}${BLUE}═══════════════════════════════════════════════════════════════${RESET}"
  echo -e "${BOLD}${BLUE}  $1${RESET}"
  echo -e "${BOLD}${BLUE}═══════════════════════════════════════════════════════════════${RESET}"
  echo ""
}

tool_call() {
  local tool_name="$1"
  local params="$2"
  local desc="$3"

  echo -e "${CYAN}▸ Calling ${BOLD}$tool_name${RESET}${CYAN}: $desc${RESET}"
  echo ""

  # Build the JSON-RPC request
  local init_msg='{"jsonrpc":"2.0","id":0,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"demo","version":"1.0"}}}'
  local init_ack='{"jsonrpc":"2.0","method":"notifications/initialized"}'
  local call_msg
  call_msg=$(printf '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"%s","arguments":%s}}' "$tool_name" "$params")

  # Send to the server and capture the response
  local response
  response=$(echo -e "${init_msg}\n${init_ack}\n${call_msg}" | \
    PREMISE_MOCK_DIR="$MOCK_DIR" \
    PREMISE_LOG_LEVEL="error" \
    node "$DIST_DIR/index.js" 2>/dev/null | \
    tail -1)

  # Extract and pretty-print the text content
  local text_content
  text_content=$(echo "$response" | node -e "
    const data = JSON.parse(require('fs').readFileSync(0, 'utf8'));
    if (data.result && data.result.content) {
      const text = data.result.content.find(c => c.type === 'text');
      if (text) {
        const parsed = JSON.parse(text.text);
        console.log(JSON.stringify(parsed, null, 2));
      }
    } else if (data.error) {
      console.log('ERROR:', JSON.stringify(data.error, null, 2));
    }
  " 2>/dev/null)

  if [[ -n "$text_content" ]]; then
    echo "$text_content"
  else
    echo -e "${YELLOW}(no parseable output)${RESET}"
  fi

  echo ""
}

# ═══════════════════════════════════════════════════════
# DEMO START
# ═══════════════════════════════════════════════════════

echo ""
echo -e "${BOLD}${GREEN}"
echo "  ╔═══════════════════════════════════════════════════╗"
echo "  ║                                                   ║"
echo "  ║           P R E M I S E   D E M O                ║"
echo "  ║                                                   ║"
echo "  ║   Build your premise before any                   ║"
echo "  ║   high-stakes conversation.                       ║"
echo "  ║                                                   ║"
echo "  ╚═══════════════════════════════════════════════════╝"
echo -e "${RESET}"
echo -e "  Using mock responses from: ${CYAN}$MOCK_DIR${RESET}"
echo ""

# ─── Phase 1: Analyze ───
header "Phase 1: Intake Analysis"

ANALYZE_CONTEXT="I am a senior software engineer making \$170K. I led the platform migration project this year and my annual review with my manager Sarah Chen is next Tuesday. I want a raise to at least \$185K, ideally \$195K. Market rate for my level is \$185K-200K. I have been getting recruiter interest from other companies."

echo -e "${GREEN}User:${RESET} $ANALYZE_CONTEXT"
echo ""

ANALYZE_PARAMS=$(cat <<'EOF'
{"context":"I am a senior software engineer making $170K. I led the platform migration project this year and my annual review with my manager Sarah Chen is next Tuesday. I want a raise to at least $185K, ideally $195K. Market rate for my level is $185K-200K. I have been getting recruiter interest from other companies.","negotiation_type":"salary"}
EOF
)

tool_call "premise-analyze" "$ANALYZE_PARAMS" "Parsing negotiation context"

# ─── Phase 2: Position ───
header "Phase 2: Position Mapping"

echo -e "${GREEN}Target:${RESET} \$195K total compensation"
echo -e "${GREEN}Minimum:${RESET} \$185K base salary"
echo -e "${GREEN}BATNA:${RESET} Competing offer from Dataflow Systems at \$200K"
echo ""

# Read the analyze mock output to use as input
ANALYZE_OUTPUT=$(cat "$MOCK_DIR/analyze-salary.json")
POSITION_PARAMS=$(node -e "
const analysis = $ANALYZE_OUTPUT;
analysis.negotiation_id = 'demo-001';
const params = {
  negotiation_id: 'demo-001',
  analysis: analysis,
  your_target: '\$195K total compensation',
  your_minimum: '\$185K base salary',
  your_batna: 'Competing offer from Dataflow Systems at \$200K',
  market_context: 'Senior engineers with platform experience: \$185K-200K in this market'
};
console.log(JSON.stringify(params));
")

tool_call "premise-position" "$POSITION_PARAMS" "Mapping both sides' positions"

# ─── Phase 3: Scenarios ───
header "Phase 3: Scenario Generation"

echo -e "${GREEN}Generating decision tree (depth 2)...${RESET}"
echo ""

POSITION_OUTPUT=$(cat "$MOCK_DIR/position-salary.json")
SCENARIOS_PARAMS=$(node -e "
const analysis = $ANALYZE_OUTPUT;
analysis.negotiation_id = 'demo-001';
const positions = $POSITION_OUTPUT;
positions.negotiation_id = 'demo-001';
const params = {
  negotiation_id: 'demo-001',
  analysis: analysis,
  positions: positions,
  depth: 2
};
console.log(JSON.stringify(params));
")

tool_call "premise-scenarios" "$SCENARIOS_PARAMS" "Building scenario decision tree"

# ─── Phase 4: Simulation ───
header "Phase 4: Interactive Simulation"

echo -e "${GREEN}User opening:${RESET} Sarah, thanks for making time for this. I wanted to talk about my compensation and where I see myself contributing going forward."
echo ""

SIM_START_PARAMS=$(node -e "
const analysis = $ANALYZE_OUTPUT;
analysis.negotiation_id = 'demo-001';
const positions = $POSITION_OUTPUT;
positions.negotiation_id = 'demo-001';
const params = {
  negotiation_id: 'demo-001',
  analysis: analysis,
  positions: positions,
  counterparty_style: 'analytical',
  your_opening: 'Sarah, thanks for making time for this. I wanted to talk about my compensation and where I see myself contributing going forward. The platform migration was a major milestone and I have been thinking about what market-competitive pay looks like for the scope I am operating at.',
  max_rounds: 8
};
console.log(JSON.stringify(params));
")

tool_call "premise-sim-start" "$SIM_START_PARAMS" "Starting simulation (Round 1)"

# Get the session state for the next round
SIM_START_OUTPUT=$(echo '{"jsonrpc":"2.0","id":0,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"demo","version":"1.0"}}}
{"jsonrpc":"2.0","method":"notifications/initialized"}' | \
  cat - <(echo "$SIM_START_PARAMS" | node -e "
    const params = JSON.parse(require('fs').readFileSync(0, 'utf8'));
    const msg = {jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'premise-sim-start',arguments:params}};
    console.log(JSON.stringify(msg));
  ") | \
  PREMISE_MOCK_DIR="$MOCK_DIR" PREMISE_LOG_LEVEL="error" node "$DIST_DIR/index.js" 2>/dev/null | tail -1)

SESSION_STATE=$(echo "$SIM_START_OUTPUT" | node -e "
  const data = JSON.parse(require('fs').readFileSync(0, 'utf8'));
  const text = data.result.content.find(c => c.type === 'text');
  const parsed = JSON.parse(text.text);
  console.log(JSON.stringify(parsed.session_state));
" 2>/dev/null)

echo -e "${GREEN}User response (Round 2):${RESET} I appreciate the recognition, Sarah. Based on conversations with recruiters and comp data, the market range for my experience and this year's scope is \$185K to \$200K."
echo ""

SIM_ROUND_PARAMS=$(node -e "
const params = {
  session_state: $SESSION_STATE,
  your_response: 'I appreciate the recognition, Sarah. Based on conversations with recruiters and comp data, the market range for my experience and this year\\'s scope is \$185K to \$200K. I am not looking to leave, but I want to make sure my compensation reflects where the market is.'
};
console.log(JSON.stringify(params));
")

tool_call "premise-sim-round" "$SIM_ROUND_PARAMS" "Processing Round 2"

# Get updated session state for sim-end
SIM_ROUND_OUTPUT=$(echo '{"jsonrpc":"2.0","id":0,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"demo","version":"1.0"}}}
{"jsonrpc":"2.0","method":"notifications/initialized"}' | \
  cat - <(echo "$SIM_ROUND_PARAMS" | node -e "
    const params = JSON.parse(require('fs').readFileSync(0, 'utf8'));
    const msg = {jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'premise-sim-round',arguments:params}};
    console.log(JSON.stringify(msg));
  ") | \
  PREMISE_MOCK_DIR="$MOCK_DIR" PREMISE_LOG_LEVEL="error" node "$DIST_DIR/index.js" 2>/dev/null | tail -1)

SESSION_STATE=$(echo "$SIM_ROUND_OUTPUT" | node -e "
  const data = JSON.parse(require('fs').readFileSync(0, 'utf8'));
  const text = data.result.content.find(c => c.type === 'text');
  const parsed = JSON.parse(text.text);
  console.log(JSON.stringify(parsed.session_state));
" 2>/dev/null)

# ─── Phase 4b: Post-Mortem ───
header "Phase 4b: Post-Mortem"

SIM_END_PARAMS=$(node -e "
const params = {
  session_state: $SESSION_STATE,
  end_reason: 'completed'
};
console.log(JSON.stringify(params));
")

tool_call "premise-sim-end" "$SIM_END_PARAMS" "Generating post-mortem with inner state reveal"

# ─── Phase 5: Debrief ───
header "Phase 5: Post-Negotiation Debrief"

echo -e "${GREEN}User:${RESET} The negotiation went well. I got \$190K with a written path to Staff Engineer."
echo ""

DEBRIEF_PARAMS=$(cat <<'EOF'
{"negotiation_id":"demo-001","outcome":"Negotiated to $190K base with a written Staff Engineer promotion path including quarterly check-ins. Sarah got VP approval within the week.","deal_terms":"$190K base salary, Staff promotion criteria documented, quarterly check-ins","surprises":"Sarah was warmer than expected and volunteered the VP conversation","counterparty_behavior":"Collaborative, opened with standard band but quickly moved to problem-solving when I showed market data"}
EOF
)

tool_call "premise-debrief" "$DEBRIEF_PARAMS" "Comparing prep vs. reality"

# ─── Summary ───
echo ""
echo -e "${BOLD}${GREEN}═══════════════════════════════════════════════════════════════${RESET}"
echo -e "${BOLD}${GREEN}  Demo complete. All 7 tools exercised successfully.${RESET}"
echo -e "${BOLD}${GREEN}═══════════════════════════════════════════════════════════════${RESET}"
echo ""
echo -e "  Tools called:"
echo -e "    1. ${CYAN}premise-analyze${RESET}    - Parsed negotiation context"
echo -e "    2. ${CYAN}premise-position${RESET}   - Mapped both sides' positions"
echo -e "    3. ${CYAN}premise-scenarios${RESET}  - Generated decision tree"
echo -e "    4. ${CYAN}premise-sim-start${RESET}  - Started adversarial simulation"
echo -e "    5. ${CYAN}premise-sim-round${RESET}  - Processed one simulation round"
echo -e "    6. ${CYAN}premise-sim-end${RESET}    - Generated post-mortem with inner state reveal"
echo -e "    7. ${CYAN}premise-debrief${RESET}    - Compared preparation vs. reality"
echo ""
