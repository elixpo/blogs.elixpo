import { baseLayout, buttonRow, muted, escHtml } from './base.js';

/**
 * Welcome email — center-aligned, compact.
 */
export function welcome(data) {
  const { displayName, username, avatarUrl } = data;
  const name = displayName || username;

  const subject = `Welcome to LixBlogs, ${name}!`;

  const body = `
    <div style="text-align:center">

      <!-- Avatar -->
      ${avatarUrl
        ? `<img src="${escHtml(avatarUrl)}" alt="" width="72" height="72" style="display:inline-block;border-radius:50%;border:2px solid #21262d;object-fit:cover" />`
        : `<div style="display:inline-block;width:72px;height:72px;border-radius:50%;background-color:#1c2129;border:2px solid #21262d;color:#8b949e;font-size:28px;font-weight:700;line-height:72px">${(name || '?')[0].toUpperCase()}</div>`
      }

      <p style="margin:20px 0 4px;font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.3px">Welcome aboard, ${escHtml(name)}!</p>
      <p style="margin:0 0 28px;font-size:15px;color:#b0b8c4;line-height:1.6">
        Your LixBlogs account is ready. Here's what you can do next.
      </p>

      <!-- Features -->
      ${feature('Write your first blog', 'Block editor with AI, images, code blocks, and more.')}
      ${feature('Create an organization', 'Invite your team, create collections, publish together.')}
      ${feature('Complete your profile', 'Add a bio, location, links, and pronouns.')}

      ${buttonRow(
        { text: 'Start Writing', href: 'https://blogs.elixpo.com/new-blog' },
        { text: 'Visit Profile', href: `https://blogs.elixpo.com/${username}` },
      )}

      ${muted(`Your profile: <a href="https://blogs.elixpo.com/${escHtml(username)}" style="color:#b49aff;text-decoration:none">blogs.elixpo.com/${escHtml(username)}</a>`)}
    </div>
  `;

  return {
    subject,
    html: baseLayout({ title: subject, body, preheader: `Your LixBlogs account is ready. Start writing!` }),
  };
}

function feature(title, desc) {
  return `
    <div style="display:inline-block;text-align:left;width:100%;max-width:400px;background-color:#161b22;border:1px solid #21262d;border-radius:8px;padding:14px 18px;margin-bottom:10px">
      <p style="margin:0;font-size:14px;font-weight:600;color:#e0e6ed">${title}</p>
      <p style="margin:4px 0 0;font-size:12px;color:#8b949e;line-height:1.5">${desc}</p>
    </div><br/>`;
}
