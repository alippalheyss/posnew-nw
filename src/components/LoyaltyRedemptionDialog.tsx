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

    const loyaltyPointsValue = settings.general.loyaltyPointsValue || 10;
    const loyaltyMinRedeemPoints = settings.general.loyaltyMinRedeemPoints || 10;
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
        const maxPointsForCart = Math.floor(maxRedeemableAmount * loyaltyPointsValue);
        const maxUse = Math.min(availablePoints, maxPointsForCart);
        setRedeemAmount(maxUse.toString());
    };

    const currentPoints = parseInt(redeemAmount) || 0;
    const currentDiscountValue = currentPoints / loyaltyPointsValue;
    const isValid = currentPoints >= Math.min(loyaltyMinRedeemPoints, availablePoints) && currentPoints <= availablePoints && currentDiscountValue <= (maxRedeemableAmount + 0.01) && currentPoints > 0;

    const renderBoth = (key: string, options?: any) => (
        <>
            {t(key, options)} ({t(key, { ...options, lng: 'en' })})
        </>
    );

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[30rem] 2xl:max-w-[36rem] w-[calc(100vw-2rem)] font-faruma apple-glass-dialog border-white/20 dark:border-white/10 text-foreground p-6 sm:p-7 shadow-2xl rounded-3xl" dir="rtl">
                <DialogHeader className="text-right pb-3 border-b border-white/10">
                    <DialogTitle className="text-xl font-black flex items-center justify-end gap-2 text-foreground">
                        <span>{renderBoth('redeem_loyalty_points')}</span>
                        <Gift className="h-5 w-5 text-amber-500 shrink-0" />
                    </DialogTitle>
                    <DialogDescription className="text-right text-xs text-muted-foreground mt-0.5 font-bold">
                        {renderBoth('enter_points_to_redeem')}
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-4">
                    <div className="bg-amber-500/15 border border-amber-500/30 p-5 rounded-2xl text-center backdrop-blur-md shadow-lg shadow-amber-500/10">
                        <p className="text-xs font-bold text-muted-foreground mb-1">{renderBoth('available_points')}</p>
                        <p className="text-3xl font-black text-amber-500 font-mono">{availablePoints} <span className="text-sm font-normal">PTS</span></p>
                        <p className="text-xs font-bold text-muted-foreground/80 mt-1">
                          Value: {currency} {(availablePoints / loyaltyPointsValue).toFixed(2)}
                        </p>
                    </div>

                    <div className="space-y-2.5">
                        <div className="flex justify-between items-center px-1">
                            <Label htmlFor="points" className="text-xs font-black text-foreground">
                                {renderBoth('points_to_use')}
                            </Label>
                            <span className="text-xs font-mono font-bold text-primary">{loyaltyPointsValue} Points = 1.00 {currency}</span>
                        </div>
                        <div className="flex gap-2">
                            <Input
                                id="points"
                                type="number"
                                min="1"
                                max={availablePoints}
                                value={redeemAmount}
                                onChange={(e) => setRedeemAmount(e.target.value)}
                                className="apple-glass-input text-right text-lg font-mono font-black h-12 rounded-2xl"
                                placeholder={Math.min(loyaltyMinRedeemPoints, availablePoints).toString()}
                                autoFocus
                            />
                            <Button onClick={handleMaxClick} variant="outline" className="font-black h-12 px-5 rounded-2xl border-white/20 dark:border-white/10 hover:bg-white/10 shrink-0">
                                {renderBoth('all')}
                            </Button>
                        </div>
                        <div className="space-y-1 mt-1">
                            {currentPoints > 0 && (
                                <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-2xl flex items-center justify-between text-xs font-bold text-emerald-400 backdrop-blur-md">
                                    <span>Discount Amount:</span>
                                    <span className="text-base font-black font-mono">- {currency} {currentDiscountValue.toFixed(2)}</span>
                                </div>
                            )}
                            {currentDiscountValue > maxRedeemableAmount + 0.01 && (
                                <p className="text-xs text-red-500 text-right font-bold">
                                    {renderBoth('cannot_exceed_cart_total')}
                                </p>
                            )}
                            {currentPoints > 0 && currentPoints < loyaltyMinRedeemPoints && availablePoints >= loyaltyMinRedeemPoints && (
                                <p className="text-xs text-orange-500 text-right font-bold">
                                    Minimum {loyaltyMinRedeemPoints} points required
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                <DialogFooter className="flex flex-row justify-between gap-3 pt-3 border-t border-white/10">
                    <Button variant="outline" onClick={onClose} className="flex-1 h-11 rounded-2xl font-bold border-white/20 dark:border-white/10 hover:bg-white/10 text-foreground">
                        {renderBoth('cancel')}
                    </Button>
                    <Button
                        onClick={handleRedeem}
                        disabled={!isValid}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black h-11 rounded-2xl shadow-lg shadow-emerald-600/25 transition-all disabled:opacity-50"
                    >
                        {renderBoth('apply_discount')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default LoyaltyRedemptionDialog;
