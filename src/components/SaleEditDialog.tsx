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
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] flex flex-col font-faruma bg-[#0a0a1a] border-white/10 text-white shadow-2xl" dir="rtl">
        <DialogHeader className="text-right">
          <DialogTitle className="text-2xl font-black flex items-center justify-end gap-3">
            {renderBoth('edit_sale')} <Receipt className="h-6 w-6 text-primary" />
          </DialogTitle>
          <DialogDescription className="text-white/40">
            Sale ID: {editedSale.invoiceNumber || editedSale.id} | Date: {editedSale.date}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-2 gap-6 py-6">
           {/* Items Section */}
           <div className="flex flex-col bg-white/5 rounded-3xl border border-white/5 overflow-hidden">
              <div className="p-4 border-b border-white/5 flex items-center justify-between">
                 <h4 className="text-[10px] font-black uppercase tracking-widest text-white/40">{renderBoth('items')}</h4>
                 <div className="relative w-40">
                    <Search className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-white/20" />
                    <Input 
                      placeholder="Add item..." 
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      className="h-8 text-[10px] bg-white/5 border-white/10 pr-7 rounded-lg"
                    />
                    {productSearch && (
                       <div className="absolute top-full left-0 right-0 mt-1 bg-[#0f0f25] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
                          {filteredProducts.map(p => (
                             <div 
                               key={p.id} 
                               onClick={() => handleAddProduct(p)}
                               className="p-2 hover:bg-primary/20 cursor-pointer text-right transition-colors"
                             >
                                <p className="text-[10px] font-bold">{p.name_dv}</p>
                                <p className="text-[8px] opacity-40">{p.name_en}</p>
                             </div>
                          ))}
                       </div>
                    )}
                 </div>
              </div>
              <ScrollArea className="flex-1 p-4 custom-scrollbar">
                 <div className="space-y-3">
                    {editedSale.items.map(item => (
                       <div key={item.id} className="flex items-center justify-between bg-black/20 p-3 rounded-2xl border border-white/5 group">
                          <div className="text-right flex-1">
                             <p className="text-[11px] font-black text-white">{item.name_dv}</p>
                             <p className="text-[9px] text-white/30">{item.name_en}</p>
                             <p className="text-[10px] font-black text-primary mt-1">{settings.shop.currency} {(item.price * item.qty).toFixed(2)}</p>
                          </div>
                          <div className="flex items-center gap-2 mr-4">
                             <div className="flex items-center gap-1 bg-white/5 rounded-lg p-0.5 border border-white/10">
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-white/40 hover:text-white" onClick={() => handleItemQtyChange(item.id, -1)}><Minus className="h-3 w-3" /></Button>
                                <span className="w-6 text-center text-[10px] font-black">{item.qty}</span>
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-white/40 hover:text-white" onClick={() => handleItemQtyChange(item.id, 1)}><Plus className="h-3 w-3" /></Button>
                             </div>
                             <Button variant="ghost" size="icon" className="h-8 w-8 text-white/20 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all" onClick={() => handleRemoveItem(item.id)}><Trash2 className="h-4 w-4" /></Button>
                          </div>
                       </div>
                    ))}
                 </div>
              </ScrollArea>
           </div>

           {/* Details Section */}
           <div className="flex flex-col space-y-6">
              <div className="space-y-2">
                 <Label className="text-right block text-[10px] font-black uppercase text-white/40 tracking-widest">{renderBoth('customer')}</Label>
                 <div className="relative">
                    <User className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20" />
                    <Select value={editedSale.customer?.id || 'walk-in'} onValueChange={handleCustomerChange}>
                       <SelectTrigger className="bg-white/5 border-white/10 h-12 rounded-xl text-right pr-10 font-bold">
                          <SelectValue placeholder="Select Customer" />
                       </SelectTrigger>
                       <SelectContent className="bg-[#0a0a1a] border-white/10 text-white">
                          <SelectItem value="walk-in" className="text-right">Walk-in Customer</SelectItem>
                          {customers.map(c => (
                             <SelectItem key={c.id} value={c.id} className="text-right">{c.name_dv} ({c.name_en})</SelectItem>
                          ))}
                       </SelectContent>
                    </Select>
                 </div>
              </div>

              <div className="space-y-2">
                 <Label className="text-right block text-[10px] font-black uppercase text-white/40 tracking-widest">{renderBoth('payment_method')}</Label>
                 <div className="grid grid-cols-2 gap-2">
                    {['cash', 'credit', 'card', 'mobile'].map(method => (
                       <Button
                          key={method}
                          variant={editedSale.paymentMethod === method ? 'default' : 'outline'}
                          onClick={() => handlePaymentMethodChange(method)}
                          className={cn(
                             "h-10 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all",
                             editedSale.paymentMethod === method ? "bg-primary text-white shadow-lg" : "bg-white/5 border-white/10 text-white/40 hover:text-white"
                          )}
                       >
                          {method}
                       </Button>
                    ))}
                 </div>
              </div>

              {editedSale.paymentMethod === 'cash' && (
                 <div className="space-y-2">
                    <Label className="text-right block text-[10px] font-black uppercase text-white/40 tracking-widest">{renderBoth('paid_amount')}</Label>
                    <div className="relative">
                       <DollarSign className="absolute right-4 top-1/2 -translate-y-1/2 h-6 w-6 text-primary/40" />
                       <Input
                         type="number"
                         value={paidAmount}
                         onChange={(e) => setPaidAmount(parseFloat(e.target.value) || '')}
                         className="bg-white/5 border-primary h-14 rounded-2xl pr-14 text-2xl font-black text-white text-right"
                         placeholder="0.00"
                       />
                    </div>
                 </div>
              )}

              <div className="mt-auto bg-primary/10 p-6 rounded-[2rem] border border-primary/20">
                 <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">{renderBoth('grand_total')}</span>
                    <span className="text-2xl font-black text-primary">{settings.shop.currency} {grandTotal.toFixed(2)}</span>
                 </div>
                 {editedSale.paymentMethod === 'cash' && (
                    <div className="flex justify-between items-center">
                       <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">{renderBoth('balance')}</span>
                       <span className={cn("text-xl font-black", currentBalance < 0 ? "text-red-500" : "text-green-500")}>
                          {settings.shop.currency} {currentBalance.toFixed(2)}
                       </span>
                    </div>
                 )}
              </div>
           </div>
        </div>

        <DialogFooter className="gap-3 pt-4 border-t border-white/5">
          <Button variant="ghost" onClick={onClose} className="flex-1 h-12 border-white/10 hover:bg-white/5 text-white font-black uppercase tracking-widest">
            {renderBoth('cancel')}
          </Button>
          <Button onClick={handleSave} className="flex-1 h-12 bg-primary hover:bg-primary/90 font-black uppercase tracking-widest shadow-[0_0_20px_rgba(0,132,255,0.3)]">
             <Receipt className="ml-2 h-4 w-4" /> {renderBoth('save_changes')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SaleEditDialog;