import App from '../src/index';
import { listPublicStories } from '../lib/publicDiscovery';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export const metadata = {
  // Absolute: this is the landing page, so it carries the full brand statement and
  // must not pick up the "%s | LixBlogs" template on top of it.
  title: { absolute: 'LixBlogs: Open-source blogging and publishing platform' },
  description:
    'Read stories, technical tutorials and ideas from independent writers on LixBlogs, or create and automate your own publication from the web, CLI or API.',
  alternates: { canonical: 'https://blogs.elixpo.com' },
};

export default async function Home() {
  const discovery = await listPublicStories({ page: 1, pageSize: 12 }).catch(() => ({ stories: [] }));
  return <App initialPosts={discovery.stories || []} />;
}
