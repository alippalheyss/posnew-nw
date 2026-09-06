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
import { Plus, Trash2, Save, Upload, CalendarIcon, Package, DollarSign, Barcode, Hash, ListTree, Image as ImageIcon, Boxes, Layers, Pencil, X, Sparkles, Check } from 'lucide-react';
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
            <DialogContent className="sm:max-w-[1040px] max-h-[92vh] overflow-hidden flex flex-col font-faruma bg-card border-border text-foreground p-0 shadow-2xl rounded-3xl" dir="rtl">
                {/* Header */}
                <DialogHeader className="text-right px-6 pt-5 pb-3 border-b border-border bg-muted/20">
                    <DialogTitle className="text-xl font-black flex items-center justify-end gap-2.5 text-foreground">
                        {product ? renderBoth('edit_product') : renderBoth('add_new_product')}
                        <Package className="h-5 w-5 text-primary" />
                    </DialogTitle>
                    <DialogDescription className="text-muted-foreground text-xs">
                        {renderBoth('product_details_description')}
                    </DialogDescription>
                </DialogHeader>

                {/* Content: Side-by-side Grid */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                        {/* Right Panel: Basic Product Info (7 cols) */}
                        <div className="lg:col-span-7 space-y-4">
                            {/* Row 1: Image + Names */}
                            <div className="flex gap-4 items-start">
                                {/* Compact Image Upload */}
                                <div className="space-y-1 shrink-0">
                                    <Label className="text-right block text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                                        {renderBoth('product_image')}
                                    </Label>
                                    <div className="w-24 h-24 rounded-2xl bg-muted border-2 border-dashed border-border flex flex-col items-center justify-center relative overflow-hidden group">
                                        {imagePreviewUrl ? (
                                            <img src={imagePreviewUrl} alt="Preview" className="w-full h-full object-cover" />
                                        ) : (
                                            <ImageIcon className="h-8 w-8 text-foreground/20" />
                                        )}
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <Label htmlFor="image-upload" className="cursor-pointer bg-primary p-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider text-white hover:bg-primary/90 transition-all flex items-center gap-1">
                                                <Upload className="h-3 w-3" />
                                            </Label>
                                            <input id="image-upload" type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                                        </div>
                                    </div>
                                </div>

                                {/* Names */}
                                <div className="flex-1 space-y-2.5 min-w-0">
                                    <div className="space-y-1">
                                        <Label className="text-right block text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                                            {renderBoth('product_name')} (ދިވެހި)*
                                        </Label>
                                        <Input 
                                            value={editedProduct.name_dv} 
                                            onChange={(e) => updateField('name_dv', e.target.value)} 
                                            className="bg-muted border-border h-10 rounded-xl text-right font-bold text-sm focus:border-primary/50"
                                            placeholder="ތަކެތީގެ ނަން"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-right block text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                                            {renderBoth('product_name')} (English)*
                                        </Label>
                                        <Input 
                                            value={editedProduct.name_en} 
                                            onChange={(e) => updateField('name_en', e.target.value)} 
                                            className="bg-muted border-border h-10 rounded-xl text-right font-bold text-sm focus:border-primary/50"
                                            placeholder="Product Name"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Row 2: Price, Item Code, Barcode */}
                            <div className="grid grid-cols-3 gap-3">
                                <div className="space-y-1">
                                    <Label className="text-right block text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                                        {renderBoth('price')} (Piece)*
                                    </Label>
                                    <div className="relative">
                                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-black text-primary">
                                            {settings.shop.currency}
                                        </span>
                                        <Input 
                                            type="number" 
                                            step="0.01"
                                            value={editedProduct.price} 
                                            onChange={(e) => updateField('price', parseFloat(e.target.value) || 0)} 
                                            onFocus={handleFocus}
                                            className="bg-muted border-border h-11 rounded-xl text-right pl-12 pr-3 text-lg font-black text-primary focus:border-primary" 
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <Label className="text-right block text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                                        {renderBoth('item_code')}*
                                    </Label>
                                    <div className="relative">
                                        <Hash className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
                                        <Input 
                                            value={editedProduct.item_code} 
                                            onChange={(e) => updateField('item_code', e.target.value.replace(/\D/g, ''))} 
                                            placeholder="1001"
                                            className="bg-muted border-border h-11 rounded-xl text-right pr-8 font-mono text-xs focus:border-primary/50" 
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <Label className="text-right block text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                                        {renderBoth('barcode')}*
                                    </Label>
                                    <div className="relative">
                                        <Barcode className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
                                        <Input 
                                            value={editedProduct.barcode} 
                                            onChange={(e) => updateField('barcode', e.target.value)} 
                                            className="bg-muted border-border h-11 rounded-xl text-right pr-8 font-mono text-xs focus:border-primary/50" 
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Row 3: Category, Expiry Date, Zero Tax */}
                            <div className="grid grid-cols-3 gap-3 items-end">
                                <div className="space-y-1">
                                    <Label className="text-right block text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                                        {renderBoth('category')}
                                    </Label>
                                    <Select value={editedProduct.category} onValueChange={(val) => updateField('category', val)}>
                                        <SelectTrigger className="bg-muted border-border h-11 rounded-xl text-right text-xs font-bold">
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

                                <div className="space-y-1">
                                    <Label className="text-right block text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                                        {renderBoth('expiry_date')}
                                    </Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" className={cn("w-full justify-between text-right font-bold h-11 text-xs rounded-xl bg-muted border-border hover:bg-muted/80", !expiryDate && "text-muted-foreground")}>
                                                {expiryDate ? format(expiryDate, "dd/MM/yyyy") : <span>{renderBoth('pick_a_date')}</span>}
                                                <CalendarIcon className="h-3.5 w-3.5 opacity-50" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0 bg-card border-border z-[120]" align="start">
                                            <Calendar mode="single" selected={expiryDate} onSelect={setExpiryDate} initialFocus className="text-foreground" />
                                        </PopoverContent>
                                    </Popover>
                                </div>

                                <div className="bg-muted p-2.5 rounded-xl border border-border flex items-center justify-between h-11">
                                    <Switch 
                                        checked={editedProduct.is_zero_tax} 
                                        onCheckedChange={(val) => updateField('is_zero_tax', val)}
                                        className="data-[state=checked]:bg-primary scale-90"
                                    />
                                    <Label className="font-bold text-xs uppercase tracking-wider text-muted-foreground">
                                        Zero Tax (0% GST)
                                    </Label>
                                </div>
                            </div>
                        </div>

                        {/* Left Panel: Units & Packaging (5 cols) */}
                        <div className="lg:col-span-5 bg-muted/30 p-4 rounded-3xl border border-border flex flex-col min-h-[310px]">
                            <div className="flex items-center justify-between pb-3 border-b border-border">
                                <Button 
                                    type="button"
                                    size="sm" 
                                    onClick={handleOpenAddUnit}
                                    className="h-8 px-3 rounded-xl bg-primary hover:bg-primary/90 text-white font-black text-xs gap-1 shadow-sm"
                                >
                                    <Plus className="h-3.5 w-3.5" />
                                    {renderBoth('add_unit')}
                                </Button>
                                <div className="text-right">
                                    <h4 className="text-xs font-black uppercase tracking-wider text-foreground flex items-center justify-end gap-1.5">
                                        {units.length > 0 && (
                                            <Badge variant="outline" className="text-[10px] font-black h-4 px-1.5 bg-primary/10 text-primary border-primary/30">
                                                {units.length}
                                            </Badge>
                                        )}
                                        {renderBoth('product_units')}
                                        <Boxes className="h-4 w-4 text-primary" />
                                    </h4>
                                    <span className="text-[10px] text-muted-foreground">
                                        Box, Case, Pack pricing
                                    </span>
                                </div>
                            </div>

                            {/* Inline Unit Form */}
                            {isUnitFormOpen && (
                                <div className="p-3 bg-card border border-primary/30 rounded-2xl space-y-3 mt-3 animate-in fade-in-50 duration-150">
                                    <div className="flex items-center justify-between border-b border-border pb-1.5">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => setIsUnitFormOpen(false)}
                                            className="h-6 w-6 rounded-md text-muted-foreground hover:text-foreground"
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </Button>
                                        <span className="text-[11px] font-black uppercase text-primary tracking-wider">
                                            {editingUnitIndex !== null ? renderBoth('edit_unit') : renderBoth('add_unit')}
                                        </span>
                                    </div>

                                    {/* Quick Preset Pills */}
                                    <div className="flex flex-wrap gap-1 justify-end">
                                        {['Box', 'Case', 'Pack', 'Carton', 'Dozen'].map((preset) => (
                                            <button
                                                key={preset}
                                                type="button"
                                                onClick={() => setUnitForm(prev => ({ ...prev, name: preset }))}
                                                className={cn(
                                                    "px-2 py-0.5 rounded-md text-[10px] font-bold border transition-all",
                                                    (unitForm.name || '').toLowerCase() === preset.toLowerCase()
                                                        ? "bg-primary text-white border-primary"
                                                        : "bg-muted text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
                                                )}
                                            >
                                                {preset}
                                            </button>
                                        ))}
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-1">
                                            <Label className="text-right block text-[9px] font-black uppercase text-muted-foreground tracking-widest">
                                                {renderBoth('unit_name')}*
                                            </Label>
                                            <Input
                                                value={unitForm.name}
                                                onChange={(e) => setUnitForm(prev => ({ ...prev, name: e.target.value }))}
                                                placeholder="e.g. Box"
                                                className="h-9 bg-muted border-border rounded-lg text-right font-bold text-xs"
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <Label className="text-right block text-[9px] font-black uppercase text-muted-foreground tracking-widest">
                                                {renderBoth('conversion_factor')}*
                                            </Label>
                                            <Input
                                                type="number"
                                                value={unitForm.conversion_factor}
                                                onChange={(e) => setUnitForm(prev => ({ ...prev, conversion_factor: e.target.value }))}
                                                placeholder="12"
                                                className="h-9 bg-muted border-border rounded-lg text-right font-bold text-xs"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-1">
                                            <Label className="text-right block text-[9px] font-black uppercase text-muted-foreground tracking-widest">
                                                {renderBoth('unit_price')} ({settings?.shop?.currency || 'MVR'})*
                                            </Label>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                value={unitForm.price}
                                                onChange={(e) => setUnitForm(prev => ({ ...prev, price: e.target.value }))}
                                                placeholder="0.00"
                                                className="h-9 bg-muted border-border rounded-lg text-right font-bold text-xs text-primary"
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <Label className="text-right block text-[9px] font-black uppercase text-muted-foreground tracking-widest">
                                                {renderBoth('unit_barcode')}
                                            </Label>
                                            <Input
                                                value={unitForm.barcode}
                                                onChange={(e) => setUnitForm(prev => ({ ...prev, barcode: e.target.value }))}
                                                placeholder="Optional"
                                                className="h-9 bg-muted border-border rounded-lg text-right font-mono text-[11px]"
                                            />
                                        </div>
                                    </div>

                                    {parseFloat(unitForm.price) > 0 && parseFloat(unitForm.conversion_factor) > 0 && (
                                        <div className="p-1.5 rounded-lg bg-muted/60 text-[10px] text-muted-foreground text-center font-mono">
                                            = {settings?.shop?.currency || 'MVR'} {(parseFloat(unitForm.price) / parseFloat(unitForm.conversion_factor)).toFixed(2)} / pc
                                        </div>
                                    )}

                                    <div className="flex justify-end gap-1.5 pt-1">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setIsUnitFormOpen(false)}
                                            className="h-8 px-3 rounded-lg text-xs font-bold"
                                        >
                                            {renderBoth('cancel')}
                                        </Button>
                                        <Button
                                            type="button"
                                            size="sm"
                                            onClick={handleSaveUnit}
                                            className="h-8 px-4 rounded-lg bg-primary text-white text-xs font-black"
                                        >
                                            <Check className="h-3 w-3 mr-1" />
                                            {editingUnitIndex !== null ? 'Update' : 'Save Unit'}
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* Units List */}
                            <div className="flex-1 mt-3 space-y-2 overflow-y-auto max-h-[260px] custom-scrollbar">
                                {units.length > 0 ? (
                                    units.map((u, index) => {
                                        const conv = Number(u.conversion_factor || 0);
                                        const price = Number(u.price || 0);
                                        const perPiece = conv > 0 ? (price / conv).toFixed(2) : '0.00';
                                        return (
                                            <div
                                                key={index}
                                                className="p-2.5 bg-card border border-border hover:border-primary/40 rounded-xl flex items-center justify-between gap-2 transition-all"
                                            >
                                                <div className="flex items-center gap-0.5">
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleEditUnit(index)}
                                                        className="h-7 w-7 rounded-md text-blue-400 hover:bg-blue-500/10"
                                                    >
                                                        <Pencil className="h-3 w-3" />
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleDeleteUnit(index)}
                                                        className="h-7 w-7 rounded-md text-red-400 hover:bg-red-500/10"
                                                    >
                                                        <Trash2 className="h-3 w-3" />
                                                    </Button>
                                                </div>

                                                <div className="flex items-center gap-2.5 flex-1 justify-end text-right">
                                                    <div className="text-left font-mono">
                                                        <span className="text-xs font-black text-primary block">
                                                            {settings?.shop?.currency || 'MVR'} {price.toFixed(2)}
                                                        </span>
                                                        <span className="text-[9px] text-muted-foreground block">
                                                            ~ {settings?.shop?.currency || 'MVR'} {perPiece} / pc
                                                        </span>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="flex items-center gap-1 justify-end">
                                                            <Badge variant="outline" className="text-[10px] font-black uppercase tracking-wider bg-primary/10 text-primary border-primary/30 px-1.5 py-0">
                                                                {u.name}
                                                            </Badge>
                                                        </div>
                                                        <span className="text-[10px] text-muted-foreground font-bold block mt-0.5">
                                                            {u.conversion_factor} pcs
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    !isUnitFormOpen && (
                                        <div className="h-full min-h-[160px] flex flex-col items-center justify-center p-4 border border-dashed border-border rounded-2xl bg-card/30 text-center">
                                            <Layers className="h-6 w-6 text-muted-foreground/40 mb-1.5" />
                                            <p className="text-xs font-bold text-muted-foreground">
                                                {renderBoth('no_units_added')}
                                            </p>
                                            <p className="text-[10px] text-muted-foreground/60 mt-1 max-w-[220px]">
                                                Click "+ Add Unit" to add wholesale/box pricing (Box, Case, Pack).
                                            </p>
                                        </div>
                                    )
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <DialogFooter className="gap-3 px-6 py-4 border-t border-border bg-muted/20">
                    <Button variant="ghost" onClick={onClose} className="flex-1 h-11 border-border hover:bg-muted text-foreground font-black uppercase tracking-widest text-xs">
                        {renderBoth('cancel')}
                    </Button>
                    <Button onClick={handleSave} className="flex-1 h-11 bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest text-xs shadow-[0_0_20px_rgba(0,132,255,0.3)]">
                        <Save className="ml-2 h-4 w-4" /> {renderBoth('save_product')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default ProductDialog;
