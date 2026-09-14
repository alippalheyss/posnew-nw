-- Create expenses table
CREATE TABLE IF NOT EXISTS public.expenses (
    id TEXT PRIMARY KEY,
    date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    payment_method TEXT DEFAULT 'cash',
    reference_number TEXT,
    notes TEXT,
    recorded_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Allow public access (aligned with other POS tables)
DROP POLICY IF EXISTS "Allow all access to expenses" ON public.expenses;
CREATE POLICY "Allow all access to expenses" ON public.expenses
    FOR ALL USING (true) WITH CHECK (true);
