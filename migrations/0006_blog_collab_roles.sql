-- Add role column to blog_co_authors (viewer / editor / admin)
ALTER TABLE blog_co_authors ADD COLUMN role TEXT NOT NULL DEFAULT 'editor';

-- Add page_emoji to blogs for the emoji icon above the title
ALTER TABLE blogs ADD COLUMN page_emoji TEXT DEFAULT '';
