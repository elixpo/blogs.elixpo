// Topic suggestions for the editor's TagComposer. Pure, so it is unit-tested.

export const MAX_TAGS = 5;

const STOP_WORDS = new Set([
    "a", "an", "and", "the", "of", "to", "in", "on", "for", "with", "how", "why",
    "what", "is", "are", "my", "your", "from", "into", "by", "at", "or", "vs",
]);

function words(text) {
    return String(text || "")
        .toLowerCase()
        .split(/[^a-z0-9+#.]+/)
        .map((word) => word.replace(/^[#.]+|[.]+$/g, ""))
        .filter((word) => word && !STOP_WORDS.has(word));
}

/**
 * Popular tags whose words all appear in the title, most-used first.
 * `popular` is the /api/tags/popular shape: [{ tag, count }].
 */
export function suggestTagsForTitle(title, popular, existing = [], limit = 4) {
    const titleWords = new Set(words(title));
    if (!titleWords.size) return [];
    const taken = new Set(existing.map((tag) => String(tag).toLowerCase()));
    return (Array.isArray(popular) ? popular : [])
        .map((entry) => ({ tag: String(entry?.tag || "").toLowerCase(), count: Number(entry?.count) || 0 }))
        .filter(({ tag }) => {
            if (!tag || taken.has(tag)) return false;
            const parts = words(tag.replace(/-/g, " "));
            return parts.length > 0 && parts.every((part) => titleWords.has(part));
        })
        .sort((a, b) => b.count - a.count)
        .slice(0, limit)
        .map(({ tag }) => tag);
}
