import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Gift } from "lucide-react";

interface LoyaltyRedemptionDialogProps {
    isOpen: boolean;
    onClose: () => void;
    availablePoints: number;
    maxRedeemableAmount: number;
    onRedeem: (points: number) => void;
}

const LoyaltyRedemptionDialog: React.FC<LoyaltyRedemptionDialogProps> = ({
    isOpen,
    onClose,
    availablePoints,
    maxRedeemableAmount,
    onRedeem
}) => {
    const { t } = useTranslation();
    const [redeemAmount, setRedeemAmount] = useState<string>('');

    // Reset when opened
    useEffect(() => {
        if (isOpen) {
            setRedeemAmount('');
        }
    }, [isOpen]);

    const handleRedeem = () => {
        const points = parseInt(redeemAmount);
        if (!isNaN(points) && points > 0 && points <= availablePoints) {
            onRedeem(points);
            onClose();
        }
    };

    const handleMaxClick = () => {
        // Max points user can use is limited by their balance AND the cart total
        const maxUse = Math.min(availablePoints, maxRedeemableAmount);
        setRedeemAmount(maxUse.toString());
    };

    const currentPoints = parseInt(redeemAmount) || 0;
    const isValid = currentPoints > 0 && currentPoints <= availablePoints && currentPoints <= maxRedeemableAmount;

    const renderBoth = (key: string, options?: any) => (
        <>
            {t(key, options)} ({t(key, { ...options, lng: 'en' })})
        </>
    );

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[400px] font-faruma" dir="rtl">
                <DialogHeader>
                    <DialogTitle className="text-right flex items-center justify-end gap-2">
                        {renderBoth('redeem_loyalty_points')}
                        <Gift className="h-5 w-5 text-primary" />
                    </DialogTitle>
                    <DialogDescription className="text-right">
                        {renderBoth('enter_points_to_redeem')}
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-4">
                    <div className="bg-primary/10 p-4 rounded-lg text-center">
                        <p className="text-sm text-gray-500 mb-1">{renderBoth('available_points')}</p>
                        <p className="text-3xl font-black text-primary">{availablePoints}</p>
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <Label htmlFor="points" className="text-sm font-bold text-gray-700">
                                {renderBoth('points_to_use')}
                            </Label>
                            <span className="text-xs text-gray-400">1 Point = {1} MVR</span>
                        </div>
                        <div className="flex gap-2">
                            <Input
                                id="points"
                                type="number"
                                value={redeemAmount}
                                onChange={(e) => setRedeemAmount(e.target.value)}
                                className="text-right text-lg font-bold"
                                placeholder="0"
                                autoFocus
                            />
                            <Button onClick={handleMaxClick} variant="secondary" className="font-bold">
                                {renderBoth('all')}
                            </Button>
                        </div>
                        {currentPoints > maxRedeemableAmount && (
                            <p className="text-xs text-red-500 text-right font-semibold">
                                {renderBoth('cannot_exceed_cart_total')} ({maxRedeemableAmount})
                            </p>
                        )}
                    </div>
                </div>

                <DialogFooter className="flex justify-between sm:justify-between gap-2">
                    <Button variant="outline" onClick={onClose} className="flex-1">
                        {renderBoth('cancel')}
                    </Button>
                    <Button
                        onClick={handleRedeem}
                        disabled={!isValid}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    >
                        {renderBoth('apply_discount')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default LoyaltyRedemptionDialog;
