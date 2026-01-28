import { supabase } from '../lib/supabase';
import type { Database } from '../lib/supabase';

type Tables = Database['public']['Tables'];

// Service for Products
export const productService = {
    async getAll() {
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .order('name_en', { ascending: true });

        if (error) throw error;
        return data;
    },

    async create(product: Tables['products']['Insert']) {
        const { data, error } = await supabase
            .from('products')
            .insert(product)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async update(id: string, updates: Tables['products']['Update']) {
        const { data, error } = await supabase
            .from('products')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async delete(id: string) {
        const { error } = await supabase
            .from('products')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }
};

// Service for Customers
export const customerService = {
    async getAll() {
        const { data, error } = await supabase
            .from('customers')
            .select('*')
            .order('name_en', { ascending: true });

        if (error) throw error;
        return data;
    },

    async create(customer: Tables['customers']['Insert']) {
        const { data, error } = await supabase
            .from('customers')
            .insert(customer)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async update(id: string, updates: Tables['customers']['Update']) {
        const { data, error } = await supabase
            .from('customers')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async delete(id: string) {
        const { error } = await supabase
            .from('customers')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }
};

// Service for Sales
export const saleService = {
    async getAll() {
        const { data, error } = await supabase
            .from('sales')
            .select('*, customers(*)')
            .order('date', { ascending: false });

        if (error) throw error;
        return data;
    },

    async create(sale: Tables['sales']['Insert']) {
        const { data, error } = await supabase
            .from('sales')
            .insert(sale)
            .select()
            .single();

        if (error) throw error;
        return data;
    }
};

// Service for Vendors
export const vendorService = {
    async getAll() {
        const { data, error } = await supabase
            .from('vendors')
            .select('*')
            .order('name_en', { ascending: true });

        if (error) throw error;
        return data;
    },

    async create(vendor: Tables['vendors']['Insert']) {
        const { data, error } = await supabase
            .from('vendors')
            .insert(vendor)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async update(id: string, updates: Tables['vendors']['Update']) {
        const { data, error } = await supabase
            .from('vendors')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async delete(id: string) {
        const { error } = await supabase
            .from('vendors')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }
};

// Service for Settings
export const settingsService = {
    async get(category: string) {
        const { data, error } = await supabase
            .from('settings')
            .select('*')
            .eq('category', category)
            .single();

        if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "No rows found"
        return data;
    },

    async update(userId: string, category: string, settings: any) {
        // Upsert settings
        const { data, error } = await supabase
            .from('settings')
            .upsert({
                user_id: userId,
                category,
                settings,
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id, category' })
            .select()
            .single();

        if (error) throw error;
        return data;
    }
};
