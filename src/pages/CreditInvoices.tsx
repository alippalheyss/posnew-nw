"use client";

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Printer, FileText, Receipt, Search, Filter, PencilLine, AlertCircle, Clock, CheckCircle2 } from 'lucide-react';
import { printContent } from '@/utils/printHelper';
import { useAppContext, Sale } from '@/context/AppContext';
import SaleEditDialog from '@/components/SaleEditDialog';
import { showSuccess } from '@/utils/toast';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';

const CreditInvoices = () => {
  const { t } = useTranslation();
  const { sales, setSales, settings } = useAppContext();
  const [isEditSaleDialogOpen, setIsEditSaleDialogOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'yesterday' | 'custom'>('all');
  const [customDate, setCustomDate] = useState<Date | undefined>(new Date());

  const handleEditClick = (sale: Sale) => {
    setEditingSale({ ...sale });
    setIsEditSaleDialogOpen(true);
  };

  const handleSaveSale = (updatedSale: Sale) => {
    setSales(prevSales =>
      prevSales.map(s => (s.id === updatedSale.id ? updatedSale : s))
    );
    setIsEditSaleDialogOpen(false);
    setEditingSale(null);
  };

  const handlePrintInvoice = (sale: Sale) => {
    const currency = settings.shop.currency;
    const itemsHtml = sale.items.map(item => `
      <tr style="border-bottom: 1px solid #eee;">
        <td style="padding: 8px; text-align: left;">
          ${item.name_dv}<br/><small>${item.name_en}</small>
        </td>
        <td style="padding: 8px; text-align: right;">${item.qty}</td>
        <td style="padding: 8px; text-align: right;">${item.price.toFixed(2)}</td>
        <td style="padding: 8px; text-align: right;">${(item.qty * item.price).toFixed(2)}</td>
      </tr>
    `).join('');

    const gstRate = settings.shop.taxRate;
    const subtotal = sale.grandTotal / (1 + (gstRate / 100));
    const gstAmount = sale.grandTotal - subtotal;

    const logoHtml = settings.reports.showLogo && settings.shop.logo ? `
      <div style="margin-bottom: 20px;">
        <img src="${settings.shop.logo}" style="max-height: 80px;" />
      </div>
    ` : '';

    const htmlContent = `
      <html>
        <head>
          <title>Credit Invoice ${sale.invoiceNumber || sale.id}</title>
          <style>
            body { font-family: sans-serif; padding: 40px; color: #333; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #eee; padding-bottom: 20px; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; text-align: left; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            th { background: #f9f9f9; padding: 10px; border-bottom: 2px solid #eee; text-align: right; }
            th:first-child { text-align: left; }
            .totals { float: right; width: 300px; }
            .total-row { display: flex; justify-content: space-between; padding: 5px 0; }
            .grand-total { font-weight: bold; font-size: 1.2em; border-top: 2px solid #eee; margin-top: 10px; padding-top: 10px; }
            .footer { margin-top: 100px; text-align: center; font-size: 12px; color: #777; }
            @media print { body { padding: 20px; } .no-print { display: none; } }
          </style>
        </head>
        <body>
          <div class="header">
            ${logoHtml}
            <h1 style="margin: 0; color: #000;">CREDIT INVOICE</h1>
            <p>${settings.shop.shopName}</p>
          </div>
          <div class="info-grid">
            <div>
              <strong>From:</strong><br/>
              ${settings.shop.shopName}<br/>
              ${settings.shop.shopAddress}<br/>
              Tel: ${settings.shop.shopPhone}
            </div>
            <div style="text-align: right;">
              <strong>To:</strong><br/>
              ${sale.customer?.name_dv} (${sale.customer?.name_en})<br/>
              Code: ${sale.customer?.code}<br/>
              Date: ${sale.date}<br/>
              Invoice #: ${sale.invoiceNumber || sale.id}
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Qty</th>
                <th>Price</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
          <div class="totals">
            <div class="total-row">
              <span>Subtotal:</span>
              <span>${currency} ${subtotal.toFixed(2)}</span>
            </div>
            <div class="total-row">
              <span>GST (${gstRate}%):</span>
              <span>${currency} ${gstAmount.toFixed(2)}</span>
            </div>
            <div class="total-row grand-total">
              <span>Grand Total:</span>
              <span>${currency} ${sale.grandTotal.toFixed(2)}</span>
            </div>
          </div>
          <div class="footer">
            <p>Terms: Credit invoice payment is due within the agreed period.</p>
            <p>This is a computer generated invoice.</p>
          </div>
        </body>
      </html>
    `;
    printContent(htmlContent, settings);
  };

  const creditSales = sales.filter(s => s.paymentMethod?.toLowerCase() === 'credit' || (s.paymentMethod?.toLowerCase() === 'split' && (s.balance || 0) > 0));
  
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

    return salesList.filter(sale => {
      if (!sale.date) return false;
      const saleDate = new Date(sale.date);
      const sY = saleDate.getFullYear();
      const sM = saleDate.getMonth();
      const sD = saleDate.getDate();
      
      if (dateFilter === 'today') {
        return sY === todayY && sM === todayM && sD === todayD;
      }
      if (dateFilter === 'yesterday') {
        return sY === yesterdayY && sM === yesterdayM && sD === yesterdayD;
      }
      if (dateFilter === 'custom' && customDate) {
        return sY === customDate.getFullYear() && sM === customDate.getMonth() && sD === customDate.getDate();
      }
      return true; // 'all'
    });
  };

  const filteredSales = filterSalesByDate(creditSales).filter(s => 
    s.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.customer?.name_dv.includes(searchTerm) ||
    s.customer?.name_en.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderBoth = (key: string, options?: any) => (
    <>
      {t(key, options)} ({t(key, { ...options, lng: 'en' })})
    </>
  );

  return (
    <div className="p-6 font-faruma flex flex-col h-full bg-background text-foreground overflow-hidden" dir="rtl">
      {/* Header Section */}
      <div className="flex justify-between items-center mb-8">
        <div className="text-right">
           <h1 className="text-3xl font-black text-foreground flex items-center justify-end gap-3">
             {renderBoth('credit_invoices')} <Receipt className="h-8 w-8 text-primary" />
           </h1>
           <p className="text-sm text-muted-foreground mt-1">Manage and track all outstanding credit sales</p>
        </div>
      </div>

      {/* Filters Section */}
      <div className="flex flex-wrap items-center gap-4 mb-8 bg-muted p-2 rounded-2xl border border-border w-fit">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setDateFilter('all')}
          className={cn("rounded-xl text-xs font-bold transition-all", dateFilter === 'all' ? "bg-primary text-foreground" : "text-muted-foreground hover:text-foreground")}
        >
          {t('all')}
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setDateFilter('today')}
          className={cn("rounded-xl text-xs font-bold transition-all", dateFilter === 'today' ? "bg-primary text-foreground" : "text-muted-foreground hover:text-foreground")}
        >
          {t('today')}
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setDateFilter('yesterday')}
          className={cn("rounded-xl text-xs font-bold transition-all", dateFilter === 'yesterday' ? "bg-primary text-foreground" : "text-muted-foreground hover:text-foreground")}
        >
          {t('yesterday')}
        </Button>
        
        <Popover>
          <PopoverTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setDateFilter('custom')}
              className={cn("rounded-xl text-xs font-bold flex gap-2 items-center transition-all", dateFilter === 'custom' ? "bg-primary text-foreground" : "text-muted-foreground hover:text-foreground")}
            >
              <CalendarIcon className="h-4 w-4" />
              {dateFilter === 'custom' && customDate ? format(customDate, 'PPP') : t('custom_date')}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 bg-card border-border text-foreground" align="end">
            <Calendar
              mode="single"
              selected={customDate}
              onSelect={(date) => {
                if (date) {
                  setCustomDate(date);
                  setDateFilter('custom');
                }
              }}
              initialFocus
              className="font-faruma"
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Search Bar */}
      <div className="relative mb-8">
         <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
         <Input 
           placeholder="Search invoices by ID or customer name..."
           value={searchTerm}
           onChange={(e) => setSearchTerm(e.target.value)}
           className="w-full bg-muted border-border rounded-xl pr-12 h-14 text-right font-bold focus:border-primary/50 transition-all text-lg"
         />
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
            filteredSales.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((sale) => (
              <Card key={sale.id} className="bg-card border-border hover:border-orange-500/30 transition-all rounded-3xl p-6 group">
                <div className="flex items-center justify-between gap-6">
                   <div className="flex items-center gap-6">
                      <div className="h-14 w-14 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500 group-hover:scale-110 transition-transform">
                         <FileText className="h-7 w-7" />
                      </div>
                      <div className="text-right">
                         <div className="flex items-center justify-end gap-3 mb-1">
                            <span className="text-lg font-black text-foreground">{sale.invoiceNumber || sale.id}</span>
                            <Badge className="bg-orange-500 text-foreground border-none text-[8px] font-black uppercase tracking-widest px-2 py-0.5">
                               CREDIT
                            </Badge>
                         </div>
                         <div className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                            {sale.customer?.name_dv} ({sale.customer?.name_en})
                         </div>
                      </div>
                   </div>

                   <div className="flex-1 flex justify-center">
                      <div className="flex items-center gap-6 text-muted-foreground">
                         <div className="flex flex-col items-center">
                            <Clock className="h-4 w-4 mb-1" />
                            <span className="text-[10px] font-black uppercase tracking-widest">{new Date(sale.date).toLocaleDateString()}</span>
                         </div>
                         <div className="h-8 w-[1px] bg-muted" />
                         <div className="flex flex-col items-center">
                            <Receipt className="h-4 w-4 mb-1" />
                            <span className="text-[10px] font-black uppercase tracking-widest">{sale.items.length} ITEMS</span>
                         </div>
                      </div>
                   </div>

                   <div className="flex items-center gap-8">
                      <div className="text-right">
                         <p className="text-[10px] font-black text-foreground/30 uppercase tracking-widest mb-1">Balance Due</p>
                         <p className="text-2xl font-black text-orange-500">{settings.shop.currency} {sale.grandTotal.toFixed(2)}</p>
                      </div>
                      <div className="flex gap-2">
                         <Button 
                           variant="ghost" 
                           size="icon" 
                           onClick={() => handlePrintInvoice(sale)}
                           className="h-11 w-11 rounded-xl bg-muted border border-border hover:bg-orange-500 hover:text-foreground transition-all text-muted-foreground"
                         >
                           <Printer className="h-4 w-4" />
                         </Button>
                         <Button 
                           variant="ghost" 
                           size="icon" 
                           onClick={() => handleEditClick(sale)}
                           className="h-11 w-11 rounded-xl bg-muted border border-border hover:bg-blue-500 hover:text-foreground transition-all text-muted-foreground"
                         >
                           <PencilLine className="h-4 w-4" />
                         </Button>
                      </div>
                   </div>
                </div>
              </Card>
            ))
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
    </div>
  );
};

export default CreditInvoices;