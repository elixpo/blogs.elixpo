import { build } from 'esbuild';

const watch = process.argv.includes('--watch');

// Build the extension (Node.js, CommonJS)
await build({
  entryPoints: ['src/extension.js'],
  bundle: true,
  format: 'cjs',
  platform: 'node',
  outfile: 'out/extension.js',
  external: ['vscode'],
  minify: !watch,
  sourcemap: watch,
  ...(watch ? { watch: { onRebuild: () => console.log('[ext] Rebuilt') } } : {}),
});

console.log('✓ Extension built → out/extension.js');

// Build the webview (Browser, ESM → IIFE)
await build({
  entryPoints: ['webview/editor-src.jsx'],
  bundle: true,
  format: 'iife',
  platform: 'browser',
  outfile: 'webview/editor.js',
  jsx: 'automatic',
  loader: {
    '.js': 'jsx',
    '.jsx': 'jsx',
    '.woff': 'dataurl',
    '.woff2': 'dataurl',
    '.ttf': 'dataurl',
    '.eot': 'dataurl',
    '.svg': 'dataurl',
    '.css': 'css',
  },
  conditions: ['style', 'browser', 'import'],
  target: 'es2020',
  minify: !watch,
  sourcemap: watch,
  define: {
    'process.env.NODE_ENV': '"production"',
  },
  ...(watch ? { watch: { onRebuild: () => console.log('[webview] Rebuilt') } } : {}),
});

console.log('✓ Webview built → webview/editor.js');

// Create a basic CSS file for the webview
import { writeFileSync } from 'fs';
writeFileSync('webview/editor.css', `
body {
  margin: 0;
  padding: 0;
  background: var(--vscode-editor-background);
  color: var(--vscode-editor-foreground);
  font-family: 'Source Serif 4', Georgia, serif;
}

#root {
  min-height: 100vh;
}

/* Map VS Code theme vars to editor vars */
.lix-vscode-editor {
  --text-primary: var(--vscode-editor-foreground);
  --text-muted: var(--vscode-descriptionForeground);
  --text-faint: var(--vscode-disabledForeground);
  --bg-app: var(--vscode-editor-background);
  --bg-surface: var(--vscode-editorWidget-background);
  --bg-elevated: var(--vscode-editorHoverWidget-background);
  --bg-hover: var(--vscode-list-hoverBackground);
  --border-default: var(--vscode-editorWidget-border);
  --divider: var(--vscode-editorWidget-border);
  --accent: #9b7bf7;
  --code-bg: var(--vscode-textCodeBlock-background);
  --code-text: var(--vscode-editor-foreground);
}

/* BlockNote overrides for VS Code */
.bn-container {
  background: transparent !important;
  border: none !important;
}

.bn-editor {
  font-family: 'Source Serif 4', Georgia, serif;
  font-size: 15px;
  line-height: 1.75;
  color: var(--vscode-editor-foreground);
}

/* Headings */
.bn-default-styles h1 { font-size: 28px !important; font-weight: 700 !important; }
.bn-default-styles h2 { font-size: 22px !important; font-weight: 650 !important; }
.bn-default-styles h3 { font-size: 18px !important; font-weight: 600 !important; }

/* Code blocks */
[data-content-type="codeBlock"] {
  background: var(--vscode-textCodeBlock-background) !important;
  border: 1px solid var(--vscode-editorWidget-border) !important;
  border-radius: 6px;
  margin: 8px 0;
}

[data-content-type="codeBlock"] code {
  font-family: var(--vscode-editor-fontFamily), monospace !important;
  font-size: var(--vscode-editor-fontSize, 13px) !important;
}

/* Inline code */
code {
  background: var(--vscode-textCodeBlock-background);
  padding: 1px 4px;
  border-radius: 3px;
  font-family: var(--vscode-editor-fontFamily), monospace;
  font-size: 0.9em;
}

/* Tables */
table { border-collapse: collapse; width: 100%; }
th, td { border: 1px solid var(--vscode-editorWidget-border); padding: 6px 10px; text-align: left; }
th { background: var(--vscode-editorWidget-background); font-weight: 600; }

/* Links */
a { color: var(--vscode-textLink-foreground); text-decoration: none; }
a:hover { text-decoration: underline; }

/* Selection */
::selection { background: var(--vscode-editor-selectionBackground); }

/* Toolbar */
.bn-toolbar {
  background: var(--vscode-editorWidget-background) !important;
  border: 1px solid var(--vscode-editorWidget-border) !important;
  border-radius: 6px !important;
  box-shadow: 0 4px 16px rgba(0,0,0,0.2) !important;
}

/* Scrollbar */
::-webkit-scrollbar { width: 8px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--vscode-scrollbarSlider-background); border-radius: 4px; }
::-webkit-scrollbar-thumb:hover { background: var(--vscode-scrollbarSlider-hoverBackground); }
`);

console.log('✓ CSS written → webview/editor.css');
console.log(watch ? '👀 Watching for changes...' : '🎉 Build complete!');
