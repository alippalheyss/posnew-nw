"use client";

import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Camera, 
  Upload, 
  Calendar as CalendarIcon, 
  DollarSign, 
  Building2, 
  Receipt, 
  FileText, 
  Check, 
  X, 
  Plus, 
  Trash2, 
  Sparkles, 
  Percent, 
  Search,
  Eye,
  History,
  RotateCcw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useAppContext, Purchase, Vendor, Product } from '@/context/AppContext';
import { isProductZeroTax } from '@/components/LocalPurchaseWindow';
import { showSuccess, showError } from '@/utils/toast';
import { formatDate, toISODate } from '@/utils/formatters';
import { cn } from '@/lib/utils';

const MobilePurchase: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { vendors, addPurchase, addVendor, purchases, settings, products } = useAppContext();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const mobileQtyRef = useRef<HTMLInputElement>(null);
  const mobileCostRef = useRef<HTMLInputElement>(null);
  const mobileSubtotalRef = useRef<HTMLInputElement>(null);

  // Form State
  const [vendorId, setVendorId] = useState('');
  const [vendorSearch, setVendorSearch] = useState('');
  const [isVendorDropdownOpen, setIsVendorDropdownOpen] = useState(false);
  const [billNumber, setBillNumber] = useState('');
  const [date, setDate] = useState<string>(toISODate());
  const [totalAmount, setTotalAmount] = useState('');
  const [hasZeroTax, setHasZeroTax] = useState(false);
  const [zeroTaxAmount, setZeroTaxAmount] = useState('');
  const [isCustomGst, setIsCustomGst] = useState(false);
  const [customGstAmount, setCustomGstAmount] = useState('');
  const [description, setDescription] = useState('');
  const [billImage, setBillImage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Product line items (simple)
  interface MobileItem { id: string; productId: string; productName: string; qty: number; unitCost: number; subtotal: number; isZeroTax: boolean; }
  const [mobileItems, setMobileItems] = useState<MobileItem[]>([]);
  const [isMobileCatalogOpen, setIsMobileCatalogOpen] = useState(false);
  const [mobileCatalogSearch, setMobileCatalogSearch] = useState('');
  const [mobileQuickProd, setMobileQuickProd] = useState<Product | null>(null);
  const [mobileQty, setMobileQty] = useState('1');
  const [mobileCost, setMobileCost] = useState('');
  const [mobileSubtotal, setMobileSubtotal] = useState('');

  // Quick New Vendor Dialog
  const [isNewVendorOpen, setIsNewVendorOpen] = useState(false);
  const [newVendorName, setNewVendorName] = useState('');
  const [newVendorPhone, setNewVendorPhone] = useState('');

  // Image preview modal
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  const taxRate = settings?.shop?.taxRate || 8;
  const currency = settings?.shop?.currency || 'MVR';

  // Computed GST
  const parsedTotal = parseFloat(totalAmount) || 0;
  const parsedZeroTax = hasZeroTax ? (parseFloat(zeroTaxAmount) || 0) : 0;
  const taxableAmount = Math.max(0, parsedTotal - parsedZeroTax);
  
  const computedGst = taxableAmount > 0 
    ? (taxableAmount - (taxableAmount / (1 + (taxRate / 100)))).toFixed(2)
    : '0.00';

  const effectiveGst = isCustomGst ? (parseFloat(customGstAmount) || 0).toFixed(2) : computedGst;
  const netSubtotal = Math.max(0, parsedTotal - parseFloat(effectiveGst)).toFixed(2);

  // Filtered vendors
  const filteredVendors = vendors.filter(v => 
    v.name_en?.toLowerCase().includes(vendorSearch.toLowerCase()) ||
    v.name_dv?.toLowerCase().includes(vendorSearch.toLowerCase()) ||
    v.code?.toLowerCase().includes(vendorSearch.toLowerCase())
  );

  const selectedVendor = vendors.find(v => v.id === vendorId);

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

  const handleAddProductMobile = (prod: Product) => {
    const cost = prod.cost_price ? Number(prod.cost_price).toFixed(2) : '';
    setMobileQuickProd(prod);
    setMobileQty('1');
    setMobileCost(cost);
    setMobileSubtotal(cost !== '' ? parseFloat((1 * Number(cost)).toFixed(2)).toString() : '');
    setIsMobileCatalogOpen(false);
    setTimeout(() => mobileQtyRef.current?.focus(), 80);
  };

  const handleConfirmMobileEntry = () => {
    if (!mobileQuickProd) return;
    const qty = parseFloat(mobileQty) || 1;
    const unitCost = parseFloat(mobileCost) || 0;
    const subtotal = parseFloat(mobileSubtotal) || parseFloat((qty * unitCost).toFixed(2));
    const item: MobileItem = {
      id: crypto.randomUUID(),
      productId: mobileQuickProd.id,
      productName: mobileQuickProd.name_dv || mobileQuickProd.name_en,
      qty, unitCost, subtotal,
      isZeroTax: isProductZeroTax(mobileQuickProd)
    };
    setMobileItems(prev => [...prev, item]);
    // Auto update total amount from items
    const newTotal = [...mobileItems, item].reduce((s, i) => s + i.subtotal, 0);
    setTotalAmount(newTotal.toFixed(2));
    showSuccess(`Added ${item.productName} x${qty}`);
    setMobileQuickProd(null);
    setIsMobileCatalogOpen(true);
  };

  const filteredMobileCatalog = products.filter(p =>
    !mobileCatalogSearch ||
    p.name_en.toLowerCase().includes(mobileCatalogSearch.toLowerCase()) ||
    p.name_dv.toLowerCase().includes(mobileCatalogSearch.toLowerCase()) ||
    p.barcode.includes(mobileCatalogSearch) ||
    p.item_code.toLowerCase().includes(mobileCatalogSearch.toLowerCase())
  ).slice(0, 50);

  const handleQuickAddVendor = async () => {
    if (!newVendorName.trim()) {
      showError('Please enter a vendor name');
      return;
    }

    const newV: Vendor = {
      id: crypto.randomUUID(),
      code: `V-${Date.now().toString().slice(-4)}`,
      name_en: newVendorName.trim(),
      name_dv: newVendorName.trim(),
      phone: newVendorPhone.trim(),
      email: '',
      contact_person: '',
      tin_number: '',
      address: '',
      notes: 'Added from Mobile Purchase'
    };

    try {
      await addVendor(newV);
      setVendorId(newV.id);
      setIsNewVendorOpen(false);
      setNewVendorName('');
      setNewVendorPhone('');
      showSuccess(`Vendor "${newV.name_en}" created & selected`);
    } catch (err) {
      console.error(err);
      showError('Failed to create vendor');
    }
  };

  const handleSave = async () => {
    if (!vendorId) {
      showError('Please select a vendor');
      return;
    }

    if (!billNumber.trim()) {
      showError('Please enter a bill / invoice number');
      return;
    }

    if (parsedTotal <= 0) {
      showError('Please enter a valid bill total amount');
      return;
    }

    const finalGst = parseFloat(effectiveGst) || 0;
    if (finalGst > parsedTotal) {
      showError('GST amount cannot exceed total bill amount');
      return;
    }

    setIsSaving(true);
    try {
      const netSubtotalNum = Math.max(0, parsedTotal - finalGst);
      const purchaseData: Purchase = {
        id: crypto.randomUUID(),
        date: date,
        vendorId: vendorId,
        vendor: selectedVendor?.name_en || selectedVendor?.name_dv || '',
        vendorName: selectedVendor?.name_en || selectedVendor?.name_dv || '',
        billNumber: billNumber.trim(),
        amount: parseFloat(netSubtotalNum.toFixed(2)),
        gstAmount: parseFloat(finalGst.toFixed(2)),
        description: `${description ? description + ' | ' : ''}${hasZeroTax ? `[0% GST: ${currency} ${parsedZeroTax.toFixed(2)}]` : ''}${billImage ? ' [Receipt Photo Attached]' : ''}`,
      items: mobileItems.map(i => ({
          product_id: i.productId,
          product_name: i.productName,
          quantity: i.qty,
          unit_price: i.unitCost,
          subtotal: i.subtotal,
          gst_amount: i.isZeroTax ? 0 : parseFloat((i.subtotal * (taxRate / 100)).toFixed(2)),
          total: i.isZeroTax ? i.subtotal : parseFloat((i.subtotal * (1 + taxRate / 100)).toFixed(2)),
          is_zero_tax: i.isZeroTax
        }))
      };

      await addPurchase(purchaseData);
      showSuccess('Purchase bill recorded successfully! 🎉');

      // Reset form
      setBillNumber('');
      setTotalAmount('');
      setHasZeroTax(false);
      setZeroTaxAmount('');
      setIsCustomGst(false);
      setCustomGstAmount('');
      setDescription('');
      setBillImage(null);
      setMobileItems([]);
    } catch (error) {
      console.error('Failed to save mobile purchase:', error);
      showError('Failed to record purchase');
    } finally {
      setIsSaving(false);
    }
  };

  // Recent 5 purchases
  const recentPurchases = [...purchases]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  return (
    <div className="min-h-screen bg-background text-foreground font-faruma pb-24 selection:bg-primary/30" dir="rtl">
      {/* Mobile Top Header */}
      <div className="sticky top-0 z-40 bg-card/90 backdrop-blur-md border-b border-border px-4 py-3.5 flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/gst-reports')}
          className="h-9 w-9 rounded-xl hover:bg-muted"
        >
          <ArrowLeft className="h-5 w-5 rtl:rotate-180" />
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
        {/* Camera Receipt Attachment Banner */}
        <div className="bg-card border border-border rounded-2xl p-3.5 space-y-2.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">
              {billImage ? 'Receipt Photo Attached' : 'Attach photo of paper invoice'}
            </span>
            <Label className="text-xs font-black uppercase text-foreground flex items-center gap-1.5">
              <span>ބިލުގެ ފޮޓޯ</span>
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
              className="w-full h-12 rounded-xl border-dashed border-primary/40 bg-primary/5 hover:bg-primary/10 text-primary font-bold text-xs gap-2"
            >
              <Camera className="h-4 w-4" />
              <span>Take Photo / Upload Bill (ކެމެރާ އިން ފޮޓޯ ނަގާ)</span>
            </Button>
          )}
        </div>

        {/* Vendor Selector */}
        <div className="bg-card border border-border rounded-2xl p-4 space-y-2.5 shadow-sm">
          <Label className="text-xs font-black uppercase text-foreground block text-right">
            <span>ސަޕްލަޔަރު / ވެންޑަރ (Vendor)*</span>
          </Label>

          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
            <Input
              value={selectedVendor ? (selectedVendor.name_dv || selectedVendor.name_en) : vendorSearch}
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
                    ? "bg-primary text-primary-foreground border-primary"
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
                    <span className="text-[10px] text-muted-foreground font-mono">{v.code}</span>
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

          {/* Bill Total Amount */}
          <div className="space-y-1 text-right pt-1">
            <Label className="text-xs font-black uppercase text-primary block">
              <span>ޖުމްލަ އަގު (Total Bill Amount - {currency})*</span>
            </Label>
            <Input
              type="number"
              step="0.01"
              inputMode="decimal"
              value={totalAmount}
              onChange={(e) => setTotalAmount(e.target.value)}
              placeholder="0.00"
              className="h-13 bg-muted/80 border-primary/40 focus:border-primary rounded-xl text-right font-mono font-black text-xl text-primary"
            />
          </div>
        </div>

        {/* Zero-Tax Items Toggle */}
        <div className="bg-card border border-border rounded-2xl p-4 space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <Switch
              checked={hasZeroTax}
              onCheckedChange={(checked) => {
                setHasZeroTax(checked);
                if (!checked) setZeroTaxAmount('');
              }}
            />
            <div className="text-right">
              <span className="text-xs font-black text-foreground block">ޒީރޯ ޓެކްސް މުދާ ހިމެނޭ (Zero-Tax Items)</span>
              <span className="text-[10px] text-muted-foreground">Some grocery items don't charge 8% GST</span>
            </div>
          </div>

          {hasZeroTax && (
            <div className="space-y-1 text-right pt-2 border-t border-border animate-in fade-in-50 duration-150">
              <Label className="text-xs font-black uppercase text-orange-500 block">
                <span>0% GST މުދަލުގެ އަގު (Zero-Tax Total - {currency})*</span>
              </Label>
              <Input
                type="number"
                step="0.01"
                inputMode="decimal"
                value={zeroTaxAmount}
                onChange={(e) => setZeroTaxAmount(e.target.value)}
                placeholder="0.00"
                className="h-11 bg-orange-500/10 border-orange-500/30 rounded-xl text-right font-mono font-bold text-sm text-orange-500"
              />
            </div>
          )}
        </div>

        {/* Tax Summary Calculation Card */}
        {parsedTotal > 0 && (
          <Card className="bg-primary/10 border-primary/30 rounded-2xl shadow-sm overflow-hidden animate-in fade-in-50">
            <CardContent className="p-4 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-mono font-bold text-foreground">{currency} {parsedTotal.toFixed(2)}</span>
                <span className="font-bold text-muted-foreground">Total Bill (ޖުމްލަ):</span>
              </div>

              {hasZeroTax && parsedZeroTax > 0 && (
                <div className="flex justify-between items-center text-xs text-orange-500">
                  <span className="font-mono font-bold">{currency} {parsedZeroTax.toFixed(2)}</span>
                  <span className="font-bold">0% Tax Items:</span>
                </div>
              )}

              <div className="flex justify-between items-center text-xs">
                <span className="font-mono font-bold text-foreground">{currency} {taxableAmount.toFixed(2)}</span>
                <span className="font-bold text-muted-foreground">Taxable ({taxRate}% GST Subject):</span>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="font-mono font-bold text-muted-foreground">{currency} {netSubtotal}</span>
                <span className="font-bold text-muted-foreground">Net (Excl. GST):</span>
              </div>

              <div className="pt-2 border-t border-primary/20 flex justify-between items-center">
                <div className="text-left font-mono">
                  <span className="text-lg font-black text-primary block">
                    {currency} {effectiveGst}
                  </span>
                </div>
                <div className="text-right">
                  <Badge variant="outline" className="bg-primary/20 text-primary border-primary/40 text-[10px] font-black uppercase">
                    GST Amount ({taxRate}%)
                  </Badge>
                </div>
              </div>

              <div className="pt-1 flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsCustomGst(!isCustomGst)}
                  className="text-[10px] text-muted-foreground hover:text-primary font-bold underline"
                >
                  {isCustomGst ? 'Use Auto GST' : 'Override / Custom GST Amount'}
                </button>
              </div>

              {isCustomGst && (
                <div className="pt-2">
                  <Input
                    type="number"
                    step="0.01"
                    value={customGstAmount}
                    onChange={(e) => setCustomGstAmount(e.target.value)}
                    placeholder="Enter exact GST from paper bill"
                    className="h-9 bg-background text-right font-mono text-xs"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Product Items Section */}
        <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <button
              type="button"
              onClick={() => setIsMobileCatalogOpen(true)}
              className="h-9 px-3.5 text-xs font-black text-primary border border-primary/30 bg-primary/10 hover:bg-primary/20 rounded-xl flex items-center gap-1.5 transition-all"
            >
              <Plus className="h-4 w-4" />
              Browse Products
            </button>
            <h3 className="text-xs font-black uppercase text-foreground flex items-center gap-1.5">
              <span>ތަކެތި (Items)</span>
            </h3>
          </div>

          {mobileItems.length === 0 ? (
            <div className="py-6 text-center text-muted-foreground text-xs">
              <p className="font-bold">No items added yet</p>
              <p>Browse products above to add line items</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {mobileItems.map((item, idx) => (
                <div key={item.id} className="flex items-center justify-between p-3 text-right">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setMobileItems(prev => prev.filter(i => i.id !== item.id));
                        const newTotal = mobileItems.filter(i => i.id !== item.id).reduce((s, i) => s + i.subtotal, 0);
                        setTotalAmount(newTotal > 0 ? newTotal.toFixed(2) : '');
                      }}
                      className="h-7 w-7 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 flex items-center justify-center"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    <span className={cn('text-[9px] font-black px-1.5 py-0.5 rounded-full border', item.isZeroTax ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-blue-500/10 text-blue-500 border-blue-500/20')}>
                      {item.isZeroTax ? '0%' : `${taxRate}%`}
                    </span>
                  </div>
                  <div className="text-right min-w-0 flex-1 mx-3">
                    <p className="text-xs font-black text-foreground line-clamp-1">{item.productName}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">{item.qty} × {currency} {item.unitCost.toFixed(2)}</p>
                  </div>
                  <span className="font-mono font-black text-sm text-primary shrink-0">{currency} {item.subtotal.toFixed(2)}</span>
                </div>
              ))}
              <div className="flex items-center justify-between p-3 bg-muted/40">
                <span className="font-mono font-black text-sm text-primary">{currency} {mobileItems.reduce((s, i) => s + i.subtotal, 0).toFixed(2)}</span>
                <span className="text-xs font-black text-foreground">Items Subtotal</span>
              </div>
            </div>
          )}
        </div>

        {/* Description / Notes */}
        <div className="bg-card border border-border rounded-2xl p-4 space-y-2 shadow-sm text-right">
          <Label className="text-xs font-black uppercase text-foreground block">
            <span>ނޯޓް / ތަފްޞީލް (Notes / Description)</span>
          </Label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Male' cargo shipment naalu, drinks & snacks"
            className="h-10 bg-muted border-border rounded-xl text-right font-bold text-xs"
          />
        </div>

        {/* Save Button */}
        <Button
          type="button"
          disabled={isSaving}
          onClick={handleSave}
          className="w-full h-14 bg-primary hover:bg-primary/90 text-primary-foreground font-black text-base uppercase tracking-wider rounded-2xl shadow-xl shadow-primary/30 active:scale-[0.99] transition-all"
        >
          <Check className="h-5 w-5 mr-2" />
          <span>{isSaving ? 'ރައްކާކުރަނީ...' : 'Save Purchase Bill (ބިލް ރައްކާކުރޭ)'}</span>
        </Button>

        {/* Recent Mobile Entries */}
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

      {/* Mobile Product Catalog Modal */}
      {isMobileCatalogOpen && (
        <div
          className="fixed inset-0 z-[150] flex flex-col bg-background text-foreground font-faruma"
          dir="rtl"
        >
          <div className="sticky top-0 bg-card border-b border-border p-4 flex items-center gap-3">
            <button type="button" onClick={() => setIsMobileCatalogOpen(false)} className="h-9 w-9 rounded-xl bg-muted border border-border flex items-center justify-center text-muted-foreground">
              <X className="h-4 w-4" />
            </button>
            <div className="flex-1 relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={mobileCatalogSearch}
                onChange={(e) => setMobileCatalogSearch(e.target.value)}
                placeholder="Search product name, barcode..."
                className="w-full h-10 bg-muted border border-border rounded-xl pr-9 pl-3 text-right text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary"
                autoFocus
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {filteredMobileCatalog.map(prod => {
              const pStock = Number(prod.stock_shop) || 0;
              const isZero = isProductZeroTax(prod);
              return (
                <button
                  key={prod.id}
                  type="button"
                  onClick={() => handleAddProductMobile(prod)}
                  className="w-full flex items-center justify-between p-3.5 bg-card border border-border rounded-2xl hover:border-primary/40 hover:bg-primary/5 text-right transition-all active:scale-[0.98]"
                >
                  <div className="flex items-center gap-2 text-left">
                    <span className={cn('text-[10px] font-black px-2 py-0.5 rounded-lg font-mono', pStock < 0 ? 'bg-red-500/20 text-red-500' : 'bg-muted text-muted-foreground border border-border')}>
                      {pStock}
                    </span>
                    {isZero && <span className="text-[9px] font-black text-amber-500 bg-amber-500/15 px-1.5 py-0.5 rounded">0% Tax</span>}
                  </div>
                  <div className="min-w-0 flex-1 text-right mx-3">
                    <p className="font-black text-sm text-foreground line-clamp-1">{prod.name_dv || prod.name_en}</p>
                    <p className="text-[10px] text-muted-foreground font-mono line-clamp-1">{prod.name_en}</p>
                  </div>
                  <span className="font-mono font-black text-primary shrink-0 text-sm">{currency} {prod.cost_price ? Number(prod.cost_price).toFixed(2) : '—'}</span>
                </button>
              );
            })}
            {filteredMobileCatalog.length === 0 && (
              <div className="text-center py-12 text-muted-foreground"><p className="font-bold text-sm">No products found</p></div>
            )}
          </div>
        </div>
      )}

      {/* Mobile Quick Entry Dialog */}
      {mobileQuickProd && (
        <div className="fixed inset-0 z-[160] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-sm bg-card border border-primary/30 rounded-3xl p-6 shadow-2xl space-y-4 font-faruma" dir="rtl">
            <div className="text-right">
              <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">Quick Entry</p>
              <p className="font-black text-base text-foreground line-clamp-2">{mobileQuickProd.name_dv || mobileQuickProd.name_en}</p>
              {isProductZeroTax(mobileQuickProd) && (
                <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/10 text-amber-500 border border-amber-500/20">0% GST</span>
              )}
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] font-black uppercase text-muted-foreground block text-right">Quantity*</label>
                <input ref={mobileQtyRef} type="number" min="0.01" step="any" value={mobileQty} inputMode="decimal"
                  onChange={(e) => { setMobileQty(e.target.value); const q = parseFloat(e.target.value)||0; const c = parseFloat(mobileCost)||0; if(q>0&&c>0) setMobileSubtotal((q*c).toFixed(2)); }}
                  onFocus={(e) => e.target.select()}
                  onKeyDown={(e) => { if(e.key==='Enter'){e.preventDefault(); mobileCostRef.current?.focus();} }}
                  className="w-full h-14 bg-muted border border-border text-center font-black text-2xl font-mono rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary" placeholder="1" autoFocus />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-black uppercase text-muted-foreground block text-right">Unit Cost ({currency})</label>
                <input ref={mobileCostRef} type="number" min="0" step="0.01" value={mobileCost} inputMode="decimal"
                  onChange={(e) => { setMobileCost(e.target.value); const q=parseFloat(mobileQty)||0; const c=parseFloat(e.target.value)||0; if(q>0&&c>0) setMobileSubtotal((q*c).toFixed(2)); }}
                  onFocus={(e) => e.target.select()}
                  onKeyDown={(e) => { if(e.key==='Enter'){e.preventDefault(); mobileSubtotalRef.current?.focus();} }}
                  className="w-full h-14 bg-muted border border-border text-center font-black text-2xl font-mono rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary" placeholder="0.00" />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-black uppercase text-muted-foreground block text-right">Subtotal ({currency})</label>
                <input ref={mobileSubtotalRef} type="number" min="0" step="0.01" value={mobileSubtotal} inputMode="decimal"
                  onChange={(e) => { setMobileSubtotal(e.target.value); const q=parseFloat(mobileQty)||0; const s=parseFloat(e.target.value)||0; if(q>0&&s>0) setMobileCost((s/q).toFixed(4)); }}
                  onFocus={(e) => e.target.select()}
                  onKeyDown={(e) => { if(e.key==='Enter'){e.preventDefault(); handleConfirmMobileEntry();} }}
                  className="w-full h-14 bg-primary/10 border-2 border-primary/40 text-center font-black text-2xl font-mono rounded-2xl text-primary focus:outline-none focus:ring-2 focus:ring-primary" placeholder="0.00" />
                <p className="text-[10px] text-muted-foreground text-center">Enter on Subtotal to confirm</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button type="button" onClick={() => { setMobileQuickProd(null); setIsMobileCatalogOpen(true); }}
                className="flex-1 h-12 rounded-2xl border border-border bg-muted text-foreground font-bold text-xs">← Back</button>
              <button type="button" onClick={handleConfirmMobileEntry} disabled={!mobileQty || parseFloat(mobileQty) <= 0}
                className="flex-1 h-12 rounded-2xl bg-primary text-primary-foreground font-black text-sm flex items-center justify-center gap-2 shadow-lg disabled:opacity-50">
                <Check className="h-4 w-4" /> Add to Bill
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Add Vendor Dialog */}
      <Dialog open={isNewVendorOpen} onOpenChange={setIsNewVendorOpen}>
        <DialogContent className="sm:max-w-[380px] font-faruma apple-glass-dialog border-white/20 dark:border-white/10 text-foreground p-6 sm:p-7 shadow-2xl rounded-3xl" dir="rtl">
          <DialogHeader className="text-right pb-2 border-b border-white/10 dark:border-white/5">
            <DialogTitle className="text-lg font-black flex items-center justify-end gap-2 text-foreground">
              <span>އާ ވެންޑަރެއް އިތުރުކުރުން</span>
              <Building2 className="h-5 w-5 text-primary" />
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3.5 py-3 text-right">
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
          </div>

          <DialogFooter className="flex flex-row gap-2.5 pt-3 border-t border-white/10 dark:border-white/5">
            <Button variant="outline" onClick={() => setIsNewVendorOpen(false)} className="flex-1 h-11 text-xs font-bold rounded-2xl border-white/20 dark:border-white/10 hover:bg-white/10 active:scale-[0.98] transition-all">
              Cancel
            </Button>
            <Button onClick={handleQuickAddVendor} className="flex-1 h-11 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-black rounded-2xl shadow-lg shadow-primary/25 active:scale-[0.98] transition-all">
              Save Vendor
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
