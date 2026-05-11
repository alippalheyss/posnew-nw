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
  const { products, setProducts, favoriteProductIds, setFavoriteProductIds, settings, calculateProfitMargin, deleteProduct, addProduct, updateProduct } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [visibleCount, setVisibleCount] = useState(30);

  const filteredProducts = products.filter(product => {
    const matchesSearch = !searchTerm || 
      product.name_dv.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.name_en.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.barcode.includes(searchTerm) ||
      product.item_code.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFavorite = !showFavoritesOnly || favoriteProductIds.includes(product.id);
    const matchesCategory = selectedCategory === 'ALL' || product.category === selectedCategory;

    return matchesSearch && matchesFavorite && matchesCategory;
  });

  const displayProducts = filteredProducts.slice(0, visibleCount);

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

  const handleSaveProduct = async (productData: Product) => {
    if (editingProduct) {
      await updateProduct(productData);
      showSuccess(t('product_updated_successfully'));
    } else {
      await addProduct(productData);
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
      <div className="flex flex-row-reverse gap-4 mb-4">
        <div className="relative flex-1">
           <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20" />
           <Input 
             placeholder={renderBothString('search_products')}
             value={searchTerm}
             onChange={(e) => { setSearchTerm(e.target.value); setVisibleCount(30); }}
             className="w-full bg-white/5 border-white/10 rounded-xl pr-12 h-12 text-right font-bold focus:border-primary/50 transition-all"
           />
        </div>
        <div className="flex gap-2">
           <div className="bg-white/5 rounded-xl p-1 border border-white/10 flex gap-1">
              {['DRINKS', 'FOOD', 'HARDWARE', 'COSMETICS', 'OTHER', 'ALL'].map((cat) => (
                <Button 
                  key={cat}
                  variant={selectedCategory === cat ? "default" : "ghost"} 
                  size="sm" 
                  onClick={() => { setSelectedCategory(cat); setVisibleCount(30); }}
                  className={cn(
                    "px-4 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                    selectedCategory === cat ? "bg-primary text-white" : "text-white/40 hover:text-white"
                  )}
                >
                  {cat}
                </Button>
              ))}
           </div>
           <Button 
             variant={showFavoritesOnly ? "default" : "outline"}
             onClick={() => { setShowFavoritesOnly(!showFavoritesOnly); setVisibleCount(30); }}
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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 pb-6">
            {displayProducts.map((product) => {
               const margin = calculateProfitMargin(product);
               const cardColors = ['bg-blue-600', 'bg-red-600', 'bg-purple-600', 'bg-orange-600', 'bg-pink-600', 'bg-indigo-600'];
               const colorClass = cardColors[Math.abs(product.id.split('').reduce((a, b) => a + b.charCodeAt(0), 0)) % cardColors.length];

               return (
                 <Card key={product.id} className="bg-[#0a0a1a] border-white/5 hover:border-primary/30 transition-all overflow-hidden group rounded-2xl">
                   <CardContent className="p-0">
                      <div className={cn(
                        "aspect-[16/9] relative flex items-center justify-center overflow-hidden border-b border-white/5",
                        product.image ? "bg-white" : colorClass
                      )}>
                        {product.image ? (
                          <img src={product.image} alt={product.name_dv} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                        ) : (
                          <div className="text-white font-black text-xl uppercase tracking-tighter text-center px-4 leading-tight drop-shadow-xl">
                            {product.name_en}
                          </div>
                        )}
                        
                        <div className="absolute top-2 left-2 right-2 flex justify-between items-start">
                           <Button 
                             variant="ghost" 
                             size="icon" 
                             onClick={(e) => { e.stopPropagation(); toggleFavorite(product.id); }}
                             className={cn(
                               "h-7 w-7 rounded-lg backdrop-blur-md border border-white/10 transition-all",
                               favoriteProductIds.includes(product.id) ? "bg-yellow-500 border-yellow-400 text-black shadow-lg" : "bg-black/20 text-white"
                             )}
                           >
                             <Star className={cn("h-3.5 w-3.5", favoriteProductIds.includes(product.id) ? "fill-current" : "")} />
                           </Button>

                           <DropdownMenu>
                             <DropdownMenuTrigger asChild>
                               <Button variant="ghost" size="icon" className="h-7 w-7 bg-black/20 text-white/70 hover:bg-black/40 backdrop-blur-md border border-white/10 rounded-lg">
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
                      </div>

                      <div className="p-3 text-right">
                         <h3 className="text-sm font-black text-white leading-tight mb-0.5 truncate">{product.name_dv}</h3>
                         <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest truncate">{product.name_en}</p>
                         
                         <div className="flex items-center justify-between mt-3">
                            <span className="text-xs font-black text-primary">{settings.shop.currency} {product.price.toFixed(2)}</span>
                            <div className="flex items-center gap-1">
                               <div className={cn("w-1.5 h-1.5 rounded-full", product.stock_shop < 10 ? "bg-red-500" : "bg-green-500")} />
                               <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest">{product.stock_shop}</span>
                            </div>
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
                  {displayProducts.map((product) => (
                    <tr key={product.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3 justify-end">
                          <div className="text-right">
                            <p className="font-black text-white">{product.name_dv}</p>
                            <p className="text-[10px] text-white/40">{product.name_en}</p>
                          </div>
                          <div className="h-10 w-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
                             {product.image ? <img src={product.image} className="w-full h-full object-cover" /> : <Package className="h-4 w-4 text-white/20" />}
                          </div>
                        </div>
                      </td>
                      <td className="p-4 font-mono text-xs text-white/40">{product.item_code}</td>
                      <td className="p-4 font-mono text-xs text-white/40">{product.barcode}</td>
                      <td className="p-4 font-black text-primary">{settings.shop.currency} {product.price.toFixed(2)}</td>
                      <td className="p-4">
                         <Badge className={cn(
                           "bg-white/5 text-white/40 border-white/10 text-[10px] font-black px-2 py-0.5 rounded-full",
                           product.stock_shop < 10 && "bg-red-500/20 text-red-500 border-red-500/20"
                         )}>
                            {product.stock_shop} PCS
                         </Badge>
                      </td>
                      <td className="p-4">
                        <div className="flex justify-end gap-2">
                           <Button variant="ghost" size="icon" onClick={() => handleEditClick(product)} className="h-8 w-8 text-blue-400 hover:bg-blue-500/10"><Edit2 className="h-4 w-4" /></Button>
                           <Button variant="ghost" size="icon" onClick={() => handleDeleteProduct(product.id)} className="h-8 w-8 text-red-400 hover:bg-red-500/10"><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {visibleCount < filteredProducts.length && (
          <div className="flex justify-center py-8">
            <Button 
              onClick={() => setVisibleCount(prev => prev + 30)}
              variant="outline"
              className="bg-white/5 border-white/10 hover:bg-white/10 px-8 h-12 rounded-xl text-[10px] font-black uppercase tracking-widest"
            >
              Load More Products ({filteredProducts.length - visibleCount} remaining)
            </Button>
          </div>
        )}
      </ScrollArea>

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