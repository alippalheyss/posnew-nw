import React, { useState, useMemo, useRef } from 'react';
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
  Layers
} from 'lucide-react';
import { useAppContext, Purchase, Vendor, PurchaseItem, Product } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
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

// Smart zero-tax detection helper
export const isProductZeroTax = (prod?: Product | null): boolean => {
  if (!prod) return false;
  if (prod.is_zero_tax === true || (prod as any).is_zero_tax === 1 || (prod as any).is_zero_tax === 'true' || (prod as any).is_zero_tax === '1') {
    return true;
  }
  const nameEn = (prod.name_en || '').toLowerCase();
  const nameDv = (prod.name_dv || '').toLowerCase();
  const category = (prod.category || '').toLowerCase();

  if (category.includes('zero') || category.includes('exempt') || category.includes('essential')) {
    return true;
  }

  // Common Maldivian zero-rated essential items (GST Act Schedule)
  const zeroKeywords = [
    'rice', 'sugar', 'flour', 'milk', 'egg', 'eggs', 'bread', 'onion', 'onions', 
    'potato', 'potatoes', 'lentil', 'lentils', 'dhal', 'garlic', 'ginger',
    'baby food', 'infant formula', 'medicine', 'diesel', 'petrol', 'cooking oil',
    'vegetable oil', 'sanitary', 'salt', 'coconut', 'water 5l', 'mineral water',
    'ހަނޑޫ', 'ހަކުރު', 'ފުށް', 'ކިރު', 'ބިސް', 'ޕާން', 'ފިޔާ', 'އަލުވި', 'މުގު',
    'ތެޔޮ', 'ބޭސް', 'ލޮނުމެދު', 'އިނގުރު', 'ލޮނު'
  ];

  for (const kw of zeroKeywords) {
    if (nameEn.includes(kw) || nameDv.includes(kw)) {
      return true;
    }
  }

  return false;
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
    addPurchase,
    addVendor,
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

  // Dedicated Product Catalog Browser Modal
  const [isCatalogPickerOpen, setIsCatalogPickerOpen] = useState(false);
  const [catalogSearchQuery, setCatalogSearchQuery] = useState('');
  const [catalogSelectedCategory, setCatalogSelectedCategory] = useState('all');

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

  // Catalog filtered products
  const catalogFilteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = !catalogSearchQuery || 
        p.name_en.toLowerCase().includes(catalogSearchQuery.toLowerCase()) ||
        p.name_dv.toLowerCase().includes(catalogSearchQuery.toLowerCase()) ||
        p.barcode.includes(catalogSearchQuery) ||
        p.item_code.toLowerCase().includes(catalogSearchQuery.toLowerCase());
      
      const matchesCat = catalogSelectedCategory === 'all' || p.category === catalogSelectedCategory;
      return matchesSearch && matchesCat;
    });
  }, [products, catalogSearchQuery, catalogSelectedCategory]);

  const handleQuickAddVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickVendorName.trim()) {
      showError(t('vendor_name_required') || 'Vendor name is required');
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
      tin_number: quickVendorTin.trim(),
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
      id: crypto.randomUUID(),
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
      await addPurchase(purchase);
      handleClose();
    } catch (error) {
      console.error('Error saving purchase:', error);
      showError('Failed to save purchase bill');
    } finally {
      setIsSavingPurchase(false);
    }
  };

  const handleClose = () => {
    setIsPurchaseWindowOpen(false);
    setIsPurchaseWindowMinimized(false);
    setVendorId('');
    setBillNumber('');
    setDate(new Date().toISOString().split('T')[0]);
    setDescription('');
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
        className="w-[98vw] max-w-[1520px] h-[96vh] sm:h-[94vh] apple-glass-dialog border border-white/20 dark:border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col font-faruma relative cursor-default" 
        dir="rtl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/15 dark:border-white/10 bg-white/20 dark:bg-white/5 backdrop-blur-md gap-4 shrink-0">
          <div className="flex items-center gap-2 shrink-0" dir="ltr">
            <Button 
              type="button" 
              variant="outline" 
              size="icon" 
              onClick={() => setIsPurchaseWindowMinimized(true)} 
              className="h-9 w-9 rounded-xl border border-white/20 bg-white/10 hover:bg-amber-500/15 hover:border-amber-500/50 hover:text-amber-500 text-foreground shadow-sm transition-all active:scale-90"
              title="Minimize (ކުޑަކޮށްލާ)"
            >
              <Minus className="h-4 w-4 stroke-[2.5]" />
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              size="icon" 
              onClick={handleClose} 
              className="h-9 w-9 rounded-xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/25 text-red-500 shadow-sm transition-all active:scale-90"
              title="Close (ބަންދުކޮށްލާ)"
            >
              <X className="h-4 w-4 stroke-[2.5]" />
            </Button>
          </div>
          <div className="text-right flex-1 min-w-0">
            <div className="flex items-center justify-end gap-3 flex-wrap">
              <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg bg-primary/15 text-primary border border-primary/30">
                GST Input Tax & Inventory Management
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-foreground flex items-center justify-end gap-2.5 truncate">
                <span>{t('record_local_purchase') || 'Local Purchase Bill'} (ލޯކަލް ޕަރޗޭސް ބިލް)</span> 
                <ShoppingBag className="h-6 w-6 text-primary shrink-0" />
              </h2>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              Select vendor, add invoice items, auto-detect 0% zero-tax products, auto-calculate Input GST, and update stock.
            </p>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1 custom-scrollbar">
          {/* Bill Master Information Header */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 apple-glass-card border border-white/20 dark:border-white/10 rounded-2xl shadow-xs">
            {/* Vendor Selector */}
            <div className="space-y-1.5 text-right">
              <div className="flex items-center justify-between">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsQuickAddVendorOpen(true)}
                  className="h-6 px-2 text-[11px] font-black text-primary hover:bg-primary/10 gap-1 rounded-md"
                >
                  <Plus className="h-3 w-3" />
                  <span>+ New Vendor (އައު ވެންޑަރ)</span>
                </Button>
                <Label className="text-xs font-black uppercase text-muted-foreground">
                  {t('select_vendor') || 'Vendor'}*
                </Label>
              </div>
              <Select value={vendorId} onValueChange={setVendorId}>
                <SelectTrigger className="w-full apple-glass-input text-right h-11 rounded-xl font-bold">
                  <SelectValue placeholder="Choose Vendor (ވެންޑަރ އިޚްތިޔާރުކުރޭ)" />
                </SelectTrigger>
                <SelectContent className="apple-glass-dialog border border-white/20 text-foreground !z-[110]">
                  <div className="p-2 sticky top-0 apple-glass-dialog border-b border-white/10 z-10">
                    <Input 
                      placeholder="Search vendors / ހޯއްދަވާ..." 
                      value={vendorSearchQuery}
                      onChange={(e) => setVendorSearchQuery(e.target.value)}
                      className="h-8 apple-glass-input text-right text-xs"
                    />
                  </div>
                  <ScrollArea className="h-48">
                    {filteredVendors.map(v => (
                      <SelectItem key={v.id} value={v.id} className="text-right hover:bg-white/10 font-bold text-xs">
                        {v.name_dv || v.name_en} {v.tin_number ? `(TIN: ${v.tin_number})` : ''}
                      </SelectItem>
                    ))}
                  </ScrollArea>
                </SelectContent>
              </Select>
            </div>

            {/* Invoice / Bill Number */}
            <div className="space-y-1.5 text-right">
              <Label className="text-xs font-black uppercase text-muted-foreground">
                Invoice / Bill Number (ބިލް ނަންބަރު)*
              </Label>
              <Input
                value={billNumber}
                onChange={(e) => setBillNumber(e.target.value)}
                placeholder="e.g. INV-2026-001"
                className="apple-glass-input font-bold h-11 rounded-xl text-right font-mono text-sm"
              />
            </div>

            {/* Bill Date */}
            <div className="space-y-1.5 text-right">
              <Label className="text-xs font-black uppercase text-muted-foreground">
                Bill Date (ތާރީޚް)*
              </Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="apple-glass-input font-bold h-11 rounded-xl text-right font-mono text-sm"
              />
            </div>
          </div>

          {/* Product Items Table Section */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddItemRow}
                  className="h-9 px-3.5 text-xs font-black text-primary border-primary/30 hover:bg-primary/10 gap-1.5 rounded-xl transition-all shadow-xs"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Line Row (އައިޓަމެއް އިތުރުކުރޭ)</span>
                </Button>

                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsCatalogPickerOpen(true)}
                  className="h-9 px-3.5 text-xs font-black bg-muted/80 hover:bg-muted text-foreground border border-border gap-1.5 rounded-xl transition-all shadow-xs"
                >
                  <Layers className="h-4 w-4 text-purple-500" />
                  <span>Browse Products Catalog (ޕްރޮޑަކްޓް ލިސްޓް)</span>
                </Button>
              </div>

              <div className="flex items-center gap-2 text-right">
                <span className="text-xs text-muted-foreground font-bold font-mono">
                  {items.length} Rows • {totalQuantity} Units
                </span>
                <h3 className="text-sm font-black text-foreground flex items-center gap-2">
                  <span>Invoice Items (ބިލުގައިވާ ތަކެތި)</span>
                  <Package className="h-4 w-4 text-primary" />
                </h3>
              </div>
            </div>

            {/* Main Products Table */}
            <div className="border border-border rounded-2xl bg-card shadow-sm overflow-visible">
              <div className="w-full">
                <table className="w-full text-right text-xs">
                  <thead className="bg-muted/80 border-b border-border text-muted-foreground font-black uppercase tracking-wider">
                    <tr>
                      <th className="p-3.5 text-center w-12">#</th>
                      <th className="p-3.5 text-right min-w-[280px]">Product Item (ޕްރޮޑަކްޓް)</th>
                      <th className="p-3.5 text-center w-28">Current Stock</th>
                      <th className="p-3.5 text-center w-28">Invoice Qty*</th>
                      <th className="p-3.5 text-center w-36">Unit Cost ({currency})*</th>
                      <th className="p-3.5 text-center w-36">Subtotal ({currency})*</th>
                      <th className="p-3.5 text-center w-28">0% Tax (Zero GST)</th>
                      <th className="p-3.5 text-center w-14"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {items.map((item, index) => {
                      const selectedProd = products.find(p => p.id === item.productId);
                      const currentStock = selectedProd ? (Number(selectedProd.stock_shop) || 0) : null;
                      const isNegativeStock = currentStock !== null && currentStock < 0;
                      const calculated = calculatedItems.find(c => c.id === item.id);
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
                        <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                          {/* Row Number */}
                          <td className="p-3 text-center font-mono font-bold text-muted-foreground">
                            {index + 1}
                          </td>

                          {/* Product Selection */}
                          <td className="p-3 relative">
                            {selectedProd && !isSearching ? (
                              <div 
                                onClick={() => setActiveSearchRowId(item.id)}
                                className="flex items-center justify-between p-2.5 rounded-xl bg-muted/60 hover:bg-muted border border-border/80 cursor-pointer group transition-all"
                              >
                                <div className="text-right min-w-0 flex-1">
                                  <div className="flex items-center justify-start gap-2 flex-wrap mb-0.5">
                                    <p className="font-black text-foreground text-xs truncate">{selectedProd.name_dv || selectedProd.name_en}</p>
                                    {item.isZeroTax && (
                                      <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/30 text-[9px] px-1.5 py-0">
                                        0% Zero Tax
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-[10px] text-muted-foreground font-mono truncate">
                                    {selectedProd.name_en} {selectedProd.barcode ? `• Barcode: ${selectedProd.barcode}` : ''} {selectedProd.category ? `• [${selectedProd.category}]` : ''}
                                  </p>
                                </div>
                                <span className="text-[10px] text-primary group-hover:underline font-bold mr-2 shrink-0">
                                  Change (ބަދަލުކުރޭ)
                                </span>
                              </div>
                            ) : (
                              <div className="relative">
                                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                  placeholder="Search product name, barcode, item code..."
                                  value={query}
                                  onChange={(e) => {
                                    setProductSearchQueries(prev => ({ ...prev, [item.id]: e.target.value }));
                                    setActiveSearchRowId(item.id);
                                  }}
                                  onFocus={() => setActiveSearchRowId(item.id)}
                                  className="h-11 bg-background border-border text-right text-xs pr-9 rounded-xl font-bold font-faruma"
                                />
                                {isSearching && (
                                  <div className="absolute top-12 right-0 w-full z-[120] bg-card border border-border rounded-2xl shadow-2xl p-1.5 max-h-60 overflow-y-auto custom-scrollbar">
                                    <div className="p-1.5 border-b border-border/40 text-[10px] font-bold text-muted-foreground flex justify-between items-center">
                                      <button 
                                        type="button" 
                                        onClick={() => setActiveSearchRowId(null)}
                                        className="text-red-500 hover:underline"
                                      >
                                        Close (ލައްޕާ)
                                      </button>
                                      <span>Select a product ({matchingProducts.length} results):</span>
                                    </div>
                                    {matchingProducts.map(p => {
                                      const pStock = p.stock_shop || 0;
                                      const isZero = isProductZeroTax(p);
                                      return (
                                        <div
                                          key={p.id}
                                          onClick={() => handleProductSelect(item.id, p)}
                                          className="p-2 hover:bg-muted rounded-xl cursor-pointer text-right flex items-center justify-between gap-2 border-b border-border/30 last:border-none transition-colors"
                                        >
                                          <div className="flex items-center gap-1.5 flex-wrap">
                                            <span className={cn(
                                              "text-[9px] font-black px-1.5 py-0.5 rounded font-mono",
                                              pStock < 0 ? "bg-red-500/20 text-red-500" : "bg-muted text-muted-foreground"
                                            )}>
                                              Stock: {pStock}
                                            </span>
                                            {p.cost_price && (
                                              <span className="text-[9px] text-muted-foreground font-mono bg-muted/70 px-1 rounded">
                                                Cost: {p.cost_price}
                                              </span>
                                            )}
                                            {isZero && (
                                              <span className="text-[9px] font-black text-amber-500 bg-amber-500/15 px-1.5 py-0.5 rounded">
                                                0% Tax
                                              </span>
                                            )}
                                          </div>
                                          <div className="min-w-0 text-right">
                                            <p className="font-black text-xs text-foreground truncate">{p.name_dv || p.name_en}</p>
                                            <p className="text-[10px] text-muted-foreground font-mono truncate">{p.name_en} {p.barcode ? `• ${p.barcode}` : ''}</p>
                                          </div>
                                        </div>
                                      );
                                    })}
                                    {matchingProducts.length === 0 && (
                                      <div className="text-center py-4 text-xs text-muted-foreground">
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
                          <td className="p-3 text-center">
                            {currentStock !== null ? (
                              <div className="flex flex-col items-center">
                                <span className={cn(
                                  "font-mono font-black text-xs px-2.5 py-1 rounded-lg",
                                  isNegativeStock ? "bg-red-500/20 text-red-500 border border-red-500/30 animate-pulse" : "bg-muted text-foreground"
                                )}>
                                  {currentStock}
                                </span>
                                {isNegativeStock && (
                                  <span className="text-[8px] font-black text-red-500 mt-0.5 uppercase tracking-wide">
                                    Minus Stock
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-[10px]">-</span>
                            )}
                          </td>

                          {/* Invoice Quantity */}
                          <td className="p-3 text-center">
                            <Input
                              type="number"
                              min="0.01"
                              step="any"
                              value={item.quantity}
                              onChange={(e) => handleUpdateItemField(item.id, 'quantity', e.target.value)}
                              onFocus={handleFocus}
                              className="h-10 bg-background border-border text-center font-black text-sm font-mono rounded-xl w-24 mx-auto"
                              placeholder="1"
                            />
                          </td>

                          {/* Unit Purchase Price (Editable) */}
                          <td className="p-3 text-center">
                            <div className="relative w-28 mx-auto">
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.unitPrice}
                                onChange={(e) => handleUpdateItemField(item.id, 'unitPrice', e.target.value)}
                                onFocus={handleFocus}
                                className="h-10 bg-background border-border text-center font-black text-sm font-mono rounded-xl w-full"
                                placeholder="0.00"
                              />
                            </div>
                          </td>

                          {/* Subtotal (Editable & Auto-Syncing with Unit Cost) */}
                          <td className="p-3 text-center">
                            <div className="relative w-32 mx-auto">
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.subtotal}
                                onChange={(e) => handleUpdateItemField(item.id, 'subtotal', e.target.value)}
                                onFocus={handleFocus}
                                className="h-10 bg-background border-primary/40 focus:border-primary text-center font-black text-sm font-mono rounded-xl w-full text-foreground"
                                placeholder="0.00"
                              />
                            </div>
                          </td>

                          {/* Zero Tax Auto-Detect (Read-Only Display) */}
                          <td className="p-3 text-center">
                            <div className="flex flex-col items-center justify-center gap-1">
                              {item.productId ? (
                                <span className={cn(
                                  "px-2 py-0.5 rounded-full text-[9px] font-black border",
                                  item.isZeroTax
                                    ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                                    : "bg-blue-500/10 text-blue-500 border-blue-500/20"
                                )}>
                                  {item.isZeroTax ? "0% GST" : `${taxRate}% GST`}
                                </span>
                              ) : (
                                <span className="text-[9px] text-muted-foreground/40 font-bold">—</span>
                              )}
                            </div>
                          </td>

                          {/* Delete Row Button */}
                          <td className="p-3 text-center">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveItemRow(item.id)}
                              className="h-8 w-8 text-red-500 hover:bg-red-500/10 hover:text-red-600 rounded-lg"
                              title="Remove line item"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Description & Summary Totals Card */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start pt-2">
            <div className="space-y-2 text-right">
              <Label className="text-xs font-black uppercase text-muted-foreground">
                Bill Notes / Description (އިތުރު ތަފްޞީލް)
              </Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional purchase details, supplier bill remarks, or payment reference..."
                className="bg-background border-border text-right h-12 rounded-xl font-bold text-xs sm:text-sm"
              />

              <div className="p-3 bg-muted/40 rounded-xl border border-border text-xs text-muted-foreground space-y-1">
                <p className="font-black text-foreground flex items-center justify-end gap-1.5">
                  <span>Smart Tax & Stock Automation (ޓެކްސް އަދި ސްޓޮކް އަޕްޑޭޓް)</span>
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                </p>
                <p className="text-[11px] leading-relaxed">
                  Saving this purchase bill will automatically increase the shop inventory stock, record the new unit cost price, and calculate input GST statements.
                </p>
              </div>
            </div>

            {/* Calculations Breakdown */}
            <div className="bg-muted/70 border border-border rounded-2xl p-5 space-y-3 text-right font-faruma shadow-sm">
              <div className="flex justify-between items-center text-xs font-bold text-muted-foreground">
                <span className="font-mono font-black text-foreground">{currency} {totalSubtotal.toFixed(2)}</span>
                <span>Subtotal ({totalQuantity} Items Total):</span>
              </div>

              {zeroTaxSubtotal > 0 && (
                <div className="flex justify-between items-center text-xs font-bold text-amber-500">
                  <span className="font-mono font-black">{currency} {zeroTaxSubtotal.toFixed(2)}</span>
                  <span>Zero-Rated / Exempt Items (0% Tax):</span>
                </div>
              )}

              <div className="flex justify-between items-center text-xs font-bold text-muted-foreground">
                <span className="font-mono font-black text-foreground">{currency} {taxableSubtotal.toFixed(2)}</span>
                <span>Taxable Items ({taxRate}% GST Basis):</span>
              </div>

              <div className="flex justify-between items-center text-xs font-bold text-muted-foreground">
                <span className="font-mono font-black text-orange-500">
                  {currency} {totalInputGst.toFixed(2)}
                </span>
                <span>Input GST (އިންޕުޓް ޓެކްސް):</span>
              </div>

              <div className="pt-3 border-t border-border flex justify-between items-center">
                <span className="text-2xl font-black text-foreground font-mono text-primary">
                  {currency} {grandTotal.toFixed(2)}
                </span>
                <span className="text-base font-black text-foreground">
                  Grand Total (ޖުމްލަ އަގު):
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Sticky Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-border bg-muted/80 flex flex-row gap-4 items-center justify-between shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            className="h-12 px-6 rounded-2xl border-border hover:bg-muted text-foreground font-bold text-xs"
          >
            {t('cancel') || 'Cancel'}
          </Button>

          <Button
            type="button"
            onClick={handleSavePurchase}
            disabled={isSavingPurchase || !vendorId || !billNumber.trim() || grandTotal <= 0}
            className="flex-1 max-w-md h-12 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs sm:text-sm shadow-xl shadow-primary/20 uppercase gap-2"
          >
            <Save className="h-4 w-4" />
            <span>{isSavingPurchase ? 'Saving & Updating Stock...' : 'Save Paid Bill & Update Stock (ބިލް ސޭވްކުރޭ)'}</span>
          </Button>
        </div>
      </div>

      {/* Quick Entry Dialog — after picking a product from catalog */}
      {quickEntryProduct && (
        <div
          className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in"
          onClick={(e) => { if (e.target === e.currentTarget) { setQuickEntryProduct(null); setIsCatalogPickerOpen(true); } }}
        >
          <div
            className="w-full max-w-sm bg-card border border-primary/30 rounded-3xl p-6 shadow-2xl shadow-primary/10 space-y-5 font-faruma text-foreground animate-in zoom-in-95"
            dir="rtl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <button
                type="button"
                onClick={() => { setQuickEntryProduct(null); setIsCatalogPickerOpen(true); }}
                className="h-8 w-8 rounded-xl border border-border bg-muted/50 hover:bg-muted text-muted-foreground flex items-center justify-center shrink-0 mt-0.5"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="text-right flex-1 min-w-0">
                <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">Quick Entry — ޕްރޮޑަކްޓް</p>
                <p className="font-black text-base text-foreground line-clamp-2">{quickEntryProduct.name_dv || quickEntryProduct.name_en}</p>
                <p className="text-[11px] text-muted-foreground font-mono line-clamp-1">{quickEntryProduct.name_en}</p>
                {isProductZeroTax(quickEntryProduct) && (
                  <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/10 text-amber-500 border border-amber-500/20">0% GST</span>
                )}
              </div>
            </div>

            {/* Fields with Enter-key navigation */}
            <div className="space-y-3">
              {/* Qty */}
              <div className="space-y-1 text-right">
                <label className="text-[11px] font-black uppercase text-muted-foreground block">Quantity (ތަދާދު)*</label>
                <input
                  ref={quickEntryQtyRef}
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
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); quickEntryUnitCostRef.current?.focus(); } }}
                  className="w-full h-14 bg-muted border border-border text-center font-black text-2xl font-mono rounded-2xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="1"
                  autoFocus
                />
              </div>

              {/* Unit Cost */}
              <div className="space-y-1 text-right">
                <label className="text-[11px] font-black uppercase text-muted-foreground block">Unit Cost — {currency} (ޔުނިޓް ކޮސްޓް)</label>
                <input
                  ref={quickEntryUnitCostRef}
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
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); quickEntrySubtotalRef.current?.focus(); } }}
                  className="w-full h-14 bg-muted border border-border text-center font-black text-2xl font-mono rounded-2xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="0.00"
                />
              </div>

              {/* Subtotal — highlighted */}
              <div className="space-y-1 text-right">
                <label className="text-[11px] font-black uppercase text-muted-foreground block">Subtotal — {currency} (ސަބްޓޯޓަލް)</label>
                <input
                  ref={quickEntrySubtotalRef}
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
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleConfirmQuickEntry(); } }}
                  className="w-full h-14 bg-primary/10 border-2 border-primary/40 text-center font-black text-2xl font-mono rounded-2xl text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="0.00"
                />
                <p className="text-[10px] text-muted-foreground text-center">Enter on Subtotal to confirm</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => { setQuickEntryProduct(null); setIsCatalogPickerOpen(true); }}
                className="flex-1 h-12 rounded-2xl border border-border bg-muted hover:bg-muted/80 text-foreground font-bold text-xs transition-all"
              >
                ← Back
              </button>
              <button
                ref={quickEntryConfirmRef}
                type="button"
                onClick={handleConfirmQuickEntry}
                disabled={!quickEntryQty || parseFloat(quickEntryQty) <= 0}
                onKeyDown={(e) => { if (e.key === 'Enter') handleConfirmQuickEntry(); }}
                className="flex-1 h-12 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-black text-sm gap-2 shadow-lg shadow-primary/20 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <Check className="h-4 w-4" />
                Add to Bill
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Product Catalog Browser Modal */}
      {isCatalogPickerOpen && (
        <div 
          className="fixed inset-0 z-[130] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in"
          onClick={(e) => {
            e.stopPropagation();
            setIsCatalogPickerOpen(false);
          }}
        >
          <div 
            className="w-full max-w-4xl max-h-[85vh] bg-card border border-border rounded-3xl p-6 shadow-2xl flex flex-col font-faruma text-foreground relative animate-in zoom-in-95"
            dir="rtl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Catalog Header */}
            <div className="flex items-center justify-between pb-4 border-b border-border gap-4 shrink-0">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setIsCatalogPickerOpen(false)}
                className="h-9 w-9 rounded-xl border border-border bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </Button>
              <div className="text-right">
                <h3 className="text-lg font-black flex items-center justify-end gap-2 text-foreground">
                  <span>Product Catalog Browser (ޕްރޮޑަކްޓް ލިސްޓް)</span>
                  <Package className="w-5 h-5 text-primary" />
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Click any product to add it directly into the local purchase invoice.
                </p>
              </div>
            </div>

            {/* Search and Filters */}
            <div className="py-4 grid grid-cols-1 sm:grid-cols-3 gap-3 shrink-0">
              <div className="sm:col-span-2 relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by product name, barcode, code..."
                  value={catalogSearchQuery}
                  onChange={(e) => setCatalogSearchQuery(e.target.value)}
                  className="h-11 pr-9 bg-muted border-border font-bold text-xs sm:text-sm rounded-xl text-right"
                  autoFocus
                />
              </div>

              <div>
                <Select value={catalogSelectedCategory} onValueChange={setCatalogSelectedCategory}>
                  <SelectTrigger className="h-11 bg-muted border-border rounded-xl font-bold text-xs text-right">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border text-foreground !z-[140]">
                    <SelectItem value="all" className="text-right font-bold text-xs">All Categories (ހުރިހާ ބައިތައް)</SelectItem>
                    {catalogCategories.map(cat => (
                      <SelectItem key={cat} value={cat} className="text-right font-bold text-xs">{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Catalog Grid */}
            <ScrollArea className="flex-1 max-h-[50vh] custom-scrollbar">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 p-1">
                {catalogFilteredProducts.map(prod => {
                  const pStock = Number(prod.stock_shop) || 0;
                  const isZero = isProductZeroTax(prod);
                  return (
                    <div
                      key={prod.id}
                      onClick={() => handleAddProductFromCatalog(prod)}
                      className="p-3.5 rounded-2xl bg-muted/50 hover:bg-primary/10 border border-border/80 hover:border-primary/50 cursor-pointer transition-all flex flex-col justify-between group shadow-xs active:scale-[0.98]"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className={cn(
                            "text-[9px] font-black px-2 py-0.5 rounded-md font-mono",
                            pStock < 0 ? "bg-red-500/20 text-red-500" : "bg-card text-muted-foreground border border-border"
                          )}>
                            Stock: {pStock}
                          </span>
                          {isZero && (
                            <span className="text-[9px] font-black text-amber-500 bg-amber-500/15 px-1.5 py-0.5 rounded">
                              0% Tax
                            </span>
                          )}
                        </div>
                        <p className="font-black text-xs sm:text-sm text-foreground group-hover:text-primary transition-colors line-clamp-1">
                          {prod.name_dv || prod.name_en}
                        </p>
                        <p className="text-[10px] text-muted-foreground font-mono line-clamp-1 mt-0.5">
                          {prod.name_en}
                        </p>
                      </div>

                      <div className="pt-2 mt-2 border-t border-border/60 flex items-center justify-between text-xs">
                        <span className="text-[10px] font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                          + Add to Bill
                        </span>
                        <span className="font-mono font-bold text-foreground">
                          {currency} {prod.cost_price ? Number(prod.cost_price).toFixed(2) : (Number(prod.price) || 0).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {catalogFilteredProducts.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <Package className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
                  <p className="font-bold text-sm">No products found matching search</p>
                </div>
              )}
            </ScrollArea>

            {/* Catalog Modal Footer */}
            <div className="pt-4 border-t border-border flex justify-end shrink-0 mt-2">
              <Button
                type="button"
                onClick={() => setIsCatalogPickerOpen(false)}
                className="h-10 px-5 rounded-xl bg-primary text-primary-foreground font-black text-xs"
              >
                Done / Return to Bill (ނިމުނީ)
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Add Vendor Modal */}
      {isQuickAddVendorOpen && (
        <div 
          className="fixed inset-0 z-[140] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in"
          onClick={(e) => {
            e.stopPropagation();
            setIsQuickAddVendorOpen(false);
          }}
        >
          <div 
            className="w-full max-w-md bg-card border border-border rounded-3xl p-6 shadow-2xl space-y-4 font-faruma text-foreground relative animate-in zoom-in-95"
            dir="rtl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <button
                type="button"
                onClick={() => setIsQuickAddVendorOpen(false)}
                className="h-8 w-8 rounded-xl border border-border bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="text-right">
                <h3 className="text-lg font-black flex items-center justify-end gap-2">
                  <span>{t('add_vendor') || 'Add New Vendor'}</span>
                  <Building2 className="w-5 h-5 text-primary" />
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Enter vendor name and contact details
                </p>
              </div>
            </div>

            <form onSubmit={handleQuickAddVendor} className="space-y-4 pt-1">
              <div className="space-y-1.5 text-right">
                <Label className="text-xs font-bold text-muted-foreground">{t('vendor_name') || 'Vendor Name'}*</Label>
                <Input
                  value={quickVendorName}
                  onChange={(e) => setQuickVendorName(e.target.value)}
                  placeholder="Vendor name / ވެންޑަރ ނަން"
                  className="text-right bg-muted border-border font-bold h-11 rounded-xl"
                  autoFocus
                  required
                />
              </div>
              <div className="space-y-1.5 text-right">
                <Label className="text-xs font-bold text-muted-foreground">{t('phone') || 'Phone'}</Label>
                <Input
                  value={quickVendorPhone}
                  onChange={(e) => setQuickVendorPhone(e.target.value)}
                  placeholder="Phone number / ފޯނު ނަންބަރު"
                  className="text-right bg-muted border-border h-11 rounded-xl"
                />
              </div>
              <div className="space-y-1.5 text-right">
                <Label className="text-xs font-bold text-muted-foreground">{t('tin_number') || 'TIN Number'}</Label>
                <Input
                  value={quickVendorTin}
                  onChange={(e) => setQuickVendorTin(e.target.value)}
                  placeholder="TIN number (Optional)"
                  className="text-right bg-muted border-border h-11 rounded-xl"
                />
              </div>
              <div className="pt-2 flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsQuickAddVendorOpen(false)}
                  className="flex-1 h-11 rounded-xl border border-border font-bold text-xs"
                >
                  {t('cancel') || 'Cancel'}
                </Button>
                <Button
                  type="submit"
                  disabled={isAddingVendor || !quickVendorName.trim()}
                  className="flex-1 h-11 rounded-xl bg-primary hover:bg-primary/90 text-white font-black text-xs shadow-lg"
                >
                  {isAddingVendor ? (t('saving') || 'Saving...') : (t('add_vendor') || 'Add Vendor')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LocalPurchaseWindow;

