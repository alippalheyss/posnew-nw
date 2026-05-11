"use client";

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, PlusCircle, PencilLine, Users, Phone, Mail, DollarSign, Award, MoreVertical, RefreshCcw } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import CustomerAddDialog from '@/components/CustomerAddDialog';
import { useAppContext, Customer } from '@/context/AppContext';
import { showSuccess, showError } from '@/utils/toast';
import { cn } from '@/lib/utils';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Customers = () => {
  const { t } = useTranslation();
  const { customers, setCustomers, settings, addCustomer, updateCustomer, refreshCustomers } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditCustomerDialogOpen, setIsEditCustomerDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isAddCustomerDialogOpen, setIsAddCustomerDialogOpen] = useState(false);

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

  const handleSaveCustomer = async () => {
    if (!editingCustomer) return;
    try {
      await updateCustomer(editingCustomer);
      showSuccess(t('customer_updated_successfully'));
      setIsEditCustomerDialogOpen(false);
      setEditingCustomer(null);
    } catch (error) {
      console.error('Error updating customer:', error);
    }
  };

  const handleAddNewCustomer = (newCustomer: Customer) => {
    addCustomer(newCustomer);
    setIsAddCustomerDialogOpen(false);
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
    <div className="p-6 font-faruma flex flex-col h-full bg-[#050510] text-white overflow-hidden" dir="rtl">
      {/* Header Section */}
      <div className="flex justify-between items-center mb-8">
        <div className="text-right">
           <h1 className="text-3xl font-black text-white flex items-center justify-end gap-3">
             {renderBoth('customers')} <Users className="h-8 w-8 text-primary" />
           </h1>
           <p className="text-sm text-white/40 mt-1">Manage your clients, credit limits and loyalty points</p>
        </div>

        <div className="flex gap-3">
           <Button 
             variant="outline"
             onClick={refreshCustomers}
             className="gap-2 border-white/10 hover:bg-white/5 h-11 px-6 rounded-xl font-black text-white"
           >
             <RefreshCcw className="h-4 w-4" /> Sync All Customers
           </Button>
           <Button 
             onClick={() => setIsAddCustomerDialogOpen(true)}
             className="gap-2 bg-primary hover:bg-primary/90 h-11 px-6 rounded-xl font-black shadow-[0_0_20px_rgba(0,132,255,0.3)]"
           >
             <PlusCircle className="h-4 w-4" /> {renderBoth('add_new_customer')}
           </Button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative mb-8">
         <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20" />
         <Input 
           placeholder={renderBothString('search_customers')}
           value={searchTerm}
           onChange={(e) => setSearchTerm(e.target.value)}
           className="w-full bg-white/5 border-white/10 rounded-xl pr-12 h-14 text-right font-bold focus:border-primary/50 transition-all text-lg"
         />
      </div>

      {/* Customers Grid */}
      <ScrollArea className="flex-1 custom-scrollbar">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-6">
          {filteredCustomers.map((customer) => (
            <Card key={customer.id} className="bg-[#0a0a1a] border-white/5 hover:border-primary/30 transition-all rounded-3xl overflow-hidden group">
              <CardContent className="p-0">
                 <div className="p-6">
                    <div className="flex justify-between items-start mb-6">
                       <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                          <Users className="h-6 w-6" />
                       </div>
                       <DropdownMenu>
                         <DropdownMenuTrigger asChild>
                           <Button variant="ghost" size="icon" className="h-8 w-8 text-white/20 hover:text-white">
                             <MoreVertical className="h-4 w-4" />
                           </Button>
                         </DropdownMenuTrigger>
                         <DropdownMenuContent className="bg-[#0a0a1a] border-white/10 text-white" dir="rtl">
                           <DropdownMenuItem onClick={() => handleEditClick(customer)} className="gap-2 text-right justify-end hover:bg-white/5 cursor-pointer">
                             {renderBoth('edit')} <PencilLine className="h-4 w-4 text-blue-400" />
                           </DropdownMenuItem>
                         </DropdownMenuContent>
                       </DropdownMenu>
                    </div>

                    <div className="text-right mb-6">
                       <h3 className="text-xl font-black text-white leading-tight mb-1">{customer.name_dv}</h3>
                       <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">{customer.name_en}</p>
                       <p className="text-[10px] font-mono text-primary mt-2">ID: {customer.code}</p>
                    </div>

                    <div className="space-y-3 mb-6">
                       <div className="flex items-center justify-end gap-3 text-white/60">
                          <span className="text-xs font-bold">{customer.phone}</span>
                          <Phone className="h-3.5 w-3.5 text-white/20" />
                       </div>
                       {customer.email && (
                         <div className="flex items-center justify-end gap-3 text-white/60">
                            <span className="text-xs font-bold truncate max-w-[150px]">{customer.email}</span>
                            <Mail className="h-3.5 w-3.5 text-white/20" />
                         </div>
                       )}
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-6">
                       <div className="bg-white/5 p-3 rounded-2xl border border-white/5 text-right">
                          <p className="text-[8px] font-black text-white/30 uppercase tracking-widest mb-1">{renderBoth('credit_limit')}</p>
                          <p className="text-sm font-black text-orange-500">{settings.shop.currency} {customer.credit_limit.toFixed(0)}</p>
                       </div>
                       <div className="bg-white/5 p-3 rounded-2xl border border-white/5 text-right">
                          <p className="text-[8px] font-black text-white/30 uppercase tracking-widest mb-1">{renderBoth('loyalty_points')}</p>
                          <p className="text-sm font-black text-blue-400">{(customer.loyalty_points || 0).toFixed(0)} <span className="text-[8px] font-normal opacity-50">PTS</span></p>
                       </div>
                    </div>

                    <Button 
                      onClick={() => handleEditClick(customer)}
                      className="w-full bg-white/5 hover:bg-white/10 text-white text-[10px] font-black h-10 rounded-xl border border-white/10 transition-all uppercase tracking-widest"
                    >
                      View Details & Edit
                    </Button>
                 </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>

      {/* Edit Customer Dialog */}
      <Dialog open={isEditCustomerDialogOpen} onOpenChange={setIsEditCustomerDialogOpen}>
        <DialogContent className="sm:max-w-[450px] font-faruma bg-[#0a0a1a] border-white/10 text-white" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right text-2xl font-black">{renderBoth('edit_customer')}</DialogTitle>
            <DialogDescription className="text-right text-white/40">
              {renderBoth('edit_customer_description')}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-5 py-6">
            <div className="space-y-2">
              <Label htmlFor="customerNameDv" className="text-right block text-[10px] font-black uppercase text-white/40 tracking-widest">
                {renderBoth('customer_name')} (ދިވެހި)
              </Label>
              <Input
                id="customerNameDv"
                value={editingCustomer?.name_dv || ''}
                onChange={(e) => setEditingCustomer(prev => prev ? { ...prev, name_dv: e.target.value } : null)}
                className="text-right h-12 bg-white/5 border-white/10 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customerNameEn" className="text-right block text-[10px] font-black uppercase text-white/40 tracking-widest">
                {renderBoth('customer_name')} (English)
              </Label>
              <Input
                id="customerNameEn"
                value={editingCustomer?.name_en || ''}
                onChange={(e) => setEditingCustomer(prev => prev ? { ...prev, name_en: e.target.value } : null)}
                className="text-right h-12 bg-white/5 border-white/10 rounded-xl"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customerCode" className="text-right block text-[10px] font-black uppercase text-white/40 tracking-widest">
                  {renderBoth('customer_code')}
                </Label>
                <Input
                  id="customerCode"
                  value={editingCustomer?.code || ''}
                  readOnly 
                  className="text-right h-12 bg-white/5 border-white/10 rounded-xl opacity-50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customerPhone" className="text-right block text-[10px] font-black uppercase text-white/40 tracking-widest">
                  {renderBoth('customer_phone')}
                </Label>
                <Input
                  id="customerPhone"
                  value={editingCustomer?.phone || ''}
                  onChange={(e) => setEditingCustomer(prev => prev ? { ...prev, phone: e.target.value } : null)}
                  className="text-right h-12 bg-white/5 border-white/10 rounded-xl"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customerEmail" className="text-right block text-[10px] font-black uppercase text-white/40 tracking-widest">
                  {renderBoth('customer_email')}
                </Label>
                <Input
                  id="customerEmail"
                  type="email"
                  value={editingCustomer?.email || ''}
                  onChange={(e) => setEditingCustomer(prev => prev ? { ...prev, email: e.target.value } : null)}
                  className="text-right h-12 bg-white/5 border-white/10 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="creditLimit" className="text-right block text-[10px] font-black uppercase text-white/40 tracking-widest">
                  {renderBoth('credit_limit')}
                </Label>
                <Input
                  id="creditLimit"
                  type="number"
                  value={editingCustomer?.credit_limit || ''}
                  onChange={(e) => setEditingCustomer(prev => prev ? { ...prev, credit_limit: parseFloat(e.target.value) || 0 } : null)}
                  className="text-right h-12 bg-white/5 border-white/10 rounded-xl"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-3 pt-4 border-t border-white/5">
            <Button variant="ghost" onClick={() => setIsEditCustomerDialogOpen(false)} className="flex-1 border-white/10 hover:bg-white/5 text-white">
              {renderBoth('cancel')}
            </Button>
            <Button onClick={() => editingCustomer && handleSaveCustomer(editingCustomer)} className="flex-1 bg-primary hover:bg-primary/90 font-black">
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
    </div>
  );
};

export default Customers;