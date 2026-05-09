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
import { showSuccess, showError } from '@/utils/toast';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';

const GSTReports = () => {
    const { t } = useTranslation();
    const { sales, purchases, addPurchase, settings, vendors, products } = useAppContext();
    const [isAddPurchaseDialogOpen, setIsAddPurchaseDialogOpen] = useState(false);
    const [timeRange, setTimeRange] = useState('this_month');

    // Form state for new purchase
    const [newPurchase, setNewPurchase] = useState({
        vendorId: '',
        billNumber: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        totalAmount: '' // New field for total amount entry
    });

    const [vendorSearchQuery, setVendorSearchQuery] = useState('');
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

    const calculateGstFromTotal = (total: number) => {
        // formula: total - (total / (1 + taxRate/100))
        const taxRate = settings.shop.taxRate / 100;
        const gstAmount = total - (total / (1 + taxRate));
        const subtotal = total - gstAmount;
        return { subtotal, gstAmount };
    };



    const handleAddPurchase = () => {
        if (!newPurchase.vendorId || !newPurchase.totalAmount) {
            showError(t('fill_all_fields_error'));
            return;
        }

        const selectedVendor = vendors.find(v => v.id === newPurchase.vendorId);
        const total = parseFloat(newPurchase.totalAmount);
        const { subtotal, gstAmount } = calculateGstFromTotal(total);

        const purchase: Purchase = {
            id: `purch-${Date.now()}`,
            vendor: selectedVendor?.name_en || 'Unknown',
            vendorId: newPurchase.vendorId,
            billNumber: newPurchase.billNumber,
            amount: total,
            gstAmount: gstAmount,
            description: newPurchase.description,
            date: newPurchase.date,
            items: [], // No individual items needed anymore
            subtotal: subtotal
        };

        addPurchase(purchase);
        setIsAddPurchaseDialogOpen(false);
        setNewPurchase({ 
            vendorId: '', 
            billNumber: '', 
            description: '', 
            date: new Date().toISOString().split('T')[0],
            totalAmount: ''
        });
        showSuccess(t('purchase_added_successfully'));
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
                    <h1 className="text-3xl font-black text-black dark:text-white flex items-center justify-end gap-3">
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
                            <CardTitle className="text-sm font-bold text-black dark:text-white ">{renderBoth('output_gst')}</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black text-black dark:text-white ">{settings.shop.currency} {outputGST.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                        <p className="text-[10px] text-black dark:text-white mt-1 uppercase tracking-widest">{renderBoth('total_gst_collected')}</p>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-sm">
                    <CardHeader className="pb-2">
                        <div className="flex justify-between items-center">
                            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg dark:bg-blue-900/20"><ArrowDownLeft className="h-5 w-5" /></div>
                            <CardTitle className="text-sm font-bold text-black dark:text-white ">{renderBoth('input_gst')}</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black text-black dark:text-white ">{settings.shop.currency} {inputGST.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                        <p className="text-[10px] text-black dark:text-white mt-1 uppercase tracking-widest">{renderBoth('total_input_tax')}</p>
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
                            <span className="font-bold text-black dark:text-white ">{t('total_taxable_sales')}</span>
                            <span className="font-black text-green-600">{settings.shop.currency} {totalTaxableSales.toFixed(2)}</span>
                        </div>
                        <div className="text-right text-xs text-black dark:text-white px-2 italic">
                            {t('gst_rate_notice', { rate: settings.shop.taxRate })}
                        </div>
                    </CardContent>
                </Card>



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
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredPurchases.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-10 text-black dark:text-white uppercase tracking-widest text-[10px]">No local purchases recorded</TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredPurchases.map((purchase) => (
                                            <TableRow key={purchase.id} className="hover:bg-blue-50/30 transition-colors">
                                                <TableCell className="text-right font-mono text-xs">{purchase.date}</TableCell>
                                                <TableCell className="text-right font-bold">{purchase.vendor}</TableCell>
                                                <TableCell className="text-right text-xs opacity-60">{purchase.billNumber || '-'}</TableCell>
                                                <TableCell className="text-right font-mono">{purchase.amount.toFixed(2)}</TableCell>
                                                <TableCell className="text-right font-mono font-bold text-blue-600">{purchase.gstAmount.toFixed(2)}</TableCell>
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
                                        <div className="p-2 text-center text-sm text-black dark:text-white ">{t('no_vendors_found')}</div>
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

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-right block opacity-50 text-[10px] font-bold uppercase">{renderBoth('total_amount')}*</Label>
                                <Input 
                                    type="number" 
                                    placeholder="0.00"
                                    value={newPurchase.totalAmount} 
                                    onChange={(e) => setNewPurchase({ ...newPurchase, totalAmount: e.target.value })} 
                                    className="text-right h-11 font-black text-lg" 
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-right block opacity-50 text-[10px] font-bold uppercase">{renderBoth('calculated_gst')}</Label>
                                <div className="h-11 flex items-center justify-end px-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-100 dark:border-blue-800 font-mono font-bold text-blue-600">
                                    {newPurchase.totalAmount ? calculateGstFromTotal(parseFloat(newPurchase.totalAmount)).gstAmount.toFixed(2) : '0.00'}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-right block opacity-50 text-[10px] font-bold uppercase">{renderBoth('description')}</Label>
                            <Input value={newPurchase.description} onChange={(e) => setNewPurchase({ ...newPurchase, description: e.target.value })} className="text-right h-11" />
                        </div>
                    </div>

                    <DialogFooter className="mt-4 gap-3">
                        <Button
                            onClick={() => setIsAddPurchaseDialogOpen(false)}
                            variant="outline"
                            className="flex-1 h-12 font-bold text-lg"
                        >
                            {t('cancel')}
                        </Button>
                        <Button
                            onClick={handleAddPurchase}
                            className="flex-1 h-12 font-bold text-lg bg-primary"
                        >
                            {t('save_purchase')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div>
    );
};

export default GSTReports;
