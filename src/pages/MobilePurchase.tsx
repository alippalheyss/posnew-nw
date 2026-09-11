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
import { useAppContext, Purchase, Vendor } from '@/context/AppContext';
import { showSuccess, showError } from '@/utils/toast';
import { formatDate, toISODate } from '@/utils/formatters';
import { cn } from '@/lib/utils';

interface MobilePurchaseProps {
  embedded?: boolean;
}

const MobilePurchase: React.FC<MobilePurchaseProps> = ({ embedded = false }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { vendors, addPurchase, addVendor, purchases, settings } = useAppContext();

  const fileInputRef = useRef<HTMLInputElement>(null);

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
        items: []
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
    <div className={cn(embedded ? "h-full bg-background text-foreground font-faruma pb-8" : "min-h-screen bg-background text-foreground font-faruma pb-24 selection:bg-primary/30")} dir="rtl">
      {/* Mobile Top Header */}
      {!embedded ? (
        <div className="sticky top-0 z-40 bg-card/90 backdrop-blur-md border-b border-border px-4 py-3.5 flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
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
      ) : (
        <div className="max-w-2xl mx-auto px-4 pt-1 pb-2 flex items-center justify-between">
          <div className="text-right">
            <h2 className="text-base font-black text-foreground flex items-center gap-2">
              <Receipt className="h-5 w-5 text-primary" />
              <span>ބިލް އެޅުން (Purchase Bill)</span>
            </h2>
            <p className="text-xs text-muted-foreground">Capture paper invoices, compute 8% GST & update stock costs</p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsNewVendorOpen(true)}
            className="h-9 px-3 rounded-xl border-primary/30 bg-primary/10 text-primary text-xs font-black gap-1.5 hover:bg-primary/20"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>+ Add Vendor</span>
          </Button>
        </div>
      )}

      <div className={cn(embedded ? "max-w-2xl mx-auto p-4 space-y-4" : "max-w-md mx-auto p-4 space-y-4")}>
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

      {/* Quick Add Vendor Dialog */}
      <Dialog open={isNewVendorOpen} onOpenChange={setIsNewVendorOpen}>
        <DialogContent className="sm:max-w-[380px] font-faruma bg-card border-border text-foreground" dir="rtl">
          <DialogHeader className="text-right">
            <DialogTitle className="text-lg font-black flex items-center justify-end gap-2">
              <span>އާ ވެންޑަރެއް އިތުރުކުރުން</span>
              <Building2 className="h-5 w-5 text-primary" />
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2 text-right">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-muted-foreground">Vendor Name (ސަޕްލަޔަރުގެ ނަން)*</Label>
              <Input
                value={newVendorName}
                onChange={(e) => setNewVendorName(e.target.value)}
                placeholder="e.g. Lotus, Lily, Seagull"
                className="h-10 bg-muted border-border text-right font-bold text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-muted-foreground">Phone Number (ފޯނު ނަންބަރު)</Label>
              <Input
                value={newVendorPhone}
                onChange={(e) => setNewVendorPhone(e.target.value)}
                placeholder="7xxxxxx"
                className="h-10 bg-muted border-border text-right font-mono text-xs"
              />
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button variant="ghost" onClick={() => setIsNewVendorOpen(false)} className="flex-1 h-10 text-xs font-bold">
              Cancel
            </Button>
            <Button onClick={handleQuickAddVendor} className="flex-1 h-10 bg-primary text-xs font-black">
              Save Vendor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Full Size Image Preview Modal */}
      <Dialog open={isPreviewModalOpen} onOpenChange={setIsPreviewModalOpen}>
        <DialogContent className="sm:max-w-[480px] bg-card border-border p-2" dir="rtl">
          <div className="p-2">
            <div className="flex justify-between items-center mb-2">
              <Button variant="ghost" size="icon" onClick={() => setIsPreviewModalOpen(false)} className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
              <span className="text-xs font-bold text-foreground">Attached Bill Photo</span>
            </div>
            {billImage && (
              <img 
                src={billImage} 
                alt="Full Bill" 
                className="w-full max-h-[75vh] object-contain rounded-xl border border-border"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MobilePurchase;
