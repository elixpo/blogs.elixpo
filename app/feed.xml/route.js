export const runtime = 'edge';
import { getDB } from '../../lib/cloudflare';

export async function GET() {
  try {
    const db = getDB();
    
    // Fetch latest published blogs for RSS
    const blogs = await db.prepare(`
      SELECT b.slug, b.title, b.subtitle, b.excerpt, b.published_at, u.username, u.display_name, b.published_as
      FROM blogs b
      JOIN users u ON b.author_id = u.id
      WHERE b.status = 'published'
      ORDER BY b.published_at DESC
      LIMIT 100
    `).all();

    // Fetch orgs to map org slugs for blogs published under orgs
    const orgs = await db.prepare(`SELECT id, slug, name FROM orgs LIMIT 1000`).all();
    const orgMap = {};
    for (const o of orgs?.results || []) {
      orgMap[o.id] = { slug: o.slug, name: o.name };
    }

    const baseUrl = 'https://blogs.elixpo.com';
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>LixBlogs — The Best Blogs Website</title>
    <description>Discover stories, ideas, and expertise from writers on any topic.</description>
    <link>${baseUrl}</link>
    <atom:link href="${baseUrl}/feed.xml" rel="self" type="application/rss+xml"/>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
`;

    for (const blog of (blogs?.results || [])) {
      if (blog.username === 'selenium-cutlet') continue;
      
      let authorSegment = blog.username;
      let authorName = blog.display_name || blog.username;
      
      if (blog.published_as?.startsWith('org:')) {
        const orgId = blog.published_as.replace('org:', '');
        if (orgMap[orgId]) {
          authorSegment = orgMap[orgId].slug;
          authorName = orgMap[orgId].name;
        }
      }
      
      const postUrl = `${baseUrl}/${authorSegment}/${blog.slug}`;
      const pubDate = new Date(blog.published_at * 1000).toUTCString();
      
      xml += `    <item>
      <title><![CDATA[${blog.title || 'Untitled'}]]></title>
      <link>${postUrl}</link>
      <guid>${postUrl}</guid>
      <pubDate>${pubDate}</pubDate>
      <dc:creator xmlns:dc="http://purl.org/dc/elements/1.1/"><![CDATA[${authorName}]]></dc:creator>
      <description><![CDATA[${blog.excerpt || blog.subtitle || ''}]]></description>
    </item>\n`;
    }

    xml += `  </channel>\n</rss>`;

    return new Response(xml, {
      headers: {
        'Content-Type': 'application/rss+xml',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    console.error('RSS generation error:', error);
    return new Response(`<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>LixBlogs</title></channel></rss>`, { 
      headers: { 'Content-Type': 'application/rss+xml' } 
    });
  }
}
