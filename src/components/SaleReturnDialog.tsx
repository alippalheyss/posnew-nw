import React, { useState, useMemo, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Sale,
  CartItem,
  ReturnItem,
  Product,
  useAppContext,
} from '@/context/AppContext';
import { printSale80mmSlip } from '@/utils/invoicePrintHelper';
import { formatDate, formatTime } from '@/utils/formatters';
import { showError } from '@/utils/toast';
import {
  RotateCcw,
  ArrowLeftRight,
  Banknote,
  CreditCard,
  Landmark,
  Plus,
  Minus,
  Search,
  Trash2,
  Printer,
  CheckCircle2,
  Package,
  AlertCircle,
  CheckSquare,
} from 'lucide-react';

interface SaleReturnDialogProps {
  sale: Sale | null;
  isOpen: boolean;
  onClose: () => void;
}

const SaleReturnDialog: React.FC<SaleReturnDialogProps> = ({
  sale,
  isOpen,
  onClose,
}) => {
  const { products, settings, processReturn, customers } = useAppContext();
  const currency = settings?.shop?.currency || 'MVR';

  const [mode, setMode] = useState<'refund' | 'exchange'>('refund');
  const [returnQuantities, setReturnQuantities] = useState<Record<number, number>>({});
  const [exchangeItems, setExchangeItems] = useState<CartItem[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [refundMethod, setRefundMethod] = useState<'cash' | 'transfer' | 'credit'>('cash');
  const [diffPaymentMethod, setDiffPaymentMethod] = useState<'cash' | 'transfer' | 'credit'>('cash');
  const [tenderedAmount, setTenderedAmount] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Resolve customer if attached
  const resolvedCustomer = useMemo(() => {
    if (!sale) return null;
    if (sale.customer) return sale.customer;
    const cid = sale.customerId || sale.customer_id || (sale as any).customer_id;
    if (cid) return customers.find((c) => c.id === cid) || null;
    return null;
  }, [sale, customers]);

  const origPaymentMethod = useMemo(() => {
    if (!sale) return 'cash';
    return String(sale.paymentMethod || (sale as any).payment_method || 'cash').toLowerCase();
  }, [sale]);

  // Reset state whenever dialog opens with a new sale
  useEffect(() => {
    if (sale && isOpen) {
      setMode('refund');
      setReturnQuantities({});
      setExchangeItems([]);
      setProductSearch('');
      setTenderedAmount('');
      const isOrigCredit = origPaymentMethod === 'credit';
      setRefundMethod(isOrigCredit && resolvedCustomer ? 'credit' : 'cash');
      setDiffPaymentMethod('cash');
    }
  }, [sale, isOpen, origPaymentMethod, resolvedCustomer]);

  // Filter returnable items (positive qty & positive price)
  const returnableItems = useMemo(() => {
    if (!sale || !Array.isArray(sale.items)) return [];
    return sale.items
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => Number(item.qty || 0) > 0 && Number(item.price || 0) >= 0);
  }, [sale]);

  // Handle setting return qty for an item index
  const handleSetReturnQty = (idx: number, maxQty: number, val: number) => {
    const clamped = Math.max(0, Math.min(maxQty, Number.isFinite(val) ? val : 0));
    setReturnQuantities((prev) => ({
      ...prev,
      [idx]: clamped,
    }));
  };

  const handleSelectAllReturns = () => {
    const allSelected = returnableItems.every(
      ({ item, index }) => (returnQuantities[index] || 0) >= Number(item.qty || 0)
    );
    if (allSelected) {
      setReturnQuantities({});
    } else {
      const next: Record<number, number> = {};
      returnableItems.forEach(({ item, index }) => {
        next[index] = Number(item.qty || 0);
      });
      setReturnQuantities(next);
    }
  };

  // Build selected ReturnItem[]
  const selectedReturnItems: ReturnItem[] = useMemo(() => {
    if (!sale) return [];
    const list: ReturnItem[] = [];
    returnableItems.forEach(({ item, index }) => {
      const rQty = Number(returnQuantities[index] || 0);
      if (rQty > 0) {
        list.push({
          itemId: item.id,
          name: item.name_en || item.name_dv || 'Item',
          returnQty: rQty,
          unitPrice: Number(item.price || 0),
          unitConversion: Number(item.unit_conversion || 1),
          selectedUnit: item.selected_unit,
          selectedFlavour: item.selected_flavour,
        });
      }
    });
    return list;
  }, [sale, returnableItems, returnQuantities]);

  const returnTotal = useMemo(
    () => selectedReturnItems.reduce((sum, ri) => sum + ri.returnQty * ri.unitPrice, 0),
    [selectedReturnItems]
  );

  const exchangeTotal = useMemo(
    () => exchangeItems.reduce((sum, ei) => sum + Number(ei.price || 0) * Number(ei.qty || 0), 0),
    [exchangeItems]
  );

  // Net difference in exchange mode: > 0 means customer owes money; < 0 means refund to customer; 0 means even exchange
  const netExchangeDiff = useMemo(() => exchangeTotal - returnTotal, [exchangeTotal, returnTotal]);

  const parsedTendered = parseFloat(tenderedAmount) || 0;
  const exchangeChangeDue =
    mode === 'exchange' &&
    netExchangeDiff > 0 &&
    diffPaymentMethod === 'cash' &&
    parsedTendered > netExchangeDiff
      ? parsedTendered - netExchangeDiff
      : 0;

  // Search products for exchange
  const matchingProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    if (!q) return products.slice(0, 12);
    return products
      .filter(
        (p) =>
          (p.name_en || '').toLowerCase().includes(q) ||
          (p.name_dv || '').toLowerCase().includes(q) ||
          (p.barcode || '').toLowerCase().includes(q) ||
          (p.item_code || '').toLowerCase().includes(q) ||
          (p.category || '').toLowerCase().includes(q)
      )
      .slice(0, 20);
  }, [products, productSearch]);

  const handleAddExchangeProduct = (product: Product) => {
    setExchangeItems((prev) => {
      const existingIdx = prev.findIndex(
        (item) => item.id === product.id && (!item.selected_unit || item.selected_unit === 'Piece')
      );
      if (existingIdx > -1) {
        const updated = [...prev];
        updated[existingIdx] = {
          ...updated[existingIdx],
          qty: Number(updated[existingIdx].qty || 0) + 1,
        };
        return updated;
      }
      return [
        ...prev,
        {
          ...product,
          qty: 1,
          selected_unit: 'Piece',
          unit_conversion: 1,
          unit_price: product.price,
        },
      ];
    });
  };

  const handleUpdateExchangeQty = (index: number, newQty: number) => {
    if (newQty <= 0) {
      setExchangeItems((prev) => prev.filter((_, idx) => idx !== index));
      return;
    }
    setExchangeItems((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, qty: newQty } : item))
    );
  };

  const handleUpdateExchangeUnit = (index: number, unitName: string) => {
    setExchangeItems((prev) =>
      prev.map((item, idx) => {
        if (idx !== index) return item;
        if (unitName === 'Piece') {
          const baseProduct = products.find((p) => p.id === item.id);
          const basePrice = baseProduct ? baseProduct.price : item.price;
          return {
            ...item,
            selected_unit: 'Piece',
            unit_conversion: 1,
            price: basePrice,
            unit_price: basePrice,
          };
        }
        const matchedUnit = item.units?.find((u) => u.name === unitName);
        if (!matchedUnit) return item;
        return {
          ...item,
          selected_unit: matchedUnit.name,
          unit_conversion: matchedUnit.conversion_factor || 1,
          price: matchedUnit.price,
          unit_price: matchedUnit.price,
        };
      })
    );
  };

  const handleRemoveExchangeItem = (index: number) => {
    setExchangeItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (shouldPrint: boolean) => {
    if (!sale) return;
    if (selectedReturnItems.length === 0) {
      showError('Please select at least 1 item quantity to return.');
      return;
    }
    if (mode === 'exchange' && exchangeItems.length === 0) {
      showError('Please select at least 1 replacement item for the exchange, or switch to Cash Refund.');
      return;
    }
    if (
       (mode === 'refund' && refundMethod === 'credit' && !resolvedCustomer) ||
      (mode === 'exchange' && netExchangeDiff > 0 && diffPaymentMethod === 'credit' && !resolvedCustomer)
    ) {
      showError('Credit option requires a customer attached to this invoice.');
      return;
    }

    setIsSubmitting(true);
    try {
      const createdReturnSale = await processReturn(sale, selectedReturnItems, {
        mode,
        refundMethod,
        exchangeItems: mode === 'exchange' ? exchangeItems : [],
        paymentMethodForDiff: diffPaymentMethod,
        tenderedAmount: parsedTendered > 0 ? parsedTendered : undefined,
      });

      if (shouldPrint && createdReturnSale) {
        printSale80mmSlip(createdReturnSale, settings);
      }

      onClose();
    } catch (err) {
      console.error('Failed to process return/exchange:', err);
      showError('Failed to process return. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!sale) return null;

  const invNumber = sale.invoiceNumber || (sale as any).invoice_number || sale.id.slice(0, 8).toUpperCase();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[92vh] p-0 flex flex-col overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-2xl">
        {/* Top Header */}
        <DialogHeader className="px-6 py-4 bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent dark:from-amber-500/15 border-b border-slate-200/80 dark:border-slate-800 shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
                <RotateCcw className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  Return & Item Exchange
                  <Badge variant="outline" className="font-mono text-xs bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700">
                    {invNumber}
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                  <span>{formatDate(sale.date)} at {formatTime(sale.date)}</span>
                  <span>•</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {resolvedCustomer ? `${resolvedCustomer.name_en || resolvedCustomer.name_dv}` : 'Walk-in Customer'}
                  </span>
                  <span>•</span>
                  <span className="uppercase font-bold text-emerald-600 dark:text-emerald-400">
                    Original: {origPaymentMethod} ({currency} {Number(sale.grandTotal || 0).toFixed(2)})
                  </span>
                </DialogDescription>
              </div>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setMode('refund')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  mode === 'refund'
                    ? 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Banknote className="h-3.5 w-3.5" />
                Cash / Credit Refund
              </button>
              <button
                type="button"
                onClick={() => setMode('exchange')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  mode === 'exchange'
                    ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <ArrowLeftRight className="h-3.5 w-3.5" />
                Exchange for Another Item
              </button>
            </div>
          </div>
        </DialogHeader>

        {/* Main Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <div className={`grid gap-5 ${mode === 'exchange' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
            {/* LEFT COLUMN: Step 1 - Select Returning Items */}
            <div className="flex flex-col rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 overflow-hidden">
              <div className="px-4 py-3 bg-slate-100/80 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-5 w-5 rounded-full bg-amber-500 text-white text-[11px] font-black flex items-center justify-center">
                    1
                  </span>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">
                    Select Returning Items
                  </h3>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleSelectAllReturns}
                  className="h-7 px-2.5 text-[11px] font-bold text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                >
                  <CheckSquare className="h-3.5 w-3.5 mr-1" />
                  {returnableItems.every(({ item, index }) => (returnQuantities[index] || 0) >= Number(item.qty || 0))
                    ? 'Clear Selection'
                    : 'Return All Items'}
                </Button>
              </div>

              <div className="divide-y divide-slate-200/70 dark:divide-slate-800/70 max-h-[340px] overflow-y-auto">
                {returnableItems.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">
                    No returnable items found on this invoice.
                  </div>
                ) : (
                  returnableItems.map(({ item, index }) => {
                    const soldQty = Number(item.qty || 0);
                    const retQty = Number(returnQuantities[index] || 0);
                    const price = Number(item.price || 0);
                    const isSelected = retQty > 0;

                    return (
                      <div
                        key={`${item.id}-${index}`}
                        className={`p-3.5 transition-colors flex items-center justify-between gap-3 ${
                          isSelected
                            ? 'bg-amber-50/70 dark:bg-amber-950/20'
                            : 'bg-white dark:bg-slate-950 hover:bg-slate-50/80 dark:hover:bg-slate-900/60'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                              {item.name_en || item.name_dv || 'Item'}
                            </p>
                            {item.selected_unit && item.selected_unit !== 'Piece' && (
                              <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                                {item.selected_unit}
                              </Badge>
                            )}
                            {item.selected_flavour && (
                              <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                                {item.selected_flavour}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                            <span>
                              Unit Price: <strong className="text-slate-700 dark:text-slate-300">{currency} {price.toFixed(2)}</strong>
                            </span>
                            <span>•</span>
                            <span>
                              Purchased: <strong className="text-slate-700 dark:text-slate-300">{soldQty}</strong>
                            </span>
                          </div>
                        </div>

                        {/* Stepper */}
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-0.5 shadow-sm">
                            <button
                              type="button"
                              onClick={() => handleSetReturnQty(index, soldQty, retQty - 1)}
                              disabled={retQty <= 0}
                              className="h-7 w-7 rounded-md flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <input
                              type="number"
                              min={0}
                              max={soldQty}
                              step="any"
                              value={retQty === 0 ? '' : retQty}
                              placeholder="0"
                              onChange={(e) =>
                                handleSetReturnQty(index, soldQty, parseFloat(e.target.value) || 0)
                              }
                              className="w-12 text-center text-xs font-black bg-transparent text-slate-900 dark:text-white focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => handleSetReturnQty(index, soldQty, retQty + 1)}
                              disabled={retQty >= soldQty}
                              className="h-7 w-7 rounded-md flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          <div className="w-20 text-right">
                            <span
                              className={`text-xs font-black font-mono ${
                                isSelected
                                  ? 'text-amber-600 dark:text-amber-400'
                                  : 'text-slate-400 dark:text-slate-600'
                              }`}
                            >
                              {currency} {(retQty * price).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="px-4 py-2.5 bg-amber-500/10 border-t border-amber-500/20 flex items-center justify-between mt-auto">
                <span className="text-xs font-bold text-amber-800 dark:text-amber-300">
                  Returning {selectedReturnItems.reduce((s, i) => s + i.returnQty, 0)} item(s)
                </span>
                <span className="text-sm font-black font-mono text-amber-700 dark:text-amber-300">
                  Credit Value: {currency} {returnTotal.toFixed(2)}
                </span>
              </div>
            </div>

            {/* RIGHT COLUMN: Step 2 - Replacement Items (Only in Exchange Mode) */}
            {mode === 'exchange' && (
              <div className="flex flex-col rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/20 dark:bg-indigo-950/10 overflow-hidden">
                <div className="px-4 py-3 bg-indigo-500/10 border-b border-indigo-200/70 dark:border-indigo-900/50 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="h-5 w-5 rounded-full bg-indigo-600 text-white text-[11px] font-black flex items-center justify-center">
                      2
                    </span>
                    <h3 className="text-xs font-black uppercase tracking-wider text-indigo-950 dark:text-indigo-200">
                      Select Replacement Item(s)
                    </h3>
                  </div>
                  <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                    {exchangeItems.length} selected
                  </span>
                </div>

                {/* Product Search Bar */}
                <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
                  <div className="relative">
                    <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <Input
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      placeholder="Search replacement product by name, code, or barcode..."
                      className="h-9 pl-8 text-xs rounded-lg border-slate-200 dark:border-slate-800"
                    />
                  </div>

                  {/* Quick Product Picker Strip */}
                  <div className="mt-2 max-h-32 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/50">
                    {matchingProducts.map((prod) => (
                      <button
                        key={prod.id}
                        type="button"
                        onClick={() => handleAddExchangeProduct(prod)}
                        className="w-full px-3 py-1.5 text-left hover:bg-indigo-50 dark:hover:bg-indigo-950/40 flex items-center justify-between gap-2 transition-colors"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                            {prod.name_en || prod.name_dv}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            Stock: {prod.stock_shop ?? 0} {prod.item_code ? `• ${prod.item_code}` : ''}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs font-black font-mono text-indigo-600 dark:text-indigo-400">
                            {currency} {Number(prod.price || 0).toFixed(2)}
                          </span>
                          <span className="h-6 w-6 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                            <Plus className="h-3.5 w-3.5" />
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Selected Replacement Items List */}
                <div className="flex-1 divide-y divide-slate-200/70 dark:divide-slate-800/70 max-h-[200px] overflow-y-auto bg-white dark:bg-slate-950">
                  {exchangeItems.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400 flex flex-col items-center gap-1.5">
                      <Package className="h-5 w-5 text-slate-300" />
                      <span>Click any product above to add it as an exchange item</span>
                    </div>
                  ) : (
                    exchangeItems.map((ei, idx) => (
                      <div
                        key={`${ei.id}-${idx}`}
                        className="p-3 flex items-center justify-between gap-2 bg-white dark:bg-slate-950"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {ei.name_en || ei.name_dv}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[11px] text-slate-500 font-mono">
                              {currency} {Number(ei.price || 0).toFixed(2)} each
                            </span>
                            {Array.isArray(ei.units) && ei.units.length > 0 && (
                              <select
                                value={ei.selected_unit || 'Piece'}
                                onChange={(e) => handleUpdateExchangeUnit(idx, e.target.value)}
                                className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-1.5 py-0.5"
                              >
                                <option value="Piece">Piece</option>
                                {ei.units.map((u) => (
                                  <option key={u.name} value={u.name}>
                                    {u.name} ({currency} {u.price})
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-0.5">
                            <button
                              type="button"
                              onClick={() => handleUpdateExchangeQty(idx, Number(ei.qty || 1) - 1)}
                              className="h-6 w-6 rounded flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-800"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <input
                              type="number"
                              min={1}
                              step="any"
                              value={ei.qty}
                              onChange={(e) =>
                                handleUpdateExchangeQty(idx, parseFloat(e.target.value) || 1)
                              }
                              className="w-10 text-center text-xs font-black bg-transparent focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => handleUpdateExchangeQty(idx, Number(ei.qty || 1) + 1)}
                              className="h-6 w-6 rounded flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-800"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>

                          <span className="w-16 text-right text-xs font-black font-mono text-indigo-600 dark:text-indigo-400">
                            {currency} {(Number(ei.price || 0) * Number(ei.qty || 0)).toFixed(2)}
                          </span>

                          <button
                            type="button"
                            onClick={() => handleRemoveExchangeItem(idx)}
                            className="h-6 w-6 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center justify-center"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="px-4 py-2.5 bg-indigo-500/10 border-t border-indigo-500/20 flex items-center justify-between mt-auto">
                  <span className="text-xs font-bold text-indigo-900 dark:text-indigo-300">
                    New Items ({exchangeItems.reduce((s, i) => s + Number(i.qty || 0), 0)})
                  </span>
                  <span className="text-sm font-black font-mono text-indigo-700 dark:text-indigo-300">
                    New Total: {currency} {exchangeTotal.toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Settlement & Payment Method Section */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 p-4">
            {mode === 'refund' ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">
                    Refund Settlement Method
                  </span>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => setRefundMethod('cash')}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold border transition-all ${
                        refundMethod === 'cash'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                          : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <Banknote className="h-3.5 w-3.5" />
                      Cash Refund
                    </button>
                    <button
                      type="button"
                      onClick={() => setRefundMethod('transfer')}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold border transition-all ${
                        refundMethod === 'transfer'
                          ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
                          : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <Landmark className="h-3.5 w-3.5" />
                      Bank Transfer
                    </button>
                    {resolvedCustomer && (
                      <button
                        type="button"
                        onClick={() => setRefundMethod('credit')}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold border transition-all ${
                          refundMethod === 'credit'
                            ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                            : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <CreditCard className="h-3.5 w-3.5" />
                        Reduce Customer Credit Balance
                      </button>
                    )}
                  </div>
                </div>

                <div className="text-right bg-white dark:bg-slate-950 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Total Refund to Customer
                  </span>
                  <span className="text-xl font-black font-mono text-amber-600 dark:text-amber-400">
                    {currency} {returnTotal.toFixed(2)}
                  </span>
                </div>
              </div>
            ) : (
              /* Exchange Mode Summary */
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-white dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">
                      Returned Item Value
                    </span>
                    <span className="text-base font-black font-mono text-amber-600 dark:text-amber-400">
                      - {currency} {returnTotal.toFixed(2)}
                    </span>
                  </div>
                  <div className="bg-white dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">
                      Replacement Item Total
                    </span>
                    <span className="text-base font-black font-mono text-indigo-600 dark:text-indigo-400">
                      + {currency} {exchangeTotal.toFixed(2)}
                    </span>
                  </div>
                  <div
                    className={`p-3 rounded-xl border ${
                      netExchangeDiff > 0
                        ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800'
                        : netExchangeDiff < 0
                          ? 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800'
                          : 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <span className="text-[10px] font-black uppercase tracking-wider block">
                      {netExchangeDiff > 0
                        ? 'Customer Pays Difference'
                        : netExchangeDiff < 0
                          ? 'Refund Difference to Customer'
                          : 'Even Exchange'}
                    </span>
                    <span
                      className={`text-lg font-black font-mono ${
                        netExchangeDiff > 0
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : netExchangeDiff < 0
                            ? 'text-amber-700 dark:text-amber-400'
                            : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {currency} {Math.abs(netExchangeDiff).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Payment controls if there is a difference */}
                {netExchangeDiff > 0 && (
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-300 mr-1">
                        Collect Difference Via:
                      </span>
                      <button
                        type="button"
                        onClick={() => setDiffPaymentMethod('cash')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${
                          diffPaymentMethod === 'cash'
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        Cash
                      </button>
                      <button
                        type="button"
                        onClick={() => setDiffPaymentMethod('transfer')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${
                          diffPaymentMethod === 'transfer'
                            ? 'bg-sky-600 text-white border-sky-600'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        Transfer
                      </button>
                      {resolvedCustomer && (
                        <button
                          type="button"
                          onClick={() => setDiffPaymentMethod('credit')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${
                            diffPaymentMethod === 'credit'
                              ? 'bg-amber-600 text-white border-amber-600'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          Add to Credit
                        </button>
                      )}
                    </div>

                    {diffPaymentMethod === 'cash' && (
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-slate-500">Cash Tendered:</span>
                          <Input
                            type="number"
                            step="any"
                            placeholder={netExchangeDiff.toFixed(2)}
                            value={tenderedAmount}
                            onChange={(e) => setTenderedAmount(e.target.value)}
                            className="h-8 w-28 text-xs font-bold font-mono bg-white dark:bg-slate-950"
                          />
                        </div>
                        {exchangeChangeDue > 0 && (
                          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 font-mono text-xs py-1">
                            Change: {currency} {exchangeChangeDue.toFixed(2)}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <AlertCircle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
            <span>Stock quantities and daily sales totals will be updated automatically.</span>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="h-9 px-4 text-xs font-bold rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleSubmit(true)}
              disabled={isSubmitting || selectedReturnItems.length === 0}
              className="h-9 px-4 text-xs font-bold rounded-xl border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40"
            >
              <Printer className="h-3.5 w-3.5 mr-1.5" />
              {mode === 'exchange' ? 'Exchange & Print Slip' : 'Return & Print Slip'}
            </Button>
            <Button
              type="button"
              onClick={() => handleSubmit(false)}
              disabled={isSubmitting || selectedReturnItems.length === 0}
              className={`h-9 px-5 text-xs font-black rounded-xl text-white shadow-md ${
                mode === 'exchange'
                  ? 'bg-indigo-600 hover:bg-indigo-700'
                  : 'bg-amber-600 hover:bg-amber-700'
              }`}
            >
              <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
              {isSubmitting
                ? 'Processing...'
                : mode === 'exchange'
                  ? 'Confirm Exchange'
                  : 'Confirm Return'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SaleReturnDialog;

