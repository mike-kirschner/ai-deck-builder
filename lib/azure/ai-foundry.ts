import OpenAI from 'openai';
import { azureConfig } from './config';
import { OutlineAgentRequest, OutlineAgentResponse, RefinementRequest } from '../schemas';
import { PresentationContentSchema } from '../schemas/presentation';
import { searchKnowledgeBase } from './search';

// Azure AI Foundry client for agent orchestration
let openAIClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openAIClient) {
    if (!azureConfig.aiFoundry.endpoint || !azureConfig.aiFoundry.apiKey) {
      throw new Error(
        'Azure AI Foundry not configured. Please set AZURE_AI_FOUNDRY_ENDPOINT and AZURE_AI_FOUNDRY_API_KEY in your .env.local file. ' +
        'See SETUP.md for instructions.'
      );
    }
    
    // Normalize endpoint
    // Azure OpenAI endpoint format: https://your-resource.openai.azure.com
    // Azure AI Foundry endpoint format: https://your-resource.services.ai.azure.com
    let endpoint = azureConfig.aiFoundry.endpoint.trim();
    
    // Check if this is an Azure AI Foundry endpoint (contains .services.ai.azure.com)
    const isFoundryEndpoint = endpoint.includes('.services.ai.azure.com');
    
    if (isFoundryEndpoint) {
      // Azure AI Foundry endpoint - extract base URL
      // Example: https://foundry-ai-deck-b-484978.services.ai.azure.com/api/projects/foundry-project-ai-deck-b
      // For OpenAI API calls, we need: https://foundry-ai-deck-b-484978.services.ai.azure.com
      // The /openai path will be added below
      const foundryMatch = endpoint.match(/^(https?:\/\/[^\/]+\.services\.ai\.azure\.com)/);
      if (foundryMatch) {
        endpoint = foundryMatch[1];
        console.log('Detected Azure AI Foundry endpoint, using base:', endpoint);
      } else {
        throw new Error(
          `Invalid Azure AI Foundry endpoint format: "${endpoint}". ` +
          `Expected format: https://your-resource.services.ai.azure.com or with project path`
        );
      }
    } else {
      // Azure OpenAI endpoint format
      endpoint = endpoint.replace(/\/+$/, ''); // Remove trailing slashes
      endpoint = endpoint.replace(/\/openai\/?$/, ''); // Remove /openai if present
      
      // Verify endpoint format
      if (!endpoint.match(/^https?:\/\/.+\..+$/)) {
        throw new Error(
          `Invalid endpoint format: "${endpoint}". ` +
          `Expected format: https://your-resource.openai.azure.com or https://your-resource.services.ai.azure.com`
        );
      }
    }
    
    try {
      // For Azure AI Foundry, we need to construct the full path
      // Azure AI Foundry uses: /openai/deployments/{deployment}/chat/completions
      // Azure OpenAI uses: /openai/deployments/{deployment}/chat/completions
      // Both should work with the same structure
      let baseURL = endpoint;
      if (isFoundryEndpoint) {
        // Azure AI Foundry might need /openai path appended
        baseURL = `${endpoint}/openai`;
      }
      
      // Log configuration (without exposing API key)
      console.log('Initializing Azure OpenAI client:', {
        endpoint: baseURL,
        originalEndpoint: azureConfig.aiFoundry.endpoint,
        isFoundryEndpoint: isFoundryEndpoint,
        deploymentName: azureConfig.aiFoundry.deploymentName,
        apiKeyPresent: !!azureConfig.aiFoundry.apiKey,
        apiKeyLength: azureConfig.aiFoundry.apiKey?.length || 0,
      });
      
      // Azure AI Foundry now supports 'latest' and 'preview' API versions
      // Use 'latest' for stable features, 'preview' for new capabilities
      const apiVersion = azureConfig.aiFoundry.apiVersion || 'latest';
      
      openAIClient = new OpenAI({
        baseURL: baseURL,
        apiKey: azureConfig.aiFoundry.apiKey,
        defaultQuery: { 'api-version': apiVersion },
      });
    } catch (error) {
      throw new Error(
        `Failed to initialize Azure OpenAI client: ${error instanceof Error ? error.message : 'Unknown error'}. ` +
        `Please check your endpoint format (should be like: https://your-resource.openai.azure.com)`
      );
    }
  }
  return openAIClient;
}

/**
 * Extracts JSON from a string that might contain markdown code blocks
 */
function extractJSON(text: string): any {
  // Try to find JSON in markdown code blocks
  const jsonBlockMatch = text.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
  if (jsonBlockMatch) {
    return JSON.parse(jsonBlockMatch[1]);
  }
  
  // Try to find JSON object directly
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }
  
  // If no JSON found, try parsing the whole text
  return JSON.parse(text);
}

export async function callOutlineAgent(
  request: OutlineAgentRequest
): Promise<OutlineAgentResponse> {
  // Check configuration first
  if (!azureConfig.aiFoundry.endpoint || !azureConfig.aiFoundry.apiKey) {
    throw new Error(
      'Azure AI Foundry not configured. Please set AZURE_AI_FOUNDRY_ENDPOINT and AZURE_AI_FOUNDRY_API_KEY in your .env.local file.'
    );
  }

  let client: AzureOpenAI;
  try {
    client = getOpenAIClient();
  } catch (error) {
    throw new Error(
      `Failed to initialize Azure OpenAI client: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }

  const deploymentName = azureConfig.aiFoundry.deploymentName || 'gpt-35-turbo';
  
  // Search knowledge base for relevant context (RAG)
  let knowledgeBaseContext = '';
  let sourcesUsed: string[] = [];
  
  if (request.use_knowledge_base !== false) {
    try {
      const searchResults = await searchKnowledgeBase(request.question, 5);
      if (searchResults.length > 0) {
        knowledgeBaseContext = '\n\nRelevant knowledge base articles:\n';
        searchResults.forEach((result, index) => {
          knowledgeBaseContext += `\n[Article ${index + 1}]: ${result.document.title}\n`;
          knowledgeBaseContext += `Content: ${result.document.content.substring(0, 500)}...\n`;
          sourcesUsed.push(result.document.id);
        });
      }
    } catch (error) {
      console.warn('Knowledge base search failed, continuing without RAG:', error);
      // Continue without RAG if search fails
    }
  }

  // Build system prompt
  const systemPrompt = `You are an expert presentation outline generator. 
Generate structured JSON outlines for presentations based on questions and context.
You must ALWAYS output valid JSON matching this exact schema:
{
  "title": string (required),
  "subtitle": string (optional),
  "audience": string (optional),
  "sections": [
    {
      "id": string (required, unique identifier),
      "heading": string (required),
      "bullets": string[] (optional array of bullet points),
      "content": string (optional detailed content),
      "notes": string (optional speaker notes),
      "order": number (required, sequential starting from 1)
    }
  ]
}

IMPORTANT:
- Output ONLY valid JSON, no markdown, no explanations, no code blocks
- Each section must have a unique "id" field
- The "order" field must be sequential (1, 2, 3, etc.)
- Include 3-7 bullet points per section when appropriate
- Make headings concise and descriptive
- Generate content that is professional and well-structured

${request.context_instructions ? `\nAdditional context: ${request.context_instructions}` : ''}
${request.audience ? `\nTarget audience: ${request.audience}` : ''}
${request.tone ? `\nTone: ${request.tone}` : ''}
${request.length ? `\nLength: ${request.length}` : ''}`;

  // Build user message
  const userMessage = `${request.question}${knowledgeBaseContext}`;

  try {
    // Log the request details (without sensitive data)
    console.log('Making Azure OpenAI request:', {
      deployment: deploymentName,
      endpoint: client.baseURL,
      messageLength: userMessage.length,
      systemPromptLength: systemPrompt.length,
    });

    // Call Azure OpenAI
    // Note: response_format with json_object is only supported by certain models (gpt-4-turbo, gpt-3.5-turbo-1106+)
    // If your deployment doesn't support it, the API will return an error and we'll retry without it
    let response;
    try {
      response = await client.chat.completions.create({
        model: deploymentName,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.7,
        max_tokens: 2000,
        response_format: { type: 'json_object' }, // Request JSON mode if supported
      } as any); // Type assertion needed for Azure OpenAI compatibility
    } catch (jsonModeError: any) {
      // Log the error details
      console.error('JSON mode error:', {
        message: jsonModeError?.message,
        status: jsonModeError?.status,
        code: jsonModeError?.code,
        response: jsonModeError?.response?.data,
      });

      // If JSON mode is not supported, retry without it
      if (jsonModeError.message?.includes('response_format') || jsonModeError.code === 'invalid_request_error') {
        console.warn('JSON mode not supported, retrying without response_format');
        response = await client.chat.completions.create({
          model: deploymentName,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage },
          ],
          temperature: 0.7,
          max_tokens: 2000,
        });
      } else {
        throw jsonModeError;
      }
    }

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response content from AI model');
    }

    // Parse JSON response
    let parsedContent: any;
    try {
      parsedContent = extractJSON(content);
    } catch (parseError) {
      console.error('Failed to parse JSON response:', content);
      throw new Error(`Failed to parse AI response as JSON: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
    }

    // Validate against schema
    const validatedContent = PresentationContentSchema.parse(parsedContent);

    // Ensure all sections have proper order
    const sectionsWithOrder = validatedContent.sections.map((section, index) => ({
      ...section,
      order: section.order ?? index + 1,
    }));

    const result: OutlineAgentResponse = {
      content: {
        ...validatedContent,
        sections: sectionsWithOrder,
      },
      confidence: 0.85, // Could be calculated based on model confidence if available
      sources_used: sourcesUsed,
    };

    return result;
  } catch (error: any) {
    console.error('Error calling Azure AI Foundry:', error);
    console.error('Error details:', {
      message: error?.message,
      status: error?.status,
      code: error?.code,
      response: error?.response,
      error: error,
    });
    
    // Provide helpful error messages based on error type
    if (error instanceof Error) {
      const errorMsg = error.message.toLowerCase();
      const statusCode = error?.status || error?.response?.status || error?.code;
      
      // Configuration errors
      if (errorMsg.includes('not configured') || errorMsg.includes('endpoint') || errorMsg.includes('api key')) {
        throw new Error(
          'Azure AI Foundry is not properly configured. Please check your .env.local file:\n' +
          '- AZURE_AI_FOUNDRY_ENDPOINT should be your Azure OpenAI endpoint (e.g., https://your-resource.openai.azure.com)\n' +
          '- AZURE_AI_FOUNDRY_API_KEY should be your API key\n' +
          '- AZURE_AI_FOUNDRY_DEPLOYMENT should be your deployment name (e.g., gpt-35-turbo)'
        );
      }
      
      // Authentication errors (401)
      if (statusCode === 401 || errorMsg.includes('401') || errorMsg.includes('unauthorized') || errorMsg.includes('authentication') || errorMsg.includes('invalid api key')) {
        const detailedMsg = error?.response?.data?.error?.message || error?.response?.error?.message || error?.message || 'Unknown authentication error';
        const errorBody = error?.response?.data || error?.response || {};
        
        console.error('401 Authentication Error Details:', {
          status: statusCode,
          message: detailedMsg,
          errorBody: JSON.stringify(errorBody, null, 2),
          endpoint: azureConfig.aiFoundry.endpoint,
          deployment: deploymentName,
          apiKeyPresent: !!azureConfig.aiFoundry.apiKey,
          apiKeyPrefix: azureConfig.aiFoundry.apiKey?.substring(0, 10) + '...',
        });

        throw new Error(
          `Azure AI Foundry authentication failed (401). Please verify:\n` +
          `- Your API key is correct (check Azure Portal → Your OpenAI resource → Keys and Endpoint)\n` +
          `- Your API key has not expired\n` +
          `- You're using the correct key (Key 1 or Key 2)\n` +
          `- Your endpoint is: ${azureConfig.aiFoundry.endpoint}\n` +
          `- Your deployment name is: ${deploymentName}\n` +
          `\nError details: ${detailedMsg}\n` +
          `\nTo get your credentials:\n` +
          `1. Go to Azure Portal → Your OpenAI resource\n` +
          `2. Click "Keys and Endpoint" (or "Resource Management" → "Keys and Endpoint")\n` +
          `3. Copy the "Endpoint" (should be like: https://your-resource.openai.azure.com)\n` +
          `4. Copy "Key 1" or "Key 2"\n` +
          `5. Update your .env.local file with these values`
        );
      }
      
      // Deployment/model errors (404)
      if (statusCode === 404 || errorMsg.includes('404') || errorMsg.includes('not found') || errorMsg.includes('deployment')) {
        const detailedMsg = error?.response?.data?.error?.message || error?.message || 'Unknown error';
        throw new Error(
          `Azure AI Foundry deployment "${deploymentName}" not found (404). ` +
          `Please verify:\n` +
          `- The deployment name "${deploymentName}" is correct (case-sensitive)\n` +
          `- The deployment exists in your Azure OpenAI resource\n` +
          `- The deployment is active and accessible\n` +
          `- Check Azure Portal → Your OpenAI resource → Deployments\n` +
          `Error details: ${detailedMsg}`
        );
      }
      
      // Rate limit errors (429)
      if (statusCode === 429 || errorMsg.includes('429') || errorMsg.includes('rate limit') || errorMsg.includes('quota')) {
        throw new Error('Azure AI Foundry rate limit exceeded (429). Please try again in a few moments.');
      }
      
      // JSON parsing errors
      if (errorMsg.includes('parse') || errorMsg.includes('json')) {
        throw new Error(`AI response parsing failed. The model may not have returned valid JSON. Error: ${error.message}`);
      }
      
      // Network/connection errors
      if (errorMsg.includes('network') || errorMsg.includes('connection') || errorMsg.includes('timeout') || errorMsg.includes('econnrefused')) {
        throw new Error('Network error connecting to Azure AI Foundry. Please check your internet connection and endpoint URL.');
      }
    }
    
    // Generic error with full message and status code
    const statusCode = error?.status || error?.response?.status || error?.code || '';
    const detailedMsg = error?.response?.data?.error?.message || (error instanceof Error ? error.message : 'Unknown error');
    throw new Error(`Failed to generate outline${statusCode ? ` (${statusCode})` : ''}: ${detailedMsg}`);
  }
}

export async function callRefinementAgent(
  request: RefinementRequest
): Promise<string> {
  const client = getOpenAIClient();
  const deploymentName = azureConfig.aiFoundry.deploymentName || 'gpt-35-turbo';
  
  const systemPrompt = `You are a content refinement agent. 
Your task is to rewrite and improve content according to specific instructions while maintaining the core message and meaning.

Guidelines:
- Follow the refinement instructions precisely
- Maintain the original intent and key information
- Improve clarity, structure, and flow
- Adjust tone as requested
- Keep content concise and professional
${request.tone ? `- Use a ${request.tone} tone` : ''}`;

  const userMessage = `Refinement instructions: ${request.instructions}

Original content:
${request.content}`;

  try {
    const response = await client.chat.completions.create({
      model: deploymentName,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const refinedContent = response.choices[0]?.message?.content;
    if (!refinedContent) {
      throw new Error('No response content from AI model');
    }

    return refinedContent.trim();
  } catch (error) {
    console.error('Error calling refinement agent:', error);
    
    // Provide helpful error messages
    if (error instanceof Error) {
      if (error.message.includes('not configured')) {
        throw error;
      }
      if (error.message.includes('401') || error.message.includes('authentication')) {
        throw new Error('Azure AI Foundry authentication failed. Please check your API key.');
      }
      if (error.message.includes('404') || error.message.includes('not found')) {
        throw new Error(`Azure AI Foundry deployment "${deploymentName}" not found. Please check your deployment name.`);
      }
    }
    
    throw new Error(`Failed to refine content: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

