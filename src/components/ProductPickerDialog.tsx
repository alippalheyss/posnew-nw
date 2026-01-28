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
            <DialogContent className="sm:max-w-[700px] max-h-[80vh] font-faruma" dir="rtl">
                <DialogHeader>
                    <DialogTitle className="text-right text-xl font-bold flex items-center justify-end gap-2">
                        <Package className="h-5 w-5" />
                        {t('select_products')}
                    </DialogTitle>
                </DialogHeader>

                {/* Search Input */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                        placeholder={t('search_by_name_code_barcode')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="text-right h-11 pl-10"
                        autoFocus
                    />
                </div>

                {/* Selected Count */}
                <div className="text-right text-sm text-gray-600">
                    {t('selected')}: <span className="font-bold text-primary">{selectedProductIds.size}</span> {t('products')}
                </div>

                {/* Product List */}
                <ScrollArea className="h-[400px] border rounded-lg">
                    <div className="p-2 space-y-1">
                        {filteredProducts.length === 0 ? (
                            <div className="text-center py-10 text-gray-400">
                                {t('no_products_found')}
                            </div>
                        ) : (
                            filteredProducts.map((product) => (
                                <div
                                    key={product.id}
                                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${selectedProductIds.has(product.id)
                                            ? 'bg-primary/10 border-primary'
                                            : 'bg-white hover:bg-gray-50 border-gray-200'
                                        }`}
                                    onClick={() => toggleProduct(product.id)}
                                >
                                    <Checkbox
                                        checked={selectedProductIds.has(product.id)}
                                        onCheckedChange={() => toggleProduct(product.id)}
                                    />
                                    <div className="flex-1 text-right">
                                        <div className="font-bold text-sm">{product.name_dv}</div>
                                        <div className="text-xs text-gray-600">{product.name_en}</div>
                                        <div className="text-xs text-gray-500 mt-1">
                                            {t('item_code')}: {product.item_code} | {t('barcode')}: {product.barcode}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm font-mono font-bold text-primary">
                                            {product.price.toFixed(2)}
                                        </div>
                                        <div className="text-xs text-gray-500">{t('selling_price')}</div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </ScrollArea>

                <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={handleClose} className="flex-1">
                        {t('cancel')}
                    </Button>
                    <Button
                        onClick={handleAddSelected}
                        disabled={selectedProductIds.size === 0}
                        className="flex-1 bg-primary"
                    >
                        {t('add_selected')} ({selectedProductIds.size})
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default ProductPickerDialog;
