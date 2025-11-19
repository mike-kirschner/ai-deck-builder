# AI Deck Builder

A document generation platform built with Next.js, React Server Components, and Azure AI Foundry. Generate professional presentations from AI-generated content using customizable HTML/Tailwind templates.

## Architecture

The platform is organized into 4 layers:

### 1. Content & Context Ingestion
- **Knowledge Base Management**: Upload and manage articles, decks, specs, and notes
- **Azure AI Search**: Indexed content for RAG (Retrieval Augmented Generation)
- **Azure Blob Storage**: Store raw files and templates

### 2. Orchestration & Agents (Azure AI Foundry)
- **Outline Agent**: Generates structured JSON outlines from questions
- **Refinement Agent**: Refines and rewrites content sections
- **Template Selection Agent**: Suggests appropriate templates based on context

### 3. Template + Rendering Pipeline
- **Template Engine**: Handlebars-based rendering with Tailwind CSS
- **Exporters**: PDF (via Puppeteer) and PPTX (via PptxGenJS)
- **Template Management**: Upload, version, and manage HTML/Tailwind templates

### 4. Presentation Management + Delivery
- **Web UI**: Create, edit, preview, and manage presentations
- **Version Control**: Track presentation versions and status
- **Export & Share**: Export to PDF, PPTX, or view as web deck

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes (Server Actions)
- **Azure Services**:
  - Azure AI Foundry (Agent orchestration)
  - Azure Blob Storage (Templates & exports)
  - Azure Cosmos DB (Metadata & presentations)
  - Azure AI Search (Knowledge base indexing)
- **Libraries**:
  - Handlebars (Template engine)
  - Puppeteer (PDF export)
  - PptxGenJS (PPTX export)
  - Zod (Schema validation)

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn
- Azure account with:
  - Azure AI Foundry setup
  - Azure Storage Account
  - Azure Cosmos DB
  - Azure AI Search

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd ai-deck-builder
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env.local` file:

```env
# Azure AI Foundry
AZURE_AI_FOUNDRY_ENDPOINT=your-endpoint
AZURE_AI_FOUNDRY_API_KEY=your-api-key
AZURE_AI_FOUNDRY_DEPLOYMENT=gpt-4

# Azure Storage
AZURE_STORAGE_CONNECTION_STRING=your-connection-string
AZURE_STORAGE_CONTAINER=presentations
AZURE_STORAGE_TEMPLATES_CONTAINER=templates

# Azure Cosmos DB
AZURE_COSMOS_ENDPOINT=your-endpoint
AZURE_COSMOS_KEY=your-key
AZURE_COSMOS_DATABASE=deck-builder

# Azure AI Search
AZURE_SEARCH_ENDPOINT=your-endpoint
AZURE_SEARCH_API_KEY=your-api-key
AZURE_SEARCH_INDEX=knowledge-base
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
ai-deck-builder/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   │   ├── agents/        # AI agent endpoints
│   │   ├── presentations/ # Presentation CRUD
│   │   ├── templates/     # Template management
│   │   └── knowledge-base/ # KB management
│   ├── presentations/     # Presentation pages
│   ├── templates/         # Template pages
│   └── knowledge-base/    # KB pages
├── components/            # React components
│   ├── presentations/    # Presentation UI
│   ├── templates/        # Template UI
│   └── knowledge-base/    # KB UI
├── lib/
│   ├── azure/            # Azure service integrations
│   ├── schemas/          # Zod schemas
│   └── template/         # Template engine & exporters
├── templates/            # Example HTML templates
└── package.json
```

## Usage

### 1. Upload Templates

1. Navigate to **Templates** page
2. Click **Upload Template**
3. Provide:
   - Name and description
   - HTML content with Handlebars syntax
   - Output type (single slide, multi-slide, etc.)
   - Tags and brand (optional)

Example template:
```handlebars
<div class="slide">
  <h1>{{title}}</h1>
  {{#if subtitle}}
    <p>{{subtitle}}</p>
  {{/if}}
  {{#eachSection sections}}
    <div class="section">
      <h2>{{heading}}</h2>
      {{#if bullets}}
        <ul>
          {{#each bullets}}
            <li>{{this}}</li>
          {{/each}}
        </ul>
      {{/if}}
    </div>
  {{/eachSection}}
</div>
```

### 2. Add Knowledge Base Content

1. Navigate to **Knowledge Base** page
2. Click **Add Article**
3. Upload articles, specs, decks, or notes
4. Content is automatically indexed in Azure AI Search

### 3. Generate Presentations

1. Navigate to **Presentations** page
2. Click **Create Presentation**
3. Enter:
   - Question/prompt (e.g., "Create a board deck explaining our AI platform")
   - Audience, tone, length (optional)
   - Template ID (optional, auto-selected if not provided)
4. The system will:
   - Call Azure AI Foundry outline agent
   - Retrieve relevant context from knowledge base
   - Generate structured JSON outline
   - Bind to selected template
   - Show preview

### 4. Export Presentations

1. Open a presentation
2. Click **Export PDF** or **Export PPTX**
3. Files are generated and stored in Azure Blob Storage
4. Download links are provided

## Template Schema

Templates expect JSON content matching this structure:

```typescript
{
  title: string;
  subtitle?: string;
  audience?: string;
  sections: Array<{
    id: string;
    heading: string;
    bullets?: string[];
    content?: string;
    notes?: string;
    order?: number;
  }>;
}
```

## API Endpoints

### Presentations
- `GET /api/presentations` - List presentations
- `POST /api/presentations` - Create presentation
- `GET /api/presentations/[id]` - Get presentation
- `PATCH /api/presentations/[id]` - Update presentation
- `POST /api/presentations/generate` - Generate from question
- `POST /api/presentations/[id]/render` - Render HTML
- `POST /api/presentations/[id]/export` - Export (PDF/PPTX)

### Templates
- `GET /api/templates` - List templates
- `POST /api/templates` - Create template
- `GET /api/templates/[id]` - Get template

### Knowledge Base
- `GET /api/knowledge-base` - List articles
- `POST /api/knowledge-base` - Create article

### Agents
- `POST /api/agents/outline` - Generate outline
- `POST /api/agents/refine` - Refine content

## Azure AI Foundry Integration

The `lib/azure/ai-foundry.ts` file contains placeholder implementations. You'll need to:

1. Set up your Azure AI Foundry agents/flows
2. Implement the actual API calls to your agents
3. Configure RAG tools to search the knowledge base
4. Ensure agents output structured JSON matching the schema

Example agent setup:
- **System Prompt**: Instructs agent to output structured JSON
- **Tools**: Azure AI Search connector for RAG
- **Output**: Validated JSON matching `PresentationContentSchema`

## Development

### Running Tests
```bash
npm run lint
```

### Building for Production
```bash
npm run build
npm start
```

## Azure Deployment

### Prerequisites

- Azure CLI installed and configured (`az login`)
- Appropriate Azure subscription with permissions to create resources

### Quick Setup

1. **Provision Azure Resources**:
   ```bash
   ./scripts/provision-azure-resources.sh rg-ai-deck-builder eastus prod
   ```

2. **Create Azure AI Search Index**:
   ```bash
   ./scripts/create-search-index.sh rg-ai-deck-builder <search-service-name>
   ```

3. **Configure Azure AI Foundry** (manual step):
   - Set up Azure AI Foundry in Azure Portal
   - Store credentials in Key Vault (see script output for commands)

4. **Get Environment Variables for Local Development**:
   ```bash
   ./scripts/get-env-vars.sh <resource-group> <key-vault-name> > .env.local
   ```

### CI/CD Deployment

#### GitHub Actions

1. Add secrets to your GitHub repository:
   - `AZURE_WEBAPP_NAME`: Your App Service name
   - `AZURE_RESOURCE_GROUP`: Your resource group name
   - `AZURE_WEBAPP_PUBLISH_PROFILE`: Download from Azure Portal

2. Push to `main` or `develop` branch to trigger deployment

#### Azure DevOps

1. Update `azure-pipelines.yml` with your subscription and resource details
2. Configure pipeline variables in Azure DevOps
3. Run the pipeline

For detailed deployment instructions, see [scripts/README.md](./scripts/README.md).

## Next Steps

1. **Implement Azure AI Foundry Integration**: Replace placeholder code in `lib/azure/ai-foundry.ts` with actual API calls
2. **Add Authentication**: Integrate Azure AD or your preferred auth provider
3. **Enhance UI**: Add editing capabilities, version history, collaboration features
4. **Add More Export Formats**: Support for Word, HTML5 presentations, etc.
5. **Template Marketplace**: Allow sharing and discovery of templates
6. **Analytics**: Track usage, popular templates, generation metrics

## License

MIT

