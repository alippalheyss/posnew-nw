-- Telegram Bot Setup & Customer Table Permissions
-- Run this in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)

-- 1. Add telegram_chat_id column
ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS telegram_chat_id BIGINT UNIQUE;

-- 2. Add an index for quick lookups by telegram_chat_id
CREATE INDEX IF NOT EXISTS idx_customers_telegram_chat_id 
ON public.customers(telegram_chat_id);

-- 3. Allow POS & Telegram Bot (anon and authenticated) full access to customers
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to customers" ON public.customers;
CREATE POLICY "Allow all access to customers" ON public.customers 
    FOR ALL USING (true) WITH CHECK (true);

-- 4. Grant schema permissions
GRANT ALL ON TABLE public.customers TO anon, authenticated;
