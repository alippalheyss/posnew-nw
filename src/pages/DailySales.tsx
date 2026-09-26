"use client";

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { PencilLine, CalendarDays, Printer, Trash2, Filter, ChevronRight, Receipt, DollarSign, CreditCard, ArrowRightLeft, TrendingUp, Download, Calendar as CalendarIcon, FileSpreadsheet, Moon, Send, Loader2 } from 'lucide-react';
import { useAppContext, Product, Customer, CartItem, Sale } from '@/context/AppContext';
import { formatDate, formatTime, formatDateTime, toISODate, extractDateOnly } from '@/utils/formatters';
import SaleEditDialog from '@/components/SaleEditDialog'; 
import { showSuccess, showError } from '@/utils/toast';
import { printContent } from '@/utils/printHelper';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import type { DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { calculateExecutiveBriefingData, sendNightlyExecutiveBriefing } from '@/services/telegramService';

const DailySales = () => {
  const { t } = useTranslation();
  const { sales, setSales, settings, customers } = useAppContext();
  const [isEditSaleDialogOpen, setIsEditSaleDialogOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [isBriefingDialogOpen, setIsBriefingDialogOpen] = useState(false);
  const [briefingDateMode, setBriefingDateMode] = useState<'today' | 'yesterday'>('today');
  const [isSendingBriefing, setIsSendingBriefing] = useState(false);
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'yesterday' | 'last30' | 'custom'>('today');
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(),
    to: new Date()
  });
  const [activeTab, setActiveTab] = useState<'sales' | 'pending'>('sales');
  const { pendingTransfers, resolvePendingTransfer, convertAllPendingToCredit } = useAppContext();

  useEffect(() => {
    const todayStr = toISODate();
    console.log('DailySales: Today is', todayStr);
    console.log('DailySales: Total sales in context:', sales.length);
    if (sales.length > 0) {
      console.log('DailySales: Sample sales dates:', sales.slice(0, 5).map(s => ({ 
        id: s.id, 
        rawDate: s.date, 
        extracted: extractDateOnly(s.date),
        matchToday: extractDateOnly(s.date) === todayStr
      })));
    }
  }, [sales]);

  const filterSalesByDate = (salesList: Sale[]) => {
    const now = new Date();
    const todayY = now.getFullYear();
    const todayM = now.getMonth();
    const todayD = now.getDate();

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayY = yesterday.getFullYear();
    const yesterdayM = yesterday.getMonth();
    const yesterdayD = yesterday.getDate();

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    return salesList.filter(sale => {
      if (!sale.date) return false;
      const saleDateStr = extractDateOnly(sale.date);
      const saleDate = new Date(saleDateStr);
      
      const sY = saleDate.getFullYear();
      const sM = saleDate.getMonth();
      const sD = saleDate.getDate();
      
      if (dateFilter === 'today') {
        return sY === todayY && sM === todayM && sD === todayD;
      }
      if (dateFilter === 'yesterday') {
        return sY === yesterdayY && sM === yesterdayM && sD === yesterdayD;
      }
      if (dateFilter === 'last30') {
        saleDate.setHours(0, 0, 0, 0);
        return saleDate.getTime() >= thirtyDaysAgo.getTime();
      }
      if (dateFilter === 'custom' && dateRange?.from) {
        const from = new Date(dateRange.from);
        from.setHours(0, 0, 0, 0);
        const to = dateRange.to ? new Date(dateRange.to) : new Date(dateRange.from);
        to.setHours(23, 59, 59, 999);
        
        const sFullDate = new Date(sale.date);
        const targetTime = isNaN(sFullDate.getTime()) ? saleDate.getTime() : sFullDate.getTime();
        return targetTime >= from.getTime() && targetTime <= to.getTime();
      }
      return true; // 'all'
    });
  };

  const filteredSales = filterSalesByDate(sales);

  const getDateFilterLabel = () => {
    if (dateFilter === 'today') return 'Today';
    if (dateFilter === 'yesterday') return 'Yesterday';
    if (dateFilter === 'last30') return 'Last 30 Days';
    if (dateFilter === 'all') return 'All Time';
    if (dateFilter === 'custom' && dateRange?.from) {
      if (dateRange.to && format(dateRange.from, 'yyyy-MM-dd') !== format(dateRange.to, 'yyyy-MM-dd')) {
        return `${format(dateRange.from, 'dd/MM/yyyy')} - ${format(dateRange.to, 'dd/MM/yyyy')}`;
      }
      return format(dateRange.from, 'dd/MM/yyyy');
    }
    return 'Custom Range';
  };

  const handlePrintReceipt = (sale: Sale) => {
    const currency = settings.shop.currency;
    const itemsHtml = sale.items.map((item: any) => `
      <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px;">
        <div style="flex: 1; text-align: left;">
          ${item.name_dv || item.name_en || ''}${item.selected_unit && item.selected_unit !== 'Piece' ? ` (${item.selected_unit})` : ''}<br/><small style="color: #444;">${item.name_en || ''}${item.selected_unit && item.selected_unit !== 'Piece' ? ` (${item.selected_unit})` : ''}</small>
        </div>
        <div style="width: 60px; text-align: right;">${item.qty} x ${item.price.toFixed(2)}</div>
        <div style="width: 70px; text-align: right;">${(item.qty * item.price).toFixed(2)}</div>
      </div>
    `).join('');

    const gstRate = settings.shop.taxRate || 0;
    const subtotal = sale.grandTotal / (1 + (gstRate / 100));
    const gstAmount = sale.grandTotal - subtotal;

    const logoHtml = settings.shop.logo ? `
      <div style="margin-bottom: 10px; text-align: center;">
        <img src="${settings.shop.logo}" style="max-height: 60px; object-fit: contain;" />
      </div>
    ` : '';

    const method = String(sale.paymentMethod || 'cash').toLowerCase();
    const isCash = method === 'cash';
    const isCredit = method === 'credit';
    const isSplit = method === 'split';

    let paid = Number(sale.paidAmount);
    if (isNaN(paid) || paid <= 0) {
      paid = isCredit ? 0 : Number(sale.grandTotal);
    }

    const change = isCash ? Math.max(0, paid - sale.grandTotal) : 0;
    const balanceDue = isCredit ? sale.grandTotal : Math.max(0, sale.grandTotal - paid);

    let paymentBreakdownHtml = `
      <div style="display: flex; justify-content: space-between; font-size: 12px; margin-top: 3px;">
        <span>Payment Method:</span>
        <span style="font-weight: bold; text-transform: uppercase;">${sale.paymentMethod || 'CASH'}</span>
      </div>
      <div style="display: flex; justify-content: space-between; font-size: 12px; margin-top: 3px;">
        <span>Paid Amount:</span>
        <span style="font-weight: bold;">${currency} ${paid.toFixed(2)}</span>
      </div>
    `;

    if (change > 0) {
      paymentBreakdownHtml += `
        <div style="display: flex; justify-content: space-between; font-size: 12px; margin-top: 3px;">
          <span>Change:</span>
          <span style="font-weight: bold;">${currency} ${change.toFixed(2)}</span>
        </div>
      `;
    }

    if (balanceDue > 0 && isCredit) {
      paymentBreakdownHtml += `
        <div style="display: flex; justify-content: space-between; font-size: 12px; margin-top: 3px;">
          <span>Balance Due:</span>
          <span style="font-weight: bold;">${currency} ${balanceDue.toFixed(2)}</span>
        </div>
      `;
    }

    if (isSplit && Array.isArray(sale.splitDetails) && sale.splitDetails.length > 0) {
      paymentBreakdownHtml += `<div style="margin-top: 4px; font-size: 11px; border-top: 1px dotted #888; padding-top: 4px;">`;
      sale.splitDetails.forEach((d: any) => {
        paymentBreakdownHtml += `
          <div style="display: flex; justify-content: space-between; color: #444;">
            <span>${d.method || 'Split'}:</span>
            <span>${currency} ${Number(d.amount || 0).toFixed(2)}</span>
          </div>
        `;
      });
      paymentBreakdownHtml += `</div>`;
    }

    const customerHtml = sale.customer ? `
      <div style="font-size: 11px; margin-top: 6px; text-align: left; border: 1px dashed #ccc; padding: 4px 6px; border-radius: 4px;">
        <div><strong>Customer:</strong> ${sale.customer.name_dv || ''} (${sale.customer.name_en || ''})</div>
        ${sale.customer.code ? `<div><strong>Code:</strong> ${sale.customer.code}</div>` : ''}
        ${sale.customer.phone ? `<div><strong>Phone:</strong> ${sale.customer.phone}</div>` : ''}
      </div>
    ` : '';

    const htmlContent = `
      <html>
        <head>
          <title>Receipt ${sale.invoiceNumber || sale.id}</title>
          <style>
            @media print {
              @page { margin: 0; size: ${settings.printing.thermalPrinterWidth === '58mm' ? '58mm' : '80mm'} auto; }
              body { margin: 0; padding: 10px; font-family: sans-serif; width: ${settings.printing.thermalPrinterWidth === '58mm' ? '58mm' : '80mm'}; }
            }
            body { font-family: sans-serif; padding: 20px; text-align: center; }
          </style>
        </head>
        <body>
          ${logoHtml}
          <div style="font-weight: bold; font-size: 15px;">${settings.shop.shopName}</div>
          <div style="font-size: 12px;">${settings.shop.shopAddress}</div>
          <div style="font-size: 10px; margin-top: 4px;">Tel: ${settings.shop.shopPhone}<br/>${formatDate(sale.date)} ${formatTime(sale.date)} | ${sale.invoiceNumber || sale.id}</div>
          ${customerHtml}
          <div style="border-top: 1px dashed #000; margin: 8px 0;"></div>
          ${itemsHtml}
          <div style="border-top: 1px dashed #000; margin: 8px 0;"></div>
          <div style="display: flex; justify-content: space-between; font-size: 12px;">
            <span>Subtotal:</span>
            <span>${currency} ${subtotal.toFixed(2)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 12px; margin-top: 2px;">
            <span>GST (${gstRate}%):</span>
            <span>${currency} ${gstAmount.toFixed(2)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 14px; margin-top: 4px; padding-top: 4px; border-top: 1px solid #000;">
            <span>TOTAL:</span>
            <span>${currency} ${sale.grandTotal.toFixed(2)}</span>
          </div>
          <div style="border-top: 1px dashed #000; margin: 8px 0;"></div>
          ${paymentBreakdownHtml}
          <div style="border-top: 1px dashed #000; margin: 8px 0;"></div>
          <div style="font-size: 10px; margin-top: 10px; font-style: italic;">Thank you for shopping with us!</div>
        </body>
      </html>
    `;
    printContent(htmlContent, settings);
  };

  const handleEditSale = (sale: Sale) => {
    setEditingSale(sale);
    setIsEditSaleDialogOpen(true);
  };

  const handleSaveSaleUpdate = (updatedSale: Sale) => {
    setSales(prevSales => prevSales.map(s => s.id === updatedSale.id ? updatedSale : s));
    setIsEditSaleDialogOpen(false);
    showSuccess(t('sale_updated_successfully'));
  };

  const totalSalesAmount = filteredSales.reduce((acc, sale) => acc + sale.grandTotal, 0);

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.text('Daily Sales Report', 14, 22);
    
    doc.setFontSize(11);
    doc.text(`Period: ${getDateFilterLabel().toUpperCase()}`, 14, 30);
    doc.text(`Total Sales: ${settings.shop.currency} ${totalSalesAmount.toFixed(2)}`, 14, 36);
    doc.text(`Total Transactions: ${filteredSales.length}`, 14, 42);

    // Table Data
    const tableColumn = ["ID", "Date", "Items", "Method", "Total"];
    const tableRows: any[] = [];

    filteredSales.forEach(sale => {
      const saleData = [
        sale.invoiceNumber || sale.id,
        `${formatDate(sale.date)} ${formatTime(sale.date)}`,
        sale.items.length,
        sale.paymentMethod || 'Unknown',
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
      headStyles: { fillColor: [0, 132, 255] }
    });

    const safeFilter = dateFilter === 'custom' && dateRange?.from
      ? `custom_${format(dateRange.from, 'yyyyMMdd')}`
      : dateFilter;

    doc.save(`sales-report-${safeFilter}.pdf`);
  };

  const handleDownloadExcel = () => {
    const currency = settings.shop.currency;
    const gstRate = settings.shop.taxRate || 0;
    const filterLabel = getDateFilterLabel();

    const cashSales = filteredSales.filter(s => s.paymentMethod?.toLowerCase() === 'cash');
    const cardSales = filteredSales.filter(s => s.paymentMethod?.toLowerCase() === 'card');
    const transferSales = filteredSales.filter(s => s.paymentMethod?.toLowerCase() === 'transfer' || s.paymentMethod?.toLowerCase() === 'mobile');
    const creditSales = filteredSales.filter(s => s.paymentMethod?.toLowerCase() === 'credit');

    const cashTotal = cashSales.reduce((acc, s) => acc + s.grandTotal, 0);
    const cardTotal = cardSales.reduce((acc, s) => acc + s.grandTotal, 0);
    const transferTotal = transferSales.reduce((acc, s) => acc + s.grandTotal, 0);
    const creditTotal = creditSales.reduce((acc, s) => acc + s.grandTotal, 0);

    const totalTaxable = filteredSales.reduce((sum, s) => sum + (s.grandTotal / (1 + (gstRate / 100))), 0);
    const totalGst = totalSalesAmount - totalTaxable;

    const data: any[][] = [
      [settings.shop.shopName],
      ["Daily Sales Report"],
      ["Generated At", formatDateTime(new Date())],
      ["Period / Filter", filterLabel],
      [],
      ["--- Summary Statistics ---"],
      ["Total Sales Amount", `${currency} ${totalSalesAmount.toFixed(2)}`],
      ["Total Transactions", filteredSales.length],
      ["Average Basket Value", `${currency} ${(filteredSales.length > 0 ? totalSalesAmount / filteredSales.length : 0).toFixed(2)}`],
      ["Cash Sales", `${currency} ${cashTotal.toFixed(2)} (${cashSales.length} txns)`],
      ["Card Sales", `${currency} ${cardTotal.toFixed(2)} (${cardSales.length} txns)`],
      ["Transfer Sales", `${currency} ${transferTotal.toFixed(2)} (${transferSales.length} txns)`],
      ["Credit Sales", `${currency} ${creditTotal.toFixed(2)} (${creditSales.length} txns)`],
      ["Total Subtotal (Excl. GST)", `${currency} ${totalTaxable.toFixed(2)}`],
      [`Total GST (${gstRate}%)`, `${currency} ${totalGst.toFixed(2)}`],
      [],
      ["--- Detailed Transactions ---"],
      [
        "Invoice / ID",
        "Date",
        "Time",
        "Customer",
        "Payment Method",
        "Items Count",
        "Items Summary",
        `Subtotal (${currency})`,
        `GST (${currency})`,
        `Grand Total (${currency})`
      ]
    ];

    filteredSales.forEach(sale => {
      const subtotal = sale.grandTotal / (1 + (gstRate / 100));
      const gst = sale.grandTotal - subtotal;
      const itemsSummary = (sale.items || []).map(i => `${i.qty}x ${i.name_en || i.name_dv}`).join('; ');
      const customerName = sale.customer ? `${sale.customer.name_en || sale.customer.name_dv}` : 'Walk-in Customer';

      data.push([
        sale.invoiceNumber || sale.id,
        formatDate(sale.date),
        formatTime(sale.date),
        customerName,
        (sale.paymentMethod || 'Unknown').toUpperCase(),
        sale.items ? sale.items.length : 0,
        itemsSummary,
        Number(subtotal.toFixed(2)),
        Number(gst.toFixed(2)),
        Number(sale.grandTotal.toFixed(2))
      ]);
    });

    data.push([
      "TOTAL",
      "",
      "",
      "",
      "",
      filteredSales.reduce((acc, s) => acc + (s.items?.length || 0), 0),
      "",
      Number(totalTaxable.toFixed(2)),
      Number(totalGst.toFixed(2)),
      Number(totalSalesAmount.toFixed(2))
    ]);

    const ws = XLSX.utils.aoa_to_sheet(data);

    ws['!cols'] = [
      { wch: 18 },
      { wch: 14 },
      { wch: 12 },
      { wch: 22 },
      { wch: 16 },
      { wch: 12 },
      { wch: 45 },
      { wch: 16 },
      { wch: 14 },
      { wch: 18 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Daily Sales");

    const safeFilter = dateFilter === 'custom' && dateRange?.from
      ? `custom_${format(dateRange.from, 'yyyyMMdd')}_${dateRange.to ? format(dateRange.to, 'yyyyMMdd') : ''}`
      : dateFilter;

    XLSX.writeFile(wb, `Sales_Report_${safeFilter}_${new Date().toISOString().split('T')[0]}.xlsx`);
    showSuccess(t('download_report_successful') || 'Excel report downloaded successfully');
  };

  const renderBoth = (key: string, options?: any) => (
    <>
      {t(key, options)} ({t(key, { ...options, lng: 'en' })})
    </>
  );

  const getMethodIcon = (method: string) => {
    switch (method.toLowerCase()) {
      case 'cash': return <DollarSign className="h-4 w-4" />;
      case 'card': return <CreditCard className="h-4 w-4" />;
      case 'transfer': return <ArrowRightLeft className="h-4 w-4" />;
      default: return <Receipt className="h-4 w-4" />;
    }
  };

  return (
    <div className="p-6 font-faruma flex flex-col h-full bg-background text-foreground overflow-hidden" dir="rtl">
      {/* Header Section */}
      <div className="flex flex-wrap justify-between items-center gap-4 mb-8">
        <div className="text-right">
           <h1 className="text-3xl font-black text-foreground flex items-center justify-end gap-3">
             {renderBoth('daily_sales')} <CalendarDays className="h-8 w-8 text-primary" />
           </h1>
           <p className="text-sm text-muted-foreground mt-1">Review and manage your business transactions</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
           <div className="bg-muted rounded-xl p-1 border border-border flex gap-1">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setActiveTab('sales')}
                className={cn(
                  "px-4 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                  activeTab === 'sales' ? "bg-primary text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Sales
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setActiveTab('pending')}
                className={cn(
                  "px-4 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                  activeTab === 'pending' ? "bg-yellow-500 text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Pending ({pendingTransfers.length})
              </Button>
           </div>
           
           <div className="bg-muted rounded-xl p-1 border border-border flex items-center gap-1">
              {['today', 'yesterday', 'last30', 'all'].map((filter) => (
                <Button 
                  key={filter}
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setDateFilter(filter as any)}
                  className={cn(
                    "px-4 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                    dateFilter === filter ? "bg-primary text-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {filter}
                </Button>
              ))}

              <Popover>
                <PopoverTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setDateFilter('custom')}
                    className={cn(
                      "px-3 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all",
                      dateFilter === 'custom' ? "bg-primary text-foreground" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <CalendarIcon className="h-3.5 w-3.5" />
                    {dateFilter === 'custom' && dateRange?.from ? (
                      <span>{getDateFilterLabel()}</span>
                    ) : (
                      <span>Custom Range</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-card border-border text-foreground" align="end">
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

           <div className="flex gap-2">
             <Button
               variant="outline"
               size="sm"
               onClick={() => setIsBriefingDialogOpen(true)}
               className="bg-muted border-border hover:bg-[#229ED9]/10 hover:border-[#229ED9]/30 hover:text-[#229ED9] text-foreground gap-2 h-9 px-3 rounded-xl text-xs font-bold transition-all"
             >
               <Moon className="h-4 w-4 text-[#229ED9]" />
               Briefing
             </Button>
             <Button
               variant="outline"
               size="sm"
               onClick={handleDownloadExcel}
               className="bg-muted border-border hover:bg-emerald-500/10 hover:border-emerald-500/30 hover:text-emerald-500 text-foreground gap-2 h-9 px-3 rounded-xl text-xs font-bold transition-all"
             >
               <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
               Excel
             </Button>
             <Button
               variant="outline"
               size="sm"
               onClick={handleDownloadPDF}
               className="bg-muted border-border hover:bg-primary/10 hover:border-primary/30 hover:text-primary text-foreground gap-2 h-9 px-3 rounded-xl text-xs font-bold transition-all"
             >
               <Download className="h-4 w-4" />
               PDF
             </Button>
           </div>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
         <Card className="apple-glass-card border border-white/20 dark:border-white/10 rounded-3xl p-6 relative overflow-hidden group shadow-lg">
            <div className="absolute top-0 right-0 w-28 h-28 bg-primary/15 rounded-full -mr-12 -mt-12 blur-2xl group-hover:bg-primary/25 transition-all" />
            <div className="flex justify-between items-center mb-4">
               <DollarSign className="h-5 w-5 text-primary" />
               <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Total Sales</span>
            </div>
            <p className="text-3xl font-black text-foreground font-mono">{settings.shop.currency} {totalSalesAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            <p className="text-[10px] text-muted-foreground/60 mt-1 font-bold uppercase tracking-widest">{dateFilter} SUMMARY</p>
         </Card>

         <Card className="apple-glass-card border border-white/20 dark:border-white/10 rounded-3xl p-6 relative overflow-hidden group shadow-lg">
            <div className="absolute top-0 right-0 w-28 h-28 bg-purple-500/15 rounded-full -mr-12 -mt-12 blur-2xl group-hover:bg-purple-500/25 transition-all" />
            <div className="flex justify-between items-center mb-4">
               <Receipt className="h-5 w-5 text-purple-500" />
               <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Total Transactions</span>
            </div>
            <p className="text-3xl font-black text-foreground font-mono">{filteredSales.length}</p>
            <p className="text-[10px] text-muted-foreground/60 mt-1 font-bold uppercase tracking-widest">RECEIPTS ISSUED</p>
         </Card>

         <Card className="apple-glass-card border border-white/20 dark:border-white/10 rounded-3xl p-6 relative overflow-hidden group shadow-lg">
            <div className="absolute top-0 right-0 w-28 h-28 bg-emerald-500/15 rounded-full -mr-12 -mt-12 blur-2xl group-hover:bg-emerald-500/25 transition-all" />
            <div className="flex justify-between items-center mb-4">
               <TrendingUp className="h-5 w-5 text-emerald-500" />
               <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Average Transaction</span>
            </div>
            <p className="text-3xl font-black text-foreground font-mono">
              {settings.shop.currency} {(filteredSales.length > 0 ? totalSalesAmount / filteredSales.length : 0).toFixed(2)}
            </p>
            <p className="text-[10px] text-muted-foreground/60 mt-1 font-bold uppercase tracking-widest">PER CUSTOMER</p>
         </Card>
      </div>

       {/* Sales/Pending List */}
      <ScrollArea className="flex-1 custom-scrollbar">
        <div className="space-y-4 pb-6">
          {activeTab === 'sales' ? (
            filteredSales.length === 0 ? (
              <div className="h-60 flex flex-col items-center justify-center text-muted-foreground/50 uppercase tracking-[0.2em] font-black">
                 <Receipt className="h-16 w-16 mb-4 opacity-10" />
                 No sales recorded for this period
              </div>
            ) : (
              filteredSales.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((sale) => (
                <Card key={sale.id} className="apple-glass-card border border-white/15 dark:border-white/10 hover:border-primary/50 transition-all duration-300 rounded-3xl p-6 group shadow-sm hover:shadow-md">
                  <div className="flex items-center justify-between gap-6">
                     <div className="flex items-center gap-6">
                        <div className="h-14 w-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                           <Receipt className="h-7 w-7" />
                        </div>
                        <div className="text-right">
                           <div className="flex items-center justify-end gap-3 mb-1">
                              <span className="text-lg font-black text-foreground">{sale.invoiceNumber || sale.id}</span>
                              <Badge className="bg-primary/20 text-primary border-none text-[8px] font-black uppercase tracking-widest px-2 py-0.5">
                                 {sale.paymentMethod}
                              </Badge>
                           </div>
                           <div className="flex items-center justify-end gap-2 text-xs font-bold text-muted-foreground">
                              <span>{formatDateTime(sale.date)}</span>
                              <span className="h-1 w-1 rounded-full bg-muted/80" />
                              <span>{sale.items.length} ITEMS</span>
                           </div>
                        </div>
                     </div>

                     <div className="flex-1 flex justify-center">
                        <div className="flex items-center gap-2">
                          {sale.items.slice(0, 3).map((item, idx) => (
                            <div key={idx} className="w-8 h-8 rounded-lg bg-muted border border-border flex items-center justify-center text-[10px] font-black text-muted-foreground">
                               {item.name_en.substring(0, 2).toUpperCase()}
                            </div>
                          ))}
                          {sale.items.length > 3 && <span className="text-[10px] font-black text-muted-foreground/50">+{sale.items.length - 3}</span>}
                        </div>
                     </div>

                     <div className="flex items-center gap-8">
                        <div className="text-right">
                           <p className="text-xs font-black text-muted-foreground uppercase tracking-wider mb-1">Grand Total</p>
                           <p className="text-2xl font-black text-primary">{settings.shop.currency} {sale.grandTotal.toFixed(2)}</p>
                        </div>
                        <div className="flex gap-2">
                           <Button 
                             variant="ghost" 
                             size="icon" 
                             onClick={() => handlePrintReceipt(sale)}
                             className="h-11 w-11 rounded-xl bg-muted border border-border hover:bg-primary hover:text-foreground transition-all text-muted-foreground"
                           >
                             <Printer className="h-4 w-4" />
                           </Button>
                           <Button 
                             variant="ghost" 
                             size="icon" 
                             onClick={() => handleEditSale(sale)}
                             className="h-11 w-11 rounded-xl bg-muted border border-border hover:bg-blue-500 hover:text-foreground transition-all text-muted-foreground"
                           >
                             <PencilLine className="h-4 w-4" />
                           </Button>
                        </div>
                     </div>
                  </div>
                </Card>
              ))
            )
          ) : (
            pendingTransfers.length === 0 ? (
              <div className="h-60 flex flex-col items-center justify-center text-muted-foreground/50 uppercase tracking-[0.2em] font-black">
                 <ArrowRightLeft className="h-16 w-16 mb-4 opacity-10" />
                 No pending transfers
              </div>
            ) : (
              <>
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-yellow-500/20 flex items-center justify-center text-yellow-500 shrink-0">
                      <ArrowRightLeft className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-foreground">Awaiting Transfers / Payments</p>
                      <p className="text-xs text-muted-foreground">
                        Any transfers not confirmed by the end of the day will automatically convert to credit sales.
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={() => convertAllPendingToCredit()}
                    className="bg-blue-600 hover:bg-blue-700 text-foreground font-black text-xs h-10 px-5 rounded-xl uppercase tracking-wider shrink-0"
                  >
                    End of Day: Convert All to Credit
                  </Button>
                </div>
                {pendingTransfers.map((transfer) => (
                  <Card key={transfer.id} className="bg-yellow-500/5 border-yellow-500/20 hover:border-yellow-500/40 transition-all rounded-3xl p-6">
                    <div className="flex items-center justify-between gap-6">
                       <div className="flex items-center gap-6">
                          <div className="h-14 w-14 rounded-2xl bg-yellow-500/20 flex items-center justify-center text-yellow-500">
                             <ArrowRightLeft className="h-7 w-7" />
                          </div>
                          <div className="text-right">
                             <p className="text-lg font-black text-foreground">{transfer.customer?.name_dv || transfer.tempCustomerName || 'Guest'}</p>
                             <p className="text-xs font-bold text-muted-foreground">{formatDateTime(transfer.date)}</p>
                          </div>
                       </div>

                       <div className="text-center">
                          <p className="text-xs font-black text-muted-foreground uppercase tracking-wider mb-1">Items</p>
                          <p className="text-sm font-black text-foreground">{transfer.items.length}</p>
                       </div>

                       <div className="flex items-center gap-8">
                          <div className="text-right">
                             <p className="text-xs font-black text-muted-foreground uppercase tracking-wider mb-1">Amount</p>
                             <p className="text-2xl font-black text-yellow-500">{settings.shop.currency} {transfer.grandTotal.toFixed(2)}</p>
                          </div>
                          <div className="flex gap-2">
                             <Button 
                               onClick={() => resolvePendingTransfer(transfer.id, 'cash')}
                               className="bg-green-600 hover:bg-green-700 text-foreground font-black text-[10px] h-11 px-6 rounded-xl uppercase tracking-widest"
                             >
                               Confirm Cash
                             </Button>
                             <Button 
                               onClick={() => resolvePendingTransfer(transfer.id, 'credit')}
                               className="bg-blue-600 hover:bg-blue-700 text-foreground font-black text-[10px] h-11 px-6 rounded-xl uppercase tracking-widest"
                             >
                               Confirm Credit
                             </Button>
                          </div>
                       </div>
                    </div>
                  </Card>
                ))}
              </>
            )
          )}
        </div>
      </ScrollArea>

      {/* Sale Edit Dialog */}
      {editingSale && (
        <SaleEditDialog
          isOpen={isEditSaleDialogOpen}
          onClose={() => setIsEditSaleDialogOpen(false)}
          onSave={handleSaveSaleUpdate}
          sale={editingSale}
        />
      )}

      {/* Executive Briefing Dialog */}
      <Dialog open={isBriefingDialogOpen} onOpenChange={setIsBriefingDialogOpen}>
        <DialogContent className="sm:max-w-[36rem] 2xl:max-w-[44rem] w-[calc(100vw-2rem)] font-faruma apple-glass-dialog text-foreground border-white/20 dark:border-white/10 p-6 sm:p-7 shadow-2xl rounded-3xl overflow-hidden box-border [&>button]:left-4 [&>button]:right-auto max-h-[90vh] flex flex-col" dir="rtl">
          <DialogHeader className="text-right pb-4 border-b border-white/10 dark:border-white/5">
            <div className="flex items-center justify-between pl-8">
              <Badge className="bg-[#229ED9]/15 text-[#229ED9] border border-[#229ED9]/30 text-xs font-mono font-bold rounded-xl px-2.5 py-1 backdrop-blur-md">
                Store Report
              </Badge>
              <div className="text-right">
                <DialogTitle className="text-xl font-black text-foreground flex items-center justify-end gap-2">
                  <span>Store Close Daily Briefing</span>
                  <Moon className="h-5 w-5 text-[#229ED9]" />
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Daily summary sent directly to the "B BACK" Telegram group.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {(() => {
            const targetDate = briefingDateMode === 'yesterday'
              ? new Date(Date.now() - 24 * 60 * 60 * 1000)
              : new Date();
            const allSettlements = customers.flatMap(c => c.settlement_history || []);
            const data = calculateExecutiveBriefingData({ sales, settlements: allSettlements, targetDate });
            const groupChat = settings.shop?.telegramGroupChatId || settings.telegram?.groupChatId || settings.telegram?.ownerChatId;
            const groupTitle = settings.shop?.telegramGroupTitle || 'B BACK';
            const currency = settings.shop.currency;

            const handleSendToGroup = async () => {
              if (!groupChat) {
                showError('B BACK Telegram Group Chat ID not configured. Please link the group in Admin Settings.');
                return;
              }
              setIsSendingBriefing(true);
              try {
                const res = await sendNightlyExecutiveBriefing({
                  chatId: groupChat,
                  sales,
                  settlements: allSettlements,
                  shopSettings: settings.shop,
                  date: targetDate,
                  token: settings.telegram?.botToken,
                });
                if (res?.ok) {
                  showSuccess(`${briefingDateMode === 'yesterday' ? "Yesterday's" : "Today's"} Daily Briefing sent to "${groupTitle}" Telegram group! 📊`);
                  setIsBriefingDialogOpen(false);
                } else {
                  showError(res?.description || 'Failed to send briefing');
                }
              } catch (e: any) {
                showError(e.message || 'Error sending briefing');
              } finally {
                setIsSendingBriefing(false);
              }
            };

            return (
              <div className="flex-1 overflow-y-auto py-4 space-y-4 text-right custom-scrollbar">
                {/* Date Mode Selector */}
                <div className="flex items-center justify-center gap-2 bg-black/10 dark:bg-white/5 p-1.5 rounded-2xl border border-white/15 dark:border-white/10 backdrop-blur-md">
                  <button
                    type="button"
                    onClick={() => setBriefingDateMode('today')}
                    className={cn(
                      "flex-1 py-2 px-3 rounded-xl text-xs transition-all duration-200 active:scale-[0.98]",
                      briefingDateMode === 'today' ? "bg-primary text-primary-foreground shadow-md font-black" : "text-muted-foreground hover:text-foreground font-bold hover:bg-white/10"
                    )}
                  >
                    Today's Report (މިއަދުގެ ރިޕޯޓް)
                  </button>
                  <button
                    type="button"
                    onClick={() => setBriefingDateMode('yesterday')}
                    className={cn(
                      "flex-1 py-2 px-3 rounded-xl text-xs transition-all duration-200 active:scale-[0.98]",
                      briefingDateMode === 'yesterday' ? "bg-primary text-primary-foreground shadow-md font-black" : "text-muted-foreground hover:text-foreground font-bold hover:bg-white/10"
                    )}
                  >
                    Yesterday's Report (އިއްޔެގެ ރިޕޯޓް)
                  </button>
                </div>

                {/* Header overview card */}
                <div className="p-4 rounded-2xl apple-glass-card border border-white/20 dark:border-white/10 flex items-center justify-between">
                  <div className="text-left">
                    <p className="text-[10px] uppercase font-black tracking-wider text-muted-foreground">Receipts Issued</p>
                    <p className="text-lg font-black text-foreground">{data.totalTransactions} transactions</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black text-foreground">{data.dateStr} {briefingDateMode === 'today' ? `| ${data.timeStr}` : ''}</p>
                    <p className="text-[10px] text-muted-foreground font-bold">{settings.shop.shopName || 'B BACK'}</p>
                  </div>
                </div>

                {/* Total Sales with Breakdown */}
                <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 space-y-2 backdrop-blur-md">
                  <div className="flex justify-between items-baseline">
                    <span className="text-2xl font-black text-primary">
                      {currency} {data.totalSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className="text-[10px] uppercase font-black tracking-wider text-primary">
                      Total Sales
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-primary/15 text-center">
                    <div className="bg-background/40 backdrop-blur-md p-2 rounded-xl border border-primary/10">
                      <p className="text-[9px] font-bold text-muted-foreground uppercase">Cash</p>
                      <p className="text-xs font-black text-foreground">{currency} {data.cashSales.toFixed(0)}</p>
                    </div>
                    <div className="bg-background/40 backdrop-blur-md p-2 rounded-xl border border-primary/10">
                      <p className="text-[9px] font-bold text-muted-foreground uppercase">BML / Transfer</p>
                      <p className="text-xs font-black text-foreground">{currency} {data.transferSales.toFixed(0)}</p>
                    </div>
                    <div className="bg-background/40 backdrop-blur-md p-2 rounded-xl border border-primary/10">
                      <p className="text-[9px] font-bold text-muted-foreground uppercase">Credit</p>
                      <p className="text-xs font-black text-foreground">{currency} {data.creditSales.toFixed(0)}</p>
                    </div>
                  </div>
                </div>

                {/* Credit Collections Settled Today */}
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 backdrop-blur-md flex items-center justify-between">
                  <span className="text-xl font-black text-emerald-500">
                    {currency} {data.creditCollections.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <div className="text-right">
                    <p className="text-xs font-black text-foreground">Credit Collections Settled Today</p>
                    <p className="text-[10px] text-muted-foreground">{data.settlementCount} customer settlements recorded</p>
                  </div>
                </div>

                {/* Top Selling Items */}
                <div className="p-4 rounded-2xl apple-glass-card border border-white/20 dark:border-white/10 space-y-2">
                  <p className="text-xs font-black text-muted-foreground uppercase tracking-wider text-right">
                    Top Selling Items Today:
                  </p>
                  {data.topItems.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-2">No items recorded today</p>
                  ) : (
                    <div className="space-y-1.5">
                      {data.topItems.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center p-2.5 rounded-xl bg-background/40 backdrop-blur-sm border border-white/10 text-xs">
                          <span className="font-mono font-bold text-primary">
                            {currency} {item.totalAmount.toFixed(2)}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-foreground">{item.name}</span>
                            <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-mono border-white/20">
                              {item.qty} {item.unit && item.unit !== 'Piece' ? item.unit : 'pcs'}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground font-black">#{idx + 1}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Group Connection Info */}
                <div className="p-3 rounded-xl bg-black/10 dark:bg-white/5 border border-white/15 dark:border-white/10 text-xs flex items-center justify-between text-muted-foreground">
                  <span className="font-mono text-[11px] font-bold text-foreground">
                    {groupChat ? `${groupTitle} (${groupChat})` : '⚠️ Not linked'}
                  </span>
                  <span>Destination Telegram Group:</span>
                </div>

                <DialogFooter className="pt-3 border-t border-white/10 dark:border-white/5 flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsBriefingDialogOpen(false)}
                    className="flex-1 h-12 rounded-2xl border-white/20 dark:border-white/10 hover:bg-white/10 text-foreground font-bold active:scale-[0.98] transition-all"
                  >
                    Close
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSendToGroup}
                    disabled={isSendingBriefing || !groupChat}
                    className="flex-[2] h-12 rounded-2xl bg-[#229ED9] hover:bg-[#229ED9]/90 text-white font-black text-xs gap-2 shadow-lg shadow-[#229ED9]/25 active:scale-[0.98] transition-all"
                  >
                    {isSendingBriefing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Sending to Telegram...</span>
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        <span>Send Briefing to "{groupTitle}" Group Now</span>
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DailySales;