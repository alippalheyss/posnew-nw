"use client";

import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Product, Customer } from '@/context/AppContext';
import { formatDate, formatMaldivesDate } from '@/utils/formatters';
import { showSuccess, showError } from '@/utils/toast';
import { sendNearExpiryClearanceBroadcast } from '@/services/telegramService';
import {
  AlertTriangle,
  Send,
  Sparkles,
  Flame,
  CheckCircle2,
  RefreshCw,
  ShoppingCart,
  TrendingDown,
  Clock,
  Package,
  Users,
  Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NearExpiryBroadcastDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: Product[];
  customers: Customer[];
  settings: any;
  updateProduct: (product: Product) => Promise<void>;
  onAddToCart?: (product: Product) => void;
}

export const NearExpiryBroadcastDialog: React.FC<NearExpiryBroadcastDialogProps> = ({
  open,
  onOpenChange,
  products,
  customers,
  settings,
  updateProduct,
  onAddToCart,
}) => {
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [editingPriceMap, setEditingPriceMap] = useState<Record<string, string>>({});
  const [isSavingPriceId, setIsSavingPriceId] = useState<string | null>(null);

  const currency = settings?.shop?.currency || 'MVR';

  // Find all near expiry products (expiry within 30 days)
  const nearExpiryProducts = useMemo(() => {
    const today = new Date();
    return products
      .filter((p) => {
        if (!p.expiry_date) return false;
        const exp = new Date(p.expiry_date);
        const diffTime = exp.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays >= 0 && diffDays <= 30;
      })
      .sort((a, b) => new Date(a.expiry_date!).getTime() - new Date(b.expiry_date!).getTime());
  }, [products]);

  // Sync selected items whenever dialog opens
  React.useEffect(() => {
    if (open) {
      setSelectedItemIds(nearExpiryProducts.map((p) => p.id));
      const initialPrices: Record<string, string> = {};
      nearExpiryProducts.forEach((p) => {
        initialPrices[p.id] = String(p.price);
      });
      setEditingPriceMap(initialPrices);
    }
  }, [open, nearExpiryProducts]);

  // Connected Telegram recipients count
  const connectedTelegramCustomers = useMemo(() => {
    return customers.filter((c) => Boolean(c.telegram_chat_id));
  }, [customers]);

  const toggleSelect = (id: string) => {
    setSelectedItemIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handlePricePreset = (productId: string, discountPct: number) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;
    const basePrice = prod.original_price || prod.price;
    const newPrice = Math.max(1, Number((basePrice * (1 - discountPct / 100)).toFixed(2)));
    setEditingPriceMap((prev) => ({ ...prev, [productId]: String(newPrice) }));
  };

  const handleSavePrice = async (product: Product) => {
    const typedPrice = parseFloat(editingPriceMap[product.id] || '');
    if (isNaN(typedPrice) || typedPrice <= 0) {
      showError('Please enter a valid price greater than 0');
      return;
    }

    setIsSavingPriceId(product.id);
    try {
      const priceBefore = product.original_price || product.price;
      const updatedProduct: Product = {
        ...product,
        original_price: priceBefore,
        price: typedPrice,
      };
      await updateProduct(updatedProduct);
      showSuccess(`✅ Price updated: ${currency} ${typedPrice.toFixed(2)} (Original: ${currency} ${priceBefore.toFixed(2)})`);
    } catch (err) {
      showError('Failed to update product price');
    } finally {
      setIsSavingPriceId(null);
    }
  };

  const handleBroadcast = async () => {
    const itemsToBroadcast = nearExpiryProducts.filter((p) => selectedItemIds.includes(p.id));
    if (itemsToBroadcast.length === 0) {
      showError('Please select at least one near-expiry product to broadcast');
      return;
    }

    if (connectedTelegramCustomers.length === 0 && !settings?.shop?.telegramGroupChatId) {
      showError('No connected Telegram customers or group found to receive broadcast');
      return;
    }

    setIsBroadcasting(true);
    try {
      const itemsPayload = itemsToBroadcast.map((p) => ({
        name_dv: p.name_dv,
        name_en: p.name_en,
        price: p.price,
        original_price: p.original_price,
        price_before: p.original_price,
        expiry_date: p.expiry_date,
        stock_shop: p.stock_shop,
      }));

      const result = await sendNearExpiryClearanceBroadcast({
        items: itemsPayload,
        customers,
        shopSettings: settings?.shop,
      });

      if (result.successCount > 0) {
        showSuccess(
          `🚀 Flash Clearance alert broadcasted to ${result.successCount} recipients on Telegram! (ޚާއްސަ ސޭލް މެސެޖު ޓެލެގްރާމުން ފޮނުވިއްޖެ)`
        );
        onOpenChange(false);
      } else {
        showError('Could not send broadcast. Please check bot token and connections.');
      }
    } catch (err: any) {
      showError(err.message || 'Error sending broadcast');
    } finally {
      setIsBroadcasting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[42rem] 2xl:max-w-[48rem] w-[calc(100vw-2rem)] max-h-[92vh] font-faruma bg-card text-foreground border border-border text-right p-5 sm:p-6 shadow-2xl rounded-3xl box-border overflow-hidden flex flex-col [&>button]:left-4 [&>button]:right-auto"
        dir="rtl"
      >
        <DialogHeader className="pb-3 text-right space-y-1.5 border-b border-border/60 shrink-0">
          <div className="flex items-center justify-between pl-8">
            <div className="text-right flex-1 min-w-0">
              <DialogTitle className="text-xl md:text-2xl font-black text-orange-600 dark:text-orange-400 flex items-center justify-end gap-2.5">
                <span>މުއްދަތު ހަމަވާ ތަކެތީގެ އަގު ތިރިކުރުމާއި ޓެލެގްރާމް އެލާޓް</span>
                <Flame className="h-6 w-6 text-orange-500 shrink-0 fill-orange-500/20" />
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-1 text-right">
                Drop near-expiry product prices & broadcast eye-catching clearance sale alerts to all Telegram customers
              </DialogDescription>
            </div>
          </div>

          {/* Connected Audience Banner */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-orange-500/10 border border-orange-500/25 rounded-2xl text-xs font-bold mt-2">
            <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
              <Users className="h-4 w-4" />
              <span>
                <strong>{connectedTelegramCustomers.length}</strong> ކަނެކްޓެޑް ކަސްޓަމަރުން + ސްޓޯރ ގްރޫޕް
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Badge variant="outline" className="bg-background/80 border-orange-500/30 text-[10px] font-mono">
                {selectedItemIds.length} of {nearExpiryProducts.length} items selected
              </Badge>
            </div>
          </div>
        </DialogHeader>

        {/* Product List */}
        <ScrollArea className="flex-1 pr-2 custom-scrollbar my-2 -mr-1">
          {nearExpiryProducts.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-muted-foreground bg-muted/20 rounded-2xl border border-dashed border-border/80 my-4">
              <CheckCircle2 className="h-10 w-10 text-emerald-500" />
              <p className="text-sm font-black text-foreground">މުއްދަތު ހަމަވާ އެއްވެސް މުދަލެއް ނެތް!</p>
              <p className="text-xs text-muted-foreground">All products in the shop have valid long-term expiry dates.</p>
            </div>
          ) : (
            <div className="space-y-3.5 py-1">
              {nearExpiryProducts.map((product) => {
                const isSelected = selectedItemIds.includes(product.id);
                const expiryDate = new Date(product.expiry_date!);
                const today = new Date();
                const diffDays = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                const priceBefore = product.original_price || product.price;
                const currentEnteredPrice = parseFloat(editingPriceMap[product.id] || String(product.price));
                const hasDiscount = priceBefore > product.price;
                const discountPct = hasDiscount ? Math.round(((priceBefore - product.price) / priceBefore) * 100) : 0;

                return (
                  <div
                    key={product.id}
                    className={cn(
                      "p-4 rounded-2xl border transition-all shadow-sm space-y-3",
                      isSelected
                        ? "bg-card border-orange-500/40 ring-1 ring-orange-500/30"
                        : "bg-muted/40 border-border opacity-70"
                    )}
                  >
                    {/* Item Row Top */}
                    <div className="flex items-start justify-between gap-3 text-right">
                      {/* Checkbox */}
                      <button
                        type="button"
                        onClick={() => toggleSelect(product.id)}
                        className={cn(
                          "h-6 w-6 rounded-lg border flex items-center justify-center transition-all shrink-0 mt-0.5",
                          isSelected
                            ? "bg-orange-500 border-orange-500 text-white"
                            : "border-border bg-background text-transparent hover:border-orange-500/50"
                        )}
                        title="Toggle inclusion in Telegram broadcast"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </button>

                      {/* Expiry Pill */}
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] font-black px-2.5 py-1 rounded-xl shrink-0 font-mono",
                          diffDays <= 7
                            ? "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30"
                            : "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30"
                        )}
                      >
                        <Clock className="h-3 w-3 mr-1 inline" />
                        {diffDays <= 0 ? 'Expiring Today' : `${diffDays} days left`} ({formatDate(product.expiry_date!)})
                      </Badge>

                      {/* Stock in shop */}
                      <Badge variant="secondary" className="text-[10px] font-mono px-2 py-0.5 rounded-lg shrink-0">
                        Stock: {product.stock_shop} pcs
                      </Badge>

                      {/* Product Title */}
                      <div className="flex-1 min-w-0 text-right">
                        <p className="font-black text-sm text-foreground truncate">{product.name_dv}</p>
                        <p className="text-[11px] font-bold text-muted-foreground font-mono truncate">{product.name_en}</p>
                      </div>
                    </div>

                    {/* Price Adjustment & Clearance Control */}
                    <div className="p-3 bg-muted/60 rounded-xl border border-border/70 flex flex-col sm:flex-row items-center justify-between gap-3 text-right">
                      {/* Before / After Pricing summary */}
                      <div className="flex items-center gap-3 text-xs">
                        <div className="text-right">
                          <span className="text-[10px] text-muted-foreground font-bold uppercase block">ކުރީގެ އަގު (Before)</span>
                          <span className={cn("font-mono font-bold text-muted-foreground", hasDiscount && "line-through opacity-80")}>
                            {currency} {priceBefore.toFixed(2)}
                          </span>
                        </div>

                        <span className="text-muted-foreground/50">➔</span>

                        <div className="text-right">
                          <span className="text-[10px] text-orange-600 dark:text-orange-400 font-black uppercase block">
                            މިހާރުގެ އަގު (Clearance)
                          </span>
                          <span className="font-mono text-base font-black text-orange-600 dark:text-orange-400">
                            {currency} {product.price.toFixed(2)}
                          </span>
                          {discountPct > 0 && (
                            <span className="text-[10px] font-black text-emerald-500 mr-1.5">
                              ({discountPct}% OFF)
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Quick Drop Preset Buttons & Save */}
                      <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap justify-end w-full sm:w-auto">
                        {[10, 20, 30, 50].map((pct) => (
                          <button
                            key={pct}
                            type="button"
                            onClick={() => handlePricePreset(product.id, pct)}
                            className="px-2 py-1 rounded-lg text-[10px] font-mono font-bold bg-background border border-border hover:bg-orange-500/15 hover:text-orange-600 hover:border-orange-500/30 transition-all"
                            title={`Drop by ${pct}%`}
                          >
                            -{pct}%
                          </button>
                        ))}

                        <div className="relative w-20">
                          <Input
                            type="number"
                            step="any"
                            value={editingPriceMap[product.id] || ''}
                            onChange={(e) =>
                              setEditingPriceMap((prev) => ({ ...prev, [product.id]: e.target.value }))
                            }
                            className="h-8 px-2 text-xs font-mono font-black text-foreground bg-background border-border rounded-lg text-left"
                            placeholder="Price"
                          />
                        </div>

                        <Button
                          type="button"
                          size="sm"
                          disabled={isSavingPriceId === product.id}
                          onClick={() => handleSavePrice(product)}
                          className="h-8 px-2.5 bg-orange-600 hover:bg-orange-700 text-white text-[11px] font-black rounded-lg shrink-0 gap-1 shadow-xs"
                          title="Save new clearance drop price"
                        >
                          {isSavingPriceId === product.id ? (
                            <RefreshCw className="h-3 w-3 animate-spin" />
                          ) : (
                            <TrendingDown className="h-3 w-3" />
                          )}
                          <span>ސޭވް (Save)</span>
                        </Button>

                        {onAddToCart && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => onAddToCart(product)}
                            className="h-8 px-2 text-[10px] font-bold border-border rounded-lg shrink-0"
                            title="Add to active POS cart"
                          >
                            <ShoppingCart className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Action Footer */}
        <DialogFooter className="pt-3 border-t border-border flex flex-row items-center justify-between gap-3 shrink-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isBroadcasting}
            className="flex-1 h-11 border-border hover:bg-muted text-foreground rounded-xl font-bold text-xs"
          >
            ލައްޕާލާ (Close)
          </Button>

          <Button
            onClick={handleBroadcast}
            disabled={isBroadcasting || nearExpiryProducts.length === 0 || selectedItemIds.length === 0}
            className="flex-[2] h-11 bg-gradient-to-r from-orange-600 via-amber-600 to-orange-500 hover:opacity-90 text-white font-black rounded-xl shadow-lg shadow-orange-600/25 text-xs uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isBroadcasting ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>ބްރޯޑްކާސްޓް ކުރަނީ...</span>
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                <span>🚀 ޓެލެގްރާމް އެލާޓް ފޮނުވާ (Broadcast to All)</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
