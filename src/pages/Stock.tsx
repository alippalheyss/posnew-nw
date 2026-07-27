"use client";

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, PackagePlus, Boxes, ArrowRightLeft, Store, Warehouse, Pencil, AlertTriangle, TrendingDown, TrendingUp, Info } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import StockUpdateDialog from '@/components/StockUpdateDialog';
import StockTransferDialog from '@/components/StockTransferDialog';
import ProductDialog from '@/components/ProductDialog';
import QuickStockDialog from '@/components/QuickStockDialog';
import { useAppContext, Product } from '@/context/AppContext';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const Stock = () => {
  const { t } = useTranslation();
  const {
    products,
    settings,
    updateStock,
    updateProduct,
    transferStock
  } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'high' | 'warning'>('all');
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
      item.item_code.toLowerCase().includes(searchTerm.toLowerCase());

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

  const handleSaveProduct = (updatedProduct: Product) => {
    updateProduct(updatedProduct);
    setIsProductDialog(false);
    setEditingProduct(null);
  };

  const handleTransfer = (id: string, from: 'shop' | 'godown', to: 'shop' | 'godown', amount: number) => {
    transferStock(id, from, to, amount);
  };

  const renderBoth = (key: string, options?: any) => (
    <>
      {t(key, options)} ({t(key, { ...options, lng: 'en' })})
    </>
  );

  return (
    <div className="p-6 font-faruma flex flex-col h-full bg-[#050510] text-white overflow-hidden" dir="rtl">
      {/* Header Section */}
      <div className="flex justify-between items-center mb-8">
        <div className="text-right">
           <h1 className="text-3xl font-black text-white flex items-center justify-end gap-3">
             {renderBoth('stock_inventory')} <Boxes className="h-8 w-8 text-primary" />
           </h1>
           <p className="text-sm text-white/40 mt-1">Monitor and manage stock levels across locations</p>
        </div>

        <div className="flex gap-3">
           <Button onClick={() => setIsQuickStockOpen(true)} className="gap-2 bg-primary hover:bg-primary/90 h-10 px-6 rounded-xl font-black shadow-[0_0_20px_rgba(0,132,255,0.3)]">
               <PackagePlus className="h-4 w-4" /> Quick Stock
           </Button>
           <div className="bg-white/5 rounded-xl p-1 border border-white/10 flex gap-1">
              {['all', 'low', 'warning', 'high'].map((filter) => (
                <Button 
                  key={filter}
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setStockFilter(filter as any)}
                  className={cn(
                    "px-4 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                    stockFilter === filter ? "bg-primary text-white" : "text-white/40 hover:text-white"
                  )}
                >
                  {filter}
                </Button>
              ))}
           </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative mb-8">
         <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20" />
         <Input 
           placeholder="Search stock by name, code or barcode..."
           value={searchTerm}
           onChange={(e) => { setSearchTerm(e.target.value); setVisibleCount(20); }}
           className="w-full bg-white/5 border-white/10 rounded-xl pr-12 h-14 text-right font-bold focus:border-primary/50 transition-all text-lg"
         />
      </div>

      {/* Stock Grid */}
      <ScrollArea className="flex-1 custom-scrollbar">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-6">
          {displayStockItems.map((item) => (
            <Card key={item.id} className="bg-[#0a0a1a] border-white/5 hover:border-primary/30 transition-all rounded-[2rem] overflow-hidden group relative">
               <CardContent className="p-0">
                  <div className="p-6">
                     <div className="flex justify-between items-start mb-6">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                           <Boxes className="h-6 w-6" />
                        </div>
                        <div className="flex flex-col items-end gap-2">
                           <Badge className="bg-primary/20 text-primary border-primary/20 text-[10px] font-black px-3 py-1 rounded-full">{item.item_code}</Badge>
                           {item.stock_shop < LOW_STOCK_THRESHOLD && (
                             <Badge className="bg-red-500 text-white border-none text-[8px] font-black px-2 py-0.5 rounded-full animate-pulse">CRITICAL STOCK</Badge>
                           )}
                        </div>
                     </div>

                     <div className="text-right mb-6">
                        <h3 className="text-xl font-black text-white leading-tight mb-1 truncate">{item.name_dv}</h3>
                        <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest truncate">{item.name_en}</p>
                     </div>

                     <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="bg-white/5 p-4 rounded-2xl border border-white/5 group-hover:bg-white/10 transition-all">
                           <div className="flex items-center justify-end gap-2 text-[10px] font-black text-white/30 uppercase tracking-widest mb-2">
                              {renderBoth('shop')} <Store className="h-3 w-3" />
                           </div>
                           <p className={cn(
                             "text-2xl font-black text-right",
                             item.stock_shop < LOW_STOCK_THRESHOLD ? "text-red-500" : item.stock_shop < WARNING_STOCK_THRESHOLD ? "text-orange-500" : "text-green-500"
                           )}>{item.stock_shop}</p>
                        </div>
                        <div className="bg-white/5 p-4 rounded-2xl border border-white/5 group-hover:bg-white/10 transition-all">
                           <div className="flex items-center justify-end gap-2 text-[10px] font-black text-white/30 uppercase tracking-widest mb-2">
                              {renderBoth('godown')} <Warehouse className="h-3 w-3" />
                           </div>
                           <p className="text-2xl font-black text-white text-right">{item.stock_godown}</p>
                        </div>
                     </div>

                     <div className="flex gap-2">
                        <Button 
                          onClick={() => handleUpdateStockClick(item)}
                          className="flex-1 bg-white/5 hover:bg-white/10 text-white text-[10px] font-black h-11 rounded-xl border border-white/10 transition-all"
                        >
                          MANUAL UPDATE
                        </Button>
                        <Button 
                          onClick={() => handleTransferClick(item, 'to_shop')}
                          className="flex-1 bg-primary/10 hover:bg-primary text-primary hover:text-white text-[10px] font-black h-11 rounded-xl border border-primary/20 transition-all gap-2"
                        >
                          <ArrowRightLeft className="h-3 w-3" /> TRANSFER
                        </Button>
                     </div>
                  </div>
               </CardContent>
            </Card>
          ))}
        </div>

        {visibleCount < filteredStockItems.length && (
          <div className="flex justify-center py-8">
            <Button 
              onClick={() => setVisibleCount(prev => prev + 20)}
              variant="outline"
              className="bg-white/5 border-white/10 hover:bg-white/10 px-8 h-12 rounded-xl text-[10px] font-black uppercase tracking-widest"
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