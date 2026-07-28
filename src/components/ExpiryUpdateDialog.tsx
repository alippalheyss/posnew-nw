"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Trash2, Save, Calendar, ShieldAlert } from 'lucide-react';
import { Product, useAppContext } from '@/context/AppContext';
import { showSuccess, showError } from '@/utils/toast';
import { format, parseISO } from 'date-fns';

interface ExpiryUpdateDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SelectedItem {
  product: Product;
  expiryDate: string; // YYYY-MM-DD
}

const ExpiryUpdateDialog: React.FC<ExpiryUpdateDialogProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const { products, updateProduct } = useAppContext();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setSelectedItems([]);
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  const handleSelectItem = (product: Product) => {
    if (selectedItems.some(item => item.product.id === product.id)) {
      showError('Item already selected');
      return;
    }
    
    // Default to the product's current expiry date, or empty if none
    const currentExpiry = product.expiry_date 
        ? format(parseISO(product.expiry_date), 'yyyy-MM-dd') 
        : '';

    setSelectedItems(prev => [
      { product, expiryDate: currentExpiry },
      ...prev
    ]);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    
    // Auto-select on exact barcode match
    if (value) {
      const match = products.find(p => p.barcode === value || p.item_code === value);
      if (match) {
        handleSelectItem(match);
        setSearchQuery('');
      }
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery) {
      const match = products.find(p => 
        p.barcode === searchQuery || 
        p.item_code.toLowerCase() === searchQuery.toLowerCase() ||
        p.name_en.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.name_dv.toLowerCase().includes(searchQuery.toLowerCase())
      );
      
      if (match) {
        handleSelectItem(match);
        setSearchQuery('');
      } else {
        showError('Product not found for expiry update. Scan barcode or exact item code.');
      }
    }
  };

  const updateItemExpiry = (id: string, value: string) => {
    setSelectedItems(prev => prev.map(item => {
      if (item.product.id === id) {
        return { ...item, expiryDate: value };
      }
      return item;
    }));
  };

  const handleRemoveItem = (id: string) => {
    setSelectedItems(prev => prev.filter(item => item.product.id !== id));
  };

  const handleSaveAll = async () => {
    if (selectedItems.length === 0) return;
    
    try {
      for (const item of selectedItems) {
        const updatedProduct: Product = {
          ...item.product,
          expiry_date: item.expiryDate || undefined,
        };
        await updateProduct(updatedProduct);
      }
      showSuccess(t('expiry_dates_updated') || 'Expiry dates updated successfully');
      onClose();
    } catch (error) {
      showError('Error updating expiry dates');
    }
  };

  const renderBoth = (key: string, options?: any) => (
    <>
      {t(key, options)} ({t(key, { ...options, lng: 'en' })})
    </>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] h-[80vh] flex flex-col font-faruma bg-[#0a0a1a] border-white/10 text-white shadow-2xl" dir="rtl">
        <DialogHeader className="text-right flex-shrink-0">
          <DialogTitle className="text-2xl font-black flex items-center justify-end gap-3">
             Update Expiry Dates <ShieldAlert className="h-6 w-6 text-primary" />
          </DialogTitle>
          <DialogDescription className="text-white/40">
            Scan or search items to rapidly update their expiry dates.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4 py-4">
          <div className="relative">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40" />
            <Input
              ref={searchInputRef}
              placeholder="Scan Barcode or Type Item Code..."
              value={searchQuery}
              onChange={handleSearchChange}
              onKeyDown={handleSearchKeyDown}
              className="w-full bg-white/5 border-white/10 rounded-xl pr-12 h-14 text-right font-bold focus:border-primary/50 text-lg"
            />
          </div>

          <div className="flex-1 bg-white/5 rounded-2xl border border-white/10 overflow-hidden flex flex-col">
            <div className="grid grid-cols-[1fr_200px_60px] gap-4 p-4 border-b border-white/10 bg-white/5 font-black text-[10px] text-white/40 uppercase tracking-widest text-right">
              <div>Product</div>
              <div className="text-center">Expiry Date</div>
              <div></div>
            </div>
            
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-2">
                {selectedItems.length === 0 ? (
                  <div className="text-center py-10 text-white/20 font-black uppercase tracking-widest">
                    No items selected
                  </div>
                ) : (
                  selectedItems.map(item => (
                    <div key={item.product.id} className="grid grid-cols-[1fr_200px_60px] gap-4 p-3 bg-white/5 rounded-xl items-center transition-all hover:bg-white/10">
                      <div className="text-right">
                        <p className="font-bold text-sm text-white line-clamp-1">{item.product.name_dv || item.product.name_en}</p>
                        <p className="text-xs text-white/40">{item.product.item_code}</p>
                      </div>
                      <div className="relative">
                        <Input 
                          type="date"
                          value={item.expiryDate}
                          onChange={(e) => updateItemExpiry(item.product.id, e.target.value)}
                          className="h-10 text-center font-bold bg-white/5 border-white/10 focus:border-primary"
                        />
                      </div>
                      <div className="flex justify-end">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleRemoveItem(item.product.id)}
                          className="h-10 w-10 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter className="gap-3 pt-4 border-t border-white/5 flex-shrink-0">
          <Button variant="ghost" onClick={onClose} className="flex-1 h-12 border-white/10 hover:bg-white/5 text-white font-black uppercase tracking-widest">
            {renderBoth('cancel')}
          </Button>
          <Button onClick={handleSaveAll} disabled={selectedItems.length === 0} className="flex-1 h-12 bg-primary hover:bg-primary/90 font-black uppercase tracking-widest gap-2 shadow-[0_0_20px_rgba(0,132,255,0.3)] text-white">
            <Save className="h-5 w-5" /> Save All ({selectedItems.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ExpiryUpdateDialog;
