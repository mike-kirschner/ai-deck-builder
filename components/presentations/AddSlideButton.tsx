'use client';

import { useState } from 'react';

interface AddSlideButtonProps {
  presentationId: string;
  onSlideAdded?: () => void;
}

export default function AddSlideButton({ presentationId, onSlideAdded }: AddSlideButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [prompt, setPrompt] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim()) return;

    setLoading(true);

    try {
      const response = await fetch(`/api/presentations/${presentationId}/slides`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || errorData.details || 'Failed to add slide';
        throw new Error(errorMessage);
      }

      const result = await response.json();
      setPrompt('');
      setShowModal(false);
      
      if (onSlideAdded) {
        onSlideAdded();
      } else {
        // Refresh the page to show the new slide
        window.location.reload();
      }
    } catch (error) {
      console.error('Error adding slide:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to add slide. Please try again.';
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="px-4 py-2 bg-emerald-500/90 hover:bg-emerald-500 text-white rounded-lg transition text-sm font-medium"
      >
        + Add Slide
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-900/95 border border-gray-800 rounded-2xl shadow-2xl p-6 max-w-2xl w-full mx-4">
            <h2 className="text-2xl font-bold mb-4 text-gray-100">Add New Slide</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Slide Description / Prompt *
                </label>
                <textarea
                  required
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="w-full border border-gray-800 rounded-lg px-3 py-2 bg-gray-900/60 text-gray-100 placeholder:text-gray-400"
                  rows={4}
                  placeholder="e.g., Create a slide explaining our revenue growth over the past year with key metrics and trends"
                  autoFocus
                />
                <p className="text-xs text-gray-500 mt-1">
                  Describe the content, topic, or purpose of the slide you want to add
                </p>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setPrompt('');
                  }}
                  className="px-4 py-2 border border-gray-800 rounded-lg hover:bg-gray-900/60 text-gray-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !prompt.trim()}
                  className="px-4 py-2 bg-emerald-500/90 hover:bg-emerald-500 text-white rounded-lg disabled:opacity-50 transition"
                >
                  {loading ? 'Generating...' : 'Add Slide'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

