import { NextRequest, NextResponse } from 'next/server';
import { getPresentation, updatePresentation } from '@/lib/azure/cosmos';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; pageId: string } }
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
    const { title, visible, section } = body;

    // Find the section/page
    const sectionIndex = presentation.content.sections.findIndex(
      s => s.id === params.pageId
    );

    if (sectionIndex === -1) {
      return NextResponse.json(
        { error: 'Page not found' },
        { status: 404 }
      );
    }

    // Update the section
    const updatedSections = [...presentation.content.sections];
    const currentSection = updatedSections[sectionIndex];
    
    if (title !== undefined) {
      updatedSections[sectionIndex] = {
        ...currentSection,
        heading: title.trim(),
      };
    }
    
    // Store section grouping in metadata if provided
    if (section !== undefined) {
      const sectionMetadata = { ...(currentSection.metadata || {}) };
      const sectionValue = typeof section === 'string' ? section.trim() : '';
      if (sectionValue === '') {
        delete sectionMetadata.sectionGroup;
      } else {
        sectionMetadata.sectionGroup = sectionValue;
      }
      updatedSections[sectionIndex] = {
        ...updatedSections[sectionIndex],
        metadata: Object.keys(sectionMetadata).length > 0 ? sectionMetadata : undefined,
      };
    }

    // Update presentation
    const updatedPresentation = {
      ...presentation,
      content: {
        ...presentation.content,
        sections: updatedSections,
      },
      updated_at: new Date().toISOString(),
    };

    await updatePresentation(params.id, updatedPresentation);

    // Return updated page
    const updatedSection = updatedSections[sectionIndex];
    return NextResponse.json({
      id: updatedSection.id,
      title: updatedSection.heading,
      visible: true,
      order: updatedSection.order ?? sectionIndex + 1,
      section: updatedSection.metadata?.sectionGroup,
    });
  } catch (error) {
    console.error('Error updating page:', error);
    return NextResponse.json(
      { error: 'Failed to update page' },
      { status: 500 }
    );
  }
}

