import Link from 'next/link';
import { notFound } from 'next/navigation';
import AppShell from '../../../src/components/AppShell';
import ContestControls from '../../../src/components/contests/ContestControls';
import { getSession } from '../../../lib/auth';
import { getDB } from '../../../lib/cloudflare';
import {
  CONTEST_SUBMISSION_SELECT,
  contestRole,
  getContest,
  serializeContest,
  serializeSubmission,
} from '../../../lib/contests';
import { safeJsonLd } from '../../../src/utils/seoContent';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';
const SITE_URL = 'https://blogs.elixpo.com';

export async function generateMetadata({ params }) {
  const { slug } = await params;
  try {
    const contest = await getContest(getDB(), slug);
    if (!contest || contest.status === 'draft') return { title: 'Contest not found', robots: { index: false, follow: false } };
    const description = (contest.description || contest.problem_statement || '').slice(0, 160);
    return {
      title: contest.title,
      description,
      alternates: { canonical: `${SITE_URL}/contests/${contest.slug}` },
      openGraph: { type: 'website', title: contest.title, description, url: `${SITE_URL}/contests/${contest.slug}`, images: contest.cover_url ? [contest.cover_url] : ['/og-image.jpg'] },
      twitter: { card: 'summary_large_image', title: contest.title, description, images: contest.cover_url ? [contest.cover_url] : ['/og-image.jpg'] },
      robots: { index: true, follow: true },
    };
  } catch { return { title: 'Writing contest' }; }
}

function date(value) {
  return value ? new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }).format(new Date(value * 1000)) : 'Not set';
}

export default async function ContestPage({ params }) {
  const { slug } = await params;
  const db = getDB();
  const session = await getSession().catch(() => null);
  const contestRow = await getContest(db, slug);
  if (!contestRow) notFound();
  const role = await contestRole(db, contestRow, session?.userId);
  if (contestRow.status === 'draft' && !role) notFound();
  const [submissionRows, memberRows] = await Promise.all([
    db.prepare(`${CONTEST_SUBMISSION_SELECT} WHERE s.contest_id = ? AND s.withdrawn_at IS NULL
      ORDER BY CASE a.placement WHEN 'winner' THEN 0 WHEN 'runner-up' THEN 1 WHEN 'honorable-mention' THEN 2 ELSE 3 END,
      a.position, s.submitted_at DESC`).bind(contestRow.id).all(),
    role ? db.prepare(`SELECT cm.user_id, cm.role, u.username, u.display_name
      FROM contest_members cm JOIN users u ON u.id = cm.user_id WHERE cm.contest_id = ? ORDER BY cm.role`).bind(contestRow.id).all() : Promise.resolve({ results: [] }),
  ]);
  const contest = serializeContest(contestRow, { role });
  const submissions = (submissionRows?.results || []).map((row) => serializeSubmission(row));
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'Event', name: contest.title,
    description: contest.description || contest.problemStatement,
    startDate: new Date(contest.startsAt * 1000).toISOString(),
    endDate: new Date(contest.judgingClosesAt * 1000).toISOString(),
    eventStatus: contest.status === 'cancelled' ? 'https://schema.org/EventCancelled' : 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OnlineEventAttendanceMode',
    location: { '@type': 'VirtualLocation', url: `${SITE_URL}/contests/${contest.slug}` },
    organizer: { '@type': 'Person', name: contest.organizer.displayName, url: `${SITE_URL}/${contest.organizer.username}` },
    image: contest.coverUrl || `${SITE_URL}/og-image.jpg`,
  };
  return (
    <AppShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
      <main className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-8">
        <Link href="/contests" className="text-sm font-semibold text-[var(--text-muted)] hover:text-[var(--accent)]">← All contests</Link>
        {contest.coverUrl && <img src={contest.coverUrl} alt="" className="mt-6 max-h-80 w-full rounded-3xl object-cover" />}
        <header className="border-b border-[var(--divider)] py-8">
          <div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-[var(--accent-subtle)] px-3 py-1 text-[10px] font-bold uppercase text-[var(--accent)]">{contest.status}</span>{contest.theme && <span className="text-xs text-[var(--text-faint)]">{contest.theme}</span>}</div>
          <h1 className="mt-4 max-w-4xl font-serif text-4xl font-extrabold leading-tight text-[var(--text-primary)] sm:text-5xl">{contest.title}</h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--text-muted)]">{contest.description}</p>
          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs text-[var(--text-faint)]">
            <Link href={`/${contest.organizer.username}`} className="font-semibold hover:text-[var(--accent)]">Organized by @{contest.organizer.username}</Link>
            <span>Starts {date(contest.startsAt)} UTC</span><span>Entries close {date(contest.submissionsCloseAt)} UTC</span><span>Judging ends {date(contest.judgingClosesAt)} UTC</span>
          </div>
        </header>
        <div className="grid gap-8 py-8 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="space-y-8">
            <section><h2 className="font-serif text-2xl font-bold text-[var(--text-primary)]">Problem statement</h2><div className="mt-3 whitespace-pre-wrap text-[15px] leading-7 text-[var(--text-secondary)]">{contest.problemStatement}</div></section>
            <section><h2 className="font-serif text-2xl font-bold text-[var(--text-primary)]">Rules</h2><div className="mt-3 whitespace-pre-wrap text-[15px] leading-7 text-[var(--text-secondary)]">{contest.rules}</div></section>
            {contest.templateContent && <section className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5"><h2 className="font-bold text-[var(--text-primary)]">Writing template</h2><pre className="mt-3 overflow-auto whitespace-pre-wrap text-xs leading-6 text-[var(--text-muted)]">{contest.templateContent}</pre></section>}
          </div>
          <aside><ContestControls contest={contest} members={memberRows?.results || []} submissions={submissions} signedIn={Boolean(session?.userId)} /></aside>
        </div>
        <section className="border-t border-[var(--divider)] py-9">
          <div className="flex items-end justify-between gap-4"><div><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--accent)]">Submission gallery</p><h2 className="mt-2 font-serif text-3xl font-extrabold text-[var(--text-primary)]">{contest.status === 'completed' ? 'Results and entries' : 'Published entries'}</h2></div><span className="text-sm text-[var(--text-faint)]">{submissions.length} entries</span></div>
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            {submissions.map((submission) => <article key={submission.id} className="overflow-hidden rounded-2xl border border-[var(--border-default)] bg-[var(--card-bg)]">
              {submission.coverUrl && <img src={submission.coverUrl} alt="" className="h-36 w-full object-cover" />}
              <div className="p-5">{submission.placement && <span className="rounded-full bg-amber-400/15 px-2.5 py-1 text-[10px] font-bold uppercase text-amber-600">{submission.placement}{submission.position > 1 ? ` ${submission.position}` : ''}</span>}<h3 className="mt-2 font-serif text-xl font-bold text-[var(--text-primary)]"><Link href={submission.canonicalUrl || '#'}>{submission.title}</Link></h3><p className="mt-2 line-clamp-2 text-sm leading-6 text-[var(--text-muted)]">{submission.subtitle || submission.excerpt}</p><p className="mt-4 text-xs text-[var(--text-faint)]">By <Link href={`/${submission.author.username}`} className="font-semibold">@{submission.author.username}</Link> · Frozen at submission · {submission.license}</p></div>
            </article>)}
            {!submissions.length && <p className="col-span-full rounded-2xl border border-dashed border-[var(--border-default)] p-10 text-center text-sm text-[var(--text-muted)]">No entries have been submitted yet.</p>}
          </div>
        </section>
      </main>
    </AppShell>
  );
}
