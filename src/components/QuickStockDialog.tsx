"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PackagePlus, Search, Trash2, Save } from 'lucide-react';
import { Product, useAppContext } from '@/context/AppContext';
import { showSuccess, showError } from '@/utils/toast';

interface QuickStockDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SelectedItem {
  product: Product;
  shopStock: number;
  godownStock: number;
}

const QuickStockDialog: React.FC<QuickStockDialogProps> = ({ isOpen, onClose }) => {
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
    // Check if already in list
    if (selectedItems.some(item => item.product.id === product.id)) {
      showError('Item already selected');
      return;
    }
    
    setSelectedItems(prev => [
      { product, shopStock: product.stock_shop, godownStock: product.stock_godown },
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
        // If not exact match, show error
        showError('Product not found for quick stock. Scan barcode or exact item code.');
      }
    }
  };

  const updateItemStock = (id: string, type: 'shopStock' | 'godownStock', value: string) => {
    const numValue = parseInt(value);
    setSelectedItems(prev => prev.map(item => {
      if (item.product.id === id) {
        return { ...item, [type]: isNaN(numValue) ? '' : numValue };
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
          stock_shop: Number(item.shopStock) || 0,
          stock_godown: Number(item.godownStock) || 0,
        };
        await updateProduct(updatedProduct);
      }
      showSuccess(t('stock_updated_successfully') || 'Stock updated successfully');
      onClose();
    } catch (error) {
      showError('Error updating stock');
    }
  };

  const renderBoth = (key: string, options?: any) => (
    <>
      {t(key, options)} ({t(key, { ...options, lng: 'en' })})
    </>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] h-[80vh] flex flex-col font-faruma apple-glass-dialog border-white/20 dark:border-white/10 text-foreground shadow-2xl rounded-3xl p-6 sm:p-7" dir="rtl">
        <DialogHeader className="text-right flex-shrink-0 pb-3 border-b border-white/10">
          <DialogTitle className="text-2xl font-black flex items-center justify-end gap-3 text-foreground">
             Quick Stock <PackagePlus className="h-6 w-6 text-primary" />
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-xs font-bold">
            Scan or search items to update stock quickly.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4 py-4">
          <div className="relative">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              placeholder="Scan Barcode or Type Item Code..."
              value={searchQuery}
              onChange={handleSearchChange}
              onKeyDown={handleSearchKeyDown}
              className="w-full apple-glass-input rounded-2xl pr-12 h-14 text-right font-bold text-lg"
            />
          </div>

          <div className="flex-1 bg-white/5 dark:bg-black/20 rounded-3xl border border-white/10 overflow-hidden flex flex-col backdrop-blur-md">
            <div className="grid grid-cols-[1fr_120px_120px_60px] gap-4 p-4 border-b border-white/10 bg-white/5 dark:bg-black/20 font-black text-[10px] text-muted-foreground uppercase tracking-widest text-right">
              <div>Product</div>
              <div className="text-center">Shop Stock</div>
              <div className="text-center">Godown Stock</div>
              <div></div>
            </div>
            
            <ScrollArea className="flex-1">
              <div className="p-3 space-y-2">
                {selectedItems.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground/60 font-black uppercase tracking-widest">
                    No items selected
                  </div>
                ) : (
                  selectedItems.map(item => (
                    <div key={item.product.id} className="grid grid-cols-[1fr_120px_120px_60px] gap-4 p-3.5 bg-white/5 dark:bg-white/[0.03] border border-white/5 rounded-2xl items-center transition-all hover:bg-white/10">
                      <div className="text-right">
                        <p className="font-bold text-sm text-foreground line-clamp-1">{item.product.name_dv || item.product.name_en}</p>
                        <p className="text-xs text-muted-foreground font-mono">{item.product.item_code}</p>
                      </div>
                      <div>
                        <Input 
                          type="number"
                          value={item.shopStock === undefined ? '' : item.shopStock}
                          onChange={(e) => updateItemStock(item.product.id, 'shopStock', e.target.value)}
                          onFocus={(e) => e.target.select()}
                          className="h-10 text-center font-bold apple-glass-input rounded-xl"
                        />
                      </div>
                      <div>
                        <Input 
                          type="number"
                          value={item.godownStock === undefined ? '' : item.godownStock}
                          onChange={(e) => updateItemStock(item.product.id, 'godownStock', e.target.value)}
                          onFocus={(e) => e.target.select()}
                          className="h-10 text-center font-bold apple-glass-input rounded-xl"
                        />
                      </div>
                      <div className="flex justify-end">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleRemoveItem(item.product.id)}
                          className="h-10 w-10 text-red-400 hover:text-red-300 hover:bg-red-500/15 rounded-xl"
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

        <DialogFooter className="gap-3 pt-3 border-t border-white/10 flex-shrink-0 flex flex-row">
          <Button variant="ghost" onClick={onClose} className="flex-1 h-12 border-white/20 dark:border-white/10 hover:bg-white/10 text-foreground font-black uppercase tracking-widest rounded-2xl">
            {renderBoth('cancel')}
          </Button>
          <Button onClick={handleSaveAll} disabled={selectedItems.length === 0} className="flex-1 h-12 bg-primary hover:bg-primary/90 font-black uppercase tracking-widest gap-2 shadow-lg shadow-primary/25 text-primary-foreground rounded-2xl">
            <Save className="h-5 w-5" /> Save All ({selectedItems.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default QuickStockDialog;
