import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle } from 'lucide-react';
import { ProductPriceUpdate } from '@/context/AppContext';

interface PriceFixDialogProps {
    isOpen: boolean;
    priceUpdate: ProductPriceUpdate | null;
    onConfirm: (productId: string, newPrice: number) => void;
    onCancel: () => void;
}

const PriceFixDialog: React.FC<PriceFixDialogProps> = ({ isOpen, priceUpdate, onConfirm, onCancel }) => {
    const { t } = useTranslation();
    const [newPrice, setNewPrice] = useState<string>('');

    React.useEffect(() => {
        if (priceUpdate) {
            setNewPrice(priceUpdate.recommendedSellingPrice.toFixed(2));
        }
    }, [priceUpdate]);

    if (!priceUpdate) return null;

    const handleConfirm = () => {
        const price = parseFloat(newPrice);
        if (price > 0) {
            onConfirm(priceUpdate.product.id, price);
        }
    };

    const profitMargin = ((parseFloat(newPrice) - priceUpdate.newCostPrice) / priceUpdate.newCostPrice * 100);

    return (
        <Dialog open={isOpen} onOpenChange={onCancel}>
            <DialogContent className="sm:max-w-[500px] font-faruma" dir="rtl">
                <DialogHeader>
                    <div className="flex items-center gap-2 justify-end">
                        <AlertTriangle className="h-6 w-6 text-orange-500" />
                        <DialogTitle className="text-right text-xl font-bold text-orange-600">
                            {t('price_update_required')}
                        </DialogTitle>
                    </div>
                    <DialogDescription className="text-right text-sm">
                        {t('cost_price_increased_update_selling_price')}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Product Info */}
                    <div className="bg-gray-50 p-3 rounded-lg border">
                        <p className="text-right font-bold text-lg mb-1">{priceUpdate.product.name_dv}</p>
                        <p className="text-right text-sm text-gray-600">{priceUpdate.product.name_en}</p>
                    </div>

                    {/* Price Comparison */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-red-50 border border-red-200 p-3 rounded-lg">
                            <Label className="text-xs text-red-700 block text-right mb-1">{t('current_selling_price')}</Label>
                            <p className="text-right font-mono font-bold text-red-600">
                                MVR {priceUpdate.currentSellingPrice.toFixed(2)}
                            </p>
                        </div>
                        <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
                            <Label className="text-xs text-blue-700 block text-right mb-1">{t('new_cost_price')}</Label>
                            <p className="text-right font-mono font-bold text-blue-600">
                                MVR {priceUpdate.newCostPrice.toFixed(2)}
                            </p>
                        </div>
                    </div>

                    {/* New Selling Price Input */}
                    <div className="space-y-2">
                        <Label className="text-right block font-bold">{t('new_selling_price')}*</Label>
                        <Input
                            type="number"
                            value={newPrice}
                            onChange={(e) => setNewPrice(e.target.value)}
                            className="text-right h-12 text-lg font-mono"
                            dir="ltr"
                            autoFocus
                        />
                        <div className="flex justify-between items-center text-xs">
                            <span className={profitMargin < 10 ? "text-red-600" : profitMargin < 20 ? "text-yellow-600" : "text-green-600"}>
                                {t('profit_margin')}: {profitMargin.toFixed(1)}%
                            </span>
                            <span className="text-gray-500">
                                {t('minimum_recommended')}: MVR {priceUpdate.recommendedSellingPrice.toFixed(2)}
                            </span>
                        </div>
                    </div>

                    {/* Warning if still below minimum */}
                    {parseFloat(newPrice) < priceUpdate.recommendedSellingPrice && (
                        <div className="bg-yellow-50 border border-yellow-300 p-2 rounded text-xs text-yellow-800 text-right">
                            ⚠️ {t('price_below_minimum_margin')}
                        </div>
                    )}
                </div>

                <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={onCancel} className="flex-1">
                        {t('skip')}
                    </Button>
                    <Button onClick={handleConfirm} className="flex-1 bg-primary">
                        {t('update_price')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default PriceFixDialog;
