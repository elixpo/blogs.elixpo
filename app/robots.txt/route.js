export const runtime = 'edge';

export async function GET() {
  const robots = `User-agent: *
Allow: /
Disallow: /api/
Disallow: /edit/
Disallow: /new-blog
Disallow: /intro
Disallow: /settings
Disallow: /callback

Sitemap: https://blogs.elixpo.com/sitemap.xml
`;

  return new Response(robots, {
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
