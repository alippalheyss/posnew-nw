"use client";

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { showSuccess, showError } from '@/utils/toast';
import { useAppContext, Customer } from '@/context/AppContext'; // Import Customer type

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
      // Reset form when dialog closes
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
      id: `cust-${Date.now()}`, // Generate a unique ID
    };
    onAdd(customerToAdd);
    showSuccess(t('customer_added_successfully'));
    onClose();
  };

  const renderBoth = (key: string, options?: any) => (
    <>
      {t(key, options)} ({t(key, { ...options, lng: 'en' })})
    </>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] font-faruma" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-right">{renderBoth('add_new_customer')}</DialogTitle>
          <DialogDescription className="text-right">
            {renderBoth('add_new_customer_description')}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-3 items-center gap-4">
            <Label htmlFor="name_dv" className="text-right">
              {renderBoth('customer_name')} (ދިވެހި)
            </Label>
            <Input
              id="name_dv"
              value={newCustomer.name_dv}
              onChange={handleChange}
              className="col-span-2 text-right"
            />
          </div>
          <div className="grid grid-cols-3 items-center gap-4">
            <Label htmlFor="name_en" className="text-right">
              {renderBoth('customer_name')} (English)
            </Label>
            <Input
              id="name_en"
              value={newCustomer.name_en}
              onChange={handleChange}
              className="col-span-2 text-right"
            />
          </div>
          <div className="grid grid-cols-3 items-center gap-4">
            <Label htmlFor="code" className="text-right">
              {renderBoth('customer_code')}
            </Label>
            <Input
              id="code"
              value={newCustomer.code}
              readOnly // Make customer code read-only
              className="col-span-2 text-right"
            />
          </div>
          <div className="grid grid-cols-3 items-center gap-4">
            <Label htmlFor="phone" className="text-right">
              {renderBoth('customer_phone')}
            </Label>
            <Input
              id="phone"
              value={newCustomer.phone}
              onChange={handleChange}
              className="col-span-2 text-right"
            />
          </div>
          <div className="grid grid-cols-3 items-center gap-4">
            <Label htmlFor="email" className="text-right">
              {renderBoth('customer_email')}
            </Label>
            <Input
              id="email"
              type="email"
              value={newCustomer.email}
              onChange={handleChange}
              className="col-span-2 text-right"
            />
          </div>
          <div className="grid grid-cols-3 items-center gap-4">
            <Label htmlFor="credit_limit" className="text-right">
              {renderBoth('credit_limit')}
            </Label>
            <Input
              id="credit_limit"
              type="number"
              value={newCustomer.credit_limit}
              onChange={handleChange}
              className="col-span-2 text-right"
            />
          </div>
        </div>
        <DialogFooter className="flex justify-between">
          <Button variant="outline" onClick={onClose} className="font-faruma">
            {renderBoth('cancel')}
          </Button>
          <Button onClick={handleAdd} className="font-faruma">
            {renderBoth('add_customer')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CustomerAddDialog;