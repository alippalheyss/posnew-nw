"use client";

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { showSuccess, showError } from '@/utils/toast';
import { useAppContext, Product, Customer, CartItem, Sale } from '@/context/AppContext';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { XCircle, Plus, Search, Trash2, Minus, CreditCard, DollarSign, User, Receipt, ShoppingCart } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SaleEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale | null;
  onSave: (updatedSale: Sale) => void;
}

const SaleEditDialog: React.FC<SaleEditDialogProps> = ({ isOpen, onClose, sale, onSave }) => {
  const { t } = useTranslation();
  const { customers, settings, products } = useAppContext();
  const [editedSale, setEditedSale] = useState<Sale | null>(sale);
  const [paidAmount, setPaidAmount] = useState<number | ''>(sale?.paidAmount || '');
  const [productSearch, setProductSearch] = useState('');

  useEffect(() => {
    setEditedSale(sale);
    setPaidAmount(sale?.paidAmount || '');
  }, [sale, isOpen]);

  if (!editedSale) return null;

  const calculateTotals = (currentItems: CartItem[]) => {
    const grandTotal = currentItems.reduce((sum, item) => sum + item.price * item.qty, 0);
    const gstRate = (settings?.shop?.taxRate || 0) / 100;
    const subtotalExcludingGst = grandTotal / (1 + gstRate);
    const gstAmount = grandTotal - subtotalExcludingGst;
    return { subtotal: subtotalExcludingGst, gstAmount, grandTotal };
  };

  const { grandTotal } = calculateTotals(editedSale.items || []);
  const currentBalance = typeof paidAmount === 'number' ? paidAmount - grandTotal : -grandTotal;

  const handleItemQtyChange = (itemId: string, delta: number) => {
    setEditedSale(prev => {
      if (!prev) return null;
      const updatedItems = prev.items.map(item =>
        item.id === itemId ? { ...item, qty: item.qty + delta } : item
      ).filter(item => item.qty > 0);
      const newTotals = calculateTotals(updatedItems);
      return { ...prev, items: updatedItems, grandTotal: newTotals.grandTotal };
    });
  };

  const handleRemoveItem = (itemId: string) => {
    setEditedSale(prev => {
      if (!prev) return null;
      const updatedItems = prev.items.filter(item => item.id !== itemId);
      const newTotals = calculateTotals(updatedItems);
      return { ...prev, items: updatedItems, grandTotal: newTotals.grandTotal };
    });
  };

  const handleCustomerChange = (customerId: string) => {
    const customer = customerId === 'walk-in' ? null : customers.find(c => c.id === customerId) || null;
    setEditedSale(prev => prev ? { ...prev, customer } : null);
  };

  const handlePaymentMethodChange = (method: string) => {
    setEditedSale(prev => prev ? { ...prev, paymentMethod: method as any } : null);
    if (method !== 'cash') {
      setPaidAmount('');
    } else if (editedSale) {
      setPaidAmount(editedSale.grandTotal);
    }
  };

  const handleAddProduct = (product: Product) => {
    setEditedSale(prev => {
      if (!prev) return null;
      const existingItem = prev.items.find(item => item.id === product.id);
      let updatedItems;
      if (existingItem) {
        updatedItems = prev.items.map(item =>
          item.id === product.id ? { ...item, qty: item.qty + 1 } : item
        );
      } else {
        const newItem: CartItem = {
          ...product,
          qty: 1
        };
        updatedItems = [...prev.items, newItem];
      }
      const newTotals = calculateTotals(updatedItems);
      return { ...prev, items: updatedItems, grandTotal: newTotals.grandTotal };
    });
    setProductSearch('');
  };

  const handleSave = () => {
    if (editedSale.items.length === 0) {
      showError(t('no_items_in_sale'));
      return;
    }
    onSave({
      ...editedSale,
      paidAmount: typeof paidAmount === 'number' ? paidAmount : 0
    });
    showSuccess(t('sale_updated_successfully'));
    onClose();
  };

  const renderBoth = (key: string, options?: any) => (
    <>
      {t(key, options)} ({t(key, { ...options, lng: 'en' })})
    </>
  );

  const filteredProducts = products.filter(p => 
    p.name_dv.includes(productSearch) || 
    p.name_en.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.item_code.toLowerCase().includes(productSearch.toLowerCase())
  ).slice(0, 5);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] flex flex-col font-faruma apple-glass-dialog border-white/20 dark:border-white/10 text-foreground shadow-2xl rounded-3xl p-6 sm:p-7" dir="rtl">
        <DialogHeader className="text-right pb-3 border-b border-white/10">
          <DialogTitle className="text-2xl font-black flex items-center justify-end gap-3 text-foreground">
            {renderBoth('edit_sale')} <Receipt className="h-6 w-6 text-primary" />
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-xs font-bold font-mono">
            Sale ID: {editedSale.invoiceNumber || editedSale.id} | Date: {editedSale.date}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
           {/* Items Section */}
           <div className="flex flex-col bg-white/5 dark:bg-black/20 rounded-3xl border border-white/10 overflow-hidden backdrop-blur-md">
              <div className="p-4 border-b border-white/10 flex items-center justify-between">
                 <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{renderBoth('items')}</h4>
                 <div className="relative w-40">
                    <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
                    <Input 
                      placeholder="Add item..." 
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      className="h-8 text-[11px] apple-glass-input pr-8 rounded-xl font-bold"
                    />
                    {productSearch && (
                       <div className="absolute top-full left-0 right-0 mt-1 apple-glass-dialog border border-white/20 rounded-2xl shadow-2xl z-50 overflow-hidden">
                          {filteredProducts.map(p => (
                             <div 
                               key={p.id} 
                               onClick={() => handleAddProduct(p)}
                               className="p-2.5 hover:bg-primary/20 cursor-pointer text-right transition-colors"
                             >
                                <p className="text-[11px] font-bold text-foreground">{p.name_dv}</p>
                                <p className="text-[9px] text-muted-foreground font-mono">{p.name_en}</p>
                             </div>
                          ))}
                       </div>
                    )}
                 </div>
              </div>
              <ScrollArea className="flex-1 p-3 custom-scrollbar">
                 <div className="space-y-2.5">
                    {editedSale.items.map(item => (
                       <div key={item.id} className="flex items-center justify-between bg-white/5 dark:bg-white/[0.03] p-3 rounded-2xl border border-white/5 group backdrop-blur-sm">
                          <div className="text-right flex-1">
                             <p className="text-xs font-black text-foreground">{item.name_dv}</p>
                             <p className="text-[11px] font-bold text-muted-foreground font-mono">{item.name_en}</p>
                             <p className="text-xs font-black text-primary font-mono mt-0.5">{settings.shop.currency} {(item.price * item.qty).toFixed(2)}</p>
                          </div>
                          <div className="flex items-center gap-2 mr-3">
                             <div className="flex items-center gap-1 bg-black/20 rounded-xl p-1 border border-white/10">
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground rounded-lg" onClick={() => handleItemQtyChange(item.id, -1)}><Minus className="h-3 w-3" /></Button>
                                <span className="w-6 text-center text-xs font-black font-mono">{item.qty}</span>
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground rounded-lg" onClick={() => handleItemQtyChange(item.id, 1)}><Plus className="h-3 w-3" /></Button>
                             </div>
                             <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground/50 hover:text-red-400 hover:bg-red-500/15 rounded-xl opacity-0 group-hover:opacity-100 transition-all" onClick={() => handleRemoveItem(item.id)}><Trash2 className="h-4 w-4" /></Button>
                          </div>
                       </div>
                    ))}
                 </div>
              </ScrollArea>
           </div>

           {/* Details Section */}
           <div className="flex flex-col space-y-4">
              <div className="space-y-1.5">
                 <Label className="text-right block text-[10px] font-black uppercase text-muted-foreground tracking-widest">{renderBoth('customer')}</Label>
                 <div className="relative">
                    <User className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                    <Select value={editedSale.customer?.id || 'walk-in'} onValueChange={handleCustomerChange}>
                       <SelectTrigger className="apple-glass-input h-12 rounded-2xl text-right pr-10 font-bold">
                          <SelectValue placeholder="Select Customer" />
                       </SelectTrigger>
                       <SelectContent className="apple-glass-dialog border border-white/20 text-foreground">
                          <SelectItem value="walk-in" className="text-right">Walk-in Customer</SelectItem>
                          {customers.map(c => (
                             <SelectItem key={c.id} value={c.id} className="text-right">{c.name_dv} ({c.name_en})</SelectItem>
                          ))}
                       </SelectContent>
                    </Select>
                 </div>
              </div>

              <div className="space-y-1.5">
                 <Label className="text-right block text-[10px] font-black uppercase text-muted-foreground tracking-widest">{renderBoth('payment_method')}</Label>
                 <div className="grid grid-cols-2 gap-2 bg-white/5 dark:bg-black/20 p-1.5 rounded-2xl border border-white/10 backdrop-blur-md">
                    {['cash', 'credit', 'card', 'mobile'].map(method => (
                       <Button
                          key={method}
                          variant={editedSale.paymentMethod === method ? 'default' : 'outline'}
                          onClick={() => handlePaymentMethodChange(method)}
                          className={cn(
                             "h-10 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all",
                             editedSale.paymentMethod === method 
                              ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25" 
                              : "bg-transparent border-transparent text-muted-foreground hover:text-foreground hover:bg-white/10"
                          )}
                       >
                          {method}
                       </Button>
                    ))}
                 </div>
              </div>

              {editedSale.paymentMethod === 'cash' && (
                 <div className="space-y-1.5">
                    <Label className="text-right block text-[10px] font-black uppercase text-muted-foreground tracking-widest">{renderBoth('paid_amount')}</Label>
                    <div className="relative">
                       <DollarSign className="absolute right-4 top-1/2 -translate-y-1/2 h-6 w-6 text-primary/40" />
                       <Input
                         type="number"
                         value={paidAmount}
                         onChange={(e) => setPaidAmount(parseFloat(e.target.value) || '')}
                         className="apple-glass-input h-13 rounded-2xl pr-14 text-2xl font-black text-foreground text-right font-mono"
                         placeholder="0.00"
                       />
                    </div>
                 </div>
              )}

              <div className="mt-auto bg-primary/15 p-5 rounded-3xl border border-primary/30 backdrop-blur-md shadow-lg shadow-primary/10">
                 <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{renderBoth('grand_total')}</span>
                    <span className="text-2xl font-black text-primary font-mono">{settings.shop.currency} {grandTotal.toFixed(2)}</span>
                 </div>
                 {editedSale.paymentMethod === 'cash' && (
                    <div className="flex justify-between items-center">
                       <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{renderBoth('balance')}</span>
                       <span className={cn("text-xl font-black font-mono", currentBalance < 0 ? "text-red-400" : "text-emerald-400")}>
                          {settings.shop.currency} {currentBalance.toFixed(2)}
                       </span>
                    </div>
                 )}
              </div>
           </div>
        </div>

        <DialogFooter className="gap-3 pt-3 border-t border-white/10 flex flex-row">
          <Button variant="ghost" onClick={onClose} className="flex-1 h-12 border-white/20 dark:border-white/10 hover:bg-white/10 text-foreground font-black uppercase tracking-widest rounded-2xl">
            {renderBoth('cancel')}
          </Button>
          <Button onClick={handleSave} className="flex-1 h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase tracking-widest shadow-lg shadow-primary/25 rounded-2xl">
             <Receipt className="ml-2 h-4 w-4" /> {renderBoth('save_changes')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SaleEditDialog;