"use client";

import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { showError, showSuccess } from '@/utils/toast';
import { supabase } from '@/lib/supabase';

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
  loyaltyPointsRate: number;
}

interface ReportSettings {
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

interface AppSettings {
  shop: ShopSettings;
  accounting: AccountingSettings;
  software: SoftwareSettings;
  general: GeneralSettings;
  reports: ReportSettings;
  printing: PrintSettings;
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
  deleteProduct: (productId: string) => Promise<void>;
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
  vendors: Vendor[];
  setVendors: React.Dispatch<React.SetStateAction<Vendor[]>>;
  addVendor: (vendor: Vendor) => Promise<void>;
  updateVendor: (vendor: Vendor) => Promise<void>;
  deleteVendor: (vendorId: string) => Promise<void>;
  clearAllData: () => Promise<void>;
  getNextVendorCode: () => string;
  updateProductCostPrice: (productId: string, newCost: number, purchaseDate: string) => Promise<void>;
  calculateProfitMargin: (product: Product) => number;
  addSale: (sale: Sale) => Promise<void>;
  addCustomer: (customer: Customer) => Promise<void>;
  updateCustomer: (customer: Customer) => Promise<void>;
  pendingTransfers: any[];
  addPendingTransfer: (transfer: any) => void;
  resolvePendingTransfer: (id: string, action: 'cash' | 'credit') => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppContextProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
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

  // Initial Data Fetching from Supabase
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [
          { data: productsData },
          { data: customersData },
          { data: salesData },
          { data: vendorsData },
          { data: purchasesData }
        ] = await Promise.all([
          supabase.from('products').select('*'),
          supabase.from('customers').select('*, settlement_history (*)'),
          supabase.from('sales').select('*'),
          supabase.from('vendors').select('*'),
          supabase.from('purchases').select('*')
        ]);

        if (productsData) setProducts(productsData);
        if (customersData) {
          const formattedCustomers = customersData.map(c => ({
            ...c,
            settlement_history: c.settlement_history || []
          }));
          setCustomers(formattedCustomers);
        }
        if (salesData) setSales(salesData);
        if (vendorsData) setVendors(vendorsData);
        if (purchasesData) setPurchases(purchasesData);
      } catch (error) {
        console.error('Error fetching data from Supabase:', error);
        showError('Failed to fetch data from database');
      }
    };

    fetchData();
  }, []);

  const [favoriteProductIds, setFavoriteProductIds] = useState<string[]>([]);

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

  const [settings, setSettings] = useState<AppSettings>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('app_settings');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error('Error parsing settings from localStorage', e);
        }
      }
    }
    return {
      shop: {
        shopName: 'My Retail Shop',
        shopAddress: 'Male, Maldives',
        shopPhone: '3301234',
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
        enableLoyaltyProgram: false,
        loyaltyPointsRate: 1,
      },
      reports: {
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
    };
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
      const { error } = await supabase
        .from('products')
        .update({ stock_shop: newStock })
        .eq('id', productId);

      if (error) throw error;

      setProducts(prev => prev.map(p =>
        p.id === productId ? { ...p, stock_shop: newStock } : p
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
        stock_shop: from === 'shop' ? product.stock_shop - amount : product.stock_shop + amount,
        stock_godown: from === 'godown' ? product.stock_godown - amount : product.stock_godown + amount
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
      if (!customer) return;

      const newPoints = (customer.loyalty_points || 0) + points;
      const { error } = await supabase
        .from('customers')
        .update({ loyalty_points: newPoints })
        .eq('id', customerId);

      if (error) throw error;

      setCustomers(prev => prev.map(c =>
        c.id === customerId ? { ...c, loyalty_points: newPoints } : c
      ));
    } catch (error) {
      console.error('Error awarding loyalty points:', error);
    }
  };

  const redeemLoyaltyPoints = async (customerId: string, points: number) => {
    try {
      const customer = customers.find(c => c.id === customerId);
      if (!customer) return;

      const newPoints = Math.max(0, (customer.loyalty_points || 0) - points);
      const { error } = await supabase
        .from('customers')
        .update({ loyalty_points: newPoints })
        .eq('id', customerId);

      if (error) throw error;

      setCustomers(prev => prev.map(c =>
        c.id === customerId ? { ...c, loyalty_points: newPoints } : c
      ));
    } catch (error) {
      console.error('Error redeeming loyalty points:', error);
    }
  };

  const updateCustomerBalance = async (customerId: string, amount: number) => {
    try {
      const customer = customers.find(c => c.id === customerId);
      if (!customer) return;

      const newBalance = customer.outstanding_balance + amount;
      const { error } = await supabase
        .from('customers')
        .update({ outstanding_balance: newBalance })
        .eq('id', customerId);

      if (error) throw error;

      setCustomers(prev => prev.map(c =>
        c.id === customerId ? { ...c, outstanding_balance: newBalance } : c
      ));
    } catch (error) {
      console.error('Error updating customer balance:', error);
    }
  };

  const addSale = async (sale: Sale) => {
    try {
      const { error } = await supabase
        .from('sales')
        .insert({
          id: sale.id,
          date: sale.date,
          customer_id: sale.customer?.id || null,
          items: sale.items,
          grand_total: sale.grandTotal,
          payment_method: sale.paymentMethod,
          paid_amount: sale.paidAmount || 0,
          balance: sale.balance || 0,
          split_details: sale.splitDetails || null
        });

      if (error) throw error;

      setSales(prev => [...prev, sale]);

      // Update stock levels
      for (const item of sale.items) {
        const product = products.find(p => p.id === item.id);
        if (product) {
          await updateStock(product.id, product.stock_shop - item.qty);
        }
      }
    } catch (error) {
      console.error('Error adding sale:', error);
      showError('Failed to save sale to database');
    }
  };

  const addCustomer = async (customer: Customer) => {
    try {
      // Strip settlement_history as it's a relation, not a column
      const { settlement_history, ...customerData } = customer;
      
      const { data, error } = await supabase
        .from('customers')
        .insert({
          code: customerData.code,
          name_dv: customerData.name_dv,
          name_en: customerData.name_en,
          phone: customerData.phone,
          email: customerData.email,
          credit_limit: customerData.credit_limit,
          loyalty_points: customerData.loyalty_points,
          outstanding_balance: customerData.outstanding_balance
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setCustomers(prev => [...prev, data]);
      }
    } catch (error) {
      console.error('Error adding customer:', error);
      showError('Failed to save customer to database');
    }
  };

  const updateCustomer = async (customer: Customer) => {
    try {
      const { error } = await supabase
        .from('customers')
        .update(customer)
        .eq('id', customer.id);

      if (error) throw error;

      setCustomers(prev => prev.map(c =>
        c.id === customer.id ? customer : c
      ));
    } catch (error) {
      console.error('Error updating customer:', error);
      showError('Failed to update customer in database');
    }
  };

  const addPendingTransfer = (transfer: any) => {
    setPendingTransfers(prev => [...prev, { ...transfer, id: `transfer-${Date.now()}` }]);
  };

  const resolvePendingTransfer = async (id: string, action: 'cash' | 'credit') => {
    const transfer = pendingTransfers.find(t => t.id === id);
    if (!transfer) return;

    if (action === 'cash') {
      await addSale({
        ...transfer,
        paymentMethod: 'cash',
        paidAmount: transfer.grandTotal,
        balance: 0
      });
    } else {
      if (!transfer.customer) {
        showError("This transfer has no associated customer for credit sale");
        return;
      }
      await addSale({
        ...transfer,
        paymentMethod: 'credit'
      });
      await updateCustomerBalance(transfer.customer.id, transfer.grandTotal);
    }

    setPendingTransfers(prev => prev.filter(t => t.id !== id));
    showSuccess(`Transfer resolved as ${action} sale`);
  };

  const addSettlement = async (customerId: string, settlement: Settlement) => {
    try {
      const { error: settlementError } = await supabase
        .from('settlements')
        .insert({
          customer_id: customerId,
          amount_paid: settlement.amount_paid,
          date: settlement.date,
          previous_outstanding: settlement.previous_outstanding,
          new_outstanding: settlement.new_outstanding
        });

      if (settlementError) throw settlementError;

      const { error: customerError } = await supabase
        .from('customers')
        .update({ outstanding_balance: settlement.new_outstanding })
        .eq('id', customerId);

      if (customerError) throw customerError;

      setCustomers(prev => prev.map(c =>
        c.id === customerId ? {
          ...c,
          outstanding_balance: settlement.new_outstanding,
          settlement_history: [...c.settlement_history, settlement]
        } : c
      ));
    } catch (error) {
      console.error('Error adding settlement:', error);
      showError('Failed to record settlement');
    }
  };

  const updateSettings = (category: keyof AppSettings, newSettings: any) => {
    setSettings(prev => ({
      ...prev,
      [category]: { ...prev[category], ...newSettings }
    }));
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
      // Extract number from code like PROD001, C001, P001, etc.
      const match = product.item_code.match(/\d+/);
      const codeNum = match ? parseInt(match[0], 10) : 0;
      return isNaN(codeNum) ? maxCode : Math.max(maxCode, codeNum);
    }, 0);
    return `PROD${String(lastItemCode + 1).padStart(3, '0')}`;
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
      const { error } = await supabase
        .from('products')
        .update(updatedProduct)
        .eq('id', updatedProduct.id);

      if (error) throw error;

      setProducts(prev => prev.map(p =>
        p.id === updatedProduct.id ? updatedProduct : p
      ));
    } catch (error) {
      console.error('Error updating product:', error);
      showError('Failed to update product in database');
    }
  };

  const deleteProduct = async (productId: string) => {
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);

      if (error) throw error;

      setProducts(prev => prev.filter(p => p.id !== productId));
    } catch (error) {
      console.error('Error deleting product:', error);
      showError('Failed to delete product from database');
    }
  };

  const addPurchase = async (purchase: Purchase) => {
    try {
      const { error } = await supabase
        .from('purchases')
        .insert(purchase);

      if (error) throw error;

      // Update cost prices for products in the purchase
      if (purchase.items && purchase.items.length > 0) {
        for (const item of purchase.items) {
          await updateProductCostPrice(item.product_id, item.unit_price, purchase.date);
        }
      }
      setPurchases(prev => [...prev, purchase]);
    } catch (error) {
      console.error('Error adding purchase:', error);
      showError('Failed to save purchase');
    }
  };

  const addVendor = async (vendor: Vendor) => {
    try {
      const { error } = await supabase
        .from('vendors')
        .insert(vendor);

      if (error) throw error;

      setVendors(prev => [...prev, vendor]);
    } catch (error) {
      console.error('Error adding vendor:', error);
      showError('Failed to add vendor');
    }
  };

  const updateVendor = async (vendor: Vendor) => {
    try {
      const { error } = await supabase
        .from('vendors')
        .update(vendor)
        .eq('id', vendor.id);

      if (error) throw error;

      setVendors(prev => prev.map(v => v.id === vendor.id ? vendor : v));
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
      showSuccess('All data cleared successfully');
    } catch (error) {
      console.error('Error clearing data:', error);
      showError('Failed to clear data from database');
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
      deleteProduct,
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
      resolvePendingTransfer
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