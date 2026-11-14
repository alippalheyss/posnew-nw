import { supabase, DEFAULT_SETTINGS_USER_ID } from '@/lib/supabase';
import { Customer, Product, ShopSettings } from '@/context/AppContext';
import {
  sendTelegramOnlineOrderNotification,
  sendTelegramOnlineRegistrationAlert,
  sendTelegramOnlineOrderStatusToCustomer,
} from '@/services/telegramService';

export const MIN_DELIVERY_AMOUNT = 100;

export interface OnlineOrderItem {
  product_id: string;
  name_en: string;
  name_dv?: string;
  image?: string;
  quantity: number;
  unit_price: number;
  line_total: number;
}

export type OnlineOrderStatus =
  | 'NEW'
  | 'ACCEPTED'
  | 'PREPARING'
  | 'READY'
  | 'COMPLETED'
  | 'CANCELLED';

export interface OnlineOrder {
  id: string;
  order_number: string;
  customer_id: string | null;
  customer_code: string;
  customer_name: string;
  customer_phone: string;
  fulfillment_type: 'DELIVERY' | 'PICKUP';
  delivery_address: string;
  delivery_notes: string;
  payment_method: 'CREDIT' | 'CASH_TRANSFER';
  payment_slip_url: string;
  items: OnlineOrderItem[];
  subtotal: number;
  total: number;
  status: OnlineOrderStatus;
  pos_sale_id?: string;
  created_at: string;
  updated_at?: string;
}

export interface CustomerRegistration {
  id: string;
  name_en: string;
  name_dv: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  assigned_code: string;
  credit_limit: number;
  reviewed_at?: string | null;
  created_at: string;
}

export interface PublicShopData {
  products: Product[];
  shopSettings: Partial<ShopSettings>;
  telegramBotToken?: string;
}

export const normalizePhone = (phone: string): string => {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.startsWith('960') && digits.length > 7) {
    return digits.slice(3);
  }
  return digits;
};

export const normalizeCode = (code: string): string => {
  return String(code || '').trim().toUpperCase();
};

const codesMatch = (a: string, b: string): boolean => {
  const na = normalizeCode(a);
  const nb = normalizeCode(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (/^\d+$/.test(na) && /^\d+$/.test(nb)) {
    return Number(na) === Number(nb);
  }
  return false;
};

/**
 * Load public storefront products and shop/bank/telegram settings from Supabase
 */
export const fetchPublicShopData = async (): Promise<PublicShopData> => {
  if (!supabase) {
    return { products: [], shopSettings: { currency: 'MVR', shopName: 'B BACK', onlineShopEnabled: true } };
  }

  const [productsRes, settingsRes] = await Promise.all([
    supabase.from('products').select('*').order('name_en', { ascending: true }),
    supabase
      .from('settings')
      .select('shop_settings, telegram_settings')
      .eq('user_id', DEFAULT_SETTINGS_USER_ID)
      .maybeSingle(),
  ]);

  const rawProducts = (productsRes.data || []) as Product[];
  const shopSettings: Partial<ShopSettings> = {
    currency: 'MVR',
    shopName: 'B BACK',
    onlineShopEnabled: true,
    ...(settingsRes.data?.shop_settings || {}),
  };

  const telegramBotToken = settingsRes.data?.telegram_settings?.botToken || undefined;

  return {
    products: rawProducts,
    shopSettings,
    telegramBotToken,
  };
};

/**
 * Authenticate a customer for shop.bback.store using Customer Code + Mobile Number
 */
export const loginShopCustomer = async (
  code: string,
  phone: string
): Promise<{
  ok: boolean;
  customer?: Customer;
  pendingStatus?: 'PENDING' | 'REJECTED';
  error?: string;
}> => {
  if (!supabase) {
    return { ok: false, error: 'Database connection unavailable.' };
  }

  const cleanCode = normalizeCode(code);
  const cleanPhone = normalizePhone(phone);

  if (!cleanCode || !cleanPhone) {
    return { ok: false, error: 'Please enter both your Customer Code and Mobile Number.' };
  }

  const { data: customers, error } = await supabase
    .from('customers')
    .select('*');

  if (error) {
    return { ok: false, error: error.message };
  }

  const matched = (customers || []).find(
    (c: Customer) =>
      codesMatch(c.code, cleanCode) && normalizePhone(c.phone) === cleanPhone
  );

  if (matched) {
    return { ok: true, customer: matched as Customer };
  }

  // Check if customer has a pending registration
  const { data: regs } = await supabase
    .from('customer_registrations')
    .select('*')
    .order('created_at', { ascending: false });

  const pendingMatch = (regs || []).find(
    (r: CustomerRegistration) => normalizePhone(r.phone) === cleanPhone
  );

  if (pendingMatch?.status === 'PENDING') {
    return {
      ok: false,
      pendingStatus: 'PENDING',
      error: 'Your registration is still pending Admin approval. You can shop once approved.',
    };
  }

  if (pendingMatch?.status === 'REJECTED') {
    return {
      ok: false,
      pendingStatus: 'REJECTED',
      error: 'Your previous registration was declined. Please contact the store.',
    };
  }

  return {
    ok: false,
    error: 'Invalid Customer Code or Mobile Number. New customers can register below.',
  };
};

/**
 * Refresh logged-in customer record (live credit limit & outstanding balance)
 */
export const refreshShopCustomer = async (customerId: string): Promise<Customer | null> => {
  if (!supabase || !customerId) return null;
  const { data } = await supabase
    .from('customers')
    .select('*')
    .eq('id', customerId)
    .maybeSingle();
  return (data as Customer) || null;
};

/**
 * Submit a new non-registered customer for POS Admin approval
 */
export const submitCustomerRegistration = async (
  payload: {
    name_en: string;
    name_dv?: string;
    phone: string;
    email?: string;
    address?: string;
    notes?: string;
  },
  shopSettings?: Partial<ShopSettings>,
  botToken?: string
): Promise<{ ok: boolean; registration?: CustomerRegistration; error?: string }> => {
  if (!supabase) return { ok: false, error: 'Database unavailable.' };

  const cleanPhone = normalizePhone(payload.phone);
  if (!payload.name_en.trim() || !cleanPhone) {
    return { ok: false, error: 'Full name and mobile number are required.' };
  }

  // Check if already a registered customer
  const { data: existingCustomers } = await supabase.from('customers').select('id, code, phone');
  const existingCustomer = (existingCustomers || []).find(
    (c: any) => normalizePhone(c.phone) === cleanPhone
  );
  if (existingCustomer) {
    return {
      ok: false,
      error: `This mobile number is already registered! Please login using Customer Code #${existingCustomer.code}.`,
    };
  }

  // Check if already pending
  const { data: existingRegs } = await supabase
    .from('customer_registrations')
    .select('*')
    .eq('status', 'PENDING');

  const alreadyPending = (existingRegs || []).find(
    (r: CustomerRegistration) => normalizePhone(r.phone) === cleanPhone
  );
  if (alreadyPending) {
    return {
      ok: false,
      error: 'A registration with this mobile number is already waiting for Admin approval.',
    };
  }

  const { data, error } = await supabase
    .from('customer_registrations')
    .insert({
      name_en: payload.name_en.trim(),
      name_dv: (payload.name_dv || '').trim(),
      phone: payload.phone.trim(),
      email: (payload.email || '').trim(),
      address: (payload.address || '').trim(),
      notes: (payload.notes || '').trim(),
      status: 'PENDING',
    })
    .select()
    .single();

  if (error) {
    return { ok: false, error: error.message };
  }

  // Notify bback Telegram group non-blockingly
  sendTelegramOnlineRegistrationAlert({
    registration: {
      name_en: data.name_en,
      name_dv: data.name_dv,
      phone: data.phone,
      address: data.address,
    },
    groupChatId: shopSettings?.telegramGroupChatId,
    botToken,
  }).catch((err) => console.warn('Telegram registration alert failed:', err));

  return { ok: true, registration: data as CustomerRegistration };
};

/**
 * Check registration approval status by mobile number
 */
export const checkRegistrationStatus = async (
  phone: string
): Promise<{
  found: boolean;
  status?: 'PENDING' | 'APPROVED' | 'REJECTED';
  assigned_code?: string;
  name_en?: string;
}> => {
  if (!supabase) return { found: false };
  const cleanPhone = normalizePhone(phone);
  if (!cleanPhone) return { found: false };

  const { data: customers } = await supabase.from('customers').select('code, name_en, phone');
  const approvedCust = (customers || []).find((c: any) => normalizePhone(c.phone) === cleanPhone);
  if (approvedCust) {
    return {
      found: true,
      status: 'APPROVED',
      assigned_code: approvedCust.code,
      name_en: approvedCust.name_en,
    };
  }

  const { data: regs } = await supabase
    .from('customer_registrations')
    .select('*')
    .order('created_at', { ascending: false });

  const matched = (regs || []).find((r: CustomerRegistration) => normalizePhone(r.phone) === cleanPhone);
  if (!matched) return { found: false };

  return {
    found: true,
    status: matched.status,
    assigned_code: matched.assigned_code,
    name_en: matched.name_en,
  };
};

/**
 * Upload payment slip image/PDF to Supabase Storage
 */
export const uploadOrderSlip = async (
  file: File,
  orderRef: string
): Promise<{ ok: boolean; url?: string; error?: string }> => {
  if (!supabase) return { ok: false, error: 'Database unavailable.' };

  const ext = file.name.split('.').pop() || 'jpg';
  const filePath = `${orderRef}-${Date.now()}.${ext}`;

  // Try dedicated order-slips bucket first
  const { error: uploadErr } = await supabase.storage
    .from('order-slips')
    .upload(filePath, file, { upsert: true });

  if (!uploadErr) {
    const { data } = supabase.storage.from('order-slips').getPublicUrl(filePath);
    return { ok: true, url: data.publicUrl };
  }

  // Fallback to product-images bucket under slips/
  const fallbackPath = `slips/${filePath}`;
  const { error: fallbackErr } = await supabase.storage
    .from('product-images')
    .upload(fallbackPath, file, { upsert: true });

  if (!fallbackErr) {
    const { data } = supabase.storage.from('product-images').getPublicUrl(fallbackPath);
    return { ok: true, url: data.publicUrl };
  }

  return { ok: false, error: uploadErr.message || fallbackErr.message || 'Slip upload failed.' };
};

/**
 * Place a new online order from shop.bback.store
 */
export const placeOnlineOrder = async ({
  customer,
  fulfillment_type,
  delivery_address,
  delivery_notes,
  payment_method,
  payment_slip_url,
  items,
  shopSettings,
  botToken,
}: {
  customer: Customer;
  fulfillment_type: 'DELIVERY' | 'PICKUP';
  delivery_address: string;
  delivery_notes: string;
  payment_method: 'CREDIT' | 'CASH_TRANSFER';
  payment_slip_url: string;
  items: OnlineOrderItem[];
  shopSettings?: Partial<ShopSettings>;
  botToken?: string;
}): Promise<{ ok: boolean; order?: OnlineOrder; error?: string }> => {
  if (!supabase) return { ok: false, error: 'Database unavailable.' };

  if (!items || items.length === 0) {
    return { ok: false, error: 'Your cart is empty.' };
  }

  const subtotal = Number(
    items.reduce((sum, item) => sum + Number(item.line_total || 0), 0).toFixed(2)
  );
  const total = subtotal;

  if (fulfillment_type === 'DELIVERY' && total < MIN_DELIVERY_AMOUNT) {
    return {
      ok: false,
      error: `Delivery orders require a minimum of ${shopSettings?.currency || 'MVR'} ${MIN_DELIVERY_AMOUNT}. Please add more items or choose Pickup.`,
    };
  }

  if (fulfillment_type === 'DELIVERY' && !delivery_address.trim()) {
    return { ok: false, error: 'Please enter a delivery address.' };
  }

  if (payment_method === 'CASH_TRANSFER' && !payment_slip_url.trim()) {
    return { ok: false, error: 'Please upload your payment transfer slip before placing the order.' };
  }

  if (payment_method === 'CREDIT') {
    const latestCustomer = await refreshShopCustomer(customer.id);
    const activeCust = latestCustomer || customer;
    const creditLimit = Number(activeCust.credit_limit || 0);
    const outBalance = Number(activeCust.outstanding_balance || 0);
    const availableCredit = Math.max(0, creditLimit - outBalance);

    if (creditLimit <= 0 || total > availableCredit) {
      return {
        ok: false,
        error: `Insufficient credit limit. Available credit: ${shopSettings?.currency || 'MVR'} ${availableCredit.toFixed(2)}.`,
      };
    }
  }

  const randSuffix = Math.floor(1000 + Math.random() * 9000);
  const orderNumber = `ORD-${Date.now().toString().slice(-4)}${randSuffix}`;

  const { data, error } = await supabase
    .from('online_orders')
    .insert({
      order_number: orderNumber,
      customer_id: customer.id,
      customer_code: customer.code,
      customer_name: customer.name_en || customer.name_dv,
      customer_phone: customer.phone,
      fulfillment_type,
      delivery_address: delivery_address.trim(),
      delivery_notes: delivery_notes.trim(),
      payment_method,
      payment_slip_url: payment_slip_url.trim(),
      items,
      subtotal,
      total,
      status: 'NEW',
    })
    .select()
    .single();

  if (error) {
    return { ok: false, error: error.message };
  }

  // Send Telegram notification to the bback group
  await sendTelegramOnlineOrderNotification({
    order: {
      order_number: data.order_number,
      customer_code: data.customer_code,
      customer_name: data.customer_name,
      customer_phone: data.customer_phone,
      fulfillment_type: data.fulfillment_type,
      delivery_address: data.delivery_address,
      delivery_notes: data.delivery_notes,
      payment_method: data.payment_method,
      payment_slip_url: data.payment_slip_url,
      items: data.items,
      total: data.total,
    },
    groupChatId: shopSettings?.telegramGroupChatId,
    currency: shopSettings?.currency || 'MVR',
    botToken,
  }).catch((err) => console.warn('Telegram order notification failed:', err));

  return { ok: true, order: data as OnlineOrder };
};

/**
 * Fetch orders for a specific logged-in customer
 */
export const fetchCustomerOrders = async (customerId: string): Promise<OnlineOrder[]> => {
  if (!supabase || !customerId) return [];
  const { data, error } = await supabase
    .from('online_orders')
    .select('*')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('fetchCustomerOrders error:', error.message);
    return [];
  }
  return (data || []) as OnlineOrder[];
};

/**
 * POS: Fetch all online orders
 */
export const fetchAllOnlineOrders = async (): Promise<OnlineOrder[]> => {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('online_orders')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    console.warn('fetchAllOnlineOrders error:', error.message);
    return [];
  }
  return (data || []) as OnlineOrder[];
};

/**
 * POS: Update order status and optionally notify customer via Telegram
 */
export const updateOnlineOrderStatus = async ({
  order,
  status,
  posSaleId,
  customerChatId,
  shopSettings,
  botToken,
}: {
  order: OnlineOrder;
  status: OnlineOrderStatus;
  posSaleId?: string;
  customerChatId?: number | null;
  shopSettings?: Partial<ShopSettings>;
  botToken?: string;
}): Promise<{ ok: boolean; error?: string }> => {
  if (!supabase) return { ok: false, error: 'Database unavailable.' };

  const updates: any = {
    status,
    updated_at: new Date().toISOString(),
  };
  if (posSaleId) {
    updates.pos_sale_id = posSaleId;
  }

  const { error } = await supabase
    .from('online_orders')
    .update(updates)
    .eq('id', order.id);

  if (error) return { ok: false, error: error.message };

  if (customerChatId && status !== 'NEW') {
    sendTelegramOnlineOrderStatusToCustomer({
      customerChatId,
      orderNumber: order.order_number,
      status,
      total: order.total,
      currency: shopSettings?.currency || 'MVR',
      shopName: shopSettings?.shopName || 'B BACK',
      botToken,
    }).catch((err) => console.warn('Customer Telegram status update failed:', err));
  }

  return { ok: true };
};

/**
 * POS/Admin: Fetch pending customer registrations
 */
export const fetchPendingRegistrations = async (): Promise<CustomerRegistration[]> => {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('customer_registrations')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    console.warn('fetchPendingRegistrations error:', error.message);
    return [];
  }
  return (data || []) as CustomerRegistration[];
};

