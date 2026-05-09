"use client";

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { showSuccess, showError } from '@/utils/toast';

import { Product } from '@/context/AppContext';

interface StockUpdateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  stockItem: Product | null;
  onSave: (updatedStockItem: Product) => void;
}

const StockUpdateDialog: React.FC<StockUpdateDialogProps> = ({ isOpen, onClose, stockItem, onSave }) => {
  const { t } = useTranslation();
  const [editedStock, setEditedStock] = useState<number | ''>(stockItem?.stock_shop || '');

  useEffect(() => {
    setEditedStock(stockItem?.stock_shop || '');
  }, [stockItem]);

  const handleSave = () => {
    if (stockItem && typeof editedStock === 'number' && editedStock >= 0) {
      const updatedStockItem: Product = {
        ...stockItem,
        stock_shop: editedStock,
        // last_updated logic can be handled by parent or added to Product schema if needed, skipping for now as Product has no last_updated
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] font-faruma" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-right">{renderBoth('update_stock_for', { itemName: stockItem.name_dv })}</DialogTitle>
          <DialogDescription className="text-right">
            {renderBoth('enter_new_stock_quantity')}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-3 items-center gap-4">
            <Label htmlFor="currentStock" className="text-right">
              {renderBoth('current_stock')}
            </Label>
            <Input
              id="currentStock"
              value={stockItem.stock_shop}
              readOnly
              className="col-span-2 text-right"
            />
          </div>
          <div className="grid grid-cols-3 items-center gap-4">
            <Label htmlFor="newStock" className="text-right">
              {renderBoth('new_stock_quantity')}
            </Label>
            <Input
              id="newStock"
              type="number"
              value={editedStock}
              onChange={(e) => setEditedStock(parseFloat(e.target.value) || '')}
              className="col-span-2 text-right"
              autoFocus
            />
          </div>
        </div>
        <DialogFooter className="flex justify-between">
          <Button variant="outline" onClick={onClose} className="font-faruma">
            {renderBoth('cancel')}
          </Button>
          <Button onClick={handleSave} disabled={typeof editedStock !== 'number' || editedStock < 0} className="font-faruma">
            {renderBoth('save_changes')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default StockUpdateDialog;