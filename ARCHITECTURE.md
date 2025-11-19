# Architecture Overview

This document provides a detailed overview of the AI Deck Builder architecture, organized by the 4-layer design.

## Layer 1: Content & Context Ingestion

### Components

**Knowledge Base Management** (`/app/knowledge-base`, `/components/knowledge-base`)
- Web UI for uploading articles, decks, specs, notes, and data
- Supports tagging and categorization
- Files stored in Azure Blob Storage
- Metadata stored in Cosmos DB

**Azure AI Search Integration** (`/lib/azure/search.ts`)
- Automatic indexing of knowledge base articles
- Vector + keyword search capabilities
- Used by agents for RAG (Retrieval Augmented Generation)

**Storage** (`/lib/azure/storage.ts`)
- Azure Blob Storage for:
  - Raw knowledge base files
  - Template HTML files
  - Exported presentations (PDF, PPTX, HTML)

### Data Flow

1. User uploads content via web UI
2. Content stored in Blob Storage
3. Metadata (title, tags, type) stored in Cosmos DB
4. Content indexed in Azure AI Search for retrieval

## Layer 2: Orchestration & Agents (Azure AI Foundry)

### Agent Types

**Outline Agent** (`/app/api/agents/outline`, `/lib/azure/ai-foundry.ts`)
- **Input**: Question, audience, tone, length, context instructions
- **Process**:
  1. Searches knowledge base via Azure AI Search (RAG)
  2. Retrieves relevant context
  3. Generates structured JSON outline
- **Output**: `PresentationContent` JSON matching schema

**Refinement Agent** (`/app/api/agents/refine`)
- **Input**: Section content, refinement instructions
- **Process**: Rewrites/refines content based on instructions
- **Output**: Refined text content

**Template Selection Agent** (optional, can be driven by UI)
- Suggests appropriate template based on:
  - Target audience
  - Content type
  - Brand/BU requirements

### Integration Points

The `lib/azure/ai-foundry.ts` file contains placeholder implementations. You need to:

1. **Set up Azure AI Foundry agents/flows**:
   - Create agents in Azure AI Foundry Studio
   - Configure system prompts
   - Set up tools (Azure AI Search connector)

2. **Implement API calls**:
   - Replace mock responses with actual Azure AI Foundry API calls
   - Handle authentication (API keys or managed identity)
   - Parse structured JSON responses

3. **Configure RAG**:
   - Connect agents to Azure AI Search
   - Set up retrieval tools
   - Configure context window and retrieval parameters

### Example Agent Prompt Structure

```typescript
const systemPrompt = `You are an expert presentation outline generator.
Generate structured JSON outlines for presentations based on questions and context.
Always output valid JSON matching this schema:
{
  "title": string,
  "subtitle": string (optional),
  "audience": string (optional),
  "sections": [
    {
      "id": string,
      "heading": string,
      "bullets": string[],
      "content": string (optional),
      "notes": string (optional),
      "order": number
    }
  ]
}`;
```

## Layer 3: Template + Rendering Pipeline

### Template Engine (`/lib/template/engine.ts`)

**Handlebars-based rendering**:
- Templates use Handlebars syntax for dynamic content
- Custom helpers registered:
  - `eq`, `ne`, `gt`, `lt` (comparisons)
  - `and`, `or`, `not` (logic)
  - `renderBullets` (format bullet lists)
  - `eachSection` (iterate sections with context)

**Template Structure**:
- HTML with Tailwind CSS classes
- Handlebars placeholders: `{{title}}`, `{{subtitle}}`, `{{#eachSection sections}}`
- Supports conditional rendering: `{{#if subtitle}}`

**Validation**:
- `TemplateEngine.validateContent()` ensures content matches template requirements
- Checks required fields
- Validates allowed sections

### Exporters (`/lib/template/exporters.ts`)

**PDF Export**:
- Uses Puppeteer (headless Chrome)
- Renders HTML with Tailwind
- Generates PDF with proper formatting
- Supports print styles

**PPTX Export**:
- Uses PptxGenJS library
- Maps JSON structure to PowerPoint slides
- Creates title slide + content slides
- Supports bullets, headings, notes

**HTML Export**:
- Wraps rendered content in full HTML document
- Includes Tailwind CSS (CDN)
- Print-friendly styles

### Template Management

**Storage**:
- HTML stored in Azure Blob Storage (`templates` container)
- Metadata in Cosmos DB (`templates` collection)
- Versioned: `{templateId}/v{version}.html`

**Upload Flow**:
1. User uploads HTML template via web UI
2. HTML uploaded to Blob Storage
3. Metadata (name, description, tags, schema) stored in Cosmos DB
4. Template available for use

## Layer 4: Presentation Management + Delivery

### Presentation Lifecycle

**States**:
- `draft`: Generated, editable
- `in_review`: Under review
- `approved`: Locked, ready for use
- `archived`: Historical reference

**Versioning**:
- Each presentation has a version number
- Updates create new versions
- Export URLs stored per version

### Web UI Components

**Presentation List** (`/app/presentations`, `/components/presentations/PresentationList`)
- Grid view of all presentations
- Filter by status, user
- Quick access to presentations

**Presentation Generator** (`/components/presentations/CreatePresentationButton`)
- Modal form for:
  - Question/prompt
  - Audience, tone, length
  - Template selection
- Calls `/api/presentations/generate`
- Redirects to generated presentation

**Presentation Viewer** (`/components/presentations/PresentationViewer`)
- Displays rendered HTML
- Export buttons (PDF, PPTX)
- Status and metadata display
- Edit capabilities (future)

**Template Management** (`/app/templates`, `/components/templates`)
- Upload new templates
- View template list
- Template detail view with HTML preview

**Knowledge Base Management** (`/app/knowledge-base`, `/components/knowledge-base`)
- Upload articles
- View and search articles
- Tag and categorize content

### API Endpoints

**Presentations**:
- `POST /api/presentations/generate` - Generate from question
- `GET /api/presentations` - List presentations
- `GET /api/presentations/[id]` - Get presentation
- `PATCH /api/presentations/[id]` - Update presentation
- `POST /api/presentations/[id]/render` - Render HTML
- `POST /api/presentations/[id]/export` - Export (PDF/PPTX)

**Templates**:
- `GET /api/templates` - List templates
- `POST /api/templates` - Create template
- `GET /api/templates/[id]` - Get template with HTML

**Knowledge Base**:
- `GET /api/knowledge-base` - List articles
- `POST /api/knowledge-base` - Create article

**Agents**:
- `POST /api/agents/outline` - Generate outline
- `POST /api/agents/refine` - Refine content

## Data Models

### Presentation Schema

```typescript
{
  id: string;
  title: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  template_id: string;
  status: 'draft' | 'in_review' | 'approved' | 'archived';
  content: {
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
  };
  version: number;
  export_urls?: {
    html?: string;
    pdf?: string;
    pptx?: string;
  };
}
```

### Template Schema

```typescript
{
  id: string;
  name: string;
  description?: string;
  version: number;
  html_content: string; // Stored in Blob, not DB
  allowed_sections?: string[];
  required_fields?: string[];
  output_type: 'single_slide' | 'multi_slide' | 'one_pager' | 'narrative';
  tags?: string[];
  brand?: string;
  is_active: boolean;
}
```

## Request Flow Example

1. **User creates presentation**:
   - Fills form: question, audience, tone
   - Clicks "Generate"

2. **Backend processes**:
   - `POST /api/presentations/generate`
   - Calls `callOutlineAgent()` with question
   - Agent searches knowledge base (RAG)
   - Agent generates structured JSON
   - Template selected (user choice or auto)
   - Presentation created in Cosmos DB

3. **User views presentation**:
   - `GET /api/presentations/[id]`
   - `POST /api/presentations/[id]/render`
   - Template HTML fetched from Blob
   - TemplateEngine renders with content
   - HTML displayed in browser

4. **User exports**:
   - Clicks "Export PDF"
   - `POST /api/presentations/[id]/export`
   - HTML rendered to PDF via Puppeteer
   - PDF uploaded to Blob Storage
   - URL returned and opened

## Azure Services Configuration

### Required Services

1. **Azure AI Foundry**
   - Endpoint and API key
   - Deployed agents/flows
   - RAG tools configured

2. **Azure Blob Storage**
   - Connection string
   - Containers: `presentations`, `templates`

3. **Azure Cosmos DB**
   - Endpoint and key
   - Database: `deck-builder`
   - Containers: `presentations`, `templates`, `knowledge-base`

4. **Azure AI Search**
   - Endpoint and API key
   - Index: `knowledge-base`
   - Fields: id, title, content, type, tags

### Environment Variables

See `.env.example` for all required variables.

## Next Steps for Production

1. **Azure AI Foundry Integration**
   - Implement actual API calls in `lib/azure/ai-foundry.ts`
   - Set up agents in Azure AI Foundry Studio
   - Configure RAG tools

2. **Authentication**
   - Add Azure AD or auth provider
   - Protect API routes
   - User context in requests

3. **Error Handling**
   - Comprehensive error handling
   - Retry logic for Azure calls
   - User-friendly error messages

4. **Performance**
   - Caching for templates
   - Background jobs for exports
   - Optimize RAG queries

5. **Features**
   - Presentation editing UI
   - Version history
   - Collaboration features
   - Template marketplace

