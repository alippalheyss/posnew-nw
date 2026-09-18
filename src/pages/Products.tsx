"use client";

import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, Plus, Edit2, Trash2, Star, Upload, Package, Grid, List, MoreVertical, CheckSquare, Square, AlertTriangle, ShieldAlert, History, Clock, ArrowUpDown, ArrowUp, ArrowDown, SlidersHorizontal, X } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ProductDialog from '@/components/ProductDialog';
import ExcelImportDialog from '@/components/ExcelImportDialog';
import { useAppContext, Product } from '@/context/AppContext';
import { showSuccess, showError } from '@/utils/toast';
import { cn } from '@/lib/utils';
import { getAdaptedImageUrl } from '@/utils/imageUtils';
import { formatDate } from '@/utils/formatters';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type InventoryFilterType = 'ALL' | 'FAVORITES' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'NEVER_SOLD' | 'UNSOLD_30_DAYS' | 'NEVER_UPDATED_STOCK';

export type ProductSortKey =
  | 'DEFAULT'
  | 'NAME_ASC'
  | 'NAME_DESC'
  | 'NAME_EN_ASC'
  | 'NAME_EN_DESC'
  | 'STOCK_ASC'
  | 'STOCK_DESC'
  | 'PRICE_ASC'
  | 'PRICE_DESC'
  | 'CODE_ASC'
  | 'CODE_DESC'
  | 'ACTIVITY_ACTIVE'
  | 'ACTIVITY_NEVER'
  | 'ACTIVITY_UNSOLD'
  | 'ACTIVITY_UNSTOCKED';

const Products = () => {
  const { t } = useTranslation();
  const { 
    products, 
    setProducts, 
    sales,
    favoriteProductIds, 
    setFavoriteProductIds, 
    settings, 
    calculateProfitMargin, 
    deleteProduct, 
    bulkDeleteProducts,
    addProduct, 
    updateProduct 
  } = useAppContext();

  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [inventoryFilter, setInventoryFilter] = useState<InventoryFilterType>('ALL');
  const [sortKey, setSortKey] = useState<ProductSortKey>('DEFAULT');
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [visibleCount, setVisibleCount] = useState(30);

  const availableCategories = useMemo(() => {
    const cats = new Set<string>(['ALL', 'DRINKS', 'FOOD', 'HARDWARE', 'COSMETICS', 'OTHER']);
    products.forEach(p => {
      if (p.category && p.category.trim()) cats.add(p.category.trim().toUpperCase());
    });
    return Array.from(cats);
  }, [products]);

  // Bulk Selection State
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Compute Product Sales Activity (Never Sold / Unsold in 30 Days)
  const productSalesMap = useMemo(() => {
    const map = new Map<string, { totalQty: number; lastSoldDate: string | null }>();
    
    (sales || []).forEach(sale => {
      const saleDate = sale.date || '';
      if (Array.isArray(sale.items)) {
        sale.items.forEach(item => {
          const prev = map.get(item.id) || { totalQty: 0, lastSoldDate: null };
          const isMoreRecent = !prev.lastSoldDate || (saleDate && new Date(saleDate) > new Date(prev.lastSoldDate));
          map.set(item.id, {
            totalQty: prev.totalQty + (item.qty || 0),
            lastSoldDate: isMoreRecent ? saleDate : prev.lastSoldDate
          });
        });
      }
    });
    
    return map;
  }, [sales]);

  const now = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(now.getDate() - 30);

  const isNeverSold = (productId: string) => {
    const stats = productSalesMap.get(productId);
    return !stats || stats.totalQty === 0;
  };

  const isUnsoldIn30Days = (productId: string) => {
    const stats = productSalesMap.get(productId);
    if (!stats || !stats.lastSoldDate) return true; // Never sold is also unsold in 30d
    return new Date(stats.lastSoldDate) < thirtyDaysAgo;
  };

  const isNeverUpdatedStock = (product: Product) => {
    return !product.last_purchase_date && Number(product.stock_shop) === 0 && Number(product.stock_godown) === 0;
  };

  const filteredProducts = useMemo(() => {
    const list = products.filter(product => {
      const matchesSearch = !searchTerm || 
        product.name_dv.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.name_en.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.barcode.includes(searchTerm) ||
        product.item_code.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory = selectedCategory === 'ALL' || product.category === selectedCategory;

      let matchesFilter = true;
      if (inventoryFilter === 'FAVORITES') matchesFilter = favoriteProductIds.includes(product.id);
      else if (inventoryFilter === 'LOW_STOCK') matchesFilter = Number(product.stock_shop) > 0 && Number(product.stock_shop) < 10;
      else if (inventoryFilter === 'OUT_OF_STOCK') matchesFilter = Number(product.stock_shop) <= 0;
      else if (inventoryFilter === 'NEVER_SOLD') matchesFilter = isNeverSold(product.id);
      else if (inventoryFilter === 'UNSOLD_30_DAYS') matchesFilter = isUnsoldIn30Days(product.id);
      else if (inventoryFilter === 'NEVER_UPDATED_STOCK') matchesFilter = isNeverUpdatedStock(product);

      return matchesSearch && matchesCategory && matchesFilter;
    });

    // Sorting logic
    list.sort((a, b) => {
      switch (sortKey) {
        case 'NAME_ASC':
          return (a.name_dv || a.name_en).localeCompare(b.name_dv || b.name_en);
        case 'NAME_DESC':
          return (b.name_dv || b.name_en).localeCompare(a.name_dv || a.name_en);
        case 'NAME_EN_ASC':
          return (a.name_en || a.name_dv).localeCompare(b.name_en || b.name_dv);
        case 'NAME_EN_DESC':
          return (b.name_en || b.name_dv).localeCompare(a.name_en || a.name_dv);
        case 'STOCK_ASC':
          return (Number(a.stock_shop) || 0) - (Number(b.stock_shop) || 0);
        case 'STOCK_DESC':
          return (Number(b.stock_shop) || 0) - (Number(a.stock_shop) || 0);
        case 'PRICE_ASC':
          return (Number(a.price) || 0) - (Number(b.price) || 0);
        case 'PRICE_DESC':
          return (Number(b.price) || 0) - (Number(a.price) || 0);
        case 'CODE_ASC': {
          const numA = Number(a.item_code);
          const numB = Number(b.item_code);
          if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
          return String(a.item_code || '').localeCompare(String(b.item_code || ''));
        }
        case 'CODE_DESC': {
          const numA = Number(a.item_code);
          const numB = Number(b.item_code);
          if (!isNaN(numA) && !isNaN(numB)) return numB - numA;
          return String(b.item_code || '').localeCompare(String(a.item_code || ''));
        }
        case 'ACTIVITY_ACTIVE': {
          const aSales = productSalesMap.get(a.id)?.totalQty || 0;
          const bSales = productSalesMap.get(b.id)?.totalQty || 0;
          return bSales - aSales;
        }
        case 'ACTIVITY_NEVER': {
          const aNever = isNeverSold(a.id) ? 1 : 0;
          const bNever = isNeverSold(b.id) ? 1 : 0;
          return bNever - aNever;
        }
        case 'ACTIVITY_UNSOLD': {
          const aUnsold = isUnsoldIn30Days(a.id) ? 1 : 0;
          const bUnsold = isUnsoldIn30Days(b.id) ? 1 : 0;
          return bUnsold - aUnsold;
        }
        case 'ACTIVITY_UNSTOCKED': {
          const aUnstocked = isNeverUpdatedStock(a) ? 1 : 0;
          const bUnstocked = isNeverUpdatedStock(b) ? 1 : 0;
          return bUnstocked - aUnstocked;
        }
        default:
          return 0;
      }
    });

    return list;
  }, [products, searchTerm, selectedCategory, inventoryFilter, favoriteProductIds, productSalesMap, sortKey]);

  const displayProducts = filteredProducts.slice(0, visibleCount);

  const handleToggleSort = (column: 'name' | 'activity' | 'code' | 'price' | 'stock') => {
    setVisibleCount(30);
    if (column === 'name') {
      setSortKey(prev => (prev === 'NAME_ASC' ? 'NAME_DESC' : 'NAME_ASC'));
    } else if (column === 'activity') {
      setSortKey(prev => (prev === 'ACTIVITY_ACTIVE' ? 'ACTIVITY_NEVER' : 'ACTIVITY_ACTIVE'));
    } else if (column === 'code') {
      setSortKey(prev => (prev === 'CODE_ASC' ? 'CODE_DESC' : 'CODE_ASC'));
    } else if (column === 'price') {
      setSortKey(prev => (prev === 'PRICE_ASC' ? 'PRICE_DESC' : 'PRICE_ASC'));
    } else if (column === 'stock') {
      setSortKey(prev => (prev === 'STOCK_ASC' ? 'STOCK_DESC' : 'STOCK_ASC'));
    }
  };

  const getSortIcon = (column: 'name' | 'activity' | 'code' | 'price' | 'stock') => {
    if (column === 'name') {
      if (sortKey === 'NAME_ASC' || sortKey === 'NAME_EN_ASC') return <ArrowUp className="h-3.5 w-3.5 text-primary" />;
      if (sortKey === 'NAME_DESC' || sortKey === 'NAME_EN_DESC') return <ArrowDown className="h-3.5 w-3.5 text-primary" />;
    } else if (column === 'activity') {
      if (sortKey === 'ACTIVITY_ACTIVE') return <ArrowUp className="h-3.5 w-3.5 text-primary" />;
      if (sortKey === 'ACTIVITY_NEVER') return <ArrowDown className="h-3.5 w-3.5 text-primary" />;
    } else if (column === 'code') {
      if (sortKey === 'CODE_ASC') return <ArrowUp className="h-3.5 w-3.5 text-primary" />;
      if (sortKey === 'CODE_DESC') return <ArrowDown className="h-3.5 w-3.5 text-primary" />;
    } else if (column === 'price') {
      if (sortKey === 'PRICE_ASC') return <ArrowUp className="h-3.5 w-3.5 text-primary" />;
      if (sortKey === 'PRICE_DESC') return <ArrowDown className="h-3.5 w-3.5 text-primary" />;
    } else if (column === 'stock') {
      if (sortKey === 'STOCK_ASC') return <ArrowUp className="h-3.5 w-3.5 text-primary" />;
      if (sortKey === 'STOCK_DESC') return <ArrowDown className="h-3.5 w-3.5 text-primary" />;
    }
    return <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-foreground" />;
  };

  // Selection helpers
  const handleSelectProduct = (productId: string) => {
    setSelectedProductIds(prev => 
      prev.includes(productId) ? prev.filter(id => id !== productId) : [...prev, productId]
    );
  };

  const handleSelectAllFiltered = () => {
    const allFilteredIds = filteredProducts.map(p => p.id);
    const allSelected = allFilteredIds.every(id => selectedProductIds.includes(id));
    if (allSelected) {
      setSelectedProductIds(prev => prev.filter(id => !allFilteredIds.includes(id)));
    } else {
      setSelectedProductIds(prev => Array.from(new Set([...prev, ...allFilteredIds])));
    }
  };

  const handleExecuteBulkDelete = async () => {
    if (selectedProductIds.length === 0) return;
    setIsBulkDeleting(true);
    try {
      await bulkDeleteProducts(selectedProductIds);
      setSelectedProductIds([]);
      setIsBulkDeleteDialogOpen(false);
    } catch (error) {
      console.error('Error during bulk deletion:', error);
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleEditClick = (product: Product) => {
    setEditingProduct(product);
    setIsDialogOpen(true);
  };

  const handleAddClick = () => {
    setEditingProduct(null);
    setIsDialogOpen(true);
  };

  const handleSaveProduct = (savedProduct: Product) => {
    if (editingProduct) {
      updateProduct(savedProduct);
    } else {
      addProduct(savedProduct);
    }
    setIsDialogOpen(false);
    setEditingProduct(null);
  };

  const handleDeleteProduct = (productId: string) => {
    if (window.confirm(t('confirm_delete_product') || 'Are you sure you want to delete this product?')) {
      deleteProduct(productId);
      showSuccess(t('product_deleted') || 'Product deleted successfully');
    }
  };

  const handleToggleFavorite = (productId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (favoriteProductIds.includes(productId)) {
      setFavoriteProductIds(favoriteProductIds.filter(id => id !== productId));
    } else {
      setFavoriteProductIds([...favoriteProductIds, productId]);
    }
  };

  const renderBoth = (key: string) => {
    const en = t(key, { lng: 'en' });
    const dv = t(key, { lng: 'dv' });
    return (
      <div className="flex flex-col items-center leading-tight">
        <span className="font-bold text-xs">{dv}</span>
        <span className="text-[10px] text-muted-foreground uppercase">{en}</span>
      </div>
    );
  };

  const renderBothString = (key: string) => {
    const en = t(key, { lng: 'en' });
    const dv = t(key, { lng: 'dv' });
    return `${dv} (${en})`;
  };

  const isAllFilteredSelected = filteredProducts.length > 0 && filteredProducts.every(p => selectedProductIds.includes(p.id));

  return (
    <div className="p-4 sm:p-6 font-faruma flex flex-col h-full bg-background text-foreground overflow-hidden relative" dir="rtl">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <div className="text-right">
           <h1 className="text-2xl sm:text-3xl font-black text-foreground flex items-center justify-end gap-3">
             {renderBoth('products')} <Package className="h-7 w-7 sm:h-8 sm:w-8 text-primary shrink-0" />
           </h1>
           <p className="text-xs sm:text-sm text-muted-foreground mt-1">Manage inventory, flag inactive items, and perform bulk updates</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
           <Button 
             variant="outline" 
             onClick={() => setIsImportDialogOpen(true)}
             className="gap-2 border-border hover:bg-muted h-11 px-4 sm:px-5 rounded-xl font-bold text-xs"
           >
             <Upload className="h-4 w-4" /> {renderBoth('import_excel')}
           </Button>
           <Button 
             onClick={handleAddClick}
             className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground h-11 px-5 sm:px-6 rounded-xl font-black shadow-[0_0_20px_rgba(0,132,255,0.3)] text-xs"
           >
             <Plus className="h-4 w-4" /> {renderBoth('add_new_product')}
           </Button>
        </div>
      </div>

      {/* PROMINENT CENTERED SEARCH BAR */}
      <div className="w-full flex items-center justify-center mb-4">
        <div className="relative w-full max-w-2xl">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-primary pointer-events-none" />
          <Input 
            placeholder={renderBothString('search_products')}
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setVisibleCount(30); }}
            className="w-full bg-muted/80 hover:bg-muted border-2 border-border focus:border-primary rounded-2xl pr-12 pl-12 h-12 text-right font-bold text-sm sm:text-base focus:bg-background transition-all shadow-sm placeholder:text-muted-foreground/60 text-foreground"
          />
          {searchTerm && (
            <button
              onClick={() => { setSearchTerm(''); setVisibleCount(30); }}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted transition-colors"
              title="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs & Controls Bar */}
      <div className="space-y-3 mb-4">
        {/* Status Filters: All, Never Sold, Unsold >30d, Low Stock, Out of Stock, Never Stocked */}
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'ALL', label: 'All Products (ހުރިހާ)', count: products.length },
            { id: 'NEVER_SOLD', label: 'Never Sold (އަދި ނުވިކޭ)', badgeColor: 'bg-purple-500/15 text-purple-400' },
            { id: 'UNSOLD_30_DAYS', label: 'Unsold >30d (30 ދުވަސް ތެރޭ ނުވިކޭ)', badgeColor: 'bg-amber-500/15 text-amber-400' },
            { id: 'NEVER_UPDATED_STOCK', label: 'Never Updated Stock (ސްޓޮކް އަޕްޑޭޓް ނުކުރާ)', badgeColor: 'bg-zinc-500/20 text-zinc-300' },
            { id: 'LOW_STOCK', label: 'Low Stock (<10)', badgeColor: 'bg-orange-500/15 text-orange-400' },
            { id: 'OUT_OF_STOCK', label: 'Out of Stock (ހުސްވެފައި)', badgeColor: 'bg-red-500/15 text-red-400' },
            { id: 'FAVORITES', label: 'Favorites (ތަރި)', badgeColor: 'bg-yellow-500/15 text-yellow-400' },
          ].map((tab) => (
            <Button
              key={tab.id}
              variant={inventoryFilter === tab.id ? "default" : "outline"}
              size="sm"
              onClick={() => { setInventoryFilter(tab.id as InventoryFilterType); setVisibleCount(30); }}
              className={cn(
                "h-9 px-3.5 rounded-xl text-xs font-black transition-all",
                inventoryFilter === tab.id 
                  ? "bg-primary text-primary-foreground shadow-sm shadow-primary/30" 
                  : "bg-muted/60 border-border text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <span>{tab.label}</span>
            </Button>
          ))}
        </div>

        {/* Categories, Sort Selector, View Mode & Select All */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-muted/40 p-2.5 rounded-2xl border border-border">
          {/* Categories bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 lg:pb-0">
            {availableCategories.map((cat) => (
              <Button 
                key={cat}
                variant={selectedCategory === cat ? "default" : "ghost"} 
                size="sm" 
                onClick={() => { setSelectedCategory(cat); setVisibleCount(30); }}
                className={cn(
                  "px-3 h-8 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all shrink-0",
                  selectedCategory === cat ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {cat}
              </Button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2 justify-between lg:justify-end">
            {/* Sort Dropdown */}
            <Select value={sortKey} onValueChange={(val) => { setSortKey(val as ProductSortKey); setVisibleCount(30); }}>
              <SelectTrigger className="w-[210px] h-9 rounded-xl bg-card border-border text-xs font-black text-foreground flex gap-2">
                <ArrowUpDown className="h-3.5 w-3.5 text-primary" />
                <SelectValue placeholder="Sort Order (ތަރުތީބު)" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border font-faruma text-foreground max-h-72">
                <SelectItem value="DEFAULT">Default Order (އަސްލު ތަރުތީބު)</SelectItem>
                <SelectItem value="NAME_ASC">Name (ދިވެހި A-Z)</SelectItem>
                <SelectItem value="NAME_DESC">Name (ދިވެހި Z-A)</SelectItem>
                <SelectItem value="NAME_EN_ASC">Name (English A-Z)</SelectItem>
                <SelectItem value="NAME_EN_DESC">Name (English Z-A)</SelectItem>
                <SelectItem value="STOCK_ASC">Stock: Low to High (ސްޓޮކް: މަދުން ގިނައަށް)</SelectItem>
                <SelectItem value="STOCK_DESC">Stock: High to Low (ސްޓޮކް: ގިނައިން މަދަށް)</SelectItem>
                <SelectItem value="PRICE_ASC">Price: Low to High (އަގު: ކުޑައިން ބޮޑަށް)</SelectItem>
                <SelectItem value="PRICE_DESC">Price: High to Low (އަގު: ބޮޑުން ކުޑައަށް)</SelectItem>
                <SelectItem value="CODE_ASC">Item Code: Low to High (ކޯޑް: ކުޑައިން ބޮޑަށް)</SelectItem>
                <SelectItem value="CODE_DESC">Item Code: High to Low (ކޯޑް: ބޮޑުން ކުޑައަށް)</SelectItem>
                <SelectItem value="ACTIVITY_ACTIVE">Status: Most Sold (ގިނައިން ވިކޭ)</SelectItem>
                <SelectItem value="ACTIVITY_NEVER">Status: Never Sold (ނުވިކޭ)</SelectItem>
                <SelectItem value="ACTIVITY_UNSOLD">Status: Unsold &gt;30d (30 ދުވަސް ތެރޭ ނުވިކޭ)</SelectItem>
                <SelectItem value="ACTIVITY_UNSTOCKED">Status: Never Stocked (ސްޓޮކް ނެތް)</SelectItem>
              </SelectContent>
            </Select>

            {/* Select All Checkbox Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectAllFiltered}
              className={cn(
                "h-9 px-3 rounded-xl border-border text-xs font-bold gap-1.5 transition-all",
                isAllFilteredSelected ? "bg-primary/10 text-primary border-primary/40" : "bg-card hover:bg-muted text-foreground"
              )}
              title="Select / Deselect all filtered products"
            >
              {isAllFilteredSelected ? <CheckSquare className="h-4 w-4 text-primary" /> : <Square className="h-4 w-4 text-muted-foreground" />}
              <span className="text-[11px] font-black">Select All ({filteredProducts.length})</span>
            </Button>

            {/* View Mode Toggle */}
            <div className="bg-card rounded-xl p-1 border border-border flex gap-1">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setViewMode('grid')}
                className={cn("h-7 w-7 rounded-lg", viewMode === 'grid' ? "bg-muted shadow-sm text-primary" : "text-muted-foreground")}
              >
                <Grid className="h-3.5 w-3.5" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setViewMode('list')}
                className={cn("h-7 w-7 rounded-lg", viewMode === 'list' ? "bg-muted shadow-sm text-primary" : "text-muted-foreground")}
              >
                <List className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Bulk Action Bar (Admin Bulk Delete) */}
      {selectedProductIds.length > 0 && (
        <div className="sticky top-0 z-30 mb-4 bg-primary/15 border-2 border-primary/40 backdrop-blur-xl p-3 sm:p-4 rounded-2xl shadow-xl flex items-center justify-between gap-4 animate-in slide-in-from-top-3">
          <div className="flex items-center gap-3">
            <Badge className="bg-primary text-primary-foreground text-xs font-black px-3 py-1 rounded-xl">
              {selectedProductIds.length} Selected (ޚިޔާރުކުރެވިފައި)
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedProductIds([])}
              className="h-8 text-xs font-bold text-muted-foreground hover:text-foreground"
            >
              Clear Selection
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => setIsBulkDeleteDialogOpen(true)}
              className="h-9 sm:h-10 px-4 bg-red-600 hover:bg-red-700 text-white font-black text-xs rounded-xl shadow-lg shadow-red-600/20 gap-2 uppercase transition-all active:scale-95"
            >
              <Trash2 className="h-4 w-4" />
              <span>Bulk Delete ({selectedProductIds.length} Products) (އެއްފަހަރާ ޑިލީޓް)</span>
            </Button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <ScrollArea className="flex-1 custom-scrollbar">
        {filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground text-center space-y-3">
            <Package className="h-16 w-16 opacity-30 stroke-[1.5]" />
            <p className="text-lg font-black text-foreground">No Products Found (ޕްރޮޑަކްޓެއް ނުފެނުނު)</p>
            <p className="text-xs text-muted-foreground">Try changing the search query or inventory filter tabs.</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 pb-6">
            {displayProducts.map((product) => {
               const margin = calculateProfitMargin(product);
               const isSelected = selectedProductIds.includes(product.id);
               const neverSold = isNeverSold(product.id);
               const unsold30d = isUnsoldIn30Days(product.id);
               const neverUpdated = isNeverUpdatedStock(product);
               const currentStock = Number(product.stock_shop) || 0;
               const isMinusStock = currentStock < 0;

               const adaptedImage = getAdaptedImageUrl(product.image, product.name_en || product.name_dv, product.item_code);

               return (
                 <Card 
                   key={product.id} 
                   className={cn(
                     "bg-card border border-border rounded-2xl overflow-hidden hover:border-primary/50 transition-all group flex flex-col justify-between shadow-xs",
                     isSelected && "ring-2 ring-primary border-primary bg-primary/5"
                   )}
                 >
                   <CardContent className="p-0">
                      <div className="relative aspect-square bg-muted flex items-center justify-center overflow-hidden">
                        {product.image ? (
                          <img src={getAdaptedImageUrl(product.image, product.name_en || product.name_dv, product.item_code)} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                        ) : (
                          <Package className="h-12 w-12 text-muted-foreground/40" />
                        )}
                        
                        <div className="absolute top-2 right-2 flex items-center gap-1.5 z-10">
                           <input 
                             type="checkbox" 
                             checked={isSelected} 
                             onChange={() => handleSelectProduct(product.id)}
                             className="h-4 w-4 rounded accent-primary cursor-pointer shadow-sm"
                           />
                           <button 
                             type="button" 
                             onClick={(e) => handleToggleFavorite(product.id, e)}
                             className={cn("p-1.5 rounded-lg bg-black/40 backdrop-blur-md border border-white/20 text-white hover:text-yellow-400 transition-colors", favoriteProductIds.includes(product.id) && "text-yellow-400 fill-yellow-400")}
                           >
                             <Star className={cn("h-3.5 w-3.5", favoriteProductIds.includes(product.id) && "fill-current")} />
                           </button>
                        </div>

                        <div className="absolute top-2 left-2 flex items-center gap-1 z-10">
                           <DropdownMenu>
                             <DropdownMenuTrigger asChild>
                               <Button variant="ghost" size="icon" className="h-7 w-7 bg-black/30 text-white hover:bg-black/50 backdrop-blur-md border border-white/20 rounded-lg">
                                 <MoreVertical className="h-4 w-4" />
                               </Button>
                             </DropdownMenuTrigger>
                             <DropdownMenuContent className="bg-card border-border text-foreground !z-[110]" dir="rtl">
                               <DropdownMenuItem onClick={() => handleEditClick(product)} className="gap-2 text-right justify-end hover:bg-muted cursor-pointer font-bold text-xs">
                                 {renderBoth('edit')} <Edit2 className="h-4 w-4 text-blue-400" />
                               </DropdownMenuItem>
                               <DropdownMenuItem onClick={() => handleDeleteProduct(product.id)} className="gap-2 text-right justify-end hover:bg-red-500/10 text-red-500 cursor-pointer font-bold text-xs">
                                 {renderBoth('delete')} <Trash2 className="h-4 w-4" />
                               </DropdownMenuItem>
                             </DropdownMenuContent>
                           </DropdownMenu>
                        </div>

                        {/* Status Badges Overlay */}
                        <div className="absolute bottom-2 right-2 flex flex-wrap gap-1 z-10 pointer-events-none">
                          {neverSold ? (
                            <span className="bg-purple-600/90 text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow-sm">
                              Never Sold
                            </span>
                          ) : unsold30d ? (
                            <span className="bg-amber-600/90 text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow-sm">
                              Unsold &gt;30d
                            </span>
                          ) : null}
                          {isMinusStock ? (
                            <span className="bg-red-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow-sm animate-pulse">
                              Minus Stock
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <div className="p-3 text-right cursor-pointer" onClick={() => handleEditClick(product)}>
                         <h3 className="text-xs sm:text-sm font-black text-foreground leading-tight mb-0.5 truncate">{product.name_dv}</h3>
                         <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider truncate font-mono">{product.name_en}</p>
                         
                         <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-border/50">
                            <div className="text-right">
                              <span className="text-xs sm:text-sm font-black text-primary font-mono">{settings.shop.currency} {product.price.toFixed(2)}</span>
                              {product.cost_price && product.cost_price > 0 ? (
                                <span className="text-[9px] font-bold text-muted-foreground block font-mono">
                                  Cost: {settings.shop.currency} {product.cost_price.toFixed(2)}
                                </span>
                              ) : (
                                <span className="text-[8px] text-muted-foreground/60 block">No Cost Set</span>
                              )}
                            </div>
                            <div className="flex flex-col items-end">
                              <span className={cn(
                                "text-[10px] font-black px-1.5 py-0.5 rounded-md font-mono",
                                isMinusStock 
                                  ? "bg-red-500/20 text-red-500 border border-red-500/30" 
                                  : currentStock < 10 
                                    ? "bg-orange-500/15 text-orange-500" 
                                    : "bg-muted text-muted-foreground"
                              )}>
                                {currentStock} PCS
                              </span>
                              {neverUpdated && (
                                <span className="text-[8px] text-zinc-400 mt-0.5 font-bold">Unstocked</span>
                              )}
                            </div>
                         </div>
                      </div>
                   </CardContent>
                 </Card>
               );
            })}
          </div>
        ) : (
          <Card className="bg-card border-border rounded-3xl overflow-hidden mb-6 shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-right" dir="rtl">
                <thead>
                  <tr className="border-b border-border bg-muted/70 select-none">
                    <th className="p-3.5 text-center w-12">
                      <input 
                        type="checkbox" 
                        checked={isAllFilteredSelected} 
                        onChange={handleSelectAllFiltered}
                        className="h-4 w-4 rounded accent-primary cursor-pointer"
                        title="Select All"
                      />
                    </th>
                    <th 
                      onClick={() => handleToggleSort('name')}
                      className="p-3.5 text-[10px] font-black text-muted-foreground uppercase tracking-widest cursor-pointer hover:text-primary transition-colors group"
                      title="Sort by Name"
                    >
                      <div className="flex items-center gap-1.5 justify-end">
                        <span>Product Item</span>
                        {getSortIcon('name')}
                      </div>
                    </th>
                    <th 
                      onClick={() => handleToggleSort('activity')}
                      className="p-3.5 text-[10px] font-black text-muted-foreground uppercase tracking-widest cursor-pointer hover:text-primary transition-colors group"
                      title="Sort by Status / Activity"
                    >
                      <div className="flex items-center gap-1.5 justify-end">
                        <span>Status / Activity</span>
                        {getSortIcon('activity')}
                      </div>
                    </th>
                    <th 
                      onClick={() => handleToggleSort('code')}
                      className="p-3.5 text-[10px] font-black text-muted-foreground uppercase tracking-widest cursor-pointer hover:text-primary transition-colors group"
                      title="Sort by Item Code"
                    >
                      <div className="flex items-center gap-1.5 justify-end">
                        <span>Item Code</span>
                        {getSortIcon('code')}
                      </div>
                    </th>
                    <th 
                      onClick={() => handleToggleSort('price')}
                      className="p-3.5 text-[10px] font-black text-muted-foreground uppercase tracking-widest cursor-pointer hover:text-primary transition-colors group"
                      title="Sort by Price"
                    >
                      <div className="flex items-center gap-1.5 justify-end">
                        <span>Selling / Cost</span>
                        {getSortIcon('price')}
                      </div>
                    </th>
                    <th 
                      onClick={() => handleToggleSort('stock')}
                      className="p-3.5 text-[10px] font-black text-muted-foreground uppercase tracking-widest cursor-pointer hover:text-primary transition-colors group"
                      title="Sort by Stock Level"
                    >
                      <div className="flex items-center gap-1.5 justify-end">
                        <span>Stock Level</span>
                        {getSortIcon('stock')}
                      </div>
                    </th>
                    <th className="p-3.5 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-center w-24">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {displayProducts.map((product) => {
                    const isSelected = selectedProductIds.includes(product.id);
                    const neverSold = isNeverSold(product.id);
                    const unsold30d = isUnsoldIn30Days(product.id);
                    const currentStock = Number(product.stock_shop) || 0;
                    const isMinusStock = currentStock < 0;

                    return (
                      <tr key={product.id} className={cn("hover:bg-muted/40 transition-colors", isSelected && "bg-primary/5")}>
                        <td className="p-3.5 text-center">
                          <input 
                            type="checkbox" 
                            checked={isSelected} 
                            onChange={() => handleSelectProduct(product.id)}
                            className="h-4 w-4 rounded accent-primary cursor-pointer"
                          />
                        </td>
                        <td className="p-3.5">
                          <div className="flex items-center gap-3 justify-end">
                            <div className="text-right">
                              <p className="font-black text-foreground text-sm">{product.name_dv}</p>
                              <p className="text-xs font-bold text-muted-foreground font-mono">{product.name_en}</p>
                            </div>
                            <div className="h-10 w-10 rounded-xl bg-muted border border-border flex items-center justify-center overflow-hidden shrink-0">
                               {product.image ? <img src={getAdaptedImageUrl(product.image, product.name_en || product.name_dv, product.item_code)} className="w-full h-full object-cover" /> : <Package className="h-4 w-4 text-muted-foreground/50" />}
                            </div>
                          </div>
                        </td>
                        <td className="p-3.5">
                          <div className="flex flex-wrap gap-1 justify-end">
                            {neverSold ? (
                              <Badge className="bg-purple-500/15 text-purple-400 border-purple-500/30 text-[9px] font-black">
                                Never Sold (ނުވިކޭ)
                              </Badge>
                            ) : unsold30d ? (
                              <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30 text-[9px] font-black">
                                Unsold &gt;30d
                              </Badge>
                            ) : (
                              <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[9px] font-black">
                                Active Seller
                              </Badge>
                            )}
                            {isNeverUpdatedStock(product) && (
                              <Badge className="bg-zinc-500/20 text-zinc-300 border-zinc-500/30 text-[9px] font-black">
                                Never Stocked
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="p-3.5 font-mono text-xs text-muted-foreground">{product.item_code}</td>
                        <td className="p-3.5">
                          <div className="font-black text-primary font-mono text-sm">
                            {settings.shop.currency} {product.price.toFixed(2)}
                          </div>
                          {product.cost_price && product.cost_price > 0 && (
                            <div className="text-[10px] text-muted-foreground font-bold font-mono">
                              Cost: {settings.shop.currency} {product.cost_price.toFixed(2)}
                            </div>
                          )}
                        </td>
                        <td className="p-3.5">
                           <Badge className={cn(
                             "font-mono font-black text-xs px-2.5 py-0.5 rounded-lg border",
                             isMinusStock 
                               ? "bg-red-500/20 text-red-500 border-red-500/40 animate-pulse" 
                               : currentStock < 10 
                                 ? "bg-orange-500/20 text-orange-400 border-orange-500/30" 
                                 : "bg-muted text-foreground border-border"
                           )}>
                              {currentStock} PCS
                           </Badge>
                        </td>
                        <td className="p-3.5">
                          <div className="flex justify-center gap-1.5">
                             <Button variant="ghost" size="icon" onClick={() => handleEditClick(product)} className="h-8 w-8 text-blue-400 hover:bg-blue-500/10 rounded-lg"><Edit2 className="h-4 w-4" /></Button>
                             <Button variant="ghost" size="icon" onClick={() => handleDeleteProduct(product.id)} className="h-8 w-8 text-red-400 hover:bg-red-500/10 rounded-lg"><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {visibleCount < filteredProducts.length && (
          <div className="flex justify-center py-6">
            <Button 
              onClick={() => setVisibleCount(prev => prev + 30)}
              variant="outline"
              className="bg-muted border-border hover:bg-muted/80 px-8 h-11 rounded-xl text-xs font-black uppercase tracking-widest"
            >
              Load More Products ({filteredProducts.length - visibleCount} remaining)
            </Button>
          </div>
        )}
      </ScrollArea>

      {/* Main Admin Bulk Delete Confirmation Modal */}
      <Dialog open={isBulkDeleteDialogOpen} onOpenChange={setIsBulkDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[480px] w-[calc(100vw-2rem)] max-h-[90vh] overflow-y-auto font-faruma bg-card text-foreground border border-border text-right p-6 sm:p-7 shadow-2xl rounded-3xl box-border [&>button]:left-4 [&>button]:right-auto" dir="rtl">
          <DialogHeader className="pb-3 text-right space-y-2 border-b border-border/60 pl-10">
            <DialogTitle className="text-xl font-black text-red-500 flex items-center justify-end gap-2.5">
              <span>Bulk Delete Confirmation (ޑިލީޓް ކުރުމުގެ ހުއްދަ)</span>
              <ShieldAlert className="h-6 w-6 text-red-500 shrink-0" />
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs leading-relaxed text-right pt-1">
              You are about to permanently delete <strong className="text-foreground">{selectedProductIds.length}</strong> selected products from the inventory database. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="p-4 bg-red-500/10 border border-red-500/25 rounded-2xl my-2 text-right space-y-2">
            <div className="flex items-center justify-between text-xs font-black text-red-500">
              <span className="font-mono">{selectedProductIds.length} Products</span>
              <span>Total To Delete:</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-normal">
              Any future sales reports will keep past aggregated totals, but these products will no longer appear in the POS or stock tabs.
            </p>
          </div>

          <DialogFooter className="flex sm:flex-row flex-row-reverse gap-3 mt-3 pt-3 border-t border-border space-x-0 sm:space-x-0 w-full">
            <Button
              type="button"
              variant="destructive"
              onClick={handleExecuteBulkDelete}
              disabled={isBulkDeleting}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white font-black h-11 rounded-xl shadow-lg shadow-red-600/20 text-xs uppercase gap-2"
            >
              <Trash2 className="h-4 w-4" />
              <span>{isBulkDeleting ? 'Deleting Products...' : `Yes, Delete ${selectedProductIds.length} Products`}</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsBulkDeleteDialogOpen(false)}
              className="flex-1 text-muted-foreground hover:text-foreground h-11 rounded-xl border-border text-xs font-bold"
            >
              Cancel (ކެންސަލް)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ProductDialog 
        isOpen={isDialogOpen} 
        onClose={() => setIsDialogOpen(false)} 
        product={editingProduct} 
        onSave={handleSaveProduct} 
      />
      
      <ExcelImportDialog
        isOpen={isImportDialogOpen}
        onClose={() => setIsImportDialogOpen(false)}
      />
    </div>
  );
};

export default Products;