'use client';

import { createReactBlockSpec } from '@blocknote/react';
import { useState, useEffect, useRef, useCallback } from 'react';

let mermaidInitialized = false;

async function renderMermaid(code, container) {
  if (!code?.trim()) return;
  const mermaid = (await import('mermaid')).default;
  if (!mermaidInitialized) {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'dark',
      themeVariables: {
        primaryColor: '#1e1e2e',
        primaryTextColor: '#c4b5fd',
        primaryBorderColor: '#333',
        lineColor: '#555',
        secondaryColor: '#232d3f',
        tertiaryColor: '#141a26',
        fontFamily: 'inherit',
        fontSize: '14px',
      },
    });
    mermaidInitialized = true;
  }
  const id = `mermaid-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  try {
    const { svg } = await mermaid.render(id, code.trim());
    container.innerHTML = svg;
    // Style the rendered SVG
    const svgEl = container.querySelector('svg');
    if (svgEl) {
      svgEl.style.maxWidth = '100%';
      svgEl.style.height = 'auto';
    }
  } catch (err) {
    container.innerHTML = `<pre style="color:#f87171;font-size:12px;white-space:pre-wrap;margin:0;">${err.message || 'Invalid diagram syntax'}</pre>`;
  }
}

export const MermaidBlock = createReactBlockSpec(
  {
    type: 'mermaidBlock',
    propSchema: {
      diagram: { default: '' },
    },
    content: 'none',
  },
  {
    render: ({ block, editor }) => {
      const [editing, setEditing] = useState(!block.props.diagram);
      const [value, setValue] = useState(block.props.diagram || '');
      const renderRef = useRef(null);
      const inputRef = useRef(null);

      useEffect(() => {
        if (editing && inputRef.current) inputRef.current.focus();
      }, [editing]);

      // Render diagram when not editing
      useEffect(() => {
        if (!editing && block.props.diagram && renderRef.current) {
          renderMermaid(block.props.diagram, renderRef.current);
        }
      }, [editing, block.props.diagram]);

      const save = useCallback(() => {
        editor.updateBlock(block, { props: { diagram: value } });
        setEditing(false);
      }, [editor, block, value]);

      const handleDelete = useCallback(() => {
        try { editor.removeBlocks([block.id]); } catch {}
      }, [editor, block.id]);

      if (editing) {
        return (
          <div className="mermaid-block mermaid-block--editing">
            <div className="mermaid-block-header">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c4b5fd" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3l1.912 5.813a2 2 0 001.275 1.275L21 12l-5.813 1.912a2 2 0 00-1.275 1.275L12 21l-1.912-5.813a2 2 0 00-1.275-1.275L3 12l5.813-1.912a2 2 0 001.275-1.275L12 3z"/>
              </svg>
              <span>Mermaid Diagram</span>
            </div>
            <textarea
              ref={inputRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.shiftKey) { e.preventDefault(); save(); }
                if (e.key === 'Escape') { setEditing(false); setValue(block.props.diagram || ''); }
              }}
              placeholder={`graph TD\n    A[Start] --> B{Decision}\n    B -->|Yes| C[OK]\n    B -->|No| D[End]`}
              rows={8}
              className="mermaid-block-textarea"
            />
            <div className="mermaid-block-actions">
              <button onClick={() => { setEditing(false); setValue(block.props.diagram || ''); }} className="mermaid-btn-cancel">Cancel</button>
              <button onClick={save} className="mermaid-btn-save" disabled={!value.trim()}>Render</button>
            </div>
          </div>
        );
      }

      if (!block.props.diagram) {
        return (
          <div onClick={() => setEditing(true)} className="mermaid-block mermaid-block--empty">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" rx="1.5" />
              <rect x="14" y="3" width="7" height="7" rx="1.5" />
              <rect x="8.5" y="14" width="7" height="7" rx="1.5" />
              <line x1="6.5" y1="10" x2="6.5" y2="14" />
              <line x1="17.5" y1="10" x2="17.5" y2="14" />
              <line x1="6.5" y1="14" x2="8.5" y2="14" />
              <line x1="17.5" y1="14" x2="15.5" y2="14" />
            </svg>
            <span>Click to add a Mermaid diagram</span>
          </div>
        );
      }

      return (
        <div className="mermaid-block mermaid-block--rendered group" onDoubleClick={() => setEditing(true)}>
          <div ref={renderRef} className="mermaid-block-svg" />
          <div className="mermaid-block-hover">
            <button onClick={() => setEditing(true)} className="mermaid-hover-btn" title="Edit">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
            <button onClick={handleDelete} className="mermaid-hover-btn mermaid-hover-delete" title="Delete">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
              </svg>
            </button>
          </div>
        </div>
      );
    },
  }
);
