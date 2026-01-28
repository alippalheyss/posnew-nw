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

// Helper to safely parse numbers
const safeNum = (val: any): number => {
    const num = parseFloat(val);
    return isNaN(num) ? 0 : num;
};

// Service for Customers
export const customerService = {
    async getAll() {
        const { data, error } = await supabase
            .from('customers')
            .select(`
                *,
                settlements (
                    id,
                    amount_paid,
                    date,
                    previous_outstanding,
                    new_outstanding
                )
            `)
            .order('name_en', { ascending: true });

        if (error) throw error;
        // Map settlements to settlement_history and ensure numbers are clean
        return data.map(c => ({
            ...c,
            outstanding_balance: safeNum(c.outstanding_balance),
            credit_limit: safeNum(c.credit_limit),
            loyalty_points: safeNum(c.loyalty_points),
            settlement_history: (c as any).settlements?.map((s: any) => ({
                id: s.id,
                amount_paid: safeNum(s.amount_paid),
                date: s.date,
                previous_outstanding: safeNum(s.previous_outstanding),
                new_outstanding: safeNum(s.new_outstanding)
            })) || []
        }));
    },

    async create(customer: any) {
        const dbCustomer = {
            ...customer,
            outstanding_balance: safeNum(customer.outstanding_balance),
            credit_limit: safeNum(customer.credit_limit),
            loyalty_points: safeNum(customer.loyalty_points)
        };
        const { data, error } = await supabase
            .from('customers')
            .insert(dbCustomer)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async update(id: string, updates: any) {
        const dbUpdates = { ...updates };
        if (updates.outstanding_balance !== undefined) dbUpdates.outstanding_balance = safeNum(updates.outstanding_balance);
        if (updates.credit_limit !== undefined) dbUpdates.credit_limit = safeNum(updates.credit_limit);
        if (updates.loyalty_points !== undefined) dbUpdates.loyalty_points = safeNum(updates.loyalty_points);

        const { data, error } = await supabase
            .from('customers')
            .update(dbUpdates)
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
        // Map snake_case from DB to camelCase for App
        return data.map(s => ({
            id: s.id,
            date: s.date,
            customer_id: s.customer_id,
            customer: s.customers ? {
                ...s.customers,
                outstanding_balance: safeNum(s.customers.outstanding_balance),
                settlement_history: []
            } : null,
            items: s.items as any,
            grandTotal: safeNum(s.grand_total),
            paymentMethod: s.payment_method,
            paidAmount: safeNum(s.paid_amount),
            balance: safeNum(s.balance)
        }));
    },

    async create(sale: any) {
        // Map from camelCase to snake_case for DB
        const dbSale = {
            date: sale.date || new Date().toISOString(),
            customer_id: sale.customer_id || sale.customer?.id || null,
            items: sale.items,
            grand_total: safeNum(sale.grandTotal !== undefined ? sale.grandTotal : (sale.grand_total || 0)),
            payment_method: sale.paymentMethod || sale.payment_method || 'cash',
            paid_amount: safeNum(sale.paidAmount !== undefined ? sale.paidAmount : (sale.paid_amount || 0)),
            balance: safeNum(sale.balance !== undefined ? sale.balance : (sale.balance || 0))
        };

        const { data, error } = await supabase
            .from('sales')
            .insert(dbSale)
            .select()
            .single();

        if (error) throw error;
        return data;
    },
};

// Service for Purchases
export const purchaseService = {
    async getAll() {
        const { data, error } = await supabase
            .from('purchases')
            .select('*')
            .order('date', { ascending: false });

        if (error) throw error;
        return data.map(p => ({
            id: p.id,
            date: p.date,
            vendorId: p.vendor_id,
            billNumber: p.bill_number,
            amount: safeNum(p.amount),
            gstAmount: safeNum(p.gst_amount),
            description: p.description,
            items: p.items,
            subtotal: safeNum(p.subtotal)
        }));
    },

    async create(purchase: any) {
        const dbPurchase = {
            date: purchase.date || new Date().toISOString(),
            vendor_id: purchase.vendorId || purchase.vendor_id,
            bill_number: purchase.billNumber || purchase.bill_number,
            amount: safeNum(purchase.amount),
            gst_amount: safeNum(purchase.gstAmount || purchase.gst_amount || 0),
            description: purchase.description,
            items: purchase.items,
            subtotal: safeNum(purchase.subtotal || purchase.amount)
        };

        const { data, error } = await supabase
            .from('purchases')
            .insert(dbPurchase)
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

    async create(vendor: any) {
        const { data, error } = await supabase
            .from('vendors')
            .insert(vendor)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async update(id: string, updates: any) {
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

// Service for Settlements
export const settlementService = {
    async create(settlement: any) {
        const dbSettlement = {
            customer_id: settlement.customer_id,
            amount_paid: safeNum(settlement.amount_paid),
            date: settlement.date || new Date().toISOString(),
            previous_outstanding: safeNum(settlement.previous_outstanding),
            new_outstanding: safeNum(settlement.new_outstanding)
        };
        const { data, error } = await supabase
            .from('settlements')
            .insert(dbSettlement)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async getByCustomerId(customerId: string) {
        const { data, error } = await supabase
            .from('settlements')
            .select('*')
            .eq('customer_id', customerId)
            .order('date', { ascending: false });

        if (error) throw error;
        return data.map(s => ({
            ...s,
            amount_paid: safeNum(s.amount_paid),
            previous_outstanding: safeNum(s.previous_outstanding),
            new_outstanding: safeNum(s.new_outstanding)
        }));
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
