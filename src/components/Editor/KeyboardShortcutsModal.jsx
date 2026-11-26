'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { filterShortcutGroups } from '../../utils/shortcutSearch';

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPod|iPad/.test(navigator.platform);
const modifier = isMac ? '⌘' : 'Ctrl';
const alt = isMac ? '⌥' : 'Alt';

const SHORTCUT_GROUPS = [
  {
    title: 'General',
    shortcuts: [
      { keys: [modifier, 'S'], desc: 'Save & sync to cloud' },
      { keys: [modifier, 'O'], desc: 'Import markdown file (.md)' },
      { keys: [modifier, 'Shift', 'I'], desc: 'Invite collaborators' },
      { keys: [modifier, 'D'], desc: 'Insert date chip' },
      { keys: [modifier, 'Shift', 'P'], desc: 'Toggle editor / preview' },
      { keys: [modifier, 'Z'], desc: 'Undo' },
      { keys: [modifier, 'Shift', 'Z'], desc: 'Redo' },
      { keys: [modifier, 'A'], desc: 'Select all (cell first, in tables)' },
      { keys: ['?'], desc: 'Show this help' },
    ],
  },
  {
    title: 'Text Formatting',
    shortcuts: [
      { keys: [modifier, 'B'], desc: 'Bold' },
      { keys: [modifier, 'I'], desc: 'Italic' },
      { keys: [modifier, 'U'], desc: 'Underline' },
      { keys: [modifier, 'E'], desc: 'Code (inline)' },
      { keys: [modifier, 'Shift', 'S'], desc: 'Strikethrough' },
      { keys: [modifier, 'K'], desc: 'Add link' },
    ],
  },
  {
    title: 'Blocks',
    shortcuts: [
      { keys: ['/'], desc: 'Slash commands menu' },
      { keys: ['Space'], desc: 'AI assistant (on empty line)' },
      { keys: ['@'], desc: 'Mention user/blog/org' },
      { keys: ['Tab'], desc: 'Indent block' },
      { keys: ['Shift', 'Tab'], desc: 'Outdent block' },
      { keys: ['Enter'], desc: 'New block' },
      { keys: ['Backspace'], desc: 'Delete block (when empty)' },
      { keys: ['Shift', '↑ / ↓'], desc: 'Extend selection' },
      { keys: [alt, '↑ / ↓'], desc: 'Move block up / down' },
    ],
  },
  {
    title: 'AI',
    shortcuts: [
      { keys: ['Space'], desc: 'Open AI prompt (empty line)' },
      { keys: ['★', 'click'], desc: 'AI edit selected text' },
      { keys: ['Esc'], desc: 'Cancel AI / close menu' },
    ],
  },
];

export default function KeyboardShortcutsModal({ onClose }) {
  const ref = useRef(null);
  const searchRef = useRef(null);
  const [query, setQuery] = useState('');
  const groups = useMemo(() => filterShortcutGroups(SHORTCUT_GROUPS, query), [query]);

  useEffect(() => {
    searchRef.current?.focus();
    function handleKey(e) {
      if (e.key === 'Escape') onClose();
    }
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    }
    document.addEventListener('keydown', handleKey);
    document.addEventListener('mousedown', handleClick);
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.removeEventListener('mousedown', handleClick);
    };
  }, [onClose]);

  return (
    <div className="lix-shortcuts-backdrop fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="lix-shortcuts-title"
        className="lix-shortcuts-panel w-full max-w-[560px] max-h-[82vh] overflow-hidden rounded-2xl"
        style={{
          backgroundColor: 'var(--card-bg)',
          border: '1px solid color-mix(in srgb, var(--accent) 22%, var(--border-default))',
          boxShadow: '0 24px 64px rgba(15, 10, 35, 0.28), 0 4px 16px color-mix(in srgb, var(--accent) 14%, transparent)',
        }}
      >
        {/* Header */}
        <div className="px-6 pt-5 pb-4" style={{ borderBottom: '1px solid var(--divider)' }}>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--accent-subtle)] text-[var(--accent)]">
                <ion-icon name="keypad-outline" style={{ fontSize: '18px' }} />
              </span>
              <div>
                <h2 id="lix-shortcuts-title" className="text-[16px] font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>Keyboard shortcuts</h2>
                <p className="text-[12px]" style={{ color: 'var(--text-faint)' }}>Write faster without leaving the keyboard</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close keyboard shortcuts"
              className="grid h-8 w-8 place-items-center rounded-full transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
              style={{ color: 'var(--text-faint)' }}
            >
              <ion-icon name="close-outline" style={{ fontSize: '18px' }} />
            </button>
          </div>
          <label className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
            <ion-icon name="search-outline" style={{ fontSize: '15px', color: 'var(--text-faint)' }} />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Find a shortcut…"
              aria-label="Find a shortcut"
              className="w-full bg-transparent text-[13px] outline-none"
              style={{ color: 'var(--text-primary)' }}
            />
          </label>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(82vh-130px)] px-6 py-5 space-y-5 scrollbar-thin">
          {groups.length === 0 && (
            <p className="py-6 text-center text-[13px]" style={{ color: 'var(--text-faint)' }}>No shortcut matches “{query}”.</p>
          )}
          {groups.map((group) => (
            <section key={group.title}>
              <h3 className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--accent)]">{group.title}</h3>
              <div className="rounded-xl p-1" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
                {group.shortcuts.map((s, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-[var(--bg-hover)]">
                    <span className="text-[13.5px]" style={{ color: 'var(--text-body)' }}>{s.desc}</span>
                    <span className="flex shrink-0 items-center gap-1">
                      {s.keys.map((key, j) => (
                        <span key={j} className="flex items-center gap-1">
                          {j > 0 && <span className="text-[10px]" style={{ color: 'var(--text-faint)' }}>+</span>}
                          <kbd
                            className="inline-block min-w-[26px] rounded-md px-1.5 py-0.5 text-center font-mono text-[11.5px] font-semibold"
                            style={{
                              color: 'var(--text-secondary)',
                              backgroundColor: 'var(--card-bg)',
                              border: '1px solid var(--border-default)',
                              borderBottomWidth: '2px',
                            }}
                          >
                            {key}
                          </kbd>
                        </span>
                      ))}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
      <style jsx>{`
        .lix-shortcuts-backdrop { animation: lix-shortcuts-fade 160ms ease-out; }
        .lix-shortcuts-panel { animation: lix-shortcuts-pop 220ms cubic-bezier(0.2, 0.9, 0.3, 1.15); }
        @keyframes lix-shortcuts-fade { from { opacity: 0; } }
        @keyframes lix-shortcuts-pop { from { opacity: 0; transform: translateY(10px) scale(0.97); } }
        @media (prefers-reduced-motion: reduce) {
          .lix-shortcuts-backdrop, .lix-shortcuts-panel { animation: none; }
        }
      `}</style>
    </div>
  );
}
