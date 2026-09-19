'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function TopicInterestChips({ tags = [] }) {
  const { user, loading } = useAuth();
  const userId = user?.id;
  const [interests, setInterests] = useState([]);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const normalized = useMemo(() => [...new Set(tags.map(tag => String(tag).trim()).filter(Boolean))], [tags]);

  useEffect(() => {
    if (!userId) return;
    fetch('/api/users/me/interests')
      .then(response => response.ok ? response.json() : null)
      .then(data => data && setInterests(data.interests || []))
      .catch(() => {});
  }, [userId]);

  const addInterest = async tag => {
    if (loading) return;
    if (!userId) {
      window.location.href = `/sign-in?next=${encodeURIComponent(window.location.pathname)}`;
      return;
    }
    const key = tag.toLowerCase();
    if (interests.some(item => item.toLowerCase() === key)) return;
    setBusy(key);
    try {
      const response = await fetch('/api/users/me/interests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ add: [tag] }),
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        setInterests(data.interests || []);
        setMessage(`Added #${tag} to your interests`);
      } else {
        setMessage(data.error || 'This topic could not be added');
      }
      setTimeout(() => setMessage(''), 2200);
    } finally {
      setBusy('');
    }
  };

  if (!normalized.length) return null;

  return (
    <div className="mb-3">
      <div className="flex flex-wrap gap-1.5" aria-label="Story topics">
        {normalized.map(tag => {
          const active = interests.some(item => item.toLowerCase() === tag.toLowerCase());
          return (
            <button
              key={tag}
              type="button"
              disabled={busy === tag.toLowerCase() || active}
              onClick={() => addInterest(tag)}
              className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[12px] font-medium transition-colors disabled:cursor-default"
              style={{
                color: active ? 'var(--accent)' : 'var(--text-muted)',
                backgroundColor: active ? 'var(--accent-subtle)' : 'var(--bg-surface)',
                borderColor: active ? 'color-mix(in srgb, var(--accent) 30%, var(--border-default))' : 'var(--border-default)',
              }}
              title={active ? `${tag} is one of your interests` : `Add ${tag} to your interests`}
            >
              <span>#{tag}</span>
              <ion-icon name={active ? 'checkmark' : 'add'} style={{ fontSize: '13px' }} />
            </button>
          );
        })}
      </div>
      {message && <p className="mt-1.5 text-[11px] font-medium text-[var(--accent)]" role="status">{message}</p>}
    </div>
  );
}
