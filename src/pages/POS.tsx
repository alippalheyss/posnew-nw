"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, ShoppingCart, XCircle, PlusCircle, Trash2, Heart, ArrowLeft, Users, Plus, Minus, AlertTriangle, Receipt } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useAppContext, Product, Customer, CartItem, Sale } from '@/context/AppContext';
import { showSuccess, showError } from '@/utils/toast';
import LoyaltyRedemptionDialog from '@/components/LoyaltyRedemptionDialog';
import UnitSelectionDialog from '@/components/UnitSelectionDialog';
import { Badge } from '@/components/ui/badge';
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
    addSale
  } = useAppContext();

  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const cartCounter = useRef(openCarts.size);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCashDialogOpen, setIsCashDialogOpen] = useState(false);
  const [isCreditDialogOpen, setIsCreditDialogOpen] = useState(false);
  const [paidAmount, setPaidAmount] = useState<number | ''>(0);
  const [isConfirmRemoveCartDialogOpen, setIsConfirmRemoveCartDialogOpen] = useState(false);
  const [cartToRemoveId, setCartToRemoveId] = useState<string | null>(null);
  const [isPrintConfirmDialogOpen, setIsPrintConfirmDialogOpen] = useState(false);
  const [lastSaleForPrint, setLastSaleForPrint] = useState<Sale | null>(null);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [isSplitDialogOpen, setIsSplitDialogOpen] = useState(false);
  
  const [pointsToRedeem, setPointsToRedeem] = useState<number>(0);
  const [isLoyaltyRedemptionDialogOpen, setIsLoyaltyRedemptionDialogOpen] = useState(false);
  const [creditDialogStep, setCreditDialogStep] = useState<1 | 2>(1);
  const [isExpiryDialogOpen, setIsExpiryDialogOpen] = useState(false);
  const [selectedProductForExpiry, setSelectedProductForExpiry] = useState<Product | null>(null);
  const [isUnitSelectionDialogOpen, setIsUnitSelectionDialogOpen] = useState(false);
  const [productForUnitSelection, setProductForUnitSelection] = useState<Product | null>(null);
  
  const [splitEntries, setSplitEntries] = useState<Array<{ id: string, amount: number, method: 'Cash' | 'Card' | 'Transfer' }>>([
    { id: '1', amount: 0, method: 'Cash' }
  ]);

  const searchInputRef = useRef<HTMLInputElement>(null);

  const handleFocus = (event: React.FocusEvent<HTMLInputElement>) => {
    event.target.select();
  };

  const LOW_STOCK_THRESHOLD = 10;
  const NEAR_EXPIRY_DAYS = 30;

  useEffect(() => {
    searchInputRef.current?.focus();
  }, [activeCartId]);

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
      addToCart(selectedProductForExpiry, 0.9);
      setIsExpiryDialogOpen(false);
      setSelectedProductForExpiry(null);
      showSuccess(t('expiry_discount_applied'));
    }
  };

  const updateCartItemQty = (id: string, delta: number) => {
    updateActiveCart(prevCart => ({
      ...prevCart,
      items: prevCart.items.map((item) =>
        item.id === id ? { ...item, qty: item.qty + delta } : item
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

    const loyaltyDiscount = pointsToRedeem;
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
    
    return matchesSearch && matchesCategory;
  }).slice(0, 50); // Optimization: only show first 50 matches initially

  const processCashPayment = () => {
    if (!activeCart || activeCart.items.length === 0) {
      showError(t('cart_empty_error'));
      return;
    }
    if (typeof paidAmount !== 'number' || paidAmount < grandTotal) {
      showError(t('insufficient_payment_error'));
      return;
    }

    const newSale = {
      id: `sale-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      customer: activeCart.customer,
      items: activeCart.items,
      grandTotal: grandTotal,
      paymentMethod: 'cash' as const,
      paidAmount: paidAmount,
      balance: balance,
    };
    addSale(newSale);

    if (activeCart.customer) {
      if (pointsToRedeem > 0) {
        redeemLoyaltyPoints(activeCart.customer.id, pointsToRedeem);
      }
      const pointsEarned = Math.floor(grandTotal / 100);
      if (pointsEarned > 0) {
        awardLoyaltyPoints(activeCart.customer.id, pointsEarned);
      }
    }

    showSuccess(t('cash_payment_successful'));
    if (settings.printing.printMode === 'auto') {
      handlePrintReceipt(newSale);
    }
    clearActiveCart();
    setPaidAmount(0);
    setIsCashDialogOpen(false);
  };

  const processCreditPayment = () => {
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
      id: `sale-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      customer: activeCart.customer!,
      items: activeCart.items,
      grandTotal: grandTotal,
      paymentMethod: 'credit' as const,
    };
    addSale(newSale);

    if (activeCart.customer) {
      if (pointsToRedeem > 0) {
        redeemLoyaltyPoints(activeCart.customer.id, pointsToRedeem);
      }
      updateCustomerBalance(activeCart.customer.id, grandTotal);
      const pointsEarned = Math.floor(grandTotal / 100);
      if (pointsEarned > 0) {
        awardLoyaltyPoints(activeCart.customer.id, pointsEarned);
      }
    }

    showSuccess(t('credit_sale_successful'));
    if (settings.printing.printMode === 'auto') {
      handlePrintReceipt(newSale);
    }
    clearActiveCart();
    setIsCreditDialogOpen(false);
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

  // Split Bill Logic
  const addSplitEntry = () => {
    setSplitEntries([...splitEntries, { id: Date.now().toString(), amount: 0, method: 'Cash' }]);
  };

  const removeSplitEntry = (id: string) => {
    setSplitEntries(splitEntries.filter(e => e.id !== id));
  };

  const updateSplitAmount = (id: string, amount: number) => {
    setSplitEntries(splitEntries.map(e => e.id === id ? { ...e, amount } : e));
  };

  const updateSplitMethod = (id: string, method: 'Cash' | 'Card' | 'Transfer') => {
    setSplitEntries(splitEntries.map(e => e.id === id ? { ...e, method } : e));
  };

  const splitTotal = splitEntries.reduce((sum, e) => sum + e.amount, 0);
  const splitRemaining = grandTotal - splitTotal;

  const processSplitPayment = () => {
    if (Math.abs(splitRemaining) > 0.01) {
      showError(t('total_mismatch_error'));
      return;
    }

    const newSale = {
      id: `sale-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      customer: activeCart?.customer || null,
      items: activeCart?.items || [],
      grandTotal: grandTotal,
      paymentMethod: 'split' as any,
      splitDetails: splitEntries
    };

    setSales(prev => [...prev, newSale]);
    showSuccess(t('split_payment_successful'));
    clearActiveCart();
    setIsSplitDialogOpen(false);
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
      {/* Main Content - Products Grid (Right Side in RTL) */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar: Category & Search */}
        <div className="h-20 px-8 flex items-center justify-between border-b border-white/5 bg-[#050510]/50 backdrop-blur-sm">
          <div className="flex items-center gap-3">
             <div className="flex items-center bg-white/5 rounded-full p-1 border border-white/10">
                {['DRINKS', 'FOOD', 'HARDWARE', 'COSMETICS', 'OTHER', 'ALL'].map((cat) => (
                   <Button 
                     key={cat}
                     variant={selectedCategory === cat ? "default" : "ghost"} 
                     size="sm" 
                     onClick={() => setSelectedCategory(cat)}
                     className={cn(
                       "rounded-full px-4 text-[10px] font-black transition-all",
                       selectedCategory === cat ? "bg-primary text-white shadow-[0_0_10px_rgba(0,132,255,0.3)]" : "text-white/40 hover:text-white"
                     )}
                   >
                     {cat}
                   </Button>
                ))}
             </div>
             <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10">
                <Trash2 className="h-4 w-4 text-white/40" />
             </Button>
             <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10">
                <Heart className="h-4 w-4 text-white/40" />
             </Button>
          </div>

          <div className="relative w-[400px]">
             <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20" />
             <Input 
                ref={searchInputRef}
                placeholder="Search by name, code or barcode..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white/5 border-white/10 rounded-xl px-10 text-right font-bold h-11 focus:border-primary/50 focus:ring-0 transition-all placeholder:text-white/10 text-white"
                dir="rtl"
             />
          </div>
        </div>

        {/* Product Grid */}
        <ScrollArea className="flex-1 p-8 custom-scrollbar">
           <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
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
                    className="group bg-[#0a0a1a] hover:bg-[#0f0f25] border border-white/5 rounded-[2rem] p-5 transition-all cursor-pointer relative"
                  >
                    <div className={cn(
                      "aspect-square rounded-[1.5rem] mb-4 flex items-center justify-center overflow-hidden relative border border-white/5",
                      product.image ? "bg-white" : colorClass
                    )}>
                       {product.image ? (
                         <img src={product.image} alt={product.name_dv} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                       ) : (
                         <div className="text-white font-black text-2xl uppercase tracking-tighter text-center px-4 leading-tight drop-shadow-lg">
                            {product.name_en}
                         </div>
                       )}
                       {isLowStock && (
                         <Badge className="absolute top-3 right-3 bg-red-500 text-white border-none text-[8px] font-black px-2 py-0.5 rounded-full shadow-lg uppercase tracking-widest">
                           LOW
                         </Badge>
                       )}
                    </div>
                    
                    <div className="text-center px-2">
                       <h3 className="text-base font-black text-white leading-tight truncate">{product.name_dv}</h3>
                       <p className="text-[10px] font-bold text-white/30 mt-1 truncate uppercase tracking-widest mb-4">{product.name_en}</p>
                       
                       <div className="flex items-center justify-center gap-2">
                          <span className="text-sm font-black text-primary leading-none">{settings.shop.currency} {product.price.toFixed(2)}</span>
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

      {/* Cart Section - Left Side in RTL */}
      <div className="w-[480px] flex flex-col bg-[#0a0a1a]/80 backdrop-blur-xl border-r border-white/5 shadow-2xl z-20">
        {/* Cart Header */}
        <div className="p-6 pb-2">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
              <div className="bg-primary/20 p-2 rounded-lg">
                 <ShoppingCart className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-xl font-black text-white">{renderBoth('cart')}</h2>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={createNewCart} 
              className="h-8 border-white/10 hover:bg-white/5 text-xs font-bold gap-2 text-white"
            >
              <PlusCircle className="h-4 w-4 text-primary" /> {renderBoth('add_new_cart')}
            </Button>
          </div>

          {/* Cart Tabs */}
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

        {/* Cart Items */}
        <ScrollArea className="flex-1 px-6 custom-scrollbar">
          {(!activeCart || activeCart.items.length === 0) ? (
            <div className="flex flex-col items-center justify-center h-[400px] opacity-20">
              <ShoppingCart className="h-20 w-20 mb-4" />
              <p className="text-lg font-black uppercase tracking-widest">{renderBoth('cart_empty')}</p>
            </div>
          ) : (
            <div className="space-y-2 pb-6">
              {activeCart.items.map((item) => (
                <div key={`${item.id}-${item.selected_unit}`} className="group relative bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl p-3 transition-all">
                  <div className="flex justify-between items-start mb-2">
                    <div className="text-right flex-1">
                      <p className="text-base font-black text-white leading-tight">{item.name_dv}</p>
                      <p className="text-[11px] font-bold text-white/40 mt-0.5">{item.name_en}</p>
                      <div className="flex items-center gap-2 mt-2">
                         <span className="text-sm font-black text-primary">{settings.shop.currency} {item.price.toFixed(2)}</span>
                         {item.selected_unit && item.selected_unit !== 'Piece' && (
                           <Badge variant="outline" className="text-[8px] border-primary/30 text-primary uppercase font-black px-1.5 py-0">{item.selected_unit}</Badge>
                         )}
                      </div>
                    </div>
                    <button 
                      onClick={() => removeFromCart(item.id)}
                      className="text-white/20 hover:text-red-500 transition-colors p-1"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between pt-2 border-t border-white/5">
                    <div className="flex items-center gap-1 bg-black/40 rounded-lg p-0.5 border border-white/5">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7 text-white/40 hover:text-white"
                        onClick={() => updateCartItemQty(item.id, -1)}
                      ><Minus className="h-3 w-3" /></Button>
                      <span className="w-10 text-center text-xs font-black text-white">{item.qty}</span>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7 text-white/40 hover:text-white"
                        onClick={() => updateCartItemQty(item.id, 1)}
                      ><Plus className="h-3 w-3" /></Button>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black text-white leading-none">{settings.shop.currency} {(item.price * item.qty).toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Totals & Checkout */}
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
              onClick={() => setIsCashDialogOpen(true)}
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

      {/* Dialogs */}
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
                <Input 
                  placeholder={renderBothString('search_customers')}
                  value={customerSearchTerm}
                  onChange={(e) => setCustomerSearchTerm(e.target.value)}
                  className="mb-4 text-right bg-white/5 border-white/10 text-white"
                />
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
                <Button onClick={processCreditPayment} className="flex-1 btn-gradient-blue text-white">{renderBoth('confirm_credit_sale')}</Button>
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
              <p className="text-xs text-orange-400 font-bold mb-1 uppercase tracking-wider">{renderBoth('discount_offer')}</p>
              <p className="text-lg font-black text-orange-300">10% {t('discount')}</p>
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

      <Dialog open={isSplitDialogOpen} onOpenChange={setIsSplitDialogOpen}>
        <DialogContent className="sm:max-w-[550px] font-faruma glass-dark text-white border-white/10 max-h-[90vh] flex flex-col p-0 overflow-hidden" dir="rtl">
          <DialogHeader className="p-6 pb-2 text-right">
            <DialogTitle className="text-xl flex items-center justify-end gap-2 text-white font-black">
              <Users className="h-5 w-5 text-primary" /> {renderBoth('split_bill')}
            </DialogTitle>
            <DialogDescription className="text-right text-white/50">
              {renderBoth('split_bill_description')}
            </DialogDescription>
          </DialogHeader>

          <div className="p-6 flex-1 overflow-hidden flex flex-col gap-6">
            <div className="bg-primary/10 p-4 rounded-lg border border-primary/20">
              <div className="flex justify-between items-center">
                <span className="text-lg font-black text-primary">{settings.shop.currency} {grandTotal.toFixed(2)}</span>
                <span className="text-sm font-bold opacity-60 uppercase tracking-wider">{renderBoth('total_to_split')}</span>
              </div>
            </div>

            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-4">
                {splitEntries.map((entry, idx) => (
                  <div key={entry.id} className="p-4 border rounded-lg bg-white/5 border-white/5 flex flex-col gap-3">
                    <div className="flex justify-between items-center">
                      <Button variant="ghost" size="sm" onClick={() => removeSplitEntry(entry.id)} className="h-6 w-6 p-0 text-red-500">
                        <XCircle className="h-4 w-4" />
                      </Button>
                      <span className="font-black text-sm">{renderBoth('person')} {idx + 1}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1">
                        <Label className="text-[10px] uppercase opacity-50 text-right">{renderBoth('amount')}</Label>
                        <Input
                          type="number"
                          value={entry.amount}
                          onChange={(e) => updateSplitAmount(entry.id, parseFloat(e.target.value) || 0)}
                          className="text-right h-10 font-bold bg-white/5 border-white/10 text-white"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <Label className="text-[10px] uppercase opacity-50 text-right">{renderBoth('payment_method')}</Label>
                        <Select value={entry.method} onValueChange={(val: any) => updateSplitMethod(entry.id, val)}>
                          <SelectTrigger className="h-10 text-right font-bold bg-white/5 border-white/10 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-[#0a0a1a] border-white/10 text-white">
                            <SelectItem value="Cash">{renderBothString('cash')}</SelectItem>
                            <SelectItem value="Card">{renderBothString('card')}</SelectItem>
                            <SelectItem value="Transfer">{renderBothString('transfer')}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="pt-4 border-t border-white/5 flex flex-col gap-4">
              <div className="flex justify-between items-center px-2">
                <span className={cn(
                  "text-lg font-black",
                  Math.abs(splitRemaining) < 0.01 ? "text-green-500" : "text-red-500"
                )}>
                  {settings.shop.currency} {Math.abs(splitRemaining).toFixed(2)}
                  {splitRemaining < -0.01 && <span className="text-[10px] ml-1 uppercase">(Extra)</span>}
                </span>
                <span className="text-sm font-bold opacity-60 uppercase tracking-wider">{renderBoth('remaining_amount')}</span>
              </div>
              
              <Button variant="outline" onClick={addSplitEntry} className="w-full border-dashed border-2 py-6 border-white/10 hover:border-primary hover:text-primary hover:bg-primary/5 transition-all flex items-center justify-center gap-2 text-white/50">
                <PlusCircle className="h-4 w-4" /> {renderBoth('add_person')}
              </Button>
            </div>
          </div>

          <DialogFooter className="p-6 pt-2 border-t border-white/5 flex justify-between gap-3">
            <Button variant="outline" onClick={() => setIsSplitDialogOpen(false)} className="flex-1 border-white/10 hover:bg-white/5 text-white">
              {renderBoth('cancel')}
            </Button>
            <Button 
              onClick={processSplitPayment} 
              disabled={Math.abs(splitRemaining) > 0.01 || splitEntries.length === 0}
              className="flex-1 btn-gradient-blue text-white"
            >
              {renderBoth('confirm_split_payment')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default POS;