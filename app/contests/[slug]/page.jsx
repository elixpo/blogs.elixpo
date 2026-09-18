import Link from 'next/link';
import { notFound } from 'next/navigation';
import AppShell from '../../../src/components/AppShell';
import ContestControls from '../../../src/components/contests/ContestControls';
import ContestMarkdown from '../../../src/components/contests/ContestMarkdown';
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

export default async function ContestPage({ params, searchParams }) {
  const { slug } = await params;
  const requestedTab = String((await searchParams)?.tab || 'overview');
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
  const availableTabs = ['overview', 'entries', ...(role ? ['manage'] : [])];
  const activeTab = availableTabs.includes(requestedTab) ? requestedTab : 'overview';
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
      <main className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8">
        <Link href="/contests" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--text-muted)] hover:text-[var(--accent)]"><span aria-hidden="true">←</span> All contests</Link>
        {activeTab === 'overview' ? <article className="mt-6 overflow-hidden rounded-3xl border border-[var(--border-default)] bg-[var(--card-bg)] shadow-sm">
          <div className="relative overflow-hidden bg-[radial-gradient(circle_at_20%_20%,rgba(139,92,246,0.42),transparent_34%),linear-gradient(135deg,var(--bg-surface),var(--card-bg))]">
            {contest.coverUrl ? <img src={contest.coverUrl} alt="" className="h-56 w-full object-cover sm:h-72" /> : <div className="h-52 sm:h-64" />}
            <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/55 to-transparent" />
            <div className="absolute bottom-5 left-5 flex flex-wrap items-center gap-2 sm:left-7"><span className="rounded-full bg-white/95 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--accent)] shadow-sm">{contest.status}</span>{contest.theme && <span className="rounded-full bg-black/45 px-3 py-1 text-xs font-semibold text-white backdrop-blur">{contest.theme}</span>}</div>
          </div>
          <div className="p-6 sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-6"><div className="min-w-0 max-w-3xl"><div className="flex flex-wrap gap-2">{contest.tags.map((tag) => <span key={tag} className="rounded-full bg-[var(--accent-subtle)] px-3 py-1 text-[11px] font-semibold text-[var(--accent)]">#{tag}</span>)}</div><h1 className="mt-4 font-serif text-4xl font-extrabold leading-tight text-[var(--text-primary)] sm:text-5xl">{contest.title}</h1><p className="mt-4 text-base leading-7 text-[var(--text-muted)]">{contest.description}</p></div><div className="flex shrink-0 gap-2">{contest.status === 'live' && <a href="#enter-contest" className="rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm font-bold text-white">Enter contest</a>}<Link href={`/contests/${contest.slug}?tab=entries`} className="rounded-full border border-[var(--border-default)] px-5 py-2.5 text-sm font-bold text-[var(--text-secondary)]">View entries</Link></div></div>
            <div className="mt-7 flex flex-wrap items-center justify-between gap-5 border-t border-[var(--divider)] pt-6"><Link href={`/${contest.organizer.username}`} className="group flex items-center gap-3">{contest.organizer.avatarUrl ? <img src={contest.organizer.avatarUrl} alt="" className="h-12 w-12 rounded-full object-cover ring-2 ring-[var(--accent-subtle)]" /> : <span className="grid h-12 w-12 place-items-center rounded-full bg-[var(--accent-subtle)] font-bold text-[var(--accent)]">{String(contest.organizer.displayName || contest.organizer.username || '?').slice(0, 1).toUpperCase()}</span>}<span><span className="block text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-faint)]">Hosted by</span><span className="mt-0.5 block text-sm font-bold text-[var(--text-primary)] group-hover:text-[var(--accent)]">{contest.organizer.displayName || contest.organizer.username}</span><span className="block text-xs text-[var(--text-faint)]">@{contest.organizer.username}</span></span></Link><div className="grid grid-cols-2 gap-x-8 gap-y-2 text-xs sm:grid-cols-3"><div><span className="block text-[10px] font-bold uppercase text-[var(--text-faint)]">Opens</span><span className="mt-1 block font-semibold text-[var(--text-secondary)]">{date(contest.startsAt)} UTC</span></div><div><span className="block text-[10px] font-bold uppercase text-[var(--text-faint)]">Entries close</span><span className="mt-1 block font-semibold text-[var(--text-secondary)]">{date(contest.submissionsCloseAt)} UTC</span></div><div className="col-span-2 sm:col-span-1"><span className="block text-[10px] font-bold uppercase text-[var(--text-faint)]">Judging ends</span><span className="mt-1 block font-semibold text-[var(--text-secondary)]">{date(contest.judgingClosesAt)} UTC</span></div></div></div>
          </div>
        </article> : <header className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[var(--border-default)] bg-[var(--card-bg)] px-5 py-4"><div className="min-w-0"><div className="flex items-center gap-2"><span className="rounded-full bg-[var(--accent-subtle)] px-2.5 py-1 text-[9px] font-bold uppercase text-[var(--accent)]">{contest.status}</span><span className="text-xs text-[var(--text-faint)]">Contest</span></div><h1 className="mt-2 truncate font-serif text-2xl font-extrabold text-[var(--text-primary)]">{contest.title}</h1></div><Link href={`/contests/${contest.slug}?tab=overview`} className="rounded-full border border-[var(--border-default)] px-4 py-2 text-xs font-bold text-[var(--text-secondary)]">View overview</Link></header>}
        <nav aria-label="Contest sections" className="mt-6 flex gap-1 overflow-x-auto rounded-2xl border border-[var(--border-default)] bg-[var(--card-bg)] p-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"><Link href={`/contests/${contest.slug}?tab=overview`} scroll={false} aria-current={activeTab === 'overview' ? 'page' : undefined} className={`shrink-0 rounded-xl px-5 py-3 text-sm font-bold ${activeTab === 'overview' ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-muted)] hover:bg-[var(--bg-surface)]'}`}>Overview</Link><Link href={`/contests/${contest.slug}?tab=entries`} scroll={false} aria-current={activeTab === 'entries' ? 'page' : undefined} className={`shrink-0 rounded-xl px-5 py-3 text-sm font-bold ${activeTab === 'entries' ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-muted)] hover:bg-[var(--bg-surface)]'}`}>Entries <span className="ml-1 opacity-70">{submissions.length}</span></Link>{role && <Link href={`/contests/${contest.slug}?tab=manage`} scroll={false} aria-current={activeTab === 'manage' ? 'page' : undefined} className={`shrink-0 rounded-xl px-5 py-3 text-sm font-bold ${activeTab === 'manage' ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-muted)] hover:bg-[var(--bg-surface)]'}`}>Manage contest</Link>}</nav>
        {activeTab === 'overview' && <div className="space-y-8 py-8"><ContestControls compact contest={contest} members={memberRows?.results || []} submissions={submissions} signedIn={Boolean(session?.userId)} /><div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px]"><div className="space-y-6"><section id="problem" className="rounded-2xl border border-[var(--border-default)] bg-[var(--card-bg)] p-6 sm:p-8"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--accent)]">The challenge</p><h2 className="mt-2 font-serif text-3xl font-bold text-[var(--text-primary)]">Problem statement</h2><ContestMarkdown className="mt-5">{contest.problemStatement}</ContestMarkdown></section><section id="rules" className="rounded-2xl border border-[var(--border-default)] bg-[var(--card-bg)] p-6 sm:p-8"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--accent)]">Before submitting</p><h2 className="mt-2 font-serif text-3xl font-bold text-[var(--text-primary)]">Rules</h2><ContestMarkdown className="mt-5">{contest.rules}</ContestMarkdown></section>{contest.templateContent && <details id="template" className="rounded-2xl border border-[var(--border-default)] bg-[var(--card-bg)] p-6 sm:p-8" open><summary className="cursor-pointer font-serif text-2xl font-bold text-[var(--text-primary)]">Optional writing template</summary><ContestMarkdown className="mt-5">{contest.templateContent}</ContestMarkdown></details>}</div><aside className="space-y-4"><div className="sticky top-20 rounded-2xl border border-[var(--border-default)] bg-[var(--card-bg)] p-5"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--text-faint)]">Contest guide</p><nav className="mt-3 grid gap-1 text-sm"><a href="#enter-contest" className="rounded-lg px-3 py-2 font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]">Enter the contest</a><a href="#problem" className="rounded-lg px-3 py-2 font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]">Problem statement</a><a href="#rules" className="rounded-lg px-3 py-2 font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]">Rules</a>{contest.templateContent && <a href="#template" className="rounded-lg px-3 py-2 font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]">Writing template</a>}</nav><dl className="mt-5 grid gap-4 border-t border-[var(--divider)] pt-5 text-xs"><div><dt className="font-bold text-[var(--text-faint)]">Minimum account age</dt><dd className="mt-1 text-[var(--text-secondary)]">{contest.eligibility.minimumAccountAgeMonths || 0} months</dd></div><div><dt className="font-bold text-[var(--text-faint)]">Profile requirement</dt><dd className="mt-1 text-[var(--text-secondary)]">{contest.eligibility.requireBio ? 'Completed bio required' : 'No bio requirement'}</dd></div><div><dt className="font-bold text-[var(--text-faint)]">Current entries</dt><dd className="mt-1 text-[var(--text-secondary)]">{submissions.length}</dd></div></dl></div></aside></div></div>}
        {activeTab === 'manage' && role && <div className="py-8"><ContestControls contest={contest} members={memberRows?.results || []} submissions={submissions} signedIn={Boolean(session?.userId)} /></div>}
        {activeTab === 'entries' && <section className="py-9">
          <div className="flex items-end justify-between gap-4"><div><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--accent)]">Submission gallery</p><h2 className="mt-2 font-serif text-3xl font-extrabold text-[var(--text-primary)]">{contest.status === 'completed' ? 'Results and entries' : 'Published entries'}</h2></div><span className="text-sm text-[var(--text-faint)]">{submissions.length} entries</span></div>
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            {submissions.map((submission) => <article key={submission.id} className="overflow-hidden rounded-2xl border border-[var(--border-default)] bg-[var(--card-bg)]">
              {submission.coverUrl && <img src={submission.coverUrl} alt="" className="h-36 w-full object-cover" />}
              <div className="p-5">{submission.placement && <span className="rounded-full bg-amber-400/15 px-2.5 py-1 text-[10px] font-bold uppercase text-amber-600">{submission.placement}{submission.position > 1 ? ` ${submission.position}` : ''}</span>}<h3 className="mt-2 font-serif text-xl font-bold text-[var(--text-primary)]"><Link href={submission.canonicalUrl || '#'}>{submission.title}</Link></h3><p className="mt-2 line-clamp-2 text-sm leading-6 text-[var(--text-muted)]">{submission.subtitle || submission.excerpt}</p><p className="mt-4 text-xs text-[var(--text-faint)]">By <Link href={`/${submission.author.username}`} className="font-semibold">@{submission.author.username}</Link> · Frozen at submission · {submission.license}</p></div>
            </article>)}
            {!submissions.length && <p className="col-span-full rounded-2xl border border-dashed border-[var(--border-default)] p-10 text-center text-sm text-[var(--text-muted)]">No entries have been submitted yet.</p>}
          </div>
        </section>}
      </main>
    </AppShell>
  );
}
