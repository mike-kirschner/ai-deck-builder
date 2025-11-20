'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CreatePresentationButton() {
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    question: '',
    audience: '',
    tone: '',
    length: '',
    template_id: '',
  });
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/presentations/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          created_by: 'user', // TODO: Get from auth
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        // Show detailed error message if available
        let errorMessage = errorData.details || errorData.error || 'Failed to generate presentation';
        
        // Add helpful context for common errors
        if (errorMessage.includes('not configured')) {
          errorMessage += '\n\nPlease check your .env.local file and ensure Azure AI Foundry is configured.';
        } else if (errorMessage.includes('No template')) {
          errorMessage += '\n\nPlease create a template first or specify a template_id.';
        } else if (errorMessage.includes('Template not found')) {
          errorMessage += '\n\nThe specified template does not exist. Please check the template ID.';
        }
        
        throw new Error(errorMessage);
      }

      const presentation = await response.json();
      router.push(`/presentations/${presentation.id}`);
    } catch (error) {
      console.error('Error generating presentation:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate presentation. Please try again.';
      alert(errorMessage);
    } finally {
      setLoading(false);
      setShowModal(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="px-4 py-2 rounded-lg bg-indigo-500/90 hover:bg-indigo-500 text-sm font-semibold transition"
      >
        Create Presentation
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-900/95 border border-gray-800 rounded-2xl shadow-2xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4 text-gray-100">Create New Presentation</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Question / Prompt *
                </label>
                <textarea
                  required
                  value={formData.question}
                  onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                  className="w-full border border-gray-800 rounded-lg px-3 py-2 bg-gray-900/60 text-gray-100 placeholder:text-gray-400"
                  rows={3}
                  placeholder="e.g., Create a 5-7 slide deck explaining our AI-powered presentation generator for the board"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Audience
                  </label>
                  <input
                    type="text"
                    value={formData.audience}
                    onChange={(e) => setFormData({ ...formData, audience: e.target.value })}
                    className="w-full border border-gray-800 rounded-lg px-3 py-2 bg-gray-900/60 text-gray-100 placeholder:text-gray-400"
                    placeholder="e.g., Board of Directors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Tone
                  </label>
                  <input
                    type="text"
                    value={formData.tone}
                    onChange={(e) => setFormData({ ...formData, tone: e.target.value })}
                    className="w-full border border-gray-800 rounded-lg px-3 py-2 bg-gray-900/60 text-gray-100 placeholder:text-gray-400"
                    placeholder="e.g., Professional, Casual"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Length
                </label>
                <input
                  type="text"
                  value={formData.length}
                  onChange={(e) => setFormData({ ...formData, length: e.target.value })}
                  className="w-full border border-gray-800 rounded-lg px-3 py-2 bg-gray-900/60 text-gray-100 placeholder:text-gray-400"
                  placeholder="e.g., 5-7 slides"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Template ID (optional)
                </label>
                <input
                  type="text"
                  value={formData.template_id}
                  onChange={(e) => setFormData({ ...formData, template_id: e.target.value })}
                  className="w-full border border-gray-800 rounded-lg px-3 py-2 bg-gray-900/60 text-gray-100 placeholder:text-gray-400"
                  placeholder="Leave empty for auto-selection"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-800 rounded-lg hover:bg-gray-900/60 text-gray-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-indigo-500/90 hover:bg-indigo-500 text-white rounded-lg disabled:opacity-50 transition"
                >
                  {loading ? 'Generating...' : 'Generate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

