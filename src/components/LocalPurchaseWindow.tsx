import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Minus, X, Maximize2, ShoppingBag, RotateCcw } from 'lucide-react';
import { useAppContext, Purchase } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { showSuccess, showError } from '@/utils/toast';

const LocalPurchaseWindow = () => {
  const { t } = useTranslation();
  const { 
    isPurchaseWindowOpen, 
    setIsPurchaseWindowOpen, 
    isPurchaseWindowMinimized, 
    setIsPurchaseWindowMinimized,
    vendors,
    addPurchase,
    settings
  } = useAppContext();

  const [newPurchase, setNewPurchase] = useState({
    vendorId: '',
    billNumber: '',
    date: new Date().toISOString().split('T')[0],
    totalAmount: '',
    gstAmount: '',
    zeroTaxAmount: '',
    description: ''
  });

  const [isCustomGst, setIsCustomGst] = useState(false);
  const [showZeroTaxInput, setShowZeroTaxInput] = useState(false);
  const [vendorSearchQuery, setVendorSearchQuery] = useState('');

  const filteredVendors = vendors.filter(v => 
    v.name_en?.toLowerCase().includes(vendorSearchQuery.toLowerCase()) || 
    v.name_dv?.toLowerCase().includes(vendorSearchQuery.toLowerCase())
  );

  const computeAutoGst = (totalVal: string, zeroTaxVal: string) => {
    const total = parseFloat(totalVal) || 0;
    const zeroTax = parseFloat(zeroTaxVal) || 0;
    const taxable = Math.max(0, total - zeroTax);
    const taxRate = settings.shop.taxRate || 8;
    const gst = taxable > 0 ? taxable - (taxable / (1 + (taxRate / 100))) : 0;
    return gst > 0 ? gst.toFixed(2) : '0.00';
  };

  const handleTotalChange = (val: string) => {
    setNewPurchase(prev => {
      const nextGst = isCustomGst ? prev.gstAmount : (val ? computeAutoGst(val, prev.zeroTaxAmount) : '');
      return { ...prev, totalAmount: val, gstAmount: nextGst };
    });
  };

  const handleZeroTaxChange = (val: string) => {
    setNewPurchase(prev => {
      const nextGst = isCustomGst ? prev.gstAmount : (prev.totalAmount ? computeAutoGst(prev.totalAmount, val) : '');
      return { ...prev, zeroTaxAmount: val, gstAmount: nextGst };
    });
  };

  const handleGstChange = (val: string) => {
    setIsCustomGst(true);
    setNewPurchase(prev => ({ ...prev, gstAmount: val }));
  };

  const resetToAutoGst = () => {
    setIsCustomGst(false);
    setNewPurchase(prev => ({
      ...prev,
      gstAmount: prev.totalAmount ? computeAutoGst(prev.totalAmount, prev.zeroTaxAmount) : ''
    }));
  };

  const totalNum = parseFloat(newPurchase.totalAmount) || 0;
  const gstNum = parseFloat(newPurchase.gstAmount) || 0;
  const subtotalNum = Math.max(0, totalNum - gstNum);

  const handleAddPurchase = async () => {
    if (!newPurchase.vendorId || !newPurchase.totalAmount) {
      showError(t('please_fill_required_fields') || 'Please fill required fields');
      return;
    }

    const vendor = vendors.find(v => v.id === newPurchase.vendorId);
    if (!vendor) return;

    const total = parseFloat(newPurchase.totalAmount);
    if (isNaN(total) || total <= 0) {
      showError(t('enter_valid_amount') || 'Please enter a valid total amount');
      return;
    }

    const gst = parseFloat(newPurchase.gstAmount) || 0;
    if (gst > total) {
      showError(t('gst_exceeds_total') || 'GST amount cannot exceed total bill amount');
      return;
    }

    const subtotal = Math.max(0, total - gst);

    const purchase: Purchase = {
      id: crypto.randomUUID(),
      vendorId: vendor.id,
      vendor: vendor.name_en, // Legacy field
      billNumber: newPurchase.billNumber,
      description: newPurchase.description,
      amount: parseFloat(subtotal.toFixed(2)),
      gstAmount: parseFloat(gst.toFixed(2)),
      date: newPurchase.date,
    };

    try {
      await addPurchase(purchase);
      showSuccess(t('purchase_added_successfully') || 'Purchase added successfully');
      handleClose();
    } catch (error) {
      console.error('Error adding purchase:', error);
      showError('Failed to save purchase');
    }
  };

  const handleClose = () => {
    setIsPurchaseWindowOpen(false);
    setIsPurchaseWindowMinimized(false);
    setIsCustomGst(false);
    setShowZeroTaxInput(false);
    setNewPurchase({
      vendorId: '',
      billNumber: '',
      date: new Date().toISOString().split('T')[0],
      totalAmount: '',
      gstAmount: '',
      zeroTaxAmount: '',
      description: ''
    });
  };

  if (!isPurchaseWindowOpen) return null;

  if (isPurchaseWindowMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-[100] flex items-center gap-3 bg-card/95 backdrop-blur-xl border border-primary/30 p-3 rounded-2xl shadow-2xl shadow-primary/20 animate-in slide-in-from-bottom-5">
        <div className="flex items-center gap-2 px-2 border-r border-border mr-1 pr-3">
          <ShoppingBag className="w-5 h-5 text-primary" />
          <div className="flex flex-col">
            <span className="text-xs font-black text-foreground uppercase tracking-widest">{t('record_local_purchase') || 'Record Purchase'}</span>
            <span className="text-[9px] text-muted-foreground">
              {newPurchase.totalAmount ? `${settings.shop.currency} ${newPurchase.totalAmount} (GST: ${newPurchase.gstAmount || '0.00'})` : 'Draft'}
            </span>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setIsPurchaseWindowMinimized(false)} className="h-8 w-8 rounded-full hover:bg-muted/80 text-foreground">
          <Maximize2 className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={handleClose} className="h-8 w-8 rounded-full hover:bg-red-500/20 text-red-500">
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-card border border-border rounded-3xl shadow-2xl overflow-hidden flex flex-col font-faruma" dir="rtl">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-border bg-muted relative">
          <div className="flex gap-2 absolute top-4 left-4" dir="ltr">
            <Button variant="ghost" size="icon" onClick={handleClose} className="h-8 w-8 rounded-full hover:bg-red-500/20 text-red-500">
              <X className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setIsPurchaseWindowMinimized(true)} className="h-8 w-8 rounded-full hover:bg-muted/80 text-foreground">
              <Minus className="h-4 w-4" />
            </Button>
          </div>
          <div className="text-right w-full pr-8">
            <h2 className="text-2xl font-black text-foreground flex items-center justify-end gap-3">
              {t('record_local_purchase') || 'Record Purchase'} <ShoppingBag className="h-6 w-6 text-primary" />
            </h2>
            <p className="text-sm text-muted-foreground">{t('record_purchase_description') || 'Enter local purchase bill details'}</p>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[65vh]">
          <div className="space-y-2">
            <Label className="text-right block text-xs font-black uppercase tracking-widest text-muted-foreground">{t('select_vendor') || 'Select Vendor'}*</Label>
            <Select value={newPurchase.vendorId} onValueChange={(val) => setNewPurchase({ ...newPurchase, vendorId: val })}>
              <SelectTrigger className="w-full bg-muted border-border text-right h-12 rounded-xl font-bold">
                <SelectValue placeholder="Choose Vendor" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border text-foreground !z-[110]">
                <div className="p-2 sticky top-0 bg-card border-b border-border z-10">
                  <Input 
                    placeholder="Search vendors..." 
                    value={vendorSearchQuery}
                    onChange={(e) => setVendorSearchQuery(e.target.value)}
                    className="h-9 bg-muted border-border text-right text-xs"
                  />
                </div>
                <ScrollArea className="h-40">
                  {filteredVendors.map(v => (
                    <SelectItem key={v.id} value={v.id} className="text-right hover:bg-muted">
                      {v.name_dv || v.name_en}
                    </SelectItem>
                  ))}
                </ScrollArea>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-right block text-xs font-black uppercase tracking-widest text-muted-foreground">{t('bill_number') || 'Bill Number'}</Label>
              <Input 
                value={newPurchase.billNumber} 
                onChange={(e) => setNewPurchase({ ...newPurchase, billNumber: e.target.value })} 
                className="text-right h-12 bg-muted border-border rounded-xl font-bold" 
              />
            </div>
            <div className="space-y-2">
              <Label className="text-right block text-xs font-black uppercase tracking-widest text-muted-foreground">{t('date') || 'Date'}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full text-right h-12 bg-muted border-border rounded-xl font-bold justify-between",
                      !newPurchase.date && "text-muted-foreground"
                    )}
                  >
                    {newPurchase.date ? format(new Date(newPurchase.date), "PPP") : <span>Pick a date</span>}
                    <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-[120]" align="start">
                  <Calendar
                    mode="single"
                    selected={newPurchase.date ? new Date(newPurchase.date) : undefined}
                    onSelect={(date) => {
                      if (date) {
                         const offset = date.getTimezoneOffset();
                         date = new Date(date.getTime() - (offset*60*1000));
                         setNewPurchase({ ...newPurchase, date: date.toISOString().split('T')[0] })
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Total Bill Amount Box */}
          <div className="space-y-2 p-4 bg-primary/5 border border-primary/20 rounded-2xl">
            <Label className="text-right block text-xs font-black uppercase tracking-widest text-primary">
              {t('total_amount_incl_gst') || 'Total Bill Amount (incl. GST)'}*
            </Label>
            <div className="relative mt-2">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-black text-foreground/40" dir="ltr">
                {settings.shop.currency}
              </span>
              <Input 
                type="number" 
                step="0.01"
                value={newPurchase.totalAmount} 
                onChange={(e) => handleTotalChange(e.target.value)} 
                className="text-right h-16 bg-transparent border-none outline-none focus-visible:ring-0 rounded-xl font-black text-3xl pl-16 px-2 shadow-none text-foreground" 
                placeholder="0.00"
              />
            </div>
          </div>

          {/* GST & Tax Breakdown Section */}
          <div className="p-4 bg-muted/40 border border-border rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isCustomGst ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={resetToAutoGst}
                    className="h-6 px-2 text-[10px] font-black text-primary hover:bg-primary/10 gap-1 rounded-md"
                  >
                    <RotateCcw className="h-3 w-3" />
                    {t('reset_to_auto') || 'Reset to Auto'}
                  </Button>
                ) : (
                  <span className="text-[10px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-md uppercase tracking-wider">
                    {t('auto_calculated') || 'Auto-calculated'}
                  </span>
                )}
              </div>
              <Label className="text-xs font-black uppercase tracking-widest text-foreground flex items-center gap-1">
                {t('gst_amount') || `GST Amount (${settings.shop.taxRate}%)`}
              </Label>
            </div>

            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground" dir="ltr">
                {settings.shop.currency}
              </span>
              <Input
                type="number"
                step="0.01"
                value={newPurchase.gstAmount}
                onChange={(e) => handleGstChange(e.target.value)}
                placeholder="0.00"
                className={cn(
                  "text-right h-11 bg-background border-border font-black text-lg pl-14 pr-3 rounded-xl transition-all",
                  isCustomGst ? "border-orange-500 text-orange-600 dark:text-orange-400 focus:border-orange-500" : "text-foreground"
                )}
              />
            </div>

            {/* Zero-Tax Helper Toggle */}
            <div className="pt-1">
              {!showZeroTaxInput ? (
                <button
                  type="button"
                  onClick={() => setShowZeroTaxInput(true)}
                  className="text-[11px] font-bold text-primary hover:underline flex items-center justify-end gap-1 w-full text-right"
                >
                  + {t('bill_has_zero_tax') || 'Bill contains Zero-Tax / Exempt items?'}
                </button>
              ) : (
                <div className="space-y-1.5 p-3 bg-background border border-border rounded-xl animate-in fade-in-50">
                  <div className="flex justify-between items-center">
                    <button
                      type="button"
                      onClick={() => {
                        setShowZeroTaxInput(false);
                        handleZeroTaxChange('');
                      }}
                      className="text-[10px] text-muted-foreground hover:text-red-500"
                    >
                      {t('remove') || 'Remove'}
                    </button>
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      {t('zero_tax_amount') || 'Zero-Tax Items Total (0% GST)'}
                    </Label>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground" dir="ltr">
                      {settings.shop.currency}
                    </span>
                    <Input
                      type="number"
                      step="0.01"
                      value={newPurchase.zeroTaxAmount}
                      onChange={(e) => handleZeroTaxChange(e.target.value)}
                      placeholder="0.00"
                      className="text-right h-10 bg-muted/30 border-border font-bold text-sm pl-14 pr-3 rounded-lg"
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground text-right">
                    GST is calculated only on the remaining taxable portion.
                  </p>
                </div>
              )}
            </div>

            {/* Live Calculation Summary */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border text-right">
              <div className="p-2.5 bg-background rounded-xl border border-border">
                <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block mb-0.5">
                  {t('subtotal_excl_gst') || 'Subtotal (Excl. GST)'}
                </span>
                <span className="text-sm font-black text-foreground">
                  {settings.shop.currency} {subtotalNum.toFixed(2)}
                </span>
              </div>
              <div className="p-2.5 bg-background rounded-xl border border-border">
                <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block mb-0.5">
                  {t('actual_gst') || 'Actual GST'}
                </span>
                <span className="text-sm font-black text-orange-600 dark:text-orange-400">
                  {settings.shop.currency} {gstNum.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-right block text-xs font-black uppercase tracking-widest text-muted-foreground">{t('description') || 'Description'}</Label>
            <Input 
              value={newPurchase.description} 
              onChange={(e) => setNewPurchase({ ...newPurchase, description: e.target.value })} 
              className="text-right h-12 bg-muted border-border rounded-xl font-bold" 
              placeholder="Optional notes..."
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-muted border-t border-border flex gap-3">
          <Button variant="ghost" onClick={handleClose} className="flex-1 h-12 rounded-xl font-black uppercase tracking-widest text-xs border border-border hover:bg-muted/80 hover:text-foreground">
            {t('cancel') || 'Cancel'}
          </Button>
          <Button onClick={handleAddPurchase} className="flex-1 h-12 rounded-xl bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest text-xs shadow-[0_0_20px_rgba(0,132,255,0.3)] hover:shadow-[0_0_30px_rgba(0,132,255,0.5)] transition-all">
            {t('save_purchase') || 'Save Purchase'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default LocalPurchaseWindow;
