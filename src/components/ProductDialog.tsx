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
import { Product, ProductFlavour, useAppContext } from '@/context/AppContext';
import { Plus, Trash2, Save, Upload, CalendarIcon, Package, DollarSign, Barcode, Hash, ListTree, Image as ImageIcon, Boxes, Layers, Pencil, X, Sparkles, Check, Loader2, Printer, Type, Tag } from 'lucide-react';
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
import OnlineImageSearchDialog from '@/components/OnlineImageSearchDialog';
import { saveOnlineImageToBucket } from '@/services/productImageService';
import { ImageTextStampDialog } from '@/components/ImageTextStampDialog';

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
    const [uploadedBucketPath, setUploadedBucketPath] = useState<string | null>(null);
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const [expiryDate, setExpiryDate] = useState<Date | undefined>(undefined);
    const [isOnlineSearchOpen, setIsOnlineSearchOpen] = useState(false);
    const [isImageTextStampOpen, setIsImageTextStampOpen] = useState(false);
    const localDataUrlRef = useRef<string | null>(null);

    const handleOnlineImageSelect = async (url: string) => {
        setImagePreviewUrl(url);
        localDataUrlRef.current = url;
        if (editedProduct) {
            setEditedProduct(prev => prev ? ({ ...prev, image: url }) : null);
        }
        // Save to Supabase Storage bucket in background if possible
        try {
            const saved = await saveOnlineImageToBucket(url, editedProduct?.item_code || editedProduct?.barcode || 'prod');
            if (saved && saved !== url) {
                setUploadedBucketPath(saved);
                setImagePreviewUrl(saved);
                if (editedProduct) {
                    setEditedProduct(prev => prev ? ({ ...prev, image: saved }) : null);
                }
            }
        } catch {}
    };

    // Sub-tab switcher between Flavours and Packaging Units
    const [activeSubTab, setActiveSubTab] = useState<'flavours' | 'units'>('flavours');

    // Flavours / Variant Barcodes state
    const [flavours, setFlavours] = useState<ProductFlavour[]>([]);
    const [isFlavourFormOpen, setIsFlavourFormOpen] = useState(false);
    const [editingFlavourIndex, setEditingFlavourIndex] = useState<number | null>(null);
    const [flavourForm, setFlavourForm] = useState<{
        name: string;
        barcode: string;
        price: string;
    }>({
        name: '',
        barcode: '',
        price: ''
    });

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

    // Extra Barcodes state (for products that have multiple different barcodes)
    const [extraBarcodes, setExtraBarcodes] = useState<string[]>([]);
    const [extraBarcodeInput, setExtraBarcodeInput] = useState<string>('');

    useEffect(() => {
        if (isOpen) {
            if (product) {
                const cloned = JSON.parse(JSON.stringify(product));
                setEditedProduct(cloned);
                localDataUrlRef.current = null;
                setUploadedBucketPath(null);
                setImagePreviewUrl(cloned.image);
                setExpiryDate(cloned.expiry_date ? parseISO(cloned.expiry_date) : undefined);
                setUnits(cloned.units && Array.isArray(cloned.units) ? cloned.units : []);
                setFlavours(cloned.flavours && Array.isArray(cloned.flavours) ? cloned.flavours : []);
                setExtraBarcodes(cloned.extra_barcodes && Array.isArray(cloned.extra_barcodes) ? cloned.extra_barcodes : []);
            } else {
                const newId = crypto.randomUUID();
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
                    units: [],
                    flavours: [],
                    extra_barcodes: []
                });
                localDataUrlRef.current = null;
                setUploadedBucketPath(null);
                setImagePreviewUrl(null);
                setExpiryDate(undefined);
                setUnits([]);
                setFlavours([]);
                setExtraBarcodes([]);
            }
            setExtraBarcodeInput('');
            setIsUnitFormOpen(false);
            setEditingUnitIndex(null);
            setUnitForm({ name: 'Box', price: '', conversion_factor: '', barcode: '' });
            setIsFlavourFormOpen(false);
            setEditingFlavourIndex(null);
            setFlavourForm({ name: '', barcode: '', price: '' });
            setActiveSubTab('flavours');
        }
    }, [isOpen, product?.id]);

    if (!editedProduct) return null;

    const handleAddExtraBarcode = () => {
        const trimmed = extraBarcodeInput.trim();
        if (!trimmed) return;
        if (trimmed === editedProduct.barcode) {
            showError('This barcode is already set as the main barcode for this product.');
            return;
        }
        if (extraBarcodes.includes(trimmed)) {
            showError(`Barcode "${trimmed}" is already added.`);
            return;
        }
        setExtraBarcodes(prev => [...prev, trimmed]);
        setExtraBarcodeInput('');
        showSuccess(`Added extra barcode: ${trimmed}`);
    };

    const handleRemoveExtraBarcode = (codeToRemove: string) => {
        setExtraBarcodes(prev => prev.filter(c => c !== codeToRemove));
    };

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

    const handleOpenAddFlavour = () => {
        setFlavourForm({
            name: '',
            barcode: '',
            price: editedProduct?.price ? String(editedProduct.price) : ''
        });
        setEditingFlavourIndex(null);
        setIsFlavourFormOpen(true);
    };

    const handleEditFlavour = (index: number) => {
        const f = flavours[index];
        setFlavourForm({
            name: f.name,
            barcode: f.barcode || '',
            price: f.price !== undefined ? String(f.price) : (editedProduct?.price ? String(editedProduct.price) : '')
        });
        setEditingFlavourIndex(index);
        setIsFlavourFormOpen(true);
    };

    const handleDeleteFlavour = (index: number) => {
        setFlavours(prev => prev.filter((_, i) => i !== index));
    };

    const handleSaveFlavour = () => {
        if (!flavourForm.name.trim()) {
            showError('Please enter a flavour / variant name (e.g. Chocolate, Vanilla)');
            return;
        }

        const priceNum = flavourForm.price.trim() !== '' ? parseFloat(flavourForm.price) : (editedProduct?.price || 0);
        const newFlavour: ProductFlavour = {
            id: editingFlavourIndex !== null ? flavours[editingFlavourIndex].id || crypto.randomUUID() : crypto.randomUUID(),
            name: flavourForm.name.trim(),
            barcode: flavourForm.barcode.trim(),
            price: !isNaN(priceNum) ? priceNum : (editedProduct?.price || 0)
        };

        if (editingFlavourIndex !== null) {
            setFlavours(prev => prev.map((f, i) => i === editingFlavourIndex ? newFlavour : f));
        } else {
            if (flavours.some(f => f.name.toLowerCase() === newFlavour.name.toLowerCase())) {
                showError(`A flavour named "${newFlavour.name}" already exists for this product.`);
                return;
            }
            if (newFlavour.barcode && flavours.some(f => f.barcode && f.barcode === newFlavour.barcode)) {
                showError(`A flavour with barcode "${newFlavour.barcode}" already exists.`);
                return;
            }
            setFlavours(prev => [...prev, newFlavour]);
        }

        setIsFlavourFormOpen(false);
        setEditingFlavourIndex(null);
        setFlavourForm({ name: '', barcode: '', price: '' });
    };

    const generateFlavourBarcode = () => {
        let code = '';
        let attempts = 0;
        do {
            const randomPart = Math.floor(100000000 + Math.random() * 900000000).toString();
            code = `200${randomPart}`;
            attempts++;
        } while (
            (products.some(p => p.barcode === code || p.flavours?.some(f => f.barcode === code)) ||
            flavours.some(f => f.barcode === code)) && 
            attempts < 100
        );
        setFlavourForm(prev => ({ ...prev, barcode: code }));
        showSuccess(`Generated barcode: ${code}`);
    };

    const handleApplyStampedImage = async (stampedDataUrl: string) => {
        try {
            setIsUploadingImage(true);
            localDataUrlRef.current = stampedDataUrl;
            setImagePreviewUrl(stampedDataUrl);
            setEditedProduct(prev => prev ? ({ ...prev, image: stampedDataUrl }) : null);

            // Upload in background to Supabase Storage
            const res = await fetch(stampedDataUrl);
            const blob = await res.blob();
            const file = new File([blob], `stamped_${Date.now()}.jpg`, { type: 'image/jpeg' });
            const targetCode = (editedProduct?.item_code || '').replace(/\D/g, '') || 'prod';
            const uploadRes = await uploadProductImage(file, targetCode);
            if (uploadRes.bucketPath) setUploadedBucketPath(uploadRes.bucketPath);
            if (uploadRes.url) {
                setImagePreviewUrl(uploadRes.url);
                setEditedProduct(prev => prev ? ({ ...prev, image: uploadRes.url }) : null);
                showSuccess('Text stamped & photo saved! 🎨');
            } else {
                showSuccess('Text stamped onto photo! 🎨');
            }
        } catch (err: any) {
            console.error('Error applying stamped image:', err);
            showError('Failed to save stamped image');
        } finally {
            setIsUploadingImage(false);
        }
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

        let finalFlavours = [...flavours];
        if (isFlavourFormOpen && flavourForm.name.trim()) {
            const priceNum = flavourForm.price.trim() !== '' ? parseFloat(flavourForm.price) : (editedProduct?.price || 0);
            const pendingFlavour: ProductFlavour = {
                id: editingFlavourIndex !== null ? flavours[editingFlavourIndex].id || crypto.randomUUID() : crypto.randomUUID(),
                name: flavourForm.name.trim(),
                barcode: flavourForm.barcode.trim(),
                price: !isNaN(priceNum) ? priceNum : (editedProduct?.price || 0)
            };
            if (editingFlavourIndex !== null) {
                finalFlavours[editingFlavourIndex] = pendingFlavour;
            } else if (!finalFlavours.some(f => f.name.toLowerCase() === pendingFlavour.name.toLowerCase())) {
                finalFlavours.push(pendingFlavour);
            }
        }

        let finalExtraBarcodes = [...extraBarcodes];
        if (extraBarcodeInput.trim()) {
            const pendingCode = extraBarcodeInput.trim();
            if (pendingCode !== editedProduct.barcode && !finalExtraBarcodes.includes(pendingCode)) {
                finalExtraBarcodes.push(pendingCode);
            }
        }

        const finalProduct: Product = {
            ...editedProduct,
            cost_price: (editedProduct.cost_price !== undefined && editedProduct.cost_price !== null && !isNaN(Number(editedProduct.cost_price)))
                ? Number(editedProduct.cost_price)
                : undefined,
            item_code: numericCode,
            image: uploadedBucketPath || editedProduct.image || imagePreviewUrl || generatePlaceholderImage(editedProduct.name_en || editedProduct.name_dv, numericCode),
            expiry_date: expiryDate ? format(expiryDate, 'yyyy-MM-dd') : undefined,
            units: finalUnits.length > 0 ? finalUnits : [],
            flavours: finalFlavours.length > 0 ? finalFlavours : [],
            extra_barcodes: finalExtraBarcodes
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

                if (result.bucketPath) {
                    setUploadedBucketPath(result.bucketPath);
                }
                if (result.url) {
                    setImagePreviewUrl(result.url);
                    showSuccess('Product photo uploaded to Supabase Storage bucket! ☁️');
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

    const lbl = "text-right block text-[10px] font-bold uppercase text-muted-foreground tracking-wide";
    const fld = "h-10 rounded-xl bg-background border-border text-sm";
    const costNum = Number(editedProduct.cost_price);
    const hasCost = editedProduct.cost_price !== undefined && editedProduct.cost_price !== null && (editedProduct.cost_price as any) !== '' && costNum > 0;
    const marginPct = hasCost && editedProduct.price > 0 ? ((editedProduct.price - costNum) / costNum) * 100 : null;
    const totalStock = Number(editedProduct.stock_shop || 0) + Number(editedProduct.stock_godown || 0);
    const stockStatus = totalStock <= 0
        ? { label: 'Out of stock', cls: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30' }
        : totalStock <= 10
            ? { label: 'Low stock', cls: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30' }
            : { label: 'In stock', cls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' };
    const currency = settings.shop.currency;

    const section = (icon: React.ReactNode, chip: string, title: string, children: React.ReactNode, action?: React.ReactNode) => (
        <section className="rounded-xl bg-card border border-border overflow-hidden">
            <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-border bg-muted/50">
                <div className="flex items-center gap-2" dir="ltr">
                    <span className={cn("h-7 w-7 rounded-lg flex items-center justify-center shrink-0", chip)}>{icon}</span>
                    <h3 className="text-[11px] font-bold uppercase tracking-wide text-foreground">{title}</h3>
                </div>
                {action}
            </div>
            <div className="p-4 space-y-4">{children}</div>
        </section>
    );

    return (
        <>
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-5xl w-[96vw] h-[92vh] max-h-[92vh] overflow-hidden flex flex-col gap-0 font-faruma bg-background text-foreground border border-border p-0 shadow-xl rounded-xl" dir="rtl">
                {/* Header */}
                <DialogHeader className="text-right px-5 py-3.5 border-b border-border bg-card shrink-0 space-y-0 pr-12">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2" dir="ltr">
                            <Badge className="bg-muted text-foreground border border-border font-mono tabular-nums text-xs font-bold px-2.5 py-0.5 rounded-md shadow-none hover:bg-muted">
                                {editedProduct.item_code ? `#${editedProduct.item_code}` : 'NEW'}
                            </Badge>
                            {editedProduct.is_zero_tax ? (
                                <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-md shadow-none hover:bg-emerald-500/10">
                                    0% GST
                                </Badge>
                            ) : (
                                <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30 text-[10px] font-bold px-2 py-0.5 rounded-md shadow-none hover:bg-blue-500/10">
                                    {settings.shop?.taxRate || 8}% GST
                                </Badge>
                            )}
                        </div>

                        <div className="flex items-center gap-3 text-right min-w-0">
                            <div className="min-w-0">
                                <DialogTitle className="text-base sm:text-lg font-bold text-foreground">
                                    <span>{product ? renderBoth('edit_product') : renderBoth('add_new_product')}</span>
                                </DialogTitle>
                                <DialogDescription className="text-muted-foreground text-xs mt-0.5">
                                    {product ? 'Update product details, pricing, barcodes and packaging units' : 'Create a new product in your catalog with barcodes and pricing'}
                                </DialogDescription>
                            </div>
                            <span className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                <Package className="h-5 w-5" />
                            </span>
                        </div>
                    </div>
                </DialogHeader>

                {/* Body: two columns */}
                <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden" dir="ltr">
                    {/* LEFT: sticky summary panel */}
                    <aside className="lg:w-72 xl:w-80 shrink-0 border-b lg:border-b-0 lg:border-r border-border bg-muted/30 p-4 space-y-4 lg:overflow-y-auto custom-scrollbar" dir="rtl">
                        <div className="space-y-2">
                            <Label className={lbl}>{renderBoth('product_image')}</Label>
                            <div className="aspect-square w-full max-w-[220px] mx-auto rounded-xl bg-card border border-dashed border-border flex items-center justify-center relative overflow-hidden group">
                                {isUploadingImage ? (
                                    <div className="flex flex-col items-center justify-center gap-2 text-primary p-2 text-center">
                                        <PulsatingDots dotClassName="h-2.5 w-2.5 rounded-full bg-primary" />
                                        <span className="text-[10px] font-bold uppercase tracking-wide text-primary">Uploading...</span>
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
                                    <ImageIcon className="h-10 w-10 text-muted-foreground/40" />
                                )}
                            </div>
                            <input id="image-upload" type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                            <div className="grid grid-cols-1 gap-1.5" dir="ltr">
                                <Label htmlFor="image-upload" className="cursor-pointer h-9 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold flex items-center justify-center gap-1.5" title="Upload local file">
                                    <Upload className="h-3.5 w-3.5" /> Upload photo
                                </Label>
                                <div className="flex gap-1.5">
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setIsOnlineSearchOpen(true)}
                                        className="h-9 flex-1 px-2 text-xs font-bold rounded-lg gap-1.5 border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
                                        title="Find product image on Google"
                                    >
                                        <Sparkles className="h-3.5 w-3.5" />
                                        <span>Google</span>
                                    </Button>
                                    {imagePreviewUrl && (
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            onClick={() => setIsImageTextStampOpen(true)}
                                            className="h-9 flex-1 px-2 text-xs font-bold rounded-lg gap-1.5 border-indigo-500/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10"
                                            title="Put text/flavour label on photo"
                                        >
                                            <Type className="h-3.5 w-3.5" />
                                            <span>Text</span>
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Live summary */}
                        <div className="rounded-xl bg-card border border-border divide-y divide-border">
                            <div className="p-3 space-y-0.5">
                                <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Summary</p>
                                <p className="font-faruma font-bold text-sm text-right truncate" dir="rtl">{editedProduct.name_dv || '—'}</p>
                                <p className="text-xs text-muted-foreground text-left truncate" dir="ltr">{editedProduct.name_en || '—'}</p>
                            </div>
                            <dl className="p-3 grid grid-cols-2 gap-x-3 gap-y-2.5 text-xs" dir="ltr">
                                <div>
                                    <dt className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Code</dt>
                                    <dd className="font-mono tabular-nums font-bold truncate">{editedProduct.item_code || '—'}</dd>
                                </div>
                                <div>
                                    <dt className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Price</dt>
                                    <dd className="font-mono tabular-nums font-bold text-primary">{currency} {Number(editedProduct.price || 0).toFixed(2)}</dd>
                                </div>
                                <div>
                                    <dt className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Cost</dt>
                                    <dd className="font-mono tabular-nums font-bold">{hasCost ? `${currency} ${costNum.toFixed(2)}` : '—'}</dd>
                                </div>
                                <div>
                                    <dt className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Margin</dt>
                                    <dd>
                                        {marginPct !== null ? (
                                            <span className={cn("inline-block text-[10px] font-bold tabular-nums px-1.5 py-0.5 rounded-md border", marginPct >= 0 ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30" : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30")}>
                                                {marginPct.toFixed(0)}%
                                            </span>
                                        ) : <span className="text-muted-foreground">—</span>}
                                    </dd>
                                </div>
                                <div className="col-span-2 flex items-center justify-between">
                                    <dt className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Stock</dt>
                                    <dd className="flex items-center gap-2">
                                        <span className="font-mono tabular-nums font-bold">{totalStock}</span>
                                        <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-md border", stockStatus.cls)}>{stockStatus.label}</span>
                                    </dd>
                                </div>
                            </dl>
                        </div>
                    </aside>

                    {/* RIGHT: scrollable sections */}
                    <div className="flex-1 min-w-0 lg:overflow-y-auto custom-scrollbar p-4 sm:p-5 space-y-4" dir="rtl">
                        {/* Basic info */}
                        {section(<Tag className="h-4 w-4" />, "bg-primary/10 text-primary", "Basic info",
                            <>
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between gap-2">
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="ghost"
                                            onClick={handleAutoTranslateName}
                                            disabled={!editedProduct.name_en?.trim()}
                                            className="h-6 px-2 text-[10px] font-bold text-primary hover:bg-primary/10 rounded-md gap-1"
                                            title="Auto-translate English name to Dhivehi"
                                        >
                                            <Sparkles className="h-3 w-3" />
                                            <span>Auto Translate (ދިވެހިކުރޭ)</span>
                                        </Button>
                                        <Label className={lbl}>{renderBoth('product_name')} (ދިވެހި)*</Label>
                                    </div>
                                    <Input
                                        dir="rtl"
                                        value={editedProduct.name_dv}
                                        onChange={(e) => updateField('name_dv', e.target.value)}
                                        className={cn(fld, "text-right font-faruma font-bold")}
                                        placeholder="ތަކެތީގެ ނަން"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className={lbl}>{renderBoth('product_name')} (English)*</Label>
                                    <Input
                                        dir="ltr"
                                        value={editedProduct.name_en}
                                        onChange={(e) => updateField('name_en', e.target.value)}
                                        onBlur={() => {
                                            if (!editedProduct.name_dv?.trim() && editedProduct.name_en?.trim()) {
                                                const translated = translateEnglishToDhivehi(editedProduct.name_en);
                                                if (translated) updateField('name_dv', translated);
                                            }
                                        }}
                                        className={cn(fld, "text-left font-bold")}
                                        placeholder="Product Name"
                                    />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <Label className={lbl}>{renderBoth('item_code')}*</Label>
                                        <div className="relative">
                                            <Hash className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
                                            <Input
                                                dir="ltr"
                                                value={editedProduct.item_code}
                                                onChange={(e) => updateField('item_code', e.target.value.replace(/\D/g, ''))}
                                                placeholder="1001"
                                                className={cn(fld, "text-left pl-8 font-mono tabular-nums text-xs")}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className={lbl}>{renderBoth('category')}</Label>
                                        <Select value={editedProduct.category} onValueChange={(val) => updateField('category', val)}>
                                            <SelectTrigger className={cn(fld, "text-right text-xs font-bold")}>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="bg-popover text-popover-foreground border border-border">
                                                <SelectItem value="DRINKS" className="text-right">DRINKS</SelectItem>
                                                <SelectItem value="FOOD" className="text-right">FOOD</SelectItem>
                                                <SelectItem value="HARDWARE" className="text-right">HARDWARE</SelectItem>
                                                <SelectItem value="COSMETICS" className="text-right">COSMETICS</SelectItem>
                                                <SelectItem value="OTHER" className="text-right">OTHER</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Pricing & tax */}
                        {section(<DollarSign className="h-4 w-4" />, "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400", "Pricing & tax",
                            <>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <Label className={lbl}>{renderBoth('selling_price')} (Piece)*</Label>
                                        <div className="relative">
                                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-primary">{currency}</span>
                                            <Input
                                                dir="ltr"
                                                type="number"
                                                step="0.01"
                                                value={editedProduct.price}
                                                onChange={(e) => updateField('price', parseFloat(e.target.value) || 0)}
                                                onFocus={handleFocus}
                                                className={cn(fld, "h-11 text-left pl-14 pr-3 text-lg font-bold text-primary font-mono tabular-nums")}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className={lbl}>{renderBoth('cost_price')} (Piece)</Label>
                                        <div className="relative">
                                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-emerald-500">{currency}</span>
                                            <Input
                                                dir="ltr"
                                                type="number"
                                                step="0.01"
                                                value={editedProduct.cost_price ?? ''}
                                                onChange={(e) => updateField('cost_price', e.target.value === '' ? undefined : (parseFloat(e.target.value) || 0))}
                                                onFocus={handleFocus}
                                                placeholder="0.00"
                                                className={cn(fld, "h-11 text-left pl-14 pr-3 text-lg font-bold text-foreground font-mono tabular-nums")}
                                            />
                                        </div>
                                    </div>
                                </div>
                                {marginPct !== null && (
                                    <div className="flex items-center justify-between rounded-lg bg-muted/50 border border-border px-3 py-2 text-xs" dir="ltr">
                                        <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Margin</span>
                                        <span className={cn("font-bold tabular-nums", marginPct >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>
                                            {marginPct.toFixed(0)}% margin
                                        </span>
                                    </div>
                                )}
                                <div className="rounded-lg border border-border bg-muted/40 px-3 py-2.5 flex items-center justify-between">
                                    <Switch
                                        checked={editedProduct.is_zero_tax}
                                        onCheckedChange={(val) => updateField('is_zero_tax', val)}
                                        className="data-[state=checked]:bg-primary"
                                    />
                                    <Label className="font-bold text-xs uppercase tracking-wide text-muted-foreground">
                                        Zero Tax (0% GST)
                                    </Label>
                                </div>
                            </>
                        )}

                        {/* Barcodes */}
                        {section(<Barcode className="h-4 w-4" />, "bg-blue-500/10 text-blue-600 dark:text-blue-400", "Barcodes",
                            <>
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between gap-2 flex-wrap">
                                        <div className="flex items-center gap-1.5">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={generateUniqueBarcode}
                                                className="h-7 px-2 text-[10px] font-bold text-primary border-primary/30 hover:bg-primary/10 rounded-md gap-1"
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
                                                    className="h-7 px-2 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 rounded-md gap-1"
                                                    title="Print Barcode Label with Name & Price"
                                                >
                                                    <Printer className="h-3 w-3" />
                                                    <span>Print Label</span>
                                                </Button>
                                            )}
                                        </div>
                                        <Label className={lbl}>{renderBoth('barcode')}*</Label>
                                    </div>
                                    <div className="relative">
                                        <Barcode className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
                                        <Input
                                            dir="ltr"
                                            value={editedProduct.barcode}
                                            onChange={(e) => updateField('barcode', e.target.value)}
                                            placeholder="Scan barcode or click Generate"
                                            className={cn(fld, "text-left pl-8 font-mono tabular-nums text-xs")}
                                        />
                                    </div>
                                </div>

                                <Separator />

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-bold text-muted-foreground font-mono tabular-nums">
                                            {extraBarcodes.length} extra barcode{extraBarcodes.length === 1 ? '' : 's'}
                                        </span>
                                        <Label className="text-[10px] font-bold uppercase tracking-wide text-foreground">
                                            Extra Barcodes (އިތުރު ބާކޯޑުތައް)
                                        </Label>
                                    </div>
                                    <div className="flex gap-2" dir="ltr">
                                        <div className="relative flex-1 min-w-0">
                                            <Barcode className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
                                            <Input
                                                dir="ltr"
                                                value={extraBarcodeInput}
                                                onChange={(e) => setExtraBarcodeInput(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        handleAddExtraBarcode();
                                                    }
                                                }}
                                                placeholder="Scan or type another barcode & press Enter..."
                                                className={cn(fld, "text-left pl-8 font-mono tabular-nums text-xs")}
                                            />
                                        </div>
                                        <Button
                                            type="button"
                                            size="sm"
                                            onClick={handleAddExtraBarcode}
                                            disabled={!extraBarcodeInput.trim()}
                                            className="h-10 px-3 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs gap-1 shrink-0"
                                        >
                                            <Plus className="h-3.5 w-3.5" />
                                            <span>Add Barcode</span>
                                        </Button>
                                    </div>
                                    {extraBarcodes.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5" dir="ltr">
                                            {extraBarcodes.map((code) => (
                                                <Badge
                                                    key={code}
                                                    variant="secondary"
                                                    className="bg-muted text-foreground border border-border px-2 py-1 rounded-md font-mono tabular-nums text-xs font-semibold flex items-center gap-1.5 shadow-none"
                                                >
                                                    <Barcode className="h-3 w-3 opacity-60" />
                                                    <span>{code}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveExtraBarcode(code)}
                                                        className="ml-0.5 hover:bg-red-500/15 hover:text-red-500 rounded-full p-0.5 transition-colors"
                                                        title="Remove barcode"
                                                    >
                                                        <X className="h-3 w-3" />
                                                    </button>
                                                </Badge>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {editedProduct.barcode && (
                                    <div className="p-3 bg-muted/40 rounded-lg border border-border flex items-center justify-between gap-3 text-right">
                                        <Button
                                            type="button"
                                            size="sm"
                                            onClick={handlePrintBarcodeLabel}
                                            className="h-8 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 shrink-0"
                                        >
                                            <Printer className="h-3.5 w-3.5" />
                                            <span>Print Sticker (50x30mm)</span>
                                        </Button>
                                        <div className="flex-1 text-right min-w-0">
                                            <div className="flex items-center justify-end gap-2 text-xs font-bold min-w-0">
                                                <span className="font-mono tabular-nums text-primary shrink-0">{currency} {Number(editedProduct.price || 0).toFixed(2)}</span>
                                                <span className="truncate">{editedProduct.name_dv || editedProduct.name_en || 'Product'}</span>
                                            </div>
                                            <p className="text-[10px] font-mono tabular-nums text-muted-foreground mt-0.5 truncate">
                                                Scannable Barcode: {editedProduct.barcode}{extraBarcodes.length > 0 ? ` (+${extraBarcodes.length} extra)` : ''}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        {/* Stock & expiry */}
                        {section(<Boxes className="h-4 w-4" />, "bg-amber-500/10 text-amber-600 dark:text-amber-400", "Stock & expiry",
                            <>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between min-h-[16px]">
                                            {expiryDate ? (
                                                <button
                                                    type="button"
                                                    onClick={() => setExpiryDate(undefined)}
                                                    className="text-[10px] font-bold text-red-500 hover:text-red-600 flex items-center gap-0.5"
                                                    title="Clear expiry date"
                                                >
                                                    <X className="h-2.5 w-2.5" /> Clear
                                                </button>
                                            ) : <span />}
                                            <Label className={lbl}>{renderBoth('expiry_date')}</Label>
                                        </div>
                                        <div className="flex items-center gap-1.5" dir="ltr">
                                            <Input
                                                type="date"
                                                dir="ltr"
                                                value={expiryDate ? format(expiryDate, 'yyyy-MM-dd') : ''}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    if (!val) {
                                                        setExpiryDate(undefined);
                                                    } else {
                                                        const parsed = parseISO(val);
                                                        if (!isNaN(parsed.getTime())) {
                                                            setExpiryDate(parsed);
                                                        }
                                                    }
                                                }}
                                                className={cn(fld, "text-left font-mono tabular-nums font-bold text-xs flex-1 min-w-0 px-2.5")}
                                            />
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="icon"
                                                        className="h-10 w-10 shrink-0 rounded-xl"
                                                        title="Open Calendar Picker"
                                                    >
                                                        <CalendarIcon className="h-4 w-4 text-primary" />
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0 bg-popover border border-border z-[150]" align="center">
                                                    <Calendar
                                                        mode="single"
                                                        selected={expiryDate}
                                                        onSelect={setExpiryDate}
                                                        initialFocus
                                                        className="text-foreground"
                                                    />
                                                </PopoverContent>
                                            </Popover>
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className={lbl}>Stock</Label>
                                        <div className="h-10 rounded-xl border border-border bg-muted/40 px-3 flex items-center justify-between text-xs" dir="ltr">
                                            <span className="font-mono tabular-nums font-bold">
                                                Shop {Number(editedProduct.stock_shop || 0)} · Godown {Number(editedProduct.stock_godown || 0)}
                                            </span>
                                            <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-md border", stockStatus.cls)}>{stockStatus.label}</span>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Flavours & Packaging */}
                        {section(<Layers className="h-4 w-4" />, "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400", activeSubTab === 'flavours' ? "Flavours / variants" : "Packaging units",
                            <>
                                {/* Tab switch */}
                                <div className="flex bg-muted p-0.5 rounded-lg border border-border w-fit" dir="ltr">
                                    <button
                                        type="button"
                                        onClick={() => setActiveSubTab('flavours')}
                                        className={cn(
                                            "px-3 py-1.5 rounded-md text-xs font-bold transition-colors flex items-center gap-1.5",
                                            activeSubTab === 'flavours' ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                                        )}
                                    >
                                        <span>Flavours</span>
                                        {flavours.length > 0 && (
                                            <span className="h-4 min-w-[16px] px-1 rounded-full text-[9px] font-bold tabular-nums bg-background/25 flex items-center justify-center">
                                                {flavours.length}
                                            </span>
                                        )}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setActiveSubTab('units')}
                                        className={cn(
                                            "px-3 py-1.5 rounded-md text-xs font-bold transition-colors flex items-center gap-1.5",
                                            activeSubTab === 'units' ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                                        )}
                                    >
                                        <span>Box / Units</span>
                                        {units.length > 0 && (
                                            <span className="h-4 min-w-[16px] px-1 rounded-full text-[9px] font-bold tabular-nums bg-background/25 flex items-center justify-center">
                                                {units.length}
                                            </span>
                                        )}
                                    </button>
                                </div>

                                {/* TAB 1: FLAVOURS */}
                                {activeSubTab === 'flavours' && (
                                    <div className="space-y-3">
                                        {isFlavourFormOpen && (
                                            <div className="p-3 bg-muted/40 border border-primary/40 rounded-xl space-y-3 animate-in fade-in-50 duration-150">
                                                <div className="flex items-center justify-between border-b border-border pb-2">
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => setIsFlavourFormOpen(false)}
                                                        className="h-6 w-6 rounded-md text-muted-foreground hover:text-foreground"
                                                    >
                                                        <X className="h-3.5 w-3.5" />
                                                    </Button>
                                                    <span className="text-[11px] font-bold uppercase text-primary tracking-wide">
                                                        {editingFlavourIndex !== null ? 'Edit Flavour' : 'Add Flavour / Alternate Barcode'}
                                                    </span>
                                                </div>

                                                <div className="flex flex-wrap gap-1 justify-end">
                                                    {['Chocolate', 'Vanilla', 'Strawberry', 'Lemon', 'Orange', 'Spicy', 'Original', 'Mint'].map((preset) => (
                                                        <button
                                                            key={preset}
                                                            type="button"
                                                            onClick={() => setFlavourForm(prev => ({ ...prev, name: preset }))}
                                                            className={cn(
                                                                "px-2 py-0.5 rounded-md text-[10px] font-bold border transition-colors",
                                                                (flavourForm.name || '').toLowerCase() === preset.toLowerCase()
                                                                    ? "bg-primary text-primary-foreground border-primary"
                                                                    : "bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
                                                            )}
                                                        >
                                                            {preset}
                                                        </button>
                                                    ))}
                                                </div>

                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                    <div className="space-y-1">
                                                        <Label className={lbl}>Flavour / Scent Name*</Label>
                                                        <Input
                                                            dir="ltr"
                                                            value={flavourForm.name}
                                                            onChange={(e) => setFlavourForm(prev => ({ ...prev, name: e.target.value }))}
                                                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSaveFlavour(); } }}
                                                            placeholder="e.g. Chocolate"
                                                            className="h-9 rounded-lg bg-background text-left font-bold text-xs"
                                                            autoFocus
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <Label className={lbl}>Price (Optional)</Label>
                                                        <Input
                                                            dir="ltr"
                                                            type="number"
                                                            step="0.01"
                                                            value={flavourForm.price}
                                                            onChange={(e) => setFlavourForm(prev => ({ ...prev, price: e.target.value }))}
                                                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSaveFlavour(); } }}
                                                            placeholder={editedProduct.price ? String(editedProduct.price) : '0.00'}
                                                            className="h-9 rounded-lg bg-background text-left font-mono tabular-nums font-bold text-xs text-primary"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="space-y-1">
                                                    <div className="flex items-center justify-between">
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={generateFlavourBarcode}
                                                            className="h-6 px-2 text-[10px] font-bold text-primary border-primary/30 hover:bg-primary/10 rounded-md gap-1"
                                                        >
                                                            <Sparkles className="h-3 w-3" />
                                                            <span>Auto Barcode</span>
                                                        </Button>
                                                        <Label className={lbl}>Flavour Barcode</Label>
                                                    </div>
                                                    <Input
                                                        dir="ltr"
                                                        value={flavourForm.barcode}
                                                        onChange={(e) => setFlavourForm(prev => ({ ...prev, barcode: e.target.value }))}
                                                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSaveFlavour(); } }}
                                                        placeholder="Scan flavour barcode or auto-generate"
                                                        className="h-9 rounded-lg bg-background text-left font-mono tabular-nums text-[11px]"
                                                    />
                                                </div>

                                                <div className="flex justify-end gap-1.5">
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => setIsFlavourFormOpen(false)}
                                                        className="h-8 px-3 rounded-lg text-xs font-bold"
                                                    >
                                                        Cancel
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        onClick={handleSaveFlavour}
                                                        className="h-8 px-4 rounded-lg bg-primary text-primary-foreground text-xs font-bold"
                                                    >
                                                        <Check className="h-3 w-3 mr-1" />
                                                        {editingFlavourIndex !== null ? 'Update Flavour' : 'Save Flavour'}
                                                    </Button>
                                                </div>
                                            </div>
                                        )}

                                        <div className="space-y-2">
                                            {flavours.length > 0 ? (
                                                flavours.map((f, index) => {
                                                    const price = f.price !== undefined ? Number(f.price) : Number(editedProduct.price || 0);
                                                    return (
                                                        <div
                                                            key={index}
                                                            className="p-2.5 bg-background border border-border hover:border-primary/40 rounded-lg flex items-center justify-between gap-2 transition-colors"
                                                        >
                                                            <div className="flex items-center gap-0.5 shrink-0">
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => handleEditFlavour(index)}
                                                                    className="h-7 w-7 rounded-md text-blue-500 hover:bg-blue-500/10"
                                                                    title="Edit flavour"
                                                                >
                                                                    <Pencil className="h-3 w-3" />
                                                                </Button>
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => handleDeleteFlavour(index)}
                                                                    className="h-7 w-7 rounded-md text-red-500 hover:bg-red-500/10"
                                                                    title="Delete flavour"
                                                                >
                                                                    <Trash2 className="h-3 w-3" />
                                                                </Button>
                                                            </div>

                                                            <div className="flex items-center gap-2.5 flex-1 min-w-0 justify-end text-right">
                                                                <div className="text-left font-mono tabular-nums min-w-0">
                                                                    <span className="text-xs font-bold text-primary block">
                                                                        {settings?.shop?.currency || 'MVR'} {price.toFixed(2)}
                                                                    </span>
                                                                    {f.barcode && (
                                                                        <span className="text-[10px] text-muted-foreground font-mono block truncate">
                                                                            {f.barcode}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <Badge className="bg-primary/10 text-primary border border-primary/30 text-[11px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md shadow-none hover:bg-primary/10 max-w-[50%] truncate">
                                                                    {f.name}
                                                                </Badge>
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            ) : (
                                                !isFlavourFormOpen && (
                                                    <div className="flex flex-col items-center justify-center p-5 border border-dashed border-border rounded-lg bg-muted/30 text-center">
                                                        <Tag className="h-6 w-6 text-muted-foreground/40 mb-1.5" />
                                                        <p className="text-xs font-bold text-muted-foreground">No flavours added yet</p>
                                                        <p className="text-[11px] text-muted-foreground/70 mt-1 max-w-sm">
                                                            Have multiple flavours (e.g. Chocolate, Vanilla, Strawberry)? Add them here with their barcodes without creating duplicate products!
                                                        </p>
                                                    </div>
                                                )
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* TAB 2: PACKAGING UNITS */}
                                {activeSubTab === 'units' && (
                                    <div className="space-y-3">
                                        {isUnitFormOpen && (
                                            <div className="p-3 bg-muted/40 border border-primary/40 rounded-xl space-y-3 animate-in fade-in-50 duration-150">
                                                <div className="flex items-center justify-between border-b border-border pb-2">
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => setIsUnitFormOpen(false)}
                                                        className="h-6 w-6 rounded-md text-muted-foreground hover:text-foreground"
                                                    >
                                                        <X className="h-3.5 w-3.5" />
                                                    </Button>
                                                    <span className="text-[11px] font-bold uppercase text-primary tracking-wide">
                                                        {editingUnitIndex !== null ? renderBoth('edit_unit') : renderBoth('add_unit')}
                                                    </span>
                                                </div>

                                                <div className="flex flex-wrap gap-1 justify-end">
                                                    {['Box', 'Case', 'Pack', 'Carton', 'Dozen'].map((preset) => (
                                                        <button
                                                            key={preset}
                                                            type="button"
                                                            onClick={() => setUnitForm(prev => ({ ...prev, name: preset }))}
                                                            className={cn(
                                                                "px-2.5 py-0.5 rounded-md text-[10px] font-bold border transition-colors",
                                                                (unitForm.name || '').toLowerCase() === preset.toLowerCase()
                                                                    ? "bg-primary text-primary-foreground border-primary"
                                                                    : "bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
                                                            )}
                                                        >
                                                            {preset}
                                                        </button>
                                                    ))}
                                                </div>

                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                    <div className="space-y-1">
                                                        <Label className={lbl}>{renderBoth('unit_name')}*</Label>
                                                        <Input
                                                            dir="ltr"
                                                            value={unitForm.name}
                                                            onChange={(e) => setUnitForm(prev => ({ ...prev, name: e.target.value }))}
                                                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSaveUnit(); } }}
                                                            placeholder="e.g. Box"
                                                            className="h-9 rounded-lg bg-background text-left font-bold text-xs"
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <Label className={lbl}>{renderBoth('conversion_factor')}*</Label>
                                                        <Input
                                                            dir="ltr"
                                                            type="number"
                                                            value={unitForm.conversion_factor}
                                                            onChange={(e) => setUnitForm(prev => ({ ...prev, conversion_factor: e.target.value }))}
                                                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSaveUnit(); } }}
                                                            placeholder="12"
                                                            className="h-9 rounded-lg bg-background text-left font-mono tabular-nums font-bold text-xs"
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <Label className={lbl}>{renderBoth('unit_price')} ({settings?.shop?.currency || 'MVR'})*</Label>
                                                        <Input
                                                            dir="ltr"
                                                            type="number"
                                                            step="0.01"
                                                            value={unitForm.price}
                                                            onChange={(e) => setUnitForm(prev => ({ ...prev, price: e.target.value }))}
                                                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSaveUnit(); } }}
                                                            placeholder="0.00"
                                                            className="h-9 rounded-lg bg-background text-left font-mono tabular-nums font-bold text-xs text-primary"
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <Label className={lbl}>{renderBoth('unit_barcode')}</Label>
                                                        <Input
                                                            dir="ltr"
                                                            value={unitForm.barcode}
                                                            onChange={(e) => setUnitForm(prev => ({ ...prev, barcode: e.target.value }))}
                                                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSaveUnit(); } }}
                                                            placeholder="Optional"
                                                            className="h-9 rounded-lg bg-background text-left font-mono tabular-nums text-[11px]"
                                                        />
                                                    </div>
                                                </div>

                                                {parseFloat(unitForm.price) > 0 && parseFloat(unitForm.conversion_factor) > 0 && (
                                                    <div className="p-1.5 rounded-lg bg-card text-[11px] text-muted-foreground text-center font-mono tabular-nums border border-border">
                                                        = {settings?.shop?.currency || 'MVR'} {(parseFloat(unitForm.price) / parseFloat(unitForm.conversion_factor)).toFixed(2)} / pc
                                                    </div>
                                                )}

                                                <div className="flex justify-end gap-1.5">
                                                    <Button
                                                        type="button"
                                                        variant="outline"
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
                                                        className="h-8 px-4 rounded-lg bg-primary text-primary-foreground text-xs font-bold"
                                                    >
                                                        <Check className="h-3 w-3 mr-1" />
                                                        {editingUnitIndex !== null ? 'Update' : 'Save Unit'}
                                                    </Button>
                                                </div>
                                            </div>
                                        )}

                                        <div className="space-y-2">
                                            {units.length > 0 ? (
                                                units.map((u, index) => {
                                                    const conv = Number(u.conversion_factor || 0);
                                                    const price = Number(u.price || 0);
                                                    const perPiece = conv > 0 ? (price / conv).toFixed(2) : '0.00';
                                                    return (
                                                        <div
                                                            key={index}
                                                            className="p-2.5 bg-background border border-border hover:border-primary/40 rounded-lg flex items-center justify-between gap-2 transition-colors"
                                                        >
                                                            <div className="flex items-center gap-0.5 shrink-0">
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => handleEditUnit(index)}
                                                                    className="h-7 w-7 rounded-md text-blue-500 hover:bg-blue-500/10"
                                                                >
                                                                    <Pencil className="h-3 w-3" />
                                                                </Button>
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => handleDeleteUnit(index)}
                                                                    className="h-7 w-7 rounded-md text-red-500 hover:bg-red-500/10"
                                                                >
                                                                    <Trash2 className="h-3 w-3" />
                                                                </Button>
                                                            </div>

                                                            <div className="flex items-center gap-2.5 flex-1 min-w-0 justify-end text-right">
                                                                <div className="text-left font-mono tabular-nums">
                                                                    <span className="text-xs font-bold text-primary block">
                                                                        {settings?.shop?.currency || 'MVR'} {price.toFixed(2)}
                                                                    </span>
                                                                    <span className="text-[10px] text-muted-foreground block">
                                                                        ~ {settings?.shop?.currency || 'MVR'} {perPiece} / pc
                                                                    </span>
                                                                </div>
                                                                <div className="text-right">
                                                                    <Badge variant="outline" className="text-[11px] font-bold uppercase tracking-wide bg-primary/10 text-primary border-primary/30 px-2 py-0 rounded-md">
                                                                        {u.name}
                                                                    </Badge>
                                                                    <span className="text-[10px] text-muted-foreground font-bold block mt-0.5 tabular-nums">
                                                                        {u.conversion_factor} pcs
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            ) : (
                                                !isUnitFormOpen && (
                                                    <div className="flex flex-col items-center justify-center p-5 border border-dashed border-border rounded-lg bg-muted/30 text-center">
                                                        <Layers className="h-6 w-6 text-muted-foreground/40 mb-1.5" />
                                                        <p className="text-xs font-bold text-muted-foreground">{renderBoth('no_units_added')}</p>
                                                        <p className="text-[11px] text-muted-foreground/70 mt-1 max-w-sm">
                                                            Click "+ Add Unit" to add wholesale/box pricing (Box, Case, Pack).
                                                        </p>
                                                    </div>
                                                )
                                            )}
                                        </div>
                                    </div>
                                )}
                            </>,
                            activeSubTab === 'flavours' ? (
                                <Button
                                    type="button"
                                    size="sm"
                                    onClick={handleOpenAddFlavour}
                                    className="h-8 px-2.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs gap-1"
                                >
                                    <Plus className="h-3.5 w-3.5" />
                                    Add Flavour
                                </Button>
                            ) : (
                                <Button
                                    type="button"
                                    size="sm"
                                    onClick={handleOpenAddUnit}
                                    className="h-8 px-2.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs gap-1"
                                >
                                    <Plus className="h-3.5 w-3.5" />
                                    {renderBoth('add_unit')}
                                </Button>
                            )
                        )}
                    </div>
                </div>

                {/* Sticky footer */}
                <DialogFooter className="gap-3 sm:gap-3 sm:space-x-0 px-5 py-3 border-t border-border bg-card shrink-0 flex-row">
                    <Button variant="outline" onClick={onClose} className="flex-1 h-11 text-foreground font-bold uppercase tracking-wide text-xs rounded-lg">
                        {renderBoth('cancel')}
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={isUploadingImage}
                        className="flex-1 h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-bold uppercase tracking-wide text-xs rounded-lg disabled:opacity-50"
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

        {/* Online Image Finder Dialog */}
        {editedProduct && (
            <OnlineImageSearchDialog
                isOpen={isOnlineSearchOpen}
                onClose={() => setIsOnlineSearchOpen(false)}
                productName={editedProduct.name_en || editedProduct.name_dv || ''}
                barcode={editedProduct.barcode || ''}
                onSelectImage={handleOnlineImageSelect}
            />
        )}

        {/* Text on Image Stamp Tool */}
        {editedProduct && (
            <ImageTextStampDialog
                isOpen={isImageTextStampOpen}
                onClose={() => setIsImageTextStampOpen(false)}
                imageUrl={
                    localDataUrlRef.current ||
                    getAdaptedImageUrl(
                        imagePreviewUrl || editedProduct.image,
                        editedProduct.name_en || editedProduct.name_dv,
                        editedProduct.item_code
                    )
                }
                productName={editedProduct.name_en || editedProduct.name_dv || ''}
                flavourNames={flavours.map(f => f.name)}
                onApplyImage={handleApplyStampedImage}
            />
        )}
        </>
    );
};

export default ProductDialog;
