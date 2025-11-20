#!/usr/bin/env node
/**
 * Diagnostic script to test Azure OpenAI connection
 * Run with: node scripts/test-azure-openai.js
 */

require('dotenv').config({ path: '.env.local' });

const OpenAI = require('openai');

const endpoint = process.env.AZURE_AI_FOUNDRY_ENDPOINT;
const apiKey = process.env.AZURE_AI_FOUNDRY_API_KEY;
const deployment = process.env.AZURE_AI_FOUNDRY_DEPLOYMENT || 'gpt-35-turbo';

console.log('🔍 Azure OpenAI Configuration Test\n');
console.log('Configuration:');
console.log(`  Endpoint: ${endpoint || '❌ NOT SET'}`);
console.log(`  API Key: ${apiKey ? `${apiKey.substring(0, 10)}... (${apiKey.length} chars)` : '❌ NOT SET'}`);
console.log(`  Deployment: ${deployment || '❌ NOT SET'}`);
console.log('');

if (!endpoint || !apiKey) {
  console.error('❌ Missing required configuration!');
  console.error('Please set AZURE_AI_FOUNDRY_ENDPOINT and AZURE_AI_FOUNDRY_API_KEY in .env.local');
  process.exit(1);
}

// Normalize endpoint
let normalizedEndpoint = endpoint.trim();
const isFoundryEndpoint = normalizedEndpoint.includes('.services.ai.azure.com');

if (isFoundryEndpoint) {
  // Azure AI Foundry endpoint - extract base URL
  const foundryMatch = normalizedEndpoint.match(/^(https?:\/\/[^\/]+\.services\.ai\.azure\.com)/);
  if (foundryMatch) {
    normalizedEndpoint = foundryMatch[1];
    console.log('✅ Detected Azure AI Foundry endpoint');
    console.log(`   Original: ${endpoint}`);
    console.log(`   Using base: ${normalizedEndpoint}`);
  }
} else {
  // Azure OpenAI endpoint
  normalizedEndpoint = normalizedEndpoint.replace(/\/+$/, '');
  normalizedEndpoint = normalizedEndpoint.replace(/\/openai\/?$/, '');
}

console.log(`Normalized endpoint: ${normalizedEndpoint}`);
console.log('');

// Create client
let client;
try {
  let baseURL = normalizedEndpoint;
  if (isFoundryEndpoint) {
    // Azure AI Foundry needs /openai path
    baseURL = `${normalizedEndpoint}/openai`;
  }
  
  // Azure AI Foundry now supports 'latest' and 'preview' API versions
  const apiVersion = process.env.AZURE_AI_FOUNDRY_API_VERSION || 'latest';
  
  client = new OpenAI({
    baseURL: baseURL,
    apiKey: apiKey,
    defaultQuery: { 'api-version': apiVersion },
  });
  
  console.log(`   API Version: ${apiVersion}`);
  console.log('✅ Client initialized successfully');
  console.log(`   Base URL: ${baseURL}`);
} catch (error) {
  console.error('❌ Failed to initialize client:', error.message);
  process.exit(1);
}

// Test API call
console.log('\n🧪 Testing API call...');
client.chat.completions.create({
  model: deployment,
  messages: [
    { role: 'user', content: 'Say "Hello, Azure OpenAI is working!" and nothing else.' },
  ],
  max_tokens: 20,
})
  .then((response) => {
    console.log('✅ API call successful!');
    console.log('Response:', response.choices[0]?.message?.content);
    console.log('\n✅ All tests passed! Your Azure OpenAI configuration is correct.');
  })
  .catch((error) => {
    console.error('\n❌ API call failed!');
    console.error('Error details:');
    console.error(`  Status: ${error.status || error.code || 'Unknown'}`);
    console.error(`  Message: ${error.message}`);
    
    if (error.response) {
      console.error(`  Response status: ${error.response.status}`);
      console.error(`  Response data:`, JSON.stringify(error.response.data, null, 2));
    }
    
    if (error.status === 401) {
      console.error('\n🔑 Authentication Error (401):');
      console.error('  - Check that your API key is correct');
      console.error('  - Verify the key hasn\'t expired');
      console.error('  - Make sure you\'re using Key 1 or Key 2 from Azure Portal');
      console.error('  - Go to: Azure Portal → Your OpenAI resource → Keys and Endpoint');
    } else if (error.status === 404) {
      console.error('\n📦 Deployment Not Found (404):');
      console.error(`  - Check that deployment "${deployment}" exists`);
      console.error('  - Go to: Azure Portal → Your OpenAI resource → Deployments');
      console.error('  - Deployment names are case-sensitive');
    }
    
    process.exit(1);
  });

