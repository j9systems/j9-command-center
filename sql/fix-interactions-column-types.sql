-- Fix interactions table column types
-- Run this migration against your Supabase database

-- Ensure 'date' is timestamptz (not text)
ALTER TABLE interactions
  ALTER COLUMN date TYPE timestamptz USING date::timestamptz;

-- Ensure 'opened_at' is timestamptz (not text)
ALTER TABLE interactions
  ALTER COLUMN opened_at TYPE timestamptz USING opened_at::timestamptz;

-- Ensure 'opened' is boolean (not text)
ALTER TABLE interactions
  ALTER COLUMN opened TYPE boolean USING (
    CASE
      WHEN opened IS NULL THEN NULL
      WHEN lower(opened) IN ('true', '1', 'yes') THEN true
      ELSE false
    END
  );

-- Ensure 'automated' is boolean (not text)
ALTER TABLE interactions
  ALTER COLUMN automated TYPE boolean USING (
    CASE
      WHEN automated IS NULL THEN NULL
      WHEN lower(automated) IN ('true', '1', 'yes') THEN true
      ELSE false
    END
  );

-- Ensure 'clicked' is boolean (not text)
ALTER TABLE interactions
  ALTER COLUMN clicked TYPE boolean USING (
    CASE
      WHEN clicked IS NULL THEN NULL
      WHEN lower(clicked) IN ('true', '1', 'yes') THEN true
      ELSE false
    END
  );
