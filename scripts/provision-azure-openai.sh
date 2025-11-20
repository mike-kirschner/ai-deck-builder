#!/bin/bash

# Azure OpenAI Provisioning Script for AI Deck Builder
# This script creates an Azure OpenAI resource and deploys a model
# 
# Usage:
#   ./scripts/provision-azure-openai.sh <resource-group-name> <location> <key-vault-name> [app-service-name] [model-name]
#   Example: ./scripts/provision-azure-openai.sh rg-ai-deck-builder eastus kv-ai-deck-builder-dev-123456
#   Example: ./scripts/provision-azure-openai.sh rg-ai-deck-builder eastus kv-ai-deck-builder-dev-123456 app-ai-deck-builder-dev-123456 gpt-35-turbo
#
# Parameters:
#   resource-group-name: Name of the existing Azure resource group
#   location: Azure region (e.g., eastus, westus2)
#   key-vault-name: Name of the existing Key Vault
#   app-service-name: (optional) Name of the App Service to configure
#   model-name: (optional) Model to deploy (default: gpt-35-turbo, alternatives: gpt-4, gpt-4-turbo)
#   Note: o4-mini and o1-mini are only available in OpenAI directly, not Azure OpenAI

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if Azure CLI is installed
if ! command -v az &> /dev/null; then
    echo -e "${RED}Error: Azure CLI is not installed. Please install it first.${NC}"
    exit 1
fi

# Check if user is logged in
if ! az account show &> /dev/null; then
    echo -e "${RED}Error: Not logged in to Azure. Please run 'az login' first.${NC}"
    exit 1
fi

# Parse arguments
RESOURCE_GROUP=${1}
LOCATION=${2}
KEY_VAULT=${3}
APP_SERVICE=${4:-""}
MODEL_NAME=${5:-"gpt-35-turbo"}

# Validate required parameters
if [ -z "${RESOURCE_GROUP}" ] || [ -z "${LOCATION}" ] || [ -z "${KEY_VAULT}" ]; then
    echo -e "${RED}Error: Missing required parameters${NC}"
    echo "Usage: $0 <resource-group-name> <location> <key-vault-name> [app-service-name] [model-name]"
    echo "Example: $0 rg-ai-deck-builder eastus kv-ai-deck-builder-dev-123456"
    exit 1
fi

# Generate unique name for Azure OpenAI resource
# Azure OpenAI resource names must be globally unique and 3-24 characters
TIMESTAMP=$(date +%s)
UNIQUE_SUFFIX="${TIMESTAMP: -6}"
OPENAI_NAME="oai-${UNIQUE_SUFFIX}"

# Validate model name (informational only - Azure will validate actual availability)
# Note: o4-mini and o1-mini are NOT available in Azure OpenAI (only in OpenAI directly)
VALID_MODELS=("gpt-4" "gpt-4-turbo" "gpt-35-turbo" "gpt-35-turbo-16k")
if [[ ! " ${VALID_MODELS[@]} " =~ " ${MODEL_NAME} " ]]; then
    if [[ "${MODEL_NAME}" == "o4-mini" ]] || [[ "${MODEL_NAME}" == "o1-mini" ]]; then
        echo -e "${RED}⚠ Warning: ${MODEL_NAME} is NOT available in Azure OpenAI${NC}"
        echo -e "${YELLOW}  o4-mini and o1-mini are only available in OpenAI directly, not Azure OpenAI${NC}"
        echo -e "${YELLOW}  Common Azure OpenAI models: ${VALID_MODELS[*]}${NC}"
        echo ""
        read -p "Do you want to continue anyway? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "Aborted. Please use a supported Azure OpenAI model."
            exit 1
        fi
    else
        echo -e "${YELLOW}Note: Model '${MODEL_NAME}' is not in the common list. Continuing anyway...${NC}"
        echo -e "${YELLOW}Common Azure OpenAI models: ${VALID_MODELS[*]}${NC}"
    fi
fi

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Azure OpenAI Provisioning${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "Resource Group: ${YELLOW}${RESOURCE_GROUP}${NC}"
echo -e "Location: ${YELLOW}${LOCATION}${NC}"
echo -e "Key Vault: ${YELLOW}${KEY_VAULT}${NC}"
echo -e "OpenAI Resource Name: ${YELLOW}${OPENAI_NAME}${NC}"
echo -e "Model to Deploy: ${YELLOW}${MODEL_NAME}${NC}"
if [ -n "${APP_SERVICE}" ]; then
    echo -e "App Service: ${YELLOW}${APP_SERVICE}${NC}"
fi
echo ""

# Check if resource group exists
if ! az group show --name "${RESOURCE_GROUP}" &> /dev/null; then
    echo -e "${RED}Error: Resource group '${RESOURCE_GROUP}' does not exist.${NC}"
    echo "Please create it first or use the correct resource group name."
    exit 1
fi

# Check if Key Vault exists
if ! az keyvault show --name "${KEY_VAULT}" --resource-group "${RESOURCE_GROUP}" &> /dev/null; then
    echo -e "${RED}Error: Key Vault '${KEY_VAULT}' does not exist in resource group '${RESOURCE_GROUP}'.${NC}"
    exit 1
fi

# Check if Azure OpenAI is available in the region
echo -e "${BLUE}Checking Azure OpenAI availability in ${LOCATION}...${NC}"
AVAILABLE_REGIONS=$(az cognitiveservices account list-skus --query "[?kind=='OpenAI'].locations[]" -o tsv 2>/dev/null || echo "")

if [ -z "${AVAILABLE_REGIONS}" ]; then
    echo -e "${YELLOW}⚠ Could not verify region availability. Continuing anyway...${NC}"
else
    if echo "${AVAILABLE_REGIONS}" | grep -q "${LOCATION}"; then
        echo -e "${GREEN}✓ Azure OpenAI is available in ${LOCATION}${NC}"
    else
        echo -e "${YELLOW}⚠ Azure OpenAI may not be available in ${LOCATION}${NC}"
        echo -e "${YELLOW}Available regions: ${AVAILABLE_REGIONS}${NC}"
        echo -e "${YELLOW}Continuing anyway...${NC}"
    fi
fi

# Confirm before proceeding
echo ""
read -p "Do you want to proceed? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 1
fi

# Step 1: Create Azure OpenAI resource
echo -e "${GREEN}[1/4] Creating Azure OpenAI resource...${NC}"

# Check if resource already exists
if az cognitiveservices account show --name "${OPENAI_NAME}" --resource-group "${RESOURCE_GROUP}" &> /dev/null; then
    echo -e "${YELLOW}⚠ Azure OpenAI resource '${OPENAI_NAME}' already exists. Using existing resource.${NC}"
else
    # Create the Azure OpenAI resource
    # Note: This requires the Microsoft.CognitiveServices provider to be registered
    echo -e "${BLUE}Registering Microsoft.CognitiveServices provider (if needed)...${NC}"
    az provider register --namespace Microsoft.CognitiveServices --wait 2>/dev/null || true
    
    echo -e "${BLUE}Creating Azure OpenAI resource (this may take a few minutes)...${NC}"
    if az cognitiveservices account create \
        --resource-group "${RESOURCE_GROUP}" \
        --name "${OPENAI_NAME}" \
        --location "${LOCATION}" \
        --kind "OpenAI" \
        --sku "S0" \
        --custom-domain "" \
        --yes \
        --output none 2>&1; then
        echo -e "${GREEN}✓ Azure OpenAI resource created${NC}"
    else
        echo -e "${RED}✗ Failed to create Azure OpenAI resource${NC}"
        echo -e "${YELLOW}This might be because:${NC}"
        echo -e "${YELLOW}  1. Azure OpenAI requires approval/access request${NC}"
        echo -e "${YELLOW}  2. The region doesn't support Azure OpenAI${NC}"
        echo -e "${YELLOW}  3. You don't have the required permissions${NC}"
        echo ""
        echo -e "${YELLOW}To request access:${NC}"
        echo -e "${YELLOW}  1. Go to https://aka.ms/oai/access${NC}"
        echo -e "${YELLOW}  2. Fill out the access request form${NC}"
        echo -e "${YELLOW}  3. Wait for approval (can take 1-2 business days)${NC}"
        exit 1
    fi
fi

# Get endpoint and keys
echo -e "${BLUE}Retrieving endpoint and API key...${NC}"
OPENAI_ENDPOINT=$(az cognitiveservices account show \
    --resource-group "${RESOURCE_GROUP}" \
    --name "${OPENAI_NAME}" \
    --query properties.endpoint -o tsv)

OPENAI_KEY1=$(az cognitiveservices account keys list \
    --resource-group "${RESOURCE_GROUP}" \
    --name "${OPENAI_NAME}" \
    --query key1 -o tsv)

if [ -z "${OPENAI_ENDPOINT}" ] || [ -z "${OPENAI_KEY1}" ]; then
    echo -e "${RED}✗ Failed to retrieve endpoint or API key${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Endpoint: ${OPENAI_ENDPOINT}${NC}"

# Step 2: Deploy model
echo -e "${GREEN}[2/4] Deploying model '${MODEL_NAME}'...${NC}"

# List available models first
echo -e "${BLUE}Checking available models in your subscription...${NC}"
AVAILABLE_MODELS=$(az cognitiveservices account list-models \
    --resource-group "${RESOURCE_GROUP}" \
    --name "${OPENAI_NAME}" \
    --query "[].name" -o tsv 2>/dev/null || echo "")

if [ -n "${AVAILABLE_MODELS}" ]; then
    echo -e "${BLUE}Available models in your subscription:${NC}"
    echo "${AVAILABLE_MODELS}" | while read -r model; do
        echo -e "${BLUE}  - ${model}${NC}"
    done
    
    # Check if the requested model is available
    if ! echo "${AVAILABLE_MODELS}" | grep -qi "${MODEL_NAME}"; then
        echo -e "${RED}✗ Model '${MODEL_NAME}' is NOT available in your subscription${NC}"
        echo -e "${YELLOW}Note: o4-mini and o1-mini are currently only available in OpenAI directly, not Azure OpenAI${NC}"
        echo ""
        echo -e "${YELLOW}Available alternatives:${NC}"
        if echo "${AVAILABLE_MODELS}" | grep -qi "gpt-35-turbo"; then
            echo -e "${GREEN}  - gpt-35-turbo (recommended for cost-effective use)${NC}"
        fi
        if echo "${AVAILABLE_MODELS}" | grep -qi "gpt-4"; then
            echo -e "${GREEN}  - gpt-4 (recommended for high quality)${NC}"
        fi
        if echo "${AVAILABLE_MODELS}" | grep -qi "gpt-4-turbo"; then
            echo -e "${GREEN}  - gpt-4-turbo (recommended for high quality with better performance)${NC}"
        fi
        echo ""
        echo -e "${YELLOW}To use a different model, re-run the script with:${NC}"
        echo -e "${YELLOW}  ./scripts/provision-azure-openai.sh ${RESOURCE_GROUP} ${LOCATION} ${KEY_VAULT} ${APP_SERVICE} <model-name>${NC}"
        echo ""
        read -p "Do you want to continue anyway? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "Aborted. Please choose an available model."
            exit 1
        fi
    else
        echo -e "${GREEN}✓ Model '${MODEL_NAME}' is available${NC}"
    fi
else
    echo -e "${YELLOW}⚠ Could not retrieve available models list${NC}"
    echo -e "${YELLOW}Note: o4-mini and o1-mini are currently only available in OpenAI directly, not Azure OpenAI${NC}"
    echo -e "${YELLOW}Common Azure OpenAI models: gpt-4, gpt-4-turbo, gpt-35-turbo, gpt-35-turbo-16k${NC}"
    echo ""
    read -p "Do you want to continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborted. Please check available models in Azure Portal first."
        exit 1
    fi
fi

# Check if deployment already exists
DEPLOYMENT_NAME="${MODEL_NAME}"
if az cognitiveservices account deployment show \
    --resource-group "${RESOURCE_GROUP}" \
    --name "${OPENAI_NAME}" \
    --deployment-name "${DEPLOYMENT_NAME}" &> /dev/null; then
    echo -e "${YELLOW}⚠ Deployment '${DEPLOYMENT_NAME}' already exists. Skipping deployment.${NC}"
else
    echo -e "${BLUE}Creating deployment (this may take a few minutes)...${NC}"
    
    # Get available model versions for this model
    echo -e "${BLUE}Checking available model versions...${NC}"
    # Try to get detailed model information
    MODEL_INFO=$(az cognitiveservices account list-models \
        --resource-group "${RESOURCE_GROUP}" \
        --name "${OPENAI_NAME}" \
        --query "[?name=='${MODEL_NAME}']" -o json 2>/dev/null || echo "[]")
    
    MODEL_VERSIONS=$(echo "${MODEL_INFO}" | jq -r '.[].version' 2>/dev/null || \
        az cognitiveservices account list-models \
            --resource-group "${RESOURCE_GROUP}" \
            --name "${OPENAI_NAME}" \
            --query "[?name=='${MODEL_NAME}'].version" -o tsv 2>/dev/null || echo "")
    
    if [ -n "${MODEL_VERSIONS}" ] && [ "${MODEL_VERSIONS}" != "null" ]; then
        echo -e "${BLUE}Found model versions:${NC}"
        echo "${MODEL_VERSIONS}" | while read -r version; do
            if [ -n "${version}" ] && [ "${version}" != "null" ]; then
                echo -e "${BLUE}  - ${version}${NC}"
            fi
        done
    else
        echo -e "${YELLOW}⚠ Could not retrieve model versions from Azure${NC}"
        echo -e "${YELLOW}  This might mean the model needs to be deployed via Azure Portal first${NC}"
    fi
    
    # Azure CLI requires --model-format and --model-version
    # Try different version formats
    DEPLOYMENT_OUTPUT=""
    DEPLOYMENT_SUCCESS=false
    
    # List of version formats to try (in order of preference)
    # Note: Azure CLI often accepts "1" as the default version
    VERSION_ATTEMPTS=()
    
    # Try "1" first as it's the most common default
    VERSION_ATTEMPTS+=("1")
    
    # Then try actual versions from Azure if available
    if [ -n "${MODEL_VERSIONS}" ] && [ "${MODEL_VERSIONS}" != "null" ]; then
        while IFS= read -r version; do
            if [ -n "${version}" ] && [ "${version}" != "null" ] && [ "${version}" != "1" ]; then
                VERSION_ATTEMPTS+=("${version}")
            fi
        done <<< "${MODEL_VERSIONS}"
    fi
    
    # Add common version formats as fallbacks
    # For gpt-35-turbo, common versions are: 0613, 0125, 1106, 0301
    if [[ "${MODEL_NAME}" == "gpt-35-turbo" ]]; then
        VERSION_ATTEMPTS+=("0613" "0125" "1106" "0301")
    elif [[ "${MODEL_NAME}" == "gpt-4" ]]; then
        VERSION_ATTEMPTS+=("0613" "0314")
    elif [[ "${MODEL_NAME}" == "gpt-4-turbo" ]]; then
        VERSION_ATTEMPTS+=("preview" "0125" "1106")
    fi
    
    # Remove duplicates while preserving order
    UNIQUE_VERSIONS=()
    for version in "${VERSION_ATTEMPTS[@]}"; do
        if [[ ! " ${UNIQUE_VERSIONS[*]} " =~ " ${version} " ]]; then
            UNIQUE_VERSIONS+=("${version}")
        fi
    done
    
    # Try each version format
    for MODEL_VERSION in "${UNIQUE_VERSIONS[@]}"; do
        echo -e "${BLUE}Attempting deployment with model version '${MODEL_VERSION}'...${NC}"
        
        # Azure CLI requires both --model-format and --model-version
        DEPLOYMENT_OUTPUT=$(az cognitiveservices account deployment create \
            --resource-group "${RESOURCE_GROUP}" \
            --name "${OPENAI_NAME}" \
            --deployment-name "${DEPLOYMENT_NAME}" \
            --model-name "${MODEL_NAME}" \
            --model-version "${MODEL_VERSION}" \
            --model-format "OpenAI" \
            --sku-capacity "1" \
            --sku-name "Standard" \
            2>&1)
        
        EXIT_CODE=$?
        
        if [ $EXIT_CODE -eq 0 ]; then
            DEPLOYMENT_SUCCESS=true
            echo -e "${GREEN}✓ Deployment command succeeded with version '${MODEL_VERSION}'${NC}"
            break
        elif echo "${DEPLOYMENT_OUTPUT}" | grep -qi "already exists\|AlreadyExists"; then
            # Deployment already exists - this is actually success
            DEPLOYMENT_SUCCESS=true
            echo -e "${GREEN}✓ Deployment already exists${NC}"
            break
        else
            # Show error but continue trying
            if echo "${DEPLOYMENT_OUTPUT}" | grep -qi "not found\|not available\|not supported"; then
                echo -e "${YELLOW}  Version '${MODEL_VERSION}' not available for this model${NC}"
            else
                echo -e "${YELLOW}  Version '${MODEL_VERSION}' failed: $(echo "${DEPLOYMENT_OUTPUT}" | head -n 1)${NC}"
            fi
        fi
    done
    
    if [ "${DEPLOYMENT_SUCCESS}" = "true" ]; then
        echo -e "${GREEN}✓ Model deployment initiated${NC}"
        
        # Wait for deployment to complete
        echo -e "${BLUE}Waiting for deployment to complete (this may take 5-10 minutes)...${NC}"
        MAX_WAIT=600  # 10 minutes
        ELAPSED=0
        while [ $ELAPSED -lt $MAX_WAIT ]; do
            DEPLOYMENT_STATUS=$(az cognitiveservices account deployment show \
                --resource-group "${RESOURCE_GROUP}" \
                --name "${OPENAI_NAME}" \
                --deployment-name "${DEPLOYMENT_NAME}" \
                --query "properties.provisioningState" -o tsv 2>/dev/null || echo "Unknown")
            
            if [ "${DEPLOYMENT_STATUS}" = "Succeeded" ]; then
                echo -e "${GREEN}✓ Deployment completed successfully${NC}"
                break
            elif [ "${DEPLOYMENT_STATUS}" = "Failed" ]; then
                echo -e "${RED}✗ Deployment failed${NC}"
                exit 1
            else
                echo -e "${BLUE}  Status: ${DEPLOYMENT_STATUS} (waiting... ${ELAPSED}s)${NC}"
                sleep 10
                ELAPSED=$((ELAPSED + 10))
            fi
        done
        
        if [ $ELAPSED -ge $MAX_WAIT ]; then
            echo -e "${YELLOW}⚠ Deployment is taking longer than expected. It may still be in progress.${NC}"
            echo -e "${YELLOW}You can check the status in Azure Portal.${NC}"
        fi
    else
        echo -e "${RED}✗ Failed to create deployment after trying multiple methods${NC}"
        echo ""
        echo -e "${YELLOW}Error output:${NC}"
        echo "${DEPLOYMENT_OUTPUT}"
        echo ""
        
        if echo "${DEPLOYMENT_OUTPUT}" | grep -qi "not supported\|DeploymentModelNotSupported"; then
            echo -e "${RED}The model '${MODEL_NAME}' is not supported in Azure OpenAI${NC}"
            echo -e "${YELLOW}Note: o4-mini and o1-mini are currently only available in OpenAI directly, not Azure OpenAI${NC}"
            echo ""
            echo -e "${YELLOW}Common Azure OpenAI models:${NC}"
            echo -e "${GREEN}  - gpt-35-turbo (cost-effective, fast)${NC}"
            echo -e "${GREEN}  - gpt-4 (high quality)${NC}"
            echo -e "${GREEN}  - gpt-4-turbo (high quality, better performance)${NC}"
        elif echo "${DEPLOYMENT_OUTPUT}" | grep -qi "already exists\|AlreadyExists"; then
            echo -e "${YELLOW}⚠ Deployment may already exist. Checking...${NC}"
            if az cognitiveservices account deployment show \
                --resource-group "${RESOURCE_GROUP}" \
                --name "${OPENAI_NAME}" \
                --deployment-name "${DEPLOYMENT_NAME}" &> /dev/null; then
                echo -e "${GREEN}✓ Deployment already exists, continuing...${NC}"
                DEPLOYMENT_SUCCESS=true
            fi
        else
            echo -e "${YELLOW}This might be because:${NC}"
            echo -e "${YELLOW}  1. The model needs to be deployed via Azure Portal first${NC}"
            echo -e "${YELLOW}  2. The model '${MODEL_NAME}' is not available in your subscription${NC}"
            echo -e "${YELLOW}  3. You need to request access to the model${NC}"
            echo -e "${YELLOW}  4. The model name or version format is incorrect${NC}"
            echo ""
            echo -e "${YELLOW}Try deploying the model manually via Azure Portal:${NC}"
            echo -e "${YELLOW}  1. Go to Azure Portal → Your OpenAI resource (${OPENAI_NAME})${NC}"
            echo -e "${YELLOW}  2. Navigate to 'Model deployments' or 'Deployments'${NC}"
            echo -e "${YELLOW}  3. Click 'Create' or 'Deploy model'${NC}"
            echo -e "${YELLOW}  4. Select model '${MODEL_NAME}'${NC}"
            echo -e "${YELLOW}  5. Set deployment name to '${DEPLOYMENT_NAME}'${NC}"
            echo -e "${YELLOW}  6. Select model version (try the versions listed above)${NC}"
            echo -e "${YELLOW}  7. Set capacity to 1 and click 'Deploy'${NC}"
            echo -e "${YELLOW}  8. After deployment completes, re-run this script to configure Key Vault and App Service${NC}"
            echo ""
            echo -e "${YELLOW}Or see detailed instructions in: scripts/deploy-model-manual.md${NC}"
        fi
        
        if [ "${DEPLOYMENT_SUCCESS}" != "true" ]; then
            exit 1
        fi
    fi
    
    # If we get here, deployment exists or was created successfully
    if [ "${DEPLOYMENT_SUCCESS}" = "true" ] || az cognitiveservices account deployment show \
        --resource-group "${RESOURCE_GROUP}" \
        --name "${OPENAI_NAME}" \
        --deployment-name "${DEPLOYMENT_NAME}" &> /dev/null; then
        echo -e "${GREEN}✓ Deployment ready${NC}"
    fi
fi
fi

# Step 3: Store secrets in Key Vault
echo -e "${GREEN}[3/4] Storing secrets in Key Vault...${NC}"

# Check Key Vault access
CURRENT_USER_OBJECT_ID=$(az ad signed-in-user show --query id -o tsv 2>/dev/null || echo "")
if [ -z "${CURRENT_USER_OBJECT_ID}" ]; then
    echo -e "${YELLOW}⚠ Could not get current user ID. You may need to set secrets manually.${NC}"
fi

# Store endpoint
if az keyvault secret set \
    --vault-name "${KEY_VAULT}" \
    --name "AzureAiFoundryEndpoint" \
    --value "${OPENAI_ENDPOINT}" \
    --output none 2>/dev/null; then
    echo -e "${GREEN}✓ Stored AzureAiFoundryEndpoint${NC}"
else
    echo -e "${RED}✗ Failed to store AzureAiFoundryEndpoint${NC}"
    echo -e "${YELLOW}You may need to grant yourself access to Key Vault.${NC}"
    echo -e "${YELLOW}Run: az keyvault set-policy --name ${KEY_VAULT} --object-id ${CURRENT_USER_OBJECT_ID} --secret-permissions set${NC}"
fi

# Store API key
if az keyvault secret set \
    --vault-name "${KEY_VAULT}" \
    --name "AzureAiFoundryApiKey" \
    --value "${OPENAI_KEY1}" \
    --output none 2>/dev/null; then
    echo -e "${GREEN}✓ Stored AzureAiFoundryApiKey${NC}"
else
    echo -e "${RED}✗ Failed to store AzureAiFoundryApiKey${NC}"
fi

# Store deployment name
if az keyvault secret set \
    --vault-name "${KEY_VAULT}" \
    --name "AzureAiFoundryDeployment" \
    --value "${DEPLOYMENT_NAME}" \
    --output none 2>/dev/null; then
    echo -e "${GREEN}✓ Stored AzureAiFoundryDeployment${NC}"
else
    echo -e "${YELLOW}⚠ Failed to store deployment name (non-critical)${NC}"
fi

# Step 4: Configure App Service (if provided)
if [ -n "${APP_SERVICE}" ]; then
    echo -e "${GREEN}[4/4] Configuring App Service...${NC}"
    
    # Check if App Service exists
    if ! az webapp show --resource-group "${RESOURCE_GROUP}" --name "${APP_SERVICE}" &> /dev/null; then
        echo -e "${YELLOW}⚠ App Service '${APP_SERVICE}' does not exist. Skipping App Service configuration.${NC}"
    else
        echo -e "${BLUE}Updating App Service settings...${NC}"
        if az webapp config appsettings set \
            --resource-group "${RESOURCE_GROUP}" \
            --name "${APP_SERVICE}" \
            --settings \
                "AZURE_AI_FOUNDRY_ENDPOINT=@Microsoft.KeyVault(SecretUri=https://${KEY_VAULT}.vault.azure.net/secrets/AzureAiFoundryEndpoint/)" \
                "AZURE_AI_FOUNDRY_API_KEY=@Microsoft.KeyVault(SecretUri=https://${KEY_VAULT}.vault.azure.net/secrets/AzureAiFoundryApiKey/)" \
                "AZURE_AI_FOUNDRY_DEPLOYMENT=${DEPLOYMENT_NAME}" \
                "AZURE_AI_FOUNDRY_API_VERSION=latest" \
            --output none 2>/dev/null; then
            echo -e "${GREEN}✓ App Service configured${NC}"
        else
            echo -e "${YELLOW}⚠ Failed to update App Service settings. You may need to do this manually.${NC}"
        fi
    fi
else
    echo -e "${YELLOW}[4/4] Skipping App Service configuration (no app service name provided)${NC}"
fi

# Summary
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Azure OpenAI Provisioning Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "OpenAI Resource: ${YELLOW}${OPENAI_NAME}${NC}"
echo -e "Endpoint: ${YELLOW}${OPENAI_ENDPOINT}${NC}"
echo -e "Deployment: ${YELLOW}${DEPLOYMENT_NAME}${NC}"
echo -e "Model: ${YELLOW}${MODEL_NAME}${NC}"
echo ""
echo -e "${YELLOW}Secrets stored in Key Vault:${NC}"
echo -e "  - AzureAiFoundryEndpoint"
echo -e "  - AzureAiFoundryApiKey"
echo -e "  - AzureAiFoundryDeployment"
echo ""

if [ -z "${APP_SERVICE}" ]; then
    echo -e "${YELLOW}To configure App Service manually, run:${NC}"
    echo "az webapp config appsettings set \\"
    echo "  --resource-group ${RESOURCE_GROUP} \\"
    echo "  --name <app-service-name> \\"
    echo "  --settings \\"
    echo "    'AZURE_AI_FOUNDRY_ENDPOINT=@Microsoft.KeyVault(SecretUri=https://${KEY_VAULT}.vault.azure.net/secrets/AzureAiFoundryEndpoint/)' \\"
    echo "    'AZURE_AI_FOUNDRY_API_KEY=@Microsoft.KeyVault(SecretUri=https://${KEY_VAULT}.vault.azure.net/secrets/AzureAiFoundryApiKey/)' \\"
    echo "    'AZURE_AI_FOUNDRY_DEPLOYMENT=${DEPLOYMENT_NAME}' \\"
    echo "    'AZURE_AI_FOUNDRY_API_VERSION=latest'"
    echo ""
fi

echo -e "${YELLOW}For local development, add to .env.local:${NC}"
echo "AZURE_AI_FOUNDRY_ENDPOINT=${OPENAI_ENDPOINT}"
echo "AZURE_AI_FOUNDRY_API_KEY=${OPENAI_KEY1}"
echo "AZURE_AI_FOUNDRY_DEPLOYMENT=${DEPLOYMENT_NAME}"
echo "AZURE_AI_FOUNDRY_API_VERSION=latest"
echo ""

