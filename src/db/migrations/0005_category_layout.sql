ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS layout_mode text NOT NULL DEFAULT 'stack';

UPDATE categories
SET layout_mode = 'stack'
WHERE layout_mode IS NULL
   OR layout_mode NOT IN ('stack', 'tile2', 'tile3');

ALTER TABLE categories
  DROP CONSTRAINT IF EXISTS categories_layout_mode_check;

ALTER TABLE categories
  ADD CONSTRAINT categories_layout_mode_check
  CHECK (layout_mode IN ('stack', 'tile2', 'tile3'));
