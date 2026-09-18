import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import * as XLSX from 'xlsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Upload, CheckCircle, XCircle, FileSpreadsheet, AlertTriangle, Loader2, Download, HelpCircle } from 'lucide-react';
import { Product, useAppContext } from '@/context/AppContext';
import { showSuccess, showError } from '@/utils/toast';
import { generatePlaceholderImage } from '@/utils/imageUtils';

interface ExcelImportDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onImport?: (products: Product[]) => void;
}

interface ParsedProduct {
    product: Product;
    isValid: boolean;
    errors: string[];
}

const ExcelImportDialog: React.FC<ExcelImportDialogProps> = ({ isOpen, onClose }) => {
    const { t } = useTranslation();
    const { bulkImportProducts } = useAppContext();
    const [file, setFile] = useState<File | null>(null);
    const [parsedProducts, setParsedProducts] = useState<ParsedProduct[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [importProgress, setImportProgress] = useState<{ percent: number; count: number; total: number } | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            setParsedProducts([]);
            setImportProgress(null);
        }
    };

    // Download clean pre-formatted Excel template
    const handleDownloadTemplate = () => {
        const headers = [
            "Item Code",
            "Barcode",
            "Product Name (English)",
            "Product Name (Dhivehi)",
            "Category",
            "Selling Price",
            "Cost Price",
            "Shop Stock",
            "Godown Stock",
            "Is Tax Exempt"
        ];

        const sampleRows = [
            [
                "PRD001",
                "8901030383821",
                "Coca Cola 330ml Can",
                "ކޮކާ ކޯލާ 330އެމްއެލް",
                "BEVERAGES",
                15.00,
                11.50,
                50,
                100,
                "No"
            ],
            [
                "PRD002",
                "8901030383822",
                "Basmati Rice 5kg",
                "ބާސްމަތީ ހަނޑޫ 5ކިލޯ",
                "ESSENTIALS",
                120.00,
                95.00,
                30,
                60,
                "Yes"
            ],
            [
                "PRD003",
                "8901030383823",
                "Full Cream Milk 1L",
                "ފުލް ކްރީމް ކިރު 1ލީޓަރު",
                "DAIRY",
                28.00,
                22.00,
                40,
                80,
                "Yes"
            ],
            [
                "PRD004",
                "8901030383824",
                "Lipton Yellow Label Tea 100s",
                "ލިޕްޓަން ސައިފަތް 100",
                "BEVERAGES",
                65.00,
                50.00,
                25,
                50,
                "No"
            ]
        ];

        const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
        ws['!cols'] = [
            { wch: 15 },
            { wch: 18 },
            { wch: 30 },
            { wch: 30 },
            { wch: 18 },
            { wch: 14 },
            { wch: 14 },
            { wch: 14 },
            { wch: 14 },
            { wch: 16 }
        ];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Product Template");
        XLSX.writeFile(wb, "Product_Import_Template.xlsx");
        showSuccess("Sample Excel template downloaded! (ސާމްޕަލް އެކްސެލް ފޯމެޓް ޑައުންލޯޑް ކުރެވިއްޖެ)");
    };

    const parseExcelFile = async () => {
        if (!file) return;

        setIsProcessing(true);
        setImportProgress(null);
        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

            if (!jsonData || jsonData.length === 0) {
                showError('Excel file contains no data rows (ފައިލުގައި އެއްވެސް ޑޭޓާއެއް ނެތް)');
                setIsProcessing(false);
                return;
            }

            const parsed: ParsedProduct[] = jsonData.map((row: any, index: number) => {
                const errors: string[] = [];

                // Flexible field key lookup (case-insensitive / whitespace-trimmed)
                const getVal = (keys: string[]) => {
                    for (const k of keys) {
                        if (row[k] !== undefined && row[k] !== '') return row[k];
                    }
                    const rowKeys = Object.keys(row);
                    for (const rk of rowKeys) {
                        const cleanRk = rk.trim().toLowerCase();
                        for (const k of keys) {
                            if (cleanRk === k.toLowerCase()) return row[rk];
                        }
                    }
                    return '';
                };

                const nameDv = String(getVal(['Product Name (Dhivehi)', 'name_dv', 'Dhivehi Name', 'Dhivehi', 'ނަން'])).trim();
                const nameEn = String(getVal(['Product Name (English)', 'name_en', 'English Name', 'English', 'Product Name', 'Name', 'Description'])).trim();
                const rawItemCode = String(getVal(['Item Code', 'item_code', 'Product Code', 'Code', 'ItemCode', 'SKU', 'ކޯޑް'])).trim();
                const rawBarcode = String(getVal(['Barcode', 'barcode', 'Bar Code', 'UPC', 'EAN', 'ބާކޯޑް'])).trim();
                const category = String(getVal(['Category', 'category', 'Cat', 'Department', 'ބައި'])).trim() || 'OTHER';
                
                const rawPrice = getVal(['Selling Price', 'price', 'Price', 'SellingPrice', 'Rate', 'MRP', 'ވިއްކާ އަގު']);
                const rawCost = getVal(['Cost Price', 'cost_price', 'Cost', 'CostPrice', 'Purchase Price', 'ގަތް އަގު']);
                const rawStockShop = getVal(['Shop Stock', 'stock_shop', 'Stock', 'ShopStock', 'Quantity', 'Qty', 'Shop Qty', 'ތަކެތީގެ އަދަދު']);
                const rawStockGodown = getVal(['Godown Stock', 'stock_godown', 'GodownStock', 'Godown Qty', 'Warehouse Stock']);

                // Validation
                if (!nameDv && !nameEn) errors.push('Missing product name');
                if (rawPrice === '' || rawPrice === undefined) errors.push('Missing selling price');

                // Parse tax exempt
                const taxExemptValue = String(getVal(['Is Tax Exempt', 'is_zero_tax', 'Tax Exempt', 'Zero Tax'])).toLowerCase().trim();
                const isTaxExempt = taxExemptValue === 'yes' || taxExemptValue === '1' || taxExemptValue === 'true';

                const parseSafeInt = (val: any): number => {
                    if (val === null || val === undefined || val === '') return 0;
                    const num = Number(val);
                    if (isNaN(num)) return 0;
                    return Math.round(num);
                };

                const parseSafeFloat = (val: any): number => {
                    if (val === null || val === undefined || val === '') return 0;
                    const num = Number(val);
                    return isNaN(num) ? 0 : num;
                };

                // PRESERVE EXACT ITEM CODE AND BARCODE AS IN EXCEL
                const finalItemCode = rawItemCode ? rawItemCode : (rawBarcode ? rawBarcode : String(index + 1));
                const finalBarcode = rawBarcode ? rawBarcode : (rawItemCode ? rawItemCode : '');

                const product: Product = {
                    id: crypto.randomUUID(),
                    name_dv: nameDv || nameEn || 'Product',
                    name_en: nameEn || nameDv || 'Product',
                    item_code: finalItemCode,
                    barcode: finalBarcode,
                    category: category.toUpperCase() || 'OTHER',
                    price: parseSafeFloat(rawPrice),
                    cost_price: rawCost !== '' && rawCost !== undefined && Number(rawCost) > 0 ? parseSafeFloat(rawCost) : null,
                    stock_shop: parseSafeInt(rawStockShop),
                    stock_godown: parseSafeInt(rawStockGodown),
                    is_zero_tax: isTaxExempt,
                    image: generatePlaceholderImage(nameEn || nameDv || 'Product', finalItemCode)
                };

                return {
                    product,
                    isValid: errors.length === 0,
                    errors
                };
            });

            setParsedProducts(parsed);
            showSuccess(`Successfully parsed ${parsed.length.toLocaleString()} products from Excel!`);
        } catch (error) {
            showError('Failed to parse Excel file. Please verify the format.');
            console.error('Error parsing Excel file:', error);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleImport = async () => {
        const validProducts = parsedProducts.filter(p => p.isValid).map(p => p.product);

        if (validProducts.length === 0) {
            showError(t('no_valid_products') || 'No valid products found to import');
            return;
        }

        setIsImporting(true);
        setImportProgress({ percent: 0, count: 0, total: validProducts.length });

        try {
            await bulkImportProducts(validProducts, (pct, count) => {
                setImportProgress({ percent: pct, count, total: validProducts.length });
            });
            handleClose();
        } catch (error) {
            console.error('Import execution error:', error);
        } finally {
            setIsImporting(false);
        }
    };

    const handleClose = () => {
        if (isImporting) return; // prevent close during large batch transfer
        setFile(null);
        setParsedProducts([]);
        setIsProcessing(false);
        setIsImporting(false);
        setImportProgress(null);
        onClose();
    };

    const validCount = parsedProducts.filter(p => p.isValid).length;
    const errorCount = parsedProducts.filter(p => !p.isValid).length;
    const previewList = parsedProducts.slice(0, 50);

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto font-faruma bg-card border border-border text-foreground shadow-2xl rounded-3xl p-6 sm:p-7 box-border" dir="rtl">
                <DialogHeader className="text-right pb-3 border-b border-border/60">
                    <div className="flex items-center justify-between">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleDownloadTemplate}
                            className="rounded-xl border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-xs gap-1.5 h-9"
                        >
                            <Download className="h-4 w-4" />
                            <span>Download Excel Template (ސާމްޕަލް ފޯމެޓް)</span>
                        </Button>
                        <DialogTitle className="text-xl font-black text-foreground flex items-center justify-end gap-2.5">
                            <span>{t('import_excel') || 'Excel Import Products'} (އެކްސެލް އިން ޕްރޮޑަކްޓް އެތެރެކުރުން)</span>
                            <FileSpreadsheet className="h-6 w-6 text-primary" />
                        </DialogTitle>
                    </div>
                    <DialogDescription className="text-xs text-muted-foreground text-right mt-1">
                        Easily upload and import large inventory catalogs. The system preserves your exact Item Code and Barcode values without alteration.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-5 py-2">
                    {/* File Upload Section */}
                    <div className="space-y-2 text-right">
                        <Label htmlFor="excel-file" className="text-xs font-black uppercase text-muted-foreground">
                            {t('select_file') || 'Select Excel File (.xlsx, .xls, .csv)'}*
                        </Label>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <Input
                                id="excel-file"
                                type="file"
                                accept=".xlsx,.xls,.csv"
                                onChange={handleFileChange}
                                disabled={isProcessing || isImporting}
                                className="flex-1 bg-muted border-border font-mono h-11 rounded-xl cursor-pointer file:cursor-pointer file:font-black file:text-xs file:bg-primary/20 file:text-primary file:border-none file:rounded-lg file:mr-3"
                            />
                            <Button
                                onClick={parseExcelFile}
                                disabled={!file || isProcessing || isImporting}
                                className="bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs h-11 px-6 rounded-xl shadow-md gap-2"
                            >
                                {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                                <span>{isProcessing ? 'Reading File...' : 'Parse & Validate (ޗެކްކުރޭ)'}</span>
                            </Button>
                        </div>
                        {file && (
                            <p className="text-xs font-mono text-muted-foreground text-right">
                                Selected: <strong>{file.name}</strong> ({(file.size / 1024).toFixed(1)} KB)
                            </p>
                        )}
                    </div>

                    {/* Progress Bar for Large 10,000+ Imports */}
                    {isImporting && importProgress && (
                        <div className="p-4 bg-primary/10 border border-primary/30 rounded-2xl space-y-2.5 animate-in fade-in">
                            <div className="flex justify-between items-center text-xs font-black text-primary">
                                <span>{importProgress.percent}%</span>
                                <span>Importing {importProgress.count.toLocaleString()} of {importProgress.total.toLocaleString()} products...</span>
                            </div>
                            <Progress value={importProgress.percent} className="h-2.5 bg-background" />
                            <p className="text-[11px] text-muted-foreground text-center">
                                Database batch syncing in progress. Please do not close this window.
                            </p>
                        </div>
                    )}

                    {/* Expected Format Guide */}
                    {!parsedProducts.length && !isProcessing && (
                        <div className="bg-muted/60 p-4 rounded-2xl border border-border text-right space-y-3">
                            <div className="flex items-center justify-between">
                                <Button
                                    type="button"
                                    variant="link"
                                    size="sm"
                                    onClick={handleDownloadTemplate}
                                    className="p-0 h-auto text-xs text-primary font-bold gap-1"
                                >
                                    <Download className="h-3.5 w-3.5" />
                                    <span>Download Ready Template .xlsx</span>
                                </Button>
                                <p className="text-xs font-black text-foreground flex items-center justify-end gap-1.5">
                                    <span>Excel Column Header Format (ބޭނުންކުރަންވީ ކޮލަމްތައް):</span>
                                    <HelpCircle className="h-4 w-4 text-primary" />
                                </p>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px] font-mono text-center">
                                <div className="p-2 rounded-lg bg-card border border-border font-bold">Item Code</div>
                                <div className="p-2 rounded-lg bg-card border border-border font-bold">Barcode</div>
                                <div className="p-2 rounded-lg bg-card border border-border font-bold">Product Name (English)</div>
                                <div className="p-2 rounded-lg bg-card border border-border font-bold">Product Name (Dhivehi)</div>
                                <div className="p-2 rounded-lg bg-card border border-border font-bold">Category</div>
                                <div className="p-2 rounded-lg bg-card border border-border font-bold">Selling Price</div>
                                <div className="p-2 rounded-lg bg-card border border-border font-bold">Cost Price</div>
                                <div className="p-2 rounded-lg bg-card border border-border font-bold">Shop Stock</div>
                                <div className="p-2 rounded-lg bg-card border border-border font-bold">Godown Stock</div>
                                <div className="p-2 rounded-lg bg-card border border-border font-bold">Is Tax Exempt</div>
                            </div>

                            <p className="text-[10px] text-muted-foreground/80">
                                💡 Tip: The system will keep your Item Code and Barcode values exactly as written in the Excel file without changing them.
                            </p>
                        </div>
                    )}

                    {/* Parsed Summary & Preview Table */}
                    {parsedProducts.length > 0 && (
                        <div className="space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-muted/60 rounded-xl border border-border text-xs">
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-1.5 text-emerald-500 font-bold">
                                        <CheckCircle className="h-4 w-4" />
                                        <span>{validCount.toLocaleString()} Valid (ރަނގަޅު)</span>
                                    </div>
                                    {errorCount > 0 && (
                                        <div className="flex items-center gap-1.5 text-red-500 font-bold">
                                            <XCircle className="h-4 w-4" />
                                            <span>{errorCount.toLocaleString()} Issues (މައްސަލަ ހުރި)</span>
                                        </div>
                                    )}
                                </div>
                                <span className="font-bold text-muted-foreground">
                                    Total in File: <strong>{parsedProducts.length.toLocaleString()}</strong> items
                                </span>
                            </div>

                            <div className="border border-border rounded-2xl overflow-hidden max-h-72 overflow-y-auto">
                                <Table className="text-right text-xs">
                                    <TableHeader className="bg-muted/80 sticky top-0 z-10">
                                        <TableRow>
                                            <TableHead className="w-12 text-center">Status</TableHead>
                                            <TableHead className="text-right">Dhivehi Name</TableHead>
                                            <TableHead className="text-right">English Name</TableHead>
                                            <TableHead className="text-right">Item Code</TableHead>
                                            <TableHead className="text-right">Barcode</TableHead>
                                            <TableHead className="text-right">Price</TableHead>
                                            <TableHead className="text-right">Cost</TableHead>
                                            <TableHead className="text-right">Shop Stock</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody className="divide-y divide-border/60">
                                        {previewList.map((item, index) => (
                                            <TableRow key={index} className={!item.isValid ? 'bg-red-500/10' : ''}>
                                                <TableCell className="text-center">
                                                    {item.isValid ? (
                                                        <CheckCircle className="h-4 w-4 text-emerald-500 mx-auto" />
                                                    ) : (
                                                        <XCircle className="h-4 w-4 text-red-500 mx-auto" title={item.errors.join(', ')} />
                                                    )}
                                                </TableCell>
                                                <TableCell className="font-black">{item.product.name_dv}</TableCell>
                                                <TableCell className="font-mono text-muted-foreground">{item.product.name_en}</TableCell>
                                                <TableCell className="font-mono font-bold text-foreground">{item.product.item_code}</TableCell>
                                                <TableCell className="font-mono font-bold text-foreground">{item.product.barcode}</TableCell>
                                                <TableCell className="font-mono font-bold text-primary">{item.product.price}</TableCell>
                                                <TableCell className="font-mono">{item.product.cost_price || '-'}</TableCell>
                                                <TableCell className="font-mono">{item.product.stock_shop}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>

                            {parsedProducts.length > 50 && (
                                <p className="text-[11px] text-muted-foreground text-center font-bold">
                                    Showing preview of first 50 of {parsedProducts.length.toLocaleString()} products. All valid items will be imported.
                                </p>
                            )}
                        </div>
                    )}
                </div>

                <DialogFooter className="flex sm:flex-row flex-row-reverse gap-3 mt-4 pt-3 border-t border-border space-x-0 sm:space-x-0 w-full">
                    <Button
                        onClick={handleImport}
                        disabled={validCount === 0 || isProcessing || isImporting}
                        className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs h-11 rounded-xl shadow-lg shadow-primary/20 uppercase gap-2"
                    >
                        {isImporting && <Loader2 className="h-4 w-4 animate-spin" />}
                        <span>
                            {isImporting 
                                ? `Importing... (${importProgress?.percent || 0}%)` 
                                : `Import ${validCount.toLocaleString()} Products (އެތެރެކުރޭ)`}
                        </span>
                    </Button>
                    <Button 
                        variant="outline" 
                        onClick={handleClose}
                        disabled={isImporting}
                        className="flex-1 h-11 rounded-xl border-border text-xs font-bold"
                    >
                        {t('cancel') || 'Cancel'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default ExcelImportDialog;

