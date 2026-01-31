import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { showError, showSuccess } from '@/utils/toast';
import { supabase } from '@/lib/supabase';
import {
  productService,
  customerService,
  saleService,
  vendorService,
  settingsService,
  settlementService,
  purchaseService
} from '../services/supabaseService';
import { useAuth } from './AuthContext';

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
  paymentMethod: 'cash' | 'credit' | 'card' | 'mobile' | string;
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
}

export interface AppSettings {
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
  updateSettings: (category: keyof AppSettings, settings: any, silent?: boolean) => Promise<void>;
  getNextCustomerCode: () => string;
  getNextProductCode: () => string;
  clearCart: (cartId: string) => void;
  updateStock: (productId: string, newStock: number) => Promise<void>;
  transferStock: (productId: string, from: 'shop' | 'godown', to: 'shop' | 'godown', amount: number) => Promise<void>;
  openCarts: Map<string, Cart>;
  setOpenCarts: React.Dispatch<React.SetStateAction<Map<string, Cart>>>;
  activeCartId: string;
  setActiveCartId: React.Dispatch<React.SetStateAction<string>>;
  awardLoyaltyPoints: (customerId: string, points: number) => void;
  redeemLoyaltyPoints: (customerId: string, points: number) => void;
  updateCustomerBalance: (customerId: string, amount: number) => Promise<void>;
  addSettlement: (customerId: string, settlement: Settlement) => Promise<void>;
  purchases: Purchase[];
  addPurchase: (purchase: Purchase) => void;
  deletePurchase: (id: string) => Promise<void>;
  addCustomer: (customer: Customer) => Promise<void>;
  updateCustomer: (customer: Customer) => Promise<void>;
  deleteCustomer: (customerId: string) => Promise<void>;
  addProduct: (product: Product) => Promise<void>;
  updateProduct: (updatedProduct: Product) => Promise<void>;
  deleteProduct: (productId: string) => Promise<void>;
  bulkAddProducts: (products: Product[]) => Promise<void>;
  vendors: Vendor[];
  setVendors: React.Dispatch<React.SetStateAction<Vendor[]>>;
  addVendor: (vendor: Vendor) => Promise<void>;
  updateVendor: (vendor: Vendor) => Promise<void>;
  deleteVendor: (vendorId: string) => Promise<void>;
  getNextVendorCode: () => string;
  updateProductCostPrice: (productId: string, newCost: number, purchaseDate: string) => void;
  calculateProfitMargin: (product: Product) => number;
  createSale: (sale: Sale, skipStockUpdate?: boolean) => Promise<void>;
  deleteSale: (id: string) => Promise<void>;
  loading: boolean;
  refreshData: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppContextProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [favoriteProductIds, setFavoriteProductIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const [openCarts, setOpenCarts] = useState<Map<string, Cart>>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('pos_open_carts') : null;
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return new Map(parsed);
      } catch (e) {
        console.error('Error parsing saved carts:', e);
      }
    }
    const initialCartId = `cart-${Date.now()}`;
    return new Map([[initialCartId, { id: initialCartId, displayNumber: 1, customer: null, items: [] }]]);
  });

  const [activeCartId, setActiveCartId] = useState<string>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('pos_active_cart_id') : null;
    if (saved && openCarts.has(saved)) {
      return saved;
    }
    return [...openCarts.keys()][0];
  });

  // Save carts to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('pos_open_carts', JSON.stringify([...openCarts.entries()]));
    }
  }, [openCarts]);

  // Save active cart ID to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('pos_active_cart_id', activeCartId);
    }
  }, [activeCartId]);

  const [settings, setSettings] = useState<AppSettings>({
    shop: {
      shopName: 'My Retail Shop', shopAddress: 'Male, Maldives', shopPhone: '3301234', shopEmail: 'info@myshop.com',
      currency: 'MVR', taxRate: 8, receiptHeader: 'Thank you for shopping with us!', receiptFooter: 'Visit us again soon!',
      logo: '', enableCardPayment: true,
    },
    accounting: {
      fiscalYearStart: 'January', accountingMethod: 'accrual', taxCalculation: 'inclusive', defaultPaymentTerms: 'due_on_receipt',
      enableCreditSales: true, creditLimit: 10000, latePaymentFee: 5, latePaymentGracePeriod: 7,
    },
    software: {
      language: 'dv', dateFormat: 'DD/MM/YYYY', timeFormat: '24-hour', theme: 'light',
      autoBackup: true, backupFrequency: 'daily', dataRetentionPeriod: 365, enableAnalytics: true, enableNotifications: true,
    },
    general: {
      appName: 'Retail POS System', appVersion: '1.0.0', enableMultiCart: true, maxCarts: 5,
      barcodeScannerEnabled: true, receiptPrinterEnabled: true, defaultDiscount: 0, enableLoyaltyProgram: false, loyaltyPointsRate: 1,
    },
    reports: {
      invoiceHeader: 'INVOICE', invoiceFooter: 'Thank you for your business!', quotationHeader: 'QUOTATION', quotationFooter: 'Valid for 30 days.',
      customerOutstandingHeader: 'CUSTOMER OUTSTANDING REPORT', customerOutstandingFooter: 'Please settle your balance as soon as possible.',
      showLogo: true, showContactInfo: true,
    },
    printing: {
      printReceiptOnCheckout: true, printMode: 'ask', printerName: '', thermalPrinterWidth: '80mm',
    },
  });

  const refreshData = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const [dbProducts, dbCustomers, dbVendors, dbSales, dbPurchases] = await Promise.all([
        productService.getAll(),
        customerService.getAll(),
        vendorService.getAll(),
        saleService.getAll(),
        purchaseService.getAll()
      ]);

      setProducts(dbProducts as any);
      setCustomers(dbCustomers as any);
      setVendors(dbVendors as any);
      setSales(dbSales as any);
      setPurchases(dbPurchases as any);

      // Fetch settings
      const categories: (keyof AppSettings)[] = ['shop', 'accounting', 'software', 'general', 'reports', 'printing'];
      const settingsData = await Promise.all(
        categories.map(cat => settingsService.get(cat))
      );

      const newSettings = { ...settings };
      settingsData.forEach((data, index) => {
        if (data) {
          (newSettings as any)[categories[index]] = data.settings;
        }
      });
      setSettings(newSettings);

    } catch (error) {
      console.error('Error fetching data:', error);
      showError('Failed to load data from server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, [currentUser]);

  const clearCart = (cartId: string) => {
    setOpenCarts(prev => {
      const newCarts = new Map(prev);
      const cart = newCarts.get(cartId);
      if (cart) {
        newCarts.set(cartId, { ...cart, customer: null, items: [] });
      }
      return newCarts;
    });
  };

  const updateStock = async (productId: string, newStock: number) => {
    try {
      await productService.update(productId, { stock_shop: newStock });
      setProducts(prev => prev.map(p =>
        p.id === productId ? { ...p, stock_shop: newStock } : p
      ));
    } catch (error) {
      console.error('Error updating stock:', error);
      showError('Failed to update stock in database');
    }
  };

  const transferStock = async (productId: string, from: 'shop' | 'godown', to: 'shop' | 'godown', amount: number) => {
    const p = products.find(prod => prod.id === productId);
    if (!p) return;

    const sourceStock = from === 'shop' ? p.stock_shop : p.stock_godown;
    if (sourceStock < amount) {
      showError('Insufficient stock for transfer');
      return;
    }

    const newShopStock = from === 'shop' ? p.stock_shop - amount : p.stock_shop + amount;
    const newGodownStock = from === 'godown' ? p.stock_godown - amount : p.stock_godown + amount;

    try {
      await productService.update(productId, {
        stock_shop: newShopStock,
        stock_godown: newGodownStock
      });

      setProducts(prev => prev.map(prod => {
        if (prod.id !== productId) return prod;
        return {
          ...prod,
          stock_shop: newShopStock,
          stock_godown: newGodownStock
        };
      }));
      showSuccess('Stock transferred successfully');
    } catch (error) {
      console.error('Error transferring stock:', error);
      showError('Failed to transfer stock in database');
    }
  };

  const awardLoyaltyPoints = async (customerId: string, points: number) => {
    const c = customers.find(cust => cust.id === customerId);
    if (!c) return;
    const newPoints = (c.loyalty_points || 0) + points;
    try {
      await customerService.update(customerId, { loyalty_points: newPoints });
      setCustomers(prev => prev.map(cust =>
        cust.id === customerId ? { ...cust, loyalty_points: newPoints } : cust
      ));
    } catch (error) {
      showError('Failed to update loyalty points');
    }
  };

  const addCustomer = async (customer: Customer) => {
    try {
      const { settlement_history, id, ...dbCustomer } = customer;
      const newCustomer = await customerService.create(dbCustomer as any);
      setCustomers(prev => [...prev, { ...newCustomer, settlement_history: [] } as any]);
      showSuccess('Customer added successfully');
    } catch (error) {
      console.error('Error adding customer:', error);
      showError('Failed to add customer to database');
      throw error;
    }
  };

  const updateCustomer = async (customer: Customer) => {
    try {
      const { id, settlement_history, ...updates } = customer;
      await customerService.update(id, updates as any);
      setCustomers(prev => prev.map(c => c.id === id ? customer : c));
      showSuccess('Customer updated successfully');
    } catch (error) {
      showError('Failed to update customer');
    }
  };

  const deleteCustomer = async (customerId: string) => {
    try {
      await customerService.delete(customerId);
      setCustomers(prev => prev.filter(c => c.id !== customerId));
      showSuccess('Customer deleted successfully');
    } catch (error) {
      showError('Failed to delete customer');
    }
  };

  const redeemLoyaltyPoints = async (customerId: string, points: number) => {
    const c = customers.find(cust => cust.id === customerId);
    if (!c) return;
    const newPoints = Math.max(0, (c.loyalty_points || 0) - points);
    try {
      await customerService.update(customerId, { loyalty_points: newPoints });
      setCustomers(prev => prev.map(cust =>
        cust.id === customerId ? { ...cust, loyalty_points: newPoints } : cust
      ));
    } catch (error) {
      showError('Failed to update loyalty points');
    }
  };

  const updateCustomerBalance = async (customerId: string, amount: number) => {
    const c = customers.find(cust => cust.id === customerId);
    if (!c) return;
    const newBalance = c.outstanding_balance + amount;
    try {
      await customerService.update(customerId, { outstanding_balance: newBalance });
      setCustomers(prev => prev.map(cust =>
        cust.id === customerId ? { ...cust, outstanding_balance: newBalance } : cust
      ));
    } catch (error) {
      showError('Failed to update customer balance');
    }
  };

  const addSettlement = async (customerId: string, settlement: Settlement) => {
    try {
      await settlementService.create({
        customer_id: customerId,
        amount_paid: settlement.amount_paid,
        date: new Date().toISOString(),
        previous_outstanding: settlement.previous_outstanding,
        new_outstanding: settlement.new_outstanding
      });

      await updateCustomerBalance(customerId, -settlement.amount_paid);

      setCustomers(prev => prev.map(c =>
        c.id === customerId ? {
          ...c,
          outstanding_balance: settlement.new_outstanding,
          settlement_history: [...c.settlement_history, settlement]
        } : c
      ));

      showSuccess('Settlement recorded');
    } catch (error) {
      console.error('Error recording settlement:', error);
      showError('Failed to record settlement');
    }
  };

  const updateSettings = async (category: keyof AppSettings, newSettings: any, silent: boolean = false) => {
    if (!currentUser) return;
    try {
      const mergedSettings = { ...settings[category], ...newSettings };
      await settingsService.update(currentUser.id, category, mergedSettings);
      setSettings(prev => ({
        ...prev,
        [category]: mergedSettings
      }));
      if (!silent) {
        showSuccess('Settings saved');
      }
    } catch (error) {
      console.error('Error updating settings:', error);
      showError('Failed to save settings');
    }
  };

  const getNextCustomerCode = () => {
    const lastCustomerCode = customers.reduce((maxCode, customer) => {
      const codeNum = parseInt(customer.code.replace('CUST', ''), 10);
      return isNaN(codeNum) ? maxCode : Math.max(maxCode, codeNum);
    }, 0);
    return `CUST${String(lastCustomerCode + 1).padStart(3, '0')}`;
  };

  const getNextProductCode = () => {
    const lastItemCode = products.reduce((maxCode, product) => {
      const match = product.item_code.match(/\d+/);
      const codeNum = match ? parseInt(match[0], 10) : 0;
      return isNaN(codeNum) ? maxCode : Math.max(maxCode, codeNum);
    }, 0);
    return `PROD${String(lastItemCode + 1).padStart(3, '0')}`;
  };

  const getTopProducts = (limit: number): Product[] => {
    const productSalesCount = new Map<string, number>();
    sales.forEach(sale => {
      sale.items.forEach(item => {
        const currentCount = productSalesCount.get(item.id) || 0;
        productSalesCount.set(item.id, currentCount + item.qty);
      });
    });
    const sortedProducts = [...products].sort((a, b) => {
      const aCount = productSalesCount.get(a.id) || 0;
      const bCount = productSalesCount.get(b.id) || 0;
      return bCount - aCount;
    });
    return sortedProducts.slice(0, limit);
  };

  const updateProduct = async (updatedProduct: Product) => {
    try {
      const { id, ...updates } = updatedProduct;
      await productService.update(id, updates as any);
      setProducts(prev => prev.map(p =>
        p.id === id ? updatedProduct : p
      ));
      showSuccess('Product updated successfully');
    } catch (error) {
      console.error('Error updating product:', error);
      showError('Failed to update product');
    }
  };

  const addProduct = async (product: Product) => {
    try {
      const { id, ...dbProduct } = product;
      const newProduct = await productService.create(dbProduct as any);
      setProducts(prev => [...prev, newProduct as any]);
      showSuccess('Product added successfully');
    } catch (error) {
      console.error('Error adding product:', error);
      showError('Failed to add product to database');
      throw error;
    }
  };

  const deleteProduct = async (productId: string) => {
    try {
      await productService.delete(productId);
      setProducts(prev => prev.filter(p => p.id !== productId));
      showSuccess('Product deleted successfully');
    } catch (error) {
      showError('Failed to delete product');
    }
  };

  const bulkAddProducts = async (productsToAdd: Product[]) => {
    try {
      const { data, error } = await supabase.from('products').insert(productsToAdd as any).select();
      if (error) throw error;
      setProducts(prev => [...prev, ...data as any]);
      showSuccess(`${productsToAdd.length} products imported successfully`);
    } catch (error) {
      showError('Failed to import products');
    }
  };

  const createSale = async (sale: Sale, skipStockUpdate: boolean = false) => {
    try {
      const saleToCreate = {
        date: new Date().toISOString(),
        customer_id: sale.customer?.id || null,
        items: sale.items,
        grandTotal: sale.grandTotal,
        paymentMethod: sale.paymentMethod,
        paidAmount: sale.paidAmount || 0,
        balance: sale.balance || 0
      };

      const createdSale = await saleService.create(saleToCreate);

      if (sale.customer) {
        if (sale.paymentMethod === 'credit') {
          await updateCustomerBalance(sale.customer.id, sale.grandTotal);
        }
        if (settings.general.enableLoyaltyProgram) {
          const points = Math.floor(sale.grandTotal * settings.general.loyaltyPointsRate);
          if (points > 0) {
            await awardLoyaltyPoints(sale.customer.id, points);
          }
        }
      }

      setSales(prev => [{ ...sale, id: createdSale.id }, ...prev]);

      if (!skipStockUpdate) {
        for (const item of sale.items) {
          const product = products.find(p => p.id === item.id);
          if (product) {
            const newStock = product.stock_shop - (item.qty * (item.unit_conversion || 1));
            await updateStock(item.id, newStock);
          }
        }
      }

      showSuccess('Sale recorded successfully');
    } catch (error) {
      console.error('Error creating sale:', error);
      showError('Failed to record sale to database');
      throw error;
    }
  };

  const deleteSale = async (id: string) => {
    try {
      await saleService.delete(id);
      setSales(prev => prev.filter(s => s.id !== id));
      showSuccess('Sale deleted successfully');
    } catch (error) {
      console.error('Error deleting sale:', error);
      showError('Failed to delete sale');
    }
  };

  const addPurchase = async (purchase: Purchase) => {
    try {
      const purchaseToCreate = {
        date: purchase.date || new Date().toISOString(),
        vendorId: purchase.vendorId || null,
        billNumber: purchase.billNumber || '',
        amount: purchase.amount || 0,
        gstAmount: purchase.gstAmount || 0,
        description: purchase.description || '',
        items: purchase.items || [],
        subtotal: purchase.subtotal || purchase.amount || 0
      };

      const createdPurchase = await purchaseService.create(purchaseToCreate);

      if (purchase.items && purchase.items.length > 0) {
        for (const item of purchase.items) {
          await updateProductCostPrice(item.product_id, item.unit_price, purchase.date);
        }
      }
      setPurchases(prev => [createdPurchase as any, ...prev]);
      showSuccess('Purchase recorded');
    } catch (error) {
      console.error('Error adding purchase:', error);
      showError('Failed to record purchase');
    }
  };

  const deletePurchase = async (id: string) => {
    try {
      await purchaseService.delete(id);
      setPurchases(prev => prev.filter(p => p.id !== id));
      showSuccess('Purchase deleted successfully');
    } catch (error) {
      console.error('Error deleting purchase:', error);
      showError('Failed to delete purchase');
    }
  };

  const addVendor = async (vendor: Vendor) => {
    try {
      if (!vendor.name_dv) {
        showError('Dhivehi name is required for vendor');
        return;
      }
      const { id, ...dbVendor } = vendor;
      const newVendor = await vendorService.create(dbVendor as any);
      setVendors(prev => [...prev, newVendor as any]);
      showSuccess('Vendor added successfully');
    } catch (error) {
      console.error('Error adding vendor:', error);
      showError('Failed to add vendor to database');
      throw error;
    }
  };

  const updateVendor = async (vendor: Vendor) => {
    try {
      if (!vendor.name_dv) {
        showError('Dhivehi name is required for vendor');
        return;
      }
      const { id, ...updates } = vendor;
      await vendorService.update(id, updates as any);
      setVendors(prev => prev.map(v => v.id === id ? vendor : v));
      showSuccess('Vendor updated successfully');
    } catch (error) {
      console.error('Error updating vendor:', error);
      showError('Failed to update vendor in database');
      throw error;
    }
  };

  const deleteVendor = async (vendorId: string) => {
    try {
      await vendorService.delete(vendorId);
      setVendors(prev => prev.filter(v => v.id !== vendorId));
      showSuccess('Vendor deleted successfully');
    } catch (error) {
      showError('Failed to delete vendor');
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
    const p = products.find(prod => prod.id === productId);
    if (!p) return;
    const shouldUpdate = !p.cost_price || newCost !== p.cost_price;
    if (!shouldUpdate) return;
    try {
      await productService.update(productId, {
        cost_price: newCost,
        last_purchase_date: purchaseDate
      });
      setProducts(prev => prev.map(prod => {
        if (prod.id !== productId) return prod;
        return {
          ...prod,
          cost_price: newCost,
          last_purchase_date: purchaseDate
        };
      }));
      const minSellingPrice = newCost * 1.2;
      if (p.price < minSellingPrice) {
        showError(`${p.name_en}: Selling price is below minimum recommended price.`);
      }
    } catch (error) {
      showError('Failed to update product cost');
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
      addProduct,
      bulkAddProducts,
      transferStock,
      awardLoyaltyPoints,
      redeemLoyaltyPoints,
      addCustomer,
      updateCustomer,
      deleteCustomer,
      updateCustomerBalance,
      addSettlement,
      vendors,
      setVendors,
      purchases,
      addPurchase,
      deletePurchase,
      addVendor,
      updateVendor,
      deleteVendor,
      getNextVendorCode,
      updateProductCostPrice,
      calculateProfitMargin,
      loading,
      createSale,
      deleteSale,
      refreshData,
      openCarts,
      setOpenCarts,
      activeCartId,
      setActiveCartId,
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