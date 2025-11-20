# When is the Agent/AI Called?

## Overview

The AI agent (Azure OpenAI via Azure AI Foundry) is called in **3 main scenarios**:

### 1. **Generating a New Presentation** 
**When:** User clicks "Create Presentation" and submits the form

**Flow:**
1. User fills out form in `CreatePresentationButton` component
2. Frontend calls `POST /api/presentations/generate`
3. Backend calls `callOutlineAgent()` in `lib/azure/ai-foundry.ts`
4. Agent:
   - Searches knowledge base (RAG) for relevant context
   - Generates structured JSON outline with title, sections, bullets
   - Returns presentation content
5. Presentation is created and saved to Cosmos DB
6. User is redirected to view the presentation

**Files:**
- `components/presentations/CreatePresentationButton.tsx` (UI trigger)
- `app/api/presentations/generate/route.ts` (API endpoint)
- `lib/azure/ai-foundry.ts` → `callOutlineAgent()` (AI call)

### 2. **Adding a New Slide to Existing Presentation**
**When:** User clicks "Add Slide" button on an existing presentation

**Flow:**
1. User provides a prompt for the new slide
2. Frontend calls `POST /api/presentations/[id]/slides`
3. Backend calls `callOutlineAgent()` with focused prompt
4. Agent generates a single slide section
5. Slide is added to the presentation

**Files:**
- `components/presentations/AddSlideButton.tsx` (UI trigger)
- `app/api/presentations/[id]/slides/route.ts` (API endpoint)
- `lib/azure/ai-foundry.ts` → `callOutlineAgent()` (AI call)

### 3. **Refining Content** (Optional)
**When:** User requests content refinement (via API)

**Flow:**
1. Frontend/API calls `POST /api/agents/refine`
2. Backend calls `callRefinementAgent()` in `lib/azure/ai-foundry.ts`
3. Agent rewrites/improves content based on instructions
4. Returns refined text

**Files:**
- `app/api/agents/refine/route.ts` (API endpoint)
- `lib/azure/ai-foundry.ts` → `callRefinementAgent()` (AI call)

## Direct Agent API Endpoints

You can also call agents directly:

- `POST /api/agents/outline` - Generate outline directly
- `POST /api/agents/refine` - Refine content directly

## What the Agent Does

### Outline Agent (`callOutlineAgent`)
1. **RAG (Retrieval Augmented Generation)**:
   - Searches Azure AI Search knowledge base
   - Retrieves relevant articles/documents
   - Includes context in the prompt

2. **Generates Structured JSON**:
   ```json
   {
     "title": "Presentation Title",
     "subtitle": "Optional subtitle",
     "audience": "Target audience",
     "sections": [
       {
         "id": "unique-id",
         "heading": "Section Title",
         "bullets": ["Point 1", "Point 2"],
         "content": "Detailed content",
         "notes": "Speaker notes",
         "order": 1
       }
     ]
   }
   ```

3. **Uses System Prompt**:
   - Instructs model to output valid JSON
   - Specifies schema requirements
   - Includes user context (audience, tone, length)

### Refinement Agent (`callRefinementAgent`)
- Takes original content + refinement instructions
- Rewrites content according to instructions
- Maintains core message while improving clarity/structure

## Configuration

The agent requires these environment variables in `.env.local`:

```env
AZURE_AI_FOUNDRY_ENDPOINT=https://your-resource.openai.azure.com
AZURE_AI_FOUNDRY_API_KEY=your-api-key
AZURE_AI_FOUNDRY_DEPLOYMENT=gpt-35-turbo
AZURE_AI_FOUNDRY_API_VERSION=latest
```

### Setting Up Azure OpenAI

**Option 1: Use the automated script (Recommended)**

After running the main provisioning script, provision Azure OpenAI:

```bash
./scripts/provision-azure-openai.sh <resource-group> <location> <key-vault-name> [app-service-name] [model-name]
```

**Example:**
```bash
./scripts/provision-azure-openai.sh rg-ai-deck-builder eastus kv-ai-deck-builder-dev-123456 app-ai-deck-builder-dev-123456 gpt-35-turbo
```

This will:
- Create Azure OpenAI resource
- Deploy the model (gpt-35-turbo, gpt-4, gpt-4-turbo, etc.)
- Store credentials in Key Vault
- Configure App Service automatically

**Note:** Azure OpenAI requires approval. If you get an error, request access at https://aka.ms/oai/access

**Option 2: Manual setup**

1. Create Azure OpenAI resource in Azure Portal
2. Deploy a model (e.g., gpt-35-turbo)
3. Get endpoint and API key from Azure Portal
4. Add to `.env.local` or Key Vault

## Current Implementation

The agent is **fully implemented** using Azure OpenAI SDK:
- Uses `@azure/openai` package
- Calls `chat.completions.create()` API
- Supports JSON mode when available
- Includes error handling and retry logic
- Integrates with Azure AI Search for RAG

---

# How to Build the Project

## Prerequisites

- **Node.js 18+** and npm/yarn
- **Azure account** with:
  - Azure Storage Account
  - Azure Cosmos DB
  - Azure AI Search
  - Azure OpenAI / Azure AI Foundry

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

Create `.env.local` file in the project root:

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

# Azure AI Foundry / Azure OpenAI
AZURE_AI_FOUNDRY_ENDPOINT=https://YOUR_RESOURCE.openai.azure.com
AZURE_AI_FOUNDRY_API_KEY=YOUR_API_KEY
AZURE_AI_FOUNDRY_DEPLOYMENT=gpt-35-turbo
AZURE_AI_FOUNDRY_API_VERSION=latest
```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 4. Build for Production

```bash
npm run build
npm start
```

## Using Azure Provisioning Scripts

If you have Azure CLI configured:

```bash
# Provision all Azure resources
./scripts/provision-azure-resources.sh rg-ai-deck-builder eastus prod

# Create Azure AI Search index
./scripts/create-search-index.sh rg-ai-deck-builder <search-service-name>

# Get environment variables from Key Vault
./scripts/get-env-vars.sh <resource-group> <key-vault-name> > .env.local
```

## Getting Azure Credentials

### Azure OpenAI / AI Foundry
1. Go to Azure Portal → Your OpenAI resource
2. Click "Keys and Endpoint"
3. Copy:
   - **Endpoint** (e.g., `https://your-resource.openai.azure.com`)
   - **Key 1** or **Key 2**
4. Go to "Deployments" to see your deployment name (e.g., `gpt-35-turbo`)

### Azure Storage
1. Azure Portal → Your Storage Account
2. Settings → Access Keys
3. Copy "Connection string"

### Azure Cosmos DB
1. Azure Portal → Your Cosmos DB Account
2. Settings → Keys
3. Copy "URI" (endpoint) and "Primary Key"

### Azure AI Search
1. Azure Portal → Your Search Service
2. Settings → Keys
3. Copy "URL" (endpoint) and "Primary admin key"

## Project Structure

```
ai-deck-builder/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   │   ├── agents/        # AI agent endpoints
│   │   ├── presentations/ # Presentation CRUD
│   │   ├── templates/     # Template management
│   │   └── knowledge-base/ # KB management
│   └── [pages]            # Next.js pages
├── components/            # React components
├── lib/
│   ├── azure/            # Azure service integrations
│   │   ├── ai-foundry.ts # AI agent implementation ⭐
│   │   ├── cosmos.ts     # Cosmos DB
│   │   ├── storage.ts    # Blob Storage
│   │   └── search.ts     # AI Search
│   ├── schemas/          # Zod schemas
│   └── template/         # Template engine
└── package.json
```

## Troubleshooting

### "Azure AI Foundry not configured"
- Check `.env.local` exists and has correct values
- Verify endpoint format: `https://your-resource.openai.azure.com`
- Ensure API key is correct (not expired)

### "Deployment not found (404)"
- Check deployment name matches `AZURE_AI_FOUNDRY_DEPLOYMENT`
- Verify deployment exists in Azure Portal → Deployments
- Deployment name is case-sensitive

### "Authentication failed (401)"
- Verify API key is correct
- Check you're using the right key (Key 1 or Key 2)
- Ensure endpoint matches the resource

### Build Errors
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

## Next Steps

1. **Test the Agent**:
   - Create a presentation via UI
   - Check console logs for agent calls
   - Verify JSON output structure

2. **Add Knowledge Base Content**:
   - Upload articles via Knowledge Base page
   - Content is indexed for RAG
   - Agent will use this context

3. **Upload Templates**:
   - Create HTML templates with Handlebars syntax
   - Templates render the AI-generated content

4. **Monitor Agent Usage**:
   - Check Azure Portal → OpenAI resource → Usage
   - Monitor token consumption
   - Review API logs

## Development Commands

```bash
npm run dev      # Start dev server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run linter
```

