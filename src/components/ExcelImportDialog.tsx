import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import * as XLSX from 'xlsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Upload, CheckCircle, XCircle } from 'lucide-react';
import { Product } from '@/context/AppContext';
import { showSuccess, showError } from '@/utils/toast';
import { generatePlaceholderImage } from '@/utils/imageUtils';

interface ExcelImportDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onImport: (products: Product[]) => void;
}

interface ParsedProduct {
    product: Product;
    isValid: boolean;
    errors: string[];
}

const ExcelImportDialog: React.FC<ExcelImportDialogProps> = ({ isOpen, onClose, onImport }) => {
    const { t } = useTranslation();
    const [file, setFile] = useState<File | null>(null);
    const [parsedProducts, setParsedProducts] = useState<ParsedProduct[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            setParsedProducts([]);
        }
    };

    const parseExcelFile = async () => {
        if (!file) return;

        setIsProcessing(true);
        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);

            const parsed: ParsedProduct[] = jsonData.map((row: any, index: number) => {
                const errors: string[] = [];

                // Validate required fields
                if (!row['Product Name (Dhivehi)']) errors.push('Missing Dhivehi name');
                if (!row['Product Name (English)']) errors.push('Missing English name');
                if (!row['Item Code']) errors.push('Missing item code');
                if (!row['Barcode']) errors.push('Missing barcode');
                if (!row['Category']) errors.push('Missing category');
                if (row['Selling Price'] === undefined || row['Selling Price'] === null) errors.push('Missing selling price');
                if (row['Cost Price'] === undefined || row['Cost Price'] === null) errors.push('Missing cost price');
                if (row['Shop Stock'] === undefined || row['Shop Stock'] === null) errors.push('Missing shop stock');
                if (row['Godown Stock'] === undefined || row['Godown Stock'] === null) errors.push('Missing godown stock');

                // Parse tax exempt field
                const taxExemptValue = row['Is Tax Exempt'];
                let isTaxExempt = false;
                if (taxExemptValue) {
                    const normalized = String(taxExemptValue).toLowerCase().trim();
                    isTaxExempt = normalized === 'yes' || normalized === '1' || normalized === 'true';
                }

                const product: Product = {
                    id: `imported-${Date.now()}-${index}`,
                    name_dv: row['Product Name (Dhivehi)'] || '',
                    name_en: row['Product Name (English)'] || '',
                    item_code: row['Item Code'] || '',
                    barcode: row['Barcode'] || '',
                    category: row['Category'] || '',
                    price: Number(row['Selling Price']) || 0,
                    cost_price: Number(row['Cost Price']) || 0,
                    stock_shop: Number(row['Shop Stock']) || 0,
                    stock_godown: Number(row['Godown Stock']) || 0,
                    is_zero_tax: isTaxExempt,
                    image: generatePlaceholderImage(row['Product Name (English)'] || row['Product Name (Dhivehi)'] || 'Product', row['Item Code'])
                };

                return {
                    product,
                    isValid: errors.length === 0,
                    errors
                };
            });

            setParsedProducts(parsed);
            showSuccess(`${t('parsed')} ${parsed.length} ${t('products')}`);
        } catch (error) {
            showError(t('error_parsing_file'));
            console.error('Error parsing Excel file:', error);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleImport = () => {
        const validProducts = parsedProducts.filter(p => p.isValid).map(p => p.product);

        if (validProducts.length === 0) {
            showError(t('no_valid_products'));
            return;
        }

        onImport(validProducts);
        showSuccess(`${validProducts.length} ${t('products_imported_successfully')}`);
        handleClose();
    };

    const handleClose = () => {
        setFile(null);
        setParsedProducts([]);
        setIsProcessing(false);
        onClose();
    };

    const validCount = parsedProducts.filter(p => p.isValid).length;
    const errorCount = parsedProducts.filter(p => !p.isValid).length;

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{t('import_excel')}</DialogTitle>
                    <DialogDescription>{t('upload_excel_file')}</DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {/* File Upload */}
                    <div className="space-y-2">
                        <Label htmlFor="excel-file">{t('select_file')}</Label>
                        <div className="flex gap-2">
                            <Input
                                id="excel-file"
                                type="file"
                                accept=".xlsx,.xls"
                                onChange={handleFileChange}
                                className="flex-1"
                            />
                            <Button
                                onClick={parseExcelFile}
                                disabled={!file || isProcessing}
                                variant="outline"
                            >
                                <Upload className="h-4 w-4 mr-2" />
                                {t('parse_file')}
                            </Button>
                        </div>
                        {file && <p className="text-sm text-muted-foreground">{t('file_selected')}: {file.name}</p>}
                    </div>

                    {/* Expected Format Info */}
                    {!parsedProducts.length && (
                        <div className="bg-muted p-4 rounded-md">
                            <p className="text-sm font-medium mb-2">{t('expected_format')}:</p>
                            <p className="text-xs text-muted-foreground">
                                Product Name (Dhivehi), Product Name (English), Item Code, Barcode, Category, Selling Price, Cost Price, Shop Stock, Godown Stock, Is Tax Exempt
                            </p>
                        </div>
                    )}

                    {/* Preview Table */}
                    {parsedProducts.length > 0 && (
                        <>
                            <div className="flex gap-4 text-sm">
                                <div className="flex items-center gap-2">
                                    <CheckCircle className="h-4 w-4 text-green-600" />
                                    <span>{validCount} {t('valid_products')}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <XCircle className="h-4 w-4 text-red-600" />
                                    <span>{errorCount} {t('invalid_products')}</span>
                                </div>
                            </div>

                            <div className="border rounded-md max-h-96 overflow-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-12">{t('status')}</TableHead>
                                            <TableHead>{t('product_name_dv')}</TableHead>
                                            <TableHead>{t('product_name_en')}</TableHead>
                                            <TableHead>{t('item_code')}</TableHead>
                                            <TableHead>{t('barcode')}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {parsedProducts.map((item, index) => (
                                            <TableRow key={index} className={!item.isValid ? 'bg-red-50 dark:bg-red-950/20' : ''}>
                                                <TableCell>
                                                    {item.isValid ? (
                                                        <CheckCircle className="h-4 w-4 text-green-600" />
                                                    ) : (
                                                        <XCircle className="h-4 w-4 text-red-600" />
                                                    )}
                                                </TableCell>
                                                <TableCell>{item.product.name_dv}</TableCell>
                                                <TableCell>{item.product.name_en}</TableCell>
                                                <TableCell>{item.product.item_code}</TableCell>
                                                <TableCell>{item.product.barcode}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={handleClose}>
                        {t('cancel')}
                    </Button>
                    <Button
                        onClick={handleImport}
                        disabled={validCount === 0 || isProcessing}
                    >
                        {t('import_products')} ({validCount} {t('products')})
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default ExcelImportDialog;
