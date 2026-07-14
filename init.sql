-- ============================================================
-- KAIZEN Inventory Management System
-- Supabase Database Setup Script
-- ============================================================
-- Run this entire script in the Supabase SQL Editor:
-- https://jiglufmniplwwrhwxkty.supabase.co
-- Navigate to: SQL Editor → New Query → Paste & Run
-- ============================================================

-- 1. CREATE PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    quantity NUMERIC DEFAULT 0,
    unit_price NUMERIC DEFAULT 0,
    supplier_name TEXT DEFAULT '',
    image_url TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- If products table already exists, add image_url and product_code columns:
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT '';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS product_code TEXT DEFAULT '';

-- 2. CREATE INVENTORY IN TABLE
CREATE TABLE IF NOT EXISTS public.inventory_in (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_name TEXT NOT NULL,
    quantity NUMERIC NOT NULL,
    unit_price NUMERIC NOT NULL,
    total_price NUMERIC NOT NULL,
    supplier_name TEXT DEFAULT '',
    entry_date DATE,
    employee_name TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. CREATE INVENTORY OUT TABLE
CREATE TABLE IF NOT EXISTS public.inventory_out (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_name TEXT NOT NULL,
    quantity NUMERIC NOT NULL,
    total_selling_price NUMERIC NOT NULL,
    customer_name TEXT DEFAULT '',
    date DATE,
    employee_name TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_in ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_out ENABLE ROW LEVEL SECURITY;

-- 5. CREATE POLICIES FOR ANONYMOUS ACCESS (internal use, no auth)
-- Products: full access
CREATE POLICY "Allow all on products" ON public.products
    FOR ALL TO anon
    USING (true)
    WITH CHECK (true);

-- Inventory In: full access
CREATE POLICY "Allow all on inventory_in" ON public.inventory_in
    FOR ALL TO anon
    USING (true)
    WITH CHECK (true);

-- Inventory Out: full access
CREATE POLICY "Allow all on inventory_out" ON public.inventory_out
    FOR ALL TO anon
    USING (true)
    WITH CHECK (true);

-- 6. GRANT TABLE ACCESS TO ANON ROLE
GRANT ALL ON public.products TO anon;
GRANT ALL ON public.inventory_in TO anon;
GRANT ALL ON public.inventory_out TO anon;

-- 7. GRANT USAGE ON SEQUENCES (for auto-increment if any)
GRANT USAGE ON SCHEMA public TO anon;

-- 8. CREATE INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_products_name ON public.products(name);
CREATE INDEX IF NOT EXISTS idx_inventory_in_product ON public.inventory_in(product_name);
CREATE INDEX IF NOT EXISTS idx_inventory_in_date ON public.inventory_in(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_out_product ON public.inventory_out(product_name);
CREATE INDEX IF NOT EXISTS idx_inventory_out_date ON public.inventory_out(created_at DESC);

-- Done!
-- The application is now ready to use.
-- Open index.html in your browser to start.
