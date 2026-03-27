'use client';

import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import {
  getDefaultReactSlashMenuItems,
  SuggestionMenuController,
} from '@blocknote/react';
import '@blocknote/core/fonts/inter.css';
import '@blocknote/mantine/style.css';
import { useCallback, useMemo, forwardRef, useImperativeHandle, useState, useRef, useEffect } from 'react';
import AICommandMenu from './AICommandMenu';

// ── Helpers ──

function filterItems(items, query) {
  if (!query) return items;
  const q = query.toLowerCase();
  return items.filter((item) => {
    const title = (item.title || '').toLowerCase();
    const subtext = (item.subtext || '').toLowerCase();
    const aliases = (item.aliases || []).map((a) => a.toLowerCase());
    return title.includes(q) || subtext.includes(q) || aliases.some((a) => a.includes(q));
  });
}

function IconWrapper({ d, d2 }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
      {d2 && <path d={d2} />}
    </svg>
  );
}

// ── SVG icon paths ──
const ICONS = {
  file: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6',
  link: 'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71',
  code: 'M16 18l6-6-6-6M8 6l-6 6 6 6',
  image: 'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM8.5 8.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zM21 15l-5-5L5 21',
  sparkle: 'M12 3l1.912 5.813a2 2 0 0 0 1.275 1.275L21 12l-5.813 1.912a2 2 0 0 0-1.275 1.275L12 21l-1.912-5.813a2 2 0 0 0-1.275-1.275L3 12l5.813-1.912a2 2 0 0 0 1.275-1.275L12 3z',
  music: 'M9 18V5l12-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0z',
  musicNote2: 'M21 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z',
  film: 'M2 2h20v20H2zM7 2v20M17 2v20M2 12h20M2 7h5M2 17h5M17 17h5M17 7h5',
  gif: 'M2 4h20v16H2z',
};

// ── Custom slash menu item creators ──

function createWebBookmarkItem(editor) {
  return {
    title: 'Web Bookmark',
    subtext: 'Embed a link with preview',
    group: 'Advanced blocks',
    aliases: ['link', 'url', 'embed', 'bookmark'],
    icon: <IconWrapper d={ICONS.link} />,
    onItemClick: () => {
      const url = prompt('Enter URL:');
      if (url) {
        editor.insertBlocks(
          [{ type: 'paragraph', content: [{ type: 'link', href: url, content: url }] }],
          editor.getTextCursorPosition().block,
          'after'
        );
      }
    },
  };
}

function createCodeBlockItem(editor) {
  return {
    title: 'Code',
    subtext: 'Insert a code block',
    group: 'Advanced blocks',
    aliases: ['code', 'codeblock', 'snippet'],
    icon: <IconWrapper d={ICONS.code} />,
    onItemClick: () => {
      editor.insertBlocks(
        [{ type: 'codeBlock' }],
        editor.getTextCursorPosition().block,
        'after'
      );
    },
  };
}

function createFileItem(editor, title, subtext, accept, aliases) {
  return {
    title,
    subtext,
    group: 'Advanced blocks',
    aliases: aliases || [],
    icon: <IconWrapper d={ICONS.file} />,
    onItemClick: () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = accept;
      input.onchange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        editor.insertBlocks(
          [{ type: 'paragraph', content: [{ type: 'text', text: `📎 ${file.name}`, styles: {} }] }],
          editor.getTextCursorPosition().block,
          'after'
        );
      };
      input.click();
    },
  };
}

// ── Media items (attach) ──

function createMediaUploadItem(editor, title, subtext, accept, aliases, icon) {
  return {
    title,
    subtext,
    group: 'Media',
    aliases,
    icon,
    onItemClick: () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = accept;
      input.onchange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        // TODO: upload to R2 and embed properly
        if (accept.startsWith('image')) {
          const url = URL.createObjectURL(file);
          editor.insertBlocks(
            [{ type: 'image', props: { url } }],
            editor.getTextCursorPosition().block,
            'after'
          );
        } else {
          editor.insertBlocks(
            [{ type: 'paragraph', content: [{ type: 'text', text: `📎 ${file.name}`, styles: {} }] }],
            editor.getTextCursorPosition().block,
            'after'
          );
        }
      };
      input.click();
    },
  };
}

// ── AI Generation items ──

function createAIGenerateItem(editor, title, subtext, aliases, icon) {
  return {
    title,
    subtext,
    group: 'AI Generate',
    aliases,
    icon,
    onItemClick: () => {
      const prompt = window.prompt(`Describe what you want to generate (${title}):`);
      if (prompt) {
        // TODO: call AI generation API
        editor.insertBlocks(
          [{ type: 'paragraph', content: [{ type: 'text', text: `🤖 [${title} generating: "${prompt}"]`, styles: { italic: true } }] }],
          editor.getTextCursorPosition().block,
          'after'
        );
      }
    },
  };
}

// ── Build full slash menu ──

function getCustomSlashMenuItems(editor) {
  const defaults = getDefaultReactSlashMenuItems(editor).filter((item) => {
    const t = item.title.toLowerCase();
    return t !== 'video' && t !== 'audio';
  });

  const advancedItems = [
    createWebBookmarkItem(editor),
    createCodeBlockItem(editor),
    createFileItem(editor, 'CSV', 'Upload a CSV file', '.csv', ['csv', 'spreadsheet', 'data']),
    createFileItem(editor, 'PDF', 'Upload a PDF document', '.pdf', ['pdf', 'document']),
    createFileItem(editor, 'Markdown', 'Upload a Markdown file', '.md,.mdx', ['markdown', 'md']),
    createFileItem(editor, 'HTML', 'Upload an HTML file', '.html,.htm', ['html', 'web']),
  ];

  const mediaItems = [
    createMediaUploadItem(editor, 'Image', 'Upload an image', 'image/*', ['image', 'photo', 'picture', 'img'], <IconWrapper d={ICONS.image} />),
    createMediaUploadItem(editor, 'GIF', 'Upload an animated GIF', 'image/gif', ['gif', 'animated', 'animation'], <IconWrapper d={ICONS.gif} />),
    createMediaUploadItem(editor, 'Audio', 'Upload an audio file', 'audio/*', ['audio', 'music', 'sound', 'mp3'], <IconWrapper d={ICONS.music} d2={ICONS.musicNote2} />),
    createMediaUploadItem(editor, 'Video', 'Upload a video file', 'video/*', ['video', 'mp4', 'clip'], <IconWrapper d={ICONS.film} />),
  ];

  const aiItems = [
    createAIGenerateItem(editor, 'Generate Image', 'Create an image with AI', ['ai image', 'generate image', 'create image', 'dall-e'], <span className="ai-slash-icon"><IconWrapper d={ICONS.sparkle} /></span>),
    createAIGenerateItem(editor, 'Generate Audio', 'Create audio with AI', ['ai audio', 'generate audio', 'tts', 'text to speech'], <span className="ai-slash-icon"><IconWrapper d={ICONS.sparkle} /></span>),
    createAIGenerateItem(editor, 'Generate Video', 'Create a video with AI', ['ai video', 'generate video', 'create video'], <span className="ai-slash-icon"><IconWrapper d={ICONS.sparkle} /></span>),
  ];

  return [...defaults, ...mediaItems, ...advancedItems, ...aiItems];
}

// ── Check if current block is empty ──

function isCurrentBlockEmpty(editor) {
  try {
    const cursor = editor.getTextCursorPosition();
    if (!cursor || !cursor.block) return false;
    const block = cursor.block;
    if (block.type !== 'paragraph') return false;
    if (!block.content || block.content.length === 0) return true;
    if (block.content.length === 1 && block.content[0].type === 'text' && block.content[0].text === '') return true;
    return false;
  } catch {
    return false;
  }
}

// ── Get cursor position for menu placement ──

function getCursorCoords() {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  const range = sel.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  return { top: rect.bottom + 4, left: rect.left };
}

// ── BlogEditor ──

const BlogEditor = forwardRef(function BlogEditor({ onChange, initialContent }, ref) {
  const [showAIMenu, setShowAIMenu] = useState(false);
  const [aiMenuPos, setAiMenuPos] = useState({ top: 0, left: 0 });
  const wrapperRef = useRef(null);

  const editor = useCreateBlockNote({
    initialContent: initialContent || undefined,
    domAttributes: {
      editor: { class: 'blog-editor' },
    },
  });

  useImperativeHandle(ref, () => ({
    getDocument: () => editor.document,
    getEditor: () => editor,
    getHTML: async () => await editor.blocksToHTMLLossy(editor.document),
    getMarkdown: async () => await editor.blocksToMarkdownLossy(editor.document),
  }), [editor]);

  const handleChange = useCallback(() => {
    if (onChange) onChange(editor.document);
  }, [onChange, editor]);

  const getItems = useMemo(
    () => async (query) => filterItems(getCustomSlashMenuItems(editor), query),
    [editor]
  );

  // Space trigger for AI menu on empty blocks
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === ' ' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (isCurrentBlockEmpty(editor)) {
          e.preventDefault();
          const coords = getCursorCoords();
          if (coords && wrapperRef.current) {
            const wrapperRect = wrapperRef.current.getBoundingClientRect();
            setAiMenuPos({
              top: coords.top - wrapperRect.top,
              left: coords.left - wrapperRect.left,
            });
          }
          setShowAIMenu(true);
        }
      }
    }

    const editorEl = wrapperRef.current?.querySelector('.bn-editor');
    if (editorEl) {
      editorEl.addEventListener('keydown', handleKeyDown);
      return () => editorEl.removeEventListener('keydown', handleKeyDown);
    }
  }, [editor]);

  const handleAISubmit = useCallback((prompt) => {
    setShowAIMenu(false);
    // Insert a placeholder block while AI generates
    const cursor = editor.getTextCursorPosition();
    if (cursor?.block) {
      editor.insertBlocks(
        [{ type: 'paragraph', content: [{ type: 'text', text: `Generating: "${prompt}"...`, styles: { italic: true, textColor: '#9b7bf7' } }] }],
        cursor.block,
        'after'
      );
    }
    // TODO: call AI backend API and replace placeholder with actual content
  }, [editor]);

  return (
    <div className="blog-editor-wrapper" ref={wrapperRef} style={{ position: 'relative' }}>
      <BlockNoteView
        editor={editor}
        onChange={handleChange}
        theme="dark"
        slashMenu={false}
      >
        <SuggestionMenuController
          triggerCharacter="/"
          getItems={getItems}
        />
      </BlockNoteView>

      {showAIMenu && (
        <AICommandMenu
          position={aiMenuPos}
          onSubmit={handleAISubmit}
          onClose={() => setShowAIMenu(false)}
        />
      )}
    </div>
  );
});

export default BlogEditor;
