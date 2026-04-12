# LixEditor for VS Code

A rich WYSIWYG block editor for `.lixeditor` files — right inside VS Code.

## Features

- **Rich block editor** — paragraphs, headings, lists, checklists, tables
- **Code blocks** — syntax-highlighted with Shiki (30+ languages)
- **Slash commands** — type `/` to insert blocks
- **Auto-save** — changes sync back to the file in real-time
- **VS Code theme aware** — adapts to your light/dark theme automatically
- **Markdown shortcuts** — bold, italic, strikethrough, code, links

## Usage

1. Create a file with the `.lixeditor` extension
2. Open it — the rich editor opens automatically
3. Start writing with `/` commands, markdown shortcuts, or just type

## File Format

`.lixeditor` files store content as JSON (BlockNote document format). The editor reads and writes this format transparently — you never need to edit the JSON directly.

## Commands

| Command | Description |
|---------|-------------|
| `LixEditor: New Document` | Create a new `.lixeditor` file |

## About

Built by [Elixpo](https://github.com/elixpo) — the same editor that powers [LixBlogs](https://blogs.elixpo.com).

Available as an npm package too: [`@elixpo/lixeditor`](https://www.npmjs.com/package/@elixpo/lixeditor)
