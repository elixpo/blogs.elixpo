'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'lixblogs:contextual-tips:v1';
const SESSION_KEY = 'lixblogs:contextual-tips:session:v1';
const TIP_EVENT = 'lixblogs:contextual-tip';
const ROUTE_DELAY_MS = 9_000;
const ROUTE_COOLDOWN_MS = 20 * 60_000;
const EVENT_COOLDOWN_MS = 90_000;
const REPEAT_AFTER_MS = 30 * 86_400_000;
const MAX_PER_SESSION = 3;

const TIPS = [
  {
    id: 'editor-slash-menu',
    match: path => path === '/new-blog' || path.startsWith('/edit/'),
    icon: 'sparkles-outline',
    title: 'Try the slash menu',
    message: 'Type / on an empty line to add Mermaid diagrams, images, callouts, checklists, and more.',
    action: 'Editor guide',
    href: '/docs/lixeditor',
  },
  {
    id: 'editor-markdown-paste',
    match: path => path === '/new-blog' || path.startsWith('/edit/'),
    icon: 'code-slash-outline',
    title: 'Markdown works here',
    message: 'Paste Markdown into the editor and LixBlogs will turn supported syntax into editable blocks.',
    action: 'Learn more',
    href: '/docs/writing-publishing',
  },
  {
    id: 'editor-version-history',
    event: 'draft-saved',
    icon: 'time-outline',
    title: 'Your work is recoverable',
    message: 'Cloud saves become version history, so you can inspect or restore an earlier draft.',
  },
  {
    id: 'feed-search-syntax',
    match: path => path === '/' || path === '/explore',
    icon: 'search-outline',
    title: 'Search with precision',
    message: 'Try author:, tag:, org:, or exact phrases to find a specific story faster.',
    action: 'Search syntax',
    href: '/docs/search-syntax',
  },
  {
    id: 'feed-live-contests',
    match: path => path === '/' || path === '/explore',
    icon: 'trophy-outline',
    title: 'Write for a contest',
    message: 'Open contests let you publish against a prompt and submit an existing eligible story.',
    action: 'Explore contests',
    href: '/contests',
  },
  {
    id: 'profile-badge-controls',
    match: path => path === '/profile',
    icon: 'ribbon-outline',
    title: 'Curate your badges',
    message: 'Choose which earned badges are public, then pin the one you want readers to notice first.',
    action: 'See all badges',
    href: '/badges',
  },
  {
    id: 'settings-integrations',
    match: path => path.startsWith('/settings'),
    icon: 'extension-puzzle-outline',
    title: 'Bring your own services',
    message: 'Connect Cloudinary, LixRL, or Pollinations from Integrations to expand your publishing workflow.',
    action: 'Open integrations',
    href: '/settings?tab=Integrations',
  },
  {
    id: 'contest-editor-submit',
    match: path => path.startsWith('/contests/'),
    icon: 'flag-outline',
    title: 'Submit from either side',
    message: 'Enter a contest here with a blog ID, or choose a live contest from the editor publish settings.',
  },
  {
    id: 'library-collections',
    match: path => path === '/library',
    icon: 'albums-outline',
    title: 'Curate public writing',
    message: 'Collections can include eligible public stories from other writers while preserving attribution.',
    action: 'Collection guide',
    href: '/docs/collections',
  },
  {
    id: 'docs-search',
    match: path => path.startsWith('/docs'),
    icon: 'keypad-outline',
    title: 'Jump through the docs',
    message: 'Press Ctrl or Cmd + K to search the documentation from anywhere in this section.',
  },
];

function readJson(storage, key, fallback) {
  try {
    return JSON.parse(storage.getItem(key) || '') || fallback;
  } catch {
    return fallback;
  }
}

function readState() {
  return readJson(localStorage, STORAGE_KEY, { shown: {}, lastShownAt: 0 });
}

function sessionCount() {
  try {
    return Number(sessionStorage.getItem(SESSION_KEY) || 0);
  } catch {
    return 0;
  }
}

function eligible(tip, state, now) {
  const lastSeen = Number(state.shown?.[tip.id] || 0);
  return !lastSeen || now - lastSeen >= REPEAT_AFTER_MS;
}

function rememberTip(tip, now) {
  const state = readState();
  const shown = { ...(state.shown || {}), [tip.id]: now };
  const recentEntries = Object.entries(shown)
    .sort((a, b) => Number(b[1]) - Number(a[1]))
    .slice(0, 40);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ shown: Object.fromEntries(recentEntries), lastShownAt: now }));
    sessionStorage.setItem(SESSION_KEY, String(sessionCount() + 1));
  } catch {}
}

export function emitContextualTip(eventName) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(TIP_EVENT, { detail: { eventName } }));
}

export default function ContextualTipToast() {
  const pathname = usePathname() || '/';
  const [tip, setTip] = useState(null);
  const hideTimerRef = useRef(null);

  const showTip = useCallback((candidate, { eventDriven = false } = {}) => {
    if (!candidate || document.visibilityState === 'hidden' || sessionCount() >= MAX_PER_SESSION) return;
    const now = Date.now();
    const state = readState();
    const cooldown = eventDriven ? EVENT_COOLDOWN_MS : ROUTE_COOLDOWN_MS;
    if (now - Number(state.lastShownAt || 0) < cooldown || !eligible(candidate, state, now)) return;

    clearTimeout(hideTimerRef.current);
    rememberTip(candidate, now);
    setTip(candidate);
    hideTimerRef.current = setTimeout(() => setTip(null), 11_000);
  }, []);

  useEffect(() => {
    setTip(null);
    clearTimeout(hideTimerRef.current);
    const candidates = TIPS.filter(candidate => candidate.match?.(pathname));
    if (!candidates.length) return undefined;
    const state = readState();
    const now = Date.now();
    const unseen = candidates.filter(candidate => eligible(candidate, state, now));
    if (!unseen.length) return undefined;
    const index = Math.abs(pathname.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)) % unseen.length;
    const timer = setTimeout(() => showTip(unseen[index]), ROUTE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [pathname, showTip]);

  useEffect(() => {
    const handleTipEvent = event => {
      const candidate = TIPS.find(item => item.event === event.detail?.eventName);
      if (candidate) setTimeout(() => showTip(candidate, { eventDriven: true }), 900);
    };
    window.addEventListener(TIP_EVENT, handleTipEvent);
    return () => window.removeEventListener(TIP_EVENT, handleTipEvent);
  }, [showTip]);

  useEffect(() => () => clearTimeout(hideTimerRef.current), []);

  if (!tip) return null;

  return (
    <aside
      className="contextual-tip fixed right-3 top-[68px] z-[70] w-[calc(100vw-24px)] max-w-[410px] overflow-hidden rounded-2xl border px-4 py-4 backdrop-blur-xl sm:right-5"
      style={{
        background: 'linear-gradient(135deg, color-mix(in srgb, var(--accent) 9%, var(--bg-surface)) 0%, color-mix(in srgb, var(--bg-surface) 96%, transparent) 58%, color-mix(in srgb, var(--accent) 5%, var(--bg-surface)) 100%)',
        borderColor: 'color-mix(in srgb, var(--accent) 42%, var(--border-default))',
        boxShadow: '0 18px 48px rgba(15, 10, 35, 0.2), 0 4px 14px color-mix(in srgb, var(--accent) 16%, transparent)',
      }}
      role="status"
      aria-live="polite"
    >
      <span aria-hidden="true" className="contextual-tip-glow pointer-events-none absolute -left-8 -top-10 h-24 w-24 rounded-full bg-[var(--accent)] opacity-[0.1] blur-2xl" />
      <div className="relative flex items-start gap-3.5 pr-7">
        <span className="contextual-tip-icon mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl border bg-[var(--accent-subtle)] text-[var(--accent)] shadow-sm" style={{ borderColor: 'color-mix(in srgb, var(--accent) 25%, transparent)' }}>
          <ion-icon name={tip.icon || 'bulb-outline'} style={{ fontSize: '20px' }} />
        </span>
        <div className="min-w-0">
          <p className="mb-1 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.16em] text-[var(--accent)]">
            <span className="contextual-tip-dot h-1.5 w-1.5 rounded-full bg-[var(--accent)]" /> Quick tip
          </p>
          <p className="text-[13px] font-bold leading-tight text-[var(--text-primary)]">{tip.title}</p>
          <p className="mt-1 text-[12px] leading-[1.5] text-[var(--text-muted)]">{tip.message}</p>
          {tip.href && (
            <Link href={tip.href} onClick={() => setTip(null)} className="mt-2.5 inline-flex items-center gap-1 rounded-full bg-[var(--accent-subtle)] px-2.5 py-1.5 text-[11px] font-bold text-[var(--accent)] transition hover:-translate-y-px hover:bg-[var(--bg-hover)]">
              {tip.action || 'Try it'} <ion-icon name="arrow-forward-outline" style={{ fontSize: '12px' }} />
            </Link>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={() => setTip(null)}
        className="absolute right-2.5 top-2.5 grid h-7 w-7 place-items-center rounded-full text-[var(--text-faint)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--accent)]"
        aria-label="Dismiss tip"
      >
        <ion-icon name="close-outline" style={{ fontSize: '15px' }} />
      </button>
      <span className="contextual-tip-progress absolute inset-x-0 bottom-0 h-[3px] origin-left bg-[linear-gradient(90deg,var(--accent),#60a5fa,var(--accent))] opacity-80" />
      <style jsx>{`
        .contextual-tip { animation: contextual-tip-in 420ms cubic-bezier(.2,.9,.25,1.15) both; }
        .contextual-tip-icon { animation: contextual-tip-icon-in 520ms 90ms cubic-bezier(.2,.9,.25,1.2) both; }
        .contextual-tip-glow { animation: contextual-tip-glow 900ms 180ms ease-out both; }
        .contextual-tip-dot { animation: contextual-tip-dot 1.8s ease-in-out 2; }
        .contextual-tip-progress { animation: contextual-tip-progress 11s linear both; }
        @keyframes contextual-tip-in {
          from { opacity: 0; transform: translateY(-14px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes contextual-tip-icon-in {
          from { opacity: 0; transform: rotate(-10deg) scale(0.65); }
          to { opacity: 1; transform: rotate(0) scale(1); }
        }
        @keyframes contextual-tip-glow {
          from { opacity: 0; transform: scale(0.55); }
          55% { opacity: 0.18; }
          to { opacity: 0.1; transform: scale(1); }
        }
        @keyframes contextual-tip-dot {
          0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--accent) 38%, transparent); }
          50% { box-shadow: 0 0 0 5px transparent; }
        }
        @keyframes contextual-tip-progress {
          from { transform: scaleX(1); }
          to { transform: scaleX(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .contextual-tip, .contextual-tip-icon, .contextual-tip-glow, .contextual-tip-dot, .contextual-tip-progress { animation: none; }
        }
      `}</style>
    </aside>
  );
}
