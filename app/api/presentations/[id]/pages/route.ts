import { NextRequest, NextResponse } from 'next/server';
import { getPresentation, updatePresentation } from '@/lib/azure/cosmos';

export async function GET(
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

    // Convert sections to pages
    const pages = presentation.content.sections.map((section, index) => ({
      id: section.id,
      title: section.heading,
      visible: true, // Default to visible, can be extended later
      order: section.order ?? index + 1,
      section: section.metadata?.sectionGroup, // Get section group from metadata
    }));

    return NextResponse.json(pages.sort((a, b) => a.order - b.order));
  } catch (error) {
    console.error('Error fetching pages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pages' },
      { status: 500 }
    );
  }
}

