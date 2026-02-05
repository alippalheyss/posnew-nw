import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, FileSearch, CheckCircle2, AlertCircle, X, ShoppingCart, Loader2, Database, AlertTriangle } from 'lucide-react';
import { useAppContext, PurchaseItem, Product, Vendor } from '@/context/AppContext';
import { ocrService, OCRResult } from '@/services/ocrService';
import { showSuccess, showError } from '@/utils/toast';
import { cn } from '@/lib/utils';

interface ExtractedData {
    vendorId: string;
    rawVendorName?: string;
    billNumber: string;
    date: string;
    items: Array<{
        productName: string;
        suggestedProductId?: string;
        quantity: number;
        unitPrice: number;
        confidence: number;
    }>;
}

interface BillOCRScannerProps {
    onExtractionComplete: (data: ExtractedData) => void;
}

const BillOCRScanner: React.FC<BillOCRScannerProps> = ({ onExtractionComplete }) => {
    const { t } = useTranslation();
    const { products, vendors, settings } = useAppContext();
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isCompleted, setIsCompleted] = useState(false);
    const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setSelectedImage(reader.result as string);
                setIsCompleted(false);
                setExtractedData(null);
            };
            reader.readAsDataURL(file);
        }
    };

    const simulateOCR = async () => {
        if (!selectedImage) return;

        setIsProcessing(true);
        setExtractedData(null);

        try {
            const result = await ocrService.analyzeBill(selectedImage);
            console.log("Scanner received OCR result:", result);

            // Map the OCR result to our system's vendors and products
            const mappedData: ExtractedData = {
                vendorId: findBestVendorMatch(result.vendorName),
                rawVendorName: result.vendorName,
                billNumber: result.billNumber,
                date: result.date || new Date().toISOString().split('T')[0],
                items: (result.items || []).map(item => {
                    const matchedProduct = findBestProductMatch(item.description);
                    return {
                        productName: matchedProduct ? matchedProduct.name_en : item.description,
                        suggestedProductId: matchedProduct?.id,
                        quantity: item.quantity || 1,
                        unitPrice: item.unitPrice || 0,
                        confidence: 0.9 // Placeholder for now
                    };
                })
            };

            console.log("Scanner mapped data:", mappedData);
            setExtractedData(mappedData);
            setIsCompleted(true);
            showSuccess(t('bill_scanned_successfully'));
        } catch (error) {
            console.error("Extraction failed:", error);
            showError(error instanceof Error ? error.message : t('extraction_failed'));
        } finally {
            setIsProcessing(false);
        }
    };

    // Simple fuzzy matching for Vendors
    const findBestVendorMatch = (name: string): string => {
        if (!name) return '';
        const lowerName = name.toLowerCase();

        // Exact match
        const exact = vendors.find(v =>
            v.name_en.toLowerCase() === lowerName ||
            v.name_dv.toLowerCase() === lowerName
        );
        if (exact) return exact.id;

        // Partial match
        const partial = vendors.find(v =>
            lowerName.includes(v.name_en.toLowerCase()) ||
            v.name_en.toLowerCase().includes(lowerName)
        );
        return partial ? partial.id : '';
    };

    // Simple fuzzy matching for Products
    const findBestProductMatch = (name: string): Product | undefined => {
        if (!name) return undefined;
        const lowerName = name.toLowerCase();

        // Level 1: Exact match name_en or name_dv
        const exact = products.find(p =>
            p.name_en.toLowerCase() === lowerName ||
            p.name_dv.toLowerCase() === lowerName
        );
        if (exact) return exact;

        // Level 2: Word-based intersection (shared words)
        const nameWords = lowerName.split(/\s+/).filter(w => w.length > 2);
        if (nameWords.length === 0) return undefined;

        let bestMatch: Product | undefined = undefined;
        let maxOverlap = 0;

        for (const p of products) {
            const pWords = p.name_en.toLowerCase().split(/\s+/);
            const overlap = nameWords.filter(w => pWords.includes(w)).length;

            if (overlap > maxOverlap) {
                maxOverlap = overlap;
                bestMatch = p;
            }
        }

        return maxOverlap > 0 ? bestMatch : undefined;
    };

    const handleConfirm = () => {
        if (extractedData) {
            onExtractionComplete(extractedData);
        }
    };

    const reset = () => {
        setSelectedImage(null);
        setExtractedData(null);
        setIsCompleted(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const renderBoth = (key: string, options?: any) => (
        <>
            {t(key, options)} ({t(key, { ...options, lng: 'en' })})
        </>
    );

    return (
        <div className="space-y-6 font-faruma" dir="rtl">
            {!selectedImage ? (
                <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-12 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors group"
                >
                    <div className="p-4 bg-primary/10 rounded-full group-hover:scale-110 transition-transform">
                        <Upload className="h-10 w-10 text-primary" />
                    </div>
                    <h3 className="mt-4 text-lg font-bold">{t('drop_bill_here')}</h3>
                    <p className="text-sm text-gray-500 mt-1">{t('supported_formats')}</p>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImageUpload}
                        accept="image/*"
                        className="hidden"
                    />
                </div>
            ) : (
                <Card className="overflow-hidden border-none shadow-lg">
                    <CardContent className="p-0 flex flex-col md:flex-row h-[500px]">
                        {/* Image Preview Area */}
                        <div className="relative flex-1 bg-black/5 flex items-center justify-center overflow-hidden">
                            <img
                                src={selectedImage}
                                alt="Bill Preview"
                                className={cn(
                                    "max-h-full max-w-full object-contain transition-opacity duration-500",
                                    isProcessing ? "opacity-50" : "opacity-100"
                                )}
                            />

                            {/* Scanning Animation */}
                            {isProcessing && (
                                <div className="absolute inset-0 z-10">
                                    <div className="w-full h-1 bg-primary/50 absolute top-0 animate-scan-beam shadow-[0_0_15px_rgba(var(--primary),0.8)]"></div>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/20 backdrop-blur-sm">
                                        <Loader2 className="h-12 w-12 text-white animate-spin mb-4" />
                                        <span className="text-white font-bold text-lg animate-pulse">{t('processing_bill')}</span>
                                        <span className="text-white/70 text-sm mt-1">{t('extracting_data')}</span>
                                    </div>
                                </div>
                            )}

                            {!isProcessing && !isCompleted && (
                                <div className="absolute bottom-4 inset-x-4 flex gap-2 justify-center">
                                    <Button onClick={simulateOCR} className="bg-primary hover:bg-primary/90 shadow-lg">
                                        <FileSearch className="h-4 w-4 ml-2" /> {t('scan_bill')}
                                    </Button>
                                    <Button variant="secondary" onClick={reset} className="shadow-lg">
                                        <X className="h-4 w-4 ml-2" /> {t('cancel')}
                                    </Button>
                                </div>
                            )}

                            {isCompleted && (
                                <Button
                                    variant="outline"
                                    className="absolute top-4 left-4 h-8 w-8 p-0 rounded-full bg-white/80 backdrop-blur-sm shadow-sm"
                                    onClick={reset}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            )}
                        </div>

                        {/* Results Area */}
                        <div className={cn(
                            "w-full md:w-80 p-6 flex flex-col border-r bg-white dark:bg-gray-950 transition-all duration-500",
                            isCompleted ? "translate-x-0 opacity-100" : "translate-x-20 opacity-0 pointer-events-none"
                        )}>
                            <h3 className="text-xl font-black mb-4 flex items-center gap-2">
                                <CheckCircle2 className="h-5 w-5 text-green-500" />
                                {t('confirm_extracted_data')}
                            </h3>

                            <div className="space-y-4 flex-1 overflow-y-auto">
                                <div>
                                    <Label className="text-[10px] font-bold uppercase opacity-50">{t('vendor')}</Label>
                                    <div className="p-2 bg-gray-50 dark:bg-white/5 rounded border text-sm font-bold">
                                        {extractedData?.vendorId
                                            ? (vendors.find(v => v.id === extractedData?.vendorId)?.name_dv || vendors.find(v => v.id === extractedData?.vendorId)?.name_en)
                                            : (extractedData?.rawVendorName || t('unknown_vendor'))}
                                    </div>
                                    <p className={cn(
                                        "text-[10px] mt-1 flex items-center gap-1",
                                        extractedData?.vendorId ? "text-green-600" : "text-yellow-600"
                                    )}>
                                        {extractedData?.vendorId
                                            ? <><CheckCircle2 className="h-3 w-3" /> {t('vendor_identified')}</>
                                            : <><AlertTriangle className="h-3 w-3" /> {t('vendor_not_in_system')}</>}
                                    </p>
                                </div>

                                <div>
                                    <Label className="text-[10px] font-bold uppercase opacity-50">{t('bill_number')}</Label>
                                    <div className="p-2 bg-gray-50 dark:bg-white/5 rounded border text-sm font-mono">
                                        {extractedData?.billNumber}
                                    </div>
                                    <p className="text-[10px] text-green-600 mt-1 flex items-center gap-1">
                                        <CheckCircle2 className="h-3 w-3" /> {t('bill_number_identified')}
                                    </p>
                                </div>

                                <div>
                                    <Label className="text-[10px] font-bold uppercase opacity-50 block mb-2">{t('items_found')}</Label>
                                    <div className="space-y-2">
                                        {extractedData?.items.length === 0 && (
                                            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-100 dark:border-yellow-900/30 rounded text-xs text-center text-yellow-700">
                                                {t('no_items_found_in_bill')}
                                            </div>
                                        )}
                                        {extractedData?.items.map((item, idx) => (
                                            <div key={idx} className={cn(
                                                "p-2 rounded border text-xs",
                                                item.suggestedProductId
                                                    ? "bg-green-50/50 dark:bg-green-900/10 border-green-100 dark:border-green-900/30"
                                                    : "bg-yellow-50/50 dark:bg-yellow-900/10 border-yellow-100 dark:border-yellow-900/30"
                                            )}>
                                                <div className="flex justify-between items-start mb-1">
                                                    <div className="font-bold truncate flex-1">{item.productName}</div>
                                                    {item.suggestedProductId ? (
                                                        <Database className="h-3 w-3 text-green-600 flex-shrink-0" />
                                                    ) : (
                                                        <AlertTriangle className="h-3 w-3 text-yellow-600 flex-shrink-0" />
                                                    )}
                                                </div>
                                                <div className="flex justify-between text-gray-500">
                                                    <span>{item.quantity} x {settings.shop.currency} {item.unitPrice.toFixed(2)}</span>
                                                    <span className="text-primary font-bold">{settings.shop.currency} {(item.quantity * item.unitPrice).toFixed(2)}</span>
                                                </div>
                                                {!item.suggestedProductId && (
                                                    <div className="text-[10px] text-yellow-700 mt-1 italic">
                                                        {t('no_system_match')}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <Button onClick={handleConfirm} className="w-full bg-green-600 hover:bg-green-700 text-white mt-6">
                                <ShoppingCart className="h-4 w-4 ml-2" /> {t('add_to_purchase_list')}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes scan-beam {
                    0% { top: 0; }
                    100% { top: 100%; }
                }
                .animate-scan-beam {
                    animation: scan-beam 2s ease-in-out infinite alternate;
                }
            `}} />
        </div>
    );
};

export default BillOCRScanner;
