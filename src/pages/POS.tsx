"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ShoppingCart, PlusCircle, Minus, Trash2, MonitorPlay, Search, UserPlus, ArrowRightLeft, CreditCard, Receipt, Users, AlertTriangle, User, DollarSign, XCircle, Heart, ArrowLeft, Plus, ChevronDown, Boxes, X, CheckCircle2, Package, Loader2 } from 'lucide-react';
import { formatDate, toISODate, toISODatetime, formatTime, formatDateTime } from '@/utils/formatters';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useAppContext, Product, Customer, CartItem, Sale } from '@/context/AppContext';
import { showSuccess, showError } from '@/utils/toast';
import LoyaltyRedemptionDialog from '@/components/LoyaltyRedemptionDialog';
import UnitSelectionDialog from '@/components/UnitSelectionDialog';
import CustomerAddDialog from '@/components/CustomerAddDialog';
import { Badge } from '@/components/ui/badge';
import { Progress } from "@/components/ui/progress";
import { printContent } from '@/utils/printHelper';
import { getAdaptedImageUrl } from '@/utils/imageUtils';

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
    convertAllPendingToCredit,
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

  const focusSearchBar = () => {
    setTimeout(() => {
      if (searchInputRef.current) {
        searchInputRef.current.focus();
        searchInputRef.current.select();
      }
    }, 60);
  };

  const LOW_STOCK_THRESHOLD = 10;
  const NEAR_EXPIRY_DAYS = 30;

  useEffect(() => {
    focusSearchBar();
  }, [activeCartId]);

  useEffect(() => {
    focusSearchBar();
  }, []);

  useEffect(() => {
    localStorage.setItem('pos_active', 'true');
    window.dispatchEvent(new Event('storage'));
    return () => {
      localStorage.setItem('pos_active', 'false');
      window.dispatchEvent(new Event('storage'));
    };
  }, []);

  const isAnyModalOpen = isCashDialogOpen || isCreditDialogOpen || isSplitDialogOpen || 
                         isAwaitingTransferDialogOpen || isPendingTransfersDialogOpen || 
                         isExpiryDialogOpen || isConfirmRemoveCartDialogOpen || 
                         isLoyaltyRedemptionDialogOpen || isUnitSelectionDialogOpen || 
                         isAddCustomerDialogOpen || isPrintConfirmDialogOpen;
  const isAnyModalOpenRef = useRef(isAnyModalOpen);
  useEffect(() => {
    isAnyModalOpenRef.current = isAnyModalOpen;
  }, [isAnyModalOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' && document.activeElement !== searchInputRef.current) {
        if (e.key === 'Escape') {
          (document.activeElement as HTMLElement).blur();
        }
        return;
      }

      if (isAnyModalOpenRef.current) {
        if (e.key === 'Escape') {
          setIsCashDialogOpen(false);
          setIsCreditDialogOpen(false);
          setIsSplitDialogOpen(false);
          setIsAwaitingTransferDialogOpen(false);
          setIsPendingTransfersDialogOpen(false);
          setIsExpiryDialogOpen(false);
          setIsConfirmRemoveCartDialogOpen(false);
          setIsPrintConfirmDialogOpen(false);
        }
        return;
      }

      if (e.key === 'Enter') {
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
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase();
      const strippedTerm = term.replace(/^0+/, '');
      let matchedUnit: string | undefined = undefined;

      const exactMatch = products.find(p => {
        if (
          p.barcode === searchTerm.trim() ||
          p.item_code.toLowerCase() === term ||
          (strippedTerm && p.item_code.replace(/^0+/, '') === strippedTerm)
        ) {
          return true;
        }
        // Match unit-level barcode (e.g. barcode printed on Box/Case)
        const foundUnit = p.units?.find(u => u.barcode && u.barcode.trim() === searchTerm.trim());
        if (foundUnit) {
          matchedUnit = foundUnit.name;
          return true;
        }
        return false;
      });

      if (exactMatch) {
        if (matchedUnit) {
          addToCart(exactMatch, 1, matchedUnit);
        } else {
          handleProductSelection(exactMatch);
        }
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
    // Immediately clear search if product was searched
    if (searchTerm) {
      setSearchTerm('');
    }

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

    // Add with default unit (Piece) directly to cart - unit can be switched anytime in the cart
    addToCart(product);
    focusSearchBar();
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

    focusSearchBar();
  };

  const handleUnitSelection = (unit: string) => {
    if (productForUnitSelection) {
      addToCart(productForUnitSelection, 1, unit);
      setIsUnitSelectionDialogOpen(false);
      setProductForUnitSelection(null);
      focusSearchBar();
    }
  };

  const confirmExpiryDiscount = () => {
    if (selectedProductForExpiry) {
      const discountFactor = (100 - expiryDiscountPercent) / 100;
      addToCart(selectedProductForExpiry, discountFactor);
      setIsExpiryDialogOpen(false);
      setSelectedProductForExpiry(null);
      showSuccess(t('expiry_discount_applied'));
      focusSearchBar();
    }
  };

  const switchCartItemUnit = (item: CartItem, newUnitName: string) => {
    const currentUnit = item.selected_unit || 'Piece';
    if (currentUnit === newUnitName) return;

    const product = products.find(p => p.id === item.id);
    if (!product) return;

    let newPrice = product.price;
    let newConversion = 1;

    if (newUnitName !== 'Piece') {
      const unit = product.units?.find(u => u.name === newUnitName);
      if (unit) {
        newPrice = unit.price;
        newConversion = unit.conversion_factor;
      }
    }

    updateActiveCart(prevCart => {
      const targetExisting = prevCart.items.find(
        i => i.id === item.id && (i.selected_unit || 'Piece') === newUnitName
      );

      if (targetExisting) {
        // Merge quantities and remove previous unit line
        return {
          ...prevCart,
          items: prevCart.items
            .map(i => {
              if (i.id === item.id && (i.selected_unit || 'Piece') === newUnitName) {
                return { ...i, qty: i.qty + item.qty };
              }
              return i;
            })
            .filter(i => !(i.id === item.id && (i.selected_unit || 'Piece') === currentUnit))
        };
      } else {
        // Update unit in-place
        return {
          ...prevCart,
          items: prevCart.items.map(i => {
            if (i.id === item.id && (i.selected_unit || 'Piece') === currentUnit) {
              return {
                ...i,
                selected_unit: newUnitName,
                price: newPrice,
                unit_price: newPrice,
                unit_conversion: newConversion
              };
            }
            return i;
          })
        };
      }
    });

    showSuccess(t('unit_switched_to', { defaultValue: `Unit switched to ${newUnitName}` }));
  };

  const updateCartItemQty = (id: string, delta: number, selectedUnit?: string) => {
    const unitName = selectedUnit || 'Piece';
    updateActiveCart(prevCart => ({
      ...prevCart,
      items: prevCart.items.map((item) =>
        item.id === id && (item.selected_unit || 'Piece') === unitName
          ? { ...item, qty: Math.max(0, item.qty + delta) }
          : item
      ).filter(item => item.qty > 0),
    }));
  };

  const setCartItemQty = (id: string, qty: number, selectedUnit?: string) => {
    const unitName = selectedUnit || 'Piece';
    updateActiveCart(prevCart => ({
      ...prevCart,
      items: prevCart.items.map((item) =>
        item.id === id && (item.selected_unit || 'Piece') === unitName
          ? { ...item, qty: Math.max(0, qty) }
          : item
      ).filter(item => item.qty > 0),
    }));
  };

  const removeFromCart = (id: string, selectedUnit?: string) => {
    const unitName = selectedUnit || 'Piece';
    updateActiveCart(prevCart => ({
      ...prevCart,
      items: prevCart.items.filter(item => !(item.id === id && (item.selected_unit || 'Piece') === unitName)),
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

  useEffect(() => {
    if (activeCart) {
      try {
        const syncData = JSON.stringify({
          cart: activeCart,
          totals: {
            subtotal,
            gstAmount,
            grandTotal,
            subtotalNoDiscount,
            loyaltyDiscount
          },
          timestamp: Date.now()
        });
        localStorage.setItem('customer_display_sync', syncData);
      } catch (error) {
        console.error("Failed to sync customer display:", error);
        localStorage.setItem('customer_display_sync_error', String(error));
      }
    }
  }, [activeCart, subtotal, gstAmount, grandTotal, subtotalNoDiscount, loyaltyDiscount]);

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
    if (!finalPaidAmount) {
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
      const recordedSale = await addSale(newSale);

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
      setLastSaleForPrint(recordedSale);
      if (settings.printing.printMode === 'auto') {
        handlePrintReceipt(recordedSale);
      }
      clearActiveCart();
      setPaidAmount(0);
      setIsCashDialogOpen(false);
      focusSearchBar();
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
      const recordedSale = await addSale(newSale);

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
      setLastSaleForPrint(recordedSale);
      if (settings.printing.printMode === 'auto') {
        handlePrintReceipt(recordedSale);
      }
      clearActiveCart();
      setIsCreditDialogOpen(false);
      focusSearchBar();
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
      date: toISODatetime(),
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
          ${item.name_dv}${item.selected_unit && item.selected_unit !== 'Piece' ? ` (${item.selected_unit})` : ''}<br/><small>${item.name_en}${item.selected_unit && item.selected_unit !== 'Piece' ? ` (${item.selected_unit})` : ''}</small>
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
      const recordedSale = await addSale(newSale);

      for (const entry of splitEntries) {
        if (entry.method === 'Credit' && entry.customerId) {
          await updateCustomerBalance(entry.customerId, entry.amount);
        }
      }

      showSuccess(t('split_payment_successful'));
      setLastSaleForPrint(recordedSale);
      if (settings.printing.printMode === 'auto') {
        handlePrintReceipt(recordedSale);
      }
      clearActiveCart();
      setIsSplitDialogOpen(false);
      setSplitEntries([{ id: '1', amount: 0, method: 'Cash' }]);
      focusSearchBar();
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
    <div className="flex h-screen overflow-hidden bg-background font-faruma selection:bg-primary/30 text-foreground" dir="rtl">
      <div className="flex-1 flex flex-col min-w-0">
        <div className="h-20 px-8 flex items-center justify-between border-b border-border bg-background/50 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              className="hidden md:flex items-center gap-2 border-primary/20 text-primary hover:bg-primary/10 rounded-xl h-10 text-[10px] font-black"
              onClick={() => window.open('/customer-display', '_blank')}
            >
              <MonitorPlay className="h-4 w-4" />
              CUSTOMER DISPLAY
            </Button>
            <div className="flex items-center gap-2">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-[180px] h-10 rounded-xl bg-muted border-border text-[10px] font-black uppercase text-foreground">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border text-foreground font-faruma">
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
                "h-10 w-10 rounded-xl border border-border transition-all",
                showFavoritesOnly ? "bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30" : "bg-muted hover:bg-muted/80 text-muted-foreground"
              )}
            >
              <Heart className={cn("h-4 w-4", showFavoritesOnly ? "fill-current text-yellow-500" : "text-muted-foreground")} />
            </Button>
          </div>

          <div className="flex-1 max-w-xl mx-8">
            <div className="relative">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
              <Input
                ref={searchInputRef}
                placeholder="...Search by name, code or barcode"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-muted border-border rounded-xl px-10 text-right font-bold h-11 focus:border-primary/50 focus:ring-0 transition-all placeholder:text-foreground/10 text-foreground"
                dir="rtl"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    searchInputRef.current?.focus();
                  }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-muted-foreground/10 transition-colors"
                  title="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsPendingTransfersDialogOpen(true)}
              className="relative h-11 w-11 rounded-xl bg-muted border border-border hover:bg-yellow-500/20 hover:text-yellow-500 text-muted-foreground"
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
                'bg-[#A0D3E8]/30 text-[#004B87] border-[#A0D3E8]/60 dark:bg-[#1E293B] dark:text-[#F1F5F9] dark:border-[#475569]',
                'bg-[#F5F5F5] text-[#004B87] border-[#A0D3E8]/40 dark:bg-[#0F172A] dark:text-[#F1F5F9] dark:border-[#334155]',
                'bg-white text-[#004B87] border-[#A0D3E8]/50 dark:bg-[#334155] dark:text-[#F1F5F9] dark:border-[#475569]',
                'bg-[#A0D3E8]/45 text-[#004B87] border-[#A0D3E8]/70 dark:bg-[#1E293B] dark:text-[#94A3B8] dark:border-[#334155]',
                'bg-[#F5F5F5] text-[#6C757D] border-[#6C757D]/30 dark:bg-[#0F172A] dark:text-[#94A3B8] dark:border-[#475569]',
                'bg-[#004B87]/10 text-[#004B87] border-[#004B87]/20 dark:bg-[#334155] dark:text-[#94A3B8] dark:border-[#334155]',
              ];
              const colorClass = cardColors[Math.abs(product.id.split('').reduce((a, b) => a + b.charCodeAt(0), 0)) % cardColors.length];
              const adaptedImage = getAdaptedImageUrl(product.image, product.name_en || product.name_dv, product.item_code);

              return (
                <div
                  key={product.id}
                  onClick={() => handleProductSelection(product)}
                  className="group bg-card hover:bg-muted/50 dark:hover:bg-[#334155]/60 border border-border rounded-xl p-2 transition-all cursor-pointer relative"
                >
                  <div className={cn(
                    "aspect-square rounded-lg mb-2 flex items-center justify-center overflow-hidden relative border border-border",
                    product.image ? "bg-muted/30" : colorClass
                  )}>
                    {product.image ? (
                      <img src={adaptedImage} alt={product.name_dv} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 dark:opacity-100 opacity-95" />
                    ) : (
                      <div className="font-black text-lg uppercase tracking-tighter text-center px-2 leading-tight drop-shadow-sm">
                        {product.name_en}
                      </div>
                    )}
                    {isLowStock && (
                      <Badge className="absolute top-2 right-2 bg-red-500 text-foreground border-none text-[8px] font-black px-1.5 py-0 rounded-full shadow-lg uppercase tracking-widest">
                        LOW
                      </Badge>
                    )}
                  </div>

                  <div className="text-center px-1">
                    <h3 className="text-xs font-black text-foreground leading-tight truncate mb-0.5">{product.name_dv}</h3>
                    <p className="text-[8px] font-bold text-foreground/30 truncate uppercase tracking-widest mb-2">{product.name_en}</p>

                    <div className="flex items-center justify-center gap-1.5">
                      <span className="text-[11px] font-black text-primary leading-none">{settings.shop.currency} {product.price.toFixed(2)}</span>
                      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-foreground scale-0 group-hover:scale-100 transition-transform shadow-[0_0_15px_rgba(0,132,255,0.5)]">
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

      <div className="w-[600px] flex flex-col bg-card/80 backdrop-blur-xl border-l border-border shadow-2xl z-20">
        <div className="p-6 pb-2">
          <div className="flex items-center gap-1 bg-muted p-1 rounded-2xl border border-border mb-6">
            <div className="flex items-center gap-3 px-4 py-1.5 bg-primary/20 rounded-xl text-primary border border-primary/20">
              <ShoppingCart className="h-4 w-4" />
              <div className="flex flex-col items-start leading-none gap-0.5">
                <span className="text-[8px] font-black uppercase text-primary/60 tracking-tighter">(Cart)</span>
                <span className="text-[10px] font-black">{t('cart')}</span>
              </div>
            </div>

            <div className="w-px h-8 bg-muted/80 mx-1" />

            <Button
              onClick={createNewCart}
              variant="ghost"
              className="h-10 px-4 text-foreground hover:bg-muted/80 rounded-xl flex items-center gap-3 group transition-all"
            >
              <PlusCircle className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
              <div className="flex flex-col items-end leading-none gap-0.5">
                <span className="text-[10px] font-black">{t('add_new_cart')}</span>
                <span className="text-[8px] font-black uppercase text-foreground/30 tracking-tighter">(Add New Cart)</span>
              </div>
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 mb-3">
            {[...openCarts.values()].map(cart => {
              const isActive = activeCartId === cart.id;
              const customerName = cart.customer ? (cart.customer.name_dv || cart.customer.name_en) : null;
              return (
                <div key={cart.id} className="relative group">
                  <Button
                    variant={isActive ? "default" : "outline"}
                    size="sm"
                    onClick={() => switchCart(cart.id)}
                    className={cn(
                      "h-9 px-3.5 text-xs font-black rounded-xl transition-all flex items-center gap-2",
                      isActive
                        ? "bg-primary text-white shadow-[0_0_15px_rgba(0,132,255,0.4)] ring-2 ring-primary/40 border-primary"
                        : "bg-muted/70 border-border text-foreground/80 hover:text-foreground hover:bg-muted"
                    )}
                  >
                    <span>Cart #{cart.displayNumber}</span>
                    {customerName && (
                      <span className={cn(
                        "max-w-[90px] truncate text-[10px] px-1.5 py-0.5 rounded-md font-medium",
                        isActive ? "bg-white/20 text-white" : "bg-primary/10 text-primary"
                      )}>
                        {customerName}
                      </span>
                    )}
                  </Button>
                  {openCarts.size > 1 && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleRemoveCartClick(cart.id); }}
                      className="absolute -top-1.5 -left-1.5 h-5 w-5 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center shadow-lg hover:bg-red-600"
                      title="Remove Cart"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Active Cart Title & Status Banner */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-muted/60 rounded-2xl border border-border mb-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="px-2.5 py-1 bg-primary text-white text-xs font-black rounded-lg shadow-sm shrink-0">
                CART #{activeCart?.displayNumber || 1}
              </span>
              {activeCart?.customer ? (
                <div className="flex items-center gap-1.5 text-xs font-bold text-primary truncate">
                  <User className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{activeCart.customer.name_dv || activeCart.customer.name_en}</span>
                </div>
              ) : (
                <span className="text-xs text-muted-foreground font-semibold">
                  {t('walk_in_customer') || 'Walk-in Customer'}
                </span>
              )}
            </div>
            <span className="text-xs font-bold text-muted-foreground shrink-0">
              {activeCart?.items.length || 0} {t('items') || 'items'}
            </span>
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
                <div key={`${item.id}-${item.selected_unit || 'Piece'}`} className="group relative bg-muted hover:bg-muted/80 border border-border rounded-xl p-3 transition-all">
                  <div className="flex gap-4 items-start">
                    <div className="flex flex-col gap-2 items-start">
                      <div className="text-[16px] font-black text-primary whitespace-nowrap">
                        {settings.shop.currency} {item.price.toFixed(2)}
                      </div>
                      <div className="flex items-center gap-1 bg-black/40 rounded-lg p-0.5 border border-border h-10">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => updateCartItemQty(item.id, -1, item.selected_unit)}
                        ><Minus className="h-4 w-4" /></Button>
                        <Input
                          type="number"
                          value={item.qty}
                          onChange={(e) => setCartItemQty(item.id, parseFloat(e.target.value) || 0, item.selected_unit)}
                          onFocus={handleFocus}
                          className="w-14 text-center text-[14px] font-black text-foreground bg-transparent border-none h-8 p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => updateCartItemQty(item.id, 1, item.selected_unit)}
                        ><Plus className="h-4 w-4" /></Button>
                      </div>
                    </div>

                    <div className="flex-1 text-right min-w-0">
                      <div className="flex justify-between items-start mb-1">
                        <button
                          onClick={() => removeFromCart(item.id, item.selected_unit)}
                          className="text-muted-foreground/50 hover:text-red-500 transition-colors p-1"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className="text-[18px] font-black text-foreground leading-tight mb-1">{item.name_dv}</p>
                          <p className="text-[13px] font-bold text-foreground/50 leading-tight uppercase mb-1">{item.name_en}</p>
                          {(() => {
                            const prod = products.find(p => p.id === item.id);
                            const hasUnits = prod?.units && prod.units.length > 0;
                            const currentUnit = item.selected_unit || 'Piece';

                            if (!hasUnits) {
                              return item.selected_unit && item.selected_unit !== 'Piece' ? (
                                <Badge variant="outline" className="text-[9px] border-primary/30 text-primary uppercase font-black px-1.5 py-0.5 h-auto leading-none">
                                  {item.selected_unit}
                                </Badge>
                              ) : null;
                            }

                            return (
                              <div className="flex items-center justify-end gap-1.5 mt-1.5">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <button
                                      type="button"
                                      className="flex items-center gap-1.5 text-[11px] font-black bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 px-2.5 py-1 rounded-lg transition-all cursor-pointer shadow-sm active:scale-95"
                                      title={t('switch_unit') || 'Switch Unit'}
                                    >
                                      <Boxes className="h-3.5 w-3.5 text-primary" />
                                      <span>{currentUnit}</span>
                                      <ChevronDown className="h-3 w-3 opacity-70" />
                                    </button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="bg-card border-border text-foreground font-faruma text-right min-w-[220px] z-[120] shadow-2xl rounded-2xl p-1">
                                    <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-muted-foreground border-b border-border text-right">
                                      {t('switch_unit') || 'Switch Unit (ޔުނިޓް ބަދަލުކުރޭ)'}
                                    </div>
                                    <DropdownMenuItem
                                      onClick={() => switchCartItemUnit(item, 'Piece')}
                                      className={cn(
                                        "flex items-center justify-between text-xs py-2 px-3 rounded-xl cursor-pointer hover:bg-muted transition-colors",
                                        currentUnit === 'Piece' && "font-black text-primary bg-primary/10"
                                      )}
                                    >
                                      <span className="font-mono font-bold text-primary">{settings?.shop?.currency || 'MVR'} {Number(prod.price || 0).toFixed(2)}</span>
                                      <span className="font-bold">Piece (1 pc)</span>
                                    </DropdownMenuItem>
                                    {prod.units!.map((u, idx) => (
                                      <DropdownMenuItem
                                        key={idx}
                                        onClick={() => switchCartItemUnit(item, u.name)}
                                        className={cn(
                                          "flex items-center justify-between text-xs py-2 px-3 rounded-xl cursor-pointer hover:bg-muted transition-colors",
                                          currentUnit === u.name && "font-black text-primary bg-primary/10"
                                        )}
                                      >
                                        <span className="font-mono font-bold text-primary">{settings?.shop?.currency || 'MVR'} {Number(u.price || 0).toFixed(2)}</span>
                                        <span className="font-bold">{u.name} ({u.conversion_factor} pcs)</span>
                                      </DropdownMenuItem>
                                    ))}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="p-6 bg-muted border-t border-border space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-bold text-muted-foreground">
              <span>{renderBoth('subtotal')}</span>
              <span>{settings.shop.currency} {subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs font-bold text-muted-foreground">
              <span>GST ({settings.shop.taxRate}%)</span>
              <span>{settings.shop.currency} {gstAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-end pt-2">
              <span className="text-sm font-black text-foreground uppercase tracking-tighter">{renderBoth('grand_total')}</span>
              <span className="text-4xl font-black text-primary leading-none">
                {settings.shop.currency} {grandTotal.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={() => setIsSplitDialogOpen(true)}
              className="h-10 bg-teal-500/10 hover:bg-teal-500/20 text-teal-600 dark:text-teal-400 border border-teal-500/20 text-[10px] font-black uppercase tracking-widest gap-2"
            >
              <Users className="h-4 w-4" /> SPLIT BILL
            </Button>
            <Button
              onClick={clearActiveCart}
              className="h-10 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/20 text-[10px] font-black uppercase tracking-widest gap-2"
            >
              <Trash2 className="h-4 w-4" /> CLEAR
            </Button>
            <Button
              onClick={() => {
                setTransferAmount(grandTotal);
                setIsAwaitingTransferDialogOpen(true);
              }}
              className="h-10 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/20 text-[10px] font-black uppercase tracking-widest gap-2"
            >
              <Receipt className="h-4 w-4" /> AWAITING TRANSFER
            </Button>
            <Button
              onClick={() => { setCreditDialogStep(1); setIsCreditDialogOpen(true); }}
              className="h-10 bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-orange-500/20 text-[10px] font-black uppercase tracking-widest gap-2"
            >
              CREDIT SALE
            </Button>
          </div>

          <Button
            onClick={() => setIsCashDialogOpen(true)}
            className="w-full h-14 bg-primary hover:bg-primary/90 text-primary-foreground text-lg font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/30"
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
        onSelect={(unit) => handleUnitSelection(unit ? unit.name : 'Piece')}
      />

      <Dialog open={isCashDialogOpen} onOpenChange={setIsCashDialogOpen}>
        <DialogContent className="sm:max-w-[425px] font-faruma bg-card text-foreground border-border shadow-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right text-2xl font-black">{renderBoth('cash_payment')}</DialogTitle>
            <DialogDescription className="text-right text-muted-foreground">{renderBoth('enter_paid_amount')}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="space-y-2">
              <Label className="text-right block text-muted-foreground uppercase text-[10px] font-black tracking-widest">{renderBoth('total_amount')}</Label>
              <div className="text-4xl font-black text-primary text-right">{settings.shop.currency} {grandTotal.toFixed(2)}</div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="paidAmount" className="text-right block text-muted-foreground uppercase text-[10px] font-black tracking-widest">{renderBoth('paid_amount')}</Label>
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
                className="text-right h-14 bg-background border-border text-2xl font-black focus:border-primary transition-all text-foreground"
                autoFocus
              />
            </div>
            <div className="space-y-1 text-right">
              <Label className="text-muted-foreground uppercase text-[10px] font-black tracking-widest">{renderBoth('balance')}</Label>
              <div className={cn(
                "text-2xl font-black",
                balance < 0 ? "text-red-500" : "text-green-500"
              )}>
                {settings.shop.currency} {balance.toFixed(2)}
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsCashDialogOpen(false)} className="flex-1 border-border hover:bg-muted text-foreground">{renderBoth('cancel')}</Button>
            <Button onClick={processCashPayment} disabled={typeof paidAmount !== 'number' || paidAmount < grandTotal} className="flex-1 btn-gradient-blue text-white font-bold">{renderBoth('confirm_payment')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCreditDialogOpen} onOpenChange={setIsCreditDialogOpen}>
        <DialogContent className="sm:max-w-[560px] w-[calc(100vw-2rem)] font-faruma bg-card text-foreground border border-border text-right p-5 sm:p-6 shadow-2xl rounded-3xl overflow-hidden box-border [&>button]:left-4 [&>button]:right-auto" dir="rtl">
          <DialogHeader className="pb-3 text-right space-y-1.5 border-b border-border/60">
            <div className="flex items-center justify-between pl-8">
              <div className="text-right flex-1 min-w-0">
                <DialogTitle className="text-xl md:text-2xl font-black text-foreground flex items-center gap-2.5">
                  {creditDialogStep === 1 ? (
                    <CreditCard className="h-6 w-6 text-primary shrink-0" />
                  ) : (
                    <Receipt className="h-6 w-6 text-primary shrink-0" />
                  )}
                  <span>{creditDialogStep === 1 ? renderBoth('credit_sale') : renderBoth('confirm_credit_sale')}</span>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-1 text-right">
                  {creditDialogStep === 1 
                    ? renderBoth('select_or_add_customer_for_credit') 
                    : renderBoth('confirm_credit_sale_description')
                  }
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="py-3">
            {creditDialogStep === 1 ? (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                    <Input
                      placeholder={renderBothString('search_customers')}
                      value={customerSearchTerm}
                      onChange={(e) => setCustomerSearchTerm(e.target.value)}
                      className="w-full text-right bg-muted/60 border-border text-foreground h-11 pr-10 rounded-xl font-bold placeholder:text-muted-foreground/60"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setIsAddCustomerDialogOpen(true)}
                    className="h-11 w-11 rounded-xl border-primary/30 bg-primary/10 hover:bg-primary/20 text-primary shrink-0"
                    title={renderBothString('add_new_customer')}
                  >
                    <UserPlus className="h-5 w-5" />
                  </Button>
                </div>

                <ScrollArea className="h-[340px] pr-2 custom-scrollbar">
                  {(() => {
                    const filteredCustomers = customers.filter(c =>
                      c.name_dv?.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
                      c.name_en?.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
                      c.phone?.includes(customerSearchTerm) ||
                      c.code?.toLowerCase().includes(customerSearchTerm.toLowerCase())
                    );

                    if (filteredCustomers.length === 0) {
                      return (
                        <div className="p-8 text-center text-muted-foreground bg-muted/20 rounded-2xl border border-dashed border-border/80 flex flex-col items-center justify-center gap-2 mt-4">
                          <Users className="h-8 w-8 text-muted-foreground/40" />
                          <p className="text-sm font-bold">{renderBoth('no_customers_found')}</p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsAddCustomerDialogOpen(true)}
                            className="mt-2 text-xs font-bold gap-1 rounded-xl border-primary/30 text-primary hover:bg-primary/10"
                          >
                            <UserPlus className="h-3.5 w-3.5" />
                            {renderBoth('add_new_customer')}
                          </Button>
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-2.5">
                        {filteredCustomers.map((customer) => {
                          const outstanding = customer.outstanding_balance || 0;
                          const limit = customer.credit_limit || 0;
                          const isOverLimit = limit > 0 && (outstanding + grandTotal > limit);
                          return (
                            <div
                              key={customer.id}
                              onClick={() => {
                                updateActiveCart(prev => ({ ...prev, customer }));
                                setCreditDialogStep(2);
                              }}
                              className="p-3.5 rounded-2xl cursor-pointer transition-all border border-border bg-card hover:bg-muted/60 hover:border-primary/50 text-right group shadow-sm hover:shadow-md"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex flex-col items-start gap-1 shrink-0">
                                  <Badge variant="outline" className={cn(
                                    "text-[10px] font-black px-2.5 py-0.5 rounded-md",
                                    isOverLimit 
                                      ? "bg-red-500/10 text-red-500 border-red-500/30" 
                                      : "bg-primary/10 text-primary border-primary/30"
                                  )}>
                                    {t('credit_limit')}: {settings.shop.currency} {limit.toFixed(2)}
                                  </Badge>
                                  {outstanding > 0 && (
                                    <span className="text-[10px] font-bold text-orange-600 dark:text-orange-400">
                                      {t('current_outstanding')}: {settings.shop.currency} {outstanding.toFixed(2)}
                                    </span>
                                  )}
                                </div>
                                <div className="text-right flex-1 min-w-0">
                                  <p className="font-black text-foreground group-hover:text-primary transition-colors text-sm truncate">
                                    {customer.name_dv} {customer.name_en ? `(${customer.name_en})` : ''}
                                  </p>
                                  <div className="flex items-center justify-end gap-2 text-[11px] text-muted-foreground mt-0.5">
                                    {customer.phone && <span dir="ltr">📞 {customer.phone}</span>}
                                    {customer.code && <span className="font-mono opacity-70">#{customer.code}</span>}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </ScrollArea>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Customer Details Card */}
                <div className="p-4 sm:p-5 bg-primary/10 rounded-2xl border border-primary/20 text-right space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase text-primary tracking-wider flex items-center gap-1.5">
                      <User className="h-4 w-4" />
                      {renderBoth('customer')}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setCreditDialogStep(1)}
                      className="h-7 px-2.5 text-xs font-bold border-primary/30 text-primary hover:bg-primary/20 rounded-lg"
                    >
                      {renderBoth('change_customer')}
                    </Button>
                  </div>
                  <div>
                    <p className="font-black text-foreground text-base sm:text-lg">
                      {activeCart?.customer?.name_dv} {activeCart?.customer?.name_en ? `(${activeCart?.customer?.name_en})` : ''}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                      {activeCart?.customer?.phone && (
                        <span className="font-mono flex items-center gap-1">
                          <span>📞</span>
                          <span dir="ltr">{activeCart?.customer?.phone}</span>
                        </span>
                      )}
                      {activeCart?.customer?.code && (
                        <span className="font-mono opacity-80">#{activeCart?.customer?.code}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Financial Summary 2x2 Grid */}
                {(() => {
                  const currentBalance = activeCart?.customer?.outstanding_balance || 0;
                  const newBalance = currentBalance + grandTotal;
                  const limit = activeCart?.customer?.credit_limit || 0;
                  const isLimitExceeded = limit > 0 && newBalance > limit;
                  const remainingCredit = limit > 0 ? limit - newBalance : 0;

                  return (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3 text-right">
                        {/* Grand Total */}
                        <div className="p-3.5 bg-primary/5 rounded-2xl border border-primary/20 flex flex-col justify-between">
                          <span className="text-[11px] font-bold text-muted-foreground block mb-1">
                            {renderBoth('grand_total')}
                          </span>
                          <span className="text-xl font-black text-primary font-mono tracking-tight">
                            {settings.shop.currency} {grandTotal.toFixed(2)}
                          </span>
                        </div>

                        {/* Current Outstanding */}
                        <div className="p-3.5 bg-muted/60 rounded-2xl border border-border/80 flex flex-col justify-between">
                          <span className="text-[11px] font-bold text-muted-foreground block mb-1">
                            {renderBoth('current_outstanding')}
                          </span>
                          <span className="text-xl font-black text-foreground font-mono tracking-tight">
                            {settings.shop.currency} {currentBalance.toFixed(2)}
                          </span>
                        </div>

                        {/* New Outstanding */}
                        <div className="p-3.5 bg-orange-500/10 rounded-2xl border border-orange-500/30 flex flex-col justify-between">
                          <span className="text-[11px] font-bold text-orange-600 dark:text-orange-400 block mb-1">
                            {renderBoth('new_outstanding')}
                          </span>
                          <span className="text-xl font-black text-orange-600 dark:text-orange-400 font-mono tracking-tight">
                            {settings.shop.currency} {newBalance.toFixed(2)}
                          </span>
                        </div>

                        {/* Credit Limit */}
                        <div className={cn(
                          "p-3.5 rounded-2xl border flex flex-col justify-between",
                          isLimitExceeded 
                            ? "bg-red-500/10 border-red-500/30" 
                            : "bg-muted/60 border-border/80"
                        )}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[11px] font-bold text-muted-foreground">
                              {renderBoth('credit_limit')}
                            </span>
                            {isLimitExceeded && (
                              <Badge variant="destructive" className="text-[9px] px-1.5 py-0 h-4">
                                {t('credit_exceeded_warning')}
                              </Badge>
                            )}
                          </div>
                          <span className="text-xl font-black text-foreground font-mono tracking-tight">
                            {settings.shop.currency} {limit.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {/* Remaining Credit or Warning Banner */}
                      {isLimitExceeded ? (
                        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-2 text-red-500 text-xs font-black">
                          <AlertTriangle className="h-4 w-4 shrink-0" />
                          <span>{t('credit_limit_exceeded_error', { customerName: activeCart?.customer?.name_dv })}</span>
                        </div>
                      ) : limit > 0 ? (
                        <div className="px-3.5 py-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          <span>{renderBoth('remaining_credit_limit')}:</span>
                          <span className="font-mono text-sm font-black">
                            {settings.shop.currency} {remainingCredit.toFixed(2)}
                          </span>
                        </div>
                      ) : null}
                    </div>
                  );
                })()}

                {/* Items Summary Breakdown */}
                <div className="p-3 bg-muted/40 rounded-2xl border border-border/80 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-muted-foreground pb-1 border-b border-border/50">
                    <span className="flex items-center gap-1.5">
                      <Package className="h-3.5 w-3.5 text-primary" />
                      <span>{renderBoth('cart_items_summary')}</span>
                    </span>
                    <span>
                      {activeCart?.items?.length || 0} {t('items')} ({activeCart?.items?.reduce((s, i) => s + i.qty, 0) || 0} {t('units')})
                    </span>
                  </div>
                  <div className="max-h-24 overflow-y-auto space-y-1 pr-1 custom-scrollbar text-xs">
                    {activeCart?.items?.map((item) => (
                      <div key={item.id} className="flex items-center justify-between text-muted-foreground py-0.5">
                        <span className="font-mono text-foreground font-bold shrink-0">
                          {settings.shop.currency} {(item.price * item.qty).toFixed(2)}
                        </span>
                        <span className="truncate max-w-[320px] text-right">
                          {item.qty}x {item.name_dv} {item.name_en ? `(${item.name_en})` : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2.5 pt-3 border-t border-border flex flex-row justify-between items-center">
            {creditDialogStep === 2 ? (
              <>
                <Button 
                  variant="outline" 
                  onClick={() => setCreditDialogStep(1)} 
                  className="h-11 px-5 border-border hover:bg-muted text-foreground rounded-xl font-bold flex items-center gap-1.5"
                >
                  <ArrowLeft className="h-4 w-4" />
                  {renderBoth('back')}
                </Button>
                <Button
                  onClick={processCreditPayment}
                  disabled={isProcessing || !activeCart?.customer}
                  className="flex-1 h-11 bg-primary hover:bg-primary/90 text-white font-black rounded-xl shadow-lg transition-all text-xs uppercase tracking-wider flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>{t('processing')}</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      <span>{renderBoth('confirm_credit_sale')}</span>
                    </>
                  )}
                </Button>
              </>
            ) : (
              <Button 
                variant="outline" 
                onClick={() => setIsCreditDialogOpen(false)} 
                className="w-full h-11 border-border hover:bg-muted text-foreground rounded-xl font-bold"
              >
                {renderBoth('cancel')}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isConfirmRemoveCartDialogOpen} onOpenChange={setIsConfirmRemoveCartDialogOpen}>
        <DialogContent className="sm:max-w-[400px] font-faruma bg-card text-foreground border-border shadow-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right font-black text-xl">{renderBoth('confirm_cart_removal')}</DialogTitle>
            <DialogDescription className="text-right text-muted-foreground">{renderBoth('confirm_cart_removal_description')}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsConfirmRemoveCartDialogOpen(false)} className="flex-1 border-border hover:bg-muted text-foreground">{renderBoth('cancel')}</Button>
            <Button variant="destructive" onClick={confirmRemoveCart} className="flex-1 text-white font-bold">{renderBoth('confirm')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isExpiryDialogOpen} onOpenChange={setIsExpiryDialogOpen}>
        <DialogContent className="sm:max-w-[460px] w-[calc(100vw-2rem)] font-faruma bg-card text-foreground border border-border text-right p-5 sm:p-6 shadow-2xl rounded-3xl overflow-hidden box-border [&>button]:left-4 [&>button]:right-auto" dir="rtl">
          <DialogHeader className="pb-3 text-right space-y-2 border-b border-border/60">
            <div className="flex items-start justify-between gap-2 pl-8">
              {selectedProductForExpiry?.expiry_date && (
                <Badge variant="outline" className="bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30 text-[11px] font-black shrink-0 mt-0.5">
                  {formatDate(selectedProductForExpiry.expiry_date)}
                </Badge>
              )}
              <div className="text-right flex-1 min-w-0">
                <DialogTitle className="text-lg font-black text-orange-600 dark:text-orange-400 flex items-center justify-end gap-2">
                  <span className="truncate">{t('item_near_expiry')}</span>
                  <AlertTriangle className="h-5 w-5 shrink-0 text-orange-500" />
                </DialogTitle>
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mt-0.5">
                  {t('item_near_expiry', { lng: 'en' })}
                </p>
              </div>
            </div>
            <DialogDescription className="text-muted-foreground text-xs leading-relaxed text-right pt-1">
              {renderBoth('expiry_discount_message', {
                itemName: selectedProductForExpiry?.name_dv || selectedProductForExpiry?.name_en || 'Product',
                expiryDate: selectedProductForExpiry?.expiry_date ? formatDate(selectedProductForExpiry.expiry_date) : ''
              })}
            </DialogDescription>
          </DialogHeader>

          <div className="bg-orange-500/10 dark:bg-orange-500/20 p-4 rounded-2xl border border-orange-500/30 text-right space-y-3 box-border w-full my-1">
            <div className="flex justify-between items-center">
              <span className="text-xl font-black text-orange-600 dark:text-orange-300 font-mono">
                {expiryDiscountPercent}% {t('discount')}
              </span>
              <p className="text-xs text-orange-600 dark:text-orange-400 font-black uppercase tracking-wider">
                {renderBoth('discount_offer')}
              </p>
            </div>

            <div className="grid grid-cols-4 gap-2 w-full">
              {[10, 20, 30, 50].map((pct) => (
                <Button
                  key={pct}
                  type="button"
                  variant="outline"
                  onClick={() => setExpiryDiscountPercent(pct)}
                  className={cn(
                    "h-10 border-orange-500/30 font-black text-xs sm:text-sm rounded-xl transition-all font-mono",
                    expiryDiscountPercent === pct 
                      ? "bg-orange-500 text-white hover:bg-orange-600 shadow-md shadow-orange-500/20" 
                      : "text-orange-600 dark:text-orange-400 hover:bg-orange-500/20 bg-background/50"
                  )}
                >
                  {pct}%
                </Button>
              ))}
            </div>

            <div className="relative w-full">
              <Input
                type="number"
                min="0"
                max="100"
                value={expiryDiscountPercent}
                onChange={(e) => setExpiryDiscountPercent(parseFloat(e.target.value) || 0)}
                onFocus={handleFocus}
                className="bg-background border-orange-500/30 text-orange-600 dark:text-orange-300 font-black h-11 pl-10 pr-4 text-right text-lg rounded-xl font-mono w-full"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-orange-600 dark:text-orange-400 font-black text-sm">%</span>
            </div>
          </div>

          <DialogFooter className="flex sm:flex-row flex-row-reverse gap-3 mt-3 pt-3 border-t border-border space-x-0 sm:space-x-0 w-full">
            <Button 
              onClick={confirmExpiryDiscount} 
              className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-black h-11 rounded-xl shadow-lg shadow-orange-600/20 text-xs uppercase"
            >
              {renderBoth('apply_discount')}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => {
                if (selectedProductForExpiry) addToCart(selectedProductForExpiry);
                setIsExpiryDialogOpen(false);
              }} 
              className="flex-1 text-muted-foreground hover:text-foreground h-11 rounded-xl border-border text-xs font-bold"
            >
              {renderBoth('no_thanks')}
            </Button>
          </DialogFooter>
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
        <DialogContent className="sm:max-w-[500px] font-faruma bg-card text-foreground border-border p-0 overflow-hidden shadow-2xl" dir="rtl">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle className="text-right text-2xl font-black flex items-center justify-end gap-3">
              {renderBoth('split_bill')} <Users className="h-6 w-6 text-primary" />
            </DialogTitle>
            <DialogDescription className="text-right text-muted-foreground">
              {splitStep === 1 ? renderBoth('select_customers_for_split') : renderBoth('review_split_amounts')}
            </DialogDescription>
          </DialogHeader>

          {splitStep === 1 ? (
            <div className="flex flex-col h-[600px]">
              <div className="px-6 py-2">
                <div className="relative">
                  <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                  <Input
                    placeholder={renderBothString('search_customers')}
                    value={splitSearchTerm}
                    onChange={(e) => setSplitSearchTerm(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && selectedSplitCustomerIds.length > 0) {
                        e.preventDefault();
                        moveToAllocation();
                      }
                    }}
                    className="w-full bg-background border-border rounded-2xl pr-12 h-14 text-right font-bold focus:border-primary/50 transition-all text-foreground"
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
                              ? "bg-primary border-primary shadow-lg shadow-primary/20 scale-[0.98] text-primary-foreground"
                              : "bg-card border-border hover:border-primary/40 hover:bg-muted/50"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all",
                              isSelected ? "bg-white border-white text-primary" : "border-border"
                            )}>
                              {isSelected && <Plus className="h-4 w-4 rotate-45" />}
                            </div>
                          </div>

                          <div className="flex-1 text-right">
                            <div className="flex items-center justify-end gap-2 mb-0.5">
                              <span className={cn("text-[10px] font-bold uppercase tracking-widest", isSelected ? "text-primary-foreground/80" : "text-muted-foreground")}>{customer.code}</span>
                              <span className="text-[10px] font-bold opacity-40">•</span>
                              <span className={cn("text-sm font-black", isSelected ? "text-primary-foreground" : "text-foreground")}>{customer.name_en}</span>
                            </div>
                            <h4 className={cn("text-lg font-black leading-tight", isSelected ? "text-primary-foreground" : "text-foreground")}>{customer.name_dv}</h4>
                            <Badge variant="outline" className={cn(
                              "mt-2 text-[9px] font-black py-0 px-2 h-5",
                              isSelected 
                                ? "bg-white/20 border-white/30 text-white" 
                                : "bg-muted border-border text-muted-foreground"
                            )}>
                              {settings.shop.currency} {customer.outstanding_balance.toFixed(2)}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </ScrollArea>

              <div className="p-6 bg-card border-t border-border">
                <div className="flex justify-between items-center mb-4">
                  <div className="text-right">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">{renderBoth('total_to_split')}</p>
                    <p className="text-2xl font-black text-primary">{settings.shop.currency} {grandTotal.toFixed(2)}</p>
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">{renderBoth('selected')}</p>
                    <p className="text-2xl font-black text-foreground">{selectedSplitCustomerIds.length}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setIsSplitDialogOpen(false)} className="flex-1 border-border h-14 rounded-2xl font-black text-foreground hover:bg-muted uppercase tracking-widest text-xs">
                    {renderBoth('cancel')}
                  </Button>
                  <Button
                    onClick={moveToAllocation}
                    disabled={selectedSplitCustomerIds.length === 0}
                    className="flex-1 btn-gradient-blue h-14 rounded-2xl font-black text-white shadow-xl shadow-blue-500/20 uppercase tracking-widest text-xs"
                  >
                    {renderBoth('next')}
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
                      <div key={entry.id} className="p-5 rounded-3xl bg-card border border-border flex items-center justify-between gap-4 group hover:bg-muted/40 transition-all">
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-muted-foreground uppercase">{settings.shop.currency}</span>
                            <Input
                              type="number"
                              value={entry.amount}
                              onChange={(e) => updateSplitAmount(entry.id, parseFloat(e.target.value) || 0)}
                              onFocus={handleFocus}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && Math.abs(splitRemaining) <= 0.01 && splitEntries.length > 0) {
                                  e.preventDefault();
                                  processSplitPayment();
                                }
                              }}
                              className="w-32 h-14 bg-background border-border rounded-2xl pl-10 text-right text-xl font-black focus:border-primary transition-all text-foreground font-mono"
                            />
                          </div>
                        </div>

                        <div className="flex-1 text-right">
                          <h4 className="text-lg font-black text-foreground mb-0.5">{customer?.name_dv}</h4>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{customer?.name_en}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>

              <div className="p-6 bg-card border-t border-border">
                <div className="grid grid-cols-2 gap-6 mb-6">
                  <div className="text-right">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">{renderBoth('total_to_split')}</p>
                    <p className="text-2xl font-black text-foreground font-mono">{settings.shop.currency} {grandTotal.toFixed(2)}</p>
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">{renderBoth('sum')}</p>
                    <p className={cn(
                      "text-2xl font-black transition-all font-mono",
                      Math.abs(splitRemaining) < 0.01 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                    )}>
                      {settings.shop.currency} {splitTotal.toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button variant="ghost" onClick={backToSelection} className="h-14 w-14 rounded-2xl border border-border text-foreground hover:bg-muted">
                    <ArrowLeft className="h-5 w-5 rtl:rotate-180" />
                  </Button>
                  <Button
                    onClick={processSplitPayment}
                    disabled={Math.abs(splitRemaining) > 0.01 || splitEntries.length === 0}
                    className="flex-1 btn-gradient-blue h-14 rounded-2xl font-black text-white shadow-xl shadow-blue-500/20 uppercase tracking-widest text-xs"
                  >
                    {renderBoth('confirm_split_payment')}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isAwaitingTransferDialogOpen} onOpenChange={setIsAwaitingTransferDialogOpen}>
        <DialogContent className="sm:max-w-[400px] font-faruma bg-card border-border text-foreground" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right text-2xl font-black flex items-center justify-end gap-3">
              Confirm Bank Transfer <Receipt className="h-6 w-6 text-blue-400" />
            </DialogTitle>
            <DialogDescription className="text-right text-muted-foreground">
              Enter the amount transferred by the customer.
            </DialogDescription>
          </DialogHeader>

          <div className="py-8 space-y-4">
            <div className="bg-muted p-4 rounded-2xl border border-border text-right">
              <p className="text-[10px] font-black text-foreground/30 uppercase tracking-widest mb-1">Grand Total</p>
              <p className="text-3xl font-black text-foreground">{settings.shop.currency} {grandTotal.toFixed(2)}</p>
            </div>

            <div className="space-y-2">
              <Label className="text-right block text-[10px] font-black uppercase text-muted-foreground tracking-widest pr-2">Transfer Amount</Label>
              <div className="relative">
                <DollarSign className="absolute right-4 top-1/2 -translate-y-1/2 h-6 w-6 text-primary/40" />
                <Input
                  type="number"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(parseFloat(e.target.value) || 0)}
                  onFocus={handleFocus}
                  className="bg-muted border-primary h-16 rounded-2xl pr-14 text-3xl font-black text-foreground text-right"
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
                <Label className="text-right block text-[10px] font-black uppercase text-muted-foreground tracking-widest">Select Customer or Enter Name</Label>
              </div>
              <Input
                placeholder="Search or type name..."
                value={customerSearchTerm}
                onChange={(e) => setCustomerSearchTerm(e.target.value)}
                className="bg-muted border-border h-12 text-right text-foreground"
              />
              <ScrollArea className="h-[150px] mt-2 border border-border rounded-xl">
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
                        activeCart?.customer?.id === customer.id ? "bg-primary text-foreground" : "bg-muted hover:bg-muted/80 text-muted-foreground/80"
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
            <Button variant="ghost" onClick={() => setIsAwaitingTransferDialogOpen(false)} className="flex-1 border-border text-foreground">
              Cancel
            </Button>
            <Button
              onClick={processTransferPayment}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-foreground font-black"
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
        <DialogContent className="sm:max-w-[600px] font-faruma bg-card border-border text-foreground" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right text-2xl font-black flex items-center justify-end gap-3">
              Pending Transfers <ArrowRightLeft className="h-6 w-6 text-yellow-500" />
            </DialogTitle>
            <DialogDescription className="text-right text-muted-foreground">
              Review and resolve pending bank transfers.
            </DialogDescription>
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 text-right flex flex-col sm:flex-row-reverse items-center justify-between gap-3 mt-2">
              <p className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">
                Unconfirmed transfers automatically convert to credit at the end of the day.
              </p>
              {pendingTransfers.length > 0 && (
                <Button
                  size="sm"
                  onClick={() => convertAllPendingToCredit()}
                  className="bg-blue-600 hover:bg-blue-700 text-foreground text-xs font-black h-8 px-3 rounded-lg shrink-0"
                >
                  End of Day: Convert All to Credit
                </Button>
              )}
            </div>
          </DialogHeader>

          <ScrollArea className="h-[400px] mt-4">
            <div className="space-y-3">
              {pendingTransfers.length === 0 ? (
                <div className="h-40 flex flex-col items-center justify-center text-muted-foreground/50 uppercase tracking-widest font-black text-sm">
                  No pending transfers
                </div>
              ) : (
                pendingTransfers.map((transfer) => (
                  <div key={transfer.id} className="p-4 rounded-2xl bg-muted border border-border flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-xl bg-yellow-500/10 flex items-center justify-center text-yellow-500">
                        <ArrowRightLeft className="h-5 w-5" />
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-foreground">{transfer.customer?.name_dv || transfer.tempCustomerName || 'Guest'}</p>
                        <p className="text-[10px] font-bold text-muted-foreground">{formatDateTime(transfer.date)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black text-foreground/30 uppercase tracking-widest mb-0.5">Amount</p>
                      <p className="text-lg font-black text-yellow-500">{settings.shop.currency} {transfer.grandTotal.toFixed(2)}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => resolvePendingTransfer(transfer.id, 'cash')}
                        className="bg-green-600 hover:bg-green-700 text-foreground text-[10px] font-black px-3 h-9"
                      >
                        CASH
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => resolvePendingTransfer(transfer.id, 'credit')}
                        className="bg-blue-600 hover:bg-blue-700 text-foreground text-[10px] font-black px-3 h-9"
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