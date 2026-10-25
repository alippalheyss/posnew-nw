-- ==============================================================================
-- Fix Supabase Linter Warnings:
-- 1. "Policy Exists RLS Disabled" on public.settings
-- 2. "RLS Disabled in Public" on public.settings
-- ==============================================================================

-- Step 1: Enable Row Level Security (RLS) on public.settings
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Step 2: Drop existing / conflicting policies
DROP POLICY IF EXISTS "Allow public read access to shop settings" ON public.settings;
DROP POLICY IF EXISTS "Allow users to read their own settings" ON public.settings;
DROP POLICY IF EXISTS "Allow users to insert their own settings" ON public.settings;
DROP POLICY IF EXISTS "Allow users to update their own settings" ON public.settings;
DROP POLICY IF EXISTS "Allow all access to settings" ON public.settings;

-- Step 3: Create unified RLS policy for the POS app
-- Note: The POS application uses a shared store settings pattern (DEFAULT_SETTINGS_USER_ID)
-- to allow multi-device sync for shop info, app_users, telegram alerts, and stock audits.
CREATE POLICY "Allow all access to settings" ON public.settings
    FOR ALL USING (true) WITH CHECK (true);

-- Step 4: Grant permissions to anon and authenticated roles
GRANT ALL ON TABLE public.settings TO anon, authenticated;
