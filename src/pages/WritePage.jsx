'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import '@blocknote/core/fonts/inter.css';
import '@blocknote/mantine/style.css';
import '../styles/editor/editor.css';

const BlockNoteEditor = dynamic(
  () => import('../components/Editor/BlogEditor'),
  { ssr: false }
);

const BlogPreview = dynamic(
  () => import('../components/Editor/BlogPreview'),
  { ssr: false }
);

const BlogCodeView = dynamic(
  () => import('../components/Editor/BlogCodeView'),
  { ssr: false }
);

export default function WritePage({ slug }) {
  const editorRef = useRef(null);
  const [mode, setMode] = useState('edit');
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [coverImage, setCoverImage] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [publishAs, setPublishAs] = useState('personal');
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [showPublishPanel, setShowPublishPanel] = useState(false);
  const [editorContent, setEditorContent] = useState(null);
  const [previewHtml, setPreviewHtml] = useState('');
  const [markdown, setMarkdown] = useState('');
  const [wordCount, setWordCount] = useState(0);

  const handleCoverUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverImage(file);
    const reader = new FileReader();
    reader.onload = (ev) => setCoverPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const removeCover = () => {
    setCoverImage(null);
    setCoverPreview(null);
  };

  const addTag = () => {
    const trimmed = tagInput.trim().toLowerCase();
    if (trimmed && !tags.includes(trimmed) && tags.length < 5) {
      setTags([...tags, trimmed]);
      setTagInput('');
    }
  };

  const removeTag = (tag) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleTagKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  const handleEditorChange = useCallback((blocks) => {
    setEditorContent(blocks);
    // Count words from block text content
    const text = blocks
      .map((b) => {
        if (b.content && Array.isArray(b.content)) {
          return b.content.map((c) => c.text || '').join('');
        }
        return '';
      })
      .join(' ');
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    setWordCount(words);
  }, []);

  const switchMode = useCallback(async (newMode) => {
    if (newMode !== 'edit' && editorRef.current) {
      try {
        const [html, md] = await Promise.all([
          editorRef.current.getHTML(),
          editorRef.current.getMarkdown(),
        ]);
        setPreviewHtml(html);
        setMarkdown(md);
      } catch {
        // Editor may not be ready
      }
    }
    setMode(newMode);
  }, []);

  const handlePublish = () => {
    const blogData = {
      title,
      subtitle,
      content: editorContent,
      tags,
      publishAs,
      coverImage,
    };
    console.log('Publishing blog:', blogData);
    // TODO: API call to publish
  };

  const readTime = Math.max(1, Math.ceil(wordCount / 250));

  return (
    <div className="min-h-screen bg-[#030712] text-white">
      {/* Header */}
      <header className="fixed top-0 left-0 w-full h-[60px] border-b border-[#1D202A] flex items-center justify-between px-6 bg-[#030712]/95 backdrop-blur-sm z-50">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-[url('/logo.png')] bg-cover" />
          <p className="text-xl font-bold font-[Kanit,serif]">LixBlogs</p>
        </div>

        {/* Mode Tabs */}
        <div className="flex items-center bg-[#10141E] rounded-lg p-1 gap-1">
          {[
            { key: 'edit', label: 'Edit', icon: 'create-outline' },
            { key: 'preview', label: 'Preview', icon: 'eye-outline' },
            { key: 'code', label: 'Code', icon: 'code-slash-outline' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => switchMode(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                mode === tab.key
                  ? 'bg-[#7ba8f0] text-[#030712]'
                  : 'text-[#888] hover:text-white'
              }`}
            >
              <ion-icon name={tab.icon} style={{ fontSize: '15px' }} />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[#555] text-xs">
            {wordCount} words &middot; {readTime} min read
          </span>
          <span className="text-[#888] text-sm px-2 py-0.5 rounded bg-[#1D202A]">Draft</span>
          <button
            onClick={() => setShowPublishPanel(!showPublishPanel)}
            className="px-5 py-1.5 bg-[#7ba8f0] text-[#030712] font-semibold rounded-full text-sm hover:bg-[#9dc0ff] transition-colors"
          >
            Publish
          </button>
          <div className="h-8 w-8 rounded-full bg-[#1D202A] flex items-center justify-center cursor-pointer hover:bg-[#282c3a] transition-colors">
            <ion-icon name="ellipsis-horizontal" style={{ color: '#888', fontSize: '16px' }} />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="pt-[60px] flex justify-center">
        <div className={`w-full max-w-[820px] px-6 py-10 ${showPublishPanel ? 'mr-[400px]' : ''} transition-all`}>

          {/* === EDIT MODE === */}
          {mode === 'edit' && (
            <>
              {/* Cover Image */}
              {coverPreview ? (
                <div className="relative mb-8 rounded-xl overflow-hidden group">
                  <img src={coverPreview} alt="Cover" className="w-full h-[300px] object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    <label className="px-4 py-2 bg-white/20 backdrop-blur rounded-lg cursor-pointer text-sm hover:bg-white/30 transition-colors">
                      Change
                      <input type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
                    </label>
                    <button
                      onClick={removeCover}
                      className="px-4 py-2 bg-red-500/60 backdrop-blur rounded-lg text-sm hover:bg-red-500/80 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <label className="flex items-center gap-2 mb-6 text-[#555] cursor-pointer hover:text-[#7ba8f0] transition-colors text-sm w-fit">
                  <ion-icon name="image-outline" style={{ fontSize: '18px' }} />
                  Add cover image
                  <input type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
                </label>
              )}

              {/* Title */}
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Blog title..."
                className="w-full bg-transparent text-[2.8em] font-extrabold outline-none placeholder-[#222] mb-2 leading-tight"
              />

              {/* Subtitle */}
              <input
                type="text"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="Add a subtitle..."
                className="w-full bg-transparent text-xl text-[#888] outline-none placeholder-[#222] mb-8"
              />

              {/* Block Editor */}
              <div className="min-h-[500px]">
                <BlockNoteEditor ref={editorRef} onChange={handleEditorChange} />
              </div>
            </>
          )}

          {/* === PREVIEW MODE === */}
          {mode === 'preview' && (
            <BlogPreview
              title={title}
              subtitle={subtitle}
              coverPreview={coverPreview}
              tags={tags}
              html={previewHtml}
            />
          )}

          {/* === CODE MODE === */}
          {mode === 'code' && (
            <BlogCodeView blocks={editorContent} markdown={markdown} />
          )}
        </div>
      </main>

      {/* Publish Side Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-[400px] bg-[#10141E] border-l border-[#1D202A] z-50 flex flex-col shadow-2xl transition-transform duration-300 ${
          showPublishPanel ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-5 border-b border-[#1D202A]">
          <h2 className="text-lg font-bold">Publish Settings</h2>
          <button
            onClick={() => setShowPublishPanel(false)}
            className="text-[#888] hover:text-white transition-colors"
          >
            <ion-icon name="close" style={{ fontSize: '22px' }} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Publish As */}
          <div>
            <label className="text-sm text-[#888] mb-2 block">Publish as</label>
            <div className="flex gap-2">
              <button
                onClick={() => setPublishAs('personal')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                  publishAs === 'personal'
                    ? 'bg-[#7ba8f0] text-[#030712]'
                    : 'bg-[#1D202A] text-[#888] hover:text-white'
                }`}
              >
                Personal
              </button>
              <button
                onClick={() => setPublishAs('organization')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                  publishAs === 'organization'
                    ? 'bg-[#7ba8f0] text-[#030712]'
                    : 'bg-[#1D202A] text-[#888] hover:text-white'
                }`}
              >
                Organization
              </button>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="text-sm text-[#888] mb-2 block">Tags (up to 5)</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="flex items-center gap-1 px-3 py-1 bg-[#1D202A] rounded-full text-sm text-[#7ba8f0]"
                >
                  #{tag}
                  <button onClick={() => removeTag(tag)} className="text-[#888] hover:text-white ml-1">
                    <ion-icon name="close" style={{ fontSize: '12px' }} />
                  </button>
                </span>
              ))}
            </div>
            {tags.length < 5 && (
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                placeholder="Add a tag..."
                className="w-full bg-[#1D202A] text-white rounded-lg px-4 py-2 outline-none text-sm border border-[#333] focus:border-[#7ba8f0] transition-colors"
              />
            )}
          </div>

          {/* SEO / Meta */}
          <div>
            <label className="text-sm text-[#888] mb-2 block">URL Slug</label>
            <div className="flex items-center bg-[#1D202A] rounded-lg border border-[#333] overflow-hidden">
              <span className="text-[#555] text-sm px-3">/blog/</span>
              <input
                type="text"
                defaultValue={slug || ''}
                placeholder="auto-generated-from-title"
                className="flex-1 bg-transparent text-white py-2 pr-3 outline-none text-sm"
              />
            </div>
          </div>

          {/* Preview Card */}
          <div>
            <label className="text-sm text-[#888] mb-2 block">Preview</label>
            <div className="bg-[#1D202A] rounded-xl p-4">
              {coverPreview && (
                <img src={coverPreview} alt="Cover" className="w-full h-[120px] object-cover rounded-lg mb-3" />
              )}
              <p className="font-bold text-lg leading-tight">{title || 'Your blog title'}</p>
              <p className="text-[#888] text-sm mt-1">{subtitle || 'Your subtitle will appear here'}</p>
              <div className="flex items-center gap-3 mt-3 text-xs text-[#555]">
                <span>{readTime} min read</span>
                <span>&middot;</span>
                <span>{wordCount} words</span>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {tags.map((tag) => (
                    <span key={tag} className="text-xs text-[#7ba8f0]">#{tag}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Publish Button */}
        <div className="p-5 border-t border-[#1D202A]">
          <button
            onClick={handlePublish}
            disabled={!title.trim()}
            className="w-full py-3 bg-[#7ba8f0] text-[#030712] font-bold rounded-xl text-sm hover:bg-[#9dc0ff] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Publish now
          </button>
        </div>
      </div>
    </div>
  );
}
