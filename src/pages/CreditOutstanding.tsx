"use client";

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, History, DollarSign, ShoppingBag, PlusCircle, Download, FileText, User, Activity, TrendingDown, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import AddCreditSaleDialog from '@/components/AddCreditSaleDialog';
import { useAppContext, Product, Sale, Customer } from '@/context/AppContext';
import { cn } from '@/lib/utils';
import { showSuccess, showError } from '@/utils/toast';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Badge } from '@/components/ui/badge';

interface Settlement {
  id: string;
  amount_paid: number;
  date: string;
  previous_outstanding: number;
  new_outstanding: number;
}

const CreditOutstanding = () => {
  const { t } = useTranslation();
  const { customers, sales, setSales, settings, addSettlement, updateCustomerBalance, addSale } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [isOutstandingVisible, setIsOutstandingVisible] = useState(false);

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
  const [isAddCreditSaleDialogOpen, setIsAddCreditSaleDialogOpen] = useState(false);
  const [selectedCustomerForAction, setSelectedCustomerForAction] = useState<Customer | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number | ''>('');

  const filteredCustomers = customers.filter(customer =>
    (customer.outstanding_balance > 0 || searchTerm) && (
      customer.name_dv.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.name_en.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.code.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const selectedCustomerCreditSales = sales.filter(s =>
    s.customer?.id === selectedCustomerForAction?.id && s.paymentMethod === 'credit'
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
        date: new Date().toISOString().split('T')[0],
        previous_outstanding: previousOutstanding,
        new_outstanding: newOutstanding,
      };

      addSettlement(selectedCustomerForAction.id, settlement);

      setIsSettlePaymentDialogOpen(false);
      setSelectedCustomerForAction(null);
      setPaymentAmount('');
      showSuccess(t('settlement_successful'));
    } else {
      showError(t('error_updating_stock'));
    }
  };



  const handleDownloadCreditReport = (customer: Customer) => {
    const customerSales = sales.filter(s => s.customer?.id === customer.id && s.paymentMethod === 'credit');
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


  const renderBoth = (key: string, options?: any) => (
    <>
      {t(key, options)} ({t(key, { ...options, lng: 'en' })})
    </>
  );

  const renderBothString = (key: string, options?: any) => {
    return `${t(key, options)} (${t(key, { ...options, lng: 'en' })})`;
  };

  const allSettlements = customers.flatMap(c =>
    c.settlement_history.map(s => ({
      ...s,
      customerName: c.name_dv,
      customerEn: c.name_en
    }))
  ).sort((a, b) => b.id.localeCompare(a.id))
    .slice(0, 10);

  return (
    <div className="p-6 font-faruma flex flex-col h-full bg-[#050510] text-white overflow-hidden" dir="rtl">
      {/* Header & Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
        <div className="lg:col-span-3">
           <div className="flex justify-between items-center mb-6">
              <div className="text-right">
                 <h1 className="text-3xl font-black text-white flex items-center justify-end gap-3">
                   {renderBoth('credit_outstanding')} <DollarSign className="h-8 w-8 text-primary" />
                 </h1>
                 <p className="text-sm text-white/40 mt-1">Manage receivables and track customer credit history</p>
              </div>
              <div className="flex gap-2">
                 <Button onClick={() => setIsAddCreditSaleDialogOpen(true)} className="gap-2 bg-primary hover:bg-primary/90 h-11 px-6 rounded-xl font-black shadow-[0_0_20px_rgba(0,132,255,0.3)]">
                    <PlusCircle className="h-4 w-4" /> RECORD CREDIT
                 </Button>
              </div>
           </div>

           <ScrollArea className="h-[140px] overflow-hidden">
              <div className="flex gap-4 p-1">
                {allSettlements.length === 0 ? (
                  <div className="w-full h-24 flex items-center justify-center border-2 border-dashed border-white/5 rounded-3xl text-white/10 font-black uppercase tracking-widest text-[10px]">
                     No recent settlements recorded
                  </div>
                ) : (
                  allSettlements.map((s) => (
                    <div key={s.id} className="min-w-[220px] bg-[#0a0a1a] border border-white/5 hover:border-green-500/30 rounded-3xl p-4 text-right transition-all group">
                       <div className="flex items-center justify-between mb-3">
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">{s.date}</span>
                       </div>
                       <p className="font-black text-white text-sm truncate mb-1">{s.customerName}</p>
                       <p className="text-xl font-black text-green-500">{settings.shop.currency} {s.amount_paid.toFixed(0)}</p>
                    </div>
                  ))
                )}
              </div>
           </ScrollArea>
        </div>

        <Card className="bg-[#0a0a1a] border-white/5 rounded-[2rem] p-6 relative overflow-hidden group border-orange-500/20">
           <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-orange-500/10 transition-all" />
           <div className="flex justify-between items-center mb-6">
              <AlertCircle className="h-6 w-6 text-orange-500" />
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-white/20 hover:text-white"
                onClick={() => setIsOutstandingVisible(!isOutstandingVisible)}
              >
                <History className={cn("h-4 w-4", !isOutstandingVisible && "opacity-50")} />
              </Button>
           </div>
           <div className="text-right">
              <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Total Outstanding</p>
              <p className={cn("text-3xl font-black text-white transition-all", !isOutstandingVisible && "blur-lg select-none")}>
                {settings.shop.currency} {customers.reduce((sum, c) => sum + (c.outstanding_balance || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 0 })}
              </p>
              <p className="text-[10px] text-orange-500/60 mt-2 font-black uppercase tracking-widest">Across {filteredCustomers.length} Accounts</p>
           </div>
        </Card>
      </div>

      {/* Search & Actions Bar */}
      <div className="flex flex-row-reverse gap-4 mb-8">
        <div className="relative flex-1">
           <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20" />
           <Input 
             placeholder="Search by customer name or ID code..."
             value={searchTerm}
             onChange={(e) => setSearchTerm(e.target.value)}
             className="w-full bg-white/5 border-white/10 rounded-xl pr-12 h-14 text-right font-bold focus:border-primary/50 transition-all text-lg"
           />
        </div>
        <Button onClick={exportAllOutstanding} variant="outline" className="h-14 px-6 rounded-xl border-white/10 hover:bg-white/5 gap-2">
           <Download className="h-4 w-4" /> EXPORT REPORT
        </Button>
      </div>

      {/* Customers List */}
      <ScrollArea className="flex-1 custom-scrollbar">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-6">
          {filteredCustomers.map((customer) => (
            <Card key={customer.id} className="bg-[#0a0a1a] border-white/5 hover:border-primary/30 transition-all rounded-[2rem] overflow-hidden group">
               <CardContent className="p-0">
                  <div className="p-6">
                     <div className="flex justify-between items-start mb-6">
                        <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 group-hover:bg-primary/10 group-hover:text-primary transition-all">
                           <User className="h-6 w-6" />
                        </div>
                        <Badge className="bg-primary/20 text-primary border-none text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">{customer.code}</Badge>
                     </div>

                     <div className="text-right mb-6">
                        <h3 className="text-xl font-black text-white leading-tight mb-1">{customer.name_dv}</h3>
                        <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">{customer.name_en}</p>
                     </div>

                     <div className="bg-red-500/5 p-4 rounded-2xl border border-red-500/10 mb-6 text-right group-hover:bg-red-500/10 transition-all">
                        <p className="text-[8px] font-black text-red-500/40 uppercase tracking-widest mb-1">Total Due</p>
                        <p className="text-2xl font-black text-red-500">{settings.shop.currency} {(customer.outstanding_balance || 0).toFixed(2)}</p>
                        <div className="flex items-center justify-end gap-2 text-[10px] text-white/20 mt-2 font-bold">
                           <Clock className="h-3 w-3" />
                           <span>LAST SETTLED: {customer.settlement_history.length > 0 ? customer.settlement_history[customer.settlement_history.length - 1].date : 'NONE'}</span>
                        </div>
                     </div>

                     <div className="grid grid-cols-3 gap-2">
                        <Button 
                          onClick={() => handleSettlePaymentClick(customer)}
                          className="bg-primary hover:bg-primary/90 text-white text-[9px] font-black h-10 rounded-xl transition-all uppercase px-1"
                        >
                          SETTLE
                        </Button>
                        <Button 
                          variant="ghost"
                          onClick={() => handleViewSettlementHistory(customer)}
                          className="bg-white/5 hover:bg-white/10 text-white text-[9px] font-black h-10 rounded-xl border border-white/10 transition-all uppercase px-1"
                        >
                          HISTORY
                        </Button>
                        <Button 
                          variant="ghost"
                          onClick={() => handleViewCreditPurchases(customer)}
                          className="bg-white/5 hover:bg-white/10 text-white text-[9px] font-black h-10 rounded-xl border border-white/10 transition-all uppercase px-1"
                        >
                          DETAILS
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
        <DialogContent className="sm:max-w-[450px] font-faruma bg-[#0a0a1a] border-white/10 text-white" dir="rtl">
          <DialogHeader className="text-right">
            <DialogTitle className="text-2xl font-black">{renderBoth('settle_payment')}</DialogTitle>
            <DialogDescription className="text-white/40">
              {selectedCustomerForAction?.name_dv} ({selectedCustomerForAction?.name_en})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-6">
            <div className="space-y-2">
              <Label className="text-right block text-[10px] font-black uppercase text-white/40 tracking-widest">{renderBoth('current_outstanding')}</Label>
              <div className="h-14 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-2xl font-black text-red-500">
                {settings.shop.currency} {(selectedCustomerForAction?.outstanding_balance || 0).toFixed(2)}
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-end">
                <Button 
                  variant="link" 
                  onClick={() => setPaymentAmount(selectedCustomerForAction?.outstanding_balance || '')}
                  className="p-0 h-auto text-[10px] text-primary font-black uppercase"
                >
                  SETTLE FULL AMOUNT
                </Button>
                <Label className="text-right block text-[10px] font-black uppercase text-white/40 tracking-widest">{renderBoth('amount_to_pay')}</Label>
              </div>
              <Input
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || '')}
                className="text-right h-14 bg-white/5 border-primary rounded-xl text-2xl font-black text-white focus:ring-0"
                autoFocus
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-right block text-[10px] font-black uppercase text-white/40 tracking-widest">{renderBoth('new_outstanding')}</Label>
              <div className={cn(
                "h-12 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center font-black",
                currentOutstandingAfterPayment > 0 ? "text-orange-500" : "text-green-500"
              )}>
                {settings.shop.currency} {currentOutstandingAfterPayment.toFixed(2)}
              </div>
            </div>
          </div>
          <DialogFooter className="gap-3 pt-4 border-t border-white/5">
            <Button variant="ghost" onClick={() => setIsSettlePaymentDialogOpen(false)} className="flex-1 h-12 border-white/10 hover:bg-white/5 text-white">
              {renderBoth('cancel')}
            </Button>
            <Button onClick={processSettlement} disabled={!paymentAmount || paymentAmount <= 0} className="flex-1 h-12 bg-primary hover:bg-primary/90 font-black">
              {renderBoth('confirm_settlement')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Settlement History Dialog */}
      <Dialog open={isSettlementHistoryDialogOpen} onOpenChange={setIsSettlementHistoryDialogOpen}>
        <DialogContent className="sm:max-w-[500px] font-faruma bg-[#0a0a1a] border-white/10 text-white" dir="rtl">
          <DialogHeader className="text-right">
            <DialogTitle className="text-2xl font-black flex items-center justify-end gap-3">
              {renderBoth('settlement_history')} <History className="h-6 w-6 text-primary" />
            </DialogTitle>
            <DialogDescription className="text-right text-white/40">
              {selectedCustomerForAction?.name_dv} ({selectedCustomerForAction?.name_en})
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[400px] mt-4 pr-4">
            <div className="space-y-3">
              {selectedCustomerForAction?.settlement_history && selectedCustomerForAction.settlement_history.length > 0 ? (
                [...selectedCustomerForAction.settlement_history].reverse().map((settlement, idx) => (
                  <div key={settlement.id || idx} className="p-4 rounded-2xl bg-white/5 border border-white/5 text-right relative overflow-hidden group">
                    <div className="flex justify-between items-center mb-2">
                       <span className="text-[10px] font-mono text-white/20">{settlement.date}</span>
                       <span className="text-sm font-black text-green-500">+{settings.shop.currency} {settlement.amount_paid.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-bold text-white/40">
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
          <DialogFooter className="pt-4 border-t border-white/5">
            <Button onClick={() => setIsSettlementHistoryDialogOpen(false)} className="w-full h-12 bg-white/5 hover:bg-white/10 text-white border border-white/10 font-black">
              {renderBoth('close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Credit Purchases (Details) Dialog */}
      <Dialog open={isCreditPurchasesDialogOpen} onOpenChange={setIsCreditPurchasesDialogOpen}>
        <DialogContent className="sm:max-w-[600px] font-faruma bg-[#0a0a1a] border-white/10 text-white" dir="rtl">
          <DialogHeader className="text-right">
            <DialogTitle className="text-2xl font-black flex items-center justify-end gap-3">
              {renderBoth('credit_purchases')} <ShoppingBag className="h-6 w-6 text-orange-500" />
            </DialogTitle>
            <DialogDescription className="text-right text-white/40">
              {selectedCustomerForAction?.name_dv} ({selectedCustomerForAction?.name_en})
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[450px] mt-4 pr-4">
            <div className="space-y-4">
              {selectedCustomerCreditSales.length > 0 ? (
                [...selectedCustomerCreditSales].reverse().map((sale) => (
                  <div key={sale.id} className="p-4 rounded-2xl bg-white/5 border border-white/5 text-right">
                    <div className="flex justify-between items-center mb-3">
                       <Badge variant="outline" className="border-orange-500/30 text-orange-500 text-[8px] font-black">{sale.id}</Badge>
                       <span className="text-[10px] font-mono text-white/40">{sale.date}</span>
                    </div>
                    <div className="space-y-2 mb-3">
                      {sale.items.map((item: any, i: number) => (
                        <div key={i} className="flex justify-between items-center text-xs">
                          <span className="text-white/40">{item.qty} x {item.price.toFixed(2)}</span>
                          <span className="font-bold">{item.name_dv}</span>
                        </div>
                      ))}
                    </div>
                    <div className="pt-3 border-t border-white/5 flex justify-between items-center">
                       <span className="text-sm font-black text-white">{settings.shop.currency} {sale.grandTotal.toFixed(2)}</span>
                       <span className="text-[10px] font-black text-white/20 uppercase">Total Invoice</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center h-40 opacity-20">
                  <FileText className="h-10 w-10 mb-2" />
                  <p className="font-black uppercase tracking-widest">No credit purchases found</p>
                </div>
              )}
            </div>
          </ScrollArea>
          <DialogFooter className="pt-4 border-t border-white/5">
            <Button onClick={() => setIsCreditPurchasesDialogOpen(false)} className="w-full h-12 bg-white/5 hover:bg-white/10 text-white border border-white/10 font-black">
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
    </div>
  );
};

export default CreditOutstanding;