import { baseLayout, muted, escHtml } from './base.js';

/**
 * Org invite email — clean, professional, fully center-aligned.
 *
 * @param {object} data
 * @param {string} data.orgName            - Organization name
 * @param {string} data.orgSlug            - Org slug
 * @param {string} [data.orgLogoUrl]       - Org logo URL
 * @param {string} data.inviterName        - Who is inviting
 * @param {string} [data.inviterAvatar]    - Inviter avatar URL
 * @param {string} data.recipientName      - Who is being invited
 * @param {string} [data.recipientAvatar]  - Recipient avatar URL
 * @param {string} data.role               - admin | maintain | write | read
 * @param {string} data.inviteUrl          - Accept URL
 * @param {string} [data.declineUrl]       - Decline URL
 * @returns {{ subject: string, html: string }}
 */
export function orgInvite(data) {
  const {
    orgName, orgSlug, orgLogoUrl,
    inviterName, inviterAvatar,
    recipientName, recipientAvatar,
    role, inviteUrl, declineUrl,
  } = data;

  const roleLabels = { admin: 'Admin', maintain: 'Maintainer', write: 'Writer', read: 'Reader' };
  const roleLabel = roleLabels[role] || role;

  const subject = `${inviterName} invited you to join ${orgName}`;

  const body = `
    <div style="text-align:center">

      <!-- Avatars -->
      ${circleAvatar(recipientAvatar, recipientName, 68)}
      <div style="margin:8px 0;font-size:22px;color:#8b949e;font-weight:300">+</div>
      ${squareAvatar(orgLogoUrl, orgName, 68)}

      <!-- Headline -->
      <p style="margin:28px 0 6px;font-size:18px;font-weight:700;color:#ffffff">
        @${escHtml(inviterName)} invited you to collaborate
      </p>
      <p style="margin:0 0 28px;font-size:14px;color:#8b949e">
        You've been invited to join <strong style="color:#d1d5db">${escHtml(orgName)}</strong> as <strong style="color:#d1d5db">${escHtml(roleLabel)}</strong>
      </p>

      <!-- Buttons -->
      <div style="margin-bottom:32px">
        <a href="${escHtml(inviteUrl)}" style="display:inline-block;background-color:#9b7bf7;border-radius:8px;padding:11px 28px;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none">Accept invitation</a>
        &nbsp;&nbsp;
        <a href="${escHtml(declineUrl || inviteUrl)}" style="display:inline-block;border:1px solid #30363d;border-radius:8px;padding:11px 28px;background-color:#161b22;color:#d1d5db;font-size:14px;font-weight:600;text-decoration:none">Decline</a>
      </div>

      <!-- Divider -->
      <div style="height:1px;background-color:#21262d;margin-bottom:20px"></div>

      <!-- Permissions -->
      <p style="margin:0 0 8px;font-size:12px;color:#8b949e">
        By accepting, <strong style="color:#8b949e">${escHtml(orgName)}</strong> members will be able to:
      </p>
      <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.8">
        See your public profile information<br/>
        See your published blogs within the organization<br/>
        Assign you the ${escHtml(roleLabel)} role and its permissions
      </p>

      ${muted(`If you don't recognize this invitation, you can safely ignore this email.`)}
    </div>
  `;

  return {
    subject,
    html: baseLayout({ title: subject, body, preheader: `@${inviterName} invited you to join ${orgName}` }),
  };
}

function circleAvatar(url, name, size) {
  if (url) {
    return `<img src="${escHtml(url)}" alt="${escHtml(name)}" width="${size}" height="${size}" style="display:inline-block;border-radius:50%;border:2px solid #21262d;object-fit:cover" />`;
  }
  const initial = (name || '?')[0].toUpperCase();
  return `<div style="display:inline-block;width:${size}px;height:${size}px;border-radius:50%;background-color:#1c2129;border:2px solid #21262d;color:#8b949e;font-size:${Math.round(size * 0.36)}px;font-weight:700;line-height:${size}px;text-align:center">${initial}</div>`;
}

function squareAvatar(url, name, size) {
  if (url) {
    return `<img src="${escHtml(url)}" alt="${escHtml(name)}" width="${size}" height="${size}" style="display:inline-block;border-radius:14px;border:2px solid #21262d;object-fit:cover" />`;
  }
  const initial = (name || '?')[0].toUpperCase();
  return `<div style="display:inline-block;width:${size}px;height:${size}px;border-radius:14px;background-color:#1c2129;border:2px solid #21262d;color:#8b949e;font-size:${Math.round(size * 0.36)}px;font-weight:700;line-height:${size}px;text-align:center">${initial}</div>`;
}
