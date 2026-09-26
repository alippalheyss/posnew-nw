"use client";

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRightLeft, Store, Warehouse, ArrowRight, ArrowLeft } from "lucide-react";
import { Product } from '@/context/AppContext';
import { cn } from '@/lib/utils';

interface StockTransferDialogProps {
    isOpen: boolean;
    onClose: () => void;
    stockItem: Product | null;
    initialDirection?: 'to_godown' | 'to_shop';
    onTransfer: (id: string, from: 'shop' | 'godown', to: 'shop' | 'godown', amount: number) => void;
}

const StockTransferDialog: React.FC<StockTransferDialogProps> = ({
    isOpen,
    onClose,
    stockItem,
    initialDirection = 'to_godown',
    onTransfer
}) => {
    const { t } = useTranslation();
    const [transferAmount, setTransferAmount] = useState<string>('');
    const [direction, setDirection] = useState<'to_godown' | 'to_shop'>(initialDirection);

    useEffect(() => {
        if (isOpen) {
            setTransferAmount('');
            setDirection(initialDirection);
        }
    }, [isOpen, initialDirection]);

    if (!stockItem) return null;

    const handleTransfer = () => {
        const amount = parseInt(transferAmount);
        if (!isNaN(amount) && amount > 0) {
            const from = direction === 'to_godown' ? 'shop' : 'godown';
            const to = direction === 'to_godown' ? 'godown' : 'shop';
            onTransfer(stockItem.id, from, to, amount);
            onClose();
        }
    };

    const renderBoth = (key: string, options?: any) => (
        <>
            {t(key, options)} ({t(key, { ...options, lng: 'en' })})
        </>
    );

    const maxAmount = direction === 'to_godown' ? stockItem.stock_shop : stockItem.stock_godown;
    const currentAmount = parseInt(transferAmount) || 0;
    const isValid = currentAmount > 0 && currentAmount <= maxAmount;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px] w-[calc(100vw-2rem)] max-h-[90vh] overflow-y-auto font-faruma apple-glass-dialog border-white/20 dark:border-white/10 text-foreground shadow-2xl rounded-3xl p-6 sm:p-7 box-border [&>button]:left-4 [&>button]:right-auto" dir="rtl">
                <DialogHeader className="text-right pb-3 space-y-1 border-b border-white/10 pl-10">
                    <DialogTitle className="text-xl font-black flex items-center justify-end gap-2.5">
                        <span>{renderBoth('transfer_stock')}</span>
                        <ArrowRightLeft className="h-5 w-5 text-primary" />
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground font-bold">
                        {stockItem.name_dv} ({stockItem.name_en})
                    </DialogDescription>
                </DialogHeader>

                <div className="py-3 space-y-4">
                    {/* Direction Toggle */}
                    <div className="grid grid-cols-2 gap-2 bg-white/5 dark:bg-black/20 p-1.5 rounded-2xl border border-white/10 backdrop-blur-md">
                        <button
                            type="button"
                            onClick={() => setDirection('to_godown')}
                            className={cn(
                                "flex items-center justify-center gap-2 h-11 rounded-xl text-xs font-black transition-all duration-200",
                                direction === 'to_godown' 
                                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25" 
                                    : "text-muted-foreground hover:text-foreground hover:bg-white/10"
                            )}
                        >
                            <Store className="h-4 w-4" />
                            <span>{t('shop_to_godown')}</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setDirection('to_shop')}
                            className={cn(
                                "flex items-center justify-center gap-2 h-11 rounded-xl text-xs font-black transition-all duration-200",
                                direction === 'to_shop' 
                                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25" 
                                    : "text-muted-foreground hover:text-foreground hover:bg-white/10"
                            )}
                        >
                            <Warehouse className="h-4 w-4" />
                            <span>{t('godown_to_shop')}</span>
                        </button>
                    </div>

                    {/* Stock Info Cards */}
                    <div className="grid grid-cols-2 gap-3 items-center">
                        <div className={cn(
                            "p-3.5 rounded-2xl border transition-all duration-300 text-center",
                            direction === 'to_godown' 
                                ? "bg-primary/15 border-primary/50 shadow-lg shadow-primary/10 backdrop-blur-md" 
                                : "bg-white/5 dark:bg-black/20 border-white/10 opacity-70"
                        )}>
                            <div className="flex items-center justify-center gap-1.5 mb-1">
                                <Store className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">
                                    {renderBoth('shop_stock')}
                                </span>
                            </div>
                            <p className="text-2xl font-black text-foreground font-mono">{stockItem.stock_shop}</p>
                            {direction === 'to_godown' && (
                                <span className="text-[9px] font-black text-primary uppercase tracking-widest mt-1 block">Source (މިތަނުން)</span>
                            )}
                        </div>

                        <div className={cn(
                            "p-3.5 rounded-2xl border transition-all duration-300 text-center",
                            direction === 'to_shop' 
                                ? "bg-primary/15 border-primary/50 shadow-lg shadow-primary/10 backdrop-blur-md" 
                                : "bg-white/5 dark:bg-black/20 border-white/10 opacity-70"
                        )}>
                            <div className="flex items-center justify-center gap-1.5 mb-1">
                                <Warehouse className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">
                                    {renderBoth('godown_stock')}
                                </span>
                            </div>
                            <p className="text-2xl font-black text-foreground font-mono">{stockItem.stock_godown}</p>
                            {direction === 'to_shop' && (
                                <span className="text-[9px] font-black text-primary uppercase tracking-widest mt-1 block">Source (މިތަނުން)</span>
                            )}
                        </div>
                    </div>

                    {/* Transfer Amount Input */}
                    <div className="space-y-1.5">
                        <div className="flex justify-between items-center px-1">
                            <span className="text-[10px] font-black font-mono text-muted-foreground bg-white/10 px-2 py-0.5 rounded-md border border-white/10">
                                Max: {maxAmount}
                            </span>
                            <Label className="text-right block text-xs font-black uppercase text-foreground">
                               {renderBoth('transfer_amount')}*
                            </Label>
                        </div>
                        <div className="relative">
                            <ArrowRightLeft className="absolute right-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-primary/50" />
                            <Input
                                type="number"
                                min="1"
                                max={maxAmount}
                                value={transferAmount}
                                onChange={(e) => setTransferAmount(e.target.value)}
                                className={cn(
                                    "apple-glass-input h-13 rounded-2xl pr-12 text-2xl font-black text-foreground text-right font-mono transition-all",
                                    !isValid && currentAmount > 0 ? "border-red-500/50" : ""
                                )}
                                placeholder="0"
                                autoFocus
                            />
                        </div>
                        {!isValid && currentAmount > maxAmount && (
                            <p className="text-[11px] text-red-500 text-right font-black pt-1">
                                {renderBoth('insufficient_stock')} ({maxAmount})
                            </p>
                        )}
                    </div>
                </div>

                <DialogFooter className="gap-2.5 pt-3 border-t border-white/10 flex flex-row">
                    <Button variant="outline" onClick={onClose} className="flex-1 h-11 border-white/20 dark:border-white/10 hover:bg-white/10 text-foreground font-bold text-xs rounded-2xl">
                        {renderBoth('cancel')}
                    </Button>
                    <Button 
                        onClick={handleTransfer} 
                        disabled={!isValid}
                        className="flex-1 h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs rounded-2xl shadow-lg shadow-primary/25 uppercase"
                    >
                        {renderBoth('confirm_transfer')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default StockTransferDialog;
