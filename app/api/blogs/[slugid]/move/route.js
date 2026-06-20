export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { getSession } from '../../../../lib/auth';

export async function POST(request, { params }) {
  const { slugid } = await params;
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const { getDB } = await import('../../../../lib/cloudflare');
    const db = getDB();

    const blog = await db.prepare('SELECT id, author_id, published_as, slug, title, status FROM blogs WHERE id = ?').bind(slugid).first();
    if (!blog) {
      return NextResponse.json({ error: 'Blog not found' }, { status: 404 });
    }

    // Only the primary author can move/revert the blog
    if (blog.author_id !== session.userId) {
      return NextResponse.json({ error: 'Only the author can move this blog' }, { status: 403 });
    }

    const { publishAs } = await request.json();

    let targetPublishAs = 'personal';
    let targetCollectionId = null;

    if (publishAs && publishAs !== 'personal') {
      if (!publishAs.startsWith('org:')) {
        return NextResponse.json({ error: 'Invalid owner' }, { status: 400 });
      }
      const orgId = publishAs.slice(4);
      // Check if user is member of organization and has write access (admin, maintain, write)
      const member = await db.prepare(
        "SELECT role FROM org_members WHERE org_id = ? AND user_id = ?"
      ).bind(orgId, session.userId).first();

      if (!member || !['admin', 'maintain', 'write'].includes(member.role)) {
        return NextResponse.json({ error: 'You do not have permission to publish under this organization' }, { status: 403 });
      }

      targetPublishAs = `org:${orgId}`;
    }

    // If changing published_as, ensure the slug doesn't collide in the target namespace/owner scope
    const { ensureUniqueBlogSlug } = await import('../../../../lib/namespace');
    const slugScope = {
      authorId: session.userId,
      publishAs: targetPublishAs,
    };
    const finalSlug = await ensureUniqueBlogSlug(db, blog.slug, blog.id, slugScope);

    const now = Math.floor(Date.now() / 1000);

    // Update in database
    await db.prepare(
      'UPDATE blogs SET published_as = ?, collection_id = ?, slug = ?, updated_at = ? WHERE id = ?'
    ).bind(targetPublishAs, targetCollectionId, finalSlug, now, blog.id).run();

    // Fetch new owner info for frontend
    let ownerName = session.username;
    let ownerAvatar = null;
    if (targetPublishAs.startsWith('org:')) {
      const org = await db.prepare('SELECT name, logo_r2_key, slug FROM orgs WHERE id = ?')
        .bind(targetPublishAs.slice(4)).first();
      if (org) {
        ownerName = org.name;
        ownerAvatar = org.logo_r2_key;
      }
    }

    return NextResponse.json({
      ok: true,
      published_as: targetPublishAs,
      slug: finalSlug,
      ownerName,
      ownerAvatar,
    });
  } catch (e) {
    console.error('Failed to move blog:', e?.message || e);
    return NextResponse.json({ error: 'Failed to move blog' }, { status: 500 });
  }
}
