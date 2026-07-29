import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Minus, X, Maximize2, ShoppingBag } from 'lucide-react';
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
    description: ''
  });

  const [vendorSearchQuery, setVendorSearchQuery] = useState('');

  const filteredVendors = vendors.filter(v => 
    v.name_en?.toLowerCase().includes(vendorSearchQuery.toLowerCase()) || 
    v.name_dv?.toLowerCase().includes(vendorSearchQuery.toLowerCase())
  );

  const calculateGstFromTotal = (totalAmount: number) => {
    const taxRate = settings.shop.taxRate;
    const gstAmount = totalAmount - (totalAmount / (1 + (taxRate / 100)));
    return { gstAmount, subtotal: totalAmount - gstAmount };
  };

  const handleAddPurchase = async () => {
    if (!newPurchase.vendorId || !newPurchase.totalAmount) {
      showError(t('please_fill_required_fields') || 'Please fill required fields');
      return;
    }

    const vendor = vendors.find(v => v.id === newPurchase.vendorId);
    if (!vendor) return;

    const total = parseFloat(newPurchase.totalAmount);
    const { gstAmount, subtotal } = calculateGstFromTotal(total);

    const purchase: Purchase = {
      id: crypto.randomUUID(),
      vendorId: vendor.id,
      vendor: vendor.name_en, // Legacy field
      billNumber: newPurchase.billNumber,
      description: newPurchase.description,
      amount: subtotal,
      gstAmount: gstAmount,
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
    setNewPurchase({
      vendorId: '',
      billNumber: '',
      date: new Date().toISOString().split('T')[0],
      totalAmount: '',
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
            <span className="text-[9px] text-muted-foreground">{newPurchase.totalAmount ? `${settings.shop.currency} ${newPurchase.totalAmount}` : 'Draft'}</span>
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

          <div className="space-y-2 p-4 bg-primary/5 border border-primary/20 rounded-2xl">
            <Label className="text-right block text-xs font-black uppercase tracking-widest text-primary">{t('total_amount_incl_gst') || 'Total Amount (incl GST)'}*</Label>
            <div className="relative mt-2">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-black text-foreground/30" dir="ltr">{settings.shop.currency}</span>
              <Input 
                type="number" 
                value={newPurchase.totalAmount} 
                onChange={(e) => setNewPurchase({ ...newPurchase, totalAmount: e.target.value })} 
                className="text-right h-16 bg-transparent border-none outline-none focus-visible:ring-0 rounded-xl font-black text-3xl pl-16 px-2 shadow-none" 
                placeholder="0.00"
              />
            </div>
            <div className="h-px bg-primary/20 my-2" />
            {newPurchase.totalAmount ? (
              <div className="flex justify-between items-center px-1">
                <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest">
                  GST ({settings.shop.taxRate}%): {settings.shop.currency} {calculateGstFromTotal(parseFloat(newPurchase.totalAmount)).gstAmount.toFixed(2)}
                </span>
                <span className="text-[10px] text-foreground/30 uppercase tracking-widest">Auto-calculated</span>
              </div>
            ) : (
              <p className="text-[10px] text-foreground/30 uppercase tracking-widest text-center py-1">Enter total to calculate GST</p>
            )}
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
          <Button onClick={handleAddPurchase} className="flex-1 h-12 rounded-xl bg-primary hover:bg-primary/90 text-foreground font-black uppercase tracking-widest text-xs shadow-[0_0_20px_rgba(0,132,255,0.3)] hover:shadow-[0_0_30px_rgba(0,132,255,0.5)] transition-all">
            {t('save_purchase') || 'Save Purchase'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default LocalPurchaseWindow;
