ALTER TABLE categories
  DROP CONSTRAINT IF EXISTS categories_layout_mode_check;

ALTER TABLE categories
  ADD CONSTRAINT categories_layout_mode_check
  CHECK (layout_mode IN ('stack', 'tile2', 'tile3', 'swipe'));
