#!/bin/bash

# Script to test Azure OpenAI configuration
# This script checks your Azure OpenAI setup and tests the connection

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Azure OpenAI Configuration Test${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo -e "${RED}✗ .env.local file not found${NC}"
    echo -e "${YELLOW}Please create .env.local file first${NC}"
    exit 1
fi

echo -e "${GREEN}✓ .env.local file found${NC}"

# Load environment variables
export $(grep -v '^#' .env.local | xargs)

# Check required environment variables
echo ""
echo -e "${BLUE}[1/5] Checking Environment Variables...${NC}"

MISSING_VARS=()

if [ -z "$AZURE_AI_FOUNDRY_ENDPOINT" ]; then
    MISSING_VARS+=("AZURE_AI_FOUNDRY_ENDPOINT")
fi

if [ -z "$AZURE_AI_FOUNDRY_API_KEY" ]; then
    MISSING_VARS+=("AZURE_AI_FOUNDRY_API_KEY")
fi

if [ -z "$AZURE_AI_FOUNDRY_DEPLOYMENT" ]; then
    MISSING_VARS+=("AZURE_AI_FOUNDRY_DEPLOYMENT")
fi

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
    echo -e "${RED}✗ Missing required environment variables:${NC}"
    for var in "${MISSING_VARS[@]}"; do
        echo -e "${RED}  - $var${NC}"
    done
    exit 1
fi

echo -e "${GREEN}✓ All required environment variables are set${NC}"
echo -e "  Endpoint: ${YELLOW}${AZURE_AI_FOUNDRY_ENDPOINT}${NC}"
echo -e "  Deployment: ${YELLOW}${AZURE_AI_FOUNDRY_DEPLOYMENT}${NC}"
echo -e "  API Key: ${YELLOW}${AZURE_AI_FOUNDRY_API_KEY:0:10}...${NC}"

# Check Azure CLI
echo ""
echo -e "${BLUE}[2/5] Checking Azure CLI...${NC}"

if ! command -v az &> /dev/null; then
    echo -e "${RED}✗ Azure CLI not found${NC}"
    echo -e "${YELLOW}Install with: brew install azure-cli${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Azure CLI found${NC}"

# Check if logged in
if ! az account show &> /dev/null; then
    echo -e "${RED}✗ Not logged in to Azure${NC}"
    echo -e "${YELLOW}Run: az login${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Logged in to Azure${NC}"

# Extract resource name from endpoint
ENDPOINT_HOST=$(echo "$AZURE_AI_FOUNDRY_ENDPOINT" | sed -E 's|https?://([^/]+).*|\1|')
RESOURCE_NAME=$(echo "$ENDPOINT_HOST" | sed 's/\.openai\.azure\.com//' | sed 's/\.services\.ai\.azure\.com//')

echo ""
echo -e "${BLUE}[3/5] Finding Azure OpenAI Resource...${NC}"
echo -e "  Extracted resource name: ${YELLOW}${RESOURCE_NAME}${NC}"

# Try to find the resource
RESOURCE_GROUP=$(az cognitiveservices account list \
    --query "[?name=='${RESOURCE_NAME}'].resourceGroup" -o tsv 2>/dev/null | head -1)

if [ -z "$RESOURCE_GROUP" ]; then
    echo -e "${YELLOW}⚠ Could not find resource '${RESOURCE_NAME}' automatically${NC}"
    echo -e "${YELLOW}Please provide the resource group name:${NC}"
    read -p "Resource Group: " RESOURCE_GROUP
else
    echo -e "${GREEN}✓ Found resource in resource group: ${YELLOW}${RESOURCE_GROUP}${NC}"
fi

# List deployments
echo ""
echo -e "${BLUE}[4/5] Checking Deployments...${NC}"

DEPLOYMENTS=$(az cognitiveservices account deployment list \
    --resource-group "${RESOURCE_GROUP}" \
    --name "${RESOURCE_NAME}" \
    --query "[].{name:name, model:properties.model.name, status:properties.provisioningState}" \
    -o json 2>/dev/null || echo "[]")

if [ "$DEPLOYMENTS" = "[]" ] || [ -z "$DEPLOYMENTS" ]; then
    echo -e "${RED}✗ No deployments found${NC}"
    echo -e "${YELLOW}You need to deploy a model first${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Found deployments:${NC}"
echo "$DEPLOYMENTS" | jq -r '.[] | "  - \(.name) (model: \(.model), status: \(.status))"'

# Check if the specified deployment exists
DEPLOYMENT_EXISTS=$(echo "$DEPLOYMENTS" | jq -r ".[] | select(.name==\"${AZURE_AI_FOUNDRY_DEPLOYMENT}\") | .name")

if [ -z "$DEPLOYMENT_EXISTS" ]; then
    echo ""
    echo -e "${RED}✗ Deployment '${AZURE_AI_FOUNDRY_DEPLOYMENT}' not found${NC}"
    echo -e "${YELLOW}Available deployments:${NC}"
    echo "$DEPLOYMENTS" | jq -r '.[].name' | while read -r dep; do
        echo -e "${YELLOW}  - $dep${NC}"
    done
    exit 1
fi

echo -e "${GREEN}✓ Deployment '${AZURE_AI_FOUNDRY_DEPLOYMENT}' exists${NC}"

# Test API call
echo ""
echo -e "${BLUE}[5/5] Testing API Call...${NC}"

# Normalize endpoint
ENDPOINT="$AZURE_AI_FOUNDRY_ENDPOINT"
ENDPOINT=$(echo "$ENDPOINT" | sed 's|/$||')  # Remove trailing slash

# Determine if it's Azure AI Foundry or standard Azure OpenAI
if [[ "$ENDPOINT" == *".services.ai.azure.com"* ]]; then
    # Azure AI Foundry
    if [[ "$ENDPOINT" == *"/api/projects/"* ]]; then
        # Has project path
        BASE_URL="${ENDPOINT}/openai"
    else
        BASE_URL="${ENDPOINT}/openai"
    fi
    API_VERSION="latest"
else
    # Standard Azure OpenAI
    BASE_URL="${ENDPOINT}/openai"
    API_VERSION="2024-02-15-preview"
fi

echo -e "  Base URL: ${YELLOW}${BASE_URL}${NC}"
echo -e "  API Version: ${YELLOW}${API_VERSION}${NC}"
echo -e "  Deployment: ${YELLOW}${AZURE_AI_FOUNDRY_DEPLOYMENT}${NC}"

# Create a test request
TEST_RESPONSE=$(curl -s -w "\n%{http_code}" \
    -X POST "${BASE_URL}/deployments/${AZURE_AI_FOUNDRY_DEPLOYMENT}/chat/completions?api-version=${API_VERSION}" \
    -H "api-key: ${AZURE_AI_FOUNDRY_API_KEY}" \
    -H "Content-Type: application/json" \
    -d '{
        "messages": [
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": "Say hello"}
        ],
        "max_tokens": 10
    }' 2>&1)

HTTP_CODE=$(echo "$TEST_RESPONSE" | tail -1)
RESPONSE_BODY=$(echo "$TEST_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ API call successful!${NC}"
    echo -e "${GREEN}Response:${NC}"
    echo "$RESPONSE_BODY" | jq -r '.choices[0].message.content' 2>/dev/null || echo "$RESPONSE_BODY"
else
    echo -e "${RED}✗ API call failed (HTTP $HTTP_CODE)${NC}"
    echo -e "${RED}Response:${NC}"
    echo "$RESPONSE_BODY" | jq '.' 2>/dev/null || echo "$RESPONSE_BODY"
    
    # Provide helpful error messages
    if [ "$HTTP_CODE" = "401" ]; then
        echo ""
        echo -e "${YELLOW}Authentication failed. Check your API key.${NC}"
    elif [ "$HTTP_CODE" = "404" ]; then
        echo ""
        echo -e "${YELLOW}Deployment not found. Check:${NC}"
        echo -e "${YELLOW}  1. Deployment name is correct: ${AZURE_AI_FOUNDRY_DEPLOYMENT}${NC}"
        echo -e "${YELLOW}  2. Endpoint URL is correct: ${ENDPOINT}${NC}"
        echo -e "${YELLOW}  3. Base URL constructed correctly: ${BASE_URL}${NC}"
    elif [ "$HTTP_CODE" = "400" ]; then
        echo ""
        echo -e "${YELLOW}Bad request. Check the API version and request format.${NC}"
    fi
    exit 1
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}All checks passed! ✓${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}Configuration Summary:${NC}"
echo -e "  Endpoint: ${AZURE_AI_FOUNDRY_ENDPOINT}"
echo -e "  Deployment: ${AZURE_AI_FOUNDRY_DEPLOYMENT}"
echo -e "  Resource: ${RESOURCE_NAME}"
echo -e "  Resource Group: ${RESOURCE_GROUP}"
echo -e "  Base URL: ${BASE_URL}"
echo -e "  API Version: ${API_VERSION}"
echo ""

