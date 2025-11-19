import { CosmosClient, Database, Container } from '@azure/cosmos';
import { azureConfig } from './config';
import { Presentation, Template, KnowledgeBaseArticle } from '../schemas';

let cosmosClient: CosmosClient | null = null;
let database: Database | null = null;

function getCosmosClient(): CosmosClient {
  if (!cosmosClient) {
    if (!azureConfig.cosmos.endpoint || !azureConfig.cosmos.key) {
      throw new Error(
        'Azure Cosmos DB not configured. Please set AZURE_COSMOS_ENDPOINT and AZURE_COSMOS_KEY in your .env.local file. ' +
        'See README.md for setup instructions or run ./scripts/provision-azure-resources.sh to create Azure resources.'
      );
    }
    cosmosClient = new CosmosClient({
      endpoint: azureConfig.cosmos.endpoint,
      key: azureConfig.cosmos.key,
    });
  }
  return cosmosClient;
}

async function getDatabase(): Promise<Database> {
  if (!database) {
    const client = getCosmosClient();
    const { database: db } = await client.databases.createIfNotExists({
      id: azureConfig.cosmos.databaseId,
    });
    database = db;
  }
  return database;
}

async function getContainer(containerId: string): Promise<Container> {
  const db = await getDatabase();
  const { container } = await db.containers.createIfNotExists({
    id: containerId,
  });
  return container;
}

// Presentation operations
export async function createPresentation(presentation: Presentation): Promise<Presentation> {
  const container = await getContainer('presentations');
  const { resource } = await container.items.create(presentation);
  return resource as Presentation;
}

export async function getPresentation(id: string): Promise<Presentation | null> {
  const container = await getContainer('presentations');
  const { resource } = await container.item(id, id).read();
  return resource as Presentation | null;
}

export async function listPresentations(
  userId?: string,
  status?: string
): Promise<Presentation[]> {
  const container = await getContainer('presentations');
  let query = 'SELECT * FROM c WHERE 1=1';
  
  if (userId) {
    query += ` AND c.created_by = "${userId}"`;
  }
  if (status) {
    query += ` AND c.status = "${status}"`;
  }
  query += ' ORDER BY c.created_at DESC';
  
  const { resources } = await container.items.query(query).fetchAll();
  return resources as Presentation[];
}

export async function updatePresentation(
  id: string,
  updates: Partial<Presentation>
): Promise<Presentation> {
  const container = await getContainer('presentations');
  const { resource: existing } = await container.item(id, id).read();
  const updated = { ...existing, ...updates, updated_at: new Date().toISOString() };
  const { resource } = await container.item(id, id).replace(updated);
  return resource as Presentation;
}

// Template operations
export async function createTemplate(template: Template): Promise<Template> {
  const container = await getContainer('templates');
  const { resource } = await container.items.create(template);
  return resource as Template;
}

export async function getTemplate(id: string): Promise<Template | null> {
  const container = await getContainer('templates');
  const { resource } = await container.item(id, id).read();
  return resource as Template | null;
}

export async function listTemplates(activeOnly: boolean = true): Promise<Template[]> {
  const container = await getContainer('templates');
  let query = 'SELECT * FROM c';
  if (activeOnly) {
    query += ' WHERE c.is_active = true';
  }
  query += ' ORDER BY c.updated_at DESC';
  
  const { resources } = await container.items.query(query).fetchAll();
  return resources as Template[];
}

// Knowledge base operations
export async function createKnowledgeBaseArticle(
  article: KnowledgeBaseArticle
): Promise<KnowledgeBaseArticle> {
  const container = await getContainer('knowledge-base');
  const { resource } = await container.items.create(article);
  return resource as KnowledgeBaseArticle;
}

export async function listKnowledgeBaseArticles(
  tags?: string[],
  type?: string
): Promise<KnowledgeBaseArticle[]> {
  const container = await getContainer('knowledge-base');
  let query = 'SELECT * FROM c WHERE 1=1';
  
  if (type) {
    query += ` AND c.type = "${type}"`;
  }
  if (tags && tags.length > 0) {
    const tagConditions = tags.map(tag => `ARRAY_CONTAINS(c.tags, "${tag}")`).join(' OR ');
    query += ` AND (${tagConditions})`;
  }
  query += ' ORDER BY c.updated_at DESC';
  
  const { resources } = await container.items.query(query).fetchAll();
  return resources as KnowledgeBaseArticle[];
}

