"use client";

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Product, useAppContext } from '@/context/AppContext';
import { Boxes, Package } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UnitSelectionDialogProps {
    isOpen: boolean;
    onClose: () => void;
    product: Product | null;
    onSelect: (unit: { name: string, price: number, conversion_factor: number }) => void;
}

const UnitSelectionDialog: React.FC<UnitSelectionDialogProps> = ({ isOpen, onClose, product, onSelect }) => {
    const { t } = useTranslation();
    const { settings } = useAppContext();

    if (!product) return null;

    // Base unit option
    const baseUnit = {
        name: 'Piece',
        price: product.price,
        conversion_factor: 1,
        isBase: true
    };

    const units = [baseUnit, ...(product.units || [])];

    const renderBoth = (key: string, options?: any) => (
        <>
            {t(key, options)} ({t(key, { ...options, lng: 'en' })})
        </>
    );

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[440px] font-faruma bg-card border-border text-foreground shadow-2xl rounded-3xl" dir="rtl">
                <DialogHeader className="text-right pb-2 border-b border-border">
                    <DialogTitle className="text-xl font-black flex items-center justify-end gap-2 text-foreground">
                        {renderBoth('select_unit')}
                        <Boxes className="h-5 w-5 text-primary" />
                    </DialogTitle>
                    <DialogDescription className="text-right text-muted-foreground text-xs mt-1">
                        <span className="font-bold text-foreground text-sm block">{product.name_dv}</span>
                        <span className="text-[11px] text-muted-foreground">{product.name_en}</span>
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-2.5 py-4">
                    {units.map((unit, index) => {
                        const perPiece = unit.conversion_factor > 0 ? (unit.price / unit.conversion_factor).toFixed(2) : unit.price.toFixed(2);
                        return (
                            <button
                                key={index}
                                type="button"
                                className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-muted/50 hover:bg-primary/10 border border-border hover:border-primary/40 transition-all text-right group cursor-pointer"
                                onClick={() => {
                                    onSelect({
                                        name: unit.name,
                                        price: unit.price,
                                        conversion_factor: unit.conversion_factor
                                    });
                                    onClose();
                                }}
                            >
                                <div className="text-left font-mono">
                                    <span className="text-lg font-black text-primary group-hover:text-primary transition-colors block">
                                        {settings.shop.currency} {unit.price.toFixed(2)}
                                    </span>
                                    {!unit.isBase && unit.conversion_factor > 1 && (
                                        <span className="text-[10px] text-muted-foreground font-sans block">
                                            ~ {settings.shop.currency} {perPiece} / pc
                                        </span>
                                    )}
                                </div>

                                <div className="text-right flex items-center gap-3">
                                    <div>
                                        <div className="flex items-center justify-end gap-1.5 mb-0.5">
                                            {unit.isBase ? (
                                                <Badge variant="secondary" className="text-[10px] font-bold uppercase tracking-wider bg-muted text-muted-foreground">
                                                    Base Unit
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-[10px] font-black uppercase tracking-wider bg-primary/10 text-primary border-primary/30">
                                                    {unit.name}
                                                </Badge>
                                            )}
                                            <span className="font-bold text-base text-foreground group-hover:text-primary transition-colors">
                                                {unit.name}
                                            </span>
                                        </div>
                                        <span className="text-[11px] text-muted-foreground block">
                                            {unit.isBase ? '1 pc (Single item)' : `Contains ${unit.conversion_factor} pcs`}
                                        </span>
                                    </div>
                                    <div className="h-10 w-10 rounded-xl bg-card border border-border flex items-center justify-center text-muted-foreground group-hover:text-primary group-hover:border-primary/40 transition-all">
                                        {unit.isBase ? <Package className="h-5 w-5" /> : <Boxes className="h-5 w-5" />}
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default UnitSelectionDialog;
