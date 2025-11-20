'use client';

import { useEffect, useState } from 'react';
import { Presentation } from '@/lib/schemas/presentation';
import Link from 'next/link';
import { format } from 'date-fns';

export default function PresentationList() {
  const [presentations, setPresentations] = useState<Presentation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPresentations();
  }, []);

  async function fetchPresentations() {
    try {
      const response = await fetch('/api/presentations');
      const data = await response.json();
      setPresentations(data);
    } catch (error) {
      console.error('Error fetching presentations:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-400">Loading...</div>;
  }

  if (presentations.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400 mb-4">No presentations yet.</p>
        <p className="text-gray-500">Create your first presentation to get started.</p>
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      {presentations.map((presentation) => (
        <Link
          key={presentation.id}
          href={`/presentations/${presentation.id}/edit`}
          className="bg-gray-900/40 border border-gray-800 rounded-2xl shadow-2xl p-6 hover:bg-gray-900/60 hover:border-indigo-500/30 transition-all"
        >
          <h3 className="text-xl font-semibold text-gray-100 mb-2">
            {presentation.title}
          </h3>
          {presentation.content.subtitle && (
            <p className="text-gray-400 mb-4">{presentation.content.subtitle}</p>
          )}
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span className="capitalize px-2 py-1 rounded bg-gray-800 text-gray-300">
              {presentation.status}
            </span>
            <span>{format(new Date(presentation.created_at), 'MMM d, yyyy')}</span>
          </div>
        </Link>
      ))}
    </div>
  );
}

