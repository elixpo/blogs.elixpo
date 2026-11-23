export async function invalidateBlogLifecycleCaches(blogId, author = null) {
  try {
    const { kvInvalidate, PUBLIC_SITEMAP_CACHE_KEY } = await import('../../cache');
    let contributionKeys = [];
    if (author?.username) {
      const name = String(author.username).toLowerCase();
      contributionKeys.push(`v1:contributions:${name}:UTC`);
      if (author.timezone) contributionKeys.push(`v1:contributions:${name}:${author.timezone}`);
    }
    await kvInvalidate(
      PUBLIC_SITEMAP_CACHE_KEY,
      'v1:tags:popular:v2:30',
      'v1:tags:popular:v2:12',
      'v1:trending:3',
      'v1:trending:5',
      'v1:trending:10',
      'v1:feed:anon:trending:p1',
      `v1:interactions:${blogId}`,
      ...contributionKeys,
    );
  } catch (error) {
    console.error('[api/v1/blogs] cache invalidation failed:', error?.message || error);
  }
}
