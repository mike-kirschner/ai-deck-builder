'use client';

import { useEffect, useState } from 'react';
import { Template } from '@/lib/schemas/template';
import { format } from 'date-fns';

export default function TemplateViewer({ templateId }: { templateId: string }) {
  const [template, setTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTemplate();
  }, [templateId]);

  async function fetchTemplate() {
    try {
      const response = await fetch(`/api/templates/${templateId}`);
      if (!response.ok) {
        throw new Error('Template not found');
      }
      const data = await response.json();
      setTemplate(data);
    } catch (error) {
      console.error('Error fetching template:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  if (!template) {
    return <div className="text-center py-12">Template not found</div>;
  }

  return (
    <div>
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{template.name}</h1>
        {template.description && (
          <p className="text-gray-600 mb-4">{template.description}</p>
        )}
        
        <div className="flex items-center space-x-4 text-sm text-gray-500 mb-4">
          <span>Type: <span className="capitalize">{template.output_type.replace('_', ' ')}</span></span>
          <span>Version: {template.version}</span>
          <span>Updated: {format(new Date(template.updated_at), 'MMM d, yyyy')}</span>
        </div>

        {template.tags && template.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
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

        {template.brand && (
          <div className="text-sm text-gray-600">
            Brand: <span className="font-medium">{template.brand}</span>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">HTML Template</h2>
        <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto text-sm">
          <code>{template.html_content}</code>
        </pre>
      </div>
    </div>
  );
}

