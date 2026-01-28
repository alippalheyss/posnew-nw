import React from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Product } from '@/context/AppContext';

interface UnitSelectionDialogProps {
    isOpen: boolean;
    onClose: () => void;
    product: Product | null;
    onSelect: (unit: { name: string, price: number, conversion_factor: number } | null) => void;
}

const UnitSelectionDialog: React.FC<UnitSelectionDialogProps> = ({ isOpen, onClose, product, onSelect }) => {
    const { t } = useTranslation();

    if (!product) return null;

    // Base unit option (implicit)
    const baseUnit = {
        name: 'Piece', // Localize if needed, or use a generic term
        price: product.price,
        conversion_factor: 1,
        isBase: true
    };

    const units: Array<{ name: string; price: number; conversion_factor: number; isBase?: boolean }> = [baseUnit, ...(product.units || [])];

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[400px] font-faruma" dir="rtl">
                <DialogHeader>
                    <DialogTitle className="text-right">Select Unit</DialogTitle>
                    <DialogDescription className="text-right">
                        {product.name_dv} ({product.name_en})
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    {units.map((unit, index) => (
                        <Button
                            key={index}
                            variant="outline"
                            className="flex justify-between h-auto py-3 px-4 hover:bg-primary hover:text-white transition-colors group"
                            onClick={() => {
                                onSelect(unit.isBase ? null : unit); // Null means base unit
                                onClose();
                            }}
                        >
                            <div className="text-left">
                                <span className="font-bold text-lg block">{unit.name}</span>
                                {unit.isBase ? null : <span className="text-xs opacity-70">Contains {unit.conversion_factor} pcs</span>}
                            </div>
                            <div className="text-right">
                                <span className="font-bold text-lg">{unit.price.toFixed(2)}</span>
                            </div>
                        </Button>
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default UnitSelectionDialog;
