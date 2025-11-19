'use client';

import { useEffect, useState } from 'react';
import { Template } from '@/lib/schemas/template';
import Link from 'next/link';
import { format } from 'date-fns';

export default function TemplateList() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTemplates();
  }, []);

  async function fetchTemplates() {
    try {
      const response = await fetch('/api/templates');
      const data = await response.json();
      setTemplates(data);
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  if (templates.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 mb-4">No templates yet.</p>
        <p className="text-gray-500">Upload your first template to get started.</p>
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      {templates.map((template) => (
        <Link
          key={template.id}
          href={`/templates/${template.id}`}
          className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
        >
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {template.name}
          </h3>
          {template.description && (
            <p className="text-gray-600 mb-4 text-sm">{template.description}</p>
          )}
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span className="capitalize">{template.output_type.replace('_', ' ')}</span>
            <span>{format(new Date(template.updated_at), 'MMM d, yyyy')}</span>
          </div>
          {template.tags && template.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {template.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </Link>
      ))}
    </div>
  );
}

