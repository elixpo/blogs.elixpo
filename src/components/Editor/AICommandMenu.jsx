'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export default function AICommandMenu({ position, onSubmit, onClose }) {
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);
  const menuRef = useRef(null);

  // Auto-focus input on mount
  useEffect(() => {
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'Enter' && query.trim()) {
      e.preventDefault();
      onSubmit(query.trim());
    }
  };

  return (
    <div
      ref={menuRef}
      style={{
        position: 'absolute',
        top: position?.top ?? 0,
        left: 0,
        right: 0,
        zIndex: 100,
      }}
    >
      <div className="mx-auto w-full max-w-[600px] bg-[#0d1117] border border-[#1a1d27] rounded-xl shadow-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3">
          {/* AI icon */}
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#9b7bf714] flex items-center justify-center">
            <svg className="w-[18px] h-[18px] text-[#9b7bf7]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3l1.912 5.813a2 2 0 0 0 1.275 1.275L21 12l-5.813 1.912a2 2 0 0 0-1.275 1.275L12 21l-1.912-5.813a2 2 0 0 0-1.275-1.275L3 12l5.813-1.912a2 2 0 0 0 1.275-1.275L12 3z" />
            </svg>
          </div>

          {/* Input */}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask AI anything..."
            className="flex-1 bg-transparent text-[14px] text-[#e0e0e0] placeholder-[#555] outline-none"
            autoComplete="off"
            spellCheck="false"
          />

          {/* Submit button */}
          <button
            onClick={() => query.trim() && onSubmit(query.trim())}
            disabled={!query.trim()}
            className="flex-shrink-0 w-7 h-7 rounded-full bg-[#e8e8e8] disabled:bg-[#1a1d27] flex items-center justify-center transition-colors disabled:cursor-not-allowed"
          >
            <svg className="w-3.5 h-3.5 text-[#030712]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="19" x2="12" y2="5" />
              <polyline points="5 12 12 5 19 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
