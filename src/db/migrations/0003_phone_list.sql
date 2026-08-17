ALTER TABLE app_settings
  ADD COLUMN IF NOT EXISTS phones text[] NOT NULL DEFAULT '{}'::text[];

UPDATE app_settings
SET phones = ARRAY(
  SELECT value
  FROM unnest(ARRAY[phone, phone_2, phone_3, mobile]) WITH ORDINALITY AS p(value, ord)
  WHERE value IS NOT NULL AND btrim(value) <> ''
  GROUP BY value
  ORDER BY min(ord)
)
WHERE cardinality(phones) = 0;
