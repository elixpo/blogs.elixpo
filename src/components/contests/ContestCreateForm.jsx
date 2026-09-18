'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';

const field = 'w-full rounded-xl border border-[var(--border-default)] bg-[var(--input-bg)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-subtle)]';

const steps = [
  { id: 'overview', label: 'Overview', detail: 'Identity and artwork', icon: 'sparkles-outline' },
  { id: 'brief', label: 'Challenge', detail: 'Prompt, rules, and template', icon: 'document-text-outline' },
  { id: 'eligibility', label: 'Eligibility', detail: 'Who and what can enter', icon: 'people-outline' },
  { id: 'timeline', label: 'Timeline', detail: 'Opening and deadlines', icon: 'calendar-outline' },
  { id: 'review', label: 'Review', detail: 'Check and create draft', icon: 'checkmark-circle-outline' },
];

const initialValues = {
  title: '', description: '', theme: '', coverUrl: '', problemStatement: '', rules: '', templateContent: '',
  requiredTopics: '', allowedTargets: '', minimumAccountAgeDays: '0', requireBio: false,
  startsAt: '', submissionsCloseAt: '', judgingClosesAt: '', perAuthorLimit: '1',
};

function SummaryItem({ label, value }) {
  return <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-4"><dt className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-faint)]">{label}</dt><dd className="mt-1.5 line-clamp-3 whitespace-pre-wrap text-sm text-[var(--text-secondary)]">{value || 'Not provided'}</dd></div>;
}

export default function ContestCreateForm() {
  const router = useRouter();
  const formRef = useRef(null);
  const [activeStep, setActiveStep] = useState(0);
  const [furthestStep, setFurthestStep] = useState(0);
  const [values, setValues] = useState(initialValues);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  function update(event) {
    const { name, type, checked, value } = event.target;
    setValues((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }));
  }

  function nextStep() {
    const requiredFields = formRef.current?.querySelectorAll('[required]') || [];
    for (const input of requiredFields) {
      if (!input.checkValidity()) { input.reportValidity(); return; }
    }
    const next = Math.min(activeStep + 1, steps.length - 1);
    setActiveStep(next);
    setFurthestStep((current) => Math.max(current, next));
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function submit(event) {
    event.preventDefault();
    if (activeStep < steps.length - 1) { nextStep(); return; }
    setBusy(true); setError('');
    const body = {
      ...values,
      requiredTopics: values.requiredTopics.split(',').map((item) => item.trim()).filter(Boolean),
      allowedTargets: String(values.allowedTargets || 'personal').split(',').map((item) => item.trim()).filter(Boolean),
      perAuthorLimit: Number(values.perAuthorLimit || 1),
      eligibility: { minimumAccountAgeDays: Math.max(0, Number(values.minimumAccountAgeDays || 0)), requireBio: values.requireBio },
    };
    delete body.minimumAccountAgeDays; delete body.requireBio;
    const response = await fetch('/api/contests', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const result = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) { setError(result.error || 'Contest could not be created'); return; }
    router.push(`/contests/${result.slug}`);
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-5 py-10 sm:px-8">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--accent)]">Organizer workspace</p>
      <h1 className="mt-2 font-serif text-4xl font-extrabold text-[var(--text-primary)]">Create a contest</h1>
      <p className="mt-3 text-sm text-[var(--text-muted)]">Build the contest one section at a time. It stays private until you publish it.</p>

      <nav aria-label="Contest setup" className="mt-8 overflow-x-auto rounded-2xl border border-[var(--border-default)] bg-[var(--card-bg)] p-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <ol className="flex min-w-max gap-1 lg:min-w-0">
          {steps.map((step, index) => {
            const selected = index === activeStep;
            const completed = index < furthestStep;
            const available = index <= furthestStep;
            return <li key={step.id} className="flex-1"><button type="button" disabled={!available} onClick={() => available && setActiveStep(index)} aria-current={selected ? 'step' : undefined} className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition ${selected ? 'bg-[var(--accent-subtle)] text-[var(--accent)]' : 'text-[var(--text-muted)] hover:bg-[var(--bg-surface)]'} disabled:cursor-not-allowed disabled:opacity-45`}><span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border text-sm ${selected || completed ? 'border-[var(--accent)] bg-[var(--accent)] text-white' : 'border-[var(--border-default)] bg-[var(--input-bg)]'}`}>{completed ? <ion-icon name="checkmark-outline" /> : <span>{index + 1}</span>}</span><span><span className="block text-xs font-bold">{step.label}</span><span className="mt-0.5 block text-[10px] font-normal text-[var(--text-faint)]">{step.detail}</span></span></button></li>;
          })}
        </ol>
      </nav>
      <div className="mt-3 h-1 overflow-hidden rounded-full bg-[var(--bg-surface)]"><div className="h-full rounded-full bg-[var(--accent)] transition-all duration-300" style={{ width: `${((activeStep + 1) / steps.length) * 100}%` }} /></div>

      <form ref={formRef} onSubmit={submit} className="mt-6 rounded-2xl border border-[var(--border-default)] bg-[var(--card-bg)] p-6 sm:p-8">
        <header className="mb-7 border-b border-[var(--divider)] pb-5"><div className="flex items-center gap-2 text-[var(--accent)]"><ion-icon name={steps[activeStep].icon} /><span className="text-[11px] font-bold uppercase tracking-[0.16em]">Step {activeStep + 1} of {steps.length}</span></div><h2 className="mt-2 font-serif text-2xl font-bold text-[var(--text-primary)]">{steps[activeStep].label}</h2><p className="mt-1 text-sm text-[var(--text-muted)]">{steps[activeStep].detail}</p></header>

        {activeStep === 0 && <section className="grid gap-5"><label className="grid gap-2 text-xs font-bold text-[var(--text-secondary)]">Contest title<input name="title" value={values.title} onChange={update} required maxLength={160} placeholder="The Future of Open Knowledge" className={field} /></label><label className="grid gap-2 text-xs font-bold text-[var(--text-secondary)]">Short description<textarea name="description" value={values.description} onChange={update} rows={3} maxLength={500} placeholder="Tell writers what this contest is about in a few sentences." className={field} /></label><div className="grid gap-5 sm:grid-cols-2"><label className="grid gap-2 text-xs font-bold text-[var(--text-secondary)]">Theme<input name="theme" value={values.theme} onChange={update} placeholder="Technology for public good" className={field} /></label><label className="grid gap-2 text-xs font-bold text-[var(--text-secondary)]">Cover image URL<input name="coverUrl" value={values.coverUrl} onChange={update} type="url" placeholder="https://example.com/contest-cover.jpg" className={field} /></label></div></section>}

        {activeStep === 1 && <section className="grid gap-5"><label className="grid gap-2 text-xs font-bold text-[var(--text-secondary)]">Problem statement<textarea name="problemStatement" value={values.problemStatement} onChange={update} required rows={7} placeholder="Describe the question writers should answer and what a strong entry should accomplish." className={field} /></label><label className="grid gap-2 text-xs font-bold text-[var(--text-secondary)]">Rules<textarea name="rules" value={values.rules} onChange={update} required rows={7} placeholder="List originality, attribution, language, conduct, and submission requirements." className={field} /></label><label className="grid gap-2 text-xs font-bold text-[var(--text-secondary)]">Optional writing template<textarea name="templateContent" value={values.templateContent} onChange={update} rows={6} placeholder={'# Opening\n\n# Main argument\n\n# Sources and conclusion'} className={field} /><span className="font-normal text-[var(--text-faint)]">Give entrants a Markdown structure they can follow.</span></label></section>}

        {activeStep === 2 && <section className="grid gap-5"><label className="grid gap-2 text-xs font-bold text-[var(--text-secondary)]">Required topics<input name="requiredTopics" value={values.requiredTopics} onChange={update} placeholder="open-source, education, community" className={field} /><span className="font-normal text-[var(--text-faint)]">Separate topics with commas. Every submitted blog must include them.</span></label><label className="grid gap-2 text-xs font-bold text-[var(--text-secondary)]">Where can entries be published?<input name="allowedTargets" value={values.allowedTargets} onChange={update} placeholder="personal, org:your-organization-id" className={field} /><span className="font-normal leading-5 text-[var(--text-faint)]">Leave blank to accept personal blogs only. To accept organization posts too, add the exact target, such as <code className="rounded bg-[var(--accent-subtle)] px-1 py-0.5 text-[var(--accent)]">org:design-team</code>. Separate multiple targets with commas.</span></label><div className="grid gap-5 sm:grid-cols-2"><label className="grid gap-2 text-xs font-bold text-[var(--text-secondary)]">Minimum account age<input name="minimumAccountAgeDays" value={values.minimumAccountAgeDays} onChange={update} type="number" min="0" className={field} /><span className="font-normal text-[var(--text-faint)]">Days before an author can enter.</span></label><label className="grid gap-2 text-xs font-bold text-[var(--text-secondary)]">Entries per author<input name="perAuthorLimit" value={values.perAuthorLimit} onChange={update} type="number" min="1" max="10" className={field} /></label></div><label className="flex items-start gap-3 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-4 text-xs font-bold text-[var(--text-secondary)]"><input name="requireBio" checked={values.requireBio} onChange={update} type="checkbox" className="mt-0.5" /><span>Require a completed profile bio<span className="mt-1 block font-normal text-[var(--text-faint)]">Entrants without a bio will be asked to complete their profile first.</span></span></label></section>}

        {activeStep === 3 && <section className="grid gap-5"><div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-4 text-xs leading-5 text-[var(--text-muted)]">Dates use your browser's local time while editing and are stored consistently for contest lifecycle transitions.</div><div className="grid gap-5 sm:grid-cols-3"><label className="grid gap-2 text-xs font-bold text-[var(--text-secondary)]">Contest starts<input name="startsAt" value={values.startsAt} onChange={update} type="datetime-local" required className={field} /></label><label className="grid gap-2 text-xs font-bold text-[var(--text-secondary)]">Submissions close<input name="submissionsCloseAt" value={values.submissionsCloseAt} onChange={update} type="datetime-local" required min={values.startsAt || undefined} className={field} /></label><label className="grid gap-2 text-xs font-bold text-[var(--text-secondary)]">Judging closes<input name="judgingClosesAt" value={values.judgingClosesAt} onChange={update} type="datetime-local" required min={values.submissionsCloseAt || undefined} className={field} /></label></div></section>}

        {activeStep === 4 && <section><div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-4 text-sm text-[var(--text-secondary)]"><strong className="text-[var(--text-primary)]">Ready for a private draft.</strong> Creating it will not open the contest. You can invite judges, make further edits, and publish from the organizer controls.</div><dl className="mt-5 grid gap-3 sm:grid-cols-2"><SummaryItem label="Contest" value={values.title} /><SummaryItem label="Theme" value={values.theme} /><SummaryItem label="Challenge" value={values.problemStatement} /><SummaryItem label="Required topics" value={values.requiredTopics || 'No required topics'} /><SummaryItem label="Publication targets" value={values.allowedTargets || 'Personal blogs'} /><SummaryItem label="Entry window" value={values.startsAt && values.submissionsCloseAt ? `${values.startsAt} to ${values.submissionsCloseAt}` : ''} /></dl></section>}

        {error && <p role="alert" className="mt-5 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-500">{error}</p>}
        <footer className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--divider)] pt-5"><button type="button" disabled={activeStep === 0 || busy} onClick={() => setActiveStep((current) => Math.max(0, current - 1))} className="rounded-full border border-[var(--border-default)] px-5 py-2.5 text-sm font-bold text-[var(--text-secondary)] disabled:opacity-40">Back</button>{activeStep < steps.length - 1 ? <button type="button" onClick={nextStep} className="rounded-full bg-[var(--accent)] px-6 py-2.5 text-sm font-bold text-white">Continue <span aria-hidden="true">→</span></button> : <button disabled={busy} className="rounded-full bg-[var(--accent)] px-6 py-2.5 text-sm font-bold text-white disabled:opacity-50">{busy ? 'Creating draft…' : 'Create contest draft'}</button>}</footer>
      </form>
    </main>
  );
}
