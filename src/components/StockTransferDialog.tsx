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
            <DialogContent className="sm:max-w-[500px] font-faruma bg-card border-border text-foreground shadow-2xl" dir="rtl">
                <DialogHeader className="text-right">
                    <DialogTitle className="text-2xl font-black flex items-center justify-end gap-3">
                        {renderBoth('transfer_stock')}
                        <ArrowRightLeft className="h-6 w-6 text-primary" />
                    </DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                        {stockItem.name_dv} ({stockItem.name_en})
                    </DialogDescription>
                </DialogHeader>

                <div className="py-8 space-y-8">
                    {/* Direction Toggle */}
                    <div className="grid grid-cols-2 gap-3 bg-muted p-1.5 rounded-2xl border border-border">
                        <Button
                            variant={direction === 'to_godown' ? 'default' : 'ghost'}
                            onClick={() => setDirection('to_godown')}
                            className={cn(
                                "flex items-center gap-2 h-12 rounded-xl text-[10px] font-black uppercase tracking-widest",
                                direction === 'to_godown' ? "bg-primary text-foreground shadow-lg" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <Store className="h-4 w-4" /> {renderBoth('shop')} <ArrowRight className="h-3 w-3" /> <Warehouse className="h-4 w-4" />
                        </Button>
                        <Button
                            variant={direction === 'to_shop' ? 'default' : 'ghost'}
                            onClick={() => setDirection('to_shop')}
                            className={cn(
                                "flex items-center gap-2 h-12 rounded-xl text-[10px] font-black uppercase tracking-widest",
                                direction === 'to_shop' ? "bg-primary text-foreground shadow-lg" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <Warehouse className="h-4 w-4" /> {renderBoth('godown')} <ArrowRight className="h-3 w-3" /> <Store className="h-4 w-4" />
                        </Button>
                    </div>

                    {/* Stock Info Cards */}
                    <div className="flex justify-between items-center gap-4">
                        <div className={cn(
                            "flex-1 p-5 rounded-2xl border transition-all text-center",
                            direction === 'to_godown' ? "bg-primary/10 border-primary/30" : "bg-muted border-border opacity-40"
                        )}>
                            <p className="text-[10px] font-black text-foreground/30 uppercase tracking-widest mb-1">{renderBoth('shop_stock')}</p>
                            <p className="text-3xl font-black text-foreground">{stockItem.stock_shop}</p>
                        </div>
                        
                        <div className="flex flex-col items-center gap-2">
                            <ArrowRightLeft className={cn("h-6 w-6 text-primary", direction === 'to_shop' && "rotate-180 transition-transform")} />
                        </div>

                        <div className={cn(
                            "flex-1 p-5 rounded-2xl border transition-all text-center",
                            direction === 'to_shop' ? "bg-primary/10 border-primary/30" : "bg-muted border-border opacity-40"
                        )}>
                            <p className="text-[10px] font-black text-foreground/30 uppercase tracking-widest mb-1">{renderBoth('godown_stock')}</p>
                            <p className="text-3xl font-black text-foreground">{stockItem.stock_godown}</p>
                        </div>
                    </div>

                    {/* Transfer Amount Input */}
                    <div className="space-y-3">
                        <Label className="text-right block text-[10px] font-black uppercase text-muted-foreground tracking-widest pr-2">
                           {renderBoth('transfer_amount')}*
                        </Label>
                        <div className="relative">
                            <ArrowRightLeft className="absolute right-4 top-1/2 -translate-y-1/2 h-6 w-6 text-primary/40" />
                            <Input
                                type="number"
                                value={transferAmount}
                                onChange={(e) => setTransferAmount(e.target.value)}
                                className={cn(
                                    "bg-muted h-16 rounded-2xl pr-14 text-3xl font-black text-foreground focus:ring-0 text-right transition-all",
                                    !isValid && currentAmount > 0 ? "border-red-500/50" : "border-primary"
                                )}
                                placeholder="0"
                                max={maxAmount}
                                autoFocus
                            />
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-muted-foreground/50 uppercase tracking-widest">
                               Max: {maxAmount}
                            </div>
                        </div>
                        {!isValid && currentAmount > maxAmount && (
                            <p className="text-[10px] text-red-500 text-right font-black uppercase tracking-widest">Insufficient stock in source location</p>
                        )}
                    </div>
                </div>

                <DialogFooter className="gap-3 pt-4 border-t border-border">
                    <Button variant="ghost" onClick={onClose} className="flex-1 h-12 border-border hover:bg-muted text-foreground font-black uppercase tracking-widest">
                        {renderBoth('cancel')}
                    </Button>
                    <Button 
                        onClick={handleTransfer} 
                        disabled={!isValid}
                        className="flex-1 h-12 bg-primary hover:bg-primary/90 font-black uppercase tracking-widest shadow-[0_0_20px_rgba(0,132,255,0.3)]"
                    >
                        {renderBoth('confirm_transfer')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default StockTransferDialog;
