import { BlobServiceClient, ContainerClient, generateBlobSASQueryParameters, BlobSASPermissions, StorageSharedKeyCredential } from '@azure/storage-blob';
import { azureConfig } from './config';

let blobServiceClient: BlobServiceClient | null = null;

function getBlobServiceClient(): BlobServiceClient {
  if (!blobServiceClient) {
    if (!azureConfig.storage.connectionString) {
      throw new Error(
        'Azure Storage not configured. Please set AZURE_STORAGE_CONNECTION_STRING in your .env.local file. ' +
        'See SETUP.md for instructions.'
      );
    }
    blobServiceClient = BlobServiceClient.fromConnectionString(
      azureConfig.storage.connectionString
    );
  }
  return blobServiceClient;
}

export async function uploadTemplate(
  templateId: string,
  htmlContent: string,
  version: number = 1
): Promise<string> {
  const client = getBlobServiceClient();
  const containerClient = client.getContainerClient(azureConfig.storage.templatesContainer);
  
  // Ensure container exists
  await containerClient.createIfNotExists();
  
  const blobName = `${templateId}/v${version}.html`;
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);
  
  await blockBlobClient.upload(htmlContent, htmlContent.length, {
    blobHTTPHeaders: { blobContentType: 'text/html' },
  });
  
  // Return SAS URL instead of direct URL
  return generateBlobSASUrl(azureConfig.storage.templatesContainer, blobName, 60 * 24 * 365); // 1 year for templates
}

export async function getTemplate(templateId: string, version?: number): Promise<string> {
  const client = getBlobServiceClient();
  const containerClient = client.getContainerClient(azureConfig.storage.templatesContainer);
  
  const versionStr = version ? `v${version}` : 'latest';
  const blobName = `${templateId}/${versionStr}.html`;
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);
  
  const response = await blockBlobClient.download();
  const content = await streamToString(response.readableStreamBody!);
  return content;
}

export async function uploadPresentation(
  presentationId: string,
  content: string | Buffer,
  type: 'html' | 'pdf' | 'pptx' = 'html'
): Promise<string> {
  const client = getBlobServiceClient();
  const containerClient = client.getContainerClient(azureConfig.storage.containerName);
  
  await containerClient.createIfNotExists();
  
  const extension = type === 'html' ? 'html' : type === 'pdf' ? 'pdf' : 'pptx';
  const blobName = `${presentationId}/presentation.${extension}`;
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);
  
  const contentType = type === 'html' ? 'text/html' : type === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
  
  const buffer = typeof content === 'string' ? Buffer.from(content) : content;
  
  await blockBlobClient.upload(buffer, buffer.length, {
    blobHTTPHeaders: { blobContentType: contentType },
  });
  
  // Return SAS URL instead of direct URL (7 days expiration for presentations)
  return generateBlobSASUrl(azureConfig.storage.containerName, blobName, 60 * 24 * 7);
}

export async function uploadFile(
  container: string,
  fileName: string,
  content: Buffer | string,
  contentType: string
): Promise<string> {
  const client = getBlobServiceClient();
  const containerClient = client.getContainerClient(container);
  await containerClient.createIfNotExists();
  
  const blockBlobClient = containerClient.getBlockBlobClient(fileName);
  const buffer = typeof content === 'string' ? Buffer.from(content) : content;
  
  await blockBlobClient.upload(buffer, buffer.length, {
    blobHTTPHeaders: { blobContentType: contentType },
  });
  
  // Return SAS URL instead of direct URL (30 days expiration for uploaded files)
  return generateBlobSASUrl(container, fileName, 60 * 24 * 30);
}

async function streamToString(readableStream: NodeJS.ReadableStream): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    readableStream.on('data', (data) => {
      chunks.push(data instanceof Buffer ? data : Buffer.from(data));
    });
    readableStream.on('end', () => {
      resolve(Buffer.concat(chunks).toString('utf-8'));
    });
    readableStream.on('error', reject);
  });
}

/**
 * Generate a SAS URL for a blob that allows read access
 * @param containerName Container name
 * @param blobName Blob name
 * @param expiresInMinutes How long the SAS token should be valid (default: 1 hour)
 * @returns SAS URL with read permissions
 */
async function generateBlobSASUrl(
  containerName: string,
  blobName: string,
  expiresInMinutes: number = 60
): Promise<string> {
  const client = getBlobServiceClient();
  const containerClient = client.getContainerClient(containerName);
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);

  // Get account name and key from connection string
  const connectionString = azureConfig.storage.connectionString;
  if (!connectionString) {
    throw new Error('Storage connection string not configured');
  }

  // Parse connection string to get account name and key
  // Handle both formats: "AccountName=...;AccountKey=..." and "DefaultEndpointsProtocol=...;AccountName=...;AccountKey=..."
  const accountNameMatch = connectionString.match(/AccountName=([^;]+)/i);
  const accountKeyMatch = connectionString.match(/AccountKey=([^;]+)/i);
  
  if (!accountNameMatch || !accountKeyMatch) {
    throw new Error('Invalid storage connection string format. Must contain AccountName and AccountKey.');
  }

  const accountName = accountNameMatch[1].trim();
  const accountKey = accountKeyMatch[1].trim();

  // Create shared key credential
  const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);

  // Generate SAS token with read permissions
  const sasToken = generateBlobSASQueryParameters(
    {
      containerName,
      blobName,
      permissions: BlobSASPermissions.parse('r'), // Read only
      startsOn: new Date(),
      expiresOn: new Date(new Date().valueOf() + expiresInMinutes * 60 * 1000),
    },
    sharedKeyCredential
  ).toString();

  // Return URL with SAS token
  return `${blockBlobClient.url}?${sasToken}`;
}

