"use client";

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Printer, FileText, X, Clock, User, Phone, DollarSign, Calendar, PackageCheck, ShoppingBag } from 'lucide-react';
import { Sale, useAppContext } from '@/context/AppContext';
import { formatDate, formatTime, formatDateTime } from '@/utils/formatters';
import { cn } from '@/lib/utils';

interface InvoiceViewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale | null;
  onPrintThermal?: (sale: Sale) => void;
  onPrintA4?: (sale: Sale) => void;
}

export const InvoiceViewDialog: React.FC<InvoiceViewDialogProps> = ({
  isOpen,
  onClose,
  sale,
  onPrintThermal,
  onPrintA4,
}) => {
  const { t } = useTranslation();
  const { settings, customers } = useAppContext();

  if (!sale) return null;

  const currency = settings.shop?.currency || 'MVR';
  const customer = sale.customer || (sale.customer_id ? customers.find(c => c.id === sale.customer_id) : null);
  const paymentMethod = String(sale.paymentMethod || (sale as any).payment_method || 'cash').toLowerCase();
  const isCredit = paymentMethod === 'credit';
  const isCash = paymentMethod === 'cash';
  const isSplit = paymentMethod === 'split';

  const paid = Number(sale.paidAmount !== undefined && sale.paidAmount !== null ? sale.paidAmount : (isCredit ? 0 : sale.grandTotal));
  const grandTotal = Number(sale.grandTotal || 0);
  const balanceDue = isCredit 
    ? (sale.balance !== undefined && Number(sale.balance) > 0 ? Number(sale.balance) : grandTotal)
    : Math.max(0, grandTotal - paid);
  const change = isCash ? Math.max(0, paid - grandTotal) : 0;

  const gstRate = Number(settings.shop?.taxRate || 0);
  const subtotal = gstRate > 0 ? grandTotal / (1 + gstRate / 100) : grandTotal;
  const gstAmount = grandTotal - subtotal;

  const invoiceNumber = sale.invoiceNumber || (sale as any).invoice_number || `INV-${String(sale.id).slice(-6)}`;
  const dateStr = sale.date || (sale as any).created_at;

  const splitDetails = sale.splitDetails || (sale as any).split_details;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent 
        className="max-w-2xl w-[calc(100vw-2rem)] font-faruma apple-glass-dialog text-foreground border-white/20 dark:border-white/10 p-0 shadow-2xl rounded-3xl overflow-hidden flex flex-col max-h-[92vh]" 
        dir="rtl"
      >
        {/* Header */}
        <div className="p-6 pb-4 bg-muted/40 border-b border-border/50">
          <div className="flex items-center justify-between mb-3 pl-8">
            <div className="flex items-center gap-2">
              <Badge 
                className={cn(
                  "font-mono font-black text-xs px-2.5 py-1 uppercase tracking-wider rounded-xl",
                  isCredit 
                    ? "bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40" 
                    : isCash 
                    ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40" 
                    : "bg-sky-500/20 text-sky-700 dark:text-sky-300 border border-sky-500/40"
                )}
              >
                {isCredit ? 'CREDIT SALE' : isCash ? 'CASH SALE' : paymentMethod.toUpperCase()}
              </Badge>
              <span className="text-xs font-bold text-muted-foreground font-mono">
                {formatDate(dateStr)} • {formatTime(dateStr)}
              </span>
            </div>

            <div className="text-right">
              <DialogTitle className="text-xl font-black text-foreground flex items-center justify-end gap-2 font-mono">
                <span>{invoiceNumber}</span>
                <ShoppingBag className="h-5 w-5 text-primary" />
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                {settings.shop?.shopName || 'B BACK'}
              </DialogDescription>
            </div>
          </div>

          {/* Customer bar if linked */}
          {customer && (
            <div className="mt-3 p-3 rounded-2xl bg-background/80 border border-border/60 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs">
                {customer.phone && (
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5" />
                    <span className="font-mono">{customer.phone}</span>
                  </span>
                )}
                {customer.outstanding_balance !== undefined && (
                  <Badge variant="outline" className="text-[11px] font-bold border-amber-500/40 text-amber-600 dark:text-amber-400">
                    Total Tab: {currency} {Number(customer.outstanding_balance).toFixed(2)}
                  </Badge>
                )}
              </div>

              <div className="text-right flex items-center gap-2">
                <div>
                  <span className="text-xs font-black text-foreground">{customer.name_dv || customer.name_en}</span>
                  {customer.name_en && customer.name_dv && (
                    <span className="text-xs text-muted-foreground mr-1">({customer.name_en})</span>
                  )}
                </div>
                {customer.code && (
                  <Badge className="bg-primary/20 text-primary border-none text-[10px] font-mono font-black">
                    #{customer.code}
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Items List */}
        <ScrollArea className="flex-1 p-6 custom-scrollbar overflow-y-auto">
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs font-black text-muted-foreground uppercase tracking-wider px-2">
              <span className="w-24 text-left">Total</span>
              <span className="w-20 text-center">Price</span>
              <span className="w-16 text-center">Qty</span>
              <span className="flex-1 text-right">Item Details</span>
            </div>

            <div className="space-y-2">
              {(sale.items || []).map((item: any, idx: number) => {
                const itemTotal = Number(item.qty || 0) * Number(item.price || 0);
                const unitTag = item.selected_unit && item.selected_unit !== 'Piece' ? item.selected_unit : null;
                const flavourTag = item.selected_flavour || null;

                return (
                  <div 
                    key={idx} 
                    className="p-3 rounded-2xl bg-muted/30 border border-border/50 flex items-center justify-between gap-3 hover:bg-muted/50 transition-colors"
                  >
                    {/* Line Total */}
                    <div className="w-24 text-left font-black font-mono text-sm text-foreground">
                      {currency} {itemTotal.toFixed(2)}
                    </div>

                    {/* Unit Price */}
                    <div className="w-20 text-center font-mono text-xs text-muted-foreground">
                      {Number(item.price || 0).toFixed(2)}
                    </div>

                    {/* Quantity */}
                    <div className="w-16 text-center">
                      <span className="inline-block px-2.5 py-0.5 rounded-lg bg-background border border-border font-mono font-black text-xs text-primary">
                        x{item.qty}
                      </span>
                    </div>

                    {/* Item Name & Details */}
                    <div className="flex-1 text-right">
                      <p className="font-bold text-sm text-foreground leading-snug">
                        {item.name_dv || item.name_en}
                      </p>
                      <div className="flex items-center justify-end gap-1.5 flex-wrap mt-0.5">
                        {item.name_en && item.name_dv && (
                          <span className="text-[11px] text-muted-foreground">{item.name_en}</span>
                        )}
                        {flavourTag && (
                          <Badge className="bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30 text-[10px] px-1.5 py-0 font-bold">
                            {flavourTag}
                          </Badge>
                        )}
                        {unitTag && (
                          <Badge className="bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 text-[10px] px-1.5 py-0 font-bold">
                            {unitTag}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Split payment breakdown if applicable */}
            {isSplit && splitDetails && (
              <div className="mt-4 p-4 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-xs">
                <p className="font-black text-sky-600 dark:text-sky-400 mb-2 uppercase tracking-wider text-[11px]">
                  Split Payment Breakdown
                </p>
                <div className="grid grid-cols-3 gap-2 text-center font-mono font-bold">
                  {Number(splitDetails.cash || 0) > 0 && (
                    <div className="p-2 rounded-xl bg-background border border-border">
                      <p className="text-[10px] text-muted-foreground uppercase">Cash</p>
                      <p className="text-emerald-500 font-black">{currency} {Number(splitDetails.cash).toFixed(2)}</p>
                    </div>
                  )}
                  {Number(splitDetails.card || 0) > 0 && (
                    <div className="p-2 rounded-xl bg-background border border-border">
                      <p className="text-[10px] text-muted-foreground uppercase">Card / Transfer</p>
                      <p className="text-blue-500 font-black">{currency} {Number(splitDetails.card).toFixed(2)}</p>
                    </div>
                  )}
                  {Number(splitDetails.credit || 0) > 0 && (
                    <div className="p-2 rounded-xl bg-background border border-border">
                      <p className="text-[10px] text-muted-foreground uppercase">Credit Tab</p>
                      <p className="text-amber-500 font-black">{currency} {Number(splitDetails.credit).toFixed(2)}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Financial Summary */}
            <div className="mt-4 p-4 rounded-2xl bg-muted/40 border border-border space-y-2 text-xs">
              <div className="flex justify-between items-center text-muted-foreground">
                <span className="font-mono font-bold">{currency} {subtotal.toFixed(2)}</span>
                <span>Subtotal (ކުލަ ޖުމްލަ):</span>
              </div>

              {gstRate > 0 && (
                <div className="flex justify-between items-center text-muted-foreground">
                  <span className="font-mono font-bold">{currency} {gstAmount.toFixed(2)}</span>
                  <span>GST ({gstRate}%):</span>
                </div>
              )}

              <Separator className="my-2" />

              <div className="flex justify-between items-center text-base font-black text-foreground">
                <span className="font-mono text-primary text-xl">{currency} {grandTotal.toFixed(2)}</span>
                <span>Grand Total (ޖުމްލަ އަގު):</span>
              </div>

              <div className="flex justify-between items-center text-xs text-muted-foreground pt-1">
                <span className="font-mono font-bold">{currency} {paid.toFixed(2)}</span>
                <span>Paid Amount (ދެއްކި އަދަދު):</span>
              </div>

              {isCredit && (
                <div className="flex justify-between items-center text-xs font-black text-amber-600 dark:text-amber-400 pt-1">
                  <span className="font-mono text-sm">{currency} {balanceDue.toFixed(2)}</span>
                  <span>Balance Due (ދަރަނި އަދަދު):</span>
                </div>
              )}

              {change > 0 && (
                <div className="flex justify-between items-center text-xs font-black text-emerald-600 dark:text-emerald-400 pt-1">
                  <span className="font-mono text-sm">{currency} {change.toFixed(2)}</span>
                  <span>Change Given (ބާކީ):</span>
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        {/* Footer with Printing Actions */}
        <div className="p-4 bg-muted/50 border-t border-border flex items-center justify-between gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            className="rounded-xl px-5 h-11 font-bold text-xs"
          >
            Close (ބަންދުކުރައްވާ)
          </Button>

          <div className="flex items-center gap-2">
            {onPrintA4 && (
              <Button
                variant="outline"
                onClick={() => onPrintA4(sale)}
                className="rounded-xl h-11 px-4 gap-2 font-bold text-xs hover:bg-slate-700 hover:text-white"
              >
                <FileText className="h-4 w-4" />
                <span>A4 Invoice</span>
              </Button>
            )}

            {onPrintThermal && (
              <Button
                onClick={() => onPrintThermal(sale)}
                className="rounded-xl h-11 px-5 gap-2 font-black text-xs bg-primary hover:bg-primary/90 text-primary-foreground shadow-md"
              >
                <Printer className="h-4 w-4" />
                <span>Print Receipt</span>
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InvoiceViewDialog;
