ALTER TABLE categories
  DROP CONSTRAINT IF EXISTS categories_product_card_layout_check;

ALTER TABLE categories
  DROP COLUMN IF EXISTS product_card_layout;
