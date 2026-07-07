export const runtime = 'edge';
import { getDB } from '../../lib/cloudflare';

export async function GET() {
  try {
    const db = getDB();
    
    // Fetch up to 5000 published blogs
    const blogs = await db.prepare(`
      SELECT b.slug, u.username, b.published_as, b.updated_at
      FROM blogs b
      JOIN users u ON b.author_id = u.id
      WHERE b.status = 'published'
      ORDER BY b.published_at DESC
      LIMIT 5000
    `).all();

    // Fetch orgs to map org slugs for blogs published under orgs
    const orgs = await db.prepare(`SELECT id, slug, updated_at FROM orgs LIMIT 1000`).all();
    const orgMap = {};
    for (const o of orgs?.results || []) {
      orgMap[o.id] = o.slug;
    }

    // Fetch users for profile pages
    const users = await db.prepare(`SELECT username, updated_at FROM users LIMIT 5000`).all();

    const baseUrl = 'https://blogs.elixpo.com';
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <changefreq>always</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/about</loc>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${baseUrl}/pricing</loc>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${baseUrl}/sign-in</loc>
    <changefreq>yearly</changefreq>
    <priority>0.6</priority>
  </url>
  <url>
    <loc>${baseUrl}/sign-up</loc>
    <changefreq>yearly</changefreq>
    <priority>0.6</priority>
  </url>
`;

    // Users profile pages
    for (const user of (users?.results || [])) {
      if (user.username !== 'selenium-cutlet') {
        xml += `  <url>
    <loc>${baseUrl}/${user.username}</loc>
    <lastmod>${new Date(user.updated_at * 1000).toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>\n`;
      }
    }

    // Org profile pages
    for (const org of (orgs?.results || [])) {
      xml += `  <url>
    <loc>${baseUrl}/${org.slug}</loc>
    <lastmod>${new Date(org.updated_at * 1000).toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>\n`;
    }

    // Blogs
    for (const blog of (blogs?.results || [])) {
      if (blog.username === 'selenium-cutlet') continue;
      
      let authorSegment = blog.username;
      if (blog.published_as?.startsWith('org:')) {
        const orgId = blog.published_as.replace('org:', '');
        if (orgMap[orgId]) authorSegment = orgMap[orgId];
      }
      
      xml += `  <url>
    <loc>${baseUrl}/${authorSegment}/${blog.slug}</loc>
    <lastmod>${new Date(blog.updated_at * 1000).toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>\n`;
    }

    xml += `</urlset>`;

    return new Response(xml, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    console.error('Sitemap generation error:', error);
    // Fallback static sitemap on error
    return new Response(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://blogs.elixpo.com/</loc></url>
</urlset>`, { headers: { 'Content-Type': 'application/xml' } });
  }
}
