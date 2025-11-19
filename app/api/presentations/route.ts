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

    const validated = PresentationSchema.parse(presentationData);
    const presentation = await createPresentation(validated);
    
    return NextResponse.json(presentation, { status: 201 });
  } catch (error) {
    console.error('Error creating presentation:', error);
    return NextResponse.json(
      { error: 'Failed to create presentation' },
      { status: 500 }
    );
  }
}

