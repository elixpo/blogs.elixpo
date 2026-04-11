'use client';

import { use, useState, useRef, useCallback, useEffect } from 'react';
import { useAuth } from '../../../../src/context/AuthContext';
import { useTheme } from '../../../../src/context/ThemeContext';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import '@blocknote/core/fonts/inter.css';
import '@blocknote/mantine/style.css';
import '../../../../src/styles/editor/editor.css';
import '../../../../src/styles/katex-fonts.css';

const BlockNoteEditor = dynamic(() => import('../../../../src/components/Editor/BlogEditor'), { ssr: false });

export default function SubpageClient({ params }) {
  const { slugid, subpageId } = use(params);
  const { user } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const editorRef = useRef(null);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const titleInputRef = useRef(null);
  const saveTimerRef = useRef(null);

  // Fetch subpage data
  useEffect(() => {
    fetch(`/api/subpages?id=${subpageId}`)
      .then(r => r.ok ? r.json() : r.json().then(d => { throw new Error(d.error); }))
      .then(data => {
        setTitle(data.title || 'Untitled');
        let parsed;
        try { parsed = typeof data.content === 'string' ? JSON.parse(data.content) : data.content; } catch {}
        // BlockNote needs undefined or a non-empty array — empty array crashes it
        setContent(parsed?.length ? parsed : undefined);
      })
      .catch(() => setContent(undefined))
      .finally(() => setLoading(false));
  }, [subpageId]);

  // Auto-save content
  const saveContent = useCallback(async (blocks) => {
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      setSaving(true);
      try {
        await fetch('/api/subpages', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: subpageId, content: blocks }),
        });
        setLastSaved(new Date());
      } catch {}
      setSaving(false);
    }, 1500);
  }, [subpageId]);

  const handleEditorChange = useCallback(() => {
    if (!editorRef.current) return;
    try {
      const blocks = editorRef.current.getBlocks();
      saveContent(blocks);
    } catch {}
  }, [saveContent]);

  // Save title on blur
  const saveTitle = useCallback(async (newTitle) => {
    const t = newTitle.trim() || 'Untitled';
    setTitle(t);
    setEditingTitle(false);
    try {
      await fetch('/api/subpages', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: subpageId, title: t }),
      });
    } catch {}
  }, [subpageId]);

  useEffect(() => {
    if (editingTitle && titleInputRef.current) titleInputRef.current.focus();
  }, [editingTitle]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-app)] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#9b7bf7] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-app)] text-[var(--text-primary)]">
      {/* Header */}
      <header className="fixed top-0 left-0 w-full h-14 border-b border-[var(--border-default)] flex items-center justify-between px-5 bg-[var(--bg-app)]/95 backdrop-blur-md z-50">
        <div className="flex items-center gap-3 min-w-0">
          <Link href={`/edit/${slugid}`} className="flex items-center gap-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            <span className="text-[13px]">Back to blog</span>
          </Link>
          <span className="text-[var(--text-faint)] text-sm">/</span>
          <div className="flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9b7bf7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            {editingTitle ? (
              <input
                ref={titleInputRef}
                defaultValue={title}
                onBlur={(e) => saveTitle(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') saveTitle(e.target.value); if (e.key === 'Escape') setEditingTitle(false); }}
                className="text-[13px] font-medium bg-transparent outline-none border-b border-[#9b7bf7] text-[var(--text-primary)] w-40"
              />
            ) : (
              <span
                className="text-[13px] font-medium text-[var(--text-primary)] cursor-pointer hover:text-[#9b7bf7] transition-colors"
                onClick={() => setEditingTitle(true)}
                title="Click to rename"
              >
                {title}
              </span>
            )}
          </div>
          {saving && <span className="text-[11px] text-[var(--text-faint)]">Saving...</span>}
          {!saving && lastSaved && <span className="text-[11px] text-[var(--text-faint)]">Saved</span>}
        </div>

        <div className="flex items-center gap-2.5">
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="h-8 w-8 rounded-lg flex items-center justify-center transition-colors"
            style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-faint)' }}
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            <ion-icon name={isDark ? 'sunny-outline' : 'moon-outline'} style={{ fontSize: '16px' }} />
          </button>
        </div>
      </header>

      {/* Editor */}
      <main className="pt-14 flex justify-center editor-texture-bg">
        <div className="w-full max-w-[720px] px-6 py-8">
          {/* Subpage title */}
          <h1
            className="text-[1.8em] font-extrabold leading-tight mb-6 cursor-pointer hover:text-[#9b7bf7] transition-colors"
            style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}
            onClick={() => setEditingTitle(true)}
          >
            {title}
          </h1>

          {/* BlockNote editor */}
          <div className="min-h-[60vh] pb-[100px]">
            {!loading && (
              <BlockNoteEditor
                ref={editorRef}
                onChange={handleEditorChange}
                initialContent={content}
                blogId={slugid}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
