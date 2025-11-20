#!/bin/bash

# Helper script to create App Service Plan and App Service
# Use this if the main provisioning script failed due to throttling
#
# Usage:
#   ./scripts/create-app-service.sh <resource-group> <app-service-plan-name> <app-service-name> <location> <key-vault-name>
#   Example: ./scripts/create-app-service.sh rg-ai-deck-builder plan-ai-deck-b-dev-123456 app-ai-deck-b-dev-123456 eastus kv-ai-deck-b-dev-123456

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check parameters
RESOURCE_GROUP=${1}
APP_SERVICE_PLAN=${2}
APP_SERVICE=${3}
LOCATION=${4}
KEY_VAULT=${5}

if [ -z "${RESOURCE_GROUP}" ] || [ -z "${APP_SERVICE_PLAN}" ] || [ -z "${APP_SERVICE}" ] || [ -z "${LOCATION}" ] || [ -z "${KEY_VAULT}" ]; then
    echo -e "${RED}Error: Missing required parameters${NC}"
    echo "Usage: $0 <resource-group> <app-service-plan-name> <app-service-name> <location> <key-vault-name>"
    exit 1
fi

echo -e "${GREEN}Creating App Service Plan and App Service...${NC}"
echo -e "Resource Group: ${YELLOW}${RESOURCE_GROUP}${NC}"
echo -e "App Service Plan: ${YELLOW}${APP_SERVICE_PLAN}${NC}"
echo -e "App Service: ${YELLOW}${APP_SERVICE}${NC}"
echo ""

# Check if App Service Plan exists
if az appservice plan show --resource-group "${RESOURCE_GROUP}" --name "${APP_SERVICE_PLAN}" &> /dev/null; then
    echo -e "${YELLOW}⚠ App Service Plan already exists. Skipping creation.${NC}"
else
    echo -e "${GREEN}Creating App Service Plan...${NC}"
    az appservice plan create \
        --resource-group "${RESOURCE_GROUP}" \
        --name "${APP_SERVICE_PLAN}" \
        --location "${LOCATION}" \
        --sku B1 \
        --is-linux \
        --output none
    echo -e "${GREEN}✓ App Service Plan created${NC}"
fi

# Check if App Service exists
if az webapp show --resource-group "${RESOURCE_GROUP}" --name "${APP_SERVICE}" &> /dev/null; then
    echo -e "${YELLOW}⚠ App Service already exists. Skipping creation.${NC}"
else
    echo -e "${GREEN}Creating App Service...${NC}"
    az webapp create \
        --resource-group "${RESOURCE_GROUP}" \
        --plan "${APP_SERVICE_PLAN}" \
        --name "${APP_SERVICE}" \
        --runtime "NODE:20-lts" \
        --output none
    echo -e "${GREEN}✓ App Service created${NC}"
fi

# Enable managed identity
echo -e "${GREEN}Enabling Managed Identity...${NC}"
PRINCIPAL_ID=$(az webapp identity assign \
    --resource-group "${RESOURCE_GROUP}" \
    --name "${APP_SERVICE}" \
    --query principalId -o tsv)

# Grant Key Vault access
echo -e "${GREEN}Granting Key Vault access to App Service...${NC}"
SUBSCRIPTION_ID=$(az account show --query id -o tsv)
KEY_VAULT_SCOPE="/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RESOURCE_GROUP}/providers/Microsoft.KeyVault/vaults/${KEY_VAULT}"

KEY_VAULT_RBAC=$(az keyvault show \
    --name "${KEY_VAULT}" \
    --resource-group "${RESOURCE_GROUP}" \
    --query properties.enableRbacAuthorization -o tsv 2>/dev/null || echo "true")

if [ "${KEY_VAULT_RBAC}" = "true" ]; then
    az role assignment create \
        --role "Key Vault Secrets User" \
        --assignee "${PRINCIPAL_ID}" \
        --scope "${KEY_VAULT_SCOPE}" \
        --output none
    echo -e "${GREEN}✓ RBAC role assigned${NC}"
else
    az keyvault set-policy \
        --name "${KEY_VAULT}" \
        --object-id "${PRINCIPAL_ID}" \
        --secret-permissions get list \
        --output none
    echo -e "${GREEN}✓ Access policy set${NC}"
fi

# Configure App Service settings
echo -e "${GREEN}Configuring App Service settings...${NC}"
az webapp config appsettings set \
    --resource-group "${RESOURCE_GROUP}" \
    --name "${APP_SERVICE}" \
    --settings \
        "AZURE_STORAGE_CONNECTION_STRING=@Microsoft.KeyVault(SecretUri=https://${KEY_VAULT}.vault.azure.net/secrets/StorageConnectionString/)" \
        "AZURE_STORAGE_CONTAINER=presentations" \
        "AZURE_STORAGE_TEMPLATES_CONTAINER=templates" \
        "AZURE_COSMOS_ENDPOINT=@Microsoft.KeyVault(SecretUri=https://${KEY_VAULT}.vault.azure.net/secrets/CosmosEndpoint/)" \
        "AZURE_COSMOS_KEY=@Microsoft.KeyVault(SecretUri=https://${KEY_VAULT}.vault.azure.net/secrets/CosmosKey/)" \
        "AZURE_COSMOS_DATABASE=deck-builder" \
        "AZURE_SEARCH_ENDPOINT=@Microsoft.KeyVault(SecretUri=https://${KEY_VAULT}.vault.azure.net/secrets/SearchEndpoint/)" \
        "AZURE_SEARCH_API_KEY=@Microsoft.KeyVault(SecretUri=https://${KEY_VAULT}.vault.azure.net/secrets/SearchApiKey/)" \
        "AZURE_SEARCH_INDEX=knowledge-base" \
        "NODE_ENV=production" \
        "WEBSITE_NODE_DEFAULT_VERSION=~20" \
    --output none

# Configure startup command
az webapp config set \
    --resource-group "${RESOURCE_GROUP}" \
    --name "${APP_SERVICE}" \
    --startup-file "node server.js" \
    --output none

echo -e "${GREEN}✓ App Service configured${NC}"
echo ""
echo -e "${GREEN}App Service URL: https://${APP_SERVICE}.azurewebsites.net${NC}"

