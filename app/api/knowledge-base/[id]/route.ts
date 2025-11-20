import { NextRequest, NextResponse } from 'next/server';
import { getKnowledgeBaseArticle, updateKnowledgeBaseArticle, deleteKnowledgeBaseArticle } from '@/lib/azure/cosmos';
import { KnowledgeBaseArticleSchema } from '@/lib/schemas/knowledge-base';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const article = await getKnowledgeBaseArticle(params.id);
    
    if (!article) {
      return NextResponse.json(
        { error: 'Article not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(article);
  } catch (error) {
    console.error('Error fetching knowledge base article:', error);
    return NextResponse.json(
      { error: 'Failed to fetch article' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const article = await getKnowledgeBaseArticle(params.id);
    
    if (!article) {
      return NextResponse.json(
        { error: 'Article not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { type } = body;

    if (type && !['article', 'deck', 'spec', 'note', 'data', 'position_paper'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid type' },
        { status: 400 }
      );
    }

    const updated = {
      ...article,
      ...(type && { type }),
      updated_at: new Date().toISOString(),
    };

    const validated = KnowledgeBaseArticleSchema.parse(updated);
    const result = await updateKnowledgeBaseArticle(params.id, validated);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error updating knowledge base article:', error);
    return NextResponse.json(
      { error: 'Failed to update article' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const article = await getKnowledgeBaseArticle(params.id);
    
    if (!article) {
      return NextResponse.json(
        { error: 'Article not found' },
        { status: 404 }
      );
    }

    await deleteKnowledgeBaseArticle(params.id);

    return NextResponse.json({ success: true, message: 'Article deleted' });
  } catch (error) {
    console.error('Error deleting knowledge base article:', error);
    return NextResponse.json(
      { error: 'Failed to delete article' },
      { status: 500 }
    );
  }
}
