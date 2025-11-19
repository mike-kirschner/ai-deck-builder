'use client';

import { useEffect, useState } from 'react';
import { KnowledgeBaseArticle } from '@/lib/schemas/knowledge-base';
import { format } from 'date-fns';

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
    return <div className="text-center py-12">Loading...</div>;
  }

  if (articles.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 mb-4">No knowledge base articles yet.</p>
        <p className="text-gray-500">Upload your first article to get started.</p>
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      {articles.map((article) => (
        <div
          key={article.id}
          className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-start justify-between mb-2">
            <h3 className="text-xl font-semibold text-gray-900">
              {article.title}
            </h3>
            <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded capitalize">
              {article.type}
            </span>
          </div>
          <p className="text-gray-600 text-sm mb-4 line-clamp-3">
            {article.content.substring(0, 150)}...
          </p>
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>{format(new Date(article.updated_at), 'MMM d, yyyy')}</span>
            {article.tags && article.tags.length > 0 && (
              <div className="flex gap-1">
                {article.tags.slice(0, 2).map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

