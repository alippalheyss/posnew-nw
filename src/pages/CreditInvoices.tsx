"use client";

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Printer, FileText, Receipt, Search, Filter, PencilLine, Trash2, AlertCircle, Clock, CheckCircle2, Download, Calendar as CalendarIcon, FileSpreadsheet, X, Eye } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { printContent } from '@/utils/printHelper';
import { printSale80mmSlip, downloadSaleA4Pdf, printSaleA4Html } from '@/utils/invoicePrintHelper';
import { useAppContext, Sale } from '@/context/AppContext';
import { formatDate, formatTime, formatDateTime, extractDateOnly, toISODate } from '@/utils/formatters';
import SaleEditDialog from '@/components/SaleEditDialog';
import InvoiceViewDialog from '@/components/InvoiceViewDialog';
import { showSuccess, showError } from '@/utils/toast';
import { usePersistedState, usePersistedDateRange } from '@/hooks/usePersistedState';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import type { DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const CreditInvoices = () => {
  const { t } = useTranslation();
  const { sales, setSales, updateSale, deleteSale, settings, customers } = useAppContext();
  const [isEditSaleDialogOpen, setIsEditSaleDialogOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [saleToDelete, setSaleToDelete] = useState<Sale | null>(null);
  const [isDeletingSale, setIsDeletingSale] = useState(false);
  const [visibleCount, setVisibleCount] = useState(30);
  const [viewingSale, setViewingSale] = useState<Sale | null>(null);
  const [isViewInvoiceDialogOpen, setIsViewInvoiceDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = usePersistedState<string>('credit_invoices_search', '');
  const [dateFilter, setDateFilter] = usePersistedState<'all' | 'today' | 'yesterday' | 'custom'>('credit_invoices_date_filter', 'all');
  const [dateRange, setDateRange] = usePersistedDateRange('credit_invoices_date_range', {
    from: new Date(),
    to: new Date()
  });

  const handleViewInvoice = (sale: Sale) => {
    setViewingSale(sale);
    setIsViewInvoiceDialogOpen(true);
  };

  const handleEditClick = (sale: Sale) => {
    const cust = getCustomer(sale);
    setEditingSale({
      ...sale,
      customer: cust || sale.customer || null,
      customerId: cust?.id || sale.customerId || sale.customer_id,
      customer_id: cust?.id || sale.customer_id || sale.customerId
    });
    setIsEditSaleDialogOpen(true);
  };

  const handleSaveSale = async (updatedSale: Sale) => {
    try {
      await updateSale(updatedSale);
      setIsEditSaleDialogOpen(false);
      setEditingSale(null);
    } catch (err) {
      console.error('Error updating invoice:', err);
      showError('Failed to update invoice');
    }
  };

  const handlePrintReceipt = (sale: Sale) => {
    printSale80mmSlip(sale, settings);
  };

  const handlePrintA4Invoice = (sale: Sale) => {
    printSaleA4Html(sale, settings);
  };

  const handleDownloadA4Pdf = (sale: Sale) => {
    downloadSaleA4Pdf(sale, settings);
  };

  const getCustomer = (sale: Sale) => {
    if (sale.customer && (sale.customer.name_en || sale.customer.name_dv)) return sale.customer;
    const custId = sale.customer?.id || sale.customerId || sale.customer_id;
    if (custId && customers && customers.length > 0) {
      return customers.find(c => String(c.id).toLowerCase() === String(custId).toLowerCase()) || sale.customer;
    }
    return sale.customer;
  };

  const getInvoiceDisplay = (sale: Sale) => {
    if (sale.invoiceNumber && !sale.invoiceNumber.includes('-') && sale.invoiceNumber.length < 25) {
      return sale.invoiceNumber;
    }
    if (sale.invoiceNumber && (sale.invoiceNumber.startsWith('CRINV') || sale.invoiceNumber.startsWith('INV'))) {
      return sale.invoiceNumber;
    }
    const d = new Date(sale.date || (sale as Record<string, unknown>).created_at as string | undefined || Date.now());
    const validD = isNaN(d.getTime()) ? new Date() : d;
    const yr = validD.getFullYear().toString().slice(-2);
    const mo = (validD.getMonth() + 1).toString().padStart(2, '0');
    const seq = String(sale.id || '').replace(/[^a-zA-Z0-9]/g, '').slice(-4).toUpperCase() || '1001';
    return `CRINV/${yr}/${mo}/${seq}`;
  };

  const creditSales = sales.filter(s => {
    const pMethod = String(s.paymentMethod || (s as any).payment_method || '').toLowerCase();
    const balance = Number(s.balance ?? (s as any).balance ?? 0);
    const paidAmount = Number(s.paidAmount ?? (s as any).paid_amount ?? 0);
    const grandTotal = Number(s.grandTotal ?? (s as any).grand_total ?? 0);
    const hasCustomer = !!(s.customer || s.customerId || s.customer_id);
    return (
      pMethod === 'credit' ||
      (pMethod === 'split' && balance > 0) ||
      (balance > 0 && hasCustomer) ||
      (grandTotal > paidAmount && hasCustomer)
    );
  });
  
  const filterSalesByDate = (salesList: Sale[]) => {
    const now = new Date();
    const todayStr = toISODate(now);
    const yesterdayStr = toISODate(new Date(now.getTime() - 24 * 60 * 60 * 1000));

    return salesList.filter(sale => {
      const dateVal = sale.date || (sale as Record<string, unknown>).created_at as string | undefined;
      if (!dateVal) return dateFilter === 'all';
      const saleDateStr = extractDateOnly(dateVal);
      if (!saleDateStr) return true;
      
      if (dateFilter === 'today') {
        return saleDateStr === todayStr;
      }
      if (dateFilter === 'yesterday') {
        return saleDateStr === yesterdayStr;
      }
      if (dateFilter === 'custom' && dateRange?.from) {
        const fromStr = extractDateOnly(dateRange.from);
        const toStr = extractDateOnly(dateRange.to || dateRange.from);
        return saleDateStr >= fromStr && saleDateStr <= toStr;
      }
      return true; // 'all'
    });
  };

  const filteredSales = filterSalesByDate(creditSales).filter(s => {
    const cust = getCustomer(s);
    const invNo = getInvoiceDisplay(s);
    const term = searchTerm.toLowerCase();
    return (
      String(s.id).toLowerCase().includes(term) ||
      invNo.toLowerCase().includes(term) ||
      (s.invoiceNumber && s.invoiceNumber.toLowerCase().includes(term)) ||
      (cust?.name_dv && cust.name_dv.includes(searchTerm)) ||
      (cust?.name_en && cust.name_en.toLowerCase().includes(term)) ||
      (cust?.code && cust.code.toLowerCase().includes(term))
    );
  });

  const getDateFilterLabel = () => {
    if (dateFilter === 'today') return 'Today';
    if (dateFilter === 'yesterday') return 'Yesterday';
    if (dateFilter === 'all') return 'All Time';
    if (dateFilter === 'custom' && dateRange?.from) {
      if (dateRange.to && format(dateRange.from, 'yyyy-MM-dd') !== format(dateRange.to, 'yyyy-MM-dd')) {
        return `${format(dateRange.from, 'dd/MM/yyyy')} - ${format(dateRange.to, 'dd/MM/yyyy')}`;
      }
      return format(dateRange.from, 'dd/MM/yyyy');
    }
    return 'Custom Range';
  };

  const totalCreditAmount = filteredSales.reduce((sum, s) => sum + s.grandTotal, 0);

  const handleDownloadExcel = () => {
    const currency = settings.shop.currency;
    const shopTin = settings.shop.tinNumber || settings.accounting?.tinNumber || '1021550GST501';
    const filterLabel = getDateFilterLabel();

    const data: any[][] = [
      [settings.shop.shopName],
      ["Credit Invoices Report"],
      ["Generated At", formatDateTime(new Date())],
      ["Period / Filter", filterLabel],
      ["Search Filter", searchTerm || "All Invoices"],
      [],
      ["--- Summary Statistics ---"],
      ["Total Invoices Count", filteredSales.length],
      ["Total Credit Amount Due", `${currency} ${totalCreditAmount.toFixed(2)}`],
      ["Average Invoice Amount", `${currency} ${(filteredSales.length > 0 ? totalCreditAmount / filteredSales.length : 0).toFixed(2)}`],
      [],
      ["--- Detailed Credit Invoices ---"],
      [
        "Invoice / ID",
        "Date",
        "Time",
        "Customer Code",
        "Customer Name (Dhivehi)",
        "Customer Name (English)",
        "Customer Phone",
        "Items Count",
        "Items Breakdown",
        `Grand Total / Due (${currency})`,
        "Payment Method"
      ]
    ];

    filteredSales.forEach(sale => {
      const itemsSummary = (sale.items || []).map(i => `${i.qty}x ${i.name_en || i.name_dv} (${(i.price * i.qty).toFixed(2)})`).join('; ');

      data.push([
        sale.invoiceNumber || sale.id,
        formatDate(sale.date),
        formatTime(sale.date),
        sale.customer?.code || '-',
        sale.customer?.name_dv || '-',
        sale.customer?.name_en || 'Guest',
        sale.customer?.phone || '-',
        sale.items ? sale.items.length : 0,
        itemsSummary,
        Number(sale.grandTotal.toFixed(2)),
        (sale.paymentMethod || 'Credit').toUpperCase()
      ]);
    });

    data.push([
      "TOTAL",
      "",
      "",
      "",
      "",
      "",
      "",
      filteredSales.reduce((acc, s) => acc + (s.items?.length || 0), 0),
      "",
      Number(totalCreditAmount.toFixed(2)),
      ""
    ]);

    const ws = XLSX.utils.aoa_to_sheet(data);

    ws['!cols'] = [
      { wch: 18 },
      { wch: 14 },
      { wch: 12 },
      { wch: 15 },
      { wch: 22 },
      { wch: 22 },
      { wch: 16 },
      { wch: 12 },
      { wch: 50 },
      { wch: 20 },
      { wch: 16 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Credit Invoices");

    const safeFilter = dateFilter === 'custom' && dateRange?.from
      ? `custom_${format(dateRange.from, 'yyyyMMdd')}_${dateRange.to ? format(dateRange.to, 'yyyyMMdd') : ''}`
      : dateFilter;

    XLSX.writeFile(wb, `Credit_Invoices_${safeFilter}_${new Date().toISOString().split('T')[0]}.xlsx`);
    showSuccess(t('download_report_successful') || 'Excel report downloaded successfully');
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text('Credit Invoices Report', 14, 22);
    
    doc.setFontSize(11);
    doc.text(`Period: ${getDateFilterLabel().toUpperCase()}`, 14, 30);
    doc.text(`Total Credit Due: ${settings.shop.currency} ${totalCreditAmount.toFixed(2)}`, 14, 36);
    doc.text(`Total Invoices: ${filteredSales.length}`, 14, 42);

    const tableColumn = ["Invoice #", "Date", "Customer", "Items", "Total Due"];
    const tableRows: any[] = [];

    filteredSales.forEach(sale => {
      const saleData = [
        sale.invoiceNumber || sale.id,
        `${formatDate(sale.date)} ${formatTime(sale.date)}`,
        sale.customer ? (sale.customer.name_en || sale.customer.name_dv) : 'Guest',
        sale.items.length,
        `${settings.shop.currency} ${sale.grandTotal.toFixed(2)}`
      ];
      tableRows.push(saleData);
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 50,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [249, 115, 22] }
    });

    const safeFilter = dateFilter === 'custom' && dateRange?.from
      ? `custom_${format(dateRange.from, 'yyyyMMdd')}`
      : dateFilter;

    doc.save(`credit-invoices-${safeFilter}.pdf`);
  };

  const renderBoth = (key: string, options?: any) => (
    <>
      {t(key, options)} ({t(key, { ...options, lng: 'en' })})
    </>
  );

  return (
    <div className="p-6 font-faruma flex flex-col h-full bg-background text-foreground overflow-hidden" dir="rtl">
      {/* Header Section */}
      <div className="flex flex-wrap justify-between items-center gap-4 mb-8">
        <div className="text-right">
           <h1 className="text-3xl font-black text-foreground flex items-center justify-end gap-3">
             {renderBoth('credit_invoices')} <Receipt className="h-8 w-8 text-primary" />
           </h1>
           <p className="text-sm text-muted-foreground mt-1">Manage and track all outstanding credit sales</p>
        </div>

        <div className="flex gap-2">
          <Button 
            onClick={handleDownloadExcel} 
            variant="outline" 
            className="apple-glass-card border-white/20 dark:border-white/10 hover:bg-emerald-500/15 hover:border-emerald-500/30 hover:text-emerald-500 text-foreground gap-2 h-11 px-4 rounded-2xl text-xs font-bold transition-all shadow-xs"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
            Excel
          </Button>
          <Button 
            onClick={handleDownloadPDF} 
            variant="outline" 
            className="apple-glass-card border-white/20 dark:border-white/10 hover:bg-orange-500/15 hover:border-orange-500/30 hover:text-orange-500 text-foreground gap-2 h-11 px-4 rounded-2xl text-xs font-bold transition-all shadow-xs"
          >
            <Download className="h-4 w-4 text-orange-500" />
            PDF
          </Button>
        </div>
      </div>

      {/* Filters Section */}
      <div className="flex flex-wrap items-center gap-2 mb-8 apple-glass-card p-1.5 rounded-2xl border border-white/20 dark:border-white/10 w-fit shadow-xs">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setDateFilter('all')}
          className={cn("rounded-xl text-xs font-bold transition-all", dateFilter === 'all' ? "bg-primary text-primary-foreground shadow-sm font-black" : "text-muted-foreground hover:text-foreground hover:bg-white/10")}
        >
          {t('all')}
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setDateFilter('today')}
          className={cn("rounded-xl text-xs font-bold transition-all", dateFilter === 'today' ? "bg-primary text-primary-foreground shadow-sm font-black" : "text-muted-foreground hover:text-foreground hover:bg-white/10")}
        >
          {t('today')}
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setDateFilter('yesterday')}
          className={cn("rounded-xl text-xs font-bold transition-all", dateFilter === 'yesterday' ? "bg-primary text-primary-foreground shadow-sm font-black" : "text-muted-foreground hover:text-foreground hover:bg-white/10")}
        >
          {t('yesterday')}
        </Button>
        
        <Popover>
          <PopoverTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setDateFilter('custom')}
              className={cn("rounded-xl text-xs font-bold flex gap-2 items-center transition-all", dateFilter === 'custom' ? "bg-primary text-primary-foreground shadow-sm font-black" : "text-muted-foreground hover:text-foreground hover:bg-white/10")}
            >
              <CalendarIcon className="h-4 w-4" />
              {dateFilter === 'custom' && dateRange?.from ? (
                <span>{getDateFilterLabel()}</span>
              ) : (
                <span>{t('custom_date') || 'Custom Range'}</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 apple-glass-dialog border-white/20 dark:border-white/10 text-foreground" align="end">
            <Calendar
              mode="range"
              selected={dateRange}
              onSelect={(range) => {
                setDateRange(range);
                if (range?.from) {
                  setDateFilter('custom');
                }
              }}
              numberOfMonths={2}
              initialFocus
              className="font-faruma"
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Search Bar */}
      <div className="relative mb-8" dir="ltr">
         <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50 pointer-events-none" />
         <Input 
           dir="ltr"
           placeholder="Search invoices by ID or customer name..."
           value={searchTerm}
           onChange={(e) => setSearchTerm(e.target.value)}
           className="w-full apple-glass-input rounded-2xl pl-12 pr-10 h-14 text-left font-bold transition-all text-lg shadow-sm"
         />
         {searchTerm && (
           <button
             onClick={() => setSearchTerm('')}
             className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted transition-colors"
             title="Clear search"
           >
             <X className="h-4 w-4" />
           </button>
         )}
      </div>

      {/* Invoices List */}
      <ScrollArea className="flex-1 custom-scrollbar">
        <div className="space-y-4 pb-6">
          {filteredSales.length === 0 ? (
            <div className="h-60 flex flex-col items-center justify-center text-muted-foreground/50 uppercase tracking-[0.2em] font-black">
               <FileText className="h-16 w-16 mb-4 opacity-10" />
               No credit invoices found
            </div>
          ) : (
            <>
            {filteredSales.sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, visibleCount).map((sale) => {
              const cust = getCustomer(sale);
              const invNo = getInvoiceDisplay(sale);
              const isSplitSale = String(sale.paymentMethod || '').toLowerCase() === 'split';
              const balanceDue = isSplitSale && Number(sale.balance) > 0
                ? Number(sale.balance)
                : Math.max(0, Number(sale.grandTotal || 0) - Number(sale.paidAmount || 0));

              return (
                <Card key={sale.id} className="apple-glass-card border border-white/20 dark:border-white/10 hover:border-orange-500/40 transition-all rounded-3xl p-6 group shadow-sm hover:shadow-lg">
                  <div className="flex items-center justify-between gap-6">
                     <div className="flex items-center gap-6">
                        <div className="h-14 w-14 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500 group-hover:scale-110 transition-transform">
                           <FileText className="h-7 w-7" />
                        </div>
                        <div className="text-right">
                           <div className="flex items-center justify-end gap-3 mb-1">
                              <span className="text-lg font-black text-foreground font-mono">{invNo}</span>
                              <Badge className="bg-orange-500 text-white border-none text-[8px] font-black uppercase tracking-widest px-2 py-0.5">
                                 CREDIT
                              </Badge>
                           </div>
                           <div className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                              {cust?.name_dv || cust?.name_en || 'Customer'} {cust?.name_en && cust?.name_dv ? `(${cust.name_en})` : ''} {cust?.code ? `[${cust.code}]` : ''}
                           </div>
                        </div>
                     </div>

                     <div className="flex-1 flex justify-center">
                        <div className="flex items-center gap-6 text-muted-foreground">
                           <div className="flex flex-col items-center">
                              <Clock className="h-4 w-4 mb-1" />
                              <span className="text-[10px] font-black uppercase tracking-widest font-mono">
                                {formatDate(sale.date || (sale as Record<string, unknown>).created_at as string | undefined)}
                              </span>
                              {formatTime(sale.date || (sale as Record<string, unknown>).created_at as string | undefined) && (
                                <span className="text-[9px] font-bold text-muted-foreground font-mono">
                                  {formatTime(sale.date || (sale as Record<string, unknown>).created_at as string | undefined)}
                                </span>
                              )}
                           </div>
                           <div className="h-8 w-[1px] bg-white/20 dark:bg-white/10" />
                           <div className="flex flex-col items-center">
                              <Receipt className="h-4 w-4 mb-1" />
                              <span className="text-[10px] font-black uppercase tracking-widest">{(sale.items || []).length} ITEMS</span>
                           </div>
                        </div>
                     </div>

                     <div className="flex items-center gap-8">
                        <div className="text-right">
                           <p className="text-xs font-black text-muted-foreground uppercase tracking-wider mb-1">Balance Due</p>
                           <p className="text-2xl font-black text-orange-500">{settings.shop.currency} {balanceDue.toFixed(2)}</p>
                        </div>
                        <div className="flex gap-2">
                         <Button 
                           variant="ghost" 
                           size="icon" 
                           title="View Invoice Items"
                           onClick={() => handleViewInvoice(sale)}
                           className="h-11 w-11 rounded-xl bg-muted border border-border hover:bg-primary hover:text-primary-foreground transition-all text-muted-foreground shadow-xs"
                         >
                           <Eye className="h-4 w-4" />
                         </Button>
                         <Button 
                           variant="ghost" 
                           size="icon" 
                           title="Print Thermal Receipt"
                           onClick={() => handlePrintReceipt(sale)}
                           className="h-11 w-11 rounded-xl bg-muted border border-border hover:bg-orange-500 hover:text-white transition-all text-muted-foreground"
                         >
                           <Printer className="h-4 w-4" />
                         </Button>
                         <Button 
                           variant="ghost" 
                           size="icon" 
                           title="Print A4 Invoice"
                           onClick={() => handlePrintA4Invoice(sale)}
                           className="h-11 w-11 rounded-xl bg-muted border border-border hover:bg-slate-700 hover:text-white transition-all text-muted-foreground"
                         >
                           <FileText className="h-4 w-4" />
                         </Button>
                         <Button 
                           variant="ghost" 
                           size="icon" 
                           title="Download A4 PDF"
                           onClick={() => handleDownloadA4Pdf(sale)}
                           className="h-11 w-11 rounded-xl bg-muted border border-border hover:bg-blue-600 hover:text-white transition-all text-muted-foreground"
                         >
                           <Download className="h-4 w-4" />
                         </Button>
                         <Button 
                           variant="ghost" 
                           size="icon" 
                           title="Edit Invoice"
                           onClick={() => handleEditClick(sale)}
                           className="h-11 w-11 rounded-xl bg-muted border border-border hover:bg-blue-500 hover:text-white transition-all text-muted-foreground"
                         >
                           <PencilLine className="h-4 w-4" />
                         </Button>
                         <Button 
                           variant="ghost" 
                           size="icon" 
                           title="Delete Invoice"
                           onClick={() => setSaleToDelete(sale)}
                           className="h-11 w-11 rounded-xl bg-muted border border-border hover:bg-red-500 hover:text-white transition-all text-red-500/80"
                         >
                           <Trash2 className="h-4 w-4" />
                         </Button>
                      </div>
                   </div>
                </div>
              </Card>
              );
            })}
            {filteredSales.length > visibleCount && (
              <div className="flex justify-center pt-2 pb-4">
                <Button
                  variant="outline"
                  onClick={() => setVisibleCount(prev => prev + 40)}
                  className="rounded-2xl px-8 h-11 font-black text-xs uppercase tracking-widest border-border hover:bg-muted"
                >
                  Load More ({filteredSales.length - visibleCount} remaining)
                </Button>
              </div>
            )}
            </>
          )}
        </div>
      </ScrollArea>

      {/* Sale Edit Dialog */}
      {editingSale && (
        <SaleEditDialog
          isOpen={isEditSaleDialogOpen}
          onClose={() => setIsEditSaleDialogOpen(false)}
          onSave={handleSaveSale}
          sale={editingSale}
        />
      )}

      {/* Invoice View Dialog */}
      <InvoiceViewDialog
        isOpen={isViewInvoiceDialogOpen}
        onClose={() => {
          setIsViewInvoiceDialogOpen(false);
          setViewingSale(null);
        }}
        sale={viewingSale}
        onPrintThermal={handlePrintReceipt}
        onPrintA4={handlePrintA4Invoice}
      />

      {/* Delete Credit Invoice Confirmation Dialog */}
      <Dialog open={!!saleToDelete} onOpenChange={(open) => !open && setSaleToDelete(null)}>
        <DialogContent className="sm:max-w-[26rem] font-faruma apple-glass-dialog border-white/20 dark:border-white/10 text-foreground p-6 shadow-2xl rounded-3xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right text-xl font-black text-red-500 flex items-center justify-end gap-2">
              <span>Delete Credit Invoice (ކްރެޑިޓް ބިލް ފޮހެލުން)</span>
              <Trash2 className="h-5 w-5" />
            </DialogTitle>
            <DialogDescription className="text-right text-muted-foreground text-xs pt-1">
              Are you sure you want to delete credit invoice <strong className="text-foreground font-mono">{saleToDelete ? getInvoiceDisplay(saleToDelete) : ''}</strong> ({settings.shop.currency} {saleToDelete?.grandTotal.toFixed(2)})? Stock will be restored and the customer's outstanding credit balance will be reduced.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-4 border-t border-white/10 dark:border-white/5 flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setSaleToDelete(null)}
              disabled={isDeletingSale}
              className="flex-1 h-11 rounded-2xl border-white/20 dark:border-white/10 hover:bg-white/10 font-bold"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={isDeletingSale}
              onClick={async () => {
                if (!saleToDelete) return;
                setIsDeletingSale(true);
                try {
                  await deleteSale(saleToDelete.id);
                  setSaleToDelete(null);
                } finally {
                  setIsDeletingSale(false);
                }
              }}
              className="flex-1 h-11 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black gap-2"
            >
              <Trash2 className="h-4 w-4" />
              <span>{isDeletingSale ? 'Deleting...' : 'Confirm Delete'}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CreditInvoices;