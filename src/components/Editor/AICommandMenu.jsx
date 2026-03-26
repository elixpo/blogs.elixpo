'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

const AI_COMMANDS = [
  {
    group: 'Write',
    items: [
      { id: 'write', label: 'Write anything...', icon: 'create-outline', description: 'Let AI write content for you' },
    ],
  },
  {
    group: 'Think, ask, chat',
    items: [
      { id: 'brainstorm', label: 'Brainstorm ideas...', icon: 'bulb-outline', description: 'Generate creative ideas' },
      { id: 'help-code', label: 'Get help with code...', icon: 'code-slash-outline', description: 'Get coding assistance' },
    ],
  },
  {
    group: 'Find, search',
    items: [
      { id: 'ask', label: 'Ask a question...', icon: 'search-outline', description: 'Search or ask anything' },
    ],
  },
];

export default function AICommandMenu({ position, onSelect, onClose }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const menuRef = useRef(null);

  const allItems = AI_COMMANDS.flatMap((g) => g.items);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % allItems.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + allItems.length) % allItems.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      onSelect(allItems[activeIndex]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  }, [activeIndex, allItems, onSelect, onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  let flatIndex = 0;

  return (
    <div
      ref={menuRef}
      className="ai-command-menu"
      style={{
        position: 'absolute',
        top: position?.top ?? 0,
        left: position?.left ?? 0,
        zIndex: 100,
      }}
    >
      {AI_COMMANDS.map((group) => (
        <div key={group.group} className="ai-command-group">
          <div className="ai-command-group-label">{group.group}</div>
          {group.items.map((item) => {
            const idx = flatIndex++;
            return (
              <button
                key={item.id}
                className={`ai-command-item ${idx === activeIndex ? 'ai-command-item-active' : ''}`}
                onMouseEnter={() => setActiveIndex(idx)}
                onClick={() => onSelect(item)}
              >
                <div className="ai-command-icon">
                  <ion-icon name={item.icon} style={{ fontSize: '16px' }} />
                </div>
                <span className="ai-command-label">{item.label}</span>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
