import puppeteer from 'puppeteer';
import PptxGenJS from 'pptxgenjs';
import { PresentationContent } from '../schemas/presentation';

/**
 * Export HTML presentation to PDF
 */
export async function exportToPDF(htmlContent: string): Promise<Buffer> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '0.5in',
        bottom: '0.5in',
        left: '0.5in',
        right: '0.5in',
      },
    });

    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

/**
 * Export presentation content to PPTX
 */
export async function exportToPPTX(
  content: PresentationContent,
  templateName?: string
): Promise<Buffer> {
  const pptx = new PptxGenJS();
  
  // Set presentation properties
  pptx.author = 'AI Deck Builder';
  pptx.company = 'InfiniteOne';
  pptx.title = content.title;
  pptx.subject = content.subtitle || '';

  // Title slide
  const titleSlide = pptx.addSlide();
  titleSlide.addText(content.title, {
    x: 0.5,
    y: 2,
    w: 9,
    h: 1.5,
    fontSize: 44,
    bold: true,
    align: 'center',
    color: '363636',
  });

  if (content.subtitle) {
    titleSlide.addText(content.subtitle, {
      x: 0.5,
      y: 3.8,
      w: 9,
      h: 0.8,
      fontSize: 24,
      align: 'center',
      color: '666666',
    });
  }

  // Content slides
  for (const section of content.sections) {
    const slide = pptx.addSlide();
    
    // Section heading
    slide.addText(section.heading, {
      x: 0.5,
      y: 0.5,
      w: 9,
      h: 0.8,
      fontSize: 32,
      bold: true,
      color: '363636',
    });

    // Bullets or content
    if (section.bullets && section.bullets.length > 0) {
      const bulletPoints = section.bullets.map(bullet => ({ text: bullet }));
      slide.addText(bulletPoints, {
        x: 0.7,
        y: 1.8,
        w: 8.6,
        h: 4,
        fontSize: 18,
        bullet: true,
        color: '363636',
        lineSpacing: 28,
      });
    } else if (section.content) {
      slide.addText(section.content, {
        x: 0.7,
        y: 1.8,
        w: 8.6,
        h: 4,
        fontSize: 18,
        color: '363636',
        lineSpacing: 28,
      });
    }
  }

  // Generate buffer
  const buffer = await pptx.write({ outputType: 'nodebuffer' });
  return buffer as Buffer;
}

/**
 * Wrap HTML content in a full document with Tailwind
 */
export function wrapHTMLWithTailwind(htmlContent: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Presentation</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @page {
      size: A4;
      margin: 0;
    }
    @media print {
      .slide {
        page-break-after: always;
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body class="bg-gray-50">
  ${htmlContent}
</body>
</html>`;
}

