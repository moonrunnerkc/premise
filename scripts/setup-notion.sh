#!/usr/bin/env bash
#
# setup-notion.sh: Validate Notion integration and create a test workspace.
#
# Verifies that the Notion token and parent page ID are configured correctly,
# then creates a minimal test page to confirm API access.
#
# Prerequisites:
#   - NOTION_TOKEN in .env
#   - NOTION_PARENT_PAGE_ID in .env (page must be shared with the Notion integration)
#
# Usage: ./scripts/setup-notion.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

# Load .env if present
if [[ -f "$PROJECT_DIR/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$PROJECT_DIR/.env"
  set +a
fi

echo -e "${BOLD}${CYAN}Premise Notion Setup${RESET}"
echo ""

# Check NOTION_TOKEN
if [[ -z "${NOTION_TOKEN:-}" ]]; then
  echo -e "${RED}Error: NOTION_TOKEN is not set.${RESET}"
  echo "  1. Create a Notion integration at https://www.notion.so/my-integrations"
  echo "  2. Copy the Internal Integration Secret"
  echo "  3. Add it to .env: NOTION_TOKEN=ntn_..."
  exit 1
fi
echo -e "${GREEN}✓${RESET} NOTION_TOKEN is set"

# Check NOTION_PARENT_PAGE_ID
if [[ -z "${NOTION_PARENT_PAGE_ID:-}" ]]; then
  echo -e "${RED}Error: NOTION_PARENT_PAGE_ID is not set.${RESET}"
  echo "  1. Create or choose a page in Notion where Premise workspaces will live"
  echo "  2. Copy the page ID from the URL (the 32-char hex string)"
  echo "  3. Add it to .env: NOTION_PARENT_PAGE_ID=abc123..."
  echo "  4. Share the page with your integration (... menu > Connections > Add)"
  exit 1
fi
echo -e "${GREEN}✓${RESET} NOTION_PARENT_PAGE_ID is set"

# Validate API access by fetching the parent page
echo ""
echo -e "${CYAN}Testing API access...${RESET}"

HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  "https://api.notion.com/v1/pages/${NOTION_PARENT_PAGE_ID}" \
  -H "Authorization: Bearer ${NOTION_TOKEN}" \
  -H "Notion-Version: 2022-06-28")

if [[ "$HTTP_STATUS" == "200" ]]; then
  echo -e "${GREEN}✓${RESET} Successfully accessed parent page (HTTP $HTTP_STATUS)"
elif [[ "$HTTP_STATUS" == "401" ]]; then
  echo -e "${RED}✗ Authentication failed (HTTP 401).${RESET}"
  echo "  Your NOTION_TOKEN may be invalid or expired."
  echo "  Check it at https://www.notion.so/my-integrations"
  exit 1
elif [[ "$HTTP_STATUS" == "404" ]]; then
  echo -e "${RED}✗ Parent page not found (HTTP 404).${RESET}"
  echo "  Either NOTION_PARENT_PAGE_ID is wrong, or you haven't shared the page"
  echo "  with your integration yet. Open the page in Notion, click ... menu,"
  echo "  then Connections > Add connection > select your integration."
  exit 1
else
  echo -e "${RED}✗ Unexpected response (HTTP $HTTP_STATUS).${RESET}"
  echo "  Check your network connection and Notion API status."
  exit 1
fi

# Create a test page
echo ""
echo -e "${CYAN}Creating test page...${RESET}"

RESPONSE=$(curl -s -X POST "https://api.notion.com/v1/pages" \
  -H "Authorization: Bearer ${NOTION_TOKEN}" \
  -H "Content-Type: application/json" \
  -H "Notion-Version: 2022-06-28" \
  -d "{
    \"parent\": { \"page_id\": \"${NOTION_PARENT_PAGE_ID}\" },
    \"properties\": {
      \"title\": {
        \"title\": [{ \"text\": { \"content\": \"Premise Setup Test (safe to delete)\" } }]
      }
    },
    \"children\": [
      {
        \"object\": \"block\",
        \"type\": \"paragraph\",
        \"paragraph\": {
          \"rich_text\": [{ \"text\": { \"content\": \"Notion integration is working correctly. You can delete this page.\" } }]
        }
      }
    ]
  }")

# Check if page was created
PAGE_ID=$(echo "$RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [[ -n "$PAGE_ID" ]]; then
  echo -e "${GREEN}✓${RESET} Test page created: ${PAGE_ID}"
else
  echo -e "${RED}✗ Failed to create test page.${RESET}"
  echo "  Response: $RESPONSE"
  exit 1
fi

echo ""
echo -e "${BOLD}${GREEN}Setup complete.${RESET} Your Notion integration is configured correctly."
echo ""
echo "Next steps:"
echo "  1. Delete the test page from Notion (titled 'Premise Setup Test')"
echo "  2. Build the project: npm run build"
echo "  3. Configure Claude Desktop with both Premise and Notion MCP servers"
echo "     (see README.md for the configuration JSON)"
echo ""
