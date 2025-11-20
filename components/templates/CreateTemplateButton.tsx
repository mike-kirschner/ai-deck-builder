'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function CreateTemplateButton() {
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    htmlContent: '',
    outputType: 'multi_slide',
    tags: '',
    brand: '',
  });
  const router = useRouter();

  const supportedFileTypes = [
    'text/html',
    'text/plain',
    'application/xhtml+xml',
  ];

  const supportedExtensions = ['.html', '.htm', '.txt'];

  function isValidFileType(file: File): boolean {
    return (
      supportedFileTypes.includes(file.type) ||
      supportedExtensions.some(ext => file.name.toLowerCase().endsWith(ext))
    );
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isValidFileType(file)) {
      alert(
        `Unsupported file type. Please upload one of: ${supportedExtensions.join(', ')}`
      );
      return;
    }

    // Check file size (limit to 5MB for templates)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    setSelectedFile(file);

    try {
      const text = await file.text();
      setFileContent(text);
      
      // Update form data with file content and auto-populate name if empty
      setFormData(prev => {
        const fileNameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
        return {
          ...prev,
          htmlContent: text,
          name: prev.name || fileNameWithoutExt,
        };
      });
    } catch (error) {
      console.error('Error reading file:', error);
      alert('Failed to read file. Please try again.');
      setSelectedFile(null);
      setFileContent('');
    }
  }

  function handleRemoveFile() {
    setSelectedFile(null);
    setFileContent('');
    setFormData(prev => ({ ...prev, htmlContent: '' }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  function resetForm() {
    setFormData({
      name: '',
      description: '',
      htmlContent: '',
      outputType: 'multi_slide',
      tags: '',
      brand: '',
    });
    setSelectedFile(null);
    setFileContent('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('name', formData.name);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('htmlContent', formData.htmlContent || fileContent);
      formDataToSend.append('outputType', formData.outputType);
      formDataToSend.append('tags', JSON.stringify(formData.tags.split(',').map(t => t.trim()).filter(Boolean)));
      if (formData.brand) {
        formDataToSend.append('brand', formData.brand);
      }
      if (selectedFile) {
        formDataToSend.append('file', selectedFile);
      }

      const response = await fetch('/api/templates', {
        method: 'POST',
        body: formDataToSend,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || errorData.details || 'Failed to create template';
        throw new Error(errorMessage);
      }

      const template = await response.json();
      router.push(`/templates/${template.id}`);
    } catch (error) {
      console.error('Error creating template:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create template. Please try again.';
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
        Upload Template
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-900/95 border border-gray-800 rounded-2xl shadow-2xl p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4 text-gray-100">Upload New Template</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Name *
                  </label>
                  <input
                    required
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full border border-gray-800 rounded-lg px-3 py-2 bg-gray-900/60 text-gray-100 placeholder:text-gray-400"
                    placeholder="e.g., Board Deck v3"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Output Type *
                  </label>
                  <select
                    required
                    value={formData.outputType}
                    onChange={(e) => setFormData({ ...formData, outputType: e.target.value })}
                    className="w-full border border-gray-800 rounded-lg px-3 py-2 bg-gray-900/60 text-gray-100"
                  >
                    <option value="single_slide">Single Slide</option>
                    <option value="multi_slide">Multi Slide</option>
                    <option value="one_pager">One Pager</option>
                    <option value="narrative">Narrative</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full border border-gray-800 rounded-lg px-3 py-2 bg-gray-900/60 text-gray-100 placeholder:text-gray-400"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Tags (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    className="w-full border border-gray-800 rounded-lg px-3 py-2 bg-gray-900/60 text-gray-100 placeholder:text-gray-400"
                    placeholder="e.g., board, executive, roadmap"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Brand
                  </label>
                  <input
                    type="text"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    className="w-full border border-gray-800 rounded-lg px-3 py-2 bg-gray-900/60 text-gray-100 placeholder:text-gray-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Upload HTML File (Optional)
                </label>
                <div className="space-y-2 mb-4">
                  {selectedFile ? (
                    <div className="flex items-center justify-between p-3 bg-gray-900/60 border border-gray-800 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <svg
                          className="w-5 h-5 text-gray-500"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                        <div>
                          <p className="text-sm font-medium text-gray-300">{selectedFile.name}</p>
                          <p className="text-xs text-gray-500">
                            {(selectedFile.size / 1024).toFixed(2)} KB
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveFile}
                        className="text-red-600 hover:text-red-700 text-sm font-medium"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-800 border-dashed rounded-lg cursor-pointer bg-gray-900/60 hover:bg-gray-900/80 transition-colors">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <svg
                          className="w-10 h-10 mb-3 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                          />
                        </svg>
                        <p className="mb-2 text-sm text-gray-500">
                          <span className="font-semibold">Click to upload</span> or drag and drop
                        </p>
                        <p className="text-xs text-gray-500">
                          {supportedExtensions.join(', ').toUpperCase()} (MAX. 5MB)
                        </p>
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        accept={supportedExtensions.join(',')}
                        onChange={handleFileSelect}
                      />
                    </label>
                  )}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-300">
                    HTML Content (with Handlebars) {!selectedFile && '*'}
                  </label>
                  {selectedFile && (
                    <span className="text-xs text-gray-500">
                      Content loaded from file. You can edit it below.
                    </span>
                  )}
                </div>
                <textarea
                  required={!selectedFile}
                  value={formData.htmlContent}
                  onChange={(e) => setFormData({ ...formData, htmlContent: e.target.value })}
                  className="w-full border border-gray-800 rounded-lg px-3 py-2 font-mono text-sm text-gray-100 placeholder:text-gray-400"
                  rows={15}
                  placeholder={
                    selectedFile
                      ? 'Content from file...'
                      : `<div class="slide">
  <h1>{{title}}</h1>
  {{#if subtitle}}
    <p>{{subtitle}}</p>
  {{/if}}
  {{#eachSection sections}}
    <div class="section">
      <h2>{{heading}}</h2>
      {{#if bullets}}
        <ul>
          {{#each bullets}}
            <li>{{this}}</li>
          {{/each}}
        </ul>
      {{/if}}
    </div>
  {{/eachSection}}
</div>`
                  }
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setShowModal(false);
                  }}
                  className="px-4 py-2 border border-gray-800 rounded-lg hover:bg-gray-900/60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-indigo-500/90 text-white rounded-lg hover:bg-indigo-500 disabled:opacity-50"
                >
                  {loading ? 'Uploading...' : 'Upload Template'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

