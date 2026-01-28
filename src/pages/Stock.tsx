"use client";

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, PackagePlus } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import StockUpdateDialog from '@/components/StockUpdateDialog';
import StockTransferDialog from '@/components/StockTransferDialog';
import ProductDialog from '@/components/ProductDialog';
import { useAppContext, Product } from '@/context/AppContext';
import { Badge } from '@/components/ui/badge';
import { ArrowRightLeft, Store, Warehouse, Pencil } from 'lucide-react';

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
  const [updatingStockItem, setUpdatingStockItem] = useState<Product | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [transferDirection, setTransferDirection] = useState<'to_godown' | 'to_shop'>('to_godown');

  const LOW_STOCK_THRESHOLD = 10;
  const WARNING_STOCK_THRESHOLD = 50;


  // Use products directly from context instead of mapping
  const stockItems = products;

  const filteredStockItems = stockItems.filter(item => {
    const matchesSearch =
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

  const getStockColor = (qty: number) => {
    if (qty < LOW_STOCK_THRESHOLD) return 'border-red-500 bg-red-50 dark:bg-red-900/10';
    if (qty < WARNING_STOCK_THRESHOLD) return 'border-amber-500 bg-amber-50 dark:bg-amber-900/10';
    return 'border-green-500 bg-green-50 dark:bg-green-900/10';
  };


  const handleUpdateStockClick = (item: Product) => {
    setUpdatingStockItem(item);
    setIsStockUpdateDialogOpen(true);
  };

  const handleTransferClick = (item: Product, defaultDirection: 'to_godown' | 'to_shop' = 'to_godown') => {
    setUpdatingStockItem(item);
    setTransferDirection(defaultDirection);
    setIsTransferDialogOpen(true);
  };

  const handleSaveStockUpdate = (updatedStockItem: any) => {
    // Determine if we are updating shop or godown stock based on the dialog (simplified to shop for now or check dialog implementation)
    // For now assuming the standard update dialog updates Shop Stock.
    updateStock(updatedStockItem.id, updatedStockItem.stock_shop !== undefined ? updatedStockItem.stock_shop : updatedStockItem.current_stock);
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

  const renderBothString = (key: string, options?: any) => {
    return `${t(key, options)} (${t(key, { ...options, lng: 'en' })})`;
  };

  return (
    <div className="p-4 font-faruma flex flex-col h-full">
      <Card className="flex-1">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-right text-xl">{renderBoth('stock')}</CardTitle>
          <div className="flex flex-col md:flex-row items-center gap-3">
            <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
              <Button
                variant={stockFilter === 'all' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setStockFilter('all')}
                className="text-xs h-8"
              >
                {renderBoth('all')}
              </Button>
              <Button
                variant={stockFilter === 'low' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setStockFilter('low')}
                className="text-xs h-8 text-red-600"
              >
                {renderBoth('low_stock')}
              </Button>
              <Button
                variant={stockFilter === 'warning' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setStockFilter('warning')}
                className="text-xs h-8 text-amber-600"
              >
                {renderBoth('warning')}
              </Button>
              <Button
                variant={stockFilter === 'high' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setStockFilter('high')}
                className="text-xs h-8 text-green-600"
              >
                {renderBoth('high_stock')}
              </Button>
            </div>
            <div className="relative">
              <Input
                placeholder={renderBothString('search_products')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="text-right pr-9"
                dir="rtl"
              />
              <Search className="h-4 w-4 text-gray-500 absolute right-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden p-0">
          <div className="flex h-full">
            {/* Shop Stock Column */}
            <div className="flex-1 border-r flex flex-col bg-green-50/30 dark:bg-green-900/10">
              <div className="p-3 border-b bg-white dark:bg-black/20 flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-2">
                  <Store className="h-5 w-5 text-green-600" />
                  <h3 className="font-bold text-lg">{renderBoth('shop_stock')}</h3>
                </div>
                <Badge variant="outline" className="text-xs bg-green-100 text-green-800 border-green-200">Main Shop</Badge>
              </div>
              <ScrollArea className="flex-1 p-3">
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                  {filteredStockItems.map((item) => (
                    <Card key={item.id} className={`text-right border-l-4 ${getStockColor(item.stock_shop)} hover:shadow-md transition-all`}>
                      <CardContent className="p-3">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleUpdateStockClick(item)}>
                              <PackagePlus className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-green-600" onClick={() => handleTransferClick(item, 'to_godown')}>
                              <ArrowRightLeft className="h-3 w-3" />
                            </Button>
                          </div>
                          <div>
                            <p className="font-bold text-sm truncate w-32">{item.name_dv}</p>
                            <p className="text-[10px] text-gray-500 truncate w-32">{item.name_en}</p>
                          </div>
                        </div>
                        <div className="flex justify-between items-end">
                          <div className="text-left">
                            <p className="text-[10px] text-gray-400">{item.item_code}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] text-gray-500 uppercase">In Shop</p>
                            <p className={`text-xl font-black ${item.stock_shop < LOW_STOCK_THRESHOLD ? 'text-red-500' : 'text-primary'}`}>
                              {item.stock_shop}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Godown Stock Column */}
            <div className="flex-1 flex flex-col bg-blue-50/30 dark:bg-blue-900/10">
              <div className="p-3 border-b bg-white dark:bg-black/20 flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-2">
                  <Warehouse className="h-5 w-5 text-blue-600" />
                  <h3 className="font-bold text-lg">{renderBoth('godown_stock')}</h3>
                </div>
                <Badge variant="outline" className="text-xs bg-blue-100 text-blue-800 border-blue-200">Storage</Badge>
              </div>
              <ScrollArea className="flex-1 p-3">
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                  {filteredStockItems.map((item) => (
                    <Card key={`godown-${item.id}`} className="text-right border-l-4 border-blue-300 hover:shadow-md transition-all bg-white/80 dark:bg-gray-900/80">
                      <CardContent className="p-3">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex gap-1 opacity-50 hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-blue-600" onClick={() => handleTransferClick(item, 'to_shop')}>
                              <ArrowRightLeft className="h-3 w-3" />
                            </Button>
                          </div>
                          <div>
                            <p className="font-bold text-sm truncate w-32">{item.name_dv}</p>
                            <p className="text-[10px] text-gray-500 truncate w-32">{item.name_en}</p>
                          </div>
                        </div>
                        <div className="flex justify-between items-end">
                          <div className="text-left">
                            <p className="text-[10px] text-gray-400">{item.barcode}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] text-gray-500 uppercase">In Godown</p>
                            <p className="text-xl font-black text-blue-700">
                              {item.stock_godown}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>
        </CardContent>
      </Card>

      <StockUpdateDialog
        isOpen={isStockUpdateDialogOpen}
        onClose={() => setIsStockUpdateDialogOpen(false)}
        stockItem={updatingStockItem}
        onSave={handleSaveStockUpdate}
      />

      <StockTransferDialog
        isOpen={isTransferDialogOpen}
        onClose={() => setIsTransferDialogOpen(false)}
        stockItem={updatingStockItem}
        initialDirection={transferDirection}
        onTransfer={(id, from, to, amount) => {
          transferStock(id, from, to, amount);
        }}
      />

      <ProductDialog
        isOpen={isProductDialog}
        onClose={() => setIsProductDialog(false)}
        product={editingProduct}
        onSave={handleSaveProduct}
      />
    </div>
  );
};

export default Stock;