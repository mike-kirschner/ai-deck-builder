import { NextRequest, NextResponse } from 'next/server';
import { getPresentation } from '@/lib/azure/cosmos';
import { getTemplate } from '@/lib/azure/cosmos';
import { getTemplate as getTemplateBlob } from '@/lib/azure/storage';
import { TemplateEngine } from '@/lib/template/engine';
import { exportToPDF, exportToPPTX, wrapHTMLWithTailwind } from '@/lib/template/exporters';
import { uploadPresentation } from '@/lib/azure/storage';
import { updatePresentation } from '@/lib/azure/cosmos';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { format } = await request.json(); // 'pdf' or 'pptx'
    
    // Validate format
    if (format !== 'pdf' && format !== 'pptx') {
      return NextResponse.json(
        { error: 'Invalid format. Use "pdf" or "pptx"' },
        { status: 400 }
      );
    }
    
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

    // Get template HTML and render
    const templateHtml = await getTemplateBlob(template.id, template.version);
    const templateWithHtml = { ...template, html_content: templateHtml };
    const rendered = await TemplateEngine.render(templateWithHtml, presentation.content);
    const wrappedHtml = wrapHTMLWithTailwind(rendered);

    let exportUrl: string;
    let buffer: Buffer;

    if (format === 'pdf') {
      buffer = await exportToPDF(wrappedHtml);
      exportUrl = await uploadPresentation(params.id, buffer, 'pdf');
    } else {
      // format is 'pptx' at this point
      buffer = await exportToPPTX(presentation.content);
      exportUrl = await uploadPresentation(params.id, buffer, 'pptx');
    }

    // Update presentation with export URL
    const exportUrls = presentation.export_urls || {};
    // TypeScript now knows format is 'pdf' | 'pptx'
    if (format === 'pdf') {
      exportUrls.pdf = exportUrl;
    } else {
      exportUrls.pptx = exportUrl;
    }
    await updatePresentation(params.id, { export_urls: exportUrls });

    return NextResponse.json({ url: exportUrl, format });
  } catch (error) {
    console.error('Error exporting presentation:', error);
    return NextResponse.json(
      { error: 'Failed to export presentation' },
      { status: 500 }
    );
  }
}

