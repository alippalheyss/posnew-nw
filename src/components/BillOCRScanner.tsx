import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, FileSearch, CheckCircle2, AlertCircle, X, ShoppingCart, Loader2 } from 'lucide-react';
import { useAppContext, PurchaseItem, Product, Vendor } from '@/context/AppContext';
import { showSuccess, showError } from '@/utils/toast';
import { cn } from '@/lib/utils';

interface ExtractedData {
    vendorId: string;
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

        // Simulate thinking/scanning time
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Mock extraction logic
        // In a real app, this would be an API response
        const randomVendor = vendors[Math.floor(Math.random() * vendors.length)];
        const randomProducts = [...products].sort(() => 0.5 - Math.random()).slice(0, 3);

        const mockData: ExtractedData = {
            vendorId: randomVendor?.id || '',
            billNumber: `BILL-${Math.floor(1000 + Math.random() * 9000)}`,
            date: new Date().toISOString().split('T')[0],
            items: randomProducts.map(p => ({
                productName: p.name_en,
                suggestedProductId: p.id,
                quantity: Math.floor(Math.random() * 10) + 1,
                unitPrice: p.price * 0.8, // Assuming wholesale price is lower
                confidence: 0.85 + Math.random() * 0.1
            }))
        };

        setExtractedData(mockData);
        setIsProcessing(false);
        setIsCompleted(true);
        showSuccess(t('bill_scanned_successfully'));
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
                                        {vendors.find(v => v.id === extractedData?.vendorId)?.name_dv || t('unknown_vendor')}
                                    </div>
                                    <p className="text-[10px] text-green-600 mt-1 flex items-center gap-1">
                                        <CheckCircle2 className="h-3 w-3" /> {t('vendor_identified')}
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
                                    <Label className="text-[10px] font-bold uppercase opacity-50 mb-2 block">{t('items_found')}</Label>
                                    <div className="space-y-2">
                                        {extractedData?.items.map((item, idx) => (
                                            <div key={idx} className="p-2 bg-blue-50/50 dark:bg-blue-900/10 rounded border border-blue-100 dark:border-blue-900/30 text-xs">
                                                <div className="font-bold truncate">{item.productName}</div>
                                                <div className="flex justify-between mt-1 text-gray-500">
                                                    <span>{item.quantity} x {settings.shop.currency} {item.unitPrice.toFixed(2)}</span>
                                                    <span className="text-primary font-bold">{settings.shop.currency} {(item.quantity * item.unitPrice).toFixed(2)}</span>
                                                </div>
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
