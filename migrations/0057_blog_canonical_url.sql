-- Optional cross-post canonical: the URL where a story was first published.
-- NULL means the LixBlogs URL is canonical (the default).
ALTER TABLE blogs ADD COLUMN canonical_url TEXT;
