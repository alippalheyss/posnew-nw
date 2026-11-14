"use client";

import React, { useState, useMemo } from 'react';
import { flushSync } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, PlusCircle, PencilLine, Users, User, Hash, Phone, Mail, DollarSign, Award, MoreVertical, RefreshCcw, X, ArrowUpDown } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
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
import { usePersistedState } from '@/hooks/usePersistedState';
import { QrCode, Send, Loader2 } from 'lucide-react';

const Customers = () => {
  const { t } = useTranslation();
  const { customers, setCustomers, settings, addCustomer, updateCustomer, refreshCustomers, sales } = useAppContext();
  const [searchTerm, setSearchTerm] = usePersistedState<string>('customers_search_term', '');
  const [visibleCount, setVisibleCount] = useState(24);
  const [filterType, setFilterType] = usePersistedState<'ALL' | 'BY_NAME' | 'BY_CODE'>('customers_filter_type', 'ALL');
  const [sortBy, setSortBy] = usePersistedState<'DEFAULT' | 'NAME_ASC' | 'CODE_ASC' | 'BALANCE_DESC'>('customers_sort_by', 'DEFAULT');
  const [isEditCustomerDialogOpen, setIsEditCustomerDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isAddCustomerDialogOpen, setIsAddCustomerDialogOpen] = useState(false);
  const [isSavingCustomer, setIsSavingCustomer] = useState(false);
  const [telegramCustomer, setTelegramCustomer] = useState<Customer | null>(null);
  const [isTelegramDialogOpen, setIsTelegramDialogOpen] = useState(false);
  const [isSendingTelegram, setIsSendingTelegram] = useState<string | null>(null);
  const [statusAnnouncement, setStatusAnnouncement] = useState('');

  const filteredCustomers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    const matchesCustomerCode = (c: Customer, query: string) => {
      if (!c.code || !query) return false;
      const cleanQ = query.trim().toLowerCase().replace(/^#/, '');
      const cleanCode = c.code.trim().toLowerCase().replace(/^#/, '');
      if (cleanCode === cleanQ || cleanCode.includes(cleanQ)) return true;
      const qDigits = cleanQ.replace(/\D/g, '');
      const codeDigits = cleanCode.replace(/\D/g, '');
      if (qDigits && codeDigits) {
        if (qDigits === codeDigits) return true;
        if (codeDigits.padStart(3, '0') === qDigits.padStart(3, '0')) return true;
        if (parseInt(codeDigits, 10) === parseInt(qDigits, 10)) return true;
      }
      return false;
    };

    const termMatchesAnyCode = term.length > 0 && customers.some(c => matchesCustomerCode(c, term));

    let list = customers.filter(customer => {
      if (!term) return true;
      if (filterType === 'BY_NAME') {
        return (
          (customer.name_dv || '').toLowerCase().includes(term) ||
          (customer.name_en || '').toLowerCase().includes(term)
        );
      }
      if (filterType === 'BY_CODE') {
        return matchesCustomerCode(customer, term);
      }
      const matchesCode = matchesCustomerCode(customer, term);
      const matchesName = (customer.name_dv || '').toLowerCase().includes(term) ||
                          (customer.name_en || '').toLowerCase().includes(term);
      const matchesPhone = !termMatchesAnyCode && term.length >= 6 && (customer.phone || '').includes(term);

      return matchesCode || matchesName || matchesPhone;
    });

    if (sortBy === 'NAME_ASC') {
      return [...list].sort((a, b) => (a.name_dv || a.name_en || '').localeCompare(b.name_dv || b.name_en || ''));
    }
    if (sortBy === 'CODE_ASC') {
      return [...list].sort((a, b) => (a.code || '').localeCompare(b.code || '', undefined, { numeric: true }));
    }
    if (sortBy === 'BALANCE_DESC') {
      return [...list].sort((a, b) => (b.outstanding_balance || 0) - (a.outstanding_balance || 0));
    }

    return list;
  }, [customers, searchTerm, filterType, sortBy]);

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

  const totalOutstanding = useMemo(
    () => customers.reduce((sum, c) => sum + Number(c.outstanding_balance || 0), 0),
    [customers]
  );
  const customersWithBalanceCount = useMemo(
    () => customers.filter((c) => Number(c.outstanding_balance || 0) > 0).length,
    [customers]
  );
  const telegramLinkedCount = useMemo(
    () => customers.filter((c) => Boolean(c.telegram_chat_id)).length,
    [customers]
  );

  const runListTransition = (updateFn: () => void, announcement: string) => {
    const visibleItems = Math.min(filteredCustomers.length, visibleCount);
    const docWithVT = document as Document & {
      startViewTransition?: (cb: () => void) => { finished: Promise<void> };
    };
    if (typeof docWithVT.startViewTransition === 'function' && visibleItems <= 120) {
      docWithVT.startViewTransition(() => {
        flushSync(updateFn);
      });
    } else {
      updateFn();
    }
    setStatusAnnouncement(announcement);
  };

  return (
    <div className="p-4 sm:p-5 font-faruma flex flex-col h-full bg-background text-foreground overflow-hidden" dir="ltr">
      <p role="status" className="visually-hidden">{statusAnnouncement}</p>
      {/* Sleek Header & KPI Strip */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/25 flex items-center justify-center text-primary shrink-0">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                {t('customers', { lng: 'en' }) || 'Customers'}
              </h1>
              <span className="text-xs font-bold text-muted-foreground">
                ({t('customers')})
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Manage client profiles, credit limits, loyalty points, and instant statements
            </p>
          </div>
        </div>

        {/* KPI Pills & Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="hidden sm:flex items-center gap-2 mr-1">
            <div className="px-3 py-1.5 rounded-xl bg-card border border-border flex items-center gap-2 text-xs">
              <span className="text-muted-foreground font-bold">Total:</span>
              <span className="font-mono font-black tabular-nums text-foreground">{customers.length}</span>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-card border border-amber-500/30 flex items-center gap-2 text-xs">
              <span className="text-amber-600 dark:text-amber-400 font-bold">Active Credit:</span>
              <span className="font-mono font-black tabular-nums text-amber-600 dark:text-amber-400">
                {customersWithBalanceCount} ({settings.shop.currency} {totalOutstanding.toFixed(0)})
              </span>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-card border border-[#229ED9]/30 flex items-center gap-1.5 text-xs">
              <TelegramIcon className="h-3.5 w-3.5 text-[#229ED9]" />
              <span className="font-mono font-black tabular-nums text-[#229ED9]">{telegramLinkedCount}</span>
            </div>
          </div>

          <Button 
            variant="outline"
            size="sm"
            onClick={() => refreshCustomers(true)}
            className="gap-1.5 border-border hover:bg-muted h-9 px-3.5 rounded-xl font-bold text-xs text-foreground"
          >
            <RefreshCcw className="h-3.5 w-3.5" />
            <span>Sync</span>
          </Button>
          <Button 
            size="sm"
            onClick={() => setIsAddCustomerDialogOpen(true)}
            className="gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground h-9 px-4 rounded-xl font-black text-xs shadow-sm"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            <span>{renderBoth('add_new_customer')}</span>
          </Button>
        </div>
      </div>

      {/* Unified Compact Search, Filter & Sort Toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2.5 mb-4 p-2 rounded-xl bg-card border border-border shrink-0">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input 
            dir="auto"
            placeholder={
              filterType === 'BY_NAME'
                ? "Search customer by name... / ނަމުން ކަސްޓަމަރު ހޯދާ"
                : filterType === 'BY_CODE'
                  ? "Search customer by code (e.g. 001)... / ކޯޑުން ހޯދާ"
                  : "Search customer by name, code, or phone..."
            }
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setVisibleCount(36);
            }}
            className="w-full bg-background border-border rounded-lg pl-9 pr-9 h-9 text-left font-semibold text-xs"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-muted transition-colors"
              title="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Filter Mode Pills */}
        <div className="flex items-center gap-1 bg-muted p-1 rounded-lg border border-border shrink-0">
          <button
            type="button"
            aria-pressed={filterType === 'ALL'}
            onClick={() => runListTransition(() => setFilterType('ALL'), 'Showing all customers')}
            className={cn(
              "h-7 px-2.5 rounded-md text-[11px] font-black transition-colors flex items-center gap-1",
              filterType === 'ALL'
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Users className="h-3 w-3" />
            <span>All</span>
            <span className="text-[10px] opacity-80 font-mono tabular-nums">({customers.length})</span>
          </button>
          <button
            type="button"
            aria-pressed={filterType === 'BY_NAME'}
            onClick={() => runListTransition(() => setFilterType('BY_NAME'), 'Filter mode: search by customer name')}
            className={cn(
              "h-7 px-2.5 rounded-md text-[11px] font-black transition-colors flex items-center gap-1",
              filterType === 'BY_NAME'
                ? "bg-blue-600 text-white shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <User className="h-3 w-3" />
            <span>Name (ނަމުން)</span>
          </button>
          <button
            type="button"
            aria-pressed={filterType === 'BY_CODE'}
            onClick={() => runListTransition(() => setFilterType('BY_CODE'), 'Filter mode: search by customer code')}
            className={cn(
              "h-7 px-2.5 rounded-md text-[11px] font-black transition-colors flex items-center gap-1",
              filterType === 'BY_CODE'
                ? "bg-amber-600 text-white shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Hash className="h-3 w-3" />
            <span>Code (ކޯޑުން)</span>
          </button>
        </div>

        {/* Sort Pills */}
        <div className="flex items-center gap-1 bg-muted p-1 rounded-lg border border-border shrink-0">
          <span className="text-[10px] font-bold text-muted-foreground px-1.5 flex items-center gap-1">
            <ArrowUpDown className="h-3 w-3" /> Sort:
          </span>
          <button
            type="button"
            aria-pressed={sortBy === 'NAME_ASC'}
            onClick={() => {
              const next = sortBy === 'NAME_ASC' ? 'DEFAULT' : 'NAME_ASC';
              runListTransition(
                () => setSortBy(next),
                next === 'NAME_ASC' ? 'Sorted by customer name A to Z' : 'Sorted by default order'
              );
            }}
            className={cn(
              "h-7 px-2 text-[11px] font-bold rounded-md transition-colors",
              sortBy === 'NAME_ASC'
                ? "bg-card text-blue-600 dark:text-blue-400 font-black border border-blue-500/30"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            A-Z
          </button>
          <button
            type="button"
            aria-pressed={sortBy === 'CODE_ASC'}
            onClick={() => {
              const next = sortBy === 'CODE_ASC' ? 'DEFAULT' : 'CODE_ASC';
              runListTransition(
                () => setSortBy(next),
                next === 'CODE_ASC' ? 'Sorted by customer code ascending' : 'Sorted by default order'
              );
            }}
            className={cn(
              "h-7 px-2 text-[11px] font-bold rounded-md transition-colors",
              sortBy === 'CODE_ASC'
                ? "bg-card text-amber-600 dark:text-amber-400 font-black border border-amber-500/30"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            #Code
          </button>
          <button
            type="button"
            aria-pressed={sortBy === 'BALANCE_DESC'}
            onClick={() => {
              const next = sortBy === 'BALANCE_DESC' ? 'DEFAULT' : 'BALANCE_DESC';
              runListTransition(
                () => setSortBy(next),
                next === 'BALANCE_DESC' ? 'Sorted by highest outstanding balance' : 'Sorted by default order'
              );
            }}
            className={cn(
              "h-7 px-2 text-[11px] font-bold rounded-md transition-colors",
              sortBy === 'BALANCE_DESC'
                ? "bg-card text-rose-600 dark:text-rose-400 font-black border border-rose-500/30"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Balance (ދަރަނި)
          </button>
        </div>
      </div>

      {/* Compact, Sleek Customers Grid */}
      <ScrollArea className="flex-1 custom-scrollbar">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-3 pb-6">
          {filteredCustomers.slice(0, visibleCount).map((customer, idx) => {
            const outBal = Number(customer.outstanding_balance || 0);
            const credLim = Number(customer.credit_limit || 0);
            const usagePct = credLim > 0 ? Math.min(100, Math.round((outBal / credLim) * 100)) : (outBal > 0 ? 100 : 0);
            const initials = (customer.name_en || customer.name_dv || 'C')
              .trim()
              .split(/\s+/)
              .slice(0, 2)
              .map(w => w[0])
              .join('')
              .toUpperCase();

            return (
              <article
                key={customer.id}
                className={cn(
                  "customer-card bg-card border transition-colors duration-200 rounded-xl overflow-hidden group hover:shadow-sm p-3.5 flex flex-col justify-between gap-2.5",
                  idx >= 8 && "customer-card-deferred",
                  outBal > 0
                    ? "border-amber-500/35 hover:border-amber-500/60"
                    : "border-border hover:border-primary/45"
                )}
              >
                {/* Card Header: Avatar + Name + Code + Quick Menu */}
                <header className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className={cn(
                      "w-9 h-9 rounded-lg border flex items-center justify-center text-xs font-black shrink-0",
                      outBal > 0
                        ? "bg-amber-500/10 border-amber-500/25 text-amber-600 dark:text-amber-400"
                        : "bg-primary/10 border-primary/20 text-primary"
                    )}>
                      {initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-black text-foreground truncate leading-tight">
                        {customer.name_en || customer.name_dv}
                      </h3>
                      {customer.name_dv && (
                        <p className="text-[11px] font-bold text-muted-foreground truncate leading-tight mt-0.5">
                          {customer.name_dv}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Code Badge + Actions Dropdown */}
                  <div className="flex items-center gap-1 shrink-0">
                    <span className={cn(
                      "text-[10px] font-mono font-black tabular-nums px-2 py-0.5 rounded-md border",
                      filterType === 'BY_CODE'
                        ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/40"
                        : "bg-muted text-foreground border-border"
                    )}>
                      #{customer.code}
                    </span>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Actions for ${customer.name_en || customer.name_dv}`}
                          className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground"
                        >
                          <MoreVertical className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-card border-border text-foreground rounded-xl">
                        <DropdownMenuItem onClick={() => handleEditClick(customer)} className="gap-2 text-xs font-bold cursor-pointer">
                          <PencilLine className="h-3.5 w-3.5 text-blue-500" />
                          <span>{renderBoth('edit')}</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleOpenTelegramConnect(customer)} className="gap-2 text-xs font-bold cursor-pointer text-[#229ED9]">
                          <QrCode className="h-3.5 w-3.5" />
                          <span>Connect Telegram (QR)</span>
                        </DropdownMenuItem>
                        {outBal > 0 && customer.telegram_chat_id && (
                          <DropdownMenuItem onClick={() => handleSendCustomerTelegram(customer)} className="gap-2 text-xs font-bold cursor-pointer text-emerald-500">
                            <Send className="h-3.5 w-3.5" />
                            <span>Send Telegram Statement</span>
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </header>

                {/* Card Body: Meta Strip + Credit Balance Box */}
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/60 text-[11px]">
                    <div className="flex items-center gap-1.5 text-muted-foreground min-w-0">
                      <Phone className="h-3 w-3 shrink-0 text-muted-foreground/70" />
                      <span className="font-mono font-bold tabular-nums truncate">{customer.phone || 'No phone'}</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {Number(customer.loyalty_points || 0) > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 font-mono font-black tabular-nums text-[10px]">
                          {Number(customer.loyalty_points || 0).toFixed(0)} PTS
                        </span>
                      )}
                      <button
                        type="button"
                        aria-pressed={Boolean(customer.telegram_chat_id)}
                        onClick={() => handleOpenTelegramConnect(customer)}
                        className={cn(
                          "h-5 px-1.5 rounded text-[9px] font-black flex items-center gap-1 transition-colors",
                          customer.telegram_chat_id
                            ? "bg-[#229ED9]/15 text-[#229ED9] hover:bg-[#229ED9]/25"
                            : "bg-muted text-muted-foreground hover:text-[#229ED9]"
                        )}
                        title={customer.telegram_chat_id ? `Telegram Linked (${customer.telegram_chat_id})` : "Connect Telegram Bot"}
                      >
                        <TelegramIcon className="h-2.5 w-2.5" />
                        <span>{customer.telegram_chat_id ? 'Linked' : 'Link'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Credit Balance & Limit Box */}
                  <div className={cn(
                    "p-2.5 rounded-lg border",
                    outBal > 0
                      ? "bg-amber-500/5 border-amber-500/25"
                      : "bg-muted/50 border-border"
                  )}>
                    <div className="flex items-baseline justify-between gap-2 mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Balance
                      </span>
                      <span className={cn(
                        "font-mono font-black text-sm tabular-nums",
                        outBal > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"
                      )}>
                        {settings.shop.currency} {outBal.toFixed(2)}
                      </span>
                    </div>
                    <Progress
                      value={usagePct}
                      className="h-1 bg-black/10 dark:bg-white/10"
                    />
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-1 font-mono tabular-nums">
                      <span>Limit: {settings.shop.currency} {credLim.toFixed(0)}</span>
                      <span>{usagePct}%</span>
                    </div>
                  </div>
                </div>

                {/* Card Footer: Action Controls */}
                <footer className="customer-card-footer flex items-center gap-1.5 pt-0.5">
                  {outBal > 0 && (
                    <div className="customer-card-footer-actions flex items-center gap-1.5 flex-1">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleSendCustomerTelegram(customer)}
                        disabled={isSendingTelegram === customer.id}
                        title={customer.telegram_chat_id ? 'Send Statement via Telegram' : 'Link Telegram to Send Statement'}
                        className="h-8 px-2.5 flex-1 bg-[#229ED9]/15 hover:bg-[#229ED9] text-[#229ED9] hover:text-white border border-[#229ED9]/30 text-[10px] font-black rounded-lg transition-colors gap-1"
                      >
                        {isSendingTelegram === customer.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <TelegramIcon className="h-3 w-3 fill-current" />
                        )}
                        <span>Telegram</span>
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleShareCustomerViber(customer)}
                        title="Send Statement via Viber"
                        className="h-8 px-2.5 flex-1 bg-[#7360F2]/15 hover:bg-[#7360F2] text-[#7360F2] hover:text-white border border-[#7360F2]/30 text-[10px] font-black rounded-lg transition-colors gap-1"
                      >
                        <ViberIcon className="h-3 w-3 fill-current" />
                        <span>Viber</span>
                      </Button>
                    </div>
                  )}

                  <Button 
                    type="button"
                    size="sm"
                    onClick={() => handleEditClick(customer)}
                    className={cn(
                      "h-8 px-3 bg-muted hover:bg-primary hover:text-primary-foreground text-foreground text-[10px] font-black rounded-lg border border-border transition-colors gap-1",
                      outBal > 0 ? "shrink-0" : "w-full"
                    )}
                  >
                    <PencilLine className="h-3 w-3" />
                    <span>{outBal > 0 ? 'Edit' : 'Edit Customer'}</span>
                  </Button>
                </footer>
              </article>
            );
          })}
        </div>
        {filteredCustomers.length > visibleCount && (
          <div className="flex justify-center pb-8">
            <Button
              variant="outline"
              onClick={() => setVisibleCount(prev => prev + 36)}
              className="rounded-xl px-6 h-10 font-black text-xs uppercase tracking-wider border-border hover:bg-muted"
            >
              Load More Customers ({filteredCustomers.length - visibleCount} remaining)
            </Button>
          </div>
        )}
      </ScrollArea>

      {/* Edit Customer Dialog */}
      <Dialog open={isEditCustomerDialogOpen} onOpenChange={setIsEditCustomerDialogOpen}>
        <DialogContent className="sm:max-w-[32rem] 2xl:max-w-[38rem] w-[calc(100vw-2rem)] font-faruma bg-card border border-border text-foreground shadow-xl rounded-xl p-6 sm:p-7" dir="rtl">
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
                dir="rtl"
                value={editingCustomer?.name_dv || ''}
                onChange={(e) => setEditingCustomer(prev => prev ? { ...prev, name_dv: e.target.value } : null)}
                className="text-right h-11 bg-background border-border rounded-lg font-faruma font-bold"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="customerNameEn" className="text-right block text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                {renderBoth('customer_name')} (English)
              </Label>
              <Input
                id="customerNameEn"
                dir="ltr"
                value={editingCustomer?.name_en || ''}
                onChange={(e) => setEditingCustomer(prev => prev ? { ...prev, name_en: e.target.value } : null)}
                className="text-left h-11 bg-background border-border rounded-lg font-medium"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="customerCode" className="text-right block text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                  {renderBoth('customer_code')}
                </Label>
                <Input
                  id="customerCode"
                  dir="ltr"
                  value={editingCustomer?.code || ''}
                  readOnly 
                  className="text-left h-11 bg-muted border-border rounded-lg opacity-70 font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="customerPhone" className="text-right block text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                  {renderBoth('customer_phone')}
                </Label>
                <Input
                  id="customerPhone"
                  dir="ltr"
                  value={editingCustomer?.phone || ''}
                  onChange={(e) => setEditingCustomer(prev => prev ? { ...prev, phone: e.target.value } : null)}
                  className="text-left h-11 bg-background border-border rounded-lg font-mono font-medium"
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
                  dir="ltr"
                  value={editingCustomer?.email || ''}
                  onChange={(e) => setEditingCustomer(prev => prev ? { ...prev, email: e.target.value } : null)}
                  className="text-left h-11 bg-background border-border rounded-lg font-medium"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="creditLimit" className="text-right block text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                  {renderBoth('credit_limit')}
                </Label>
                <Input
                  id="creditLimit"
                  type="number"
                  dir="ltr"
                  value={editingCustomer?.credit_limit !== undefined ? editingCustomer.credit_limit : ''}
                  onChange={(e) => setEditingCustomer(prev => prev ? { ...prev, credit_limit: parseFloat(e.target.value) || 0 } : null)}
                  className="text-left h-11 bg-background border-border rounded-lg font-mono font-bold tabular-nums"
                />
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-border">
              <div className="flex justify-between items-center">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => editingCustomer && handleOpenTelegramConnect(editingCustomer)}
                  className="text-xs h-8 gap-1.5 text-[#229ED9] border-[#229ED9]/40 hover:bg-[#229ED9]/10 rounded-lg transition-colors"
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
                className="text-left h-11 bg-background border-border rounded-lg font-mono text-sm"
                dir="ltr"
              />
            </div>
          </div>
          <DialogFooter className="gap-2.5 pt-4 border-t border-border flex flex-row">
            <Button
              variant="outline"
              onClick={() => setIsEditCustomerDialogOpen(false)}
              disabled={isSavingCustomer}
              className="flex-1 rounded-lg h-11 border-border hover:bg-muted text-foreground font-bold transition-colors"
            >
              {renderBoth('cancel')}
            </Button>
            <Button 
              onClick={handleSaveCustomer} 
              disabled={isSavingCustomer || !editingCustomer}
              className="flex-1 h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-black rounded-lg shadow-sm transition-colors"
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