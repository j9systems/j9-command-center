-- Fix interactions table column types and add type_id FK
-- ALREADY APPLIED via Supabase migration on 2026-04-04

-- 1. Add missing "Call" option to interaction_type category
INSERT INTO options (category, option_key, option_label)
VALUES ('interaction_type', 'call', 'Call')
ON CONFLICT DO NOTHING;

-- 2. Add type_id column
ALTER TABLE interactions ADD COLUMN IF NOT EXISTS type_id bigint;

-- 3. Backfill type_id from the text type column by matching to options
UPDATE interactions i
SET type_id = o.id
FROM options o
WHERE o.category = 'interaction_type'
  AND lower(o.option_label) = lower(i.type)
  AND i.type IS NOT NULL
  AND i.type != '';

-- 4. Add FK constraint
ALTER TABLE interactions
  ADD CONSTRAINT fk_interactions_type_id
  FOREIGN KEY (type_id) REFERENCES options(id);

-- 5. Null out unparseable date values (relative strings like "today at...")
UPDATE interactions
SET date = NULL
WHERE date IS NOT NULL
  AND date != ''
  AND date !~ '^\d{4}-\d{2}-\d{2}'
  AND date !~ '^\d{1,2}/\d{1,2}/\d{4}';

-- 6. Fix date column: text -> timestamptz (handles both ISO and US locale formats)
ALTER TABLE interactions
  ALTER COLUMN date TYPE timestamptz USING (
    CASE
      WHEN date IS NULL OR date = '' THEN NULL
      WHEN date ~ '^\d{4}-\d{2}-\d{2}' THEN date::timestamptz
      WHEN date ~ '^\d{1,2}/\d{1,2}/\d{4}' THEN to_timestamp(date, 'MM/DD/YYYY, HH12:MI:SS AM')
      ELSE NULL
    END
  );

-- 7. Fix opened_at column: text -> timestamptz
ALTER TABLE interactions
  ALTER COLUMN opened_at TYPE timestamptz USING NULLIF(opened_at, '')::timestamptz;

-- 8. Fix opened column: text -> boolean
ALTER TABLE interactions
  ALTER COLUMN opened TYPE boolean USING (
    CASE
      WHEN opened IS NULL OR opened = '' THEN NULL
      WHEN lower(opened) IN ('true', '1', 'yes') THEN true
      ELSE false
    END
  );

-- 9. Fix automated column: text -> boolean
ALTER TABLE interactions
  ALTER COLUMN automated TYPE boolean USING (
    CASE
      WHEN automated IS NULL OR automated = '' THEN NULL
      WHEN lower(automated) IN ('true', '1', 'yes') THEN true
      ELSE false
    END
  );

-- 10. Fix clicked column: text -> boolean
ALTER TABLE interactions
  ALTER COLUMN clicked TYPE boolean USING (
    CASE
      WHEN clicked IS NULL OR clicked = '' THEN NULL
      WHEN lower(clicked) IN ('true', '1', 'yes') THEN true
      ELSE false
    END
  );
