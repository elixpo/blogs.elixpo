'use client';

import { createReactInlineContentSpec } from '@blocknote/react';
import katex from 'katex';

function stripDelimiters(raw) {
  let s = raw.trim();
  if (s.startsWith('\\(') && s.endsWith('\\)')) return s.slice(2, -2).trim();
  if (s.startsWith('\\[') && s.endsWith('\\]')) return s.slice(2, -2).trim();
  if (s.startsWith('$$') && s.endsWith('$$')) return s.slice(2, -2).trim();
  if (s.startsWith('$') && s.endsWith('$') && s.length > 2) return s.slice(1, -1).trim();
  return s;
}

function renderKaTeXInline(latex) {
  try {
    return katex.renderToString(stripDelimiters(latex), { displayMode: false, throwOnError: false });
  } catch {
    return `<span style="color:#f87171">${latex}</span>`;
  }
}

export const InlineEquation = createReactInlineContentSpec(
  {
    type: 'inlineEquation',
    propSchema: {
      latex: { default: 'x^2' },
    },
    content: 'none',
  },
  {
    render: ({ inlineContent }) => {
      const html = renderKaTeXInline(inlineContent.props.latex);
      return (
        <span
          className="inline-equation mx-0.5 cursor-pointer"
          dangerouslySetInnerHTML={{ __html: html }}
          title={inlineContent.props.latex}
        />
      );
    },
  }
);
