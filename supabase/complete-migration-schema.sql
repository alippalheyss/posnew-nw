-- ==============================================================================
-- MVPOS COMPLETE DATABASE SCHEMA FOR NEW SUPABASE PROJECT
-- Run this in your new Supabase project (SQL Editor -> New Query -> Run)
-- ==============================================================================

-- 1. Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Users Table
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username TEXT UNIQUE NOT NULL,
    name_en TEXT NOT NULL,
    name_dv TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'cashier',
    permissions JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE
);

-- 3. Vendors Table
CREATE TABLE IF NOT EXISTS public.vendors (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    name_dv TEXT NOT NULL,
    name_en TEXT NOT NULL,
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    tin_number TEXT,
    address TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Customers Table
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    name_dv TEXT NOT NULL,
    name_en TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    credit_limit DECIMAL(10, 2) NOT NULL DEFAULT 0,
    loyalty_points INTEGER NOT NULL DEFAULT 0,
    outstanding_balance DECIMAL(10, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Products Table
CREATE TABLE IF NOT EXISTS public.products (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name_dv TEXT NOT NULL,
    name_en TEXT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    cost_price DECIMAL(10, 2),
    last_purchase_date TIMESTAMP WITH TIME ZONE,
    image TEXT,
    barcode TEXT,
    item_code TEXT UNIQUE NOT NULL,
    expiry_date DATE,
    stock_shop INTEGER NOT NULL DEFAULT 0,
    stock_godown INTEGER NOT NULL DEFAULT 0,
    category TEXT,
    is_zero_tax BOOLEAN NOT NULL DEFAULT false,
    units JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Purchases Table
CREATE TABLE IF NOT EXISTS public.purchases (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
    bill_number TEXT,
    amount DECIMAL(10, 2) NOT NULL,
    gst_amount DECIMAL(10, 2) NOT NULL,
    description TEXT,
    items JSONB,
    subtotal DECIMAL(10, 2),
    receipt_photo TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Sales Table
CREATE TABLE IF NOT EXISTS public.sales (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    items JSONB NOT NULL,
    grand_total DECIMAL(10, 2) NOT NULL,
    payment_method TEXT NOT NULL,
    paid_amount DECIMAL(10, 2),
    balance DECIMAL(10, 2),
    invoice_number TEXT,
    split_details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Settlements Table
CREATE TABLE IF NOT EXISTS public.settlements (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
    amount_paid DECIMAL(10, 2) NOT NULL,
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    previous_outstanding DECIMAL(10, 2) NOT NULL,
    new_outstanding DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Settings Table
CREATE TABLE IF NOT EXISTS public.settings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL,
    category TEXT NOT NULL,
    settings JSONB NOT NULL DEFAULT '{}',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, category)
);

-- 10. Expenses Table
CREATE TABLE IF NOT EXISTS public.expenses (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    date DATE NOT NULL,
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    payment_method TEXT NOT NULL DEFAULT 'cash',
    reference_number TEXT,
    notes TEXT,
    recorded_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. Transfer Slips Table
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
    status TEXT NOT NULL DEFAULT 'pending',
    settlement_id TEXT,
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 12. Create Indexes
CREATE INDEX IF NOT EXISTS idx_products_barcode ON public.products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_item_code ON public.products(item_code);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_products_updated_at ON public.products(updated_at);
CREATE INDEX IF NOT EXISTS idx_customers_code ON public.customers(code);
CREATE INDEX IF NOT EXISTS idx_customers_updated_at ON public.customers(updated_at);
CREATE INDEX IF NOT EXISTS idx_sales_date ON public.sales(date);
CREATE INDEX IF NOT EXISTS idx_sales_customer ON public.sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_settlements_customer ON public.settlements(customer_id);
CREATE INDEX IF NOT EXISTS idx_settlements_date ON public.settlements(date);
CREATE INDEX IF NOT EXISTS idx_transfer_slips_status ON public.transfer_slips(status);
CREATE INDEX IF NOT EXISTS idx_transfer_slips_customer ON public.transfer_slips(customer_id);

-- 13. Enable Row Level Security (RLS) with full open access for POS operations
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transfer_slips ENABLE ROW LEVEL SECURITY;

-- 14. Drop old policies if any and add Permissive Policies
DO $$ 
DECLARE
  t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY['users', 'products', 'customers', 'settlements', 'sales', 'vendors', 'purchases', 'settings', 'expenses', 'transfer_slips'])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Allow all access to %I" ON public.%I', t, t);
    EXECUTE format('CREATE POLICY "Allow all access to %I" ON public.%I FOR ALL USING (true) WITH CHECK (true)', t, t);
  END LOOP;
END $$;

-- 15. Grant Schema and Table permissions to anon and authenticated
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated;

-- 16. Enable Storage Bucket for Product Images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access" ON storage.objects FOR ALL USING (bucket_id = 'product-images') WITH CHECK (bucket_id = 'product-images');

-- 17. Enable Realtime Replication
ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
ALTER PUBLICATION supabase_realtime ADD TABLE public.customers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.settlements;
ALTER PUBLICATION supabase_realtime ADD TABLE public.transfer_slips;
ALTER PUBLICATION supabase_realtime ADD TABLE public.settings;

SELECT 'MVPOS new database schema initialized successfully!' as status;
