"use client";

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  FileText,
  Search,
  Plus,
  Minus,
  Trash2,
  Printer,
  Download,
  Calendar,
  User,
  CheckCircle2,
  Clock,
  ArrowRightLeft,
  X,
  Package,
  ShoppingCart,
  Send,
  Eye,
  Edit,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { useAppContext, Product, Customer, CartItem, Quotation } from '@/context/AppContext';
import { usePersistedState } from '@/hooks/usePersistedState';
import { printQuotation80mm, downloadQuotationA4Pdf } from '@/utils/quotationPrintHelper';
import { formatDate, formatTime, toISODate } from '@/utils/formatters';
import { showSuccess, showError } from '@/utils/toast';
import { cn } from '@/lib/utils';
import { getAdaptedImageUrl, generatePlaceholderImage } from '@/utils/imageUtils';

export const Quotations: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    products,
    customers,
    settings,
    quotations,
    addQuotation,
    updateQuotation,
    deleteQuotation,
    openCarts,
    setOpenCarts,
    setActiveCartId,
  } = useAppContext();

  // Mode: 'builder' (POS style) or 'history' (Saved quotes list)
  const [activeTab, setActiveTab] = usePersistedState<'builder' | 'history'>('quotation_active_tab', 'builder');

  // --- Builder State (POS Style) ---
  const [quoteItems, setQuoteItems] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customCustomerName, setCustomCustomerName] = useState<string>('');
  const [customCustomerPhone, setCustomCustomerPhone] = useState<string>('');
  const [validityDays, setValidityDays] = useState<number>(7);
  const [notes, setNotes] = useState<string>('Prices valid for the duration specified. Subject to stock availability.');
  const [editingQuoteId, setEditingQuoteId] = useState<string | null>(null);

  // Search & Categories on right side
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // --- History Filter State ---
  const [historySearch, setHistorySearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'converted' | 'expired'>('all');
  const [selectedQuoteForPreview, setSelectedQuoteForPreview] = useState<Quotation | null>(null);

  // Categories extraction
  const availableCategories = useMemo(() => {
    const cats = new Set<string>(['ALL', 'DRINKS', 'FOOD', 'HARDWARE', 'COSMETICS', 'OTHER']);
    products.forEach((p) => {
      if (p.category && p.category.trim()) cats.add(p.category.trim().toUpperCase());
    });
    return Array.from(cats);
  }, [products]);

  // Filter products for catalog
  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return products.filter((p) => {
      const matchesCategory = selectedCategory === 'ALL' || p.category?.toUpperCase() === selectedCategory;
      if (!matchesCategory) return false;
      if (!q) return true;

      const matchNameDv = p.name_dv?.toLowerCase().includes(q);
      const matchNameEn = p.name_en?.toLowerCase().includes(q);
      const matchBarcode = p.barcode?.toLowerCase().includes(q);
      const matchCode = p.item_code?.toLowerCase().includes(q);
      const matchExtra = p.extra_barcodes?.some((b) => b.toLowerCase().includes(q));

      return matchNameDv || matchNameEn || matchBarcode || matchCode || matchExtra;
    });
  }, [products, searchQuery, selectedCategory]);

  // Add product to Quotation Cart
  const handleAddToCart = (product: Product) => {
    setQuoteItems((prev) => {
      const existingIdx = prev.findIndex((item) => item.id === product.id);
      if (existingIdx >= 0) {
        return prev.map((item, idx) =>
          idx === existingIdx ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [
        ...prev,
        {
          id: product.id,
          name_dv: product.name_dv,
          name_en: product.name_en,
          price: product.price,
          qty: 1,
          cost_price: product.cost_price,
          is_zero_tax: product.is_zero_tax,
          barcode: product.barcode,
          item_code: product.item_code,
        },
      ];
    });
  };

  const handleUpdateQty = (itemId: string, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveItem(itemId);
      return;
    }
    setQuoteItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, qty: newQty } : item))
    );
  };

  const handleRemoveItem = (itemId: string) => {
    setQuoteItems((prev) => prev.filter((item) => item.id !== itemId));
  };

  const handleClearCart = () => {
    setQuoteItems([]);
    setSelectedCustomer(null);
    setCustomCustomerName('');
    setCustomCustomerPhone('');
    setEditingQuoteId(null);
  };

  // Barcode enter key support
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const exactMatch = products.find(
        (p) =>
          p.barcode?.toLowerCase() === q ||
          p.item_code?.toLowerCase() === q ||
          p.extra_barcodes?.some((b) => b.toLowerCase() === q)
      );
      if (exactMatch) {
        handleAddToCart(exactMatch);
        setSearchQuery('');
        return;
      }
      if (filteredProducts.length === 1) {
        handleAddToCart(filteredProducts[0]);
        setSearchQuery('');
      }
    }
  };

  // Calculations
  const { subtotal, gstAmount, grandTotal } = useMemo(() => {
    const taxRate = (settings.shop?.taxRate || 8) / 100;
    let sub = 0;
    let gst = 0;

    quoteItems.forEach((item) => {
      const lineTotal = Number(item.price || 0) * Number(item.qty || 0);
      if (item.is_zero_tax) {
        sub += lineTotal;
      } else {
        const itemSub = lineTotal / (1 + taxRate);
        sub += itemSub;
        gst += lineTotal - itemSub;
      }
    });

    return {
      subtotal: sub,
      gstAmount: gst,
      grandTotal: sub + gst,
    };
  }, [quoteItems, settings.shop?.taxRate]);

  // Generate Quotation Number: QT-YY-0001
  const generateQuotationNumber = () => {
    const yearShort = new Date().getFullYear().toString().slice(-2);
    const existingThisYear = quotations.filter((q) =>
      q.quotation_number?.startsWith(`QT-${yearShort}-`)
    );
    const nextSeq = existingThisYear.length + 1;
    return `QT-${yearShort}-${nextSeq.toString().padStart(4, '0')}`;
  };

  // Build Quotation Object
  const createQuotationObject = (): Quotation => {
    const now = new Date();
    const validUntilDate = new Date();
    validUntilDate.setDate(now.getDate() + (validityDays || 7));

    const finalCustomerName = selectedCustomer
      ? selectedCustomer.name_en || selectedCustomer.name_dv
      : customCustomerName.trim() || 'General Customer';

    return {
      id: editingQuoteId || `quote_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      quotation_number: editingQuoteId
        ? quotations.find((q) => q.id === editingQuoteId)?.quotation_number || generateQuotationNumber()
        : generateQuotationNumber(),
      date: new Date().toISOString(),
      valid_until: validUntilDate.toISOString(),
      customer: selectedCustomer,
      customer_name: finalCustomerName,
      customer_phone: selectedCustomer?.phone || customCustomerPhone.trim() || undefined,
      items: quoteItems,
      subtotal,
      tax_amount: gstAmount,
      grand_total: grandTotal,
      notes: notes.trim(),
      status: 'active',
      created_at: new Date().toISOString(),
    };
  };

  const handleSaveQuotation = async (andPrint = false, andPdf = false) => {
    if (quoteItems.length === 0) {
      showError('Please add at least one item to the quotation');
      return;
    }

    const quote = createQuotationObject();
    if (editingQuoteId) {
      await updateQuotation(quote);
      showSuccess(`Quotation ${quote.quotation_number} updated successfully!`);
    } else {
      await addQuotation(quote);
      showSuccess(`Quotation ${quote.quotation_number} created successfully!`);
    }

    if (andPrint) {
      printQuotation80mm(quote, settings);
    }
    if (andPdf) {
      downloadQuotationA4Pdf(quote, settings);
    }

    handleClearCart();
    setActiveTab('history');
  };

  // Edit an existing quotation
  const handleEditQuotation = (quote: Quotation) => {
    setQuoteItems(quote.items || []);
    setSelectedCustomer(quote.customer || null);
    setCustomCustomerName(quote.customer_name || '');
    setCustomCustomerPhone(quote.customer_phone || '');
    setNotes(quote.notes || '');
    setEditingQuoteId(quote.id);
    setActiveTab('builder');
    showSuccess(`Loaded ${quote.quotation_number} into builder`);
  };

  // Convert Quotation into active POS Sale
  const handleConvertToPosCart = (quote: Quotation) => {
    const cartId = `cart_quote_${Date.now()}`;
    const newCartMap = new Map(openCarts);

    newCartMap.set(cartId, {
      id: cartId,
      name: `Quote: ${quote.quotation_number}`,
      items: quote.items || [],
      selectedCustomer: quote.customer || null,
      customCustomerName: quote.customer_name,
    });

    setOpenCarts(newCartMap);
    setActiveCartId(cartId);

    // Mark quotation as converted
    updateQuotation({ ...quote, status: 'converted' });

    showSuccess(`Quotation converted to POS Cart! Opening checkout...`);
    navigate('/');
  };

  // Filtered History
  const filteredHistory = useMemo(() => {
    const q = historySearch.trim().toLowerCase();
    return quotations.filter((item) => {
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      if (!q) return true;

      const matchNum = item.quotation_number?.toLowerCase().includes(q);
      const matchCustomer =
        item.customer_name?.toLowerCase().includes(q) ||
        item.customer?.name_en?.toLowerCase().includes(q) ||
        item.customer?.name_dv?.toLowerCase().includes(q) ||
        item.customer_phone?.includes(q);

      return matchNum || matchCustomer;
    });
  }, [quotations, historySearch, statusFilter]);

  const activeCount = quotations.filter((q) => q.status === 'active').length;

  return (
    <div className="p-4 sm:p-6 font-faruma flex flex-col h-full bg-background text-foreground overflow-hidden" dir="rtl">
      {/* Unified Top Header Bar */}
      <div className="shrink-0 mb-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-4 apple-glass-card border border-white/20 dark:border-white/10 rounded-3xl p-4 sm:px-6 shadow-sm">
          {/* Title & Subtitle */}
          <div className="flex items-center gap-3.5 text-right">
            {settings?.shop?.logo ? (
              <div className="w-12 h-12 rounded-2xl bg-white border border-border flex items-center justify-center p-1.5 shrink-0 shadow-xs overflow-hidden">
                <img src={settings.shop.logo} alt="Shop Logo" className="w-full h-full object-contain" />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary shrink-0 shadow-xs">
                <FileText className="h-6 w-6" />
              </div>
            )}
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-foreground leading-tight">
                އަންދާސީ ހިސާބު (Quotations)
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5" dir="ltr">
                Create, print &amp; manage price quotations and proforma estimates
              </p>
            </div>
          </div>

          {/* Tab Switcher & Quick Summary Card */}
          <div className="flex flex-wrap items-center gap-2.5 mr-auto sm:mr-0" dir="ltr">
            {/* Active Quotes Metric */}
            <div className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-primary/10 border border-primary/20">
              <div className="w-8 h-8 rounded-xl bg-primary/20 text-primary flex items-center justify-center shrink-0 font-black text-xs font-mono">
                {activeCount}
              </div>
              <div className="text-left">
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider block">
                  Active Quotes
                </span>
                <span className="text-xs font-black font-mono text-foreground">
                  {quotations.length} Total Saved
                </span>
              </div>
            </div>

            {/* View Mode Toggle Switcher */}
            <div className="bg-muted p-1 rounded-xl border border-border flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveTab('builder')}
                className={cn(
                  'h-8 px-3.5 rounded-lg text-xs font-black transition-all gap-1.5',
                  activeTab === 'builder'
                    ? 'bg-primary text-white shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Plus className="h-3.5 w-3.5" />
                <span>POS Builder</span>
                {quoteItems.length > 0 && (
                  <Badge className="bg-white/25 text-white border-none text-[9px] px-1 py-0 rounded-full font-mono font-bold">
                    {quoteItems.length}
                  </Badge>
                )}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveTab('history')}
                className={cn(
                  'h-8 px-3.5 rounded-lg text-xs font-black transition-all gap-1.5',
                  activeTab === 'history'
                    ? 'bg-primary text-white shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Clock className="h-3.5 w-3.5" />
                <span>Saved Quotes ({quotations.length})</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === 'builder' ? (
        /* POS-LIKE BUILDER VIEW */
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 overflow-hidden min-h-0" dir="rtl">
          {/* LEFT PANEL: Quotation Cart & Details (4 cols on lg) */}
          <div className="lg:col-span-5 flex flex-col apple-glass-card border border-white/20 dark:border-white/10 rounded-3xl p-4 sm:p-5 overflow-hidden shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <ShoppingCart className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-foreground">
                    {editingQuoteId ? 'Edit Quotation' : 'New Quotation Cart'}
                  </h3>
                  <span className="text-[10px] text-muted-foreground">
                    {quoteItems.reduce((sum, i) => sum + i.qty, 0)} items selected
                  </span>
                </div>
              </div>

              {quoteItems.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearCart}
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive gap-1"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Clear
                </Button>
              )}
            </div>

            {/* Customer & Validity Settings (NO TIN NEEDED) */}
            <div className="space-y-2.5 py-3 border-b border-border/60">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-1">
                  <User className="h-3 w-3 text-primary" /> Select Customer (Optional):
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Select
                    value={selectedCustomer?.id || 'none'}
                    onValueChange={(val) => {
                      if (val === 'none') {
                        setSelectedCustomer(null);
                      } else {
                        const found = customers.find((c) => c.id === val);
                        setSelectedCustomer(found || null);
                        if (found) {
                          setCustomCustomerName(found.name_en || found.name_dv);
                          setCustomCustomerPhone(found.phone || '');
                        }
                      }
                    }}
                  >
                    <SelectTrigger className="h-9 rounded-xl apple-glass-input text-xs font-bold border-border">
                      <SelectValue placeholder="Existing Customer..." />
                    </SelectTrigger>
                    <SelectContent className="apple-glass-dialog z-[150] max-h-56">
                      <SelectItem value="none">Walk-in / Custom Name</SelectItem>
                      {customers.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.code ? `[${c.code}] ` : ''}{c.name_en || c.name_dv}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Input
                    placeholder="Customer Name..."
                    value={customCustomerName}
                    onChange={(e) => setCustomCustomerName(e.target.value)}
                    className="h-9 rounded-xl apple-glass-input text-xs font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-black uppercase text-muted-foreground block mb-0.5">
                    Phone (Optional):
                  </label>
                  <Input
                    placeholder="7700000"
                    value={customCustomerPhone}
                    onChange={(e) => setCustomCustomerPhone(e.target.value)}
                    className="h-8 rounded-xl apple-glass-input text-xs font-mono font-bold"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-muted-foreground block mb-0.5">
                    Valid For:
                  </label>
                  <Select
                    value={validityDays.toString()}
                    onValueChange={(val) => setValidityDays(Number(val) || 7)}
                  >
                    <SelectTrigger className="h-8 rounded-xl apple-glass-input text-xs font-bold border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="apple-glass-dialog z-[150]">
                      <SelectItem value="3">3 Days</SelectItem>
                      <SelectItem value="7">7 Days (Standard)</SelectItem>
                      <SelectItem value="14">14 Days (2 Weeks)</SelectItem>
                      <SelectItem value="30">30 Days (1 Month)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Cart Items List */}
            <ScrollArea className="flex-1 my-2 -mx-2 px-2 custom-scrollbar">
              {quoteItems.length === 0 ? (
                <div className="h-44 flex flex-col items-center justify-center text-muted-foreground/40 border-2 border-dashed border-border/60 rounded-2xl m-2">
                  <Package className="h-8 w-8 mb-1.5 opacity-30" />
                  <p className="text-xs font-bold">No products in quotation yet</p>
                  <p className="text-[10px]">Click or scan items from the right catalog</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {quoteItems.map((item) => (
                    <div
                      key={item.id}
                      className="p-2.5 rounded-2xl bg-muted/40 border border-border/60 flex items-center justify-between gap-2 transition-all hover:bg-muted/60"
                    >
                      <div className="flex-1 min-w-0 text-left" dir="ltr">
                        <p className="text-xs font-black text-foreground truncate">
                          {item.name_en || item.name_dv || 'Item'}
                        </p>
                        <p className="text-[10px] text-muted-foreground font-mono">
                          {settings.shop.currency} {Number(item.price).toFixed(2)} each
                        </p>
                      </div>

                      {/* Qty Stepper */}
                      <div className="flex items-center gap-1.5 bg-background border border-border rounded-xl px-1.5 py-0.5 shrink-0" dir="ltr">
                        <button
                          onClick={() => handleUpdateQty(item.id, item.qty - 1)}
                          className="h-6 w-6 rounded-lg flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-6 text-center font-mono font-black text-xs">
                          {item.qty}
                        </span>
                        <button
                          onClick={() => handleUpdateQty(item.id, item.qty + 1)}
                          className="h-6 w-6 rounded-lg flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>

                      {/* Line Total */}
                      <div className="text-left font-mono font-black text-xs min-w-[65px]" dir="ltr">
                        {settings.shop.currency} {(Number(item.price) * item.qty).toFixed(2)}
                      </div>

                      {/* Delete */}
                      <button
                        onClick={() => handleRemoveItem(item.id)}
                        className="text-muted-foreground hover:text-destructive p-1"
                        title="Remove"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            {/* Financial Summary & Actions */}
            <div className="pt-3 border-t border-border/60 space-y-2.5">
              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal:</span>
                  <span className="font-mono font-bold" dir="ltr">
                    {settings.shop.currency} {subtotal.toFixed(2)}
                  </span>
                </div>
                {gstAmount > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>GST ({settings.shop.taxRate}%):</span>
                    <span className="font-mono font-bold" dir="ltr">
                      {settings.shop.currency} {gstAmount.toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-base font-black text-foreground pt-1 border-t border-border">
                  <span>Grand Total:</span>
                  <span className="font-mono text-primary text-lg" dir="ltr">
                    {settings.shop.currency} {grandTotal.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-1" dir="ltr">
                <Button
                  onClick={() => handleSaveQuotation(true, false)}
                  disabled={quoteItems.length === 0}
                  className="h-10 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs gap-1.5 shadow-sm"
                >
                  <Printer className="h-4 w-4" />
                  <span>Save &amp; Print</span>
                </Button>

                <Button
                  onClick={() => handleSaveQuotation(false, true)}
                  disabled={quoteItems.length === 0}
                  className="h-10 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs gap-1.5 shadow-sm"
                >
                  <Download className="h-4 w-4" />
                  <span>Save &amp; PDF</span>
                </Button>
              </div>

              <Button
                onClick={() => handleSaveQuotation(false, false)}
                disabled={quoteItems.length === 0}
                variant="outline"
                className="w-full h-9 rounded-xl font-black text-xs border-border gap-1.5"
              >
                <FileText className="h-3.5 w-3.5 text-primary" />
                <span>Save Quotation Only</span>
              </Button>
            </div>
          </div>

          {/* RIGHT PANEL: Product Catalog (7 cols on lg, POS Style) */}
          <div className="lg:col-span-7 flex flex-col apple-glass-card border border-white/20 dark:border-white/10 rounded-3xl p-4 sm:p-5 overflow-hidden shadow-sm">
            {/* Search & Category Bar */}
            <div className="space-y-2.5 pb-3 border-b border-border/60">
              <div className="relative" dir="ltr">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 pointer-events-none" />
                <Input
                  ref={searchInputRef}
                  dir="ltr"
                  placeholder="Scan barcode or search product name / code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  className="w-full apple-glass-input rounded-2xl pl-10 pr-9 h-11 text-left font-bold text-xs sm:text-sm"
                  autoFocus
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Categories horizontal strip */}
              <ScrollArea className="w-full whitespace-nowrap" dir="ltr">
                <div className="flex items-center gap-1.5 pb-1">
                  {availableCategories.map((cat) => (
                    <Button
                      key={cat}
                      variant={selectedCategory === cat ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedCategory(cat)}
                      className={cn(
                        'h-8 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shrink-0',
                        selectedCategory === cat
                          ? 'bg-primary text-white shadow-xs'
                          : 'border-border bg-card text-muted-foreground hover:text-foreground'
                      )}
                    >
                      {cat}
                    </Button>
                  ))}
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </div>

            {/* Products Grid */}
            <ScrollArea className="flex-1 my-2 -mx-2 px-2 custom-scrollbar">
              {filteredProducts.length === 0 ? (
                <div className="h-60 flex flex-col items-center justify-center text-muted-foreground/40">
                  <Package className="h-10 w-10 mb-2 opacity-30" />
                  <p className="text-sm font-bold">No products found</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5 pb-4">
                  {filteredProducts.slice(0, 48).map((product) => {
                    const inCartQty = quoteItems.find((i) => i.id === product.id)?.qty || 0;
                    return (
                      <div
                        key={product.id}
                        onClick={() => handleAddToCart(product)}
                        className={cn(
                          'p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between text-right group select-none shadow-xs active:scale-[0.98]',
                          inCartQty > 0
                            ? 'bg-primary/10 border-primary/50 shadow-primary/10'
                            : 'bg-card border-border hover:border-primary/40 hover:bg-muted/40'
                        )}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-muted-foreground/70 font-mono">
                              {product.item_code || product.barcode?.slice(-6)}
                            </span>
                            {inCartQty > 0 && (
                              <Badge className="bg-primary text-white font-mono font-black text-[10px] px-1.5 py-0">
                                {inCartQty}x
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs font-black text-foreground line-clamp-2 leading-tight text-left" dir="ltr">
                            {product.name_en || product.name_dv || 'Unnamed Product'}
                          </p>
                        </div>

                        <div className="mt-3 pt-2 border-t border-border/50 flex items-center justify-between">
                          <span className="text-[9px] text-muted-foreground font-bold">
                            Stock: {product.stock_shop}
                          </span>
                          <span className="text-xs font-black text-primary font-mono" dir="ltr">
                            {settings.shop.currency} {Number(product.price).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      ) : (
        /* SAVED QUOTATIONS VIEW */
        <div className="flex-1 flex flex-col apple-glass-card border border-white/20 dark:border-white/10 rounded-3xl p-4 sm:p-6 overflow-hidden shadow-sm">
          {/* History Search & Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-border/60" dir="ltr">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 pointer-events-none" />
              <Input
                placeholder="Search quotation #, customer name or phone..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                className="w-full apple-glass-input rounded-xl pl-10 pr-9 h-10 text-left font-bold text-xs"
              />
              {historySearch && (
                <button
                  onClick={() => setHistorySearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={(val: 'all' | 'active' | 'converted' | 'expired') => setStatusFilter(val)}>
                <SelectTrigger className="w-[140px] h-10 rounded-xl apple-glass-input border-border font-bold text-xs">
                  <SelectValue placeholder="Status Filter" />
                </SelectTrigger>
                <SelectContent className="apple-glass-dialog z-[150]">
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active Only</SelectItem>
                  <SelectItem value="converted">Converted to Sale</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>

              <Button
                onClick={() => {
                  handleClearCart();
                  setActiveTab('builder');
                }}
                className="h-10 px-4 rounded-xl bg-primary hover:bg-primary/90 text-white font-black text-xs gap-1.5"
              >
                <Plus className="h-4 w-4" />
                <span>New Quote</span>
              </Button>
            </div>
          </div>

          {/* Quotations List */}
          <ScrollArea className="flex-1 custom-scrollbar my-3">
            {filteredHistory.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-muted-foreground/40">
                <FileText className="h-10 w-10 mb-2 opacity-30" />
                <p className="text-sm font-bold">No quotations found</p>
                <p className="text-xs">Create your first quotation from the POS Builder tab</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5 pb-4">
                {filteredHistory.map((quote) => {
                  const isExpired = new Date(quote.valid_until) < new Date();
                  return (
                    <Card
                      key={quote.id}
                      className="apple-glass-card border border-white/20 dark:border-white/10 rounded-2xl p-4 text-right shadow-xs hover:border-primary/40 transition-all flex flex-col justify-between"
                    >
                      <div>
                        {/* Top info row */}
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-mono font-black text-primary text-sm" dir="ltr">
                            {quote.quotation_number}
                          </span>
                          <Badge
                            className={cn(
                              'text-[10px] font-black uppercase px-2 py-0.5 rounded-full',
                              quote.status === 'converted'
                                ? 'bg-blue-500/15 text-blue-500 border border-blue-500/30'
                                : isExpired
                                ? 'bg-zinc-500/20 text-zinc-400 border border-zinc-500/30'
                                : 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                            )}
                          >
                            {quote.status === 'converted'
                              ? 'Converted to Sale'
                              : isExpired
                              ? 'Expired'
                              : 'Active'}
                          </Badge>
                        </div>

                        {/* Customer & dates */}
                        <p className="text-sm font-black text-foreground truncate mb-1">
                          {quote.customer_name || 'Walk-in Customer'}
                        </p>
                        <div className="text-[11px] text-muted-foreground space-y-0.5 mb-3">
                          <div className="flex justify-between" dir="ltr">
                            <span className="text-muted-foreground/70">Date:</span>
                            <span>{formatDate(quote.date)}</span>
                          </div>
                          <div className="flex justify-between" dir="ltr">
                            <span className="text-muted-foreground/70">Valid Until:</span>
                            <span className={cn(isExpired && 'text-red-400 font-bold')}>
                              {formatDate(quote.valid_until)}
                            </span>
                          </div>
                          <div className="flex justify-between" dir="ltr">
                            <span className="text-muted-foreground/70">Items:</span>
                            <span>{quote.items?.length || 0} product(s)</span>
                          </div>
                        </div>

                        {/* Amount */}
                        <div className="p-2.5 rounded-xl bg-muted/50 border border-border/60 flex items-center justify-between mb-3">
                          <span className="text-xs font-bold text-muted-foreground">Total:</span>
                          <span className="text-base font-black text-primary font-mono" dir="ltr">
                            {settings.shop.currency} {quote.grand_total.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {/* Card Actions Toolbar */}
                      <div className="flex items-center gap-1.5 pt-2 border-t border-border/50" dir="ltr">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => printQuotation80mm(quote, settings)}
                          className="h-8 px-2.5 rounded-xl text-xs font-bold gap-1"
                          title="Print 80mm Slip"
                        >
                          <Printer className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Slip</span>
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => downloadQuotationA4Pdf(quote, settings)}
                          className="h-8 px-2.5 rounded-xl text-xs font-bold gap-1"
                          title="Download A4 PDF"
                        >
                          <Download className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">PDF</span>
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditQuotation(quote)}
                          className="h-8 px-2.5 rounded-xl text-xs font-bold gap-1"
                          title="Edit Quote"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>

                        {/* Convert to Sale Button */}
                        <Button
                          size="sm"
                          onClick={() => handleConvertToPosCart(quote)}
                          className="h-8 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs gap-1 ml-auto"
                          title="Convert this quote into an active POS cart for checkout"
                        >
                          <ArrowRightLeft className="h-3.5 w-3.5" />
                          <span>Convert to Sale</span>
                        </Button>

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            if (window.confirm(`Delete quotation ${quote.quotation_number}?`)) {
                              deleteQuotation(quote.id);
                              showSuccess('Quotation deleted');
                            }
                          }}
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive rounded-xl"
                          title="Delete Quote"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>
      )}
    </div>
  );
};

export default Quotations;

