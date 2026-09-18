"use client";

import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from 'react';
import { showError, showSuccess } from '@/utils/toast';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/components/ThemeProvider';

import { toISODate, toISODatetime, extractDateOnly } from '@/utils/formatters';
import { 
  processPendingTelegramUpdates, 
  sendTelegramSlipApprovedMessage, 
  sendTelegramSlipDeclinedMessage,
  sendNightlyExecutiveBriefing,
  sendAutomatedCreditReminder,
  sendAutoTransferToCreditNotification,
} from '@/services/telegramService';

export interface Product {
  id: string;
  name_dv: string;
  name_en: string;
  price: number;
  cost_price?: number; // Latest cost from purchases
  last_purchase_date?: string; // Track when cost was updated
  image: string; // Can be URL or Base64
  barcode: string;
  item_code: string;
  expiry_date?: string;
  stock_shop: number;
  stock_godown: number;
  category: string;
  is_zero_tax: boolean;
  units?: { name: string; price: number; conversion_factor: number; barcode: string }[];
}

export interface Settlement {
  id: string;
  amount_paid: number;
  date: string;
  previous_outstanding: number;
  new_outstanding: number;
}

export interface TransferSlip {
  id: string;
  customer_id?: string;
  telegram_chat_id: number | string;
  customer_name: string;
  customer_phone?: string;
  file_id: string;
  file_url?: string;
  caption?: string;
  suggested_amount?: number | null;
  settled_amount?: number | null;
  status: 'pending' | 'confirmed' | 'rejected';
  settlement_id?: string | null;
  rejection_reason?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface Customer {
  id: string;
  code: string;
  name_dv: string;
  name_en: string;
  phone: string;
  email: string;
  credit_limit: number;
  loyalty_points: number;
  outstanding_balance: number;
  telegram_chat_id?: number | null;
  settlement_history: Settlement[];
}

export interface CartItem extends Product {
  qty: number;
  selected_unit?: string;
  unit_price?: number;
  unit_conversion?: number;
}

export interface Cart {
  id: string;
  displayNumber: number;
  customer: Customer | null;
  items: CartItem[];
}

export interface Sale {
  id: string;
  date: string;
  customer: Customer | null;
  items: CartItem[];
  grandTotal: number;
  paymentMethod: 'cash' | 'credit' | 'card' | 'mobile';
  paidAmount?: number;
  balance?: number;
  invoiceNumber?: string;
  splitDetails?: any[];
}

export interface Vendor {
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
}

export interface ProductPriceUpdate {
  product: Product;
  newCostPrice: number;
  currentSellingPrice: number;
  recommendedSellingPrice: number;
}

export interface PurchaseItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number; // Cost price per unit
  subtotal: number; // quantity * unit_price
  gst_amount: number; // subtotal * gst_rate
  total: number; // subtotal + gst_amount
}

export interface Purchase {
  id: string;
  date: string;
  vendor: string; // Legacy field for backward compatibility
  vendorId?: string; // New field to reference Vendor by ID
  billNumber: string;
  amount: number; // For legacy purchases or calculated from items
  gstAmount: number; // For legacy purchases or calculated from items
  description: string;
  items?: PurchaseItem[]; // Product line items (new purchases)
  subtotal?: number; // Sum of all item subtotals
}

export type ExpenseCategory = 'electricity' | 'zakat_al_mal' | 'naalu' | 'disposal_charge' | 'other';

export interface Expense {
  id: string;
  date: string;
  category: ExpenseCategory;
  title: string;
  amount: number;
  paymentMethod: 'cash' | 'card' | 'transfer' | 'other';
  referenceNumber?: string;
  notes?: string;
  recordedBy?: string;
  createdAt?: string;
}

interface ShopSettings {
  shopName: string;
  shopAddress: string;
  shopPhone: string;
  shopEmail: string;
  currency: string;
  taxRate: number;
  receiptHeader: string;
  receiptFooter: string;
  logo: string; // Base64 or URL
  enableCardPayment: boolean;
  bankName?: string;
  accountName?: string;
  accountNumber?: string;
  telegramGroupChatId?: string | number;
  telegramGroupTitle?: string;
}

interface AccountingSettings {
  fiscalYearStart: string;
  accountingMethod: string;
  taxCalculation: string;
  defaultPaymentTerms: string;
  enableCreditSales: boolean;
  creditLimit: number;
  latePaymentFee: number;
  latePaymentGracePeriod: number;
}

interface SoftwareSettings {
  language: string;
  dateFormat: string;
  timeFormat: string;
  theme: string;
  autoBackup: boolean;
  backupFrequency: string;
  dataRetentionPeriod: number;
  enableAnalytics: boolean;
  enableNotifications: boolean;
}

interface GeneralSettings {
  appName: string;
  appVersion: string;
  enableMultiCart: boolean;
  maxCarts: number;
  barcodeScannerEnabled: boolean;
  receiptPrinterEnabled: boolean;
  defaultDiscount: number;
  enableLoyaltyProgram: boolean;
  loyaltyAmountPerPoint: number;
  loyaltyPointsValue: number;
  loyaltyMinRedeemPoints: number;
  enableCustomerDisplay: boolean;
  customerDisplayIdleTimeout: number;
  customerDisplayOffers: CustomerDisplayOffer[];
}

export interface CustomerDisplayOffer {
  id: string;
  type: 'image' | 'text';
  image?: string;
  title?: string;
  subtitle?: string;
  priceText?: string;
}

interface ReportSettings {
  defaultReportType: string;
  defaultTimeRange: string;
  includeZeroSales: boolean;
  includeReturns: boolean;
  includeDiscounts: boolean;
  includeTaxes: boolean;
  groupBy: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  reportFormat: 'pdf' | 'excel' | 'csv';
  includeCharts: boolean;
  invoiceHeader: string;
  invoiceFooter: string;
  quotationHeader: string;
  quotationFooter: string;
  customerOutstandingHeader: string;
  customerOutstandingFooter: string;
  showLogo: boolean;
  showContactInfo: boolean;
}

interface PrintSettings {
  printReceiptOnCheckout: boolean;
  printMode: 'auto' | 'ask' | 'off';
  printerName: string;
  thermalPrinterWidth: '58mm' | '80mm';
  enableDirectPrint: boolean;
  useQzTray: boolean;
}

interface TelegramSettings {
  botToken: string;
  botUsername: string;
  autoSendPaymentReceipts: boolean;
  autoSendSaleReceipts: boolean;
  webhookUrl: string;
  ownerChatId?: string | number;
  groupChatId?: string | number;
  autoExecutiveBriefing?: boolean;
  autoCreditReminderThreshold?: boolean;
  creditReminderThresholdPct?: number; // e.g. 90
  autoMonthlyCreditReminder?: boolean;
  lastMonthlyReminderSentMonth?: string;
  lastNightlyBriefingDate?: string;
}

interface AppSettings {
  shop: ShopSettings;
  accounting: AccountingSettings;
  software: SoftwareSettings;
  general: GeneralSettings;
  reports: ReportSettings;
  printing: PrintSettings;
  telegram: TelegramSettings;
}

interface AppContextType {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  sales: Sale[];
  setSales: React.Dispatch<React.SetStateAction<Sale[]>>;
  favoriteProductIds: string[];
  setFavoriteProductIds: React.Dispatch<React.SetStateAction<string[]>>;
  getTopProducts: (limit: number) => Product[];
  settings: AppSettings;
  updateSettings: (category: keyof AppSettings, settings: any) => void;
  getNextCustomerCode: () => string;
  getNextProductCode: () => string;
  clearCart: (cartId: string) => void;
  updateStock: (productId: string, newStock: number) => void;
  updateProduct: (updatedProduct: Product) => Promise<void>;
  addProduct: (product: Product) => Promise<void>;
  deleteProduct: (productId: string) => Promise<void>;
  bulkDeleteProducts: (productIds: string[]) => Promise<void>;
  bulkImportProducts: (importedProducts: Product[], onProgress?: (percent: number, count: number) => void) => Promise<void>;
  transferStock: (productId: string, from: 'shop' | 'godown', to: 'shop' | 'godown', amount: number) => Promise<void>;
  openCarts: Map<string, Cart>;
  setOpenCarts: React.Dispatch<React.SetStateAction<Map<string, Cart>>>;
  activeCartId: string;
  setActiveCartId: React.Dispatch<React.SetStateAction<string>>;
  awardLoyaltyPoints: (customerId: string, points: number) => Promise<void>;
  redeemLoyaltyPoints: (customerId: string, points: number) => Promise<void>;
  updateCustomerBalance: (customerId: string, amount: number) => Promise<void>;
  addSettlement: (customerId: string, settlement: Settlement) => Promise<void>;
  purchases: Purchase[];
  addPurchase: (purchase: Purchase) => Promise<void>;
  deletePurchase: (purchaseId: string) => Promise<void>;
  vendors: Vendor[];
  setVendors: React.Dispatch<React.SetStateAction<Vendor[]>>;
  addVendor: (vendor: Vendor) => Promise<void>;
  updateVendor: (vendor: Vendor) => Promise<void>;
  deleteVendor: (vendorId: string) => Promise<void>;
  clearAllData: () => Promise<void>;
  getNextVendorCode: () => string;
  updateProductCostPrice: (productId: string, newCost: number, purchaseDate: string) => Promise<void>;
  calculateProfitMargin: (product: Product) => number;
  addSale: (sale: Sale) => Promise<Sale>;
  addCustomer: (customer: Customer) => Promise<Customer | void>;
  updateCustomer: (customer: Customer) => Promise<void>;
  pendingTransfers: any[];
  addPendingTransfer: (transfer: any) => void;
  resolvePendingTransfer: (id: string, action: 'cash' | 'credit', silent?: boolean) => Promise<void>;
  autoResolveExpiredPendingTransfers: () => Promise<void>;
  convertAllPendingToCredit: () => Promise<void>;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  isPurchaseWindowOpen: boolean;
  setIsPurchaseWindowOpen: (open: boolean) => void;
  isPurchaseWindowMinimized: boolean;
  setIsPurchaseWindowMinimized: React.Dispatch<React.SetStateAction<boolean>>;
  refreshCustomers: () => Promise<void>;
  expenses: Expense[];
  setExpenses: React.Dispatch<React.SetStateAction<Expense[]>>;
  addExpense: (expense: Expense) => Promise<void>;
  updateExpense: (expense: Expense) => Promise<void>;
  deleteExpense: (expenseId: string) => Promise<void>;
  transferSlips: TransferSlip[];
  pendingSlipsCount: number;
  fetchTransferSlips: () => Promise<void>;
  confirmTransferSlip: (slipId: string, amountPaid: number) => Promise<boolean>;
  rejectTransferSlip: (slipId: string, reason: string) => Promise<boolean>;
  addTransferSlip: (slip: Partial<TransferSlip>) => Promise<TransferSlip | null>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppContextProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { setTheme } = useTheme();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('app_expenses');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            const mockIds = ['exp-1', 'exp-2', 'exp-3', 'exp-4'];
            return parsed.filter((e: any) => !mockIds.includes(e.id));
          }
        }
      } catch (e) {
        console.error('Error parsing app_expenses', e);
      }
    }
    return [];
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('app_expenses', JSON.stringify(expenses));
    }
  }, [expenses]);

  const [transferSlips, setTransferSlips] = useState<TransferSlip[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('pos_transfer_slips');
        if (saved) return JSON.parse(saved);
      } catch (e) {
        console.error('Error parsing pos_transfer_slips', e);
      }
    }
    return [];
  });

  const pendingSlipsCount = transferSlips.filter(s => s.status === 'pending').length;

  const fetchTransferSlips = useCallback(async () => {
    try {
      if (!supabase) return;
      const { data, error } = await supabase
        .from('transfer_slips')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        // Extract group config if stored in transfer_slips
        const configRow = data.find((item: any) => item.status === 'system_config' && item.file_id === 'group_config');
        if (configRow?.telegram_chat_id) {
          setSettings((prev) => ({
            ...prev,
            shop: {
              ...prev.shop,
              telegramGroupChatId: prev.shop.telegramGroupChatId || configRow.telegram_chat_id,
              telegramGroupTitle: prev.shop.telegramGroupTitle || configRow.customer_name || 'B BACK',
            },
          }));
        }

        // Only show actual customer transfer slips to cashiers
        const actualSlips = data.filter((item: any) => item.status !== 'system_config');
        setTransferSlips(actualSlips as TransferSlip[]);
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('pos_transfer_slips', JSON.stringify(actualSlips));
          } catch {}
        }
      }
    } catch (err) {
      console.warn('Could not fetch transfer_slips:', err);
    }
  }, []);

  useEffect(() => {
    fetchTransferSlips();
    const interval = setInterval(fetchTransferSlips, 15000);
    return () => clearInterval(interval);
  }, [fetchTransferSlips]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebar_collapsed');
      return saved === 'true';
    }
    return false;
  });

  useEffect(() => {
    localStorage.setItem('sidebar_collapsed', String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  const isAutoResolvingRef = React.useRef(false);

  const [pendingTransfers, setPendingTransfers] = useState<any[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('pending_transfers');
        return saved ? JSON.parse(saved) : [];
      } catch (e) {
        console.error('Error parsing pending_transfers', e);
        return [];
      }
    }
    return [];
  });

  const refreshCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('name_en', { ascending: true });

      if (error) {
        console.error('Supabase refresh error:', error);
        throw error;
      }

      if (data) {
        // Fetch settlements separately
        const { data: settlementsData } = await supabase.from('settlements').select('*');
        
        const formatted = data.map(c => ({
          ...c,
          settlement_history: (settlementsData?.filter(s => s.customer_id === c.id) || []).map(s => {
            const isMidnight = !s.date || !s.date.includes('T') || s.date.endsWith('T00:00:00.000Z') || s.date.endsWith('T00:00:00+00:00') || s.date.endsWith(' 00:00:00');
            return {
              ...s,
              date: (isMidnight && s.created_at) ? s.created_at : (s.date || s.created_at || ''),
            };
          })
        }));
        setCustomers(formatted);
        showSuccess('Customers synchronized with database');
      }
    } catch (error: any) {
      console.error('Error refreshing customers:', error);
      showError('Failed to refresh customers: ' + (error.message || 'Unknown error'));
    }
  };

  // Robust helper to fetch all rows across pages (bypasses Supabase 1000-row PostgREST default limit)
  const fetchAllFromTable = async (tableName: string, selectFields = '*', orderBy?: { column: string; ascending?: boolean }) => {
    if (!supabase) return [];
    const PAGE_SIZE = 1000;
    let allRows: any[] = [];
    let from = 0;
    let hasMore = true;

    while (hasMore) {
      let query = supabase.from(tableName).select(selectFields);
      if (orderBy) {
        query = query.order(orderBy.column, { ascending: orderBy.ascending ?? true });
      } else {
        query = query.order('id', { ascending: true });
      }
      const { data, error } = await query.range(from, from + PAGE_SIZE - 1);

      if (error) {
        console.error(`Error fetching page for ${tableName} (range ${from}-${from + PAGE_SIZE - 1}):`, error);
        break;
      }

      if (data && data.length > 0) {
        allRows = allRows.concat(data);
        if (data.length < PAGE_SIZE) {
          hasMore = false;
        } else {
          from += PAGE_SIZE;
        }
      } else {
        hasMore = false;
      }
    }
    return allRows;
  };

  // Central data fetching from Supabase
  const fetchData = async () => {
    try {
      const [
        productsData,
        customersData,
        { data: salesData },
        vendorsData,
        purchasesData,
        settlementsData,
        { data: settingsData }
      ] = await Promise.all([
        fetchAllFromTable('products'),
        fetchAllFromTable('customers', '*', { column: 'name_en', ascending: true }),
        supabase.from('sales').select('*').order('date', { ascending: false }).limit(2000),
        fetchAllFromTable('vendors'),
        fetchAllFromTable('purchases'),
        fetchAllFromTable('settlements'),
        supabase.from('settings').select('*')
      ]);

      if (productsData && productsData.length > 0) {
        const sanitizedProducts = productsData.map(p => {
          let units = p.units;
          if (typeof units === 'string') {
            try { units = JSON.parse(units); } catch (e) { units = []; }
          }
          return {
            ...p,
            item_code: p.item_code !== undefined && p.item_code !== null ? String(p.item_code).trim() : '',
            barcode: p.barcode !== undefined && p.barcode !== null ? String(p.barcode).trim() : '',
            units: Array.isArray(units) ? units : []
          };
        });
        setProducts(sanitizedProducts);
        console.log(`Successfully fetched all ${sanitizedProducts.length} products from Supabase!`);
      }
      if (customersData && customersData.length > 0) {
        const formattedCustomers = customersData.map(c => ({
          ...c,
          settlement_history: (settlementsData?.filter(s => s.customer_id === c.id) || []).map(s => {
            const isMidnight = !s.date || !s.date.includes('T') || s.date.endsWith('T00:00:00.000Z') || s.date.endsWith('T00:00:00+00:00') || s.date.endsWith(' 00:00:00');
            return {
              ...s,
              date: (isMidnight && s.created_at) ? s.created_at : (s.date || s.created_at || ''),
            };
          })
        }));
        setCustomers(formattedCustomers);
      }
      if (salesData) {
        console.log(`Successfully fetched ${salesData.length} sales from Supabase`);
        const linkedSales = salesData.map(s => {
          const saleDate = extractDateOnly(s.date);
          
          // Handle potentially stringified JSON fields
          let items = s.items;
          if (typeof items === 'string') {
            try { items = JSON.parse(items); } catch (e) { items = []; }
          }
          
          let splitDetails = s.split_details;
          if (typeof splitDetails === 'string') {
            try { splitDetails = JSON.parse(splitDetails); } catch (e) { splitDetails = null; }
          }

          const customer = customersData?.find(c => c.id.toLowerCase() === s.customer_id?.toLowerCase()) || null;
          
          return {
            ...s,
            date: s.date,
            items: Array.isArray(items) ? items : [],
            customer: customer,
            grandTotal: Number(s.grand_total || 0),
            paymentMethod: String(s.payment_method || 'cash').toLowerCase(),
            paidAmount: Number(s.paid_amount || 0),
            balance: Number(s.balance || 0),
            invoiceNumber: s.invoice_number || `${String(s.payment_method || '').toLowerCase() === 'credit' ? 'CRINV' : 'INV'}/${new Date(s.date).getFullYear().toString().slice(-2)}/${(new Date(s.date).getMonth() + 1).toString().padStart(2, '0')}/${String(s.id).replace(/\D/g, '').slice(-3).padStart(3, '0') || '001'}`,
            splitDetails: splitDetails
          };
        });
        
        if (linkedSales.length > 0) {
          console.log('First linked sale sample:', {
            id: linkedSales[0].id,
            itemCount: linkedSales[0].items.length,
            customerName: linkedSales[0].customer?.name_en
          });
        }
        
        setSales(linkedSales);
      }
      if (vendorsData) setVendors(vendorsData);
      if (purchasesData) {
        const mappedPurchases: Purchase[] = purchasesData.map(p => ({
          id: p.id,
          date: p.date,
          vendor: p.vendor || p.vendor_name || '',
          vendorId: p.vendor_id || undefined,
          billNumber: p.bill_number || '',
          amount: Number(p.amount || 0),
          gstAmount: Number(p.gst_amount || 0),
          description: p.description || '',
          items: p.items || []
        }));
        setPurchases(mappedPurchases);
      }
      if (settingsData && settingsData.length > 0) {
        setSettings(prev => {
          const newSettings = { ...prev } as any;
          settingsData.forEach(row => {
            if (newSettings[row.category]) {
              newSettings[row.category] = { ...newSettings[row.category], ...row.settings };
            }
          });
          return newSettings as AppSettings;
        });
      }

      // Safe fetch for expenses if Supabase table is created
      try {
        const { data: expensesData, error: expError } = await supabase
          .from('expenses')
          .select('*')
          .order('date', { ascending: false });

        if (!expError && expensesData) {
          const mockIds = ['exp-1', 'exp-2', 'exp-3', 'exp-4'];
          const userExpenses = expensesData
            .filter((e: any) => !mockIds.includes(e.id))
            .map((e: any) => ({
              id: e.id,
              date: e.date,
              category: e.category,
              title: e.title,
              amount: Number(e.amount || 0),
              paymentMethod: e.payment_method || e.paymentMethod || 'cash',
              referenceNumber: e.reference_number || e.referenceNumber,
              notes: e.notes,
              recordedBy: e.recorded_by || e.recordedBy,
              createdAt: e.created_at || e.createdAt
            }));
          setExpenses(userExpenses);
        }
      } catch (expErr) {
        // Table does not exist in Supabase yet, localStorage will maintain expenses seamlessly
      }
    } catch (error) {
      console.error('Error fetching data from Supabase:', error);
      // Don't show error toast on background refresh
    }
  };

  // Initial Data Fetching from Supabase
  useEffect(() => {
    fetchData();
  }, []);

  const [favoriteProductIds, setFavoriteProductIds] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('favorite_products');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error('Error parsing favorite_products', e);
        }
      }
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('favorite_products', JSON.stringify(favoriteProductIds));
  }, [favoriteProductIds]);

  const [openCarts, setOpenCarts] = useState<Map<string, Cart>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('open_carts');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          return new Map(parsed);
        } catch (e) {
          console.error('Error parsing open_carts', e);
        }
      }
    }
    const initialCartId = `cart-${Date.now()}`;
    return new Map([[initialCartId, { id: initialCartId, displayNumber: 1, customer: null, items: [] }]]);
  });
  const [activeCartId, setActiveCartId] = useState<string>([...openCarts.keys()][0]);

  useEffect(() => {
    localStorage.setItem('open_carts', JSON.stringify(Array.from(openCarts.entries())));
  }, [openCarts]);

  useEffect(() => {
    localStorage.setItem('pending_transfers', JSON.stringify(pendingTransfers));
  }, [pendingTransfers]);

  const [isPurchaseWindowOpen, setIsPurchaseWindowOpen] = useState(false);
  const [isPurchaseWindowMinimized, setIsPurchaseWindowMinimized] = useState(false);

  const [settings, setSettings] = useState<AppSettings>(() => {
    const defaultSettings: AppSettings = {
      shop: {
        shopName: 'My Retail Shop',
        shopAddress: 'Male, Maldives',
        shopPhone: '9336337',
        shopEmail: 'info@myshop.com',
        currency: 'MVR',
        taxRate: 8,
        receiptHeader: 'Thank you for shopping with us!',
        receiptFooter: 'Visit us again soon!',
        logo: '',
        enableCardPayment: true,
      },
      accounting: {
        fiscalYearStart: 'January',
        accountingMethod: 'accrual',
        taxCalculation: 'inclusive',
        defaultPaymentTerms: 'due_on_receipt',
        enableCreditSales: true,
        creditLimit: 10000,
        latePaymentFee: 5,
        latePaymentGracePeriod: 7,
      },
      software: {
        language: 'dv',
        dateFormat: 'DD/MM/YYYY',
        timeFormat: '24-hour',
        theme: 'light',
        autoBackup: true,
        backupFrequency: 'daily',
        dataRetentionPeriod: 365,
        enableAnalytics: true,
        enableNotifications: true,
      },
      general: {
        appName: 'Retail POS System',
        appVersion: '1.0.0',
        enableMultiCart: true,
        maxCarts: 5,
        barcodeScannerEnabled: true,
        receiptPrinterEnabled: true,
        defaultDiscount: 0,
        enableLoyaltyProgram: true,
        loyaltyAmountPerPoint: 20,
        loyaltyPointsValue: 10,
        loyaltyMinRedeemPoints: 10,
        enableCustomerDisplay: true,
        customerDisplayIdleTimeout: 10,
        customerDisplayOffers: [],
      },
      reports: {
        defaultReportType: 'sales',
        defaultTimeRange: 'today',
        includeZeroSales: false,
        includeReturns: true,
        includeDiscounts: true,
        includeTaxes: true,
        groupBy: 'day',
        sortBy: 'date',
        sortOrder: 'desc',
        reportFormat: 'pdf',
        includeCharts: true,
        invoiceHeader: 'INVOICE',
        invoiceFooter: 'Thank you for your business!',
        quotationHeader: 'QUOTATION',
        quotationFooter: 'Valid for 30 days.',
        customerOutstandingHeader: 'CUSTOMER OUTSTANDING REPORT',
        customerOutstandingFooter: 'Please settle your balance as soon as possible.',
        showLogo: true,
        showContactInfo: true,
      },
      printing: {
        printReceiptOnCheckout: true,
        printMode: 'ask',
        printerName: '',
        thermalPrinterWidth: '80mm',
        enableDirectPrint: false,
        useQzTray: false,
      },
      telegram: {
        botToken: '8815725998:AAHVMSujW5JM-ND4CJAzPr_Qsj_enXm2cYQ',
        botUsername: 'Bbacksh0p_bot',
        autoSendPaymentReceipts: true,
        autoSendSaleReceipts: false,
        webhookUrl: '',
        ownerChatId: '',
        autoExecutiveBriefing: true,
        autoCreditReminderThreshold: true,
        creditReminderThresholdPct: 90,
        autoMonthlyCreditReminder: true,
        lastMonthlyReminderSentMonth: '',
        lastNightlyBriefingDate: '',
      },
    };

    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('app_settings');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          return {
            ...defaultSettings,
            ...parsed,
            shop: { ...defaultSettings.shop, ...(parsed.shop || {}) },
            accounting: { ...defaultSettings.accounting, ...(parsed.accounting || {}) },
            software: { ...defaultSettings.software, ...(parsed.software || {}) },
            general: { ...defaultSettings.general, ...(parsed.general || {}) },
            reports: { ...defaultSettings.reports, ...(parsed.reports || {}) },
            printing: { ...defaultSettings.printing, ...(parsed.printing || {}) },
            telegram: { ...defaultSettings.telegram, ...(parsed.telegram || {}) },
          };
        } catch (e) {
          console.error('Error parsing settings from localStorage', e);
        }
      }
    }
    return defaultSettings;
  });

  useEffect(() => {
    if (settings) {
      localStorage.setItem('app_settings', JSON.stringify(settings));
    }
  }, [settings]);

  const clearCart = (cartId: string) => {
    // Logic as before
  };

  const updateStock = async (productId: string, newStock: number) => {
    try {
      const intStock = Math.round(Number(newStock)) || 0;
      const { error } = await supabase
        .from('products')
        .update({ stock_shop: intStock })
        .eq('id', productId);

      if (error) throw error;

      setProducts(prev => prev.map(p =>
        p.id === productId ? { ...p, stock_shop: intStock } : p
      ));
    } catch (error) {
      console.error('Error updating stock:', error);
      showError('Failed to update stock in database');
    }
  };

  const transferStock = async (productId: string, from: 'shop' | 'godown', to: 'shop' | 'godown', amount: number) => {
    try {
      const product = products.find(p => p.id === productId);
      if (!product) return;

      const sourceStock = from === 'shop' ? product.stock_shop : product.stock_godown;
      if (sourceStock < amount) return;

      const updateData = {
        stock_shop: Math.round(from === 'shop' ? product.stock_shop - amount : product.stock_shop + amount),
        stock_godown: Math.round(from === 'godown' ? product.stock_godown - amount : product.stock_godown + amount)
      };

      const { error } = await supabase
        .from('products')
        .update(updateData)
        .eq('id', productId);

      if (error) throw error;

      setProducts(prev => prev.map(p => {
        if (p.id !== productId) return p;
        return { ...p, ...updateData };
      }));
    } catch (error) {
      console.error('Error transferring stock:', error);
      showError('Failed to transfer stock in database');
    }
  };

  const awardLoyaltyPoints = async (customerId: string, points: number) => {
    try {
      const customer = customers.find(c => c.id === customerId);
      const currentPts = customer?.loyalty_points || 0;
      const newPoints = currentPts + points;

      const { error } = await supabase
        .from('customers')
        .update({ loyalty_points: newPoints })
        .eq('id', customerId);

      if (error) {
        console.warn('Supabase update loyalty_points error:', error);
      }

      setCustomers(prev => prev.map(c =>
        c.id === customerId ? { ...c, loyalty_points: (c.loyalty_points || 0) + points } : c
      ));

      showSuccess(`⭐ +${points} Loyalty Points (ލޯޔަލްޓީ ޕޮއިންޓް) awarded!`);
    } catch (error) {
      console.error('Error awarding loyalty points:', error);
    }
  };

  const redeemLoyaltyPoints = async (customerId: string, points: number) => {
    try {
      const customer = customers.find(c => c.id === customerId);
      const currentPts = customer?.loyalty_points || 0;
      const newPoints = Math.max(0, currentPts - points);

      const { error } = await supabase
        .from('customers')
        .update({ loyalty_points: newPoints })
        .eq('id', customerId);

      if (error) {
        console.warn('Supabase update loyalty_points error:', error);
      }

      setCustomers(prev => prev.map(c =>
        c.id === customerId ? { ...c, loyalty_points: Math.max(0, (c.loyalty_points || 0) - points) } : c
      ));

      showSuccess(`⭐ -${points} Loyalty Points (ލޯޔަލްޓީ ޕޮއިންޓް) redeemed!`);
    } catch (error) {
      console.error('Error redeeming loyalty points:', error);
    }
  };

  const updateCustomerBalance = async (customerId: string, amount: number) => {
    try {
      console.log(`Updating balance for customer ${customerId} by amount ${amount}`);
      const customer = customers.find(c => c.id === customerId);
      if (!customer) {
        console.error('Customer not found for balance update:', customerId);
        return;
      }

      const newBalance = (customer.outstanding_balance || 0) + amount;
      console.log(`New balance will be: ${newBalance}`);
      
      const { error } = await supabase
        .from('customers')
        .update({ outstanding_balance: newBalance })
        .eq('id', customerId);

      if (error) {
        console.error('Supabase update balance error:', error);
        throw error;
      }

      setCustomers(prev => prev.map(c =>
        c.id === customerId ? { ...c, outstanding_balance: newBalance } : c
      ));
      console.log('Balance updated successfully in both DB and state');
    } catch (error) {
      console.error('Error updating customer balance:', error);
      showError('Failed to update customer balance');
      throw error;
    }
  };

  const generateInvoiceNumber = (dateStr: string, isCredit: boolean, existingSales: Sale[]) => {
    const prefix = isCredit ? 'CRINV/' : 'INV/';
    const date = dateStr ? new Date(dateStr) : new Date();
    const validDate = isNaN(date.getTime()) ? new Date() : date;
    const year = validDate.getFullYear().toString().slice(-2);
    const month = (validDate.getMonth() + 1).toString().padStart(2, '0');
    
    const prefixStr = `${prefix}${year}/${month}/`;
    
    let maxSeq = 0;
    (existingSales || []).forEach(s => {
      if (s.invoiceNumber && s.invoiceNumber.startsWith(prefixStr)) {
        const seqStr = s.invoiceNumber.slice(prefixStr.length);
        const seq = parseInt(seqStr, 10);
        if (!isNaN(seq) && seq > maxSeq) {
          maxSeq = seq;
        }
      }
    });
    
    const nextSeq = (maxSeq + 1).toString().padStart(3, '0');
    return `${prefixStr}${nextSeq}`;
  };

  const addSale = async (sale: Sale): Promise<Sale> => {
    try {
      const isCredit = String(sale.paymentMethod).toLowerCase() === 'credit';
      const invoiceNumber = sale.invoiceNumber || generateInvoiceNumber(sale.date, isCredit, sales);
      const saleWithInvoice = { ...sale, invoiceNumber };

      console.log('Adding sale to Supabase:', saleWithInvoice.id, saleWithInvoice.paymentMethod, saleWithInvoice.invoiceNumber);
      
      const { error } = await supabase
        .from('sales')
        .insert([{
          id: saleWithInvoice.id,
          date: toISODatetime(), // Use full timestamp for sorting and accuracy
          customer_id: saleWithInvoice.customer?.id || null,
          items: saleWithInvoice.items,
          grand_total: Number(saleWithInvoice.grandTotal),
          payment_method: String(saleWithInvoice.paymentMethod).toLowerCase(),
          paid_amount: saleWithInvoice.paidAmount !== undefined ? Number(saleWithInvoice.paidAmount) : null,
          balance: saleWithInvoice.balance !== undefined ? Number(saleWithInvoice.balance) : null,
          invoice_number: saleWithInvoice.invoiceNumber,
          split_details: saleWithInvoice.splitDetails || null
        }]);

      if (error) {
        console.error('Supabase add sale error:', error);
        throw error;
      }

      setSales(prev => [saleWithInvoice, ...prev]);
      console.log('Sale added successfully to local state');

      // Update stock levels asynchronously without blocking the UI
      Promise.all(sale.items.map(async (item) => {
        const product = products.find(p => p.id === item.id);
        if (product) {
          const qtyToDeduct = item.qty * (item.unit_conversion || 1);
          await updateStock(product.id, product.stock_shop - qtyToDeduct);
        }
      })).catch(err => console.error('Error updating stock after sale:', err));

      // Automatic 90% credit threshold reminder via Telegram
      if (saleWithInvoice.customer?.id && settings.telegram?.autoCreditReminderThreshold !== false) {
        const cust = customers.find(c => c.id === saleWithInvoice.customer?.id);
        if (cust && cust.telegram_chat_id && cust.credit_limit > 0) {
          const thresholdPct = settings.telegram?.creditReminderThresholdPct || 90;
          const limit = Number(cust.credit_limit);
          const isCreditTx = String(saleWithInvoice.paymentMethod).toLowerCase() === 'credit' ||
            (String(saleWithInvoice.paymentMethod).toLowerCase() === 'split' && saleWithInvoice.splitDetails?.some((d: any) => d.method?.toLowerCase() === 'credit'));
          const creditAmount = isCreditTx 
            ? (String(saleWithInvoice.paymentMethod).toLowerCase() === 'credit' 
                ? Number(saleWithInvoice.grandTotal) 
                : saleWithInvoice.splitDetails?.filter((d: any) => d.method?.toLowerCase() === 'credit').reduce((s: number, d: any) => s + d.amount, 0) || 0)
            : 0;
          const newBalance = (cust.outstanding_balance || 0) + creditAmount;
          if (newBalance >= limit * (thresholdPct / 100)) {
            sendAutomatedCreditReminder({
              chatId: cust.telegram_chat_id,
              customer: cust,
              shopSettings: settings.shop,
              balance: newBalance,
              isThreshold: true,
              thresholdPct,
              creditLimit: limit,
              token: settings.telegram?.botToken,
            }).catch(e => console.warn('Credit threshold alert error:', e));
          }
        }
      }
      
      // Do NOT await fetchData() here to prevent race conditions with optimistic state

      return saleWithInvoice;
    } catch (error) {
      console.error('Error adding sale:', error);
      showError('Failed to save sale to database');
      throw error;
    }
  };

  const addCustomer = async (customer: Customer) => {
    try {
      // Strip settlement_history as it's a relation, not a column
      const { settlement_history, ...customerData } = customer;
      
      const insertPayload: any = {
        code: customerData.code,
        name_dv: customerData.name_dv,
        name_en: customerData.name_en,
        phone: customerData.phone,
        email: customerData.email || '',
        credit_limit: Number(customerData.credit_limit) || 0,
        loyalty_points: Number(customerData.loyalty_points) || 0,
        outstanding_balance: Number(customerData.outstanding_balance) || 0
      };
      if (customerData.telegram_chat_id) {
        insertPayload.telegram_chat_id = customerData.telegram_chat_id;
      }
      
      const { data, error } = await supabase
        .from('customers')
        .insert(insertPayload)
        .select()
        .single();

      if (error) {
        console.error('Supabase error adding customer:', error);
        throw error;
      }

      if (data) {
        setCustomers(prev => [...prev, data]);
        showSuccess('Customer added successfully');
        return data;
      }
    } catch (err: any) {
      if (err.code === '23505') {
        // Customer already exists, fetch it with a simpler query first
        const { data: existing, error: fetchError } = await supabase
          .from('customers')
          .select('*')
          .eq('code', customer.code)
          .maybeSingle();
        
        if (existing) {
          // If we have history locally, preserve it or just set empty
          const fullCustomer = { ...existing, settlement_history: [] };
          
          setCustomers(prev => {
            if (prev.some(c => c.id === fullCustomer.id)) return prev;
            return [...prev, fullCustomer];
          });
          showSuccess('Customer already exists, using existing details');
          return fullCustomer;
        } else if (fetchError) {
           console.error('Fetch error after conflict:', fetchError);
        }
      }
      console.error('Detailed error adding customer:', err);
      showError('Failed to save customer: ' + (err.message || 'Unknown error'));
      return null;
    }
  };

  const updateCustomer = async (customer: Customer) => {
    try {
      if (!customer.id) {
        throw new Error('Customer ID is required');
      }

      const payload: any = {
        name_dv: customer.name_dv,
        name_en: customer.name_en,
        phone: customer.phone || '',
        email: customer.email || '',
        credit_limit: Number(customer.credit_limit) || 0,
        loyalty_points: Number(customer.loyalty_points) || 0,
        outstanding_balance: Number(customer.outstanding_balance) || 0,
        updated_at: new Date().toISOString()
      };
      if (customer.code) {
        payload.code = customer.code;
      }
      if (customer.telegram_chat_id !== undefined) {
        payload.telegram_chat_id = customer.telegram_chat_id ? Number(customer.telegram_chat_id) : null;
      }

      const { error } = await supabase
        .from('customers')
        .update(payload)
        .eq('id', customer.id);

      if (error) throw error;

      setCustomers(prev => prev.map(c =>
        c.id === customer.id ? { ...c, ...customer, ...payload } : c
      ));
      showSuccess('Customer updated successfully');
    } catch (error: any) {
      console.error('Error updating customer:', error);
      showError('Failed to update customer: ' + (error.message || 'Unknown error'));
      throw error;
    }
  };

  const customersRef = React.useRef(customers);
  const salesRef = React.useRef(sales);
  const settingsRef = React.useRef(settings);

  useEffect(() => {
    customersRef.current = customers;
    salesRef.current = sales;
    settingsRef.current = settings;
  }, [customers, sales, settings]);

  // Background listener for incoming Telegram Bot commands (/start, /balance, /account, /help)
  useEffect(() => {
    let isMounted = true;
    let isChecking = false;

    const checkUpdates = async () => {
      if (!isMounted || isChecking) return;
      const currentSettings = settingsRef.current;
      if (currentSettings.telegram?.enabled === false) return;

      try {
        isChecking = true;
        const currentCustomers = customersRef.current;
        const currentSales = salesRef.current;

        await processPendingTelegramUpdates({
          customers: currentCustomers,
          sales: currentSales,
          settlements: currentCustomers.flatMap(c => c.settlement_history || []),
          onCustomerLinked: async (customerId: string, chatId: number) => {
            if (!customerId || !chatId) return;
            try {
              if (supabase) {
                await supabase
                  .from('customers')
                  .update({ telegram_chat_id: chatId, updated_at: new Date().toISOString() })
                  .eq('id', customerId);
              }
              setCustomers(prev =>
                prev.map(c => (c.id === customerId ? { ...c, telegram_chat_id: chatId } : c))
              );
            } catch (err) {
              console.warn('Background link error:', err);
            }
          },
          onTransferSlipReceived: async (slipData: any) => {
            try {
              let savedSlip: TransferSlip = {
                id: `slip-${Date.now()}`,
                ...slipData,
              };
              if (supabase) {
                const { data, error } = await supabase
                  .from('transfer_slips')
                  .insert(slipData)
                  .select()
                  .maybeSingle();
                if (!error && data) {
                  savedSlip = data as TransferSlip;
                }
              }
              setTransferSlips(prev => {
                if (prev.some(s => s.file_id === savedSlip.file_id)) return prev;
                const next = [savedSlip, ...prev];
                try {
                  localStorage.setItem('pos_transfer_slips', JSON.stringify(next));
                } catch {}
                return next;
              });
              showSuccess(`💳 New transfer slip received from ${slipData.customer_name}!`);
            } catch (err) {
              console.warn('Error saving received slip:', err);
            }
          },
          shopSettings: currentSettings.shop,
          token: currentSettings.telegram?.botToken,
        });
      } catch (err) {
        // Silent background polling
      } finally {
        isChecking = false;
      }
    };

    // Initial check after 2 seconds, then poll steadily every 8 seconds
    const initialTimer = setTimeout(checkUpdates, 2000);
    const interval = setInterval(checkUpdates, 8000);

    return () => {
      isMounted = false;
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, []);

  // Automated Midnight Store Close Executive Briefing & 1st of Month Overdue Reminders Scheduler
  useEffect(() => {
    const runScheduledAutomations = async () => {
      const now = new Date();
      const todayIso = toISODate(now);
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const groupChat = settings.shop?.telegramGroupChatId || settings.telegram?.groupChatId || settings.telegram?.ownerChatId;

      // 1. Midnight / Evening Store Close Executive Briefing to B BACK Group
      if (
        settings.telegram?.autoExecutiveBriefing !== false &&
        groupChat
      ) {
        const hours = now.getHours();
        const isEveningOrNight = hours >= 22 || hours <= 3; // From 10:00 PM onwards through midnight

        // A. Send today's briefing if it's evening/night and hasn't been sent yet
        if (isEveningOrNight && settings.telegram?.lastNightlyBriefingDate !== todayIso) {
          try {
            const allSettlements = customers.flatMap(c => c.settlement_history || []);
            const res = await sendNightlyExecutiveBriefing({
              chatId: groupChat,
              sales,
              settlements: allSettlements,
              shopSettings: settings.shop,
              token: settings.telegram?.botToken,
            });
            if (res?.ok) {
              setSettings(prev => ({
                ...prev,
                telegram: { ...prev.telegram, lastNightlyBriefingDate: todayIso },
              }));
              updateSettings('telegram', { lastNightlyBriefingDate: todayIso });
              console.log('Nightly Store Close Briefing automatically sent to Telegram group!');
            }
          } catch (e) {
            console.warn('Auto briefing error:', e);
          }
        }

        // B. Missed Yesterday Briefing Catch-Up (e.g. PC was shut down early before 10 PM and opened next morning)
        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        const yesterdayIso = toISODate(yesterday);

        if (
          !isEveningOrNight &&
          settings.telegram?.lastNightlyBriefingDate !== yesterdayIso &&
          settings.telegram?.lastNightlyBriefingDate !== todayIso
        ) {
          const yesterdaySales = (sales || []).filter(s => extractDateOnly(s.date) === yesterdayIso);
          if (yesterdaySales.length > 0) {
            try {
              const allSettlements = customers.flatMap(c => c.settlement_history || []);
              const res = await sendNightlyExecutiveBriefing({
                chatId: groupChat,
                sales,
                settlements: allSettlements,
                shopSettings: settings.shop,
                date: yesterday,
                token: settings.telegram?.botToken,
              });
              if (res?.ok) {
                setSettings(prev => ({
                  ...prev,
                  telegram: { ...prev.telegram, lastNightlyBriefingDate: yesterdayIso },
                }));
                updateSettings('telegram', { lastNightlyBriefingDate: yesterdayIso });
                console.log("Yesterday's missed Store Close Briefing automatically caught up and sent to Telegram group!");
              }
            } catch (e) {
              console.warn('Missed yesterday briefing auto-catchup error:', e);
            }
          }
        }
      }

      // 2. 1st of Every Month Automated Tab Overdue Reminders
      if (
        settings.telegram?.autoMonthlyCreditReminder !== false &&
        now.getDate() === 1 &&
        settings.telegram?.lastMonthlyReminderSentMonth !== currentMonth
      ) {
        const linkedDueCustomers = customers.filter(
          c => c.telegram_chat_id && Number(c.outstanding_balance || 0) > 0
        );

        if (linkedDueCustomers.length > 0) {
          console.log(`Sending 1st of month automated tab reminders to ${linkedDueCustomers.length} customers...`);
          for (const c of linkedDueCustomers) {
            try {
              await sendAutomatedCreditReminder({
                chatId: c.telegram_chat_id!,
                customer: c,
                shopSettings: settings.shop,
                balance: c.outstanding_balance,
                token: settings.telegram?.botToken,
              });
            } catch (err) {
              console.warn(`Error sending monthly reminder to ${c.name_en}:`, err);
            }
          }
          setSettings(prev => ({
            ...prev,
            telegram: { ...prev.telegram, lastMonthlyReminderSentMonth: currentMonth },
          }));
          showSuccess(`Monthly credit tab reminders sent to ${linkedDueCustomers.length} connected customers! 📅`);
        }
      }
    };

    const initialT = setTimeout(runScheduledAutomations, 5000);
    const intervalT = setInterval(runScheduledAutomations, 5 * 60 * 1000);

    return () => {
      clearTimeout(initialT);
      clearInterval(intervalT);
    };
  }, [sales, customers, settings.telegram, settings.shop]);

  const addPendingTransfer = (transfer: any) => {
    setPendingTransfers(prev => [...prev, { ...transfer, id: `transfer-${Date.now()}` }]);
  };

  const resolvePendingTransfer = async (
    id: string, 
    action: 'cash' | 'credit', 
    silent: boolean = false,
    isAutoResolved: boolean = false
  ) => {
    const transfer = pendingTransfers.find(t => t.id === id);
    if (!transfer) return;

    const saleDate = transfer.date
      ? (transfer.date.includes(' ') ? transfer.date : `${transfer.date} 23:59:59`)
      : toISODatetime();

    if (action === 'cash') {
      await addSale({
        ...transfer,
        id: crypto.randomUUID(),
        date: saleDate,
        paymentMethod: 'cash',
        paidAmount: transfer.grandTotal,
        balance: 0
      });

      if (transfer.customer && (settings.general.enableLoyaltyProgram ?? true)) {
        const loyaltyAmountPerPoint = settings.general.loyaltyAmountPerPoint || 20;
        const pointsEarned = Math.floor(transfer.grandTotal / loyaltyAmountPerPoint);
        if (pointsEarned > 0) {
          await awardLoyaltyPoints(transfer.customer.id, pointsEarned);
        }
      }
    } else {
      let customerToUse = transfer.customer;
      if (!customerToUse && transfer.tempCustomerName) {
        customerToUse = customers.find(c =>
          c.name_en?.toLowerCase() === transfer.tempCustomerName.trim().toLowerCase() ||
          c.name_dv === transfer.tempCustomerName.trim() ||
          c.phone === transfer.tempCustomerName.trim()
        );
      }
      if (!customerToUse) {
        customerToUse = customers.find(c => c.code === 'CUST-TRANSFER-GUEST' || c.code === 'CUST-GUEST');
      }
      if (!customerToUse) {
        customerToUse = customers.find(c =>
          c.name_en?.toLowerCase().includes('guest') ||
          c.name_en?.toLowerCase().includes('walk-in') ||
          c.name_dv?.includes('މެހުމާނު')
        );
      }
      if (!customerToUse) {
        try {
          const newGuest = await addCustomer({
            id: crypto.randomUUID(),
            code: 'CUST-TRANSFER-GUEST',
            name_en: transfer.tempCustomerName || 'Walk-in Transfer',
            name_dv: transfer.tempCustomerName || 'ޓްރާންސްފަރ މެހުމާނު',
            phone: '',
            email: '',
            credit_limit: 999999,
            loyalty_points: 0,
            outstanding_balance: 0,
            settlement_history: []
          });
          if (newGuest) customerToUse = newGuest;
        } catch (e) {
          console.error('Error creating fallback guest customer for transfer:', e);
        }
      }

      await addSale({
        ...transfer,
        id: crypto.randomUUID(),
        date: saleDate,
        customer: customerToUse || null,
        paymentMethod: 'credit',
        balance: transfer.grandTotal,
        paidAmount: 0
      });

      if (customerToUse) {
        await updateCustomerBalance(customerToUse.id, transfer.grandTotal);

        // If automatically converted by the system at the end of the day and customer is connected to Telegram, send update
        if (isAutoResolved && customerToUse.telegram_chat_id) {
          try {
            const currentBal = Number(customerToUse.outstanding_balance || 0);
            const newBal = currentBal + Number(transfer.grandTotal || 0);
            await sendAutoTransferToCreditNotification({
              chatId: customerToUse.telegram_chat_id,
              customer: customerToUse,
              amount: transfer.grandTotal,
              newBalance: newBal,
              shopSettings: settings.shop,
              token: settings.telegram?.botToken,
            });
            console.log(`Telegram notification sent to ${customerToUse.name_en || customerToUse.name_dv} for auto-converted awaiting transfer.`);
          } catch (tgErr) {
            console.warn('Failed to send auto-transfer credit notification to Telegram:', tgErr);
          }
        }
      }
    }

    setPendingTransfers(prev => prev.filter(t => t.id !== id));
    if (!silent) {
      showSuccess(`Transfer resolved as ${action} sale`);
    }
  };

  const autoResolveExpiredPendingTransfers = async () => {
    if (isAutoResolvingRef.current) return;
    isAutoResolvingRef.current = true;

    try {
      let currentPending = pendingTransfers;
      try {
        const stored = localStorage.getItem('pending_transfers');
        if (stored) {
          currentPending = JSON.parse(stored);
        }
      } catch (e) {
        console.error('Error reading pending_transfers from storage:', e);
      }

      if (!currentPending || currentPending.length === 0) return;

      const today = toISODate();
      const expired = currentPending.filter((t: any) => {
        const transferDate = extractDateOnly(t.date);
        return transferDate && transferDate < today;
      });

      if (expired.length === 0) return;

      console.log(`Auto-resolving ${expired.length} expired pending transfer(s) to credit...`);
      let resolvedCount = 0;
      const resolvedIds = new Set<string>();

      for (const transfer of expired) {
        try {
          await resolvePendingTransfer(transfer.id, 'credit', true, true);
          resolvedIds.add(transfer.id);
          resolvedCount++;
        } catch (err) {
          console.error(`Failed to auto-resolve transfer ${transfer.id}:`, err);
        }
      }

      if (resolvedCount > 0) {
        setPendingTransfers(prev => prev.filter(t => !resolvedIds.has(t.id)));
        showSuccess(`${resolvedCount} unconfirmed awaiting transfer(s) from previous day automatically converted to credit`);
      }
    } finally {
      isAutoResolvingRef.current = false;
    }
  };

  const convertAllPendingToCredit = async () => {
    if (!pendingTransfers || pendingTransfers.length === 0) {
      showError('No pending transfers to convert');
      return;
    }

    const resolvedIds = new Set<string>();
    for (const transfer of pendingTransfers) {
      try {
        await resolvePendingTransfer(transfer.id, 'credit', true);
        resolvedIds.add(transfer.id);
      } catch (err) {
        console.error(`Failed to resolve transfer ${transfer.id}:`, err);
      }
    }

    if (resolvedIds.size > 0) {
      setPendingTransfers(prev => prev.filter(t => !resolvedIds.has(t.id)));
      showSuccess(`Successfully converted ${resolvedIds.size} pending transfer(s) to credit`);
    }
  };

  // Background check for expired pending transfers (end of day)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      autoResolveExpiredPendingTransfers();
    }, 2500);

    const intervalId = setInterval(() => {
      autoResolveExpiredPendingTransfers();
    }, 60000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        autoResolveExpiredPendingTransfers();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearTimeout(timeoutId);
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [customers]);

  const addSettlement = async (customerId: string, settlement: Settlement) => {
    try {
      const settlementDate = settlement.date || new Date().toISOString();
      const { error: settlementError } = await supabase
        .from('settlements')
        .insert({
          customer_id: customerId,
          amount_paid: settlement.amount_paid,
          date: settlementDate,
          previous_outstanding: settlement.previous_outstanding,
          new_outstanding: settlement.new_outstanding
        });

      if (settlementError) throw settlementError;

      const { error: customerError } = await supabase
        .from('customers')
        .update({ outstanding_balance: settlement.new_outstanding })
        .eq('id', customerId);

      if (customerError) throw customerError;

      if (settings.general.enableLoyaltyProgram ?? true) {
        const loyaltyAmountPerPoint = settings.general.loyaltyAmountPerPoint || 20;
        const pointsEarned = Math.floor(settlement.amount_paid / loyaltyAmountPerPoint);
        if (pointsEarned > 0) {
          await awardLoyaltyPoints(customerId, pointsEarned);
        }
      }

      const fullSettlement = { ...settlement, date: settlementDate };
      setCustomers(prev => prev.map(c =>
        c.id === customerId ? {
          ...c,
          outstanding_balance: settlement.new_outstanding,
          settlement_history: [...c.settlement_history, fullSettlement]
        } : c
      ));
    } catch (error) {
      console.error('Error adding settlement:', error);
      showError('Failed to record settlement');
    }
  };

  const confirmTransferSlip = async (slipId: string, amountPaid: number): Promise<boolean> => {
    try {
      const slip = transferSlips.find(s => s.id === slipId);
      if (!slip) throw new Error('Slip not found');

      const customer = customers.find(c => 
        (slip.customer_id && c.id === slip.customer_id) || 
        (c.telegram_chat_id && String(c.telegram_chat_id) === String(slip.telegram_chat_id))
      );
      if (!customer) throw new Error('Customer account not found for this slip');

      const previousOutstanding = customer.outstanding_balance || 0;
      const newOutstanding = Math.max(0, previousOutstanding - amountPaid);
      const settlementId = `set-${Date.now()}`;
      const nowIso = new Date().toISOString();

      const settlement: Settlement = {
        id: settlementId,
        amount_paid: amountPaid,
        date: nowIso,
        previous_outstanding: previousOutstanding,
        new_outstanding: newOutstanding,
      };

      // 1. Record debt settlement
      await addSettlement(customer.id, settlement);

      // 2. Update transfer_slips record in Supabase
      if (supabase) {
        try {
          await supabase
            .from('transfer_slips')
            .update({
              status: 'confirmed',
              settled_amount: amountPaid,
              settlement_id: settlementId,
              updated_at: nowIso,
            })
            .eq('id', slipId);
        } catch (dbErr) {
          console.warn('Supabase update slip error:', dbErr);
        }
      }

      // 3. Update local state
      setTransferSlips(prev => {
        const next = prev.map(s => s.id === slipId ? {
          ...s,
          status: 'confirmed' as const,
          settled_amount: amountPaid,
          settlement_id: settlementId,
          updated_at: nowIso,
        } : s);
        try { localStorage.setItem('pos_transfer_slips', JSON.stringify(next)); } catch {}
        return next;
      });

      // 4. Send Telegram confirmation receipt to customer
      if (slip.telegram_chat_id) {
        sendTelegramSlipApprovedMessage({
          chatId: slip.telegram_chat_id,
          customerName: customer.name_en || customer.name_dv || slip.customer_name,
          amountPaid,
          remainingBalance: newOutstanding,
          receiptNo: settlementId,
          shopSettings: settings.shop,
          token: settings.telegram?.botToken,
        }).catch(err => console.warn('Failed to send Telegram approved message:', err));
      }

      showSuccess(`Settlement of ${settings.shop.currency} ${amountPaid.toFixed(2)} recorded and receipt sent to customer!`);
      return true;
    } catch (err: any) {
      console.error('confirmTransferSlip error:', err);
      showError(err.message || 'Failed to confirm slip settlement');
      return false;
    }
  };

  const rejectTransferSlip = async (slipId: string, reason: string): Promise<boolean> => {
    try {
      const slip = transferSlips.find(s => s.id === slipId);
      if (!slip) throw new Error('Slip not found');

      const nowIso = new Date().toISOString();
      if (supabase) {
        try {
          await supabase
            .from('transfer_slips')
            .update({
              status: 'rejected',
              rejection_reason: reason,
              updated_at: nowIso,
            })
            .eq('id', slipId);
        } catch (dbErr) {
          console.warn('Supabase reject slip error:', dbErr);
        }
      }

      setTransferSlips(prev => {
        const next = prev.map(s => s.id === slipId ? {
          ...s,
          status: 'rejected' as const,
          rejection_reason: reason,
          updated_at: nowIso,
        } : s);
        try { localStorage.setItem('pos_transfer_slips', JSON.stringify(next)); } catch {}
        return next;
      });

      if (slip.telegram_chat_id) {
        sendTelegramSlipDeclinedMessage({
          chatId: slip.telegram_chat_id,
          customerName: slip.customer_name,
          reason,
          shopSettings: settings.shop,
          token: settings.telegram?.botToken,
        }).catch(err => console.warn('Failed to send Telegram declined message:', err));
      }

      showSuccess('Transfer slip declined and customer notified.');
      return true;
    } catch (err: any) {
      console.error('rejectTransferSlip error:', err);
      showError(err.message || 'Failed to reject slip');
      return false;
    }
  };

  const addTransferSlip = async (slip: Partial<TransferSlip>): Promise<TransferSlip | null> => {
    const newSlip: TransferSlip = {
      id: slip.id || `slip-${Date.now()}`,
      telegram_chat_id: slip.telegram_chat_id || 0,
      customer_name: slip.customer_name || 'Customer',
      file_id: slip.file_id || '',
      file_url: slip.file_url,
      caption: slip.caption,
      suggested_amount: slip.suggested_amount,
      status: 'pending',
      created_at: new Date().toISOString(),
      ...slip,
    };

    if (supabase) {
      try {
        const { data, error } = await supabase.from('transfer_slips').insert(newSlip).select().maybeSingle();
        if (!error && data) {
          setTransferSlips(prev => [data as TransferSlip, ...prev]);
          return data as TransferSlip;
        }
      } catch {}
    }

    setTransferSlips(prev => [newSlip, ...prev]);
    return newSlip;
  };

  useEffect(() => {
    if (settings?.software?.theme) {
      setTheme(settings.software.theme as any);
    }
  }, [settings?.software?.theme, setTheme]);

  const updateSettings = async (category: keyof AppSettings, newSettings: any) => {
    setSettings(prev => ({
      ...prev,
      [category]: { ...prev[category], ...newSettings }
    }));
    try {
      const { data: existing } = await supabase.from('settings').select('id').eq('category', category).maybeSingle();
      
      // Merge with existing settings state to avoid losing unupdated fields
      const payload = {
        category,
        settings: { ...settings[category], ...newSettings },
        updated_at: new Date().toISOString()
      };
      
      if (existing) {
        await supabase.from('settings').update(payload).eq('id', existing.id);
      } else {
        await supabase.from('settings').insert({ ...payload, id: crypto.randomUUID() });
      }
    } catch (error) {
      console.error('Error saving settings to cloud:', error);
    }
  };

  const getNextCustomerCode = () => {
    let lastNum = 0;
    customers.forEach(c => {
      const match = c.code.match(/\d+/);
      if (match) {
        const num = parseInt(match[0], 10);
        if (num > lastNum) lastNum = num;
      }
    });
    
    let nextNum = lastNum + 1;
    let nextCode = `CUST${String(nextNum).padStart(3, '0')}`;
    
    // Safety check against local state
    while (customers.some(c => c.code === nextCode)) {
      nextNum++;
      nextCode = `CUST${String(nextNum).padStart(3, '0')}`;
    }
    
    return nextCode;
  };

  const getNextProductCode = () => {
    const lastItemCode = products.reduce((maxCode, product) => {
      // Extract digits only from code
      const digits = (product.item_code || '').replace(/\D/g, '');
      const codeNum = digits ? parseInt(digits, 10) : 0;
      return isNaN(codeNum) ? maxCode : Math.max(maxCode, codeNum);
    }, 0);
    const nextNum = lastItemCode + 1;
    return nextNum < 1000 ? String(nextNum).padStart(3, '0') : String(nextNum);
  };

  // Helper function to get top N products by sales count
  const getTopProducts = (limit: number): Product[] => {
    // Calculate sales count for each product
    const productSalesCount = new Map<string, number>();

    sales.forEach(sale => {
      sale.items.forEach(item => {
        const currentCount = productSalesCount.get(item.id) || 0;
        productSalesCount.set(item.id, currentCount + item.qty);
      });
    });

    // Sort products by sales count (descending) and limit to top N
    const sortedProducts = [...products].sort((a, b) => {
      const aCount = productSalesCount.get(a.id) || 0;
      const bCount = productSalesCount.get(b.id) || 0;
      return bCount - aCount; // Descending order
    });

    return sortedProducts.slice(0, limit);
  };

  const updateProduct = async (updatedProduct: Product) => {
    try {
      console.log('Updating product in Supabase:', updatedProduct.id);
      
      const itemCode = updatedProduct.item_code !== undefined && updatedProduct.item_code !== null
        ? String(updatedProduct.item_code).trim()
        : '';
      const barcode = updatedProduct.barcode !== undefined && updatedProduct.barcode !== null
        ? String(updatedProduct.barcode).trim()
        : '';
      
      // Clean data for Supabase update - convert undefined to null and ensure numbers
      const cleanData = {
        name_dv: updatedProduct.name_dv,
        name_en: updatedProduct.name_en,
        price: Number(updatedProduct.price) || 0,
        stock_shop: Math.round(Number(updatedProduct.stock_shop)) || 0,
        stock_godown: Math.round(Number(updatedProduct.stock_godown)) || 0,
        barcode: barcode,
        item_code: itemCode,
        category: updatedProduct.category,
        is_zero_tax: !!updatedProduct.is_zero_tax,
        expiry_date: updatedProduct.expiry_date || null,
        image: updatedProduct.image || '',
        cost_price: updatedProduct.cost_price ? Number(updatedProduct.cost_price) : null,
        last_purchase_date: updatedProduct.last_purchase_date || null,
        units: updatedProduct.units || null
      };

      if (!supabase) {
        showError('Supabase is not initialized');
        return;
      }

      const { data, error, count } = await supabase
        .from('products')
        .update(cleanData)
        .eq('id', updatedProduct.id)
        .select();

      console.log('Update result:', { error, count, data });

      if (error) {
        console.error('Supabase product update error details:', error);
        showError(`DB Error: ${error.message}`);
        throw error;
      }

      if (!data || data.length === 0) {
        console.warn('No rows updated. Product ID might not exist in DB.');
        showError('Product not found in database');
      }

      const productToStore: Product = {
        ...updatedProduct,
        item_code: itemCode,
        barcode: barcode
      };

      setProducts(prev => prev.map(p =>
        p.id === updatedProduct.id ? productToStore : p
      ));
    } catch (error) {
      console.error('Error updating product:', error);
      throw error;
    }
  };

  const addProduct = async (product: Product) => {
    try {
      const itemCode = product.item_code !== undefined && product.item_code !== null && String(product.item_code).trim() !== ''
        ? String(product.item_code).trim()
        : getNextProductCode();
      const barcode = product.barcode !== undefined && product.barcode !== null
        ? String(product.barcode).trim()
        : itemCode;

      const productToStore: Product = {
        ...product,
        item_code: itemCode,
        barcode: barcode
      };

      const cleanData = {
        id: productToStore.id,
        name_dv: productToStore.name_dv,
        name_en: productToStore.name_en,
        price: Number(productToStore.price) || 0,
        stock_shop: Math.round(Number(productToStore.stock_shop)) || 0,
        stock_godown: Math.round(Number(productToStore.stock_godown)) || 0,
        barcode: barcode,
        item_code: itemCode,
        category: productToStore.category,
        is_zero_tax: !!productToStore.is_zero_tax,
        expiry_date: productToStore.expiry_date || null,
        image: productToStore.image || '',
        cost_price: productToStore.cost_price ? Number(productToStore.cost_price) : null,
        last_purchase_date: productToStore.last_purchase_date || null,
        units: productToStore.units || null
      };

      const { error } = await supabase
        .from('products')
        .insert(cleanData);

      if (error) throw error;

      setProducts(prev => [...prev, productToStore]);
    } catch (error) {
      console.error('Error adding product:', error);
      showError('Failed to add product to database');
    }
  };

  const deleteProduct = async (productId: string) => {
    try {
      if (supabase) {
        const { error } = await supabase
          .from('products')
          .delete()
          .eq('id', productId);

        if (error) {
          console.warn('Supabase delete error:', error);
        }
      }

      setProducts(prev => prev.filter(p => p.id !== productId));
      showSuccess('Product deleted successfully');
    } catch (error) {
      console.error('Error deleting product:', error);
      setProducts(prev => prev.filter(p => p.id !== productId));
      showSuccess('Product deleted');
    }
  };

  const bulkDeleteProducts = async (productIds: string[]) => {
    try {
      if (!productIds || productIds.length === 0) return;

      if (supabase) {
        // PostgREST safe chunking (batches of 40)
        const chunkSize = 40;
        for (let i = 0; i < productIds.length; i += chunkSize) {
          const chunk = productIds.slice(i, i + chunkSize);
          try {
            const { error } = await supabase
              .from('products')
              .delete()
              .in('id', chunk);

            if (error) {
              console.warn('Batch chunk delete warning, executing individual deletes fallback:', error);
              for (const singleId of chunk) {
                try {
                  await supabase
                    .from('products')
                    .delete()
                    .eq('id', singleId);
                } catch (singleErr) {
                  console.warn(`Error deleting product ${singleId}:`, singleErr);
                }
              }
            }
          } catch (chunkErr) {
            console.warn('Chunk delete error:', chunkErr);
          }
        }
      }

      // Always update local products state
      setProducts(prev => prev.filter(p => !productIds.includes(p.id)));
      showSuccess(`Successfully deleted ${productIds.length} products (ޑިލީޓް ކުރެވިއްޖެ)`);
    } catch (error) {
      console.error('Error bulk deleting products:', error);
      setProducts(prev => prev.filter(p => !productIds.includes(p.id)));
      showSuccess(`Deleted ${productIds.length} products`);
    }
  };

  const bulkImportProducts = async (importedProducts: Product[], onProgress?: (percent: number, count: number) => void) => {
    try {
      if (!importedProducts || importedProducts.length === 0) return;

      const chunkSize = 500;
      const total = importedProducts.length;
      let insertedCount = 0;

      const parseSafeInt = (val: any): number => {
        if (val === null || val === undefined || val === '') return 0;
        const num = Number(val);
        if (isNaN(num)) return 0;
        return Math.round(num);
      };

      const parseSafeFloat = (val: any): number => {
        if (val === null || val === undefined || val === '') return 0;
        const num = Number(val);
        return isNaN(num) ? 0 : num;
      };

      // Clean products to match database schema while preserving EXACT code and barcode as in Excel
      const cleanProducts = importedProducts.map((p, index) => {
        const itemCode = p.item_code !== undefined && p.item_code !== null && String(p.item_code).trim() !== ''
          ? String(p.item_code).trim()
          : String(index + 1);
        const barcode = p.barcode !== undefined && p.barcode !== null && String(p.barcode).trim() !== ''
          ? String(p.barcode).trim()
          : itemCode;

        return {
          id: p.id || crypto.randomUUID(),
          name_dv: p.name_dv || p.name_en || 'Product',
          name_en: p.name_en || p.name_dv || 'Product',
          price: parseSafeFloat(p.price),
          stock_shop: parseSafeInt(p.stock_shop),
          stock_godown: parseSafeInt(p.stock_godown),
          barcode: barcode,
          item_code: itemCode,
          category: p.category || 'OTHER',
          is_zero_tax: !!p.is_zero_tax,
          expiry_date: p.expiry_date || null,
          image: p.image || '',
          cost_price: p.cost_price !== undefined && p.cost_price !== null && (p.cost_price as any) !== '' ? parseSafeFloat(p.cost_price) : null,
          last_purchase_date: p.last_purchase_date || null,
          units: p.units || null
        };
      });

      // Insert in chunks of 500 to support 10,000+ products smoothly
      if (supabase) {
        for (let i = 0; i < cleanProducts.length; i += chunkSize) {
          const chunk = cleanProducts.slice(i, i + chunkSize);
          const { error } = await supabase
            .from('products')
            .upsert(chunk, { onConflict: 'id' });

          if (error) {
            console.warn(`Supabase batch insert error on chunk starting at ${i}, falling back to single items:`, error);
            for (const item of chunk) {
              const { error: singleErr } = await supabase
                .from('products')
                .upsert([item], { onConflict: 'id' });
              if (singleErr) {
                console.error(`Failed to upsert product ${item.item_code} (${item.name_en || item.name_dv}):`, singleErr);
              } else {
                insertedCount++;
              }
            }
          } else {
            insertedCount += chunk.length;
          }

          if (onProgress) {
            const pct = Math.round((insertedCount / total) * 100);
            onProgress(pct, insertedCount);
          }
          // Yield to event loop
          await new Promise(resolve => setTimeout(resolve, 20));
        }
      }

      // Merge into local state
      setProducts(prev => {
        const map = new Map<string, Product>();
        prev.forEach(p => map.set(p.id, p));
        cleanProducts.forEach(p => map.set(p.id, p as Product));
        return Array.from(map.values());
      });

      showSuccess(`Successfully imported ${insertedCount.toLocaleString()} products into database! 🚀`);
    } catch (error: any) {
      console.error('Error in bulkImportProducts:', error);
      showError(error.message || 'Failed to import products to database');
      throw error;
    }
  };

  const addPurchase = async (purchase: Purchase) => {
    try {
      const { error } = await supabase
        .from('purchases')
        .insert([{
          id: purchase.id,
          date: purchase.date,
          vendor_id: purchase.vendorId,
          bill_number: purchase.billNumber,
          description: purchase.description,
          amount: purchase.amount,
          gst_amount: purchase.gstAmount,
          items: purchase.items
        }]);

      if (error) throw error;

      // Update cost prices and stock quantities for products in the purchase
      if (purchase.items && purchase.items.length > 0) {
        for (const item of purchase.items) {
          const product = products.find(p => p.id === item.product_id);
          const currentShopStock = product ? (Number(product.stock_shop) || 0) : 0;
          const addedQty = Number(item.quantity) || 0;
          // Handles minus/negative stock automatically: -3 + 10 = 7
          const newShopStock = Math.round(currentShopStock + addedQty);
          const newCostPrice = Number(item.unit_price) > 0 ? Number(item.unit_price) : (product?.cost_price || null);

          try {
            await supabase
              .from('products')
              .update({
                stock_shop: newShopStock,
                cost_price: newCostPrice,
                last_purchase_date: purchase.date
              })
              .eq('id', item.product_id);
          } catch (dbErr) {
            console.warn('Supabase product stock update error during purchase:', dbErr);
          }

          setProducts(prev => prev.map(p => {
            if (p.id !== item.product_id) return p;
            return {
              ...p,
              stock_shop: newShopStock,
              cost_price: newCostPrice || p.cost_price,
              last_purchase_date: purchase.date
            };
          }));
        }
      }
      setPurchases(prev => [purchase, ...prev]);
      showSuccess('Purchase bill saved & product inventory stock updated! 📦');
    } catch (error) {
      console.error('Error adding purchase:', error);
      showError('Failed to save purchase');
    }
  };

  const deletePurchase = async (purchaseId: string) => {
    try {
      const { error } = await supabase
        .from('purchases')
        .delete()
        .eq('id', purchaseId);

      if (error) throw error;

      setPurchases(prev => prev.filter(p => p.id !== purchaseId));
      showSuccess('Purchase deleted successfully');
    } catch (error) {
      console.error('Error deleting purchase:', error);
      showError('Failed to delete purchase');
    }
  };

  const addVendor = async (vendor: Vendor) => {
    try {
      const { id, ...vendorData } = vendor as any;
      const isUuid = id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      const validId = isUuid ? id : crypto.randomUUID();

      const payload: any = {
        id: validId,
        code: vendorData.code,
        name_dv: vendorData.name_dv || '',
        name_en: vendorData.name_en || '',
        contact_person: vendorData.contact_person || '',
        phone: vendorData.phone || '',
        email: vendorData.email || '',
        tin_number: vendorData.tin_number || '',
        address: vendorData.address || '',
        notes: vendorData.notes || ''
      };

      const { data, error } = await supabase
        .from('vendors')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;

      const createdVendor = data || payload;
      setVendors(prev => [...prev, createdVendor]);
      return createdVendor;
    } catch (error) {
      console.error('Error adding vendor:', error);
      showError('Failed to add vendor');
      throw error;
    }
  };

  const updateVendor = async (vendor: Vendor) => {
    try {
      // Remove metadata fields that shouldn't be in the update payload
      const { id, created_at, ...updateData } = vendor as any;
      
      const { error } = await supabase
        .from('vendors')
        .update(updateData)
        .eq('id', vendor.id);

      if (error) throw error;

      setVendors(prev => prev.map(v => v.id === vendor.id ? vendor : v));
      console.log('Vendor updated successfully');
    } catch (error) {
      console.error('Error updating vendor:', error);
      showError('Failed to update vendor');
    }
  };

  const deleteVendor = async (vendorId: string) => {
    try {
      const { error } = await supabase
        .from('vendors')
        .delete()
        .eq('id', vendorId);

      if (error) throw error;

      setVendors(prev => prev.filter(v => v.id !== vendorId));
    } catch (error) {
      console.error('Error deleting vendor:', error);
      showError('Failed to delete vendor');
    }
  };

  const clearAllData = async () => {
    try {
      // Delete in correct order to respect potential foreign keys
      const tables = ['sales', 'purchases', 'settlements', 'products', 'customers', 'vendors'];

      for (const table of tables) {
        const { error } = await supabase
          .from(table)
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete everything

        if (error) throw error;
      }

      // Reset local state
      setProducts([]);
      setCustomers([]);
      setSales([]);
      setPurchases([]);
      setVendors([]);
      setExpenses([]);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('app_expenses');
      }
      showSuccess('All data cleared successfully');
    } catch (error) {
      console.error('Error clearing data:', error);
      showError('Failed to clear data from database');
      throw error;
    }
  };

  const addExpense = async (expense: Expense) => {
    try {
      setExpenses(prev => [expense, ...prev]);

      // Attempt Supabase insert if table exists
      try {
        if (supabase) {
          await supabase.from('expenses').insert([{
            id: expense.id,
            date: expense.date,
            category: expense.category,
            title: expense.title,
            amount: expense.amount,
            payment_method: expense.paymentMethod,
            reference_number: expense.referenceNumber || null,
            notes: expense.notes || null,
            recorded_by: expense.recordedBy || null
          }]);
        }
      } catch (dbErr) {
        console.log('Expense saved locally (Supabase sync silent):', dbErr);
      }
    } catch (error) {
      console.error('Error adding expense:', error);
      showError('Failed to record expense');
      throw error;
    }
  };

  const updateExpense = async (expense: Expense) => {
    try {
      setExpenses(prev => prev.map(e => e.id === expense.id ? expense : e));

      try {
        if (supabase) {
          await supabase.from('expenses').update({
            date: expense.date,
            category: expense.category,
            title: expense.title,
            amount: expense.amount,
            payment_method: expense.paymentMethod,
            reference_number: expense.referenceNumber || null,
            notes: expense.notes || null,
            recorded_by: expense.recordedBy || null
          }).eq('id', expense.id);
        }
      } catch (dbErr) {
        console.log('Expense updated locally:', dbErr);
      }
    } catch (error) {
      console.error('Error updating expense:', error);
      showError('Failed to update expense');
      throw error;
    }
  };

  const deleteExpense = async (expenseId: string) => {
    try {
      setExpenses(prev => prev.filter(e => e.id !== expenseId));

      try {
        if (supabase) {
          await supabase.from('expenses').delete().eq('id', expenseId);
        }
      } catch (dbErr) {
        console.log('Expense deleted locally:', dbErr);
      }
    } catch (error) {
      console.error('Error deleting expense:', error);
      showError('Failed to delete expense');
      throw error;
    }
  };

  const getNextVendorCode = () => {
    const lastVendorCode = vendors.reduce((maxCode, vendor) => {
      const codeNum = parseInt(vendor.code.replace('VEN', ''), 10);
      return isNaN(codeNum) ? maxCode : Math.max(maxCode, codeNum);
    }, 0);
    return `VEN${String(lastVendorCode + 1).padStart(3, '0')}`;
  };

  const updateProductCostPrice = async (productId: string, newCost: number, purchaseDate: string) => {
    try {
      const product = products.find(p => p.id === productId);
      if (!product) return;

      const shouldUpdate = !product.cost_price || newCost !== product.cost_price;
      if (!shouldUpdate) return;

      const minSellingPrice = newCost * 1.2;

      const { error } = await supabase
        .from('products')
        .update({
          cost_price: newCost,
          last_purchase_date: purchaseDate
        })
        .eq('id', productId);

      if (error) throw error;

      setProducts(prev => prev.map(p => {
        if (p.id !== productId) return p;
        return { ...p, cost_price: newCost, last_purchase_date: purchaseDate };
      }));

      if (product.price < minSellingPrice) {
        setTimeout(() => {
          showError(`${product.name_en}: Selling price (MVR ${product.price.toFixed(2)}) is below minimum recommended price (MVR ${minSellingPrice.toFixed(2)}).`);
        }, 100);
      }
    } catch (error) {
      console.error('Error updating product cost price:', error);
    }
  };

  const calculateProfitMargin = (product: Product): number => {
    if (!product.cost_price || product.cost_price === 0) return 0;
    return ((product.price - product.cost_price) / product.cost_price) * 100;
  };

  return (
    <AppContext.Provider value={{
      products,
      setProducts,
      customers,
      setCustomers,
      sales,
      setSales,
      favoriteProductIds,
      setFavoriteProductIds,
      getTopProducts,
      settings,
      updateSettings,
      getNextCustomerCode,
      getNextProductCode,
      clearCart,
      updateStock,
      updateProduct,
      addProduct,
      deleteProduct,
      bulkDeleteProducts,
      bulkImportProducts,
      openCarts,
      setOpenCarts,
      activeCartId,
      setActiveCartId,
      awardLoyaltyPoints,
      redeemLoyaltyPoints,
      updateCustomerBalance,
      addSettlement,
      transferStock,
      purchases,
      addPurchase,
      deletePurchase,
      vendors,
      setVendors,
      addVendor,
      updateVendor,
      deleteVendor,
      clearAllData,
      getNextVendorCode,
      updateProductCostPrice,
      calculateProfitMargin,
      addSale,
      addCustomer,
      updateCustomer,
      pendingTransfers,
      addPendingTransfer,
      resolvePendingTransfer,
      autoResolveExpiredPendingTransfers,
      convertAllPendingToCredit,
      sidebarCollapsed,
      setSidebarCollapsed,
      isPurchaseWindowOpen,
      setIsPurchaseWindowOpen,
      isPurchaseWindowMinimized,
      setIsPurchaseWindowMinimized,
      refreshCustomers,
      expenses,
      setExpenses,
      addExpense,
      updateExpense,
      deleteExpense,
      transferSlips,
      pendingSlipsCount,
      fetchTransferSlips,
      confirmTransferSlip,
      rejectTransferSlip,
      addTransferSlip
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppContextProvider');
  }
  return context;
};