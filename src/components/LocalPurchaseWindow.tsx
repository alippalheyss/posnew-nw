import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Minus, X, Maximize2, ShoppingBag, Plus, Building2, Trash2, Search, Package, Check, Calculator, AlertCircle, Save } from 'lucide-react';
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
  isZeroTax: boolean;
}

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
    { id: crypto.randomUUID(), productId: '', quantity: 1, unitPrice: '', isZeroTax: false }
  ]);
  const [productSearchQueries, setProductSearchQueries] = useState<Record<string, string>>({});
  const [activeSearchRowId, setActiveSearchRowId] = useState<string | null>(null);

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
      { id: crypto.randomUUID(), productId: '', quantity: 1, unitPrice: '', isZeroTax: false }
    ]);
  };

  const handleRemoveItemRow = (rowId: string) => {
    if (items.length <= 1) {
      setItems([{ id: crypto.randomUUID(), productId: '', quantity: 1, unitPrice: '', isZeroTax: false }]);
      return;
    }
    setItems(prev => prev.filter(item => item.id !== rowId));
  };

  const handleProductSelect = (rowId: string, prod: Product) => {
    setItems(prev => prev.map(item => {
      if (item.id !== rowId) return item;
      return {
        ...item,
        productId: prod.id,
        unitPrice: prod.cost_price ? Number(prod.cost_price) : '',
        isZeroTax: !!prod.is_zero_tax
      };
    }));
    setActiveSearchRowId(null);
  };

  const handleUpdateItem = (rowId: string, field: keyof DraftPurchaseItem, value: any) => {
    setItems(prev => prev.map(item => {
      if (item.id !== rowId) return item;
      return { ...item, [field]: value };
    }));
  };

  // Calculations
  const calculatedItems = items.map(item => {
    const qty = typeof item.quantity === 'number' ? item.quantity : 0;
    const price = typeof item.unitPrice === 'number' ? item.unitPrice : 0;
    const lineSubtotal = qty * price;
    // Input GST calculation
    const gstRate = item.isZeroTax ? 0 : (taxRate / 100);
    const lineGst = lineSubtotal > 0 ? (lineSubtotal * gstRate) : 0;
    const lineTotal = lineSubtotal + lineGst;
    return {
      ...item,
      qty,
      price,
      lineSubtotal,
      lineGst,
      lineTotal
    };
  });

  const totalQuantity = calculatedItems.reduce((sum, i) => sum + i.qty, 0);
  const totalSubtotal = calculatedItems.reduce((sum, i) => sum + i.lineSubtotal, 0);
  const totalInputGst = calculatedItems.reduce((sum, i) => sum + i.lineGst, 0);
  const grandTotal = totalSubtotal + totalInputGst;

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

    const validLineItems = calculatedItems.filter(i => i.productId && i.qty > 0 && i.price > 0);
    if (validLineItems.length === 0) {
      showError('Please add at least 1 product with valid quantity and price (މަދުވެގެން 1 އައިޓަމް އަދަދާއި އަގު ޖައްސަވާ)');
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
        total: parseFloat(item.lineTotal.toFixed(2))
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
    setItems([{ id: crypto.randomUUID(), productId: '', quantity: 1, unitPrice: '', isZeroTax: false }]);
    setProductSearchQueries({});
    setActiveSearchRowId(null);
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
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in cursor-pointer"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          setIsPurchaseWindowMinimized(true);
        }
      }}
    >
      <div 
        className="w-full max-w-4xl max-h-[92vh] bg-card border border-border rounded-3xl shadow-2xl overflow-hidden flex flex-col font-faruma relative cursor-default" 
        dir="rtl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-border bg-muted/70 gap-4 shrink-0">
          <div className="flex items-center gap-2 shrink-0" dir="ltr">
            <Button 
              type="button" 
              variant="outline" 
              size="icon" 
              onClick={() => setIsPurchaseWindowMinimized(true)} 
              className="h-8 w-8 rounded-xl border border-border/80 bg-background hover:bg-amber-500/15 hover:border-amber-500/50 hover:text-amber-500 text-foreground shadow-sm transition-all active:scale-90"
              title="Minimize (ކުޑަކޮށްލާ)"
            >
              <Minus className="h-4 w-4 stroke-[2.5]" />
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              size="icon" 
              onClick={handleClose} 
              className="h-8 w-8 rounded-xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/25 text-red-500 shadow-sm transition-all active:scale-90"
              title="Close (ބަންދުކޮށްލާ)"
            >
              <X className="h-4 w-4 stroke-[2.5]" />
            </Button>
          </div>
          <div className="text-right flex-1 min-w-0">
            <h2 className="text-lg sm:text-xl font-black text-foreground flex items-center justify-end gap-2.5 truncate">
              <span>{t('record_local_purchase') || 'Local Purchase Bill'} (ލޯކަލް ޕަރޗޭސް ބިލް)</span> 
              <ShoppingBag className="h-5 w-5 text-primary shrink-0" />
            </h2>
            <p className="text-xs text-muted-foreground truncate">
              Select vendor, enter invoice items, auto-calculate GST, and automatically update product inventory stock.
            </p>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1 custom-scrollbar">
          {/* Bill Master Information Header */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/40 border border-border rounded-2xl">
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
                  <span>+ New Vendor</span>
                </Button>
                <Label className="text-xs font-black uppercase text-muted-foreground">
                  {t('select_vendor') || 'Vendor'}*
                </Label>
              </div>
              <Select value={vendorId} onValueChange={setVendorId}>
                <SelectTrigger className="w-full bg-background border-border text-right h-11 rounded-xl font-bold">
                  <SelectValue placeholder="Choose Vendor (ވެންޑަރ އިޚްތިޔާރުކުރޭ)" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border text-foreground !z-[110]">
                  <div className="p-2 sticky top-0 bg-card border-b border-border z-10">
                    <Input 
                      placeholder="Search vendors / ހޯއްދަވާ..." 
                      value={vendorSearchQuery}
                      onChange={(e) => setVendorSearchQuery(e.target.value)}
                      className="h-8 bg-muted border-border text-right text-xs"
                    />
                  </div>
                  <ScrollArea className="h-44">
                    {filteredVendors.map(v => (
                      <SelectItem key={v.id} value={v.id} className="text-right hover:bg-muted font-bold text-xs">
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
                className="bg-background border-border font-bold h-11 rounded-xl text-right font-mono"
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
                className="bg-background border-border font-bold h-11 rounded-xl text-right font-mono"
              />
            </div>
          </div>

          {/* Product Items Table Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddItemRow}
                className="h-8 px-3 text-xs font-black text-primary border-primary/30 hover:bg-primary/10 gap-1.5 rounded-xl transition-all"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Item (އައިޓަމެއް އިތުރުކުރޭ)</span>
              </Button>
              <h3 className="text-sm font-black text-foreground flex items-center gap-2">
                <span>Invoice Items (ބިލުގައިވާ ތަކެތި)</span>
                <Package className="h-4 w-4 text-primary" />
              </h3>
            </div>

            <div className="border border-border rounded-2xl overflow-hidden bg-card shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-muted/80 border-b border-border text-muted-foreground font-black uppercase tracking-wider">
                    <tr>
                      <th className="p-3 text-right">Product Item (ޕްރޮޑަކްޓް)</th>
                      <th className="p-3 text-center w-24">Current Stock</th>
                      <th className="p-3 text-center w-24">Invoice Qty*</th>
                      <th className="p-3 text-center w-28">Cost Price ({currency})*</th>
                      <th className="p-3 text-center w-28">Subtotal ({currency})</th>
                      <th className="p-3 text-center w-20">Zero Tax</th>
                      <th className="p-3 text-center w-12"></th>
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
                          ).slice(0, 15)
                        : products.slice(0, 15);

                      return (
                        <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                          {/* Product Selection */}
                          <td className="p-2.5 relative min-w-[220px]">
                            {selectedProd && !isSearching ? (
                              <div 
                                onClick={() => setActiveSearchRowId(item.id)}
                                className="flex items-center justify-between p-2 rounded-xl bg-muted/60 hover:bg-muted border border-border/80 cursor-pointer group"
                              >
                                <div className="text-right min-w-0 flex-1">
                                  <p className="font-black text-foreground truncate">{selectedProd.name_dv || selectedProd.name_en}</p>
                                  <p className="text-[10px] text-muted-foreground font-mono truncate">{selectedProd.name_en} {selectedProd.barcode ? `• ${selectedProd.barcode}` : ''}</p>
                                </div>
                                <span className="text-[9px] text-primary group-hover:underline font-bold mr-2">Change</span>
                              </div>
                            ) : (
                              <div className="relative">
                                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                  placeholder="Search product name, barcode..."
                                  value={query}
                                  onChange={(e) => {
                                    setProductSearchQueries(prev => ({ ...prev, [item.id]: e.target.value }));
                                    setActiveSearchRowId(item.id);
                                  }}
                                  onFocus={() => setActiveSearchRowId(item.id)}
                                  className="h-10 bg-background border-border text-right text-xs pr-9 rounded-xl font-bold font-faruma"
                                />
                                {isSearching && (
                                  <div className="absolute top-11 right-0 w-full z-50 bg-card border border-border rounded-2xl shadow-2xl p-1 max-h-48 overflow-y-auto">
                                    {matchingProducts.map(p => {
                                      const pStock = p.stock_shop || 0;
                                      return (
                                        <div
                                          key={p.id}
                                          onClick={() => handleProductSelect(item.id, p)}
                                          className="p-2 hover:bg-muted rounded-xl cursor-pointer text-right flex items-center justify-between gap-2 border-b border-border/30 last:border-none"
                                        >
                                          <div className="flex items-center gap-1.5">
                                            <span className={cn(
                                              "text-[9px] font-black px-1.5 py-0.5 rounded font-mono",
                                              pStock < 0 ? "bg-red-500/20 text-red-500" : "bg-muted text-muted-foreground"
                                            )}>
                                              Stock: {pStock}
                                            </span>
                                            {p.cost_price && (
                                              <span className="text-[9px] text-muted-foreground font-mono">
                                                Cost: {p.cost_price}
                                              </span>
                                            )}
                                          </div>
                                          <div className="min-w-0 text-right">
                                            <p className="font-black text-xs text-foreground truncate">{p.name_dv || p.name_en}</p>
                                            <p className="text-[10px] text-muted-foreground font-mono">{p.name_en}</p>
                                          </div>
                                        </div>
                                      );
                                    })}
                                    {matchingProducts.length === 0 && (
                                      <p className="text-center py-3 text-xs text-muted-foreground">No product found</p>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Current Stock Indicator */}
                          <td className="p-2.5 text-center">
                            {currentStock !== null ? (
                              <div className="flex flex-col items-center">
                                <span className={cn(
                                  "font-mono font-black text-xs px-2 py-0.5 rounded-lg",
                                  isNegativeStock ? "bg-red-500/20 text-red-500 border border-red-500/30 animate-pulse" : "bg-muted text-foreground"
                                )}>
                                  {currentStock}
                                </span>
                                {isNegativeStock && (
                                  <span className="text-[8px] font-black text-red-500 mt-0.5">
                                    Minus Stock
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-[10px]">-</span>
                            )}
                          </td>

                          {/* Invoice Quantity */}
                          <td className="p-2.5 text-center">
                            <Input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => handleUpdateItem(item.id, 'quantity', parseFloat(e.target.value) || '')}
                              onFocus={handleFocus}
                              className="h-10 bg-background border-border text-center font-black text-sm font-mono rounded-xl w-20 mx-auto"
                              placeholder="1"
                            />
                          </td>

                          {/* Unit Purchase Price */}
                          <td className="p-2.5 text-center">
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.unitPrice}
                              onChange={(e) => handleUpdateItem(item.id, 'unitPrice', parseFloat(e.target.value) || '')}
                              onFocus={handleFocus}
                              className="h-10 bg-background border-border text-center font-black text-sm font-mono rounded-xl w-24 mx-auto"
                              placeholder="0.00"
                            />
                          </td>

                          {/* Subtotal */}
                          <td className="p-2.5 text-center font-mono font-black text-xs text-foreground">
                            {currency} {(calculated?.lineSubtotal || 0).toFixed(2)}
                          </td>

                          {/* Zero Tax Toggle */}
                          <td className="p-2.5 text-center">
                            <input
                              type="checkbox"
                              checked={item.isZeroTax}
                              onChange={(e) => handleUpdateItem(item.id, 'isZeroTax', e.target.checked)}
                              className="h-4 w-4 rounded accent-primary cursor-pointer"
                              title="Check if this item is exempt from GST"
                            />
                          </td>

                          {/* Delete Row Button */}
                          <td className="p-2.5 text-center">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveItemRow(item.id)}
                              className="h-8 w-8 text-red-500 hover:bg-red-500/10 hover:text-red-600 rounded-lg"
                              title="Remove item"
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
            <div className="space-y-1.5 text-right">
              <Label className="text-xs font-black uppercase text-muted-foreground">
                Bill Notes / Description (އިތުރު ތަފްޞީލް)
              </Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional purchase details or payment reference..."
                className="bg-background border-border text-right h-11 rounded-xl font-bold"
              />
            </div>

            {/* Calculations Breakdown */}
            <div className="bg-muted/60 border border-border rounded-2xl p-4 space-y-2.5 text-right font-faruma">
              <div className="flex justify-between items-center text-xs text-muted-foreground font-bold">
                <span className="font-mono font-black text-foreground">{currency} {totalSubtotal.toFixed(2)}</span>
                <span>Subtotal ({totalQuantity} Items):</span>
              </div>
              <div className="flex justify-between items-center text-xs text-muted-foreground font-bold">
                <span className="font-mono font-black text-orange-500">
                  {currency} {totalInputGst.toFixed(2)} ({taxRate}% Input GST)
                </span>
                <span>Input GST (އިންޕުޓް ޓެކްސް):</span>
              </div>
              <div className="pt-2 border-t border-border flex justify-between items-center">
                <span className="text-xl font-black text-foreground font-mono">
                  {currency} {grandTotal.toFixed(2)}
                </span>
                <span className="text-sm font-black text-foreground">
                  Grand Total (ޖުމްލަ އަގު):
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-border bg-muted/70 flex flex-row gap-3 items-center justify-between shrink-0">
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
            className="flex-1 max-w-sm h-12 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs sm:text-sm shadow-xl shadow-primary/20 uppercase gap-2"
          >
            <Save className="h-4 w-4" />
            <span>{isSavingPurchase ? 'Saving & Updating Stock...' : 'Save Paid Bill & Update Stock (ބިލް ސޭވްކުރޭ)'}</span>
          </Button>
        </div>
      </div>

      {/* Quick Add Vendor Modal */}
      {isQuickAddVendorOpen && (
        <div 
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in"
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
