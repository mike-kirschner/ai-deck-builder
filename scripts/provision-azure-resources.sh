#!/bin/bash

# Azure Resource Provisioning Script for AI Deck Builder
# This script creates all necessary Azure resources for the application
# 
# Usage:
#   ./scripts/provision-azure-resources.sh <resource-group-name> <location> <environment> [inbound-access]
#   Example: ./scripts/provision-azure-resources.sh rg-ai-deck-builder eastus prod
#   Example: ./scripts/provision-azure-resources.sh rg-ai-deck-builder eastus prod private
#
# Parameters:
#   resource-group-name: Name for the Azure resource group
#   location: Azure region (e.g., eastus, westus2)
#   environment: Environment name (e.g., dev, staging, prod)
#   inbound-access: (optional) "public" (default) or "private" for App Service network access

# Note: We don't use 'set -e' because we want to handle throttling errors gracefully
# Instead, we check exit codes explicitly for critical operations

# Note: Azure CLI may show deprecation warnings (e.g., 'vnet_route_all_enabled')
# These are harmless and can be safely ignored - they're internal SDK attributes

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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
RESOURCE_GROUP=${1:-"rg-ai-deck-builder"}
LOCATION=${2:-"eastus"}
ENVIRONMENT=${3:-"dev"}
INBOUND_ACCESS=${4:-"public"}  # Options: "public" (default) or "private"

# Generate unique names (Azure requires globally unique names for some resources)
TIMESTAMP=$(date +%s)
UNIQUE_SUFFIX="${ENVIRONMENT}-${TIMESTAMP: -6}"
APP_NAME="ai-deck-b-${UNIQUE_SUFFIX}"
STORAGE_ACCOUNT="st${APP_NAME//-/}"
COSMOS_ACCOUNT="cosmos-${APP_NAME}"
SEARCH_SERVICE="search-${APP_NAME}"
KEY_VAULT="kv-${APP_NAME}"
APP_SERVICE_PLAN="plan-${APP_NAME}"
APP_SERVICE="app-${APP_NAME}"

# Initialize flags for error handling
SKIP_APP_SERVICE=false
SKIP_APP_SERVICE_CONFIG=false

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Azure Resource Provisioning${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "Resource Group: ${YELLOW}${RESOURCE_GROUP}${NC}"
echo -e "Location: ${YELLOW}${LOCATION}${NC}"
echo -e "Environment: ${YELLOW}${ENVIRONMENT}${NC}"
echo -e "Inbound Access: ${YELLOW}${INBOUND_ACCESS}${NC}"
echo -e "App Name: ${YELLOW}${APP_NAME}${NC}"
echo ""

# Confirm before proceeding
read -p "Do you want to proceed? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 1
fi

# Step 1: Create Resource Group
echo -e "${GREEN}[1/10] Creating Resource Group...${NC}"
az group create \
    --name "${RESOURCE_GROUP}" \
    --location "${LOCATION}" \
    --output none
echo -e "${GREEN}✓ Resource Group created${NC}"

# Step 2: Create Storage Account
echo -e "${GREEN}[2/10] Creating Storage Account...${NC}"
az storage account create \
    --resource-group "${RESOURCE_GROUP}" \
    --name "${STORAGE_ACCOUNT}" \
    --location "${LOCATION}" \
    --sku Standard_LRS \
    --kind StorageV2 \
    --access-tier Hot \
    --https-only true \
    --output none
echo -e "${GREEN}✓ Storage Account created${NC}"

# Get storage connection string
STORAGE_CONNECTION_STRING=$(az storage account show-connection-string \
    --resource-group "${RESOURCE_GROUP}" \
    --name "${STORAGE_ACCOUNT}" \
    --query connectionString -o tsv)

# Step 3: Create Blob Containers
echo -e "${GREEN}[3/10] Creating Blob Containers...${NC}"
az storage container create \
    --name "presentations" \
    --connection-string "${STORAGE_CONNECTION_STRING}" \
    --public-access off \
    --output none

az storage container create \
    --name "templates" \
    --connection-string "${STORAGE_CONNECTION_STRING}" \
    --public-access off \
    --output none

az storage container create \
    --name "knowledge-base" \
    --connection-string "${STORAGE_CONNECTION_STRING}" \
    --public-access off \
    --output none

echo -e "${GREEN}✓ Blob Containers created${NC}"

# Step 4: Create Cosmos DB Account
echo -e "${GREEN}[4/10] Creating Cosmos DB Account...${NC}"
az cosmosdb create \
    --resource-group "${RESOURCE_GROUP}" \
    --name "${COSMOS_ACCOUNT}" \
    --locations regionName="${LOCATION}" failoverPriority=0 \
    --default-consistency-level Session \
    --output none
echo -e "${GREEN}✓ Cosmos DB Account created${NC}"

# Get Cosmos DB keys
COSMOS_ENDPOINT=$(az cosmosdb show \
    --resource-group "${RESOURCE_GROUP}" \
    --name "${COSMOS_ACCOUNT}" \
    --query documentEndpoint -o tsv)

COSMOS_KEY=$(az cosmosdb keys list \
    --resource-group "${RESOURCE_GROUP}" \
    --name "${COSMOS_ACCOUNT}" \
    --query primaryMasterKey -o tsv)

# Step 5: Create Cosmos DB Database and Containers
echo -e "${GREEN}[5/10] Creating Cosmos DB Database and Containers...${NC}"
az cosmosdb sql database create \
    --resource-group "${RESOURCE_GROUP}" \
    --account-name "${COSMOS_ACCOUNT}" \
    --name "deck-builder" \
    --output none

# Create containers with partition keys
az cosmosdb sql container create \
    --resource-group "${RESOURCE_GROUP}" \
    --account-name "${COSMOS_ACCOUNT}" \
    --database-name "deck-builder" \
    --name "presentations" \
    --partition-key-path "/id" \
    --throughput 400 \
    --output none

az cosmosdb sql container create \
    --resource-group "${RESOURCE_GROUP}" \
    --account-name "${COSMOS_ACCOUNT}" \
    --database-name "deck-builder" \
    --name "templates" \
    --partition-key-path "/id" \
    --throughput 400 \
    --output none

az cosmosdb sql container create \
    --resource-group "${RESOURCE_GROUP}" \
    --account-name "${COSMOS_ACCOUNT}" \
    --database-name "deck-builder" \
    --name "knowledge-base" \
    --partition-key-path "/id" \
    --throughput 400 \
    --output none

echo -e "${GREEN}✓ Cosmos DB Database and Containers created${NC}"

# Step 6: Create Azure AI Search Service
echo -e "${GREEN}[6/10] Creating Azure AI Search Service...${NC}"
az search service create \
    --resource-group "${RESOURCE_GROUP}" \
    --name "${SEARCH_SERVICE}" \
    --location "${LOCATION}" \
    --sku Basic \
    --partition-count 1 \
    --replica-count 1 \
    --output none
echo -e "${GREEN}✓ Azure AI Search Service created${NC}"

# Get Search Service keys
SEARCH_ENDPOINT="https://${SEARCH_SERVICE}.search.windows.net"
SEARCH_API_KEY=$(az search admin-key show \
    --resource-group "${RESOURCE_GROUP}" \
    --service-name "${SEARCH_SERVICE}" \
    --query primaryKey -o tsv)

# Note: Index creation requires REST API or SDK, will be done separately
echo -e "${YELLOW}⚠ Note: Azure AI Search index 'knowledge-base' needs to be created separately${NC}"
echo -e "${YELLOW}   Use the Azure Portal or the provided index creation script${NC}"

# Step 7: Create Key Vault
echo -e "${GREEN}[7/10] Creating Key Vault...${NC}"
az keyvault create \
    --resource-group "${RESOURCE_GROUP}" \
    --name "${KEY_VAULT}" \
    --location "${LOCATION}" \
    --sku standard \
    --output none
echo -e "${GREEN}✓ Key Vault created${NC}"

# Grant current user access to Key Vault
echo -e "${GREEN}Granting Key Vault access to current user...${NC}"
CURRENT_USER_OBJECT_ID=$(az ad signed-in-user show --query id -o tsv)
SUBSCRIPTION_ID=$(az account show --query id -o tsv)
KEY_VAULT_SCOPE="/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RESOURCE_GROUP}/providers/Microsoft.KeyVault/vaults/${KEY_VAULT}"

# Check if Key Vault uses RBAC or access policy model
KEY_VAULT_RBAC=$(az keyvault show \
    --name "${KEY_VAULT}" \
    --resource-group "${RESOURCE_GROUP}" \
    --query properties.enableRbacAuthorization -o tsv 2>/dev/null || echo "true")

RBAC_ROLE_ASSIGNED=false

if [ "${KEY_VAULT_RBAC}" = "true" ]; then
    # Key Vault uses RBAC - assign RBAC role
    echo -e "${GREEN}Key Vault uses RBAC authorization, assigning role...${NC}"
    
    # Check if role assignment already exists
    EXISTING_ROLE=$(az role assignment list \
        --scope "${KEY_VAULT_SCOPE}" \
        --assignee "${CURRENT_USER_OBJECT_ID}" \
        --role "Key Vault Secrets Officer" \
        --query "[].id" -o tsv 2>/dev/null)
    
    if [ -n "${EXISTING_ROLE}" ]; then
        echo -e "${GREEN}✓ RBAC role already assigned${NC}"
        RBAC_ROLE_ASSIGNED=true
    else
        # Try to create role assignment
        if az role assignment create \
            --role "Key Vault Secrets Officer" \
            --assignee "${CURRENT_USER_OBJECT_ID}" \
            --scope "${KEY_VAULT_SCOPE}" \
            --output none 2>&1; then
            echo -e "${GREEN}✓ RBAC role assigned${NC}"
            RBAC_ROLE_ASSIGNED=true
        else
            echo -e "${RED}⚠ Could not assign RBAC role. You may need 'User Access Administrator' role or subscription admin help.${NC}"
            echo -e "${YELLOW}Run this command manually (requires appropriate permissions):${NC}"
            echo "az role assignment create --role 'Key Vault Secrets Officer' --assignee ${CURRENT_USER_OBJECT_ID} --scope '${KEY_VAULT_SCOPE}'"
            echo ""
            echo -e "${YELLOW}Or ask a subscription administrator to grant you the 'Key Vault Secrets Officer' role.${NC}"
            echo -e "${RED}The script will continue but may fail when storing secrets.${NC}"
        fi
    fi
else
    # Key Vault uses access policy - set access policy
    echo -e "${GREEN}Key Vault uses access policy model, setting access policy...${NC}"
    if az keyvault set-policy \
        --name "${KEY_VAULT}" \
        --object-id "${CURRENT_USER_OBJECT_ID}" \
        --secret-permissions get list set delete recover backup restore \
        --output none 2>/dev/null; then
        echo -e "${GREEN}✓ Access policy set${NC}"
        RBAC_ROLE_ASSIGNED=true
    else
        echo -e "${RED}⚠ Could not set access policy. You may need to manually grant access.${NC}"
        echo -e "${YELLOW}Run this command manually:${NC}"
        echo "az keyvault set-policy --name ${KEY_VAULT} --object-id ${CURRENT_USER_OBJECT_ID} --secret-permissions get list set delete recover backup restore"
    fi
fi

# Wait for permissions to propagate (longer wait for RBAC)
if [ "${RBAC_ROLE_ASSIGNED}" = "true" ]; then
    echo -e "${GREEN}Waiting for permissions to propagate (this may take up to 30 seconds)...${NC}"
    sleep 10
    
    # Verify access by trying to list secrets (read-only operation)
    if az keyvault secret list --vault-name "${KEY_VAULT}" --output none 2>/dev/null; then
        echo -e "${GREEN}✓ Permissions verified${NC}"
    else
        echo -e "${YELLOW}⚠ Permissions may still be propagating. Waiting additional time...${NC}"
        sleep 20
    fi
else
    echo -e "${YELLOW}⚠ Skipping permission verification - role assignment failed${NC}"
fi

# Step 8: Store Secrets in Key Vault
echo -e "${GREEN}[8/10] Storing Secrets in Key Vault...${NC}"

if [ "${RBAC_ROLE_ASSIGNED}" = "false" ]; then
    echo -e "${RED}⚠ Cannot store secrets - role assignment failed.${NC}"
    echo -e "${YELLOW}Please grant yourself access first, then run these commands manually:${NC}"
    echo ""
    echo "az keyvault secret set --vault-name ${KEY_VAULT} --name StorageConnectionString --value '${STORAGE_CONNECTION_STRING}'"
    echo "az keyvault secret set --vault-name ${KEY_VAULT} --name CosmosEndpoint --value '${COSMOS_ENDPOINT}'"
    echo "az keyvault secret set --vault-name ${KEY_VAULT} --name CosmosKey --value '${COSMOS_KEY}'"
    echo "az keyvault secret set --vault-name ${KEY_VAULT} --name SearchEndpoint --value '${SEARCH_ENDPOINT}'"
    echo "az keyvault secret set --vault-name ${KEY_VAULT} --name SearchApiKey --value '${SEARCH_API_KEY}'"
    echo ""
    echo -e "${YELLOW}Or grant access and re-run the script.${NC}"
else
    # Try to store secrets, with error handling
    SECRETS_STORED=true
    
    if ! az keyvault secret set \
        --vault-name "${KEY_VAULT}" \
        --name "StorageConnectionString" \
        --value "${STORAGE_CONNECTION_STRING}" \
        --output none 2>/dev/null; then
        echo -e "${RED}✗ Failed to store StorageConnectionString${NC}"
        SECRETS_STORED=false
    fi
    
    if ! az keyvault secret set \
        --vault-name "${KEY_VAULT}" \
        --name "CosmosEndpoint" \
        --value "${COSMOS_ENDPOINT}" \
        --output none 2>/dev/null; then
        echo -e "${RED}✗ Failed to store CosmosEndpoint${NC}"
        SECRETS_STORED=false
    fi
    
    if ! az keyvault secret set \
        --vault-name "${KEY_VAULT}" \
        --name "CosmosKey" \
        --value "${COSMOS_KEY}" \
        --output none 2>/dev/null; then
        echo -e "${RED}✗ Failed to store CosmosKey${NC}"
        SECRETS_STORED=false
    fi
    
    if ! az keyvault secret set \
        --vault-name "${KEY_VAULT}" \
        --name "SearchEndpoint" \
        --value "${SEARCH_ENDPOINT}" \
        --output none 2>/dev/null; then
        echo -e "${RED}✗ Failed to store SearchEndpoint${NC}"
        SECRETS_STORED=false
    fi
    
    if ! az keyvault secret set \
        --vault-name "${KEY_VAULT}" \
        --name "SearchApiKey" \
        --value "${SEARCH_API_KEY}" \
        --output none 2>/dev/null; then
        echo -e "${RED}✗ Failed to store SearchApiKey${NC}"
        SECRETS_STORED=false
    fi
    
    if [ "${SECRETS_STORED}" = "true" ]; then
        echo -e "${GREEN}✓ Secrets stored in Key Vault${NC}"
    else
        echo -e "${RED}⚠ Some secrets failed to store. Permissions may still be propagating.${NC}"
        echo -e "${YELLOW}Wait 30-60 seconds and try storing secrets manually using the commands above.${NC}"
    fi
fi

# Step 9: Create App Service Plan
echo -e "${GREEN}[9/10] Creating App Service Plan...${NC}"

# Check if App Service Plan already exists
if az appservice plan show --resource-group "${RESOURCE_GROUP}" --name "${APP_SERVICE_PLAN}" &> /dev/null; then
    echo -e "${YELLOW}⚠ App Service Plan '${APP_SERVICE_PLAN}' already exists. Using existing plan.${NC}"
    APP_SERVICE_PLAN_EXISTS=true
else
    # Retry logic for throttling
    MAX_RETRIES=3
    RETRY_DELAY=60  # Start with 60 seconds
    RETRY_COUNT=0
    APP_SERVICE_PLAN_EXISTS=false
    
    while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
        ERROR_OUTPUT=$(az appservice plan create \
            --resource-group "${RESOURCE_GROUP}" \
            --name "${APP_SERVICE_PLAN}" \
            --location "${LOCATION}" \
            --sku B1 \
            --is-linux \
            --output none 2>&1 || echo "ERROR:$?")
        
        EXIT_CODE=$?
        
        if [ $EXIT_CODE -eq 0 ]; then
            echo -e "${GREEN}✓ App Service Plan created${NC}"
            APP_SERVICE_PLAN_EXISTS=true
            break
        else
            if echo "${ERROR_OUTPUT}" | grep -qi "throttl"; then
                RETRY_COUNT=$((RETRY_COUNT + 1))
                if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
                    echo -e "${YELLOW}⚠ Throttling error detected. Waiting ${RETRY_DELAY} seconds before retry ${RETRY_COUNT}/${MAX_RETRIES}...${NC}"
                    sleep $RETRY_DELAY
                    RETRY_DELAY=$((RETRY_DELAY * 2))  # Exponential backoff
                else
                    echo -e "${RED}✗ Failed to create App Service Plan after ${MAX_RETRIES} retries due to throttling${NC}"
                    echo -e "${YELLOW}You can create it manually later with:${NC}"
                    echo "az appservice plan create \\"
                    echo "  --resource-group ${RESOURCE_GROUP} \\"
                    echo "  --name ${APP_SERVICE_PLAN} \\"
                    echo "  --location ${LOCATION} \\"
                    echo "  --sku B1 \\"
                    echo "  --is-linux"
                    echo ""
                    echo -e "${YELLOW}Or wait 10-15 minutes and run this script again (it will skip already created resources).${NC}"
                    echo -e "${YELLOW}Continuing with other resources...${NC}"
                    SKIP_APP_SERVICE=true
                    break
                fi
            else
                # Non-throttling error
                echo -e "${RED}✗ Failed to create App Service Plan: ${ERROR_OUTPUT}${NC}"
                SKIP_APP_SERVICE=true
                break
            fi
        fi
    done
fi

# Step 10: Create App Service
if [ "${SKIP_APP_SERVICE}" = "true" ]; then
    echo -e "${YELLOW}[10/10] Skipping App Service creation (App Service Plan creation failed)${NC}"
    echo -e "${YELLOW}You can create the App Service manually after creating the App Service Plan.${NC}"
else
    echo -e "${GREEN}[10/10] Creating App Service...${NC}"
    # Note: You may see a deprecation warning about 'vnet_route_all_enabled' - this is harmless
    # and can be safely ignored. It's an internal Azure SDK attribute that's no longer used.

    # Configure inbound access based on parameter
    if [ "${INBOUND_ACCESS}" = "private" ]; then
        echo -e "${YELLOW}⚠ Private endpoint access selected. You'll need to configure VNet integration separately.${NC}"
        echo -e "${YELLOW}   Creating App Service with public access first (can be restricted later).${NC}"
    fi

    # Check if App Service already exists
    if az webapp show --resource-group "${RESOURCE_GROUP}" --name "${APP_SERVICE}" &> /dev/null; then
        echo -e "${YELLOW}⚠ App Service '${APP_SERVICE}' already exists. Skipping creation.${NC}"
    else
        if az webapp create \
            --resource-group "${RESOURCE_GROUP}" \
            --plan "${APP_SERVICE_PLAN}" \
            --name "${APP_SERVICE}" \
            --runtime "NODE:20-lts" \
            --output none 2>&1; then
            echo -e "${GREEN}✓ App Service created${NC}"
        else
            echo -e "${RED}✗ Failed to create App Service${NC}"
            echo -e "${YELLOW}You can create it manually later with:${NC}"
            echo "az webapp create \\"
            echo "  --resource-group ${RESOURCE_GROUP} \\"
            echo "  --plan ${APP_SERVICE_PLAN} \\"
            echo "  --name ${APP_SERVICE} \\"
            echo "  --runtime NODE:20-lts"
            SKIP_APP_SERVICE_CONFIG=true
        fi
    fi
fi

# Configure public network access if private endpoint is desired
if [ "${INBOUND_ACCESS}" = "private" ]; then
    echo -e "${GREEN}Configuring App Service for private access...${NC}"
    echo -e "${YELLOW}Note: To fully enable private access, you'll need to:${NC}"
    echo -e "${YELLOW}  1. Create a VNet and subnet${NC}"
    echo -e "${YELLOW}  2. Create a private endpoint for the App Service${NC}"
    echo -e "${YELLOW}  3. Configure VNet integration${NC}"
    echo -e "${YELLOW}  4. Disable public network access${NC}"
    echo -e "${YELLOW}  See: https://learn.microsoft.com/en-us/azure/app-service/networking/private-endpoint${NC}"
fi

# Enable managed identity (only if App Service was created)
if [ "${SKIP_APP_SERVICE}" != "true" ] && [ "${SKIP_APP_SERVICE_CONFIG}" != "true" ]; then
    echo -e "${GREEN}Enabling Managed Identity...${NC}"
    PRINCIPAL_ID=$(az webapp identity assign \
        --resource-group "${RESOURCE_GROUP}" \
        --name "${APP_SERVICE}" \
        --query principalId -o tsv 2>/dev/null || echo "")
    
    if [ -z "${PRINCIPAL_ID}" ]; then
        echo -e "${YELLOW}⚠ Failed to enable managed identity. You may need to do this manually.${NC}"
        SKIP_APP_SERVICE_CONFIG=true
    fi
fi

# Grant Key Vault access to App Service managed identity (only if App Service was created)
if [ "${SKIP_APP_SERVICE}" != "true" ] && [ "${SKIP_APP_SERVICE_CONFIG}" != "true" ] && [ -n "${PRINCIPAL_ID}" ]; then
    echo -e "${GREEN}Granting Key Vault access to App Service...${NC}"

    # Reconstruct Key Vault scope (in case variables aren't available)
    SUBSCRIPTION_ID_APP=$(az account show --query id -o tsv)
    KEY_VAULT_SCOPE_APP="/subscriptions/${SUBSCRIPTION_ID_APP}/resourceGroups/${RESOURCE_GROUP}/providers/Microsoft.KeyVault/vaults/${KEY_VAULT}"

    # Check if Key Vault uses RBAC
    KEY_VAULT_RBAC_APP=$(az keyvault show \
        --name "${KEY_VAULT}" \
        --resource-group "${RESOURCE_GROUP}" \
        --query properties.enableRbacAuthorization -o tsv 2>/dev/null || echo "true")

    if [ "${KEY_VAULT_RBAC_APP}" = "true" ]; then
        # Use RBAC role assignment for App Service managed identity
        echo -e "${GREEN}Assigning RBAC role to App Service managed identity...${NC}"
        if az role assignment create \
            --role "Key Vault Secrets User" \
            --assignee "${PRINCIPAL_ID}" \
            --scope "${KEY_VAULT_SCOPE_APP}" \
            --output none 2>/dev/null; then
            echo -e "${GREEN}✓ RBAC role assigned to App Service${NC}"
        else
            echo -e "${YELLOW}⚠ Could not assign RBAC role to App Service. You may need to do this manually:${NC}"
            echo "az role assignment create --role 'Key Vault Secrets User' --assignee ${PRINCIPAL_ID} --scope '${KEY_VAULT_SCOPE_APP}'"
        fi
    else
        # Use access policy for App Service managed identity
        echo -e "${GREEN}Setting access policy for App Service...${NC}"
        if az keyvault set-policy \
            --name "${KEY_VAULT}" \
            --object-id "${PRINCIPAL_ID}" \
            --secret-permissions get list \
            --output none 2>/dev/null; then
            echo -e "${GREEN}✓ Access policy set for App Service${NC}"
        else
            echo -e "${YELLOW}⚠ Could not set access policy for App Service. You may need to do this manually:${NC}"
            echo "az keyvault set-policy --name ${KEY_VAULT} --object-id ${PRINCIPAL_ID} --secret-permissions get list"
        fi
    fi

    # Configure App Service settings
    echo -e "${GREEN}Configuring App Service settings...${NC}"
    if az webapp config appsettings set \
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
        --output none 2>/dev/null; then
        echo -e "${GREEN}✓ App Service settings configured${NC}"
    else
        echo -e "${YELLOW}⚠ Failed to configure App Service settings${NC}"
    fi

    # Configure startup command for Next.js standalone mode
    # For standalone builds, use 'node server.js' instead of 'npm start'
    if az webapp config set \
        --resource-group "${RESOURCE_GROUP}" \
        --name "${APP_SERVICE}" \
        --startup-file "node server.js" \
        --output none 2>/dev/null; then
        echo -e "${GREEN}✓ App Service startup command configured${NC}"
    else
        echo -e "${YELLOW}⚠ Failed to configure startup command${NC}"
    fi

    echo -e "${GREEN}✓ App Service created and configured${NC}"
elif [ "${SKIP_APP_SERVICE}" = "true" ]; then
    echo -e "${YELLOW}⚠ App Service configuration skipped (App Service Plan creation failed)${NC}"
fi

# Summary
echo ""
echo -e "${GREEN}========================================${NC}"
if [ "${SKIP_APP_SERVICE}" = "true" ]; then
    echo -e "${YELLOW}Provisioning Mostly Complete (App Service skipped)${NC}"
else
    echo -e "${GREEN}Provisioning Complete!${NC}"
fi
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "Resource Group: ${YELLOW}${RESOURCE_GROUP}${NC}"
if [ "${SKIP_APP_SERVICE}" != "true" ]; then
    echo -e "App Service: ${YELLOW}https://${APP_SERVICE}.azurewebsites.net${NC}"
else
    echo -e "App Service: ${RED}Not created (throttling error)${NC}"
fi
echo -e "Storage Account: ${YELLOW}${STORAGE_ACCOUNT}${NC}"
echo -e "Cosmos DB: ${YELLOW}${COSMOS_ACCOUNT}${NC}"
echo -e "Search Service: ${YELLOW}${SEARCH_SERVICE}${NC}"
echo -e "Key Vault: ${YELLOW}${KEY_VAULT}${NC}"
echo ""

if [ "${SKIP_APP_SERVICE}" = "true" ]; then
    echo -e "${YELLOW}⚠ App Service Plan/App Service creation was skipped due to throttling.${NC}"
    echo -e "${YELLOW}To complete the setup, wait 10-15 minutes and run:${NC}"
    echo ""
    echo -e "${GREEN}Option 1: Use the helper script (recommended):${NC}"
    echo "./scripts/create-app-service.sh ${RESOURCE_GROUP} ${APP_SERVICE_PLAN} ${APP_SERVICE} ${LOCATION} ${KEY_VAULT}"
    echo ""
    echo -e "${GREEN}Option 2: Manual commands:${NC}"
    echo "# Create App Service Plan:"
    echo "az appservice plan create \\"
    echo "  --resource-group ${RESOURCE_GROUP} \\"
    echo "  --name ${APP_SERVICE_PLAN} \\"
    echo "  --location ${LOCATION} \\"
    echo "  --sku B1 \\"
    echo "  --is-linux"
    echo ""
    echo "# Create App Service:"
    echo "az webapp create \\"
    echo "  --resource-group ${RESOURCE_GROUP} \\"
    echo "  --plan ${APP_SERVICE_PLAN} \\"
    echo "  --name ${APP_SERVICE} \\"
    echo "  --runtime NODE:20-lts"
    echo ""
    echo "# Then run the helper script to configure everything:"
    echo "./scripts/create-app-service.sh ${RESOURCE_GROUP} ${APP_SERVICE_PLAN} ${APP_SERVICE} ${LOCATION} ${KEY_VAULT}"
    echo ""
fi
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Provision Azure OpenAI resource and deploy model:"
echo "   ./scripts/provision-azure-openai.sh ${RESOURCE_GROUP} ${LOCATION} ${KEY_VAULT} ${APP_SERVICE} gpt-35-turbo"
echo ""
echo "   Or manually set AZURE_AI_FOUNDRY_ENDPOINT and AZURE_AI_FOUNDRY_API_KEY in Key Vault:"
echo "   az keyvault secret set --vault-name ${KEY_VAULT} --name AzureAiFoundryEndpoint --value <your-endpoint>"
echo "   az keyvault secret set --vault-name ${KEY_VAULT} --name AzureAiFoundryApiKey --value <your-api-key>"
echo ""
echo "2. Create Azure AI Search index 'knowledge-base' (see scripts/create-search-index.sh)"
echo ""
echo "3. Deploy your application using the CI/CD pipeline or:"
echo "   az webapp deploy --resource-group ${RESOURCE_GROUP} --name ${APP_SERVICE} --src-path <your-zip-file> --type zip"
echo "   Or use the deployment script: ./scripts/deploy-to-azure.sh ${RESOURCE_GROUP} ${APP_SERVICE}"
echo ""

