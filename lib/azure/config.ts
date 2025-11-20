// Azure configuration
// These should be set as environment variables

export const azureConfig = {
  // Azure AI Foundry (now includes Azure OpenAI Service)
  // As of 2024/2025, Azure OpenAI is integrated into Azure AI Foundry
  // No separate Azure OpenAI resource needed
  aiFoundry: {
    endpoint: process.env.AZURE_AI_FOUNDRY_ENDPOINT || '',
    apiKey: process.env.AZURE_AI_FOUNDRY_API_KEY || '',
    deploymentName: process.env.AZURE_AI_FOUNDRY_DEPLOYMENT || 'gpt-35-turbo',
    projectName: process.env.AZURE_AI_FOUNDRY_PROJECT_NAME || '', // Optional: project name if not in endpoint URL
    apiVersion: process.env.AZURE_AI_FOUNDRY_API_VERSION || 'latest', // Use 'latest' or 'preview'
  },
  
  // Azure Blob Storage
  storage: {
    connectionString: process.env.AZURE_STORAGE_CONNECTION_STRING || '',
    containerName: process.env.AZURE_STORAGE_CONTAINER || 'presentations',
    templatesContainer: process.env.AZURE_STORAGE_TEMPLATES_CONTAINER || 'templates',
  },
  
  // Azure Cosmos DB
  cosmos: {
    endpoint: process.env.AZURE_COSMOS_ENDPOINT || '',
    key: process.env.AZURE_COSMOS_KEY || '',
    databaseId: process.env.AZURE_COSMOS_DATABASE || 'deck-builder',
  },
  
  // Azure AI Search
  search: {
    endpoint: process.env.AZURE_SEARCH_ENDPOINT || '',
    apiKey: process.env.AZURE_SEARCH_API_KEY || '',
    indexName: process.env.AZURE_SEARCH_INDEX || 'knowledge-base',
  },
};

