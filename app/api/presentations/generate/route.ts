import { NextRequest, NextResponse } from 'next/server';
import { callOutlineAgent } from '@/lib/azure/ai-foundry';
import { getTemplate, listTemplates } from '@/lib/azure/cosmos';
import { createPresentation } from '@/lib/azure/cosmos';
import { OutlineAgentRequestSchema } from '@/lib/schemas/agent';
import { PresentationSchema } from '@/lib/schemas/presentation';
import { nanoid } from 'nanoid';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { question, audience, tone, length, template_id, context_instructions, created_by } = body;

    // Validate agent request
    const agentRequest = OutlineAgentRequestSchema.parse({
      question,
      audience,
      tone,
      length,
      template_id,
      context_instructions,
    });

    // Call outline agent
    const agentResponse = await callOutlineAgent(agentRequest);

    // Determine template
    let finalTemplateId = template_id || agentResponse.template_suggestion;
    
    // If no template specified, try to get a default template
    if (!finalTemplateId) {
      const templates = await listTemplates(true); // Get active templates only
      if (templates.length > 0) {
        // Use the first available template as default
        finalTemplateId = templates[0].id;
        console.log(`No template specified, using default template: ${finalTemplateId}`);
      } else {
        return NextResponse.json(
          { 
            error: 'No template specified and no templates available. Please create a template first or specify a template_id.' 
          },
          { status: 400 }
        );
      }
    }

    const template = await getTemplate(finalTemplateId);
    if (!template) {
      return NextResponse.json(
        { error: `Template not found: ${finalTemplateId}` },
        { status: 404 }
      );
    }

    // Create presentation
    const presentationData = {
      id: nanoid(),
      title: agentResponse.content.title,
      created_by: created_by || 'system',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      template_id: finalTemplateId,
      status: 'draft' as const,
      content: agentResponse.content,
      version: 1,
    };

    const validated = PresentationSchema.parse(presentationData);
    const presentation = await createPresentation(validated);

    return NextResponse.json(presentation, { status: 201 });
  } catch (error) {
    console.error('Error generating presentation:', error);
    
    // Provide more detailed error information
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorDetails = error instanceof Error ? error.stack : String(error);
    
    return NextResponse.json(
      { 
        error: 'Failed to generate presentation',
        details: errorMessage,
        ...(process.env.NODE_ENV === 'development' && { stack: errorDetails })
      },
      { status: 500 }
    );
  }
}

