import { setupDevPlatform } from '@cloudflare/next-on-pages/next-dev';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable pages directory — src/pages/ contains page components, not routes
  pageExtensions: ['page.tsx', 'page.ts', 'page.jsx', 'page.js'],
};

if (process.env.NODE_ENV === 'development') {
  await setupDevPlatform();
}

export default nextConfig;
