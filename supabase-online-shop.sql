-- ==============================================================================
-- Online Storefront (shop.bback.store) Schema & Realtime Setup
-- Run this in your Supabase SQL Editor
-- ==============================================================================

-- 1. Customer Registrations (Pending Admin Approval)
CREATE TABLE IF NOT EXISTS public.customer_registrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name_en TEXT NOT NULL,
    name_dv TEXT DEFAULT '',
    phone TEXT NOT NULL,
    email TEXT DEFAULT '',
    address TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    assigned_code TEXT DEFAULT '',
    credit_limit DECIMAL(12, 2) DEFAULT 0,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_customer_registrations_status ON public.customer_registrations(status);
CREATE INDEX IF NOT EXISTS idx_customer_registrations_phone ON public.customer_registrations(phone);

ALTER TABLE public.customer_registrations ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'customer_registrations' AND policyname = 'Allow all access to customer_registrations'
    ) THEN
        CREATE POLICY "Allow all access to customer_registrations" ON public.customer_registrations FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

-- 2. Online Orders (from shop.bback.store)
CREATE TABLE IF NOT EXISTS public.online_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number TEXT UNIQUE NOT NULL,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    customer_code TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    fulfillment_type TEXT NOT NULL CHECK (fulfillment_type IN ('DELIVERY', 'PICKUP')),
    delivery_address TEXT DEFAULT '',
    delivery_notes TEXT DEFAULT '',
    payment_method TEXT NOT NULL CHECK (payment_method IN ('CREDIT', 'CASH_TRANSFER')),
    payment_slip_url TEXT DEFAULT '',
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0,
    total DECIMAL(12, 2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'NEW' CHECK (status IN ('NEW', 'ACCEPTED', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED')),
    pos_sale_id TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_online_orders_status ON public.online_orders(status);
CREATE INDEX IF NOT EXISTS idx_online_orders_customer_id ON public.online_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_online_orders_created_at ON public.online_orders(created_at DESC);

ALTER TABLE public.online_orders ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'online_orders' AND policyname = 'Allow all access to online_orders'
    ) THEN
        CREATE POLICY "Allow all access to online_orders" ON public.online_orders FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

-- 3. Storage Bucket for Payment Slips
INSERT INTO storage.buckets (id, name, public)
VALUES ('order-slips', 'order-slips', true)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public Access for Order Slips'
    ) THEN
        CREATE POLICY "Public Access for Order Slips" ON storage.objects FOR SELECT USING (bucket_id = 'order-slips');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Allow Upload to Order Slips'
    ) THEN
        CREATE POLICY "Allow Upload to Order Slips" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'order-slips');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Allow Update to Order Slips'
    ) THEN
        CREATE POLICY "Allow Update to Order Slips" ON storage.objects FOR UPDATE USING (bucket_id = 'order-slips');
    END IF;
END $$;

-- 4. Enable Realtime for POS notifications
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'online_orders'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.online_orders;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'customer_registrations'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.customer_registrations;
    END IF;
END $$;

-- 5. Grants
GRANT ALL ON public.customer_registrations TO anon, authenticated;
GRANT ALL ON public.online_orders TO anon, authenticated;

