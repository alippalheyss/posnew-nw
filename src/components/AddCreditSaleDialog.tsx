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
import { getAdaptedImageUrl } from '@/utils/imageUtils';

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
      <DialogContent className="sm:max-w-[950px] font-faruma max-h-[92vh] overflow-y-auto apple-glass-dialog border-white/20 dark:border-white/10 text-foreground shadow-2xl rounded-3xl p-6 sm:p-7" dir="rtl">
        <DialogHeader className="text-right pb-3 border-b border-white/10 dark:border-white/5">
          <DialogTitle className="text-xl font-black text-foreground">{renderBoth('add_new_credit_sale')}</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {renderBoth('add_new_credit_sale_description')}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 py-4">
          {/* Products Selection */}
          <div className="flex flex-col apple-glass-card p-5 rounded-3xl border border-white/20 dark:border-white/10">
            <h3 className="font-black text-sm mb-3 text-right text-foreground">{renderBoth('products')}</h3>
            <Input
              placeholder={renderBothString('search_products')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="mb-4 text-right apple-glass-input rounded-2xl h-11"
              dir="rtl"
            />
            <ScrollArea className="h-[380px] pr-2 custom-scrollbar">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {filteredProducts.map((product) => (
                  <Button
                    key={product.id}
                    variant="outline"
                    className="flex flex-col h-auto p-2.5 text-center apple-glass-card hover:border-primary/50 hover:bg-primary/10 transition-all rounded-2xl border-white/15 dark:border-white/10 active:scale-95"
                    onClick={() => addToCart(product)}
                  >
                    <img src={getAdaptedImageUrl(product.image, product.name_en || product.name_dv, product.item_code)} alt={product.name_dv} className="w-12 h-12 object-cover mb-1.5 rounded-xl shadow-xs" />
                    <p className="font-bold text-xs break-words line-clamp-1 text-foreground">{product.name_dv}</p>
                    <p className="text-[10px] text-muted-foreground break-words line-clamp-1">({product.name_en})</p>
                    <p className="text-xs font-black mt-1 text-primary font-mono">{settings.shop.currency} {product.price.toFixed(2)}</p>
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Cart and Customer Selection */}
          <div className="flex flex-col apple-glass-card p-5 rounded-3xl border border-white/20 dark:border-white/10">
            <h3 className="font-black text-sm mb-3 text-right text-foreground">{renderBoth('transaction_details')}</h3>
            <div className="grid grid-cols-3 items-center gap-3 mb-4">
              <Label htmlFor="customerSelect" className="text-right text-xs font-bold text-muted-foreground">
                {renderBoth('customer')}
              </Label>
              <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openCombobox}
                    className="col-span-2 justify-between h-11 apple-glass-input rounded-2xl font-bold text-xs"
                  >
                    <span className="truncate">
                      {selectedCustomer
                        ? `${selectedCustomer.name_dv} (${selectedCustomer.name_en})`
                        : renderBoth('select_customer')}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0 apple-glass-dialog rounded-2xl">
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

            <Separator className="mb-4 bg-white/10 dark:bg-white/5" />

            <h4 className="font-bold mb-2 text-right flex justify-between items-center text-xs">
              <span className="text-muted-foreground font-mono">{cartItems.length} {t('items')}</span>
              <span className="text-foreground font-black">{renderBoth('cart')}</span>
            </h4>

            <ScrollArea className="h-[220px] mb-4 bg-black/10 dark:bg-white/5 rounded-2xl border border-white/10 p-2 custom-scrollbar backdrop-blur-md">
              {cartItems.length === 0 ? (
                <p className="text-center text-muted-foreground py-10 text-xs font-bold">{renderBoth('cart_empty')}</p>
              ) : (
                <div className="space-y-1.5">
                  {cartItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-2 rounded-xl bg-background/40 border border-white/10">
                      <Button variant="ghost" size="sm" onClick={() => removeFromCart(item.id)} className="text-red-500 hover:text-red-600 hover:bg-red-500/10 p-1 h-auto rounded-lg">
                        <XCircle className="h-4 w-4" />
                      </Button>
                      <div className="flex-1 text-right mx-2 overflow-hidden">
                        <p className="font-bold text-xs truncate text-foreground">{item.name_dv} ({item.name_en})</p>
                        <p className="text-[10px] text-muted-foreground font-mono">{settings.shop.currency} {item.price.toFixed(2)}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Button variant="outline" size="icon" className="h-6 w-6 rounded-lg border-white/20 hover:bg-white/10" onClick={() => updateCartItemQty(item.id, -1)}>-</Button>
                        <span className="w-6 text-center text-xs font-black font-mono">{item.qty}</span>
                        <Button variant="outline" size="icon" className="h-6 w-6 rounded-lg border-white/20 hover:bg-white/10" onClick={() => updateCartItemQty(item.id, 1)}>+</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            <div className="mt-auto space-y-2 bg-black/10 dark:bg-white/5 p-4 rounded-2xl border border-white/10 backdrop-blur-md">
              <div className="flex justify-between text-xs text-muted-foreground font-bold">
                <span>{renderBoth('subtotal')}:</span>
                <span className="font-mono text-foreground">{settings.shop.currency} {subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground font-bold">
                <span>GST ({settings.shop.taxRate}%):</span>
                <span className="font-mono text-foreground">{settings.shop.currency} {gstAmount.toFixed(2)}</span>
              </div>
              <Separator className="bg-white/10 dark:bg-white/5" />
              <div className="flex justify-between text-base font-black text-primary font-mono">
                <span>{renderBoth('grand_total')}:</span>
                <span>{settings.shop.currency} {grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
        <DialogFooter className="flex flex-row justify-between gap-3 pt-3 border-t border-white/10 dark:border-white/5">
          <Button variant="outline" onClick={onClose} className="font-faruma flex-1 rounded-2xl h-11 border-white/20 dark:border-white/10 hover:bg-white/10 text-foreground font-bold active:scale-[0.98] transition-all">
            {renderBoth('cancel')}
          </Button>
          <Button
            onClick={handleAddCreditSale}
            disabled={!selectedCustomer || cartItems.length === 0}
            className="font-faruma flex-1 h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-black rounded-2xl shadow-lg shadow-primary/25 active:scale-[0.98] transition-all"
          >
            {renderBoth('confirm_credit_sale')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddCreditSaleDialog;