# Local Development Setup

This guide will help you set up the AI Deck Builder for local development.

## Quick Start

### Option 1: Use Azure Provisioning Script (Recommended)

If you have Azure CLI installed and configured:

```bash
# Provision all Azure resources
./scripts/provision-azure-resources.sh

# Get environment variables from Key Vault (if Key Vault was created)
./scripts/get-env-vars.sh <resource-group> <key-vault-name> > .env.local
```

### Option 2: Manual Setup

1. **Create Azure Resources** (if you haven't already):
   - Azure Storage Account
   - Azure Cosmos DB Account
   - Azure AI Search Service
   - Azure AI Foundry (optional for now)

2. **Create `.env.local` file** in the project root:

```bash
# Copy the example (you'll need to fill in your values)
cp .env.local.example .env.local
```

3. **Fill in your Azure credentials**:

```env
# Azure Storage
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=YOUR_ACCOUNT;AccountKey=YOUR_KEY;EndpointSuffix=core.windows.net
AZURE_STORAGE_CONTAINER=presentations
AZURE_STORAGE_TEMPLATES_CONTAINER=templates

# Azure Cosmos DB
AZURE_COSMOS_ENDPOINT=https://YOUR_ACCOUNT.documents.azure.com:443/
AZURE_COSMOS_KEY=YOUR_COSMOS_KEY
AZURE_COSMOS_DATABASE=deck-builder

# Azure AI Search
AZURE_SEARCH_ENDPOINT=https://YOUR_ACCOUNT.search.windows.net
AZURE_SEARCH_API_KEY=YOUR_SEARCH_KEY
AZURE_SEARCH_INDEX=knowledge-base

# Azure AI Foundry (optional for basic testing)
AZURE_AI_FOUNDRY_ENDPOINT=https://YOUR_ENDPOINT.openai.azure.com
AZURE_AI_FOUNDRY_API_KEY=YOUR_API_KEY
AZURE_AI_FOUNDRY_DEPLOYMENT=gpt-35-turbo
```

## Getting Your Azure Credentials

### Azure Storage Connection String

1. Go to Azure Portal → Your Storage Account
2. Settings → Access Keys
3. Copy the "Connection string" from key1 or key2

### Cosmos DB Endpoint and Key

1. Go to Azure Portal → Your Cosmos DB Account
2. Settings → Keys
3. Copy the "URI" (endpoint) and "Primary Key"

### Azure AI Search Endpoint and Key

1. Go to Azure Portal → Your Search Service
2. Settings → Keys
3. Copy the "URL" (endpoint) and a "Primary admin key"

### Azure AI Foundry

1. Go to Azure AI Studio
2. Navigate to your project
3. Settings → Connection → Copy endpoint and API key

## Running the Application

1. **Install dependencies** (if not already done):
   ```bash
   npm install
   ```

2. **Start the development server**:
   ```bash
   npm run dev
   ```

3. **Open** [http://localhost:3000](http://localhost:3000)

## Troubleshooting

### "Azure Cosmos DB not configured" Error

This means your `.env.local` file is missing or doesn't have the Cosmos DB credentials.

**Solution:**
1. Create `.env.local` file in the project root
2. Add `AZURE_COSMOS_ENDPOINT` and `AZURE_COSMOS_KEY`
3. Restart the dev server

### "Azure Storage not configured" Error

Similar to above, but for Storage.

**Solution:**
1. Add `AZURE_STORAGE_CONNECTION_STRING` to `.env.local`
2. Restart the dev server

### API Routes Return 500 Errors

Check the terminal/console for detailed error messages. Common issues:
- Missing environment variables
- Invalid credentials
- Azure resources not created yet

## Testing Without Full Azure Setup

For basic UI testing, you can:
1. Set dummy values in `.env.local` (the app will show errors but won't crash)
2. Mock the API responses in development
3. Use the UI to see the structure, even if backend calls fail

However, full functionality requires all Azure services to be configured.

## Next Steps

Once you have the basic setup working:
1. Upload a template via the Templates page
2. Add knowledge base articles
3. Generate your first presentation
4. Set up Azure AI Foundry agents (see `lib/azure/ai-foundry.ts`)

For more details, see [README.md](./README.md) and [ARCHITECTURE.md](./ARCHITECTURE.md).

