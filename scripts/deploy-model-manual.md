# Manual Model Deployment Guide

If the automated script fails to deploy a model, you can deploy it manually via Azure Portal or Azure CLI.

## Option 1: Azure Portal (Recommended)

1. **Go to Azure Portal** → Your OpenAI resource
2. **Navigate to "Model deployments"** or **"Deployments"** in the left menu
3. **Click "Create"** or **"Deploy model"**
4. **Select your model** (e.g., `gpt-35-turbo`, `gpt-4`)
5. **Set deployment name** (e.g., `gpt-35-turbo` - should match the model name)
6. **Configure settings**:
   - **Model version**: Select the latest available version
   - **Capacity**: 1 (or adjust based on your needs)
7. **Click "Deploy"**
8. **Wait for deployment** (can take 5-10 minutes)
9. **Verify status** shows "Succeeded"

## Option 2: Azure CLI

After deploying via Portal, you can configure Key Vault and App Service:

```bash
# Get your OpenAI resource name and endpoint
OPENAI_RESOURCE="oai-123456"  # Your OpenAI resource name
RESOURCE_GROUP="rg-ai-deck-builder"
KEY_VAULT="kv-ai-deck-builder-dev-123456"
APP_SERVICE="app-ai-deck-builder-dev-123456"

# Get endpoint and key
OPENAI_ENDPOINT=$(az cognitiveservices account show \
    --resource-group "${RESOURCE_GROUP}" \
    --name "${OPENAI_RESOURCE}" \
    --query properties.endpoint -o tsv)

OPENAI_KEY=$(az cognitiveservices account keys list \
    --resource-group "${RESOURCE_GROUP}" \
    --name "${OPENAI_RESOURCE}" \
    --query key1 -o tsv)

# Store in Key Vault
az keyvault secret set \
    --vault-name "${KEY_VAULT}" \
    --name "AzureAiFoundryEndpoint" \
    --value "${OPENAI_ENDPOINT}"

az keyvault secret set \
    --vault-name "${KEY_VAULT}" \
    --name "AzureAiFoundryApiKey" \
    --value "${OPENAI_KEY}"

# Configure App Service
az webapp config appsettings set \
    --resource-group "${RESOURCE_GROUP}" \
    --name "${APP_SERVICE}" \
    --settings \
        "AZURE_AI_FOUNDRY_ENDPOINT=@Microsoft.KeyVault(SecretUri=https://${KEY_VAULT}.vault.azure.net/secrets/AzureAiFoundryEndpoint/)" \
        "AZURE_AI_FOUNDRY_API_KEY=@Microsoft.KeyVault(SecretUri=https://${KEY_VAULT}.vault.azure.net/secrets/AzureAiFoundryApiKey/)" \
        "AZURE_AI_FOUNDRY_DEPLOYMENT=gpt-35-turbo" \
        "AZURE_AI_FOUNDRY_API_VERSION=latest"
```

## Option 3: Use Azure AI Studio

1. Go to [Azure AI Studio](https://ai.azure.com)
2. Select your project/resource
3. Navigate to **"Deployments"** → **"Create"**
4. Select model and configure deployment
5. Wait for deployment to complete

## Troubleshooting

### Model not available
- Check that you've requested access to Azure OpenAI
- Verify the model is available in your region
- Some models require special approval (e.g., GPT-4)

### Deployment fails
- Check your quota limits
- Ensure you have sufficient capacity
- Try a different model version
- Check Azure Portal for detailed error messages

### Deployment exists but script fails
- The script will detect existing deployments and skip creation
- You can manually configure Key Vault and App Service using Option 2 above

