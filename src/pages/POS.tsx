"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ShoppingCart, PlusCircle, Minus, Trash2, MonitorPlay, Search, UserPlus, ArrowRightLeft, CreditCard, Receipt, Users, AlertTriangle, User, DollarSign, XCircle, Heart, ArrowLeft, Plus, ChevronDown, Boxes, X, CheckCircle2, Package, Loader2, Check, Printer, Gift, Flame, TrendingDown, Clock } from 'lucide-react';
import { formatDate, toISODate, toISODatetime, formatTime, formatDateTime } from '@/utils/formatters';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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
import { TelegramConnectDialog } from '@/components/TelegramConnectDialog';
import { TransferSlipsDialog } from '@/components/TransferSlipsDialog';
import { sendTelegramSaleReceipt } from '@/services/telegramService';

interface Cart {
  id: string;
  displayNumber: number;
  customer: Customer | null;
  items: CartItem[];
}

// Decimal-friendly Quantity Stepper for Kilos and Fractional Items
const CartQtyStepper = ({
  item,
  onUpdate,
  onSet,
  isLast,
  lastQtyInputRef,
  onFocus,
  focusSearchBar
}: {
  item: CartItem;
  onUpdate: (id: string, delta: number, unit?: string) => void;
  onSet: (id: string, qty: number, unit?: string) => void;
  isLast?: boolean;
  lastQtyInputRef?: React.RefObject<HTMLInputElement | null>;
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
  focusSearchBar: () => void;
}) => {
  const [localVal, setLocalVal] = useState<string>(() => (item.qty !== undefined && item.qty !== null) ? String(item.qty) : '1');
  const [isFocused, setIsFocused] = useState(false);

  // Sync from item.qty when not actively editing
  useEffect(() => {
    if (!isFocused) {
      setLocalVal((item.qty !== undefined && item.qty !== null) ? String(item.qty) : '1');
    }
  }, [item.qty, isFocused]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    // Allow numbers, decimal point e.g. "0", "0.", "0.2", ".2", "1.5"
    if (text === '' || text === '.' || text === '0.' || /^\d*\.?\d*$/.test(text)) {
      setLocalVal(text);
      if (text !== '' && text !== '.') {
        const parsed = parseFloat(text);
        if (!isNaN(parsed) && parsed >= 0) {
          onSet(item.id, parsed, item.selected_unit);
        }
      }
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    const parsed = parseFloat(localVal);
    if (isNaN(parsed) || parsed <= 0) {
      setLocalVal('1');
      onSet(item.id, 1, item.selected_unit);
    } else {
      setLocalVal(String(parsed));
      onSet(item.id, parsed, item.selected_unit);
    }
  };

  return (
    <div className="flex items-center bg-background/90 dark:bg-black/40 rounded-full px-1 py-0.5 border border-border h-6 shadow-xs shrink-0">
      <Button
        variant="ghost"
        size="icon"
        type="button"
        className="h-5 w-5 text-muted-foreground hover:text-foreground rounded-full p-0 shrink-0"
        onClick={() => onUpdate(item.id, -1, item.selected_unit)}
      >
        <Minus className="h-3 w-3" />
      </Button>
      <input
        type="text"
        inputMode="decimal"
        ref={isLast ? (lastQtyInputRef as any) : undefined}
        value={localVal}
        placeholder="1"
        onChange={handleChange}
        onFocus={(e) => {
          setIsFocused(true);
          e.target.select();
          if (onFocus) onFocus(e);
        }}
        onBlur={handleBlur}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
            focusSearchBar();
          } else if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            focusSearchBar();
          }
        }}
        className="cart-qty-input min-w-[36px] max-w-[56px] w-auto text-center text-xs font-black text-foreground bg-transparent border-none h-5 px-1 focus:bg-background focus:ring-1 focus:ring-primary rounded-md font-mono outline-none"
      />
      <Button
        variant="ghost"
        size="icon"
        type="button"
        className="h-5 w-5 text-muted-foreground hover:text-foreground rounded-full p-0 shrink-0"
        onClick={() => onUpdate(item.id, 1, item.selected_unit)}
      >
        <Plus className="h-3 w-3" />
      </Button>
    </div>
  );
};

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
    updateProduct,
    refreshCustomers,
    pendingSlipsCount
  } = useAppContext();

  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState<boolean>(false);
  const [visibleCatalogueCount, setVisibleCatalogueCount] = useState<number>(60);

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
  const [telegramCustomer, setTelegramCustomer] = useState<Customer | null>(null);
  const [isTelegramDialogOpen, setIsTelegramDialogOpen] = useState(false);
  const [isTransferSlipsDialogOpen, setIsTransferSlipsDialogOpen] = useState(false);
  const [shouldPrintCashReceipt, setShouldPrintCashReceipt] = useState<boolean>(() => localStorage.getItem('pos_print_cash_receipt') === 'true');

  const TelegramIcon = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
    </svg>
  );

  const maybeSendTelegramSaleReceipt = (sale: Sale, customer?: Customer | null) => {
    if (!customer?.telegram_chat_id) return;
    // Do NOT send telegram receipt for cash sales even if a credit customer is selected
    if (sale.paymentMethod === 'cash') return;
    if (!settings.telegram?.autoSendSaleReceipts && sale.paymentMethod !== 'credit') return;

    sendTelegramSaleReceipt({
      chatId: customer.telegram_chat_id,
      customer,
      sale,
      shopSettings: settings.shop,
      token: settings.telegram?.botToken,
    }).then(res => {
      if (res?.ok) {
        showSuccess('Digital receipt sent to customer Telegram! 🧾');
      }
    }).catch(err => console.warn('Telegram receipt dispatch error:', err));
  };

  const handleFocus = (event: React.FocusEvent<HTMLInputElement>) => {
    event.target.select();
  };

  const [pointsToRedeem, setPointsToRedeem] = useState<number>(0);
  const [isLoyaltyRedemptionDialogOpen, setIsLoyaltyRedemptionDialogOpen] = useState(false);
  const [creditDialogStep, setCreditDialogStep] = useState<1 | 2>(1);
  const [isExpiryDialogOpen, setIsExpiryDialogOpen] = useState(false);
  const [expiryDiscountPercent, setExpiryDiscountPercent] = useState<number>(20);
  const [expiryDropPrice, setExpiryDropPrice] = useState<number>(0);
  const [isUpdatingProductPrice, setIsUpdatingProductPrice] = useState(false);
  const [selectedProductForExpiry, setSelectedProductForExpiry] = useState<Product | null>(null);
  const [isUnitSelectionDialogOpen, setIsUnitSelectionDialogOpen] = useState(false);
  const [productForUnitSelection, setProductForUnitSelection] = useState<Product | null>(null);

  const [splitStep, setSplitStep] = useState<1 | 2>(1);
  const [selectedSplitCustomerIds, setSelectedSplitCustomerIds] = useState<string[]>([]);
  const [splitSearchTerm, setSplitSearchTerm] = useState('');
  const [splitEntries, setSplitEntries] = useState<Array<{ id: string, amount: number, method: 'Cash' | 'Card' | 'Transfer' | 'Credit', customerId?: string }>>([]);

  const activeCart = openCarts.get(activeCartId);

  const calculateTotals = () => {
    const currentItems = activeCart?.items || [];
    const taxableTotal = currentItems.filter(i => !i.is_zero_tax).reduce((sum, item) => sum + item.price * item.qty, 0);
    const zeroTaxTotal = currentItems.filter(i => i.is_zero_tax).reduce((sum, item) => sum + item.price * item.qty, 0);
    const subtotalNoDiscount = taxableTotal + zeroTaxTotal;

    const loyaltyPointsValue = settings.general.loyaltyPointsValue || 10;
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

  const searchInputRef = useRef<HTMLInputElement>(null);
  const lastQtyInputRef = useRef<HTMLInputElement>(null);
  const focusQuantityInputRef = useRef<() => void>(() => {});

  const focusSearchBar = () => {
    setTimeout(() => {
      if (searchInputRef.current) {
        searchInputRef.current.focus();
        searchInputRef.current.select();
      }
    }, 60);
  };

  const focusQuantityInput = () => {
    // Use DOM directly — never stale, always reads live cart
    const qtyInputs = document.querySelectorAll<HTMLInputElement>('.cart-qty-input');
    if (qtyInputs.length === 0) {
      showError(t('cart_empty_error') || 'ކާޓުގައި އެއްވެސް އައިޓަމެއް ނެތް (Cart is empty)');
      return;
    }
    setTimeout(() => {
      const lastInput = qtyInputs[qtyInputs.length - 1];
      lastInput.focus();
      lastInput.select();
      lastInput.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 40);
  };
  // Keep ref in sync so keyboard effect (with [] deps) never gets a stale closure
  focusQuantityInputRef.current = focusQuantityInput;

  const openCashDialog = () => {
    const currentCart = openCarts.get(activeCartId);
    if (!currentCart || currentCart.items.length === 0) {
      showError(t('cart_empty_error') || 'Cart is empty');
      return;
    }
    setPaidAmount(grandTotal);
    setIsCashDialogOpen(true);
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
    if (isCashDialogOpen) {
      setPaidAmount(grandTotal);
    }
  }, [isCashDialogOpen, grandTotal]);

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
      // Global F2 shortcut - focus product search anytime
      if (e.key === 'F2') {
        e.preventDefault();
        focusSearchBar();
        return;
      }

      // Global F10 shortcut - focus quantity of last cart item
      if (e.key === 'F10') {
        e.preventDefault();
        focusQuantityInputRef.current(); // always fresh, never stale
        return;
      }

      // If user is focused in a cart-qty-input, Enter or Escape must move back to product search
      if (document.activeElement?.classList.contains('cart-qty-input')) {
        if (e.key === 'Enter' || e.key === 'Escape') {
          e.preventDefault();
          focusSearchBar();
          return;
        }
      }

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

      // If user is focused in the product search bar, let the search input's onKeyDown handle Enter/Escape
      if (document.activeElement === searchInputRef.current) {
        if (e.key === 'Escape') {
          setSearchTerm('');
          searchInputRef.current?.blur();
        }
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        openCashDialog();
      } else if (e.key === 'F11') {
        e.preventDefault();
        setCreditDialogStep(1);
        setIsCreditDialogOpen(true);
      } else if (e.key === 'F4') {
        e.preventDefault();
        focusSearchBar();
      } else if (e.key === 'F6') {
        e.preventDefault();
        setIsSplitDialogOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
    setPointsToRedeem(0);
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
        const basePrice = product.original_price || product.price;
        const defaultDrop = Math.max(1, Number((basePrice * 0.8).toFixed(2))); // default 20% drop
        setExpiryDropPrice(defaultDrop);
        setExpiryDiscountPercent(20);
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

  const confirmExpiryPriceDrop = async () => {
    if (selectedProductForExpiry) {
      setIsUpdatingProductPrice(true);
      const priceBefore = selectedProductForExpiry.original_price || selectedProductForExpiry.price;
      const newPrice = Number(expiryDropPrice) || selectedProductForExpiry.price;

      const updatedProduct: Product = {
        ...selectedProductForExpiry,
        original_price: priceBefore,
        price: newPrice,
      };

      try {
        await updateProduct(updatedProduct);
      } catch (e) {
        console.warn('Could not persist product price update to cloud:', e);
      } finally {
        setIsUpdatingProductPrice(false);
      }

      addToCart(updatedProduct);
      setIsExpiryDialogOpen(false);
      setSelectedProductForExpiry(null);
      showSuccess(`✅ Price dropped to ${settings.shop.currency} ${newPrice.toFixed(2)} (Original: ${settings.shop.currency} ${priceBefore.toFixed(2)}) & added to cart!`);
      focusSearchBar();
    }
  };

  const keepOriginalPriceAndAddToCart = () => {
    if (selectedProductForExpiry) {
      addToCart(selectedProductForExpiry);
      setIsExpiryDialogOpen(false);
      setSelectedProductForExpiry(null);
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
          ? { ...item, qty: Math.max(0, parseFloat((item.qty + delta).toFixed(4))) }
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
      ),
    }));
  };

  const removeFromCart = (id: string, selectedUnit?: string) => {
    const unitName = selectedUnit || 'Piece';
    updateActiveCart(prevCart => ({
      ...prevCart,
      items: prevCart.items.filter(item => !(item.id === id && (item.selected_unit || 'Piece') === unitName)),
    }));
  };

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

  const availableCategories = useMemo(() => {
    const cats = new Set<string>(['ALL', 'DRINKS', 'FOOD', 'HARDWARE', 'COSMETICS', 'OTHER']);
    products.forEach(p => {
      if (p.category && p.category.trim()) cats.add(p.category.trim().toUpperCase());
    });
    return Array.from(cats);
  }, [products]);

  // Frequency ranking based on total sold quantity (Best Sellers first)
  const productSalesFrequencyMap = useMemo(() => {
    const map: Record<string, number> = {};
    (sales || []).forEach(sale => {
      (sale.items || []).forEach(item => {
        map[item.id] = (map[item.id] || 0) + (item.qty || 1);
      });
    });
    return map;
  }, [sales]);

  const filteredCatalogueProducts = useMemo(() => {
    const list = products.filter(product => {
      const matchesSearch = !searchTerm ||
        product.name_dv.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.name_en.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.barcode.includes(searchTerm) ||
        product.item_code.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory = selectedCategory === 'ALL' || product.category === selectedCategory;
      const matchesFavorite = !showFavoritesOnly || favoriteProductIds.includes(product.id);

      return matchesSearch && matchesCategory && matchesFavorite;
    });

    // Sort automatically by Best Sellers first (most frequently sold first)
    return list.sort((a, b) => {
      const salesA = productSalesFrequencyMap[a.id] || 0;
      const salesB = productSalesFrequencyMap[b.id] || 0;
      if (salesB !== salesA) {
        return salesB - salesA;
      }
      return (a.name_dv || '').localeCompare(b.name_dv || '');
    });
  }, [products, searchTerm, selectedCategory, showFavoritesOnly, favoriteProductIds, productSalesFrequencyMap]);

  const displayProducts = useMemo(() => {
    return filteredCatalogueProducts.slice(0, visibleCatalogueCount);
  }, [filteredCatalogueProducts, visibleCatalogueCount]);

  const handleSearchSubmit = (termToSubmit?: string) => {
    const rawTerm = (termToSubmit !== undefined ? termToSubmit : searchTerm).trim();
    if (!rawTerm) {
      // If search bar is empty and Enter is pressed, proceed to checkout if cart has items
      if (activeCart && activeCart.items.length > 0) {
        setIsCashDialogOpen(true);
      }
      return;
    }

    const term = rawTerm.toLowerCase();
    const strippedTerm = term.replace(/^0+/, '');
    let matchedUnit: string | undefined = undefined;

    // 1. Try exact barcode match (product barcode or unit barcode)
    let exactMatch = products.find(p => {
      if (p.barcode && p.barcode.trim() === rawTerm) return true;
      const foundUnit = p.units?.find(u => u.barcode && u.barcode.trim() === rawTerm);
      if (foundUnit) {
        matchedUnit = foundUnit.name;
        return true;
      }
      return false;
    });

    // 2. Try exact item_code match
    if (!exactMatch) {
      exactMatch = products.find(p => 
        p.item_code.toLowerCase() === term ||
        (strippedTerm && p.item_code.replace(/^0+/, '').toLowerCase() === strippedTerm)
      );
    }

    // 3. Try exact name match (English or Dhivehi)
    if (!exactMatch) {
      exactMatch = products.find(p => 
        p.name_en.toLowerCase() === term ||
        p.name_dv.toLowerCase() === term
      );
    }

    // 4. If only one product in the filtered display results, pick that one
    if (!exactMatch && displayProducts.length === 1) {
      exactMatch = displayProducts[0];
    }

    if (exactMatch) {
      if (matchedUnit) {
        addToCart(exactMatch, 1, matchedUnit);
      } else {
        handleProductSelection(exactMatch);
      }
      setSearchTerm('');
      showSuccess(t('product_added_via_barcode', { name: exactMatch.name_dv }));
      focusSearchBar();
    } else {
      showError(`ނުފެނުނު: ${rawTerm} (Product not found)`);
    }
  };

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
        if (settings.general.enableLoyaltyProgram ?? true) {
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
      if (shouldPrintCashReceipt) {
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
        if (settings.general.enableLoyaltyProgram ?? true) {
          if (pointsToRedeem > 0) {
            await redeemLoyaltyPoints(activeCart.customer.id, pointsToRedeem);
          }
          // Note: Loyalty points are NOT awarded on credit sales. They are awarded upon settlement.
        }
      }

      showSuccess(t('credit_sale_successful'));
      setLastSaleForPrint(recordedSale);
      maybeSendTelegramSaleReceipt(recordedSale, activeCart.customer);
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
          ${item.name_dv || item.name_en || ''}${item.selected_unit && item.selected_unit !== 'Piece' ? ` (${item.selected_unit})` : ''}<br/><small style="color: #444;">${item.name_en || ''}${item.selected_unit && item.selected_unit !== 'Piece' ? ` (${item.selected_unit})` : ''}</small>
        </div>
        <div style="width: 60px; text-align: right;">${item.qty} x ${item.price.toFixed(2)}</div>
        <div style="width: 70px; text-align: right;">${(item.qty * item.price).toFixed(2)}</div>
      </div>
    `).join('');

    const gstRate = settings.shop.taxRate || 0;
    const subtotalPrint = sale.grandTotal / (1 + (gstRate / 100));
    const gstAmountPrint = sale.grandTotal - subtotalPrint;

    const logoHtml = settings.shop.logo ? `
      <div style="margin-bottom: 10px; text-align: center;">
        <img src="${settings.shop.logo}" style="max-height: 60px; object-fit: contain;" />
      </div>
    ` : '';

    const method = String(sale.paymentMethod || 'cash').toLowerCase();
    const isCash = method === 'cash';
    const isCredit = method === 'credit';
    const isSplit = method === 'split';

    let paid = Number(sale.paidAmount);
    if (isNaN(paid) || paid <= 0) {
      paid = isCredit ? 0 : Number(sale.grandTotal);
    }

    const change = isCash ? Math.max(0, paid - sale.grandTotal) : 0;
    const balanceDue = isCredit ? sale.grandTotal : Math.max(0, sale.grandTotal - paid);

    let paymentBreakdownHtml = `
      <div style="display: flex; justify-content: space-between; font-size: 12px; margin-top: 3px;">
        <span>Payment Method:</span>
        <span style="font-weight: bold; text-transform: uppercase;">${sale.paymentMethod || 'CASH'}</span>
      </div>
      <div style="display: flex; justify-content: space-between; font-size: 12px; margin-top: 3px;">
        <span>Paid Amount:</span>
        <span style="font-weight: bold;">${currency} ${paid.toFixed(2)}</span>
      </div>
    `;

    if (change > 0) {
      paymentBreakdownHtml += `
        <div style="display: flex; justify-content: space-between; font-size: 12px; margin-top: 3px;">
          <span>Change:</span>
          <span style="font-weight: bold;">${currency} ${change.toFixed(2)}</span>
        </div>
      `;
    }

    if (balanceDue > 0 && isCredit) {
      paymentBreakdownHtml += `
        <div style="display: flex; justify-content: space-between; font-size: 12px; margin-top: 3px;">
          <span>Balance Due:</span>
          <span style="font-weight: bold;">${currency} ${balanceDue.toFixed(2)}</span>
        </div>
      `;
    }

    if (isSplit && Array.isArray(sale.splitDetails) && sale.splitDetails.length > 0) {
      paymentBreakdownHtml += `<div style="margin-top: 4px; font-size: 11px; border-top: 1px dotted #888; padding-top: 4px;">`;
      sale.splitDetails.forEach((d: any) => {
        paymentBreakdownHtml += `
          <div style="display: flex; justify-content: space-between; color: #444;">
            <span>${d.method || 'Split'}:</span>
            <span>${currency} ${Number(d.amount || 0).toFixed(2)}</span>
          </div>
        `;
      });
      paymentBreakdownHtml += `</div>`;
    }

    const customerHtml = sale.customer ? `
      <div style="font-size: 11px; margin-top: 6px; text-align: left; border: 1px dashed #ccc; padding: 4px 6px; border-radius: 4px;">
        <div><strong>Customer:</strong> ${sale.customer.name_dv || ''} (${sale.customer.name_en || ''})</div>
        ${sale.customer.code ? `<div><strong>Code:</strong> ${sale.customer.code}</div>` : ''}
        ${sale.customer.phone ? `<div><strong>Phone:</strong> ${sale.customer.phone}</div>` : ''}
      </div>
    ` : '';

    const htmlContent = `
      <html>
        <head>
          <title>Receipt ${sale.invoiceNumber || sale.id}</title>
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
          <div style="font-weight: bold; font-size: 15px;">${settings.shop.shopName}</div>
          <div style="font-size: 12px;">${settings.shop.shopAddress}</div>
          <div style="font-size: 10px; margin-top: 4px;">Tel: ${settings.shop.shopPhone}<br/>${formatDate(sale.date)} ${formatTime(sale.date)} | ${sale.invoiceNumber || sale.id}</div>
          ${customerHtml}
          <div style="border-top: 1px dashed #000; margin: 8px 0;"></div>
          ${itemsHtml}
          <div style="border-top: 1px dashed #000; margin: 8px 0;"></div>
          <div style="display: flex; justify-content: space-between; font-size: 12px;">
            <span>Subtotal:</span>
            <span>${currency} ${subtotalPrint.toFixed(2)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 12px; margin-top: 2px;">
            <span>GST (${gstRate}%):</span>
            <span>${currency} ${gstAmountPrint.toFixed(2)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 14px; margin-top: 4px; padding-top: 4px; border-top: 1px solid #000;">
            <span>TOTAL:</span>
            <span>${currency} ${sale.grandTotal.toFixed(2)}</span>
          </div>
          <div style="border-top: 1px dashed #000; margin: 8px 0;"></div>
          ${paymentBreakdownHtml}
          <div style="border-top: 1px dashed #000; margin: 8px 0;"></div>
          <div style="font-size: 10px; margin-top: 10px; font-style: italic;">Thank you for shopping with us!</div>
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

  const equalizeSplit = () => {
    if (splitEntries.length === 0) return;
    const equalAmount = grandTotal / splitEntries.length;
    const newEntries = splitEntries.map(e => ({
      ...e,
      amount: Number(equalAmount.toFixed(2))
    }));
    const sum = newEntries.reduce((s, e) => s + e.amount, 0);
    if (Math.abs(sum - grandTotal) > 0.001) {
      newEntries[newEntries.length - 1].amount += (grandTotal - sum);
    }
    setSplitEntries(newEntries);
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
        } else if (entry.customerId && (settings.general.enableLoyaltyProgram ?? true)) {
          const loyaltyAmountPerPoint = settings.general.loyaltyAmountPerPoint || 20;
          const pointsEarned = Math.floor(entry.amount / loyaltyAmountPerPoint);
          if (pointsEarned > 0) {
            await awardLoyaltyPoints(entry.customerId, pointsEarned);
          }
        }
      }

      if (activeCart?.customer && (settings.general.enableLoyaltyProgram ?? true) && pointsToRedeem > 0) {
        await redeemLoyaltyPoints(activeCart.customer.id, pointsToRedeem);
      }

      showSuccess(t('split_payment_successful'));
      setLastSaleForPrint(recordedSale);
      maybeSendTelegramSaleReceipt(recordedSale, activeCart?.customer || null);
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
        <div className="h-20 px-6 flex items-center justify-between gap-4 border-b border-border bg-background/50 backdrop-blur-sm">
          {/* Left utility controls */}
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              className="hidden xl:flex items-center gap-2 border-primary/20 text-primary hover:bg-primary/10 rounded-xl h-10 text-[10px] font-black"
              onClick={() => window.open('/customer-display', '_blank')}
            >
              <MonitorPlay className="h-4 w-4" />
              CUSTOMER DISPLAY
            </Button>
            
            <Select value={selectedCategory} onValueChange={(val) => { setSelectedCategory(val); setVisibleCatalogueCount(60); }}>
              <SelectTrigger className="w-[150px] sm:w-[170px] h-10 rounded-xl bg-muted border-border text-[10px] font-black uppercase text-foreground">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border text-foreground font-faruma max-h-64">
                {availableCategories.map((cat) => (
                  <SelectItem key={cat} value={cat} className="text-[10px] font-black uppercase hover:bg-primary/20">
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => { setShowFavoritesOnly(!showFavoritesOnly); setVisibleCatalogueCount(60); }}
              className={cn(
                "h-10 w-10 rounded-xl border border-border transition-all",
                showFavoritesOnly ? "bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30" : "bg-muted hover:bg-muted/80 text-muted-foreground"
              )}
              title="Favorites (ތަރި)"
            >
              <Heart className={cn("h-4 w-4", showFavoritesOnly ? "fill-current text-yellow-500" : "text-muted-foreground")} />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsTransferSlipsDialogOpen(true)}
              title="Bank Transfer Slips from Telegram"
              className={cn(
                "relative h-10 w-10 rounded-xl bg-muted border border-border hover:bg-amber-500/20 hover:text-amber-500 text-muted-foreground transition-all",
                pendingSlipsCount > 0 && "border-amber-500/50 bg-amber-500/10 text-amber-500"
              )}
            >
              <CreditCard className="h-4 w-4" />
              {pendingSlipsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 text-black rounded-full text-[10px] font-black flex items-center justify-center border-2 border-background animate-pulse">
                  {pendingSlipsCount}
                </span>
              )}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsPendingTransfersDialogOpen(true)}
              title="Pending Transfers"
              className="relative h-10 w-10 rounded-xl bg-muted border border-border hover:bg-yellow-500/20 hover:text-yellow-500 text-muted-foreground"
            >
              <ArrowRightLeft className="h-4 w-4" />
              {pendingTransfers.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-500 text-[#050510] rounded-full text-[10px] font-black flex items-center justify-center border-2 border-[#050510]">
                  {pendingTransfers.length}
                </span>
              )}
            </Button>
          </div>

          {/* Right: Search Bar positioned directly next to the Cart panel */}
          <div className="flex-1 max-w-lg ml-auto">
            <div className="relative">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-primary pointer-events-none" />
              <Input
                ref={searchInputRef}
                placeholder="...Search name, code, barcode (Enter to add)"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setVisibleCatalogueCount(60); }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSearchSubmit();
                  }
                }}
                className="w-full bg-muted/90 hover:bg-muted border-2 border-border focus:border-primary rounded-xl px-12 text-right font-bold h-11 text-foreground transition-all placeholder:text-muted-foreground/60 shadow-xs text-xs sm:text-sm"
                dir="rtl"
              />
              <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                {searchTerm ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm('');
                      setVisibleCatalogueCount(60);
                      searchInputRef.current?.focus();
                    }}
                    className="text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-muted-foreground/10 transition-colors"
                    title="Clear search"
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : (
                  <kbd className="hidden sm:inline-flex items-center text-[10px] font-mono font-bold text-muted-foreground/70 bg-background/80 border border-border/80 px-1.5 py-0.5 rounded shadow-xs select-none" title="Press F2 anytime to focus">
                    F2
                  </kbd>
                )}
              </div>
            </div>
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
                  className="group apple-glass-card hover:-translate-y-1 hover:shadow-xl border border-white/25 dark:border-white/10 rounded-2xl p-2.5 transition-all duration-300 cursor-pointer relative active:scale-[0.98]"
                >
                  <div className={cn(
                    "aspect-square rounded-xl mb-2 flex items-center justify-center overflow-hidden relative border border-white/20 dark:border-white/10 shadow-xs",
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
                    {(productSalesFrequencyMap[product.id] || 0) >= 5 && (
                      <Badge className="absolute top-2 left-2 bg-amber-500 text-black border-none text-[8px] font-black px-1.5 py-0 rounded-full shadow-md uppercase tracking-wider font-mono">
                        🔥 HOT
                      </Badge>
                    )}
                  </div>

                  <div className="text-center px-1">
                    <h3 className="text-sm font-black text-foreground leading-tight truncate mb-0.5">{product.name_dv}</h3>
                    <p className="text-[11px] font-bold text-muted-foreground truncate uppercase tracking-normal mb-1.5 font-mono">{product.name_en}</p>

                    <div className="flex items-center justify-center gap-1.5">
                      <span className="text-xs font-black text-primary font-mono leading-none">{settings.shop.currency} {product.price.toFixed(2)}</span>
                      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white scale-0 group-hover:scale-100 transition-transform shadow-[0_0_15px_rgba(0,132,255,0.5)]">
                        <PlusCircle className="h-4 w-4" />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {visibleCatalogueCount < filteredCatalogueProducts.length && (
            <div className="py-6 flex flex-col items-center justify-center gap-2">
              <Button
                variant="outline"
                onClick={() => setVisibleCatalogueCount(prev => prev + 60)}
                className="apple-glass-card hover:bg-muted border border-white/20 text-foreground font-black px-8 py-3 rounded-2xl text-xs tracking-wider shadow-md hover:border-primary/50 transition-all gap-2 apple-glass-pill"
              >
                <span>Load More Products</span>
                <Badge variant="secondary" className="font-mono text-[11px]">
                  {filteredCatalogueProducts.length - visibleCatalogueCount} remaining
                </Badge>
              </Button>
              <p className="text-[11px] text-muted-foreground font-bold">
                Showing {displayProducts.length} of {filteredCatalogueProducts.length} products
              </p>
            </div>
          )}
        </ScrollArea>
      </div>

      <div className="w-[32rem] xl:w-[36rem] 2xl:w-[40rem] max-w-[45vw] flex flex-col apple-liquid-glass border-l border-white/20 dark:border-white/10 shadow-2xl z-20">
        <div className="p-6 pb-2">
          <div className="flex items-center gap-1 bg-muted p-1 rounded-2xl border border-border mb-6">
            <div className="flex items-center gap-3 px-4 py-1.5 bg-primary/20 rounded-xl text-primary border border-primary/20">
              <ShoppingCart className="h-4 w-4" />
              <div className="flex flex-col items-start leading-none gap-0.5">
                <span className="text-[9px] font-black uppercase text-primary/80 tracking-tighter">(Cart)</span>
                <span className="text-xs font-black">{t('cart')}</span>
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
                <span className="text-xs font-black">{t('add_new_cart')}</span>
                <span className="text-[9px] font-bold uppercase text-muted-foreground tracking-tight">(Add New Cart)</span>
              </div>
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 mb-3">
            {[...openCarts.values()].map((cart, idx) => {
              const displayNumber = idx + 1;
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
                    <span>Cart #{displayNumber}</span>
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
                CART #{[...openCarts.keys()].indexOf(activeCartId) + 1 || 1}
              </span>
              {activeCart?.customer ? (
                <div className="flex items-center gap-2 text-xs font-bold text-primary truncate">
                  <User className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{activeCart.customer.name_dv || activeCart.customer.name_en}</span>
                  <button
                    type="button"
                    onClick={() => {
                      updateActiveCart(prev => ({ ...prev, customer: null }));
                      setPointsToRedeem(0);
                      showSuccess('Switched to Walk-in Cash Customer (ކަސްޓަމަރު ވަކިކުރެވިއްޖެ)');
                    }}
                    className="h-5 px-2 text-[9px] font-black bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-md flex items-center gap-1 transition-all shrink-0 border border-red-500/20 active:scale-95"
                    title="Remove customer from cart (Change to Walk-in Cash Customer)"
                  >
                    <X className="h-2.5 w-2.5 stroke-[3]" />
                    <span>Deselect (ވަކިކުރޭ)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTelegramCustomer(activeCart.customer);
                      setIsTelegramDialogOpen(true);
                    }}
                    className={cn(
                      "h-5 px-1.5 text-[9px] font-bold rounded-md flex items-center gap-1 transition-colors shrink-0",
                      activeCart.customer.telegram_chat_id
                        ? "bg-[#229ED9]/15 text-[#229ED9] hover:bg-[#229ED9]/25"
                        : "bg-muted text-muted-foreground hover:text-[#229ED9] hover:bg-[#229ED9]/10"
                    )}
                    title={activeCart.customer.telegram_chat_id ? `Telegram Linked (Chat ID: ${activeCart.customer.telegram_chat_id})` : "Click to connect Telegram"}
                  >
                    <TelegramIcon className="h-2.5 w-2.5" />
                    <span>{activeCart.customer.telegram_chat_id ? 'Linked' : 'Bot Connect'}</span>
                  </button>
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

          {/* Customer Loyalty Points Card & Redeem Action */}
          {activeCart?.customer && (settings.general.enableLoyaltyProgram ?? true) && (
            <div className="flex items-center justify-between px-3.5 py-2.5 bg-gradient-to-l from-amber-500/15 via-amber-500/10 to-transparent border border-amber-500/30 rounded-2xl mb-3 transition-all shadow-sm">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0 shadow-sm ring-1 ring-amber-500/30">
                  <Gift className="h-4.5 w-4.5" />
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-black text-foreground font-mono">
                      {(activeCart.customer.loyalty_points || 0).toFixed(0)} PTS
                    </span>
                    <span className="text-[11px] text-amber-600 dark:text-amber-400 font-mono font-bold">
                      (≈ {settings.shop.currency} {((activeCart.customer.loyalty_points || 0) / (settings.general.loyaltyPointsValue || 10)).toFixed(2)})
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-bold block">
                    ލޯޔަލްޓީ ޕޮއިންޓް (Loyalty Points)
                  </span>
                </div>
              </div>

              {pointsToRedeem > 0 ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setPointsToRedeem(0)}
                  className="h-8 px-3 text-xs font-black border-red-500/30 text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                  title="Cancel loyalty discount"
                >
                  Cancel ({pointsToRedeem} pts)
                </Button>
              ) : (
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    disabled={(activeCart.customer.loyalty_points || 0) <= 0 || activeCart.items.length === 0}
                    onClick={() => {
                      const maxPointsForCart = Math.floor(grandTotal * (settings.general.loyaltyPointsValue || 10));
                      const maxUse = Math.min(activeCart.customer!.loyalty_points || 0, maxPointsForCart);
                      if (maxUse > 0) {
                        setPointsToRedeem(maxUse);
                        showSuccess(`⭐ Applied ${maxUse} Loyalty Points discount!`);
                      }
                    }}
                    className="h-8 bg-amber-500/20 hover:bg-amber-500/30 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-[11px] font-black px-2.5 rounded-xl transition-all disabled:opacity-40"
                    title="Redeem maximum available points"
                  >
                    All (ހުރިހާ)
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={(activeCart.customer.loyalty_points || 0) <= 0 || activeCart.items.length === 0}
                    onClick={() => setIsLoyaltyRedemptionDialogOpen(true)}
                    className="h-8 bg-amber-500 hover:bg-amber-600 text-black text-xs font-black px-3.5 rounded-xl shadow-sm gap-1.5 active:scale-95 disabled:opacity-40 transition-all"
                  >
                    <Gift className="h-3.5 w-3.5" />
                    <span>Redeem (ބޭނުންކުރޭ)</span>
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        <ScrollArea className="flex-1 px-4 custom-scrollbar">
          {(!activeCart || activeCart.items.length === 0) ? (
            <div className="flex flex-col items-center justify-center h-[400px] opacity-20">
              <ShoppingCart className="h-20 w-20 mb-4" />
              <p className="text-lg font-black uppercase tracking-widest">{renderBoth('cart_empty')}</p>
            </div>
          ) : (
            <div className="space-y-1.5 pb-4">
              {activeCart.items.map((item, idx) => (
                <div
                  key={`${item.id}-${item.selected_unit || 'Piece'}`}
                  className="group relative bg-card/70 hover:bg-card border border-border/80 hover:border-border rounded-xl p-2 sm:p-2.5 transition-all shadow-sm flex items-center justify-between gap-2.5"
                >
                  {/* Left Side: [Trash] [Total MVR] [Unit Price MVR] [Unit Pill] [- Qty +] */}
                  <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                    {/* Trash Button */}
                    <button
                      type="button"
                      onClick={() => removeFromCart(item.id, item.selected_unit)}
                      className="text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-colors p-1 rounded-lg shrink-0 -ml-1"
                      title={t('remove_item') || 'Remove Item'}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>

                    {/* Total Price: e.g. 14 MVR */}
                    <div className="text-xs sm:text-sm font-black text-primary font-mono whitespace-nowrap">
                      {(item.price * (item.qty || 1)).toFixed(2)} <span className="text-[10px] font-bold opacity-80">{settings.shop.currency}</span>
                    </div>

                    {/* Unit Price: e.g. 7 MVR */}
                    <div className="text-[10px] sm:text-[11px] font-bold text-muted-foreground font-mono whitespace-nowrap">
                      {item.price.toFixed(2)} <span className="text-[9px]">{settings.shop.currency}</span>
                    </div>

                    {/* Unit Pill / Dropdown: e.g. NOS */}
                    {(() => {
                      const prod = products.find(p => p.id === item.id);
                      const hasUnits = prod?.units && prod.units.length > 0;
                      const currentUnit = item.selected_unit || 'Piece';

                      if (!hasUnits) {
                        return (
                          <span className="text-[9px] sm:text-[10px] font-mono font-bold uppercase bg-primary/10 text-primary border border-primary/25 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                            {currentUnit}
                          </span>
                        );
                      }

                      return (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              className="flex items-center gap-0.5 text-[9px] sm:text-[10px] font-mono font-bold uppercase bg-primary/10 hover:bg-primary/20 text-primary border border-primary/25 px-1.5 py-0.5 rounded-full transition-all cursor-pointer shadow-xs active:scale-95"
                              title={t('switch_unit') || 'Switch Unit'}
                            >
                              <span>{currentUnit}</span>
                              <ChevronDown className="h-2.5 w-2.5 opacity-70" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="bg-card border-border text-foreground font-faruma text-right min-w-[190px] z-[120] shadow-2xl rounded-xl p-1">
                            <div className="px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-muted-foreground border-b border-border text-right">
                              {t('switch_unit') || 'Switch Unit (ޔުނިޓް ބަދަލުކުރޭ)'}
                            </div>
                            <DropdownMenuItem
                              onClick={() => switchCartItemUnit(item, 'Piece')}
                              className={cn(
                                "flex items-center justify-between text-xs py-1.5 px-2.5 rounded-lg cursor-pointer hover:bg-muted transition-colors",
                                currentUnit === 'Piece' && "font-black text-primary bg-primary/10"
                              )}
                            >
                              <span className="font-mono font-bold text-primary">{settings?.shop?.currency || 'MVR'} {Number(prod.price || 0).toFixed(2)}</span>
                              <span className="font-bold">Piece (1 pc)</span>
                            </DropdownMenuItem>
                            {prod.units!.map((u, uIdx) => (
                              <DropdownMenuItem
                                key={uIdx}
                                onClick={() => switchCartItemUnit(item, u.name)}
                                className={cn(
                                  "flex items-center justify-between text-xs py-1.5 px-2.5 rounded-lg cursor-pointer hover:bg-muted transition-colors",
                                  currentUnit === u.name && "font-black text-primary bg-primary/10"
                                )}
                              >
                                <span className="font-mono font-bold text-primary">{settings?.shop?.currency || 'MVR'} {Number(u.price || 0).toFixed(2)}</span>
                                <span className="font-bold">{u.name} ({u.conversion_factor} pcs)</span>
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      );
                    })()}

                    {/* Stepper Capsule: [- 0.2 +] */}
                    <CartQtyStepper
                      item={item}
                      onUpdate={updateCartItemQty}
                      onSet={setCartItemQty}
                      isLast={idx === activeCart.items.length - 1}
                      lastQtyInputRef={lastQtyInputRef}
                      onFocus={handleFocus}
                      focusSearchBar={focusSearchBar}
                    />
                  </div>

                  {/* Right Side: Product Names and Item Code Badge */}
                  <div className="flex-1 text-right min-w-0 pl-2">
                    <div className="flex items-center justify-end gap-1.5 leading-tight">
                      {item.item_code && (
                        <span className="font-mono text-[10px] font-black text-primary bg-primary/10 border border-primary/25 px-1.5 py-0.5 rounded-md tracking-wider shrink-0 select-all">
                          #{item.item_code}
                        </span>
                      )}
                      <p className="text-xs sm:text-sm font-black text-foreground truncate">
                        {item.name_dv}
                      </p>
                    </div>
                    <p className="text-[11px] sm:text-xs font-bold text-muted-foreground leading-tight uppercase truncate font-mono mt-0.5">
                      {item.name_en}
                    </p>
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
            {loyaltyDiscount > 0 && (
              <div className="flex justify-between text-xs font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
                <span className="flex items-center gap-1.5">
                  <Gift className="h-3.5 w-3.5" />
                  <span>Loyalty Discount ({pointsToRedeem} PTS):</span>
                </span>
                <span className="font-mono font-black">- {settings.shop.currency} {loyaltyDiscount.toFixed(2)}</span>
              </div>
            )}
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
            onClick={openCashDialog}
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
        <DialogContent className="sm:max-w-[38rem] 2xl:max-w-[44rem] w-[94vw] font-faruma bg-card text-foreground border border-border text-right p-5 sm:p-7 shadow-2xl rounded-3xl box-border overflow-hidden [&>button]:left-4 [&>button]:right-auto" dir="rtl">
          <DialogHeader className="pb-3.5 text-right space-y-1.5 border-b border-border/60 pl-10 pr-1">
            <div className="flex items-center justify-between">
              <div className="text-right flex-1 min-w-0">
                <DialogTitle className="text-xl sm:text-2xl font-black text-foreground flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                    <DollarSign className="h-5 w-5" />
                  </div>
                  <span>{renderBoth('cash_payment')}</span>
                </DialogTitle>
                <DialogDescription className="text-xs sm:text-sm text-muted-foreground mt-0.5 text-right">
                  {renderBoth('enter_paid_amount')}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="py-3 space-y-3.5 w-full max-w-full overflow-hidden">
            {/* Total Amount Card */}
            <div className="bg-gradient-to-l from-primary/20 via-primary/10 to-muted/40 border border-primary/30 rounded-2xl p-4 flex items-center justify-between shadow-sm w-full box-border">
              <div className="text-right">
                <span className="text-sm font-black text-foreground block">ޖުމްލަ އަދަދު</span>
                <span className="text-[11px] text-muted-foreground font-bold block mt-0.5">({t('total_amount') || 'Total Payable'})</span>
              </div>
              <div className="text-left font-mono pl-2" dir="ltr">
                <div className="text-[10px] font-bold text-primary/80 uppercase tracking-widest">Total Payable</div>
                <div className="text-2xl sm:text-3xl font-black text-primary leading-tight mt-0.5">
                  {settings.shop.currency} {grandTotal.toFixed(2)}
                </div>
              </div>
            </div>

            {/* Paid Amount Input */}
            <div className="space-y-1.5 w-full box-border">
              <div className="flex items-center justify-between px-1">
                <Label htmlFor="paidAmount" className="text-right block text-foreground font-black text-xs uppercase tracking-wider">
                  {renderBoth('paid_amount')}
                </Label>
                <span className="text-[11px] font-mono text-muted-foreground/70" dir="ltr">Tendered Cash</span>
              </div>
              <div className="flex items-center rounded-2xl border-2 border-border focus-within:border-primary bg-background overflow-hidden transition-all shadow-inner h-14 w-full" dir="ltr">
                <div className="bg-muted px-4 h-full flex items-center justify-center font-mono font-black text-base text-primary border-r border-border shrink-0 select-none">
                  {settings.shop.currency}
                </div>
                <Input
                  id="paidAmount"
                  type="number"
                  step="any"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  onFocus={handleFocus}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      processCashPayment();
                    }
                  }}
                  className="h-full flex-1 border-0 bg-transparent text-left font-mono text-2xl sm:text-3xl font-black px-4 focus-visible:ring-0 focus-visible:ring-offset-0 text-foreground [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none rounded-none"
                  autoFocus
                />
              </div>
            </div>

            {/* Quick Tender Denomination Chips */}
            <div className="space-y-1.5 w-full box-border">
              <div className="flex items-center justify-between px-1">
                <div className="text-[10px] font-black uppercase tracking-wider text-muted-foreground text-right">
                  އަވަސް ފައިސާ (Quick Tender Presets)
                </div>
                <span className="text-[10px] text-muted-foreground/70 font-mono">Fast Click</span>
              </div>
              
              {/* Presets Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 w-full">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setPaidAmount(grandTotal)}
                  className="h-8.5 px-2 rounded-xl border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 text-xs font-black transition-all active:scale-95 w-full truncate"
                >
                  Exact ({grandTotal.toFixed(2)})
                </Button>
                {[
                  Math.ceil(grandTotal / 10) * 10,
                  Math.ceil(grandTotal / 50) * 50,
                  Math.ceil(grandTotal / 100) * 100,
                  Math.ceil(grandTotal / 500) * 500,
                  Math.ceil(grandTotal / 1000) * 1000,
                ]
                  .filter((val, idx, arr) => val > grandTotal && arr.indexOf(val) === idx)
                  .slice(0, 3)
                  .map((presetVal) => (
                    <Button
                      key={presetVal}
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setPaidAmount(presetVal)}
                      className="h-8.5 px-2 rounded-xl border-border hover:bg-muted text-xs font-mono font-bold transition-all active:scale-95 w-full truncate"
                    >
                      {settings.shop.currency} {presetVal}
                    </Button>
                  ))}
              </div>

              {/* Quick Additions Grid */}
              <div className="grid grid-cols-5 gap-1.5 w-full">
                {[10, 20, 50, 100, 500].map((addVal) => (
                  <Button
                    key={addVal}
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setPaidAmount((prev) => (typeof prev === 'number' ? prev + addVal : addVal))}
                    className="h-8 px-1 rounded-xl bg-muted/80 hover:bg-muted text-muted-foreground hover:text-foreground text-xs font-mono font-bold transition-all active:scale-95 w-full"
                  >
                    +{addVal}
                  </Button>
                ))}
              </div>
            </div>

            {/* Change / Shortage Status Card */}
            <div className={cn(
              "p-3.5 sm:p-4 rounded-2xl border transition-all flex items-center justify-between shadow-sm w-full box-border",
              balance >= 0 
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400" 
                : "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400"
            )}>
              <div className="text-right flex items-center gap-2.5">
                {balance >= 0 ? (
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
                    <AlertTriangle className="h-4.5 w-4.5 text-amber-500" />
                  </div>
                )}
                <div>
                  <span className="text-xs sm:text-sm font-black block">
                    {balance >= 0 ? "ބާކީ ދޭންވީ" : "އަދި މަދުވާ އަދަދު"}
                  </span>
                  <span className="text-[10px] opacity-80 block mt-0.5">
                    {balance >= 0 ? "(Change to Return)" : "(Remaining Due)"}
                  </span>
                </div>
              </div>

              <div className="text-left font-mono pl-2" dir="ltr">
                <div className="text-[10px] font-bold uppercase tracking-wider opacity-80">
                  {balance >= 0 ? "Change Due" : "Shortage"}
                </div>
                <div className="text-xl sm:text-2xl font-black leading-tight mt-0.5">
                  {settings.shop.currency} {Math.abs(balance).toFixed(2)}
                </div>
              </div>
            </div>

            {/* Print Receipt Toggle Option */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-muted/50 border border-border w-full box-border">
              <div className="flex items-center gap-2.5">
                <div className={cn(
                  "w-8 h-8 rounded-xl flex items-center justify-center transition-colors shrink-0",
                  shouldPrintCashReceipt ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                )}>
                  <Printer className="h-4 w-4" />
                </div>
                <div className="text-right">
                  <Label htmlFor="printCashReceipt" className="text-xs font-black text-foreground cursor-pointer block">
                    ރަސީދު ޕްރިންޓް ކުރޭ (Print Receipt)
                  </Label>
                  <span className="text-[10px] text-muted-foreground block">
                    {shouldPrintCashReceipt ? 'ޕްރިންޓް ކުރެވޭނެ (Will print receipt)' : 'ޕްރިންޓެއް ނުކުރާނެ (No receipt print)'}
                  </span>
                </div>
              </div>
              <Switch
                id="printCashReceipt"
                checked={shouldPrintCashReceipt}
                onCheckedChange={(checked) => {
                  setShouldPrintCashReceipt(checked);
                  localStorage.setItem('pos_print_cash_receipt', String(checked));
                }}
              />
            </div>
          </div>

          <DialogFooter className="gap-2.5 pt-3 border-t border-border/60 w-full flex flex-col-reverse sm:flex-row">
            <Button
              variant="outline"
              onClick={() => setIsCashDialogOpen(false)}
              className="h-11 sm:h-12 px-5 rounded-2xl border-border hover:bg-muted text-foreground font-bold text-xs sm:text-sm"
            >
              {renderBoth('cancel')}
            </Button>
            <Button
              onClick={processCashPayment}
              disabled={typeof paidAmount === 'number' && paidAmount < grandTotal}
              className="h-11 sm:h-12 flex-1 rounded-2xl btn-gradient-blue text-white font-black text-sm sm:text-base shadow-lg shadow-blue-500/25 hover:shadow-blue-500/35 gap-2"
            >
              <Check className="h-4 w-4" />
              <span>{renderBoth('confirm_payment')}</span>
              <kbd className="hidden sm:inline-block text-[10px] font-mono bg-white/20 px-1.5 py-0.5 rounded-md ml-1 font-bold">↵ Enter</kbd>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCreditDialogOpen} onOpenChange={setIsCreditDialogOpen}>
        <DialogContent className="sm:max-w-[36rem] 2xl:max-w-[42rem] w-[calc(100vw-2rem)] font-faruma bg-card text-foreground border border-border text-right p-5 sm:p-6 shadow-2xl rounded-3xl overflow-hidden box-border [&>button]:left-4 [&>button]:right-auto" dir="rtl">
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
        <DialogContent className="sm:max-w-[480px] w-[calc(100vw-2rem)] font-faruma apple-glass-card bg-card/95 text-foreground border border-white/20 dark:border-white/10 p-6 sm:p-7 shadow-2xl rounded-3xl box-border overflow-hidden [&>button]:left-4 [&>button]:right-auto space-y-4" dir="rtl">
          <DialogHeader className="text-right pb-3 border-b border-border/60">
            <div className="flex items-start justify-between pl-8">
              <div className="text-right flex-1 min-w-0">
                <DialogTitle className="text-lg sm:text-xl font-black text-foreground flex items-center justify-end gap-2.5 flex-wrap">
                  <span className="leading-tight break-words">{renderBoth('confirm_cart_removal')}</span>
                  <div className="h-9 w-9 rounded-xl bg-red-500/15 text-red-500 flex items-center justify-center shrink-0 ring-1 ring-red-500/30">
                    <Trash2 className="h-5 w-5" />
                  </div>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-1.5 leading-relaxed text-right break-words">
                  {renderBoth('confirm_cart_removal_description')}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-right">
            <p className="text-xs font-bold text-red-600 dark:text-red-400 leading-relaxed">
              ⚠️ ކާޓުގައި ހުރި ހުރިހާ އައިޓަމެއް އުނިވާނެއެވެ. މި އަމަލު އަނބުރާ ނުގެނެވޭނެއެވެ.
            </p>
          </div>

          <DialogFooter className="gap-3 pt-3 border-t border-border flex flex-row justify-between items-center w-full">
            <Button
              variant="outline"
              onClick={() => setIsConfirmRemoveCartDialogOpen(false)}
              className="flex-1 h-11 border-border hover:bg-muted text-foreground rounded-xl font-bold text-xs"
            >
              {renderBoth('cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={confirmRemoveCart}
              className="flex-1 h-11 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl shadow-lg shadow-red-600/20 text-xs uppercase tracking-wider gap-2"
            >
              <Trash2 className="h-4 w-4" />
              <span>{renderBoth('confirm')}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isExpiryDialogOpen} onOpenChange={setIsExpiryDialogOpen}>
        <DialogContent className="sm:max-w-[500px] w-[calc(100vw-2rem)] max-h-[90vh] overflow-y-auto overflow-x-hidden font-faruma apple-glass-card bg-card/95 text-foreground border border-white/20 dark:border-white/10 text-right p-5 sm:p-6 shadow-2xl rounded-3xl box-border [&>button]:left-4 [&>button]:right-auto space-y-4" dir="rtl">
          {(() => {
            const basePrice = selectedProductForExpiry?.original_price || selectedProductForExpiry?.price || 0;
            const currentNewPrice = Number(expiryDropPrice) || basePrice;
            const savings = Math.max(0, basePrice - currentNewPrice);
            const discountPct = basePrice > 0 ? Math.round((savings / basePrice) * 100) : 0;
            const expiryDate = selectedProductForExpiry?.expiry_date ? new Date(selectedProductForExpiry.expiry_date) : null;
            const today = new Date();
            const diffDays = expiryDate ? Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : 0;

            return (
              <>
                <DialogHeader className="pb-3 text-right space-y-2 border-b border-border/60">
                  <div className="flex flex-col-reverse sm:flex-row items-start sm:items-center justify-between gap-2.5 pl-8">
                    {selectedProductForExpiry?.expiry_date && (
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[11px] font-black shrink-0 px-3 py-1 rounded-xl font-mono",
                          diffDays <= 7
                            ? "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30"
                            : "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30"
                        )}
                      >
                        <Clock className="h-3 w-3 mr-1 inline" />
                        {diffDays <= 0 ? 'Expires Today' : `${diffDays} days left`} ({formatDate(selectedProductForExpiry.expiry_date)})
                      </Badge>
                    )}
                    <div className="text-right flex-1 min-w-0">
                      <DialogTitle className="text-xl font-black text-orange-600 dark:text-orange-400 flex items-center justify-end gap-2">
                        <span className="truncate">މުއްދަތު ހަމަވާތީ އަގު ތިރިކުރުން</span>
                        <Flame className="h-5 w-5 shrink-0 text-orange-500" />
                      </DialogTitle>
                      <p className="text-[11px] text-muted-foreground font-bold tracking-wide mt-0.5">
                        Drop Selling Price for Near-Expiry Item
                      </p>
                    </div>
                  </div>
                  <DialogDescription className="text-muted-foreground text-xs leading-relaxed text-right pt-1 break-words">
                    މި މުދަލުގެ މުއްދަތު ހަމަވާން ކައިރިވެފައިވާތީ އަގު ތިރިކޮށް، ސިސްޓަމްގައި ރައްކާކުރަން ބޭނުންފުޅުވާ އާ އަގު ކަނޑައަޅުއްވާ.
                  </DialogDescription>
                </DialogHeader>

                {/* Product details & Price comparison card */}
                <div className="p-4 bg-orange-500/10 dark:bg-orange-500/15 rounded-2xl border border-orange-500/30 space-y-3.5 text-right">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-mono font-bold text-muted-foreground">
                      Stock: {selectedProductForExpiry?.stock_shop || 0} pcs
                    </span>
                    <div className="min-w-0 flex-1 text-right">
                      <p className="font-black text-sm text-foreground truncate">{selectedProductForExpiry?.name_dv}</p>
                      <p className="text-[11px] text-muted-foreground font-mono font-bold truncate">{selectedProductForExpiry?.name_en}</p>
                    </div>
                  </div>

                  {/* Pricing Comparison Grid */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="p-3 bg-background/80 rounded-xl border border-border text-right">
                      <span className="text-[10px] text-muted-foreground font-bold uppercase block mb-0.5">
                        ކުރީގެ އަގު (Price Before)
                      </span>
                      <span className="text-base font-black text-muted-foreground font-mono line-through opacity-80">
                        {settings.shop.currency} {basePrice.toFixed(2)}
                      </span>
                    </div>

                    <div className="p-3 bg-orange-500/20 rounded-xl border border-orange-500/40 text-right">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[10px] text-orange-600 dark:text-orange-400 font-black uppercase">
                          އާ އަގު (Drop Price)
                        </span>
                        {discountPct > 0 && (
                          <Badge className="bg-orange-500 text-white text-[9px] font-mono px-1.5 py-0 h-4">
                            {discountPct}% OFF
                          </Badge>
                        )}
                      </div>
                      <span className="text-lg font-black text-orange-600 dark:text-orange-300 font-mono">
                        {settings.shop.currency} {currentNewPrice.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Preset Percent Drop Pills */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[11px] font-bold text-muted-foreground block text-right">
                      އަވަސް ޑިސްކައުންޓް ޕަސެންޓް (Quick Drop Presets):
                    </span>
                    <div className="grid grid-cols-4 gap-2">
                      {[10, 20, 30, 50].map((pct) => (
                        <Button
                          key={pct}
                          type="button"
                          variant="outline"
                          onClick={() => {
                            const newP = Math.max(1, Number((basePrice * (1 - pct / 100)).toFixed(2)));
                            setExpiryDropPrice(newP);
                            setExpiryDiscountPercent(pct);
                          }}
                          className={cn(
                            "h-9 border-orange-500/30 font-black text-xs rounded-xl transition-all font-mono",
                            discountPct === pct
                              ? "bg-orange-500 text-white hover:bg-orange-600 shadow-sm"
                              : "text-orange-600 dark:text-orange-400 hover:bg-orange-500/20 bg-background/60"
                          )}
                        >
                          -{pct}%
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Direct Price Input */}
                  <div className="space-y-1.5 pt-1">
                    <Label className="text-[11px] font-bold text-muted-foreground block text-right">
                      ކަނޑައަޅާ އާ އަގު ލިޔުއްވާ (Enter Drop Price):
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-black text-orange-600 dark:text-orange-400 font-mono">
                        {settings.shop.currency}
                      </span>
                      <Input
                        type="number"
                        step="any"
                        min="0"
                        value={expiryDropPrice || ''}
                        onChange={(e) => setExpiryDropPrice(parseFloat(e.target.value) || 0)}
                        onFocus={handleFocus}
                        className="bg-background border-orange-500/40 text-orange-600 dark:text-orange-300 font-black h-11 pl-14 pr-3 text-right text-base rounded-xl font-mono"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </div>

                <DialogFooter className="gap-2.5 pt-3 border-t border-border flex flex-col sm:flex-row justify-between items-center w-full">
                  <Button
                    variant="outline"
                    onClick={keepOriginalPriceAndAddToCart}
                    className="w-full sm:w-auto h-11 border-border hover:bg-muted text-muted-foreground hover:text-foreground rounded-xl font-bold text-xs"
                    title="Add to cart at regular price without changing product data"
                  >
                    އަގު ބަދަލުނުކޮށް ކާޓަށް ލާ (Keep Price)
                  </Button>

                  <Button
                    onClick={confirmExpiryPriceDrop}
                    disabled={isUpdatingProductPrice || !expiryDropPrice || expiryDropPrice <= 0}
                    className="flex-1 w-full sm:w-auto h-11 bg-orange-600 hover:bg-orange-700 text-white font-black rounded-xl shadow-lg shadow-orange-600/20 text-xs uppercase tracking-wider flex items-center justify-center gap-2"
                  >
                    {isUpdatingProductPrice ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <TrendingDown className="h-4 w-4" />
                    )}
                    <span>އަގު ތިރިކޮށް ސޭވްކުރޭ (Drop & Save Price)</span>
                  </Button>
                </DialogFooter>
              </>
            );
          })()}
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
        <DialogContent className="sm:max-w-[600px] w-[calc(100vw-2rem)] max-h-[90vh] overflow-y-auto overflow-x-hidden font-faruma apple-glass-card bg-card/95 text-foreground border border-white/20 dark:border-white/10 text-right p-5 sm:p-6 shadow-2xl rounded-3xl box-border [&>button]:left-4 [&>button]:right-auto" dir="rtl">
          <DialogHeader className="pb-3.5 text-right space-y-1.5 border-b border-border/60">
            <div className="flex items-center justify-between pl-8">
              <div className="text-right flex-1 min-w-0">
                <DialogTitle className="text-xl md:text-2xl font-black text-foreground flex items-center gap-2.5">
                  <Users className="h-6 w-6 text-primary shrink-0" />
                  <span>{renderBoth('split_bill')}</span>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-1 text-right">
                  {splitStep === 1 ? renderBoth('select_customers_for_split') : renderBoth('review_split_amounts')}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="py-3">
            {splitStep === 1 ? (
              <div className="space-y-3.5">
                {/* Total & Selected bar */}
                <div className="flex items-center justify-between px-4 py-3 bg-muted/50 rounded-2xl border border-border text-xs font-bold">
                  <div className="text-right">
                    <span className="text-[10px] font-black uppercase text-muted-foreground tracking-wider block mb-0.5">{renderBoth('total_to_split')}</span>
                    <span className="font-mono text-base font-black text-primary">{settings.shop.currency} {grandTotal.toFixed(2)}</span>
                  </div>
                  <div className="text-left">
                    <span className="text-[10px] font-black uppercase text-muted-foreground tracking-wider block mb-0.5">{renderBoth('selected')}</span>
                    <span className="font-mono text-base font-black text-foreground">{selectedSplitCustomerIds.length}</span>
                  </div>
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
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
                    className="w-full text-right bg-muted/60 border-border text-foreground h-11 pr-10 rounded-xl font-bold placeholder:text-muted-foreground/60"
                  />
                </div>

                {/* Customer List */}
                <ScrollArea className="h-[320px] pr-2 custom-scrollbar">
                  {(() => {
                    const filtered = customers.filter(c =>
                      c.name_dv?.toLowerCase().includes(splitSearchTerm.toLowerCase()) ||
                      c.name_en?.toLowerCase().includes(splitSearchTerm.toLowerCase()) ||
                      c.code?.toLowerCase().includes(splitSearchTerm.toLowerCase()) ||
                      c.phone?.includes(splitSearchTerm)
                    );

                    if (filtered.length === 0) {
                      return (
                        <div className="p-8 text-center text-muted-foreground bg-muted/20 rounded-2xl border border-dashed border-border/80 flex flex-col items-center justify-center gap-2 mt-4">
                          <Users className="h-8 w-8 text-muted-foreground/40" />
                          <p className="text-sm font-bold">{renderBoth('no_customers_found')}</p>
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-2.5">
                        {filtered.map((customer) => {
                          const isSelected = selectedSplitCustomerIds.includes(customer.id);
                          return (
                            <div
                              key={customer.id}
                              onClick={() => toggleSplitCustomer(customer.id)}
                              className={cn(
                                "p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 text-right shadow-sm hover:shadow-md",
                                isSelected
                                  ? "bg-primary/10 border-primary ring-1 ring-primary/40 text-foreground"
                                  : "bg-card border-border hover:bg-muted/60 hover:border-primary/40 text-foreground"
                              )}
                            >
                              <div className="flex items-center gap-3 shrink-0">
                                <div className={cn(
                                  "h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all",
                                  isSelected ? "bg-primary border-primary text-white" : "border-border/80 bg-muted/40 text-transparent"
                                )}>
                                  <Check className="h-3.5 w-3.5 stroke-[3]" />
                                </div>
                                <Badge variant="outline" className="text-[10px] font-black px-2 py-0.5 rounded-md font-mono">
                                  {settings.shop.currency} {customer.outstanding_balance.toFixed(2)}
                                </Badge>
                              </div>

                              <div className="flex-1 text-right min-w-0">
                                <p className="font-black text-foreground text-sm truncate">
                                  {customer.name_dv} {customer.name_en ? `(${customer.name_en})` : ''}
                                </p>
                                <div className="flex items-center justify-end gap-2 text-[11px] text-muted-foreground mt-0.5">
                                  {customer.phone && <span dir="ltr">📞 {customer.phone}</span>}
                                  {customer.code && <span className="font-mono opacity-70">#{customer.code}</span>}
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
              <div className="space-y-3.5">
                {/* Financial Summary Grid */}
                <div className="grid grid-cols-2 gap-3 text-right">
                  <div className="p-3.5 bg-muted/60 rounded-2xl border border-border">
                    <span className="text-[10px] font-black uppercase text-muted-foreground tracking-wider block mb-0.5">{renderBoth('total_to_split')}</span>
                    <span className="text-lg font-black text-foreground font-mono">{settings.shop.currency} {grandTotal.toFixed(2)}</span>
                  </div>
                  <div className={cn(
                    "p-3.5 rounded-2xl border",
                    Math.abs(splitRemaining) < 0.01 
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400" 
                      : "bg-orange-500/10 border-orange-500/30 text-orange-600 dark:text-orange-400"
                  )}>
                    <span className="text-[10px] font-black uppercase tracking-wider block mb-0.5">{renderBoth('allocated_sum')}</span>
                    <span className="text-lg font-black font-mono">{settings.shop.currency} {splitTotal.toFixed(2)}</span>
                  </div>
                </div>

                {/* Balance Status & Equal Split button */}
                <div className={cn(
                  "flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-bold border",
                  Math.abs(splitRemaining) < 0.01 
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400" 
                    : "bg-red-500/10 border-red-500/30 text-red-500"
                )}>
                  {Math.abs(splitRemaining) < 0.01 ? (
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>{renderBoth('balanced')}</span>
                    </span>
                  ) : (
                    <span>
                      {renderBoth('remaining_to_allocate')}: <span className="font-mono font-black">{settings.shop.currency} {splitRemaining.toFixed(2)}</span>
                    </span>
                  )}
                  <Button 
                    type="button"
                    variant="outline" 
                    size="sm" 
                    onClick={equalizeSplit} 
                    className="h-7 text-[11px] font-bold border-primary/30 text-primary hover:bg-primary/10 rounded-lg"
                  >
                    {renderBoth('equal_split')}
                  </Button>
                </div>

                {/* Customer Allocation List */}
                <ScrollArea className="h-[280px] pr-2 custom-scrollbar">
                  <div className="space-y-2.5">
                    {splitEntries.map((entry) => {
                      const customer = customers.find(c => c.id === entry.customerId);
                      return (
                        <div key={entry.id} className="p-3 sm:p-3.5 rounded-2xl bg-card border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-right hover:border-primary/40 transition-all shadow-sm">
                          <div className="relative w-full sm:w-36 shrink-0 order-2 sm:order-1">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">{settings.shop.currency}</span>
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
                              className="h-11 bg-muted/60 border-border rounded-xl pl-10 pr-3 text-right text-base font-black font-mono text-foreground focus:border-primary"
                            />
                          </div>

                          <div className="flex-1 text-right min-w-0 order-1 sm:order-2">
                            <p className="font-black text-foreground text-sm truncate">{customer?.name_dv} {customer?.name_en ? `(${customer?.name_en})` : ''}</p>
                            <div className="flex items-center justify-end gap-2 mt-1">
                              <Select value={entry.method} onValueChange={(val: any) => updateSplitMethod(entry.id, val)}>
                                <SelectTrigger className="h-7 w-28 text-[10px] font-black rounded-lg bg-muted/80 border-border text-foreground">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="font-faruma bg-card border-border text-foreground" dir="rtl">
                                  <SelectItem value="Credit">{renderBoth('credit')}</SelectItem>
                                  <SelectItem value="Cash">{renderBoth('cash')}</SelectItem>
                                  <SelectItem value="Card">{renderBoth('card')}</SelectItem>
                                  <SelectItem value="Transfer">Transfer</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2.5 pt-3 border-t border-border flex flex-row justify-between items-center">
            {splitStep === 1 ? (
              <>
                <Button 
                  variant="outline" 
                  onClick={() => setIsSplitDialogOpen(false)} 
                  className="flex-1 h-11 border-border hover:bg-muted text-foreground rounded-xl font-bold text-xs"
                >
                  {renderBoth('cancel')}
                </Button>
                <Button
                  onClick={moveToAllocation}
                  disabled={selectedSplitCustomerIds.length === 0}
                  className="flex-1 h-11 bg-primary hover:bg-primary/90 text-white font-black rounded-xl shadow-lg transition-all text-xs uppercase tracking-wider"
                >
                  {renderBoth('next')}
                </Button>
              </>
            ) : (
              <>
                <Button 
                  variant="outline" 
                  onClick={backToSelection} 
                  className="h-11 px-5 border-border hover:bg-muted text-foreground rounded-xl font-bold flex items-center gap-1.5 text-xs"
                >
                  <ArrowLeft className="h-4 w-4" />
                  {renderBoth('back')}
                </Button>
                <Button
                  onClick={processSplitPayment}
                  disabled={Math.abs(splitRemaining) > 0.01 || splitEntries.length === 0}
                  className="flex-1 h-11 bg-primary hover:bg-primary/90 text-white font-black rounded-xl shadow-lg transition-all text-xs uppercase tracking-wider flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{renderBoth('confirm_split_payment')}</span>
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAwaitingTransferDialogOpen} onOpenChange={setIsAwaitingTransferDialogOpen}>
        <DialogContent className="sm:max-w-[38rem] 2xl:max-w-[44rem] w-[calc(100vw-2rem)] max-h-[92vh] overflow-y-auto font-faruma bg-card text-foreground border border-border text-right p-6 sm:p-7 shadow-2xl rounded-3xl box-border custom-scrollbar [&>button]:left-4 [&>button]:right-auto" dir="rtl">
          <DialogHeader className="pb-4 text-right space-y-1.5 border-b border-border/60">
            <div className="flex items-center justify-between pl-8">
              <div className="text-right flex-1 min-w-0">
                <DialogTitle className="text-xl md:text-2xl font-black text-foreground flex items-center gap-2.5">
                  <Receipt className="h-6 w-6 text-primary shrink-0" />
                  <span>{renderBoth('awaiting_transfer')}</span>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-1 text-right">
                  {renderBoth('awaiting_transfer_description')}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="py-4 space-y-4">
            {/* Grand Total & Transfer Amount Side-by-Side 2-Column Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Grand Total Card */}
              <div className="p-4 bg-primary/5 rounded-2xl border border-primary/20 flex flex-col justify-between text-right">
                <span className="text-[11px] font-bold text-muted-foreground block mb-1">
                  {renderBoth('grand_total')}
                </span>
                <span className="text-2xl font-black text-primary font-mono tracking-tight">
                  {settings.shop.currency} {grandTotal.toFixed(2)}
                </span>
              </div>

              {/* Transfer Amount Input Card */}
              <div className="p-4 bg-muted/50 rounded-2xl border border-border flex flex-col justify-between text-right">
                <Label className="text-[11px] font-bold text-muted-foreground block mb-1">
                  {renderBoth('transfer_amount')}
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground font-mono">
                    {settings.shop.currency}
                  </span>
                  <Input
                    type="number"
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(parseFloat(e.target.value) || 0)}
                    onFocus={handleFocus}
                    className="bg-background border-border h-10 rounded-xl pl-10 pr-3 text-lg font-mono font-black text-foreground text-right focus:border-primary"
                    autoFocus
                  />
                </div>
              </div>
            </div>

            {/* Shop Account Info Banner */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-muted/60 rounded-xl border border-border text-xs">
              <span className="font-mono font-black text-primary text-sm tracking-wide" dir="ltr">7730000442060 (B BACK)</span>
              <span className="font-bold text-muted-foreground flex items-center gap-1.5">
                <span>ބީއެމްއެލް އެކައުންޓް (BML Account):</span>
              </span>
            </div>

            {/* Customer Section */}
            <div className="space-y-2.5 pt-1">
              <div className="flex items-center justify-between gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddCustomerDialogOpen(true)}
                  className="text-xs h-7 px-2.5 border-primary/30 text-primary hover:bg-primary/10 font-bold rounded-lg gap-1 shrink-0"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  {renderBoth('add_customer')}
                </Button>
                <Label className="text-xs font-bold text-muted-foreground text-right">
                  {renderBoth('select_customer_or_enter_name')}
                </Label>
              </div>

              {activeCart?.customer ? (
                <div className="p-4 bg-primary/10 rounded-2xl border border-primary/20 flex items-center justify-between text-right">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => updateActiveCart(prev => ({ ...prev, customer: null }))}
                    className="h-7 px-2.5 text-xs font-bold border-primary/30 text-primary hover:bg-primary/20 rounded-lg shrink-0"
                  >
                    {renderBoth('change_customer')}
                  </Button>
                  <div className="min-w-0 flex-1 pr-3">
                    <p className="font-black text-base text-foreground truncate">
                      {activeCart.customer.name_dv} {activeCart.customer.name_en ? `(${activeCart.customer.name_en})` : ''}
                    </p>
                    <div className="flex items-center justify-end gap-3 text-xs text-muted-foreground mt-0.5">
                      {activeCart.customer.phone && (
                        <span className="font-mono">📞 <span dir="ltr">{activeCart.customer.phone}</span></span>
                      )}
                      {activeCart.customer.code && (
                        <span className="font-mono opacity-80">#{activeCart.customer.code}</span>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                    <Input
                      placeholder={renderBothString('search_or_type_name')}
                      value={customerSearchTerm}
                      onChange={(e) => setCustomerSearchTerm(e.target.value)}
                      className="bg-muted/60 border-border h-11 text-right text-foreground font-bold rounded-xl pr-10 pl-3 placeholder:text-muted-foreground/60"
                    />
                  </div>
                  <ScrollArea className="h-[140px] border border-border/70 rounded-2xl p-1.5 custom-scrollbar bg-card">
                    <div className="space-y-1">
                      {customers.filter(c =>
                        c.name_dv?.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
                        c.name_en?.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
                        c.phone?.includes(customerSearchTerm) ||
                        c.code?.toLowerCase().includes(customerSearchTerm.toLowerCase())
                      ).map(customer => (
                        <div
                          key={customer.id}
                          onClick={() => {
                            updateActiveCart(prev => ({ ...prev, customer }));
                            setCustomerSearchTerm(customer.name_dv);
                          }}
                          className={cn(
                            "p-2.5 rounded-xl cursor-pointer text-right text-xs font-bold transition-all flex items-center justify-between",
                            activeCart?.customer?.id === customer.id ? "bg-primary text-white" : "bg-card hover:bg-muted text-foreground border border-border/40 hover:border-primary/40"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            {customer.phone && <span className="text-[11px] opacity-70 font-mono" dir="ltr">📞 {customer.phone}</span>}
                            {customer.code && <span className="text-[10px] font-mono opacity-50">#{customer.code}</span>}
                          </div>
                          <span className="font-black truncate">{customer.name_dv} {customer.name_en ? `(${customer.name_en})` : ''}</span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="gap-3 pt-4 border-t border-border flex flex-row justify-between items-center">
            <Button 
              variant="outline" 
              onClick={() => setIsAwaitingTransferDialogOpen(false)} 
              className="h-11 px-6 border-border hover:bg-muted text-foreground rounded-xl font-bold"
            >
              {renderBoth('cancel')}
            </Button>
            <Button
              onClick={processTransferPayment}
              className="flex-1 h-11 bg-primary hover:bg-primary/90 text-white font-black rounded-xl shadow-lg transition-all text-xs uppercase tracking-wider flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>{renderBoth('confirm_bank_transfer')}</span>
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
        <DialogContent className="sm:max-w-[40rem] 2xl:max-w-[46rem] w-[calc(100vw-2rem)] font-faruma bg-card border border-border text-foreground text-right p-5 sm:p-6 shadow-2xl rounded-3xl overflow-hidden box-border [&>button]:left-4 [&>button]:right-auto" dir="rtl">
          <DialogHeader className="pb-3 text-right space-y-1.5 border-b border-border/60">
            <div className="flex items-center justify-between pl-8">
              <div className="text-right flex-1 min-w-0">
                <DialogTitle className="text-xl md:text-2xl font-black text-foreground flex items-center gap-2.5">
                  <ArrowRightLeft className="h-6 w-6 text-yellow-500 shrink-0" />
                  <span>{renderBoth('pending_transfers')}</span>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-1 text-right">
                  {renderBoth('pending_transfers_description')}
                </DialogDescription>
              </div>
            </div>
            <div className="bg-yellow-500/10 border border-yellow-500/25 rounded-2xl p-3 text-right flex flex-col sm:flex-row items-center justify-between gap-3 mt-2">
              <p className="text-xs text-yellow-600 dark:text-yellow-400 font-medium text-right flex-1">
                {renderBoth('auto_convert_notice')}
              </p>
              {pendingTransfers.length > 0 && (
                <Button
                  size="sm"
                  onClick={() => convertAllPendingToCredit()}
                  className="bg-primary hover:bg-primary/90 text-white text-xs font-black h-8 px-3 rounded-xl shrink-0"
                >
                  {renderBoth('convert_all_to_credit')}
                </Button>
              )}
            </div>
          </DialogHeader>

          <ScrollArea className="h-[360px] pr-2 custom-scrollbar mt-3">
            <div className="space-y-3">
              {pendingTransfers.length === 0 ? (
                <div className="h-44 flex flex-col items-center justify-center gap-2 text-muted-foreground/50 bg-muted/20 rounded-2xl border border-dashed border-border/80 font-bold text-sm">
                  <ArrowRightLeft className="h-8 w-8 opacity-40" />
                  <p>{renderBoth('no_pending_transfers')}</p>
                </div>
              ) : (
                pendingTransfers.map((transfer) => (
                  <div key={transfer.id} className="p-4 rounded-2xl bg-card border border-border flex items-center justify-between gap-4 hover:border-primary/40 transition-all shadow-sm">
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        onClick={() => resolvePendingTransfer(transfer.id, 'cash')}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black px-3.5 h-9 rounded-xl shadow-sm"
                      >
                        {renderBoth('cash')}
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => resolvePendingTransfer(transfer.id, 'credit')}
                        className="bg-primary hover:bg-primary/90 text-white text-xs font-black px-3.5 h-9 rounded-xl shadow-sm"
                      >
                        {renderBoth('credit')}
                      </Button>
                    </div>

                    <div className="text-center px-2">
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-0.5">{renderBoth('grand_total')}</p>
                      <p className="text-lg font-black text-yellow-600 dark:text-yellow-400 font-mono">{settings.shop.currency} {transfer.grandTotal.toFixed(2)}</p>
                    </div>

                    <div className="flex items-center gap-3 text-right flex-1 min-w-0 justify-end">
                      <div className="truncate">
                        <p className="text-sm font-black text-foreground truncate">{transfer.customer?.name_dv || transfer.tempCustomerName || renderBothString('guest_customer')}</p>
                        <p className="text-[10px] font-bold text-muted-foreground font-mono mt-0.5">{formatDateTime(transfer.date)}</p>
                      </div>
                      <div className="h-10 w-10 rounded-xl bg-yellow-500/10 flex items-center justify-center text-yellow-500 shrink-0">
                        <ArrowRightLeft className="h-5 w-5" />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Telegram Connect Dialog */}
      <TelegramConnectDialog
        customer={telegramCustomer}
        isOpen={isTelegramDialogOpen}
        onClose={() => {
          setIsTelegramDialogOpen(false);
          setTelegramCustomer(null);
        }}
      />

      {/* Bank Transfer Slips Verification Dialog */}
      <TransferSlipsDialog
        open={isTransferSlipsDialogOpen}
        onOpenChange={setIsTransferSlipsDialogOpen}
      />
    </div>
  );
};

export default POS;