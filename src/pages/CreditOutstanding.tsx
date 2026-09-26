"use client";

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, History, DollarSign, ShoppingBag, PlusCircle, Download, FileText, User, Activity, TrendingDown, Clock, CheckCircle2, AlertCircle, Edit } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import SaleEditDialog from '@/components/SaleEditDialog';
import { supabase } from '@/lib/supabase';
import { useAppContext, Product, Sale, Customer } from '@/context/AppContext';
import { cn } from '@/lib/utils';
import { showSuccess, showError } from '@/utils/toast';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Badge } from '@/components/ui/badge';
import { Progress } from "@/components/ui/progress";
import { formatDate, formatTime, formatCurrency, toISODate } from '@/utils/formatters';
import { formatCreditStatementViberMessage, shareViaViber } from '@/utils/viberHelper';
import { TelegramConnectDialog } from '@/components/TelegramConnectDialog';
import { TransferSlipsDialog } from '@/components/TransferSlipsDialog';
import { 
  sendTelegramPaymentReceipt, 
  sendTelegramOutstandingStatement,
  sendAutomatedCreditReminder,
  formatPoliteCreditReminderMessage,
} from '@/services/telegramService';
import { Checkbox } from '@/components/ui/checkbox';
import { QrCode, Send, Loader2, CreditCard, BellRing, MessageSquareQuote } from 'lucide-react';

interface Settlement {
  id: string;
  amount_paid: number;
  date: string;
  previous_outstanding: number;
  new_outstanding: number;
}

const CreditOutstanding = () => {
  const { t } = useTranslation();
  const { customers, sales, setSales, settings, addSettlement, updateCustomerBalance, addSale, pendingSlipsCount } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [isOutstandingVisible, setIsOutstandingVisible] = useState(false);
  const [isTransferSlipsDialogOpen, setIsTransferSlipsDialogOpen] = useState(false);

  React.useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isOutstandingVisible) {
      timer = setTimeout(() => {
        setIsOutstandingVisible(false);
      }, 60000); 
    }
    return () => clearTimeout(timer);
  }, [isOutstandingVisible]);

  const [isSettlePaymentDialogOpen, setIsSettlePaymentDialogOpen] = useState(false);
  const [isSettlementHistoryDialogOpen, setIsSettlementHistoryDialogOpen] = useState(false);
  const [isCreditPurchasesDialogOpen, setIsCreditPurchasesDialogOpen] = useState(false);
  const [revealedTotals, setRevealedTotals] = useState<Set<string>>(new Set());
  const [telegramCustomer, setTelegramCustomer] = useState<Customer | null>(null);
  const [isTelegramDialogOpen, setIsTelegramDialogOpen] = useState(false);
  const [isSendingTelegram, setIsSendingTelegram] = useState<string | null>(null);
  const [isSendingReminder, setIsSendingReminder] = useState<string | null>(null);
  const [isBatchRemindersDialogOpen, setIsBatchRemindersDialogOpen] = useState(false);
  const [selectedCustomerIdsForReminder, setSelectedCustomerIdsForReminder] = useState<string[]>([]);
  const [isSendingBatch, setIsSendingBatch] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ sent: number; total: number }>({ sent: 0, total: 0 });

  const toggleTotalReveal = (customerId: string) => {
    setRevealedTotals(prev => {
      const next = new Set(prev);
      if (next.has(customerId)) next.delete(customerId);
      else next.add(customerId);
      return next;
    });
  };
  const [selectedCustomerForAction, setSelectedCustomerForAction] = useState<Customer | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number | ''>('');
  
  const [isEditSaleDialogOpen, setIsEditSaleDialogOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);

  const handleEditSale = (sale: Sale) => {
    setEditingSale(sale);
    setIsEditSaleDialogOpen(true);
  };

  const handleSaveSaleUpdate = async (updatedSale: Sale) => {
    try {
      const { error } = await supabase
        .from('sales')
        .update({
          items: updatedSale.items,
          grand_total: updatedSale.grandTotal,
          payment_method: updatedSale.paymentMethod,
          paid_amount: updatedSale.paidAmount,
          balance: updatedSale.balance,
          invoice_number: updatedSale.invoiceNumber
        })
        .eq('id', updatedSale.id);

      if (error) throw error;

      setSales(prevSales => prevSales.map(s => s.id === updatedSale.id ? updatedSale : s));
      showSuccess(t('sale_updated_successfully') || 'Sale updated successfully');
      setIsEditSaleDialogOpen(false);
      setEditingSale(null);
    } catch (error) {
      console.error('Error updating sale:', error);
      showError(t('error_updating_sale') || 'Failed to update sale');
    }
  };

  const filteredCustomers = customers.filter(customer =>
    (customer.outstanding_balance > 0 || searchTerm) && (
      customer.name_dv.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.name_en.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.code.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const selectedCustomerCreditSales = sales.filter(s =>
    (s.customer?.id === selectedCustomerForAction?.id && s.paymentMethod?.toLowerCase() === 'credit') ||
    ((s.paymentMethod?.toLowerCase() === 'split' || s.paymentMethod?.toLowerCase() === 'credit') && 
     s.splitDetails?.some((d: any) => d.method?.toLowerCase() === 'credit' && d.customerId === selectedCustomerForAction?.id))
  );

  const handleSettlePaymentClick = (customer: Customer) => {
    setSelectedCustomerForAction(customer);
    setPaymentAmount('');
    setIsSettlePaymentDialogOpen(true);
  };

  const handleViewSettlementHistory = (customer: Customer) => {
    setSelectedCustomerForAction(customer);
    setIsSettlementHistoryDialogOpen(true);
  };

  const handleViewCreditPurchases = (customer: Customer) => {
    setSelectedCustomerForAction(customer);
    setIsCreditPurchasesDialogOpen(true);
  };

  const processSettlement = () => {
    if (selectedCustomerForAction && typeof paymentAmount === 'number' && paymentAmount > 0) {
      const previousOutstanding = selectedCustomerForAction.outstanding_balance;
      const newOutstanding = Math.max(0, previousOutstanding - paymentAmount);
      const settlement: Settlement = {
        id: `set-${Date.now()}`,
        amount_paid: paymentAmount,
        date: new Date().toISOString(),
        previous_outstanding: previousOutstanding,
        new_outstanding: newOutstanding,
      };

      addSettlement(selectedCustomerForAction.id, settlement);

      // Automated Telegram payment receipt if customer is linked
      if (selectedCustomerForAction.telegram_chat_id && settings.telegram?.autoSendPaymentReceipts !== false) {
        sendTelegramPaymentReceipt({
          chatId: selectedCustomerForAction.telegram_chat_id,
          customerName: selectedCustomerForAction.name_en || selectedCustomerForAction.name_dv,
          customerCode: selectedCustomerForAction.code,
          paidAmount: paymentAmount,
          previousOutstanding: previousOutstanding,
          remainingBalance: newOutstanding,
          receiptNo: settlement.id,
          shopSettings: settings.shop,
          token: settings.telegram?.botToken,
        }).then(res => {
          if (res?.ok) {
            showSuccess('Payment receipt sent to Telegram! 🧾');
          }
        }).catch(err => console.warn('Failed to send Telegram receipt:', err));
      }

      setIsSettlePaymentDialogOpen(false);
      setSelectedCustomerForAction(null);
      setPaymentAmount('');
      showSuccess(t('settlement_successful'));
    } else {
      showError(t('invalid_payment_amount'));
    }
  };



  const handleDownloadCreditReport = (customer: Customer) => {
    const customerSales = sales.filter(s => s.customer?.id === customer.id && s.paymentMethod?.toLowerCase() === 'credit');
    if (customerSales.length === 0) {
      showError(t('no_credit_purchases'));
      return;
    }

    const data = [];
    data.push([
      t('customer_name', { lng: 'en' }),
      t('customer_code', { lng: 'en' }),
      t('transaction_date', { lng: 'en' }),
      t('item_code', { lng: 'en' }),
      t('product_name_en', { lng: 'en' }),
      t('qty', { lng: 'en' }),
      t('price', { lng: 'en' }),
      t('total', { lng: 'en' }),
    ]);

    customerSales.forEach(transaction => {
      transaction.items.forEach(item => {
        data.push([
          customer.name_en,
          customer.code,
          transaction.date,
          item.item_code,
          item.name_en,
          item.qty,
          item.price.toFixed(2),
          (item.qty * item.price).toFixed(2),
        ]);
      });
      data.push(['', '', '', '', '', '', t('grand_total', { lng: 'en' }), transaction.grandTotal.toFixed(2)]);
      data.push([]);
    });

    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Credit Purchases Report");
    XLSX.writeFile(wb, `${customer.name_en}_Credit_Purchases_Report.xlsx`);
    showSuccess(t('download_report_successful'));
  };

  const exportAllOutstanding = () => {
    const data = [
      ["Credit Outstanding Report", settings.shop.shopName],
      ["Generated Date", new Date().toLocaleDateString()],
      [],
      ["Customer Code", "Customer Name", "Total Outstanding"]
    ];

    customers.filter(c => c.outstanding_balance > 0).forEach(c => {
      data.push([c.code, c.name_en, c.outstanding_balance.toFixed(2)]);
    });

    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Outstanding Report");
    XLSX.writeFile(wb, `Credit_Outstanding_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const currentOutstandingAfterPayment = selectedCustomerForAction 
    ? Math.max(0, selectedCustomerForAction.outstanding_balance - (typeof paymentAmount === 'number' ? paymentAmount : 0))
    : 0;

  const handleDownloadPdfReport = (customer: Customer) => {
    const customerSales = sales.filter(s => s.customer?.id === customer.id && s.paymentMethod === 'credit');
    if (customerSales.length === 0) {
      showError(t('no_credit_purchases'));
      return;
    }

    try {
      const doc = new jsPDF();
      let yPos = 20;

      if (settings.reports.showLogo && settings.shop.logo) {
        try {
          doc.addImage(settings.shop.logo, 'PNG', 85, yPos, 40, 20);
          yPos += 25;
        } catch (e) {
          console.log('Logo not added');
        }
      }

      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('Credit Purchases Report', 105, yPos, { align: 'center' });
      yPos += 8;

      doc.setFontSize(14);
      doc.text(settings.shop.shopName, 105, yPos, { align: 'center' });
      yPos += 10;

      if (settings.reports.showContactInfo) {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(settings.shop.shopAddress, 105, yPos, { align: 'center' });
        yPos += 5;
        doc.text(`Tel: ${settings.shop.shopPhone} | Email: ${settings.shop.shopEmail}`, 105, yPos, { align: 'center' });
        yPos += 10;
      }

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(`Customer: ${customer.name_en}`, 14, yPos);
      yPos += 6;
      doc.text(`Code: ${customer.code}`, 14, yPos);
      yPos += 6;
      doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, yPos);
      yPos += 10;

      customerSales.forEach((transaction, index) => {
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(`Transaction Date: ${transaction.date}`, 14, yPos);
        doc.text(`Total: ${settings.shop.currency} ${transaction.grandTotal.toFixed(2)}`, 196, yPos, { align: 'right' });
        yPos += 7;

        const tableData = transaction.items.map(item => [
          item.name_en,
          item.item_code,
          item.qty.toString(),
          `${settings.shop.currency} ${item.price.toFixed(2)}`,
          `${settings.shop.currency} ${(item.qty * item.price).toFixed(2)}`
        ]);

        autoTable(doc, {
          startY: yPos,
          head: [['Item', 'Code', 'Qty', 'Price', 'Total']],
          body: tableData,
          theme: 'grid',
          headStyles: {
            fillColor: [59, 130, 246],
            fontSize: 9,
            halign: 'center'
          },
          bodyStyles: {
            fontSize: 8,
            font: 'helvetica'
          },
          columnStyles: {
            0: { cellWidth: 70, halign: 'left' },
            1: { cellWidth: 30, halign: 'center' },
            2: { cellWidth: 20, halign: 'center' },
            3: { cellWidth: 35, halign: 'right' },
            4: { cellWidth: 35, halign: 'right' }
          },
          margin: { left: 14, right: 14 }
        });

        yPos = (doc as any).lastAutoTable.finalY + 8;
      });

      if (yPos > 260) {
        doc.addPage();
        yPos = 20;
      }

      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.5);
      doc.line(14, yPos, 196, yPos);
      yPos += 8;

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(59, 130, 246);
      doc.text(`Total Outstanding: ${settings.shop.currency} ${(customer.outstanding_balance || 0).toFixed(2)}`, 196, yPos, { align: 'right' });
      yPos += 15;

      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(150, 150, 150);
      doc.text(settings.reports.customerOutstandingFooter, 105, yPos, { align: 'center', maxWidth: 180 });

      doc.save(`${customer.name_en}_Credit_Purchases_Report.pdf`);
      showSuccess(t('download_report_successful'));
    } catch (error) {
      console.error('PDF generation error:', error);
      showError(t('error_generating_pdf_report'));
    }
  };


  const TelegramIcon = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
    </svg>
  );

  const ViberIcon = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M19.39 3.55C17.43 1.95 14.54 1.25 11.53 1.25c-4.48 0-8.23 2.5-9.84 6.37C.71 9.98.67 12.38 1.57 14.67c.69 1.76 1.83 3.32 3.33 4.54l-.56 2.37c-.16.66.42 1.25 1.07 1.07l2.84-.79c1.17.44 2.42.69 3.73.69 4.47 0 8.22-2.5 9.83-6.37.98-2.36 1.02-4.76.12-7.05-.68-1.76-1.83-3.32-3.33-4.54l.79-1.04zm-1.85 11.83c-1.28 3.08-4.32 5.07-7.96 5.07-1.06 0-2.08-.18-3.04-.53l-2.09.58.42-1.78c-1.22-1-2.15-2.27-2.7-3.7-.72-1.84-.69-3.77.1-5.67 1.28-3.08 4.31-5.07 7.95-5.07 2.47 0 4.83.58 6.43 1.89 1.23 1 2.16 2.27 2.71 3.7.72 1.85.69 3.78-.1 5.68l-.72-.17z" />
      <path d="M13.2 7.74c-.2-.04-.41.08-.45.28-.05.2.07.41.28.45 1.48.27 2.65 1.44 2.92 2.92.03.18.18.31.36.31.03 0 .06 0 .09-.02.2-.04.33-.24.29-.45-.33-1.81-1.77-3.25-3.49-3.49zm-.52-1.85c-.2-.04-.4.08-.44.28-.04.2.08.4.28.44 2.44.46 4.37 2.39 4.83 4.83.03.18.18.31.36.31.03 0 .05 0 .08-.01.2-.04.33-.24.29-.44-.52-2.82-2.76-5.05-5.4-5.41zm-1.7 6.47c-.24-.31-.59-.44-.9-.35-.34.1-.73.44-1.09.82-.41-.24-.87-.58-1.33-1.04-.46-.46-.8-.92-1.04-1.33.38-.36.72-.75.82-1.09.09-.31-.04-.66-.35-.9L7.4 8.04c-.32-.25-.76-.23-1.04.06l-.76.77c-.4.4-.55.98-.37 1.52.48 1.43 1.5 3.32 3.03 4.85 1.53 1.53 3.42 2.55 4.85 3.03.54.18 1.12.03 1.52-.37l.77-.76c.29-.28.31-.72.06-1.04l-1.48-1.69z" />
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
      const custCreditSales = sales.filter(s =>
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

      if (res?.ok) {
        showSuccess(`Statement sent to ${customer.name_en || customer.name_dv} via Telegram! 🚀`);
      } else {
        showError(res?.description || 'Failed to send Telegram statement');
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
      const custCreditSales = sales.filter(s =>
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

  const handleSendPoliteReminder = async (customer: Customer) => {
    if (!customer.telegram_chat_id) {
      handleOpenTelegramConnect(customer);
      return;
    }

    let balance = Number(customer.outstanding_balance || 0);
    const limit = Number(customer.credit_limit || 0);
    const isThreshold = limit > 0 && balance >= limit * 0.9;
    const thresholdPct = limit > 0 ? Math.round((balance / limit) * 100) : undefined;

    try {
      setIsSendingReminder(customer.id);
      const res = await sendAutomatedCreditReminder({
        chatId: customer.telegram_chat_id,
        customer,
        shopSettings: settings.shop,
        balance,
        isThreshold,
        thresholdPct,
        creditLimit: limit,
        token: settings.telegram?.botToken,
      });

      if (res?.ok) {
        showSuccess(`Polite reminder sent to ${customer.name_en || customer.name_dv}! 📤`);
      } else {
        showError(res?.description || 'Failed to send reminder via Telegram');
      }
    } catch (err: any) {
      showError(err.message || 'Failed to send reminder');
    } finally {
      setIsSendingReminder(null);
    }
  };

  const linkedCustomersWithDue = customers.filter(
    c => Boolean(c.telegram_chat_id) && Number(c.outstanding_balance || 0) > 0
  );

  const handleOpenBatchRemindersDialog = () => {
    setSelectedCustomerIdsForReminder(linkedCustomersWithDue.map(c => c.id));
    setIsBatchRemindersDialogOpen(true);
  };

  const handleSendBatchReminders = async () => {
    const targets = linkedCustomersWithDue.filter(c => selectedCustomerIdsForReminder.includes(c.id));
    if (targets.length === 0) {
      showError('Please select at least one customer');
      return;
    }

    setIsSendingBatch(true);
    setBatchProgress({ sent: 0, total: targets.length });

    let successCount = 0;
    for (let i = 0; i < targets.length; i++) {
      const cust = targets[i];
      try {
        const balance = Number(cust.outstanding_balance || 0);
        const limit = Number(cust.credit_limit || 0);
        const isThreshold = limit > 0 && balance >= limit * 0.9;
        const thresholdPct = limit > 0 ? Math.round((balance / limit) * 100) : undefined;

        const res = await sendAutomatedCreditReminder({
          chatId: cust.telegram_chat_id!,
          customer: cust,
          shopSettings: settings.shop,
          balance,
          isThreshold,
          thresholdPct,
          creditLimit: limit,
          token: settings.telegram?.botToken,
        });
        if (res?.ok) successCount++;
      } catch (e) {
        console.warn('Batch reminder error for customer:', cust.name_en, e);
      }
      setBatchProgress({ sent: i + 1, total: targets.length });
    }

    setIsSendingBatch(false);
    setIsBatchRemindersDialogOpen(false);
    showSuccess(`Sent automated reminders to ${successCount} customers! 🎉`);
  };

  const renderBoth = (key: string, options?: any) => (
    <>
      {t(key, options)} ({t(key, { ...options, lng: 'en' })})
    </>
  );

  const renderBothString = (key: string, options?: any) => {
    return `${t(key, options)} (${t(key, { ...options, lng: 'en' })})`;
  };

  const allSettlements = customers.flatMap(c =>
    (c.settlement_history || []).map(s => ({
      ...s,
      customerName: c.name_dv || c.name_en,
      customerEn: c.name_en
    }))
  ).sort((a, b) => {
    const timeA = new Date(a.date).getTime() || 0;
    const timeB = new Date(b.date).getTime() || 0;
    return timeB - timeA;
  }).slice(0, 15);

  return (
    <div className="p-6 font-faruma flex flex-col h-full bg-background text-foreground overflow-hidden" dir="rtl">
      {/* Header & Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
        <div className="lg:col-span-3">
           <div className="flex justify-between items-center mb-6">
              <div className="text-right">
                 <h1 className="text-3xl font-black text-foreground flex items-center justify-end gap-3">
                   {renderBoth('credit_outstanding')} <DollarSign className="h-8 w-8 text-primary" />
                 </h1>
                 <p className="text-sm text-muted-foreground mt-1">Manage receivables and track customer credit history</p>
              </div>
              <div className="flex gap-2">
                 <Button
                   onClick={() => setIsTransferSlipsDialogOpen(true)}
                   variant="outline"
                   className="gap-2 h-11 px-5 rounded-xl font-bold border-border relative bg-card hover:bg-muted"
                 >
                   <CreditCard className="h-4 w-4 text-primary" />
                   TRANSFER SLIPS
                   {pendingSlipsCount > 0 && (
                     <Badge className="bg-amber-500 text-black font-black text-xs animate-pulse ml-1">
                       {pendingSlipsCount} NEW
                     </Badge>
                   )}
                 </Button>
              </div>
            </div>

            {pendingSlipsCount > 0 && (
              <div
                onClick={() => setIsTransferSlipsDialogOpen(true)}
                className="mb-4 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between cursor-pointer hover:bg-amber-500/15 transition-all shadow-sm group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-black animate-pulse">
                    <CreditCard className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-black text-foreground text-sm flex items-center gap-2">
                      <span>{pendingSlipsCount} Bank Transfer Slip(s) Awaiting Cashier Verification</span>
                      <Badge className="bg-amber-500 text-black text-[10px] font-bold">ACTION REQUIRED</Badge>
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Customer submitted transfer slips via Telegram bot. Click here to verify and settle their tabs.
                    </p>
                  </div>
                </div>
                <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-xl gap-1">
                  Review & Settle Slips
                </Button>
              </div>
            )}

           <ScrollArea className="h-[140px] overflow-hidden">
              <div className="flex gap-4 p-1" dir="ltr">
                {allSettlements.length === 0 ? (
                  <div className="w-full h-24 flex items-center justify-center border-2 border-dashed border-white/20 dark:border-white/10 rounded-3xl text-muted-foreground/30 font-black uppercase tracking-widest text-[10px]">
                     No recent settlements recorded
                  </div>
                ) : (
                  allSettlements.map((s) => (
                    <div key={s.id} className="min-w-[220px] apple-glass-card border border-white/20 dark:border-white/10 hover:border-green-500/40 rounded-3xl p-4 text-left transition-all group shadow-sm">
                       <div className="flex items-center justify-between mb-3">
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          <span className="text-[8px] font-black text-muted-foreground/50 uppercase tracking-widest">{formatDate(s.date)} {formatTime(s.date)}</span>
                       </div>
                       <p className="font-black text-foreground text-sm truncate mb-1" dir="rtl">{s.customerName}</p>
                       <p className="text-xl font-black text-green-500">{settings.shop.currency} {s.amount_paid.toFixed(0)}</p>
                    </div>
                  ))
                )}
              </div>
           </ScrollArea>
        </div>

        <Card className="apple-glass-card border border-orange-500/30 rounded-[2rem] p-6 relative overflow-hidden group shadow-md">
           <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-orange-500/20 transition-all" />
           <div className="flex justify-between items-center mb-6">
              <AlertCircle className="h-6 w-6 text-orange-500" />
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-muted-foreground/50 hover:text-foreground hover:bg-white/10"
                onClick={() => setIsOutstandingVisible(!isOutstandingVisible)}
              >
                <History className={cn("h-4 w-4", !isOutstandingVisible && "opacity-50")} />
              </Button>
           </div>
           <div className="text-right">
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Total Outstanding</p>
              <p className={cn("text-3xl font-black text-foreground transition-all", !isOutstandingVisible && "blur-lg select-none")}>
                {settings.shop.currency} {customers.reduce((sum, c) => sum + (c.outstanding_balance || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 0 })}
              </p>
              <p className="text-[10px] text-orange-500/70 mt-2 font-black uppercase tracking-widest">Across {filteredCustomers.length} Accounts</p>
           </div>
        </Card>
      </div>

      {/* Search & Actions Bar */}
      <div className="flex flex-row-reverse gap-4 mb-8">
        <div className="relative flex-1">
           <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
           <Input 
             placeholder="Search by customer name or ID code..."
             value={searchTerm}
             onChange={(e) => setSearchTerm(e.target.value)}
             className="w-full apple-glass-input rounded-2xl pr-12 h-14 text-right font-bold transition-all text-lg shadow-sm"
           />
        </div>
        <Button
          onClick={handleOpenBatchRemindersDialog}
          className="h-14 px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs gap-2 shadow-lg hover:shadow-emerald-500/20 transition-all flex items-center active:scale-[0.98]"
        >
          <BellRing className="h-4 w-4" />
          <span>AUTOMATED REMINDERS</span>
          {linkedCustomersWithDue.length > 0 && (
            <Badge className="bg-white/20 text-white border-none text-[10px] px-2 py-0.5 rounded-full font-mono font-bold">
              {linkedCustomersWithDue.length}
            </Badge>
          )}
        </Button>
        <Button onClick={exportAllOutstanding} variant="outline" className="h-14 px-6 rounded-2xl border-white/20 dark:border-white/10 hover:bg-white/10 gap-2 font-bold">
           <Download className="h-4 w-4" /> EXPORT REPORT
        </Button>
      </div>

      {/* Customers List */}
      <ScrollArea className="flex-1 custom-scrollbar">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6 pb-6">
          {filteredCustomers.map((customer) => (
            <Card key={customer.id} className="apple-glass-card border border-white/20 dark:border-white/10 hover:border-primary/40 transition-all rounded-[2rem] overflow-hidden group shadow-sm hover:shadow-lg">
               <CardContent className="p-0">
                  <div className="p-6">
                     <div className="flex justify-between items-start mb-6">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:scale-110 transition-all">
                           <User className="h-6 w-6" />
                        </div>
                        <div className="flex items-center gap-1.5">
                          {customer.credit_limit > 0 && (customer.outstanding_balance >= customer.credit_limit * 0.9) && (
                            <Badge className="bg-red-500/15 text-red-500 border border-red-500/30 text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                              <AlertCircle className="h-2.5 w-2.5" />
                              {Math.round((customer.outstanding_balance / customer.credit_limit) * 100)}% LIMIT
                            </Badge>
                          )}
                          <Badge className="bg-primary/20 text-primary border-none text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">{customer.code}</Badge>
                        </div>
                     </div>

                     <div className="text-right mb-6">
                        <h3 className="text-xl font-black text-foreground leading-tight mb-1">{customer.name_dv}</h3>
                        <p className="text-xs sm:text-[13px] font-bold text-muted-foreground uppercase tracking-wider">{customer.name_en}</p>
                     </div>

                     <div className="bg-red-500/5 p-4 rounded-2xl border border-red-500/10 mb-6 text-right group-hover:bg-red-500/10 transition-all">
                        <p className="text-[9px] font-black text-red-500/60 uppercase tracking-widest mb-1">Total Due</p>
                        <div className="flex justify-between items-end mb-1">
                          <span className={cn(
                            "text-2xl font-black cursor-pointer transition-all duration-300",
                            customer.outstanding_balance > (customer.credit_limit || 0) ? "text-red-500" : "text-foreground",
                            !revealedTotals.has(customer.id) && "blur-md select-none"
                          )} onClick={() => toggleTotalReveal(customer.id)}>
                            {settings.shop.currency} {(customer.outstanding_balance || 0).toFixed(2)}
                          </span>
                        </div>
                        <div className="space-y-1.5 mt-3">
                          <Progress value={Math.min(100, (customer.outstanding_balance / (customer.credit_limit || 1)) * 100)} className="h-1.5 bg-muted" />
                          <div className="flex justify-between text-xs font-bold text-muted-foreground uppercase tracking-tight">
                             <span>Limit: {settings.shop.currency} {customer.credit_limit.toFixed(2)}</span>
                             <span>{Math.round((customer.outstanding_balance / (customer.credit_limit || 1)) * 100)}% Used</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground/80 mt-2 font-bold">
                           <Clock className="h-3.5 w-3.5" />
                           <span>LAST SETTLED: {customer.settlement_history.length > 0 ? formatDate(customer.settlement_history[customer.settlement_history.length - 1].date) : 'NONE'}</span>
                        </div>
                     </div>

                     <div className="grid grid-cols-3 gap-2">
                        <Button 
                          onClick={() => handleSettlePaymentClick(customer)}
                          className="bg-primary hover:bg-primary/90 text-white text-xs font-black h-10 rounded-xl transition-all uppercase px-1 shadow-md shadow-primary/20"
                        >
                          SETTLE
                        </Button>
                        <Button 
                          variant="ghost"
                          onClick={() => handleViewSettlementHistory(customer)}
                          className="bg-muted hover:bg-muted/80 text-foreground text-xs font-black h-10 rounded-xl border border-border transition-all uppercase px-1"
                        >
                          HISTORY
                        </Button>
                        <Button 
                          variant="ghost"
                          onClick={() => handleViewCreditPurchases(customer)}
                          className="bg-muted hover:bg-muted/80 text-foreground text-xs font-black h-10 rounded-xl border border-border transition-all uppercase px-1"
                        >
                          DETAILS
                        </Button>
                     </div>

                      <div className="space-y-1.5 mt-2">
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
                           <span>{customer.telegram_chat_id ? 'Send via Telegram (ޓެލެގްރާމް)' : 'Link Telegram to Send Statement'}</span>
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
                  </div>
               </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>

      {/* Dialogs updated with Apple Liquid Glass styling (Settle Payment, Settlement History, Credit Purchases) */}
      <Dialog open={isSettlePaymentDialogOpen} onOpenChange={setIsSettlePaymentDialogOpen}>
        <DialogContent className="sm:max-w-[32rem] 2xl:max-w-[38rem] w-[calc(100vw-2rem)] font-faruma apple-glass-dialog border-white/20 dark:border-white/10 text-foreground p-6 sm:p-7 shadow-2xl rounded-3xl overflow-hidden box-border [&>button]:left-4 [&>button]:right-auto" dir="rtl">
          <DialogHeader className="text-right pb-3 border-b border-white/10 dark:border-white/5">
            <div className="flex items-start justify-between gap-3 pl-8">
              <Badge variant="outline" className="bg-primary/15 text-primary border-primary/30 text-[11px] font-mono font-bold mt-1 rounded-xl px-2.5 py-0.5">
                {selectedCustomerForAction?.code}
              </Badge>
              <div className="text-right flex-1 min-w-0">
                <DialogTitle className="text-xl font-black text-foreground flex items-center justify-end gap-2">
                  <span>{t('settle_payment')}</span>
                  <DollarSign className="h-5 w-5 text-emerald-500 shrink-0" />
                </DialogTitle>
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mt-0.5 truncate">
                  {selectedCustomerForAction?.name_dv} ({selectedCustomerForAction?.name_en})
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="py-3 space-y-4 text-right">
            {/* Balance Overview Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 backdrop-blur-md text-right space-y-1">
                <p className="text-[9px] font-black uppercase tracking-wider text-red-600 dark:text-red-400">
                  {renderBoth('current_outstanding')}
                </p>
                <p className="text-xl font-black text-red-600 dark:text-red-400 font-mono">
                  {settings.shop.currency} {(selectedCustomerForAction?.outstanding_balance || 0).toFixed(2)}
                </p>
              </div>

              <div className={cn(
                "p-3.5 rounded-2xl border text-right space-y-1 transition-all backdrop-blur-md",
                currentOutstandingAfterPayment > 0 
                  ? "bg-orange-500/10 border-orange-500/20 text-orange-600 dark:text-orange-400" 
                  : "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
              )}>
                <p className="text-[9px] font-black uppercase tracking-wider">
                  {renderBoth('new_outstanding')}
                </p>
                <p className="text-xl font-black font-mono">
                  {settings.shop.currency} {currentOutstandingAfterPayment.toFixed(2)}
                </p>
              </div>
            </div>

            {/* Payment Input */}
            <div className="space-y-2.5 bg-black/10 dark:bg-white/5 p-4 rounded-2xl border border-white/15 dark:border-white/10 backdrop-blur-md">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-muted-foreground uppercase font-mono">
                  Enter Amount
                </span>
                <Label className="text-right block text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                  {renderBoth('amount_to_pay')}
                </Label>
              </div>

              <div className="relative w-full">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max={selectedCustomerForAction?.outstanding_balance || undefined}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value === '' ? '' : (parseFloat(e.target.value) || 0))}
                  onFocus={(e) => e.target.select()}
                  className="text-right h-12 apple-glass-input text-2xl font-black text-foreground font-mono pl-14 pr-4 rounded-2xl w-full"
                  autoFocus
                  placeholder="0.00"
                />
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-black text-primary font-mono">
                  {settings.shop.currency}
                </span>
              </div>

              {/* Quick Preset Buttons */}
              <div className="grid grid-cols-3 gap-2 pt-1">
                <Button 
                  type="button"
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    const bal = selectedCustomerForAction?.outstanding_balance || 0;
                    setPaymentAmount(Math.round((bal * 0.25) * 100) / 100);
                  }}
                  className="text-[10px] font-black h-8 rounded-xl border-white/20 dark:border-white/10 hover:bg-white/10 font-mono active:scale-95 transition-all"
                >
                  25%
                </Button>
                <Button 
                  type="button"
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    const bal = selectedCustomerForAction?.outstanding_balance || 0;
                    setPaymentAmount(Math.round((bal * 0.5) * 100) / 100);
                  }}
                  className="text-[10px] font-black h-8 rounded-xl border-white/20 dark:border-white/10 hover:bg-white/10 font-mono active:scale-95 transition-all"
                >
                  50%
                </Button>
                <Button 
                  type="button"
                  variant="outline" 
                  size="sm" 
                  onClick={() => setPaymentAmount(selectedCustomerForAction?.outstanding_balance || 0)}
                  className="text-[10px] font-black h-8 rounded-xl bg-primary/15 hover:bg-primary/25 text-primary border-primary/30 active:scale-95 transition-all"
                >
                  {renderBoth('pay_all_outstanding')}
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter className="flex sm:flex-row flex-row-reverse gap-2.5 pt-4 border-t border-white/10 dark:border-white/5 space-x-0 sm:space-x-0 w-full">
            <Button 
              onClick={processSettlement} 
              disabled={!paymentAmount || paymentAmount <= 0} 
              className="flex-1 h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs uppercase rounded-2xl shadow-lg shadow-primary/25 active:scale-[0.98] transition-all"
            >
              {renderBoth('confirm_settlement')}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setIsSettlePaymentDialogOpen(false)} 
              className="flex-1 h-11 border-white/20 dark:border-white/10 hover:bg-white/10 text-foreground text-xs font-bold rounded-2xl active:scale-[0.98] transition-all"
            >
              {renderBoth('cancel')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Settlement History Dialog */}
      <Dialog open={isSettlementHistoryDialogOpen} onOpenChange={setIsSettlementHistoryDialogOpen}>
        <DialogContent className="sm:max-w-[36rem] 2xl:max-w-[42rem] w-[calc(100vw-2rem)] font-faruma apple-glass-dialog border-white/20 dark:border-white/10 text-foreground p-6 sm:p-7 shadow-2xl rounded-3xl overflow-hidden box-border [&>button]:left-4 [&>button]:right-auto" dir="rtl">
          <DialogHeader className="text-right pb-3 border-b border-white/10 dark:border-white/5">
            <div className="pl-8">
              <DialogTitle className="text-xl font-black flex items-center justify-end gap-2">
                <span>{renderBoth('settlement_history')}</span>
                <History className="h-5 w-5 text-primary shrink-0" />
              </DialogTitle>
              <DialogDescription className="text-right text-muted-foreground text-xs mt-0.5">
                {selectedCustomerForAction?.name_dv} ({selectedCustomerForAction?.name_en})
              </DialogDescription>
            </div>
          </DialogHeader>
          <ScrollArea className="h-[400px] mt-4 pr-2 custom-scrollbar">
            <div className="space-y-3">
              {selectedCustomerForAction?.settlement_history && selectedCustomerForAction.settlement_history.length > 0 ? (
                [...selectedCustomerForAction.settlement_history]
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map((settlement, idx) => (
                  <div key={settlement.id || idx} className="p-4 rounded-2xl apple-glass-card border border-white/20 dark:border-white/10 text-right relative overflow-hidden group">
                    <div className="flex justify-between items-center mb-2">
                       <span className="text-[10px] font-mono text-muted-foreground/80">{formatDate(settlement.date)} {formatTime(settlement.date)}</span>
                       <span className="text-sm font-black text-green-500 font-mono">+{settings.shop.currency} {settlement.amount_paid.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-bold text-muted-foreground font-mono">
                       <span>NEW: {settlement.new_outstanding.toFixed(2)}</span>
                       <span>PREV: {settlement.previous_outstanding.toFixed(2)}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center h-40 opacity-30">
                  <Clock className="h-10 w-10 mb-2" />
                  <p className="font-black uppercase tracking-widest">{renderBothString('no_settlement_history')}</p>
                </div>
              )}
            </div>
          </ScrollArea>
          <DialogFooter className="pt-4 border-t border-white/10 dark:border-white/5">
            <Button onClick={() => setIsSettlementHistoryDialogOpen(false)} className="w-full h-11 rounded-2xl border-white/20 dark:border-white/10 hover:bg-white/10 text-foreground font-bold active:scale-[0.98] transition-all" variant="outline">
              {renderBoth('close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Credit Purchases (Details) Dialog */}
      <Dialog open={isCreditPurchasesDialogOpen} onOpenChange={setIsCreditPurchasesDialogOpen}>
        <DialogContent className="sm:max-w-[42rem] 2xl:max-w-[50rem] w-[calc(100vw-2rem)] font-faruma apple-glass-dialog border-white/20 dark:border-white/10 text-foreground p-6 sm:p-7 shadow-2xl rounded-3xl overflow-hidden box-border [&>button]:left-4 [&>button]:right-auto" dir="rtl">
          <DialogHeader className="text-right pb-3 border-b border-white/10 dark:border-white/5">
            <div className="pl-8">
              <DialogTitle className="text-xl font-black flex items-center justify-end gap-2">
                <span>{renderBoth('credit_purchases')}</span>
                <ShoppingBag className="h-5 w-5 text-orange-500 shrink-0" />
              </DialogTitle>
              <DialogDescription className="text-right text-muted-foreground text-xs mt-0.5">
                {selectedCustomerForAction?.name_dv} ({selectedCustomerForAction?.name_en})
              </DialogDescription>
            </div>
          </DialogHeader>
          <ScrollArea className="h-[450px] mt-4 pr-3 custom-scrollbar">
            <div className="space-y-3">
              {selectedCustomerCreditSales.length > 0 ? (
                [...selectedCustomerCreditSales]
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map((sale) => {
                  const splitEntry = sale.splitDetails?.find((d: any) => d.customerId === selectedCustomerForAction?.id && d.method?.toLowerCase() === 'credit');
                  const isSplit = !!splitEntry;
                  const displayAmount = isSplit ? splitEntry.amount : sale.grandTotal;

                  return (
                    <div key={sale.id} className="p-4 rounded-2xl apple-glass-card border border-white/20 dark:border-white/10 text-right relative overflow-hidden group">
                      {isSplit && (
                        <div className="absolute top-0 left-0 bg-blue-500/20 text-blue-500 text-[8px] font-black px-3 py-1 rounded-br-xl uppercase tracking-widest z-10 backdrop-blur-md">
                          Split Bill
                        </div>
                      )}
                      <div className="flex justify-between items-center mb-3">
                         <div className="flex items-center gap-2">
                           <Badge variant="outline" className="border-orange-500/30 text-orange-500 text-[8px] font-black rounded-lg">{sale.invoiceNumber || sale.id}</Badge>
                           <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground hover:bg-white/10 rounded-full" onClick={(e) => { e.stopPropagation(); handleEditSale(sale); }}>
                             <Edit className="h-3 w-3" />
                           </Button>
                         </div>
                         <span className="text-[10px] font-mono text-muted-foreground">{formatDate(sale.date)} {formatTime(sale.date)}</span>
                      </div>
                      <div className="space-y-2 mb-3">
                        {sale.items.map((item: any, i: number) => (
                          <div key={i} className="flex justify-between items-center text-xs">
                            <span className="text-muted-foreground font-mono">{item.qty} x {item.price.toFixed(2)}</span>
                            <span className="font-bold">{item.name_dv}</span>
                          </div>
                        ))}
                      </div>
                      <div className="pt-3 border-t border-white/10 dark:border-white/5 flex justify-between items-center">
                         <span className="text-sm font-black text-foreground font-mono">{settings.shop.currency} {displayAmount.toFixed(2)}</span>
                         <span className="text-[10px] font-black text-muted-foreground/70 uppercase">
                           {isSplit ? 'Your Portion' : 'Total Invoice'}
                         </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center h-40 opacity-30">
                  <FileText className="h-10 w-10 mb-2" />
                  <p className="font-black uppercase tracking-widest">No credit purchases found</p>
                </div>
              )}
            </div>
          </ScrollArea>
          <DialogFooter className="pt-4 border-t border-white/10 dark:border-white/5">
            <Button onClick={() => setIsCreditPurchasesDialogOpen(false)} variant="outline" className="w-full h-11 rounded-2xl border-white/20 dark:border-white/10 hover:bg-white/10 text-foreground font-bold active:scale-[0.98] transition-all">
              {renderBoth('close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <TransferSlipsDialog
        open={isTransferSlipsDialogOpen}
        onOpenChange={setIsTransferSlipsDialogOpen}
      />

      {editingSale && (
        <SaleEditDialog
          isOpen={isEditSaleDialogOpen}
          onClose={() => setIsEditSaleDialogOpen(false)}
          sale={editingSale}
          onSave={handleSaveSaleUpdate}
        />
      )}

      {/* Telegram Connect Dialog */}
      <TelegramConnectDialog
        customer={telegramCustomer}
        isOpen={isTelegramDialogOpen}
        onClose={() => {
          setIsTelegramDialogOpen(false);
          setTelegramCustomer(null);
        }}
      />

      {/* Batch Automated Overdue Reminders Dialog */}
      <Dialog open={isBatchRemindersDialogOpen} onOpenChange={setIsBatchRemindersDialogOpen}>
        <DialogContent className="sm:max-w-[44rem] 2xl:max-w-[52rem] w-[calc(100vw-2rem)] font-faruma apple-glass-dialog border-white/20 dark:border-white/10 text-foreground p-6 sm:p-7 shadow-2xl rounded-3xl overflow-hidden box-border [&>button]:left-4 [&>button]:right-auto max-h-[90vh] flex flex-col" dir="rtl">
          <DialogHeader className="text-right pb-4 border-b border-white/10 dark:border-white/5">
            <div className="flex items-center justify-between pl-8">
              <Badge className="bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 text-xs font-mono font-bold rounded-xl px-2.5 py-1 backdrop-blur-md">
                {linkedCustomersWithDue.length} Connected
              </Badge>
              <div className="text-right">
                <DialogTitle className="text-xl font-black text-foreground flex items-center justify-end gap-2">
                  <span>Automated Tab Overdue Reminders</span>
                  <BellRing className="h-5 w-5 text-emerald-500" />
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Send polite, automated Telegram reminders with instant [ 📤 Send Transfer Slip ] buttons.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-4 space-y-4 text-right custom-scrollbar">
            {/* Summary Banner */}
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 backdrop-blur-md flex items-center justify-between">
              <div className="text-left">
                <p className="text-[10px] uppercase font-black tracking-wider text-muted-foreground">Selected Total Due</p>
                <p className="text-xl font-black text-emerald-500 font-mono">
                  {settings.shop.currency} {linkedCustomersWithDue
                    .filter(c => selectedCustomerIdsForReminder.includes(c.id))
                    .reduce((sum, c) => sum + (c.outstanding_balance || 0), 0)
                    .toFixed(2)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-black text-foreground">
                  {selectedCustomerIdsForReminder.length} of {linkedCustomersWithDue.length} Customers Selected
                </p>
                <div className="flex gap-2 mt-1 justify-end">
                  <button
                    type="button"
                    onClick={() => setSelectedCustomerIdsForReminder(linkedCustomersWithDue.map(c => c.id))}
                    className="text-[11px] font-bold text-emerald-500 hover:underline"
                  >
                    Select All
                  </button>
                  <span className="text-muted-foreground/40">•</span>
                  <button
                    type="button"
                    onClick={() => setSelectedCustomerIdsForReminder([])}
                    className="text-[11px] font-bold text-muted-foreground hover:underline"
                  >
                    Deselect All
                  </button>
                </div>
              </div>
            </div>

            {/* Customer Selection List */}
            <div className="space-y-2">
              <Label className="text-xs font-black text-muted-foreground uppercase tracking-wider block text-right">
                Select Recipients:
              </Label>
              <div className="max-h-[220px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {linkedCustomersWithDue.length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground text-xs font-bold bg-white/5 rounded-2xl border border-dashed border-white/10">
                    No customers with outstanding balances are currently linked to Telegram.
                  </div>
                ) : (
                  linkedCustomersWithDue.map(c => {
                    const isSelected = selectedCustomerIdsForReminder.includes(c.id);
                    const isThreshold = c.credit_limit > 0 && c.outstanding_balance >= c.credit_limit * 0.9;
                    const pct = c.credit_limit > 0 ? Math.round((c.outstanding_balance / c.credit_limit) * 100) : 0;
                    return (
                      <div
                        key={c.id}
                        onClick={() => {
                          setSelectedCustomerIdsForReminder(prev =>
                            prev.includes(c.id) ? prev.filter(id => id !== c.id) : [...prev, c.id]
                          );
                        }}
                        className={cn(
                          "p-3 rounded-2xl border transition-all duration-200 cursor-pointer flex items-center justify-between gap-3 active:scale-[0.99]",
                          isSelected ? "apple-glass-card bg-emerald-500/10 border-emerald-500/30" : "apple-glass-card border-white/15 dark:border-white/10 hover:bg-white/10"
                        )}
                      >
                        <div className="text-left font-mono">
                          <p className="text-sm font-black text-red-500">
                            {settings.shop.currency} {Number(c.outstanding_balance || 0).toFixed(2)}
                          </p>
                          {isThreshold && (
                            <Badge className="bg-red-500/15 text-red-500 border-none text-[8px] font-black px-1.5 py-0 rounded-md">
                              {pct}% LIMIT
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-right">
                          <div>
                            <p className="text-sm font-black text-foreground">{c.name_en || c.name_dv}</p>
                            <p className="text-[10px] font-mono text-muted-foreground">{c.code}</p>
                          </div>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => {}}
                            className="h-4 w-4"
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Message Preview */}
            <div className="p-4 rounded-2xl bg-black/10 dark:bg-white/5 border border-white/15 dark:border-white/10 text-right space-y-2 backdrop-blur-md">
              <div className="flex items-center justify-between text-xs font-black text-muted-foreground pb-2 border-b border-white/10 dark:border-white/5">
                <span className="text-[10px] font-mono text-emerald-500 bg-emerald-500/15 px-2 py-0.5 rounded-lg border border-emerald-500/30">
                  Interactive Telegram Template
                </span>
                <span className="flex items-center gap-1">
                  <MessageSquareQuote className="h-3.5 w-3.5" />
                  Message Draft Preview
                </span>
              </div>
              <div className="text-xs font-mono leading-relaxed text-foreground/80 whitespace-pre-line text-left bg-background/40 backdrop-blur-sm p-3 rounded-xl border border-white/10" dir="ltr">
                {`🌙 As-salamu alaykum [Customer Name],

🏪 ${settings.shop.shopName || 'B BACK'} — (Automated Reminder)

This is a gentle automated reminder regarding your store credit tab:
💰 Outstanding Balance: MVR [Amount]

To settle your tab comfortably, you may transfer to our bank account:
🏦 Bank: ${settings.shop.bankName || 'Bank of Maldives (BML)'}
👤 Account Name: ${settings.shop.accountName || settings.shop.shopName || 'B BACK'}
💳 Account Number: ${settings.shop.accountNumber || '7730000442060'}

Once transferred, tap the button below to submit your payment slip directly in this chat!

[ 📤 Send Transfer Slip ]`}
              </div>
            </div>
          </div>

          <DialogFooter className="pt-4 border-t border-white/10 dark:border-white/5 flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsBatchRemindersDialogOpen(false)}
              disabled={isSendingBatch}
              className="flex-1 h-12 rounded-2xl border-white/20 dark:border-white/10 hover:bg-white/10 text-foreground font-bold active:scale-[0.98] transition-all"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSendBatchReminders}
              disabled={isSendingBatch || selectedCustomerIdsForReminder.length === 0}
              className="flex-[2] h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs gap-2 shadow-lg shadow-emerald-500/25 active:scale-[0.98] transition-all"
            >
              {isSendingBatch ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Sending ({batchProgress.sent} / {batchProgress.total})...</span>
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  <span>Send Reminders ({selectedCustomerIdsForReminder.length})</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CreditOutstanding;