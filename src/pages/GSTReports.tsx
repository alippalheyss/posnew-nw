"use client";

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Download, PlusCircle, Receipt, Building2, Calculator, ArrowUpRight, ArrowDownLeft, Landmark, X, ShoppingCart, Archive, Play, Trash2, Save, Package } from 'lucide-react';
import { useAppContext, Purchase, Vendor, PurchaseItem, Product } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { showSuccess, showError } from '@/utils/toast';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';
import ProductPickerDialog from '@/components/ProductPickerDialog';

const GSTReports = () => {
    const { t } = useTranslation();
    const { sales, purchases, addPurchase, deletePurchase, settings, vendors, products } = useAppContext();
    const { currentUser } = useAuth();
    const isAdmin = currentUser?.role === 'admin';
    const [isAddPurchaseDialogOpen, setIsAddPurchaseDialogOpen] = useState(false);
    const [timeRange, setTimeRange] = useState('this_month');

    // Form state for new purchase
    const [newPurchase, setNewPurchase] = useState({
        vendorId: '',
        billNumber: '',
        description: '',
        date: new Date().toISOString().split('T')[0]
    });

    // Product selection state
    const [purchaseItems, setPurchaseItems] = useState<PurchaseItem[]>([]);
    const [selectedProductId, setSelectedProductId] = useState('');
    const [itemQuantity, setItemQuantity] = useState('');
    const [itemUnitPrice, setItemUnitPrice] = useState('');
    const [itemTotalPrice, setItemTotalPrice] = useState(''); // For flexible entry

    // Search filters
    const [productSearchQuery, setProductSearchQuery] = useState('');
    const [vendorSearchQuery, setVendorSearchQuery] = useState('');

    // Held purchases (for hold/resume functionality)
    const [heldPurchases, setHeldPurchases] = useState<Array<{
        id: string;
        vendorId: string;
        billNumber: string;
        description: string;
        date: string;
        items: PurchaseItem[];
        timestamp: number;
    }>>([]);

    // Product picker dialog state
    const [isProductPickerOpen, setIsProductPickerOpen] = useState(false);

    // Products pending quantity/price entry
    interface PendingProduct {
        product: Product;
        quantity: string;
        unitPrice: string;
        totalPrice: string;
    }
    const [pendingProducts, setPendingProducts] = useState<PendingProduct[]>([]);

    const renderBoth = (key: string, options?: any) => (
        <>
            {t(key, options)} ({t(key, { ...options, lng: 'en' })})
        </>
    );

    // Filters based on time range
    const filterByRange = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        if (timeRange === 'today') return date.toDateString() === now.toDateString();
        if (timeRange === 'this_month') return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
        if (timeRange === 'this_year') return date.getFullYear() === now.getFullYear();

        // Quarterly filters
        if (timeRange.startsWith('q')) {
            const quarter = parseInt(timeRange.substring(1));
            const year = now.getFullYear();
            const startMonth = (quarter - 1) * 3;
            const endMonth = startMonth + 2;
            return date.getFullYear() === year && date.getMonth() >= startMonth && date.getMonth() <= endMonth;
        }

        return true;
    };

    // Filter products by search query
    const filteredProducts = products.filter(p =>
        p.name_dv.toLowerCase().includes(productSearchQuery.toLowerCase()) ||
        p.name_en.toLowerCase().includes(productSearchQuery.toLowerCase()) ||
        p.barcode.includes(productSearchQuery) ||
        p.item_code.toLowerCase().includes(productSearchQuery.toLowerCase())
    );

    // Filter vendors by search query
    const filteredVendors = vendors.filter(v =>
        v.name_dv.toLowerCase().includes(vendorSearchQuery.toLowerCase()) ||
        v.name_en.toLowerCase().includes(vendorSearchQuery.toLowerCase()) ||
        v.code.toLowerCase().includes(vendorSearchQuery.toLowerCase())
    );

    // Hold current purchase
    const holdPurchase = () => {
        if (purchaseItems.length === 0) {
            showError(t('no_items_to_hold'));
            return;
        }

        const heldPurchase = {
            id: `held-${Date.now()}`,
            vendorId: newPurchase.vendorId,
            billNumber: newPurchase.billNumber,
            description: newPurchase.description,
            date: newPurchase.date,
            items: [...purchaseItems],
            timestamp: Date.now()
        };

        setHeldPurchases([...heldPurchases, heldPurchase]);

        // Clear current purchase
        setNewPurchase({
            vendorId: '',
            billNumber: '',
            description: '',
            date: new Date().toISOString().split('T')[0]
        });
        setPurchaseItems([]);
        setIsAddPurchaseDialogOpen(false);
        showSuccess(t('purchase_held'));
    };

    // Resume held purchase
    const resumeHeldPurchase = (heldId: string) => {
        const held = heldPurchases.find(h => h.id === heldId);
        if (!held) return;

        setNewPurchase({
            vendorId: held.vendorId,
            billNumber: held.billNumber,
            description: held.description,
            date: held.date
        });
        setPurchaseItems(held.items);
        setHeldPurchases(heldPurchases.filter(h => h.id !== heldId));
        setIsAddPurchaseDialogOpen(true);
        showSuccess(t('purchase_resumed'));
    };

    // Delete held purchase
    const deleteHeldPurchase = (heldId: string) => {
        setHeldPurchases(heldPurchases.filter(h => h.id !== heldId));
        showSuccess(t('held_purchase_deleted'));
    };

    // Handle products selected from picker
    const handleProductsSelected = (selectedProducts: Product[]) => {
        const newPending: PendingProduct[] = selectedProducts.map(p => ({
            product: p,
            quantity: '',
            unitPrice: '',
            totalPrice: ''
        }));
        setPendingProducts([...pendingProducts, ...newPending]);
    };

    // Update pending product field
    const updatePendingProduct = (index: number, field: 'quantity' | 'unitPrice' | 'totalPrice', value: string) => {
        const updated = [...pendingProducts];
        updated[index] = { ...updated[index], [field]: value };

        // Auto-calculate based on what was entered
        if (field === 'unitPrice' && value) {
            updated[index].totalPrice = ''; // Clear total if unit entered
        } else if (field === 'totalPrice' && value) {
            updated[index].unitPrice = ''; // Clear unit if total entered
        }

        setPendingProducts(updated);
    };

    // Add pending product to purchase items
    const addPendingProductToPurchase = (index: number) => {
        const pending = pendingProducts[index];

        if (!pending.quantity || (!pending.unitPrice && !pending.totalPrice)) {
            showError(t('enter_quantity_and_price'));
            return;
        }

        const qty = parseFloat(pending.quantity);
        let unitPrice: number;

        if (pending.totalPrice && !pending.unitPrice) {
            unitPrice = parseFloat(pending.totalPrice) / qty;
        } else {
            unitPrice = parseFloat(pending.unitPrice);
        }

        const subtotal = qty * unitPrice;
        // Check if product is tax-exempt
        const gstAmount = pending.product.is_zero_tax ? 0 : subtotal * (settings.shop.taxRate / 100);
        const total = subtotal + gstAmount;

        const newItem: PurchaseItem = {
            product_id: pending.product.id,
            product_name: pending.product.name_en,
            quantity: qty,
            unit_price: unitPrice,
            subtotal,
            gst_amount: gstAmount,
            total
        };

        setPurchaseItems([...purchaseItems, newItem]);

        // Remove from pending
        setPendingProducts(pendingProducts.filter((_, i) => i !== index));
    };

    // Remove pending product
    const removePendingProduct = (index: number) => {
        setPendingProducts(pendingProducts.filter((_, i) => i !== index));
    };

    const filteredSales = sales.filter(s => filterByRange(s.date));
    const filteredPurchases = purchases.filter(p => filterByRange(p.date));

    // Calculations
    const outputGST = filteredSales.reduce((sum, s) => {
        const taxableTotal = s.items.filter(i => !i.is_zero_tax).reduce((itemSum, i) => itemSum + (i.price * i.qty), 0);
        // Note: This is an approximation. In a real system, you'd store the calculated GST per sale.
        return sum + (taxableTotal * (settings.shop.taxRate / 100));
    }, 0);

    const inputGST = filteredPurchases.reduce((sum, p) => sum + p.gstAmount, 0);
    const netGST = outputGST - inputGST;

    const totalTaxableSales = filteredSales.reduce((sum, s) => {
        return sum + s.items.filter(i => !i.is_zero_tax).reduce((itemSum, i) => itemSum + (i.price * i.qty), 0);
    }, 0);

    const totalPurchases = filteredPurchases.reduce((sum, p) => sum + p.amount, 0);

    const calculatePurchaseTotals = () => {
        const subtotal = purchaseItems.reduce((sum, item) => sum + item.subtotal, 0);
        const gstAmount = purchaseItems.reduce((sum, item) => sum + item.gst_amount, 0);
        const total = purchaseItems.reduce((sum, item) => sum + item.total, 0);
        return { subtotal, gstAmount, total };
    };

    const addProductToPurchase = () => {
        if (!selectedProductId || !itemQuantity) {
            showError(t('fill_all_fields_error'));
            return;
        }

        // Must have either unit price OR total price
        if (!itemUnitPrice && !itemTotalPrice) {
            showError(t('enter_unit_price_or_total_price'));
            return;
        }

        const product = products.find(p => p.id === selectedProductId);
        if (!product) return;

        const qty = parseFloat(itemQuantity);
        let unitPrice: number;

        // Calculate unit price from total if only total is provided
        if (itemTotalPrice && !itemUnitPrice) {
            const totalPrice = parseFloat(itemTotalPrice);
            unitPrice = totalPrice / qty;
        } else {
            unitPrice = parseFloat(itemUnitPrice);
        }

        const subtotal = qty * unitPrice;
        // Check if product is tax-exempt
        const gstAmount = product.is_zero_tax ? 0 : subtotal * (settings.shop.taxRate / 100);
        const total = subtotal + gstAmount;

        const newItem: PurchaseItem = {
            product_id: product.id,
            product_name: product.name_en,
            quantity: qty,
            unit_price: unitPrice,
            subtotal,
            gst_amount: gstAmount,
            total
        };

        setPurchaseItems([...purchaseItems, newItem]);
        setSelectedProductId('');
        setItemQuantity('');
        setItemUnitPrice('');
        setItemTotalPrice('');
    };

    const removeProductFromPurchase = (index: number) => {
        setPurchaseItems(purchaseItems.filter((_, i) => i !== index));
    };

    const handleAddPurchase = () => {
        if (!newPurchase.vendorId || purchaseItems.length === 0) {
            showError(t('fill_all_fields_error'));
            return;
        }

        const selectedVendor = vendors.find(v => v.id === newPurchase.vendorId);
        const totals = calculatePurchaseTotals();

        const purchase: Purchase = {
            id: `purch-${Date.now()}`,
            vendor: selectedVendor?.name_en || 'Unknown',
            vendorId: newPurchase.vendorId,
            billNumber: newPurchase.billNumber,
            amount: totals.total,
            gstAmount: totals.gstAmount,
            description: newPurchase.description,
            date: newPurchase.date,
            items: purchaseItems,
            subtotal: totals.subtotal
        };

        addPurchase(purchase);
        setIsAddPurchaseDialogOpen(false);
        setNewPurchase({ vendorId: '', billNumber: '', description: '', date: new Date().toISOString().split('T')[0] });
        setPurchaseItems([]);
        showSuccess(t('purchase_added_successfully'));
    };

    const handleDeletePurchase = async (id: string) => {
        if (window.confirm(t('confirm_delete_purchase'))) {
            await deletePurchase(id);
        }
    };

    const getQuarterName = (q: string) => {
        const quarterMap: { [key: string]: string } = {
            'q1': 'Q1 (Jan-Mar)',
            'q2': 'Q2 (Apr-Jun)',
            'q3': 'Q3 (Jul-Sep)',
            'q4': 'Q4 (Oct-Dec)'
        };
        return quarterMap[q] || timeRange;
    };

    const exportGSTReport = () => {
        const data = [
            ["GST Report - MIRA Compliant", ""],
            ["Period", timeRange.startsWith('q') ? getQuarterName(timeRange) : timeRange],
            ["Date Generated", new Date().toLocaleString()],
            ["", ""],
            ["OUTPUT TAX (SALES)", ""],
            ["Total Taxable Sales", totalTaxableSales.toFixed(2)],
            ["Total GST Collected (Output)", outputGST.toFixed(2)],
            ["", ""],
            ["INPUT TAX (PURCHASES)", ""],
            ["Total Purchases", totalPurchases.toFixed(2)],
            ["Total Input Tax Paid", inputGST.toFixed(2)],
            ["", ""],
            ["NET GST PAYABLE TO MIRA", netGST.toFixed(2)],
            ["", ""],
            ["PURCHASE DETAILS", ""],
            ["Date", "Vendor", "Bill #", "Amount", "GST Amount", "Description"]
        ];

        filteredPurchases.forEach(p => {
            data.push([p.date, p.vendor, p.billNumber, p.amount.toFixed(2), p.gstAmount.toFixed(2), p.description]);
        });

        const ws = XLSX.utils.aoa_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "GST Report");
        XLSX.writeFile(wb, `GST_Report_${timeRange}_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    return (
        <div className="p-6 font-faruma flex flex-col h-full bg-gray-50/50 dark:bg-gray-900/50 overflow-auto">
            {/* Header */}
            <div className="flex justify-between items-center mb-8 sticky top-0 bg-gray-50/80 dark:bg-gray-900/80 backdrop-blur-md z-20 py-2 border-b">
                <div className="text-right flex-1">
                    <h1 className="text-3xl font-black text-gray-900 dark:text-white flex items-center justify-end gap-3">
                        {renderBoth('gst_reports')} <Receipt className="h-8 w-8 text-primary" />
                    </h1>
                    <p className="text-sm opacity-60 mt-1">{renderBoth('gst_report_description')}</p>
                </div>
                <div className="flex gap-3 mr-4">
                    <Select value={timeRange} onValueChange={setTimeRange}>
                        <SelectTrigger className="w-[180px] bg-white text-right">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="today">{renderBoth('today')}</SelectItem>
                            <SelectItem value="this_month">{renderBoth('this_month')}</SelectItem>
                            <SelectItem value="q1">Q1 (Jan-Mar) - {t('quarter_1')}</SelectItem>
                            <SelectItem value="q2">Q2 (Apr-Jun) - {t('quarter_2')}</SelectItem>
                            <SelectItem value="q3">Q3 (Jul-Sep) - {t('quarter_3')}</SelectItem>
                            <SelectItem value="q4">Q4 (Oct-Dec) - {t('quarter_4')}</SelectItem>
                            <SelectItem value="this_year">{renderBoth('this_year')}</SelectItem>
                            <SelectItem value="all">{renderBoth('all')}</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button onClick={exportGSTReport} variant="outline" className="gap-2">
                        <Download className="h-4 w-4" /> {renderBoth('download_report')}
                    </Button>
                    <Button onClick={() => setIsAddPurchaseDialogOpen(true)} className="gap-2 bg-primary">
                        <PlusCircle className="h-4 w-4" /> {renderBoth('add_local_purchase')}
                    </Button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <Card className="border-none shadow-sm bg-gradient-to-br from-primary to-orange-600 text-white">
                    <CardHeader className="pb-2">
                        <div className="flex justify-between items-center">
                            <div className="p-2 bg-white/20 rounded-lg"><Calculator className="h-5 w-5" /></div>
                            <CardTitle className="text-sm font-bold opacity-90">{renderBoth('gst_payable')}</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black">{settings.shop.currency} {netGST.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                        <p className="text-[10px] opacity-70 mt-1 uppercase tracking-widest">{renderBoth('net_gst_to_mira')}</p>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-sm">
                    <CardHeader className="pb-2">
                        <div className="flex justify-between items-center">
                            <div className="p-2 bg-green-50 text-green-600 rounded-lg dark:bg-green-900/20"><ArrowUpRight className="h-5 w-5" /></div>
                            <CardTitle className="text-sm font-bold text-gray-500">{renderBoth('output_gst')}</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black text-gray-900 dark:text-white">{settings.shop.currency} {outputGST.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                        <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-widest">{renderBoth('total_gst_collected')}</p>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-sm">
                    <CardHeader className="pb-2">
                        <div className="flex justify-between items-center">
                            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg dark:bg-blue-900/20"><ArrowDownLeft className="h-5 w-5" /></div>
                            <CardTitle className="text-sm font-bold text-gray-500">{renderBoth('input_gst')}</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black text-gray-900 dark:text-white">{settings.shop.currency} {inputGST.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                        <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-widest">{renderBoth('total_input_tax')}</p>
                    </CardContent>
                </Card>
            </div>

            {/* Main Content Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Sales Summary */}
                <Card className="lg:col-span-1 border-none shadow-sm border-r-4 border-r-green-500">
                    <CardHeader>
                        <CardTitle className="text-right text-lg flex items-center justify-end gap-2">
                            {renderBoth('output_gst')} <ArrowUpRight className="h-5 w-5 text-green-500" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex justify-between p-3 bg-gray-50 dark:bg-black/20 rounded-lg border border-dashed border-gray-200">
                            <span className="font-bold text-gray-500">{t('total_taxable_sales')}</span>
                            <span className="font-black text-green-600">{settings.shop.currency} {totalTaxableSales.toFixed(2)}</span>
                        </div>
                        <div className="text-right text-xs text-gray-400 px-2 italic">
                            {t('gst_rate_notice', { rate: settings.shop.taxRate })}
                        </div>
                    </CardContent>
                </Card>

                {/* Held Purchases Section */}
                {heldPurchases.length > 0 && (
                    <Card className="lg:col-span-2 border-none shadow-sm border-r-4 border-r-orange-500">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div className="p-2 bg-orange-50 rounded-full text-orange-600"><Archive className="h-4 w-4" /></div>
                            <CardTitle className="text-right text-lg">{t('held_purchases')} ({heldPurchases.length})</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {heldPurchases.map((held) => {
                                const vendor = vendors.find(v => v.id === held.vendorId);
                                const totalItems = held.items.reduce((sum, item) => sum + item.quantity, 0);
                                const totalAmount = held.items.reduce((sum, item) => sum + item.total, 0);

                                return (
                                    <div key={held.id} className="flex items-center justify-between p-3 bg-orange-50/30 rounded-lg border border-orange-200 hover:bg-orange-50 transition-colors">
                                        <div className="flex-1 text-right">
                                            <div className="font-bold text-sm">{vendor?.name_dv || vendor?.name_en || t('unknown_vendor')}</div>
                                            <div className="text-xs text-gray-600">
                                                {held.items.length} {t('products')} • {totalItems} {t('items')} • {settings.shop.currency} {totalAmount.toFixed(2)}
                                            </div>
                                            {held.billNumber && <div className="text-xs text-gray-500">{t('bill_number')}: {held.billNumber}</div>}
                                        </div>
                                        <div className="flex gap-2 mr-3">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-8"
                                                onClick={() => resumeHeldPurchase(held.id)}
                                            >
                                                <Play className="h-3 w-3 ml-1" /> {t('resume')}
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                                onClick={() => deleteHeldPurchase(held.id)}
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </CardContent>
                    </Card>
                )}

                {/* Local Purchases List */}
                <Card className="lg:col-span-2 border-none shadow-sm border-r-4 border-r-blue-500">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div className="p-2 bg-blue-50 rounded-full text-blue-600"><Landmark className="h-4 w-4" /></div>
                        <CardTitle className="text-right text-lg">{renderBoth('local_purchases')}</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <ScrollArea className="h-[400px]">
                            <Table dir="rtl">
                                <TableHeader className="bg-gray-50 dark:bg-black/10">
                                    <TableRow>
                                        <TableHead className="text-right font-bold">{t('date')}</TableHead>
                                        <TableHead className="text-right font-bold">{t('vendor')}</TableHead>
                                        <TableHead className="text-right font-bold">{t('bill_number')}</TableHead>
                                        <TableHead className="text-right font-bold">{t('amount')}</TableHead>
                                        <TableHead className="text-right font-bold">{t('gst_amount')}</TableHead>
                                        {isAdmin && <TableHead className="text-right font-bold w-12">{t('actions')}</TableHead>}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredPurchases.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-10 text-gray-400 uppercase tracking-widest text-[10px]">No local purchases recorded</TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredPurchases.map((purchase) => (
                                            <TableRow key={purchase.id} className="hover:bg-blue-50/30 transition-colors">
                                                <TableCell className="text-right font-mono text-xs">{purchase.date}</TableCell>
                                                <TableCell className="text-right font-bold">{purchase.vendor}</TableCell>
                                                <TableCell className="text-right text-xs opacity-60">{purchase.billNumber || '-'}</TableCell>
                                                <TableCell className="text-right font-mono">{purchase.amount.toFixed(2)}</TableCell>
                                                <TableCell className="text-right font-mono font-bold text-blue-600">{purchase.gstAmount.toFixed(2)}</TableCell>
                                                {isAdmin && (
                                                    <TableCell className="text-right">
                                                        <Button variant="ghost" size="sm" onClick={() => handleDeletePurchase(purchase.id)} className="h-8 w-8 p-0">
                                                            <Trash2 className="h-4 w-4 text-red-500" />
                                                        </Button>
                                                    </TableCell>
                                                )}
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>

            {/* Add Purchase Dialog */}
            <Dialog open={isAddPurchaseDialogOpen} onOpenChange={setIsAddPurchaseDialogOpen}>
                <DialogContent className="sm:max-w-[700px] font-faruma max-h-[90vh] overflow-y-auto" dir="rtl">
                    <DialogHeader>
                        <div className="flex justify-between items-center w-full">
                            <Button variant="ghost" size="icon" onClick={() => setIsAddPurchaseDialogOpen(false)}><X className="h-4 w-4" /></Button>
                            <DialogTitle className="text-right text-2xl font-black flex items-center gap-2">
                                <ShoppingCart className="h-6 w-6" />
                                {renderBoth('add_local_purchase')}
                            </DialogTitle>
                        </div>
                        <DialogDescription className="text-right">{renderBoth('enter_details_for_gst_tracking')}</DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-5 py-4">
                        {/* Vendor & Bill Info */}
                        <div className="space-y-1.5">
                            <Label className="text-right block opacity-50 text-[10px] font-bold uppercase">{renderBoth('vendor')}*</Label>
                            <Input
                                placeholder={t('search_vendor')}
                                value={vendorSearchQuery}
                                onChange={(e) => setVendorSearchQuery(e.target.value)}
                                className="text-right h-9 mb-2"
                            />
                            <Select value={newPurchase.vendorId} onValueChange={(value) => setNewPurchase({ ...newPurchase, vendorId: value })}>
                                <SelectTrigger className="text-right h-11">
                                    <SelectValue placeholder={t('select_vendor')} />
                                </SelectTrigger>
                                <SelectContent key={vendorSearchQuery}>
                                    {filteredVendors.length === 0 ? (
                                        <div className="p-2 text-center text-sm text-gray-500">{t('no_vendors_found')}</div>
                                    ) : (
                                        filteredVendors.map(vendor => (
                                            <SelectItem key={vendor.id} value={vendor.id}>
                                                {vendor.name_dv} ({vendor.name_en})
                                            </SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-right block opacity-50 text-[10px] font-bold uppercase">{renderBoth('bill_number')}</Label>
                                <Input value={newPurchase.billNumber} onChange={(e) => setNewPurchase({ ...newPurchase, billNumber: e.target.value })} className="text-right h-11" />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-right block opacity-50 text-[10px] font-bold uppercase">{renderBoth('date')}</Label>
                                <Input type="date" value={newPurchase.date} onChange={(e) => setNewPurchase({ ...newPurchase, date: e.target.value })} className="text-right h-11" />
                            </div>
                        </div>

                        {/* Product Selection */}
                        <div className="border-t pt-4 mt-2">
                            <div className="flex items-center justify-between mb-3">
                                <Button
                                    onClick={() => setIsProductPickerOpen(true)}
                                    variant="outline"
                                    className="h-10"
                                >
                                    <Package className="h-4 w-4 ml-2" /> {t('select_products_button')}
                                </Button>
                                <Label className="text-right text-sm font-bold">{t('add_products_to_purchase')}</Label>
                            </div>

                            {/* Pending Products - Awaiting Quantity/Price */}
                            {pendingProducts.length > 0 && (
                                <div className="mb-4 border rounded-lg p-3 bg-yellow-50/30">
                                    <Label className="text-right block mb-2 text-xs font-bold text-yellow-800">
                                        {t('enter_quantity_price')} ({pendingProducts.length} {t('products')})
                                    </Label>
                                    <div className="space-y-2">
                                        {pendingProducts.map((pending, index) => (
                                            <div key={index} className="grid grid-cols-12 gap-2 items-center bg-white p-2 rounded border">
                                                <div className="col-span-4 text-right">
                                                    <div className="font-bold text-sm">{pending.product.name_dv}</div>
                                                    <div className="text-xs text-gray-600">{pending.product.name_en}</div>
                                                </div>
                                                <div className="col-span-2">
                                                    <Input
                                                        type="number"
                                                        placeholder={t('qty')}
                                                        value={pending.quantity}
                                                        onChange={(e) => updatePendingProduct(index, 'quantity', e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter' && pending.quantity) {
                                                                e.preventDefault();
                                                                // Focus unit price field
                                                                const unitPriceInput = document.getElementById(`unit-price-${index}`);
                                                                unitPriceInput?.focus();
                                                            }
                                                        }}
                                                        className="text-right h-9 text-sm"
                                                        id={`quantity-${index}`}
                                                        autoFocus={index === 0}
                                                    />
                                                </div>
                                                <div className="col-span-2">
                                                    <Input
                                                        type="number"
                                                        placeholder={t('unit_cost')}
                                                        value={pending.unitPrice}
                                                        onChange={(e) => updatePendingProduct(index, 'unitPrice', e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                e.preventDefault();
                                                                // Focus total price field
                                                                const totalPriceInput = document.getElementById(`total-price-${index}`);
                                                                totalPriceInput?.focus();
                                                            }
                                                        }}
                                                        className="text-right h-9 text-sm"
                                                        id={`unit-price-${index}`}
                                                    />
                                                </div>
                                                <div className="col-span-1 flex items-center justify-center">
                                                    <span className="text-xs text-gray-500">{t('or')}</span>
                                                </div>
                                                <div className="col-span-2">
                                                    <Input
                                                        type="number"
                                                        placeholder={t('total_price')}
                                                        value={pending.totalPrice}
                                                        onChange={(e) => updatePendingProduct(index, 'totalPrice', e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter' && pending.quantity && (pending.unitPrice || pending.totalPrice)) {
                                                                e.preventDefault();
                                                                // Add product and focus next quantity
                                                                addPendingProductToPurchase(index);
                                                                setTimeout(() => {
                                                                    const nextQtyInput = document.getElementById(`quantity-${index}`);
                                                                    nextQtyInput?.focus();
                                                                }, 100);
                                                            }
                                                        }}
                                                        className="text-right h-9 text-sm"
                                                        id={`total-price-${index}`}
                                                    />
                                                </div>
                                                <div className="col-span-1 flex gap-1">
                                                    <Button
                                                        size="sm"
                                                        onClick={() => addPendingProductToPurchase(index)}
                                                        className="h-8 w-8 p-0"
                                                    >
                                                        <PlusCircle className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => removePendingProduct(index)}
                                                        className="h-8 w-8 p-0 text-red-600"
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Added Products - Final List */}
                            {purchaseItems.length > 0 && (
                                <div className="border rounded-lg overflow-hidden">
                                    <Table>
                                        <TableHeader className="bg-gray-50">
                                            <TableRow>
                                                <TableHead className="text-right text-xs">{t('item')}</TableHead>
                                                <TableHead className="text-right text-xs">{t('qty')}</TableHead>
                                                <TableHead className="text-right text-xs">{t('unit_cost')}</TableHead>
                                                <TableHead className="text-right text-xs">{t('subtotal')}</TableHead>
                                                <TableHead className="text-right text-xs">{t('gst')}</TableHead>
                                                <TableHead className="text-right text-xs">{t('total')}</TableHead>
                                                <TableHead className="w-10"></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {purchaseItems.map((item, index) => (
                                                <TableRow key={index}>
                                                    <TableCell className="text-right text-sm font-medium">{item.product_name}</TableCell>
                                                    <TableCell className="text-right text-sm">{item.quantity}</TableCell>
                                                    <TableCell className="text-right text-sm font-mono">{item.unit_price.toFixed(2)}</TableCell>
                                                    <TableCell className="text-right text-sm font-mono">{item.subtotal.toFixed(2)}</TableCell>
                                                    <TableCell className="text-right text-sm font-mono text-blue-600">{item.gst_amount.toFixed(2)}</TableCell>
                                                    <TableCell className="text-right text-sm font-mono font-bold">{item.total.toFixed(2)}</TableCell>
                                                    <TableCell>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7"
                                                            onClick={() => removeProductFromPurchase(index)}
                                                        >
                                                            <X className="h-3 w-3" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>

                                    {/* Totals */}
                                    <div className="bg-gray-50 p-3 space-y-2 border-t">
                                        <div className="flex justify-between text-sm">
                                            <span className="font-bold">{t('subtotal')}:</span>
                                            <span className="font-mono">{settings.shop.currency} {calculatePurchaseTotals().subtotal.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="font-bold text-blue-600">{t('gst')} ({settings.shop.taxRate}%):</span>
                                            <span className="font-mono text-blue-600">{settings.shop.currency} {calculatePurchaseTotals().gstAmount.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between text-lg border-t pt-2">
                                            <span className="font-black">{t('grand_total')}:</span>
                                            <span className="font-mono font-black">{settings.shop.currency} {calculatePurchaseTotals().total.toFixed(2)}</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-right block opacity-50 text-[10px] font-bold uppercase">{renderBoth('description')}</Label>
                            <Input value={newPurchase.description} onChange={(e) => setNewPurchase({ ...newPurchase, description: e.target.value })} className="text-right h-11" />
                        </div>
                    </div>

                    <DialogFooter className="mt-4 gap-3">
                        <Button
                            onClick={holdPurchase}
                            variant="outline"
                            className="flex-1 h-12 font-bold text-lg"
                            disabled={purchaseItems.length === 0}
                        >
                            {t('hold_purchase')}
                        </Button>
                        <Button
                            onClick={handleAddPurchase}
                            className="flex-1 h-12 bg-primary font-bold text-lg"
                            disabled={purchaseItems.length === 0}
                        >
                            {renderBoth('save_changes')}
                        </Button>
                        <Button variant="outline" onClick={() => setIsAddPurchaseDialogOpen(false)} className="flex-1 h-12">{renderBoth('cancel')}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Product Picker Dialog */}
            <ProductPickerDialog
                isOpen={isProductPickerOpen}
                onClose={() => setIsProductPickerOpen(false)}
                products={products}
                onAddProducts={handleProductsSelected}
            />
        </div>
    );
};

export default GSTReports;
