'use client';

import { useEffect, useState } from 'react';
import { Presentation } from '@/lib/schemas/presentation';
import { format } from 'date-fns';
import AddSlideButton from './AddSlideButton';

export default function PresentationViewer({ presentationId }: { presentationId: string }) {
  const [presentation, setPresentation] = useState<Presentation | null>(null);
  const [renderedHtml, setRenderedHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'embedded' | 'fullscreen'>('embedded');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    fetchPresentation();
  }, [presentationId, refreshKey]);

  async function fetchPresentation() {
    setLoading(true);
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
    return <div className="text-center py-12 text-gray-400">Loading...</div>;
  }

  if (!presentation) {
    return <div className="text-center py-12 text-gray-400">Presentation not found</div>;
  }

  // Fullscreen view
  if (viewMode === 'fullscreen' && renderedHtml) {
    return (
      <div className="fixed inset-0 z-50 bg-gray-950">
        <div className="absolute top-0 left-0 right-0 bg-gray-900 border-b border-gray-800 text-gray-100 p-4 flex justify-between items-center z-10">
          <h2 className="text-lg font-semibold">{presentation.title}</h2>
          <button
            onClick={handleExitFullscreen}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition"
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
      <div className="bg-gray-900/40 border border-gray-800 rounded-2xl shadow-2xl p-6 mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-100 mb-2">
              {presentation.title}
            </h1>
            {presentation.content.subtitle && (
              <p className="text-gray-400">{presentation.content.subtitle}</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <AddSlideButton 
              presentationId={presentationId}
              onSlideAdded={() => {
                setRefreshKey(prev => prev + 1);
              }}
            />
            <button
              onClick={handleViewInNewWindow}
              disabled={!renderedHtml}
              className="px-4 py-2 bg-indigo-500/90 hover:bg-indigo-500 text-white rounded-lg disabled:opacity-50 transition text-sm"
            >
              View in New Window
            </button>
            <button
              onClick={handleFullscreen}
              disabled={!renderedHtml}
              className="px-4 py-2 bg-purple-500/90 hover:bg-purple-500 text-white rounded-lg disabled:opacity-50 transition text-sm"
            >
              Fullscreen
            </button>
            <button
              onClick={() => handleExport('pdf')}
              disabled={!!exporting}
              className="px-4 py-2 bg-rose-500/90 hover:bg-rose-500 text-white rounded-lg disabled:opacity-50 transition text-sm"
            >
              {exporting === 'pdf' ? 'Exporting...' : 'Export PDF'}
            </button>
            <button
              onClick={() => handleExport('pptx')}
              disabled={!!exporting}
              className="px-4 py-2 bg-emerald-500/90 hover:bg-emerald-500 text-white rounded-lg disabled:opacity-50 transition text-sm"
            >
              {exporting === 'pptx' ? 'Exporting...' : 'Export PPTX'}
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-4 text-sm text-gray-500">
          <span>Status: <span className="capitalize px-2 py-1 rounded bg-gray-800 text-gray-300">{presentation.status}</span></span>
          <span>Created: {format(new Date(presentation.created_at), 'MMM d, yyyy')}</span>
          <span>Version: {presentation.version}</span>
        </div>
      </div>

      {renderedHtml && (
        <div className="bg-gray-900/40 border border-gray-800 rounded-2xl shadow-2xl overflow-hidden">
          <div className="border-b border-gray-800 p-4 bg-gray-900/60">
            <p className="text-sm text-gray-400">
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

