"use client";

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, Plus, Edit2, Trash2, Star, Upload, Filter, Package, Grid, List, MoreVertical } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import ProductDialog from '@/components/ProductDialog';
import ExcelImportDialog from '@/components/ExcelImportDialog';
import { useAppContext, Product } from '@/context/AppContext';
import { showSuccess, showError } from '@/utils/toast';
import { cn } from '@/lib/utils';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Products = () => {
  const { t } = useTranslation();
  const { products, setProducts, favoriteProductIds, setFavoriteProductIds, settings, calculateProfitMargin, deleteProduct } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

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

  const handleDeleteProduct = async (id: string) => {
    if (window.confirm(t('confirm_delete_product'))) {
      await deleteProduct(id);
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
    <div className="p-6 font-faruma flex flex-col h-full bg-[#050510] text-white overflow-hidden" dir="rtl">
      {/* Header Section */}
      <div className="flex justify-between items-center mb-8">
        <div className="text-right">
           <h1 className="text-3xl font-black text-white flex items-center justify-end gap-3">
             {renderBoth('products')} <Package className="h-8 w-8 text-primary" />
           </h1>
           <p className="text-sm text-white/40 mt-1">Manage your inventory, pricing and stock levels</p>
        </div>

        <div className="flex gap-3">
           <Button 
             variant="outline" 
             onClick={() => setIsImportDialogOpen(true)}
             className="gap-2 border-white/10 hover:bg-white/5 h-11 px-6 rounded-xl"
           >
             <Upload className="h-4 w-4" /> {renderBoth('import_excel')}
           </Button>
           <Button 
             onClick={handleAddClick}
             className="gap-2 bg-primary hover:bg-primary/90 h-11 px-6 rounded-xl font-black shadow-[0_0_20px_rgba(0,132,255,0.3)]"
           >
             <Plus className="h-4 w-4" /> {renderBoth('add_new_product')}
           </Button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-row-reverse gap-4 mb-6">
        <div className="relative flex-1">
           <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20" />
           <Input 
             placeholder={renderBothString('search_products')}
             value={searchTerm}
             onChange={(e) => setSearchTerm(e.target.value)}
             className="w-full bg-white/5 border-white/10 rounded-xl pr-12 h-12 text-right font-bold focus:border-primary/50 transition-all"
           />
        </div>
        <div className="flex gap-2">
           <Button 
             variant={showFavoritesOnly ? "default" : "outline"}
             onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
             className={cn(
               "h-12 w-12 p-0 rounded-xl border-white/10 transition-all",
               showFavoritesOnly ? "bg-yellow-500 hover:bg-yellow-600 text-black shadow-[0_0_15px_rgba(234,179,8,0.3)]" : "hover:bg-white/5"
             )}
           >
             <Star className={cn("h-5 w-5", showFavoritesOnly ? "fill-current" : "")} />
           </Button>
           <div className="bg-white/5 rounded-xl p-1 border border-white/10 flex gap-1">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setViewMode('grid')}
                className={cn("h-10 w-10 rounded-lg", viewMode === 'grid' ? "bg-white/10 text-white" : "text-white/40")}
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setViewMode('list')}
                className={cn("h-10 w-10 rounded-lg", viewMode === 'list' ? "bg-white/10 text-white" : "text-white/40")}
              >
                <List className="h-4 w-4" />
              </Button>
           </div>
        </div>
      </div>

      {/* Main Content Area */}
      <ScrollArea className="flex-1 custom-scrollbar">
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-6">
            {filteredProducts.map((product) => {
               const margin = calculateProfitMargin(product);
               const cardColors = ['bg-blue-600', 'bg-red-600', 'bg-purple-600', 'bg-orange-600', 'bg-pink-600', 'bg-indigo-600'];
               const colorClass = cardColors[Math.abs(product.id.split('').reduce((a, b) => a + b.charCodeAt(0), 0)) % cardColors.length];

               return (
                 <Card key={product.id} className="bg-[#0a0a1a] border-white/5 hover:border-primary/30 transition-all overflow-hidden group rounded-[2rem]">
                   <CardContent className="p-0">
                     <div className={cn(
                       "aspect-[16/10] relative flex items-center justify-center overflow-hidden border-b border-white/5",
                       product.image ? "bg-white" : colorClass
                     )}>
                        {product.image ? (
                          <img src={product.image} alt={product.name_dv} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                        ) : (
                          <div className="text-white font-black text-3xl uppercase tracking-tighter text-center px-6 leading-tight drop-shadow-xl">
                            {product.name_en}
                          </div>
                        )}
                        
                        <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
                           <Button 
                             variant="ghost" 
                             size="icon" 
                             onClick={(e) => { e.stopPropagation(); toggleFavorite(product.id); }}
                             className={cn(
                               "h-10 w-10 rounded-xl backdrop-blur-md border border-white/10 transition-all",
                               favoriteProductIds.includes(product.id) ? "bg-yellow-500 border-yellow-400 text-black shadow-lg" : "bg-black/20 text-white"
                             )}
                           >
                             <Star className={cn("h-5 w-5", favoriteProductIds.includes(product.id) ? "fill-current" : "")} />
                           </Button>

                           <div className="flex flex-col items-end gap-2">
                             <Badge className="bg-primary text-white border-none font-black text-[10px] px-3 py-1 rounded-full shadow-lg">
                                {product.item_code}
                             </Badge>
                             {product.stock_shop < 10 && (
                               <Badge className="bg-red-500 text-white border-none font-black text-[10px] px-3 py-1 rounded-full shadow-lg animate-pulse">
                                  LOW STOCK
                               </Badge>
                             )}
                           </div>
                        </div>
                     </div>

                     <div className="p-6">
                        <div className="flex justify-between items-start mb-4">
                           <div className="text-right flex-1">
                              <h3 className="text-lg font-black text-white leading-tight mb-1 truncate">{product.name_dv}</h3>
                              <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest truncate">{product.name_en}</p>
                           </div>
                           <DropdownMenu>
                             <DropdownMenuTrigger asChild>
                               <Button variant="ghost" size="icon" className="h-8 w-8 text-white/20 hover:text-white">
                                 <MoreVertical className="h-4 w-4" />
                               </Button>
                             </DropdownMenuTrigger>
                             <DropdownMenuContent className="bg-[#0a0a1a] border-white/10 text-white" dir="rtl">
                               <DropdownMenuItem onClick={() => handleEditClick(product)} className="gap-2 text-right justify-end hover:bg-white/5 cursor-pointer">
                                 {renderBoth('edit')} <Edit2 className="h-4 w-4 text-blue-400" />
                               </DropdownMenuItem>
                               <DropdownMenuItem onClick={() => handleDeleteProduct(product.id)} className="gap-2 text-right justify-end hover:bg-red-500/10 text-red-400 cursor-pointer">
                                 {renderBoth('delete')} <Trash2 className="h-4 w-4" />
                               </DropdownMenuItem>
                             </DropdownMenuContent>
                           </DropdownMenu>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-6">
                           <div className="bg-white/5 p-3 rounded-2xl border border-white/5">
                              <p className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-1">{renderBoth('price')}</p>
                              <p className="text-base font-black text-primary">{settings.shop.currency} {product.price.toFixed(2)}</p>
                           </div>
                           <div className="bg-white/5 p-3 rounded-2xl border border-white/5 text-right">
                              <p className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-1">{renderBoth('stock')}</p>
                              <p className="text-base font-black text-white">{product.stock_shop + product.stock_godown} <span className="text-[10px] text-white/40 font-normal">PCS</span></p>
                           </div>
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-white/5">
                           <div className="flex flex-col">
                              <span className="text-[8px] font-black text-white/30 uppercase tracking-widest">Margin</span>
                              <span className={cn("text-xs font-black", margin > 20 ? "text-green-500" : "text-orange-500")}>{margin.toFixed(1)}%</span>
                           </div>
                           <Button 
                             onClick={() => handleEditClick(product)}
                             className="bg-white/5 hover:bg-white/10 text-white text-[10px] font-black px-4 rounded-xl h-9 border border-white/10"
                           >
                             QUICK EDIT
                           </Button>
                        </div>
                     </div>
                   </CardContent>
                 </Card>
               );
            })}
          </div>
        ) : (
          <Card className="bg-[#0a0a1a] border-white/5 rounded-3xl overflow-hidden mb-6">
            <div className="overflow-x-auto">
              <table className="w-full text-right" dir="rtl">
                <thead>
                  <tr className="border-b border-white/5 bg-white/5">
                    <th className="p-4 text-[10px] font-black text-white/40 uppercase tracking-widest">Product</th>
                    <th className="p-4 text-[10px] font-black text-white/40 uppercase tracking-widest">Item Code</th>
                    <th className="p-4 text-[10px] font-black text-white/40 uppercase tracking-widest">Barcode</th>
                    <th className="p-4 text-[10px] font-black text-white/40 uppercase tracking-widest">Price</th>
                    <th className="p-4 text-[10px] font-black text-white/40 uppercase tracking-widest">Stock</th>
                    <th className="p-4 text-[10px] font-black text-white/40 uppercase tracking-widest">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product) => (
                    <tr key={product.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center justify-end gap-3">
                          <div>
                             <p className="font-black text-white">{product.name_dv}</p>
                             <p className="text-[10px] text-white/30 uppercase tracking-widest">{product.name_en}</p>
                          </div>
                          <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center overflow-hidden border border-white/10">
                             {product.image ? (
                               <img src={product.image} className="w-full h-full object-cover" />
                             ) : (
                               <Package className="h-5 w-5 text-primary" />
                             )}
                          </div>
                        </div>
                      </td>
                      <td className="p-4 font-black text-primary text-sm">{product.item_code}</td>
                      <td className="p-4 font-mono text-xs text-white/40">{product.barcode}</td>
                      <td className="p-4 font-black text-white">{settings.shop.currency} {product.price.toFixed(2)}</td>
                      <td className="p-4">
                         <Badge variant={product.stock_shop < 10 ? "destructive" : "outline"} className="font-black">
                           {product.stock_shop + product.stock_godown}
                         </Badge>
                      </td>
                      <td className="p-4">
                         <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => handleEditClick(product)} className="h-8 w-8 text-blue-400 hover:bg-blue-400/10">
                               <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteProduct(product.id)} className="h-8 w-8 text-red-400 hover:bg-red-400/10">
                               <Trash2 className="h-4 w-4" />
                            </Button>
                         </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </ScrollArea>

      <ProductDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSave={handleSaveProduct}
        product={editingProduct}
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