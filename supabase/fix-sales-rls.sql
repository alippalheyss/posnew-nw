-- ==============================================================================
-- MVPOS Supabase Fix: Enable Full Access to Sales and Settlements
-- Run this in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
-- ==============================================================================

-- 1. Fix Sales table RLS & permissions
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated users full access to sales" ON public.sales;
DROP POLICY IF EXISTS "Allow all access to sales" ON public.sales;
CREATE POLICY "Allow all access to sales" ON public.sales FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.sales TO anon, authenticated;

-- 2. Fix Settlements table RLS & permissions
ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated users full access to settlements" ON public.settlements;
DROP POLICY IF EXISTS "Allow all access to settlements" ON public.settlements;
CREATE POLICY "Allow all access to settlements" ON public.settlements FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.settlements TO anon, authenticated;

-- 3. Ensure sequence permissions
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

SELECT 'Sales and Settlements RLS fixed successfully!' as status;
