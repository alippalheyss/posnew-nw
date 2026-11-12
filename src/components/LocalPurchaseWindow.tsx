import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Minus, 
  X, 
  Maximize2, 
  ShoppingBag, 
  Plus, 
  Building2, 
  Trash2, 
  Search, 
  Package, 
  Check, 
  Calculator, 
  AlertCircle, 
  Save,
  Tag,
  ShieldCheck,
  Percent,
  Layers,
  History,
  Pencil
} from 'lucide-react';
import { useAppContext, Purchase, Vendor, PurchaseItem, Product } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { showSuccess, showError } from '@/utils/toast';

interface DraftPurchaseItem {
  id: string;
  productId: string;
  quantity: number | '';
  unitPrice: number | '';
  subtotal: number | '';
  isZeroTax: boolean;
}

// Zero-tax detection strictly respecting the product's actual configured tax status
export const isProductZeroTax = (prod?: Product | null): boolean => {
  if (!prod) return false;
  return prod.is_zero_tax === true || (prod as any).is_zero_tax === 1 || (prod as any).is_zero_tax === 'true' || (prod as any).is_zero_tax === '1';
};

const LocalPurchaseWindow = () => {
  const { t } = useTranslation();
  const { 
    isPurchaseWindowOpen, 
    setIsPurchaseWindowOpen, 
    isPurchaseWindowMinimized, 
    setIsPurchaseWindowMinimized,
    vendors,
    products,
    purchases,
    addPurchase,
    updatePurchase,
    deletePurchase,
    addVendor,
    editingPurchase,
    setEditingPurchase,
    settings
  } = useAppContext();

  const [vendorId, setVendorId] = useState('');
  const [billNumber, setBillNumber] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  
  // Product Line Items
  const [items, setItems] = useState<DraftPurchaseItem[]>([
    { id: crypto.randomUUID(), productId: '', quantity: 1, unitPrice: '', subtotal: '', isZeroTax: false }
  ]);
  const [productSearchQueries, setProductSearchQueries] = useState<Record<string, string>>({});
  const [activeSearchRowId, setActiveSearchRowId] = useState<string | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [shouldUpdateStock, setShouldUpdateStock] = useState<boolean>(false);

  // Sync form when editingPurchase is supplied
  useEffect(() => {
    if (editingPurchase) {
      setShouldUpdateStock(false);
      setVendorId(editingPurchase.vendorId || '');
      setBillNumber(editingPurchase.billNumber || '');
      setDate(editingPurchase.date ? editingPurchase.date.split('T')[0] : new Date().toISOString().split('T')[0]);
      setDescription(editingPurchase.description || '');
      if (editingPurchase.items && editingPurchase.items.length > 0) {
        setItems(editingPurchase.items.map(i => {
          const prod = products.find(p => p.id === i.product_id);
          return {
            id: crypto.randomUUID(),
            productId: i.product_id,
            quantity: i.quantity,
            unitPrice: i.unit_price,
            subtotal: i.subtotal,
            isZeroTax: i.is_zero_tax !== undefined ? Boolean(i.is_zero_tax) : isProductZeroTax(prod)
          };
        }));
      } else {
        setItems([{
          id: crypto.randomUUID(),
          productId: '',
          quantity: 1,
          unitPrice: editingPurchase.amount || '',
          subtotal: editingPurchase.amount || '',
          isZeroTax: false
        }]);
      }
    }
  }, [editingPurchase, products]);

  // Dedicated Product Catalog Browser Modal
  const [isCatalogPickerOpen, setIsCatalogPickerOpen] = useState(false);
  const [catalogSearchQuery, setCatalogSearchQuery] = useState('');
  const [catalogSelectedCategory, setCatalogSelectedCategory] = useState('all');
  const [catalogVisibleCount, setCatalogVisibleCount] = useState(36);
  const deferredCatalogSearch = React.useDeferredValue(catalogSearchQuery);

  // Quick Entry Dialog — shown when user picks a product from catalog
  const [quickEntryProduct, setQuickEntryProduct] = useState<Product | null>(null);
  const [quickEntryQty, setQuickEntryQty] = useState('1');
  const [quickEntryUnitCost, setQuickEntryUnitCost] = useState('');
  const [quickEntrySubtotal, setQuickEntrySubtotal] = useState('');
  const quickEntryQtyRef = useRef<HTMLInputElement>(null);
  const quickEntryUnitCostRef = useRef<HTMLInputElement>(null);
  const quickEntrySubtotalRef = useRef<HTMLInputElement>(null);
  const quickEntryConfirmRef = useRef<HTMLButtonElement>(null);

  const [vendorSearchQuery, setVendorSearchQuery] = useState('');

  // Quick Add Vendor State
  const [isQuickAddVendorOpen, setIsQuickAddVendorOpen] = useState(false);
  const [quickVendorName, setQuickVendorName] = useState('');
  const [quickVendorPhone, setQuickVendorPhone] = useState('');
  const [quickVendorTin, setQuickVendorTin] = useState('');
  const [isAddingVendor, setIsAddingVendor] = useState(false);
  const [isSavingPurchase, setIsSavingPurchase] = useState(false);

  const taxRate = settings?.shop?.taxRate || 8;
  const currency = settings?.shop?.currency || 'MVR';

  const filteredVendors = vendors.filter(v => 
    v.name_en?.toLowerCase().includes(vendorSearchQuery.toLowerCase()) || 
    v.name_dv?.toLowerCase().includes(vendorSearchQuery.toLowerCase()) ||
    v.code?.toLowerCase().includes(vendorSearchQuery.toLowerCase())
  );

  const handleFocus = (event: React.FocusEvent<HTMLInputElement>) => {
    event.target.select();
  };

  const handleAddItemRow = () => {
    setItems(prev => [
      ...prev,
      { id: crypto.randomUUID(), productId: '', quantity: 1, unitPrice: '', subtotal: '', isZeroTax: false }
    ]);
  };

  const handleRemoveItemRow = (rowId: string) => {
    if (items.length <= 1) {
      setItems([{ id: crypto.randomUUID(), productId: '', quantity: 1, unitPrice: '', subtotal: '', isZeroTax: false }]);
      return;
    }
    setItems(prev => prev.filter(item => item.id !== rowId));
  };

  const handleProductSelect = (rowId: string, prod: Product) => {
    const cost = prod.cost_price ? Number(prod.cost_price) : '';
    const isZero = isProductZeroTax(prod);

    setItems(prev => prev.map(item => {
      if (item.id !== rowId) return item;
      const qty = typeof item.quantity === 'number' ? item.quantity : 1;
      const sub = typeof cost === 'number' ? parseFloat((qty * cost).toFixed(2)) : '';
      return {
        ...item,
        productId: prod.id,
        quantity: qty,
        unitPrice: cost,
        subtotal: sub,
        isZeroTax: isZero
      };
    }));
    setActiveSearchRowId(null);
  };

  // Add Product from Catalog — opens Quick Entry dialog for Qty/Cost/Subtotal
  const handleAddProductFromCatalog = (prod: Product) => {
    const cost = prod.cost_price ? Number(prod.cost_price).toFixed(2) : '';
    setQuickEntryProduct(prod);
    setQuickEntryQty('1');
    setQuickEntryUnitCost(cost);
    const initialSub = cost !== '' ? parseFloat((1 * Number(cost)).toFixed(2)).toString() : '';
    setQuickEntrySubtotal(initialSub);
    setIsCatalogPickerOpen(false);
    // Focus qty field after dialog renders
    setTimeout(() => quickEntryQtyRef.current?.focus(), 80);
  };

  const handleConfirmQuickEntry = () => {
    if (!quickEntryProduct) return;
    const qty = parseFloat(quickEntryQty) || 1;
    const unitCost = parseFloat(quickEntryUnitCost) || 0;
    const subtotal = parseFloat(quickEntrySubtotal) || parseFloat((qty * unitCost).toFixed(2));
    const isZero = isProductZeroTax(quickEntryProduct);

    setItems(prev => {
      const emptyIndex = prev.findIndex(item => !item.productId);
      if (emptyIndex !== -1) {
        const newItems = [...prev];
        newItems[emptyIndex] = {
          ...newItems[emptyIndex],
          productId: quickEntryProduct!.id,
          quantity: qty,
          unitPrice: unitCost,
          subtotal: subtotal,
          isZeroTax: isZero
        };
        return newItems;
      }
      return [
        ...prev,
        { id: crypto.randomUUID(), productId: quickEntryProduct!.id, quantity: qty, unitPrice: unitCost, subtotal: subtotal, isZeroTax: isZero }
      ];
    });

    showSuccess(`Added "${quickEntryProduct.name_dv || quickEntryProduct.name_en}" × ${qty}`);
    setQuickEntryProduct(null);
    // Re-open catalog so user can keep adding products
    setIsCatalogPickerOpen(true);
  };

  const handleUpdateItemField = (rowId: string, field: 'quantity' | 'unitPrice' | 'subtotal' | 'isZeroTax', value: any) => {
    setItems(prev => prev.map(item => {
      if (item.id !== rowId) return item;

      const updated = { ...item };

      if (field === 'quantity') {
        const newQty = value === '' ? '' : Math.max(0, parseFloat(value) || 0);
        updated.quantity = newQty;
        // Recalculate subtotal if unitPrice is present
        if (typeof updated.unitPrice === 'number' && typeof newQty === 'number') {
          updated.subtotal = parseFloat((newQty * updated.unitPrice).toFixed(2));
        } else if (typeof updated.subtotal === 'number' && typeof newQty === 'number' && newQty > 0) {
          updated.unitPrice = parseFloat((updated.subtotal / newQty).toFixed(4));
        }
      } else if (field === 'unitPrice') {
        const newPrice = value === '' ? '' : Math.max(0, parseFloat(value) || 0);
        updated.unitPrice = newPrice;
        // Recalculate subtotal
        if (typeof updated.quantity === 'number' && typeof newPrice === 'number') {
          updated.subtotal = parseFloat((updated.quantity * newPrice).toFixed(2));
        }
      } else if (field === 'subtotal') {
        const newSub = value === '' ? '' : Math.max(0, parseFloat(value) || 0);
        updated.subtotal = newSub;
        // Recalculate unitPrice
        if (typeof updated.quantity === 'number' && updated.quantity > 0 && typeof newSub === 'number') {
          updated.unitPrice = parseFloat((newSub / updated.quantity).toFixed(4));
        }
      } else if (field === 'isZeroTax') {
        updated.isZeroTax = Boolean(value);
      }

      return updated;
    }));
  };

  // Calculations with zero-tax detection
  const calculatedItems = items.map(item => {
    const qty = typeof item.quantity === 'number' ? item.quantity : 0;
    let price = typeof item.unitPrice === 'number' ? item.unitPrice : 0;
    let lineSubtotal = typeof item.subtotal === 'number' ? item.subtotal : (qty * price);

    if (lineSubtotal === 0 && qty > 0 && price > 0) {
      lineSubtotal = qty * price;
    }

    // Input GST calculation
    const isZero = !!item.isZeroTax;
    const gstRate = isZero ? 0 : (taxRate / 100);
    const lineGst = lineSubtotal > 0 ? (lineSubtotal * gstRate) : 0;
    const lineTotal = lineSubtotal + lineGst;

    return {
      ...item,
      qty,
      price,
      lineSubtotal,
      lineGst,
      lineTotal,
      isZeroTax: isZero
    };
  });

  const totalQuantity = calculatedItems.reduce((sum, i) => sum + i.qty, 0);
  const totalSubtotal = calculatedItems.reduce((sum, i) => sum + i.lineSubtotal, 0);
  const taxableSubtotal = calculatedItems.filter(i => !i.isZeroTax).reduce((sum, i) => sum + i.lineSubtotal, 0);
  const zeroTaxSubtotal = calculatedItems.filter(i => i.isZeroTax).reduce((sum, i) => sum + i.lineSubtotal, 0);
  const totalInputGst = calculatedItems.reduce((sum, i) => sum + i.lineGst, 0);
  const grandTotal = totalSubtotal + totalInputGst;

  // Categories list for catalog browser
  const catalogCategories = useMemo(() => {
    const cats = new Set<string>();
    products.forEach(p => {
      if (p.category) cats.add(p.category);
    });
    return Array.from(cats);
  }, [products]);

  // Catalog filtered products (calculated only when catalog is actually open)
  const catalogFilteredProducts = useMemo(() => {
    if (!isCatalogPickerOpen) return [];
    const q = (deferredCatalogSearch || '').trim().toLowerCase();
    return products.filter(p => {
      if (catalogSelectedCategory !== 'all' && p.category !== catalogSelectedCategory) {
        return false;
      }
      if (!q) return true;
      return (
        (p.name_en && p.name_en.toLowerCase().includes(q)) ||
        (p.name_dv && p.name_dv.includes(q)) ||
        (p.barcode && p.barcode.includes(q)) ||
        (p.item_code && p.item_code.toLowerCase().includes(q))
      );
    });
  }, [products, deferredCatalogSearch, catalogSelectedCategory, isCatalogPickerOpen]);

  // Sliced for instant sub-millisecond rendering (<36 DOM nodes instead of 5,000)
  const displayCatalogProducts = useMemo(() => {
    return catalogFilteredProducts.slice(0, catalogVisibleCount);
  }, [catalogFilteredProducts, catalogVisibleCount]);

  const handleQuickAddVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickVendorName.trim()) {
      showError(t('vendor_name_required') || 'Vendor name is required');
      return;
    }

    const trimmedTin = quickVendorTin.trim().toUpperCase().replace(/\s+/g, '');
    if (trimmedTin && trimmedTin.length !== 13) {
      showError('GST TIN number must be exactly 13 characters (e.g. 1021550GST501)');
      return;
    }

    setIsAddingVendor(true);
    const newV: Vendor = {
      id: crypto.randomUUID(),
      code: `V-${Date.now().toString().slice(-4)}`,
      name_en: quickVendorName.trim(),
      name_dv: quickVendorName.trim(),
      phone: quickVendorPhone.trim(),
      email: '',
      contact_person: '',
      tin_number: trimmedTin,
      address: '',
      notes: 'Added from Local Purchase'
    };

    try {
      await addVendor(newV);
      setVendorId(newV.id);
      setIsQuickAddVendorOpen(false);
      setQuickVendorName('');
      setQuickVendorPhone('');
      setQuickVendorTin('');
      showSuccess(`Vendor "${newV.name_en}" added successfully`);
    } catch (err) {
      console.error('Error adding vendor:', err);
      showError('Failed to add vendor');
    } finally {
      setIsAddingVendor(false);
    }
  };

  const handleSavePurchase = async () => {
    if (!vendorId) {
      showError(t('select_vendor') || 'Please select a vendor');
      return;
    }

    if (!billNumber.trim()) {
      showError('Please enter invoice / bill number (ބިލް ނަންބަރު ލިޔުއްވާ)');
      return;
    }

    const validLineItems = calculatedItems.filter(i => i.productId && i.qty > 0 && (i.price > 0 || i.lineSubtotal > 0));
    if (validLineItems.length === 0) {
      showError('Please add at least 1 product with valid quantity and price/subtotal (މަދުވެގެން 1 އައިޓަމް އަދަދާއި އަގު ޖައްސަވާ)');
      return;
    }

    const vendor = vendors.find(v => v.id === vendorId);
    if (!vendor) return;

    setIsSavingPurchase(true);

    const purchaseItemsPayload: PurchaseItem[] = validLineItems.map(item => {
      const prod = products.find(p => p.id === item.productId);
      return {
        product_id: item.productId,
        product_name: prod ? (prod.name_dv || prod.name_en) : 'Product',
        quantity: item.qty,
        unit_price: item.price,
        subtotal: parseFloat(item.lineSubtotal.toFixed(2)),
        gst_amount: parseFloat(item.lineGst.toFixed(2)),
        total: parseFloat(item.lineTotal.toFixed(2)),
        is_zero_tax: item.isZeroTax
      };
    });

    const purchase: Purchase = {
      id: editingPurchase?.id || crypto.randomUUID(),
      vendorId: vendor.id,
      vendor: vendor.name_en,
      billNumber: billNumber.trim(),
      description: description.trim() || `Local purchase invoice #${billNumber.trim()} with ${validLineItems.length} items`,
      amount: parseFloat(totalSubtotal.toFixed(2)),
      gstAmount: parseFloat(totalInputGst.toFixed(2)),
      date: date,
      items: purchaseItemsPayload,
      subtotal: parseFloat(totalSubtotal.toFixed(2))
    };

    try {
      if (editingPurchase) {
        await updatePurchase(purchase, shouldUpdateStock);
      } else {
        await addPurchase(purchase, shouldUpdateStock);
      }
      handleClose();
    } catch (error) {
      console.error('Error saving purchase:', error);
      showError(editingPurchase ? 'Failed to update purchase bill' : 'Failed to save purchase bill');
    } finally {
      setIsSavingPurchase(false);
    }
  };

  const handleClose = () => {
    setIsPurchaseWindowOpen(false);
    setIsPurchaseWindowMinimized(false);
    setEditingPurchase(null);
    setIsHistoryOpen(false);
    setVendorId('');
    setBillNumber('');
    setDate(new Date().toISOString().split('T')[0]);
    setDescription('');
    setShouldUpdateStock(false);
    setItems([{ id: crypto.randomUUID(), productId: '', quantity: 1, unitPrice: '', subtotal: '', isZeroTax: false }]);
    setProductSearchQueries({});
    setActiveSearchRowId(null);
    setIsCatalogPickerOpen(false);
  };

  if (!isPurchaseWindowOpen) return null;

  if (isPurchaseWindowMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-[100] flex items-center gap-3 bg-card/95 backdrop-blur-xl border border-primary/30 p-3.5 rounded-2xl shadow-2xl shadow-primary/20 animate-in slide-in-from-bottom-5">
        <div className="flex items-center gap-2.5 px-2 border-r border-border mr-1 pr-3">
          <ShoppingBag className="w-5 h-5 text-primary" />
          <div className="flex flex-col">
            <span className="text-xs font-black text-foreground uppercase tracking-widest">{t('record_local_purchase') || 'Record Purchase'}</span>
            <span className="text-[10px] text-muted-foreground font-mono">
              {grandTotal > 0 ? `${currency} ${grandTotal.toFixed(2)} (${totalQuantity} items)` : 'Draft Bill'}
            </span>
          </div>
        </div>
        <Button variant="outline" size="icon" onClick={() => setIsPurchaseWindowMinimized(false)} className="h-8 w-8 rounded-xl bg-background border-border hover:bg-primary/15 hover:border-primary/50 hover:text-primary text-foreground shadow-sm">
          <Maximize2 className="h-4 w-4 stroke-[2]" />
        </Button>
        <Button variant="outline" size="icon" onClick={handleClose} className="h-8 w-8 rounded-xl bg-red-500/10 border border-red-500/30 hover:bg-red-500/25 text-red-500 shadow-sm">
          <X className="h-4 w-4 stroke-[2.5]" />
        </Button>
      </div>
    );
  }

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-md p-2 sm:p-4 animate-in fade-in cursor-pointer"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          setIsPurchaseWindowMinimized(true);
        }
      }}
    >
      <div 
        className="w-[98vw] max-w-[1480px] h-[95vh] sm:h-[92vh] bg-white/95 dark:bg-slate-950/95 backdrop-blur-2xl border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col font-faruma relative cursor-default" 
        dir="ltr"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sleek Top Header Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200/80 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-900/60 shrink-0 gap-4">
          {/* Left: Title & Mode Badge */}
          <div className="flex items-center gap-3.5 min-w-0">
            <div className={cn(
              "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border shadow-xs",
              editingPurchase
                ? "bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400"
                : "bg-primary/15 border-primary/30 text-primary"
            )}>
              <ShoppingBag className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight truncate">
                  {editingPurchase
                    ? `Edit Purchase Bill #${editingPurchase.billNumber}`
                    : (t('record_local_purchase') || 'Local Purchase Bill')}
                </h2>
                <span className="text-xs font-bold text-slate-400 dark:text-slate-500 hidden sm:inline">
                  ({editingPurchase ? 'ބިލް ބަދަލުކުރުން' : 'ލޯކަލް ޕަރޗޭސް ބިލް'})
                </span>
                {editingPurchase ? (
                  <div className="flex items-center gap-1.5">
                    <Badge className="bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-[10px] font-black px-2 py-0.5 rounded-md">
                      Editing #{editingPurchase.billNumber}
                    </Badge>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingPurchase(null);
                        setVendorId('');
                        setBillNumber('');
                        setDate(new Date().toISOString().split('T')[0]);
                        setDescription('');
                        setItems([{ id: crypto.randomUUID(), productId: '', quantity: 1, unitPrice: '', subtotal: '', isZeroTax: false }]);
                      }}
                      className="h-6 px-2 rounded-md border-slate-300 dark:border-slate-700 text-[10px] font-black text-slate-600 dark:text-slate-300 hover:text-foreground"
                    >
                      + New Bill
                    </Button>
                  </div>
                ) : (
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hidden md:inline-block">
                    Input GST & Stock Sync
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                Record supplier invoices, auto-detect 0% zero-tax items, calculate Input GST, and update inventory.
              </p>
            </div>
          </div>

          {/* Right: Quick Actions & Window Controls */}
          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsHistoryOpen(true)}
              className="h-9 px-3 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold gap-1.5 shadow-2xs"
              title="View Recent Local Purchase Bills"
            >
              <History className="h-3.5 w-3.5 text-primary" />
              <span className="hidden sm:inline">Recent Bills</span>
              {purchases.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-primary/15 text-primary text-[10px] font-black font-mono">
                  {purchases.length}
                </span>
              )}
            </Button>

            <div className="h-5 w-px bg-slate-200 dark:bg-slate-800 mx-0.5" />

            <Button 
              type="button" 
              variant="outline" 
              size="icon" 
              onClick={() => setIsPurchaseWindowMinimized(true)} 
              className="h-9 w-9 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-amber-500/15 hover:border-amber-500/40 hover:text-amber-500 text-slate-600 dark:text-slate-300 transition-all"
              title="Minimize (ކުޑަކޮށްލާ)"
            >
              <Minus className="h-4 w-4 stroke-[2.5]" />
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              size="icon" 
              onClick={handleClose} 
              className="h-9 w-9 rounded-xl border-red-500/25 bg-red-500/10 hover:bg-red-500 hover:text-white text-red-500 transition-all"
              title="Close (ބަންދުކޮށްލާ)"
            >
              <X className="h-4 w-4 stroke-[2.5]" />
            </Button>
          </div>
        </div>

        {/* Sleek 4-Column Master Info Strip */}
        <div className="px-5 py-3 border-b border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-950 shrink-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
            {/* 1. Vendor Selector (4 cols) */}
            <div className="lg:col-span-4 space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Building2 className="h-3 w-3 text-primary" />
                  <span>{t('select_vendor') || 'Supplier / Vendor'}*</span>
                </Label>
                <button
                  type="button"
                  onClick={() => setIsQuickAddVendorOpen(true)}
                  className="text-[11px] font-black text-primary hover:underline flex items-center gap-0.5"
                >
                  <Plus className="h-3 w-3" />
                  <span>New Vendor (އައު ވެންޑަރ)</span>
                </button>
              </div>
              <Select value={vendorId} onValueChange={setVendorId}>
                <SelectTrigger className="w-full h-9 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 font-bold text-xs">
                  <SelectValue placeholder="Choose Vendor (ވެންޑަރ އިޚްތިޔާރުކުރޭ)" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-foreground !z-[110]">
                  <div className="p-2 sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 z-10">
                    <Input 
                      placeholder="Search vendors / ހޯއްދަވާ..." 
                      value={vendorSearchQuery}
                      onChange={(e) => setVendorSearchQuery(e.target.value)}
                      className="h-8 text-xs rounded-lg"
                    />
                  </div>
                  <ScrollArea className="h-48">
                    {filteredVendors.map(v => (
                      <SelectItem key={v.id} value={v.id} className="font-bold text-xs">
                        {v.name_en || v.name_dv} {v.tin_number ? `(TIN: ${v.tin_number})` : ''}
                      </SelectItem>
                    ))}
                  </ScrollArea>
                </SelectContent>
              </Select>
            </div>

            {/* 2. Invoice / Bill Number (3 cols) */}
            <div className="lg:col-span-3 space-y-1">
              <Label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                Invoice / Bill No (ބިލް ނަންބަރު)*
              </Label>
              <Input
                value={billNumber}
                onChange={(e) => setBillNumber(e.target.value)}
                placeholder="e.g. INV-2026-001"
                className="h-9 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 font-bold font-mono text-xs"
              />
            </div>

            {/* 3. Bill Date (2 cols) */}
            <div className="lg:col-span-2 space-y-1">
              <Label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                Bill Date (ތާރީޚް)*
              </Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-9 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 font-bold font-mono text-xs"
              />
            </div>

            {/* 4. Bill Notes / Description (3 cols) */}
            <div className="lg:col-span-3 space-y-1">
              <Label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                Notes / Remarks (އިތުރު ތަފްޞީލް)
              </Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional remarks or reference..."
                className="h-9 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 font-medium text-xs"
              />
            </div>
          </div>
        </div>

        {/* Main Line Items Workspace */}
        <div className="flex-1 min-h-0 px-5 py-3 flex flex-col bg-slate-50/50 dark:bg-slate-950/50 overflow-hidden">
          {/* Items Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 shrink-0">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <Package className="h-4 w-4 text-primary" />
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">
                  Invoice Line Items (ބިލުގައިވާ ތަކެތި)
                </h3>
              </div>
              <Badge variant="secondary" className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md">
                {items.length} {items.length === 1 ? 'Row' : 'Rows'} • {totalQuantity} Units
              </Badge>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setCatalogSearchQuery('');
                  setCatalogSelectedCategory('all');
                  setCatalogVisibleCount(36);
                  setIsCatalogPickerOpen(true);
                }}
                className="h-8 px-3 text-xs font-bold bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-800 gap-1.5 rounded-lg shadow-2xs"
              >
                <Layers className="h-3.5 w-3.5 text-indigo-500" />
                <span>Browse Catalog (ޕްރޮޑަކްޓް ލިސްޓް)</span>
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={handleAddItemRow}
                className="h-8 px-3.5 text-xs font-black bg-primary/10 hover:bg-primary/20 text-primary border border-primary/25 gap-1.5 rounded-lg shadow-2xs"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Row (އައިޓަމެއް އިތުރުކުރޭ)</span>
              </Button>
            </div>
          </div>

          {/* Scrollable Products Table Container */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 shadow-2xs flex-1 min-h-0 overflow-y-auto custom-scrollbar relative">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 z-20 bg-slate-100/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3 text-center w-10">#</th>
                  <th className="py-2.5 px-3 text-left min-w-[280px]">Product / Item (ޕްރޮޑަކްޓް)</th>
                  <th className="py-2.5 px-3 text-center w-24">Shop Stock</th>
                  <th className="py-2.5 px-3 text-center w-28">Qty (ތަދާދު)*</th>
                  <th className="py-2.5 px-3 text-center w-36">Unit Cost ({currency})*</th>
                  <th className="py-2.5 px-3 text-center w-36">Subtotal ({currency})*</th>
                  <th className="py-2.5 px-3 text-center w-24">GST Status</th>
                  <th className="py-2.5 px-2 text-center w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                {items.map((item, index) => {
                  const selectedProd = products.find(p => p.id === item.productId);
                  const currentStock = selectedProd ? (Number(selectedProd.stock_shop) || 0) : null;
                  const isNegativeStock = currentStock !== null && currentStock < 0;
                  const isSearching = activeSearchRowId === item.id;
                  const query = productSearchQueries[item.id] || '';

                  const matchingProducts = query
                    ? products.filter(p =>
                        p.name_en.toLowerCase().includes(query.toLowerCase()) ||
                        p.name_dv.toLowerCase().includes(query.toLowerCase()) ||
                        p.barcode.includes(query) ||
                        p.item_code.toLowerCase().includes(query.toLowerCase())
                      ).slice(0, 20)
                    : products.slice(0, 20);

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors">
                      {/* Row Number */}
                      <td className="py-2 px-3 text-center font-mono text-[11px] font-bold text-slate-400">
                        {index + 1}
                      </td>

                      {/* Product Selection */}
                      <td className="py-2 px-3 relative">
                        {selectedProd && !isSearching ? (
                          <div 
                            onClick={() => setActiveSearchRowId(item.id)}
                            className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 cursor-pointer group transition-all"
                          >
                            <div className="min-w-0 flex-1 pr-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-black text-slate-900 dark:text-slate-100 text-xs truncate">
                                  {selectedProd.name_en || selectedProd.name_dv}
                                </p>
                                {selectedProd.name_dv && selectedProd.name_en && (
                                  <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                    ({selectedProd.name_dv})
                                  </span>
                                )}
                                {item.isZeroTax && (
                                  <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[9px] px-1.5 py-0 h-4">
                                    0% Zero Tax
                                  </Badge>
                                )}
                              </div>
                              <p className="text-[10px] text-slate-400 font-mono truncate">
                                {selectedProd.barcode ? `Barcode: ${selectedProd.barcode}` : ''} {selectedProd.category ? `• ${selectedProd.category}` : ''}
                              </p>
                            </div>
                            <span className="text-[10px] text-primary group-hover:underline font-bold shrink-0">
                              Change
                            </span>
                          </div>
                        ) : (
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                            <Input
                              placeholder="Search product by name, barcode, or code..."
                              value={query}
                              onChange={(e) => {
                                setProductSearchQueries(prev => ({ ...prev, [item.id]: e.target.value }));
                                setActiveSearchRowId(item.id);
                              }}
                              onFocus={() => setActiveSearchRowId(item.id)}
                              className="h-9 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-left text-xs pl-8 rounded-lg font-semibold"
                            />
                            {isSearching && (
                              <div className="absolute top-10 left-0 w-full z-[120] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl p-1.5 max-h-60 overflow-y-auto custom-scrollbar">
                                <div className="px-2 py-1 border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold text-slate-400 flex justify-between items-center">
                                  <span>Select a product ({matchingProducts.length} results)</span>
                                  <button 
                                    type="button" 
                                    onClick={() => setActiveSearchRowId(null)}
                                    className="text-red-500 hover:underline"
                                  >
                                    Close
                                  </button>
                                </div>
                                {matchingProducts.map(p => {
                                  const pStock = p.stock_shop || 0;
                                  const isZero = isProductZeroTax(p);
                                  return (
                                    <div
                                      key={p.id}
                                      onClick={() => handleProductSelect(item.id, p)}
                                      className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer flex items-center justify-between gap-2 border-b border-slate-100/60 dark:border-slate-800/50 last:border-none transition-colors"
                                    >
                                      <div className="min-w-0">
                                        <p className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
                                          {p.name_en || p.name_dv} {p.name_dv ? `(${p.name_dv})` : ''}
                                        </p>
                                        <p className="text-[10px] text-slate-400 font-mono truncate">
                                          {p.barcode ? `${p.barcode}` : ''} {p.category ? `• ${p.category}` : ''}
                                        </p>
                                      </div>
                                      <div className="flex items-center gap-1.5 shrink-0">
                                        {isZero && (
                                          <span className="text-[9px] font-black text-amber-600 dark:text-amber-400 bg-amber-500/15 px-1.5 py-0.5 rounded">
                                            0% Tax
                                          </span>
                                        )}
                                        {p.cost_price && (
                                          <span className="text-[9px] text-slate-500 font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                            Cost: {p.cost_price}
                                          </span>
                                        )}
                                        <span className={cn(
                                          "text-[9px] font-black px-1.5 py-0.5 rounded font-mono",
                                          pStock < 0 ? "bg-red-500/20 text-red-500" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                                        )}>
                                          Stock: {pStock}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}
                                {matchingProducts.length === 0 && (
                                  <div className="text-center py-4 text-xs text-slate-400">
                                    <p>No matching products found.</p>
                                    <Button
                                      type="button"
                                      variant="link"
                                      size="sm"
                                      onClick={() => setIsCatalogPickerOpen(true)}
                                      className="text-xs text-primary font-bold mt-1"
                                    >
                                      Open Full Catalog Browser
                                    </Button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Current Stock Indicator */}
                      <td className="py-2 px-3 text-center">
                        {currentStock !== null ? (
                          <div className="inline-flex flex-col items-center">
                            <span className={cn(
                              "font-mono font-black text-xs px-2 py-0.5 rounded-md",
                              isNegativeStock
                                ? "bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
                            )}>
                              {currentStock}
                            </span>
                            {isNegativeStock && (
                              <span className="text-[8px] font-black text-red-500 mt-0.5 uppercase">
                                Minus
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600 text-xs">—</span>
                        )}
                      </td>

                      {/* Invoice Quantity */}
                      <td className="py-2 px-3 text-center">
                        <Input
                          type="number"
                          min="0.01"
                          step="any"
                          value={item.quantity}
                          onChange={(e) => handleUpdateItemField(item.id, 'quantity', e.target.value)}
                          onFocus={handleFocus}
                          className="h-9 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-center font-black text-xs font-mono rounded-lg w-24 mx-auto"
                          placeholder="1"
                        />
                      </td>

                      {/* Unit Purchase Price (Editable) */}
                      <td className="py-2 px-3 text-center">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(e) => handleUpdateItemField(item.id, 'unitPrice', e.target.value)}
                          onFocus={handleFocus}
                          className="h-9 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-center font-black text-xs font-mono rounded-lg w-28 mx-auto"
                          placeholder="0.00"
                        />
                      </td>

                      {/* Subtotal (Editable & Auto-Syncing with Unit Cost) */}
                      <td className="py-2 px-3 text-center">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.subtotal}
                          onChange={(e) => handleUpdateItemField(item.id, 'subtotal', e.target.value)}
                          onFocus={handleFocus}
                          className="h-9 bg-primary/5 border-primary/30 focus:border-primary text-center font-black text-xs font-mono rounded-lg w-32 mx-auto text-slate-900 dark:text-white"
                          placeholder="0.00"
                        />
                      </td>

                      {/* Zero Tax Auto-Detect */}
                      <td className="py-2 px-3 text-center">
                        {item.productId ? (
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-[9px] font-black border inline-block",
                            item.isZeroTax
                              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25"
                              : "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/25"
                          )}>
                            {item.isZeroTax ? "0% GST" : `${taxRate}% GST`}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-300 dark:text-slate-600 font-bold">—</span>
                        )}
                      </td>

                      {/* Delete Row Button */}
                      <td className="py-2 px-2 text-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveItemRow(item.id)}
                          className="h-7 w-7 text-slate-400 hover:bg-red-500/10 hover:text-red-500 rounded-lg"
                          title="Remove line item"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Unified Sleek Bottom Summary & Action Dock */}
        <div className="px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
          <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4">
            {/* Financial Breakdown Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 flex-1">
              <div className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800">
                <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">Subtotal</span>
                <span className="font-mono font-black text-slate-800 dark:text-slate-200 text-xs sm:text-sm">
                  {currency} {totalSubtotal.toFixed(2)}
                </span>
              </div>

              <div className="px-3 py-2 rounded-xl bg-amber-500/5 border border-amber-500/20">
                <span className="block text-[9px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Zero-Tax (0%)</span>
                <span className="font-mono font-black text-amber-600 dark:text-amber-400 text-xs sm:text-sm">
                  {currency} {zeroTaxSubtotal.toFixed(2)}
                </span>
              </div>

              <div className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800">
                <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">Taxable Basis</span>
                <span className="font-mono font-black text-slate-800 dark:text-slate-200 text-xs sm:text-sm">
                  {currency} {taxableSubtotal.toFixed(2)}
                </span>
              </div>

              <div className="px-3 py-2 rounded-xl bg-orange-500/5 border border-orange-500/20">
                <span className="block text-[9px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
                  Input GST ({taxRate}%)
                </span>
                <span className="font-mono font-black text-orange-600 dark:text-orange-400 text-xs sm:text-sm">
                  {currency} {totalInputGst.toFixed(2)}
                </span>
              </div>

              <div className="col-span-2 sm:col-span-1 px-3.5 py-2 rounded-xl bg-primary/10 border border-primary/30 flex flex-col justify-center">
                <span className="block text-[9px] font-black uppercase tracking-wider text-primary">
                  Grand Total (ޖުމްލަ)
                </span>
                <span className="font-mono font-black text-primary text-base sm:text-lg leading-tight">
                  {currency} {grandTotal.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Right Controls: Stock Toggle + Cancel + Save */}
            <div className="flex flex-wrap sm:flex-nowrap items-center justify-end gap-2.5 shrink-0">
              {/* Stock Update Switch Pill */}
              <div 
                onClick={() => setShouldUpdateStock(!shouldUpdateStock)}
                className={cn(
                  "flex items-center gap-3 px-3.5 py-2 rounded-xl border transition-all cursor-pointer select-none",
                  shouldUpdateStock 
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300" 
                    : "bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-300"
                )}
                title={shouldUpdateStock ? "Stock quantities will be increased by bill item quantities" : "Only product cost price and bill will be saved. Stock remains unchanged."}
              >
                <Switch
                  checked={shouldUpdateStock}
                  onCheckedChange={setShouldUpdateStock}
                  className="shrink-0"
                />
                <div className="text-left">
                  <span className="text-xs font-black block leading-tight">
                    {shouldUpdateStock ? 'Update Stock (ސްޓޮކް އިތުރުކުރޭ)' : 'Save Bill Only (ހަމައެކަނި ބިލް)'}
                  </span>
                  <span className="text-[10px] opacity-80 block">
                    {shouldUpdateStock ? 'Adds qty to shop stock & updates cost' : 'Saves bill & cost (Stock unchanged)'}
                  </span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="h-11 px-4 rounded-xl border-slate-200 dark:border-slate-800 font-bold text-xs"
              >
                {t('cancel') || 'Cancel'}
              </Button>

              <Button
                type="button"
                onClick={handleSavePurchase}
                disabled={isSavingPurchase || !vendorId || !billNumber.trim() || grandTotal <= 0}
                className={cn(
                  "h-11 px-5 rounded-xl font-black text-xs sm:text-sm shadow-lg gap-2 transition-all shrink-0",
                  editingPurchase 
                    ? "bg-amber-500 hover:bg-amber-600 text-black shadow-amber-500/20" 
                    : shouldUpdateStock 
                      ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-primary/20"
                      : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/25"
                )}
              >
                <Save className="h-4 w-4" />
                <span>
                  {isSavingPurchase 
                    ? (editingPurchase ? 'Updating...' : shouldUpdateStock ? 'Saving & Updating Stock...' : 'Saving Bill...') 
                    : (editingPurchase 
                        ? (shouldUpdateStock ? 'Update Bill & Stock' : 'Update Bill Only')
                        : (shouldUpdateStock ? 'Save Bill & Update Stock' : 'Save Bill Only')
                      )
                  }
                </span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Sleek Quick Entry Dialog — after picking a product from catalog */}
      {quickEntryProduct && (
        <div
          className="fixed inset-0 z-[150] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setQuickEntryProduct(null);
              setIsCatalogPickerOpen(true);
            }
          }}
        >
          <div
            className="w-full max-w-md bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden font-faruma text-foreground animate-in zoom-in-95"
            dir="ltr"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Product Banner */}
            <div className="px-5 py-4 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b border-slate-200/80 dark:border-slate-800 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="h-10 w-10 rounded-xl bg-primary/15 border border-primary/25 text-primary flex items-center justify-center shrink-0 mt-0.5">
                  <Package className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-black uppercase tracking-wider text-primary">
                      Quick Line Entry
                    </span>
                    {isProductZeroTax(quickEntryProduct) ? (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25">
                        0% Zero GST
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/25">
                        {taxRate}% GST
                      </span>
                    )}
                  </div>
                  <h4 className="font-black text-sm sm:text-base text-slate-900 dark:text-white line-clamp-1 mt-0.5">
                    {quickEntryProduct.name_en || quickEntryProduct.name_dv}
                  </h4>
                  {quickEntryProduct.name_dv && (
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 line-clamp-1">
                      {quickEntryProduct.name_dv}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-1.5 text-[10px] font-mono text-slate-500">
                    <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-bold">
                      Stock: {quickEntryProduct.stock_shop ?? 0}
                    </span>
                    {quickEntryProduct.price > 0 && (
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                        Sell: {currency} {Number(quickEntryProduct.price).toFixed(2)}
                      </span>
                    )}
                    {quickEntryProduct.barcode && (
                      <span className="truncate">#{quickEntryProduct.barcode}</span>
                    )}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setQuickEntryProduct(null);
                  setIsCatalogPickerOpen(true);
                }}
                className="h-8 w-8 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 flex items-center justify-center shrink-0 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body Inputs */}
            <div className="p-5 space-y-4">
              {/* Row 1: Quantity + Quick Presets */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    1. Invoice Quantity (ތަދާދު)*
                  </label>
                  <div className="flex items-center gap-1">
                    {[1, 6, 12, 24, 50].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => {
                          const nextQty = String(preset);
                          setQuickEntryQty(nextQty);
                          const uc = parseFloat(quickEntryUnitCost) || 0;
                          if (uc > 0) setQuickEntrySubtotal((preset * uc).toFixed(2));
                          quickEntryUnitCostRef.current?.focus();
                        }}
                        className={cn(
                          "px-2 py-0.5 rounded-md text-[10px] font-black font-mono border transition-all",
                          Number(quickEntryQty) === preset
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-primary/50"
                        )}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>
                <input
                  ref={quickEntryQtyRef}
                  dir="ltr"
                  type="number"
                  min="0.01"
                  step="any"
                  value={quickEntryQty}
                  onChange={(e) => {
                    setQuickEntryQty(e.target.value);
                    const qty = parseFloat(e.target.value) || 0;
                    const uc = parseFloat(quickEntryUnitCost) || 0;
                    if (qty > 0 && uc > 0) setQuickEntrySubtotal((qty * uc).toFixed(2));
                  }}
                  onFocus={(e) => e.target.select()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      quickEntryUnitCostRef.current?.focus();
                    }
                  }}
                  className="w-full h-11 px-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center font-black text-lg font-mono rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                  placeholder="1"
                  autoFocus
                />
              </div>

              {/* Row 2: Unit Cost & Subtotal Side-by-Side */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                    2. Unit Cost ({currency})
                  </label>
                  <input
                    ref={quickEntryUnitCostRef}
                    dir="ltr"
                    type="number"
                    min="0"
                    step="0.01"
                    value={quickEntryUnitCost}
                    onChange={(e) => {
                      setQuickEntryUnitCost(e.target.value);
                      const qty = parseFloat(quickEntryQty) || 0;
                      const uc = parseFloat(e.target.value) || 0;
                      if (qty > 0 && uc > 0) setQuickEntrySubtotal((qty * uc).toFixed(2));
                    }}
                    onFocus={(e) => e.target.select()}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        quickEntrySubtotalRef.current?.focus();
                      }
                    }}
                    className="w-full h-11 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center font-black text-base font-mono rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-black uppercase tracking-wider text-primary block">
                    3. Line Subtotal ({currency})
                  </label>
                  <input
                    ref={quickEntrySubtotalRef}
                    dir="ltr"
                    type="number"
                    min="0"
                    step="0.01"
                    value={quickEntrySubtotal}
                    onChange={(e) => {
                      setQuickEntrySubtotal(e.target.value);
                      const qty = parseFloat(quickEntryQty) || 0;
                      const sub = parseFloat(e.target.value) || 0;
                      if (qty > 0 && sub > 0) setQuickEntryUnitCost((sub / qty).toFixed(4));
                    }}
                    onFocus={(e) => e.target.select()}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleConfirmQuickEntry();
                      }
                    }}
                    className="w-full h-11 px-3 bg-primary/10 border border-primary/40 text-center font-black text-base font-mono rounded-xl text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                    placeholder="0.00"
                  />
                </div>
              </div>

              {/* Helper Strip */}
              <div className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/70 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
                <span>Press <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-[10px]">Enter</kbd> to jump fields & confirm</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  New Stock: {(Number(quickEntryProduct.stock_shop) || 0) + (parseFloat(quickEntryQty) || 0)}
                </span>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2.5">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setQuickEntryProduct(null);
                  setIsCatalogPickerOpen(true);
                }}
                className="flex-1 h-10 rounded-xl font-bold text-xs"
              >
                ← Back to Catalog
              </Button>
              <Button
                ref={quickEntryConfirmRef}
                type="button"
                onClick={handleConfirmQuickEntry}
                disabled={!quickEntryQty || parseFloat(quickEntryQty) <= 0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleConfirmQuickEntry();
                }}
                className="flex-1 h-10 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs gap-1.5 shadow-md shadow-primary/20"
              >
                <Check className="h-4 w-4" />
                <span>Add to Bill (އިތުރުކުރޭ)</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Sleek Product Catalog Browser Modal */}
      {isCatalogPickerOpen && (
        <div 
          className="fixed inset-0 z-[130] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in"
          onClick={(e) => {
            e.stopPropagation();
            setIsCatalogPickerOpen(false);
          }}
        >
          <div 
            className="w-full max-w-5xl max-h-[88vh] bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col font-faruma text-foreground relative overflow-hidden animate-in zoom-in-95"
            dir="ltr"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Catalog Header */}
            <div className="px-5 py-3.5 bg-slate-50/80 dark:bg-slate-900/70 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-9 w-9 rounded-xl bg-indigo-500/15 border border-indigo-500/25 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <Layers className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-slate-900 dark:text-white truncate">
                      Product Catalog Browser (ޕްރޮޑަކްޓް ލިސްޓް)
                    </h3>
                    <Badge variant="secondary" className="font-mono text-[10px] font-bold">
                      {catalogFilteredProducts.length} items
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    Select any product to enter quantity & cost for this purchase bill
                  </p>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setIsCatalogPickerOpen(false)}
                className="h-8 w-8 rounded-lg border-slate-200 dark:border-slate-800 text-slate-500 hover:text-foreground shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Search & Category Filter Strip */}
            <div className="px-5 py-3 border-b border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-950 flex flex-col sm:flex-row gap-2.5 shrink-0">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search product by English/Dhivehi name, barcode, or item code..."
                  value={catalogSearchQuery}
                  onChange={(e) => {
                    setCatalogSearchQuery(e.target.value);
                    setCatalogVisibleCount(48);
                  }}
                  className="h-9 pl-9 pr-8 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 font-semibold text-xs rounded-xl"
                  autoFocus
                />
                {catalogSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setCatalogSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <div className="w-full sm:w-56 shrink-0">
                <Select 
                  value={catalogSelectedCategory} 
                  onValueChange={(val) => {
                    setCatalogSelectedCategory(val);
                    setCatalogVisibleCount(48);
                  }}
                >
                  <SelectTrigger className="h-9 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl font-bold text-xs">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-foreground !z-[140]">
                    <SelectItem value="all" className="font-bold text-xs">All Categories (ހުރިހާ ބައިތައް)</SelectItem>
                    {catalogCategories.map(cat => (
                      <SelectItem key={cat} value={cat} className="font-bold text-xs">{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* High-Density Sleek Catalog Grid */}
            <ScrollArea className="flex-1 p-4 bg-slate-50/50 dark:bg-slate-950/50 custom-scrollbar">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                {displayCatalogProducts.map(prod => {
                  const pStock = Number(prod.stock_shop) || 0;
                  const isZero = isProductZeroTax(prod);
                  const existingInBill = items.find(i => i.productId === prod.id);
                  return (
                    <div
                      key={prod.id}
                      onClick={() => handleAddProductFromCatalog(prod)}
                      className={cn(
                        "p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between group active:scale-[0.98]",
                        existingInBill
                          ? "bg-primary/5 border-primary/40 hover:border-primary"
                          : "bg-white dark:bg-slate-900 hover:bg-primary/5 border-slate-200/80 dark:border-slate-800 hover:border-primary/40 shadow-2xs"
                      )}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1.5 mb-1.5">
                          <div className="flex items-center gap-1">
                            <span className={cn(
                              "text-[9px] font-black px-1.5 py-0.5 rounded font-mono",
                              pStock < 0
                                ? "bg-red-500/15 text-red-600 dark:text-red-400"
                                : pStock <= 5
                                  ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                            )}>
                              Stock: {pStock}
                            </span>
                            {existingInBill && (
                              <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-primary text-primary-foreground font-mono">
                                In Bill: {existingInBill.quantity}
                              </span>
                            )}
                          </div>
                          {isZero && (
                            <span className="text-[9px] font-black text-amber-600 dark:text-amber-400 bg-amber-500/15 px-1.5 py-0.5 rounded">
                              0% GST
                            </span>
                          )}
                        </div>

                        <p className="font-black text-xs text-slate-900 dark:text-slate-100 group-hover:text-primary transition-colors line-clamp-1">
                          {prod.name_en || prod.name_dv}
                        </p>
                        <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                          {prod.name_dv || prod.item_code || '—'}
                        </p>
                      </div>

                      <div className="pt-2 mt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                        <span className="font-mono font-black text-slate-800 dark:text-slate-200 text-[11px]">
                          Cost: {currency} {prod.cost_price ? Number(prod.cost_price).toFixed(2) : (Number(prod.price) || 0).toFixed(2)}
                        </span>
                        <span className="text-[10px] font-black text-primary flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                          <Plus className="h-3 w-3" /> Select
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {catalogFilteredProducts.length > catalogVisibleCount && (
                <div className="flex justify-center py-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCatalogVisibleCount(prev => prev + 48)}
                    className="h-9 px-6 rounded-xl text-xs font-black text-primary"
                  >
                    Load More Products ({catalogFilteredProducts.length - catalogVisibleCount} remaining)
                  </Button>
                </div>
              )}

              {catalogFilteredProducts.length === 0 && (
                <div className="text-center py-12 text-slate-400">
                  <Package className="h-9 w-9 mx-auto opacity-30 mb-2" />
                  <p className="font-bold text-xs">No products found matching your search</p>
                </div>
              )}
            </ScrollArea>

            {/* Catalog Modal Footer */}
            <div className="px-5 py-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
              <span className="text-[11px] text-slate-500">
                Bill currently has <strong className="text-slate-800 dark:text-slate-200">{items.filter(i => i.productId).length}</strong> item(s)
              </span>
              <Button
                type="button"
                onClick={() => setIsCatalogPickerOpen(false)}
                className="h-9 px-5 rounded-xl bg-primary text-primary-foreground font-black text-xs"
              >
                Done / Back to Bill (ނިމުނީ)
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Sleek Quick Add Vendor Modal */}
      {isQuickAddVendorOpen && (
        <div 
          className="fixed inset-0 z-[140] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in"
          onClick={(e) => {
            e.stopPropagation();
            setIsQuickAddVendorOpen(false);
          }}
        >
          <div 
            className="w-full max-w-md bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xl space-y-4 font-faruma text-foreground relative animate-in zoom-in-95"
            dir="ltr"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    {t('add_vendor') || 'Add New Vendor'} (އައު ވެންޑަރ)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Enter supplier name, phone, and GST TIN number
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsQuickAddVendorOpen(false)}
                className="h-8 w-8 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-foreground flex items-center justify-center"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleQuickAddVendor} className="space-y-3.5">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-600 dark:text-slate-300">{t('vendor_name') || 'Vendor Name'}*</Label>
                <Input
                  value={quickVendorName}
                  onChange={(e) => setQuickVendorName(e.target.value)}
                  placeholder="Vendor name / ވެންޑަރ ނަން"
                  className="h-10 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 font-bold text-xs"
                  autoFocus
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-600 dark:text-slate-300">{t('phone') || 'Phone'}</Label>
                  <Input
                    value={quickVendorPhone}
                    onChange={(e) => setQuickVendorPhone(e.target.value)}
                    placeholder="Phone number"
                    className="h-10 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-600 dark:text-slate-300">{t('tin_number') || 'TIN Number'}</Label>
                  <Input
                    maxLength={13}
                    value={quickVendorTin}
                    onChange={(e) => setQuickVendorTin(e.target.value.toUpperCase().replace(/\s+/g, ''))}
                    placeholder="1021550GST501"
                    className="h-10 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 font-mono text-xs"
                  />
                </div>
              </div>
              <div className="pt-2 flex gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsQuickAddVendorOpen(false)}
                  className="flex-1 h-10 rounded-xl font-bold text-xs"
                >
                  {t('cancel') || 'Cancel'}
                </Button>
                <Button
                  type="submit"
                  disabled={isAddingVendor || !quickVendorName.trim()}
                  className="flex-1 h-10 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs shadow-md"
                >
                  {isAddingVendor ? (t('saving') || 'Saving...') : (t('add_vendor') || 'Save Vendor')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sleek Recent Purchases History Modal */}
      {isHistoryOpen && (
        <div 
          className="fixed inset-0 z-[160] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in"
          onClick={() => setIsHistoryOpen(false)}
        >
          <div 
            className="w-full max-w-2xl max-h-[85vh] bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xl flex flex-col font-faruma text-foreground animate-in zoom-in-95"
            dir="ltr"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
                  <History className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    Recent Local Purchase Bills (ފަހުގެ ލޯކަލް ޕާޗޭސް ބިލްތައް)
                  </h3>
                  <p className="text-[11px] text-slate-500">Select any bill to load and edit</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsHistoryOpen(false)}
                className="h-8 w-8 rounded-lg"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <ScrollArea className="flex-1 pr-1">
              {purchases.length === 0 ? (
                <div className="text-center py-14 text-slate-400 font-bold text-xs">
                  No local purchase bills saved yet
                </div>
              ) : (
                <div className="space-y-2">
                  {purchases.map(p => (
                    <div 
                      key={p.id}
                      className={cn(
                        "p-3 rounded-xl border transition-all flex items-center justify-between gap-3 group",
                        editingPurchase?.id === p.id 
                          ? "bg-amber-500/10 border-amber-500/40" 
                          : "bg-slate-50 dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-800 hover:border-primary/40"
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-black text-slate-900 dark:text-white block truncate">
                          {p.vendorName || p.vendor || 'Unknown Vendor'}
                        </span>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                          <Badge variant="outline" className="font-mono text-[10px] px-1.5 py-0 h-4">
                            #{p.billNumber}
                          </Badge>
                          <span>{p.date ? p.date.split('T')[0] : ''}</span>
                          {p.items && p.items.length > 0 && (
                            <span className="text-[10px] font-mono">• {p.items.length} items</span>
                          )}
                        </div>
                      </div>

                      <div className="text-right font-mono shrink-0">
                        <span className="text-xs font-black text-primary block">
                          {currency} {(Number(p.amount || 0) + Number(p.gstAmount || 0)).toFixed(2)}
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          GST: {currency} {Number(p.gstAmount || 0).toFixed(2)}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingPurchase(p);
                            setIsHistoryOpen(false);
                            showSuccess(`Editing bill #${p.billNumber}`);
                          }}
                          className="h-8 px-2.5 rounded-lg border-primary/30 bg-primary/10 hover:bg-primary/20 text-primary font-bold text-xs gap-1"
                        >
                          <Pencil className="h-3 w-3" />
                          <span>Edit</span>
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={async () => {
                            if (window.confirm(`Delete purchase bill #${p.billNumber}?`)) {
                              await deletePurchase(p.id);
                              if (editingPurchase?.id === p.id) {
                                setEditingPurchase(null);
                              }
                            }
                          }}
                          className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      )}
    </div>
  );
};

export default LocalPurchaseWindow;

