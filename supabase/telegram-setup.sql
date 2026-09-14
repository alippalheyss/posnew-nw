-- Add Telegram Chat ID column to customers table
-- Run this in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)

-- 1. Add telegram_chat_id column
ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS telegram_chat_id BIGINT UNIQUE;

-- 2. Add an index for quick lookups by telegram_chat_id
CREATE INDEX IF NOT EXISTS idx_customers_telegram_chat_id 
ON public.customers(telegram_chat_id);

-- 3. Optional: Add a comment
COMMENT ON COLUMN public.customers.telegram_chat_id IS 'Customer numeric Telegram Chat ID linked via /start QR code';
