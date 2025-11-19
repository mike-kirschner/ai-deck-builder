'use client';

import { useEffect, useState } from 'react';
import { Presentation } from '@/lib/schemas/presentation';
import { format } from 'date-fns';

export default function PresentationViewer({ presentationId }: { presentationId: string }) {
  const [presentation, setPresentation] = useState<Presentation | null>(null);
  const [renderedHtml, setRenderedHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'embedded' | 'fullscreen'>('embedded');

  useEffect(() => {
    fetchPresentation();
  }, [presentationId]);

  async function fetchPresentation() {
    try {
      const [presResponse, renderResponse] = await Promise.all([
        fetch(`/api/presentations/${presentationId}`),
        fetch(`/api/presentations/${presentationId}/render`, { method: 'POST' }),
      ]);

      const pres = await presResponse.json();
      const render = await renderResponse.json();

      setPresentation(pres);
      setRenderedHtml(render.html);
    } catch (error) {
      console.error('Error fetching presentation:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleExport(format: 'pdf' | 'pptx') {
    setExporting(format);
    try {
      const response = await fetch(`/api/presentations/${presentationId}/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format }),
      });

      const data = await response.json();
      if (data.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error exporting:', error);
      alert('Failed to export presentation');
    } finally {
      setExporting(null);
    }
  }

  function handleViewInNewWindow() {
    if (renderedHtml) {
      const newWindow = window.open('', '_blank');
      if (newWindow) {
        newWindow.document.write(renderedHtml);
        newWindow.document.close();
      }
    }
  }

  function handleFullscreen() {
    if (renderedHtml) {
      setViewMode('fullscreen');
    }
  }

  function handleExitFullscreen() {
    setViewMode('embedded');
  }

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  if (!presentation) {
    return <div className="text-center py-12">Presentation not found</div>;
  }

  // Fullscreen view
  if (viewMode === 'fullscreen' && renderedHtml) {
    return (
      <div className="fixed inset-0 z-50 bg-white">
        <div className="absolute top-0 left-0 right-0 bg-gray-800 text-white p-4 flex justify-between items-center z-10">
          <h2 className="text-lg font-semibold">{presentation.title}</h2>
          <button
            onClick={handleExitFullscreen}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg"
          >
            Exit Fullscreen
          </button>
        </div>
        <div className="pt-16 h-full overflow-auto">
          <iframe
            srcDoc={renderedHtml}
            className="w-full h-full border-0"
            title="Presentation"
          />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {presentation.title}
            </h1>
            {presentation.content.subtitle && (
              <p className="text-gray-600">{presentation.content.subtitle}</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleViewInNewWindow}
              disabled={!renderedHtml}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              View in New Window
            </button>
            <button
              onClick={handleFullscreen}
              disabled={!renderedHtml}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
            >
              Fullscreen
            </button>
            <button
              onClick={() => handleExport('pdf')}
              disabled={!!exporting}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              {exporting === 'pdf' ? 'Exporting...' : 'Export PDF'}
            </button>
            <button
              onClick={() => handleExport('pptx')}
              disabled={!!exporting}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {exporting === 'pptx' ? 'Exporting...' : 'Export PPTX'}
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-4 text-sm text-gray-500">
          <span>Status: <span className="capitalize">{presentation.status}</span></span>
          <span>Created: {format(new Date(presentation.created_at), 'MMM d, yyyy')}</span>
          <span>Version: {presentation.version}</span>
        </div>
      </div>

      {renderedHtml && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="border-b border-gray-200 p-4 bg-gray-50">
            <p className="text-sm text-gray-600">
              HTML/CSS Presentation View - All styles and formatting are rendered as HTML and CSS
            </p>
          </div>
          <div className="w-full" style={{ minHeight: '600px' }}>
            <iframe
              srcDoc={renderedHtml}
              className="w-full border-0"
              style={{ minHeight: '600px', height: '100vh' }}
              title="Presentation HTML/CSS View"
            />
          </div>
        </div>
      )}
    </div>
  );
}

