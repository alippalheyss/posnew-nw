"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ShoppingCart, PlusCircle, Minus, Trash2, Search, UserPlus, ArrowRightLeft, CreditCard, Receipt, Users, AlertTriangle, User, DollarSign, XCircle, Heart, ArrowLeft, Plus } from 'lucide-react';
import { formatDate, toISODate } from '@/utils/formatters';
import { formatDate, toISODate, formatTime } from '@/utils/formatters';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useAppContext, Product, Customer, CartItem, Sale } from '@/context/AppContext';
import { showSuccess, showError } from '@/utils/toast';
import LoyaltyRedemptionDialog from '@/components/LoyaltyRedemptionDialog';
import UnitSelectionDialog from '@/components/UnitSelectionDialog';
import CustomerAddDialog from '@/components/CustomerAddDialog';
import { Badge } from '@/components/ui/badge';
import { Progress } from "@/components/ui/progress";
import { printContent } from '@/utils/printHelper';

interface Cart {
  id: string;
  displayNumber: number;
  customer: Customer | null;
  items: CartItem[];
}

const POS = () => {
  const { t } = useTranslation();
  const {
    products,
    customers,
    sales,
    setSales,
    favoriteProductIds,
    getTopProducts,
    settings,
    openCarts,
    setOpenCarts,
    activeCartId,
    setActiveCartId,
    awardLoyaltyPoints,
    redeemLoyaltyPoints,
    updateCustomerBalance,
    addSale,
    addCustomer,
    addPendingTransfer,
    pendingTransfers,
    resolvePendingTransfer,
    refreshCustomers
  } = useAppContext();

  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState<boolean>(false);

  const cartCounter = useRef(openCarts.size);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCashDialogOpen, setIsCashDialogOpen] = useState(false);
  const [isCreditDialogOpen, setIsCreditDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paidAmount, setPaidAmount] = useState<number | ''>(0);
  const [isConfirmRemoveCartDialogOpen, setIsConfirmRemoveCartDialogOpen] = useState(false);
  const [cartToRemoveId, setCartToRemoveId] = useState<string | null>(null);
  const [isPrintConfirmDialogOpen, setIsPrintConfirmDialogOpen] = useState(false);
  const [lastSaleForPrint, setLastSaleForPrint] = useState<Sale | null>(null);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [isAddCustomerDialogOpen, setIsAddCustomerDialogOpen] = useState(false);
  const [isPendingTransfersDialogOpen, setIsPendingTransfersDialogOpen] = useState(false);
  const [isSplitDialogOpen, setIsSplitDialogOpen] = useState(false);
  const [isAwaitingTransferDialogOpen, setIsAwaitingTransferDialogOpen] = useState(false);
  const [transferAmount, setTransferAmount] = useState<number | ''>(0);

  const handleFocus = (event: React.FocusEvent<HTMLInputElement>) => {
    event.target.select();
  };

  const [pointsToRedeem, setPointsToRedeem] = useState<number>(0);
  const [isLoyaltyRedemptionDialogOpen, setIsLoyaltyRedemptionDialogOpen] = useState(false);
  const [creditDialogStep, setCreditDialogStep] = useState<1 | 2>(1);
  const [isExpiryDialogOpen, setIsExpiryDialogOpen] = useState(false);
  const [expiryDiscountPercent, setExpiryDiscountPercent] = useState<number>(10);
  const [selectedProductForExpiry, setSelectedProductForExpiry] = useState<Product | null>(null);
  const [isUnitSelectionDialogOpen, setIsUnitSelectionDialogOpen] = useState(false);
  const [productForUnitSelection, setProductForUnitSelection] = useState<Product | null>(null);

  const [splitStep, setSplitStep] = useState<1 | 2>(1);
  const [selectedSplitCustomerIds, setSelectedSplitCustomerIds] = useState<string[]>([]);
  const [splitSearchTerm, setSplitSearchTerm] = useState('');
  const [splitEntries, setSplitEntries] = useState<Array<{ id: string, amount: number, method: 'Cash' | 'Card' | 'Transfer' | 'Credit', customerId?: string }>>([]);

  const searchInputRef = useRef<HTMLInputElement>(null);

  const LOW_STOCK_THRESHOLD = 10;
  const NEAR_EXPIRY_DAYS = 30;

  useEffect(() => {
    searchInputRef.current?.focus();
  }, [activeCartId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' && document.activeElement !== searchInputRef.current) {
        if (e.key === 'Escape') {
          (document.activeElement as HTMLElement).blur();
        }
        return;
      }

      if (e.key === 'Enter' && !isCashDialogOpen && !isCreditDialogOpen && !isSplitDialogOpen && !isAwaitingTransferDialogOpen) {
        e.preventDefault();
        setIsCashDialogOpen(true);
      } else if (e.key === 'F11') {
        e.preventDefault();
        setCreditDialogStep(1);
        setIsCreditDialogOpen(true);
      } else if (e.key === 'F4') {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === 'F6') {
        e.preventDefault();
        setIsSplitDialogOpen(true);
      } else if (e.key === 'Escape') {
        setIsCashDialogOpen(false);
        setIsCreditDialogOpen(false);
        setIsSplitDialogOpen(false);
        setIsAwaitingTransferDialogOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (searchTerm.trim()) {
      const exactMatch = products.find(p =>
        p.barcode === searchTerm.trim() ||
        p.item_code.toLowerCase() === searchTerm.toLowerCase().trim()
      );
      if (exactMatch) {
        handleProductSelection(exactMatch);
        setSearchTerm('');
        showSuccess(t('product_added_via_barcode', { name: exactMatch.name_dv }));
      }
    }
  }, [searchTerm, products]);

  const clearActiveCart = () => {
    setOpenCarts(prev => {
      const newMap = new Map(prev);
      const active = newMap.get(activeCartId);
      if (active) {
        newMap.set(activeCartId, {
          ...active,
          items: [],
          customer: null
        });
      }
      return newMap;
    });
    setPointsToRedeem(0);
  };

  const activeCart = openCarts.get(activeCartId);

  useEffect(() => {
    if (!activeCartId && openCarts.size > 0) {
      setActiveCartId([...openCarts.keys()][0]);
    } else if (openCarts.size === 0) {
      createNewCart();
    }
  }, [activeCartId, openCarts.size]);

  useEffect(() => {
    if (activeCart) {
      localStorage.setItem('customer_display_sync', JSON.stringify({
        cart: activeCart,
        timestamp: Date.now()
      }));
    }
  }, [activeCart]);

  const createNewCart = () => {
    const newCartId = `cart-${Date.now()}`;
    const nextNum = openCarts.size + 1;
    setOpenCarts(prev => new Map(prev).set(newCartId, { id: newCartId, displayNumber: nextNum, customer: null, items: [] }));
    setActiveCartId(newCartId);
  };

  const switchCart = (cartId: string) => {
    setActiveCartId(cartId);
  };

  const handleRemoveCartClick = (cartId: string) => {
    const cart = openCarts.get(cartId);
    if (cart && cart.items.length > 0) {
      setCartToRemoveId(cartId);
      setIsConfirmRemoveCartDialogOpen(true);
    } else {
      setOpenCarts(prev => {
        const newCarts = new Map(prev);
        newCarts.delete(cartId);
        if (newCarts.size === 0) {
          const firstId = `cart-${Date.now()}`;
          newCarts.set(firstId, { id: firstId, displayNumber: 1, customer: null, items: [] });
          setActiveCartId(firstId);
        } else if (activeCartId === cartId) {
          setActiveCartId([...newCarts.keys()][0]);
        }
        return newCarts;
      });
    }
  };

  const confirmRemoveCart = () => {
    if (cartToRemoveId) {
      setOpenCarts(prev => {
        const newCarts = new Map(prev);
        newCarts.delete(cartToRemoveId);
        if (newCarts.size === 0) {
          createNewCart();
        } else if (activeCartId === cartToRemoveId) {
          setActiveCartId([...newCarts.keys()][0]);
        }
        return newCarts;
      });
      setIsConfirmRemoveCartDialogOpen(false);
      setCartToRemoveId(null);
    }
  };

  const updateActiveCart = (updater: (prevCart: Cart) => Cart) => {
    if (activeCart) {
      setOpenCarts(prev => {
        const newCarts = new Map(prev);
        newCarts.set(activeCartId, updater(activeCart));
        return newCarts;
      });
    }
  };

  const handleProductSelection = (product: Product) => {
    if (product.expiry_date) {
      const expiry = new Date(product.expiry_date);
      const today = new Date();
      const diffTime = expiry.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays <= NEAR_EXPIRY_DAYS) {
        setSelectedProductForExpiry(product);
        setIsExpiryDialogOpen(true);
        return;
      }
    }

    if (product.units && product.units.length > 0) {
      setProductForUnitSelection(product);
      setIsUnitSelectionDialogOpen(true);
    } else {
      addToCart(product);
    }
  };

  const addToCart = (product: Product, discountFactor: number = 1, selectedUnit?: string) => {
    const unitName = selectedUnit || 'Piece';
    let price = product.price * discountFactor;
    let conversion = 1;

    if (selectedUnit && selectedUnit !== 'Piece') {
      const unit = product.units?.find(u => u.name === selectedUnit);
      if (unit) {
        price = unit.price * discountFactor;
        conversion = unit.conversion_factor;
      }
    }

    updateActiveCart(prevCart => {
      const existingItem = prevCart.items.find((item) => item.id === product.id && (item.selected_unit === unitName));
      if (existingItem) {
        return {
          ...prevCart,
          items: prevCart.items.map((item) =>
            item.id === product.id && (item.selected_unit === unitName) ? { ...item, qty: item.qty + 1 } : item
          ),
        };
      } else {
        return {
          ...prevCart,
          items: [
            ...prevCart.items,
            {
              ...product,
              qty: 1,
              price: price,
              selected_unit: unitName,
              unit_price: price,
              unit_conversion: conversion
            }
          ]
        };
      }
    });
  };

  const handleUnitSelection = (unit: string) => {
    if (productForUnitSelection) {
      addToCart(productForUnitSelection, 1, unit);
      setIsUnitSelectionDialogOpen(false);
      setProductForUnitSelection(null);
    }
  };

  const confirmExpiryDiscount = () => {
    if (selectedProductForExpiry) {
      const discountFactor = (100 - expiryDiscountPercent) / 100;
      addToCart(selectedProductForExpiry, discountFactor);
      setIsExpiryDialogOpen(false);
      setSelectedProductForExpiry(null);
      showSuccess(t('expiry_discount_applied'));
    }
  };

  const updateCartItemQty = (id: string, delta: number) => {
    updateActiveCart(prevCart => ({
      ...prevCart,
      items: prevCart.items.map((item) =>
        item.id === id ? { ...item, qty: Math.max(0, item.qty + delta) } : item
      ).filter(item => item.qty > 0),
    }));
  };

  const setCartItemQty = (id: string, qty: number) => {
    updateActiveCart(prevCart => ({
      ...prevCart,
      items: prevCart.items.map((item) =>
        item.id === id ? { ...item, qty: Math.max(0, qty) } : item
      ).filter(item => item.qty > 0),
    }));
  };

  const removeFromCart = (id: string) => {
    updateActiveCart(prevCart => ({
      ...prevCart,
      items: prevCart.items.filter(item => item.id !== id),
    }));
  };

  const calculateTotals = () => {
    const currentItems = activeCart?.items || [];
    const taxableTotal = currentItems.filter(i => !i.is_zero_tax).reduce((sum, item) => sum + item.price * item.qty, 0);
    const zeroTaxTotal = currentItems.filter(i => i.is_zero_tax).reduce((sum, item) => sum + item.price * item.qty, 0);
    const subtotalNoDiscount = taxableTotal + zeroTaxTotal;

    const loyaltyPointsValue = settings.general.loyaltyPointsValue || 100;
    const loyaltyDiscount = pointsToRedeem / loyaltyPointsValue;
    const grandTotalValue = Math.max(0, subtotalNoDiscount - loyaltyDiscount);

    const gstRate = settings.shop.taxRate / 100;
    const taxableRatio = subtotalNoDiscount > 0 ? taxableTotal / subtotalNoDiscount : 0;
    const taxablePartAfterDiscount = grandTotalValue * taxableRatio;

    const subtotalExcludingGstForTaxable = taxablePartAfterDiscount / (1 + gstRate);
    const gstAmount = taxablePartAfterDiscount - subtotalExcludingGstForTaxable;
    const subtotalValue = grandTotalValue - gstAmount;

    return { subtotal: subtotalValue, gstAmount, grandTotal: grandTotalValue, subtotalNoDiscount, loyaltyDiscount };
  };

  const { subtotal, gstAmount, grandTotal, subtotalNoDiscount, loyaltyDiscount } = calculateTotals();
  const balance = typeof paidAmount === 'number' ? paidAmount - grandTotal : -grandTotal;

  const displayProducts = products.filter(product => {
    const matchesSearch = !searchTerm ||
      product.name_dv.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.name_en.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.barcode.includes(searchTerm) ||
      product.item_code.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = selectedCategory === 'ALL' || product.category === selectedCategory;
    const matchesFavorite = !showFavoritesOnly || favoriteProductIds.includes(product.id);

    return matchesSearch && matchesCategory && matchesFavorite;
  }).slice(0, 50);

  const processCashPayment = async () => {
    if (!activeCart || activeCart.items.length === 0) {
      showError(t('cart_empty_error'));
      return;
    }

    // Auto-fill paid amount if empty or 0
    let finalPaidAmount = paidAmount;
    if (!finalPaidAmount || finalPaidAmount === 0 || finalPaidAmount === '') {
      finalPaidAmount = grandTotal;
      setPaidAmount(grandTotal);
    }

    if (finalPaidAmount < grandTotal) {
      showError(t('insufficient_payment_error'));
      return;
    }

    const newSale = {
      id: crypto.randomUUID(),
      date: toISODate(),
      customer: activeCart.customer,
      items: activeCart.items,
      grandTotal: grandTotal,
      paymentMethod: 'cash' as const,
      paidAmount: finalPaidAmount,
      balance: balance,
    };
    try {
      await addSale(newSale);

      if (activeCart.customer) {
        if (settings.general.enableLoyaltyProgram) {
          if (pointsToRedeem > 0) {
            await redeemLoyaltyPoints(activeCart.customer.id, pointsToRedeem);
          }
          const loyaltyAmountPerPoint = settings.general.loyaltyAmountPerPoint || 20;
          const pointsEarned = Math.floor(grandTotal / loyaltyAmountPerPoint);
          if (pointsEarned > 0) {
            await awardLoyaltyPoints(activeCart.customer.id, pointsEarned);
          }
        }
      }

      showSuccess(t('cash_payment_successful'));
      if (settings.printing.printMode === 'auto') {
        handlePrintReceipt(newSale);
      }
      clearActiveCart();
      setPaidAmount(0);
      setIsCashDialogOpen(false);
    } catch (error) {
      console.error('Error processing cash payment:', error);
      showError('Failed to save sale');
    }
  };

  const processCreditPayment = async () => {
    if (!activeCart || activeCart.items.length === 0) {
      showError(t('cart_empty_error'));
      return;
    }
    if (!activeCart?.customer) {
      showError(t('select_customer_for_credit_error'));
      return;
    }
    if (activeCart.customer.credit_limit < grandTotal) {
      showError(t('credit_limit_exceeded_error', { customerName: activeCart.customer.name_dv }));
      return;
    }

    const newSale = {
      id: crypto.randomUUID(),
      date: toISODate(),
      customer: activeCart.customer!,
      items: activeCart.items,
      grandTotal: grandTotal,
      paymentMethod: 'credit' as const,
      balance: grandTotal,
      paidAmount: 0
    };
    setIsProcessing(true);
    try {
      await addSale(newSale);

      if (activeCart.customer) {
        await updateCustomerBalance(activeCart.customer.id, grandTotal);
        if (settings.general.enableLoyaltyProgram) {
          if (pointsToRedeem > 0) {
            await redeemLoyaltyPoints(activeCart.customer.id, pointsToRedeem);
          }
          // Note: Loyalty points are NOT awarded on credit sales. They are awarded upon settlement.
        }
      }

      showSuccess(t('credit_sale_successful'));
      if (settings.printing.printMode === 'auto') {
        handlePrintReceipt(newSale);
      }
      clearActiveCart();
      setIsCreditDialogOpen(false);
    } catch (error: any) {
      console.error('Error processing credit payment:', error);
      showError(`Failed to save credit sale: ${error.message || 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const processTransferPayment = () => {
    if (!activeCart || activeCart.items.length === 0) return;

    addPendingTransfer({
      date: toISODate(),
      customer: activeCart.customer,
      tempCustomerName: !activeCart.customer ? customerSearchTerm : null,
      items: activeCart.items,
      grandTotal: grandTotal,
      paymentMethod: 'transfer',
      status: 'pending'
    });

    showSuccess(t('transfer_recorded_as_pending'));
    setIsAwaitingTransferDialogOpen(false);
    clearActiveCart();
    setCustomerSearchTerm('');
  };

  const handlePrintReceipt = (sale: Sale | any) => {
    const currency = settings.shop.currency;
    const itemsHtml = sale.items.map((item: any) => `
      <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px;">
        <div style="flex: 1; text-align: left;">
          ${item.name_dv}<br/><small>${item.name_en}</small>
        </div>
        <div style="width: 60px; text-align: right;">${item.qty} x ${item.price.toFixed(2)}</div>
        <div style="width: 70px; text-align: right;">${(item.qty * item.price).toFixed(2)}</div>
      </div>
    `).join('');

    const gstRate = settings.shop.taxRate;
    const subtotalPrint = sale.grandTotal / (1 + (gstRate / 100));
    const gstAmountPrint = sale.grandTotal - subtotalPrint;

    const logoHtml = settings.shop.logo ? `
      <div style="margin-bottom: 10px;">
        <img src="${settings.shop.logo}" style="max-height: 60px; object-fit: contain;" />
      </div>
    ` : '';

    const htmlContent = `
      <html>
        <head>
          <title>Receipt ${sale.id}</title>
          <style>
            @media print {
              @page { margin: 0; size: ${settings.printing.thermalPrinterWidth === '58mm' ? '58mm' : '80mm'} auto; }
              body { margin: 0; padding: 10px; font-family: sans-serif; width: ${settings.printing.thermalPrinterWidth === '58mm' ? '58mm' : '80mm'}; }
            }
            body { font-family: sans-serif; padding: 20px; text-align: center; }
          </style>
        </head>
        <body>
          ${logoHtml}
          <div style="font-weight: bold;">${settings.shop.shopName}</div>
          <div>${settings.shop.shopAddress}</div>
          <div style="font-size: 10px;">Tel: ${settings.shop.shopPhone}<br/>${formatDate(sale.date)} ${formatTime(sale.date)} | ${sale.invoiceNumber || sale.id}</div>
          <div style="border-top: 1px dashed #000; margin: 10px 0;"></div>
          ${itemsHtml}
          <div style="border-top: 1px dashed #000; margin: 10px 0;"></div>
          <div style="display: flex; justify-content: space-between;">
            <span>TOTAL:</span>
            <span style="font-weight: bold;">${currency} ${sale.grandTotal.toFixed(2)}</span>
          </div>
        </body>
      </html>
    `;
    printContent(htmlContent, settings);
  };

  const toggleSplitCustomer = (id: string) => {
    setSelectedSplitCustomerIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const moveToAllocation = () => {
    if (selectedSplitCustomerIds.length === 0) {
      showError('Please select at least one customer');
      return;
    }
    const equalAmount = grandTotal / selectedSplitCustomerIds.length;
    const newEntries = selectedSplitCustomerIds.map(id => ({
      id: crypto.randomUUID(),
      amount: Number(equalAmount.toFixed(2)),
      method: 'Credit' as const,
      customerId: id
    }));

    // Adjust last entry for precision
    const sum = newEntries.reduce((s, e) => s + e.amount, 0);
    if (Math.abs(sum - grandTotal) > 0.001) {
      newEntries[newEntries.length - 1].amount += (grandTotal - sum);
    }

    setSplitEntries(newEntries);
    setSplitStep(2);
  };

  const backToSelection = () => {
    setSplitStep(1);
  };

  const addSplitEntry = () => {
    setSplitEntries([...splitEntries, { id: crypto.randomUUID(), amount: 0, method: 'Cash' }]);
  };

  const removeSplitEntry = (id: string) => {
    setSplitEntries(splitEntries.filter(e => e.id !== id));
  };

  const updateSplitAmount = (id: string, amount: number) => {
    setSplitEntries(splitEntries.map(e => e.id === id ? { ...e, amount } : e));
  };

  const updateSplitMethod = (id: string, method: 'Cash' | 'Card' | 'Transfer' | 'Credit') => {
    setSplitEntries(splitEntries.map(e => e.id === id ? { ...e, method } : e));
  };

  const updateSplitCustomer = (id: string, customerId: string) => {
    setSplitEntries(splitEntries.map(e => e.id === id ? { ...e, customerId } : e));
  };

  const splitTotal = splitEntries.reduce((sum, e) => sum + e.amount, 0);
  const splitRemaining = grandTotal - splitTotal;
  const processSplitPayment = async () => {
    if (Math.abs(splitRemaining) > 0.01) {
      showError(t('total_mismatch_error'));
      return;
    }

    const newSale: Sale = {
      id: crypto.randomUUID(),
      date: toISODate(),
      customer: activeCart?.customer || null,
      items: activeCart?.items || [],
      grandTotal: grandTotal,
      paymentMethod: 'credit',
      paidAmount: splitEntries.filter(e => e.method !== 'Credit').reduce((sum, e) => sum + e.amount, 0),
      balance: splitEntries.filter(e => e.method === 'Credit').reduce((sum, e) => sum + e.amount, 0),
      splitDetails: splitEntries
    };

    try {
      await addSale(newSale);

      for (const entry of splitEntries) {
        if (entry.method === 'Credit' && entry.customerId) {
          await updateCustomerBalance(entry.customerId, entry.amount);
        }
      }

      showSuccess(t('split_payment_successful'));
      if (settings.printing.printMode === 'auto') {
        handlePrintReceipt(newSale);
      }
      clearActiveCart();
      setIsSplitDialogOpen(false);
      setSplitEntries([{ id: '1', amount: 0, method: 'Cash' }]);
    } catch (error) {
      console.error('Error processing split payment:', error);
      showError('Failed to save split payment');
    }
  };

  const renderBoth = (key: string, options?: any) => (
    <>
      {t(key, options)} ({t(key, { ...options, lng: 'en' })})
    </>
  );

  const renderBothString = (key: string, options?: any) => {
    return `${t(key, options)} (${t(key, { ...options, lng: 'en' })})`;
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#050510] font-faruma selection:bg-primary/30 text-white" dir="rtl">
      <div className="flex-1 flex flex-col min-w-0">
        <div className="h-20 px-8 flex items-center justify-between border-b border-white/5 bg-[#050510]/50 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-[180px] h-10 rounded-xl bg-white/5 border-white/10 text-[10px] font-black uppercase text-white">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent className="bg-[#0a0a1a] border-white/10 text-white font-faruma">
                  {['ALL', 'DRINKS', 'FOOD', 'HARDWARE', 'COSMETICS', 'OTHER'].map((cat) => (
                    <SelectItem key={cat} value={cat} className="text-[10px] font-black uppercase hover:bg-primary/20">
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
              className={cn(
                "h-10 w-10 rounded-xl border border-white/10 transition-all",
                showFavoritesOnly ? "bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30" : "bg-white/5 hover:bg-white/10 text-white/40"
              )}
            >
              <Heart className={cn("h-4 w-4", showFavoritesOnly ? "fill-current text-yellow-500" : "text-white/40")} />
            </Button>
          </div>

          <div className="flex-1 max-w-xl mx-8">
            <div className="relative">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20" />
              <Input
                ref={searchInputRef}
                placeholder="...Search by name, code or barcode"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white/5 border-white/10 rounded-xl px-10 text-right font-bold h-11 focus:border-primary/50 focus:ring-0 transition-all placeholder:text-white/10 text-white"
                dir="rtl"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsPendingTransfersDialogOpen(true)}
              className="relative h-11 w-11 rounded-xl bg-white/5 border border-white/10 hover:bg-yellow-500/20 hover:text-yellow-500 text-white/40"
            >
              <ArrowRightLeft className="h-5 w-5" />
              {pendingTransfers.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-500 text-[#050510] rounded-full text-[10px] font-black flex items-center justify-center border-2 border-[#050510]">
                  {pendingTransfers.length}
                </span>
              )}
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1 p-4 custom-scrollbar">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {displayProducts.map((product) => {
              const isLowStock = product.stock_shop < LOW_STOCK_THRESHOLD;
              const cardColors = [
                'bg-blue-600', 'bg-red-600', 'bg-purple-600', 'bg-orange-600', 'bg-pink-600', 'bg-indigo-600'
              ];
              const colorClass = cardColors[Math.abs(product.id.split('').reduce((a, b) => a + b.charCodeAt(0), 0)) % cardColors.length];

              return (
                <div
                  key={product.id}
                  onClick={() => handleProductSelection(product)}
                  className="group bg-[#0a0a1a] hover:bg-[#0f0f25] border border-white/5 rounded-xl p-2 transition-all cursor-pointer relative"
                >
                  <div className={cn(
                    "aspect-square rounded-lg mb-2 flex items-center justify-center overflow-hidden relative border border-white/5",
                    product.image ? "bg-white" : colorClass
                  )}>
                    {product.image ? (
                      <img src={product.image} alt={product.name_dv} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    ) : (
                      <div className="text-white font-black text-lg uppercase tracking-tighter text-center px-2 leading-tight drop-shadow-lg">
                        {product.name_en}
                      </div>
                    )}
                    {isLowStock && (
                      <Badge className="absolute top-2 right-2 bg-red-500 text-white border-none text-[8px] font-black px-1.5 py-0 rounded-full shadow-lg uppercase tracking-widest">
                        LOW
                      </Badge>
                    )}
                  </div>

                  <div className="text-center px-1">
                    <h3 className="text-xs font-black text-white leading-tight truncate mb-0.5">{product.name_dv}</h3>
                    <p className="text-[8px] font-bold text-white/30 truncate uppercase tracking-widest mb-2">{product.name_en}</p>

                    <div className="flex items-center justify-center gap-1.5">
                      <span className="text-[11px] font-black text-primary leading-none">{settings.shop.currency} {product.price.toFixed(2)}</span>
                      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white scale-0 group-hover:scale-100 transition-transform shadow-[0_0_15px_rgba(0,132,255,0.5)]">
                        <PlusCircle className="h-4 w-4" />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </div>

      <div className="w-[600px] flex flex-col bg-[#0a0a1a]/80 backdrop-blur-xl border-l border-white/5 shadow-2xl z-20">
        <div className="p-6 pb-2">
          <div className="flex items-center gap-1 bg-white/5 p-1 rounded-2xl border border-white/10 mb-6">
            <div className="flex items-center gap-3 px-4 py-1.5 bg-primary/20 rounded-xl text-primary border border-primary/20">
              <ShoppingCart className="h-4 w-4" />
              <div className="flex flex-col items-start leading-none gap-0.5">
                <span className="text-[8px] font-black uppercase text-primary/60 tracking-tighter">(Cart)</span>
                <span className="text-[10px] font-black">{t('cart')}</span>
              </div>
            </div>

            <div className="w-px h-8 bg-white/10 mx-1" />

            <Button
              onClick={createNewCart}
              variant="ghost"
              className="h-10 px-4 text-white hover:bg-white/10 rounded-xl flex items-center gap-3 group transition-all"
            >
              <PlusCircle className="h-5 w-5 text-white/40 group-hover:text-white transition-colors" />
              <div className="flex flex-col items-end leading-none gap-0.5">
                <span className="text-[10px] font-black">{t('add_new_cart')}</span>
                <span className="text-[8px] font-black uppercase text-white/30 tracking-tighter">(Add New Cart)</span>
              </div>
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 mb-4">
            {[...openCarts.values()].map(cart => (
              <div key={cart.id} className="relative group">
                <Button
                  variant={activeCartId === cart.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => switchCart(cart.id)}
                  className={cn(
                    "h-8 px-4 text-[10px] font-black rounded-full transition-all",
                    activeCartId === cart.id
                      ? "bg-primary text-white shadow-[0_0_15px_rgba(0,132,255,0.3)]"
                      : "border-white/10 text-white/40 hover:text-white hover:border-white/20"
                  )}
                >
                  {cart.displayNumber} <span className="mr-1 opacity-50">CART</span>
                </Button>
                {openCarts.size > 1 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleRemoveCartClick(cart.id); }}
                    className="absolute -top-1 -left-1 h-4 w-4 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center shadow-lg"
                  >
                    <XCircle className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <ScrollArea className="flex-1 px-6 custom-scrollbar">
          {(!activeCart || activeCart.items.length === 0) ? (
            <div className="flex flex-col items-center justify-center h-[400px] opacity-20">
              <ShoppingCart className="h-20 w-20 mb-4" />
              <p className="text-lg font-black uppercase tracking-widest">{renderBoth('cart_empty')}</p>
            </div>
          ) : (
            <div className="space-y-2 pb-6">
              {activeCart.items.map((item) => (
                <div key={`${item.id}-${item.selected_unit}`} className="group relative bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl p-3 transition-all">
                  <div className="flex gap-4 items-start">
                    <div className="flex flex-col gap-2 items-start">
                      <div className="text-[16px] font-black text-primary whitespace-nowrap">
                        {settings.shop.currency} {item.price.toFixed(2)}
                      </div>
                      <div className="flex items-center gap-1 bg-black/40 rounded-lg p-0.5 border border-white/5 h-10">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-white/40 hover:text-white"
                          onClick={() => updateCartItemQty(item.id, -1)}
                        ><Minus className="h-4 w-4" /></Button>
                        <Input
                          type="number"
                          value={item.qty}
                          onChange={(e) => setCartItemQty(item.id, parseFloat(e.target.value) || 0)}
                          onFocus={handleFocus}
                          className="w-14 text-center text-[14px] font-black text-white bg-transparent border-none h-8 p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-white/40 hover:text-white"
                          onClick={() => updateCartItemQty(item.id, 1)}
                        ><Plus className="h-4 w-4" /></Button>
                      </div>
                    </div>

                    <div className="flex-1 text-right min-w-0">
                      <div className="flex justify-between items-start mb-1">
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="text-white/20 hover:text-red-500 transition-colors p-1"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className="text-[18px] font-black text-white leading-tight mb-1">{item.name_dv}</p>
                          <p className="text-[13px] font-bold text-white/50 leading-tight uppercase mb-1">{item.name_en}</p>
                          {item.selected_unit && item.selected_unit !== 'Piece' && (
                            <Badge variant="outline" className="text-[9px] border-primary/30 text-primary uppercase font-black px-1.5 py-0.5 h-auto leading-none">{item.selected_unit}</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="p-6 bg-black/40 border-t border-white/5 space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-bold text-white/40">
              <span>{renderBoth('subtotal')}</span>
              <span>{settings.shop.currency} {subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs font-bold text-white/40">
              <span>GST ({settings.shop.taxRate}%)</span>
              <span>{settings.shop.currency} {gstAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-end pt-2">
              <span className="text-sm font-black text-white uppercase tracking-tighter">{renderBoth('grand_total')}</span>
              <span className="text-4xl font-black text-neon-blue leading-none">
                {settings.shop.currency} {grandTotal.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={() => setIsSplitDialogOpen(true)}
              className="h-10 bg-[#2d5a5a] hover:bg-[#3d6a6a] text-white border border-white/5 text-[10px] font-black uppercase tracking-widest gap-2"
            >
              <Users className="h-4 w-4 text-primary" /> SPLIT BILL
            </Button>
            <Button
              onClick={clearActiveCart}
              className="h-10 bg-[#5a2d2d] hover:bg-[#6a3d3d] text-white border border-white/5 text-[10px] font-black uppercase tracking-widest gap-2"
            >
              <Trash2 className="h-4 w-4 text-red-500" /> CLEAR
            </Button>
            <Button
              onClick={() => {
                setTransferAmount(grandTotal);
                setIsAwaitingTransferDialogOpen(true);
              }}
              className="h-10 bg-[#2d3a5a] hover:bg-[#3d4a6a] text-white border border-white/5 text-[10px] font-black uppercase tracking-widest gap-2"
            >
              <Receipt className="h-4 w-4 text-blue-400" /> AWAITING TRANSFER
            </Button>
            <Button
              onClick={() => { setCreditDialogStep(1); setIsCreditDialogOpen(true); }}
              className="h-10 bg-[#5a4d2d] hover:bg-[#6a5d3d] text-[#f39c12] border border-[#f39c12]/20 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-orange-500/10"
            >
              CREDIT SALE
            </Button>
          </div>

          <Button
            onClick={() => setIsCashDialogOpen(true)}
            className="w-full h-14 btn-gradient-purple text-white text-lg font-black uppercase tracking-[0.2em] shadow-xl shadow-purple-500/30"
          >
            {renderBoth('checkout')}
          </Button>
        </div>
      </div>

      <LoyaltyRedemptionDialog
        isOpen={isLoyaltyRedemptionDialogOpen}
        onClose={() => setIsLoyaltyRedemptionDialogOpen(false)}
        availablePoints={activeCart?.customer?.loyalty_points || 0}
        maxRedeemableAmount={grandTotal}
        onRedeem={(points) => setPointsToRedeem(points)}
      />

      <UnitSelectionDialog
        isOpen={isUnitSelectionDialogOpen}
        onClose={() => setIsUnitSelectionDialogOpen(false)}
        product={productForUnitSelection}
        onSelect={(unit) => handleUnitSelection(unit)}
      />

      <Dialog open={isCashDialogOpen} onOpenChange={setIsCashDialogOpen}>
        <DialogContent className="sm:max-w-[425px] font-faruma glass-dark text-white border-white/10" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right text-2xl font-black">{renderBoth('cash_payment')}</DialogTitle>
            <DialogDescription className="text-right text-white/50">{renderBoth('enter_paid_amount')}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="space-y-2">
              <Label className="text-right block opacity-50 uppercase text-[10px] font-black tracking-widest">{renderBoth('total_amount')}</Label>
              <div className="text-4xl font-black text-neon-blue text-right">{settings.shop.currency} {grandTotal.toFixed(2)}</div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="paidAmount" className="text-right block opacity-50 uppercase text-[10px] font-black tracking-widest">{renderBoth('paid_amount')}</Label>
              <Input
                id="paidAmount"
                type="number"
                value={paidAmount}
                onChange={(e) => setPaidAmount(parseFloat(e.target.value) || '')}
                onFocus={handleFocus}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    processCashPayment();
                  }
                }}
                className="text-right h-14 bg-white/5 border-white/10 text-2xl font-black focus:border-primary transition-all text-white"
                autoFocus
              />
            </div>
            <div className="space-y-1 text-right">
              <Label className="opacity-50 uppercase text-[10px] font-black tracking-widest">{renderBoth('balance')}</Label>
              <div className={cn(
                "text-2xl font-black",
                balance < 0 ? "text-red-500" : "text-green-500"
              )}>
                {settings.shop.currency} {balance.toFixed(2)}
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsCashDialogOpen(false)} className="flex-1 border-white/10 hover:bg-white/5 text-white">{renderBoth('cancel')}</Button>
            <Button onClick={processCashPayment} disabled={typeof paidAmount !== 'number' || paidAmount < grandTotal} className="flex-1 btn-gradient-blue text-white">{renderBoth('confirm_payment')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCreditDialogOpen} onOpenChange={setIsCreditDialogOpen}>
        <DialogContent className="sm:max-w-[500px] font-faruma glass-dark text-white border-white/10" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right text-2xl font-black">{renderBoth('credit_sale')}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {creditDialogStep === 1 ? (
              <>
                <div className="flex gap-2 mb-4">
                  <Input
                    placeholder={renderBothString('search_customers')}
                    value={customerSearchTerm}
                    onChange={(e) => setCustomerSearchTerm(e.target.value)}
                    className="flex-1 text-right bg-white/5 border-white/10 text-white"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setIsAddCustomerDialogOpen(true)}
                    className="h-10 w-10 border-white/10 bg-white/5 hover:bg-primary/20 text-primary"
                  >
                    <UserPlus className="h-4 w-4" />
                  </Button>
                </div>
                <ScrollArea className="h-[300px] pr-4">
                  <div className="space-y-2">
                    {customers.filter(c =>
                      c.name_dv.includes(customerSearchTerm) ||
                      c.name_en.toLowerCase().includes(customerSearchTerm.toLowerCase())
                    ).map((customer) => (
                      <div
                        key={customer.id}
                        onClick={() => {
                          updateActiveCart(prev => ({ ...prev, customer }));
                          setCreditDialogStep(2);
                        }}
                        className="p-4 rounded-xl cursor-pointer transition-all border border-white/5 bg-white/5 hover:bg-white/10 hover:border-primary/30 text-right group"
                      >
                        <p className="font-black text-white group-hover:text-primary transition-colors">{customer.name_dv} ({customer.name_en})</p>
                        <p className="text-[10px] opacity-40 mt-1 uppercase tracking-widest">Limit: {settings.shop.currency} {customer.credit_limit.toFixed(2)}</p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </>
            ) : (
              <div className="space-y-6">
                <div className="bg-primary/10 border border-primary/20 p-4 rounded-2xl text-right">
                  <p className="text-[10px] opacity-50 uppercase font-black mb-1">{renderBoth('customer')}</p>
                  <p className="font-black text-white text-lg">{activeCart?.customer?.name_dv}</p>
                </div>
                <div className="space-y-2 text-right">
                  <p className="text-[10px] opacity-50 uppercase font-black">{renderBoth('grand_total')}</p>
                  <p className="text-4xl font-black text-neon-blue">{settings.shop.currency} {grandTotal.toFixed(2)}</p>
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2 pt-4 border-t border-white/5">
            {creditDialogStep === 2 ? (
              <>
                <Button variant="outline" onClick={() => setCreditDialogStep(1)} className="border-white/10 hover:bg-white/5 text-white">{renderBoth('change_customer')}</Button>
                <Button
                  onClick={processCreditPayment}
                  disabled={isProcessing}
                  className="flex-1 btn-gradient-blue text-white"
                >
                  {isProcessing ? 'Processing...' : renderBoth('confirm_credit_sale')}
                </Button>
              </>
            ) : (
              <Button variant="outline" onClick={() => setIsCreditDialogOpen(false)} className="w-full border-white/10 hover:bg-white/5 text-white">{renderBoth('cancel')}</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isConfirmRemoveCartDialogOpen} onOpenChange={setIsConfirmRemoveCartDialogOpen}>
        <DialogContent className="sm:max-w-[400px] font-faruma glass-dark text-white border-white/10" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right font-black text-xl">{renderBoth('confirm_cart_removal')}</DialogTitle>
            <DialogDescription className="text-right text-white/50">{renderBoth('confirm_cart_removal_description')}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsConfirmRemoveCartDialogOpen(false)} className="flex-1 border-white/10 hover:bg-white/5 text-white">{renderBoth('cancel')}</Button>
            <Button variant="destructive" onClick={confirmRemoveCart} className="flex-1 text-white">{renderBoth('confirm')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isExpiryDialogOpen} onOpenChange={setIsExpiryDialogOpen}>
        <DialogContent className="sm:max-w-[450px] font-faruma glass-dark text-white border-white/10 text-right p-0 overflow-hidden" dir="rtl">
          <div className="p-6">
            <DialogHeader className="pb-4 text-right">
              <DialogTitle className="text-xl text-orange-400 flex items-center justify-center gap-2 px-0 w-full text-center">
                <AlertTriangle className="h-6 w-6" /> {renderBoth('item_near_expiry')}
              </DialogTitle>
              <DialogDescription className="text-white/50 mt-2 break-words text-sm leading-relaxed text-right">
                {renderBoth('expiry_discount_message', {
                  itemName: selectedProductForExpiry?.name_dv,
                  expiryDate: selectedProductForExpiry?.expiry_date ? new Date(selectedProductForExpiry.expiry_date).toLocaleDateString() : ''
                })}
              </DialogDescription>
            </DialogHeader>

            <div className="bg-orange-500/10 p-4 rounded-lg border border-orange-500/20 my-4 text-right">
              <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center">
                  <p className="text-xs text-orange-400 font-bold uppercase tracking-wider">{renderBoth('discount_offer')}</p>
                  <p className="text-lg font-black text-orange-300">{expiryDiscountPercent}% {t('discount')}</p>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {[20, 30, 50].map((pct) => (
                    <Button
                      key={pct}
                      variant="outline"
                      onClick={() => setExpiryDiscountPercent(pct)}
                      className={cn(
                        "h-12 border-orange-500/30 font-black text-lg",
                        expiryDiscountPercent === pct ? "bg-orange-500 text-white" : "text-orange-500 hover:bg-orange-500/20"
                      )}
                    >
                      {pct}%
                    </Button>
                  ))}
                </div>

                <div className="flex items-center gap-3 mt-2">
                  <div className="relative w-full">
                    <Input
                      type="number"
                      value={expiryDiscountPercent}
                      onChange={(e) => setExpiryDiscountPercent(parseFloat(e.target.value) || 0)}
                      onFocus={handleFocus}
                      className="bg-white/5 border-orange-500/30 text-orange-300 font-black h-12 pr-10 text-right text-xl"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-orange-400 font-black text-lg">%</span>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="flex flex-row-reverse justify-between gap-4 mt-6">
              <Button onClick={confirmExpiryDiscount} className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-8">
                {renderBoth('apply_discount')}
              </Button>
              <Button variant="ghost" onClick={() => {
                if (selectedProductForExpiry) addToCart(selectedProductForExpiry);
                setIsExpiryDialogOpen(false);
              }} className="text-white/40">
                {renderBoth('no_thanks')}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isSplitDialogOpen} onOpenChange={(open) => {
        setIsSplitDialogOpen(open);
        if (!open) {
          setSplitStep(1);
          setSelectedSplitCustomerIds([]);
          setSplitSearchTerm('');
        }
      }}>
        <DialogContent className="sm:max-w-[500px] font-faruma glass-dark text-white border-white/10 p-0 overflow-hidden" dir="rtl">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle className="text-right text-2xl font-black flex items-center justify-end gap-3">
              (Split Bill) {t('split_bill')} <Users className="h-6 w-6 text-primary" />
            </DialogTitle>
            <DialogDescription className="text-right text-white/40">
              {splitStep === 1 ? t('select_customers_to_split') : t('allocate_amounts')}
            </DialogDescription>
          </DialogHeader>

          {splitStep === 1 ? (
            <div className="flex flex-col h-[600px]">
              <div className="px-6 py-2">
                <div className="relative">
                  <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20" />
                  <Input
                    placeholder={renderBothString('search_customers')}
                    value={splitSearchTerm}
                    onChange={(e) => setSplitSearchTerm(e.target.value)}
                    className="w-full bg-white/5 border-white/10 rounded-2xl pr-12 h-14 text-right font-bold focus:border-primary/50 transition-all"
                  />
                </div>
              </div>

              <ScrollArea className="flex-1 px-6 py-4">
                <div className="space-y-3">
                  {customers
                    .filter(c => (c.credit_limit || 0) > 0)
                    .filter(c =>
                      c.name_dv.includes(splitSearchTerm) ||
                      c.name_en.toLowerCase().includes(splitSearchTerm.toLowerCase()) ||
                      c.code.includes(splitSearchTerm)
                    )
                    .map(customer => {
                      const isSelected = selectedSplitCustomerIds.includes(customer.id);
                      return (
                        <div
                          key={customer.id}
                          onClick={() => toggleSplitCustomer(customer.id)}
                          className={cn(
                            "p-4 rounded-[2rem] border transition-all cursor-pointer flex items-center justify-between gap-4",
                            isSelected
                              ? "bg-primary border-primary shadow-lg shadow-primary/20 scale-[0.98]"
                              : "bg-white/5 border-white/5 hover:border-white/10"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all",
                              isSelected ? "bg-white border-white text-primary" : "border-white/20"
                            )}>
                              {isSelected && <Plus className="h-4 w-4 rotate-45" />}
                            </div>
                          </div>

                          <div className="flex-1 text-right">
                            <div className="flex items-center justify-end gap-2 mb-0.5">
                              <span className="text-[10px] font-bold opacity-40 uppercase tracking-widest">{customer.code}</span>
                              <span className="text-[10px] font-bold opacity-40">•</span>
                              <span className="text-sm font-black text-white">{customer.name_en}</span>
                            </div>
                            <h4 className="text-lg font-black text-white leading-tight">{customer.name_dv}</h4>
                            <Badge variant="outline" className="mt-2 bg-black/20 border-white/10 text-[9px] font-black py-0 px-2 h-5">
                              {settings.shop.currency} {customer.outstanding_balance.toFixed(2)}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </ScrollArea>

              <div className="p-6 bg-white/5 border-t border-white/10">
                <div className="flex justify-between items-center mb-4">
                  <div className="text-right">
                    <p className="text-[10px] font-black text-white/30 uppercase tracking-widest leading-none mb-1">TOTAL TO SPLIT</p>
                    <p className="text-2xl font-black text-primary">{settings.shop.currency} {grandTotal.toFixed(2)}</p>
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] font-black text-white/30 uppercase tracking-widest leading-none mb-1">SELECTED</p>
                    <p className="text-2xl font-black text-white">{selectedSplitCustomerIds.length}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setIsSplitDialogOpen(false)} className="flex-1 border-white/10 h-14 rounded-2xl font-black text-white hover:bg-white/5 uppercase tracking-widest text-xs">
                    {t('cancel')}
                  </Button>
                  <Button
                    onClick={moveToAllocation}
                    disabled={selectedSplitCustomerIds.length === 0}
                    className="flex-1 btn-gradient-blue h-14 rounded-2xl font-black text-white shadow-xl shadow-blue-500/20 uppercase tracking-widest text-xs"
                  >
                    {t('next')}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col h-[600px]">
              <ScrollArea className="flex-1 px-6 py-6">
                <div className="space-y-4">
                  {splitEntries.map((entry) => {
                    const customer = customers.find(c => c.id === entry.customerId);
                    return (
                      <div key={entry.id} className="p-5 rounded-3xl bg-white/5 border border-white/5 flex items-center justify-between gap-4 group hover:bg-white/10 transition-all">
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-white/20 uppercase">{settings.shop.currency}</span>
                            <Input
                              type="number"
                              value={entry.amount}
                              onChange={(e) => updateSplitAmount(entry.id, parseFloat(e.target.value) || 0)}
                              onFocus={handleFocus}
                              className="w-32 h-14 bg-black/40 border-white/10 rounded-2xl pl-10 text-right text-xl font-black focus:border-primary transition-all text-white"
                            />
                          </div>
                        </div>

                        <div className="flex-1 text-right">
                          <h4 className="text-lg font-black text-white mb-0.5">{customer?.name_dv}</h4>
                          <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">{customer?.name_en}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>

              <div className="p-6 bg-white/5 border-t border-white/10">
                <div className="grid grid-cols-2 gap-6 mb-6">
                  <div className="text-right">
                    <p className="text-[10px] font-black text-white/30 uppercase tracking-widest leading-none mb-1">(TARGET TOTAL)</p>
                    <p className="text-2xl font-black text-white">{settings.shop.currency} {grandTotal.toFixed(2)}</p>
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] font-black text-white/30 uppercase tracking-widest leading-none mb-1">(TOTAL ALLOCATED)</p>
                    <p className={cn(
                      "text-2xl font-black transition-all",
                      Math.abs(splitRemaining) < 0.01 ? "text-green-500" : "text-red-500"
                    )}>
                      {settings.shop.currency} {splitTotal.toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button variant="ghost" onClick={backToSelection} className="h-14 w-14 rounded-2xl border border-white/10 text-white hover:bg-white/5">
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  <Button
                    onClick={processSplitPayment}
                    disabled={Math.abs(splitRemaining) > 0.01 || splitEntries.length === 0}
                    className="flex-1 btn-gradient-blue h-14 rounded-2xl font-black text-white shadow-xl shadow-blue-500/20 uppercase tracking-widest text-xs"
                  >
                    (Confirm Split Payment) {t('confirm_split_payment')}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isAwaitingTransferDialogOpen} onOpenChange={setIsAwaitingTransferDialogOpen}>
        <DialogContent className="sm:max-w-[400px] font-faruma bg-[#0a0a1a] border-white/10 text-white" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right text-2xl font-black flex items-center justify-end gap-3">
              Confirm Bank Transfer <Receipt className="h-6 w-6 text-blue-400" />
            </DialogTitle>
            <DialogDescription className="text-right text-white/40">
              Enter the amount transferred by the customer.
            </DialogDescription>
          </DialogHeader>

          <div className="py-8 space-y-4">
            <div className="bg-white/5 p-4 rounded-2xl border border-white/5 text-right">
              <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-1">Grand Total</p>
              <p className="text-3xl font-black text-white">{settings.shop.currency} {grandTotal.toFixed(2)}</p>
            </div>

            <div className="space-y-2">
              <Label className="text-right block text-[10px] font-black uppercase text-white/40 tracking-widest pr-2">Transfer Amount</Label>
              <div className="relative">
                <DollarSign className="absolute right-4 top-1/2 -translate-y-1/2 h-6 w-6 text-primary/40" />
                <Input
                  type="number"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(parseFloat(e.target.value) || 0)}
                  onFocus={handleFocus}
                  className="bg-white/5 border-primary h-16 rounded-2xl pr-14 text-3xl font-black text-white text-right"
                  autoFocus
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center pr-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsAddCustomerDialogOpen(true)}
                  className="text-[10px] h-6 px-2 text-green-500 hover:text-green-400 hover:bg-green-500/10 font-black"
                >
                  <UserPlus className="h-3 w-3 ml-1" /> {renderBoth('add_customer')}
                </Button>
                <Label className="text-right block text-[10px] font-black uppercase text-white/40 tracking-widest">Select Customer or Enter Name</Label>
              </div>
              <Input
                placeholder="Search or type name..."
                value={customerSearchTerm}
                onChange={(e) => setCustomerSearchTerm(e.target.value)}
                className="bg-white/5 border-white/10 h-12 text-right text-white"
              />
              <ScrollArea className="h-[150px] mt-2 border border-white/5 rounded-xl">
                <div className="p-2 space-y-1">
                  {customers.filter(c =>
                    c.name_dv.includes(customerSearchTerm) ||
                    c.name_en.toLowerCase().includes(customerSearchTerm.toLowerCase())
                  ).map(customer => (
                    <div
                      key={customer.id}
                      onClick={() => {
                        updateActiveCart(prev => ({ ...prev, customer }));
                        setCustomerSearchTerm(customer.name_dv);
                      }}
                      className={cn(
                        "p-2 rounded-lg cursor-pointer text-right text-sm transition-all",
                        activeCart?.customer?.id === customer.id ? "bg-primary text-white" : "bg-white/5 hover:bg-white/10 text-white/60"
                      )}
                    >
                      {customer.name_dv}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>

          <DialogFooter className="gap-3">
            <Button variant="ghost" onClick={() => setIsAwaitingTransferDialogOpen(false)} className="flex-1 border-white/10 text-white">
              Cancel
            </Button>
            <Button
              onClick={processTransferPayment}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-black"
            >
              Confirm Transfer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <CustomerAddDialog
        isOpen={isAddCustomerDialogOpen}
        onClose={() => setIsAddCustomerDialogOpen(false)}
        onAdd={async (newCustomer) => {
          const addedCustomer = await addCustomer(newCustomer);
          if (addedCustomer) {
            updateActiveCart(prev => ({ ...prev, customer: addedCustomer }));
          }
        }}
      />

      <Dialog open={isPendingTransfersDialogOpen} onOpenChange={setIsPendingTransfersDialogOpen}>
        <DialogContent className="sm:max-w-[600px] font-faruma bg-[#0a0a1a] border-white/10 text-white" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right text-2xl font-black flex items-center justify-end gap-3">
              Pending Transfers <ArrowRightLeft className="h-6 w-6 text-yellow-500" />
            </DialogTitle>
            <DialogDescription className="text-right text-white/40">
              Review and resolve pending bank transfers.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="h-[400px] mt-4">
            <div className="space-y-3">
              {pendingTransfers.length === 0 ? (
                <div className="h-40 flex flex-col items-center justify-center text-white/20 uppercase tracking-widest font-black text-sm">
                  No pending transfers
                </div>
              ) : (
                pendingTransfers.map((transfer) => (
                  <div key={transfer.id} className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-xl bg-yellow-500/10 flex items-center justify-center text-yellow-500">
                        <ArrowRightLeft className="h-5 w-5" />
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-white">{transfer.customer?.name_dv || transfer.tempCustomerName || 'Guest'}</p>
                        <p className="text-[10px] font-bold text-white/40">{formatDateTime(transfer.date)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-0.5">Amount</p>
                      <p className="text-lg font-black text-yellow-500">{settings.shop.currency} {transfer.grandTotal.toFixed(2)}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => resolvePendingTransfer(transfer.id, 'cash')}
                        className="bg-green-600 hover:bg-green-700 text-white text-[10px] font-black px-3 h-9"
                      >
                        CASH
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => resolvePendingTransfer(transfer.id, 'credit')}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black px-3 h-9"
                        disabled={!transfer.customer}
                      >
                        CREDIT
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default POS;