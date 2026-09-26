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
import { Progress } from "@/components/ui/progress";
import { formatDate } from '@/utils/formatters';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatCreditStatementViberMessage, shareViaViber } from '@/utils/viberHelper';
import { showSuccess, showError } from '@/utils/toast';
import { TelegramConnectDialog } from '@/components/TelegramConnectDialog';
import { sendTelegramOutstandingStatement } from '@/services/telegramService';
import { QrCode, Send, Loader2 } from 'lucide-react';

const Customers = () => {
  const { t } = useTranslation();
  const { customers, setCustomers, settings, addCustomer, updateCustomer, refreshCustomers, sales } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditCustomerDialogOpen, setIsEditCustomerDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isAddCustomerDialogOpen, setIsAddCustomerDialogOpen] = useState(false);
  const [isSavingCustomer, setIsSavingCustomer] = useState(false);
  const [telegramCustomer, setTelegramCustomer] = useState<Customer | null>(null);
  const [isTelegramDialogOpen, setIsTelegramDialogOpen] = useState(false);
  const [isSendingTelegram, setIsSendingTelegram] = useState<string | null>(null);

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
    if (!editingCustomer.name_dv?.trim() && !editingCustomer.name_en?.trim()) {
      showError(t('fill_all_fields_error') || 'Please enter customer name');
      return;
    }
    try {
      setIsSavingCustomer(true);
      await updateCustomer(editingCustomer);
      setIsEditCustomerDialogOpen(false);
      setEditingCustomer(null);
    } catch (error) {
      console.error('Error updating customer:', error);
    } finally {
      setIsSavingCustomer(false);
    }
  };

  const handleAddNewCustomer = (newCustomer: Customer) => {
    addCustomer(newCustomer);
    setIsAddCustomerDialogOpen(false);
  };

  const ViberIcon = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M19.39 3.55C17.43 1.95 14.54 1.25 11.53 1.25c-4.48 0-8.23 2.5-9.84 6.37C.71 9.98.67 12.38 1.57 14.67c.69 1.76 1.83 3.32 3.33 4.54l-.56 2.37c-.16.66.42 1.25 1.07 1.07l2.84-.79c1.17.44 2.42.69 3.73.69 4.47 0 8.22-2.5 9.83-6.37.98-2.36 1.02-4.76.12-7.05-.68-1.76-1.83-3.32-3.33-4.54l.79-1.04zm-1.85 11.83c-1.28 3.08-4.32 5.07-7.96 5.07-1.06 0-2.08-.18-3.04-.53l-2.09.58.42-1.78c-1.22-1-2.15-2.27-2.7-3.7-.72-1.84-.69-3.77.1-5.67 1.28-3.08 4.31-5.07 7.95-5.07 2.47 0 4.83.58 6.43 1.89 1.23 1 2.16 2.27 2.71 3.7.72 1.85.69 3.78-.1 5.68l-.72-.17z" />
      <path d="M13.2 7.74c-.2-.04-.41.08-.45.28-.05.2.07.41.28.45 1.48.27 2.65 1.44 2.92 2.92.03.18.18.31.36.31.03 0 .06 0 .09-.02.2-.04.33-.24.29-.45-.33-1.81-1.77-3.25-3.49-3.49zm-.52-1.85c-.2-.04-.4.08-.44.28-.04.2.08.4.28.44 2.44.46 4.37 2.39 4.83 4.83.03.18.18.31.36.31.03 0 .05 0 .08-.01.2-.04.33-.24.29-.44-.52-2.82-2.76-5.05-5.4-5.41zm-1.7 6.47c-.24-.31-.59-.44-.9-.35-.34.1-.73.44-1.09.82-.41-.24-.87-.58-1.33-1.04-.46-.46-.8-.92-1.04-1.33.38-.36.72-.75.82-1.09.09-.31-.04-.66-.35-.9L7.4 8.04c-.32-.25-.76-.23-1.04.06l-.76.77c-.4.4-.55.98-.37 1.52.48 1.43 1.5 3.32 3.03 4.85 1.53 1.53 3.42 2.55 4.85 3.03.54.18 1.12.03 1.52-.37l.77-.76c.29-.28.31-.72.06-1.04l-1.48-1.69z" />
    </svg>
  );

  const TelegramIcon = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
    </svg>
  );

  const handleOpenTelegramConnect = (customer: Customer) => {
    setTelegramCustomer(customer);
    setIsTelegramDialogOpen(true);
  };

  const handleSendCustomerTelegram = async (customer: Customer) => {
    if (!customer.telegram_chat_id) {
      handleOpenTelegramConnect(customer);
      return;
    }

    let balance = Number(customer.outstanding_balance || 0);
    if (!balance || balance <= 0) {
      const custCreditSales = (sales || []).filter(s =>
        (s.customer?.id === customer.id) &&
        (s.paymentMethod?.toLowerCase() === 'credit' || (s.paymentMethod?.toLowerCase() === 'split' && s.splitDetails?.some((d: any) => d.method?.toLowerCase() === 'credit' && d.customerId === customer.id)))
      );
      const totalCredit = custCreditSales.reduce((sum, s) => {
        if (s.paymentMethod?.toLowerCase() === 'credit') return sum + (s.grandTotal || 0);
        const splitCredit = s.splitDetails?.filter((d: any) => d.method?.toLowerCase() === 'credit' && d.customerId === customer.id).reduce((ss: number, dd: any) => ss + dd.amount, 0) || 0;
        return sum + splitCredit;
      }, 0);
      const totalSettled = customer.settlement_history?.reduce((sum, s) => sum + (s.amount_paid || 0), 0) || 0;
      if (totalCredit > 0) {
        balance = Math.max(0, totalCredit - totalSettled);
      }
    }

    try {
      setIsSendingTelegram(customer.id);
      const res = await sendTelegramOutstandingStatement({
        chatId: customer.telegram_chat_id,
        customer,
        shopSettings: settings.shop,
        overrideBalance: balance,
        token: settings.telegram?.botToken,
      });

      if (res.ok) {
        showSuccess(`Statement sent to ${customer.name_en || customer.name_dv} via Telegram! 🚀`);
      } else {
        showError(res.description || 'Failed to send Telegram statement');
      }
    } catch (err: any) {
      showError(err.message || 'Failed to send Telegram statement');
    } finally {
      setIsSendingTelegram(null);
    }
  };

  const handleShareCustomerViber = (customer: Customer) => {
    let balance = Number(customer.outstanding_balance || 0);
    if (!balance || balance <= 0) {
      const custCreditSales = (sales || []).filter(s =>
        (s.customer?.id === customer.id) &&
        (s.paymentMethod?.toLowerCase() === 'credit' || (s.paymentMethod?.toLowerCase() === 'split' && s.splitDetails?.some((d: any) => d.method?.toLowerCase() === 'credit' && d.customerId === customer.id)))
      );
      const totalCredit = custCreditSales.reduce((sum, s) => {
        if (s.paymentMethod?.toLowerCase() === 'credit') return sum + (s.grandTotal || 0);
        const splitCredit = s.splitDetails?.filter((d: any) => d.method?.toLowerCase() === 'credit' && d.customerId === customer.id).reduce((ss: number, dd: any) => ss + dd.amount, 0) || 0;
        return sum + splitCredit;
      }, 0);
      const totalSettled = customer.settlement_history?.reduce((sum, s) => sum + (s.amount_paid || 0), 0) || 0;
      if (totalCredit > 0) {
        balance = Math.max(0, totalCredit - totalSettled);
      }
    }

    const message = formatCreditStatementViberMessage(customer, settings.shop, balance);
    shareViaViber({
      phone: customer.phone,
      text: message
    });
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
    <div className="p-6 font-faruma flex flex-col h-full bg-background text-foreground overflow-hidden" dir="rtl">
      {/* Header Section */}
      <div className="flex justify-between items-center mb-8">
        <div className="text-right">
           <h1 className="text-3xl font-black text-foreground flex items-center justify-end gap-3">
             {renderBoth('customers')} <Users className="h-8 w-8 text-primary" />
           </h1>
           <p className="text-sm text-muted-foreground mt-1">Manage your clients, credit limits and loyalty points</p>
        </div>

        <div className="flex gap-3">
           <Button 
             variant="outline"
             onClick={refreshCustomers}
             className="gap-2 border-border hover:bg-muted h-11 px-6 rounded-xl font-black text-foreground"
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
         <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
         <Input 
           placeholder={renderBothString('search_customers')}
           value={searchTerm}
           onChange={(e) => setSearchTerm(e.target.value)}
           className="w-full bg-muted border-border rounded-xl pr-12 h-14 text-right font-bold focus:border-primary/50 transition-all text-lg"
         />
      </div>

      {/* Customers Grid */}
      <ScrollArea className="flex-1 custom-scrollbar">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-6">
          {filteredCustomers.map((customer) => (
            <Card key={customer.id} className="apple-glass-card border border-white/20 dark:border-white/10 hover:border-primary/50 transition-all duration-300 rounded-3xl overflow-hidden group shadow-sm hover:shadow-lg">
              <CardContent className="p-0">
                 <div className="p-6">
                    <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center gap-2">
                           <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                              <Users className="h-6 w-6" />
                           </div>
                           <Button
                             type="button"
                             size="sm"
                             variant="ghost"
                             onClick={() => handleOpenTelegramConnect(customer)}
                             className={
                               customer.telegram_chat_id
                                 ? "h-7 px-2 text-[10px] font-bold rounded-lg bg-[#229ED9]/10 text-[#229ED9] hover:bg-[#229ED9]/20 gap-1"
                                 : "h-7 px-2 text-[10px] font-bold rounded-lg bg-muted text-muted-foreground hover:text-[#229ED9] hover:bg-[#229ED9]/10 gap-1"
                             }
                             title={customer.telegram_chat_id ? `Telegram Linked (Chat ID: ${customer.telegram_chat_id})` : "Click to connect Telegram"}
                           >
                             <TelegramIcon className="h-3 w-3" />
                             <span>{customer.telegram_chat_id ? 'Linked' : 'Bot Connect'}</span>
                           </Button>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground/50 hover:text-foreground">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="bg-card border-border text-foreground" dir="rtl">
                            <DropdownMenuItem onClick={() => handleEditClick(customer)} className="gap-2 text-right justify-end hover:bg-muted cursor-pointer">
                              {renderBoth('edit')} <PencilLine className="h-4 w-4 text-blue-400" />
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleOpenTelegramConnect(customer)} className="gap-2 text-right justify-end hover:bg-muted cursor-pointer text-[#229ED9]">
                              <span>Connect Telegram (QR)</span> <QrCode className="h-4 w-4" />
                            </DropdownMenuItem>
                            {customer.outstanding_balance > 0 && customer.telegram_chat_id && (
                              <DropdownMenuItem onClick={() => handleSendCustomerTelegram(customer)} className="gap-2 text-right justify-end hover:bg-muted cursor-pointer text-emerald-400">
                                <span>Send Telegram Statement</span> <Send className="h-4 w-4" />
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                     </div>

                    <div className="text-right mb-6">
                       <h3 className="text-xl font-black text-foreground leading-tight mb-1">{customer.name_dv}</h3>
                       <p className="text-xs sm:text-[13px] font-bold text-muted-foreground uppercase tracking-wider">{customer.name_en}</p>
                       <p className="text-xs font-mono text-primary font-bold mt-2">ID: {customer.code}</p>
                    </div>

                    <div className="space-y-3 mb-6">
                       <div className="flex items-center justify-end gap-3 text-muted-foreground">
                          <span className="text-xs font-bold">{customer.phone}</span>
                          <Phone className="h-3.5 w-3.5 text-muted-foreground/70" />
                       </div>
                       {customer.email && (
                         <div className="flex items-center justify-end gap-3 text-muted-foreground">
                            <span className="text-xs font-bold truncate max-w-[150px]">{customer.email}</span>
                            <Mail className="h-3.5 w-3.5 text-muted-foreground/70" />
                         </div>
                       )}
                    </div>
                     <div className="space-y-4 mb-6">
                        <div className="space-y-2">
                           <div className="flex justify-between text-xs font-black uppercase tracking-wider mb-1">
                              <span className="text-primary">{settings.shop.currency} {customer.outstanding_balance.toFixed(2)}</span>
                              <span className="text-muted-foreground font-bold">Used Credit</span>
                           </div>
                           <Progress value={Math.min(100, (customer.outstanding_balance / (customer.credit_limit || 1)) * 100)} className="h-1.5 bg-muted" />
                           <div className="flex justify-between text-xs font-bold text-muted-foreground">
                              <span>Limit: {settings.shop.currency} {customer.credit_limit.toFixed(2)}</span>
                              <span>{Math.round((customer.outstanding_balance / (customer.credit_limit || 1)) * 100)}%</span>
                           </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                           <div className="bg-muted p-3 rounded-2xl border border-border text-right">
                              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1">{renderBoth('loyalty_points')}</p>
                              <p className="text-sm font-black text-blue-400">{(customer.loyalty_points || 0).toFixed(0)} <span className="text-[9px] font-normal opacity-70">PTS</span></p>
                           </div>
                           <div className="bg-muted p-3 rounded-2xl border border-border text-right">
                              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1">{renderBoth('credit_limit')}</p>
                              <p className="text-sm font-black text-orange-500">{settings.shop.currency} {customer.credit_limit.toFixed(0)}</p>
                           </div>
                        </div>
                     </div>

                     {customer.outstanding_balance > 0 && (
                        <div className="space-y-1.5 mb-2">
                          <Button
                            type="button"
                            onClick={() => handleSendCustomerTelegram(customer)}
                            disabled={isSendingTelegram === customer.id}
                            className="w-full bg-[#229ED9]/15 hover:bg-[#229ED9]/25 text-[#229ED9] border border-[#229ED9]/30 text-[10px] font-black h-9 rounded-xl transition-all gap-2 flex items-center justify-center active:scale-95"
                          >
                            {isSendingTelegram === customer.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <TelegramIcon className="h-3.5 w-3.5 fill-current" />
                            )}
                            <span>{customer.telegram_chat_id ? 'Send Statement via Telegram (ޓެލެގްރާމް)' : 'Link Telegram to Send Statement'}</span>
                          </Button>

                          <Button
                            type="button"
                            onClick={() => handleShareCustomerViber(customer)}
                            className="w-full bg-[#7360F2]/15 hover:bg-[#7360F2]/25 text-[#7360F2] border border-[#7360F2]/30 text-[10px] font-black h-9 rounded-xl transition-all gap-2 flex items-center justify-center active:scale-95"
                          >
                            <ViberIcon className="h-3.5 w-3.5 fill-current" />
                            <span>Send Statement via Viber (ވައިބަރ)</span>
                          </Button>
                        </div>
                      )}

                     <Button 
                       onClick={() => handleEditClick(customer)}
                       className="w-full bg-muted hover:bg-muted/80 text-foreground text-[10px] font-black h-10 rounded-xl border border-border transition-all uppercase tracking-widest"
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
        <DialogContent className="sm:max-w-[32rem] 2xl:max-w-[38rem] w-[calc(100vw-2rem)] font-faruma apple-glass-dialog border-white/20 dark:border-white/10 text-foreground shadow-2xl rounded-3xl p-6 sm:p-7" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right text-2xl font-black">{renderBoth('edit_customer')}</DialogTitle>
            <DialogDescription className="text-right text-muted-foreground text-xs">
              {renderBoth('edit_customer_description')}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="customerNameDv" className="text-right block text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                {renderBoth('customer_name')} (ދިވެހި)
              </Label>
              <Input
                id="customerNameDv"
                value={editingCustomer?.name_dv || ''}
                onChange={(e) => setEditingCustomer(prev => prev ? { ...prev, name_dv: e.target.value } : null)}
                className="text-right h-12 apple-glass-input rounded-2xl font-medium"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="customerNameEn" className="text-right block text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                {renderBoth('customer_name')} (English)
              </Label>
              <Input
                id="customerNameEn"
                value={editingCustomer?.name_en || ''}
                onChange={(e) => setEditingCustomer(prev => prev ? { ...prev, name_en: e.target.value } : null)}
                className="text-right h-12 apple-glass-input rounded-2xl font-medium"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="customerCode" className="text-right block text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                  {renderBoth('customer_code')}
                </Label>
                <Input
                  id="customerCode"
                  value={editingCustomer?.code || ''}
                  readOnly 
                  className="text-right h-12 apple-glass-input rounded-2xl opacity-50 font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="customerPhone" className="text-right block text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                  {renderBoth('customer_phone')}
                </Label>
                <Input
                  id="customerPhone"
                  value={editingCustomer?.phone || ''}
                  onChange={(e) => setEditingCustomer(prev => prev ? { ...prev, phone: e.target.value } : null)}
                  className="text-right h-12 apple-glass-input rounded-2xl font-medium"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="customerEmail" className="text-right block text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                  {renderBoth('customer_email')}
                </Label>
                <Input
                  id="customerEmail"
                  type="email"
                  value={editingCustomer?.email || ''}
                  onChange={(e) => setEditingCustomer(prev => prev ? { ...prev, email: e.target.value } : null)}
                  className="text-right h-12 apple-glass-input rounded-2xl font-medium"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="creditLimit" className="text-right block text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                  {renderBoth('credit_limit')}
                </Label>
                <Input
                  id="creditLimit"
                  type="number"
                  value={editingCustomer?.credit_limit !== undefined ? editingCustomer.credit_limit : ''}
                  onChange={(e) => setEditingCustomer(prev => prev ? { ...prev, credit_limit: parseFloat(e.target.value) || 0 } : null)}
                  className="text-right h-12 apple-glass-input rounded-2xl font-mono font-bold"
                />
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-white/10 dark:border-white/5">
              <div className="flex justify-between items-center">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => editingCustomer && handleOpenTelegramConnect(editingCustomer)}
                  className="text-xs h-8 gap-1.5 text-[#229ED9] border-[#229ED9]/30 hover:bg-[#229ED9]/15 rounded-xl apple-glass-pill transition-all active:scale-95"
                >
                  <QrCode className="h-3.5 w-3.5" />
                  <span>Open Connect QR</span>
                </Button>
                <Label htmlFor="telegramChatId" className="text-right block text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                  Telegram Chat ID
                </Label>
              </div>
              <Input
                id="telegramChatId"
                placeholder="e.g. 123456789 (or scan QR to link)"
                value={editingCustomer?.telegram_chat_id || ''}
                onChange={(e) => setEditingCustomer(prev => prev ? { ...prev, telegram_chat_id: e.target.value ? Number(e.target.value) : null } : null)}
                className="text-left h-12 apple-glass-input rounded-2xl font-mono text-sm"
                dir="ltr"
              />
            </div>
          </div>
          <DialogFooter className="gap-2.5 pt-4 border-t border-white/10 dark:border-white/5 flex flex-row">
            <Button
              variant="outline"
              onClick={() => setIsEditCustomerDialogOpen(false)}
              disabled={isSavingCustomer}
              className="flex-1 rounded-2xl h-11 border-white/20 dark:border-white/10 hover:bg-white/10 text-foreground font-bold active:scale-[0.98] transition-all"
            >
              {renderBoth('cancel')}
            </Button>
            <Button 
              onClick={handleSaveCustomer} 
              disabled={isSavingCustomer || !editingCustomer}
              className="flex-1 h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-black rounded-2xl shadow-lg shadow-primary/20 active:scale-[0.98] transition-all"
            >
              {isSavingCustomer ? (
                <span className="flex items-center justify-center gap-2">
                  <RefreshCcw className="h-4 w-4 animate-spin" /> Saving...
                </span>
              ) : (
                renderBoth('save_changes')
              )}
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

      {/* Telegram Connect Dialog */}
      <TelegramConnectDialog
        customer={telegramCustomer}
        isOpen={isTelegramDialogOpen}
        onClose={() => {
          setIsTelegramDialogOpen(false);
          setTelegramCustomer(null);
        }}
        onCustomerUpdated={(updated) => {
          setEditingCustomer(prev => prev && prev.id === updated.id ? updated : prev);
        }}
      />
    </div>
  );
};

export default Customers;