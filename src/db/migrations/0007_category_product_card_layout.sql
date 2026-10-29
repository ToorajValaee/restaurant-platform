ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS product_card_layout text NOT NULL DEFAULT 'vertical';

UPDATE categories
SET product_card_layout = 'vertical'
WHERE product_card_layout IS NULL
   OR product_card_layout NOT IN ('vertical', 'horizontal');

ALTER TABLE categories
  DROP CONSTRAINT IF EXISTS categories_product_card_layout_check;

ALTER TABLE categories
  ADD CONSTRAINT categories_product_card_layout_check
  CHECK (product_card_layout IN ('vertical', 'horizontal'));
