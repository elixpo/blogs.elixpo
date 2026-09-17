'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

const inputClass = 'w-full rounded-lg border border-[var(--border-default)] bg-[var(--input-bg)] px-3 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]';

export default function ContestControls({ contest, members, submissions, signedIn }) {
  const router = useRouter();
  const [blogId, setBlogId] = useState('');
  const [member, setMember] = useState('');
  const [role, setRole] = useState('judge');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ title: contest.title, description: contest.description, problemStatement: contest.problemStatement, rules: contest.rules, theme: contest.theme, templateContent: contest.templateContent });
  const [winner, setWinner] = useState('');
  const [runnerUp, setRunnerUp] = useState('');
  const [honorable, setHonorable] = useState('');
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  async function mutate(path, body, method = 'POST') {
    setBusy(path); setMessage('');
    const response = await fetch(path, { method, headers: body ? { 'content-type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined });
    const result = await response.json().catch(() => ({})); setBusy('');
    if (!response.ok) return setMessage(result.error || 'The request failed');
    setMessage('Saved.'); router.refresh();
  }
  const manager = contest.viewerRole === 'organizer' || contest.viewerRole === 'moderator';
  const judge = contest.viewerRole === 'organizer' || contest.viewerRole === 'judge';
  return <div className="sticky top-20 space-y-4">
    <section className="rounded-2xl border border-[var(--border-default)] bg-[var(--card-bg)] p-5">
      <h2 className="font-bold text-[var(--text-primary)]">Contest details</h2>
      <dl className="mt-4 space-y-3 text-xs text-[var(--text-muted)]"><div><dt className="font-bold text-[var(--text-secondary)]">Required topics</dt><dd className="mt-1">{contest.requiredTopics.join(', ') || 'None'}</dd></div><div><dt className="font-bold text-[var(--text-secondary)]">Entry limit</dt><dd className="mt-1">{contest.perAuthorLimit} per author</dd></div><div><dt className="font-bold text-[var(--text-secondary)]">Eligible targets</dt><dd className="mt-1">{contest.allowedTargets.join(', ')}</dd></div></dl>
      {contest.status === 'live' && signedIn && <div className="mt-5 border-t border-[var(--divider)] pt-4"><label className="text-xs font-bold text-[var(--text-secondary)]">Published blog ID<input value={blogId} onChange={(event) => setBlogId(event.target.value)} className={`${inputClass} mt-2`} placeholder="Blog ID" /></label><button disabled={!blogId || busy} onClick={() => mutate(`/api/contests/${contest.slug}/submissions`, { blogId })} className="mt-3 w-full rounded-full bg-[var(--accent)] px-4 py-2 text-xs font-bold text-white disabled:opacity-50">Submit frozen revision</button></div>}
      {!signedIn && <a href="/api/auth/login" className="mt-4 block text-xs font-bold text-[var(--accent)]">Sign in to participate →</a>}
    </section>
    {manager && <section className="rounded-2xl border border-[var(--border-default)] bg-[var(--card-bg)] p-5"><div className="flex items-center justify-between gap-2"><h2 className="font-bold text-[var(--text-primary)]">Organizer controls</h2><button onClick={() => setEditing(!editing)} className="text-xs font-bold text-[var(--accent)]">{editing ? 'Close' : 'Edit'}</button></div><div className="mt-4 flex gap-2">{contest.configuredStatus === 'draft' && <button disabled={busy} onClick={() => mutate(`/api/contests/${contest.slug}`, { action: 'publish' }, 'PATCH')} className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-bold text-white">Publish</button>} {!['cancelled', 'completed'].includes(contest.status) && <button disabled={busy} onClick={() => mutate(`/api/contests/${contest.slug}`, { action: 'cancel' }, 'PATCH')} className="rounded-full border border-red-500/30 px-4 py-2 text-xs font-bold text-red-500">Cancel</button>}</div>{editing && <div className="mt-4 grid gap-2 border-t border-[var(--divider)] pt-4">{[['title', 'Title'], ['theme', 'Theme'], ['description', 'Description'], ['problemStatement', 'Problem statement'], ['rules', 'Rules'], ['templateContent', 'Template']].map(([key, label]) => <label key={key} className="text-[10px] font-bold text-[var(--text-secondary)]">{label}{['description', 'problemStatement', 'rules', 'templateContent'].includes(key) ? <textarea rows={key === 'rules' || key === 'problemStatement' ? 4 : 2} value={draft[key]} onChange={(event) => setDraft({ ...draft, [key]: event.target.value })} className={`${inputClass} mt-1`} /> : <input value={draft[key]} onChange={(event) => setDraft({ ...draft, [key]: event.target.value })} className={`${inputClass} mt-1`} />}</label>)}<button disabled={busy} onClick={() => mutate(`/api/contests/${contest.slug}`, draft, 'PATCH')} className="mt-1 rounded-full bg-[var(--accent)] px-4 py-2 text-xs font-bold text-white">Save contest</button></div>}{contest.viewerRole === 'organizer' && <div className="mt-5 border-t border-[var(--divider)] pt-4"><p className="text-xs font-bold text-[var(--text-secondary)]">Assign role</p><input value={member} onChange={(event) => setMember(event.target.value)} className={`${inputClass} mt-2`} placeholder="Username or user ID" /><select value={role} onChange={(event) => setRole(event.target.value)} className={`${inputClass} mt-2`}><option value="judge">Judge</option><option value="moderator">Moderator</option></select><button disabled={!member || busy} onClick={() => mutate(`/api/contests/${contest.slug}/members`, { user: member, role })} className="mt-2 text-xs font-bold text-[var(--accent)]">Add or update member</button><ul className="mt-3 space-y-1 text-xs text-[var(--text-muted)]">{members.map((item) => <li key={item.user_id}>@{item.username} · {item.role}</li>)}</ul></div>}</section>}
    {judge && contest.status === 'judging' && <section className="rounded-2xl border border-[var(--border-default)] bg-[var(--card-bg)] p-5"><h2 className="font-bold text-[var(--text-primary)]">Judge results</h2><p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">Judges can inspect frozen snapshots through the CLI or API before assigning results here.</p>{[['Winner', winner, setWinner], ['Runner-up', runnerUp, setRunnerUp], ['Honorable mention', honorable, setHonorable]].map(([label, value, setter]) => <label key={label} className="mt-3 block text-[10px] font-bold text-[var(--text-secondary)]">{label}<select value={value} onChange={(event) => setter(event.target.value)} className={`${inputClass} mt-1`}><option value="">Not selected</option>{submissions.map((item) => <option key={item.id} value={item.id}>{item.title} — @{item.author.username}</option>)}</select></label>)}<button disabled={!winner || busy} onClick={() => mutate(`/api/contests/${contest.slug}/results`, { awards: [{ placement: 'winner', submissionId: winner }, ...(runnerUp ? [{ placement: 'runner-up', submissionId: runnerUp }] : []), ...(honorable ? [{ placement: 'honorable-mention', submissionId: honorable }] : [])], finalize: true })} className="mt-4 w-full rounded-full bg-amber-500 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">Finalize results</button></section>}
    {message && <p role="status" className="rounded-xl bg-[var(--bg-surface)] p-3 text-xs text-[var(--text-secondary)]">{message}</p>}
  </div>;
}
