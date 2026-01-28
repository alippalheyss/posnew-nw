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
import { XCircle, Plus, Search } from 'lucide-react';

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
  }, [sale]);

  // Early return if no sale to edit
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

  const handlePaymentMethodChange = (method: 'cash' | 'credit' | 'card' | 'mobile') => {
    setEditedSale(prev => prev ? { ...prev, paymentMethod: method } : null);
    if (method !== 'cash') {
      setPaidAmount(''); // Clear paid amount if not cash
    } else if (editedSale) {
      setPaidAmount(editedSale.grandTotal); // Default to grand total for cash
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
    setProductSearch(''); // Clear search after adding
  };

  const filteredProducts = (products || []).filter(p =>
    productSearch.length > 0 && (
      p.name_en.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.name_dv.includes(productSearch) ||
      p.item_code.toLowerCase().includes(productSearch.toLowerCase())
    )
  ).slice(0, 5);

  const handleSave = () => {
    if (editedSale) {
      if (editedSale.items.length === 0) {
        showError(t('cart_empty_error'));
        return;
      }

      let finalSale = { ...editedSale };

      if (finalSale.paymentMethod === 'cash') {
        if (typeof paidAmount !== 'number' || paidAmount < finalSale.grandTotal) {
          showError(t('insufficient_payment_error'));
          return;
        }
        finalSale = { ...finalSale, paidAmount: paidAmount, balance: paidAmount - finalSale.grandTotal };
      } else {
        finalSale = { ...finalSale, paidAmount: undefined, balance: undefined };
      }

      onSave(finalSale);
      showSuccess(t('sale_updated_successfully'));
      onClose();
    } else {
      showError(t('error_updating_sale'));
    }
  };

  const renderBoth = (key: string, options?: any) => (
    <>
      {t(key, options)} ({t(key, { ...options, lng: 'en' })})
    </>
  );

  const renderBothString = (key: string, options?: any) => {
    return `${t(key, options)} (${t(key, { ...options, lng: 'en' })})`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] font-faruma" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-right">{renderBoth('edit_sale')}</DialogTitle>
          <DialogDescription className="text-right">
            {renderBoth('edit_sale_description')}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-3 items-center gap-4">
            <Label htmlFor="saleDate" className="text-right">
              {renderBoth('sale_date')}
            </Label>
            <Input id="saleDate" value={editedSale.date} readOnly className="col-span-2 text-right" />
          </div>

          <div className="grid grid-cols-3 items-center gap-4">
            <Label htmlFor="customerSelect" className="text-right">
              {renderBoth('customer')}
            </Label>
            <Select onValueChange={handleCustomerChange} value={editedSale.customer?.id || "walk-in"} dir="rtl">
              <SelectTrigger id="customerSelect" className="col-span-2 text-right">
                <SelectValue placeholder={renderBothString('select_customer')} />
              </SelectTrigger>
              <SelectContent dir="rtl">
                <SelectItem value="walk-in" className="text-right">{renderBoth('walk_in_customer')}</SelectItem>
                {(customers || []).map((customer) => (
                  <SelectItem key={customer.id} value={customer.id} className="text-right">
                    {customer.name_dv} ({customer.name_en})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-3 items-center gap-4">
            <Label htmlFor="paymentMethod" className="text-right">
              {renderBoth('payment_method')}
            </Label>
            <Select onValueChange={handlePaymentMethodChange} value={editedSale.paymentMethod} dir="rtl">
              <SelectTrigger id="paymentMethod" className="col-span-2 text-right">
                <SelectValue placeholder={renderBothString('payment_method')} />
              </SelectTrigger>
              <SelectContent dir="rtl">
                <SelectItem value="cash" className="text-right">{renderBoth('cash')}</SelectItem>
                <SelectItem value="credit" className="text-right">{renderBoth('credit')}</SelectItem>
                <SelectItem value="card" className="text-right">{renderBoth('card')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {editedSale.paymentMethod === 'cash' && (
            <>
              <div className="grid grid-cols-3 items-center gap-4">
                <Label htmlFor="grandTotal" className="text-right">
                  {renderBoth('grand_total')}
                </Label>
                <Input id="grandTotal" value={grandTotal.toFixed(2)} readOnly className="col-span-2 text-right" />
              </div>
              <div className="grid grid-cols-3 items-center gap-4">
                <Label htmlFor="paidAmount" className="text-right">
                  {renderBoth('paid_amount')}
                </Label>
                <Input
                  id="paidAmount"
                  type="number"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(parseFloat(e.target.value) || '')}
                  className="col-span-2 text-right"
                />
              </div>
              <div className="grid grid-cols-3 items-center gap-4">
                <Label htmlFor="balance" className="text-right">
                  {renderBoth('balance')}
                </Label>
                <Input
                  id="balance"
                  value={currentBalance.toFixed(2)}
                  readOnly
                  className="col-span-2 text-right"
                  style={{ color: currentBalance < 0 ? 'red' : 'green' }}
                />
              </div>
            </>
          )}

          <Separator className="my-2" />

          {/* Add Product Section */}
          <div className="mb-4">
            <Label htmlFor="productSearch" className="text-right mb-2 block">
              {renderBoth('add_product')}
            </Label>
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="productSearch"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder={renderBothString('search_products')}
                className="text-right pr-10"
              />
            </div>
            {productSearch && filteredProducts.length > 0 && (
              <div className="mt-2 border rounded-md max-h-[150px] overflow-y-auto">
                {filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer flex justify-between items-center border-b last:border-b-0"
                    onClick={() => handleAddProduct(product)}
                  >
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <Plus className="h-4 w-4 text-green-600" />
                    </Button>
                    <div className="flex-1 text-right mr-2">
                      <p className="text-sm font-medium">{product.name_dv}</p>
                      <p className="text-xs text-gray-500">{product.name_en} - {product.item_code}</p>
                    </div>
                    <p className="text-sm font-bold">{settings?.shop?.currency || 'MVR'} {product.price.toFixed(2)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Separator className="my-2" />
          <h4 className="font-semibold mb-2 text-right">{renderBoth('items_sold')}:</h4>
          <ScrollArea className="h-[150px] pr-4">
            {editedSale.items.length === 0 ? (
              <p className="text-center text-gray-500">{renderBoth('cart_empty')}</p>
            ) : (
              <div className="space-y-2">
                {editedSale.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-2 border rounded-md">
                    <Button variant="ghost" size="sm" onClick={() => handleRemoveItem(item.id)} className="text-red-500 hover:text-red-700 p-0 h-auto">
                      <XCircle className="h-4 w-4" />
                    </Button>
                    <div className="flex-1 text-right mr-2 break-words">
                      <p className="font-medium text-sm">{item.name_dv} ({item.name_en})</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{settings?.shop?.currency || 'MVR'} {item.price.toFixed(2)}</p>
                    </div>
                    <div className="flex items-center ml-4">
                      <Button variant="outline" size="sm" onClick={() => handleItemQtyChange(item.id, -1)}>-</Button>
                      <span className="mx-2 w-8 text-center">{item.qty}</span>
                      <Button variant="outline" size="sm" onClick={() => handleItemQtyChange(item.id, 1)}>+</Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
        <DialogFooter className="flex justify-between">
          <Button variant="outline" onClick={onClose} className="font-faruma">
            {renderBoth('cancel')}
          </Button>
          <Button onClick={handleSave} className="font-faruma">
            {renderBoth('save_changes')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SaleEditDialog;