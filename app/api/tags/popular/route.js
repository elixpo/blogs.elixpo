export const runtime = 'edge';
import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const parsed = Number(searchParams.get('limit') || '30');
  const limit = Number.isInteger(parsed) && parsed >= 1 && parsed <= 50 ? parsed : 30;

  try {
    const { kvCache } = await import('../../../../lib/cache');
    const data = await kvCache(`v1:tags:popular:v2:${limit}`, 900, async () => {
      const { getDB } = await import('../../../../lib/cloudflare');
      const db = getDB();
      // Only count tags on posts a signed-out reader can open. Drafts, trash,
      // secret posts, and paywalled posts must not shape the public tag cloud.
      const result = await db.prepare(`
        SELECT bt.tag, COUNT(*) as count
        FROM blog_tags bt JOIN blogs b ON b.id = bt.blog_id
        WHERE b.status IN ('published', 'unlisted')
          AND b.secret = 0
          AND b.deleted_at IS NULL
          AND COALESCE(b.member_only, 0) = 0
        GROUP BY bt.tag ORDER BY count DESC LIMIT ?
      `).bind(limit).all();
      return { tags: result?.results || [] };
    });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ tags: [] });
  }
}
