"use client";

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, PlusCircle, PencilLine, Trash2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import CustomerAddDialog from '@/components/CustomerAddDialog';
import { useAppContext, Customer } from '@/context/AppContext';
import { showSuccess } from '@/utils/toast';

const Customers = () => {
  const { t } = useTranslation();
  const { customers, updateCustomer, addCustomer, deleteCustomer, settings } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditCustomerDialogOpen, setIsEditCustomerDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isAddCustomerDialogOpen, setIsAddCustomerDialogOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);

  const filteredCustomers = customers.filter(customer =>
    customer.name_dv.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.name_en.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone.includes(searchTerm)
  );

  const handleEditClick = (customer: Customer) => {
    setEditingCustomer({ ...customer });
    setIsEditCustomerDialogOpen(true);
  };

  const handleSaveCustomer = async (updatedCustomer: Customer) => {
    await updateCustomer(updatedCustomer);
    setIsEditCustomerDialogOpen(false);
    setEditingCustomer(null);
  };

  const handleAddNewCustomer = async (newCustomer: Customer) => {
    await addCustomer(newCustomer);
    setIsAddCustomerDialogOpen(false);
  };

  const handleDeleteClick = (customer: Customer) => {
    setCustomerToDelete(customer);
    setIsDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (customerToDelete) {
      await deleteCustomer(customerToDelete.id);
      setIsDeleteConfirmOpen(false);
      setCustomerToDelete(null);
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
    <div className="p-4 font-faruma flex flex-col h-full">
      <Card className="flex-1">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-right text-xl">{renderBoth('customers')}</CardTitle>
          <div className="flex items-center space-x-2">
            <Button className="flex items-center" onClick={() => setIsAddCustomerDialogOpen(true)}>
              <PlusCircle className="h-4 w-4 ml-2" />
              {renderBoth('add_customer')}
            </Button>
            <Input
              placeholder={renderBothString('search_customers')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="text-right"
              dir="rtl"
            />
            <Search className="h-5 w-5 text-gray-500" />
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden">
          <ScrollArea className="h-[calc(100vh-200px)] pr-4">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {filteredCustomers.map((customer) => (
                <Card key={customer.id} className="cursor-pointer hover:shadow-lg transition-shadow duration-200 text-right">
                  <CardContent className="p-3">
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleEditClick(customer)} className="p-0 h-auto">
                          <PencilLine className="h-4 w-4 text-blue-500 hover:text-blue-700" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteClick(customer)} className="p-0 h-auto">
                          <Trash2 className="h-4 w-4 text-red-500 hover:text-red-700" />
                        </Button>
                      </div>
                      <p className="font-semibold text-sm break-words">{customer.name_dv} ({customer.name_en})</p>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 break-words">Code: {customer.code}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 break-words">Phone: {customer.phone}</p>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-[10px] uppercase font-bold text-gray-500">Credit Limit</span>
                      <span className="text-xs font-mono">{settings.shop.currency} {customer.credit_limit.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center mt-0.5">
                      <span className="text-[10px] uppercase font-bold text-red-600">Outstanding</span>
                      <span className="text-xs font-mono font-bold text-red-700">{settings.shop.currency} {(customer.outstanding_balance || 0).toFixed(2)}</span>
                    </div>
                    <div className="mt-2 pt-2 border-t flex justify-between items-center text-xs">
                      <span className="font-bold text-blue-600 dark:text-blue-400 uppercase tracking-tight">{t('loyalty_points')}</span>
                      <span className="font-black text-blue-700 dark:text-blue-300">{(customer.loyalty_points || 0).toFixed(0)}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Edit Customer Dialog */}
      <Dialog open={isEditCustomerDialogOpen} onOpenChange={setIsEditCustomerDialogOpen}>
        <DialogContent className="sm:max-w-[425px] font-faruma" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right">{renderBoth('edit_customer')}</DialogTitle>
            <DialogDescription className="text-right">
              {renderBoth('edit_customer_description')}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-3 items-center gap-4">
              <Label htmlFor="customerNameDv" className="text-right">
                {renderBoth('customer_name')} (ދިވެހި)
              </Label>
              <Input
                id="customerNameDv"
                value={editingCustomer?.name_dv || ''}
                onChange={(e) => setEditingCustomer(prev => prev ? { ...prev, name_dv: e.target.value } : null)}
                className="col-span-2 text-right"
              />
            </div>
            <div className="grid grid-cols-3 items-center gap-4">
              <Label htmlFor="customerNameEn" className="text-right">
                {renderBoth('customer_name')} (English)
              </Label>
              <Input
                id="customerNameEn"
                value={editingCustomer?.name_en || ''}
                onChange={(e) => setEditingCustomer(prev => prev ? { ...prev, name_en: e.target.value } : null)}
                className="col-span-2 text-right"
              />
            </div>
            <div className="grid grid-cols-3 items-center gap-4">
              <Label htmlFor="customerCode" className="text-right">
                {renderBoth('customer_code')}
              </Label>
              <Input
                id="customerCode"
                value={editingCustomer?.code || ''}
                readOnly // Make customer code read-only
                className="col-span-2 text-right"
              />
            </div>
            <div className="grid grid-cols-3 items-center gap-4">
              <Label htmlFor="customerPhone" className="text-right">
                {renderBoth('customer_phone')}
              </Label>
              <Input
                id="customerPhone"
                value={editingCustomer?.phone || ''}
                onChange={(e) => setEditingCustomer(prev => prev ? { ...prev, phone: e.target.value } : null)}
                className="col-span-2 text-right"
              />
            </div>
            <div className="grid grid-cols-3 items-center gap-4">
              <Label htmlFor="customerEmail" className="text-right">
                {renderBoth('customer_email')}
              </Label>
              <Input
                id="customerEmail"
                type="email"
                value={editingCustomer?.email || ''}
                onChange={(e) => setEditingCustomer(prev => prev ? { ...prev, email: e.target.value } : null)}
                className="col-span-2 text-right"
              />
            </div>
            <div className="grid grid-cols-3 items-center gap-4">
              <Label htmlFor="creditLimit" className="text-right">
                {renderBoth('credit_limit')}
              </Label>
              <Input
                id="creditLimit"
                type="number"
                value={editingCustomer?.credit_limit || ''}
                onChange={(e) => setEditingCustomer(prev => prev ? { ...prev, credit_limit: parseFloat(e.target.value) || 0 } : null)}
                className="col-span-2 text-right"
              />
            </div>
          </div>
          <DialogFooter className="flex justify-between">
            <Button variant="outline" onClick={() => setIsEditCustomerDialogOpen(false)} className="font-faruma">
              {renderBoth('cancel')}
            </Button>
            <Button onClick={() => editingCustomer && handleSaveCustomer(editingCustomer)} className="font-faruma">
              {renderBoth('save_changes')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Customer Dialog */}
      <CustomerAddDialog
        isOpen={isAddCustomerDialogOpen}
        onClose={() => setIsAddCustomerDialogOpen(false)}
        onAdd={handleAddNewCustomer}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-[400px] font-faruma" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right text-red-600">{renderBoth('delete_customer')}</DialogTitle>
            <DialogDescription className="text-right">
              {renderBoth('delete_customer_confirm')}
              {customerToDelete && (
                <span className="block mt-2 font-semibold text-foreground">
                  {customerToDelete.name_dv} ({customerToDelete.name_en})
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex justify-between gap-2">
            <Button variant="outline" onClick={() => setIsDeleteConfirmOpen(false)} className="font-faruma">
              {renderBoth('cancel')}
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete} className="font-faruma">
              {renderBoth('delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Customers;