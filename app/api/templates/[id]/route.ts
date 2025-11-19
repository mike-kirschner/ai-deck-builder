import { NextRequest, NextResponse } from 'next/server';
import { getTemplate } from '@/lib/azure/cosmos';
import { getTemplate as getTemplateBlob } from '@/lib/azure/storage';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const template = await getTemplate(params.id);
    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    // Get HTML content from blob storage
    const htmlContent = await getTemplateBlob(template.id, template.version);
    const templateWithHtml = { ...template, html_content: htmlContent };

    return NextResponse.json(templateWithHtml);
  } catch (error) {
    console.error('Error getting template:', error);
    return NextResponse.json(
      { error: 'Failed to get template' },
      { status: 500 }
    );
  }
}

