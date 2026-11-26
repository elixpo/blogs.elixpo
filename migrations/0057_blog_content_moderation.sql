ALTER TABLE blogs ADD COLUMN moderation_score REAL;
ALTER TABLE blogs ADD COLUMN moderation_status TEXT;
ALTER TABLE blogs ADD COLUMN moderation_reason TEXT;
ALTER TABLE blogs ADD COLUMN moderation_evaluated_at INTEGER;
