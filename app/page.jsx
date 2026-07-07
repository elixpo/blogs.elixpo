import App from '../src/index';

export const metadata = {
  title: 'LixBlogs — The Best Blogs Website & Blogging Platform',
  description: 'Discover stories, ideas, and expertise from writers on any topic. The best blogs website and modern blogging platform with AI tools.',
};

export default function Home() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'LixBlogs',
    alternateName: ['Lix Blogs', 'elixpo blogs'],
    url: 'https://blogs.elixpo.com',
    description: 'The best blogs website and modern blogging platform with AI tools.',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: 'https://blogs.elixpo.com/search?q={search_term_string}',
      },
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <App />
    </>
  );
}
