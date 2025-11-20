'use client';

import { useEffect, useState } from 'react';
import { KnowledgeBaseArticle } from '@/lib/schemas/knowledge-base';
import { format } from 'date-fns';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface KnowledgeBaseDetailProps {
  articleId: string;
}

export default function KnowledgeBaseDetail({ articleId }: KnowledgeBaseDetailProps) {
  const [article, setArticle] = useState<KnowledgeBaseArticle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchArticle();
  }, [articleId]);

  async function fetchArticle() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/knowledge-base/${articleId}`);
      if (!response.ok) {
        if (response.status === 404) {
          setError('Article not found');
        } else {
          setError('Failed to load article');
        }
        return;
      }
      const data = await response.json();
      setArticle(data);
    } catch (error) {
      console.error('Error fetching article:', error);
      setError('Failed to load article');
    } finally {
      setLoading(false);
    }
  }

  async function handleTypeChange(newType: string) {
    if (!article) return;
    
    setSaving(true);
    try {
      const response = await fetch(`/api/knowledge-base/${articleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: newType }),
      });

      if (!response.ok) throw new Error('Failed to update type');

      const updated = await response.json();
      setArticle(updated);
    } catch (error) {
      console.error('Error updating type:', error);
      alert('Failed to update content type');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!article) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/knowledge-base/${articleId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete article');

      // Redirect to knowledge base list
      router.push('/knowledge-base');
    } catch (error) {
      console.error('Error deleting article:', error);
      alert('Failed to delete article');
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400">Loading article...</div>
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="text-center py-12">
        <div className="text-rose-400 mb-4">{error || 'Article not found'}</div>
        <Link
          href="/knowledge-base"
          className="text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          ← Back to Knowledge Base
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <Link
            href="/knowledge-base"
            className="text-sm text-gray-400 hover:text-gray-100 transition-colors mb-4 inline-block"
          >
            ← Back to Knowledge Base
          </Link>
          <p className="text-xs uppercase tracking-[0.3em] text-indigo-400 font-semibold mb-2">
            knowledge base content
          </p>
          <h1 className="text-3xl font-bold text-gray-100 mb-4">{article.title}</h1>
          <div className="flex items-center gap-4 flex-wrap">
            <div>
              <label className="text-xs uppercase tracking-wider text-gray-500 mb-1 block">
                Content Type
              </label>
              <select
                value={article.type}
                onChange={(e) => handleTypeChange(e.target.value)}
                disabled={saving}
                className="px-3 py-2 bg-gray-900/60 border border-gray-800 rounded-lg text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="article">Article</option>
                <option value="deck">Deck</option>
                <option value="spec">Spec</option>
                <option value="note">Note</option>
                <option value="data">Data</option>
                <option value="position_paper">Position Paper</option>
              </select>
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-gray-500 mb-1 block">
                Date Added
              </label>
              <p className="text-gray-100 font-medium">
                {format(new Date(article.created_at), 'MMM d, yyyy')}
              </p>
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-gray-500 mb-1 block">
                Last Updated
              </label>
              <p className="text-gray-100 font-medium">
                {format(new Date(article.updated_at), 'MMM d, yyyy')}
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <button
            onClick={() => setShowDeleteConfirm(true)}
            disabled={saving}
            className="px-4 py-2 bg-rose-500/90 hover:bg-rose-500 text-white rounded-lg disabled:opacity-50 transition text-sm font-medium"
          >
            Delete
          </button>
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-900/95 border border-gray-800 rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold text-gray-100 mb-4">Confirm Delete</h2>
            <p className="text-gray-300 mb-6">
              Are you sure you want to delete "{article.title}"? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 border border-gray-800 rounded-lg hover:bg-gray-900/60 text-gray-300 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={saving}
                className="px-4 py-2 bg-rose-500/90 hover:bg-rose-500 text-white rounded-lg disabled:opacity-50 transition"
              >
                {saving ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Metadata Section */}
      <div className="bg-gray-900/40 border border-gray-800 rounded-2xl shadow-2xl p-6">
        <h2 className="text-lg font-semibold text-gray-100 mb-4">Metadata</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {article.brand && (
            <div>
              <label className="text-xs uppercase tracking-wider text-gray-500 mb-1 block">
                Brand
              </label>
              <p className="text-gray-100">{article.brand}</p>
            </div>
          )}
          {article.owner && (
            <div>
              <label className="text-xs uppercase tracking-wider text-gray-500 mb-1 block">
                Owner
              </label>
              <p className="text-gray-100">{article.owner}</p>
            </div>
          )}
          {article.source_url && (
            <div className="md:col-span-2">
              <label className="text-xs uppercase tracking-wider text-gray-500 mb-1 block">
                Source URL
              </label>
              <a
                href={article.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-400 hover:text-indigo-300 transition-colors break-all"
              >
                {article.source_url}
              </a>
            </div>
          )}
          {article.tags && article.tags.length > 0 && (
            <div className="md:col-span-2">
              <label className="text-xs uppercase tracking-wider text-gray-500 mb-2 block">
                Tags
              </label>
              <div className="flex flex-wrap gap-2">
                {article.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 bg-indigo-500/20 text-indigo-300 text-sm rounded border border-indigo-500/30"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
          {article.metadata && Object.keys(article.metadata).length > 0 && (
            <div className="md:col-span-2">
              <label className="text-xs uppercase tracking-wider text-gray-500 mb-2 block">
                Additional Metadata
              </label>
              <div className="bg-gray-900/60 rounded-lg p-4">
                <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono">
                  {JSON.stringify(article.metadata, null, 2)}
                </pre>
              </div>
            </div>
          )}
          {article.metadata?.fileUrl && (
            <div className="md:col-span-2">
              <label className="text-xs uppercase tracking-wider text-gray-500 mb-1 block">
                File
              </label>
              <a
                href={article.metadata.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                {article.metadata.fileName || 'View File'} →
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Content Section */}
      <div className="bg-gray-900/40 border border-gray-800 rounded-2xl shadow-2xl p-6">
        <h2 className="text-lg font-semibold text-gray-100 mb-4">Content</h2>
        <div className="prose prose-invert max-w-none">
          <div className="text-gray-300 whitespace-pre-wrap leading-relaxed">
            {article.content}
          </div>
        </div>
      </div>
    </div>
  );
}

