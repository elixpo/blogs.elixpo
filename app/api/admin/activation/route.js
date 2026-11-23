export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { getSession } from '../../../../../lib/auth';
import { activationConversion } from '../../../../../lib/activation';

export async function GET(request) {
  const session = await getSession();
  if (!session?.userId || !session.profile?.isAdmin) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }

  const now = Math.floor(Date.now() / 1000);
  const rangeParam = new URL(request.url).searchParams.get('days');
  const days = Number.parseInt(rangeParam || '30', 10);
  if (!Number.isInteger(days) || days < 1 || days > 365) {
    return NextResponse.json({ error: 'Invalid range' }, { status: 400 });
  }

  try {
    const { getDB } = await import('../../../../../lib/cloudflare');
    const db = getDB();
    const rows = await db.prepare(`
      SELECT milestone, COUNT(*) AS count
      FROM activation_events
      WHERE occurred_at >= ?
      GROUP BY milestone
    `).bind(now - days * 86400).all();
    const counts = {};
    for (const row of rows?.results || []) counts[row.milestone] = Number(row.count);
    return NextResponse.json({ rangeDays: days, funnel: activationConversion(counts) });
  } catch (error) {
    console.error('[activation] funnel query failed:', error?.message || error);
    return NextResponse.json({ error: 'Activation metrics unavailable' }, { status: 503 });
  }
}
