export const runtime = 'edge';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getSession } from '../../../../lib/auth';
import { getDB } from '../../../../lib/cloudflare';
import {
  canManageContest,
  contestCoverUrl,
  contestRole,
  getContest,
  normalizeStringArray,
  recordContestAudit,
  serializeContest,
} from '../../../../lib/contests';

const editable = new Map([
  ['title', ['title', 160]], ['description', ['description', 1000]],
  ['problemStatement', ['problem_statement', 10000]], ['rules', ['rules', 20000]],
  ['theme', ['theme', 500]], ['templateContent', ['template_content', 50000]],
]);

function asEpoch(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.floor(value);
  const parsed = Date.parse(String(value || ''));
  return Number.isFinite(parsed) ? Math.floor(parsed / 1000) : 0;
}

export async function GET(_request, { params }) {
  const { slug } = await params;
  const session = await getSession().catch(() => null);
  try {
    const db = getDB();
    const contest = await getContest(db, slug);
    if (!contest) return NextResponse.json({ error: 'Contest not found' }, { status: 404 });
    const role = await contestRole(db, contest, session?.userId);
    if (contest.status === 'draft' && !role) return NextResponse.json({ error: 'Contest not found' }, { status: 404 });
    const [members, audit] = role ? await Promise.all([
      db.prepare(`SELECT cm.user_id, cm.role, cm.created_at, u.username, u.display_name, u.avatar_url
        FROM contest_members cm JOIN users u ON u.id = cm.user_id
        WHERE cm.contest_id = ? ORDER BY cm.role, cm.created_at`).bind(contest.id).all(),
      canManageContest(role) ? db.prepare(`SELECT a.*, u.username FROM contest_audit_log a
        JOIN users u ON u.id = a.actor_id WHERE a.contest_id = ? ORDER BY a.created_at DESC LIMIT 100`).bind(contest.id).all() : null,
    ]) : [{ results: [] }, null];
    return NextResponse.json({
      contest: serializeContest(contest, { role }),
      members: members?.results || [],
      audit: audit?.results || [],
    });
  } catch (error) {
    console.error('[contest] load failed:', error?.message || error);
    return NextResponse.json({ error: 'Contest could not be loaded' }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  const { slug } = await params;
  const session = await getSession();
  if (!session?.userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  let input;
  try { input = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  try {
    const db = getDB();
    const contest = await getContest(db, slug);
    const role = await contestRole(db, contest, session.userId);
    if (!contest || !canManageContest(role)) return NextResponse.json({ error: 'Contest not found' }, { status: 404 });

    if (input.action) {
      if (input.action === 'publish') {
        if (!contest.problem_statement || !contest.rules) return NextResponse.json({ error: 'Problem statement and rules are required before publishing' }, { status: 400 });
        if (!['draft', 'scheduled'].includes(contest.status)) return NextResponse.json({ error: 'Contest cannot be published from its current state' }, { status: 409 });
        await db.prepare("UPDATE contests SET status = 'scheduled', published_at = COALESCE(published_at, unixepoch()), updated_at = unixepoch() WHERE id = ?").bind(contest.id).run();
        await recordContestAudit(db, { contestId: contest.id, actorId: session.userId, action: 'contest.published' });
        return NextResponse.json({ ok: true, status: 'scheduled' });
      }
      if (input.action === 'cancel') {
        if (contest.status === 'completed') return NextResponse.json({ error: 'A completed contest cannot be cancelled' }, { status: 409 });
        await db.prepare("UPDATE contests SET status = 'cancelled', updated_at = unixepoch() WHERE id = ?").bind(contest.id).run();
        await recordContestAudit(db, { contestId: contest.id, actorId: session.userId, action: 'contest.cancelled' });
        return NextResponse.json({ ok: true, status: 'cancelled' });
      }
      return NextResponse.json({ error: 'Unknown contest action' }, { status: 400 });
    }

    const now = Math.floor(Date.now() / 1000);
    const hasSubmissions = Boolean(await db.prepare('SELECT 1 FROM contest_submissions WHERE contest_id = ? LIMIT 1').bind(contest.id).first());
    const datesLocked = hasSubmissions || now >= Number(contest.starts_at);
    const changes = [];
    const values = [];
    for (const [key, [column, max]] of editable) {
      if (input[key] !== undefined) {
        changes.push(`${column} = ?`);
        values.push(String(input[key] || '').trim().slice(0, max));
      }
    }
    if (input.coverUrl !== undefined) {
      let value;
      try { value = contestCoverUrl(input.coverUrl); } catch { return NextResponse.json({ error: 'Cover URL must use HTTPS' }, { status: 400 }); }
      changes.push('cover_url = ?'); values.push(value);
    }
    if (input.requiredTopics !== undefined) { changes.push('required_topics = ?'); values.push(JSON.stringify(normalizeStringArray(input.requiredTopics))); }
    if (input.allowedTargets !== undefined) { changes.push('allowed_targets = ?'); values.push(JSON.stringify(normalizeStringArray(input.allowedTargets))); }
    if (input.eligibility !== undefined) { changes.push('eligibility = ?'); values.push(JSON.stringify(input.eligibility || {})); }
    if (input.perAuthorLimit !== undefined) { changes.push('per_author_limit = ?'); values.push(Math.min(10, Math.max(1, Number(input.perAuthorLimit || 1)))); }
    if (['startsAt', 'submissionsCloseAt', 'judgingClosesAt', 'resultsAt'].some((key) => input[key] !== undefined)) {
      if (datesLocked) return NextResponse.json({ error: 'Contest dates are locked after opening or receiving a submission' }, { status: 409 });
      const dates = {
        startsAt: input.startsAt ?? contest.starts_at,
        submissionsCloseAt: input.submissionsCloseAt ?? contest.submissions_close_at,
        judgingClosesAt: input.judgingClosesAt ?? contest.judging_closes_at,
        resultsAt: input.resultsAt ?? contest.results_at,
      };
      for (const key of Object.keys(dates)) dates[key] = dates[key] ? asEpoch(dates[key]) : null;
      if (!(dates.startsAt < dates.submissionsCloseAt && dates.submissionsCloseAt <= dates.judgingClosesAt)) return NextResponse.json({ error: 'Invalid contest date order' }, { status: 400 });
      changes.push('starts_at = ?', 'submissions_close_at = ?', 'judging_closes_at = ?', 'results_at = ?');
      values.push(dates.startsAt, dates.submissionsCloseAt, dates.judgingClosesAt, dates.resultsAt);
    }
    if (!changes.length) return NextResponse.json({ error: 'No changes supplied' }, { status: 400 });
    await db.prepare(`UPDATE contests SET ${changes.join(', ')}, updated_at = unixepoch() WHERE id = ?`).bind(...values, contest.id).run();
    await recordContestAudit(db, { contestId: contest.id, actorId: session.userId, action: 'contest.updated', metadata: { fields: [...editable.keys()].filter((key) => input[key] !== undefined) } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[contest] update failed:', error?.message || error);
    return NextResponse.json({ error: 'Contest could not be updated' }, { status: 500 });
  }
}
