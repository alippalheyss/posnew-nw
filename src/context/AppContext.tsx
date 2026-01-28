"use client";

import React, { createContext, useState, useContext, ReactNode } from 'react';
import { showError } from '@/utils/toast';

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
  updateProduct: (updatedProduct: Product) => void;
  transferStock: (productId: string, from: 'shop' | 'godown', to: 'shop' | 'godown', amount: number) => void;
  openCarts: Map<string, Cart>;
  setOpenCarts: React.Dispatch<React.SetStateAction<Map<string, Cart>>>;
  activeCartId: string;
  setActiveCartId: React.Dispatch<React.SetStateAction<string>>;
  awardLoyaltyPoints: (customerId: string, points: number) => void;
  redeemLoyaltyPoints: (customerId: string, points: number) => void;
  updateCustomerBalance: (customerId: string, amount: number) => void;
  addSettlement: (customerId: string, settlement: Settlement) => void;
  purchases: Purchase[];
  addPurchase: (purchase: Purchase) => void;
  vendors: Vendor[];
  setVendors: React.Dispatch<React.SetStateAction<Vendor[]>>;
  addVendor: (vendor: Vendor) => void;
  updateVendor: (vendor: Vendor) => void;
  deleteVendor: (vendorId: string) => void;
  getNextVendorCode: () => string;
  updateProductCostPrice: (productId: string, newCost: number, purchaseDate: string) => void;
  calculateProfitMargin: (product: Product) => number;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppContextProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>([
    { id: 'p1', name_dv: 'ކޯކް', name_en: 'Coke', barcode: '1234567890', item_code: 'C001', price: 15.00, image: 'https://placehold.co/100x100/FF0000/FFFFFF?text=Coke', expiry_date: '2024-12-31', category: 'Beverage', units: [{ name: 'Case (24)', price: 350, conversion_factor: 24, barcode: '1234567890-C24' }] },
    { id: 'p2', name_dv: 'ފެންފޮޅި', name_en: 'Water Bottle', barcode: '0987654321', item_code: 'W001', price: 5.00, image: 'https://placehold.co/100x100/0000FF/FFFFFF?text=Water', expiry_date: '2025-06-15', category: 'Beverage', units: [{ name: 'Case (12)', price: 55, conversion_factor: 12, barcode: '0987654321-C12' }] },
    { id: 'p3', name_dv: 'ބިސްކޯދު', name_en: 'Biscuit', barcode: '1122334455', item_code: 'B001', price: 10.00, image: 'https://placehold.co/100x100/FFD700/000000?text=Biscuit', expiry_date: '2024-03-01', category: 'Snacks' },
    { id: 'p4', name_dv: 'ސައިފަތް', name_en: 'Tea Leaves', barcode: '2233445566', item_code: 'T001', price: 25.00, image: 'https://placehold.co/100x100/008000/FFFFFF?text=Tea', expiry_date: '2024-11-20', category: 'Beverage' },
    { id: 'p5', name_dv: 'ސައިބޯނި', name_en: 'Soap', barcode: '3344556677', item_code: 'S001', price: 12.00, image: 'https://placehold.co/100x100/800080/FFFFFF?text=Soap', expiry_date: '2025-01-01', category: 'Personal Care' },
    { id: 'p6', name_dv: 'ޕެންސިލް', name_en: 'Pencil', barcode: '4455667788', item_code: 'P001', price: 3.00, image: 'https://placehold.co/100x100/A52A2A/FFFFFF?text=Pencil', expiry_date: '2026-01-01', category: 'Stationery' },
    { id: 'p7', name_dv: 'ބޭގެރިޔާތް', name_en: 'Beverage', barcode: '5566778899', item_code: 'B002', price: 8.00, image: 'https://placehold.co/100x100/FFA500/FFFFFF?text=Beverage', expiry_date: '2024-07-01', category: 'Beverage' },
    { id: 'p8', name_dv: 'ކާއިލިއެއް', name_en: 'Snack', barcode: '6677889900', item_code: 'S002', price: 7.50, image: 'https://placehold.co/100x100/FFC0CB/000000?text=Snack', expiry_date: '2024-04-10', category: 'Snacks' },
    { id: 'p9', name_dv: 'މަސްވެރިކަން', name_en: 'Household Item', barcode: '7788990011', item_code: 'H001', price: 30.00, image: 'https://placehold.co/100x100/808080/FFFFFF?text=Household', expiry_date: '2025-03-20', category: 'Household' },
    { id: 'p10', name_dv: 'އޮފީސް އެއްޗެއް', name_en: 'Office Supply', barcode: '8899001122', item_code: 'O001', price: 20.00, image: 'https://placehold.co/100x100/00FFFF/000000?text=Office', expiry_date: '2026-05-01', category: 'Stationery' },
    { id: 'p11', name_dv: 'ޕެޕްސީ', name_en: 'Pepsi', barcode: '1111222233', item_code: 'C002', price: 15.00, image: 'https://placehold.co/100x100/0044CC/FFFFFF?text=Pepsi', expiry_date: '2024-12-31', category: 'Beverage' },
    { id: 'p12', name_dv: 'ސްޕްރައިޓް', name_en: 'Sprite', barcode: '2222333344', item_code: 'C003', price: 15.00, image: 'https://placehold.co/100x100/00FF00/FFFFFF?text=Sprite', expiry_date: '2024-12-31', category: 'Beverage' },
    { id: 'p13', name_dv: 'ފަންތާ', name_en: 'Fanta', barcode: '3333444455', item_code: 'C004', price: 15.00, image: 'https://placehold.co/100x100/FF8800/FFFFFF?text=Fanta', expiry_date: '2024-12-31', category: 'Beverage' },
    { id: 'p14', name_dv: 'އަހަރު', name_en: 'Rice (5kg)', barcode: '4444555566', item_code: 'G001', price: 85.00, image: 'https://placehold.co/100x100/EEEEEE/333333?text=Rice', expiry_date: '2025-12-31', category: 'Grocery' },
    { id: 'p15', name_dv: 'ފުށް', name_en: 'Flour (1kg)', barcode: '5555666677', item_code: 'G002', price: 20.00, image: 'https://placehold.co/100x100/F5E6D3/666666?text=Flour', expiry_date: '2025-03-01', category: 'Grocery' },
    { id: 'p16', name_dv: 'ސުކުރު', name_en: 'Sugar (1kg)', barcode: '6666777788', item_code: 'G003', price: 18.00, image: 'https://placehold.co/100x100/FFFFFF/999999?text=Sugar', expiry_date: '2026-01-01', category: 'Grocery' },
    { id: 'p17', name_dv: 'ނޫނު', name_en: 'Salt (500g)', barcode: '7777888899', item_code: 'G004', price: 5.00, image: 'https://placehold.co/100x100/F0F0F0/333333?text=Salt', expiry_date: '2027-01-01', category: 'Grocery' },
    { id: 'p18', name_dv: 'ތެޔޮ', name_en: 'Cooking Oil (1L)', barcode: '8888999900', item_code: 'G005', price: 35.00, image: 'https://placehold.co/100x100/FFD700/666666?text=Oil', expiry_date: '2025-06-01', category: 'Grocery' },
    { id: 'p19', name_dv: 'ބިސް', name_en: 'Eggs (12pcs)', barcode: '9999000011', item_code: 'G006', price: 40.00, image: 'https://placehold.co/100x100/FFF8DC/8B4513?text=Eggs', expiry_date: '2024-02-15', category: 'Grocery' },
    { id: 'p20', name_dv: 'ކިރު', name_en: 'Milk (1L)', barcode: '0000111122', item_code: 'D001', price: 28.00, image: 'https://placehold.co/100x100/FFFFFF/0066CC?text=Milk', expiry_date: '2024-02-20', category: 'Dairy' },
    { id: 'p21', name_dv: 'ދަނބު', name_en: 'Butter (250g)', barcode: '1212121212', item_code: 'D002', price: 45.00, image: 'https://placehold.co/100x100/FFE4B5/996633?text=Butter', expiry_date: '2024-03-10', category: 'Dairy' },
    { id: 'p22', name_dv: 'ޔޯގަޓް', name_en: 'Yogurt', barcode: '2323232323', item_code: 'D003', price: 22.00, image: 'https://placehold.co/100x100/FFF5EE/CC6699?text=Yogurt', expiry_date: '2024-02-05', category: 'Dairy' },
    { id: 'p23', name_dv: 'ޗީޒް', name_en: 'Cheese (200g)', barcode: '3434343434', item_code: 'D004', price: 55.00, image: 'https://placehold.co/100x100/FFF8DC/FF8C00?text=Cheese', expiry_date: '2024-03-20', category: 'Dairy' },
    { id: 'p24', name_dv: 'ބްރެޑް', name_en: 'Bread', barcode: '4545454545', item_code: 'B003', price: 12.00, image: 'https://placehold.co/100x100/D2691E/FFFFFF?text=Bread', expiry_date: '2024-01-30', category: 'Bakery' },
    { id: 'p25', name_dv: 'ކޭކް', name_en: 'Cake', barcode: '5656565656', item_code: 'B004', price: 75.00, image: 'https://placehold.co/100x100/FFB6C1/8B0000?text=Cake', expiry_date: '2024-02-01', category: 'Bakery' },
    { id: 'p26', name_dv: 'ޕާސްތާ', name_en: 'Pasta (500g)', barcode: '6767676767', item_code: 'G007', price: 32.00, image: 'https://placehold.co/100x100/F5DEB3/8B4513?text=Pasta', expiry_date: '2025-08-01', category: 'Grocery' },
    { id: 'p27', name_dv: 'ނޫޑްލްސް', name_en: 'Noodles', barcode: '7878787878', item_code: 'G008', price: 8.00, image: 'https://placehold.co/100x100/FFFACD/8B4513?text=Noodles', expiry_date: '2024-09-01', category: 'Grocery' },
    { id: 'p28', name_dv: 'ޓޫނާ', name_en: 'Tuna Can', barcode: '8989898989', item_code: 'C005', price: 24.00, image: 'https://placehold.co/100x100/C0C0C0/000080?text=Tuna', expiry_date: '2026-01-01', category: 'Canned Goods' },
    { id: 'p29', name_dv: 'ޓޮމާޓޯ ސޯސް', name_en: 'Tomato Sauce', barcode: '9090909090', item_code: 'C006', price: 18.00, image: 'https://placehold.co/100x100/FF6347/FFFFFF?text=Sauce', expiry_date: '2025-04-01', category: 'Canned Goods' },
    { id: 'p30', name_dv: 'މޭޔޮނީޒް', name_en: 'Mayonnaise', barcode: '0101010101', item_code: 'C007', price: 35.00, image: 'https://placehold.co/100x100/FFF8DC/999999?text=Mayo', expiry_date: '2024-06-01', category: 'Canned Goods' },
    { id: 'p31', name_dv: 'ޗިޕްސް', name_en: 'Chips', barcode: '1122334466', item_code: 'S003', price: 12.00, image: 'https://placehold.co/100x100/FFD700/DC143C?text=Chips', expiry_date: '2024-05-01', category: 'Snacks' },
    { id: 'p32', name_dv: 'ޗޮކްލެޓް', name_en: 'Chocolate Bar', barcode: '2233445577', item_code: 'S004', price: 18.00, image: 'https://placehold.co/100x100/8B4513/FFFFFF?text=Chocolate', expiry_date: '2024-08-01', category: 'Snacks' },
    { id: 'p33', name_dv: 'ކޭންޑީ', name_en: 'Candy', barcode: '3344556688', item_code: 'S005', price: 5.00, image: 'https://placehold.co/100x100/FF69B4/FFFFFF?text=Candy', expiry_date: '2024-09-01', category: 'Snacks' },
    { id: 'p34', name_dv: 'ކޮފީ', name_en: 'Coffee (200g)', barcode: '4455667799', item_code: 'B005', price: 65.00, image: 'https://placehold.co/100x100/5C4033/FFFFFF?text=Coffee', expiry_date: '2025-03-01', category: 'Beverage' },
    { id: 'p35', name_dv: 'ޝޭމްޕޫ', name_en: 'Shampoo', barcode: '5566778800', item_code: 'P002', price: 45.00, image: 'https://placehold.co/100x100/ADD8E6/000080?text=Shampoo', expiry_date: '2025-12-01', category: 'Personal Care' },
    { id: 'p36', name_dv: 'ޓޫތްޕޭސްޓް', name_en: 'Toothpaste', barcode: '6677889911', item_code: 'P003', price: 25.00, image: 'https://placehold.co/100x100/00CED1/FFFFFF?text=Toothpaste', expiry_date: '2025-06-01', category: 'Personal Care' },
    { id: 'p37', name_dv: 'ޓޫތްބްރަޝް', name_en: 'Toothbrush', barcode: '7788990022', item_code: 'P004', price: 15.00, image: 'https://placehold.co/100x100/90EE90/000000?text=Toothbrush', expiry_date: '2026-01-01', category: 'Personal Care' },
    { id: 'p38', name_dv: 'ޓިޝޫ', name_en: 'Tissue Box', barcode: '8899001133', item_code: 'H002', price: 20.00, image: 'https://placehold.co/100x100/F0E68C/666666?text=Tissue', expiry_date: '2026-12-01', category: 'Household' },
    { id: 'p39', name_dv: 'ޓޮއިލެޓް ޕޭޕަރު', name_en: 'Toilet Paper', barcode: '9900112244', item_code: 'H003', price: 35.00, image: 'https://placehold.co/100x100/FAFAD2/999999?text=TP', expiry_date: '2026-12-01', category: 'Household' },
    { id: 'p40', name_dv: 'ޑިޓަޖެންޓް', name_en: 'Detergent', barcode: '0011223355', item_code: 'H004', price: 85.00, image: 'https://placehold.co/100x100/87CEEB/000080?text=Detergent', expiry_date: '2026-06-01', category: 'Household' },
    { id: 'p41', name_dv: 'ޑިޝްވޮޝް', name_en: 'Dishwash Liquid', barcode: '1122334477', item_code: 'H005', price: 38.00, image: 'https://placehold.co/100x100/98FB98/006400?text=Dishwash', expiry_date: '2025-08-01', category: 'Household' },
    { id: 'p42', name_dv: 'ނޯޓްބުކް', name_en: 'Notebook', barcode: '2233445588', item_code: 'O002', price: 15.00, image: 'https://placehold.co/100x100/FFE4E1/8B4513?text=Notebook', expiry_date: '2027-01-01', category: 'Stationery' },
    { id: 'p43', name_dv: 'ޕެން', name_en: 'Pen (Blue)', barcode: '3344556699', item_code: 'O003', price: 5.00, image: 'https://placehold.co/100x100/4169E1/FFFFFF?text=Pen', expiry_date: '2027-01-01', category: 'Stationery' },
    { id: 'p44', name_dv: 'ރަބަރު', name_en: 'Eraser', barcode: '4455667700', item_code: 'O004', price: 2.00, image: 'https://placehold.co/100x100/FFC0CB/000000?text=Eraser', expiry_date: '2027-01-01', category: 'Stationery' },
    { id: 'p45', name_dv: 'ރޫލަރު', name_en: 'Ruler', barcode: '5566778811', item_code: 'O005', price: 8.00, image: 'https://placehold.co/100x100/F5F5DC/000000?text=Ruler', expiry_date: '2027-01-01', category: 'Stationery' },
    { id: 'p46', name_dv: 'ގްލޫ', name_en: 'Glue Stick', barcode: '6677889922', item_code: 'O006', price: 10.00, image: 'https://placehold.co/100x100/E6E6FA/4B0082?text=Glue', expiry_date: '2026-01-01', category: 'Stationery' },
    { id: 'p47', name_dv: 'ސިސަރސް', name_en: 'Scissors', barcode: '7788990033', item_code: 'O007', price: 25.00, image: 'https://placehold.co/100x100/C0C0C0/000000?text=Scissors', expiry_date: '2027-01-01', category: 'Stationery' },
    { id: 'p48', name_dv: 'ބެޓްރީ', name_en: 'Battery (AA)', barcode: '8899001144', item_code: 'E001', price: 12.00, image: 'https://placehold.co/100x100/FFD700/000000?text=Battery', expiry_date: '2026-12-01', category: 'Electronics' },
    { id: 'p49', name_dv: 'ލައިޓް ބަލްބް', name_en: 'Light Bulb', barcode: '9900112255', item_code: 'E002', price: 22.00, image: 'https://placehold.co/100x100/FFFACD/8B8B00?text=Bulb', expiry_date: '2027-01-01', category: 'Electronics' },
    { id: 'p50', name_dv: 'ޗާޖަރު', name_en: 'Phone Charger', barcode: '0011223366', item_code: 'E003', price: 95.00, image: 'https://placehold.co/100x100/000000/FFFFFF?text=Charger', expiry_date: '2027-01-01', category: 'Electronics', stock_shop: 12, stock_godown: 5 },
  ].map(p => ({ ...p, is_zero_tax: false, stock_shop: (p as any).stock_shop ?? ((p as any).current_stock || 15), stock_godown: (p as any).stock_godown ?? 0 })));

  const [customers, setCustomers] = useState<Customer[]>([
    { id: 'cust1', code: 'CUST001', name_dv: 'އަޙްމަދު ޢަލީ', name_en: 'Ahmed Ali', phone: '7771234', email: 'ahmed@example.com', credit_limit: 5000, loyalty_points: 0, outstanding_balance: 1500, settlement_history: [{ id: 'set1', amount_paid: 500.00, date: '2023-10-20', previous_outstanding: 2000.00, new_outstanding: 1500.00 }] },
    { id: 'cust2', code: 'CUST002', name_dv: 'ފާތިމަތު ނަސީމް', name_en: 'Fathimath Naseem', phone: '9995678', email: 'fathimath@example.com', credit_limit: 10000, loyalty_points: 0, outstanding_balance: 3200.50, settlement_history: [{ id: 'set2', amount_paid: 1000.00, date: '2023-10-15', previous_outstanding: 4200.50, new_outstanding: 3200.50 }] },
    { id: 'cust3', code: 'CUST003', name_dv: 'މުޙައްމަދު ރަޝީދު', name_en: 'Mohamed Rasheed', phone: '7901122', email: 'mohamed@example.com', credit_limit: 2000, loyalty_points: 0, outstanding_balance: 0, settlement_history: [] },
  ]);

  const [sales, setSales] = useState<Sale[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([
    { id: 'v1', code: 'VEN001', name_dv: 'އެސް.ޓީ.އޯ', name_en: 'STO', contact_person: 'Ali Ahmed', phone: '3322110', email: 'sto@example.com', tin_number: 'TIN123456', address: 'Male, Maldives', notes: 'Main supplier' },
    { id: 'v2', code: 'VEN002', name_dv: 'އެމް.ޓީ.ސީ.ސީ', name_en: 'MTCC', contact_person: 'Mohamed Hassan', phone: '3344556', email: 'mtcc@example.com', tin_number: 'TIN789012', address: 'Male, Maldives', notes: 'Secondary supplier' },
  ]);
  const [favoriteProductIds, setFavoriteProductIds] = useState<string[]>([]);

  const [openCarts, setOpenCarts] = useState<Map<string, Cart>>(() => {
    const initialCartId = `cart-${Date.now()}`;
    return new Map([[initialCartId, { id: initialCartId, displayNumber: 1, customer: null, items: [] }]]);
  });
  const [activeCartId, setActiveCartId] = useState<string>([...openCarts.keys()][0]);

  const [settings, setSettings] = useState<AppSettings>({
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
    },
  });

  const clearCart = (cartId: string) => {
    // Logic as before
  };

  const updateStock = (productId: string, newStock: number) => {
    setProducts(prev => prev.map(p =>
      p.id === productId ? { ...p, stock_shop: newStock } : p
    ));
  };

  const transferStock = (productId: string, from: 'shop' | 'godown', to: 'shop' | 'godown', amount: number) => {
    setProducts(prev => prev.map(p => {
      if (p.id !== productId) return p;

      const sourceStock = from === 'shop' ? p.stock_shop : p.stock_godown;
      if (sourceStock < amount) return p; // Prevent negative stock transfer

      return {
        ...p,
        stock_shop: from === 'shop' ? p.stock_shop - amount : p.stock_shop + amount,
        stock_godown: from === 'godown' ? p.stock_godown - amount : p.stock_godown + amount
      };
    }));
  };

  const awardLoyaltyPoints = (customerId: string, points: number) => {
    setCustomers(prev => prev.map(c =>
      c.id === customerId ? { ...c, loyalty_points: (c.loyalty_points || 0) + points } : c
    ));
  };

  const redeemLoyaltyPoints = (customerId: string, points: number) => {
    setCustomers(prev => prev.map(c =>
      c.id === customerId ? { ...c, loyalty_points: Math.max(0, (c.loyalty_points || 0) - points) } : c
    ));
  };

  const updateCustomerBalance = (customerId: string, amount: number) => {
    setCustomers(prev => prev.map(c =>
      c.id === customerId ? { ...c, outstanding_balance: c.outstanding_balance + amount } : c
    ));
  };

  const addSettlement = (customerId: string, settlement: Settlement) => {
    setCustomers(prev => prev.map(c =>
      c.id === customerId ? {
        ...c,
        outstanding_balance: settlement.new_outstanding,
        settlement_history: [...c.settlement_history, settlement]
      } : c
    ));
  };

  const updateSettings = (category: keyof AppSettings, newSettings: any) => {
    setSettings(prev => ({
      ...prev,
      [category]: { ...prev[category], ...newSettings }
    }));
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

  const updateProduct = (updatedProduct: Product) => {
    setProducts(prev => prev.map(p =>
      p.id === updatedProduct.id ? updatedProduct : p
    ));
  };

  const addPurchase = (purchase: Purchase) => {
    // Update cost prices for products in the purchase
    if (purchase.items && purchase.items.length > 0) {
      purchase.items.forEach(item => {
        updateProductCostPrice(item.product_id, item.unit_price, purchase.date);
      });
    }
    setPurchases(prev => [...prev, purchase]);
  };

  const addVendor = (vendor: Vendor) => {
    setVendors(prev => [...prev, vendor]);
  };

  const updateVendor = (vendor: Vendor) => {
    setVendors(prev => prev.map(v => v.id === vendor.id ? vendor : v));
  };

  const deleteVendor = (vendorId: string) => {
    setVendors(prev => prev.filter(v => v.id !== vendorId));
  };

  const getNextVendorCode = () => {
    const lastVendorCode = vendors.reduce((maxCode, vendor) => {
      const codeNum = parseInt(vendor.code.replace('VEN', ''), 10);
      return isNaN(codeNum) ? maxCode : Math.max(maxCode, codeNum);
    }, 0);
    return `VEN${String(lastVendorCode + 1).padStart(3, '0')}`;
  };

  const updateProductCostPrice = (productId: string, newCost: number, purchaseDate: string) => {
    setProducts(prev => prev.map(p => {
      if (p.id !== productId) return p;

      const shouldUpdate = !p.cost_price || newCost !== p.cost_price;
      if (!shouldUpdate) return p;


      // Check if selling price is below minimum margin (20%)
      const minSellingPrice = newCost * 1.2; // 20% minimum margin

      // Update cost price but DON'T auto-adjust selling price
      const updatedProduct = {
        ...p,
        cost_price: newCost,
        last_purchase_date: purchaseDate
      };

      // Show warning if selling price is too low
      if (p.price < minSellingPrice) {
        setTimeout(() => {
          showError(`${p.name_en}: Selling price (MVR ${p.price.toFixed(2)}) is below minimum recommended price (MVR ${minSellingPrice.toFixed(2)}). Please update the selling price.`);
        }, 100);
      }

      return updatedProduct;
    }));
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
      getNextVendorCode,
      updateProductCostPrice,
      calculateProfitMargin
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