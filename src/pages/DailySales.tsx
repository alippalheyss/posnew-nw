"use client";

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { PencilLine } from 'lucide-react';
import { useAppContext, Product, Customer, CartItem, Sale } from '@/context/AppContext';
import SaleEditDialog from '@/components/SaleEditDialog'; // Import the new dialog
import { showSuccess } from '@/utils/toast';
import { Printer, Trash2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const DailySales = () => {
  const { t } = useTranslation();
  const { sales, setSales, settings, deleteSale } = useAppContext();
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'admin';
  const [isEditSaleDialogOpen, setIsEditSaleDialogOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'yesterday' | 'last30'>('today');

  const filterSalesByDate = (salesList: Sale[]) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return salesList.filter(sale => {
      const saleDate = new Date(sale.date);
      saleDate.setHours(0, 0, 0, 0);

      if (dateFilter === 'today') return saleDate.getTime() === today.getTime();
      if (dateFilter === 'yesterday') {
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        return saleDate.getTime() === yesterday.getTime();
      }
      if (dateFilter === 'last30') {
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(today.getDate() - 30);
        return saleDate.getTime() >= thirtyDaysAgo.getTime();
      }
      return true;
    });
  };

  const filteredSales = filterSalesByDate(sales.filter(s => s.paymentMethod !== 'credit'));

  const handlePrintReceipt = (sale: Sale) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

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

    printWindow.document.write(`
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
        <body onload="window.print();window.close()">
          <div class="header">${settings.shop.shopName}</div>
          <div class="info">
            ${settings.shop.shopAddress}<br/>
            Tel: ${settings.shop.shopPhone}<br/>
            ${sale.date} | ${sale.id}
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
          <div class="info" style="text-align: left;">
            Payment: ${sale.paymentMethod.toUpperCase()}<br/>
            ${sale.paidAmount ? `Paid: ${currency} ${sale.paidAmount.toFixed(2)}<br/>` : ''}
            ${sale.balance !== undefined ? `Balance: ${currency} ${sale.balance.toFixed(2)}` : ''}
          </div>
          <div class="footer">
            ${settings.shop.receiptFooter}
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleEditClick = (sale: Sale) => {
    setEditingSale({ ...sale });
    setIsEditSaleDialogOpen(true);
  };

  const handleSaveSale = (updatedSale: Sale) => {
    setSales(prevSales =>
      prevSales.map(s => (s.id === updatedSale.id ? updatedSale : s))
    );
    showSuccess(t('sale_updated_successfully'));
    setIsEditSaleDialogOpen(false);
    setEditingSale(null);
  };

  const handleDeleteSale = async (id: string) => {
    if (window.confirm(t('confirm_delete_sale'))) {
      await deleteSale(id);
    }
  };

  const renderBoth = (key: string, options?: any) => (
    <>
      {t(key, options)} ({t(key, { ...options, lng: 'en' })})
    </>
  );

  return (
    <div className="p-4 font-faruma flex flex-col h-full">
      <Card className="flex-1">
        <CardHeader>
          <CardTitle className="text-right text-xl">{renderBoth('daily_sales')}</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden">
          <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4">
            <p className="text-right text-gray-500">{renderBoth('daily_sales_description')}</p>
            <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
              <Button
                variant={dateFilter === 'today' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setDateFilter('today')}
                className="text-xs h-8"
              >
                {t('today')}
              </Button>
              <Button
                variant={dateFilter === 'yesterday' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setDateFilter('yesterday')}
                className="text-xs h-8"
              >
                {t('yesterday')}
              </Button>
              <Button
                variant={dateFilter === 'last30' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setDateFilter('last30')}
                className="text-xs h-8"
              >
                {t('last_30_days')}
              </Button>
              <Button
                variant={dateFilter === 'all' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setDateFilter('all')}
                className="text-xs h-8"
              >
                {t('all')}
              </Button>
            </div>
          </div>

          <ScrollArea className="h-[calc(100vh-280px)] pr-4">
            {filteredSales.length === 0 ? (
              <p className="text-center text-gray-500 py-10 font-bold">{t('no_sales_for_selected_range')}</p>
            ) : (
              <div className="space-y-3">
                {[...filteredSales]
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.id.localeCompare(a.id))
                  .map((sale) => (
                    <Card key={sale.id} className="text-right border shadow-sm">
                      <CardHeader className="p-3 pb-0">
                        <CardTitle className="text-sm flex justify-between items-center text-gray-500">
                          <span>{sale.id}</span>
                          <span>{sale.date}</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-3">
                        <div className="flex justify-between items-start mb-2">
                          <div className="text-left font-bold text-lg text-primary">
                            {settings.shop.currency} {sale.grandTotal.toFixed(2)}
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-sm">
                              {sale.customer ? `${sale.customer.name_dv} (${sale.customer.name_en})` : renderBoth('walk_in_customer')}
                            </p>
                            <p className="text-xs text-gray-500">
                              {renderBoth('payment_method')}: {renderBoth(sale.paymentMethod)}
                            </p>
                          </div>
                        </div>

                        {sale.paymentMethod === 'cash' && (
                          <div className="bg-gray-50 dark:bg-gray-800/50 p-2 rounded text-xs mb-2 flex justify-between">
                            <span>{renderBoth('paid_amount')}: {settings.shop.currency} {sale.paidAmount?.toFixed(2) || '0.00'}</span>
                            <span>{renderBoth('balance')}: {settings.shop.currency} {sale.balance?.toFixed(2) || '0.00'}</span>
                          </div>
                        )}

                        <div className="border-t pt-2">
                          <div className="flex justify-between items-center">
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm" onClick={() => handlePrintReceipt(sale)} className="h-8 px-2 text-xs">
                                <Printer className="h-3 w-3 ml-1" /> {renderBoth('print')}
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleEditClick(sale)} className="h-8 w-8 p-0">
                                <PencilLine className="h-4 w-4 text-blue-500" />
                              </Button>
                              {isAdmin && (
                                <Button variant="ghost" size="sm" onClick={() => handleDeleteSale(sale.id)} className="h-8 w-8 p-0">
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              )}
                            </div>
                            <div className="text-xs font-semibold text-gray-600">
                              {sale.items.length} {renderBoth('items')}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      <SaleEditDialog
        isOpen={isEditSaleDialogOpen}
        onClose={() => setIsEditSaleDialogOpen(false)}
        sale={editingSale}
        onSave={handleSaveSale}
      />
    </div>
  );
};

export default DailySales;