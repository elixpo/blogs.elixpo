'use client';

import { use } from 'react';

// Handles:
//   /@username/[slug]              -> personal blog
//   /@orgname/[slug]               -> org blog (direct)
//   /@orgname/[collection]/[slug]  -> org blog in collection
//   /[slugid]                      -> short link (redirect or render)

export default function BlogReader({ params }) {
  const { path } = use(params);

  // Parse the path segments
  // path = ['@username', 'my-blog-slug'] or ['@org', 'collection', 'slug'] or ['abc123']
  if (!path || path.length === 0) {
    return <div>Not found</div>;
  }

  const first = path[0];
  const isHandle = first.startsWith('@');

  let handle = null;
  let collection = null;
  let slug = null;
  let slugid = null;

  if (isHandle) {
    handle = first.slice(1); // remove @
    if (path.length === 2) {
      // /@handle/slug (personal or direct org blog)
      slug = path[1];
    } else if (path.length === 3) {
      // /@handle/collection/slug
      collection = path[1];
      slug = path[2];
    }
  } else if (path.length === 1) {
    // /[slugid] short link
    slugid = first;
  }

  // TODO: fetch blog data from API based on handle/slug/collection/slugid
  // For now, render a placeholder
  return (
    <div className="min-h-screen bg-[#030712] text-white flex items-center justify-center">
      <div className="text-center">
        <p className="text-[#888] text-sm">
          {isHandle && (
            <>
              <span className="text-[#7ba8f0]">@{handle}</span>
              {collection && <span> / {collection}</span>}
              {slug && <span> / {slug}</span>}
            </>
          )}
          {slugid && (
            <span>Short link: <span className="text-[#7ba8f0]">{slugid}</span></span>
          )}
        </p>
        <p className="text-[#555] text-xs mt-2">Blog reader coming soon</p>
      </div>
    </div>
  );
}
