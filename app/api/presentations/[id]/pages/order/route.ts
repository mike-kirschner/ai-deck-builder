import { NextRequest, NextResponse } from 'next/server';
import { getPresentation, updatePresentation } from '@/lib/azure/cosmos';

export async function PUT(
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

    const body = await request.json();
    const { orderedIds } = body;

    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      return NextResponse.json(
        { error: 'orderedIds array is required' },
        { status: 400 }
      );
    }

    // Create a map of new order
    const orderMap = new Map<number, string>();
    orderedIds.forEach((id, index) => {
      orderMap.set(index + 1, id);
    });

    // Reorder sections based on orderedIds
    const reorderedSections = orderedIds
      .map(id => presentation.content.sections.find(s => s.id === id))
      .filter(Boolean) as typeof presentation.content.sections;

    // Update order numbers
    const normalizedSections = reorderedSections.map((section, index) => ({
      ...section,
      order: index + 1,
    }));

    // Update presentation
    const updatedPresentation = {
      ...presentation,
      content: {
        ...presentation.content,
        sections: normalizedSections,
      },
      updated_at: new Date().toISOString(),
    };

    await updatePresentation(params.id, updatedPresentation);

    // Return updated pages
    const pages = normalizedSections.map((section, index) => ({
      id: section.id,
      title: section.heading,
      visible: true,
      order: section.order ?? index + 1,
      section: undefined,
    }));

    return NextResponse.json(pages);
  } catch (error) {
    console.error('Error updating page order:', error);
    return NextResponse.json(
      { error: 'Failed to update page order' },
      { status: 500 }
    );
  }
}

