import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  ShoppingBag,
  Truck,
  Store,
  CreditCard,
  Banknote,
  ExternalLink,
  ShoppingCart,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Customer, ShopSettings } from '@/context/AppContext';
import {
  OnlineOrder,
  OnlineOrderStatus,
  updateOnlineOrderStatus,
} from '@/services/onlineShopService';
import { showError, showSuccess } from '@/utils/toast';

interface OnlineOrdersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orders: OnlineOrder[];
  customers: Customer[];
  shopSettings: Partial<ShopSettings>;
  botToken?: string;
  onRefresh: () => Promise<void>;
  onLoadToPOSCart: (order: OnlineOrder) => void;
}

const STATUS_STYLE: Record<OnlineOrderStatus, string> = {
  NEW: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
  ACCEPTED: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30',
  PREPARING: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
  READY: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
  COMPLETED: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
  CANCELLED: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30',
};

export const OnlineOrdersDialog: React.FC<OnlineOrdersDialogProps> = ({
  open,
  onOpenChange,
  orders,
  customers,
  shopSettings,
  botToken,
  onRefresh,
  onLoadToPOSCart,
}) => {
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [slipPreviewUrl, setSlipPreviewUrl] = useState<string | null>(null);
  const [filterTab, setFilterTab] = useState<'ACTIVE' | 'ALL'>('ACTIVE');

  const currency = shopSettings.currency || 'MVR';

  const visibleOrders = orders.filter((o) =>
    filterTab === 'ACTIVE' ? !['COMPLETED', 'CANCELLED'].includes(o.status) : true
  );

  const handleStatusChange = async (order: OnlineOrder, status: OnlineOrderStatus) => {
    setUpdatingId(order.id);
    try {
      const cust = customers.find((c) => c.id === order.customer_id);
      const res = await updateOnlineOrderStatus({
        order,
        status,
        customerChatId: cust?.telegram_chat_id || null,
        shopSettings,
        botToken,
      });

      if (res.ok) {
        showSuccess(`Order ${order.order_number} marked as ${status}`);
        await onRefresh();
      } else {
        showError(res.error || 'Failed to update order status.');
      }
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-3xl w-[calc(100vw-1.5rem)] max-h-[88vh] flex flex-col bg-card border-border rounded-xl p-5 font-faruma" dir="ltr">
          <DialogHeader>
            <div className="flex items-center justify-between gap-2 pr-6">
              <div>
                <DialogTitle className="text-lg font-black flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5 text-primary" />
                  <span>Online Orders (shop.bback.store)</span>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Review incoming customer orders, verify payment slips, and load directly into POS cart.
                </DialogDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onRefresh()}
                className="h-8 px-2.5 rounded-lg text-xs font-bold gap-1"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Refresh</span>
              </Button>
            </div>
          </DialogHeader>

          <div className="flex items-center gap-1.5 bg-muted p-1 rounded-lg border border-border w-fit">
            <button
              type="button"
              onClick={() => setFilterTab('ACTIVE')}
              className={cn(
                'h-7 px-3 rounded-md text-xs font-black transition-colors',
                filterTab === 'ACTIVE' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Active ({orders.filter((o) => !['COMPLETED', 'CANCELLED'].includes(o.status)).length})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab('ALL')}
              className={cn(
                'h-7 px-3 rounded-md text-xs font-black transition-colors',
                filterTab === 'ALL' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              All ({orders.length})
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {visibleOrders.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                No {filterTab === 'ACTIVE' ? 'active ' : ''}online orders right now.
              </div>
            ) : (
              visibleOrders.map((order) => (
                <div
                  key={order.id}
                  className={cn(
                    'p-4 rounded-xl bg-background border space-y-3',
                    order.status === 'NEW' ? 'border-blue-500/50' : 'border-border'
                  )}
                >
                  {/* Header */}
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-black text-sm">{order.order_number}</span>
                        <span className={cn('text-[10px] font-black px-2 py-0.5 rounded-md border', STATUS_STYLE[order.status])}>
                          {order.status}
                        </span>
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-muted border border-border flex items-center gap-1">
                          {order.fulfillment_type === 'DELIVERY' ? (
                            <>
                              <Truck className="h-3 w-3 text-primary" /> DELIVERY
                            </>
                          ) : (
                            <>
                              <Store className="h-3 w-3 text-emerald-500" /> PICKUP
                            </>
                          )}
                        </span>
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-muted border border-border flex items-center gap-1">
                          {order.payment_method === 'CREDIT' ? (
                            <>
                              <CreditCard className="h-3 w-3 text-amber-500" /> CREDIT
                            </>
                          ) : (
                            <>
                              <Banknote className="h-3 w-3 text-emerald-500" /> CASH / SLIP
                            </>
                          )}
                        </span>
                      </div>
                      <p className="text-xs font-bold mt-1">
                        {order.customer_name} <span className="font-mono text-muted-foreground">(#{order.customer_code})</span> •{' '}
                        <span className="font-mono">{order.customer_phone}</span>
                      </p>
                      {order.fulfillment_type === 'DELIVERY' && order.delivery_address && (
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Address: <span className="text-foreground font-semibold">{order.delivery_address}</span>
                        </p>
                      )}
                      {order.delivery_notes && (
                        <p className="text-[11px] text-muted-foreground">Note: {order.delivery_notes}</p>
                      )}
                    </div>

                    <div className="text-right">
                      <p className="font-mono font-black text-base tabular-nums text-primary">
                        {currency} {Number(order.total).toFixed(2)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(order.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Items */}
                  <div className="p-2.5 rounded-lg bg-muted/50 border border-border/60 space-y-1 text-xs">
                    {(order.items || []).map((it, idx) => (
                      <div key={idx} className="flex justify-between gap-2">
                        <span className="font-semibold truncate">
                          {it.name_en} <span className="text-muted-foreground font-mono">x{it.quantity}</span>
                        </span>
                        <span className="font-mono tabular-nums shrink-0">
                          {currency} {Number(it.line_total).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {order.payment_slip_url && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setSlipPreviewUrl(order.payment_slip_url)}
                          className="h-8 px-2.5 rounded-lg text-xs font-bold gap-1 text-emerald-600 border-emerald-500/40"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          <span>View Slip</span>
                        </Button>
                      )}

                      {!['COMPLETED', 'CANCELLED'].includes(order.status) && (
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => {
                            onLoadToPOSCart(order);
                            onOpenChange(false);
                          }}
                          className="h-8 px-3 rounded-lg text-xs font-black gap-1.5"
                        >
                          <ShoppingCart className="h-3.5 w-3.5" />
                          <span>Load to POS Cart</span>
                        </Button>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      {order.status === 'NEW' && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={updatingId === order.id}
                          onClick={() => handleStatusChange(order, 'ACCEPTED')}
                          className="h-8 px-2.5 rounded-lg text-xs font-bold"
                        >
                          Accept
                        </Button>
                      )}
                      {['NEW', 'ACCEPTED'].includes(order.status) && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={updatingId === order.id}
                          onClick={() => handleStatusChange(order, 'PREPARING')}
                          className="h-8 px-2.5 rounded-lg text-xs font-bold"
                        >
                          <Clock className="h-3 w-3 mr-1" />
                          Preparing
                        </Button>
                      )}
                      {['NEW', 'ACCEPTED', 'PREPARING'].includes(order.status) && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={updatingId === order.id}
                          onClick={() => handleStatusChange(order, 'READY')}
                          className="h-8 px-2.5 rounded-lg text-xs font-bold text-emerald-600 border-emerald-500/40"
                        >
                          Ready
                        </Button>
                      )}
                      {!['COMPLETED', 'CANCELLED'].includes(order.status) && (
                        <>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={updatingId === order.id}
                            onClick={() => handleStatusChange(order, 'COMPLETED')}
                            className="h-8 px-2.5 rounded-lg text-xs font-bold text-emerald-600"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                            Done
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={updatingId === order.id}
                            onClick={() => handleStatusChange(order, 'CANCELLED')}
                            className="h-8 px-2 rounded-lg text-xs font-bold text-rose-500"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Slip Image Viewer */}
      <Dialog open={!!slipPreviewUrl} onOpenChange={() => setSlipPreviewUrl(null)}>
        <DialogContent className="sm:max-w-md bg-card border-border rounded-xl p-4">
          <DialogHeader>
            <DialogTitle className="text-sm font-black">Customer Payment Slip</DialogTitle>
          </DialogHeader>
          {slipPreviewUrl && (
            <div className="space-y-3">
              <img
                src={slipPreviewUrl}
                alt="Payment Slip"
                className="w-full max-h-[65vh] object-contain rounded-lg border border-border bg-background"
              />
              <a
                href={slipPreviewUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5" /> Open original file
              </a>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

