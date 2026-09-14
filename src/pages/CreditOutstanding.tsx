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
import AddCreditSaleDialog from '@/components/AddCreditSaleDialog';
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
import { sendTelegramPaymentReceipt, sendTelegramOutstandingStatement } from '@/services/telegramService';
import { QrCode, Send, Loader2, CreditCard } from 'lucide-react';

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

  const toggleTotalReveal = (customerId: string) => {
    setRevealedTotals(prev => {
      const next = new Set(prev);
      if (next.has(customerId)) next.delete(customerId);
      else next.add(customerId);
      return next;
    });
  };
  const [isAddCreditSaleDialogOpen, setIsAddCreditSaleDialogOpen] = useState(false);
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

  const handleAddCreditSale = (newSale: any) => {
    addSale(newSale as Sale);
    updateCustomerBalance(newSale.customer.id, newSale.grandTotal);
    showSuccess(t('credit_sale_added_successfully'));
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
                 <Button onClick={() => setIsAddCreditSaleDialogOpen(true)} className="gap-2 bg-primary hover:bg-primary/90 h-11 px-6 rounded-xl font-black shadow-[0_0_20px_rgba(0,132,255,0.3)]">
                    <PlusCircle className="h-4 w-4" /> RECORD CREDIT
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
                  <div className="w-full h-24 flex items-center justify-center border-2 border-dashed border-border rounded-3xl text-foreground/10 font-black uppercase tracking-widest text-[10px]">
                     No recent settlements recorded
                  </div>
                ) : (
                  allSettlements.map((s) => (
                    <div key={s.id} className="min-w-[220px] bg-card border border-border hover:border-green-500/30 rounded-3xl p-4 text-left transition-all group shadow-sm">
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

        <Card className="bg-card border-border rounded-[2rem] p-6 relative overflow-hidden group border-orange-500/20">
           <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-orange-500/10 transition-all" />
           <div className="flex justify-between items-center mb-6">
              <AlertCircle className="h-6 w-6 text-orange-500" />
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-muted-foreground/50 hover:text-foreground"
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
              <p className="text-[10px] text-orange-500/60 mt-2 font-black uppercase tracking-widest">Across {filteredCustomers.length} Accounts</p>
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
             className="w-full bg-muted border-border rounded-xl pr-12 h-14 text-right font-bold focus:border-primary/50 transition-all text-lg"
           />
        </div>
        <Button onClick={exportAllOutstanding} variant="outline" className="h-14 px-6 rounded-xl border-border hover:bg-muted gap-2">
           <Download className="h-4 w-4" /> EXPORT REPORT
        </Button>
      </div>

      {/* Customers List */}
      <ScrollArea className="flex-1 custom-scrollbar">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-6">
          {filteredCustomers.map((customer) => (
            <Card key={customer.id} className="bg-card border-border hover:border-primary/30 transition-all rounded-[2rem] overflow-hidden group">
               <CardContent className="p-0">
                  <div className="p-6">
                     <div className="flex justify-between items-start mb-6">
                        <div className="w-12 h-12 rounded-2xl bg-muted border border-border flex items-center justify-center text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-all">
                           <User className="h-6 w-6" />
                        </div>
                        <Badge className="bg-primary/20 text-primary border-none text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">{customer.code}</Badge>
                     </div>

                     <div className="text-right mb-6">
                        <h3 className="text-xl font-black text-foreground leading-tight mb-1">{customer.name_dv}</h3>
                        <p className="text-[10px] font-bold text-foreground/30 uppercase tracking-widest">{customer.name_en}</p>
                     </div>

                     <div className="bg-red-500/5 p-4 rounded-2xl border border-red-500/10 mb-6 text-right group-hover:bg-red-500/10 transition-all">
                        <p className="text-[8px] font-black text-red-500/40 uppercase tracking-widest mb-1">Total Due</p>
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
                          <div className="flex justify-between text-[9px] font-bold opacity-30 uppercase tracking-tighter">
                             <span>Limit: {settings.shop.currency} {customer.credit_limit.toFixed(2)}</span>
                             <span>{Math.round((customer.outstanding_balance / (customer.credit_limit || 1)) * 100)}% Used</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-end gap-2 text-[10px] text-muted-foreground/50 mt-2 font-bold">
                           <Clock className="h-3 w-3" />
                           <span>LAST SETTLED: {customer.settlement_history.length > 0 ? formatDate(customer.settlement_history[customer.settlement_history.length - 1].date) : 'NONE'}</span>
                        </div>
                     </div>

                     <div className="grid grid-cols-3 gap-2">
                        <Button 
                          onClick={() => handleSettlePaymentClick(customer)}
                          className="bg-primary hover:bg-primary/90 text-foreground text-[9px] font-black h-10 rounded-xl transition-all uppercase px-1"
                        >
                          SETTLE
                        </Button>
                        <Button 
                          variant="ghost"
                          onClick={() => handleViewSettlementHistory(customer)}
                          className="bg-muted hover:bg-muted/80 text-foreground text-[9px] font-black h-10 rounded-xl border border-border transition-all uppercase px-1"
                        >
                          HISTORY
                        </Button>
                        <Button 
                          variant="ghost"
                          onClick={() => handleViewCreditPurchases(customer)}
                          className="bg-muted hover:bg-muted/80 text-foreground text-[9px] font-black h-10 rounded-xl border border-border transition-all uppercase px-1"
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

      {/* Dialogs updated with dark theme styling... (Settle Payment, Settlement History, Credit Purchases) */}
      <Dialog open={isSettlePaymentDialogOpen} onOpenChange={setIsSettlePaymentDialogOpen}>
        <DialogContent className="sm:max-w-[460px] w-[calc(100vw-2rem)] font-faruma bg-card text-foreground border border-border p-5 sm:p-6 shadow-2xl rounded-3xl overflow-hidden box-border [&>button]:left-4 [&>button]:right-auto" dir="rtl">
          <DialogHeader className="text-right pb-3 border-b border-border/60">
            <div className="flex items-start justify-between gap-3 pl-8">
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-[11px] font-mono font-bold mt-1">
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
              <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-right space-y-1">
                <p className="text-[9px] font-black uppercase tracking-wider text-red-600 dark:text-red-400">
                  {renderBoth('current_outstanding')}
                </p>
                <p className="text-xl font-black text-red-600 dark:text-red-400 font-mono">
                  {settings.shop.currency} {(selectedCustomerForAction?.outstanding_balance || 0).toFixed(2)}
                </p>
              </div>

              <div className={cn(
                "p-3.5 rounded-2xl border text-right space-y-1 transition-all",
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
            <div className="space-y-2 bg-muted/50 p-4 rounded-2xl border border-border">
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
                  className="text-right h-12 bg-background border-border text-2xl font-black text-foreground font-mono pl-14 pr-4 rounded-xl focus:border-primary transition-all w-full"
                  autoFocus
                  placeholder="0.00"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-primary font-mono">
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
                  className="text-[10px] font-black h-8 rounded-lg border-border hover:bg-muted font-mono"
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
                  className="text-[10px] font-black h-8 rounded-lg border-border hover:bg-muted font-mono"
                >
                  50%
                </Button>
                <Button 
                  type="button"
                  variant="outline" 
                  size="sm" 
                  onClick={() => setPaymentAmount(selectedCustomerForAction?.outstanding_balance || 0)}
                  className="text-[10px] font-black h-8 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border-primary/30"
                >
                  {renderBoth('pay_all_outstanding')}
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter className="flex sm:flex-row flex-row-reverse gap-3 pt-3 border-t border-border space-x-0 sm:space-x-0 w-full">
            <Button 
              onClick={processSettlement} 
              disabled={!paymentAmount || paymentAmount <= 0} 
              className="flex-1 h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs uppercase rounded-xl shadow-lg shadow-primary/25 transition-all"
            >
              {renderBoth('confirm_settlement')}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setIsSettlePaymentDialogOpen(false)} 
              className="flex-1 h-12 border-border hover:bg-muted text-foreground text-xs font-bold rounded-xl"
            >
              {renderBoth('cancel')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Settlement History Dialog */}
      <Dialog open={isSettlementHistoryDialogOpen} onOpenChange={setIsSettlementHistoryDialogOpen}>
        <DialogContent className="sm:max-w-[500px] w-[calc(100vw-2rem)] font-faruma bg-card border border-border text-foreground p-5 sm:p-6 shadow-2xl rounded-3xl overflow-hidden box-border [&>button]:left-4 [&>button]:right-auto" dir="rtl">
          <DialogHeader className="text-right pb-3 border-b border-border/60">
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
          <ScrollArea className="h-[400px] mt-4 pr-2">
            <div className="space-y-3">
              {selectedCustomerForAction?.settlement_history && selectedCustomerForAction.settlement_history.length > 0 ? (
                [...selectedCustomerForAction.settlement_history]
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map((settlement, idx) => (
                  <div key={settlement.id || idx} className="p-4 rounded-2xl bg-muted/60 border border-border text-right relative overflow-hidden group">
                    <div className="flex justify-between items-center mb-2">
                       <span className="text-[10px] font-mono text-muted-foreground/60">{formatDate(settlement.date)} {formatTime(settlement.date)}</span>
                       <span className="text-sm font-black text-green-500 font-mono">+{settings.shop.currency} {settlement.amount_paid.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-bold text-muted-foreground font-mono">
                       <span>NEW: {settlement.new_outstanding.toFixed(2)}</span>
                       <span>PREV: {settlement.previous_outstanding.toFixed(2)}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center h-40 opacity-20">
                  <Clock className="h-10 w-10 mb-2" />
                  <p className="font-black uppercase tracking-widest">{renderBothString('no_settlement_history')}</p>
                </div>
              )}
            </div>
          </ScrollArea>
          <DialogFooter className="pt-3 border-t border-border">
            <Button onClick={() => setIsSettlementHistoryDialogOpen(false)} className="w-full h-11 bg-muted hover:bg-muted/80 text-foreground border border-border font-black rounded-xl">
              {renderBoth('close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Credit Purchases (Details) Dialog */}
      <Dialog open={isCreditPurchasesDialogOpen} onOpenChange={setIsCreditPurchasesDialogOpen}>
        <DialogContent className="sm:max-w-[600px] w-[calc(100vw-2rem)] font-faruma bg-card border border-border text-foreground p-5 sm:p-6 shadow-2xl rounded-3xl overflow-hidden box-border [&>button]:left-4 [&>button]:right-auto" dir="rtl">
          <DialogHeader className="text-right pb-3 border-b border-border/60">
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
          <ScrollArea className="h-[450px] mt-4 pr-4">
            <div className="space-y-4">
              {selectedCustomerCreditSales.length > 0 ? (
                [...selectedCustomerCreditSales]
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map((sale) => {
                  const splitEntry = sale.splitDetails?.find((d: any) => d.customerId === selectedCustomerForAction?.id && d.method?.toLowerCase() === 'credit');
                  const isSplit = !!splitEntry;
                  const displayAmount = isSplit ? splitEntry.amount : sale.grandTotal;

                  return (
                    <div key={sale.id} className="p-4 rounded-2xl bg-muted border border-border text-right relative overflow-hidden group">
                      {isSplit && (
                        <div className="absolute top-0 left-0 bg-blue-500/20 text-blue-500 text-[8px] font-black px-3 py-1 rounded-br-xl uppercase tracking-widest z-10">
                          Split Bill
                        </div>
                      )}
                      <div className="flex justify-between items-center mb-3">
                         <div className="flex items-center gap-2">
                           <Badge variant="outline" className="border-orange-500/30 text-orange-500 text-[8px] font-black">{sale.invoiceNumber || sale.id}</Badge>
                           <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground hover:bg-muted/80 rounded-full" onClick={(e) => { e.stopPropagation(); handleEditSale(sale); }}>
                             <Edit className="h-3 w-3" />
                           </Button>
                         </div>
                         <span className="text-[10px] font-mono text-muted-foreground">{formatDate(sale.date)} {formatTime(sale.date)}</span>
                      </div>
                      <div className="space-y-2 mb-3">
                        {sale.items.map((item: any, i: number) => (
                          <div key={i} className="flex justify-between items-center text-xs">
                            <span className="text-muted-foreground">{item.qty} x {item.price.toFixed(2)}</span>
                            <span className="font-bold">{item.name_dv}</span>
                          </div>
                        ))}
                      </div>
                      <div className="pt-3 border-t border-border flex justify-between items-center">
                         <span className="text-sm font-black text-foreground">{settings.shop.currency} {displayAmount.toFixed(2)}</span>
                         <span className="text-[10px] font-black text-muted-foreground/50 uppercase">
                           {isSplit ? 'Your Portion' : 'Total Invoice'}
                         </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center h-40 opacity-20">
                  <FileText className="h-10 w-10 mb-2" />
                  <p className="font-black uppercase tracking-widest">No credit purchases found</p>
                </div>
              )}
            </div>
          </ScrollArea>
          <DialogFooter className="pt-4 border-t border-border">
            <Button onClick={() => setIsCreditPurchasesDialogOpen(false)} className="w-full h-12 bg-muted hover:bg-muted/80 text-foreground border border-border font-black">
              {renderBoth('close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AddCreditSaleDialog
        isOpen={isAddCreditSaleDialogOpen}
        onClose={() => setIsAddCreditSaleDialogOpen(false)}
        onAdd={handleAddCreditSale}
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

      {/* Bank Transfer Slips Review Dialog */}
      <TransferSlipsDialog
        open={isTransferSlipsDialogOpen}
        onOpenChange={setIsTransferSlipsDialogOpen}
      />
    </div>
  );
};

export default CreditOutstanding;