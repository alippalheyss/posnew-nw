"use client";

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, Plus, Edit2, Trash2, Star, Upload, Filter } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import ProductDialog from '@/components/ProductDialog';
import ExcelImportDialog from '@/components/ExcelImportDialog';
import { useAppContext, Product } from '@/context/AppContext';
import { showSuccess, showError } from '@/utils/toast';
import { cn } from '@/lib/utils';

const Products = () => {
  const { t } = useTranslation();
  const { products, setProducts, favoriteProductIds, setFavoriteProductIds, settings, calculateProfitMargin } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name_dv.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.name_en.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.barcode.includes(searchTerm) ||
      product.item_code.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFavorite = !showFavoritesOnly || favoriteProductIds.includes(product.id);

    return matchesSearch && matchesFavorite;
  });

  const toggleFavorite = (productId: string) => {
    if (favoriteProductIds.includes(productId)) {
      setFavoriteProductIds(favoriteProductIds.filter(id => id !== productId));
    } else {
      setFavoriteProductIds([...favoriteProductIds, productId]);
    }
  };

  const handleAddClick = () => {
    setEditingProduct(null);
    setIsDialogOpen(true);
  };

  const handleEditClick = (product: Product) => {
    setEditingProduct(product);
    setIsDialogOpen(true);
  };

  const handleSaveProduct = (productData: Product) => {
    if (editingProduct) {
      // Update
      setProducts(prev => prev.map(p => p.id === productData.id ? productData : p));
      showSuccess(t('product_updated_successfully'));
    } else {
      // Add
      setProducts(prev => [...prev, productData]);
      showSuccess(t('product_added_successfully'));
    }
    setIsDialogOpen(false);
  };

  const handleDeleteProduct = (id: string) => {
    if (window.confirm(t('confirm_delete_product'))) {
      setProducts(prev => prev.filter(p => p.id !== id));
      showSuccess(t('product_deleted_successfully'));
    }
  };

  const handleBulkImport = (importedProducts: Product[]) => {
    setProducts(prev => [...prev, ...importedProducts]);
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
    <div className="p-4 font-faruma flex flex-col h-full overflow-hidden">
      <Card className="flex-1 flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-right text-xl">{renderBoth('products')}</CardTitle>
          <div className="flex items-center gap-3">
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
            <Button
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
              variant={showFavoritesOnly ? "default" : "outline"}
              size="sm"
            >
              <Star className={`h-4 w-4 ml-2 ${showFavoritesOnly ? 'fill-current' : ''}`} />
              {showFavoritesOnly ? t('show_all') : t('favorites')}
            </Button>
            <Button
              onClick={() => setIsImportDialogOpen(true)}
              variant="outline"
              size="sm"
            >
              <Upload className="h-4 w-4 ml-2" /> {t('import_excel')}
            </Button>
            <Button onClick={handleAddClick} className="flex items-center">
              <Plus className="h-4 w-4 ml-2" /> {renderBoth('add_new_product')}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden p-0">
          <ScrollArea className="h-[calc(100vh-200px)] p-4">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-3" dir="rtl">
              {filteredProducts.map((product) => (
                <Card key={product.id} className="overflow-hidden hover:shadow-md transition-shadow flex flex-col relative group">
                  {/* Delete Icon - Absolute positioned */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 dark:bg-black/80 text-red-600 hover:text-red-700 hover:bg-red-50 z-10"
                    onClick={() => handleDeleteProduct(product.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>

                  {/* Favorite Star - Absolute positioned */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "h-6 w-6 absolute top-1 right-1 transition-all z-10",
                      favoriteProductIds.includes(product.id)
                        ? "opacity-100 bg-yellow-100 dark:bg-yellow-900/50 text-yellow-600"
                        : "opacity-0 group-hover:opacity-100 bg-white/80 dark:bg-black/80 text-gray-400 hover:text-yellow-500"
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(product.id);
                    }}
                  >
                    <Star className={cn(
                      "h-3 w-3",
                      favoriteProductIds.includes(product.id) && "fill-current"
                    )} />
                  </Button>

                  <div className="h-24 bg-gray-100 flex items-center justify-center overflow-hidden">
                    <img src={product.image} alt={product.name_dv} className="w-full h-full object-cover" />
                  </div>
                  <CardContent className="p-2 text-right flex-1 flex flex-col justify-between">
                    <div className="space-y-1">
                      <div className="flex justify-between items-start mb-0.5">
                        <Badge variant="secondary" className="text-[8px] h-4 px-1">{product.category}</Badge>
                        <p className="font-bold text-xs leading-tight truncate">{product.name_dv}</p>
                      </div>
                      <p className="text-[9px] text-gray-500 truncate mb-1">{product.name_en}</p>

                      {/* Cost Price & Profit Margin */}
                      {product.cost_price && (
                        <div className="flex justify-end gap-1 text-[8px]">
                          <div className="bg-gray-100 px-1 py-0.5 rounded">
                            <span className="text-gray-500">{t('cost_price')}: </span>
                            <span className="font-mono font-bold">MVR {product.cost_price.toFixed(2)}</span>
                          </div>
                          <Badge
                            className={cn(
                              "h-4 px-1 text-[8px]",
                              calculateProfitMargin(product) < 10 ? "bg-red-500" :
                                calculateProfitMargin(product) < 20 ? "bg-yellow-500" :
                                  "bg-green-500"
                            )}
                          >
                            {calculateProfitMargin(product).toFixed(1)}%
                          </Badge>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-800 p-1.5 rounded-sm border">
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-blue-600 hover:bg-blue-100" onClick={() => handleEditClick(product)}>
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <div className="text-right">
                        <p className="text-[8px] text-gray-500 uppercase leading-none">Price</p>
                        <p className="font-black text-[11px] text-primary leading-tight">MVR {product.price.toFixed(2)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <ProductDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        product={editingProduct}
        onSave={handleSaveProduct}
      />

      <ExcelImportDialog
        isOpen={isImportDialogOpen}
        onClose={() => setIsImportDialogOpen(false)}
        onImport={handleBulkImport}
      />
    </div>
  );
};

export default Products;