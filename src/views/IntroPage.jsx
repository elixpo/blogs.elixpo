'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { FollowToggle } from '../components/BlogFollowButtons';
import { useAuth } from '../context/AuthContext';
import { safeNextPath, uniqueAuthors } from '../utils/onboarding';

// New-user onboarding, one step at a time like dev.to and Hashnode. Every step
// can be skipped, and "Skip setup" jumps straight to the end. Each step saves
// through an existing API, so a half-finished onboarding still keeps what the
// user did choose.

const STEPS = ['profile', 'topics', 'people'];
const MAX_TOPICS = 20;

export default function IntroPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [next, setNext] = useState('/');

  const [profile, setProfile] = useState({ display_name: '', designation: '', bio: '' });
  const [profileTouched, setProfileTouched] = useState(false);
  const [popularTopics, setPopularTopics] = useState([]);
  const [topics, setTopics] = useState([]);
  const [writers, setWriters] = useState([]);

  useEffect(() => {
    setNext(safeNextPath(new URLSearchParams(window.location.search).get('next')));
  }, []);

  useEffect(() => {
    if (!user || profileTouched) return;
    setProfile({
      display_name: user.display_name || '',
      designation: user.designation || '',
      bio: user.bio || '',
    });
  }, [user, profileTouched]);

  useEffect(() => {
    fetch('/api/tags/popular?limit=30')
      .then((r) => (r.ok ? r.json() : { tags: [] }))
      .then((d) => setPopularTopics((d.tags || []).map((t) => String(t.tag).toLowerCase())))
      .catch(() => {});
    fetch('/api/users/me/interests')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d?.interests?.length && setTopics(d.interests.map((t) => String(t).toLowerCase())))
      .catch(() => {});
    fetch('/api/feed/trending?limit=20')
      .then((r) => (r.ok ? r.json() : { posts: [] }))
      .then((d) => setWriters(d.posts || []))
      .catch(() => {});
  }, []);

  const suggestedWriters = useMemo(
    () => uniqueAuthors(writers, user?.username, 6),
    [writers, user?.username],
  );

  const finish = () => setStep(STEPS.length);
  const goNext = () => {
    setError('');
    setStep((s) => s + 1);
  };

  const saveProfile = async () => {
    if (!profileTouched) return goNext();
    setSaving(true);
    try {
      const response = await fetch('/api/users/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: profile.display_name.trim() || undefined,
          designation: profile.designation.trim(),
          bio: profile.bio.trim(),
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Could not save your profile');
      }
      goNext();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const saveTopics = async () => {
    if (!topics.length) return goNext();
    setSaving(true);
    try {
      const response = await fetch('/api/users/me/interests', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interests: topics }),
      });
      if (!response.ok) throw new Error('Could not save your topics');
      goNext();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleTopic = (tag) =>
    setTopics((current) =>
      current.includes(tag)
        ? current.filter((t) => t !== tag)
        : current.length < MAX_TOPICS ? [...current, tag] : current,
    );

  const done = step >= STEPS.length;
  const progress = Math.round((Math.min(step, STEPS.length) / STEPS.length) * 100);
  const firstName = (profile.display_name || user?.display_name || user?.username || '').split(' ')[0];

  return (
    <main className="min-h-screen bg-[var(--bg-app)] px-4 py-8 sm:py-14">
      <div className="mx-auto w-full max-w-[560px]">
        <header className="mb-8 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-[17px] font-extrabold text-[var(--text-primary)]">
            <span className="h-7 w-7 rounded-full bg-[url('/logo.png')] bg-cover" aria-hidden="true" />
            LixBlogs
          </Link>
          {!done && (
            <button type="button" onClick={finish} className="text-[13px] font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)]">
              Skip setup
            </button>
          )}
        </header>

        {!done && (
          <div className="mb-6">
            <div className="mb-2 flex items-center justify-between text-[12px] text-[var(--text-faint)]">
              <span>Step {step + 1} of {STEPS.length}</span>
              <span>{progress}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-[var(--bg-hover)]" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #9b7bf7, #8b6ae6)' }} />
            </div>
          </div>
        )}

        <section key={step} className="lix-onboard-card rounded-2xl border p-6 sm:p-8" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-default)' }}>
          {STEPS[step] === 'profile' && (
            <>
              <StepTitle emoji="👋" title={`Welcome${firstName ? `, ${firstName}` : ''}!`} subtitle="Tell readers a little about yourself. You can change this any time." />
              <Field label="Display name">
                <input value={profile.display_name} maxLength={60} onChange={(e) => { setProfileTouched(true); setProfile({ ...profile, display_name: e.target.value }); }} className={inputClass} placeholder="Your name" />
              </Field>
              <Field label="Headline" hint="e.g. Debian developer · writes about packaging">
                <input value={profile.designation} maxLength={80} onChange={(e) => { setProfileTouched(true); setProfile({ ...profile, designation: e.target.value }); }} className={inputClass} placeholder="What you do or write about" />
              </Field>
              <Field label="Short bio">
                <textarea value={profile.bio} maxLength={300} rows={3} onChange={(e) => { setProfileTouched(true); setProfile({ ...profile, bio: e.target.value }); }} className={`${inputClass} resize-none`} placeholder="A sentence or two for your profile" />
              </Field>
              <Actions error={error} saving={saving} onSkip={goNext} onNext={saveProfile} />
            </>
          )}

          {STEPS[step] === 'topics' && (
            <>
              <StepTitle emoji="🧭" title="What do you like to read?" subtitle="Pick a few topics. Your feed will lean towards them." />
              <div className="flex flex-wrap gap-2">
                {popularTopics.length ? popularTopics.map((tag) => {
                  const selected = topics.includes(tag);
                  return (
                    <button key={tag} type="button" aria-pressed={selected} onClick={() => toggleTopic(tag)}
                      className="rounded-full border px-3 py-1.5 text-[13px] font-medium transition-all hover:-translate-y-0.5"
                      style={selected
                        ? { background: 'color-mix(in srgb, var(--accent) 16%, transparent)', borderColor: 'var(--accent)', color: 'var(--accent)' }
                        : { background: 'var(--bg-app)', borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }}>
                      {selected ? '✓ ' : '#'}{tag}
                    </button>
                  );
                }) : <p className="text-[13px] text-[var(--text-faint)]">Loading topics…</p>}
              </div>
              <p className="mt-3 text-[12px] text-[var(--text-faint)]">{topics.length ? `${topics.length} selected` : 'Pick at least three for the best feed.'}</p>
              <Actions error={error} saving={saving} onBack={() => setStep(0)} onSkip={goNext} onNext={saveTopics} />
            </>
          )}

          {STEPS[step] === 'people' && (
            <>
              <StepTitle emoji="✍️" title="Follow a few writers" subtitle="Their new stories will show up in your feed." />
              {suggestedWriters.length ? (
                <ul className="space-y-2">
                  {suggestedWriters.map((writer) => (
                    <li key={writer.username} className="flex items-center gap-3 rounded-xl border p-3" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-app)' }}>
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full text-[13px] font-bold text-white" style={{ background: '#9b7bf7' }}>
                        {writer.avatar_url
                          ? <img src={writer.avatar_url} alt="" className="h-full w-full object-cover" />
                          : (writer.display_name || writer.username)[0].toUpperCase()}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] font-semibold text-[var(--text-primary)]">{writer.display_name || writer.username}</span>
                        <span className="block truncate text-[12px] text-[var(--text-faint)]">@{writer.username}</span>
                      </span>
                      <FollowToggle kind="user" handle={writer.username} compact />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[13px] text-[var(--text-faint)]">No suggestions yet. You can follow writers from any story.</p>
              )}
              <Actions error={error} saving={saving} onBack={() => setStep(1)} onSkip={goNext} onNext={goNext} nextLabel="Finish" />
            </>
          )}

          {done && (
            <div className="text-center">
              <div className="lix-onboard-done mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl text-[32px]" style={{ background: 'var(--accent-subtle)' }}>🎉</div>
              <h1 className="text-[24px] font-extrabold text-[var(--text-primary)]">You&apos;re all set!</h1>
              <p className="mx-auto mt-2 max-w-[380px] text-[14px] text-[var(--text-muted)]">Every great blog starts with one story. Yours could be next.</p>
              <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
                <button type="button" onClick={() => router.push('/new-blog')} className="flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-[14px] font-bold text-white shadow-md transition-transform hover:-translate-y-0.5 active:scale-[0.97]" style={{ background: 'linear-gradient(135deg, #9b7bf7 0%, #8b6ae6 100%)' }}>
                  <ion-icon name="create-outline" style={{ fontSize: '17px' }} /> Write your first story
                </button>
                <button type="button" onClick={() => router.push(next)} className="rounded-xl border px-5 py-3 text-[14px] font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)]" style={{ borderColor: 'var(--border-default)' }}>
                  Start reading
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
      <style jsx>{`
        .lix-onboard-card { animation: lix-onboard-in 260ms ease-out; }
        .lix-onboard-done { animation: lix-onboard-pop 420ms cubic-bezier(0.2, 0.9, 0.3, 1.3); }
        @keyframes lix-onboard-in { from { opacity: 0; transform: translateY(8px); } }
        @keyframes lix-onboard-pop { from { opacity: 0; transform: scale(0.6); } }
        @media (prefers-reduced-motion: reduce) {
          .lix-onboard-card, .lix-onboard-done { animation: none; }
        }
      `}</style>
    </main>
  );
}

const inputClass = 'w-full rounded-xl border bg-[var(--bg-app)] px-3.5 py-2.5 text-[14px] text-[var(--text-primary)] outline-none transition-colors border-[var(--border-default)] focus:border-[var(--accent)] placeholder-[var(--text-faint)]';

function StepTitle({ emoji, title, subtitle }) {
  return (
    <div className="mb-6">
      <div className="mb-3 text-[30px]" aria-hidden="true">{emoji}</div>
      <h1 className="text-[22px] font-extrabold text-[var(--text-primary)]">{title}</h1>
      <p className="mt-1 text-[14px] text-[var(--text-muted)]">{subtitle}</p>
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <label className="mb-4 block">
      <span className="mb-1.5 block text-[13px] font-semibold text-[var(--text-secondary)]">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-[var(--text-faint)]">{hint}</span>}
    </label>
  );
}

function Actions({ onBack, onSkip, onNext, saving, error, nextLabel = 'Continue' }) {
  return (
    <div className="mt-7">
      {error && <p role="alert" className="mb-3 text-[13px] text-red-500">{error}</p>}
      <div className="flex items-center gap-2">
        {onBack && (
          <button type="button" onClick={onBack} className="rounded-xl px-3 py-2.5 text-[13px] font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)]">
            ← Back
          </button>
        )}
        <button type="button" onClick={onSkip} className="ml-auto rounded-xl px-4 py-2.5 text-[13px] font-medium text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]">
          Skip
        </button>
        <button type="button" onClick={onNext} disabled={saving} className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-[14px] font-bold text-white shadow-md transition-transform hover:-translate-y-0.5 active:scale-[0.97] disabled:opacity-60" style={{ background: 'linear-gradient(135deg, #9b7bf7 0%, #8b6ae6 100%)' }}>
          {saving && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/35 border-t-white" aria-hidden="true" />}
          {saving ? 'Saving…' : nextLabel}
        </button>
      </div>
    </div>
  );
}
