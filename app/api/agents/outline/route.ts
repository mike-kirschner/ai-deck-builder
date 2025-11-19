import { NextRequest, NextResponse } from 'next/server';
import { callOutlineAgent } from '@/lib/azure/ai-foundry';
import { OutlineAgentRequestSchema } from '@/lib/schemas/agent';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = OutlineAgentRequestSchema.parse(body);

    const response = await callOutlineAgent(validated);
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error calling outline agent:', error);
    return NextResponse.json(
      { error: 'Failed to generate outline' },
      { status: 500 }
    );
  }
}

