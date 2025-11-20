import { NextRequest, NextResponse } from 'next/server';
import { createKnowledgeBaseArticle, listKnowledgeBaseArticles } from '@/lib/azure/cosmos';
import { indexKnowledgeBaseArticle } from '@/lib/azure/search';
import { uploadFile } from '@/lib/azure/storage';
import { KnowledgeBaseArticleSchema } from '@/lib/schemas/knowledge-base';
import { nanoid } from 'nanoid';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const tags = searchParams.get('tags')?.split(',');
    const type = searchParams.get('type') || undefined;

    const articles = await listKnowledgeBaseArticles(tags, type);
    return NextResponse.json(articles);
  } catch (error) {
    console.error('Error listing knowledge base articles:', error);
    return NextResponse.json(
      { error: 'Failed to list knowledge base articles' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';
    let articleData: any;
    let fileUrl: string | undefined;

    // Handle FormData (file upload) or JSON
    // Check if it's multipart/form-data (file upload)
    const isFormData = contentType.includes('multipart/form-data');
    
    if (isFormData) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      const title = formData.get('title') as string;
      const content = formData.get('content') as string;
      const type = formData.get('type') as string;
      const tagsStr = formData.get('tags') as string;
      const brand = formData.get('brand') as string | null;

      // Parse tags
      let tags: string[] = [];
      try {
        tags = JSON.parse(tagsStr || '[]');
      } catch {
        tags = tagsStr ? tagsStr.split(',').map(t => t.trim()).filter(Boolean) : [];
      }

      let extractedContent = content;
      let fileBuffer: Buffer | null = null;

      // Upload file to Azure Storage if provided
      if (file && file.size > 0) {
        try {
          fileBuffer = Buffer.from(await file.arrayBuffer());
          const fileName = `${nanoid()}/${file.name}`;
          fileUrl = await uploadFile(
            'knowledge-base',
            fileName,
            fileBuffer,
            file.type || 'application/octet-stream'
          );

          // Extract text from PDF if it's a PDF file
          const isPDF = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
          if (isPDF && fileBuffer) {
            try {
              // Use dynamic require for pdf-parse to avoid build-time bundling issues
              const pdfParse = require('pdf-parse');
              const pdfData = await pdfParse(fileBuffer);
              extractedContent = pdfData.text.trim();
              console.log(`Extracted ${extractedContent.length} characters from PDF: ${file.name}`);
            } catch (pdfError) {
              console.error('Error extracting text from PDF:', pdfError);
              // If PDF extraction fails and no content was provided, throw error
              if (!content || content.trim() === '') {
                throw new Error('Failed to extract text from PDF and no content provided');
              }
              // Otherwise, use provided content
              extractedContent = content;
            }
          }
        } catch (uploadError) {
          console.warn('Failed to upload file to storage:', uploadError);
          // Continue without file URL if upload fails
        }
      }

      // Use extracted content if available, otherwise fall back to provided content
      const finalContent = extractedContent || content;

      // Validate required fields
      if (!title || title.trim() === '') {
        throw new Error('Title is required');
      }
      if (!finalContent || finalContent.trim() === '') {
        throw new Error('Content is required. Please provide content or upload a file with extractable content.');
      }
      if (!type) {
        throw new Error('Type is required');
      }

      articleData = {
        title: title.trim(),
        content: finalContent.trim(),
        type,
        tags: tags.length > 0 ? tags : undefined,
        brand: brand || undefined,
        id: nanoid(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        metadata: fileUrl ? { fileUrl, fileName: file?.name } : undefined,
      };
    } else {
      // Handle JSON request (backward compatibility)
      const body = await request.json();
      articleData = {
        ...body,
        id: nanoid(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }

    // Validate with better error messages
    const validationResult = KnowledgeBaseArticleSchema.safeParse(articleData);
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      throw new Error(`Validation failed: ${errors}`);
    }
    const article = await createKnowledgeBaseArticle(validationResult.data);

    // Index in Azure AI Search
    try {
      await indexKnowledgeBaseArticle(article);
    } catch (searchError) {
      console.warn('Failed to index article in search:', searchError);
      // Don't fail the request if indexing fails
    }

    return NextResponse.json(article, { status: 201 });
  } catch (error) {
    console.error('Error creating knowledge base article:', error);
    
    // Provide more detailed error information
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isValidationError = errorMessage.includes('ZodError') || errorMessage.includes('parse');
    const isAzureError = errorMessage.includes('Azure') || errorMessage.includes('not configured');
    
    return NextResponse.json(
      { 
        error: 'Failed to create knowledge base article',
        details: errorMessage,
        ...(process.env.NODE_ENV === 'development' && { 
          stack: error instanceof Error ? error.stack : undefined 
        })
      },
      { status: isValidationError ? 400 : isAzureError ? 503 : 500 }
    );
  }
}

