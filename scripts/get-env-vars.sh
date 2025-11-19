#!/bin/bash

# Script to retrieve environment variables from Azure Key Vault
# Useful for local development or generating .env files
#
# Usage:
#   ./scripts/get-env-vars.sh <resource-group> <key-vault-name> > .env.local

set -e

RESOURCE_GROUP=${1:-""}
KEY_VAULT=${2:-""}

if [ -z "$RESOURCE_GROUP" ] || [ -z "$KEY_VAULT" ]; then
    echo "Usage: ./scripts/get-env-vars.sh <resource-group> <key-vault-name>"
    exit 1
fi

# Get secrets from Key Vault
STORAGE_CONN=$(az keyvault secret show --vault-name "${KEY_VAULT}" --name "StorageConnectionString" --query value -o tsv)
COSMOS_ENDPOINT=$(az keyvault secret show --vault-name "${KEY_VAULT}" --name "CosmosEndpoint" --query value -o tsv)
COSMOS_KEY=$(az keyvault secret show --vault-name "${KEY_VAULT}" --name "CosmosKey" --query value -o tsv)
SEARCH_ENDPOINT=$(az keyvault secret show --vault-name "${KEY_VAULT}" --name "SearchEndpoint" --query value -o tsv)
SEARCH_API_KEY=$(az keyvault secret show --vault-name "${KEY_VAULT}" --name "SearchApiKey" --query value -o tsv)

# Get AI Foundry secrets (may not exist)
AI_FOUNDRY_ENDPOINT=$(az keyvault secret show --vault-name "${KEY_VAULT}" --name "AzureAiFoundryEndpoint" --query value -o tsv 2>/dev/null || echo "")
AI_FOUNDRY_KEY=$(az keyvault secret show --vault-name "${KEY_VAULT}" --name "AzureAiFoundryApiKey" --query value -o tsv 2>/dev/null || echo "")

# Output .env format
echo "# Azure Storage"
echo "AZURE_STORAGE_CONNECTION_STRING=${STORAGE_CONN}"
echo "AZURE_STORAGE_CONTAINER=presentations"
echo "AZURE_STORAGE_TEMPLATES_CONTAINER=templates"
echo ""
echo "# Azure Cosmos DB"
echo "AZURE_COSMOS_ENDPOINT=${COSMOS_ENDPOINT}"
echo "AZURE_COSMOS_KEY=${COSMOS_KEY}"
echo "AZURE_COSMOS_DATABASE=deck-builder"
echo ""
echo "# Azure AI Search"
echo "AZURE_SEARCH_ENDPOINT=${SEARCH_ENDPOINT}"
echo "AZURE_SEARCH_API_KEY=${SEARCH_API_KEY}"
echo "AZURE_SEARCH_INDEX=knowledge-base"
echo ""

if [ -n "$AI_FOUNDRY_ENDPOINT" ] && [ -n "$AI_FOUNDRY_KEY" ]; then
    echo "# Azure AI Foundry"
    echo "AZURE_AI_FOUNDRY_ENDPOINT=${AI_FOUNDRY_ENDPOINT}"
    echo "AZURE_AI_FOUNDRY_API_KEY=${AI_FOUNDRY_KEY}"
    echo "AZURE_AI_FOUNDRY_DEPLOYMENT=gpt-4"
fi

