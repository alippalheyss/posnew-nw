"use client";

import React, { useState, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Camera, 
  Building2, 
  Receipt, 
  Check, 
  X, 
  Plus, 
  Trash2, 
  Search,
  Eye,
  History,
  RotateCcw,
  Tag,
  Package
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useAppContext, Purchase, Vendor, Product, PurchaseItem } from '@/context/AppContext';
import { isProductZeroTax } from '@/components/LocalPurchaseWindow';
import { showSuccess, showError } from '@/utils/toast';
import { formatDate, toISODate } from '@/utils/formatters';
import { cn } from '@/lib/utils';

interface MobileItem {
  id: string;
  productId: string;
  productNameDv: string;
  productNameEn: string;
  itemCode?: string;
  barcode?: string;
  qty: number;
  unitCost: number;
  subtotal: number;
  isZeroTax: boolean;
}

const MobilePurchase: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { vendors, addPurchase, addVendor, purchases, settings, products } = useAppContext();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const mobileQtyRef = useRef<HTMLInputElement>(null);
  const mobileCostRef = useRef<HTMLInputElement>(null);
  const mobileSubtotalRef = useRef<HTMLInputElement>(null);

  // Form State matching LocalPurchaseWindow
  const [vendorId, setVendorId] = useState('');
  const [vendorSearch, setVendorSearch] = useState('');
  const [isVendorDropdownOpen, setIsVendorDropdownOpen] = useState(false);
  const [billNumber, setBillNumber] = useState('');
  const [date, setDate] = useState<string>(toISODate());
  const [description, setDescription] = useState('');
  const [billImage, setBillImage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Product Line Items State
  const [mobileItems, setMobileItems] = useState<MobileItem[]>([]);
  const [isMobileCatalogOpen, setIsMobileCatalogOpen] = useState(false);
  const [mobileCatalogSearch, setMobileCatalogSearch] = useState('');
  const [catalogSelectedCategory, setCatalogSelectedCategory] = useState('all');

  // Quick Product Entry Dialog
  const [mobileQuickProd, setMobileQuickProd] = useState<Product | null>(null);
  const [mobileQty, setMobileQty] = useState('1');
  const [mobileCost, setMobileCost] = useState('');
  const [mobileSubtotal, setMobileSubtotal] = useState('');

  // Quick New Vendor Dialog (with TIN Number)
  const [isNewVendorOpen, setIsNewVendorOpen] = useState(false);
  const [newVendorName, setNewVendorName] = useState('');
  const [newVendorPhone, setNewVendorPhone] = useState('');
  const [newVendorTin, setNewVendorTin] = useState('');
  const [isAddingVendor, setIsAddingVendor] = useState(false);

  // Full Image Preview Modal
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  const taxRate = settings?.shop?.taxRate || 8;
  const currency = settings?.shop?.currency || 'MVR';

  // Available product categories
  const categories = useMemo(() => {
    const cats = new Set<string>();
    products.forEach(p => {
      if (p.category) cats.add(p.category);
    });
    return ['all', ...Array.from(cats)];
  }, [products]);

  // Selected vendor
  const selectedVendor = vendors.find(v => v.id === vendorId);

  // Filtered vendors for search
  const filteredVendors = vendors.filter(v => 
    v.name_en?.toLowerCase().includes(vendorSearch.toLowerCase()) ||
    v.name_dv?.toLowerCase().includes(vendorSearch.toLowerCase()) ||
    v.code?.toLowerCase().includes(vendorSearch.toLowerCase()) ||
    v.tin_number?.toLowerCase().includes(vendorSearch.toLowerCase())
  );

  // Filtered catalog products by search and category
  const filteredMobileCatalog = useMemo(() => {
    const q = mobileCatalogSearch.trim().toLowerCase();
    return products.filter(p => {
      const matchesSearch = !q ||
        p.name_en?.toLowerCase().includes(q) ||
        p.name_dv?.toLowerCase().includes(q) ||
        p.barcode?.includes(q) ||
        p.item_code?.toLowerCase().includes(q);
      const matchesCat = catalogSelectedCategory === 'all' || p.category === catalogSelectedCategory;
      return matchesSearch && matchesCat;
    }).slice(0, 60);
  }, [products, mobileCatalogSearch, catalogSelectedCategory]);

  // Financial Calculations strictly from Line Items (same as LocalPurchaseWindow)
  const totalSubtotal = useMemo(() => {
    return mobileItems.reduce((sum, item) => sum + item.subtotal, 0);
  }, [mobileItems]);

  const zeroTaxTotal = useMemo(() => {
    return mobileItems.filter(i => i.isZeroTax).reduce((sum, item) => sum + item.subtotal, 0);
  }, [mobileItems]);

  const taxableSubtotal = useMemo(() => {
    return mobileItems.filter(i => !i.isZeroTax).reduce((sum, item) => sum + item.subtotal, 0);
  }, [mobileItems]);

  const totalInputGst = useMemo(() => {
    return taxableSubtotal * (taxRate / 100);
  }, [taxableSubtotal, taxRate]);

  const grandTotal = useMemo(() => {
    return totalSubtotal + totalInputGst;
  }, [totalSubtotal, totalInputGst]);

  // Handle Photo Capture with Canvas Compression
  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxDim = 1000;

          if (width > height) {
            if (width > maxDim) {
              height *= maxDim / width;
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width *= maxDim / height;
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.7);
          setBillImage(compressed);
          showSuccess('Bill photo captured & attached');
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  // Open Quick Entry Dialog for a chosen product
  const handleSelectProduct = (prod: Product) => {
    const cost = prod.cost_price ? Number(prod.cost_price).toFixed(2) : '';
    setMobileQuickProd(prod);
    setMobileQty('1');
    setMobileCost(cost);
    setMobileSubtotal(cost !== '' ? parseFloat((1 * Number(cost)).toFixed(2)).toString() : '');
    setIsMobileCatalogOpen(false);
    setTimeout(() => mobileCostRef.current?.focus(), 80);
  };

  // Bidirectional calculations on quick entry inputs
  const handleQtyChange = (val: string) => {
    setMobileQty(val);
    const qNum = parseFloat(val) || 0;
    const cNum = parseFloat(mobileCost) || 0;
    if (qNum > 0 && cNum > 0) {
      setMobileSubtotal((qNum * cNum).toFixed(2));
    }
  };

  const handleCostChange = (val: string) => {
    setMobileCost(val);
    const cNum = parseFloat(val) || 0;
    const qNum = parseFloat(mobileQty) || 1;
    if (cNum >= 0 && qNum > 0) {
      setMobileSubtotal((qNum * cNum).toFixed(2));
    }
  };

  const handleSubtotalChange = (val: string) => {
    setMobileSubtotal(val);
    const sNum = parseFloat(val) || 0;
    const qNum = parseFloat(mobileQty) || 1;
    if (sNum >= 0 && qNum > 0) {
      setMobileCost((sNum / qNum).toFixed(4).replace(/\.?0+$/, ''));
    }
  };

  // Confirm Quick Entry Item into Bill
  const handleConfirmMobileEntry = () => {
    if (!mobileQuickProd) return;
    const qty = parseFloat(mobileQty) || 1;
    const unitCost = parseFloat(mobileCost) || 0;
    const subtotal = parseFloat(mobileSubtotal) || parseFloat((qty * unitCost).toFixed(2));

    const item: MobileItem = {
      id: crypto.randomUUID(),
      productId: mobileQuickProd.id,
      productNameDv: mobileQuickProd.name_dv || mobileQuickProd.name_en,
      productNameEn: mobileQuickProd.name_en || mobileQuickProd.name_dv,
      itemCode: mobileQuickProd.item_code,
      barcode: mobileQuickProd.barcode,
      qty,
      unitCost,
      subtotal,
      isZeroTax: isProductZeroTax(mobileQuickProd)
    };

    setMobileItems(prev => [...prev, item]);
    showSuccess(`Added ${item.productNameDv} x${qty}`);
    setMobileQuickProd(null);
  };

  // Quick Add Vendor (with TIN support for MIRA compliance)
  const handleQuickAddVendor = async () => {
    if (!newVendorName.trim()) {
      showError('Please enter a vendor name');
      return;
    }

    setIsAddingVendor(true);
    const newV: Vendor = {
      id: crypto.randomUUID(),
      code: `V-${Date.now().toString().slice(-4)}`,
      name_en: newVendorName.trim(),
      name_dv: newVendorName.trim(),
      phone: newVendorPhone.trim(),
      email: '',
      contact_person: '',
      tin_number: newVendorTin.trim(),
      address: '',
      notes: 'Added from Mobile Purchase'
    };

    try {
      await addVendor(newV);
      setVendorId(newV.id);
      setIsNewVendorOpen(false);
      setNewVendorName('');
      setNewVendorPhone('');
      setNewVendorTin('');
      showSuccess(`Vendor "${newV.name_en}" created & selected`);
    } catch (err) {
      console.error(err);
      showError('Failed to create vendor');
    } finally {
      setIsAddingVendor(false);
    }
  };

  // Save Purchase Bill to Supabase / AppContext
  const handleSave = async () => {
    if (!vendorId) {
      showError('Please select a vendor (ސަޕްލަޔަރު ޚިޔާރުކުރައްވާ)');
      return;
    }

    if (!billNumber.trim()) {
      showError('Please enter bill / invoice number (ބިލް ނަންބަރު ލިޔުއްވާ)');
      return;
    }

    if (mobileItems.length === 0) {
      showError('Please add at least 1 product item (މަދުވެގެން 1 އައިޓަމް އަޅުއްވާ)');
      return;
    }

    setIsSaving(true);
    try {
      const purchaseItemsPayload: PurchaseItem[] = mobileItems.map(item => ({
        product_id: item.productId,
        product_name: item.productNameDv,
        quantity: item.qty,
        unit_price: item.unitCost,
        subtotal: parseFloat(item.subtotal.toFixed(2)),
        gst_amount: item.isZeroTax ? 0 : parseFloat((item.subtotal * (taxRate / 100)).toFixed(2)),
        total: item.isZeroTax ? parseFloat(item.subtotal.toFixed(2)) : parseFloat((item.subtotal * (1 + taxRate / 100)).toFixed(2)),
        is_zero_tax: item.isZeroTax
      }));

      const purchaseData: Purchase = {
        id: crypto.randomUUID(),
        date: date,
        vendorId: vendorId,
        vendor: selectedVendor?.name_en || selectedVendor?.name_dv || '',
        vendorName: selectedVendor?.name_en || selectedVendor?.name_dv || '',
        billNumber: billNumber.trim(),
        description: description.trim() || `Mobile purchase bill #${billNumber.trim()} with ${mobileItems.length} items`,
        amount: parseFloat(totalSubtotal.toFixed(2)),
        gstAmount: parseFloat(totalInputGst.toFixed(2)),
        items: purchaseItemsPayload,
        subtotal: parseFloat(totalSubtotal.toFixed(2))
      };

      await addPurchase(purchaseData);
      showSuccess('Purchase bill recorded successfully! 🎉');

      // Reset form
      setBillNumber('');
      setDescription('');
      setBillImage(null);
      setMobileItems([]);
      setVendorId('');
      setVendorSearch('');
    } catch (error) {
      console.error('Failed to save mobile purchase:', error);
      showError('Failed to record purchase');
    } finally {
      setIsSaving(false);
    }
  };

  // Recent purchases
  const recentPurchases = [...purchases]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  return (
    <div className="min-h-screen bg-background text-foreground font-faruma pb-24" dir="rtl">
      {/* Top Header */}
      <div className="sticky top-0 z-40 bg-card/90 backdrop-blur-md border-b border-border px-4 py-3 flex items-center justify-between shadow-xs">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/purchases')}
          className="h-9 w-9 rounded-xl hover:bg-muted text-foreground"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>

        <div className="text-center">
          <h1 className="text-base font-black flex items-center justify-center gap-1.5 text-foreground">
            <span>ބިލް އެޅުން (Purchase Bill)</span>
            <Receipt className="h-4 w-4 text-primary" />
          </h1>
          <p className="text-[10px] text-muted-foreground font-sans">Mobile Bill Entry Portal</p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsNewVendorOpen(true)}
          className="h-8 px-2.5 rounded-xl border-primary/30 bg-primary/10 text-primary text-[10px] font-black gap-1"
        >
          <Plus className="h-3 w-3" />
          <span>Vendor</span>
        </Button>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-4">
        {/* Camera / Receipt Photo Attachment */}
        <div className="bg-card border border-border rounded-2xl p-3.5 space-y-2.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">
              {billImage ? 'Receipt Photo Attached' : 'Attach photo of paper invoice'}
            </span>
            <Label className="text-xs font-black uppercase text-foreground flex items-center gap-1.5">
              <span>ބިލުގެ ފޮޓޯ (Bill Photo)</span>
              <Camera className="h-3.5 w-3.5 text-primary" />
            </Label>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhotoCapture}
            className="hidden"
          />

          {billImage ? (
            <div className="relative rounded-xl overflow-hidden border border-primary/30 bg-muted/30 p-2 flex items-center justify-between">
              <div 
                className="flex items-center gap-2.5 cursor-pointer"
                onClick={() => setIsPreviewModalOpen(true)}
              >
                <img 
                  src={billImage} 
                  alt="Receipt Preview" 
                  className="w-14 h-14 object-cover rounded-lg border border-border"
                />
                <div className="text-right">
                  <span className="text-xs font-bold text-foreground block">Paper Bill Captured</span>
                  <span className="text-[10px] text-primary flex items-center gap-1">
                    <Eye className="h-3 w-3" /> View full photo
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-8 px-2 text-xs font-bold text-muted-foreground hover:text-foreground"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setBillImage(null)}
                  className="h-8 px-2 text-xs font-bold text-red-500 hover:bg-red-500/10"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-11 rounded-xl border-dashed border-primary/40 bg-primary/5 hover:bg-primary/10 text-primary font-bold text-xs gap-2"
            >
              <Camera className="h-4 w-4" />
              <span>Take Photo / Upload Bill (ކެމެރާ އިން ފޮޓޯ ނަގާ)</span>
            </Button>
          )}
        </div>

        {/* Vendor Selector */}
        <div className="bg-card border border-border rounded-2xl p-4 space-y-2.5 shadow-sm">
          <div className="flex items-center justify-between">
            {selectedVendor?.tin_number && (
              <Badge variant="outline" className="text-[10px] font-mono px-2 py-0.5 rounded-md border-primary/30 text-primary">
                TIN: {selectedVendor.tin_number}
              </Badge>
            )}
            <Label className="text-xs font-black uppercase text-foreground block text-right">
              <span>ސަޕްލަޔަރު / ވެންޑަރ (Vendor)*</span>
            </Label>
          </div>

          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
            <Input
              value={selectedVendor ? `${selectedVendor.name_dv} (${selectedVendor.name_en})` : vendorSearch}
              onChange={(e) => {
                setVendorSearch(e.target.value);
                setVendorId('');
                setIsVendorDropdownOpen(true);
              }}
              onFocus={() => setIsVendorDropdownOpen(true)}
              placeholder="Search or pick vendor..."
              className="h-11 bg-muted border-border rounded-xl pr-9 text-right font-bold text-xs"
            />
            {vendorId && (
              <button
                type="button"
                onClick={() => { setVendorId(''); setVendorSearch(''); }}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Quick Vendor Pills */}
          <div className="flex flex-wrap gap-1.5 justify-end">
            {vendors.slice(0, 5).map(v => (
              <button
                key={v.id}
                type="button"
                onClick={() => {
                  setVendorId(v.id);
                  setVendorSearch('');
                  setIsVendorDropdownOpen(false);
                }}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all",
                  vendorId === v.id
                    ? "bg-primary text-primary-foreground border-primary shadow-xs"
                    : "bg-muted text-muted-foreground border-border hover:border-primary/40"
                )}
              >
                {v.name_dv || v.name_en}
              </button>
            ))}
          </div>

          {/* Search Dropdown list */}
          {isVendorDropdownOpen && !vendorId && (
            <div className="max-h-48 overflow-y-auto border border-border bg-card rounded-xl shadow-xl divide-y divide-border z-30">
              {filteredVendors.length > 0 ? (
                filteredVendors.map(v => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => {
                      setVendorId(v.id);
                      setVendorSearch('');
                      setIsVendorDropdownOpen(false);
                    }}
                    className="w-full text-right p-2.5 hover:bg-muted/80 text-xs font-bold transition-colors flex items-center justify-between"
                  >
                    <div className="flex items-center gap-1.5">
                      {v.tin_number && <span className="text-[9px] font-mono text-primary font-bold">TIN: {v.tin_number}</span>}
                      <span className="text-[10px] text-muted-foreground font-mono">{v.code}</span>
                    </div>
                    <span>{v.name_dv} ({v.name_en})</span>
                  </button>
                ))
              ) : (
                <div className="p-3 text-center text-xs text-muted-foreground">
                  No vendor found. Tap "+ Vendor" above to add.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bill Number & Date */}
        <div className="bg-card border border-border rounded-2xl p-4 space-y-3 shadow-sm">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1 text-right">
              <Label className="text-xs font-black uppercase text-foreground block">
                <span>ބިލް ނަންބަރު (Bill No)*</span>
              </Label>
              <Input
                value={billNumber}
                onChange={(e) => setBillNumber(e.target.value)}
                placeholder="INV-1234"
                className="h-11 bg-muted border-border rounded-xl text-right font-mono font-bold text-xs"
              />
            </div>

            <div className="space-y-1 text-right">
              <Label className="text-xs font-black uppercase text-foreground block">
                <span>ތާރީޚް (Date)*</span>
              </Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-11 bg-muted border-border rounded-xl text-right font-mono font-bold text-xs"
              />
            </div>
          </div>
        </div>

        {/* Product Items Section (Source of Truth, matching LocalPurchaseWindow) */}
        <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <Button
              type="button"
              size="sm"
              onClick={() => setIsMobileCatalogOpen(true)}
              className="h-9 px-3.5 text-xs font-black bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="h-4 w-4" />
              <span>Browse Catalog</span>
            </Button>
            <h3 className="text-xs font-black uppercase text-foreground flex items-center gap-1.5">
              <span>ތަކެތި (Line Items)</span>
              <Package className="h-4 w-4 text-primary" />
            </h3>
          </div>

          {mobileItems.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-xs space-y-2">
              <Package className="h-8 w-8 mx-auto opacity-30 text-primary" />
              <p className="font-bold">No products added yet</p>
              <p className="text-[11px]">Tap "Browse Catalog" to add purchase products</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {mobileItems.map((item) => (
                <div key={item.id} className="p-3.5 space-y-2 hover:bg-muted/30 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setMobileItems(prev => prev.filter(i => i.id !== item.id))}
                      className="h-7 w-7 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 flex items-center justify-center shrink-0"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>

                    <div className="flex-1 text-right min-w-0 pr-1">
                      <div className="flex items-center justify-end gap-1.5">
                        <span className={cn(
                          'text-[9px] font-black px-1.5 py-0.5 rounded-md border shrink-0',
                          item.isZeroTax 
                            ? 'bg-amber-500/10 text-amber-500 border-amber-500/30' 
                            : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                        )}>
                          {item.isZeroTax ? '0% GST' : `${taxRate}% GST`}
                        </span>
                        <p className="text-xs font-black text-foreground truncate font-faruma" dir="rtl">{item.productNameDv}</p>
                      </div>
                      <p className="text-[10px] text-muted-foreground font-sans truncate mt-0.5">{item.productNameEn}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs bg-muted/40 p-2 rounded-xl font-mono">
                    <span className="font-black text-primary text-sm">
                      {currency} {item.subtotal.toFixed(2)}
                    </span>
                    <span className="text-muted-foreground text-[11px]">
                      {item.qty} pcs × {currency} {item.unitCost.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Financial Calculation Summary (strictly matching LocalPurchaseWindow) */}
        {mobileItems.length > 0 && (
          <Card className="bg-primary/10 border-primary/30 rounded-2xl shadow-sm overflow-hidden animate-in fade-in-50">
            <CardContent className="p-4 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-mono font-bold text-foreground">{currency} {totalSubtotal.toFixed(2)}</span>
                <span className="font-bold text-muted-foreground">Subtotal (Excl. GST):</span>
              </div>

              {zeroTaxTotal > 0 && (
                <div className="flex justify-between items-center text-xs text-amber-500">
                  <span className="font-mono font-bold">{currency} {zeroTaxTotal.toFixed(2)}</span>
                  <span className="font-bold">0% Zero-Tax Items:</span>
                </div>
              )}

              <div className="flex justify-between items-center text-xs">
                <span className="font-mono font-bold text-foreground">{currency} {totalInputGst.toFixed(2)}</span>
                <span className="font-bold text-muted-foreground">Input GST ({taxRate}%):</span>
              </div>

              <div className="pt-2 border-t border-primary/20 flex justify-between items-center">
                <div className="text-left font-mono">
                  <span className="text-xl font-black text-primary block">
                    {currency} {grandTotal.toFixed(2)}
                  </span>
                </div>
                <div className="text-right">
                  <Badge variant="outline" className="bg-primary/20 text-primary border-primary/40 text-[10px] font-black uppercase">
                    Grand Total (Inc. GST)
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Description / Notes */}
        <div className="bg-card border border-border rounded-2xl p-4 space-y-2 shadow-sm text-right">
          <Label className="text-xs font-black uppercase text-foreground block">
            <span>ނޯޓް / ތަފްޞީލް (Notes / Description)</span>
          </Label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Male' cargo shipment naalu, drinks & snacks"
            className="h-11 bg-muted border-border rounded-xl text-right font-bold text-xs"
          />
        </div>

        {/* Save Button */}
        <Button
          type="button"
          disabled={isSaving || mobileItems.length === 0}
          onClick={handleSave}
          className="w-full h-14 bg-primary hover:bg-primary/90 text-primary-foreground font-black text-base uppercase tracking-wider rounded-2xl shadow-xl shadow-primary/30 active:scale-[0.99] transition-all disabled:opacity-50"
        >
          <Check className="h-5 w-5 mr-2" />
          <span>{isSaving ? 'ރައްކާކުރަނީ...' : `Save Purchase Bill (${currency} ${grandTotal.toFixed(2)})`}</span>
        </Button>

        {/* Recent Purchases List */}
        {recentPurchases.length > 0 && (
          <div className="pt-4 space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] text-muted-foreground font-mono">Last {recentPurchases.length} entries</span>
              <h3 className="text-xs font-black uppercase text-muted-foreground flex items-center gap-1">
                <span>ފަހުގެ ބިލްތައް</span>
                <History className="h-3.5 w-3.5" />
              </h3>
            </div>

            <div className="space-y-2">
              {recentPurchases.map(p => (
                <div key={p.id} className="bg-card border border-border rounded-xl p-3 flex items-center justify-between text-right">
                  <div className="text-left font-mono">
                    <span className="text-xs font-black text-primary block">
                      {currency} {(Number(p.amount || 0) + Number(p.gstAmount || 0)).toFixed(2)}
                    </span>
                    <span className="text-[9px] text-muted-foreground block">
                      GST: {currency} {Number(p.gstAmount || 0).toFixed(2)}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-bold text-foreground block">
                      {p.vendorName || p.vendor || 'Vendor'}
                    </span>
                    <div className="flex items-center gap-1.5 justify-end text-[10px] text-muted-foreground">
                      <Badge variant="outline" className="text-[9px] font-mono px-1 py-0 h-4">
                        {p.billNumber}
                      </Badge>
                      <span>{formatDate(p.date)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Mobile Product Catalog Picker Modal with Category Tabs */}
      {isMobileCatalogOpen && (
        <div
          className="fixed inset-0 z-[150] flex flex-col bg-background text-foreground font-faruma"
          dir="rtl"
        >
          <div className="sticky top-0 bg-card border-b border-border p-3.5 space-y-2.5 shadow-xs">
            <div className="flex items-center gap-2.5">
              <button 
                type="button" 
                onClick={() => setIsMobileCatalogOpen(false)} 
                className="h-9 w-9 rounded-xl bg-muted border border-border flex items-center justify-center text-muted-foreground shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={mobileCatalogSearch}
                  onChange={(e) => setMobileCatalogSearch(e.target.value)}
                  placeholder="Search barcode, code, name..."
                  autoFocus
                  className="h-10 bg-muted border-border rounded-xl pr-9 text-right font-bold text-xs"
                />
              </div>
            </div>

            {/* Category Filter Pills (matching LocalPurchaseWindow) */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              {categories.map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCatalogSelectedCategory(cat)}
                  className={cn(
                    "px-3 py-1 rounded-xl text-[11px] font-black uppercase whitespace-nowrap transition-all border",
                    catalogSelectedCategory === cat
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted text-muted-foreground border-border hover:border-primary/40"
                  )}
                >
                  {cat === 'all' ? 'All Items' : cat}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 divide-y divide-border">
            {filteredMobileCatalog.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-xs">
                No products found matching "{mobileCatalogSearch}"
              </div>
            ) : (
              filteredMobileCatalog.map(prod => (
                <div
                  key={prod.id}
                  onClick={() => handleSelectProduct(prod)}
                  className="p-3 text-right hover:bg-muted/50 cursor-pointer transition-colors flex items-center justify-between gap-3 active:bg-primary/10"
                >
                  <div className="text-left font-mono shrink-0">
                    <span className="text-xs font-black text-primary block">
                      {currency} {Number(prod.cost_price || 0).toFixed(2)}
                    </span>
                    <span className="text-[10px] text-muted-foreground block">
                      Sell: {currency} {Number(prod.price || 0).toFixed(2)}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0 pr-1">
                    <div className="flex items-center justify-end gap-1.5">
                      {isProductZeroTax(prod) && (
                        <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/30 text-[9px] px-1 py-0 rounded">
                          0% GST
                        </Badge>
                      )}
                      <p className="text-xs font-black text-foreground truncate font-faruma" dir="rtl">{prod.name_dv}</p>
                    </div>
                    <p className="text-[10px] text-muted-foreground font-sans truncate mt-0.5">{prod.name_en}</p>
                    <div className="flex items-center justify-end gap-2 text-[10px] text-muted-foreground font-mono mt-0.5">
                      {prod.barcode && <span>{prod.barcode}</span>}
                      {prod.item_code && <span>#{prod.item_code}</span>}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Quick Entry Dialog when a product is picked from catalog */}
      {mobileQuickProd && (
        <div className="fixed inset-0 z-[160] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-3 font-faruma" dir="rtl">
          <div className="bg-card border border-border rounded-3xl p-5 w-full max-w-sm space-y-4 shadow-2xl animate-in slide-in-from-bottom-5">
            <div className="flex items-start justify-between border-b border-border pb-3">
              <button 
                type="button" 
                onClick={() => setMobileQuickProd(null)} 
                className="h-8 w-8 rounded-xl bg-muted flex items-center justify-center text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="text-right flex-1 min-w-0 pr-2">
                <div className="flex items-center justify-end gap-1.5">
                  {isProductZeroTax(mobileQuickProd) && (
                    <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/30 text-[9px] px-1.5 py-0 rounded">
                      0% GST
                    </Badge>
                  )}
                  <h3 className="font-black text-sm text-foreground truncate font-faruma" dir="rtl">{mobileQuickProd.name_dv}</h3>
                </div>
                <p className="text-xs text-muted-foreground font-sans truncate">{mobileQuickProd.name_en}</p>
              </div>
            </div>

            <div className="space-y-3">
              {/* Quantity */}
              <div className="space-y-1 text-right">
                <Label className="text-xs font-black uppercase text-foreground">Quantity (އަދަދު)*</Label>
                <Input
                  ref={mobileQtyRef}
                  type="number"
                  step="1"
                  min="1"
                  inputMode="numeric"
                  value={mobileQty}
                  onChange={(e) => handleQtyChange(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  className="h-12 bg-muted text-center font-black text-xl font-mono rounded-xl"
                />
              </div>

              {/* Unit Cost & Subtotal (Bidirectional Auto-Calculation) */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1 text-right">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground">Unit Cost (ގަތް އަގު - {currency})</Label>
                  <Input
                    ref={mobileCostRef}
                    type="number"
                    step="0.01"
                    inputMode="decimal"
                    value={mobileCost}
                    onChange={(e) => handleCostChange(e.target.value)}
                    onFocus={(e) => e.target.select()}
                    className="h-11 bg-muted text-right font-black font-mono text-sm rounded-xl"
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-1 text-right">
                  <Label className="text-[10px] font-black uppercase text-primary font-bold">Subtotal (ޖުމްލަ - {currency})*</Label>
                  <Input
                    ref={mobileSubtotalRef}
                    type="number"
                    step="0.01"
                    inputMode="decimal"
                    value={mobileSubtotal}
                    onChange={(e) => handleSubtotalChange(e.target.value)}
                    onFocus={(e) => e.target.select()}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleConfirmMobileEntry();
                      }
                    }}
                    className="h-11 bg-primary/10 border-primary/40 text-right font-black font-mono text-sm text-primary rounded-xl"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2.5 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setMobileQuickProd(null)}
                className="flex-1 h-11 rounded-xl text-xs font-bold"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleConfirmMobileEntry}
                disabled={!mobileQty || parseFloat(mobileQty) <= 0}
                className="flex-1 h-11 bg-primary text-primary-foreground font-black text-xs rounded-xl shadow-md gap-1.5"
              >
                <Check className="h-4 w-4" />
                <span>Add to Bill</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Add Vendor Dialog (now with Supplier TIN Number!) */}
      <Dialog open={isNewVendorOpen} onOpenChange={setIsNewVendorOpen}>
        <DialogContent className="sm:max-w-[380px] font-faruma apple-glass-dialog border-white/20 dark:border-white/10 text-foreground p-6 sm:p-7 shadow-2xl rounded-3xl" dir="rtl">
          <DialogHeader className="text-right pb-2 border-b border-white/10 dark:border-white/5">
            <DialogTitle className="text-lg font-black flex items-center justify-end gap-2 text-foreground">
              <span>އާ ވެންޑަރެއް އިތުރުކުރުން</span>
              <Building2 className="h-5 w-5 text-primary" />
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-3 text-right">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Vendor Name (ސަޕްލަޔަރުގެ ނަން)*</Label>
              <Input
                value={newVendorName}
                onChange={(e) => setNewVendorName(e.target.value)}
                placeholder="e.g. Lotus, Lily, Seagull"
                className="h-11 apple-glass-input text-right font-bold text-xs rounded-2xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Phone Number (ފޯނު ނަންބަރު)</Label>
              <Input
                value={newVendorPhone}
                onChange={(e) => setNewVendorPhone(e.target.value)}
                placeholder="7xxxxxx"
                className="h-11 apple-glass-input text-right font-mono text-xs rounded-2xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Supplier TIN (ޓިން ނަންބަރު)</Label>
              <Input
                value={newVendorTin}
                onChange={(e) => setNewVendorTin(e.target.value)}
                placeholder="100xxxxGSTxxx"
                className="h-11 apple-glass-input text-right font-mono text-xs rounded-2xl"
              />
            </div>
          </div>

          <DialogFooter className="flex flex-row gap-2.5 pt-3 border-t border-white/10 dark:border-white/5">
            <Button 
              variant="outline" 
              onClick={() => setIsNewVendorOpen(false)} 
              className="flex-1 h-11 text-xs font-bold rounded-2xl border-white/20 dark:border-white/10 hover:bg-white/10"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleQuickAddVendor} 
              disabled={isAddingVendor || !newVendorName.trim()}
              className="flex-1 h-11 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-black rounded-2xl shadow-lg shadow-primary/25"
            >
              {isAddingVendor ? 'Saving...' : 'Save Vendor'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Full Size Image Preview Modal */}
      <Dialog open={isPreviewModalOpen} onOpenChange={setIsPreviewModalOpen}>
        <DialogContent className="sm:max-w-[480px] apple-glass-dialog border-white/20 dark:border-white/10 p-4 rounded-3xl shadow-2xl" dir="rtl">
          <div className="p-2">
            <div className="flex justify-between items-center mb-3">
              <Button variant="ghost" size="icon" onClick={() => setIsPreviewModalOpen(false)} className="h-8 w-8 rounded-full hover:bg-white/10">
                <X className="h-4 w-4" />
              </Button>
              <span className="text-xs font-black text-foreground">Attached Bill Photo</span>
            </div>
            {billImage && (
              <img 
                src={billImage} 
                alt="Full Bill" 
                className="w-full max-h-[75vh] object-contain rounded-2xl border border-white/20 dark:border-white/10 shadow-lg"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MobilePurchase;
