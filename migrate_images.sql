-- ============================================================
-- KAIZEN Inventory - Add image_url and sku columns to products
-- Run this in Supabase SQL Editor if your products table already
-- exists without these columns:
-- ============================================================

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS sku TEXT;
