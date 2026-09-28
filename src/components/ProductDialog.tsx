"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Product, useAppContext } from '@/context/AppContext';
import { Plus, Trash2, Save, Upload, CalendarIcon, Package, DollarSign, Barcode, Hash, ListTree, Image as ImageIcon, Boxes, Layers, Pencil, X, Sparkles, Check, Loader2, Printer } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, parseISO } from "date-fns";
import { cn } from '@/lib/utils';
import { showSuccess, showError } from '@/utils/toast';
import { generatePlaceholderImage, getAdaptedImageUrl } from '@/utils/imageUtils';
import { translateEnglishToDhivehi } from '@/utils/dhivehiTranslator';
import { uploadProductImage, optimizeImage } from '@/utils/storageUtils';
import JsBarcode from 'jsbarcode';
import { printContent } from '@/utils/printHelper';
import PulsatingDots from '@/components/PulsatingDots';

interface ProductDialogProps {
    isOpen: boolean;
    onClose: () => void;
    product: Product | null;
    onSave: (updatedProduct: Product) => void;
}

const ProductDialog: React.FC<ProductDialogProps> = ({ isOpen, onClose, product, onSave }) => {
    const { t } = useTranslation();
    const { getNextProductCode, settings, products } = useAppContext();
    const [editedProduct, setEditedProduct] = useState<Product | null>(null);
    const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const [expiryDate, setExpiryDate] = useState<Date | undefined>(undefined);
    const localDataUrlRef = useRef<string | null>(null);

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
                localDataUrlRef.current = null;
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
                localDataUrlRef.current = null;
                setImagePreviewUrl(null);
                setExpiryDate(undefined);
                setUnits([]);
            }
            setIsUnitFormOpen(false);
            setEditingUnitIndex(null);
            setUnitForm({ name: 'Box', price: '', conversion_factor: '', barcode: '' });
        }
    }, [isOpen, product?.id]);

    if (!editedProduct) return null;

    const handleAutoTranslateName = () => {
        if (!editedProduct?.name_en?.trim()) {
            showError('Please enter an English product name first');
            return;
        }
        const translated = translateEnglishToDhivehi(editedProduct.name_en);
        if (translated) {
            setEditedProduct(prev => prev ? ({ ...prev, name_dv: translated }) : null);
            showSuccess('Product name translated to Dhivehi! ✨');
        }
    };

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

    const generateBarcodeSvgString = (barcodeValue: string) => {
        try {
            const svgNode = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            JsBarcode(svgNode, barcodeValue, {
                format: "CODE128",
                width: 2,
                height: 44,
                displayValue: true,
                font: "monospace",
                fontSize: 13,
                textMargin: 3,
                margin: 4
            });
            const serializer = new XMLSerializer();
            return serializer.serializeToString(svgNode);
        } catch (e) {
            console.error('Failed to generate barcode SVG:', e);
            return '';
        }
    };

    const generateUniqueBarcode = () => {
        // Generate an in-store 12-digit barcode starting with 200 (standard in-store prefix)
        let code = '';
        let attempts = 0;
        do {
            const randomPart = Math.floor(100000000 + Math.random() * 900000000).toString();
            code = `200${randomPart}`;
            attempts++;
        } while (products.some(p => p.barcode === code) && attempts < 100);

        updateField('barcode', code);
        showSuccess(`Generated unique barcode: ${code}`);
    };

    const handlePrintBarcodeLabel = () => {
        if (!editedProduct?.barcode) {
            showError('Please enter or generate a barcode first');
            return;
        }

        const barcodeSvg = generateBarcodeSvgString(editedProduct.barcode);
        if (!barcodeSvg) {
            showError('Could not generate barcode image. Please check the barcode format.');
            return;
        }

        const currency = settings.shop.currency || 'MVR';
        const priceFormatted = Number(editedProduct.price || 0).toFixed(2);
        const shopName = settings.shop.shopName || '';
        const nameDv = editedProduct.name_dv || '';
        const nameEn = editedProduct.name_en || '';

        const labelHtml = `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8" />
              <title>Barcode Label - ${editedProduct.barcode}</title>
              <style>
                @media print {
                  @page {
                    size: 50mm 30mm auto;
                    margin: 0;
                  }
                  body {
                    margin: 0;
                    padding: 2mm;
                  }
                }
                body {
                  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                  text-align: center;
                  padding: 4px;
                  margin: 0 auto;
                  width: 50mm;
                  box-sizing: border-box;
                  background: #fff;
                  color: #000;
                }
                .shop {
                  font-size: 8px;
                  font-weight: 800;
                  text-transform: uppercase;
                  letter-spacing: 0.5px;
                  color: #444;
                  margin-bottom: 2px;
                }
                .name-dv {
                  font-size: 11px;
                  font-weight: bold;
                  direction: rtl;
                  line-height: 1.2;
                  white-space: nowrap;
                  overflow: hidden;
                  text-overflow: ellipsis;
                }
                .name-en {
                  font-size: 10px;
                  font-weight: 600;
                  color: #111;
                  line-height: 1.2;
                  white-space: nowrap;
                  overflow: hidden;
                  text-overflow: ellipsis;
                  margin-bottom: 2px;
                }
                .price {
                  font-size: 15px;
                  font-weight: 900;
                  color: #000;
                  margin: 2px 0;
                }
                .barcode-wrap {
                  width: 100%;
                  display: flex;
                  justify-content: center;
                  align-items: center;
                }
                .barcode-wrap svg {
                  max-width: 100%;
                  height: auto;
                  max-height: 48px;
                }
              </style>
            </head>
            <body>
              ${shopName ? `<div class="shop">${shopName}</div>` : ''}
              ${nameDv ? `<div class="name-dv">${nameDv}</div>` : ''}
              ${nameEn ? `<div class="name-en">${nameEn}</div>` : ''}
              <div class="price">${currency} ${priceFormatted}</div>
              <div class="barcode-wrap">
                ${barcodeSvg}
              </div>
            </body>
          </html>
        `;

        printContent(labelHtml, settings);
    };

    const handleSave = () => {
        if (isUploadingImage) {
            showError('Please wait for product image upload to finish...');
            return;
        }

        if (!editedProduct.name_dv || !editedProduct.name_en || !editedProduct.barcode) {
            showError(t('fill_all_fields_error'));
            return;
        }

        const numericCode = (editedProduct.item_code || '').replace(/\D/g, '');
        if (!numericCode) {
            showError(t('product_code_numbers_only'));
            return;
        }

        let finalUnits = [...units];
        // If user filled in the unit form and forgot to click "Save Unit", auto-commit it!
        if (isUnitFormOpen && unitForm.name.trim() && parseFloat(unitForm.price) > 0 && parseFloat(unitForm.conversion_factor) > 0) {
            const pendingUnit = {
                name: unitForm.name.trim(),
                price: parseFloat(unitForm.price),
                conversion_factor: parseFloat(unitForm.conversion_factor),
                barcode: (unitForm.barcode || '').trim()
            };
            if (editingUnitIndex !== null) {
                finalUnits[editingUnitIndex] = pendingUnit;
            } else if (!finalUnits.some(u => u.name.toLowerCase() === pendingUnit.name.toLowerCase())) {
                finalUnits.push(pendingUnit);
            }
        }

        const finalProduct: Product = {
            ...editedProduct,
            cost_price: (editedProduct.cost_price !== undefined && editedProduct.cost_price !== null && !isNaN(Number(editedProduct.cost_price)))
                ? Number(editedProduct.cost_price)
                : undefined,
            item_code: numericCode,
            image: imagePreviewUrl || generatePlaceholderImage(editedProduct.name_en || editedProduct.name_dv, numericCode),
            expiry_date: expiryDate ? format(expiryDate, 'yyyy-MM-dd') : undefined,
            units: finalUnits.length > 0 ? finalUnits : []
        };

        onSave(finalProduct);
        onClose();
    };

    const updateField = (field: keyof Product, value: any) => {
        setEditedProduct(prev => prev ? ({ ...prev, [field]: value }) : null);
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            try {
                setIsUploadingImage(true);
                // 1. Instantly generate optimized compact preview (max 400px, 0.65 quality)
                const { dataUrl } = await optimizeImage(file, 400, 0.65);
                localDataUrlRef.current = dataUrl;
                setImagePreviewUrl(dataUrl);

                // 2. Upload to Supabase Storage bucket for permanent CDN caching
                const targetCode = (editedProduct?.item_code || '').replace(/\D/g, '') || 'prod';
                const result = await uploadProductImage(file, targetCode);

                if (result.url) {
                    setImagePreviewUrl(result.url);
                    showSuccess('Product photo uploaded to Supabase Storage! ☁️');
                } else if (result.error) {
                    console.error('[Supabase Storage Upload Error]:', result.error);
                    showError(`Supabase Storage: ${result.error}. (Using local preview fallback)`);
                }
            } catch (err: any) {
                console.error('Error handling product image:', err);
                showError('Error processing image: ' + (err.message || 'Unknown error'));
            } finally {
                setIsUploadingImage(false);
            }
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
            <DialogContent className="sm:max-w-[65rem] 2xl:max-w-[78rem] w-[95vw] max-h-[92vh] overflow-hidden flex flex-col font-faruma apple-glass-dialog glass3d text-foreground border border-white/20 dark:border-white/10 p-0 shadow-2xl rounded-3xl" dir="rtl">
                {/* Header */}
                <DialogHeader className="text-right px-6 pt-5 pb-3 border-b border-white/15 dark:border-white/10 bg-white/20 dark:bg-white/5 backdrop-blur-md">
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
                                    <div className="w-24 h-24 rounded-2xl bg-white/5 dark:bg-black/20 border-2 border-dashed border-white/20 flex flex-col items-center justify-center relative overflow-hidden group backdrop-blur-md">
                                        {isUploadingImage ? (
                                            <div className="flex flex-col items-center justify-center gap-2 text-primary p-2 text-center">
                                                <PulsatingDots dotClassName="h-2.5 w-2.5 rounded-full bg-primary" />
                                                <span className="text-[8px] font-black uppercase tracking-wider text-primary">Uploading...</span>
                                            </div>
                                        ) : imagePreviewUrl ? (
                                            <img 
                                                src={getAdaptedImageUrl(imagePreviewUrl, editedProduct.name_en || editedProduct.name_dv, editedProduct.item_code)} 
                                                alt="Preview" 
                                                className="w-full h-full object-cover" 
                                                onError={(e) => {
                                                    if (localDataUrlRef.current && (e.target as HTMLImageElement).src !== localDataUrlRef.current) {
                                                        (e.target as HTMLImageElement).src = localDataUrlRef.current;
                                                    } else {
                                                        (e.target as HTMLImageElement).src = generatePlaceholderImage(editedProduct.name_en || editedProduct.name_dv, editedProduct.item_code);
                                                    }
                                                }}
                                            />
                                        ) : (
                                            <ImageIcon className="h-8 w-8 text-foreground/20" />
                                        )}
                                        {!isUploadingImage && (
                                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <Label htmlFor="image-upload" className="cursor-pointer bg-primary p-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider text-white hover:bg-primary/90 transition-all flex items-center gap-1">
                                                    <Upload className="h-3 w-3" />
                                                </Label>
                                                <input id="image-upload" type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Names */}
                                <div className="flex-1 space-y-2.5 min-w-0">
                                    <div className="space-y-1">
                                        <div className="flex items-center justify-between">
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="ghost"
                                                onClick={handleAutoTranslateName}
                                                disabled={!editedProduct.name_en?.trim()}
                                                className="h-6 px-2 text-[10px] font-black text-primary hover:bg-primary/10 rounded-lg gap-1"
                                                title="Auto-translate English name to Dhivehi"
                                            >
                                                <Sparkles className="h-3 w-3 text-primary animate-pulse" />
                                                <span>Auto Translate (ދިވެހިކުރޭ)</span>
                                            </Button>
                                            <Label className="text-right block text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                                                {renderBoth('product_name')} (ދިވެހި)*
                                            </Label>
                                        </div>
                                        <Input 
                                            value={editedProduct.name_dv} 
                                            onChange={(e) => updateField('name_dv', e.target.value)} 
                                            className="apple-glass-input h-10 rounded-xl text-right font-bold text-sm"
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
                                            onBlur={() => {
                                                if (!editedProduct.name_dv?.trim() && editedProduct.name_en?.trim()) {
                                                    const translated = translateEnglishToDhivehi(editedProduct.name_en);
                                                    if (translated) updateField('name_dv', translated);
                                                }
                                            }}
                                            className="apple-glass-input h-10 rounded-xl text-right font-bold text-sm"
                                            placeholder="Product Name"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Row 2: Selling Price & Cost Price */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <div className="flex justify-between items-center">
                                        {editedProduct.cost_price && Number(editedProduct.cost_price) > 0 && editedProduct.price > 0 && (
                                            <span className={cn(
                                                "text-[9px] font-black px-1.5 py-0.5 rounded-md",
                                                editedProduct.price >= Number(editedProduct.cost_price)
                                                    ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                                                    : "bg-red-500/10 text-red-500 border border-red-500/20"
                                            )}>
                                                {(((editedProduct.price - Number(editedProduct.cost_price)) / Number(editedProduct.cost_price)) * 100).toFixed(0)}% margin
                                            </span>
                                        )}
                                        <Label className="text-right block text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                                            {renderBoth('selling_price')} (Piece)*
                                        </Label>
                                    </div>
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
                                            className="apple-glass-input h-11 rounded-xl text-right pl-12 pr-3 text-lg font-black text-primary" 
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <Label className="text-right block text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                                        {renderBoth('cost_price')} (Piece)
                                    </Label>
                                    <div className="relative">
                                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-black text-emerald-500">
                                            {settings.shop.currency}
                                        </span>
                                        <Input 
                                            type="number" 
                                            step="0.01"
                                            value={editedProduct.cost_price ?? ''} 
                                            onChange={(e) => updateField('cost_price', e.target.value === '' ? undefined : (parseFloat(e.target.value) || 0))} 
                                            onFocus={handleFocus}
                                            placeholder="0.00"
                                            className="apple-glass-input h-11 rounded-xl text-right pl-12 pr-3 text-lg font-black text-foreground" 
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Row 3: Item Code & Barcode */}
                            <div className="grid grid-cols-2 gap-3">
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
                                            className="apple-glass-input h-11 rounded-xl text-right pr-8 font-mono text-xs" 
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={generateUniqueBarcode}
                                                className="h-6 px-2 text-[10px] font-black text-primary border-primary/30 hover:bg-primary/10 rounded-lg gap-1 shadow-xs"
                                                title="Generate in-store barcode for non-barcode item"
                                            >
                                                <Sparkles className="h-3 w-3" />
                                                <span>Generate</span>
                                            </Button>
                                            {editedProduct.barcode && (
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={handlePrintBarcodeLabel}
                                                    className="h-6 px-2 text-[10px] font-black text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 rounded-lg gap-1 shadow-xs"
                                                    title="Print Barcode Label with Name & Price"
                                                >
                                                    <Printer className="h-3 w-3" />
                                                    <span>Print Label</span>
                                                </Button>
                                            )}
                                        </div>
                                        <Label className="text-right block text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                                            {renderBoth('barcode')}*
                                        </Label>
                                    </div>
                                    <div className="relative">
                                        <Barcode className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
                                        <Input 
                                            value={editedProduct.barcode} 
                                            onChange={(e) => updateField('barcode', e.target.value)} 
                                            placeholder="Scan barcode or click Generate"
                                            className="apple-glass-input h-11 rounded-xl text-right pr-8 font-mono text-xs" 
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Barcode Label Live Preview Badge */}
                            {editedProduct.barcode && (
                                <div className="p-3 bg-muted/40 rounded-2xl border border-border/80 flex items-center justify-between gap-3 text-right">
                                    <Button
                                        type="button"
                                        size="sm"
                                        onClick={handlePrintBarcodeLabel}
                                        className="h-8 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs gap-1.5 shadow-sm"
                                    >
                                        <Printer className="h-3.5 w-3.5" />
                                        <span>Print Sticker (50x30mm)</span>
                                    </Button>
                                    <div className="flex-1 text-right min-w-0">
                                        <div className="flex items-center justify-end gap-2 text-xs font-black">
                                            <span className="font-mono text-primary font-bold">{settings.shop.currency} {Number(editedProduct.price || 0).toFixed(2)}</span>
                                            <span className="truncate">{editedProduct.name_dv || editedProduct.name_en || 'Product'}</span>
                                        </div>
                                        <p className="text-[10px] font-mono text-muted-foreground mt-0.5">
                                            Scannable Barcode: {editedProduct.barcode}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Row 3: Category, Expiry Date, Zero Tax */}
                            <div className="grid grid-cols-3 gap-3 items-end">
                                <div className="space-y-1">
                                    <Label className="text-right block text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                                        {renderBoth('category')}
                                    </Label>
                                    <Select value={editedProduct.category} onValueChange={(val) => updateField('category', val)}>
                                        <SelectTrigger className="apple-glass-input h-11 rounded-xl text-right text-xs font-bold">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="apple-glass-dialog border border-white/20 text-foreground">
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
                                            <Button variant="outline" className={cn("w-full justify-between text-right font-bold h-11 text-xs rounded-xl apple-glass-input hover:bg-white/10", !expiryDate && "text-muted-foreground")}>
                                                {expiryDate ? format(expiryDate, "dd/MM/yyyy") : <span>{renderBoth('pick_a_date')}</span>}
                                                <CalendarIcon className="h-3.5 w-3.5 opacity-50" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0 apple-glass-dialog border border-white/20 z-[120]" align="start">
                                            <Calendar mode="single" selected={expiryDate} onSelect={setExpiryDate} initialFocus className="text-foreground" />
                                        </PopoverContent>
                                    </Popover>
                                </div>

                                <div className="apple-glass-card p-2.5 rounded-xl border border-white/15 dark:border-white/10 flex items-center justify-between h-11">
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
                        <div className="lg:col-span-5 apple-glass-card p-4 rounded-3xl border border-white/20 dark:border-white/10 flex flex-col min-h-[310px]">
                            <div className="flex items-center justify-between pb-3 border-b border-white/15 dark:border-white/10">
                                <Button 
                                    type="button"
                                    size="sm" 
                                    onClick={handleOpenAddUnit}
                                    className="h-8 px-3 rounded-xl bg-primary hover:bg-primary/90 text-white font-black text-xs gap-1 shadow-sm apple-glass-pill"
                                >
                                    <Plus className="h-3.5 w-3.5" />
                                    {renderBoth('add_unit')}
                                </Button>
                                <div className="text-right">
                                    <h4 className="text-xs font-black uppercase tracking-wider text-foreground flex items-center justify-end gap-1.5">
                                        {units.length > 0 && (
                                            <Badge variant="outline" className="text-[10px] font-black h-4 px-1.5 bg-primary/15 text-primary border-primary/30">
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
                                <div className="p-3 apple-glass-card border border-primary/40 rounded-2xl space-y-3 mt-3 animate-in fade-in-50 duration-150 shadow-sm">
                                    <div className="flex items-center justify-between border-b border-white/15 dark:border-white/10 pb-1.5">
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
                                                    "px-2.5 py-0.5 rounded-lg text-[10px] font-bold border transition-all apple-glass-pill",
                                                    (unitForm.name || '').toLowerCase() === preset.toLowerCase()
                                                        ? "bg-primary text-white border-primary shadow-xs"
                                                        : "bg-white/40 dark:bg-white/10 text-muted-foreground border-white/20 hover:border-primary/40 hover:text-foreground"
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
                                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSaveUnit(); } }}
                                                placeholder="e.g. Box"
                                                className="h-9 apple-glass-input rounded-xl text-right font-bold text-xs"
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
                                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSaveUnit(); } }}
                                                placeholder="12"
                                                className="h-9 apple-glass-input rounded-xl text-right font-bold text-xs"
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
                                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSaveUnit(); } }}
                                                placeholder="0.00"
                                                className="h-9 apple-glass-input rounded-xl text-right font-bold text-xs text-primary"
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <Label className="text-right block text-[9px] font-black uppercase text-muted-foreground tracking-widest">
                                                {renderBoth('unit_barcode')}
                                            </Label>
                                            <Input
                                                value={unitForm.barcode}
                                                onChange={(e) => setUnitForm(prev => ({ ...prev, barcode: e.target.value }))}
                                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSaveUnit(); } }}
                                                placeholder="Optional"
                                                className="h-9 apple-glass-input rounded-xl text-right font-mono text-[11px]"
                                            />
                                        </div>
                                    </div>

                                    {parseFloat(unitForm.price) > 0 && parseFloat(unitForm.conversion_factor) > 0 && (
                                        <div className="p-1.5 rounded-xl bg-white/40 dark:bg-white/10 text-[10px] text-muted-foreground text-center font-mono border border-white/10">
                                            = {settings?.shop?.currency || 'MVR'} {(parseFloat(unitForm.price) / parseFloat(unitForm.conversion_factor)).toFixed(2)} / pc
                                        </div>
                                    )}

                                    <div className="flex justify-end gap-1.5 pt-1">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setIsUnitFormOpen(false)}
                                            className="h-8 px-3 rounded-lg text-xs font-bold apple-glass-pill"
                                        >
                                            {renderBoth('cancel')}
                                        </Button>
                                        <Button
                                            type="button"
                                            size="sm"
                                            onClick={handleSaveUnit}
                                            className="h-8 px-4 rounded-xl bg-primary text-white text-xs font-black apple-glass-pill"
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
                                                className="p-2.5 apple-glass-card border border-white/20 dark:border-white/10 hover:border-primary/40 rounded-2xl flex items-center justify-between gap-2 transition-all shadow-xs"
                                            >
                                                <div className="flex items-center gap-0.5">
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleEditUnit(index)}
                                                        className="h-7 w-7 rounded-lg text-blue-400 hover:bg-blue-500/10"
                                                    >
                                                        <Pencil className="h-3 w-3" />
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleDeleteUnit(index)}
                                                        className="h-7 w-7 rounded-lg text-red-400 hover:bg-red-500/10"
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
                                        <div className="h-full min-h-[160px] flex flex-col items-center justify-center p-4 border border-dashed border-white/20 rounded-2xl bg-white/10 dark:bg-white/5 text-center">
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
                <DialogFooter className="gap-3 px-6 py-4 border-t border-white/15 dark:border-white/10 bg-white/20 dark:bg-white/5 backdrop-blur-md">
                    <Button variant="outline" onClick={onClose} className="flex-1 h-11 text-foreground font-black uppercase tracking-wider text-xs apple-glass-pill">
                        {renderBoth('cancel')}
                    </Button>
                    <Button 
                        onClick={handleSave} 
                        disabled={isUploadingImage}
                        className="flex-1 h-11 bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-wider text-xs shadow-lg shadow-primary/30 apple-glass-pill disabled:opacity-50"
                    >
                        {isUploadingImage ? (
                            <div className="flex items-center justify-center gap-2">
                                <PulsatingDots dotClassName="h-2 w-2 rounded-full bg-white" />
                                <span>Uploading Image...</span>
                            </div>
                        ) : (
                            <>
                                <Save className="ml-2 h-4 w-4" /> {renderBoth('save_product')}
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default ProductDialog;
