"use client";

import { useEffect, useRef, useState } from "react";
import { readPublishedFlag, shareTargets } from "../utils/publishedShare";

// Shown once on the reader page right after the author publishes or updates a
// story. The editor redirects with ?published=new|updated; this reads the flag,
// strips it from the address bar (so a refresh or a shared link never reopens
// it) and offers the link and share targets. Share links are plain intent URLs
// with no tracking parameters.

// Ionicons 7.1 (loaded in app/layout.jsx) predates logo-x; draw the X and
// Hacker News marks inline so the buttons never render blank.
function ShareMark({ target }) {
    if (target.mark === "x") {
        return (
            <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
        );
    }
    if (target.mark === "hn") {
        return <span aria-hidden="true" className="text-[17px] font-black leading-none">Y</span>;
    }
    return <ion-icon name={target.icon} />;
}

export default function PublishedShareModal({ title, enabled }) {
    const [flag, setFlag] = useState(null);
    const [copied, setCopied] = useState(false);
    const [canNativeShare, setCanNativeShare] = useState(false);
    const copyRef = useRef(null);

    useEffect(() => {
        // Capture and strip the flag once on mount. The viewer's session loads
        // asynchronously, so whether to show it is decided by `enabled` later.
        setFlag(readPublishedFlag());
        setCanNativeShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
    }, []);

    const open = Boolean(enabled && flag);

    useEffect(() => {
        if (!open) return undefined;
        copyRef.current?.focus();
        const onKey = (event) => {
            if (event.key === "Escape") setFlag(null);
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open]);

    if (!open) return null;

    const url = `${window.location.origin}${window.location.pathname}`;
    const isNew = flag === "new";

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Clipboard denied: the link stays selectable in the field.
        }
    };

    const nativeShare = async () => {
        try {
            await navigator.share({ title, url });
        } catch {
            // Dismissed or unsupported; nothing to do.
        }
    };

    return (
        <div
            className="lix-share-backdrop fixed inset-0 z-[9999] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
            onClick={() => setFlag(null)}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="lix-share-title"
                className="lix-share-panel relative w-full max-w-[460px] overflow-hidden rounded-2xl border p-6 shadow-2xl"
                style={{
                    background: "var(--bg-surface)",
                    borderColor: "color-mix(in srgb, var(--accent) 30%, var(--border-default))",
                }}
                onClick={(event) => event.stopPropagation()}
            >
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -top-24 left-1/2 h-48 w-72 -translate-x-1/2 rounded-full opacity-60 blur-3xl"
                    style={{ background: "var(--accent)" }}
                />
                <button
                    type="button"
                    onClick={() => setFlag(null)}
                    className="absolute right-3 top-3 rounded-lg p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                    aria-label="Close"
                >
                    <ion-icon name="close-outline" style={{ fontSize: "20px" }} />
                </button>

                <div className="relative text-center">
                    <div className="lix-share-badge mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl text-[28px]" style={{ background: "var(--accent-subtle)", color: "var(--accent)" }}>
                        <ion-icon name={isNew ? "rocket-outline" : "sparkles-outline"} />
                    </div>
                    <h2 id="lix-share-title" className="text-[20px] font-extrabold text-[var(--text-primary)]">
                        {isNew ? "Your story is live!" : "Your story is updated"}
                    </h2>
                    <p className="mt-1 text-[13px] text-[var(--text-muted)]">
                        {isNew
                            ? "Share it while it's fresh. Early readers make the biggest difference."
                            : "Readers now see your latest version. Let them know what changed."}
                    </p>
                </div>

                <div className="relative mt-5 flex items-center gap-2 rounded-xl border p-1.5 pl-3" style={{ borderColor: "var(--border-default)", background: "var(--bg-app)" }}>
                    <input
                        readOnly
                        value={url}
                        onFocus={(event) => event.currentTarget.select()}
                        className="min-w-0 flex-1 bg-transparent text-[13px] text-[var(--text-secondary)] outline-none"
                        aria-label="Story link"
                    />
                    <button
                        ref={copyRef}
                        type="button"
                        onClick={copy}
                        className="flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-semibold text-white transition-transform active:scale-95"
                        style={{ background: copied ? "#22c55e" : "linear-gradient(135deg, #9b7bf7 0%, #8b6ae6 100%)" }}
                    >
                        <ion-icon name={copied ? "checkmark-outline" : "copy-outline"} style={{ fontSize: "15px" }} />
                        {copied ? "Copied" : "Copy link"}
                    </button>
                </div>

                <div className="relative mt-5">
                    <p className="mb-2 text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-faint)]">Share to</p>
                    <div className="flex flex-wrap justify-center gap-2">
                        {shareTargets(url, title).map((target) => (
                            <a
                                key={target.name}
                                href={target.href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="lix-share-target flex h-11 w-11 items-center justify-center rounded-xl border text-[20px] text-[var(--text-secondary)] transition-all hover:-translate-y-0.5 hover:text-[var(--accent)]"
                                style={{ borderColor: "var(--border-default)", background: "var(--bg-app)" }}
                                aria-label={`Share on ${target.name}`}
                                title={target.name}
                            >
                                <ShareMark target={target} />
                            </a>
                        ))}
                        {canNativeShare && (
                            <button
                                type="button"
                                onClick={nativeShare}
                                className="lix-share-target flex h-11 w-11 items-center justify-center rounded-xl border text-[20px] text-[var(--text-secondary)] transition-all hover:-translate-y-0.5 hover:text-[var(--accent)]"
                                style={{ borderColor: "var(--border-default)", background: "var(--bg-app)" }}
                                aria-label="More sharing options"
                                title="More…"
                            >
                                <ion-icon name="share-social-outline" />
                            </button>
                        )}
                    </div>
                </div>

                <button
                    type="button"
                    onClick={() => setFlag(null)}
                    className="relative mt-5 w-full rounded-xl py-2.5 text-[13px] font-semibold text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                >
                    Keep reading
                </button>
            </div>
            <style jsx>{`
                .lix-share-backdrop { animation: lix-share-fade 180ms ease-out; }
                .lix-share-panel { animation: lix-share-pop 260ms cubic-bezier(0.2, 0.9, 0.3, 1.2); }
                .lix-share-badge { animation: lix-share-bob 2.4s ease-in-out infinite; }
                @keyframes lix-share-fade { from { opacity: 0; } }
                @keyframes lix-share-pop { from { opacity: 0; transform: translateY(12px) scale(0.96); } }
                @keyframes lix-share-bob { 50% { transform: translateY(-3px); } }
                @media (prefers-reduced-motion: reduce) {
                    .lix-share-backdrop, .lix-share-panel, .lix-share-badge { animation: none; }
                }
            `}</style>
        </div>
    );
}
