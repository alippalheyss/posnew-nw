import { supabase, DEFAULT_SETTINGS_USER_ID } from '@/lib/supabase';
import {
  Customer,
  DayOfWeekKey,
  Product,
  ShopSettings,
  WeeklyOpeningHours,
} from '@/context/AppContext';
import {
  sendTelegramMessage,
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
  telegramBotUsername?: string;
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

export const formatTime12h = (hhmm: string): string => {
  const [hStr, mStr] = String(hhmm || '00:00').split(':');
  const h = Number(hStr);
  const m = Number(mStr);
  if (Number.isNaN(h) || Number.isNaN(m)) return hhmm;
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
};

export const DAY_ORDER: Array<{ key: DayOfWeekKey; label: string }> = [
  { key: 'sunday', label: 'Sunday' },
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
];

export const DEFAULT_WEEKLY_OPENING_HOURS: WeeklyOpeningHours = {
  sunday: { enabled: true, slots: [{ open: '07:00', close: '22:00' }] },
  monday: { enabled: true, slots: [{ open: '07:00', close: '22:00' }] },
  tuesday: { enabled: true, slots: [{ open: '07:00', close: '22:00' }] },
  wednesday: { enabled: true, slots: [{ open: '07:00', close: '22:00' }] },
  thursday: { enabled: true, slots: [{ open: '07:00', close: '22:00' }] },
  friday: {
    enabled: true,
    slots: [
      { open: '07:00', close: '11:00' },
      { open: '14:00', close: '22:00' },
    ],
  },
  saturday: { enabled: true, slots: [{ open: '07:00', close: '22:00' }] },
};

const getMaldivesTimeAndDay = (): { minutesOfDay: number; dayKey: DayOfWeekKey; dayLabel: string } => {
  try {
    const now = new Date();
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Indian/Maldives',
      weekday: 'long',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(now);
    const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? 0) % 24;
    const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? 0);
    const weekdayRaw = (parts.find((p) => p.type === 'weekday')?.value ?? 'sunday').toLowerCase();
    const matched = DAY_ORDER.find((d) => d.key === weekdayRaw) || DAY_ORDER[now.getDay()];
    return {
      minutesOfDay: hour * 60 + minute,
      dayKey: matched.key,
      dayLabel: matched.label,
    };
  } catch {
    const now = new Date();
    const matched = DAY_ORDER[now.getDay()];
    return {
      minutesOfDay: now.getHours() * 60 + now.getMinutes(),
      dayKey: matched.key,
      dayLabel: matched.label,
    };
  }
};

const isMinutesInsideSlot = (nowMin: number, openTime: string, closeTime: string): boolean => {
  const [openH, openM] = openTime.split(':').map(Number);
  const [closeH, closeM] = closeTime.split(':').map(Number);
  if (Number.isNaN(openH) || Number.isNaN(openM) || Number.isNaN(closeH) || Number.isNaN(closeM)) {
    return false;
  }
  const openMin = openH * 60 + openM;
  const closeMin = closeH * 60 + closeM;
  if (closeMin > openMin) {
    return nowMin >= openMin && nowMin < closeMin;
  }
  return nowMin >= openMin || nowMin < closeMin;
};

/**
 * Check whether the online shop is currently open based on master toggle + weekly multi-slot schedule
 */
export const isOnlineShopCurrentlyOpen = (
  shopSettings?: Partial<ShopSettings>
): { isOpen: boolean; reason?: string; hoursLabel?: string } => {
  if (shopSettings?.onlineShopEnabled === false) {
    return {
      isOpen: false,
      reason:
        shopSettings.onlineShopClosedMessage ||
        'Online ordering is temporarily paused. Please check back later or contact the store.',
    };
  }

  if (shopSettings?.onlineShopScheduleEnabled) {
    const { minutesOfDay, dayKey, dayLabel } = getMaldivesTimeAndDay();

    if (shopSettings.onlineShopWeeklyHours) {
      const todaySchedule = shopSettings.onlineShopWeeklyHours[dayKey];
      if (!todaySchedule || !todaySchedule.enabled || !todaySchedule.slots?.length) {
        return {
          isOpen: false,
          reason: `Store is closed on ${dayLabel} for online orders.`,
        };
      }

      const validSlots = todaySchedule.slots.filter((s) => s.open && s.close);
      const hoursLabel = validSlots
        .map((s) => `${formatTime12h(s.open)} – ${formatTime12h(s.close)}`)
        .join(', ');

      const withinAnySlot = validSlots.some((s) =>
        isMinutesInsideSlot(minutesOfDay, s.open, s.close)
      );

      if (!withinAnySlot) {
        return {
          isOpen: false,
          hoursLabel,
          reason: `Store is currently closed. ${dayLabel} ordering hours: ${hoursLabel}.`,
        };
      }

      return { isOpen: true, hoursLabel };
    }

    if (shopSettings.onlineShopOpenTime && shopSettings.onlineShopCloseTime) {
      const hoursLabel = `${formatTime12h(shopSettings.onlineShopOpenTime)} – ${formatTime12h(
        shopSettings.onlineShopCloseTime
      )}`;
      const withinHours = isMinutesInsideSlot(
        minutesOfDay,
        shopSettings.onlineShopOpenTime,
        shopSettings.onlineShopCloseTime
      );
      if (!withinHours) {
        return {
          isOpen: false,
          hoursLabel,
          reason: `Store is currently closed for online orders. Ordering hours: ${hoursLabel}.`,
        };
      }
      return { isOpen: true, hoursLabel };
    }
  }

  return { isOpen: true };
};

const MALDIVES_ESSENTIAL_KEYWORDS = [
  'rice', 'handoo', 'basmati', 'flour', 'fuh', 'atta', 'sugar', 'hakuru',
  'oil', 'theyo', 'cooking oil', 'sunflower', 'coconut oil', 'onion', 'fiyaa',
  'garlic', 'lonumedu', 'potato', 'alubee', 'egg', 'bis', 'milk', 'kiru',
  'condensed', 'tea', 'sai', 'coffee', 'water', 'fen', 'salt', 'lonu',
  'chilli', 'mirus', 'tuna', 'mas', 'rihaakuru', 'valhomas', 'noodle',
  'bread', 'paan', 'biscuit', 'cracker', 'butter', 'cheese', 'ghee',
  'chicken', 'kukulhu', 'dhal', 'lentil', 'mug', 'tomato', 'lemon', 'lunbo',
  'curry', 'coconut', 'kaashi', 'soap', 'sabooni', 'detergent', 'washing',
  'tissue', 'diaper', 'pampers', 'toothpaste', 'shampoo', 'pasta', 'spaghetti',
  'ބަތް', 'ހަނޑޫ', 'ފުށް', 'ހަކުރު', 'ތެޔޮ', 'ފިޔާ', 'ލޮނުމެދު', 'އަލުބީ', 'ބިސް', 'ކިރު', 'ސައި', 'ފެން', 'ލޮނު', 'މިރުސް', 'މަސް', 'ރިހާކުރު', 'ޕާން', 'ސައިބޯނި',
];

export const isMaldivesDailyEssential = (product: Product): boolean => {
  const haystack = `${product.name_en || ''} ${product.name_dv || ''} ${product.category || ''}`.toLowerCase();
  return MALDIVES_ESSENTIAL_KEYWORDS.some((kw) => haystack.includes(kw));
};

const fetchAllProductsPaginated = async (): Promise<Product[]> => {
  if (!supabase) return [];
  const pageSize = 1000;
  let from = 0;
  const all: Product[] = [];

  while (true) {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('name_en', { ascending: true })
      .range(from, from + pageSize - 1);

    if (error || !data || data.length === 0) break;
    all.push(...(data as Product[]));
    if (data.length < pageSize) break;
    from += pageSize;
  }

  return all;
};

/**
 * Load public storefront products and shop/bank/telegram settings from Supabase
 */
export const fetchPublicShopData = async (): Promise<PublicShopData> => {
  if (!supabase) {
    return { products: [], shopSettings: { currency: 'MVR', shopName: 'B BACK', onlineShopEnabled: true } };
  }

  const [rawProducts, settingsRes] = await Promise.all([
    fetchAllProductsPaginated(),
    supabase
      .from('settings')
      .select('category, settings, updated_at')
      .in('category', ['shop', 'telegram', 'software'])
      .order('updated_at', { ascending: false }),
  ]);

  const settingsMap: Record<string, any> = {};
  if (Array.isArray(settingsRes.data)) {
    for (const row of settingsRes.data) {
      if (row?.category && !settingsMap[row.category] && row.settings && typeof row.settings === 'object') {
        settingsMap[row.category] = row.settings;
      }
    }
  }

  const storageCdnUrl = settingsMap.software?.storageCdnUrl;
  if (typeof window !== 'undefined' && storageCdnUrl) {
    (window as any).__STORAGE_CDN_URL__ = storageCdnUrl;
  }

  const shopSettings: Partial<ShopSettings> = {
    currency: 'MVR',
    shopName: 'B BACK',
    onlineShopEnabled: true,
    ...(settingsMap.shop || {}),
  };

  const telegramBotToken = settingsMap.telegram?.botToken || undefined;
  const telegramBotUsername = settingsMap.telegram?.botUsername || undefined;

  return {
    products: rawProducts,
    shopSettings,
    telegramBotToken,
    telegramBotUsername,
  };
};

/**
 * Hash a shop password using SHA-256 (Web Crypto API)
 */
export const hashShopPassword = async (password: string): Promise<string> => {
  const input = `bback_shop_${password}`;
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoded = new TextEncoder().encode(input);
    const digest = await crypto.subtle.digest('SHA-256', encoded);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return `fb_${Math.abs(hash).toString(16)}`;
};

/**
 * Step 1 of shop login: verify Customer Code + Mobile Number and check whether a password is already set
 */
export const verifyShopCustomerCredentials = async (
  code: string,
  phone: string
): Promise<{
  ok: boolean;
  customer?: Customer & { shop_password_hash?: string };
  needsPasswordSetup?: boolean;
  requiresPassword?: boolean;
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

  const { data: customers, error } = await supabase.from('customers').select('*');
  if (error) {
    return { ok: false, error: error.message };
  }

  const matched = (customers || []).find(
    (c: any) => codesMatch(c.code, cleanCode) && normalizePhone(c.phone) === cleanPhone
  ) as (Customer & { shop_password_hash?: string }) | undefined;

  if (matched) {
    const hasPassword = Boolean(matched.shop_password_hash && matched.shop_password_hash.trim());
    return {
      ok: true,
      customer: matched,
      needsPasswordSetup: !hasPassword,
      requiresPassword: hasPassword,
    };
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
 * Step 2A: First-time password setup for already-registered customers
 */
export const completeShopPasswordSetup = async (
  customerId: string,
  newPassword: string
): Promise<{ ok: boolean; customer?: Customer; error?: string }> => {
  if (!supabase) return { ok: false, error: 'Database unavailable.' };
  if (!newPassword || newPassword.length < 4) {
    return { ok: false, error: 'Password must be at least 4 characters.' };
  }

  const hash = await hashShopPassword(newPassword);
  const { data, error } = await supabase
    .from('customers')
    .update({ shop_password_hash: hash, updated_at: new Date().toISOString() })
    .eq('id', customerId)
    .select('*')
    .single();

  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true, customer: data as Customer };
};

/**
 * Step 2B: Verify password for returning customers
 */
export const loginShopCustomerWithPassword = async (
  code: string,
  phone: string,
  password: string
): Promise<{ ok: boolean; customer?: Customer; error?: string }> => {
  const check = await verifyShopCustomerCredentials(code, phone);
  if (!check.ok || !check.customer) {
    return { ok: false, error: check.error };
  }
  if (!check.customer.shop_password_hash) {
    return { ok: false, error: 'Please set a password first.' };
  }
  const enteredHash = await hashShopPassword(password);
  if (enteredHash !== check.customer.shop_password_hash) {
    return { ok: false, error: 'Incorrect password. Please try again.' };
  }
  return { ok: true, customer: check.customer };
};

/**
 * Method 1: Send a 6-digit password reset OTP to the customer's linked Telegram account
 */
export const requestTelegramPasswordReset = async (
  code: string,
  phone: string,
  botToken?: string
): Promise<{ ok: boolean; error?: string }> => {
  if (!supabase) return { ok: false, error: 'Database unavailable.' };

  const check = await verifyShopCustomerCredentials(code, phone);
  if (!check.ok || !check.customer) {
    return { ok: false, error: check.error || 'Customer not found.' };
  }

  if (!check.customer.telegram_chat_id) {
    return {
      ok: false,
      error: 'Telegram is not linked to this account yet. Please contact the store to reset your password.',
    };
  }

  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const otpHash = await hashShopPassword(otp);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  const { error: updateErr } = await supabase
    .from('customers')
    .update({
      shop_reset_code_hash: otpHash,
      shop_reset_expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq('id', check.customer.id);

  if (updateErr) {
    return { ok: false, error: updateErr.message };
  }

  const msg =
    `🔐 *B BACK Shop — Password Reset Code*\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `👤 *Customer:* ${check.customer.name_en || check.customer.name_dv} (#${check.customer.code})\n` +
    `🔢 *Reset Code:* \`${otp}\`\n\n` +
    `Enter this 6-digit code on https://shop.bback.store to set a new password.\n` +
    `_Valid for 10 minutes._`;

  const tgRes = await sendTelegramMessage(check.customer.telegram_chat_id, msg, botToken, 'Markdown');
  if (!tgRes.ok) {
    return { ok: false, error: tgRes.description || 'Could not send reset code to Telegram.' };
  }

  return { ok: true };
};

/**
 * Verify Telegram OTP and set a new password for the customer
 */
export const verifyAndResetTelegramPassword = async (
  code: string,
  phone: string,
  otp: string,
  newPassword: string
): Promise<{ ok: boolean; customer?: Customer; error?: string }> => {
  if (!supabase) return { ok: false, error: 'Database unavailable.' };
  if (!otp || otp.trim().length !== 6) {
    return { ok: false, error: 'Please enter the 6-digit code sent to your Telegram.' };
  }
  if (!newPassword || newPassword.length < 4) {
    return { ok: false, error: 'New password must be at least 4 characters.' };
  }

  const check = await verifyShopCustomerCredentials(code, phone);
  if (!check.ok || !check.customer) {
    return { ok: false, error: check.error || 'Customer not found.' };
  }

  const custAny = check.customer as Customer & {
    shop_reset_code_hash?: string;
    shop_reset_expires_at?: string;
  };

  if (!custAny.shop_reset_code_hash || !custAny.shop_reset_expires_at) {
    return { ok: false, error: 'No active reset code found. Please request a new code.' };
  }

  if (new Date(custAny.shop_reset_expires_at).getTime() < Date.now()) {
    return { ok: false, error: 'Reset code has expired. Please request a new code.' };
  }

  const enteredOtpHash = await hashShopPassword(otp.trim());
  if (enteredOtpHash !== custAny.shop_reset_code_hash) {
    return { ok: false, error: 'Invalid reset code. Please check your Telegram message and try again.' };
  }

  const newPassHash = await hashShopPassword(newPassword);
  const { data, error } = await supabase
    .from('customers')
    .update({
      shop_password_hash: newPassHash,
      shop_reset_code_hash: '',
      shop_reset_expires_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', check.customer.id)
    .select('*')
    .single();

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, customer: data as Customer };
};

/**
 * Admin helper: reset a customer's shop password so they can set a new one on next login
 */
export const resetCustomerShopPassword = async (
  customerId: string
): Promise<{ ok: boolean; error?: string }> => {
  if (!supabase) return { ok: false, error: 'Database unavailable.' };
  const { error } = await supabase
    .from('customers')
    .update({ shop_password_hash: '', updated_at: new Date().toISOString() })
    .eq('id', customerId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
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
      error: 'This mobile number is already registered! Please sign in using the Customer Code provided by the store.',
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
}> => {
  if (!supabase) return { found: false };
  const cleanPhone = normalizePhone(phone);
  if (!cleanPhone) return { found: false };

  const { data: customers } = await supabase.from('customers').select('phone');
  const approvedCust = (customers || []).find((c: any) => normalizePhone(c.phone) === cleanPhone);
  if (approvedCust) {
    return {
      found: true,
      status: 'APPROVED',
    };
  }

  const { data: regs } = await supabase
    .from('customer_registrations')
    .select('phone, status, created_at')
    .order('created_at', { ascending: false });

  const matched = (regs || []).find((r: any) => normalizePhone(r.phone) === cleanPhone);
  if (!matched) return { found: false };

  return {
    found: true,
    status: matched.status,
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

  const openStatus = isOnlineShopCurrentlyOpen(shopSettings);
  if (!openStatus.isOpen) {
    return { ok: false, error: openStatus.reason || 'Online store is currently closed.' };
  }

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

  const generateUuid = (): string => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  };

  const randSuffix = Math.floor(1000 + Math.random() * 9000);
  const orderNumber = `ORD-${Date.now().toString().slice(-4)}${randSuffix}`;
  const saleId = generateUuid();
  const salePaymentMethod = payment_method === 'CREDIT' ? 'credit' : 'cash';

  // 1. Save Sale directly to public.sales (Cash Sales or Credit Sales)
  const saleItems = items.map((it) => ({
    id: it.product_id,
    name_en: it.name_en,
    name_dv: it.name_dv || it.name_en,
    price: Number(it.unit_price || 0),
    qty: Number(it.quantity || 1),
    image: it.image || '',
    is_zero_tax: false,
  }));

  const { error: saleError } = await supabase.from('sales').insert([
    {
      id: saleId,
      date: new Date().toISOString(),
      customer_id: customer.id,
      items: saleItems,
      grand_total: total,
      payment_method: salePaymentMethod,
      paid_amount: salePaymentMethod === 'credit' ? 0 : total,
      balance: salePaymentMethod === 'credit' ? total : 0,
      invoice_number: orderNumber,
      split_details: null,
    },
  ]);

  if (saleError) {
    console.warn('Could not save online order to sales table:', saleError.message);
  }

  // 2. Deduct product shop stock
  await Promise.all(
    items.map(async (it) => {
      const { data: prod } = await supabase
        .from('products')
        .select('stock_shop')
        .eq('id', it.product_id)
        .maybeSingle();
      if (prod) {
        const nextStock = Math.round(Number(prod.stock_shop || 0) - Number(it.quantity || 0));
        await supabase
          .from('products')
          .update({ stock_shop: nextStock, updated_at: new Date().toISOString() })
          .eq('id', it.product_id);
      }
    })
  ).catch(() => {});

  // 3. Increment customer's outstanding_balance when Credit
  if (payment_method === 'CREDIT') {
    const latest = await refreshShopCustomer(customer.id);
    const currentOut = Number((latest || customer).outstanding_balance || 0);
    await supabase
      .from('customers')
      .update({
        outstanding_balance: Number((currentOut + total).toFixed(2)),
        updated_at: new Date().toISOString(),
      })
      .eq('id', customer.id);
  }

  // 4. Insert online_orders record linked with pos_sale_id
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
      pos_sale_id: saleError ? '' : saleId,
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

