'use client';

import { useEffect, useState } from 'react';
import { KnowledgeBaseArticle } from '@/lib/schemas/knowledge-base';
import { format } from 'date-fns';
import Link from 'next/link';

export default function KnowledgeBaseList() {
  const [articles, setArticles] = useState<KnowledgeBaseArticle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchArticles();
  }, []);

  async function fetchArticles() {
    try {
      const response = await fetch('/api/knowledge-base');
      const data = await response.json();
      setArticles(data);
    } catch (error) {
      console.error('Error fetching knowledge base articles:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-400">Loading...</div>;
  }

  if (articles.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400 mb-4">No knowledge base articles yet.</p>
        <p className="text-gray-500">Upload your first article to get started.</p>
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      {articles.map((article) => (
        <Link
          key={article.id}
          href={`/knowledge-base/${article.id}`}
          className="bg-gray-900/40 border border-gray-800 rounded-2xl shadow-2xl p-6 hover:bg-gray-900/60 hover:border-indigo-500/30 transition-all block"
        >
          <div className="flex items-start justify-between mb-2">
            <h3 className="text-xl font-semibold text-gray-100 hover:text-indigo-400 transition-colors">
              {article.title}
            </h3>
            <span className="px-2 py-1 bg-gray-800 text-gray-300 text-xs rounded capitalize">
              {article.type}
            </span>
          </div>
          <p className="text-gray-400 text-sm mb-4 line-clamp-3">
            {article.content.substring(0, 150)}...
          </p>
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>{format(new Date(article.updated_at), 'MMM d, yyyy')}</span>
            {article.tags && article.tags.length > 0 && (
              <div className="flex gap-1">
                {article.tags.slice(0, 2).map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-1 bg-indigo-500/20 text-indigo-300 text-xs rounded border border-indigo-500/30"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}

