'use client';

import { useState, useRef } from 'react';

export default function CreateKnowledgeBaseButton() {
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [useFileUpload, setUseFileUpload] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    type: 'article' as const,
    tags: '',
    brand: '',
  });

  const supportedFileTypes = [
    'text/plain',
    'text/markdown',
    'text/csv',
    'application/json',
    'text/html',
    'text/xml',
    'application/xml',
    'application/pdf',
  ];

  const supportedExtensions = ['.txt', '.md', '.csv', '.json', '.html', '.xml', '.log', '.pdf'];

  function isValidFileType(file: File): boolean {
    return (
      supportedFileTypes.includes(file.type) ||
      supportedExtensions.some(ext => file.name.toLowerCase().endsWith(ext))
    );
  }

  function isPDFFile(file: File): boolean {
    return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
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

    // Check file size (limit to 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB');
      return;
    }

    setSelectedFile(file);
    setUseFileUpload(true);

    // For PDF files, text extraction happens on the server
    if (isPDFFile(file)) {
      // Auto-populate title from filename
      setFormData(prev => {
        const fileNameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
        return {
          ...prev,
          title: prev.title || fileNameWithoutExt,
          content: '', // Will be populated by server after PDF extraction
        };
      });
      setFileContent(''); // Will be populated by server
    } else {
      // For text files, extract content on client side
      try {
        const text = await file.text();
        setFileContent(text);
        
        // Update form data with file content and auto-populate title if empty
        setFormData(prev => {
          const fileNameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
          return {
            ...prev,
            content: text,
            title: prev.title || fileNameWithoutExt,
          };
        });
      } catch (error) {
        console.error('Error reading file:', error);
        alert('Failed to read file. Please try again.');
        setSelectedFile(null);
        setFileContent('');
      }
    }
  }

  function handleRemoveFile() {
    setSelectedFile(null);
    setFileContent('');
    setUseFileUpload(false);
    setFormData(prev => ({ ...prev, content: '' }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('title', formData.title);
      // For PDFs, content will be extracted on server, so send empty string if no content
      // For other files, use extracted content or manual entry
      const contentToSend = selectedFile && isPDFFile(selectedFile) 
        ? (formData.content || '') 
        : (formData.content || fileContent);
      formDataToSend.append('content', contentToSend);
      formDataToSend.append('type', formData.type);
      formDataToSend.append('tags', JSON.stringify(
        formData.tags.split(',').map(t => t.trim()).filter(Boolean)
      ));
      if (formData.brand) {
        formDataToSend.append('brand', formData.brand);
      }
      if (selectedFile) {
        formDataToSend.append('file', selectedFile);
      }

      const response = await fetch('/api/knowledge-base', {
        method: 'POST',
        body: formDataToSend,
      });

      if (!response.ok) {
        throw new Error('Failed to create knowledge base article');
      }

      // Refresh the page to show new article
      window.location.reload();
    } catch (error) {
      console.error('Error creating knowledge base article:', error);
      alert('Failed to create article. Please try again.');
    } finally {
      setLoading(false);
      setShowModal(false);
    }
  }

  function resetForm() {
    setFormData({
      title: '',
      content: '',
      type: 'article' as const,
      tags: '',
      brand: '',
    });
    setSelectedFile(null);
    setFileContent('');
    setUseFileUpload(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
      >
        Add Article
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">Add Knowledge Base Article</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title *
                </label>
                <input
                  required
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 placeholder:text-gray-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type *
                </label>
                <select
                  required
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900"
                >
                  <option value="article">Article</option>
                  <option value="deck">Deck</option>
                  <option value="spec">Spec</option>
                  <option value="note">Note</option>
                  <option value="data">Data</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Upload File (Optional)
                </label>
                <div className="space-y-2">
                  {selectedFile ? (
                    <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-300 rounded-lg">
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
                          <p className="text-sm font-medium text-gray-700">{selectedFile.name}</p>
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
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
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
                          {supportedExtensions.join(', ').toUpperCase()} (MAX. 10MB)
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
                  <label className="block text-sm font-medium text-gray-700">
                    Content {!selectedFile && '*'}
                  </label>
                  {selectedFile && (
                    <span className="text-xs text-gray-500">
                      {isPDFFile(selectedFile) 
                        ? 'PDF text will be extracted on upload. You can edit it after creation.'
                        : 'Content extracted from file. You can edit it below.'}
                    </span>
                  )}
                </div>
                <textarea
                  required={!selectedFile || (selectedFile && !isPDFFile(selectedFile))}
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 placeholder:text-gray-400 disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-600"
                  rows={10}
                  placeholder={
                    selectedFile && isPDFFile(selectedFile)
                      ? 'PDF text will be extracted automatically on upload...'
                      : selectedFile
                      ? 'Content from file...'
                      : 'Enter article content...'
                  }
                  disabled={selectedFile && isPDFFile(selectedFile)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tags (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 placeholder:text-gray-400"
                    placeholder="e.g., architecture, ai, roadmap"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Brand
                  </label>
                  <input
                    type="text"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 placeholder:text-gray-400"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setShowModal(false);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create Article'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

