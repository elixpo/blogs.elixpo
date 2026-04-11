'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

// Client-side cache to avoid refetching the same URL
const previewCache = new Map();

async function fetchPreview(url) {
  if (previewCache.has(url)) return previewCache.get(url);
  try {
    const res = await fetch(`/api/link-preview?url=${encodeURIComponent(url)}`);
    if (!res.ok) throw new Error('fetch failed');
    const data = await res.json();
    previewCache.set(url, data);
    return data;
  } catch {
    const fallback = { title: new URL(url).hostname, description: '', image: '', favicon: '', domain: new URL(url).hostname };
    previewCache.set(url, fallback);
    return fallback;
  }
}

export default function LinkPreviewTooltip({ anchorEl, url, onClose, onKeepAlive }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const tooltipRef = useRef(null);

  useEffect(() => {
    if (!url) return;
    setLoading(true);
    fetchPreview(url).then(d => {
      setData(d);
      setLoading(false);
    });
  }, [url]);

  // Position tooltip below or above the anchor using fixed positioning
  const [above, setAbove] = useState(false);
  useEffect(() => {
    if (!anchorEl) return;
    const rect = anchorEl.getBoundingClientRect();
    const tooltipWidth = 320;
    const tooltipHeight = 320; // max estimate with OG image
    let left = rect.left + rect.width / 2 - tooltipWidth / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - tooltipWidth - 8));

    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    if (spaceBelow < tooltipHeight && spaceAbove > spaceBelow) {
      // Show above the link
      setAbove(true);
      setPos({ top: rect.top - 6, left });
    } else {
      // Show below the link
      setAbove(false);
      setPos({ top: rect.bottom + 6, left });
    }
  }, [anchorEl]);

  if (!url) return null;

  return (
    <div
      ref={tooltipRef}
      className="link-preview-tooltip"
      style={{ top: pos.top, left: pos.left, transform: above ? 'translateY(-100%)' : 'none' }}
      onMouseEnter={onKeepAlive}
      onMouseLeave={onClose}
    >
      {loading ? (
        <div className="link-preview-loading">
          <div className="link-preview-skeleton" style={{ width: '60%', height: 12 }} />
          <div className="link-preview-skeleton" style={{ width: '90%', height: 10, marginTop: 8 }} />
          <div className="link-preview-skeleton" style={{ width: '40%', height: 10, marginTop: 4 }} />
        </div>
      ) : data ? (
        <a href={url} target="_blank" rel="noopener noreferrer" className="link-preview-card">
          {data.image && (
            <div className="link-preview-image">
              <img src={data.image} alt="" onError={e => { e.target.style.display = 'none'; }} />
            </div>
          )}
          <div className="link-preview-body">
            <div className="link-preview-title">{data.title}</div>
            {data.description && (
              <div className="link-preview-desc">{data.description.length > 120 ? data.description.slice(0, 120) + '...' : data.description}</div>
            )}
            <div className="link-preview-domain">
              {data.favicon && <img src={data.favicon} alt="" className="link-preview-favicon" onError={e => { e.target.style.display = 'none'; }} />}
              <span>{data.domain}</span>
            </div>
          </div>
        </a>
      ) : null}
    </div>
  );
}

// Hook to manage link preview state for any container
export function useLinkPreview() {
  const [preview, setPreview] = useState(null);
  const showTimerRef = useRef(null);
  const hideTimerRef = useRef(null);

  const show = useCallback((anchorEl, url) => {
    clearTimeout(hideTimerRef.current);
    clearTimeout(showTimerRef.current);
    // Delay to avoid flashing on quick mouse passes
    showTimerRef.current = setTimeout(() => {
      setPreview({ anchorEl, url });
    }, 400);
  }, []);

  const hide = useCallback(() => {
    clearTimeout(showTimerRef.current);
    clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      setPreview(null);
    }, 250);
  }, []);

  const cancel = useCallback(() => {
    clearTimeout(showTimerRef.current);
  }, []);

  // Allow keeping tooltip open when mouse enters the tooltip itself
  const keepAlive = useCallback(() => {
    clearTimeout(hideTimerRef.current);
  }, []);

  useEffect(() => {
    return () => {
      clearTimeout(showTimerRef.current);
      clearTimeout(hideTimerRef.current);
    };
  }, []);

  return { preview, show, hide, cancel, keepAlive };
}
