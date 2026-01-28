"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, ShoppingCart, XCircle, PlusCircle, Trash2, Heart, ArrowLeft } from 'lucide-react'; // Added Heart and ArrowLeft
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useAppContext, Product, Customer, CartItem, Sale } from '@/context/AppContext';
import { showSuccess, showError } from '@/utils/toast';
import LoyaltyRedemptionDialog from '@/components/LoyaltyRedemptionDialog';
import UnitSelectionDialog from '@/components/UnitSelectionDialog';
import { Badge } from '@/components/ui/badge';

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
    updateCustomerBalance
  } = useAppContext();

  const cartCounter = useRef(openCarts.size);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCashDialogOpen, setIsCashDialogOpen] = useState(false);
  const [isCreditDialogOpen, setIsCreditDialogOpen] = useState(false);
  const [paidAmount, setPaidAmount] = useState<number | ''>(0); // Initialize with 0 for better UX
  const [isConfirmRemoveCartDialogOpen, setIsConfirmRemoveCartDialogOpen] = useState(false);
  const [cartToRemoveId, setCartToRemoveId] = useState<string | null>(null);
  const [isPrintConfirmDialogOpen, setIsPrintConfirmDialogOpen] = useState(false);
  const [lastSaleForPrint, setLastSaleForPrint] = useState<Sale | null>(null);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [isSplitDialogOpen, setIsSplitDialogOpen] = useState(false);
  const [splitStep, setSplitStep] = useState<1 | 2 | 3>(1);
  const [splitAmountTotal, setSplitAmountTotal] = useState<number>(0);
  const [selectedSplitCustomerIds, setSelectedSplitCustomerIds] = useState<string[]>([]);
  const [splitEntries, setSplitEntries] = useState<Array<{ id: string, customerId: string, amount: number }>>([]);
  const [pointsToRedeem, setPointsToRedeem] = useState<number>(0);
  const [isLoyaltyRedemptionDialogOpen, setIsLoyaltyRedemptionDialogOpen] = useState(false);
  const [creditDialogStep, setCreditDialogStep] = useState<1 | 2>(1); // 1: Select Customer, 2: Review & Pay
  const [isExpiryDialogOpen, setIsExpiryDialogOpen] = useState(false);
  const [selectedProductForExpiry, setSelectedProductForExpiry] = useState<Product | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const handleFocus = (event: React.FocusEvent<HTMLInputElement>) => {
    event.target.select();
  };

  const LOW_STOCK_THRESHOLD = 10;
  const NEAR_EXPIRY_DAYS = 30;

  // Auto-focus search input
  useEffect(() => {
    searchInputRef.current?.focus();
  }, [activeCartId]);

  // Barcode Auto-Add Logic
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

  const handlePrintReceipt = (sale: Sale | any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

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
    const subtotal = sale.grandTotal / (1 + (gstRate / 100));
    const gstAmount = sale.grandTotal - subtotal;

    const logoHtml = settings.shop.logo ? `
      <div style="margin-bottom: 10px;">
        <img src="${settings.shop.logo}" style="max-height: 60px; object-contain: contain;" />
      </div>
    ` : '';

    printWindow.document.write(`
      <html>
        <head>
          <title>Receipt ${sale.id}</title>
          <style>
            @media print {
              @page { margin: 0; size: ${settings.printing.thermalPrinterWidth === '58mm' ? '58mm' : '80mm'} auto; }
              body { margin: 0; padding: 10px; font-family: sans-serif; width: ${settings.printing.thermalPrinterWidth === '58mm' ? '58mm' : '80mm'}; }
            }
            body { font-family: sans-serif; padding: 20px; text-align: center; }
            .header { font-weight: bold; font-size: 16px; margin-bottom: 5px; }
            .info { font-size: 12px; margin-bottom: 10px; }
            .separator { border-top: 1px dashed #000; margin: 10px 0; }
            .totals { font-weight: bold; margin-top: 10px; }
            .footer { font-size: 10px; margin-top: 20px; font-style: italic; }
          </style>
        </head>
        <body onload="window.print();window.close()">
          ${logoHtml}
          <div class="header">${settings.shop.shopName}</div>
          <div class="info">
            ${settings.shop.shopAddress}<br/>
            Tel: ${settings.shop.shopPhone}<br/>
            ${sale.date} | ${sale.id}
          </div>
          <div class="separator"></div>
          ${itemsHtml}
          <div class="separator"></div>
          <div style="display: flex; justify-content: space-between; font-size: 12px;">
            <span>Subtotal:</span>
            <span>${currency} ${subtotal.toFixed(2)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 12px;">
            <span>GST (${gstRate}%):</span>
            <span>${currency} ${gstAmount.toFixed(2)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 14px; margin-top: 5px;">
            <span>TOTAL:</span>
            <span>${currency} ${sale.grandTotal.toFixed(2)}</span>
          </div>
          <div class="separator"></div>
          <div class="info" style="text-align: left;">
            Payment: ${sale.paymentMethod.toUpperCase()}<br/>
            ${sale.paidAmount ? `Paid: ${currency} ${sale.paidAmount.toFixed(2)}<br/>` : ''}
            ${sale.balance !== undefined ? `Balance: ${currency} ${sale.balance.toFixed(2)}` : ''}
          </div>
          <div class="footer">
            ${settings.shop.receiptFooter}
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
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
    setCartToRemoveId(cartId);
    setIsConfirmRemoveCartDialogOpen(true);
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
    // Check for near expiry
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

    addToCart(product);
  };

  const addToCart = (product: Product, discountFactor: number = 1) => {
    // Always add as base unit (Piece) initially
    // Check if item already exists as base unit
    const unitName = 'Piece';
    const price = product.price * discountFactor;
    const conversion = 1;

    updateActiveCart(prevCart => {
      const existingItem = prevCart.items.find((item) => item.id === product.id && (item.selected_unit === unitName || !item.selected_unit));
      if (existingItem) {
        return {
          ...prevCart,
          items: prevCart.items.map((item) =>
            item.id === product.id && (item.selected_unit === unitName || !item.selected_unit) ? { ...item, qty: item.qty + 1 } : item
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

  const confirmExpiryDiscount = () => {
    if (selectedProductForExpiry) {
      addToCart(selectedProductForExpiry, 0.9); // 10% discount
      setIsExpiryDialogOpen(false);
      setSelectedProductForExpiry(null);
      showSuccess(t('expiry_discount_applied'));
    }
  };

  const updateCartItemUnit = (itemId: string, unitName: string) => {
    updateActiveCart(prevCart => {
      return {
        ...prevCart,
        items: prevCart.items.map(item => {
          if (item.id === itemId) {
            // Find the unit details
            let newPrice = item.price; // Default to current
            let newConversion = 1;

            if (unitName === 'Piece') {
              // Revert to base product price (we need to access original product, assume item has base fields)
              // However, item.price might be modified. Ideally we should look up the product again or store base price.
              // Since item extends Product, and we didn't overwrite base fields in context, we can rely on context lookup or store base price in item.
              // Let's look up product from context to be safe and clean.
              const product = products.find(p => p.id === item.id);
              if (product) {
                newPrice = product.price;
                newConversion = 1;
              }
            } else {
              const product = products.find(p => p.id === item.id);
              const unit = product?.units?.find(u => u.name === unitName);
              if (unit) {
                newPrice = unit.price;
                newConversion = unit.conversion_factor;
              }
            }

            return {
              ...item,
              selected_unit: unitName,
              price: newPrice,
              unit_price: newPrice,
              unit_conversion: newConversion
            };
          }
          return item;
        })
      };
    });
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

  const updateActiveCartCustomer = (customerId: string | null) => {
    const customer = customers.find(c => c.id === customerId) || null;
    updateActiveCart(prevCart => ({
      ...prevCart,
      customer: customer,
    }));
  };

  const calculateTotals = () => {
    const currentItems = activeCart?.items || [];
    const taxableTotal = currentItems.filter(i => !i.is_zero_tax).reduce((sum, item) => sum + item.price * item.qty, 0);
    const zeroTaxTotal = currentItems.filter(i => i.is_zero_tax).reduce((sum, item) => sum + item.price * item.qty, 0);
    const subtotalNoDiscount = taxableTotal + zeroTaxTotal;

    // Loyalty Discount (1 point = 1 currency unit)
    const loyaltyDiscount = pointsToRedeem;
    const grandTotalValue = Math.max(0, subtotalNoDiscount - loyaltyDiscount);

    const gstRate = settings.shop.taxRate / 100;

    // Pro-rata discount for taxable part
    const taxableRatio = subtotalNoDiscount > 0 ? taxableTotal / subtotalNoDiscount : 0;
    const taxablePartAfterDiscount = grandTotalValue * taxableRatio;

    const subtotalExcludingGstForTaxable = taxablePartAfterDiscount / (1 + gstRate);
    const gstAmount = taxablePartAfterDiscount - subtotalExcludingGstForTaxable;

    // Subtotal in UI usually means (ZeroTaxTotal + BaseTaxableTotal)
    // But since tax is inclusive, let's just use grandTotalValue - gstAmount for subtotal logic
    const subtotalValue = grandTotalValue - gstAmount;

    return { subtotal: subtotalValue, gstAmount, grandTotal: grandTotalValue, subtotalNoDiscount, loyaltyDiscount };
  };

  const { subtotal, gstAmount, grandTotal, subtotalNoDiscount, loyaltyDiscount } = calculateTotals();
  const balance = typeof paidAmount === 'number' ? paidAmount - grandTotal : -grandTotal;

  // Get top 18 products for home screen display
  const topProducts = getTopProducts(18);
  const favoriteProducts = products.filter(p => favoriteProductIds.includes(p.id));

  // When searching, search across ALL products. When not searching, show top 18
  const displayProducts = searchTerm
    ? products.filter(product =>
      product.name_dv.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.name_en.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.barcode.includes(searchTerm) ||
      product.item_code.toLowerCase().includes(searchTerm.toLowerCase())
    )
    : topProducts;

  const handleCashCheckout = () => {
    setPaidAmount(grandTotal); // Default to total amount
    setIsCashDialogOpen(true);
  };

  const handleCreditCheckout = () => {
    setCreditDialogStep(1); // Reset to selection step
    setIsCreditDialogOpen(true);
  };

  const handleSplitBill = () => {
    setSplitAmountTotal(grandTotal);
    setSplitStep(1);
    setSelectedSplitCustomerIds([]);
    setIsSplitDialogOpen(true);
  };

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
    setSales(prevSales => [...prevSales, newSale]);

    // Loyalty Logic
    if (activeCart.customer) {
      if (pointsToRedeem > 0) {
        redeemLoyaltyPoints(activeCart.customer.id, pointsToRedeem);
      }
      const pointsEarned = Math.floor(grandTotal / 100); // 1 point per 100 spent
      if (pointsEarned > 0) {
        awardLoyaltyPoints(activeCart.customer.id, pointsEarned);
        showSuccess(t('loyalty_points_earned', { count: pointsEarned }));
      }
    }

    showSuccess(t('cash_payment_successful'));

    // Handle printing
    if (settings.printing.printMode === 'auto') {
      handlePrintReceipt(newSale);
    } else if (settings.printing.printMode === 'ask') {
      setLastSaleForPrint(newSale);
      setIsPrintConfirmDialogOpen(true);
    }

    // Auto clear cart
    clearActiveCart();

    setPaidAmount(0); // Reset paid amount
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
    setSales(prevSales => [...prevSales, newSale]);

    // Loyalty Logic
    if (activeCart.customer) {
      if (pointsToRedeem > 0) {
        redeemLoyaltyPoints(activeCart.customer.id, pointsToRedeem);
      }

      // Update Customer Outstanding Balance
      updateCustomerBalance(activeCart.customer.id, grandTotal);

      const pointsEarned = Math.floor(grandTotal / 100);
      if (pointsEarned > 0) {
        awardLoyaltyPoints(activeCart.customer.id, pointsEarned);
        showSuccess(t('loyalty_points_earned', { count: pointsEarned }));
      }
    }

    showSuccess(t('credit_sale_successful'));

    // Handle printing
    if (settings.printing.printMode === 'auto') {
      handlePrintReceipt(newSale);
    } else if (settings.printing.printMode === 'ask') {
      setLastSaleForPrint(newSale);
      setIsPrintConfirmDialogOpen(true);
    }

    // Auto clear cart
    clearActiveCart();

    setIsCreditDialogOpen(false);
  };

  const processSplitPayment = () => {
    const totalSplit = splitEntries.reduce((sum, entry) => sum + entry.amount, 0);
    if (Math.abs(totalSplit - grandTotal) > 0.01) {
      showError(t('total_mismatch_error'));
      return;
    }

    if (splitEntries.some(entry => !entry.customerId)) {
      showError(t('select_customer_for_credit_error'));
      return;
    }

    // Create a sale for each split part
    const newSales: Sale[] = splitEntries.map((entry, index) => {
      const customer = customers.find(c => c.id === entry.customerId);

      // Update customer balance for each credit split
      if (customer) {
        updateCustomerBalance(customer.id, entry.amount);
      }

      return {
        id: `sale-${Date.now()}-${index}`,
        date: new Date().toISOString().split('T')[0],
        customer: customer || null,
        items: activeCart.items, // Same items for all
        grandTotal: entry.amount,
        paymentMethod: 'credit' as const,
      };
    });

    setSales(prevSales => [...prevSales, ...newSales]);
    showSuccess(t('credit_sale_successful'));

    // Auto clear cart
    clearActiveCart();
    setIsSplitDialogOpen(false);
  };

  const goToSplitStep2 = () => setSplitStep(2);
  const goToSplitStep3 = () => {
    if (selectedSplitCustomerIds.length < 2) {
      showError("Please select at least 2 customers");
      return;
    }
    const equalAmount = Number((splitAmountTotal / selectedSplitCustomerIds.length).toFixed(2));
    const entries = selectedSplitCustomerIds.map((cid, i) => ({
      id: `split-${Date.now()}-${i}`,
      customerId: cid,
      amount: i === selectedSplitCustomerIds.length - 1
        ? Number((splitAmountTotal - (equalAmount * (selectedSplitCustomerIds.length - 1))).toFixed(2))
        : equalAmount
    }));
    setSplitEntries(entries);
    setSplitStep(3);
  };

  const toggleSplitCustomer = (cid: string) => {
    setSelectedSplitCustomerIds(prev =>
      prev.includes(cid) ? prev.filter(id => id !== cid) : [...prev, cid]
    );
  };

  const updateSplitEntryAmount = (id: string, amount: number) => {
    setSplitEntries(prev => prev.map(e => e.id === id ? { ...e, amount } : e));
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
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-50 font-faruma" dir="rtl">
      <div className="flex flex-1 flex-col lg:flex-row p-4 gap-4">
        {/* Products Section */}
        <Card className="flex-1 lg:w-2/3 flex flex-col">
          <CardHeader>
            <CardTitle className="text-right text-xl">{renderBoth('products')}</CardTitle>
            <Input
              ref={searchInputRef}
              placeholder={renderBothString('search_products')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={handleFocus}
              className="mt-2 text-right"
              dir="rtl"
            />
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden">
            <ScrollArea className="h-full pr-4">
              {favoriteProducts.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-right text-lg font-semibold mb-3 flex items-center justify-end border-b pb-2">
                    {renderBoth('favorite_products')} <Heart className="h-5 w-5 mr-2 text-red-500 fill-red-500" />
                  </h3>
                  <ScrollArea className="h-[235px] pr-4" dir="rtl">
                    <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 py-1">
                      {favoriteProducts.map((product) => {
                        const isLowStock = product.stock_shop < LOW_STOCK_THRESHOLD;
                        return (
                          <Card
                            key={product.id}
                            className={cn(
                              "cursor-pointer hover:shadow-lg transition-all duration-200 border-2 group h-[105px]",
                              isLowStock ? "border-red-500 bg-red-50 dark:bg-red-900/10" : "border-red-200 hover:border-red-400"
                            )}
                            onClick={() => handleProductSelection(product)}
                          >
                            <CardContent className="p-2 flex flex-col items-center text-center h-full justify-center">
                              <img src={product.image} alt={product.name_dv} className="w-10 h-10 object-cover mb-1 rounded-sm group-hover:scale-110 transition-transform" />
                              <p className={cn("font-bold text-[11px] truncate w-full text-gray-900 dark:text-white leading-tight", isLowStock && "text-red-700 dark:text-red-400")}>{product.name_dv}</p>
                              <p className={cn("text-[10px] font-black mt-0.5", isLowStock ? "text-red-800" : "text-primary")}>{settings.shop.currency} {product.price.toFixed(2)}</p>
                              {isLowStock && <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 px-1 text-[8px]">Low Stock</Badge>}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </div>
              )}

              <div className="mb-4">
                <h3 className="text-right text-lg font-semibold mb-3 flex items-center justify-end border-b pb-2">
                  {renderBoth('top_sold_items')} <PlusCircle className="h-5 w-5 mr-2 text-blue-500" />
                </h3>
                <ScrollArea className="h-[235px] pr-4" dir="rtl">
                  <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 py-1">
                    {displayProducts.map((product) => {
                      const isLowStock = product.stock_shop < LOW_STOCK_THRESHOLD;
                      return (
                        <Card
                          key={product.id}
                          className={cn(
                            "cursor-pointer hover:shadow-lg transition-shadow duration-200 group h-[105px]",
                            isLowStock ? "border-red-500 bg-red-50 dark:bg-red-900/10" : "border-gray-200"
                          )}
                          onClick={() => handleProductSelection(product)}
                        >
                          <CardContent className="p-2 flex flex-col items-center text-center h-full justify-center">
                            <img src={product.image} alt={product.name_dv} className="w-10 h-10 object-cover mb-1 rounded-sm group-hover:scale-110 transition-transform" />
                            <p className={cn("font-semibold text-[11px] truncate w-full leading-tight", isLowStock && "text-red-700 dark:text-red-400")}>{product.name_dv}</p>
                            <p className={cn("text-[10px] font-bold mt-0.5", isLowStock ? "text-red-800" : "text-blue-600")}>{settings.shop.currency} {product.price.toFixed(2)}</p>
                            {isLowStock && <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 px-1 text-[8px]">Low Stock</Badge>}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Cart and Payment Section */}
        <Card className="lg:w-1/3 flex flex-col h-[calc(100vh-120px)] overflow-hidden">
          <CardHeader className="flex-none pb-2 border-b">
            <div className="flex justify-between items-center mb-2">
              <CardTitle className="text-right text-lg">{renderBoth('cart')}</CardTitle>
              <Button variant="outline" size="sm" onClick={createNewCart} className="flex items-center h-8">
                <PlusCircle className="h-4 w-4 ml-2" /> {renderBoth('add_new_cart')}
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {[...openCarts.values()].map(cart => (
                <div key={cart.id} className="relative">
                  <Button
                    variant={activeCartId === cart.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => switchCart(cart.id)}
                    className={cn("font-faruma h-8 px-3", activeCartId === cart.id ? "bg-primary hover:bg-primary/90" : "")}
                  >
                    {cart.customer ? `${cart.customer.name_dv}` : `${renderBothString('cart')} ${cart.displayNumber}`}
                  </Button>
                  {openCarts.size > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => { e.stopPropagation(); handleRemoveCartClick(cart.id); }}
                      className="absolute -top-1 -left-1 h-4 w-4 rounded-full bg-red-500 text-white hover:bg-red-600 p-0"
                    >
                      <XCircle className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col overflow-hidden p-0">
            <ScrollArea className="flex-1 px-4 py-4">
              {activeCart?.items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                  <ShoppingCart className="h-10 w-10 mb-2 opacity-20" />
                  <p className="text-sm">{renderBoth('cart_empty')}</p>
                </div>
              ) : (
                <div className="space-y-3 pb-4">
                  {activeCart?.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-2 border rounded-md group hover:border-primary/50 transition-colors">
                      <Button variant="ghost" size="sm" onClick={() => removeFromCart(item.id)} className="text-gray-400 hover:text-red-500 p-0 h-auto">
                        <XCircle className="h-4 w-4" />
                      </Button>
                      <div className="flex-1 text-right mr-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-bold text-sm leading-tight">{item.name_dv}</p>
                            <p className="text-[10px] text-gray-500">{item.name_en}</p>
                          </div>
                          {(item.units && item.units.length > 0) ? (
                            <Select
                              value={item.selected_unit || 'Piece'}
                              onValueChange={(val) => updateCartItemUnit(item.id, val)}
                            >
                              <SelectTrigger className="h-6 w-[100px] text-[10px] px-2 py-0">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Piece">Piece</SelectItem>
                                {item.units.map(u => (
                                  <SelectItem key={u.name} value={u.name}>{u.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge variant="outline" className="text-[10px] py-0 h-5 bg-gray-100 text-gray-600 border-gray-200">
                              Piece
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center justify-between mt-2 bg-gray-50 dark:bg-gray-800 p-1 rounded">
                          <div className="text-[10px] text-gray-500">
                            Rate: <span className="font-bold text-gray-700 dark:text-gray-300">{settings.shop.currency} {item.price.toFixed(2)}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center border rounded bg-white dark:bg-black overflow-hidden h-7">
                              <Button variant="ghost" size="icon" className="h-full w-7 rounded-none border-l text-gray-500 hover:text-red-600" onClick={() => updateCartItemQty(item.id, -1)}>-</Button>
                              <Input
                                type="number"
                                value={item.qty}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value) || 0;
                                  if (val >= 0) {
                                    updateActiveCart(prev => ({
                                      ...prev,
                                      items: prev.items.map(i => i.id === item.id ? { ...i, qty: val } : i).filter(i => i.qty > 0)
                                    }));
                                  }
                                }}
                                onFocus={handleFocus}
                                className="w-12 h-full text-center text-xs font-bold border-none focus-visible:ring-0 p-0"
                              />
                              <Button variant="ghost" size="icon" className="h-full w-7 rounded-none border-r text-gray-500 hover:text-green-600" onClick={() => updateCartItemQty(item.id, 1)}>+</Button>
                            </div>
                            <span className="text-sm font-black text-primary min-w-[70px] text-left">
                              {settings.shop.currency} {(item.price * item.qty).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            <div className="flex-none p-4 border-t bg-gray-50 dark:bg-gray-900/50">
              <div className="space-y-1 text-right mb-4">
                {activeCart?.customer && (
                  <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-100 dark:border-blue-800">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">{t('points_available')}</span>
                      <span className="text-sm font-black text-blue-700 dark:text-blue-300">{(activeCart.customer.loyalty_points || 0).toFixed(0)}</span>
                    </div>
                    <Button
                      variant="outline"
                      className="w-full h-8 text-xs font-bold border-blue-200 text-blue-700 hover:bg-blue-100"
                      onClick={() => setIsLoyaltyRedemptionDialogOpen(true)}
                    >
                      {pointsToRedeem > 0 ? (
                        <span className="flex items-center gap-1">
                          Rewards Applied: -{pointsToRedeem} <Heart className="h-3 w-3 fill-current" />
                        </span>
                      ) : (
                        renderBoth('redeem_rewards')
                      )}
                    </Button>
                  </div>
                )}
                <div className="flex justify-between text-xs text-gray-500">
                  <span>{renderBoth('subtotal')}:</span>
                  <span>{settings.shop.currency} {subtotalNoDiscount.toFixed(2)}</span>
                </div>
                {loyaltyDiscount > 0 && (
                  <div className="flex justify-between text-xs text-green-600 font-bold">
                    <span>{t('reward_discount')}:</span>
                    <span>-{settings.shop.currency} {loyaltyDiscount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-xs text-gray-500">
                  <span>GST ({settings.shop.taxRate}%):</span>
                  <span>{settings.shop.currency} {gstAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg pt-1 border-t mt-1">
                  <span>{renderBoth('grand_total')}:</span>
                  <span className="text-primary">{settings.shop.currency} {grandTotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Prominent Grand Total Display */}
              <div className="mb-3 p-4 bg-gradient-to-r from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10 rounded-lg border-2 border-primary/30">
                <div className="text-center">
                  <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 uppercase tracking-wider">
                    {renderBoth('grand_total')}
                  </div>
                  <div className="text-4xl font-black text-primary">
                    {settings.shop.currency} {grandTotal.toFixed(2)}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" className="bg-green-600 hover:bg-green-700 border-none text-white font-faruma h-10 text-xs" onClick={handleCashCheckout}>{renderBoth('cash')}</Button>
                  {settings.shop.enableCardPayment && (
                    <Button variant="outline" className="bg-blue-600 hover:bg-blue-700 border-none text-white font-faruma h-10 text-xs">{renderBoth('card')}</Button>
                  )}
                  <Button variant="outline" className="bg-amber-600 hover:bg-amber-700 border-none text-white font-faruma h-10 text-xs" onClick={handleCreditCheckout}>{renderBoth('credit')}</Button>
                  <Button variant="outline" className="bg-orange-600 hover:bg-orange-700 border-none text-white font-faruma h-10 text-xs" onClick={handleSplitBill}>{renderBoth('split_bill')}</Button>
                </div>
                <Button className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground text-base font-bold font-faruma shadow-lg overflow-hidden flex items-center justify-center" onClick={handleCashCheckout}>
                  {renderBoth('checkout')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cash Payment Dialog */}
      <Dialog open={isCashDialogOpen} onOpenChange={setIsCashDialogOpen}>
        <DialogContent className="sm:max-w-[425px] font-faruma" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right">{renderBoth('cash_payment')}</DialogTitle>
            <DialogDescription className="text-right">
              {renderBoth('enter_paid_amount')}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-3 items-center gap-4">
              <Label htmlFor="totalAmount" className="text-right">
                {renderBoth('grand_total')}
              </Label>
              <Input
                id="totalAmount"
                value={grandTotal.toFixed(2)}
                readOnly
                className="col-span-2 text-right"
              />
            </div>
            <div className="grid grid-cols-3 items-center gap-4">
              <Label htmlFor="paidAmount" className="text-right">
                {renderBoth('paid_amount')}
              </Label>
              <Input
                id="paidAmount"
                type="number"
                value={paidAmount}
                onChange={(e) => setPaidAmount(parseFloat(e.target.value) || '')}
                className="col-span-2 text-right"
                autoFocus
              />
            </div>
            <div className="grid grid-cols-3 items-center gap-4">
              <Label htmlFor="balance" className="text-right">
                {renderBoth('balance')}
              </Label>
              <Input
                id="balance"
                value={balance.toFixed(2)}
                readOnly
                className="col-span-2 text-right"
                style={{ color: balance < 0 ? 'red' : 'green' }}
              />
            </div>
          </div>
          <DialogFooter className="flex justify-between">
            <Button variant="outline" onClick={() => setIsCashDialogOpen(false)} className="font-faruma">
              {renderBoth('cancel')}
            </Button>
            <Button onClick={processCashPayment} className="font-faruma">
              {renderBoth('confirm_payment')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Credit Payment Dialog */}
      <Dialog open={isCreditDialogOpen} onOpenChange={setIsCreditDialogOpen}>
        <DialogContent className="sm:max-w-[500px] font-faruma max-h-[85vh] flex flex-col p-0 overflow-hidden" dir="rtl">
          <DialogHeader className="p-6 pb-2 text-right">
            <DialogTitle className="text-xl">{renderBoth('credit_payment')}</DialogTitle>
            <DialogDescription className="text-sm">
              {creditDialogStep === 1 ? renderBoth('select_or_add_customer_for_credit') : renderBoth('review_and_confirm_payment')}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-4 flex-1 overflow-hidden">
            {creditDialogStep === 1 ? (
              <>
                <div className="px-6 relative">
                  <Search className="absolute right-9 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder={renderBothString('search_customers')}
                    value={customerSearchTerm}
                    onChange={(e) => setCustomerSearchTerm(e.target.value)}
                    onFocus={handleFocus}
                    className="pr-10 text-right"
                    dir="rtl"
                  />
                </div>

                <ScrollArea className="flex-1 mx-6 border rounded-md p-2">
                  <div className="space-y-2">
                    {customers.filter(c =>
                      c.name_dv.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
                      c.name_en.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
                      c.code.toLowerCase().includes(customerSearchTerm.toLowerCase())
                    ).map((customer) => (
                      <div
                        key={customer.id}
                        onClick={() => {
                          updateActiveCartCustomer(customer.id);
                          setCreditDialogStep(2);
                        }}
                        className={cn(
                          "p-3 rounded-md cursor-pointer transition-colors text-right flex justify-between items-center group",
                          "hover:bg-gray-100 dark:hover:bg-gray-800 border"
                        )}
                      >
                        <div>
                          <p className="font-semibold">{customer.name_dv} ({customer.name_en})</p>
                          <p className="text-xs opacity-80">Code: {customer.code}</p>
                          <p className="text-xs opacity-80">Credit Limit: {settings.shop.currency} {customer.credit_limit.toFixed(2)}</p>
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button size="sm" variant="ghost" className="h-6 w-6"><ArrowLeft className="h-4 w-4" /></Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </>
            ) : (
              <div className="space-y-4 px-6 overflow-y-auto">
                {/* Step 2: Review & Pay */}
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg text-right">
                  <p className="text-sm text-gray-500">{renderBoth('customer')}</p>
                  <p className="font-bold text-lg">{activeCart?.customer?.name_dv}</p>
                  <p className="text-xs text-gray-500">{activeCart?.customer?.name_en} | {activeCart?.customer?.code}</p>
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="flex justify-between items-center mb-4">
                    <div className="text-right">
                      <p className="text-xs font-bold uppercase tracking-wider text-blue-600">{t('points_available')}</p>
                      <p className="text-xl font-black text-blue-700">{(activeCart?.customer?.loyalty_points || 0).toFixed(0)}</p>
                    </div>
                    <div>
                      {activeCart?.customer && activeCart.customer.loyalty_points >= 50 ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-blue-200 text-blue-700 hover:bg-blue-100"
                          onClick={() => setIsLoyaltyRedemptionDialogOpen(true)}
                        >
                          {pointsToRedeem > 0 ? (
                            <span className="flex items-center gap-1 font-bold">
                              Applied: -{pointsToRedeem} <Heart className="h-3 w-3 fill-current" />
                            </span>
                          ) : (
                            renderBoth('redeem_rewards')
                          )}
                        </Button>
                      ) : (
                        <div className="text-xs text-orange-500 text-right font-medium px-2 py-1 bg-orange-50 rounded">
                          Needs 50 points to redeem<br />
                          (Current: {(activeCart?.customer?.loyalty_points || 0).toFixed(0)})
                        </div>
                      )}
                    </div>
                  </div>

                  <Separator className="my-2" />

                  <div className="space-y-1 text-sm text-right">
                    <div className="flex justify-between text-gray-500">
                      <span>{renderBoth('subtotal')}:</span>
                      <span>{settings.shop.currency} {subtotalNoDiscount.toFixed(2)}</span>
                    </div>
                    {loyaltyDiscount > 0 && (
                      <div className="flex justify-between text-green-600 font-bold">
                        <span>{t('discount')}:</span>
                        <span>-{settings.shop.currency} {loyaltyDiscount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-black text-lg pt-2 border-t mt-2">
                      <span>{renderBoth('grand_total')}:</span>
                      <span className="text-primary">{settings.shop.currency} {grandTotal.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="p-6 pt-2 border-t flex justify-between gap-2">
            {creditDialogStep === 2 ? (
              <>
                <Button variant="outline" onClick={() => setCreditDialogStep(1)} className="font-faruma flex flex-col items-center justify-center gap-1 h-auto py-2 px-3 min-w-[130px] leading-tight text-center">
                  <ArrowLeft className="h-4 w-4" />
                  <span className="text-[9px] font-bold">{renderBoth('change_customer')}</span>
                </Button>
                <Button onClick={processCreditPayment} className="font-faruma flex-1 bg-amber-600 hover:bg-amber-700 text-white">
                  {renderBoth('confirm_credit_sale')}
                </Button>
              </>
            ) : (
              <Button variant="outline" onClick={() => setIsCreditDialogOpen(false)} className="font-faruma w-full">
                {renderBoth('cancel')}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <LoyaltyRedemptionDialog
        isOpen={isLoyaltyRedemptionDialogOpen}
        onClose={() => setIsLoyaltyRedemptionDialogOpen(false)}
        availablePoints={activeCart?.customer?.loyalty_points || 0}
        maxRedeemableAmount={subtotalNoDiscount}
        onRedeem={(points) => {
          setPointsToRedeem(points);
          showSuccess(t('points_redeemed', { count: points }));
        }}
      />

      <Dialog open={isConfirmRemoveCartDialogOpen} onOpenChange={setIsConfirmRemoveCartDialogOpen}>
        <DialogContent className="sm:max-w-[400px] font-faruma" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right">{renderBoth('close_cart')}</DialogTitle>
            <DialogDescription className="text-right">
              {renderBoth('confirm_close_cart_action')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex justify-between gap-2">
            <Button variant="outline" onClick={() => setIsConfirmRemoveCartDialogOpen(false)} className="flex-1">
              {renderBoth('cancel')}
            </Button>
            <Button variant="destructive" onClick={confirmRemoveCart} className="flex-1">
              {renderBoth('confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isExpiryDialogOpen} onOpenChange={setIsExpiryDialogOpen}>
        <DialogContent className="sm:max-w-[450px] font-faruma text-right p-0 overflow-hidden" dir="rtl">
          <div className="p-6">
            <DialogHeader className="pb-4 text-right">
              <DialogTitle className="text-xl text-orange-600 flex items-center justify-center gap-2 px-0 w-full text-center">
                <PlusCircle className="h-6 w-6" /> {renderBoth('near_expiry_alert')}
              </DialogTitle>
              <DialogDescription className="text-gray-600 mt-2 break-words text-sm leading-relaxed text-right">
                {t('product_nearing_expiry', { name: selectedProductForExpiry?.name_dv })}
                <div className="mt-4 font-bold text-gray-900 border-t pt-4">
                  {t('apply_expiry_discount_question')}
                </div>
              </DialogDescription>
            </DialogHeader>
            <div className="bg-orange-50 border border-orange-100 p-4 rounded-xl my-4 shadow-sm">
              <p className="text-xs font-black text-orange-800 uppercase tracking-tighter mb-3 border-b border-orange-200 pb-2">
                {t('auto_discount_notice')}: 10% OFF
              </p>
              <div className="text-xs text-orange-700 space-y-2">
                <div className="flex justify-between items-center bg-white/60 px-3 py-2 rounded-lg">
                  <span className="font-mono text-sm">{settings.shop.currency} {selectedProductForExpiry?.price.toFixed(2)}</span>
                  <span className="opacity-60 font-bold uppercase tracking-widest text-[9px]">Original Price</span>
                </div>
                <div className="flex justify-between items-center bg-orange-200/40 px-3 py-2 rounded-lg font-black border border-orange-200">
                  <span className="text-orange-900 text-sm font-mono">{settings.shop.currency} {(selectedProductForExpiry ? selectedProductForExpiry.price * 0.9 : 0).toFixed(2)}</span>
                  <span className="text-[9px] uppercase tracking-widest">New Price</span>
                </div>
              </div>
            </div>
            <DialogFooter className="flex flex-row-reverse justify-between gap-4 mt-6">
              <Button onClick={confirmExpiryDiscount} className="flex-1 h-12 bg-orange-600 hover:bg-orange-700 text-white font-bold shadow-lg text-sm">
                {renderBoth('apply_discount')}
              </Button>
              <Button variant="outline" onClick={() => { setIsExpiryDialogOpen(false); if (selectedProductForExpiry) addToCart(selectedProductForExpiry); }} className="flex-1 h-12 text-sm">
                {renderBoth('no_discount')}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Split Bill Dialog */}
      <Dialog open={isSplitDialogOpen} onOpenChange={setIsSplitDialogOpen}>
        <DialogContent className="sm:max-w-[550px] font-faruma max-h-[90vh] flex flex-col p-0 overflow-hidden" dir="rtl">
          <DialogHeader className="p-6 pb-2 text-right">
            <DialogTitle className="text-xl flex items-center justify-end gap-2">
              <PlusCircle className="h-5 w-5 text-orange-500" /> {renderBoth('split_bill')}
            </DialogTitle>
            <DialogDescription className="text-right">
              {splitStep === 1 && renderBoth('select_customers_for_split')}
              {splitStep === 2 && renderBoth('review_split_amounts')}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-hidden p-6 pt-0">
            {splitStep === 1 ? (
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder={renderBothString('search_customers')}
                    value={customerSearchTerm}
                    onChange={(e) => setCustomerSearchTerm(e.target.value)}
                    className="pr-10 text-right"
                  />
                </div>
                <ScrollArea className="h-[300px] border rounded-md p-2">
                  <div className="space-y-2">
                    {customers.filter(c =>
                      c.name_dv.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
                      c.name_en.toLowerCase().includes(customerSearchTerm.toLowerCase())
                    ).map((customer) => (
                      <div
                        key={customer.id}
                        onClick={() => toggleSplitCustomer(customer.id)}
                        className={cn(
                          "p-3 rounded-md cursor-pointer transition-colors text-right flex justify-between items-center border",
                          selectedSplitCustomerIds.includes(customer.id) ? "bg-primary/10 border-primary" : "hover:bg-gray-50"
                        )}
                      >
                        <div className={cn("h-4 w-4 rounded border flex items-center justify-center", selectedSplitCustomerIds.includes(customer.id) ? "bg-primary border-primary" : "bg-white")}>
                          {selectedSplitCustomerIds.includes(customer.id) && <div className="h-2 w-2 bg-white rounded-full" />}
                        </div>
                        <div>
                          <p className="font-semibold">{customer.name_dv}</p>
                          <p className="text-xs opacity-60">{customer.name_en}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-primary/5 p-4 rounded-lg text-center">
                  <p className="text-sm opacity-60 uppercase tracking-widest font-black">{renderBoth('total_to_split')}</p>
                  <p className="text-2xl font-black text-primary">{settings.shop.currency} {splitAmountTotal.toFixed(2)}</p>
                </div>
                <ScrollArea className="h-[300px] pr-2">
                  <div className="space-y-3">
                    {splitEntries.map((entry) => {
                      const customer = customers.find(c => c.id === entry.customerId);
                      return (
                        <div key={entry.id} className="p-4 border rounded-lg bg-white dark:bg-gray-800">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-bold text-gray-500">Amount</span>
                            <span className="font-bold text-sm">{customer?.name_dv}</span>
                          </div>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs opacity-40 font-mono">{settings.shop.currency}</span>
                            <Input
                              type="number"
                              value={entry.amount}
                              onChange={(e) => updateSplitEntryAmount(entry.id, parseFloat(e.target.value) || 0)}
                              className="text-left font-mono h-10 pl-10"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
                <div className={cn(
                  "p-3 rounded-lg text-center text-xs font-bold transition-colors",
                  Math.abs(splitEntries.reduce((sum, e) => sum + e.amount, 0) - splitAmountTotal) < 0.01
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                )}>
                  Remaining: {settings.shop.currency} {(splitAmountTotal - splitEntries.reduce((sum, e) => sum + e.amount, 0)).toFixed(2)}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="p-6 pt-2 border-t flex justify-between gap-3">
            <Button variant="outline" onClick={() => setIsSplitDialogOpen(false)} className="flex-1 h-12">
              {renderBoth('cancel')}
            </Button>
            {splitStep === 1 ? (
              <Button onClick={goToSplitStep3} disabled={selectedSplitCustomerIds.length < 2} className="flex-1 h-12 bg-primary">
                {renderBoth('next')}
              </Button>
            ) : (
              <Button onClick={processSplitPayment} disabled={Math.abs(splitEntries.reduce((sum, e) => sum + e.amount, 0) - splitAmountTotal) > 0.01} className="flex-1 h-12 bg-green-600 hover:bg-green-700">
                {renderBoth('confirm_split_payment')}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default POS;