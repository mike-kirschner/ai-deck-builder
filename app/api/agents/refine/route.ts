import { NextRequest, NextResponse } from 'next/server';
import { callRefinementAgent } from '@/lib/azure/ai-foundry';
import { RefinementRequestSchema } from '@/lib/schemas/agent';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = RefinementRequestSchema.parse(body);

    const refined = await callRefinementAgent(validated);
    return NextResponse.json({ content: refined });
  } catch (error) {
    console.error('Error calling refinement agent:', error);
    return NextResponse.json(
      { error: 'Failed to refine content' },
      { status: 500 }
    );
  }
}

