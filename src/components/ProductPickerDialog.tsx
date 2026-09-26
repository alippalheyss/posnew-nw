import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Package } from 'lucide-react';
import { Product } from '@/context/AppContext';

interface ProductPickerDialogProps {
    isOpen: boolean;
    onClose: () => void;
    products: Product[];
    onAddProducts: (selectedProducts: Product[]) => void;
}

const ProductPickerDialog: React.FC<ProductPickerDialogProps> = ({
    isOpen,
    onClose,
    products,
    onAddProducts
}) => {
    const { t } = useTranslation();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());

    // Filter products by search query
    const filteredProducts = products.filter(p =>
        p.name_dv.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.name_en.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.barcode.includes(searchQuery) ||
        p.item_code.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const toggleProduct = (productId: string) => {
        const newSelected = new Set(selectedProductIds);
        if (newSelected.has(productId)) {
            newSelected.delete(productId);
        } else {
            newSelected.add(productId);
        }
        setSelectedProductIds(newSelected);
    };

    const handleAddSelected = () => {
        const selectedProducts = products.filter(p => selectedProductIds.has(p.id));
        onAddProducts(selectedProducts);
        setSelectedProductIds(new Set());
        setSearchQuery('');
        onClose();
    };

    const handleClose = () => {
        setSelectedProductIds(new Set());
        setSearchQuery('');
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[700px] max-h-[85vh] font-faruma apple-glass-dialog border-white/20 dark:border-white/10 text-foreground shadow-2xl rounded-3xl p-6 sm:p-7 flex flex-col" dir="rtl">
                <DialogHeader className="text-right pb-3 border-b border-white/10 flex-shrink-0">
                    <DialogTitle className="text-right text-xl font-black flex items-center justify-end gap-2 text-foreground">
                        <Package className="h-5 w-5 text-primary" />
                        {t('select_products')}
                    </DialogTitle>
                </DialogHeader>

                {/* Search Input */}
                <div className="relative my-2 flex-shrink-0">
                    <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder={t('search_by_name_code_barcode')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="text-right h-12 pl-10 apple-glass-input rounded-2xl font-bold"
                        autoFocus
                    />
                </div>

                {/* Selected Count */}
                <div className="text-right text-xs text-muted-foreground font-bold flex-shrink-0 px-1">
                    {t('selected')}: <span className="font-black text-primary font-mono text-sm">{selectedProductIds.size}</span> {t('products')}
                </div>

                {/* Product List */}
                <ScrollArea className="flex-1 min-h-[300px] max-h-[420px] rounded-2xl border border-white/10 bg-white/5 dark:bg-black/20 backdrop-blur-md p-2">
                    <div className="p-1 space-y-2">
                        {filteredProducts.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground font-bold text-xs">
                                {t('no_products_found')}
                            </div>
                        ) : (
                            filteredProducts.map((product) => (
                                <div
                                    key={product.id}
                                    className={`flex items-center gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all duration-200 backdrop-blur-sm ${selectedProductIds.has(product.id)
                                            ? 'bg-primary/15 border-primary/50 shadow-md shadow-primary/10'
                                            : 'bg-white/5 dark:bg-white/[0.03] hover:bg-white/10 border-white/5'
                                        }`}
                                    onClick={() => toggleProduct(product.id)}
                                >
                                    <Checkbox
                                        checked={selectedProductIds.has(product.id)}
                                        onCheckedChange={() => toggleProduct(product.id)}
                                    />
                                    <div className="flex-1 text-right min-w-0">
                                        <div className="font-bold text-sm text-foreground truncate">{product.name_dv}</div>
                                        <div className="text-xs text-muted-foreground font-mono truncate">{product.name_en}</div>
                                        <div className="text-[11px] text-muted-foreground/80 mt-0.5 font-mono">
                                            {t('item_code')}: {product.item_code} | {t('barcode')}: {product.barcode}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-base font-mono font-black text-primary">
                                            {product.price.toFixed(2)}
                                        </div>
                                        <div className="text-[10px] text-muted-foreground uppercase font-bold">{t('selling_price')}</div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </ScrollArea>

                <DialogFooter className="gap-2.5 pt-3 border-t border-white/10 flex-shrink-0 flex flex-row">
                    <Button variant="outline" onClick={handleClose} className="flex-1 h-11 border-white/20 dark:border-white/10 hover:bg-white/10 text-foreground font-bold text-xs rounded-2xl">
                        {t('cancel')}
                    </Button>
                    <Button
                        onClick={handleAddSelected}
                        disabled={selectedProductIds.size === 0}
                        className="flex-1 h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs rounded-2xl shadow-lg shadow-primary/25 uppercase"
                    >
                        {t('add_selected')} ({selectedProductIds.size})
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default ProductPickerDialog;
