"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { STAFF_ORG_ID } from "../../lib/staff";
import AppShell from "../components/AppShell";
import AuthorAttribution from "../components/AuthorAttribution";
import BlogComments from "../components/BlogComments";
import BlogDotsMenu from "../components/BlogDotsMenu";
import BlogFollowCard, { FollowToggle } from "../components/BlogFollowButtons";
import BlogInteractionBar from "../components/BlogInteractionBar";
import BlogInviteOverlay from "../components/BlogInviteOverlay";
import BlogRecommendations from "../components/BlogRecommendations";
import ContributionGraph from "../components/ContributionGraph";
import { CreatorBadgeStrip } from "../components/CreatorBadge";
import FollowListModal from "../components/FollowListModal";
import { useAuth } from "../context/AuthContext";
import { normalizeImageUrl, normalizeUrl } from "../utils/linkHelper";
import {
    generateBlogBanner,
    generateBlogThumbnail,
    generatePixelAvatar,
} from "../utils/pixelAvatar";
import "../styles/editor/editor.css";
import "../styles/katex-fonts.css";

// Mermaid and Shiki are intentionally browser-only. Pulling BlogPreview into
// the Edge bundle pushes the Cloudflare Worker beyond the free-plan limit.
const BlogPreview = dynamic(() => import("../components/Editor/BlogPreview"), {
    ssr: false,
});

function formatUtcDate(value, options = {}) {
    const date = value instanceof Date ? value : new Date(value * 1000);
    return new Intl.DateTimeFormat("en-US", {
        ...options,
        timeZone: "UTC",
    }).format(date);
}

function publicBlogHref(blog, fallbackUsername = "") {
    if (blog?.published_as?.startsWith("org:") && blog.org_slug) {
        return `/${blog.org_slug}${blog.collection_slug ? `/${blog.collection_slug}` : ""}/${blog.slug}`;
    }
    return `/${blog?.author_username || fallbackUsername}/${blog?.slug}`;
}

function StaticInline({ content = [] }) {
    if (!Array.isArray(content)) return null;
    return content.map((item, index) => {
        if (typeof item === "string") return item;
        const text = item?.text || "";
        const styles = item?.styles || {};
        let node = text;
        if (styles.bold) node = <strong>{node}</strong>;
        if (styles.italic) node = <em>{node}</em>;
        if (styles.underline) node = <u>{node}</u>;
        if (styles.strike) node = <s>{node}</s>;
        if (styles.code) node = <code>{node}</code>;
        if (item?.type === "link" && item.href) {
            const href = normalizeUrl(item.href);
            if (href)
                node = (
                    <a href={href} rel="nofollow ugc noopener noreferrer">
                        {item.content ? (
                            <StaticInline content={item.content} />
                        ) : (
                            node
                        )}
                    </a>
                );
        }
        return <span key={index}>{node}</span>;
    });
}

function StaticBlocks({ blocks = [] }) {
    return blocks.map((block, index) => {
        const key = block.id || index;
        const children = block.children?.length ? (
            <StaticBlocks blocks={block.children} />
        ) : null;
        const inline = <StaticInline content={block.content} />;
        switch (block.type) {
            case "heading": {
                const level = Math.max(
                    2,
                    Math.min(4, Number(block.props?.level) || 2),
                );
                const Heading = `h${level}`;
                return <Heading key={key}>{inline}</Heading>;
            }
            case "bulletListItem":
                return (
                    <ul key={key}>
                        <li>
                            {inline}
                            {children}
                        </li>
                    </ul>
                );
            case "numberedListItem":
                return (
                    <ol key={key}>
                        <li>
                            {inline}
                            {children}
                        </li>
                    </ol>
                );
            case "checkListItem":
                return (
                    <p key={key}>
                        □ {inline}
                        {children}
                    </p>
                );
            case "quote":
                return (
                    <blockquote key={key}>
                        {inline}
                        {children}
                    </blockquote>
                );
            case "codeBlock":
                return (
                    <pre key={key}>
                        <code>
                            {(block.content || [])
                                .map((item) => item.text || "")
                                .join("")}
                        </code>
                    </pre>
                );
            case "image": {
                const src = normalizeImageUrl(block.props?.url);
                return src ? (
                    <figure key={key}>
                        <img
                            src={src}
                            alt={block.props.caption || block.props.name || ""}
                            loading="lazy"
                        />
                        {block.props.caption && (
                            <figcaption>{block.props.caption}</figcaption>
                        )}
                    </figure>
                ) : null;
            }
            case "mermaidBlock":
                return (
                    <pre key={key}>
                        <code>{block.props?.diagram || ""}</code>
                    </pre>
                );
            case "blockEquation":
                return <p key={key}>{block.props?.latex || ""}</p>;
            default:
                return (
                    <p key={key}>
                        {inline}
                        {children}
                    </p>
                );
        }
    });
}

function CrawlableArticle({ blog, blocks, owner }) {
    const cover =
        blog.cover_image_r2_key || generateBlogBanner(blog.id || blog.slug);
    const author = blog.secret
        ? "Anonymous"
        : blog.author_name || blog.author_username || owner?.name || "LixBlogs";
    return (
        <article
            className="blog-preview"
            itemScope
            itemType="https://schema.org/BlogPosting"
        >
            {cover && (
                <img
                    src={cover}
                    alt={blog.title ? `${blog.title} cover` : "Blog cover"}
                    className="w-full max-h-[420px] object-cover rounded-xl mb-10"
                    itemProp="image"
                />
            )}
            <header className="mb-10">
                {blog.page_emoji && (
                    <p className="text-5xl mb-5" aria-hidden="true">
                        {blog.page_emoji}
                    </p>
                )}
                <h1
                    className="text-4xl sm:text-5xl font-bold leading-tight"
                    itemProp="headline"
                >
                    {blog.title || "Untitled"}
                </h1>
                {blog.subtitle && (
                    <p
                        className="text-xl mt-4"
                        style={{ color: "var(--text-muted)" }}
                        itemProp="description"
                    >
                        {blog.subtitle}
                    </p>
                )}
                <p
                    className="mt-5 text-sm"
                    style={{ color: "var(--text-faint)" }}
                >
                    By <span itemProp="author">{author}</span>
                    {blog.published_at
                        ? ` · ${formatUtcDate(blog.published_at, { year: "numeric", month: "short", day: "numeric" })}`
                        : ""}
                </p>
                {!!blog.tags?.length && (
                    <p
                        className="mt-3 flex flex-wrap items-center gap-2 text-sm"
                        style={{ color: "var(--text-faint)" }}
                    >
                        <span>Topics:</span>
                        {blog.tags.map((tag) => (
                            <Link
                                key={tag}
                                href={`/tag/${encodeURIComponent(tag)}`}
                                rel="tag"
                                className="hover:text-[#9b7bf7]"
                            >
                                #{tag}
                            </Link>
                        ))}
                    </p>
                )}
            </header>
            <div
                className="blog-preview-content max-w-none"
                itemProp="articleBody"
            >
                <StaticBlocks blocks={blocks} />
            </div>
        </article>
    );
}

function FollowButton({ username }) {
    const { user: currentUser } = useAuth();
    const [following, setFollowing] = useState(false);
    const [isSelf, setIsSelf] = useState(false);

    useEffect(() => {
        if (!currentUser) return;
        let active = true;
        fetch(`/api/users/${encodeURIComponent(username)}/follow`)
            .then((r) => r.json())
            .then((d) => {
                if (active) {
                    setFollowing(!!d.following);
                    setIsSelf(!!d.self);
                }
            })
            .catch(() => {});
        return () => {
            active = false;
        };
    }, [username, currentUser]);

    if (isSelf) return null;

    const toggle = () => {
        // Not signed in → send to sign-in, then back here to follow.
        if (!currentUser) {
            const next =
                typeof window !== "undefined"
                    ? window.location.pathname
                    : `/${username}`;
            window.location.href = `/sign-in?next=${encodeURIComponent(next)}`;
            return;
        }
        // Optimistic: flip instantly, write in the background, revert on failure.
        const wasFollowing = following;
        setFollowing(!wasFollowing);
        fetch(`/api/users/${encodeURIComponent(username)}/follow`, {
            method: wasFollowing ? "DELETE" : "POST",
        })
            .then((r) => (r.ok ? r.json() : Promise.reject()))
            .then((d) => setFollowing(!!d.following))
            .catch(() => setFollowing(wasFollowing));
    };

    return (
        <button
            onClick={toggle}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[13px] font-semibold transition-all shrink-0 disabled:opacity-60 ${
                following
                    ? "bg-[var(--bg-surface)] border border-[var(--border-default)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[#9b7bf7]/50"
                    : "bg-[#9b7bf7] text-white hover:bg-[#8b6ae6]"
            }`}
        >
            <ion-icon
                name={following ? "checkmark-outline" : "add-outline"}
                style={{ fontSize: "15px" }}
            />
            {following ? "Following" : "Follow"}
        </button>
    );
}

const FILTER_TABS = [
    { key: "all", label: "All", icon: "grid-outline" },
    { key: "newest", label: "Newest", icon: "time-outline" },
    { key: "popular", label: "Popular", icon: "flame-outline" },
    { key: "oldest", label: "Oldest", icon: "hourglass-outline" },
    { key: "collections", label: "Collections", icon: "folder-outline" },
    { key: "coauthored", label: "Co-authored", icon: "people-outline" },
];

function ProfileContent({ username, initialBlogs, tags, timezone }) {
    // Read initial filter from URL
    const getInitialFilter = () => {
        if (typeof window === "undefined") return "all";
        const params = new URLSearchParams(window.location.search);
        return params.get("filter") || "all";
    };
    const getInitialQuery = () => {
        if (typeof window === "undefined") return "";
        const params = new URLSearchParams(window.location.search);
        return params.get("q") || "";
    };
    const getInitialTag = () => {
        if (typeof window === "undefined") return "";
        const params = new URLSearchParams(window.location.search);
        return params.get("tag") || "";
    };

    const [filter, setFilter] = useState(getInitialFilter);
    const [searchQuery, setSearchQuery] = useState(getInitialQuery);
    const [activeTag, setActiveTag] = useState(getInitialTag);
    const [posts, setPosts] = useState(initialBlogs || []);
    const [cursor, setCursor] = useState(null);
    const [hasMore, setHasMore] = useState(false);
    const [loading, setLoading] = useState(false);
    const [initialLoad, setInitialLoad] = useState(false);

    // Update URL without reload
    const updateUrl = useCallback(
        (f, q, t) => {
            if (typeof window === "undefined") return;
            const params = new URLSearchParams();
            if (f && f !== "all") params.set("filter", f);
            if (q) params.set("q", q);
            if (t) params.set("tag", t);
            const qs = params.toString();
            const newUrl = `/${username}${qs ? `?${qs}` : ""}`;
            window.history.replaceState(null, "", newUrl);
        },
        [username],
    );

    // Fetch posts from API
    const fetchPosts = useCallback(
        async (f, q, t, c) => {
            setLoading(true);
            try {
                const params = new URLSearchParams({ filter: f, limit: "10" });
                if (q) params.set("q", q);
                if (t) params.set("tag", t);
                if (c) params.set("cursor", c);
                const res = await fetch(
                    `/api/users/${encodeURIComponent(username)}/posts?${params}`,
                );
                if (!res.ok) throw new Error("Failed to load");
                const data = await res.json();
                if (c) {
                    setPosts((prev) => [...prev, ...(data.posts || [])]);
                } else {
                    setPosts(data.posts || []);
                }
                setCursor(data.nextCursor || null);
                setHasMore(!!data.hasMore);
            } catch {
                if (!c) setPosts([]);
            } finally {
                setLoading(false);
            }
        },
        [username],
    );

    // On filter/search/tag change, refetch
    useEffect(() => {
        // Don't fetch on initial mount if we have initialBlogs and default filter
        if (
            !initialLoad &&
            filter === "all" &&
            !searchQuery &&
            !activeTag &&
            initialBlogs.length > 0
        ) {
            setInitialLoad(true);
            return;
        }
        setInitialLoad(true);
        fetchPosts(filter, searchQuery, activeTag, null);
        updateUrl(filter, searchQuery, activeTag);
    }, [
        filter,
        searchQuery,
        activeTag,
        fetchPosts,
        updateUrl,
        initialLoad,
        initialBlogs.length,
    ]);

    const handleFilterChange = (f) => {
        setFilter(f);
        setSearchQuery("");
        setActiveTag("");
    };

    const handleSearch = (e) => {
        e.preventDefault();
        // searchQuery state already triggers the effect
    };

    const handleTagClick = (tag) => {
        setActiveTag(activeTag === tag ? "" : tag);
    };

    const loadMore = () => {
        if (cursor && !loading) {
            fetchPosts(filter, searchQuery, activeTag, cursor);
        }
    };

    // Top picks = first 3 posts from initial data
    const topPicks = (initialBlogs || []).slice(0, 3);

    return (
        <div className="flex flex-col lg:flex-row gap-8">
            {/* ── Main column: filters + post feed ── */}
            <div className="flex-1 min-w-0">
                {/* Filter tabs */}
                <div
                    className="flex items-center gap-1 mb-4 overflow-x-auto pb-1"
                    role="tablist"
                    aria-label="Post filters"
                >
                    {FILTER_TABS.map((tab) => (
                        <button
                            key={tab.key}
                            role="tab"
                            aria-selected={filter === tab.key}
                            aria-label={`Filter: ${tab.label}`}
                            onClick={() => handleFilterChange(tab.key)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all whitespace-nowrap shrink-0 ${
                                filter === tab.key
                                    ? "bg-[#9b7bf7]/15 text-[#9b7bf7] border border-[#9b7bf7]/30"
                                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]"
                            }`}
                        >
                            <ion-icon
                                name={tab.icon}
                                style={{ fontSize: "14px" }}
                            />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Search bar */}
                <form onSubmit={handleSearch} className="mb-5">
                    <div className="relative">
                        <ion-icon
                            name="search-outline"
                            style={{
                                fontSize: "15px",
                                position: "absolute",
                                left: "12px",
                                top: "50%",
                                transform: "translateY(-50%)",
                                color: "var(--text-faint)",
                            }}
                        />
                        <input
                            type="search"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search posts..."
                            aria-label="Search this creator's posts"
                            className="w-full bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-lg pl-9 pr-4 py-2 text-[13px] text-[var(--text-primary)] outline-none focus:border-[#9b7bf7]/50 transition-colors placeholder-[var(--text-faint)]"
                        />
                    </div>
                </form>

                {/* Active tag indicator */}
                {activeTag && (
                    <div className="flex items-center gap-2 mb-4">
                        <span className="text-[12px] text-[var(--text-muted)]">
                            Filtered by:
                        </span>
                        <button
                            onClick={() => setActiveTag("")}
                            className="flex items-center gap-1 px-2.5 py-1 bg-[#9b7bf7]/15 text-[#9b7bf7] rounded-full text-[12px] font-medium hover:bg-[#9b7bf7]/25 transition-colors"
                        >
                            #{activeTag}
                            <ion-icon
                                name="close-outline"
                                style={{ fontSize: "13px" }}
                            />
                        </button>
                    </div>
                )}

                {/* Post list */}
                {posts.length > 0 ? (
                    <div className="space-y-2.5">
                        {posts.map((b) => (
                            <Link
                                key={b.id}
                                href={publicBlogHref(b, username)}
                                className="block p-4 bg-[var(--card-bg)] border border-[var(--border-default)] rounded-xl hover:border-[#9b7bf7]/30 transition-colors group"
                            >
                                <div className="flex items-start gap-3">
                                    {b.cover_image_r2_key && (
                                        <img
                                            src={b.cover_image_r2_key}
                                            alt=""
                                            className="w-20 h-14 rounded-lg object-cover shrink-0 mt-0.5"
                                        />
                                    )}
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[15px] text-[var(--text-primary)] font-semibold group-hover:text-[#c4b5fd] transition-colors leading-snug">
                                            {b.title || "Untitled"}
                                        </p>
                                        {b.subtitle && (
                                            <p className="text-[13px] text-[var(--text-muted)] mt-1 line-clamp-1">
                                                {b.subtitle}
                                            </p>
                                        )}
                                        <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px] text-[var(--text-faint)]">
                                            {(b.tags || []).length > 0 && (
                                                <span className="text-[#9b7bf7] text-[10px] bg-[#9b7bf714] px-2 py-0.5 rounded-full font-medium">
                                                    {b.tags[0]}
                                                </span>
                                            )}
                                            {b.read_time_minutes > 0 && (
                                                <span className="flex items-center gap-1">
                                                    <ion-icon
                                                        name="time-outline"
                                                        style={{
                                                            fontSize: "12px",
                                                        }}
                                                    />
                                                    {b.read_time_minutes} min
                                                    read
                                                </span>
                                            )}
                                            {b.published_at && (
                                                <span>
                                                    {formatUtcDate(
                                                        b.published_at,
                                                        {
                                                            month: "short",
                                                            day: "numeric",
                                                            year: "numeric",
                                                        },
                                                    )}
                                                </span>
                                            )}
                                            {b.like_count > 0 && (
                                                <span>
                                                    {b.like_count} likes
                                                </span>
                                            )}
                                            {b.comment_count > 0 && (
                                                <span>
                                                    {b.comment_count} comments
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16 bg-[var(--card-bg)] border border-[var(--border-default)] rounded-xl">
                        <ion-icon
                            name="document-text-outline"
                            style={{
                                fontSize: "36px",
                                color: "var(--text-faint)",
                            }}
                        />
                        <p className="text-[var(--text-faint)] text-[14px] mt-3">
                            {searchQuery || activeTag
                                ? "No posts match this filter"
                                : "No published posts yet"}
                        </p>
                    </div>
                )}

                {/* Load more */}
                {hasMore && (
                    <div className="text-center mt-6">
                        <button
                            onClick={loadMore}
                            disabled={loading}
                            className="px-6 py-2.5 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-lg text-[13px] text-[var(--text-body)] font-medium hover:text-[var(--text-primary)] hover:border-[#9b7bf7]/50 transition-all disabled:opacity-40"
                        >
                            {loading ? "Loading..." : "Load more"}
                        </button>
                    </div>
                )}

                {loading && posts.length === 0 && (
                    <div className="space-y-3 mt-4">
                        {[1, 2, 3].map((i) => (
                            <div
                                key={i}
                                className="h-20 bg-[var(--bg-elevated)] animate-pulse rounded-xl"
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* ── Sidebar ── */}
            <aside className="w-full lg:w-[300px] lg:shrink-0 space-y-5">
                {/* Top picks */}
                {topPicks.length > 0 && (
                    <div>
                        <h3 className="text-[11px] font-semibold text-[var(--text-faint)] uppercase tracking-widest mb-3">
                            Top picks
                        </h3>
                        <div className="space-y-2">
                            {topPicks.map((b) => (
                                <Link
                                    key={b.id}
                                    href={publicBlogHref(b, username)}
                                    className="block p-3 bg-[var(--card-bg)] border border-[var(--border-default)] rounded-lg hover:border-[#9b7bf7]/30 transition-colors group"
                                >
                                    <p className="text-[13px] text-[var(--text-primary)] font-medium group-hover:text-[#c4b5fd] transition-colors leading-snug line-clamp-2">
                                        {b.title || "Untitled"}
                                    </p>
                                    <div className="flex items-center gap-2 mt-1.5 text-[10px] text-[var(--text-faint)]">
                                        {b.read_time_minutes > 0 && (
                                            <span>
                                                {b.read_time_minutes} min
                                            </span>
                                        )}
                                        {b.published_at && (
                                            <span>
                                                {formatUtcDate(b.published_at, {
                                                    month: "short",
                                                    day: "numeric",
                                                })}
                                            </span>
                                        )}
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                {/* Contribution graph */}
                <div>
                    <h3 className="text-[11px] font-semibold text-[var(--text-faint)] uppercase tracking-widest mb-3">
                        Activity
                    </h3>
                    <ContributionGraph
                        username={username}
                        timezone={timezone}
                    />
                </div>

                {/* Topic chips */}
                {tags.length > 0 && (
                    <div>
                        <h3 className="text-[11px] font-semibold text-[var(--text-faint)] uppercase tracking-widest mb-3">
                            Topics
                        </h3>
                        <div className="flex flex-wrap gap-1.5">
                            {tags.map((t) => (
                                <button
                                    key={t.tag}
                                    onClick={() => handleTagClick(t.tag)}
                                    aria-pressed={activeTag === t.tag}
                                    className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${
                                        activeTag === t.tag
                                            ? "bg-[#9b7bf7]/20 text-[#9b7bf7] border border-[#9b7bf7]/40"
                                            : "bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-transparent hover:border-[var(--border-default)]"
                                    }`}
                                >
                                    #{t.tag}{" "}
                                    <span className="text-[var(--text-faint)] ml-0.5">
                                        {t.count}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </aside>
        </div>
    );
}

export default function HandlePage(props) {
    // The invite overlay sits above the reader (mounted behind it, blurred) when
    // the URL carries ?invite=<blogId> from a collaboration invite notification.
    return (
        <>
            <HandlePageInner {...props} />
            <BlogInviteOverlay />
        </>
    );
}

function HandlePageInner({ path, initialData = null }) {
    const { user: currentUser } = useAuth();
    const [data, setData] = useState(initialData);
    const [loading, setLoading] = useState(!initialData);
    const [error, setError] = useState(null);
    const [followModal, setFollowModal] = useState(null); // 'followers' | 'following'
    const [hideHighlights, setHideHighlights] = useState(false); // strip text colors/highlights
    const [interactiveReady, setInteractiveReady] = useState(false);

    useEffect(() => setInteractiveReady(true), []);

    // Parse: path[0] = name, path[1] = slug or collection, path[2] = slug (if collection)
    // rawName keeps the original case: a 1-segment path may be a /[slugid] short link,
    // and blog ids are case-sensitive where usernames and org slugs are not.
    const rawName = path?.[0] || "";
    const name = rawName.toLowerCase();
    const second = (path?.[1] || "").toLowerCase();
    const third = (path?.[2] || "").toLowerCase();

    // If 1 segment: profile. If 2: blog or collection listing. If 3: blog in collection.
    // Special case: /<username>/reads/<list-slug> is a shared reading list.
    const isReadingList = path?.length === 3 && second === "reads";
    const isProfile = path?.length === 1;
    const slug = path?.length === 2 ? second : path?.length === 3 ? third : "";
    const collection = path?.length === 3 ? second : "";

    useEffect(() => {
        if (!name) {
            setLoading(false);
            setError("Not found");
            return;
        }

        // Public page data was rendered on the server. A member-only teaser is
        // refreshed after authentication so an entitled reader still gets the
        // complete post without sacrificing crawlable initial HTML.
        if (initialData && !(initialData.blog?.paywalled && currentUser))
            return;

        if (isReadingList) {
            fetch(
                `/api/library/public?username=${encodeURIComponent(name)}&slug=${encodeURIComponent(third)}`,
            )
                .then((r) =>
                    r.ok
                        ? r.json()
                        : r.json().then((d) => {
                              throw new Error(d.error || "Not found");
                          }),
                )
                .then((d) => setData({ type: "readingList", ...d }))
                .catch((e) => setError(e.message))
                .finally(() => setLoading(false));
            return;
        }

        const params = new URLSearchParams({ name: rawName });
        if (slug) params.set("slug", slug);
        if (collection) params.set("collection", collection);

        fetch(`/api/resolve?${params}`, { cache: "no-store" })
            .then((r) =>
                r.ok
                    ? r.json()
                    : r.json().then((d) => {
                          throw new Error(d.error || "Not found");
                      }),
            )
            .then((d) => {
                if (d?.type === "redirect" && d.location) {
                    window.location.replace(d.location);
                    return;
                }
                setData(d);
            })
            .catch((e) => setError(e.message))
            .finally(() => setLoading(false));
    }, [
        rawName,
        name,
        slug,
        collection,
        isReadingList,
        third,
        initialData,
        currentUser,
    ]);

    if (loading) {
        return (
            <AppShell>
                <div className="max-w-3xl mx-auto min-[1400px]:ml-[96px] px-6 py-10">
                    <div className="h-44 rounded-xl bg-[var(--bg-elevated)] animate-pulse mb-16" />
                    <div className="h-8 bg-[var(--bg-elevated)] animate-pulse rounded w-2/3 mb-4" />
                    <div className="h-4 bg-[var(--bg-elevated)] animate-pulse rounded w-1/3 mb-6" />
                    <div className="space-y-3">
                        {[76, 92, 68, 84].map((width, i) => (
                            <div
                                key={i}
                                className="h-4 bg-[var(--bg-elevated)] animate-pulse rounded"
                                style={{ width: `${width}%` }}
                            />
                        ))}
                    </div>
                </div>
            </AppShell>
        );
    }

    if (error || !data) {
        return (
            <AppShell>
                <div className="flex flex-col items-center justify-center min-h-[60vh] px-6">
                    <p className="text-6xl mb-4 text-[#232d3f]">404</p>
                    <p className="text-[var(--text-muted)] text-[15px] mb-6">
                        {error || "Page not found"}
                    </p>
                    <Link
                        href="/"
                        className="text-[#9b7bf7] text-[13px] hover:text-[#b69aff]"
                    >
                        Go home
                    </Link>
                </div>
            </AppShell>
        );
    }

    // ── Blog view ──
    if (data.type === "blog") {
        const blog = data.blog;
        let blocks = [];
        try {
            blocks =
                typeof blog.content === "string"
                    ? JSON.parse(blog.content)
                    : blog.content || [];
        } catch {
            blocks = [];
        }

        // Count words from blocks
        const countBlockWords = (b) =>
            (Array.isArray(b) ? b : []).reduce((sum, block) => {
                const text = (Array.isArray(block.content) ? block.content : [])
                    .map((c) => c.text || "")
                    .join(" ");
                return (
                    sum +
                    text.split(/\s+/).filter(Boolean).length +
                    countBlockWords(block.children)
                );
            }, 0);
        const wc = countBlockWords(blocks);

        // Check if current user can edit. Author always can; accepted co-authors
        // with an editor/admin role can edit the cross-posted copy too (viewers
        // get the cross-post on their profile but no edit access).
        const isAuthor = currentUser && blog.author_id === currentUser.id;
        const myCoRole = currentUser
            ? (blog.co_authors || []).find(
                  (c) => c.username === currentUser.username,
              )?.role
            : null;
        const canEdit =
            isAuthor || myCoRole === "editor" || myCoRole === "admin";

        return (
            <AppShell>
                <div className="max-w-3xl mx-auto min-[1400px]:ml-[96px] px-4 sm:px-6 py-8 w-full overflow-x-hidden">
                    {canEdit && (
                        <div className="flex items-center justify-end mb-4">
                            <Link
                                href={`/edit/${blog.slug || blog.id}`}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors"
                                style={{
                                    color: "var(--accent)",
                                    backgroundColor: "var(--accent-subtle)",
                                    border: "1px solid var(--accent)30",
                                }}
                            >
                                <ion-icon
                                    name="create-outline"
                                    style={{ fontSize: "15px" }}
                                />
                                Edit this post
                            </Link>
                        </div>
                    )}
                    {interactiveReady ? (
                        <BlogPreview
                            title={blog.title}
                            subtitle={blog.subtitle}
                            pageEmoji={blog.page_emoji}
                            tags={blog.tags || []}
                            blocks={blocks}
                            coverPreview={
                                blog.cover_image_r2_key ||
                                generateBlogBanner(blog.id || blog.slug)
                            }
                            coverPos={{
                                x: blog.cover_pos_x ?? 50,
                                y: blog.cover_pos_y ?? 50,
                            }}
                            coverZoom={blog.cover_zoom ?? 1}
                            paywalled={blog.paywalled}
                            user={{
                                username: blog.author_username,
                                display_name: blog.author_name,
                                avatar_url: blog.author_avatar,
                            }}
                            anonymous={!!blog.secret}
                            org={
                                data.owner?.type === "org"
                                    ? {
                                          name: data.owner.name,
                                          slug: data.owner.slug,
                                          logo_url:
                                              data.owner.logo_url ||
                                              data.owner.logo_r2_key,
                                      }
                                    : null
                            }
                            coAuthorCount={blog.co_author_count || 0}
                            coAuthors={blog.co_authors || []}
                            wordCount={wc}
                            readTimeMinutes={blog.read_time_minutes || 0}
                            memberOnly={!!blog.member_only}
                            featured={
                                blog.published_as === `org:${STAFF_ORG_ID}`
                            }
                            publishedAt={blog.published_at}
                            hideHighlights={hideHighlights}
                            followSlot={
                                !isAuthor ? (
                                    <>
                                        {data.owner?.type === "org" && (
                                            <FollowToggle
                                                kind="org"
                                                handle={data.owner.slug}
                                                compact
                                            />
                                        )}
                                        {blog.author_username && (
                                            <FollowToggle
                                                kind="user"
                                                handle={blog.author_username}
                                                compact
                                            />
                                        )}
                                    </>
                                ) : null
                            }
                            headerActions={
                                <BlogInteractionBar
                                    blogId={blog.id}
                                    blogAuthorId={blog.author_id}
                                    canRepost={!isAuthor && !myCoRole}
                                    dotsMenu={
                                        <BlogDotsMenu
                                            blogId={blog.id}
                                            authorId={blog.author_id}
                                            author={{
                                                username: blog.author_username,
                                                display_name: blog.author_name,
                                            }}
                                            org={
                                                data.owner?.type === "org"
                                                    ? {
                                                          slug: data.owner.slug,
                                                          name: data.owner.name,
                                                          id: data.owner.id,
                                                      }
                                                    : null
                                            }
                                            tags={blog.tags || []}
                                            hideHighlights={hideHighlights}
                                            onToggleHighlights={() =>
                                                setHideHighlights((v) => !v)
                                            }
                                            canEdit={canEdit}
                                        />
                                    }
                                />
                            }
                        />
                    ) : (
                        <CrawlableArticle
                            blog={blog}
                            blocks={blocks}
                            owner={data.owner}
                        />
                    )}

                    {/* End-of-blog follow card — author (+ org) */}
                    <BlogFollowCard
                        author={{
                            username: blog.author_username,
                            display_name: blog.author_name,
                            avatar_url: blog.author_avatar,
                        }}
                        org={
                            data.owner?.type === "org"
                                ? {
                                      slug: data.owner.slug,
                                      name: data.owner.name,
                                      logo_url:
                                          data.owner.logo_url ||
                                          data.owner.logo_r2_key,
                                  }
                                : null
                        }
                    />

                    {/* Comments section — always expanded */}
                    <BlogComments
                        blogId={blog.id}
                        blogAuthorId={blog.author_id}
                    />

                    {/* More to read — related recommendations */}
                    <BlogRecommendations blogId={blog.id} />
                </div>
            </AppShell>
        );
    }

    // ── Shared reading list ──
    if (data.type === "readingList") {
        const { owner, list, blogs = [] } = data;
        return (
            <AppShell>
                <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 w-full">
                    <div className="mb-8">
                        <div
                            className="flex items-center gap-2 text-[13px] mb-3"
                            style={{ color: "var(--text-muted)" }}
                        >
                            <Link
                                href={`/${owner.username}`}
                                className="flex items-center gap-1.5 hover:opacity-70 transition-opacity"
                            >
                                {owner.avatar_url ? (
                                    <img
                                        src={owner.avatar_url}
                                        alt=""
                                        className="h-5 w-5 rounded-full object-cover"
                                    />
                                ) : (
                                    <span
                                        className="h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                                        style={{
                                            backgroundColor:
                                                "var(--bg-elevated)",
                                        }}
                                    >
                                        {(owner.display_name ||
                                            owner.username ||
                                            "?")[0].toUpperCase()}
                                    </span>
                                )}
                                <span style={{ color: "var(--accent)" }}>
                                    {owner.display_name || owner.username}
                                </span>
                            </Link>
                            <span style={{ color: "var(--text-faint)" }}>
                                / reading list
                            </span>
                        </div>
                        <h1
                            className="text-[28px] font-extrabold tracking-tight"
                            style={{ color: "var(--text-primary)" }}
                        >
                            {list.name}
                        </h1>
                        {list.description && (
                            <p
                                className="text-[15px] mt-2 leading-relaxed"
                                style={{ color: "var(--text-muted)" }}
                            >
                                {list.description}
                            </p>
                        )}
                        <p
                            className="text-[13px] mt-3"
                            style={{ color: "var(--text-faint)" }}
                        >
                            {blogs.length} post{blogs.length !== 1 ? "s" : ""}
                        </p>
                        <div
                            style={{
                                height: "1px",
                                backgroundColor: "var(--divider)",
                                marginTop: "20px",
                            }}
                        />
                    </div>
                    {blogs.length > 0 ? (
                        <div>
                            {blogs.map((b) => (
                                <Link key={b.id} href={publicBlogHref(b)}>
                                    <article
                                        className="group flex gap-5 py-6 cursor-pointer"
                                        style={{
                                            borderBottom:
                                                "1px solid var(--divider)",
                                        }}
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div
                                                className="flex items-center gap-2 mb-1.5 text-[13px]"
                                                style={{
                                                    color: "var(--text-secondary)",
                                                }}
                                            >
                                                {b.author_avatar ? (
                                                    <img
                                                        src={b.author_avatar}
                                                        alt=""
                                                        className="h-5 w-5 rounded-full object-cover"
                                                    />
                                                ) : (
                                                    <span
                                                        className="h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-bold"
                                                        style={{
                                                            backgroundColor:
                                                                "var(--bg-elevated)",
                                                        }}
                                                    >
                                                        {(b.author_name ||
                                                            b.author_username ||
                                                            "?")[0].toUpperCase()}
                                                    </span>
                                                )}
                                                <span>
                                                    {b.author_name ||
                                                        b.author_username}
                                                </span>
                                            </div>
                                            <h2
                                                className="text-[19px] font-extrabold leading-[1.3] mb-1 group-hover:opacity-80 transition-opacity"
                                                style={{
                                                    color: "var(--text-primary)",
                                                    fontFamily:
                                                        "'Source Serif 4', Georgia, serif",
                                                }}
                                            >
                                                {b.title || "Untitled"}
                                            </h2>
                                            {(b.subtitle || b.excerpt) && (
                                                <p
                                                    className="text-[14px] leading-[1.5] line-clamp-2"
                                                    style={{
                                                        color: "var(--text-faint)",
                                                    }}
                                                >
                                                    {b.subtitle || b.excerpt}
                                                </p>
                                            )}
                                            {b.read_time_minutes > 0 && (
                                                <p
                                                    className="text-[12px] mt-2"
                                                    style={{
                                                        color: "var(--text-faint)",
                                                    }}
                                                >
                                                    {b.read_time_minutes} min
                                                    read
                                                </p>
                                            )}
                                        </div>
                                        <img
                                            src={
                                                b.cover_image_r2_key ||
                                                generateBlogThumbnail(
                                                    b.id || b.slug,
                                                )
                                            }
                                            alt=""
                                            className="w-[100px] h-[100px] rounded-md object-cover flex-shrink-0 self-center hidden sm:block"
                                            style={{
                                                backgroundColor:
                                                    "var(--bg-elevated)",
                                            }}
                                        />
                                    </article>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-20">
                            <ion-icon
                                name="bookmark-outline"
                                style={{
                                    fontSize: "40px",
                                    color: "var(--text-faint)",
                                }}
                            />
                            <p
                                className="text-[15px] mt-4"
                                style={{ color: "var(--text-muted)" }}
                            >
                                This reading list is empty.
                            </p>
                        </div>
                    )}
                </div>
            </AppShell>
        );
    }

    // ── Collection listing ──
    if (data.type === "collection") {
        const org = data.owner;
        const col = data.collection;
        const blogs = data.blogs || [];

        return (
            <AppShell>
                <div className="max-w-3xl mx-auto px-6 py-8">
                    {/* Collection header */}
                    <div className="mb-8">
                        <div
                            className="flex items-center gap-2 text-[13px] mb-3"
                            style={{ color: "var(--text-muted)" }}
                        >
                            <Link
                                href={`/${org.slug}`}
                                className="hover:opacity-70 transition-opacity"
                                style={{ color: "var(--accent)" }}
                            >
                                {org.name}
                            </Link>
                            <span style={{ color: "var(--text-faint)" }}>
                                /
                            </span>
                            <span style={{ color: "var(--text-secondary)" }}>
                                {col.name}
                            </span>
                        </div>
                        <h1
                            className="text-[28px] font-extrabold tracking-tight"
                            style={{ color: "var(--text-primary)" }}
                        >
                            {col.name}
                        </h1>
                        {col.description && (
                            <p
                                className="text-[15px] mt-2 leading-relaxed"
                                style={{ color: "var(--text-muted)" }}
                            >
                                {col.description}
                            </p>
                        )}
                        <p
                            className="text-[13px] mt-3"
                            style={{ color: "var(--text-faint)" }}
                        >
                            {blogs.length} post{blogs.length !== 1 ? "s" : ""}{" "}
                            in this collection
                        </p>
                        <div
                            style={{
                                height: "1px",
                                backgroundColor: "var(--divider)",
                                marginTop: "20px",
                            }}
                        />
                    </div>

                    {/* Blog list — feed-style cards */}
                    {blogs.length > 0 ? (
                        <div>
                            {blogs.map((b) => (
                                <Link
                                    key={b.id}
                                    href={`/${org.slug}/${col.slug}/${b.slug}`}
                                >
                                    <article
                                        className="group py-6 cursor-pointer"
                                        style={{
                                            borderBottom:
                                                "1px solid var(--divider)",
                                        }}
                                    >
                                        <div className="mb-2.5">
                                            <AuthorAttribution
                                                org={{
                                                    name: org.name,
                                                    slug: org.slug,
                                                    logo_url: org.logo_r2_key,
                                                }}
                                                authors={[
                                                    {
                                                        name: b.author_name,
                                                        username:
                                                            b.author_username,
                                                        avatar_url:
                                                            b.author_avatar,
                                                    },
                                                    ...(b.co_authors || []).map(
                                                        (ca) => ({
                                                            name: ca.display_name,
                                                            username:
                                                                ca.username,
                                                            avatar_url:
                                                                ca.avatar_url,
                                                        }),
                                                    ),
                                                ]}
                                                size="sm"
                                            />
                                        </div>
                                        <div className="flex gap-6">
                                            <div className="flex-1 min-w-0">
                                                <h2
                                                    className="text-[19px] font-bold leading-[1.3] mb-1.5 group-hover:opacity-75 transition-opacity font-serif"
                                                    style={{
                                                        color: "var(--text-primary)",
                                                    }}
                                                >
                                                    {b.title || "Untitled"}
                                                </h2>
                                                {b.subtitle && (
                                                    <p
                                                        className="text-[15px] leading-[1.5] line-clamp-2 mb-3"
                                                        style={{
                                                            color: "var(--text-muted)",
                                                        }}
                                                    >
                                                        {b.subtitle}
                                                    </p>
                                                )}
                                                <div
                                                    className="flex items-center gap-3.5 text-[12px]"
                                                    style={{
                                                        color: "var(--text-faint)",
                                                    }}
                                                >
                                                    {(b.tags || []).length >
                                                        0 && (
                                                        <span className="text-[#9b7bf7] text-[11px] bg-[#9b7bf714] px-2.5 py-0.5 rounded-full font-medium">
                                                            {b.tags[0]}
                                                        </span>
                                                    )}
                                                    {b.published_at && (
                                                        <span>
                                                            {formatUtcDate(
                                                                b.published_at,
                                                                {
                                                                    month: "short",
                                                                    day: "numeric",
                                                                },
                                                            )}
                                                        </span>
                                                    )}
                                                    {b.read_time_minutes >
                                                        0 && (
                                                        <span>
                                                            {
                                                                b.read_time_minutes
                                                            }{" "}
                                                            min read
                                                        </span>
                                                    )}
                                                    {b.like_count > 0 && (
                                                        <span>
                                                            {b.like_count} likes
                                                        </span>
                                                    )}
                                                    {b.comment_count > 0 && (
                                                        <span>
                                                            {b.comment_count}{" "}
                                                            comments
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <img
                                                src={
                                                    b.cover_image_r2_key ||
                                                    generateBlogThumbnail(
                                                        b.id || b.slug,
                                                    )
                                                }
                                                alt=""
                                                className="w-[100px] h-[100px] rounded-xl object-cover flex-shrink-0 hidden sm:block"
                                            />
                                        </div>
                                    </article>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-20">
                            <ion-icon
                                name="folder-open-outline"
                                style={{
                                    fontSize: "40px",
                                    color: "var(--text-faint)",
                                }}
                            />
                            <p
                                className="text-[15px] mt-4"
                                style={{ color: "var(--text-muted)" }}
                            >
                                No posts in this collection yet
                            </p>
                        </div>
                    )}
                </div>
            </AppShell>
        );
    }

    // ── User profile ──
    if (data.type === "user") {
        const u = data.user;
        const userLinks = (() => {
            try {
                return JSON.parse(u.links || "[]");
            } catch {
                return [];
            }
        })();
        const joined = u.created_at ? new Date(u.created_at * 1000) : null;
        const isOwnProfile = currentUser && currentUser.id === u.id;

        const bannerSrc = u.banner_r2_key
            ? `/api/media/${u.banner_r2_key}?v=${encodeURIComponent(u.updated_at || "")}`
            : null;

        return (
            <AppShell>
                <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
                    {/* ── Banner + Avatar ── */}
                    <div className="relative mb-16">
                        <div
                            className="w-full rounded-xl bg-[var(--bg-elevated)] overflow-hidden"
                            style={{ aspectRatio: "4 / 1" }}
                        >
                            {bannerSrc && (
                                <img
                                    src={bannerSrc}
                                    alt=""
                                    className="w-full h-full object-cover"
                                    loading="eager"
                                />
                            )}
                            {/* Gradient overlay for text contrast on banner */}
                            {bannerSrc && (
                                <div
                                    className="absolute inset-x-0 bottom-0 h-1/2 pointer-events-none rounded-b-xl"
                                    style={{
                                        background:
                                            "linear-gradient(to top, rgba(0,0,0,0.35), transparent)",
                                    }}
                                />
                            )}
                        </div>
                        {/* Avatar overlapping banner bottom */}
                        <div className="absolute -bottom-12 left-5 sm:left-6">
                            {u.avatar_url ? (
                                <img
                                    src={u.avatar_url}
                                    alt=""
                                    className="h-[88px] w-[88px] rounded-full border-4 border-[var(--bg-app)] object-cover shadow-lg shadow-black/20"
                                />
                            ) : (
                                <div className="h-[88px] w-[88px] rounded-full border-4 border-[var(--bg-app)] bg-[var(--bg-elevated)] flex items-center justify-center text-3xl text-[var(--text-muted)] font-bold shadow-lg shadow-black/20">
                                    {(u.display_name ||
                                        u.username ||
                                        "?")[0].toUpperCase()}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ── Name + Actions ── */}
                    <div className="flex items-start justify-between gap-3 mb-1">
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-3">
                                <h1 className="text-[26px] font-extrabold text-[var(--text-primary)] tracking-tight leading-tight">
                                    {u.display_name || u.username}
                                    {u.pronouns && (
                                        <span className="text-[14px] font-normal text-[var(--text-faint)] ml-2">
                                            ({u.pronouns})
                                        </span>
                                    )}
                                </h1>
                                {(u.badges || []).length > 0 && (
                                    <CreatorBadgeStrip
                                        badges={u.badges}
                                        compact
                                        showDetails={false}
                                    />
                                )}
                            </div>
                            <p className="text-[var(--text-muted)] text-[15px] mt-0.5 font-medium">
                                @{u.username}
                            </p>
                        </div>
                        {isOwnProfile ? (
                            <Link
                                href="/settings"
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-full text-[13px] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[#9b7bf7]/50 hover:bg-[#9b7bf7]/10 transition-all shrink-0"
                            >
                                <ion-icon
                                    name="create-outline"
                                    style={{ fontSize: "14px" }}
                                />
                                Edit
                            </Link>
                        ) : (
                            <FollowButton username={u.username} />
                        )}
                    </div>

                    {/* ── Bio ── */}
                    {u.bio && (
                        <p className="text-[var(--text-secondary)] text-[15px] leading-relaxed mb-4">
                            {u.bio}
                        </p>
                    )}

                    {/* ── Meta info row ── */}
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-[var(--text-muted)]">
                        {u.company && (
                            <span className="flex items-center gap-1.5">
                                <ion-icon
                                    name="business-outline"
                                    style={{ fontSize: "14px" }}
                                />
                                {u.company}
                            </span>
                        )}
                        {u.location && (
                            <span className="flex items-center gap-1.5">
                                <ion-icon
                                    name="location-outline"
                                    style={{ fontSize: "14px" }}
                                />
                                {u.location}
                            </span>
                        )}
                        {u.timezone && (
                            <span className="flex items-center gap-1.5">
                                <ion-icon
                                    name="time-outline"
                                    style={{ fontSize: "14px" }}
                                />
                                {u.timezone.replace(/_/g, " ")}
                            </span>
                        )}
                        {u.website && (
                            <a
                                href={
                                    u.website.startsWith("http")
                                        ? u.website
                                        : `https://${u.website}`
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 hover:text-[#60a5fa] transition-colors"
                            >
                                <ion-icon
                                    name="globe-outline"
                                    style={{ fontSize: "14px" }}
                                />
                                {u.website
                                    .replace(/^https?:\/\//, "")
                                    .replace(/\/$/, "")}
                            </a>
                        )}
                        {joined && (
                            <span className="flex items-center gap-1.5">
                                <ion-icon
                                    name="calendar-outline"
                                    style={{ fontSize: "14px" }}
                                />
                                Joined{" "}
                                {formatUtcDate(joined, {
                                    month: "long",
                                    year: "numeric",
                                })}
                            </span>
                        )}
                    </div>

                    {/* ── Social links ── */}
                    {userLinks.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                            {userLinks
                                .filter((l) => l.url?.trim())
                                .map((link, i) => {
                                    const iconMap = {
                                        github: "logo-github",
                                        twitter: "logo-twitter",
                                        linkedin: "logo-linkedin",
                                        mastodon: "globe-outline",
                                        website: "globe-outline",
                                    };
                                    const icon =
                                        iconMap[link.type] || "link-outline";
                                    return (
                                        <a
                                            key={i}
                                            href={link.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--card-bg)] border border-[var(--border-default)] rounded-full text-[12px] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-default)] transition-all"
                                        >
                                            <ion-icon
                                                name={icon}
                                                style={{ fontSize: "14px" }}
                                            />
                                            {link.label || link.type || "Link"}
                                        </a>
                                    );
                                })}
                        </div>
                    )}

                    {/* ── Followers / Following ── */}
                    <div className="flex items-center gap-5 text-[14px] text-[var(--text-muted)] mt-4 mb-6">
                        <button
                            onClick={() => setFollowModal("followers")}
                            className="hover:text-[var(--text-primary)] transition-colors"
                        >
                            <strong className="text-[var(--text-primary)]">
                                {u.followers}
                            </strong>{" "}
                            Followers
                        </button>
                        <button
                            onClick={() => setFollowModal("following")}
                            className="hover:text-[var(--text-primary)] transition-colors"
                        >
                            <strong className="text-[var(--text-primary)]">
                                {u.following}
                            </strong>{" "}
                            Following
                        </button>
                    </div>
                    {followModal && (
                        <FollowListModal
                            username={u.username}
                            type={followModal}
                            onClose={() => setFollowModal(null)}
                        />
                    )}

                    <div className="h-px bg-[var(--border-default)] mb-6" />

                    {/* ── Two-column content area ── */}
                    <ProfileContent
                        username={u.username}
                        initialBlogs={data.blogs || []}
                        tags={data.tags || []}
                        timezone={u.timezone}
                    />
                </div>
            </AppShell>
        );
    }

    // ── Org profile ──
    if (data.type === "org") {
        const org = data.org;
        const owner = data.owner;
        const members = data.members || [];
        const collections = data.collections || [];
        const blogs = data.blogs || [];
        const logoSrc = org.logo_url || generatePixelAvatar(org.slug);
        const links = (() => {
            try {
                return JSON.parse(org.links || "[]");
            } catch {
                return [];
            }
        })();
        const founded = org.created_at ? new Date(org.created_at * 1000) : null;

        // Check if current user can manage this org (admin or maintain role)
        const currentMember = currentUser
            ? members.find((m) => m.id === currentUser.id)
            : null;
        const canManage =
            currentMember && ["admin", "maintain"].includes(currentMember.role);

        const roleBadge = (role) => {
            const styles = {
                admin: "bg-[#9b7bf7]/15 text-[#c4b5fd] border-[#9b7bf7]/30",
                maintain: "bg-[#60a5fa]/15 text-[#93c5fd] border-[#60a5fa]/30",
                write: "bg-[#4ade80]/15 text-[#86efac] border-[#4ade80]/30",
                read: "bg-[#9ca3af]/10 text-[var(--text-muted)] border-[#9ca3af]/20",
                member: "bg-[#9ca3af]/10 text-[var(--text-muted)] border-[#9ca3af]/20",
            };
            return styles[role] || styles.member;
        };

        return (
            <AppShell>
                <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
                    {/* ── Logo + Header ── */}
                    <div className="flex items-start gap-5 mb-6">
                        <img
                            src={logoSrc}
                            alt={org.name}
                            className="h-[88px] w-[88px] rounded-2xl border-[3px] border-[var(--border-default)] object-cover shadow-lg shadow-black/20 shrink-0"
                        />
                        <div className="min-w-0 flex-1 pt-1">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <h1 className="text-[26px] font-extrabold text-[var(--text-primary)] tracking-tight leading-tight">
                                        {org.name}
                                    </h1>
                                    <p className="text-[var(--text-muted)] text-[15px] mt-0.5 font-medium">
                                        @{org.slug}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    {org.visibility === "private" && (
                                        <span className="px-2.5 py-1 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-full text-[11px] text-[var(--text-muted)] flex items-center gap-1">
                                            <ion-icon
                                                name="lock-closed"
                                                style={{ fontSize: "11px" }}
                                            />
                                            Private
                                        </span>
                                    )}
                                    {!currentMember && (
                                        <FollowToggle
                                            kind="org"
                                            handle={org.slug}
                                        />
                                    )}
                                    {canManage && (
                                        <Link
                                            href={`/settings/org/${org.slug}`}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-full text-[13px] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[#9b7bf7]/50 hover:bg-[#9b7bf7]/10 transition-all"
                                            title="Manage organization"
                                        >
                                            <ion-icon
                                                name="settings-outline"
                                                style={{ fontSize: "14px" }}
                                            />
                                            Manage
                                        </Link>
                                    )}
                                </div>
                            </div>
                            {org.website && (
                                <a
                                    href={org.website}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 mt-2 text-[13px] text-[#60a5fa] hover:text-[#93c5fd] transition-colors"
                                >
                                    <ion-icon
                                        name="globe-outline"
                                        style={{ fontSize: "13px" }}
                                    />
                                    {org.website
                                        .replace(/^https?:\/\//, "")
                                        .replace(/\/$/, "")}
                                </a>
                            )}
                        </div>
                    </div>

                    {/* ── Description / Bio ── */}
                    {(org.description || org.bio) && (
                        <div className="mt-4 space-y-1.5">
                            {org.description && (
                                <p className="text-[var(--text-secondary)] text-[15px] leading-relaxed">
                                    {org.description}
                                </p>
                            )}
                            {org.bio && org.bio !== org.description && (
                                <p className="text-[var(--text-muted)] text-[14px] leading-relaxed">
                                    {org.bio}
                                </p>
                            )}
                        </div>
                    )}

                    {/* ── Meta info row ── */}
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-5 text-[13px] text-[var(--text-muted)]">
                        {org.location && (
                            <span className="flex items-center gap-1.5">
                                <ion-icon
                                    name="location-outline"
                                    style={{ fontSize: "14px" }}
                                />
                                {org.location}
                            </span>
                        )}
                        {org.timezone && (
                            <span className="flex items-center gap-1.5">
                                <ion-icon
                                    name="time-outline"
                                    style={{ fontSize: "14px" }}
                                />
                                {org.timezone.replace(/_/g, " ")}
                            </span>
                        )}
                        {org.contact_email && (
                            <a
                                href={`mailto:${org.contact_email}`}
                                className="flex items-center gap-1.5 hover:text-[#60a5fa] transition-colors"
                            >
                                <ion-icon
                                    name="mail-outline"
                                    style={{ fontSize: "14px" }}
                                />
                                {org.contact_email}
                            </a>
                        )}
                        {founded && (
                            <span className="flex items-center gap-1.5">
                                <ion-icon
                                    name="calendar-outline"
                                    style={{ fontSize: "14px" }}
                                />
                                Founded{" "}
                                {formatUtcDate(founded, {
                                    month: "long",
                                    year: "numeric",
                                })}
                            </span>
                        )}
                        <span className="flex items-center gap-1.5">
                            <ion-icon
                                name="people-outline"
                                style={{ fontSize: "14px" }}
                            />
                            {members.length} member
                            {members.length !== 1 ? "s" : ""}
                        </span>
                        {blogs.length > 0 && (
                            <span className="flex items-center gap-1.5">
                                <ion-icon
                                    name="document-text-outline"
                                    style={{ fontSize: "14px" }}
                                />
                                {blogs.length} post
                                {blogs.length !== 1 ? "s" : ""}
                            </span>
                        )}
                        {collections.length > 0 && (
                            <span className="flex items-center gap-1.5">
                                <ion-icon
                                    name="folder-outline"
                                    style={{ fontSize: "14px" }}
                                />
                                {collections.length} collection
                                {collections.length !== 1 ? "s" : ""}
                            </span>
                        )}
                        {org.visibility === "public" && (
                            <span className="flex items-center gap-1.5">
                                <ion-icon
                                    name="earth-outline"
                                    style={{ fontSize: "14px" }}
                                />
                                Public
                            </span>
                        )}
                    </div>

                    {/* ── Social links ── */}
                    {links.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-4">
                            {links
                                .filter((l) => l.url?.trim())
                                .map((link, i) => {
                                    const iconMap = {
                                        github: "logo-github",
                                        twitter: "logo-twitter",
                                        linkedin: "logo-linkedin",
                                        discord: "logo-discord",
                                        youtube: "logo-youtube",
                                        website: "globe-outline",
                                    };
                                    const icon =
                                        iconMap[link.type] || "link-outline";
                                    return (
                                        <a
                                            key={i}
                                            href={link.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--card-bg)] border border-[var(--border-default)] rounded-full text-[12px] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-default)] transition-all"
                                        >
                                            <ion-icon
                                                name={icon}
                                                style={{ fontSize: "14px" }}
                                            />
                                            {link.label || link.type || "Link"}
                                        </a>
                                    );
                                })}
                        </div>
                    )}

                    <div className="h-px bg-[var(--border-default)] mt-7 mb-7" />

                    {/* ── Owner card ── */}
                    {owner && (
                        <div className="mb-7">
                            <h3 className="text-[11px] font-semibold text-[var(--text-faint)] uppercase tracking-widest mb-3">
                                Owned by
                            </h3>
                            <Link
                                href={`/${owner.username}`}
                                className="flex items-center gap-3.5 p-3.5 bg-[var(--card-bg)] border border-[var(--border-default)] rounded-xl hover:border-[var(--border-default)] transition-colors group"
                            >
                                {owner.avatar_url ? (
                                    <img
                                        src={owner.avatar_url}
                                        alt=""
                                        className="h-11 w-11 rounded-full object-cover ring-2 ring-[#9b7bf7]/30"
                                    />
                                ) : (
                                    <div className="h-11 w-11 rounded-full bg-[var(--bg-elevated)] flex items-center justify-center text-lg text-[var(--text-muted)] font-bold ring-2 ring-[#9b7bf7]/30">
                                        {(owner.display_name ||
                                            owner.username ||
                                            "?")[0].toUpperCase()}
                                    </div>
                                )}
                                <div className="min-w-0 flex-1">
                                    <p className="text-[15px] text-[var(--text-primary)] font-semibold group-hover:text-[#c4b5fd] transition-colors truncate">
                                        {owner.display_name || owner.username}
                                    </p>
                                    <p className="text-[13px] text-[var(--text-muted)]">
                                        @{owner.username}
                                    </p>
                                </div>
                                <span
                                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${roleBadge("admin")}`}
                                >
                                    Owner
                                </span>
                            </Link>
                        </div>
                    )}

                    {/* ── Members (excluding owner, already shown above) ── */}
                    {members.filter((m) => !owner || m.id !== owner.id).length >
                        0 && (
                        <div className="mb-7">
                            <h3 className="text-[11px] font-semibold text-[var(--text-faint)] uppercase tracking-widest mb-3">
                                Members
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                {members
                                    .filter((m) => !owner || m.id !== owner.id)
                                    .map((m) => (
                                        <Link
                                            key={m.id}
                                            href={`/${m.username}`}
                                            className="flex items-center gap-3 p-3 bg-[var(--card-bg)] border border-[var(--border-default)] rounded-xl hover:border-[var(--border-default)] transition-colors group"
                                        >
                                            {m.avatar_url ? (
                                                <img
                                                    src={m.avatar_url}
                                                    alt=""
                                                    className="h-9 w-9 rounded-full object-cover"
                                                />
                                            ) : (
                                                <div className="h-9 w-9 rounded-full bg-[var(--bg-elevated)] flex items-center justify-center text-sm text-[var(--text-muted)] font-bold">
                                                    {(m.display_name ||
                                                        m.username ||
                                                        "?")[0].toUpperCase()}
                                                </div>
                                            )}
                                            <div className="min-w-0 flex-1">
                                                <p className="text-[14px] text-[var(--text-primary)] font-medium group-hover:text-[var(--text-primary)] transition-colors truncate">
                                                    {m.display_name ||
                                                        m.username}
                                                </p>
                                                <p className="text-[12px] text-[var(--text-faint)]">
                                                    @{m.username}
                                                </p>
                                            </div>
                                            <span
                                                className={`px-2 py-0.5 rounded-full text-[10px] font-medium border capitalize ${roleBadge(m.role)}`}
                                            >
                                                {m.id === org.owner_id
                                                    ? "Owner"
                                                    : m.role}
                                            </span>
                                        </Link>
                                    ))}
                            </div>
                        </div>
                    )}

                    {/* ── Collections ── */}
                    {collections.length > 0 && (
                        <div className="mb-7">
                            <h3 className="text-[11px] font-semibold text-[var(--text-faint)] uppercase tracking-widest mb-3">
                                Collections
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                {collections.map((c) => (
                                    <Link
                                        key={c.id}
                                        href={`/${org.slug}/${c.slug}`}
                                        className="p-4 bg-[var(--card-bg)] border border-[var(--border-default)] rounded-xl hover:border-[var(--border-default)] transition-colors group"
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <div className="h-9 w-9 rounded-lg bg-[var(--bg-elevated)] flex items-center justify-center shrink-0">
                                                <ion-icon
                                                    name="folder"
                                                    style={{
                                                        fontSize: "18px",
                                                        color: "#60a5fa",
                                                    }}
                                                />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-[14px] text-[var(--text-primary)] font-medium group-hover:text-[var(--text-primary)] transition-colors truncate">
                                                    {c.name}
                                                </p>
                                                {c.description && (
                                                    <p className="text-[12px] text-[var(--text-faint)] truncate">
                                                        {c.description}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ── Published blogs ── */}
                    <div>
                        <h3 className="text-[11px] font-semibold text-[var(--text-faint)] uppercase tracking-widest mb-3">
                            Published{" "}
                            {blogs.length > 0 && (
                                <span className="text-[var(--text-muted)] ml-1">
                                    ({blogs.length})
                                </span>
                            )}
                        </h3>
                        {blogs.length > 0 ? (
                            <div className="space-y-2.5">
                                {blogs.map((b) => (
                                    <Link
                                        key={b.id}
                                        href={`/${org.slug}${b.collection_slug ? `/${b.collection_slug}` : ""}/${b.slug}`}
                                        className="block p-4 bg-[var(--card-bg)] border border-[var(--border-default)] rounded-xl hover:border-[var(--border-default)] transition-colors group"
                                    >
                                        <div className="flex items-start gap-3">
                                            {b.cover_image_r2_key && (
                                                <img
                                                    src={b.cover_image_r2_key}
                                                    alt=""
                                                    className="w-20 h-14 rounded-lg object-cover shrink-0 mt-0.5"
                                                />
                                            )}
                                            <div className="min-w-0 flex-1">
                                                <p className="text-[15px] text-[var(--text-primary)] font-semibold group-hover:text-[var(--text-primary)] transition-colors leading-snug">
                                                    {b.title || "Untitled"}
                                                </p>
                                                {b.subtitle && (
                                                    <p className="text-[13px] text-[var(--text-muted)] mt-1 line-clamp-1">
                                                        {b.subtitle}
                                                    </p>
                                                )}
                                                <div className="flex items-center gap-3 mt-2 text-[11px] text-[var(--text-faint)]">
                                                    {b.read_time_minutes >
                                                        0 && (
                                                        <span className="flex items-center gap-1">
                                                            <ion-icon
                                                                name="time-outline"
                                                                style={{
                                                                    fontSize:
                                                                        "12px",
                                                                }}
                                                            />
                                                            {
                                                                b.read_time_minutes
                                                            }{" "}
                                                            min read
                                                        </span>
                                                    )}
                                                    {b.published_at && (
                                                        <span>
                                                            {formatUtcDate(
                                                                b.published_at,
                                                                {
                                                                    month: "short",
                                                                    day: "numeric",
                                                                    year: "numeric",
                                                                },
                                                            )}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-16 bg-[var(--card-bg)] border border-[var(--border-default)] rounded-xl">
                                <ion-icon
                                    name="document-text-outline"
                                    style={{
                                        fontSize: "36px",
                                        color: "#2d3a4d",
                                    }}
                                />
                                <p className="text-[var(--text-faint)] text-[14px] mt-3">
                                    No published blogs yet
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </AppShell>
        );
    }

    return null;
}
