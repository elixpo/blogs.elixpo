/**
 * Base email layout wrapper — full-width, center-aligned, no card container.
 * Includes a signature quote in the footer as a LixBlogs trademark.
 */
export function baseLayout({ title, body, preheader = '' }) {
  const { text: quoteText, author: quoteAuthor } = pickQuote();

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="dark" />
  <meta name="supported-color-schemes" content="dark" />
  <title>${escHtml(title)}</title>
  <!--[if mso]>
  <style>body,table,td{font-family:Arial,Helvetica,sans-serif!important}</style>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#0d1118;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:#e8edf5;-webkit-text-size-adjust:100%;width:100%;min-width:100%">
  ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all">${escHtml(preheader)}${'&zwnj;&nbsp;'.repeat(30)}</div>` : ''}

  <!-- Header -->
  <div style="padding:28px 24px 24px;text-align:center">
    <img src="https://res.cloudinary.com/ds4qzqb4y/image/upload/v1774947344/lixblogs/logo.png" alt="LixBlogs" width="30" height="30" style="display:inline-block;border-radius:8px;vertical-align:middle" />
    <span style="font-size:18px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;vertical-align:middle;margin-left:8px">LixBlogs</span>
  </div>

  <!-- Accent line -->
  <div style="height:2px;background:linear-gradient(90deg,#9b7bf7 0%,#60a5fa 50%,#4ade80 100%);opacity:0.7"></div>

  <!-- Body -->
  <div style="padding:36px 24px 40px">
    ${body}
  </div>

  <!-- Quote -->
  <div style="padding:0 24px 32px;text-align:center">
    <div style="display:inline-block;text-align:left;border-left:3px solid #9b7bf7;padding:12px 18px;background-color:#161b22;border-radius:0 8px 8px 0;max-width:420px">
      <p style="margin:0;font-size:13px;color:#b0b8c4;line-height:1.6;font-style:italic">&ldquo;${quoteText}&rdquo;</p>
      <p style="margin:6px 0 0;font-size:11px;color:#7c8a9e;font-weight:600">&mdash; ${quoteAuthor}</p>
    </div>
  </div>

  <!-- Footer -->
  <div style="border-top:1px solid #21262d;padding:20px 24px 28px;text-align:center">
    <p style="margin:0;font-size:12px;color:#7c8a9e;line-height:1.6">
      You received this because of your account on
      <a href="https://blogs.elixpo.com" style="color:#b49aff;text-decoration:none">LixBlogs</a>.
    </p>
    <p style="margin:6px 0 0;font-size:11px;color:#5a657a">
      &copy; ${new Date().getFullYear()} Elixpo &middot;
      <a href="https://blogs.elixpo.com/about" style="color:#7c8a9e;text-decoration:none">About</a> &middot;
      <a href="https://blogs.elixpo.com/settings?tab=notifications" style="color:#7c8a9e;text-decoration:none">Unsubscribe</a>
    </p>
  </div>

</body>
</html>`;
}

// ─── Quotes ─────────────────────────────────────────────────────────────
const QUOTES = [
  { text: 'The scariest moment is always just before you start.', author: 'Stephen King' },
  { text: 'Start writing, no matter what. The water does not flow until the faucet is turned on.', author: 'Louis L\'Amour' },
  { text: 'There is no greater agony than bearing an untold story inside you.', author: 'Maya Angelou' },
  { text: 'You can always edit a bad page. You can\'t edit a blank page.', author: 'Jodi Picoult' },
  { text: 'A writer is someone for whom writing is more difficult than it is for other people.', author: 'Thomas Mann' },
  { text: 'If you want to be a writer, you must do two things above all others: read a lot and write a lot.', author: 'Stephen King' },
  { text: 'The first draft is just you telling yourself the story.', author: 'Terry Pratchett' },
  { text: 'Write what should not be forgotten.', author: 'Isabel Allende' },
  { text: 'We write to taste life twice, in the moment and in retrospect.', author: 'Anaïs Nin' },
  { text: 'Either write something worth reading or do something worth writing.', author: 'Benjamin Franklin' },
  { text: 'Ideas are like rabbits. You get a couple and learn how to handle them, and pretty soon you have a dozen.', author: 'John Steinbeck' },
  { text: 'One day I will find the right words, and they will be simple.', author: 'Jack Kerouac' },
  { text: 'Fill your paper with the breathings of your heart.', author: 'William Wordsworth' },
  { text: 'Writing is thinking on paper.', author: 'William Zinsser' },
  { text: 'All you have to do is write one true sentence. Write the truest sentence that you know.', author: 'Ernest Hemingway' },
];

function pickQuote() {
  const day = Math.floor(Date.now() / 86400000);
  return QUOTES[day % QUOTES.length];
}

// ─── Helpers ────────────────────────────────────────────────────────────

export function escHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Center-aligned primary CTA button */
export function ctaButton(text, href) {
  return `
    <div style="text-align:center;margin:24px 0 8px">
      <a href="${escHtml(href)}" style="display:inline-block;background-color:#9b7bf7;border-radius:8px;padding:11px 28px;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none">
        ${escHtml(text)}
      </a>
    </div>`;
}

/** Center-aligned primary + secondary button pair */
export function buttonRow(primary, secondary) {
  return `
    <div style="text-align:center;margin:24px 0 8px">
      <a href="${escHtml(primary.href)}" style="display:inline-block;background-color:#9b7bf7;border-radius:8px;padding:11px 28px;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none">${escHtml(primary.text)}</a>
      &nbsp;&nbsp;
      <a href="${escHtml(secondary.href)}" style="display:inline-block;border:1px solid #30363d;border-radius:8px;padding:11px 28px;background-color:#161b22;color:#e0e6ed;font-size:14px;font-weight:600;text-decoration:none">${escHtml(secondary.text)}</a>
    </div>`;
}

export function secondaryLink(text, href) {
  return `<a href="${escHtml(href)}" style="color:#b49aff;font-size:13px;text-decoration:none">${escHtml(text)}</a>`;
}

export function muted(text) {
  return `<p style="margin:14px 0 0;font-size:12px;color:#8b949e;line-height:1.5;text-align:center">${text}</p>`;
}

export function divider() {
  return `<div style="height:1px;background-color:#21262d;margin:28px 0"></div>`;
}

export function avatar(url, name, size = 40) {
  if (url) {
    return `<img src="${escHtml(url)}" alt="" width="${size}" height="${size}" style="border-radius:50%;display:inline-block;object-fit:cover;border:2px solid #21262d" />`;
  }
  const initial = (name || '?')[0].toUpperCase();
  return `<div style="width:${size}px;height:${size}px;border-radius:50%;background-color:#1c2129;border:2px solid #21262d;color:#8b949e;font-size:${Math.round(size * 0.4)}px;font-weight:700;line-height:${size}px;text-align:center;display:inline-block">${initial}</div>`;
}
