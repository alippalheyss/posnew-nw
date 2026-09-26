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
      <DialogContent className="sm:max-w-[500px] w-[calc(100vw-2rem)] max-h-[90vh] overflow-y-auto font-faruma apple-glass-dialog border-white/20 dark:border-white/10 text-foreground shadow-2xl rounded-3xl p-6 sm:p-7 box-border [&>button]:left-4 [&>button]:right-auto" dir="rtl">
        <DialogHeader className="text-right pb-3 space-y-1 border-b border-white/10 pl-10">
          <DialogTitle className="text-xl font-black flex items-center justify-end gap-2.5">
             <span>{renderBoth('update_stock')}</span>
             <Edit3 className="h-5 w-5 text-primary" />
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground font-bold">
            {stockItem.name_dv} ({stockItem.name_en})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
           <div className="grid grid-cols-2 gap-3">
              <div 
                onClick={() => setTarget('shop')}
                className={cn(
                  "p-3.5 rounded-2xl border cursor-pointer transition-all duration-300 text-center",
                  target === 'shop' 
                    ? "bg-primary/15 border-primary/50 shadow-lg shadow-primary/10 ring-1 ring-primary/40 backdrop-blur-md" 
                    : "bg-white/5 dark:bg-black/20 border-white/10 opacity-70 hover:opacity-100 hover:bg-white/10"
                )}
              >
                 <div className="flex items-center justify-center gap-1.5 mb-1">
                   <Boxes className="h-3.5 w-3.5 text-muted-foreground" />
                   <span className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">
                     {renderBoth('shop_stock')}
                   </span>
                 </div>
                 <p className="text-2xl font-black text-foreground font-mono">{stockItem.stock_shop}</p>
                 {target === 'shop' && (
                   <span className="text-[9px] font-black text-primary uppercase tracking-widest mt-1 block">Selected (އިޚްތިޔާރުކުރެވިފައި)</span>
                 )}
              </div>
              <div 
                onClick={() => setTarget('godown')}
                className={cn(
                  "p-3.5 rounded-2xl border cursor-pointer transition-all duration-300 text-center",
                  target === 'godown' 
                    ? "bg-primary/15 border-primary/50 shadow-lg shadow-primary/10 ring-1 ring-primary/40 backdrop-blur-md" 
                    : "bg-white/5 dark:bg-black/20 border-white/10 opacity-70 hover:opacity-100 hover:bg-white/10"
                )}
              >
                 <div className="flex items-center justify-center gap-1.5 mb-1">
                   <Boxes className="h-3.5 w-3.5 text-muted-foreground" />
                   <span className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">
                     {renderBoth('godown_stock')}
                   </span>
                 </div>
                 <p className="text-2xl font-black text-foreground font-mono">{stockItem.stock_godown}</p>
                 {target === 'godown' && (
                   <span className="text-[9px] font-black text-primary uppercase tracking-widest mt-1 block">Selected (އިޚްތިޔާރުކުރެވިފައި)</span>
                 )}
              </div>
           </div>

           <div className="space-y-1.5">
              <Label htmlFor="newStock" className="text-right block text-xs font-black uppercase text-foreground px-1">
                {renderBoth('new_stock_quantity')}* ({target === 'shop' ? t('shop') : t('godown')})
              </Label>
              <div className="relative">
                 <Boxes className="absolute right-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-primary/50" />
                 <Input
                   id="newStock"
                   type="number"
                   min="0"
                   value={editedStock}
                   onChange={(e) => setEditedStock(parseFloat(e.target.value) || '')} 
                   onFocus={handleFocus}
                   className="apple-glass-input h-13 rounded-2xl pr-12 text-2xl font-black text-foreground font-mono text-right"
                   autoFocus
                   placeholder="0"
                 />
              </div>
              <p className="text-[11px] text-muted-foreground text-right px-1 pt-0.5">
                {renderBoth('update_stock_manual_override')}
              </p>
           </div>
        </div>

        <DialogFooter className="gap-2.5 pt-3 border-t border-white/10 flex flex-row">
          <Button variant="outline" onClick={onClose} className="flex-1 h-11 border-white/20 dark:border-white/10 hover:bg-white/10 text-foreground font-bold text-xs rounded-2xl">
            {renderBoth('cancel')}
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={typeof editedStock !== 'number' || editedStock < 0} 
            className="flex-1 h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs rounded-2xl shadow-lg shadow-primary/25 uppercase"
          >
            {renderBoth('save_changes')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default StockUpdateDialog;