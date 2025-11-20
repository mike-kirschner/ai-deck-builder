'use client';

import { useEffect, useState } from 'react';
import { Presentation } from '@/lib/schemas/presentation';

interface PageRecord {
  id: string;
  title: string;
  visible: boolean;
  order: number;
  section?: string;
}

type StatusTone = 'info' | 'success' | 'error';

export default function AdminInterface() {
  const [presentations, setPresentations] = useState<Presentation[]>([]);
  const [selectedPresentationId, setSelectedPresentationId] = useState<string>('');
  const [pages, setPages] = useState<PageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ message: string; tone: StatusTone } | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  useEffect(() => {
    fetchPresentations();
  }, []);

  useEffect(() => {
    if (selectedPresentationId) {
      fetchPages();
    }
  }, [selectedPresentationId]);

  async function fetchPresentations() {
    try {
      const response = await fetch('/api/presentations');
      const data = await response.json();
      setPresentations(data);
      if (data.length > 0 && !selectedPresentationId) {
        setSelectedPresentationId(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching presentations:', error);
      showStatus('Failed to load presentations', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function fetchPages() {
    if (!selectedPresentationId) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/presentations/${selectedPresentationId}/pages`);
      if (!response.ok) {
        throw new Error('Failed to load pages');
      }
      const data = await response.json();
      setPages(data);
    } catch (error) {
      console.error('Error fetching pages:', error);
      showStatus('Failed to load pages', 'error');
    } finally {
      setLoading(false);
    }
  }

  function showStatus(message: string, tone: StatusTone = 'info') {
    setStatusMessage({ message, tone });
    setTimeout(() => setStatusMessage(null), 4000);
  }

  async function handleTitleChange(pageId: string, newTitle: string) {
    try {
      const response = await fetch(`/api/presentations/${selectedPresentationId}/pages/${pageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle }),
      });

      if (!response.ok) throw new Error('Failed to update title');

      setPages(prev => prev.map(p => p.id === pageId ? { ...p, title: newTitle } : p));
      showStatus('Title updated', 'success');
    } catch (error) {
      console.error('Error updating title:', error);
      showStatus('Failed to update title', 'error');
      fetchPages(); // Refresh on error
    }
  }

  async function handleVisibilityChange(pageId: string, visible: boolean) {
    try {
      const response = await fetch(`/api/presentations/${selectedPresentationId}/pages/${pageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visible }),
      });

      if (!response.ok) throw new Error('Failed to update visibility');

      setPages(prev => prev.map(p => p.id === pageId ? { ...p, visible } : p));
      showStatus(`Page ${visible ? 'shown' : 'hidden'}`, 'success');
    } catch (error) {
      console.error('Error updating visibility:', error);
      showStatus('Failed to update visibility', 'error');
      fetchPages();
    }
  }

  async function handleSectionChange(pageId: string, section: string) {
    try {
      const sectionValue = section.trim() === '' ? undefined : section.trim();
      const response = await fetch(`/api/presentations/${selectedPresentationId}/pages/${pageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section: sectionValue }),
      });

      if (!response.ok) throw new Error('Failed to update section');

      setPages(prev => prev.map(p => p.id === pageId ? { ...p, section: sectionValue } : p));
      showStatus('Section updated', 'success');
    } catch (error) {
      console.error('Error updating section:', error);
      showStatus('Failed to update section', 'error');
      fetchPages();
    }
  }

  async function handleOrderChange(newOrder: PageRecord[]) {
    setSaving(true);
    try {
      const response = await fetch(`/api/presentations/${selectedPresentationId}/pages/order`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds: newOrder.map(p => p.id) }),
      });

      if (!response.ok) throw new Error('Failed to save order');

      const updatedPages = await response.json();
      setPages(updatedPages);
      showStatus('Order saved', 'success');
    } catch (error) {
      console.error('Error saving order:', error);
      showStatus('Failed to save order', 'error');
      fetchPages();
    } finally {
      setSaving(false);
    }
  }

  function handleDragStart(pageId: string) {
    setDraggedId(pageId);
  }

  function handleDragEnd() {
    setDraggedId(null);
  }

  function handleDrop(event: React.DragEvent, targetId: string) {
    event.preventDefault();
    event.stopPropagation();
    
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null);
      return;
    }

    const draggedIndex = pages.findIndex(p => p.id === draggedId);
    const targetIndex = pages.findIndex(p => p.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedId(null);
      return;
    }

    const newPages = [...pages];
    const [moved] = newPages.splice(draggedIndex, 1);
    newPages.splice(targetIndex, 0, moved);

    // Re-normalize order
    const reordered = newPages.map((p, idx) => ({ ...p, order: idx + 1 }));
    setPages(reordered);
    handleOrderChange(reordered);
    setDraggedId(null);
  }

  function handleDragOver(event: React.DragEvent, pageId: string) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    if (draggedId && draggedId !== pageId) {
      setDragOverId(pageId);
    }
  }

  function handleDragLeave() {
    setDragOverId(null);
  }

  async function movePageUp(pageId: string) {
    const sortedPages = [...pages].sort((a, b) => a.order - b.order);
    const currentIndex = sortedPages.findIndex(p => p.id === pageId);
    
    if (currentIndex <= 0) return; // Already at top
    
    // Check if we're at the start of a section - if so, move to end of previous section
    const currentPage = sortedPages[currentIndex];
    const prevPage = sortedPages[currentIndex - 1];
    
    // If previous page is in a different section, we need to handle section boundaries
    if (currentPage.section !== prevPage.section) {
      // Find all pages in the previous section
      const prevSection = prevPage.section || undefined;
      const pagesInPrevSection = sortedPages.filter(p => (p.section || undefined) === prevSection);
      const lastPageInPrevSection = pagesInPrevSection[pagesInPrevSection.length - 1];
      const lastIndex = sortedPages.findIndex(p => p.id === lastPageInPrevSection.id);
      
      // Move current page to end of previous section
      const newPages = [...sortedPages];
      const [moved] = newPages.splice(currentIndex, 1);
      newPages.splice(lastIndex + 1, 0, moved);
      
      const reordered = newPages.map((p, idx) => ({ ...p, order: idx + 1 }));
      setPages(reordered);
      await handleOrderChange(reordered);
    } else {
      // Simple swap with previous page
      const newPages = [...sortedPages];
      [newPages[currentIndex - 1], newPages[currentIndex]] = [newPages[currentIndex], newPages[currentIndex - 1]];
      
      const reordered = newPages.map((p, idx) => ({ ...p, order: idx + 1 }));
      setPages(reordered);
      await handleOrderChange(reordered);
    }
  }

  async function movePageDown(pageId: string) {
    const sortedPages = [...pages].sort((a, b) => a.order - b.order);
    const currentIndex = sortedPages.findIndex(p => p.id === pageId);
    
    if (currentIndex >= sortedPages.length - 1) return; // Already at bottom
    
    // Check if we're at the end of a section - if so, move to start of next section
    const currentPage = sortedPages[currentIndex];
    const nextPage = sortedPages[currentIndex + 1];
    
    // If next page is in a different section, we need to handle section boundaries
    if (currentPage.section !== nextPage.section) {
      // Find all pages in the next section
      const nextSection = nextPage.section || undefined;
      const pagesInNextSection = sortedPages.filter(p => (p.section || undefined) === nextSection);
      const firstPageInNextSection = pagesInNextSection[0];
      const firstIndex = sortedPages.findIndex(p => p.id === firstPageInNextSection.id);
      
      // Move current page to start of next section
      const newPages = [...sortedPages];
      const [moved] = newPages.splice(currentIndex, 1);
      newPages.splice(firstIndex, 0, moved);
      
      const reordered = newPages.map((p, idx) => ({ ...p, order: idx + 1 }));
      setPages(reordered);
      await handleOrderChange(reordered);
    } else {
      // Simple swap with next page
      const newPages = [...sortedPages];
      [newPages[currentIndex], newPages[currentIndex + 1]] = [newPages[currentIndex + 1], newPages[currentIndex]];
      
      const reordered = newPages.map((p, idx) => ({ ...p, order: idx + 1 }));
      setPages(reordered);
      await handleOrderChange(reordered);
    }
  }

  async function moveSectionUp(section: string | undefined) {
    const sortedPages = [...pages].sort((a, b) => a.order - b.order);
    
    const sectionValue = section || undefined;
    const pagesInSection = sortedPages.filter(p => (p.section || undefined) === sectionValue);
    
    if (pagesInSection.length === 0) return;
    
    const firstPageInSection = pagesInSection[0];
    const currentIndex = sortedPages.findIndex(p => p.id === firstPageInSection.id);
    
    if (currentIndex === 0) return; // Already at top
    
    // Find the previous section
    let prevSectionStartIndex = 0;
    for (let i = currentIndex - 1; i >= 0; i--) {
      const prevSection = sortedPages[i].section || undefined;
      if (prevSection !== sectionValue) {
        // Find the start of this previous section
        for (let j = i; j >= 0; j--) {
          const checkSection = sortedPages[j].section || undefined;
          if (j === 0 || (sortedPages[j - 1].section || undefined) !== checkSection) {
            prevSectionStartIndex = j;
            break;
          }
        }
        break;
      }
    }
    
    // Move all pages in current section to before the previous section
    const newPages = [...sortedPages];
    const pagesToMove = newPages.splice(currentIndex, pagesInSection.length);
    newPages.splice(prevSectionStartIndex, 0, ...pagesToMove);
    
    const reordered = newPages.map((p, idx) => ({ ...p, order: idx + 1 }));
    setPages(reordered);
    await handleOrderChange(reordered);
  }

  async function moveSectionDown(section: string | undefined) {
    const sortedPages = [...pages].sort((a, b) => a.order - b.order);
    
    const sectionValue = section || undefined;
    const pagesInSection = sortedPages.filter(p => (p.section || undefined) === sectionValue);
    
    if (pagesInSection.length === 0) return;
    
    const firstPageInSection = pagesInSection[0];
    const currentIndex = sortedPages.findIndex(p => p.id === firstPageInSection.id);
    const lastIndex = currentIndex + pagesInSection.length - 1;
    
    if (lastIndex >= sortedPages.length - 1) return; // Already at bottom
    
    // Find the next section
    let nextSectionStartIndex = sortedPages.length;
    for (let i = lastIndex + 1; i < sortedPages.length; i++) {
      const nextSection = sortedPages[i].section || undefined;
      if (nextSection !== sectionValue) {
        nextSectionStartIndex = i;
        // Find the end of this next section
        for (let j = i; j < sortedPages.length; j++) {
          const checkSection = sortedPages[j].section || undefined;
          if (j === sortedPages.length - 1 || (sortedPages[j + 1].section || undefined) !== checkSection) {
            nextSectionStartIndex = j + 1;
            break;
          }
        }
        break;
      }
    }
    
    // Move all pages in current section to after the next section
    const newPages = [...sortedPages];
    const pagesToMove = newPages.splice(currentIndex, pagesInSection.length);
    newPages.splice(nextSectionStartIndex, 0, ...pagesToMove);
    
    const reordered = newPages.map((p, idx) => ({ ...p, order: idx + 1 }));
    setPages(reordered);
    await handleOrderChange(reordered);
  }

  const selectedPresentation = presentations.find(p => p.id === selectedPresentationId);

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-indigo-400 font-semibold">
            internal • admin
          </p>
          <h1 className="text-3xl font-bold mt-2">Presentation Management Console</h1>
          <p className="text-gray-400 mt-2">
            Manage slide order, titles, visibility, and sections for presentations.
          </p>
        </div>
        <div className="flex gap-3 items-center">
          <label className="flex items-center gap-2 text-sm">
            <span className="text-gray-400">Presentation:</span>
            <select
              value={selectedPresentationId}
              onChange={(e) => setSelectedPresentationId(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-800 bg-gray-900 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {presentations.map(p => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
          </label>
          <button
            onClick={fetchPages}
            className="px-4 py-2 rounded-lg border border-gray-800 text-sm font-medium hover:bg-gray-900 transition"
          >
            Refresh
          </button>
          {selectedPresentationId && (
            <a
              href={`/presentations/${selectedPresentationId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-lg bg-indigo-500/90 hover:bg-indigo-500 text-sm font-semibold transition"
            >
              View Presentation
            </a>
          )}
        </div>
      </header>

      {statusMessage && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            statusMessage.tone === 'success'
              ? 'bg-emerald-500/10 text-emerald-200 border-emerald-500/30'
              : statusMessage.tone === 'error'
              ? 'bg-rose-500/10 text-rose-200 border-rose-500/30'
              : 'bg-sky-500/10 text-sky-200 border-sky-500/30'
          }`}
        >
          {statusMessage.message}
        </div>
      )}

      <section className="bg-gray-900/40 border border-gray-800 rounded-2xl shadow-2xl">
        <div className="border-b border-gray-800 px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">Page Catalog</p>
            <p className="text-xs text-gray-500">
              Drag rows to reorder. Editing happens inline and auto-saves.
            </p>
          </div>
          {saving && (
            <span className="text-xs text-amber-400 flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-amber-400 animate-pulse"></span>
              Saving...
            </span>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-sm text-gray-400">
            Loading pages...
          </div>
        ) : pages.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-500">
            No pages found for this presentation.
          </div>
        ) : (
          <div className="divide-y divide-gray-800">
            {(() => {
              // Sort pages: first by section (undefined sections last), then by order
              const sortedPages = [...pages].sort((a, b) => {
                const aSection = a.section || '';
                const bSection = b.section || '';
                if (aSection !== bSection) {
                  // Sort sections alphabetically, but undefined sections go last
                  if (!aSection) return 1;
                  if (!bSection) return -1;
                  return aSection.localeCompare(bSection);
                }
                return a.order - b.order;
              });
              let currentSection: string | undefined = undefined;
              const rows: React.ReactNode[] = [];
              let pageIndex = 0;

              sortedPages.forEach((page) => {
                const pageSection = page.section || undefined;
                
                // Render section header if section changed
                if (pageSection !== currentSection) {
                  currentSection = pageSection;
                  
                  rows.push(
                    <SectionHeader
                      key={`section-${currentSection || 'none'}`}
                      section={currentSection}
                      sortedPages={sortedPages}
                      onMoveUp={() => moveSectionUp(currentSection)}
                      onMoveDown={() => moveSectionDown(currentSection)}
                    />
                  );
                }

                const pageIndexInSorted = sortedPages.findIndex(p => p.id === page.id);
                rows.push(
                  <PageRow
                    key={page.id}
                    page={page}
                    index={pageIndexInSorted}
                    draggedId={draggedId}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    dragOverId={dragOverId}
                    onTitleChange={handleTitleChange}
                    onVisibilityChange={handleVisibilityChange}
                    onSectionChange={handleSectionChange}
                    onMoveUp={() => movePageUp(page.id)}
                    onMoveDown={() => movePageDown(page.id)}
                    sortedPages={sortedPages}
                  />
                );
                pageIndex++;
              });

              return rows;
            })()}
          </div>
        )}
      </section>
    </div>
  );
}

interface PageRowProps {
  page: PageRecord;
  index: number;
  draggedId: string | null;
  dragOverId: string | null;
  onDragStart: (pageId: string) => void;
  onDragEnd: () => void;
  onDrop: (event: React.DragEvent, targetId: string) => void;
  onDragOver: (event: React.DragEvent, pageId: string) => void;
  onDragLeave: () => void;
  onTitleChange: (pageId: string, title: string) => void;
  onVisibilityChange: (pageId: string, visible: boolean) => void;
  onSectionChange: (pageId: string, section: string) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  sortedPages: PageRecord[];
}

interface SectionHeaderProps {
  section: string | undefined;
  sortedPages: PageRecord[];
  onMoveUp: () => void;
  onMoveDown: () => void;
}

function SectionHeader({ section, sortedPages, onMoveUp, onMoveDown }: SectionHeaderProps) {
  const sectionValue = section || undefined;
  const pagesInSection = sortedPages.filter(p => (p.section || undefined) === sectionValue);
  const firstPageIndex = sortedPages.findIndex(p => p.id === pagesInSection[0]?.id);
  const lastPageIndex = firstPageIndex + pagesInSection.length - 1;
  
  const canMoveUp = firstPageIndex > 0;
  const canMoveDown = lastPageIndex < sortedPages.length - 1;

  return (
    <div className="px-4 py-3 bg-gray-800/60 border-y border-gray-700/50">
      <div className="flex items-center gap-3">
        <div className="flex flex-col gap-0.5">
          <button
            onClick={onMoveUp}
            disabled={!canMoveUp}
            className="px-1.5 py-0.5 text-amber-500/60 hover:text-amber-400 hover:bg-amber-500/10 rounded transition disabled:opacity-30 disabled:cursor-not-allowed"
            title="Move section up"
          >
            ▲
          </button>
          <button
            onClick={onMoveDown}
            disabled={!canMoveDown}
            className="px-1.5 py-0.5 text-amber-500/60 hover:text-amber-400 hover:bg-amber-500/10 rounded transition disabled:opacity-30 disabled:cursor-not-allowed"
            title="Move section down"
          >
            ▼
          </button>
        </div>
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-600 to-transparent"></div>
        <div className="text-sm font-semibold text-amber-400/80 uppercase tracking-wider">
          {section || (
            <span className="text-gray-500 italic">No Section</span>
          )}
        </div>
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-600 to-transparent"></div>
      </div>
    </div>
  );
}

function PageRow({
  page,
  index,
  draggedId,
  dragOverId,
  onDragStart,
  onDragEnd,
  onDrop,
  onDragOver,
  onDragLeave,
  onTitleChange,
  onVisibilityChange,
  onSectionChange,
  onMoveUp,
  onMoveDown,
  sortedPages,
}: PageRowProps) {
  const [title, setTitle] = useState(page.title);
  const [section, setSection] = useState(page.section || '');

  useEffect(() => {
    setTitle(page.title);
    setSection(page.section || '');
  }, [page.title, page.section]);

  const isDragging = draggedId === page.id;
  const isDragOver = dragOverId === page.id && draggedId !== page.id;

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move';
        onDragStart(page.id);
      }}
      onDragEnd={onDragEnd}
      onDrop={(e) => {
        onDrop(e, page.id);
        onDragLeave();
      }}
      onDragOver={(e) => onDragOver(e, page.id)}
      onDragLeave={onDragLeave}
      className={`grid grid-cols-[auto,1fr,auto] gap-4 items-center px-4 py-3 hover:bg-gray-900/60 transition cursor-move ${
        isDragging ? 'opacity-60 bg-amber-500/10' : ''
      } ${
        isDragOver ? 'border-t-2 border-indigo-500 bg-indigo-500/10' : ''
      }`}
    >
      {/* Controls */}
      <div className="flex items-center gap-3 select-none">
        <span className="cursor-grab text-gray-500 hover:text-gray-300">☰</span>
        <div className="flex flex-col gap-0.5">
          <button
            onClick={onMoveUp}
            disabled={index === 0}
            className="px-1.5 py-0.5 text-gray-500 hover:text-gray-300 hover:bg-gray-800 rounded transition disabled:opacity-30 disabled:cursor-not-allowed"
            title="Move page up"
          >
            ▲
          </button>
          <button
            onClick={onMoveDown}
            disabled={index >= sortedPages.length - 1}
            className="px-1.5 py-0.5 text-gray-500 hover:text-gray-300 hover:bg-gray-800 rounded transition disabled:opacity-30 disabled:cursor-not-allowed"
            title="Move page down"
          >
            ▼
          </button>
        </div>
        <span className="text-xs font-mono text-gray-500">#{String(index + 1).padStart(2, '0')}</span>
      </div>

      {/* Content */}
      <div className="space-y-2">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => {
            if (title.trim() && title !== page.title) {
              onTitleChange(page.id, title.trim());
            } else {
              setTitle(page.title);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.currentTarget.blur();
            }
          }}
          className="w-full bg-gray-900/60 border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={section}
            onChange={(e) => setSection(e.target.value)}
            onBlur={() => {
              if (section.trim() !== (page.section || '')) {
                onSectionChange(page.id, section);
              } else {
                setSection(page.section || '');
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.currentTarget.blur();
              }
            }}
            className="flex-1 bg-gray-900/40 border border-gray-800/50 rounded px-2 py-1 text-xs text-gray-300 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
            placeholder="Section name (optional)"
          />
          <p className="text-[11px] text-gray-500 font-mono">{page.id}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3">
        <label className="inline-flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={page.visible}
            onChange={(e) => onVisibilityChange(page.id, e.target.checked)}
            className="w-4 h-4 accent-indigo-500"
          />
          <span className={page.visible ? 'text-emerald-300' : 'text-gray-500'}>
            {page.visible ? 'Visible' : 'Hidden'}
          </span>
        </label>
      </div>
    </div>
  );
}

