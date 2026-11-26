// Helpers for the post-publish share modal (src/components/PublishedShareModal.jsx).

/**
 * Read ?published=new|updated once and strip it from the address bar, so a
 * refresh or a copied link never reopens the modal. Other query params and
 * the hash are preserved.
 */
export function readPublishedFlag() {
    if (typeof window === "undefined") return null;
    const params = new URLSearchParams(window.location.search);
    const flag = params.get("published");
    if (flag !== "new" && flag !== "updated") return null;
    params.delete("published");
    const query = params.toString();
    window.history.replaceState(
        window.history.state,
        "",
        `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`,
    );
    return flag;
}

export function shareTargets(url, title) {
    const u = encodeURIComponent(url);
    const t = encodeURIComponent(title || "A story on LixBlogs");
    return [
        { name: "X", mark: "x", href: `https://x.com/intent/post?url=${u}&text=${t}` },
        { name: "LinkedIn", icon: "logo-linkedin", href: `https://www.linkedin.com/sharing/share-offsite/?url=${u}` },
        { name: "Reddit", icon: "logo-reddit", href: `https://www.reddit.com/submit?url=${u}&title=${t}` },
        { name: "Hacker News", mark: "hn", href: `https://news.ycombinator.com/submitlink?u=${u}&t=${t}` },
        { name: "Facebook", icon: "logo-facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${u}` },
        { name: "WhatsApp", icon: "logo-whatsapp", href: `https://wa.me/?text=${t}%20${u}` },
        { name: "Email", icon: "mail-outline", href: `mailto:?subject=${t}&body=${u}` },
    ];
}
