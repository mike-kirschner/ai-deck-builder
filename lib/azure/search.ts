import { SearchClient, AzureKeyCredential } from '@azure/search-documents';
import { azureConfig } from './config';
import { KnowledgeBaseArticle } from '../schemas';

let searchClient: SearchClient<KnowledgeBaseArticle> | null = null;

function getSearchClient(): SearchClient<KnowledgeBaseArticle> {
  if (!searchClient) {
    if (!azureConfig.search.endpoint || !azureConfig.search.apiKey) {
      throw new Error(
        'Azure AI Search not configured. Please set AZURE_SEARCH_ENDPOINT and AZURE_SEARCH_API_KEY in your .env.local file. ' +
        'See SETUP.md for instructions.'
      );
    }
    searchClient = new SearchClient<KnowledgeBaseArticle>(
      azureConfig.search.endpoint,
      azureConfig.search.indexName,
      new AzureKeyCredential(azureConfig.search.apiKey)
    );
  }
  return searchClient;
}

export async function indexKnowledgeBaseArticle(
  article: KnowledgeBaseArticle
): Promise<void> {
  const client = getSearchClient();
  await client.uploadDocuments([article]);
}

export async function searchKnowledgeBase(
  query: string,
  limit: number = 5,
  filters?: string
): Promise<Array<{ document: KnowledgeBaseArticle; score: number }>> {
  const client = getSearchClient();
  const results = await client.search(query, {
    top: limit,
    filter: filters,
    select: ['id', 'title', 'content', 'type', 'tags'],
  });

  const hits: Array<{ document: KnowledgeBaseArticle; score: number }> = [];
  for await (const result of results.results) {
    if (result.document) {
      hits.push({
        document: result.document as KnowledgeBaseArticle,
        score: result.score || 0,
      });
    }
  }

  return hits;
}

export async function deleteKnowledgeBaseArticle(id: string): Promise<void> {
  const client = getSearchClient();
  // Azure Search deleteDocuments requires only the key field (id)
  await client.deleteDocuments([{ id }] as any);
}

