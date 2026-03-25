'use client';

import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import '@blocknote/core/fonts/inter.css';
import '@blocknote/mantine/style.css';
import { useCallback, forwardRef, useImperativeHandle } from 'react';

const BlogEditor = forwardRef(function BlogEditor({ onChange, initialContent }, ref) {
  const editor = useCreateBlockNote({
    initialContent: initialContent || undefined,
    domAttributes: {
      editor: {
        class: 'blog-editor',
      },
    },
  });

  useImperativeHandle(ref, () => ({
    getDocument: () => editor.document,
    getEditor: () => editor,
    getHTML: async () => {
      const html = await editor.blocksToHTMLLossy(editor.document);
      return html;
    },
    getMarkdown: async () => {
      const md = await editor.blocksToMarkdownLossy(editor.document);
      return md;
    },
  }), [editor]);

  const handleChange = useCallback(() => {
    if (onChange) {
      onChange(editor.document);
    }
  }, [onChange, editor]);

  return (
    <div className="blog-editor-wrapper">
      <BlockNoteView
        editor={editor}
        onChange={handleChange}
        theme="dark"
      />
    </div>
  );
});

export default BlogEditor;
