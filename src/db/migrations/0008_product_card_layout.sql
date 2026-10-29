ALTER TABLE products
  ADD COLUMN IF NOT EXISTS card_layout text NOT NULL DEFAULT 'vertical';

UPDATE products
SET card_layout = 'vertical'
WHERE card_layout IS NULL
   OR card_layout NOT IN ('vertical', 'horizontal');

ALTER TABLE products
  DROP CONSTRAINT IF EXISTS products_card_layout_check;

ALTER TABLE products
  ADD CONSTRAINT products_card_layout_check
  CHECK (card_layout IN ('vertical', 'horizontal'));
