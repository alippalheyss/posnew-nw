import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Printer, FileText, Trash2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useAppContext, Sale } from '@/context/AppContext';
import SaleEditDialog from '@/components/SaleEditDialog';
import { PencilLine } from 'lucide-react';
import { showSuccess } from '@/utils/toast';

const CreditInvoices = () => {
  const { t } = useTranslation();
  const { sales, setSales, settings, deleteSale } = useAppContext();
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'admin';
  const [isEditSaleDialogOpen, setIsEditSaleDialogOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);

  const handleEditClick = (sale: Sale) => {
    setEditingSale({ ...sale });
    setIsEditSaleDialogOpen(true);
  };

  const handleSaveSale = (updatedSale: Sale) => {
    setSales(prevSales =>
      prevSales.map(s => (s.id === updatedSale.id ? updatedSale : s))
    );
    // showSuccess is handled in the dialog
    setIsEditSaleDialogOpen(false);
    setEditingSale(null);
  };

  const handleDeleteSale = async (id: string) => {
    if (window.confirm(t('confirm_delete_sale'))) {
      await deleteSale(id);
    }
  };

  const handlePrintInvoice = (sale: Sale) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

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

    printWindow.document.write(`
      <html>
        <head>
          <title>Credit Invoice ${sale.id}</title>
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
        <body onload="window.print();window.close()">
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
              Invoice #: ${sale.id}
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
            <div class="total-row"><span>Subtotal:</span><span>${currency} ${subtotal.toFixed(2)}</span></div>
            <div class="total-row"><span>GST (${gstRate}%):</span><span>${currency} ${gstAmount.toFixed(2)}</span></div>
            <div class="total-row grand-total"><span>TOTAL:</span><span>${currency} ${sale.grandTotal.toFixed(2)}</span></div>
          </div>
          <div class="footer">
            ${settings.reports.invoiceFooter}
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const renderBoth = (key: string, options?: any) => (
    <>
      {t(key, options)} ({t(key, { ...options, lng: 'en' })})
    </>
  );

  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'yesterday' | 'last30'>('all');

  const filterInvoicesByDate = (invoiceList: Sale[]) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return invoiceList.filter(invoice => {
      const invoiceDate = new Date(invoice.date);
      invoiceDate.setHours(0, 0, 0, 0);

      if (dateFilter === 'today') return invoiceDate.getTime() === today.getTime();
      if (dateFilter === 'yesterday') {
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        return invoiceDate.getTime() === yesterday.getTime();
      }
      if (dateFilter === 'last30') {
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(today.getDate() - 30);
        return invoiceDate.getTime() >= thirtyDaysAgo.getTime();
      }
      return true;
    });
  };

  const creditSales = filterInvoicesByDate(sales.filter(s => s.paymentMethod === 'credit'))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.id.localeCompare(a.id));

  return (
    <div className="p-4 font-faruma flex flex-col h-full bg-gray-50 dark:bg-gray-900/20">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-right flex-1">{renderBoth('credit_invoices')}</h1>
      </div>

      <Card className="flex-1 shadow-md border-none overflow-hidden">
        <CardHeader className="bg-white dark:bg-gray-800 border-b p-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <CardTitle className="text-right text-base text-gray-500 font-normal">
              {renderBoth('credit_invoices_description')}
            </CardTitle>
            <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg shrink-0">
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
        </CardHeader>
        <CardContent className="p-0 h-full">
          <ScrollArea className="h-[calc(100vh-230px)] p-4">
            {creditSales.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                <FileText className="h-16 w-16 mb-4 opacity-20" />
                <p className="text-lg">{t('no_credit_invoices_for_selected_range')}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {creditSales.map((sale) => (
                  <Card key={sale.id} className="text-right border-l-4 border-l-amber-500 shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="p-3 pb-2 border-b bg-amber-500/5">
                      <div className="flex justify-between items-center text-xs text-amber-700 dark:text-amber-400 font-bold">
                        <span>{sale.id}</span>
                        <span>{sale.date}</span>
                      </div>
                    </CardHeader>
                    <CardContent className="p-3">
                      <div className="mb-3">
                        <p className="font-bold text-sm text-gray-900 dark:text-white">
                          {sale.customer?.name_dv}
                        </p>
                        <p className="text-xs text-gray-500">
                          {sale.customer?.name_en} ({sale.customer?.code})
                        </p>
                      </div>

                      <div className="flex justify-between items-end">
                        <div className="text-left">
                          <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Amount Due</p>
                          <p className="text-lg font-black text-amber-600">
                            {settings.shop.currency} {sale.grandTotal.toFixed(2)}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">
                            UNPAID
                          </span>
                          <span className="text-[10px] text-gray-400">
                            {sale.items.length} items
                          </span>
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleEditClick(sale)} className="h-8 w-8 p-0">
                          <PencilLine className="h-4 w-4 text-blue-500" />
                        </Button>
                        {isAdmin && (
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteSale(sale.id)} className="h-8 w-8 p-0">
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        )}
                        <Button variant="outline" size="sm" onClick={() => handlePrintInvoice(sale)} className="h-8 text-xs gap-2">
                          <Printer className="h-3.5 w-3.5" /> {renderBoth('print_receipt')}
                        </Button>
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

export default CreditInvoices;