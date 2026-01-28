"use client";

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, History, DollarSign, ShoppingBag, PlusCircle, Download } from 'lucide-react';
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

interface Settlement {
  id: string;
  amount_paid: number;
  date: string;
  previous_outstanding: number;
  new_outstanding: number;
}

interface CreditSaleItem extends Product {
  qty: number;
}

interface CreditTransaction {
  id: string;
  date: string;
  total_amount: number;
  items: CreditSaleItem[];
}

interface OutstandingCustomer {
  id: string;
  code: string;
  name_dv: string;
  name_en: string;
  outstanding_amount: number;
  last_payment: string;
  settlement_history: Settlement[];
  credit_transactions: CreditTransaction[];
  credit_limit: number;
}

interface NewCreditSale {
  id: string;
  date: string;
  customer: Customer;
  items: CreditSaleItem[];
  grandTotal: number;
  paymentMethod: 'credit';
}

const CreditOutstanding = () => {
  const { t } = useTranslation();
  const { customers, sales, setSales, settings, addSettlement, updateCustomerBalance } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [isOutstandingVisible, setIsOutstandingVisible] = useState(false);

  // Auto-hide privacy toggle after 1 minute if shown
  React.useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isOutstandingVisible) {
      timer = setTimeout(() => {
        setIsOutstandingVisible(false);
      }, 60000); // 1 minute
    }
    return () => clearTimeout(timer);
  }, [isOutstandingVisible]);

  const [isSettlePaymentDialogOpen, setIsSettlePaymentDialogOpen] = useState(false);
  const [isSettlementHistoryDialogOpen, setIsSettlementHistoryDialogOpen] = useState(false);
  const [isCreditPurchasesDialogOpen, setIsCreditPurchasesDialogOpen] = useState(false);
  const [isAddCreditSaleDialogOpen, setIsAddCreditSaleDialogOpen] = useState(false);
  const [selectedCustomerForAction, setSelectedCustomerForAction] = useState<Customer | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number | ''>('');
  const [isPayAll, setIsPayAll] = useState(false);

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
    setIsPayAll(false);
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
    setSales(prevSales => [...prevSales, newSale as Sale]);
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

      addSettlement(selectedCustomerForAction.id, settlement);

      setIsSettlePaymentDialogOpen(false);
      setSelectedCustomerForAction(null);
      setPaymentAmount('');
      setIsPayAll(false);
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

  const handleDownloadPdfReport = (customer: Customer) => {
    const customerSales = sales.filter(s => s.customer?.id === customer.id && s.paymentMethod === 'credit');
    if (customerSales.length === 0) {
      showError(t('no_credit_purchases'));
      return;
    }

    try {
      const doc = new jsPDF();
      let yPos = 20;

      // Add logo if available
      if (settings.reports.showLogo && settings.shop.logo) {
        try {
          doc.addImage(settings.shop.logo, 'PNG', 85, yPos, 40, 20);
          yPos += 25;
        } catch (e) {
          console.log('Logo not added');
        }
      }

      // Header
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('Credit Purchases Report', 105, yPos, { align: 'center' });
      yPos += 8;

      doc.setFontSize(14);
      doc.text(settings.shop.shopName, 105, yPos, { align: 'center' });
      yPos += 10;

      // Contact info
      if (settings.reports.showContactInfo) {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(settings.shop.shopAddress, 105, yPos, { align: 'center' });
        yPos += 5;
        doc.text(`Tel: ${settings.shop.shopPhone} | Email: ${settings.shop.shopEmail}`, 105, yPos, { align: 'center' });
        yPos += 10;
      }

      // Customer info - English only
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(`Customer: ${customer.name_en}`, 14, yPos);
      yPos += 6;
      doc.text(`Code: ${customer.code}`, 14, yPos);
      yPos += 6;
      doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, yPos);
      yPos += 10;

      // Transactions
      customerSales.forEach((transaction, index) => {
        // Check if we need a new page
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(`Transaction Date: ${transaction.date}`, 14, yPos);
        doc.text(`Total: ${settings.shop.currency} ${transaction.grandTotal.toFixed(2)}`, 196, yPos, { align: 'right' });
        yPos += 7;

        // Items table - English only
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
            0: { cellWidth: 70, halign: 'left' },   // Item name
            1: { cellWidth: 30, halign: 'center' }, // Code
            2: { cellWidth: 20, halign: 'center' }, // Qty
            3: { cellWidth: 35, halign: 'right' },  // Price
            4: { cellWidth: 35, halign: 'right' }   // Total
          },
          margin: { left: 14, right: 14 }
        });

        yPos = (doc as any).lastAutoTable.finalY + 8;
      });

      // Summary
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

      // Footer
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(150, 150, 150);
      doc.text(settings.reports.customerOutstandingFooter, 105, yPos, { align: 'center', maxWidth: 180 });

      // Save PDF
      doc.save(`${customer.name_en}_Credit_Purchases_Report.pdf`);
      showSuccess(t('download_report_successful'));
    } catch (error) {
      console.error('PDF generation error:', error);
      showError(t('error_generating_pdf_report'));
    }
  };

  const currentOutstandingAfterPayment = selectedCustomerForAction
    ? Math.max(0, selectedCustomerForAction.outstanding_balance - (typeof paymentAmount === 'number' ? paymentAmount : 0))
    : 0;

  const renderBoth = (key: string, options?: any) => (
    <>
      {t(key, options)} ({t(key, { ...options, lng: 'en' })})
    </>
  );

  const renderBothString = (key: string, options?: any) => {
    return `${t(key, options)} (${t(key, { ...options, lng: 'en' })})`;
  };

  // Export all outstanding customers
  const exportAllOutstanding = () => {
    if (filteredCustomers.length === 0) {
      showError(t('no_outstanding_customers'));
      return;
    }

    const data = [];
    data.push(['Customer Outstanding Report - All Customers']);
    data.push(['Generated:', new Date().toLocaleString()]);
    data.push([]);
    data.push(['Customer Code', 'Customer Name (DV)', 'Customer Name (EN)', 'Outstanding Amount', 'Last Payment Date']);

    filteredCustomers.forEach(customer => {
      data.push([
        customer.code,
        customer.name_dv,
        customer.name_en,
        customer.outstanding_balance.toFixed(2),
        customer.settlement_history.length > 0
          ? customer.settlement_history[customer.settlement_history.length - 1].date
          : 'No payments yet'
      ]);
    });

    data.push([]);
    data.push(['Total Outstanding:', '', '', filteredCustomers.reduce((sum, c) => sum + c.outstanding_balance, 0).toFixed(2)]);

    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Outstanding Report");
    XLSX.writeFile(wb, `All_Outstanding_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
    showSuccess(t('download_report_successful'));
  };

  // Derive settlements reactively from customers
  const allSettlements = customers.flatMap(c =>
    c.settlement_history.map(s => ({
      ...s,
      customerName: c.name_dv,
      customerEn: c.name_en
    }))
  ).sort((a, b) => b.id.localeCompare(a.id))
    .slice(0, 10);

  return (
    <div className="p-4 font-faruma flex flex-col h-full gap-4">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <Card className="lg:col-span-3">
          <CardHeader className="py-4">
            <CardTitle className="text-right text-lg">{renderBoth('recent_settlements')}</CardTitle>
          </CardHeader>
          <CardContent className="h-[120px] overflow-hidden p-0">
            <ScrollArea className="h-full">
              <div className="flex gap-3 p-4">
                {allSettlements.length === 0 ? (
                  <p className="text-gray-400 italic text-sm w-full text-center py-4">No recent settlements</p>
                ) : (
                  allSettlements.map((s) => (
                    <div key={s.id} className="min-w-[180px] bg-green-50 dark:bg-green-900/10 border border-green-100 rounded-lg p-3 text-right shadow-sm border-r-4 border-r-green-500">
                      <p className="font-bold text-xs truncate">{s.customerName}</p>
                      <p className="text-[10px] text-gray-500 mb-1">{s.date}</p>
                      <p className="text-lg font-black text-green-700">{settings.shop.currency} {s.amount_paid.toFixed(2)}</p>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
        <Card className="bg-primary text-primary-foreground relative overflow-hidden">
          <CardHeader className="py-4 flex flex-row items-center justify-between space-y-0">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-primary-foreground/70 hover:text-primary-foreground hover:bg-white/10"
              onClick={() => setIsOutstandingVisible(!isOutstandingVisible)}
            >
              <History className={cn("h-4 w-4", !isOutstandingVisible && "opacity-50")} />
            </Button>
            <CardTitle className="text-right text-lg">Total Outstanding</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-end">
            <p className={cn("text-3xl font-black transition-all", !isOutstandingVisible && "blur-md select-none")}>
              {settings.shop.currency} {customers.reduce((sum, c) => sum + (c.outstanding_balance || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] opacity-70 mt-1 uppercase tracking-wider font-bold">Accumulated Balance</p>
          </CardContent>
        </Card>
      </div>

      <Card className="flex-1">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Button onClick={exportAllOutstanding} variant="outline" size="sm">
              <Download className="h-4 w-4 ml-2" /> {t('export_all')}
            </Button>
          </div>
          <CardTitle className="text-right text-xl">{renderBoth('credit_outstanding')}</CardTitle>
          <div className="flex items-center space-x-2">
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
          <ScrollArea className="h-[calc(100vh-380px)] pr-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCustomers.map((customer) => (
                <Card key={customer.id} className="cursor-pointer hover:shadow-lg transition-shadow duration-200 text-right">
                  <CardContent className="p-4">
                    <p className="font-semibold text-base break-words">{customer.name_dv} ({customer.name_en})</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 break-words">Code: {customer.code}</p>
                    <p className="text-sm text-red-600 dark:text-red-400 break-words">Outstanding: {settings.shop.currency} {(customer.outstanding_balance || 0).toFixed(2)}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 break-words mb-2">Last Settlement: {customer.settlement_history.length > 0 ? customer.settlement_history[customer.settlement_history.length - 1].date : t('all_time')}</p>
                    <div className="flex justify-end gap-2 mt-2 flex-wrap">
                      <Button size="sm" onClick={() => handleSettlePaymentClick(customer)} className="flex items-center">
                        <DollarSign className="h-4 w-4 ml-2" /> {renderBoth('settle_payment')}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleViewSettlementHistory(customer)} className="flex items-center">
                        <History className="h-4 w-4 ml-2" /> {renderBoth('view_history')}
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => handleViewCreditPurchases(customer)} className="flex items-center">
                        <ShoppingBag className="h-4 w-4 ml-2" /> {renderBoth('view_credit_purchases')}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Settle Payment Dialog */}
      <Dialog open={isSettlePaymentDialogOpen} onOpenChange={setIsSettlePaymentDialogOpen}>
        <DialogContent className="sm:max-w-[450px] font-faruma" dir="rtl">
          <DialogHeader className="text-right">
            <DialogTitle className="text-xl">
              {renderBoth('settle_payment')}
            </DialogTitle>
            <DialogDescription>
              {selectedCustomerForAction?.name_dv} ({selectedCustomerForAction?.name_en})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="currentOutstanding" className="text-right block font-bold text-gray-500">
                {renderBoth('current_outstanding')}
              </Label>
              <Input
                id="currentOutstanding"
                value={(selectedCustomerForAction?.outstanding_balance || 0).toFixed(2)}
                readOnly
                className="text-right bg-muted font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="paymentAmount" className="text-right block font-bold">
                {renderBoth('amount_to_pay')}
              </Label>
              <Input
                id="paymentAmount"
                type="number"
                value={paymentAmount}
                onChange={(e) => {
                  setPaymentAmount(parseFloat(e.target.value) || '');
                  setIsPayAll(false);
                }}
                readOnly={isPayAll}
                className={cn("text-right h-12 text-lg font-mono border-primary shadow-sm", isPayAll && "bg-muted")}
                autoFocus
                placeholder="0.00"
              />
            </div>
            <div className="flex items-center justify-end gap-2 mb-2">
              <Label htmlFor="payAll" className="text-right font-bold cursor-pointer">
                {renderBoth('pay_all')}
              </Label>
              <input
                id="payAll"
                type="checkbox"
                checked={isPayAll}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setIsPayAll(checked);
                  if (checked && selectedCustomerForAction) {
                    setPaymentAmount(selectedCustomerForAction.outstanding_balance);
                  } else {
                    setPaymentAmount('');
                  }
                }}
                className="w-5 h-5 accent-primary cursor-pointer"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newOutstanding" className="text-right block font-bold text-gray-500">
                {renderBoth('new_outstanding')}
              </Label>
              <Input
                id="newOutstanding"
                value={currentOutstandingAfterPayment.toFixed(2)}
                readOnly
                className="text-right font-mono"
                style={{ color: currentOutstandingAfterPayment > 0 ? 'red' : 'green' }}
              />
            </div>
          </div>
          <DialogFooter className="flex flex-row-reverse justify-between gap-3 mt-4">
            <Button onClick={processSettlement} disabled={!paymentAmount || paymentAmount <= 0} className="flex-1 h-12 bg-primary">
              {renderBoth('confirm_settlement')}
            </Button>
            <Button variant="outline" onClick={() => setIsSettlePaymentDialogOpen(false)} className="flex-1 h-12">
              {renderBoth('cancel')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Settlement History Dialog */}
      <Dialog open={isSettlementHistoryDialogOpen} onOpenChange={setIsSettlementHistoryDialogOpen}>
        <DialogContent className="sm:max-w-[650px] font-faruma max-h-[90vh] flex flex-col p-0 overflow-hidden" dir="rtl">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle className="text-right">{renderBoth('settlement_history_for', { customerName: selectedCustomerForAction?.name_dv })}</DialogTitle>
            <DialogDescription className="text-right">
              {renderBoth('detailed_list_of_settlements')}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-hidden p-6 pt-0">
            <div className="h-full border rounded-lg overflow-hidden bg-white text-black shadow-inner">
              {selectedCustomerForAction?.settlement_history.length === 0 ? (
                <p className="text-center text-gray-500 py-20">{renderBoth('no_settlement_history')}</p>
              ) : (
                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-4">
                    {[...(selectedCustomerForAction?.settlement_history || [])].reverse().map((settlement) => (
                      <div key={settlement.id} className="border p-4 rounded-md bg-gray-50/50 flex flex-col gap-2">
                        <div className="flex justify-between font-bold border-b pb-2 mb-2 text-sm">
                          <span>{renderBoth('date')}: {settlement.date}</span>
                          <span className="text-primary">{settings.shop.currency} {settlement.amount_paid.toFixed(2)}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-xs text-gray-600">
                          <div className="text-right">
                            <p className="font-semibold">{renderBoth('previous_outstanding')}</p>
                            <p>{settings.shop.currency} {settlement.previous_outstanding.toFixed(2)}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">{renderBoth('new_outstanding')}</p>
                            <p className="text-green-600 font-bold">{settings.shop.currency} {settlement.new_outstanding.toFixed(2)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          </div>
          <DialogFooter className="p-6 pt-2 border-t flex justify-end bg-gray-50/50">
            <Button variant="outline" onClick={() => setIsSettlementHistoryDialogOpen(false)} className="font-faruma">
              {renderBoth('close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Credit Purchases Dialog */}
      <Dialog open={isCreditPurchasesDialogOpen} onOpenChange={setIsCreditPurchasesDialogOpen}>
        <DialogContent className="sm:max-w-[750px] font-faruma max-h-[90vh] flex flex-col p-0 overflow-hidden" dir="rtl">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle className="text-right">{renderBoth('credit_purchases_for', { customerName: selectedCustomerForAction?.name_dv })}</DialogTitle>
            <DialogDescription className="text-right">
              {renderBoth('detailed_list_of_credit_purchases')}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-hidden p-6 pt-0">
            <div className="h-full border rounded-lg overflow-hidden bg-white text-black p-8 shadow-inner" id="credit-purchases-report-content">
              {/* Report Header */}
              <div className="text-center mb-8 border-b pb-6">
                {settings.reports.showLogo && settings.shop.logo && (
                  <div className="mb-4">
                    <img src={settings.shop.logo} alt="Shop Logo" className="max-h-20 mx-auto object-contain" />
                  </div>
                )}
                <h1 className="text-2xl font-black uppercase tracking-tight mb-1">{settings.reports.customerOutstandingHeader}</h1>
                <p className="text-lg font-bold text-gray-700 mb-4">{settings.shop.shopName}</p>

                {settings.reports.showContactInfo && (
                  <div className="text-sm text-gray-500 flex flex-col gap-0.5">
                    <p>{settings.shop.shopAddress}</p>
                    <p>Tel: {settings.shop.shopPhone} | Email: {settings.shop.shopEmail}</p>
                  </div>
                )}
                <div className="mt-4 text-right">
                  <p><strong>Customer:</strong> {selectedCustomerForAction?.name_dv} ({selectedCustomerForAction?.name_en})</p>
                  <p><strong>Code:</strong> {selectedCustomerForAction?.code}</p>
                  <p><strong>Date Generated:</strong> {new Date().toLocaleDateString()}</p>
                </div>
              </div>

              {/* Content for Credit Purchases Dialog */}
              {selectedCustomerCreditSales.length === 0 ? (
                <p className="text-center text-gray-500 py-10">{renderBoth('no_credit_purchases')}</p>
              ) : (
                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-6">
                    {selectedCustomerCreditSales.map((transaction) => (
                      <div key={transaction.id} className="border p-4 rounded-md bg-gray-50/50">
                        <div className="flex justify-between font-bold border-b pb-2 mb-2 text-sm">
                          <span>Date: {transaction.date}</span>
                          <span className="text-primary">Total: {settings.shop.currency} {transaction.grandTotal.toFixed(2)}</span>
                        </div>
                        <table className="w-full text-[11px] text-right">
                          <thead>
                            <tr className="border-b text-gray-400">
                              <th className="py-2">Item</th>
                              <th className="py-2">Code</th>
                              <th className="py-2">Qty</th>
                              <th className="py-2">Price</th>
                              <th className="py-2">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {transaction.items.map((item) => (
                              <tr key={item.id} className="border-b last:border-0">
                                <td className="py-2 font-medium">{item.name_dv} ({item.name_en})</td>
                                <td className="py-2">{item.item_code}</td>
                                <td className="py-2 font-bold">{item.qty}</td>
                                <td className="py-2">{item.price.toFixed(2)}</td>
                                <td className="py-2 font-bold">{(item.qty * item.price).toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ))}

                    {/* Summary Section */}
                    <div className="mt-8 border-t-2 border-double pt-4 text-right">
                      <p className="text-xl font-black text-primary">
                        Total Outstanding: {settings.shop.currency} {(selectedCustomerForAction?.outstanding_balance || 0).toFixed(2)}
                      </p>
                    </div>

                    {/* Report Footer */}
                    <div className="mt-12 text-center text-[10px] text-gray-400 italic py-6 border-t">
                      {settings.reports.customerOutstandingFooter}
                    </div>
                  </div>
                </ScrollArea>
              )}
            </div>
          </div>
          <DialogFooter className="p-6 pt-2 border-t flex justify-between bg-gray-50/50">
            <Button variant="outline" onClick={() => setIsCreditPurchasesDialogOpen(false)} className="font-faruma">
              {renderBoth('close')}
            </Button>
            <div className="flex gap-2">
              <Button onClick={() => selectedCustomerForAction && handleDownloadCreditReport(selectedCustomerForAction)} className="font-faruma h-9">
                <Download className="h-4 w-4 ml-2" /> {renderBoth('download')} (Excel)
              </Button>
              <Button onClick={() => selectedCustomerForAction && handleDownloadPdfReport(selectedCustomerForAction)} className="font-faruma h-9">
                <Download className="h-4 w-4 ml-2" /> {renderBoth('download')} (PDF)
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Credit Sale Dialog */}
      <AddCreditSaleDialog
        isOpen={isAddCreditSaleDialogOpen}
        onClose={() => setIsAddCreditSaleDialogOpen(false)}
        onAdd={handleAddCreditSale}
      />
    </div>
  );
};

export default CreditOutstanding;