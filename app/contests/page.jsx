import Link from 'next/link';
import AppShell from '../../src/components/AppShell';
import { getDB } from '../../lib/cloudflare';
import { serializeContest } from '../../lib/contests';
import { safeJsonLd } from '../../src/utils/seoContent';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Writing contests',
  description: 'Join time-bound writing contests on LixBlogs, publish your response, and explore recognized entries.',
  alternates: { canonical: 'https://blogs.elixpo.com/contests' },
  robots: { index: true, follow: true },
};

export default async function ContestsPage() {
  let contests = [];
  try {
    const rows = await getDB().prepare(`SELECT c.*, u.username AS organizer_username,
      u.display_name AS organizer_name, u.avatar_url AS organizer_avatar,
      (SELECT COUNT(*) FROM contest_submissions s WHERE s.contest_id = c.id AND s.withdrawn_at IS NULL) AS submission_count
      FROM contests c JOIN users u ON u.id = c.organizer_id
      WHERE c.status != 'draft' ORDER BY c.starts_at DESC LIMIT 100`).all();
    contests = (rows?.results || []).map((row) => serializeContest(row));
  } catch {}
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'CollectionPage',
    name: 'LixBlogs writing contests', url: 'https://blogs.elixpo.com/contests',
    mainEntity: { '@type': 'ItemList', itemListElement: contests.map((contest, index) => ({
      '@type': 'ListItem', position: index + 1, name: contest.title,
      url: `https://blogs.elixpo.com/contests/${contest.slug}`,
    })) },
  };
  return (
    <AppShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
      <main className="mx-auto w-full max-w-5xl px-5 py-10 sm:px-8">
        <header className="flex flex-wrap items-end justify-between gap-5 border-b border-[var(--divider)] pb-8">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--accent)]">Write with a prompt</p>
            <h1 className="mt-2 font-serif text-4xl font-extrabold text-[var(--text-primary)]">Writing contests</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-muted)]">Time-bound themes, immutable submissions, and results selected by named organizers and judges.</p>
          </div>
          <Link href="/contests/new" className="rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm font-bold text-white">Create a contest</Link>
        </header>
        <section className="grid gap-5 py-8 md:grid-cols-2" aria-label="Contests">
          {contests.map((contest) => (
            <Link key={contest.id} href={`/contests/${contest.slug}`} className="group overflow-hidden rounded-2xl border border-[var(--border-default)] bg-[var(--card-bg)] transition hover:-translate-y-0.5 hover:shadow-lg">
              {contest.coverUrl ? <img src={contest.coverUrl} alt="" className="h-40 w-full object-cover" /> : <div className="h-28 bg-gradient-to-br from-violet-500/25 via-[var(--bg-surface)] to-amber-400/20" />}
              <div className="p-5">
                <div className="flex items-center justify-between gap-3"><span className="rounded-full bg-[var(--accent-subtle)] px-2.5 py-1 text-[10px] font-bold uppercase text-[var(--accent)]">{contest.status}</span><span className="text-xs text-[var(--text-faint)]">{contest.submissionCount} entries</span></div>
                <h2 className="mt-3 font-serif text-xl font-bold text-[var(--text-primary)] group-hover:text-[var(--accent)]">{contest.title}</h2>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-[var(--text-muted)]">{contest.description || contest.problemStatement}</p>
                <p className="mt-4 text-xs text-[var(--text-faint)]">By @{contest.organizer.username}</p>
              </div>
            </Link>
          ))}
          {!contests.length && <div className="col-span-full rounded-2xl border border-dashed border-[var(--border-default)] p-12 text-center text-sm text-[var(--text-muted)]">No published contests yet.</div>}
        </section>
      </main>
    </AppShell>
  );
}
