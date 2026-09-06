"use client";

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Product, useAppContext } from '@/context/AppContext';
import { Plus, Trash2, Save, Upload, CalendarIcon, Package, DollarSign, Barcode, Hash, ListTree, Image as ImageIcon, Boxes, Layers, Pencil, X, Sparkles } from 'lucide-react';
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
    product: Product | null;
    onSave: (updatedProduct: Product) => void;
}

const ProductDialog: React.FC<ProductDialogProps> = ({ isOpen, onClose, product, onSave }) => {
    const { t } = useTranslation();
    const { getNextProductCode, settings } = useAppContext();
    const [editedProduct, setEditedProduct] = useState<Product | null>(null);
    const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
    const [expiryDate, setExpiryDate] = useState<Date | undefined>(undefined);

    // Units / Packaging state
    const [units, setUnits] = useState<Array<{ name: string; price: number; conversion_factor: number; barcode: string }>>([]);
    const [isUnitFormOpen, setIsUnitFormOpen] = useState(false);
    const [editingUnitIndex, setEditingUnitIndex] = useState<number | null>(null);
    const [unitForm, setUnitForm] = useState<{
        name: string;
        price: string;
        conversion_factor: string;
        barcode: string;
    }>({
        name: 'Box',
        price: '',
        conversion_factor: '',
        barcode: ''
    });

    useEffect(() => {
        if (isOpen) {
            if (product) {
                const cloned = JSON.parse(JSON.stringify(product));
                setEditedProduct(cloned);
                setImagePreviewUrl(cloned.image);
                setExpiryDate(cloned.expiry_date ? parseISO(cloned.expiry_date) : undefined);
                setUnits(cloned.units && Array.isArray(cloned.units) ? cloned.units : []);
            } else {
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
                    category: 'OTHER',
                    is_zero_tax: false,
                    units: []
                });
                setImagePreviewUrl(null);
                setExpiryDate(undefined);
                setUnits([]);
            }
            setIsUnitFormOpen(false);
            setEditingUnitIndex(null);
            setUnitForm({ name: 'Box', price: '', conversion_factor: '', barcode: '' });
        }
    }, [product, isOpen, getNextProductCode]);

    if (!editedProduct) return null;

    const handleOpenAddUnit = () => {
        setUnitForm({ name: 'Box', price: '', conversion_factor: '', barcode: '' });
        setEditingUnitIndex(null);
        setIsUnitFormOpen(true);
    };

    const handleEditUnit = (index: number) => {
        const u = units[index];
        setUnitForm({
            name: u.name,
            price: u.price.toString(),
            conversion_factor: u.conversion_factor.toString(),
            barcode: u.barcode || ''
        });
        setEditingUnitIndex(index);
        setIsUnitFormOpen(true);
    };

    const handleDeleteUnit = (index: number) => {
        setUnits(prev => prev.filter((_, i) => i !== index));
    };

    const handleSaveUnit = () => {
        if (!unitForm.name.trim()) {
            showError('Please enter a unit name (e.g. Box, Case)');
            return;
        }
        const priceNum = parseFloat(unitForm.price);
        if (isNaN(priceNum) || priceNum <= 0) {
            showError('Please enter a valid price for this unit');
            return;
        }
        const convNum = parseFloat(unitForm.conversion_factor);
        if (isNaN(convNum) || convNum <= 0) {
            showError('Please enter pieces per unit (e.g. 12)');
            return;
        }

        const newUnit = {
            name: unitForm.name.trim(),
            price: priceNum,
            conversion_factor: convNum,
            barcode: unitForm.barcode.trim()
        };

        if (editingUnitIndex !== null) {
            setUnits(prev => prev.map((u, i) => i === editingUnitIndex ? newUnit : u));
        } else {
            if (units.some(u => u.name.toLowerCase() === newUnit.name.toLowerCase())) {
                showError(`A unit named "${newUnit.name}" already exists for this product.`);
                return;
            }
            setUnits(prev => [...prev, newUnit]);
        }

        setIsUnitFormOpen(false);
        setEditingUnitIndex(null);
        setUnitForm({ name: 'Box', price: '', conversion_factor: '', barcode: '' });
    };

    const handleSave = () => {
        if (!editedProduct.name_dv || !editedProduct.name_en || !editedProduct.barcode) {
            showError(t('fill_all_fields_error'));
            return;
        }

        const numericCode = (editedProduct.item_code || '').replace(/\D/g, '');
        if (!numericCode) {
            showError(t('product_code_numbers_only'));
            return;
        }

        const finalProduct: Product = {
            ...editedProduct,
            item_code: numericCode,
            image: imagePreviewUrl || generatePlaceholderImage(editedProduct.name_en || editedProduct.name_dv, numericCode),
            expiry_date: expiryDate ? format(expiryDate, 'yyyy-MM-dd') : undefined,
            units: units.length > 0 ? units : []
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
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    const max_size = 800;

                    if (width > height) {
                        if (width > max_size) {
                            height *= max_size / width;
                            width = max_size;
                        }
                    } else {
                        if (height > max_size) {
                            width *= max_size / height;
                            height = max_size;
                        }
                    }
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0, width, height);
                    const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
                    setImagePreviewUrl(compressedBase64);
                };
                img.src = reader.result as string;
            };
            reader.readAsDataURL(file);
        }
    };

    const renderBoth = (key: string, options?: any) => (
        <>
            {t(key, options)} ({t(key, { ...options, lng: 'en' })})
        </>
    );

    const handleFocus = (event: React.FocusEvent<HTMLInputElement>) => {
        event.target.select();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-hidden flex flex-col font-faruma bg-card border-border text-foreground" dir="rtl">
                <DialogHeader className="text-right">
                    <DialogTitle className="text-2xl font-black flex items-center justify-end gap-3">
                        {product ? renderBoth('edit_product') : renderBoth('add_new_product')}
                        <Package className="h-6 w-6 text-primary" />
                    </DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                        {renderBoth('product_details_description')}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto custom-scrollbar py-6 pl-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Image Section */}
                        <div className="space-y-4">
                            <Label className="text-right block text-[10px] font-black uppercase text-muted-foreground tracking-widest">{renderBoth('product_image')}</Label>
                            <div className="aspect-square rounded-3xl bg-muted border-2 border-dashed border-border flex flex-col items-center justify-center relative overflow-hidden group">
                                {imagePreviewUrl ? (
                                    <img src={imagePreviewUrl} alt="Preview" className="w-full h-full object-cover" />
                                ) : (
                                    <ImageIcon className="h-12 w-12 text-foreground/10" />
                                )}
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <Label htmlFor="image-upload" className="cursor-pointer bg-primary px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary/90 transition-all flex items-center gap-2">
                                        <Upload className="h-3 w-3" /> UPLOAD IMAGE
                                    </Label>
                                    <input id="image-upload" type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                                </div>
                            </div>
                        </div>

                        {/* Basic Info Section */}
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <Label className="text-right block text-[10px] font-black uppercase text-muted-foreground tracking-widest">{renderBoth('product_name')} (ދިވެހި)*</Label>
                                <Input 
                                    value={editedProduct.name_dv} 
                                    onChange={(e) => updateField('name_dv', e.target.value)} 
                                    className="bg-muted border-border h-12 rounded-xl text-right font-bold focus:border-primary/50"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-right block text-[10px] font-black uppercase text-muted-foreground tracking-widest">{renderBoth('product_name')} (English)*</Label>
                                <Input 
                                    value={editedProduct.name_en} 
                                    onChange={(e) => updateField('name_en', e.target.value)} 
                                    className="bg-muted border-border h-12 rounded-xl text-right font-bold focus:border-primary/50"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-right block text-[10px] font-black uppercase text-muted-foreground tracking-widest">{renderBoth('item_code')}*</Label>
                                    <div className="relative">
                                       <Hash className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                                       <Input 
                                          value={editedProduct.item_code} 
                                          onChange={(e) => updateField('item_code', e.target.value.replace(/\D/g, ''))} 
                                          placeholder="1001"
                                          className="bg-muted border-border h-11 rounded-xl text-right pr-10 font-mono text-sm focus:border-primary/50" 
                                       />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-right block text-[10px] font-black uppercase text-muted-foreground tracking-widest">{renderBoth('barcode')}*</Label>
                                    <div className="relative">
                                       <Barcode className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                                       <Input 
                                          value={editedProduct.barcode} 
                                          onChange={(e) => updateField('barcode', e.target.value)} 
                                          className="bg-muted border-border h-11 rounded-xl text-right pr-10 font-mono text-sm focus:border-primary/50" 
                                       />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <Separator className="my-8 bg-muted" />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <Label className="text-right block text-[10px] font-black uppercase text-muted-foreground tracking-widest">{renderBoth('price')}*</Label>
                                <div className="relative">
                                   <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-primary">MVR</span>
                                   <Input 
                                      type="number" 
                                      value={editedProduct.price} 
                                      onChange={(e) => updateField('price', parseFloat(e.target.value) || 0)} 
                                      onFocus={handleFocus}
                                      className="bg-muted border-border h-14 rounded-2xl text-right pr-4 text-2xl font-black text-foreground focus:border-primary" 
                                   />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-right block text-[10px] font-black uppercase text-muted-foreground tracking-widest">{renderBoth('category')}</Label>
                                <Select value={editedProduct.category} onValueChange={(val) => updateField('category', val)}>
                                    <SelectTrigger className="bg-muted border-border h-12 rounded-xl text-right">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-card border-border text-foreground">
                                        <SelectItem value="DRINKS" className="text-right">DRINKS</SelectItem>
                                        <SelectItem value="FOOD" className="text-right">FOOD</SelectItem>
                                        <SelectItem value="HARDWARE" className="text-right">HARDWARE</SelectItem>
                                        <SelectItem value="COSMETICS" className="text-right">COSMETICS</SelectItem>
                                        <SelectItem value="OTHER" className="text-right">OTHER</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-6">
                           <div className="bg-muted p-6 rounded-3xl border border-border">
                              <div className="flex items-center justify-between mb-4">
                                 <Switch 
                                    checked={editedProduct.is_zero_tax} 
                                    onCheckedChange={(val) => updateField('is_zero_tax', val)}
                                    className="data-[state=checked]:bg-primary"
                                 />
                                 <Label className="font-black text-sm uppercase tracking-widest">Zero Tax Item</Label>
                              </div>
                              <p className="text-[10px] text-muted-foreground/50 text-right">Enable this if the item is GST exempt (e.g. basic food items).</p>
                           </div>

                           <div className="space-y-2">
                                <Label className="text-right block text-[10px] font-black uppercase text-muted-foreground tracking-widest">{renderBoth('expiry_date')}</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className={cn("w-full justify-start text-right font-normal h-12 rounded-xl bg-muted border-border hover:bg-muted/80", !expiryDate && "text-muted-foreground")}>
                                            {expiryDate ? format(expiryDate, "PPP") : <span>{renderBoth('pick_a_date')}</span>}
                                            <CalendarIcon className="mr-auto h-4 w-4 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0 bg-card border-border" align="start">
                                        <Calendar mode="single" selected={expiryDate} onSelect={setExpiryDate} initialFocus className="text-foreground" />
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </div>
                    </div>

                    <Separator className="my-8 bg-muted" />

                    {/* Units & Packaging Section */}
                    <div className="space-y-4 bg-muted/30 p-5 rounded-3xl border border-border">
                        <div className="flex items-center justify-between">
                            <Button 
                                type="button"
                                size="sm" 
                                onClick={handleOpenAddUnit}
                                className="h-9 px-3 rounded-xl bg-primary hover:bg-primary/90 text-white font-black text-xs gap-1.5 shadow-sm"
                            >
                                <Plus className="h-3.5 w-3.5" />
                                {renderBoth('add_unit')}
                            </Button>
                            <div className="text-right">
                                <h4 className="text-sm font-black uppercase tracking-wider text-foreground flex items-center justify-end gap-2">
                                    {renderBoth('product_units')}
                                    <Boxes className="h-4 w-4 text-primary" />
                                </h4>
                                <p className="text-[11px] text-muted-foreground mt-0.5">
                                    {renderBoth('product_units_desc')}
                                </p>
                            </div>
                        </div>

                        {/* Inline Unit Form */}
                        {isUnitFormOpen && (
                            <div className="p-4 bg-card border border-primary/30 rounded-2xl space-y-4 animate-in fade-in-50 duration-200">
                                <div className="flex items-center justify-between border-b border-border pb-2">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setIsUnitFormOpen(false)}
                                        className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground"
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                    <span className="text-xs font-black uppercase text-primary tracking-wider">
                                        {editingUnitIndex !== null ? renderBoth('edit_unit') : renderBoth('add_unit')}
                                    </span>
                                </div>

                                {/* Common Unit Presets */}
                                <div className="space-y-1.5">
                                    <Label className="text-right block text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                                        Quick Suggestions
                                    </Label>
                                    <div className="flex flex-wrap gap-1.5 justify-end">
                                        {['Box', 'Case', 'Pack', 'Carton', 'Dozen', 'Bundle'].map((preset) => (
                                            <button
                                                key={preset}
                                                type="button"
                                                onClick={() => setUnitForm(prev => ({ ...prev, name: preset }))}
                                                className={cn(
                                                    "px-2.5 py-1 rounded-lg text-xs font-bold border transition-all",
                                                    unitForm.name.toLowerCase() === preset.toLowerCase()
                                                        ? "bg-primary text-white border-primary shadow-sm"
                                                        : "bg-muted text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
                                                )}
                                            >
                                                {preset}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <div className="space-y-1.5">
                                        <Label className="text-right block text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                                            {renderBoth('unit_name')}*
                                        </Label>
                                        <Input
                                            value={unitForm.name}
                                            onChange={(e) => setUnitForm(prev => ({ ...prev, name: e.target.value }))}
                                            placeholder="e.g. Box"
                                            className="h-10 bg-muted border-border rounded-xl text-right font-bold text-sm"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label className="text-right block text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                                            {renderBoth('conversion_factor')}*
                                        </Label>
                                        <Input
                                            type="number"
                                            value={unitForm.conversion_factor}
                                            onChange={(e) => setUnitForm(prev => ({ ...prev, conversion_factor: e.target.value }))}
                                            placeholder="12"
                                            className="h-10 bg-muted border-border rounded-xl text-right font-bold text-sm"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label className="text-right block text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                                            {renderBoth('unit_price')} ({settings.shop.currency})*
                                        </Label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={unitForm.price}
                                            onChange={(e) => setUnitForm(prev => ({ ...prev, price: e.target.value }))}
                                            placeholder="0.00"
                                            className="h-10 bg-muted border-border rounded-xl text-right font-bold text-sm text-primary"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
                                    <div className="space-y-1.5">
                                        <Label className="text-right block text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                                            {renderBoth('unit_barcode')}
                                        </Label>
                                        <div className="relative">
                                            <Barcode className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
                                            <Input
                                                value={unitForm.barcode}
                                                onChange={(e) => setUnitForm(prev => ({ ...prev, barcode: e.target.value }))}
                                                placeholder="Optional unit barcode"
                                                className="h-10 bg-muted border-border rounded-xl text-right pr-9 font-mono text-xs"
                                            />
                                        </div>
                                    </div>

                                    {/* Real-time Calculation Helper */}
                                    <div className="p-2.5 rounded-xl bg-muted/60 border border-border flex items-center justify-between text-xs">
                                        <span className="font-bold text-foreground">
                                            {parseFloat(unitForm.price) > 0 && parseFloat(unitForm.conversion_factor) > 0
                                                ? `${settings.shop.currency} ${(parseFloat(unitForm.price) / parseFloat(unitForm.conversion_factor)).toFixed(2)} / pc`
                                                : '-'}
                                        </span>
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase">
                                            Calculated Cost / Pc
                                        </span>
                                    </div>
                                </div>

                                <div className="flex justify-end gap-2 pt-2">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setIsUnitFormOpen(false)}
                                        className="h-9 px-4 rounded-xl text-xs font-bold"
                                    >
                                        {renderBoth('cancel')}
                                    </Button>
                                    <Button
                                        type="button"
                                        size="sm"
                                        onClick={handleSaveUnit}
                                        className="h-9 px-5 rounded-xl bg-primary text-white text-xs font-black"
                                    >
                                        <Check className="h-3.5 w-3.5 mr-1" />
                                        {editingUnitIndex !== null ? 'Update Unit' : 'Save Unit'}
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* List of Configured Units */}
                        {units.length > 0 ? (
                            <div className="space-y-2">
                                {units.map((u, index) => {
                                    const perPiece = u.conversion_factor > 0 ? (u.price / u.conversion_factor).toFixed(2) : '0.00';
                                    return (
                                        <div
                                            key={index}
                                            className="p-3 bg-card border border-border hover:border-primary/40 rounded-2xl flex items-center justify-between gap-3 transition-all"
                                        >
                                            <div className="flex items-center gap-1">
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleEditUnit(index)}
                                                    className="h-8 w-8 rounded-lg text-blue-400 hover:bg-blue-500/10"
                                                >
                                                    <Pencil className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleDeleteUnit(index)}
                                                    className="h-8 w-8 rounded-lg text-red-400 hover:bg-red-500/10"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>

                                            <div className="flex items-center gap-4 flex-1 justify-end text-right">
                                                {u.barcode && (
                                                    <span className="hidden sm:inline-block font-mono text-[11px] text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                                                        {u.barcode}
                                                    </span>
                                                )}
                                                <div className="text-left">
                                                    <span className="text-sm font-black text-primary block">
                                                        {settings.shop.currency} {u.price.toFixed(2)}
                                                    </span>
                                                    <span className="text-[10px] text-muted-foreground">
                                                        ~ {settings.shop.currency} {perPiece} / pc
                                                    </span>
                                                </div>
                                                <div className="text-right">
                                                    <div className="flex items-center gap-1.5 justify-end">
                                                        <Badge variant="outline" className="text-xs font-black uppercase tracking-wider bg-primary/10 text-primary border-primary/30">
                                                            {u.name}
                                                        </Badge>
                                                    </div>
                                                    <span className="text-[11px] text-muted-foreground font-bold">
                                                        {u.conversion_factor} pcs per {u.name.toLowerCase()}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            !isUnitFormOpen && (
                                <div className="text-center py-6 px-4 border border-dashed border-border rounded-2xl bg-card/40">
                                    <Layers className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                                    <p className="text-xs font-bold text-muted-foreground">
                                        {renderBoth('no_units_added')}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground/60 mt-1">
                                        This product sells as single items (Piece) at the base price of {settings.shop.currency} {editedProduct.price.toFixed(2)}. Click "+ Add Unit" to configure wholesale/box pricing.
                                    </p>
                                </div>
                            )
                        )}
                    </div>
                </div>

                <DialogFooter className="gap-3 pt-6 border-t border-border">
                    <Button variant="ghost" onClick={onClose} className="flex-1 h-12 border-border hover:bg-muted text-foreground font-black uppercase tracking-widest">
                        {renderBoth('cancel')}
                    </Button>
                    <Button onClick={handleSave} className="flex-1 h-12 bg-primary hover:bg-primary/90 font-black uppercase tracking-widest shadow-[0_0_20px_rgba(0,132,255,0.3)]">
                        <Save className="ml-2 h-4 w-4" /> {renderBoth('save_product')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default ProductDialog;
