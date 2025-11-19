import { NextRequest, NextResponse } from 'next/server';
import { getPresentation } from '@/lib/azure/cosmos';
import { getTemplate } from '@/lib/azure/cosmos';
import { getTemplate as getTemplateBlob } from '@/lib/azure/storage';
import { TemplateEngine } from '@/lib/template/engine';
import { wrapHTMLWithTailwind } from '@/lib/template/exporters';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const presentation = await getPresentation(params.id);
    if (!presentation) {
      return NextResponse.json(
        { error: 'Presentation not found' },
        { status: 404 }
      );
    }

    const template = await getTemplate(presentation.template_id);
    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    // Get template HTML from blob storage
    const templateHtml = await getTemplateBlob(template.id, template.version);
    const templateWithHtml = { ...template, html_content: templateHtml };

    // Render the presentation
    const rendered = await TemplateEngine.render(templateWithHtml, presentation.content);
    const wrappedHtml = wrapHTMLWithTailwind(rendered);

    return NextResponse.json({ html: wrappedHtml });
  } catch (error) {
    console.error('Error rendering presentation:', error);
    return NextResponse.json(
      { error: 'Failed to render presentation' },
      { status: 500 }
    );
  }
}

