'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

const field = 'w-full rounded-xl border border-[var(--border-default)] bg-[var(--input-bg)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]';

export default function ContestCreateForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('');
    const data = new FormData(event.currentTarget);
    const body = Object.fromEntries(data.entries());
    body.requiredTopics = String(body.requiredTopics || '').split(',').map((item) => item.trim()).filter(Boolean);
    body.allowedTargets = String(body.allowedTargets || 'personal').split(',').map((item) => item.trim()).filter(Boolean);
    body.eligibility = {
      minimumAccountAgeDays: Math.max(0, Number(body.minimumAccountAgeDays || 0)),
      requireBio: body.requireBio === 'on',
    };
    delete body.minimumAccountAgeDays; delete body.requireBio;
    const response = await fetch('/api/contests', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const result = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) return setError(result.error || 'Contest could not be created');
    router.push(`/contests/${result.slug}`);
  }
  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-10 sm:px-8">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--accent)]">Organizer workspace</p>
      <h1 className="mt-2 font-serif text-4xl font-extrabold text-[var(--text-primary)]">Create a contest</h1>
      <p className="mt-3 text-sm text-[var(--text-muted)]">The contest stays private until you publish it.</p>
      <form onSubmit={submit} className="mt-8 grid gap-5 rounded-2xl border border-[var(--border-default)] bg-[var(--card-bg)] p-6">
        <label className="grid gap-2 text-xs font-bold text-[var(--text-secondary)]">Title<input name="title" required maxLength={160} className={field} /></label>
        <label className="grid gap-2 text-xs font-bold text-[var(--text-secondary)]">Description<textarea name="description" rows={3} className={field} /></label>
        <label className="grid gap-2 text-xs font-bold text-[var(--text-secondary)]">Theme<input name="theme" className={field} /></label>
        <label className="grid gap-2 text-xs font-bold text-[var(--text-secondary)]">Problem statement<textarea name="problemStatement" required rows={6} className={field} /></label>
        <label className="grid gap-2 text-xs font-bold text-[var(--text-secondary)]">Rules<textarea name="rules" required rows={6} className={field} /></label>
        <label className="grid gap-2 text-xs font-bold text-[var(--text-secondary)]">Optional writing template<textarea name="templateContent" rows={5} className={field} /></label>
        <label className="grid gap-2 text-xs font-bold text-[var(--text-secondary)]">Cover image URL<input name="coverUrl" type="url" placeholder="https://…" className={field} /></label>
        <label className="grid gap-2 text-xs font-bold text-[var(--text-secondary)]">Required topics, comma separated<input name="requiredTopics" className={field} /></label>
        <label className="grid gap-2 text-xs font-bold text-[var(--text-secondary)]">Allowed publication targets<input name="allowedTargets" defaultValue="personal" className={field} /><span className="font-normal text-[var(--text-faint)]">Use personal or exact org:&lt;id&gt; targets, comma separated.</span></label>
        <div className="flex flex-wrap items-end gap-5"><label className="grid max-w-48 gap-2 text-xs font-bold text-[var(--text-secondary)]">Minimum account age (days)<input name="minimumAccountAgeDays" type="number" min="0" defaultValue="0" className={field} /></label><label className="flex items-center gap-2 pb-2 text-xs font-bold text-[var(--text-secondary)]"><input name="requireBio" type="checkbox" /> Require a profile bio</label></div>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="grid gap-2 text-xs font-bold text-[var(--text-secondary)]">Starts<input name="startsAt" type="datetime-local" required className={field} /></label>
          <label className="grid gap-2 text-xs font-bold text-[var(--text-secondary)]">Submissions close<input name="submissionsCloseAt" type="datetime-local" required className={field} /></label>
          <label className="grid gap-2 text-xs font-bold text-[var(--text-secondary)]">Judging closes<input name="judgingClosesAt" type="datetime-local" required className={field} /></label>
        </div>
        <label className="grid max-w-48 gap-2 text-xs font-bold text-[var(--text-secondary)]">Entries per author<input name="perAuthorLimit" type="number" min="1" max="10" defaultValue="1" className={field} /></label>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button disabled={busy} className="justify-self-start rounded-full bg-[var(--accent)] px-6 py-2.5 text-sm font-bold text-white disabled:opacity-50">{busy ? 'Creating…' : 'Create draft'}</button>
      </form>
    </main>
  );
}
