"use client";

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, PackagePlus, Boxes, ArrowRightLeft, Store, Warehouse, Pencil, AlertTriangle, TrendingDown, TrendingUp, Info, QrCode, Smartphone, X } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import StockUpdateDialog from '@/components/StockUpdateDialog';
import StockTransferDialog from '@/components/StockTransferDialog';
import ProductDialog from '@/components/ProductDialog';
import QuickStockDialog from '@/components/QuickStockDialog';
import { useAppContext, Product } from '@/context/AppContext';
import { usePersistedState } from '@/hooks/usePersistedState';
import { Badge } from '@/components/ui/badge';
import { showSuccess } from '@/utils/toast';
import { cn } from '@/lib/utils';

const Stock = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    products,
    settings,
    updateStock,
    updateProduct,
    transferStock
  } = useAppContext();
  const [searchTerm, setSearchTerm] = usePersistedState<string>('stock_search_term', '');
  const [stockFilter, setStockFilter] = usePersistedState<'all' | 'low' | 'high' | 'warning'>('stock_filter_level', 'all');
  const [isStockUpdateDialogOpen, setIsStockUpdateDialogOpen] = useState(false);
  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false);
  const [isProductDialog, setIsProductDialog] = useState(false);
  const [isQuickStockOpen, setIsQuickStockOpen] = useState(false);
  const [updatingStockItem, setUpdatingStockItem] = useState<Product | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [transferDirection, setTransferDirection] = useState<'to_godown' | 'to_shop'>('to_godown');
  const [visibleCount, setVisibleCount] = useState(20);

  const LOW_STOCK_THRESHOLD = 10;
  const WARNING_STOCK_THRESHOLD = 50;

  const filteredStockItems = products.filter(item => {
    const matchesSearch = !searchTerm || 
      item.name_dv.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.name_en.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.barcode.includes(searchTerm) ||
      item.item_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.extra_barcodes?.some(b => b.toLowerCase().includes(searchTerm.toLowerCase())) ||
      item.flavours?.some(f => f.barcode && f.barcode.includes(searchTerm));

    if (!matchesSearch) return false;

    if (stockFilter === 'low') return item.stock_shop < LOW_STOCK_THRESHOLD;
    if (stockFilter === 'warning') return item.stock_shop >= LOW_STOCK_THRESHOLD && item.stock_shop < WARNING_STOCK_THRESHOLD;
    if (stockFilter === 'high') return item.stock_shop >= WARNING_STOCK_THRESHOLD;

    return true;
  });

  const displayStockItems = filteredStockItems.slice(0, visibleCount);

  const handleUpdateStockClick = (item: Product) => {
    setUpdatingStockItem(item);
    setIsStockUpdateDialogOpen(true);
  };

  const handleTransferClick = (item: Product, defaultDirection: 'to_godown' | 'to_shop' = 'to_godown') => {
    setUpdatingStockItem(item);
    setTransferDirection(defaultDirection);
    setIsTransferDialogOpen(true);
  };

  const handleSaveStockUpdate = (updatedStockItem: Product) => {
    updateProduct(updatedStockItem);
    setIsStockUpdateDialogOpen(false);
    setUpdatingStockItem(null);
  };

  const handleEditProductClick = (product: Product) => {
    setEditingProduct(product);
    setIsProductDialog(true);
  };

  const handleSaveProduct = async (updatedProduct: Product) => {
    try {
      await updateProduct(updatedProduct);
      showSuccess(t('product_updated_successfully') || 'Product details updated successfully.');
      setIsProductDialog(false);
      setEditingProduct(null);
    } catch (err: any) {
      console.error('Error updating product:', err);
    }
  };

  const handleTransfer = (id: string, from: 'shop' | 'godown', to: 'shop' | 'godown', amount: number) => {
    transferStock(id, from, to, amount);
  };

  const renderBoth = (key: string, options?: any) => (
    <>
      {t(key, options)} ({t(key, { ...options, lng: 'en' })})
    </>
  );

  const lowStockCount = products.filter(p => p.stock_shop < LOW_STOCK_THRESHOLD).length;
  const warningStockCount = products.filter(p => p.stock_shop >= LOW_STOCK_THRESHOLD && p.stock_shop < WARNING_STOCK_THRESHOLD).length;
  const healthyStockCount = products.filter(p => p.stock_shop >= WARNING_STOCK_THRESHOLD).length;
  const totalShopUnits = products.reduce((sum, p) => sum + (Number(p.stock_shop) || 0), 0);
  const totalGodownUnits = products.reduce((sum, p) => sum + (Number(p.stock_godown) || 0), 0);

  return (
    <div className="p-4 sm:p-5 font-faruma flex flex-col h-full bg-background text-foreground overflow-hidden" dir="ltr">
      {/* Sleek Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center text-primary shrink-0 shadow-xs">
            <Boxes className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                {t('stock_inventory', { lng: 'en' }) || 'Stock & Inventory'}
              </h1>
              <span className="text-xs font-bold text-muted-foreground">
                ({t('stock_inventory')})
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Monitor real-time shop & godown stock levels, transfer inventory, and run quick stock updates
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button 
            size="sm"
            onClick={() => navigate('/stock-audit')}
            className="gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white h-9 px-3.5 rounded-xl font-black text-xs shadow-md shadow-emerald-600/20"
          >
            <Smartphone className="h-3.5 w-3.5" />
            <span>Stock Audit (Mobile)</span>
          </Button>
          <Button
            size="sm"
            onClick={() => setIsQuickStockOpen(true)}
            className="gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground h-9 px-4 rounded-xl font-black text-xs shadow-md shadow-primary/20"
          >
            <PackagePlus className="h-3.5 w-3.5" />
            <span>Quick Stock</span>
          </Button>
        </div>
      </div>

      {/* Interactive KPI Filter Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 mb-4 shrink-0">
        <button
          type="button"
          onClick={() => setStockFilter('all')}
          className={cn(
            "p-3 rounded-2xl border text-left transition-all flex items-center justify-between gap-2",
            stockFilter === 'all'
              ? "bg-primary/10 border-primary/40 shadow-xs"
              : "bg-card/80 border-border hover:border-primary/30"
          )}
        >
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">
              All Inventory SKUs
            </span>
            <span className="text-lg font-black font-mono text-foreground">
              {products.length}
            </span>
            <span className="text-[10px] text-muted-foreground block font-mono">
              Shop: {totalShopUnits} • Godown: {totalGodownUnits}
            </span>
          </div>
          <div className="h-9 w-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
            <Boxes className="h-4 w-4" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => setStockFilter('low')}
          className={cn(
            "p-3 rounded-2xl border text-left transition-all flex items-center justify-between gap-2",
            stockFilter === 'low'
              ? "bg-rose-500/15 border-rose-500/50 shadow-xs"
              : "bg-card/80 border-border hover:border-rose-500/30"
          )}
        >
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400 block">
              Critical / Low (&lt;{LOW_STOCK_THRESHOLD})
            </span>
            <span className="text-lg font-black font-mono text-rose-600 dark:text-rose-400">
              {lowStockCount}
            </span>
            <span className="text-[10px] text-muted-foreground block">
              Needs restock soon
            </span>
          </div>
          <div className="h-9 w-9 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
            <TrendingDown className="h-4 w-4" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => setStockFilter('warning')}
          className={cn(
            "p-3 rounded-2xl border text-left transition-all flex items-center justify-between gap-2",
            stockFilter === 'warning'
              ? "bg-amber-500/15 border-amber-500/50 shadow-xs"
              : "bg-card/80 border-border hover:border-amber-500/30"
          )}
        >
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 block">
              Moderate ({LOW_STOCK_THRESHOLD}–{WARNING_STOCK_THRESHOLD - 1})
            </span>
            <span className="text-lg font-black font-mono text-amber-600 dark:text-amber-400">
              {warningStockCount}
            </span>
            <span className="text-[10px] text-muted-foreground block">
              Watch stock level
            </span>
          </div>
          <div className="h-9 w-9 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <AlertTriangle className="h-4 w-4" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => setStockFilter('high')}
          className={cn(
            "p-3 rounded-2xl border text-left transition-all flex items-center justify-between gap-2",
            stockFilter === 'high'
              ? "bg-emerald-500/15 border-emerald-500/50 shadow-xs"
              : "bg-card/80 border-border hover:border-emerald-500/30"
          )}
        >
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
              Healthy Stock ({WARNING_STOCK_THRESHOLD}+)
            </span>
            <span className="text-lg font-black font-mono text-emerald-600 dark:text-emerald-400">
              {healthyStockCount}
            </span>
            <span className="text-[10px] text-muted-foreground block">
              Well stocked items
            </span>
          </div>
          <div className="h-9 w-9 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <TrendingUp className="h-4 w-4" />
          </div>
        </button>
      </div>

      {/* Unified Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 mb-4 p-2 rounded-2xl bg-card/80 border border-border shadow-2xs shrink-0">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input 
            dir="ltr"
            placeholder="Search stock by English/Dhivehi name, item code, or barcode..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setVisibleCount(30);
            }}
            className="w-full bg-background border-border/80 rounded-xl pl-9 pr-9 h-9 text-left font-semibold text-xs"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setVisibleCount(30);
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted transition-colors"
              title="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border/60 shrink-0">
          {([
            { id: 'all', label: 'All', count: products.length },
            { id: 'low', label: 'Critical', count: lowStockCount },
            { id: 'warning', label: 'Moderate', count: warningStockCount },
            { id: 'high', label: 'Healthy', count: healthyStockCount },
          ] as const).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStockFilter(tab.id)}
              className={cn(
                "h-7 px-2.5 rounded-lg text-[11px] font-black transition-all flex items-center gap-1",
                stockFilter === tab.id
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span>{tab.label}</span>
              <span className="text-[10px] opacity-80 font-mono">({tab.count})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Sleek Compact Stock Grid */}
      <ScrollArea className="flex-1 custom-scrollbar">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-3 pb-6">
          {displayStockItems.map((item) => {
            const shopQty = Number(item.stock_shop) || 0;
            const godownQty = Number(item.stock_godown) || 0;
            const isCritical = shopQty < LOW_STOCK_THRESHOLD;
            const isWarning = shopQty >= LOW_STOCK_THRESHOLD && shopQty < WARNING_STOCK_THRESHOLD;

            return (
              <Card
                key={item.id}
                className={cn(
                  "bg-card/90 border transition-all duration-200 rounded-2xl overflow-hidden group hover:shadow-md flex flex-col justify-between",
                  isCritical
                    ? "border-rose-500/30 hover:border-rose-500/60"
                    : isWarning
                      ? "border-amber-500/25 hover:border-amber-500/50"
                      : "border-border hover:border-primary/40"
                )}
              >
                <CardContent className="p-3.5 flex flex-col h-full justify-between gap-3">
                  {/* Top Info: Code, Status Badge, Edit button, Names */}
                  <div>
                    <div className="flex items-center justify-between gap-1.5 mb-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded-md bg-muted border border-border text-foreground truncate">
                          {item.item_code || 'SKU'}
                        </span>
                        {isCritical ? (
                          <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                            {shopQty < 0 ? 'Minus' : 'Low'}
                          </span>
                        ) : isWarning ? (
                          <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                            Moderate
                          </span>
                        ) : (
                          <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                            In Stock
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleEditProductClick(item)}
                        title="Edit Product Details"
                        className="h-6 w-6 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted flex items-center justify-center transition-colors shrink-0"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                    </div>

                    <h3 className="text-sm font-black text-foreground leading-tight line-clamp-1">
                      {item.name_en || item.name_dv}
                    </h3>
                    <p className="text-[11px] font-bold text-muted-foreground line-clamp-1 mt-0.5">
                      {item.name_dv || item.category || 'General'}
                    </p>
                    {item.barcode && (
                      <p className="text-[10px] font-mono text-muted-foreground/70 truncate mt-0.5">
                        #{item.barcode}
                      </p>
                    )}
                  </div>

                  {/* Shop vs Godown Stock Boxes */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className={cn(
                      "p-2.5 rounded-xl border transition-all",
                      isCritical
                        ? "bg-rose-500/5 border-rose-500/25"
                        : isWarning
                          ? "bg-amber-500/5 border-amber-500/20"
                          : "bg-emerald-500/5 border-emerald-500/20"
                    )}>
                      <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground uppercase mb-0.5">
                        <span>Shop</span>
                        <Store className="h-3 w-3 opacity-70" />
                      </div>
                      <p className={cn(
                        "text-lg font-black font-mono leading-tight",
                        isCritical
                          ? "text-rose-600 dark:text-rose-400"
                          : isWarning
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-emerald-600 dark:text-emerald-400"
                      )}>
                        {shopQty}
                      </p>
                    </div>

                    <div className="p-2.5 rounded-xl bg-muted/40 border border-border/70">
                      <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground uppercase mb-0.5">
                        <span>Godown</span>
                        <Warehouse className="h-3 w-3 opacity-70" />
                      </div>
                      <p className="text-lg font-black font-mono text-foreground leading-tight">
                        {godownQty}
                      </p>
                    </div>
                  </div>

                  {/* Compact Action Buttons */}
                  <div className="flex items-center gap-1.5">
                    <Button 
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleUpdateStockClick(item)}
                      className="flex-1 text-[10px] font-black h-8 px-2.5 rounded-lg border-border hover:bg-muted"
                    >
                      Update Stock
                    </Button>
                    <Button 
                      type="button"
                      variant="default"
                      size="sm"
                      onClick={() => handleTransferClick(item, 'to_shop')}
                      className="flex-1 text-[10px] font-black h-8 px-2.5 rounded-lg gap-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                      <ArrowRightLeft className="h-3 w-3" />
                      <span>Transfer</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {visibleCount < filteredStockItems.length && (
          <div className="flex justify-center pb-8">
            <Button 
              onClick={() => setVisibleCount(prev => prev + 30)}
              variant="outline"
              className="rounded-xl px-6 h-10 font-black text-xs uppercase tracking-wider border-border hover:bg-muted"
            >
              Load More Items ({filteredStockItems.length - visibleCount} remaining)
            </Button>
          </div>
        )}
      </ScrollArea>

      {/* Dialogs */}
      {updatingStockItem && (
        <StockUpdateDialog
          isOpen={isStockUpdateDialogOpen}
          onClose={() => {
            setIsStockUpdateDialogOpen(false);
            setUpdatingStockItem(null);
          }}
          onSave={handleSaveStockUpdate}
          stockItem={updatingStockItem}
        />
      )}

      {updatingStockItem && (
        <StockTransferDialog
          isOpen={isTransferDialogOpen}
          onClose={() => {
            setIsTransferDialogOpen(false);
            setUpdatingStockItem(null);
          }}
          onTransfer={handleTransfer}
          stockItem={updatingStockItem}
          initialDirection={transferDirection}
        />
      )}

      <QuickStockDialog
        isOpen={isQuickStockOpen}
        onClose={() => setIsQuickStockOpen(false)}
      />

      {editingProduct && (
        <ProductDialog
          isOpen={isProductDialog}
          onClose={() => setIsProductDialog(false)}
          onSave={handleSaveProduct}
          product={editingProduct}
        />
      )}
    </div>
  );
};

export default Stock;