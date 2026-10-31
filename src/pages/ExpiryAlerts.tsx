"use client";

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAppContext, Product } from '@/context/AppContext';
import { format, isPast, parseISO, addDays } from 'date-fns';
import { 
  AlertCircle, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Calendar, 
  ShieldAlert, 
  Flame, 
  Edit, 
  Trash2, 
  Package, 
  Check, 
  X, 
  DollarSign,
  TrendingDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import ExpiryUpdateDialog from '@/components/ExpiryUpdateDialog';
import { NearExpiryBroadcastDialog } from '@/components/NearExpiryBroadcastDialog';
import { showSuccess, showError } from '@/utils/toast';

const ExpiryAlerts = () => {
  const { t } = useTranslation();
  const { products, customers, settings, updateProduct, updateStock, addExpense } = useAppContext();
  const today = new Date();
  const thirtyDaysFromNow = addDays(today, 30);
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const [isBroadcastDialogOpen, setIsBroadcastDialogOpen] = useState(false);

  // --- Fix Expiry Date Modal State ---
  const [fixingProduct, setFixingProduct] = useState<Product | null>(null);
  const [fixExpiryDate, setFixExpiryDate] = useState<string>('');
  const [isFixDialogOpen, setIsFixDialogOpen] = useState(false);
  const [isSavingExpiry, setIsSavingExpiry] = useState(false);

  // --- Record as Loss Modal State ---
  const [lossProduct, setLossProduct] = useState<Product | null>(null);
  const [lossLocation, setLossLocation] = useState<'shop' | 'godown'>('shop');
  const [lossQty, setLossQty] = useState<number>(1);
  const [lossNotes, setLossNotes] = useState<string>('');
  const [recordAsExpense, setRecordAsExpense] = useState<boolean>(true);
  const [isLossDialogOpen, setIsLossDialogOpen] = useState(false);
  const [isSubmittingLoss, setIsSubmittingLoss] = useState(false);

  const expiringProducts = products.filter(product => {
    if (!product.expiry_date) return false;
    const expiryDate = parseISO(product.expiry_date);
    return isPast(expiryDate) || (expiryDate <= thirtyDaysFromNow);
  }).sort((a, b) => {
    if (!a.expiry_date || !b.expiry_date) return 0;
    return parseISO(a.expiry_date).getTime() - parseISO(b.expiry_date).getTime();
  });

  const nearExpiryCount = expiringProducts.filter(p => {
    if (!p.expiry_date) return false;
    const exp = parseISO(p.expiry_date);
    return !isPast(exp) && exp <= thirtyDaysFromNow;
  }).length;

  const renderBoth = (key: string, options?: any) => (
    <>
      {t(key, options)} ({t(key, { ...options, lng: 'en' })})
    </>
  );

  // Handle open Fix Expiry Date
  const handleOpenFixExpiry = (product: Product) => {
    setFixingProduct(product);
    const currentExp = product.expiry_date ? format(parseISO(product.expiry_date), 'yyyy-MM-dd') : '';
    setFixExpiryDate(currentExp);
    setIsFixDialogOpen(true);
  };

  const handleSaveFixExpiry = async () => {
    if (!fixingProduct) return;
    setIsSavingExpiry(true);
    try {
      await updateProduct({
        ...fixingProduct,
        expiry_date: fixExpiryDate ? fixExpiryDate : undefined,
      });
      showSuccess(`Updated expiry date for ${fixingProduct.name_en}`);
      setIsFixDialogOpen(false);
      setFixingProduct(null);
    } catch (err) {
      console.error('Error fixing expiry date:', err);
      showError('Failed to update expiry date');
    } finally {
      setIsSavingExpiry(false);
    }
  };

  // Handle open Record as Loss
  const handleOpenRecordLoss = (product: Product) => {
    setLossProduct(product);
    const defaultLocation = (product.stock_shop || 0) > 0 ? 'shop' : 'godown';
    const available = defaultLocation === 'shop' ? (product.stock_shop || 0) : (product.stock_godown || 0);
    setLossLocation(defaultLocation);
    setLossQty(available > 0 ? available : 1);
    setLossNotes(`Expired stock write-off - ${format(new Date(), 'dd/MM/yyyy')}`);
    setRecordAsExpense(true);
    setIsLossDialogOpen(true);
  };

  const handleConfirmRecordLoss = async () => {
    if (!lossProduct || lossQty <= 0) {
      showError('Please enter a valid loss quantity');
      return;
    }

    const currentStock = lossLocation === 'shop' ? (lossProduct.stock_shop || 0) : (lossProduct.stock_godown || 0);
    if (lossQty > currentStock) {
      showError(`Cannot record loss of ${lossQty} items. Only ${currentStock} in ${lossLocation}.`);
      return;
    }

    setIsSubmittingLoss(true);
    try {
      // 1. Update stock in DB & local state
      const newStock = Math.max(0, currentStock - lossQty);
      await updateStock(lossProduct.id, newStock, lossLocation);

      // 2. Save shrinkage record to localStorage for ShrinkageReport
      const totalLossAmount = Number((lossProduct.cost_price || 0) * lossQty);
      const shrinkageRecord = {
        id: `loss-${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        productId: lossProduct.id,
        productName: lossProduct.name_en,
        qty: lossQty,
        reason: 'expired' as const,
        location: lossLocation,
        costPrice: lossProduct.cost_price || 0,
        totalLoss: totalLossAmount,
        notes: lossNotes || 'Expired stock write-off'
      };

      try {
        const existing = JSON.parse(localStorage.getItem('pos_shrinkage_records') || '[]');
        localStorage.setItem('pos_shrinkage_records', JSON.stringify([shrinkageRecord, ...existing]));
      } catch (e) {
        console.error('Error saving shrinkage record to storage:', e);
      }

      // 3. Optionally log as Expense
      if (recordAsExpense && totalLossAmount > 0) {
        try {
          await addExpense({
            id: crypto.randomUUID(),
            date: new Date().toISOString().split('T')[0],
            category: 'disposal_charge',
            title: `Expired Stock Loss: ${lossProduct.name_en} x${lossQty}`,
            amount: totalLossAmount,
            notes: `Location: ${lossLocation === 'shop' ? 'Shop' : 'Godown'}. ${lossNotes || ''}`.trim(),
            paymentMethod: 'cash'
          });
        } catch (expErr) {
          console.warn('Expense record log warning:', expErr);
        }
      }

      showSuccess(`Recorded ${lossQty} units of ${lossProduct.name_en} as expired loss`);
      setIsLossDialogOpen(false);
      setLossProduct(null);
    } catch (err: any) {
      console.error('Error recording loss:', err);
      showError('Failed to record stock loss: ' + (err.message || 'Unknown error'));
    } finally {
      setIsSubmittingLoss(false);
    }
  };

  const currentAvailableStock = lossProduct 
    ? (lossLocation === 'shop' ? (lossProduct.stock_shop || 0) : (lossProduct.stock_godown || 0))
    : 0;
  const calculatedTotalLoss = lossProduct ? (lossProduct.cost_price || 0) * (lossQty || 0) : 0;
  const currency = settings.shop?.currency || 'MVR';

  return (
    <div className="p-6 font-faruma flex flex-col h-full bg-background text-foreground overflow-hidden" dir="rtl">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div className="text-right">
           <h1 className="text-3xl font-black text-foreground flex items-center justify-end gap-3">
             {renderBoth('expiry_alerts')} <ShieldAlert className="h-8 w-8 text-red-500" />
           </h1>
           <p className="text-sm text-muted-foreground mt-1">{renderBoth('expiry_alerts_description')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
           <Button
             onClick={() => setIsBroadcastDialogOpen(true)}
             className="gap-2 bg-gradient-to-r from-orange-600 via-amber-600 to-orange-500 hover:opacity-95 text-white h-10 px-5 rounded-xl font-black shadow-lg shadow-orange-500/25 text-xs uppercase tracking-wider relative"
           >
             <Flame className="h-4 w-4 fill-white/20" />
             <span>އަގު ތިރިކުރުމާއި ޓެލެގްރާމް އެލާޓް (Drop Price & Alert)</span>
             {nearExpiryCount > 0 && (
               <Badge className="bg-white text-orange-600 font-mono text-[10px] font-black px-1.5 py-0 rounded-full ml-1 border-none shadow-xs">
                 {nearExpiryCount}
               </Badge>
             )}
           </Button>

           <Button
             onClick={() => setIsUpdateDialogOpen(true)}
             className="gap-2 bg-primary hover:bg-primary/90 h-10 px-5 rounded-xl font-black shadow-[0_0_20px_rgba(0,132,255,0.3)] text-foreground uppercase tracking-widest text-xs"
           >
             <Calendar className="h-4 w-4" /> Batch Update Dates
           </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 custom-scrollbar">
        {expiringProducts.length === 0 ? (
          <div className="h-60 flex flex-col items-center justify-center text-muted-foreground/50 uppercase tracking-[0.2em] font-black">
             <CheckCircle2 className="h-16 w-16 mb-4 opacity-10" />
             All products are within safety range
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-6">
            {expiringProducts.map((product) => {
              const expiryDate = product.expiry_date ? parseISO(product.expiry_date) : null;
              const isExpired = expiryDate ? isPast(expiryDate) : false;
              const isNearingExpiry = expiryDate ? (expiryDate <= thirtyDaysFromNow && !isExpired) : false;

              return (
                <Card key={product.id} className={cn(
                  "apple-glass-card transition-all duration-300 rounded-[2rem] overflow-hidden group relative shadow-md hover:shadow-xl border flex flex-col justify-between",
                  isExpired 
                    ? "border-red-500/40 shadow-[0_4px_20px_rgba(239,68,68,0.15)]" 
                    : isNearingExpiry 
                    ? "border-amber-500/40 shadow-[0_4px_20px_rgba(245,158,11,0.15)]" 
                    : "border-white/20 dark:border-white/10"
                )}>
                   <CardContent className="p-0 flex flex-col h-full justify-between">
                      <div className="p-6 pb-4">
                         <div className="flex justify-between items-start mb-6">
                            <div className={cn(
                              "w-12 h-12 rounded-2xl flex items-center justify-center border transition-all group-hover:scale-110 shadow-xs",
                              isExpired ? "bg-red-500/15 border-red-500/30 text-red-500" : "bg-amber-500/15 border-amber-500/30 text-amber-500"
                            )}>
                               <AlertTriangle className="h-6 w-6" />
                            </div>
                            <Badge variant={isExpired ? "destructive" : "warning"} className="text-[9px] font-black px-2.5 py-0.5 uppercase tracking-wider">
                               {isExpired ? 'EXPIRED' : 'NEARING EXPIRY'}
                            </Badge>
                         </div>

                         <div className="text-right mb-5">
                            <h3 className="text-lg font-black text-foreground leading-tight mb-1 truncate">{product.name_dv}</h3>
                            <p className="text-xs sm:text-[13px] font-bold text-muted-foreground uppercase tracking-wider truncate">{product.name_en}</p>
                            <p className="text-xs font-mono text-primary font-bold mt-1.5">ID: #{product.item_code}</p>
                         </div>

                         <div className={cn(
                           "p-4 rounded-2xl border flex flex-col items-center justify-center transition-all apple-glass-card",
                           isExpired ? "bg-red-500/10 border-red-500/20" : "bg-amber-500/10 border-amber-500/20"
                         )}>
                            <div className="flex items-center gap-2 mb-1">
                               <Calendar className={cn("h-4 w-4", isExpired ? "text-red-500" : "text-amber-500")} />
                               <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">EXPIRY DATE</span>
                            </div>
                            <p className={cn(
                              "text-xl font-black",
                              isExpired ? "text-red-500" : "text-amber-500"
                            )}>
                               {format(expiryDate!, 'dd MMMM yyyy')}
                            </p>
                            <div className="flex items-center gap-1 mt-2">
                               <Clock className="h-3 w-3 text-muted-foreground/50" />
                               <span className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-widest">
                                  {isExpired ? 'STOCK SHOULD BE REMOVED' : `${Math.ceil((expiryDate!.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))} DAYS REMAINING`}
                                </span>
                            </div>
                         </div>

                         {/* Stock Information */}
                         <div className="flex items-center justify-between text-xs text-muted-foreground mt-4 px-1 font-bold">
                            <span>Shop Stock: <strong className={cn("font-mono", (product.stock_shop || 0) <= 0 ? "text-red-500" : "text-foreground")}>{product.stock_shop || 0}</strong></span>
                            <span>Godown: <strong className={cn("font-mono", (product.stock_godown || 0) <= 0 ? "text-muted-foreground" : "text-foreground")}>{product.stock_godown || 0}</strong></span>
                         </div>
                      </div>

                      {/* Action Buttons: Fix Expiry & Record Loss */}
                      <div className="p-4 pt-3 bg-muted/30 border-t border-border/50 grid grid-cols-2 gap-2">
                         <Button
                           size="sm"
                           variant="outline"
                           onClick={() => handleOpenFixExpiry(product)}
                           className="h-10 rounded-xl font-bold text-xs gap-1.5 border-border hover:bg-primary hover:text-primary-foreground transition-all"
                           title="Fix or change expiry date"
                         >
                           <Edit className="h-3.5 w-3.5" />
                           <span>Fix Date</span>
                         </Button>

                         <Button
                           size="sm"
                           variant="destructive"
                           onClick={() => handleOpenRecordLoss(product)}
                           className="h-10 rounded-xl font-black text-xs gap-1.5 bg-red-600/90 hover:bg-red-700 text-white shadow-xs transition-all"
                           title="Write off expired stock as loss"
                         >
                           <Trash2 className="h-3.5 w-3.5" />
                           <span>Record Loss</span>
                         </Button>
                      </div>
                   </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </ScrollArea>
      
      {/* Existing Batch Dialog */}
      <ExpiryUpdateDialog 
        isOpen={isUpdateDialogOpen}
        onClose={() => setIsUpdateDialogOpen(false)}
      />

      {/* Near Expiry Management & Telegram Clearance Broadcast Modal */}
      <NearExpiryBroadcastDialog
        open={isBroadcastDialogOpen}
        onOpenChange={setIsBroadcastDialogOpen}
        products={products}
        customers={customers}
        settings={settings}
        updateProduct={updateProduct}
      />

      {/* --- 1. DIRECT FIX EXPIRY DATE MODAL --- */}
      <Dialog open={isFixDialogOpen} onOpenChange={(open) => { if (!open) { setIsFixDialogOpen(false); setFixingProduct(null); } }}>
        <DialogContent className="max-w-md w-[calc(100vw-2rem)] font-faruma apple-glass-dialog text-foreground border-white/20 dark:border-white/10 p-6 rounded-3xl" dir="rtl">
          <DialogHeader className="text-right pb-3 border-b border-border/50">
            <DialogTitle className="text-lg font-black text-foreground flex items-center justify-end gap-2">
              <span>Fix Expiry Date (މުއްދަތު ހަމަވާ ތާރީޚް ބަދަލުކުރުން)</span>
              <Calendar className="h-5 w-5 text-primary" />
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Update the expiration date for this product directly.
            </DialogDescription>
          </DialogHeader>

          {fixingProduct && (
            <div className="py-4 space-y-4 text-right">
              <div className="p-3.5 rounded-2xl bg-muted/40 border border-border">
                <p className="font-black text-sm text-foreground">{fixingProduct.name_dv || fixingProduct.name_en}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{fixingProduct.name_en} • <span className="font-mono font-bold">#{fixingProduct.item_code}</span></p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-muted-foreground">
                  New Expiration Date (އައު ތާރީޚް):
                </Label>
                <Input
                  type="date"
                  value={fixExpiryDate}
                  onChange={(e) => setFixExpiryDate(e.target.value)}
                  className="apple-glass-input h-12 rounded-xl text-center font-mono font-bold text-sm"
                />
              </div>

              {fixExpiryDate && (
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setFixExpiryDate('')}
                    className="text-xs text-muted-foreground hover:text-red-500 font-bold"
                  >
                    Clear Expiry Date (Remove date completely)
                  </Button>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex items-center justify-between gap-3 pt-3 border-t border-border/50">
            <Button
              variant="outline"
              onClick={() => { setIsFixDialogOpen(false); setFixingProduct(null); }}
              className="rounded-xl h-11 px-5 font-bold text-xs"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveFixExpiry}
              disabled={isSavingExpiry}
              className="rounded-xl h-11 px-6 font-black text-xs bg-primary hover:bg-primary/90 text-primary-foreground shadow-md gap-2"
            >
              <Check className="h-4 w-4" />
              <span>{isSavingExpiry ? 'Saving...' : 'Save Expiry Date'}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- 2. RECORD EXPIRED STOCK AS LOSS MODAL --- */}
      <Dialog open={isLossDialogOpen} onOpenChange={(open) => { if (!open) { setIsLossDialogOpen(false); setLossProduct(null); } }}>
        <DialogContent className="max-w-lg w-[calc(100vw-2rem)] font-faruma apple-glass-dialog text-foreground border-white/20 dark:border-white/10 p-6 rounded-3xl" dir="rtl">
          <DialogHeader className="text-right pb-3 border-b border-border/50">
            <DialogTitle className="text-lg font-black text-red-500 flex items-center justify-end gap-2">
              <span>Record Expired Stock as Loss (ގެއްލުން ރެކޯޑްކުރުން)</span>
              <Trash2 className="h-5 w-5 text-red-500" />
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Deduct expired stock from inventory and record financial loss in reports.
            </DialogDescription>
          </DialogHeader>

          {lossProduct && (
            <div className="py-4 space-y-4 text-right">
              {/* Product Info Box */}
              <div className="p-3.5 rounded-2xl bg-muted/40 border border-border flex items-center justify-between">
                <div className="text-left font-mono font-bold text-xs">
                  <span className="text-muted-foreground block text-[10px]">Cost Price</span>
                  <span className="text-foreground">{currency} {(lossProduct.cost_price || 0).toFixed(2)}</span>
                </div>
                <div className="text-right">
                  <p className="font-black text-sm text-foreground">{lossProduct.name_dv || lossProduct.name_en}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{lossProduct.name_en} • <span className="font-mono font-bold">#{lossProduct.item_code}</span></p>
                </div>
              </div>

              {/* Location Selector */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-muted-foreground">Location (ތަން):</Label>
                <Select value={lossLocation} onValueChange={(val: any) => {
                  setLossLocation(val);
                  const available = val === 'shop' ? (lossProduct.stock_shop || 0) : (lossProduct.stock_godown || 0);
                  setLossQty(available > 0 ? available : 1);
                }}>
                  <SelectTrigger className="apple-glass-input h-11 rounded-xl font-bold text-xs">
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent className="apple-glass-dialog">
                    <SelectItem value="shop" className="text-xs font-bold">
                      Shop Inventory (ފިހާރަ) — Available: {lossProduct.stock_shop || 0}
                    </SelectItem>
                    <SelectItem value="godown" className="text-xs font-bold">
                      Godown Inventory (ގުދަން) — Available: {lossProduct.stock_godown || 0}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Quantity to Write Off */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <button
                    type="button"
                    onClick={() => setLossQty(currentAvailableStock > 0 ? currentAvailableStock : 1)}
                    className="text-primary font-bold hover:underline text-[11px]"
                  >
                    Select All ({currentAvailableStock} units)
                  </button>
                  <Label className="font-bold text-muted-foreground">Quantity to Remove (ބޭރުކުރާ އަދަދު):</Label>
                </div>
                <Input
                  type="number"
                  min={1}
                  max={Math.max(1, currentAvailableStock)}
                  value={lossQty}
                  onChange={(e) => setLossQty(Math.max(1, parseInt(e.target.value) || 0))}
                  className="apple-glass-input h-12 rounded-xl text-center font-mono font-black text-base"
                />
              </div>

              {/* Loss Financial Calculation Card */}
              <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/25 flex items-center justify-between">
                <div className="text-left font-mono">
                  <span className="text-[10px] uppercase font-black text-red-500 block">Total Financial Loss</span>
                  <span className="text-xl font-black text-red-500">{currency} {calculatedTotalLoss.toFixed(2)}</span>
                </div>
                <div className="text-right text-xs font-bold text-muted-foreground">
                  <p>{lossQty} units @ {currency} {(lossProduct.cost_price || 0).toFixed(2)}</p>
                  <p className="text-[11px] text-red-400 mt-0.5">Deducted from {lossLocation === 'shop' ? 'Shop' : 'Godown'}</p>
                </div>
              </div>

              {/* Loss Notes */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-muted-foreground">Notes (ނޯޓް):</Label>
                <Input
                  value={lossNotes}
                  onChange={(e) => setLossNotes(e.target.value)}
                  placeholder="Notes about disposal or expiry..."
                  className="apple-glass-input h-11 rounded-xl text-sm font-bold"
                />
              </div>

              {/* Record as Expense Checkbox */}
              <div className="flex items-center justify-end gap-3 p-3 rounded-2xl bg-muted/30 border border-border">
                <Label htmlFor="loss-expense" className="text-xs font-bold text-foreground cursor-pointer">
                  Also record this loss under Expenses tab (ޚަރަދު ރެކޯޑްތަކަށް އިތުރުކުރައްވާ)
                </Label>
                <Checkbox
                  id="loss-expense"
                  checked={recordAsExpense}
                  onCheckedChange={(checked) => setRecordAsExpense(Boolean(checked))}
                />
              </div>
            </div>
          )}

          <DialogFooter className="flex items-center justify-between gap-3 pt-3 border-t border-border/50">
            <Button
              variant="outline"
              onClick={() => { setIsLossDialogOpen(false); setLossProduct(null); }}
              className="rounded-xl h-11 px-5 font-bold text-xs"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmRecordLoss}
              disabled={isSubmittingLoss || currentAvailableStock <= 0}
              className="rounded-xl h-11 px-6 font-black text-xs bg-red-600 hover:bg-red-700 text-white shadow-md gap-2"
            >
              <Trash2 className="h-4 w-4" />
              <span>{isSubmittingLoss ? 'Processing...' : 'Confirm Stock Loss'}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ExpiryAlerts;