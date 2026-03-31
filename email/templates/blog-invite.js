import { baseLayout, muted, escHtml } from './base.js';

/**
 * Blog collaboration invite — clean, professional, fully center-aligned.
 *
 * @param {object} data
 * @param {string} data.blogTitle          - Blog title
 * @param {string} [data.blogEmoji]        - Page emoji
 * @param {string} data.inviterName        - Who is inviting
 * @param {string} [data.inviterAvatar]    - Inviter avatar URL
 * @param {string} data.recipientName      - Who is being invited
 * @param {string} [data.recipientAvatar]  - Recipient avatar URL
 * @param {string} data.role               - viewer | editor | admin
 * @param {string} data.editUrl            - URL to the blog editor
 * @param {string} [data.declineUrl]       - Decline URL
 * @returns {{ subject: string, html: string }}
 */
export function blogInvite(data) {
  const {
    blogTitle, blogEmoji,
    inviterName, inviterAvatar,
    recipientName, recipientAvatar,
    role, editUrl, declineUrl,
  } = data;

  const roleLabels = { viewer: 'Viewer', editor: 'Editor', admin: 'Admin' };
  const roleLabel = roleLabels[role] || role;
  const displayTitle = blogEmoji ? `${blogEmoji} ${blogTitle}` : blogTitle;

  const subject = `${inviterName} invited you to collaborate on "${blogTitle}"`;

  const body = `
    <div style="text-align:center">

      <!-- Avatars -->
      ${circleAvatar(inviterAvatar, inviterName, 68)}
      <div style="margin:8px 0;font-size:22px;color:#7c8a9e;font-weight:300">+</div>
      ${circleAvatar(recipientAvatar, recipientName, 68)}

      <!-- Headline -->
      <p style="margin:28px 0 6px;font-size:18px;font-weight:700;color:#ffffff">
        @${escHtml(inviterName)} invited you to collaborate
      </p>
      <p style="margin:0 0 28px;font-size:14px;color:#8b949e">
        You've been invited as <strong style="color:#d1d5db">${escHtml(roleLabel)}</strong> on a blog post
      </p>

      <!-- Blog title -->
      <div style="display:inline-block;background-color:#161b22;border:1px solid #21262d;border-radius:8px;padding:10px 20px;margin-bottom:28px">
        <span style="font-size:15px;font-weight:700;color:#ffffff">${escHtml(displayTitle || 'Untitled')}</span>
        <span style="font-size:12px;color:#7c8a9e;margin-left:6px">by @${escHtml(inviterName)}</span>
      </div>

      <!-- Buttons -->
      <div style="margin-bottom:32px">
        <a href="${escHtml(editUrl)}" style="display:inline-block;background-color:#9b7bf7;border-radius:8px;padding:11px 28px;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none">Accept invitation</a>
        &nbsp;&nbsp;
        <a href="${escHtml(declineUrl || editUrl)}" style="display:inline-block;border:1px solid #30363d;border-radius:8px;padding:11px 28px;background-color:#161b22;color:#d1d5db;font-size:14px;font-weight:600;text-decoration:none">Decline</a>
      </div>

      <!-- Divider -->
      <div style="height:1px;background-color:#21262d;margin-bottom:20px"></div>

      <!-- Permissions -->
      <p style="margin:0 0 8px;font-size:12px;color:#7c8a9e">
        As <strong style="color:#8b949e">${escHtml(roleLabel)}</strong>, you will be able to:
      </p>
      <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.8">
        ${role === 'admin' ? 'Edit, publish, and manage blog settings<br/>' : ''}${role === 'editor' || role === 'admin' ? 'Edit the blog content<br/>' : ''}View the blog in the editor<br/>
        Be credited as a co-author on the published post
      </p>

      ${muted(`If you don't recognize this invitation, you can safely ignore this email.`)}
    </div>
  `;

  return {
    subject,
    html: baseLayout({ title: subject, body, preheader: `@${inviterName} invited you to collaborate on "${blogTitle}"` }),
  };
}

function circleAvatar(url, name, size) {
  if (url) {
    return `<img src="${escHtml(url)}" alt="${escHtml(name)}" width="${size}" height="${size}" style="display:inline-block;border-radius:50%;border:2px solid #21262d;object-fit:cover" />`;
  }
  const initial = (name || '?')[0].toUpperCase();
  return `<div style="display:inline-block;width:${size}px;height:${size}px;border-radius:50%;background-color:#1c2129;border:2px solid #21262d;color:#7c8a9e;font-size:${Math.round(size * 0.36)}px;font-weight:700;line-height:${size}px;text-align:center">${initial}</div>`;
}
