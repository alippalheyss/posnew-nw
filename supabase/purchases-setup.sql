-- Fix Row Level Security on purchases & vendors tables
-- Run this script in your Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)

-- 1. Purchases table permissions & policy
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated users full access to purchases" ON public.purchases;
DROP POLICY IF EXISTS "Allow all access to purchases" ON public.purchases;
CREATE POLICY "Allow all access to purchases" ON public.purchases FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.purchases TO anon, authenticated;

-- 2. Vendors table permissions & policy
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated users full access to vendors" ON public.vendors;
DROP POLICY IF EXISTS "Allow all access to vendors" ON public.vendors;
CREATE POLICY "Allow all access to vendors" ON public.vendors FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.vendors TO anon, authenticated;

-- 3. Sales table permissions & policy
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated users full access to sales" ON public.sales;
DROP POLICY IF EXISTS "Allow all access to sales" ON public.sales;
CREATE POLICY "Allow all access to sales" ON public.sales FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.sales TO anon, authenticated;

-- 4. Products table permissions & policy
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated users full access to products" ON public.products;
DROP POLICY IF EXISTS "Allow all access to products" ON public.products;
CREATE POLICY "Allow all access to products" ON public.products FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.products TO anon, authenticated;
