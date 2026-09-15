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

-- 5. Create transfer_slips table for bank transfer slip verification
CREATE TABLE IF NOT EXISTS public.transfer_slips (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
    telegram_chat_id BIGINT NOT NULL,
    customer_name TEXT,
    customer_phone TEXT,
    file_id TEXT NOT NULL,
    file_url TEXT,
    caption TEXT,
    suggested_amount DECIMAL(10, 2),
    settled_amount DECIMAL(10, 2),
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'confirmed', 'rejected'
    settlement_id TEXT,
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast status and customer queries
CREATE INDEX IF NOT EXISTS idx_transfer_slips_status ON public.transfer_slips(status);
CREATE INDEX IF NOT EXISTS idx_transfer_slips_customer ON public.transfer_slips(customer_id);

-- Enable RLS & allow public/anon access for POS & Telegram bot
ALTER TABLE public.transfer_slips ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to transfer_slips" ON public.transfer_slips;
CREATE POLICY "Allow all access to transfer_slips" ON public.transfer_slips 
    FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.transfer_slips TO anon, authenticated;

-- =========================================================================
-- 6. Optional: Supabase pg_cron Midnight Trigger for Executive Briefing
-- =========================================================================
-- If you have the pg_cron and pg_net extensions enabled in Supabase,
-- you can run the nightly executive briefing automatically at midnight (19:00 UTC = 00:00 Maldives time):
/*
SELECT cron.schedule(
    'nightly-executive-briefing',
    '0 19 * * *', -- Midnight Maldives time (UTC+5)
    $$
    SELECT net.http_post(
        url := 'https://zmbbgfpzgfcsoexybrle.supabase.co/functions/v1/telegram-webhook',
        headers := '{"Content-Type": "application/json"}'::jsonb,
        body := '{"action": "nightly_briefing"}'::jsonb
    );
    $$
);
*/
