"use client";

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { showSuccess, showError } from '@/utils/toast';
import { Product } from '@/context/AppContext';
import { Boxes, Edit3, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StockUpdateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  stockItem: Product | null;
  onSave: (updatedStockItem: Product) => void;
}

const StockUpdateDialog: React.FC<StockUpdateDialogProps> = ({ isOpen, onClose, stockItem, onSave }) => {
  const { t } = useTranslation();
  const [target, setTarget] = useState<'shop' | 'godown'>('shop');
  const [editedStock, setEditedStock] = useState<number | ''>('');

  useEffect(() => {
    if (stockItem) {
      setEditedStock(target === 'shop' ? stockItem.stock_shop : stockItem.stock_godown);
    }
  }, [stockItem, isOpen, target]);

  const handleSave = () => {
    if (stockItem && typeof editedStock === 'number' && editedStock >= 0) {
      const updatedStockItem: Product = {
        ...stockItem,
        [target === 'shop' ? 'stock_shop' : 'stock_godown']: editedStock,
      };
      onSave(updatedStockItem);
      showSuccess(t('stock_updated_successfully'));
      onClose();
    } else {
      showError(t('error_updating_stock'));
    }
  };

  const renderBoth = (key: string, options?: any) => (
    <>
      {t(key, options)} ({t(key, { ...options, lng: 'en' })})
    </>
  );

  if (!stockItem) return null;

  const handleFocus = (event: React.FocusEvent<HTMLInputElement>) => {
    event.target.select();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[450px] font-faruma bg-card border-border text-foreground shadow-2xl" dir="rtl">
        <DialogHeader className="text-right">
          <DialogTitle className="text-2xl font-black flex items-center justify-end gap-3">
             {renderBoth('update_stock')} <Edit3 className="h-6 w-6 text-primary" />
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {stockItem.name_dv} ({stockItem.name_en})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-8 py-8">
           <div className="grid grid-cols-2 gap-4">
              <div 
                onClick={() => setTarget('shop')}
                className={cn(
                  "p-4 rounded-2xl border cursor-pointer transition-all text-right",
                  target === 'shop' ? "bg-primary/10 border-primary shadow-lg shadow-primary/20" : "bg-muted border-border opacity-50"
                )}
              >
                 <p className="text-[10px] font-black text-foreground/30 uppercase tracking-widest mb-1">{renderBoth('shop_stock')}</p>
                 <p className="text-2xl font-black text-foreground">{stockItem.stock_shop}</p>
              </div>
              <div 
                onClick={() => setTarget('godown')}
                className={cn(
                  "p-4 rounded-2xl border cursor-pointer transition-all text-right",
                  target === 'godown' ? "bg-primary/10 border-primary shadow-lg shadow-primary/20" : "bg-muted border-border opacity-50"
                )}
              >
                 <p className="text-[10px] font-black text-foreground/30 uppercase tracking-widest mb-1">{renderBoth('godown_stock')}</p>
                 <p className="text-2xl font-black text-foreground">{stockItem.stock_godown}</p>
              </div>
           </div>

           <div className="space-y-3">
              <Label htmlFor="newStock" className="text-right block text-[10px] font-black uppercase text-muted-foreground tracking-widest pr-2">
                {renderBoth('new_stock_quantity')}*
              </Label>
              <div className="relative">
                 <Boxes className="absolute right-4 top-1/2 -translate-y-1/2 h-6 w-6 text-primary/40" />
                 <Input
                   id="newStock"
                   type="number"
                   value={editedStock}
                   onChange={(e) => setEditedStock(parseFloat(e.target.value) || '')} onFocus={handleFocus}
                   className="bg-muted border-primary h-16 rounded-2xl pr-14 text-3xl font-black text-foreground focus:ring-0 text-right"
                   autoFocus
                   placeholder="0"
                 />
              </div>
              <p className="text-[10px] text-muted-foreground/50 text-right italic">
                This will manually override the current {target === 'shop' ? 'Shop' : 'Godown'} stock value.
              </p>
           </div>
        </div>

        <DialogFooter className="gap-3 pt-4 border-t border-border">
          <Button variant="ghost" onClick={onClose} className="flex-1 h-12 border-border hover:bg-muted text-foreground font-black uppercase tracking-widest">
            {renderBoth('cancel')}
          </Button>
          <Button onClick={handleSave} disabled={typeof editedStock !== 'number' || editedStock < 0} className="flex-1 h-12 bg-primary hover:bg-primary/90 font-black uppercase tracking-widest shadow-[0_0_20px_rgba(0,132,255,0.3)]">
            {renderBoth('save_changes')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default StockUpdateDialog;