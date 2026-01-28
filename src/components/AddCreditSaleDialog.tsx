"use client";

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Search, XCircle, Check, ChevronsUpDown } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import { useAppContext, Product, Customer, CartItem, Sale } from '@/context/AppContext';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { cn } from '@/lib/utils';

interface NewCreditSale {
  id: string;
  date: string;
  customer: Customer;
  items: CartItem[];
  grandTotal: number;
  paymentMethod: 'credit';
}

interface AddCreditSaleDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (newSale: NewCreditSale) => void;
}

const AddCreditSaleDialog: React.FC<AddCreditSaleDialogProps> = ({ isOpen, onClose, onAdd }) => {
  const { t } = useTranslation();
  const { products, customers, settings } = useAppContext();
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [openCombobox, setOpenCombobox] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setSelectedCustomer(null);
      setCartItems([]);
      setSearchTerm('');
    }
  }, [isOpen]);

  const filteredProducts = products.filter(product =>
    product.name_dv.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.name_en.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.barcode.includes(searchTerm) ||
    product.item_code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addToCart = (product: Product) => {
    setCartItems(prevItems => {
      const existingItem = prevItems.find((item) => item.id === product.id);
      if (existingItem) {
        return prevItems.map((item) =>
          item.id === product.id ? { ...item, qty: item.qty + 1 } : item
        );
      } else {
        return [...prevItems, { ...product, qty: 1 }];
      }
    });
  };

  const updateCartItemQty = (id: string, delta: number) => {
    setCartItems(prevItems =>
      prevItems.map((item) =>
        item.id === id ? { ...item, qty: item.qty + delta } : item
      ).filter(item => item.qty > 0)
    );
  };

  const removeFromCart = (id: string) => {
    setCartItems(prevItems => prevItems.filter(item => item.id !== id));
  };

  const calculateTotals = () => {
    const total = cartItems.reduce((sum, item) => sum + item.price * item.qty, 0);
    const gstRate = settings.shop.taxRate / 100;
    const subtotalExcludingGst = total / (1 + gstRate);
    const gstAmount = total - subtotalExcludingGst;
    return { subtotal: subtotalExcludingGst, gstAmount, grandTotal: total };
  };

  const { subtotal, gstAmount, grandTotal } = calculateTotals();

  const handleAddCreditSale = () => {
    if (!selectedCustomer) {
      showError(t('select_customer_for_credit_error'));
      return;
    }
    if (cartItems.length === 0) {
      showError(t('cart_empty_error'));
      return;
    }
    if (selectedCustomer.credit_limit < grandTotal) {
      showError(t('credit_limit_exceeded_error', { customerName: selectedCustomer.name_dv }));
      return;
    }

    const newSale: NewCreditSale = {
      id: `sale-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      customer: selectedCustomer,
      items: cartItems,
      grandTotal: grandTotal,
      paymentMethod: 'credit',
    };
    onAdd(newSale);
    showSuccess(t('credit_sale_successful'));
    onClose();
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
      <DialogContent className="sm:max-w-[950px] font-faruma max-h-[90vh] overflow-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-right">{renderBoth('add_new_credit_sale')}</DialogTitle>
          <DialogDescription className="text-right">
            {renderBoth('add_new_credit_sale_description')}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 py-4">
          {/* Products Selection */}
          <div className="flex flex-col border p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
            <h3 className="font-semibold mb-4 text-right">{renderBoth('products')}</h3>
            <Input
              placeholder={renderBothString('search_products')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="mb-4 text-right"
              dir="rtl"
            />
            <ScrollArea className="h-[400px] pr-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {filteredProducts.map((product) => (
                  <Button
                    key={product.id}
                    variant="outline"
                    className="flex flex-col h-auto p-2 text-center hover:bg-primary hover:text-white transition-colors"
                    onClick={() => addToCart(product)}
                  >
                    <img src={product.image} alt={product.name_dv} className="w-10 h-10 object-cover mb-1 rounded-md" />
                    <p className="font-semibold text-[10px] break-words line-clamp-1">{product.name_dv}</p>
                    <p className="text-[10px] text-gray-500 opacity-80 break-words line-clamp-1">({product.name_en})</p>
                    <p className="text-[10px] font-bold mt-1">{settings.shop.currency} {product.price.toFixed(2)}</p>
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Cart and Customer Selection */}
          <div className="flex flex-col border p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
            <h3 className="font-semibold mb-4 text-right">{renderBoth('transaction_details')}</h3>
            <div className="grid grid-cols-3 items-center gap-4 mb-6">
              <Label htmlFor="customerSelect" className="text-right">
                {renderBoth('customer')}
              </Label>
              <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openCombobox}
                    className="col-span-2 justify-between h-10"
                  >
                    <span className="truncate">
                      {selectedCustomer
                        ? `${selectedCustomer.name_dv} (${selectedCustomer.name_en})`
                        : renderBoth('select_customer')}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                  <Command>
                    <CommandInput placeholder={renderBothString('search_customers')} />
                    <CommandEmpty>{renderBoth('no_customer_found')}</CommandEmpty>
                    <CommandGroup>
                      {customers.map((customer) => (
                        <CommandItem
                          key={customer.id}
                          value={`${customer.name_dv} ${customer.name_en} ${customer.code}`}
                          onSelect={() => {
                            setSelectedCustomer(customer);
                            setOpenCombobox(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedCustomer?.id === customer.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {customer.name_dv} ({customer.name_en})
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <Separator className="mb-4" />

            <h4 className="font-semibold mb-2 text-right flex justify-between items-center">
              <span className="text-xs text-gray-500 font-normal">{cartItems.length} {t('items')}</span>
              {renderBoth('cart')}
            </h4>

            <ScrollArea className="h-[250px] mb-4 bg-white dark:bg-gray-900 rounded-md border p-2">
              {cartItems.length === 0 ? (
                <p className="text-center text-gray-500 py-10">{renderBoth('cart_empty')}</p>
              ) : (
                <div className="space-y-2">
                  {cartItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-2 border-b last:border-0">
                      <Button variant="ghost" size="sm" onClick={() => removeFromCart(item.id)} className="text-red-500 hover:text-red-700 p-0 h-auto">
                        <XCircle className="h-4 w-4" />
                      </Button>
                      <div className="flex-1 text-right mx-2 overflow-hidden">
                        <p className="font-medium text-xs truncate">{item.name_dv} ({item.name_en})</p>
                        <p className="text-[10px] text-gray-500">{settings.shop.currency} {item.price.toFixed(2)}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateCartItemQty(item.id, -1)}>-</Button>
                        <span className="w-6 text-center text-xs font-bold">{item.qty}</span>
                        <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateCartItemQty(item.id, 1)}>+</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            <div className="mt-auto space-y-2 bg-white dark:bg-gray-900 p-4 rounded-lg border">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">{renderBoth('subtotal')}:</span>
                <span className="font-medium">{settings.shop.currency} {subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">GST ({settings.shop.taxRate}%):</span>
                <span className="font-medium">{settings.shop.currency} {gstAmount.toFixed(2)}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-lg font-bold text-primary">
                <span>{renderBoth('grand_total')}:</span>
                <span>{settings.shop.currency} {grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
        <DialogFooter className="flex justify-between gap-4 mt-4">
          <Button variant="outline" onClick={onClose} className="font-faruma flex-1">
            {renderBoth('cancel')}
          </Button>
          <Button
            onClick={handleAddCreditSale}
            disabled={!selectedCustomer || cartItems.length === 0}
            className="font-faruma flex-1 bg-primary hover:bg-primary/90"
          >
            {renderBoth('confirm_credit_sale')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddCreditSaleDialog;