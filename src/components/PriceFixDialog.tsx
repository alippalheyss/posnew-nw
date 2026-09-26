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
            <DialogContent className="sm:max-w-[500px] font-faruma apple-glass-dialog border-white/20 dark:border-white/10 text-foreground shadow-2xl rounded-3xl p-6 sm:p-7" dir="rtl">
                <DialogHeader className="text-right pb-3 border-b border-white/10">
                    <div className="flex items-center gap-2 justify-end">
                        <DialogTitle className="text-right text-xl font-black text-orange-500 flex items-center gap-2">
                            <span>{t('price_update_required')}</span>
                            <AlertTriangle className="h-6 w-6 text-orange-500" />
                        </DialogTitle>
                    </div>
                    <DialogDescription className="text-right text-xs text-muted-foreground font-bold mt-1">
                        {t('cost_price_increased_update_selling_price')}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Product Info */}
                    <div className="bg-white/5 dark:bg-black/20 p-4 rounded-2xl border border-white/10 backdrop-blur-md">
                        <p className="text-right font-black text-lg text-foreground mb-1">{priceUpdate.product.name_dv}</p>
                        <p className="text-right text-xs text-muted-foreground font-mono">{priceUpdate.product.name_en}</p>
                    </div>

                    {/* Price Comparison */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-red-500/10 border border-red-500/25 p-3.5 rounded-2xl backdrop-blur-md text-center">
                            <Label className="text-xs text-red-400 block text-right font-bold mb-1">{t('current_selling_price')}</Label>
                            <p className="text-right font-mono font-black text-lg text-red-400">
                                MVR {priceUpdate.currentSellingPrice.toFixed(2)}
                            </p>
                        </div>
                        <div className="bg-blue-500/10 border border-blue-500/25 p-3.5 rounded-2xl backdrop-blur-md text-center">
                            <Label className="text-xs text-blue-400 block text-right font-bold mb-1">{t('new_cost_price')}</Label>
                            <p className="text-right font-mono font-black text-lg text-blue-400">
                                MVR {priceUpdate.newCostPrice.toFixed(2)}
                            </p>
                        </div>
                    </div>

                    {/* New Selling Price Input */}
                    <div className="space-y-2">
                        <Label className="text-right block font-black text-xs uppercase text-foreground">{t('new_selling_price')}*</Label>
                        <Input
                            type="number"
                            value={newPrice}
                            onChange={(e) => setNewPrice(e.target.value)}
                            className="apple-glass-input text-right h-13 text-xl font-mono font-black rounded-2xl"
                            dir="ltr"
                            autoFocus
                        />
                        <div className="flex justify-between items-center text-xs px-1">
                            <span className={profitMargin < 10 ? "text-red-400 font-bold" : profitMargin < 20 ? "text-amber-400 font-bold" : "text-emerald-400 font-bold"}>
                                {t('profit_margin')}: {profitMargin.toFixed(1)}%
                            </span>
                            <span className="text-muted-foreground font-bold">
                                {t('minimum_recommended')}: MVR {priceUpdate.recommendedSellingPrice.toFixed(2)}
                            </span>
                        </div>
                    </div>

                    {/* Warning if still below minimum */}
                    {parseFloat(newPrice) < priceUpdate.recommendedSellingPrice && (
                        <div className="bg-amber-500/15 border border-amber-500/30 p-3 rounded-2xl text-xs text-amber-300 font-bold text-right backdrop-blur-md">
                            ⚠️ {t('price_below_minimum_margin')}
                        </div>
                    )}
                </div>

                <DialogFooter className="gap-2.5 pt-3 border-t border-white/10 flex flex-row">
                    <Button variant="outline" onClick={onCancel} className="flex-1 h-11 border-white/20 dark:border-white/10 hover:bg-white/10 text-foreground font-bold text-xs rounded-2xl">
                        {t('skip')}
                    </Button>
                    <Button onClick={handleConfirm} className="flex-1 h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs rounded-2xl shadow-lg shadow-primary/25 uppercase">
                        {t('update_price')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default PriceFixDialog;
