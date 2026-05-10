"use client";

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Product, useAppContext } from '@/context/AppContext';
import { Plus, Trash2, Save, Upload, CalendarIcon, Package, DollarSign, Barcode, Hash, ListTree, Image as ImageIcon } from 'lucide-react';
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
    const { getNextProductCode } = useAppContext();
    const [editedProduct, setEditedProduct] = useState<Product | null>(null);
    const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
    const [expiryDate, setExpiryDate] = useState<Date | undefined>(undefined);

    useEffect(() => {
        if (isOpen) {
            if (product) {
                const cloned = JSON.parse(JSON.stringify(product));
                setEditedProduct(cloned);
                setImagePreviewUrl(cloned.image);
                setExpiryDate(cloned.expiry_date ? parseISO(cloned.expiry_date) : undefined);
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
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-hidden flex flex-col font-faruma bg-[#0a0a1a] border-white/10 text-white" dir="rtl">
                <DialogHeader className="text-right">
                    <DialogTitle className="text-2xl font-black flex items-center justify-end gap-3">
                        {product ? renderBoth('edit_product') : renderBoth('add_new_product')}
                        <Package className="h-6 w-6 text-primary" />
                    </DialogTitle>
                    <DialogDescription className="text-white/40">
                        {renderBoth('product_details_description')}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto custom-scrollbar py-6 pl-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Image Section */}
                        <div className="space-y-4">
                            <Label className="text-right block text-[10px] font-black uppercase text-white/40 tracking-widest">{renderBoth('product_image')}</Label>
                            <div className="aspect-square rounded-3xl bg-white/5 border-2 border-dashed border-white/10 flex flex-col items-center justify-center relative overflow-hidden group">
                                {imagePreviewUrl ? (
                                    <img src={imagePreviewUrl} alt="Preview" className="w-full h-full object-cover" />
                                ) : (
                                    <ImageIcon className="h-12 w-12 text-white/10" />
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
                                <Label className="text-right block text-[10px] font-black uppercase text-white/40 tracking-widest">{renderBoth('product_name')} (ދިވެހި)*</Label>
                                <Input 
                                    value={editedProduct.name_dv} 
                                    onChange={(e) => updateField('name_dv', e.target.value)} 
                                    className="bg-white/5 border-white/10 h-12 rounded-xl text-right font-bold focus:border-primary/50"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-right block text-[10px] font-black uppercase text-white/40 tracking-widest">{renderBoth('product_name')} (English)*</Label>
                                <Input 
                                    value={editedProduct.name_en} 
                                    onChange={(e) => updateField('name_en', e.target.value)} 
                                    className="bg-white/5 border-white/10 h-12 rounded-xl text-right font-bold focus:border-primary/50"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-right block text-[10px] font-black uppercase text-white/40 tracking-widest">{renderBoth('item_code')}*</Label>
                                    <div className="relative">
                                       <Hash className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20" />
                                       <Input value={editedProduct.item_code} readOnly className="bg-white/5 border-white/10 h-11 rounded-xl text-right pr-10 font-mono text-sm opacity-50" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-right block text-[10px] font-black uppercase text-white/40 tracking-widest">{renderBoth('barcode')}*</Label>
                                    <div className="relative">
                                       <Barcode className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20" />
                                       <Input 
                                          value={editedProduct.barcode} 
                                          onChange={(e) => updateField('barcode', e.target.value)} 
                                          className="bg-white/5 border-white/10 h-11 rounded-xl text-right pr-10 font-mono text-sm focus:border-primary/50" 
                                       />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <Separator className="my-8 bg-white/5" />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <Label className="text-right block text-[10px] font-black uppercase text-white/40 tracking-widest">{renderBoth('price')}*</Label>
                                <div className="relative">
                                   <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-primary">MVR</span>
                                   <Input 
                                      type="number" 
                                      value={editedProduct.price} 
                                      onChange={(e) => updateField('price', parseFloat(e.target.value) || 0)} 
                                      onFocus={handleFocus}
                                      className="bg-white/5 border-white/10 h-14 rounded-2xl text-right pr-4 text-2xl font-black text-white focus:border-primary" 
                                   />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-right block text-[10px] font-black uppercase text-white/40 tracking-widest">{renderBoth('category')}</Label>
                                <Select value={editedProduct.category} onValueChange={(val) => updateField('category', val)}>
                                    <SelectTrigger className="bg-white/5 border-white/10 h-12 rounded-xl text-right">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-[#0a0a1a] border-white/10 text-white">
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
                           <div className="bg-white/5 p-6 rounded-3xl border border-white/5">
                              <div className="flex items-center justify-between mb-4">
                                 <Switch 
                                    checked={editedProduct.is_zero_tax} 
                                    onCheckedChange={(val) => updateField('is_zero_tax', val)}
                                    className="data-[state=checked]:bg-primary"
                                 />
                                 <Label className="font-black text-sm uppercase tracking-widest">Zero Tax Item</Label>
                              </div>
                              <p className="text-[10px] text-white/20 text-right">Enable this if the item is GST exempt (e.g. basic food items).</p>
                           </div>

                           <div className="space-y-2">
                                <Label className="text-right block text-[10px] font-black uppercase text-white/40 tracking-widest">{renderBoth('expiry_date')}</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className={cn("w-full justify-start text-right font-normal h-12 rounded-xl bg-white/5 border-white/10 hover:bg-white/10", !expiryDate && "text-muted-foreground")}>
                                            {expiryDate ? format(expiryDate, "PPP") : <span>{renderBoth('pick_a_date')}</span>}
                                            <CalendarIcon className="mr-auto h-4 w-4 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0 bg-[#0a0a1a] border-white/10" align="start">
                                        <Calendar mode="single" selected={expiryDate} onSelect={setExpiryDate} initialFocus className="text-white" />
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter className="gap-3 pt-6 border-t border-white/5">
                    <Button variant="ghost" onClick={onClose} className="flex-1 h-12 border-white/10 hover:bg-white/5 text-white font-black uppercase tracking-widest">
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
