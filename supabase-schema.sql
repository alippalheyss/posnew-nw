-- MVPOS Supabase Database Schema
-- Run this script in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    name_en TEXT NOT NULL,
    name_dv TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'cashier')),
    permissions JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE
);

-- Create products table
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

-- Create customers table
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

-- Create settlements table
CREATE TABLE IF NOT EXISTS public.settlements (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
    amount_paid DECIMAL(10, 2) NOT NULL,
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    previous_outstanding DECIMAL(10, 2) NOT NULL,
    new_outstanding DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create sales table
CREATE TABLE IF NOT EXISTS public.sales (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    items JSONB NOT NULL,
    grand_total DECIMAL(10, 2) NOT NULL,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'credit', 'card', 'mobile')),
    paid_amount DECIMAL(10, 2),
    balance DECIMAL(10, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create vendors table
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

-- Create purchases table
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create settings table
CREATE TABLE IF NOT EXISTS public.settings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    category TEXT NOT NULL,
    settings JSONB NOT NULL DEFAULT '{}',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, category)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_products_barcode ON public.products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_item_code ON public.products(item_code);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_customers_code ON public.customers(code);
CREATE INDEX IF NOT EXISTS idx_sales_date ON public.sales(date);
CREATE INDEX IF NOT EXISTS idx_sales_customer_id ON public.sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_settlements_customer_id ON public.settlements(customer_id);
CREATE INDEX IF NOT EXISTS idx_purchases_vendor_id ON public.purchases(vendor_id);
CREATE INDEX IF NOT EXISTS idx_purchases_date ON public.purchases(date);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON public.customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON public.vendors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON public.settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (allow authenticated users to access all data)
-- Note: You may want to customize these policies based on your security requirements

-- Users policies
CREATE POLICY "Allow authenticated users to read users" ON public.users
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update their own user" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- Products policies
CREATE POLICY "Allow authenticated users full access to products" ON public.products
    FOR ALL USING (auth.role() = 'authenticated');

-- Customers policies
CREATE POLICY "Allow authenticated users full access to customers" ON public.customers
    FOR ALL USING (auth.role() = 'authenticated');

-- Settlements policies
CREATE POLICY "Allow authenticated users full access to settlements" ON public.settlements
    FOR ALL USING (auth.role() = 'authenticated');

-- Sales policies
CREATE POLICY "Allow authenticated users full access to sales" ON public.sales
    FOR ALL USING (auth.role() = 'authenticated');

-- Vendors policies
CREATE POLICY "Allow authenticated users full access to vendors" ON public.vendors
    FOR ALL USING (auth.role() = 'authenticated');

-- Purchases policies
CREATE POLICY "Allow authenticated users full access to purchases" ON public.purchases
    FOR ALL USING (auth.role() = 'authenticated');

-- Settings policies
CREATE POLICY "Allow users to read their own settings" ON public.settings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Allow users to insert their own settings" ON public.settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to update their own settings" ON public.settings
    FOR UPDATE USING (auth.uid() = user_id);

-- Create a function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, username, name_en, name_dv, role, permissions, is_active)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name_en', 'User'),
        COALESCE(NEW.raw_user_meta_data->>'name_dv', 'ޔޫޒަރ'),
        COALESCE(NEW.raw_user_meta_data->>'role', 'cashier'),
        COALESCE(NEW.raw_user_meta_data->>'permissions', '{}')::jsonb,
        true
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user creation
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'MVPOS database schema created successfully!';
END $$;
