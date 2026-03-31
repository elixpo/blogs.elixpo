import { baseLayout, ctaButton, muted, escHtml } from './base.js';

/**
 * Generic notification email — center-aligned, compact.
 *
 * Types: new_follower, new_comment, blog_published, blog_liked
 */
export function notification(data) {
  const { type, actorName, actorAvatar, blogTitle, comment, actionUrl } = data;

  const templates = {
    new_follower: {
      subject: `${actorName} started following you`,
      heading: 'New follower',
      message: `<strong style="color:#ffffff">${escHtml(actorName)}</strong> is now following you on LixBlogs.`,
      cta: 'View Profile',
    },
    new_comment: {
      subject: `${actorName} commented on "${blogTitle}"`,
      heading: 'New comment',
      message: `<strong style="color:#ffffff">${escHtml(actorName)}</strong> commented on <strong style="color:#ffffff">${escHtml(blogTitle)}</strong>.`,
      cta: 'View Comment',
    },
    blog_published: {
      subject: `${actorName} published "${blogTitle}"`,
      heading: 'New post',
      message: `<strong style="color:#ffffff">${escHtml(actorName)}</strong> published a new blog: <strong style="color:#ffffff">${escHtml(blogTitle)}</strong>.`,
      cta: 'Read Post',
    },
    blog_liked: {
      subject: `${actorName} liked "${blogTitle}"`,
      heading: 'New like',
      message: `<strong style="color:#ffffff">${escHtml(actorName)}</strong> liked your blog <strong style="color:#ffffff">${escHtml(blogTitle)}</strong>.`,
      cta: 'View Blog',
    },
  };

  const t = templates[type] || templates.new_follower;

  const body = `
    <div style="text-align:center">

      <!-- Actor avatar -->
      ${actorAvatar
        ? `<img src="${escHtml(actorAvatar)}" alt="" width="56" height="56" style="display:inline-block;border-radius:50%;border:2px solid #21262d;object-fit:cover" />`
        : `<div style="display:inline-block;width:56px;height:56px;border-radius:50%;background-color:#1c2129;border:2px solid #21262d;color:#8b949e;font-size:22px;font-weight:700;line-height:56px">${(actorName || '?')[0].toUpperCase()}</div>`
      }

      <!-- Heading -->
      <p style="margin:16px 0 4px;font-size:11px;font-weight:600;color:#8b949e;text-transform:uppercase;letter-spacing:1.2px">${t.heading}</p>
      <p style="margin:0 0 6px;font-size:16px;color:#c9d1d9;line-height:1.6">${t.message}</p>

      ${comment ? `
      <!-- Comment preview -->
      <div style="display:inline-block;text-align:left;max-width:400px;border-left:3px solid #9b7bf740;padding:10px 16px;background-color:#161b22;border-radius:0 8px 8px 0;margin:16px 0 4px">
        <p style="margin:0;font-size:13px;color:#c9d1d9;line-height:1.5;font-style:italic">&ldquo;${escHtml(comment)}&rdquo;</p>
      </div>
      ` : ''}

      ${ctaButton(t.cta, actionUrl)}

      ${muted('Manage notifications in <a href="https://blogs.elixpo.com/settings?tab=notifications" style="color:#b49aff;text-decoration:none">Settings</a>.')}
    </div>
  `;

  return {
    subject: t.subject,
    html: baseLayout({ title: t.subject, body, preheader: t.message.replace(/<[^>]*>/g, '') }),
  };
}
