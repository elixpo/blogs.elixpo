import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { BlockNoteSchema, defaultBlockSpecs, defaultInlineContentSpecs, createCodeBlockSpec } from '@blocknote/core';
import { useCreateBlockNote, SuggestionMenuController, getDefaultReactSlashMenuItems, TableHandlesController } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
// CSS imports handled by build — excluded from bundle

// VS Code API
const vscode = acquireVsCodeApi();

// Code block with Shiki
const codeBlock = createCodeBlockSpec({
  supportedLanguages: {
    text: { name: 'Text' },
    javascript: { name: 'JavaScript' }, typescript: { name: 'TypeScript' },
    python: { name: 'Python' }, java: { name: 'Java' },
    c: { name: 'C' }, cpp: { name: 'C++' }, csharp: { name: 'C#' },
    go: { name: 'Go' }, rust: { name: 'Rust' }, ruby: { name: 'Ruby' },
    php: { name: 'PHP' }, swift: { name: 'Swift' }, kotlin: { name: 'Kotlin' },
    html: { name: 'HTML' }, css: { name: 'CSS' }, json: { name: 'JSON' },
    yaml: { name: 'YAML' }, markdown: { name: 'Markdown' },
    bash: { name: 'Bash' }, shell: { name: 'Shell' }, sql: { name: 'SQL' },
    jsx: { name: 'JSX' }, tsx: { name: 'TSX' },
  },
  createHighlighter: async () => {
    const { createHighlighter } = await import('shiki');
    return createHighlighter({
      themes: ['vitesse-dark', 'vitesse-light'],
      langs: ['javascript', 'typescript', 'python', 'java', 'c', 'cpp', 'csharp', 'go', 'rust', 'ruby', 'php', 'swift', 'kotlin', 'html', 'css', 'json', 'yaml', 'markdown', 'bash', 'shell', 'sql', 'jsx', 'tsx'],
    });
  },
});

const schema = BlockNoteSchema.create({
  blockSpecs: { ...defaultBlockSpecs, codeBlock },
  inlineContentSpecs: { ...defaultInlineContentSpecs },
});

function LixEditorApp() {
  const [initialContent, setInitialContent] = useState(undefined);
  const [loaded, setLoaded] = useState(false);
  const [isDark, setIsDark] = useState(document.body.classList.contains('vscode-dark'));
  const saveTimerRef = useRef(null);

  // Detect VS Code theme
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.body.classList.contains('vscode-dark'));
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // Listen for messages from extension
  useEffect(() => {
    const handler = (event) => {
      const message = event.data;
      if (message.type === 'load') {
        const blocks = message.blocks;
        setInitialContent(blocks?.length ? blocks : undefined);
        setLoaded(true);
      }
    };
    window.addEventListener('message', handler);
    // Signal ready
    vscode.postMessage({ type: 'ready' });
    return () => window.removeEventListener('message', handler);
  }, []);

  const handleChange = useCallback((editor) => {
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      const blocks = editor.document;
      vscode.postMessage({ type: 'update', blocks });
    }, 800);
  }, []);

  if (!loaded) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--vscode-foreground)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>LixEditor</div>
          <div style={{ fontSize: 13, opacity: 0.6 }}>Loading...</div>
        </div>
      </div>
    );
  }

  return <EditorView initialContent={initialContent} isDark={isDark} onChange={handleChange} />;
}

function EditorView({ initialContent, isDark, onChange }) {
  const editor = useCreateBlockNote({
    schema,
    initialContent: initialContent || undefined,
    domAttributes: { editor: { class: 'lix-vscode-editor' } },
  });

  const handleEditorChange = useCallback(() => {
    onChange(editor);
  }, [editor, onChange]);

  const getItems = useCallback(async (query) => {
    return getDefaultReactSlashMenuItems(editor)
      .filter(item => !['video', 'audio', 'file'].includes(item.key))
      .filter(item => item.title.toLowerCase().includes(query.toLowerCase()));
  }, [editor]);

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px', minHeight: '100vh' }}>
      <BlockNoteView
        editor={editor}
        onChange={handleEditorChange}
        theme={isDark ? 'dark' : 'light'}
        slashMenu={false}
      >
        <SuggestionMenuController triggerCharacter="/" getItems={getItems} />
        <TableHandlesController />
      </BlockNoteView>
    </div>
  );
}

// Mount
const root = createRoot(document.getElementById('root'));
root.render(<LixEditorApp />);
