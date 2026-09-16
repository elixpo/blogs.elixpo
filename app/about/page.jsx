import AboutPage from '../../src/views/AboutPage';

export const metadata = {
  title: 'About',
  description: 'Learn about LixBlogs, the open-source blogging platform for independent writers, developers and teams publishing through the web, CLI or API.',
  alternates: { canonical: 'https://blogs.elixpo.com/about' },
};

export default function About() {
  return <AboutPage />;
}
