import { NextRequest, NextResponse } from 'next/server';
import { createTemplate, listTemplates } from '@/lib/azure/cosmos';
import { uploadTemplate, uploadFile } from '@/lib/azure/storage';
import { TemplateSchema } from '@/lib/schemas/template';
import { nanoid } from 'nanoid';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const activeOnly = searchParams.get('activeOnly') !== 'false';

    const templates = await listTemplates(activeOnly);
    return NextResponse.json(templates);
  } catch (error) {
    console.error('Error listing templates:', error);
    return NextResponse.json(
      { error: 'Failed to list templates' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const htmlContent = formData.get('htmlContent') as string;
    const outputType = formData.get('outputType') as string;
    const tags = formData.get('tags') ? JSON.parse(formData.get('tags') as string) : [];
    const brand = formData.get('brand') as string | null;
    const file = formData.get('file') as File | null;

    const templateId = nanoid();
    const version = 1;

    // Determine HTML content - use file content if file was uploaded, otherwise use form content
    let finalHtmlContent = htmlContent;
    let fileUrl: string | undefined;

    // If a file was uploaded, extract content and optionally store the file
    if (file && file.size > 0) {
      try {
        const fileBuffer = Buffer.from(await file.arrayBuffer());
        const fileName = `${templateId}/${file.name}`;
        
        // Store the original file in Azure Storage
        fileUrl = await uploadFile(
          'templates',
          fileName,
          fileBuffer,
          file.type || 'text/html'
        );

        // Use file content if htmlContent is empty or use file text
        if (!finalHtmlContent || finalHtmlContent.trim() === '') {
          finalHtmlContent = fileBuffer.toString('utf-8');
        }
      } catch (uploadError) {
        console.warn('Failed to upload template file to storage:', uploadError);
        // Continue without file URL if upload fails
      }
    }

    // Upload template HTML to blob storage
    await uploadTemplate(templateId, finalHtmlContent, version);

    // Create template metadata in Cosmos
    const templateData = {
      id: templateId,
      name,
      description: description || undefined,
      version,
      html_content: '', // Not stored in DB, only in blob
      output_type: outputType as any,
      tags,
      brand: brand || undefined,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_active: true,
      metadata: fileUrl ? { fileUrl, fileName: file?.name } : undefined,
    };

    const validated = TemplateSchema.parse(templateData);
    const template = await createTemplate(validated);

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error('Error creating template:', error);
    
    // Provide more detailed error information
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorDetails = error instanceof Error ? error.stack : String(error);
    
    return NextResponse.json(
      { 
        error: 'Failed to create template',
        details: errorMessage,
        ...(process.env.NODE_ENV === 'development' && { stack: errorDetails })
      },
      { status: 500 }
    );
  }
}

