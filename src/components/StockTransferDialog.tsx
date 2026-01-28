import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRightLeft, Store, Warehouse } from "lucide-react";
import { Product } from '@/context/AppContext';

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
            <DialogContent className="sm:max-w-[450px] font-faruma" dir="rtl">
                <DialogHeader>
                    <DialogTitle className="text-right flex items-center justify-end gap-2">
                        {renderBoth('transfer_stock')}
                        <ArrowRightLeft className="h-5 w-5 text-primary" />
                    </DialogTitle>
                    <DialogDescription className="text-right">
                        {stockItem.name_dv} ({stockItem.name_en})
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-6">
                    {/* Direction Toggle */}
                    <div className="grid grid-cols-2 gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                        <Button
                            variant={direction === 'to_godown' ? 'default' : 'ghost'}
                            onClick={() => setDirection('to_godown')}
                            className="flex items-center gap-2"
                        >
                            <Store className="h-4 w-4" /> Shop → Godown <Warehouse className="h-4 w-4" />
                        </Button>
                        <Button
                            variant={direction === 'to_shop' ? 'default' : 'ghost'}
                            onClick={() => setDirection('to_shop')}
                            className="flex items-center gap-2"
                        >
                            <Warehouse className="h-4 w-4" /> Godown → Shop <Store className="h-4 w-4" />
                        </Button>
                    </div>

                    {/* Stock Info */}
                    <div className="flex justify-between items-center px-4">
                        <div className="text-center">
                            <p className="text-xs text-gray-500">{renderBoth('shop_stock')}</p>
                            <p className="text-xl font-bold">{stockItem.stock_shop}</p>
                        </div>
                        <ArrowRightLeft className="h-5 w-5 text-gray-400" />
                        <div className="text-center">
                            <p className="text-xs text-gray-500">{renderBoth('godown_stock')}</p>
                            <p className="text-xl font-bold">{stockItem.stock_godown}</p>
                        </div>
                    </div>

                    {/* Amount Input */}
                    <div className="space-y-2">
                        <Label className="text-right block w-full">
                            {renderBoth('transfer_quantity')}
                        </Label>
                        <div className="flex gap-2">
                            <Input
                                type="number"
                                value={transferAmount}
                                onChange={(e) => setTransferAmount(e.target.value)}
                                className="text-right text-lg font-bold"
                                placeholder="0"
                                autoFocus
                                max={maxAmount}
                            />
                            <Button
                                variant="secondary"
                                onClick={() => setTransferAmount(maxAmount.toString())}
                            >
                                {renderBoth('all')}
                            </Button>
                        </div>
                        <p className="text-xs text-gray-500 text-right">
                            {renderBoth('available_to_transfer')}: {maxAmount}
                        </p>
                    </div>
                </div>

                <DialogFooter className="flex justify-between gap-2">
                    <Button variant="outline" onClick={onClose} className="flex-1">
                        {renderBoth('cancel')}
                    </Button>
                    <Button
                        onClick={handleTransfer}
                        disabled={!isValid}
                        className="flex-1"
                    >
                        {renderBoth('confirm_transfer')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default StockTransferDialog;
