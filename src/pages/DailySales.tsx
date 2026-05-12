"use client";

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { PencilLine, CalendarDays, Printer, Trash2, Filter, ChevronRight, Receipt, DollarSign, CreditCard, ArrowRightLeft, TrendingUp } from 'lucide-react';
import { useAppContext, Product, Customer, CartItem, Sale } from '@/context/AppContext';
import { formatDate, formatTime, toISODate } from '@/utils/formatters';
import SaleEditDialog from '@/components/SaleEditDialog'; 
import { showSuccess } from '@/utils/toast';
import { printContent } from '@/utils/printHelper';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const DailySales = () => {
  const { t } = useTranslation();
  const { sales, setSales, settings } = useAppContext();
  const [isEditSaleDialogOpen, setIsEditSaleDialogOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'yesterday' | 'last30'>('today');
  const [activeTab, setActiveTab] = useState<'sales' | 'pending'>('sales');
  const { pendingTransfers, resolvePendingTransfer } = useAppContext();

  const filterSalesByDate = (salesList: Sale[]) => {
    const todayStr = toISODate();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = toISODate(yesterday);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    return salesList.filter(sale => {
      const saleDateStr = typeof sale.date === 'string' ? sale.date : new Date(sale.date).toLocaleDateString('sv-SE');
      
      if (dateFilter === 'today') return saleDateStr === todayStr;
      if (dateFilter === 'yesterday') return saleDateStr === yesterdayStr;
      if (dateFilter === 'last30') {
        const saleDate = new Date(sale.date);
        saleDate.setHours(0, 0, 0, 0);
        return saleDate.getTime() >= thirtyDaysAgo.getTime();
      }
      return true;
    });
  };

  const filteredSales = filterSalesByDate(sales);

  const handlePrintReceipt = (sale: Sale) => {
    const currency = settings.shop.currency;
    const itemsHtml = sale.items.map(item => `
      <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px;">
        <div style="flex: 1; text-align: left;">
          ${item.name_dv}<br/><small>${item.name_en}</small>
        </div>
        <div style="width: 60px; text-align: right;">${item.qty} x ${item.price.toFixed(2)}</div>
        <div style="width: 70px; text-align: right;">${(item.qty * item.price).toFixed(2)}</div>
      </div>
    `).join('');

    const gstRate = settings.shop.taxRate;
    const subtotal = sale.grandTotal / (1 + (gstRate / 100));
    const gstAmount = sale.grandTotal - subtotal;

    const htmlContent = `
      <html>
        <head>
          <title>Receipt ${sale.id}</title>
          <style>
            @media print {
              @page { margin: 0; size: ${settings.printing.thermalPrinterWidth === '58mm' ? '58mm' : '80mm'} auto; }
              body { margin: 0; padding: 10px; font-family: sans-serif; width: ${settings.printing.thermalPrinterWidth === '58mm' ? '58mm' : '80mm'}; }
            }
            body { font-family: sans-serif; padding: 20px; text-align: center; }
            .header { font-weight: bold; font-size: 16px; margin-bottom: 5px; }
            .info { font-size: 12px; margin-bottom: 10px; }
            .separator { border-top: 1px dashed #000; margin: 10px 0; }
            .totals { font-weight: bold; margin-top: 10px; }
            .footer { font-size: 10px; margin-top: 20px; font-style: italic; }
          </style>
        </head>
        <body>
          <div class="header">${settings.shop.shopName}</div>
          <div class="info">
            ${settings.shop.shopAddress}<br/>
            Tel: ${settings.shop.shopPhone}<br/>
            ${formatDate(sale.date)} ${sale.created_at ? formatTime(sale.created_at) : ''} | ${sale.id}
          </div>
          <div class="separator"></div>
          ${itemsHtml}
          <div class="separator"></div>
          <div style="display: flex; justify-content: space-between; font-size: 12px;">
            <span>Subtotal:</span>
            <span>${currency} ${subtotal.toFixed(2)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 12px;">
            <span>GST (${gstRate}%):</span>
            <span>${currency} ${gstAmount.toFixed(2)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 14px; margin-top: 5px;">
            <span>TOTAL:</span>
            <span>${currency} ${sale.grandTotal.toFixed(2)}</span>
          </div>
          <div class="separator"></div>
          <div class="footer">Thank you for shopping with us!</div>
        </body>
      </html>
    `;
    printContent(htmlContent);
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
    <div className="p-6 font-faruma flex flex-col h-full bg-[#050510] text-white overflow-hidden" dir="rtl">
      {/* Header Section */}
      <div className="flex justify-between items-center mb-8">
        <div className="text-right">
           <h1 className="text-3xl font-black text-white flex items-center justify-end gap-3">
             {renderBoth('daily_sales')} <CalendarDays className="h-8 w-8 text-primary" />
           </h1>
           <p className="text-sm text-white/40 mt-1">Review and manage your business transactions</p>
        </div>

        <div className="flex gap-3">
           <div className="bg-white/5 rounded-xl p-1 border border-white/10 flex gap-1">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setActiveTab('sales')}
                className={cn(
                  "px-4 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                  activeTab === 'sales' ? "bg-primary text-white" : "text-white/40 hover:text-white"
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
                  activeTab === 'pending' ? "bg-yellow-500 text-white" : "text-white/40 hover:text-white"
                )}
              >
                Pending ({pendingTransfers.length})
              </Button>
           </div>
           <div className="bg-white/5 rounded-xl p-1 border border-white/10 flex gap-1">
              {['today', 'yesterday', 'last30', 'all'].map((filter) => (
                <Button 
                  key={filter}
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setDateFilter(filter as any)}
                  className={cn(
                    "px-4 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                    dateFilter === filter ? "bg-white/10 text-white" : "text-white/40 hover:text-white"
                  )}
                >
                  {filter}
                </Button>
              ))}
           </div>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
         <Card className="bg-[#0a0a1a] border-white/5 rounded-3xl p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full -mr-12 -mt-12 blur-2xl group-hover:bg-primary/20 transition-all" />
            <div className="flex justify-between items-center mb-4">
               <DollarSign className="h-5 w-5 text-primary" />
               <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Total Sales</span>
            </div>
            <p className="text-3xl font-black text-white">{settings.shop.currency} {totalSalesAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            <p className="text-[10px] text-white/20 mt-1 font-bold uppercase tracking-widest">{dateFilter} SUMMARY</p>
         </Card>

         <Card className="bg-[#0a0a1a] border-white/5 rounded-3xl p-6 relative overflow-hidden group">
            <div className="flex justify-between items-center mb-4">
               <Receipt className="h-5 w-5 text-purple-500" />
               <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Total Transactions</span>
            </div>
            <p className="text-3xl font-black text-white">{filteredSales.length}</p>
            <p className="text-[10px] text-white/20 mt-1 font-bold uppercase tracking-widest">RECEIPTS ISSUED</p>
         </Card>

         <Card className="bg-[#0a0a1a] border-white/5 rounded-3xl p-6 relative overflow-hidden group">
            <div className="flex justify-between items-center mb-4">
               <TrendingUp className="h-5 w-5 text-green-500" />
               <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Average Transaction</span>
            </div>
            <p className="text-3xl font-black text-white">
              {settings.shop.currency} {(filteredSales.length > 0 ? totalSalesAmount / filteredSales.length : 0).toFixed(2)}
            </p>
            <p className="text-[10px] text-white/20 mt-1 font-bold uppercase tracking-widest">PER CUSTOMER</p>
         </Card>
      </div>

       {/* Sales/Pending List */}
      <ScrollArea className="flex-1 custom-scrollbar">
        <div className="space-y-4 pb-6">
          {activeTab === 'sales' ? (
            filteredSales.length === 0 ? (
              <div className="h-60 flex flex-col items-center justify-center text-white/20 uppercase tracking-[0.2em] font-black">
                 <Receipt className="h-16 w-16 mb-4 opacity-10" />
                 No sales recorded for this period
              </div>
            ) : (
              filteredSales.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((sale) => (
                <Card key={sale.id} className="bg-[#0a0a1a] border-white/5 hover:border-primary/30 transition-all rounded-3xl p-6 group">
                  <div className="flex items-center justify-between gap-6">
                     <div className="flex items-center gap-6">
                        <div className="h-14 w-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                           <Receipt className="h-7 w-7" />
                        </div>
                        <div className="text-right">
                           <div className="flex items-center justify-end gap-3 mb-1">
                              <span className="text-lg font-black text-white">{sale.id}</span>
                              <Badge className="bg-primary/20 text-primary border-none text-[8px] font-black uppercase tracking-widest px-2 py-0.5">
                                 {sale.paymentMethod}
                              </Badge>
                           </div>
                           <div className="flex items-center justify-end gap-2 text-xs font-bold text-white/40">
                              <span>{new Date(sale.date).toLocaleString()}</span>
                              <span className="h-1 w-1 rounded-full bg-white/10" />
                              <span>{sale.items.length} ITEMS</span>
                           </div>
                        </div>
                     </div>

                     <div className="flex-1 flex justify-center">
                        <div className="flex items-center gap-2">
                          {sale.items.slice(0, 3).map((item, idx) => (
                            <div key={idx} className="w-8 h-8 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center text-[10px] font-black text-white/40">
                               {item.name_en.substring(0, 2).toUpperCase()}
                            </div>
                          ))}
                          {sale.items.length > 3 && <span className="text-[10px] font-black text-white/20">+{sale.items.length - 3}</span>}
                        </div>
                     </div>

                     <div className="flex items-center gap-8">
                        <div className="text-right">
                           <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-1">Grand Total</p>
                           <p className="text-2xl font-black text-primary">{settings.shop.currency} {sale.grandTotal.toFixed(2)}</p>
                        </div>
                        <div className="flex gap-2">
                           <Button 
                             variant="ghost" 
                             size="icon" 
                             onClick={() => handlePrintReceipt(sale)}
                             className="h-11 w-11 rounded-xl bg-white/5 border border-white/10 hover:bg-primary hover:text-white transition-all text-white/40"
                           >
                             <Printer className="h-4 w-4" />
                           </Button>
                           <Button 
                             variant="ghost" 
                             size="icon" 
                             onClick={() => handleEditSale(sale)}
                             className="h-11 w-11 rounded-xl bg-white/5 border border-white/10 hover:bg-blue-500 hover:text-white transition-all text-white/40"
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
              <div className="h-60 flex flex-col items-center justify-center text-white/20 uppercase tracking-[0.2em] font-black">
                 <ArrowRightLeft className="h-16 w-16 mb-4 opacity-10" />
                 No pending transfers
              </div>
            ) : (
              pendingTransfers.map((transfer) => (
                <Card key={transfer.id} className="bg-yellow-500/5 border-yellow-500/20 hover:border-yellow-500/40 transition-all rounded-3xl p-6">
                  <div className="flex items-center justify-between gap-6">
                     <div className="flex items-center gap-6">
                        <div className="h-14 w-14 rounded-2xl bg-yellow-500/20 flex items-center justify-center text-yellow-500">
                           <ArrowRightLeft className="h-7 w-7" />
                        </div>
                        <div className="text-right">
                           <p className="text-lg font-black text-white">{transfer.customer?.name_dv || transfer.tempCustomerName || 'Guest'}</p>
                           <p className="text-xs font-bold text-white/40">{new Date(transfer.date).toLocaleString()}</p>
                        </div>
                     </div>

                     <div className="text-center">
                        <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-1">Items</p>
                        <p className="text-sm font-black text-white">{transfer.items.length}</p>
                     </div>

                     <div className="flex items-center gap-8">
                        <div className="text-right">
                           <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-1">Amount</p>
                           <p className="text-2xl font-black text-yellow-500">{settings.shop.currency} {transfer.grandTotal.toFixed(2)}</p>
                        </div>
                        <div className="flex gap-2">
                           <Button 
                             onClick={() => resolvePendingTransfer(transfer.id, 'cash')}
                             className="bg-green-600 hover:bg-green-700 text-white font-black text-[10px] h-11 px-6 rounded-xl uppercase tracking-widest"
                           >
                             Confirm Cash
                           </Button>
                           <Button 
                             onClick={() => resolvePendingTransfer(transfer.id, 'credit')}
                             className="bg-blue-600 hover:bg-blue-700 text-white font-black text-[10px] h-11 px-6 rounded-xl uppercase tracking-widest"
                             disabled={!transfer.customer}
                           >
                             Confirm Credit
                           </Button>
                        </div>
                     </div>
                  </div>
                </Card>
              ))
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
    </div>
  );
};

export default DailySales;