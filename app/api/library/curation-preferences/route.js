export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { getSession } from '../../../../lib/auth';

export async function GET() {
  const session = await getSession();
  if (!session?.userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  try {
    const { getDB } = await import('../../../../lib/cloudflare');
    const row = await getDB().prepare(`
      SELECT allow_public_curation FROM curation_preferences WHERE user_id = ?
    `).bind(session.userId).first();
    return NextResponse.json({ allowPublicCuration: row?.allow_public_curation !== 0 });
  } catch {
    return NextResponse.json({ error: 'Curation preference could not be loaded' }, { status: 500 });
  }
}

export async function PATCH(request) {
  const session = await getSession();
  if (!session?.userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }); }
  if (typeof body?.allowPublicCuration !== 'boolean') {
    return NextResponse.json({ error: 'allowPublicCuration must be a boolean' }, { status: 400 });
  }
  try {
    const { getDB } = await import('../../../../lib/cloudflare');
    await getDB().prepare(`
      INSERT INTO curation_preferences (user_id, allow_public_curation, updated_at)
      VALUES (?, ?, unixepoch())
      ON CONFLICT(user_id) DO UPDATE SET
        allow_public_curation = excluded.allow_public_curation,
        updated_at = unixepoch()
    `).bind(session.userId, body.allowPublicCuration ? 1 : 0).run();
    return NextResponse.json({ ok: true, allowPublicCuration: body.allowPublicCuration });
  } catch {
    return NextResponse.json({ error: 'Curation preference could not be updated' }, { status: 500 });
  }
}
