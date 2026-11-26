// Search for the editor's keyboard-shortcuts modal.

/** Groups whose shortcuts match the query (by description or key). */
export function filterShortcutGroups(groups, query) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return groups;
  return groups
    .map((group) => ({
      ...group,
      shortcuts: group.shortcuts.filter((s) =>
        s.desc.toLowerCase().includes(q) || s.keys.some((key) => String(key).toLowerCase() === q),
      ),
    }))
    .filter((group) => group.shortcuts.length > 0);
}
