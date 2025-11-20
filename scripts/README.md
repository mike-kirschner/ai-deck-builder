# Azure Resource Provisioning Scripts

This directory contains scripts to provision and configure Azure resources for the AI Deck Builder application.

## Prerequisites

1. **Azure CLI** installed and configured
   ```bash
   # Install Azure CLI (macOS)
   brew install azure-cli
   
   # Login to Azure
   az login
   
   # Set your subscription (if you have multiple)
   az account set --subscription "your-subscription-id"
   ```

2. **Required Azure Permissions**
   - Contributor role on the subscription or resource group
   - Ability to create resource groups, App Services, Storage Accounts, Cosmos DB, etc.
   - **Key Vault Access**: The script will attempt to grant you access to Key Vault automatically. If you encounter permission errors:
     - You may need "User Access Administrator" role to assign roles to yourself
     - Or have a subscription admin grant you "Key Vault Secrets Officer" role on the Key Vault
     - Alternatively, the script will provide a command to run manually if automatic assignment fails

## Quick Start

### 1. Provision All Resources

Run the main provisioning script:

```bash
chmod +x scripts/provision-azure-resources.sh
./scripts/provision-azure-resources.sh <resource-group-name> <location> <environment>
```

**Example:**
```bash
./scripts/provision-azure-resources.sh rg-ai-deck-builder eastus prod
```

**Parameters:**
- `resource-group-name`: Name for the Azure resource group (e.g., `rg-ai-deck-builder`)
- `location`: Azure region (e.g., `eastus`, `westus2`, `westeurope`)
- `environment`: Environment name (e.g., `dev`, `staging`, `prod`)

**What it creates:**
- Resource Group
- Storage Account with blob containers (presentations, templates, knowledge-base)
- Cosmos DB account with database and containers
- Azure AI Search service
- Key Vault for secrets management
- App Service Plan (Linux, B1 tier)
- App Service with managed identity
- All necessary configurations and permissions

### 2. Create Azure AI Search Index

After provisioning, create the search index:

```bash
chmod +x scripts/create-search-index.sh
./scripts/create-search-index.sh <resource-group> <search-service-name>
```

**Example:**
```bash
./scripts/create-search-index.sh rg-ai-deck-builder search-ai-deck-builder-dev-123456
```

### 3. Provision Azure OpenAI Resource and Deploy Model

**Option A: Use the automated script (Recommended)**

```bash
chmod +x scripts/provision-azure-openai.sh
./scripts/provision-azure-openai.sh <resource-group> <location> <key-vault-name> [app-service-name] [model-name]
```

**Example:**
```bash
./scripts/provision-azure-openai.sh rg-ai-deck-builder eastus kv-ai-deck-builder-dev-123456 app-ai-deck-builder-dev-123456 gpt-35-turbo
```

This script will:
- Create an Azure OpenAI resource
- Deploy the specified model (default: gpt-35-turbo)
- Store credentials in Key Vault
- Configure App Service settings (if app service name provided)

**Note on Model Availability:**
- `o4-mini` and `o1-mini` are **NOT available** in Azure OpenAI (they're only available in OpenAI directly)
- Common Azure OpenAI models: `gpt-35-turbo` (default, cost-effective), `gpt-4` (high quality), `gpt-4-turbo` (high quality, better performance)
- The script will check available models and warn you if your chosen model isn't available

**Note:** Azure OpenAI requires approval/access request. If you get an error:
1. Go to https://aka.ms/oai/access
2. Fill out the access request form
3. Wait for approval (can take 1-2 business days)

**If Model Deployment Fails:**
If the script fails to deploy the model automatically, you can deploy it manually:
1. **Via Azure Portal**: Go to your OpenAI resource → Model deployments → Create
2. **See detailed instructions**: `scripts/deploy-model-manual.md`
3. After manual deployment, re-run this script to configure Key Vault and App Service (it will detect the existing deployment)

**Option B: Manual setup**

If you already have an Azure OpenAI resource:

1. Store the endpoint and API key in Key Vault:
```bash
az keyvault secret set \
  --vault-name <your-key-vault-name> \
  --name AzureAiFoundryEndpoint \
  --value <your-endpoint>

az keyvault secret set \
  --vault-name <your-key-vault-name> \
  --name AzureAiFoundryApiKey \
  --value <your-api-key>
```

2. Add to App Service configuration:
```bash
az webapp config appsettings set \
  --resource-group <resource-group> \
  --name <app-service-name> \
  --settings \
    AZURE_AI_FOUNDRY_ENDPOINT=@Microsoft.KeyVault(SecretUri=https://<key-vault>.vault.azure.net/secrets/AzureAiFoundryEndpoint/) \
    AZURE_AI_FOUNDRY_API_KEY=@Microsoft.KeyVault(SecretUri=https://<key-vault>.vault.azure.net/secrets/AzureAiFoundryApiKey/) \
    AZURE_AI_FOUNDRY_DEPLOYMENT=gpt-35-turbo
```

## Resource Details

### Storage Account
- **Containers**: `presentations`, `templates`, `knowledge-base`
- **Access**: Private (no public access)
- **SKU**: Standard LRS

### Cosmos DB
- **Database**: `deck-builder`
- **Containers**: `presentations`, `templates`, `knowledge-base`
- **Partition Key**: `/id` for all containers
- **Throughput**: 400 RU/s per container (adjustable)

### Azure AI Search
- **Index**: `knowledge-base`
- **SKU**: Basic (1 partition, 1 replica)
- **Fields**: id, title, content, type, tags, created_at, created_by

### App Service
- **Runtime**: Node.js 20 LTS
- **Plan**: Linux, B1 (Basic tier)
- **Managed Identity**: Enabled with Key Vault access
- **Configuration**: All secrets reference Key Vault

### Key Vault
- **Secrets Stored**:
  - `StorageConnectionString`
  - `CosmosEndpoint`
  - `CosmosKey`
  - `SearchEndpoint`
  - `SearchApiKey`
  - `AzureAiFoundryEndpoint` (manual)
  - `AzureAiFoundryApiKey` (manual)

## Cost Considerations

**Estimated Monthly Costs (Basic Tier):**
- App Service Plan (B1): ~$13/month
- Storage Account (LRS): ~$0.02/GB/month
- Cosmos DB (400 RU/s): ~$24/month
- Azure AI Search (Basic): ~$75/month
- Key Vault: Free (first 10,000 operations)

**Total**: ~$112/month + storage and data transfer costs

**To reduce costs:**
- Use App Service Plan (F1) for development (free tier)
- Reduce Cosmos DB throughput when not in use
- Use Azure AI Search (Free) tier for development (limited to 50MB)

## CI/CD Setup

### GitHub Actions

1. Add the following secrets to your GitHub repository:
   - `AZURE_WEBAPP_NAME`: Your App Service name
   - `AZURE_RESOURCE_GROUP`: Your resource group name
   - `AZURE_WEBAPP_PUBLISH_PROFILE`: Get from Azure Portal → App Service → Get publish profile

2. The workflow file (`.github/workflows/azure-deploy.yml`) is already configured.

### Azure DevOps

1. Create a service connection to your Azure subscription
2. Update `azure-pipelines.yml` with:
   - Your Azure subscription connection name
   - App Service name
   - Resource group name
3. Configure pipeline variables in Azure DevOps:
   - All Azure connection strings and keys (for build-time validation)

## Troubleshooting

### Script fails with "name already exists"
Some Azure resources require globally unique names. The script generates unique names, but if you're re-running, you may need to:
- Use a different resource group name
- Or manually delete existing resources first

### Key Vault access denied when storing secrets

If you get a "Forbidden" error when the script tries to store secrets in Key Vault:

**First, check if your Key Vault uses RBAC or access policies:**
```bash
az keyvault show --name <key-vault-name> --resource-group <resource-group> --query properties.enableRbacAuthorization
```

**Option 1: If RBAC is enabled (returns `true`)**
```bash
# Get your user object ID
USER_OBJECT_ID=$(az ad signed-in-user show --query id -o tsv)
SUBSCRIPTION_ID=$(az account show --query id -o tsv)

# Grant access via RBAC role (requires User Access Administrator or subscription admin)
az role assignment create \
  --role "Key Vault Secrets Officer" \
  --assignee ${USER_OBJECT_ID} \
  --scope "/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/<resource-group>/providers/Microsoft.KeyVault/vaults/<key-vault-name>"
```

**Option 2: If RBAC is disabled (returns `false`)**
```bash
# Get your user object ID
USER_OBJECT_ID=$(az ad signed-in-user show --query id -o tsv)

# Grant access via access policy
az keyvault set-policy \
  --name <key-vault-name> \
  --object-id ${USER_OBJECT_ID} \
  --secret-permissions get list set delete recover backup restore
```

**Option 3: Ask subscription admin**
If you don't have permission to assign roles, have a subscription administrator grant you the "Key Vault Secrets Officer" role on the Key Vault resource.

**Option 4: Use a service principal**
If you're running in CI/CD, use a service principal with proper permissions instead of your user account.

### App Service can't access Key Vault
1. Verify managed identity is enabled:
   ```bash
   az webapp identity show --resource-group <rg> --name <app-name>
   ```
2. Grant the App Service managed identity access:
   ```bash
   APP_SERVICE_PRINCIPAL_ID=$(az webapp identity show --resource-group <rg> --name <app-name> --query principalId -o tsv)
   az keyvault set-policy \
     --name <key-vault-name> \
     --object-id ${APP_SERVICE_PRINCIPAL_ID} \
     --secret-permissions get list
   ```
3. Check Key Vault access policy
4. Ensure App Service configuration uses Key Vault references (format: `@Microsoft.KeyVault(...)`)

## Cleanup

To delete all resources:
```bash
az group delete --name <resource-group-name> --yes --no-wait
```

## Next Steps

1. **Deploy Application**: Use CI/CD pipeline or manual deployment
2. **Configure Custom Domain**: Add custom domain to App Service
3. **Set up Monitoring**: Enable Application Insights
4. **Configure Scaling**: Adjust App Service Plan tier based on traffic
5. **Set up Backup**: Configure backups for Cosmos DB and Storage

