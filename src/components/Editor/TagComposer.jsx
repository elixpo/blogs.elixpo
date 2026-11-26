"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { suggestTagsForTitle, MAX_TAGS } from "../../utils/tagSuggestions";

// Topic picker that lives in the writing area, right under the title. Popular
// tags (from /api/tags/popular) and tags suggested by the title get their own
// colours so writers can see at a glance which topics already have readers.

const POPULAR = {
    background: "color-mix(in srgb, var(--accent) 14%, transparent)",
    border: "color-mix(in srgb, var(--accent) 38%, transparent)",
    color: "var(--accent)",
};
const SUGGESTED = {
    background: "rgba(20, 184, 166, 0.12)",
    border: "rgba(20, 184, 166, 0.45)",
    color: "#14b8a6",
};
const CUSTOM = {
    background: "var(--bg-surface)",
    border: "var(--border-default)",
    color: "var(--text-secondary)",
};

let popularCache = null;

export default function TagComposer({ tags, onAdd, onRemove, title = "", disabled = false }) {
    const [input, setInput] = useState("");
    const [focused, setFocused] = useState(false);
    const [active, setActive] = useState(-1);
    const [popular, setPopular] = useState(popularCache || []);
    const inputRef = useRef(null);
    const blurTimer = useRef(null);

    useEffect(() => {
        if (popularCache) return;
        let alive = true;
        fetch("/api/tags/popular?limit=50")
            .then((response) => (response.ok ? response.json() : { tags: [] }))
            .then((data) => {
                popularCache = Array.isArray(data?.tags) ? data.tags : [];
                if (alive) setPopular(popularCache);
            })
            .catch(() => {});
        return () => {
            alive = false;
        };
    }, []);

    const popularCount = useMemo(
        () => new Map(popular.map((entry) => [String(entry.tag).toLowerCase(), entry.count])),
        [popular],
    );
    const suggested = useMemo(
        () => suggestTagsForTitle(title, popular, tags),
        [title, popular, tags],
    );
    const suggestedSet = useMemo(() => new Set(suggested), [suggested]);
    const query = input.trim().replace(/^#/, "").toLowerCase();

    const options = useMemo(() => {
        if (query) {
            const matches = popular
                .map((entry) => String(entry.tag).toLowerCase())
                .filter((tag) => tag.includes(query) && !tags.includes(tag))
                .sort((a, b) => Number(!a.startsWith(query)) - Number(!b.startsWith(query)))
                .slice(0, 7);
            const exact = matches.includes(query) || tags.includes(query);
            return exact ? matches : [...matches, `+${query}`];
        }
        const popularPicks = popular
            .map((entry) => String(entry.tag).toLowerCase())
            .filter((tag) => !tags.includes(tag) && !suggestedSet.has(tag))
            .slice(0, 10);
        return [...suggested, ...popularPicks];
    }, [query, popular, tags, suggested, suggestedSet]);

    const full = tags.length >= MAX_TAGS;
    const open = focused && !full && !disabled && options.length > 0;

    useEffect(() => setActive(-1), [query, focused]);

    const add = (raw) => {
        const tag = String(raw).replace(/^\+/, "").trim();
        if (!tag) return;
        if (onAdd(tag) !== false) setInput("");
        inputRef.current?.focus();
    };

    const onKeyDown = (event) => {
        if (event.key === "ArrowDown" && open) {
            event.preventDefault();
            setActive((i) => (i + 1) % options.length);
        } else if (event.key === "ArrowUp" && open) {
            event.preventDefault();
            setActive((i) => (i <= 0 ? options.length - 1 : i - 1));
        } else if (event.key === "Enter" || event.key === ",") {
            event.preventDefault();
            if (active >= 0 && options[active]) add(options[active]);
            else if (query) add(query);
        } else if (event.key === "Backspace" && !input && tags.length) {
            onRemove(tags[tags.length - 1]);
        } else if (event.key === "Escape") {
            inputRef.current?.blur();
        }
    };

    const styleFor = (tag) =>
        popularCount.has(tag) ? POPULAR : suggestedSet.has(tag) ? SUGGESTED : CUSTOM;

    return (
        <div className="relative mt-3" data-tag-composer>
            <div
                className="flex flex-wrap items-center gap-2 rounded-xl border px-2.5 py-2 transition-colors"
                style={{
                    borderColor: focused ? "color-mix(in srgb, var(--accent) 45%, var(--border-default))" : "transparent",
                    background: focused ? "var(--bg-surface)" : "transparent",
                }}
                onClick={() => inputRef.current?.focus()}
            >
                <ion-icon name="pricetags-outline" style={{ fontSize: "15px", color: "var(--text-faint)" }} />
                {tags.map((tag) => {
                    const style = styleFor(tag);
                    const count = popularCount.get(tag);
                    return (
                        <span
                            key={tag}
                            className="lix-tag-chip flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[13px] font-medium"
                            style={{ background: style.background, borderColor: style.border, color: style.color }}
                            title={count ? `Popular topic · ${count} ${count === 1 ? "story" : "stories"}` : "New topic"}
                        >
                            {count ? <ion-icon name="flame-outline" style={{ fontSize: "12px" }} /> : null}#{tag}
                            {!disabled && (
                                <button
                                    type="button"
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        onRemove(tag);
                                    }}
                                    className="ml-0.5 rounded-full px-1 leading-none opacity-60 hover:opacity-100"
                                    aria-label={`Remove topic ${tag}`}
                                >
                                    ×
                                </button>
                            )}
                        </span>
                    );
                })}
                {!full && !disabled && (
                    <input
                        id="lix-topic-input"
                        ref={inputRef}
                        value={input}
                        onChange={(event) => setInput(event.target.value)}
                        onKeyDown={onKeyDown}
                        onFocus={() => {
                            clearTimeout(blurTimer.current);
                            setFocused(true);
                        }}
                        onBlur={() => {
                            blurTimer.current = setTimeout(() => setFocused(false), 120);
                        }}
                        placeholder={tags.length ? "Add another topic…" : "Add topics so readers can find your story…"}
                        className="min-w-[180px] flex-1 bg-transparent py-0.5 text-[14px] text-[var(--text-primary)] outline-none placeholder-[var(--text-faint)]"
                        role="combobox"
                        aria-expanded={open}
                        aria-controls="lix-topic-options"
                        aria-autocomplete="list"
                        aria-activedescendant={active >= 0 ? `lix-topic-${active}` : undefined}
                    />
                )}
                <span className="ml-auto text-[11px] tabular-nums text-[var(--text-faint)]">
                    {tags.length}/{MAX_TAGS}
                </span>
            </div>

            {open && (
                <div
                    id="lix-topic-options"
                    role="listbox"
                    className="lix-tag-menu absolute left-0 right-0 top-full z-40 mt-1.5 rounded-xl border p-2 shadow-xl"
                    style={{ background: "var(--dropdown-bg)", borderColor: "var(--dropdown-border)" }}
                    onMouseDown={(event) => event.preventDefault()}
                >
                    {!query && suggested.length > 0 && (
                        <p className="px-1.5 pb-1 text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: SUGGESTED.color }}>
                            Suggested for this story
                        </p>
                    )}
                    <div className="flex flex-wrap gap-1.5">
                        {options.map((option, index) => {
                            const isCreate = option.startsWith("+");
                            const tag = isCreate ? option.slice(1) : option;
                            const style = isCreate ? CUSTOM : styleFor(tag);
                            const count = popularCount.get(tag);
                            const showPopularLabel = !query && index === suggested.length && suggested.length > 0;
                            return (
                                <span key={option} className="contents">
                                    {showPopularLabel && (
                                        <p className="w-full px-1.5 pb-0.5 pt-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
                                            Popular topics
                                        </p>
                                    )}
                                    <button
                                        type="button"
                                        id={`lix-topic-${index}`}
                                        role="option"
                                        aria-selected={index === active}
                                        onClick={() => add(option)}
                                        className="flex items-center gap-1 rounded-full border px-2.5 py-1 text-[12.5px] font-medium transition-transform hover:-translate-y-0.5"
                                        style={{
                                            background: style.background,
                                            borderColor: index === active ? "var(--accent)" : style.border,
                                            color: style.color,
                                            borderStyle: isCreate ? "dashed" : "solid",
                                        }}
                                    >
                                        {isCreate ? (
                                            <>Create #{tag}</>
                                        ) : (
                                            <>
                                                {count ? <ion-icon name="flame-outline" style={{ fontSize: "12px" }} /> : null}#{tag}
                                                {count ? <span className="opacity-60">{count}</span> : null}
                                            </>
                                        )}
                                    </button>
                                </span>
                            );
                        })}
                    </div>
                    <p className="mt-2 px-1.5 text-[11px] text-[var(--text-faint)]">
                        <span style={{ color: "var(--accent)" }}>●</span> popular ·{" "}
                        <span style={{ color: SUGGESTED.color }}>●</span> suggested by your title · Enter to add
                    </p>
                </div>
            )}
            <style jsx>{`
                .lix-tag-chip { animation: lix-tag-in 180ms ease-out; }
                .lix-tag-menu { animation: lix-tag-menu-in 140ms ease-out; }
                @keyframes lix-tag-in { from { opacity: 0; transform: scale(0.9); } }
                @keyframes lix-tag-menu-in { from { opacity: 0; transform: translateY(-4px); } }
                @media (prefers-reduced-motion: reduce) {
                    .lix-tag-chip, .lix-tag-menu { animation: none; }
                }
            `}</style>
        </div>
    );
}
