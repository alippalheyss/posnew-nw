import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Product, useAppContext } from '@/context/AppContext';
import { Plus, Trash2, Save, Upload, CalendarIcon } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, parseISO } from "date-fns";
import { cn } from '@/lib/utils';
import { showSuccess, showError } from '@/utils/toast';
import { generatePlaceholderImage } from '@/utils/imageUtils';

interface ProductDialogProps {
    isOpen: boolean;
    onClose: () => void;
    product: Product | null; // Null means 'Add' mode
    onSave: (updatedProduct: Product) => void;
}

const ProductDialog: React.FC<ProductDialogProps> = ({ isOpen, onClose, product, onSave }) => {
    const { t } = useTranslation();
    const { getNextProductCode } = useAppContext();
    const [editedProduct, setEditedProduct] = useState<Product | null>(null);
    const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
    const [expiryDate, setExpiryDate] = useState<Date | undefined>(undefined);

    useEffect(() => {
        if (isOpen) {
            if (product) {
                // Edit Mode
                const cloned = JSON.parse(JSON.stringify(product));
                setEditedProduct(cloned);
                setImagePreviewUrl(cloned.image);
                setExpiryDate(cloned.expiry_date ? parseISO(cloned.expiry_date) : undefined);
            } else {
                // Add Mode
                const newId = `prod-${Date.now()}`;
                const autoBarcode = Math.floor(Math.random() * 900000000000 + 100000000000).toString();
                setEditedProduct({
                    id: newId,
                    name_dv: '',
                    name_en: '',
                    barcode: autoBarcode,
                    item_code: getNextProductCode(),
                    price: 0,
                    image: '/placeholder.svg',
                    stock_shop: 0,
                    stock_godown: 0,
                    category: 'Beverage',
                    is_zero_tax: false,
                    units: []
                });
                setImagePreviewUrl(null);
                setExpiryDate(undefined);
            }
        }
    }, [product, isOpen, getNextProductCode]);

    if (!editedProduct) return null;

    const handleSave = () => {
        if (!editedProduct.name_dv || !editedProduct.name_en || !editedProduct.barcode) {
            showError(t('fill_all_fields_error'));
            return;
        }

        const finalProduct: Product = {
            ...editedProduct,
            image: imagePreviewUrl || generatePlaceholderImage(editedProduct.name_en || editedProduct.name_dv, editedProduct.item_code),
            expiry_date: expiryDate ? format(expiryDate, 'yyyy-MM-dd') : undefined,
        };

        onSave(finalProduct);
        onClose();
    };

    const updateField = (field: keyof Product, value: any) => {
        setEditedProduct(prev => prev ? ({ ...prev, [field]: value }) : null);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreviewUrl(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const addUnit = () => {
        setEditedProduct(prev => {
            if (!prev) return null;
            const newUnits = [...(prev.units || [])];
            const unitIndex = newUnits.length + 1;
            const unitBarcode = `${prev.barcode}-U${unitIndex}`;
            newUnits.push({ name: '', price: 0, conversion_factor: 1, barcode: unitBarcode });
            return { ...prev, units: newUnits };
        });
    };

    const updateUnit = (index: number, field: string, value: any) => {
        setEditedProduct(prev => {
            if (!prev) return null;
            const newUnits = [...(prev.units || [])];
            newUnits[index] = { ...newUnits[index], [field]: value };
            return { ...prev, units: newUnits };
        });
    };

    const removeUnit = (index: number) => {
        setEditedProduct(prev => {
            if (!prev) return null;
            const newUnits = prev.units?.filter((_, i) => i !== index) || [];
            return { ...prev, units: newUnits };
        });
    };

    const renderBoth = (key: string, options?: any) => (
        <>
            {t(key, options)} ({t(key, { ...options, lng: 'en' })})
        </>
    );

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[650px] font-faruma max-h-[90vh] overflow-y-auto" dir="rtl">
                <DialogHeader>
                    <DialogTitle className="text-right">
                        {product ? renderBoth('edit_product') : renderBoth('add_new_product')}
                    </DialogTitle>
                    <DialogDescription className="text-right">
                        {product ? editedProduct.name_dv : renderBoth('enter_product_details')}
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Left Column */}
                        <div className="md:col-span-1 space-y-4">
                            <div className="flex flex-col items-center">
                                <div className="w-full h-40 border-2 border-dashed rounded-lg flex items-center justify-center bg-gray-50 relative overflow-hidden group">
                                    <img src={imagePreviewUrl || '/placeholder.svg'} className="w-full h-full object-cover" alt="Preview" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                                        <Label htmlFor="image-upload" className="cursor-pointer text-white flex flex-col items-center gap-1">
                                            <Upload className="h-6 w-6" />
                                            <span className="text-[10px] font-bold uppercase">Change Image</span>
                                        </Label>
                                    </div>
                                    <input id="image-upload" type="file" className="hidden" onChange={handleFileChange} accept="image/*" />
                                </div>
                            </div>

                            <div className="space-y-1 text-right">
                                <Label className="text-xs opacity-70">Item Code</Label>
                                <Input value={editedProduct.item_code} readOnly className="h-8 bg-gray-50 text-[11px] font-mono text-center" />
                            </div>

                            <div className="space-y-1 text-right">
                                <Label className="text-xs opacity-70">{t('expiry_date')}</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className={cn("w-full h-8 justify-start text-right font-normal text-xs", !expiryDate && "text-muted-foreground")}>
                                            {expiryDate ? format(expiryDate, "PPP") : <span>Pick a date</span>}
                                            <CalendarIcon className="ml-2 h-3 w-3" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar mode="single" selected={expiryDate} onSelect={setExpiryDate} initialFocus dir="rtl" />
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </div>

                        {/* Right Column */}
                        <div className="md:col-span-2 space-y-4 text-right">
                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <Label className="text-xs font-bold">{t('name_dv')} (Dhivehi)</Label>
                                    <Input value={editedProduct.name_dv} onChange={(e) => updateField('name_dv', e.target.value)} onFocus={(e) => e.target.select()} className="text-right" />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs font-bold">{t('name_en')} (English)</Label>
                                    <Input value={editedProduct.name_en} onChange={(e) => updateField('name_en', e.target.value)} onFocus={(e) => e.target.select()} className="text-left" dir="ltr" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label className="text-xs font-bold">{t('barcode')}</Label>
                                    <Input value={editedProduct.barcode} onChange={(e) => updateField('barcode', e.target.value)} onFocus={(e) => e.target.select()} className="font-mono text-right" />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs font-bold">{t('category')}</Label>
                                    <Select value={editedProduct.category} onValueChange={(val) => updateField('category', val)}>
                                        <SelectTrigger className="h-10 text-xs">
                                            <SelectValue placeholder="Select Category" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Beverage">Beverage</SelectItem>
                                            <SelectItem value="Snacks">Snacks</SelectItem>
                                            <SelectItem value="Grocery">Grocery</SelectItem>
                                            <SelectItem value="Dairy">Dairy</SelectItem>
                                            <SelectItem value="Bakery">Bakery</SelectItem>
                                            <SelectItem value="Personal Care">Personal Care</SelectItem>
                                            <SelectItem value="Household">Household</SelectItem>
                                            <SelectItem value="Stationery">Stationery</SelectItem>
                                            <SelectItem value="Electronics">Electronics</SelectItem>
                                            <SelectItem value="Canned Goods">Canned Goods</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="flex items-center justify-between py-2 border-t mt-2">
                                <Label className="text-xs font-bold">{renderBoth('zero_tax_rated')}</Label>
                                <Switch
                                    checked={editedProduct.is_zero_tax}
                                    onCheckedChange={(val) => updateField('is_zero_tax', val)}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label className="text-xs font-bold">{t('price')} (Selling)</Label>
                                    <Input type="number" value={editedProduct.price} onChange={(e) => updateField('price', parseFloat(e.target.value) || 0)} className="font-mono text-left" dir="ltr" />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs font-bold text-gray-500">{t('cost_price')}</Label>
                                    <div className="h-10 px-3 py-2 rounded-md border border-gray-200 bg-gray-50 flex items-center justify-start">
                                        <span className="font-mono text-sm text-gray-600">
                                            {editedProduct.cost_price ? `MVR ${editedProduct.cost_price.toFixed(2)}` : '-'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Profit Margin Display */}
                            {editedProduct.cost_price && editedProduct.cost_price > 0 && (
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-bold text-blue-900">{t('profit_margin')}:</span>
                                        <span className={cn(
                                            "text-sm font-black",
                                            ((editedProduct.price - editedProduct.cost_price) / editedProduct.cost_price * 100) < 10 ? "text-red-600" :
                                                ((editedProduct.price - editedProduct.cost_price) / editedProduct.cost_price * 100) < 20 ? "text-yellow-600" :
                                                    "text-green-600"
                                        )}>
                                            {((editedProduct.price - editedProduct.cost_price) / editedProduct.cost_price * 100).toFixed(1)}%
                                        </span>
                                    </div>
                                    {editedProduct.price < editedProduct.cost_price && (
                                        <p className="text-[10px] text-red-600 mt-1 font-bold">⚠️ {t('selling_price_too_low')}</p>
                                    )}
                                </div>
                            )}

                            <Separator />

                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <h4 className="text-xs font-black uppercase tracking-widest text-primary">Multi-Unit Pricing</h4>
                                    <Button size="sm" variant="outline" onClick={addUnit} className="h-7 text-[10px] gap-1 bg-primary/5">
                                        <Plus className="h-3 w-3" /> Add Unit
                                    </Button>
                                </div>

                                <div className="space-y-3 max-h-[180px] overflow-y-auto pr-2">
                                    {(editedProduct.units || []).map((unit, index) => (
                                        <div key={index} className="flex flex-col gap-2 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg border text-[10px] shadow-sm">
                                            <div className="flex gap-2 items-center">
                                                <div className="flex-1">
                                                    <Input value={unit.name} onChange={(e) => updateUnit(index, 'name', e.target.value)} placeholder="Unit" className="h-7 text-xs bg-white" />
                                                </div>
                                                <div className="w-16">
                                                    <Input type="number" value={unit.price} onChange={(e) => updateUnit(index, 'price', parseFloat(e.target.value) || 0)} className="h-7 text-xs font-mono" />
                                                </div>
                                                <div className="w-12">
                                                    <Input type="number" value={unit.conversion_factor} onChange={(e) => updateUnit(index, 'conversion_factor', parseFloat(e.target.value) || 1)} className="h-7 text-[10px] font-mono" />
                                                </div>
                                                <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:bg-red-50" onClick={() => removeUnit(index)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                            <div className="flex gap-2 items-center border-t pt-2 mt-1">
                                                <Label className="text-[9px] uppercase font-bold opacity-50">Barcode:</Label>
                                                <Input value={unit.barcode} onChange={(e) => updateUnit(index, 'barcode', e.target.value)} onFocus={(e) => e.target.select()} placeholder="Barcode" className="h-7 text-[10px] bg-white font-mono flex-1" />
                                            </div>
                                        </div>
                                    ))}
                                    {(!editedProduct.units || editedProduct.units.length === 0) && (
                                        <p className="text-center text-[10px] text-gray-400 italic py-4 bg-gray-50 rounded-lg">No extra units defined</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter className="flex justify-between gap-3 mt-6 border-t pt-4">
                    <Button variant="outline" onClick={onClose} className="flex-1 h-11 text-sm font-bold">
                        {renderBoth('cancel')}
                    </Button>
                    <Button onClick={handleSave} className="flex-1 h-11 bg-primary hover:bg-primary/90 text-sm font-black shadow-md">
                        <Save className="h-4 w-4 mr-2" /> {renderBoth('save_changes')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default ProductDialog;
