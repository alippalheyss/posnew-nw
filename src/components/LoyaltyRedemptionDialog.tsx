import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Gift } from "lucide-react";
import { useAppContext } from "@/context/AppContext";

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
    const { settings } = useAppContext();
    const [redeemAmount, setRedeemAmount] = useState<string>('');

    const loyaltyPointsValue = settings.general.loyaltyPointsValue || 100;
    const loyaltyMinRedeemPoints = settings.general.loyaltyMinRedeemPoints || 1000;
    const currency = settings.shop.currency;

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
        // Max points user can use is limited by their balance AND the cart total (which is in currency, so we convert maxRedeemableAmount to points)
        const maxPointsForCart = maxRedeemableAmount * loyaltyPointsValue;
        const maxUse = Math.min(availablePoints, maxPointsForCart);
        setRedeemAmount(maxUse.toString());
    };

    const currentPoints = parseInt(redeemAmount) || 0;
    const currentDiscountValue = currentPoints / loyaltyPointsValue;
    const isValid = currentPoints >= loyaltyMinRedeemPoints && currentPoints <= availablePoints && currentDiscountValue <= maxRedeemableAmount;

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
                        <p className="text-sm text-black dark:text-foreground mb-1">{renderBoth('available_points')}</p>
                        <p className="text-3xl font-black text-primary">{availablePoints}</p>
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <Label htmlFor="points" className="text-sm font-bold text-black dark:text-foreground ">
                                {renderBoth('points_to_use')}
                            </Label>
                            <span className="text-xs font-bold text-primary">{loyaltyPointsValue} Points = 1 {currency}</span>
                        </div>
                        <div className="flex gap-2">
                            <Input
                                id="points"
                                type="number"
                                value={redeemAmount}
                                onChange={(e) => setRedeemAmount(e.target.value)}
                                className="text-right text-lg font-bold"
                                placeholder={loyaltyMinRedeemPoints.toString()}
                                autoFocus
                            />
                            <Button onClick={handleMaxClick} variant="secondary" className="font-bold">
                                {renderBoth('all')}
                            </Button>
                        </div>
                        <div className="flex justify-between items-center mt-1">
                            {currentPoints > 0 && (
                                <p className="text-sm font-bold text-green-500">
                                    Discount: {currency} {currentDiscountValue.toFixed(2)}
                                </p>
                            )}
                            {currentDiscountValue > maxRedeemableAmount && (
                                <p className="text-xs text-red-500 text-right font-semibold">
                                    {renderBoth('cannot_exceed_cart_total')}
                                </p>
                            )}
                            {currentPoints > 0 && currentPoints < loyaltyMinRedeemPoints && (
                                <p className="text-xs text-orange-500 text-right font-semibold">
                                    Minimum {loyaltyMinRedeemPoints} points required
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                <DialogFooter className="flex justify-between sm:justify-between gap-2">
                    <Button variant="outline" onClick={onClose} className="flex-1">
                        {renderBoth('cancel')}
                    </Button>
                    <Button
                        onClick={handleRedeem}
                        disabled={!isValid}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-foreground"
                    >
                        {renderBoth('apply_discount')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default LoyaltyRedemptionDialog;
