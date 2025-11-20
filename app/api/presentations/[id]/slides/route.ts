import { NextRequest, NextResponse } from 'next/server';
import { getPresentation, updatePresentation } from '@/lib/azure/cosmos';
import { callOutlineAgent } from '@/lib/azure/ai-foundry';
import { nanoid } from 'nanoid';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { prompt } = body;

    if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    // Get the existing presentation
    const presentation = await getPresentation(params.id);
    if (!presentation) {
      return NextResponse.json(
        { error: 'Presentation not found' },
        { status: 404 }
      );
    }

    // Use the outline agent to generate slide content based on the prompt
    // We'll create a focused request for a single slide
    const slideRequest = {
      question: prompt,
      context_instructions: `Generate a single slide for an existing presentation titled "${presentation.title}". 
      The presentation already has ${presentation.content.sections.length} sections.
      Create a focused, standalone slide that fits with the presentation's theme and audience.
      Return only one section in the sections array.`,
      audience: presentation.content.audience,
      tone: undefined, // Could extract from presentation metadata
      length: '1 slide',
    };

    let agentResponse;
    try {
      agentResponse = await callOutlineAgent(slideRequest);
    } catch (agentError) {
      console.error('Error calling outline agent:', agentError);
      const errorMessage = agentError instanceof Error ? agentError.message : 'Unknown error';
      return NextResponse.json(
        { 
          error: 'Failed to generate slide content',
          details: errorMessage
        },
        { status: 500 }
      );
    }

    if (!agentResponse.content.sections || agentResponse.content.sections.length === 0) {
      return NextResponse.json(
        { 
          error: 'Failed to generate slide content',
          details: 'AI agent returned no sections'
        },
        { status: 500 }
      );
    }

    // Get the first section from the response (should be the only one)
    const generatedSection = agentResponse.content.sections[0];

    // Create a new section with a unique ID
    const newSection = {
      id: `slide_${nanoid(8)}`,
      heading: generatedSection.heading || prompt.substring(0, 50),
      bullets: generatedSection.bullets || [],
      content: generatedSection.content || '',
      notes: generatedSection.notes || '',
      order: presentation.content.sections.length + 1,
    };

    // Add the new section to the presentation
    const updatedSections = [...presentation.content.sections, newSection];

    // Update the presentation
    const updatedPresentation = {
      ...presentation,
      content: {
        ...presentation.content,
        sections: updatedSections,
      },
      updated_at: new Date().toISOString(),
      version: presentation.version + 1,
    };

    await updatePresentation(params.id, updatedPresentation);

    return NextResponse.json({
      success: true,
      slide: newSection,
      message: 'Slide added successfully',
    });
  } catch (error) {
    console.error('Error adding slide:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    // Log full error details for debugging
    console.error('Full error details:', {
      message: errorMessage,
      stack: errorStack,
      error: error
    });
    
    return NextResponse.json(
      { 
        error: 'Failed to add slide',
        details: errorMessage
      },
      { status: 500 }
    );
  }
}

