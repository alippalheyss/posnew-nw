import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// Initialize with dummy values if missing to prevent throw on load
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '';

if (supabaseServiceKey && supabaseServiceKey !== 'placeholder') {
    console.log('Supabase Admin Client: Service key loaded (starts with:', supabaseServiceKey.substring(0, 5), '...)');
} else {
    console.warn('Supabase Admin Client: Service key NOT found in environment variables.');
}

export const supabase = createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder',
    {
        auth: {
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true
        }
    }
);

export const supabaseAdmin = createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseServiceKey || 'placeholder',
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);

// Database types (will be auto-generated from Supabase later)
export interface Database {
    public: {
        Tables: {
            users: {
                Row: {
                    id: string;
                    username: string;
                    name_en: string;
                    name_dv: string;
                    role: 'admin' | 'cashier';
                    permissions: any;
                    is_active: boolean;
                    created_at: string;
                    last_login: string | null;
                };
                Insert: Omit<Database['public']['Tables']['users']['Row'], 'id' | 'created_at'>;
                Update: Partial<Database['public']['Tables']['users']['Insert']>;
            };
            products: {
                Row: {
                    id: string;
                    name_dv: string;
                    name_en: string;
                    price: number;
                    cost_price: number | null;
                    last_purchase_date: string | null;
                    image: string;
                    barcode: string;
                    item_code: string;
                    expiry_date: string | null;
                    stock_shop: number;
                    stock_godown: number;
                    category: string;
                    is_zero_tax: boolean;
                    units: any | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: Omit<Database['public']['Tables']['products']['Row'], 'id' | 'created_at' | 'updated_at'>;
                Update: Partial<Database['public']['Tables']['products']['Insert']>;
            };
            customers: {
                Row: {
                    id: string;
                    code: string;
                    name_dv: string;
                    name_en: string;
                    phone: string;
                    email: string;
                    credit_limit: number;
                    loyalty_points: number;
                    outstanding_balance: number;
                    created_at: string;
                    updated_at: string;
                };
                Insert: Omit<Database['public']['Tables']['customers']['Row'], 'id' | 'created_at' | 'updated_at'>;
                Update: Partial<Database['public']['Tables']['customers']['Insert']>;
            };
            settlements: {
                Row: {
                    id: string;
                    customer_id: string;
                    amount_paid: number;
                    date: string;
                    previous_outstanding: number;
                    new_outstanding: number;
                    created_at: string;
                };
                Insert: Omit<Database['public']['Tables']['settlements']['Row'], 'id' | 'created_at'>;
                Update: Partial<Database['public']['Tables']['settlements']['Insert']>;
            };
            sales: {
                Row: {
                    id: string;
                    date: string;
                    customer_id: string | null;
                    items: any;
                    grand_total: number;
                    payment_method: string;
                    paid_amount: number | null;
                    balance: number | null;
                    created_at: string;
                };
                Insert: Omit<Database['public']['Tables']['sales']['Row'], 'id' | 'created_at'>;
                Update: Partial<Database['public']['Tables']['sales']['Insert']>;
            };
            vendors: {
                Row: {
                    id: string;
                    code: string;
                    name_dv: string;
                    name_en: string;
                    contact_person: string;
                    phone: string;
                    email: string;
                    tin_number: string;
                    address: string;
                    notes: string;
                    created_at: string;
                    updated_at: string;
                };
                Insert: Omit<Database['public']['Tables']['vendors']['Row'], 'id' | 'created_at' | 'updated_at'>;
                Update: Partial<Database['public']['Tables']['vendors']['Insert']>;
            };
            purchases: {
                Row: {
                    id: string;
                    date: string;
                    vendor_id: string;
                    bill_number: string;
                    amount: number;
                    gst_amount: number;
                    description: string;
                    items: any | null;
                    subtotal: number | null;
                    created_at: string;
                };
                Insert: Omit<Database['public']['Tables']['purchases']['Row'], 'id' | 'created_at'>;
                Update: Partial<Database['public']['Tables']['purchases']['Insert']>;
            };
            settings: {
                Row: {
                    id: string;
                    user_id: string;
                    category: string;
                    settings: any;
                    updated_at: string;
                };
                Insert: Omit<Database['public']['Tables']['settings']['Row'], 'id' | 'updated_at'>;
                Update: Partial<Database['public']['Tables']['settings']['Insert']>;
            };
        };
    };
}
