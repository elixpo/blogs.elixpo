// Parse inline markdown (bold, italic, code) into BlockNote styled content

export function parseInlineContent(text) {
  const content = [];
  // Match: ***bold italic***, **bold**, *italic*, `code`
  const regex = /(\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      content.push({ type: 'text', text: text.slice(lastIndex, match.index) });
    }
    if (match[2]) {
      content.push({ type: 'text', text: match[2], styles: { bold: true, italic: true } });
    } else if (match[3]) {
      content.push({ type: 'text', text: match[3], styles: { bold: true } });
    } else if (match[4]) {
      content.push({ type: 'text', text: match[4], styles: { italic: true } });
    } else if (match[5]) {
      content.push({ type: 'text', text: match[5], styles: { code: true } });
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    content.push({ type: 'text', text: text.slice(lastIndex) });
  }

  return content.length > 0 ? content : [{ type: 'text', text }];
}

// Parse markdown text into BlockNote block array

export function parseMarkdownToBlocks(text) {
  const lines = text.split('\n');
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) { i++; continue; }

    // Code fence
    const fenceMatch = trimmed.match(/^```(\w*)/);
    if (fenceMatch) {
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      const codeText = codeLines.join('\n');
      blocks.push({ type: 'paragraph', content: [{ type: 'text', text: codeText, styles: { code: true } }] });
      continue;
    }

    // Heading
    const headingMatch = trimmed.match(/^(#{1,3})\s+(.+)/);
    if (headingMatch) {
      blocks.push({ type: 'heading', props: { level: headingMatch[1].length.toString() }, content: parseInlineContent(headingMatch[2]) });
      i++; continue;
    }

    // Bullet list
    if (trimmed.match(/^[-*]\s+/)) {
      blocks.push({ type: 'bulletListItem', content: parseInlineContent(trimmed.replace(/^[-*]\s+/, '')) });
      i++; continue;
    }

    // Numbered list
    if (trimmed.match(/^\d+\.\s+/)) {
      blocks.push({ type: 'numberedListItem', content: parseInlineContent(trimmed.replace(/^\d+\.\s+/, '')) });
      i++; continue;
    }

    // Default paragraph with inline formatting
    blocks.push({ type: 'paragraph', content: parseInlineContent(trimmed) });
    i++;
  }

  return blocks.length > 0 ? blocks : [{ type: 'paragraph', content: [] }];
}
