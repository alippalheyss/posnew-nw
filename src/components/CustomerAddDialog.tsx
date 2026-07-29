"use client";

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { showSuccess, showError } from '@/utils/toast';
import { useAppContext, Customer } from '@/context/AppContext';
import { UserPlus, User, Phone, Mail, CreditCard, Hash } from 'lucide-react';

interface CustomerAddDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (newCustomer: Customer) => void;
}

const CustomerAddDialog: React.FC<CustomerAddDialogProps> = ({ isOpen, onClose, onAdd }) => {
  const { t } = useTranslation();
  const { customers, getNextCustomerCode } = useAppContext();
  const [newCustomer, setNewCustomer] = useState<Omit<Customer, 'id'>>({
    code: '',
    name_dv: '',
    name_en: '',
    phone: '',
    email: '',
    credit_limit: 0,
    loyalty_points: 0,
    outstanding_balance: 0,
    settlement_history: [],
  });

  useEffect(() => {
    if (isOpen) {
      setNewCustomer(prev => ({ ...prev, code: getNextCustomerCode() }));
    } else {
      setNewCustomer({
        code: '',
        name_dv: '',
        name_en: '',
        phone: '',
        email: '',
        credit_limit: 0,
        loyalty_points: 0,
        outstanding_balance: 0,
        settlement_history: [],
      });
    }
  }, [isOpen, customers]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setNewCustomer(prev => {
      if (id === 'credit_limit') {
        return { ...prev, [id]: parseFloat(value) || 0 };
      }
      return { ...prev, [id]: value };
    });
  };

  const handleAdd = () => {
    if (!newCustomer.name_dv || !newCustomer.name_en || !newCustomer.code || !newCustomer.phone) {
      showError(t('fill_all_fields_error'));
      return;
    }

    const customerToAdd: Customer = {
      ...newCustomer,
      id: `cust-${Date.now()}`,
    };
    onAdd(customerToAdd);
    onClose();
  };

  const renderBoth = (key: string, options?: any) => (
    <>
      {t(key, options)} ({t(key, { ...options, lng: 'en' })})
    </>
  );

  const handleFocus = (event: React.FocusEvent<HTMLInputElement>) => {
    event.target.select();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] font-faruma bg-card border-border text-foreground" dir="rtl">
        <DialogHeader className="text-right">
          <DialogTitle className="text-2xl font-black flex items-center justify-end gap-3">
             {renderBoth('add_new_customer')} <UserPlus className="h-6 w-6 text-primary" />
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {renderBoth('add_new_customer_description')}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-6">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name_dv" className="text-right block text-[10px] font-black uppercase text-muted-foreground tracking-widest">{renderBoth('customer_name')} (ދިވެހި)*</Label>
                <div className="relative">
                   <User className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                   <Input id="name_dv" value={newCustomer.name_dv} onChange={handleChange} className="bg-muted border-border h-12 rounded-xl text-right pr-10 font-bold" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name_en" className="text-right block text-[10px] font-black uppercase text-muted-foreground tracking-widest">{renderBoth('customer_name')} (English)*</Label>
                <div className="relative">
                   <User className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                   <Input id="name_en" value={newCustomer.name_en} onChange={handleChange} className="bg-muted border-border h-12 rounded-xl text-right pr-10 font-bold" />
                </div>
              </div>
           </div>

           <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="code" className="text-right block text-[10px] font-black uppercase text-muted-foreground tracking-widest">{renderBoth('customer_code')}</Label>
                <div className="relative">
                   <Hash className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                   <Input id="code" value={newCustomer.code} readOnly className="bg-muted border-border h-11 rounded-xl text-right pr-10 font-mono text-sm opacity-50" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-right block text-[10px] font-black uppercase text-muted-foreground tracking-widest">{renderBoth('customer_phone')}*</Label>
                <div className="relative">
                   <Phone className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                   <Input id="phone" value={newCustomer.phone} onChange={handleChange} className="bg-muted border-border h-12 rounded-xl text-right pr-10 font-bold" />
                </div>
              </div>
           </div>

           <div className="space-y-2">
              <Label htmlFor="email" className="text-right block text-[10px] font-black uppercase text-muted-foreground tracking-widest">{renderBoth('customer_email')}</Label>
              <div className="relative">
                 <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                 <Input id="email" type="email" value={newCustomer.email} onChange={handleChange} className="bg-muted border-border h-12 rounded-xl text-right pr-10" />
              </div>
           </div>

           <div className="space-y-2">
              <Label htmlFor="credit_limit" className="text-right block text-[10px] font-black uppercase text-muted-foreground tracking-widest">{renderBoth('credit_limit')}</Label>
              <div className="relative">
                 <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-primary">MVR</span>
                 <Input id="credit_limit" type="number" value={newCustomer.credit_limit} onChange={handleChange} onFocus={handleFocus} className="bg-muted border-border h-14 rounded-2xl text-right pr-4 text-2xl font-black text-foreground" />
              </div>
           </div>
        </div>

        <DialogFooter className="gap-3 pt-4 border-t border-border">
          <Button variant="ghost" onClick={onClose} className="flex-1 h-12 border-border hover:bg-muted text-foreground font-black uppercase tracking-widest">
            {renderBoth('cancel')}
          </Button>
          <Button onClick={handleAdd} className="flex-1 h-12 bg-primary hover:bg-primary/90 font-black uppercase tracking-widest">
            {renderBoth('add_customer')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CustomerAddDialog;