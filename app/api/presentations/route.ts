import { NextRequest, NextResponse } from 'next/server';
import { createPresentation, listPresentations, getPresentation } from '@/lib/azure/cosmos';
import { PresentationSchema } from '@/lib/schemas/presentation';
import { nanoid } from 'nanoid';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId') || undefined;
    const status = searchParams.get('status') || undefined;

    const presentations = await listPresentations(userId, status);
    return NextResponse.json(presentations);
  } catch (error) {
    console.error('Error listing presentations:', error);
    return NextResponse.json(
      { error: 'Failed to list presentations' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const presentationData = {
      ...body,
      id: nanoid(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      version: 1,
    };

    // Validate with better error messages
    const validationResult = PresentationSchema.safeParse(presentationData);
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      throw new Error(`Validation failed: ${errors}`);
    }
    const presentation = await createPresentation(validationResult.data);
    
    return NextResponse.json(presentation, { status: 201 });
  } catch (error) {
    console.error('Error creating presentation:', error);
    
    // Provide more detailed error information
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isValidationError = errorMessage.includes('ZodError') || errorMessage.includes('parse');
    const isAzureError = errorMessage.includes('Azure') || errorMessage.includes('not configured');
    
    return NextResponse.json(
      { 
        error: 'Failed to create presentation',
        details: errorMessage,
        ...(process.env.NODE_ENV === 'development' && { 
          stack: error instanceof Error ? error.stack : undefined 
        })
      },
      { status: isValidationError ? 400 : isAzureError ? 503 : 500 }
    );
  }
}

