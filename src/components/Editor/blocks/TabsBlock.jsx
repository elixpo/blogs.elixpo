'use client';

import { createReactBlockSpec } from '@blocknote/react';
import { useState, useRef, useEffect, useCallback } from 'react';

export const TabsBlock = createReactBlockSpec(
  {
    type: 'tabsBlock',
    propSchema: {
      tabs: { default: '[]' },
    },
    content: 'none',
  },
  {
    render: ({ block, editor }) => {
      let tabs = [];
      try { tabs = JSON.parse(block.props.tabs); } catch {}

      const [adding, setAdding] = useState(tabs.length === 0);
      const [newPageName, setNewPageName] = useState('');
      const [creating, setCreating] = useState(false);
      const inputRef = useRef(null);
      const wrapperRef = useRef(null);

      useEffect(() => {
        if (adding && inputRef.current) inputRef.current.focus();
        if (!adding && tabs.length === 0 && wrapperRef.current) wrapperRef.current.focus();
      }, [adding, tabs.length]);

      // Get the blog slugid from the URL
      const getBlogId = () => {
        const m = window.location.pathname.match(/\/edit\/([^/]+)/);
        return m?.[1] || '';
      };

      const addPage = useCallback(async () => {
        const name = newPageName.trim() || 'Untitled Page';
        setCreating(true);
        try {
          const blogId = getBlogId();
          const res = await fetch('/api/subpages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ blogId, title: name }),
          });
          if (res.ok) {
            const data = await res.json();
            const updated = [...tabs, { title: name, subpageId: data.id }];
            editor.updateBlock(block, { props: { tabs: JSON.stringify(updated) } });
            setNewPageName('');
            setAdding(false);
          }
        } catch {}
        setCreating(false);
      }, [newPageName, tabs, editor, block]);

      const removePage = useCallback(async (idx) => {
        const tab = tabs[idx];
        if (tab?.subpageId) {
          try { await fetch(`/api/subpages?id=${tab.subpageId}`, { method: 'DELETE' }); } catch {}
        }
        const updated = tabs.filter((_, i) => i !== idx);
        editor.updateBlock(block, { props: { tabs: JSON.stringify(updated) } });
      }, [tabs, editor, block]);

      const openSubpage = useCallback((tab) => {
        if (!tab.subpageId) return;
        const blogId = getBlogId();
        window.open(`/edit/${blogId}/${tab.subpageId}`, '_blank');
      }, []);

      const handleBlockKeyDown = (e) => {
        if ((e.key === 'Backspace' || e.key === 'Delete') && tabs.length === 0 && !adding) {
          e.preventDefault();
          e.stopPropagation();
          try { editor.removeBlocks([block.id]); } catch {}
        }
      };

      // Show input when inserting fresh (no tabs)
      if (adding) {
        return (
          <div ref={wrapperRef} className="my-2" contentEditable={false} tabIndex={0} onKeyDown={handleBlockKeyDown} style={{ outline: 'none' }}>
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ border: '1px solid var(--border-default)', background: 'var(--bg-surface)' }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(155,123,247,0.08)', border: '1px dashed rgba(155,123,247,0.3)' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9b7bf7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              </div>
              <input
                ref={inputRef}
                value={newPageName}
                onChange={(e) => setNewPageName(e.target.value)}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === 'Enter' && newPageName.trim() && !creating) { e.preventDefault(); addPage(); }
                  if (e.key === 'Backspace' && !newPageName) {
                    e.preventDefault();
                    if (tabs.length === 0) { try { editor.removeBlocks([block.id]); } catch {} }
                    else setAdding(false);
                  }
                  if (e.key === 'Escape') {
                    if (tabs.length === 0) { try { editor.removeBlocks([block.id]); } catch {} }
                    else setAdding(false);
                  }
                }}
                onKeyUp={(e) => e.stopPropagation()}
                disabled={creating}
                autoFocus
                placeholder="Sub-page name..."
                className="flex-1 text-[14px] bg-transparent outline-none font-medium"
                style={{ color: 'var(--text-primary)' }}
              />
              {creating && <div className="w-4 h-4 border-2 border-[#9b7bf7] border-t-transparent rounded-full animate-spin" />}
              {!creating && (
                <button
                  onClick={addPage}
                  disabled={!newPageName.trim()}
                  className="px-3 py-1.5 text-[12px] font-medium text-white rounded-lg transition-colors disabled:opacity-30"
                  style={{ backgroundColor: '#9b7bf7' }}
                >
                  Create
                </button>
              )}
            </div>
          </div>
        );
      }

      return (
        <div ref={wrapperRef} className="my-2" contentEditable={false} tabIndex={0} onKeyDown={handleBlockKeyDown} style={{ outline: 'none' }}>
          {tabs.map((tab, i) => (
            <div
              key={tab.subpageId || i}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all group/page cursor-pointer"
              style={{ borderBottom: i < tabs.length - 1 ? '1px solid var(--divider)' : 'none' }}
              onClick={() => openSubpage(tab)}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              {/* Page icon */}
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-faint)' }}>
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                </svg>
              </div>

              {/* Title — full width */}
              <span className="flex-1 text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                {tab.title}
              </span>

              {/* Delete — hover only */}
              <button
                onClick={(e) => { e.stopPropagation(); removePage(i); }}
                className="w-6 h-6 rounded flex items-center justify-center opacity-0 group-hover/page:opacity-100 transition-opacity"
                style={{ color: 'var(--text-faint)' }}
                title="Remove sub-page"
                onMouseEnter={e => e.currentTarget.style.color = '#f87171'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-faint)'}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
              </button>

              {/* Open arrow */}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0" style={{ color: 'var(--text-faint)' }}>
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </div>
          ))}
        </div>
      );
    },
  }
);
