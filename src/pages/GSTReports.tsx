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
import { Download, PlusCircle, Receipt, Building2, Calculator, ArrowUpRight, ArrowDownLeft, Landmark, X, ShoppingCart, Archive, Play, Trash2, Save, Package, FileText, Info, TrendingDown, TrendingUp } from 'lucide-react';
import { useAppContext, Purchase, Vendor, PurchaseItem, Product } from '@/context/AppContext';
import { Badge } from '@/components/ui/badge';
import { showSuccess, showError } from '@/utils/toast';
import { formatDate } from '@/utils/formatters';
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
        totalAmount: '' 
    });

    const [vendorSearchQuery, setVendorSearchQuery] = useState('');
    const renderBoth = (key: string, options?: any) => (
        <>
            {t(key, options)} ({t(key, { ...options, lng: 'en' })})
        </>
    );

    const handleFocus = (event: React.FocusEvent<HTMLInputElement>) => {
        event.target.select();
    };

    const filterByRange = (dateStr: string) => {
        if (!dateStr) return false;
        // Extract YYYY-MM-DD from full timestamp if needed
        const pureDateStr = dateStr.split(' ')[0];
        const date = new Date(pureDateStr);
        const now = new Date();
        
        // Use local date parts for comparison to avoid timezone shifts
        const dYear = date.getFullYear();
        const dMonth = date.getMonth();
        const dDay = date.getDate();
        
        const nYear = now.getFullYear();
        const nMonth = now.getMonth();
        const nDay = now.getDate();

        if (timeRange === 'today') return dYear === nYear && dMonth === nMonth && dDay === nDay;
        if (timeRange === 'this_month') return dMonth === nMonth && dYear === nYear;
        if (timeRange === 'this_year') return dYear === nYear;

        if (timeRange.startsWith('q')) {
            const quarter = parseInt(timeRange.substring(1));
            const startMonth = (quarter - 1) * 3;
            const endMonth = startMonth + 2;
            return dYear === nYear && dMonth >= startMonth && dMonth <= endMonth;
        }

        return true;
    };


    const filteredVendors = vendors.filter(v =>
        v.name_dv.toLowerCase().includes(vendorSearchQuery.toLowerCase()) ||
        v.name_en.toLowerCase().includes(vendorSearchQuery.toLowerCase()) ||
        v.code.toLowerCase().includes(vendorSearchQuery.toLowerCase())
    );

    const filteredSales = sales.filter(s => filterByRange(s.date));
    const filteredPurchases = purchases.filter(p => filterByRange(p.date));

    const outputGST = filteredSales.reduce((sum, s) => {
        const taxableTotal = s.items.filter(i => !i.is_zero_tax).reduce((itemSum, i) => itemSum + (i.price * i.qty), 0);
        const taxRate = settings.shop.taxRate / 100;
        // Formula for tax-inclusive amount
        const gstAmount = taxableTotal - (taxableTotal / (1 + taxRate));
        return sum + gstAmount;
    }, 0);

    const inputGST = filteredPurchases.reduce((sum, p) => sum + p.gstAmount, 0);
    const netGST = outputGST - inputGST;

    const totalTaxableSales = filteredSales.reduce((sum, s) => {
        const taxableTotal = s.items.filter(i => !i.is_zero_tax).reduce((itemSum, i) => itemSum + (i.price * i.qty), 0);
        const taxRate = settings.shop.taxRate / 100;
        return sum + (taxableTotal / (1 + taxRate));
    }, 0);

    const totalPurchases = filteredPurchases.reduce((sum, p) => sum + p.amount, 0);

    const calculateGstFromTotal = (total: number) => {
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

        const vendor = vendors.find(v => v.id === newPurchase.vendorId);
        if (!vendor) return;

        const total = parseFloat(newPurchase.totalAmount);
        const { subtotal, gstAmount } = calculateGstFromTotal(total);

        const purchase: Purchase = {
            id: `purch-${Date.now()}`,
            vendorId: vendor.id,
            vendorName: vendor.name_dv || vendor.name_en,
            billNumber: newPurchase.billNumber,
            description: newPurchase.description,
            amount: subtotal,
            gstAmount: gstAmount,
            date: newPurchase.date,
            items: [] 
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

    const exportToExcel = () => {
        const data = [
            ["GST Report", settings.shop.shopName],
            ["Period", timeRange.replace('_', ' ').toUpperCase()],
            [],
            ["Summary"],
            ["Total Taxable Sales", totalTaxableSales.toFixed(2)],
            ["Output GST", outputGST.toFixed(2)],
            ["Total Taxable Purchases", totalPurchases.toFixed(2)],
            ["Input GST", inputGST.toFixed(2)],
            ["Net GST Payable", netGST.toFixed(2)],
            [],
            ["Input GST Details (Purchases)"],
            ["Date", "Bill #", "Vendor", "Amount (Excl. GST)", "GST Amount", "Total Amount"]
        ];

        filteredPurchases.forEach(p => {
            data.push([
                p.date,
                p.billNumber,
                p.vendorName,
                p.amount.toFixed(2),
                p.gstAmount.toFixed(2),
                (p.amount + p.gstAmount).toFixed(2)
            ]);
        });

        const ws = XLSX.utils.aoa_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "GST Report");
        XLSX.writeFile(wb, `GST_Report_${timeRange}.xlsx`);
    };

    return (
        <div className="p-6 font-faruma flex flex-col h-full bg-[#050510] text-white overflow-hidden" dir="rtl">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <div className="text-right">
                    <h1 className="text-3xl font-black text-white flex items-center justify-end gap-3">
                        {renderBoth('gst_reports')} <Landmark className="h-8 w-8 text-primary" />
                    </h1>
                    <p className="text-sm text-white/40 mt-1">{renderBoth('gst_reports_description')}</p>
                </div>
                <div className="flex gap-3">
                    <Select value={timeRange} onValueChange={setTimeRange}>
                        <SelectTrigger className="w-[180px] bg-white/5 border-white/10 text-right h-11 rounded-xl">
                            <SelectValue placeholder="Time Period" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#0a0a1a] border-white/10 text-white">
                            <SelectItem value="today" className="text-right">Today</SelectItem>
                            <SelectItem value="this_month" className="text-right">This Month</SelectItem>
                            <SelectItem value="this_year" className="text-right">This Year</SelectItem>
                            <SelectItem value="q1" className="text-right">Q1 (Jan-Mar)</SelectItem>
                            <SelectItem value="q2" className="text-right">Q2 (Apr-Jun)</SelectItem>
                            <SelectItem value="q3" className="text-right">Q3 (Jul-Sep)</SelectItem>
                            <SelectItem value="q4" className="text-right">Q4 (Oct-Dec)</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button onClick={exportToExcel} variant="outline" className="gap-2 border-white/10 hover:bg-white/5 h-11 px-6 rounded-xl">
                        <Download className="h-4 w-4" /> {renderBoth('download_excel')}
                    </Button>
                    <Button onClick={() => setIsAddPurchaseDialogOpen(true)} className="gap-2 bg-primary hover:bg-primary/90 h-11 px-6 rounded-xl font-black shadow-[0_0_20px_rgba(0,132,255,0.3)]">
                        <PlusCircle className="h-4 w-4" /> {renderBoth('record_local_purchase')}
                    </Button>
                </div>
            </div>

            <ScrollArea className="flex-1 custom-scrollbar">
                <div className="space-y-8 pb-6">
                    {/* Summary Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card className="bg-[#0a0a1a] border-white/5 rounded-[2rem] p-6 relative group overflow-hidden">
                           <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full -mr-12 -mt-12 blur-2xl" />
                           <div className="flex justify-between items-center mb-4">
                              <ArrowUpRight className="h-5 w-5 text-primary" />
                              <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Output GST (Sales)</span>
                           </div>
                           <p className="text-3xl font-black text-white">{settings.shop.currency} {outputGST.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                           <p className="text-[10px] text-white/20 mt-1 font-bold uppercase tracking-widest">TOTAL TAXABLE: {totalTaxableSales.toLocaleString()}</p>
                        </Card>

                        <Card className="bg-[#0a0a1a] border-white/5 rounded-[2rem] p-6 relative group overflow-hidden">
                           <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/10 rounded-full -mr-12 -mt-12 blur-2xl" />
                           <div className="flex justify-between items-center mb-4">
                              <ArrowDownLeft className="h-5 w-5 text-orange-500" />
                              <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Input GST (Purchases)</span>
                           </div>
                           <p className="text-3xl font-black text-white">{settings.shop.currency} {inputGST.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                           <p className="text-[10px] text-white/20 mt-1 font-bold uppercase tracking-widest">TOTAL PURCHASES: {totalPurchases.toLocaleString()}</p>
                        </Card>

                        <Card className="bg-[#0a0a1a] border-white/5 rounded-[2rem] p-6 relative group overflow-hidden">
                           <div className={cn(
                             "absolute top-0 right-0 w-24 h-24 rounded-full -mr-12 -mt-12 blur-2xl",
                             netGST >= 0 ? "bg-red-500/10" : "bg-green-500/10"
                           )} />
                           <div className="flex justify-between items-center mb-4">
                              <Calculator className="h-5 w-5 text-purple-500" />
                              <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Net GST Payable</span>
                           </div>
                           <p className={cn(
                             "text-3xl font-black",
                             netGST >= 0 ? "text-red-500" : "text-green-500"
                           )}>{settings.shop.currency} {Math.abs(netGST).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                           <p className="text-[10px] text-white/20 mt-1 font-bold uppercase tracking-widest">
                             {netGST >= 0 ? "AMOUNT TO PAY" : "TAX CREDIT"}
                           </p>
                        </Card>
                    </div>

                    {/* Input GST Table */}
                    <Card className="bg-[#0a0a1a] border-white/5 rounded-[2rem] overflow-hidden shadow-2xl flex flex-col">
                        <CardHeader className="border-b border-white/5 px-8 py-6 flex flex-row items-center justify-between">
                            <div className="flex items-center gap-2">
                               <FileText className="h-5 w-5 text-primary" />
                               <span className="text-sm font-black text-white">Purchase History (Input GST)</span>
                            </div>
                            <Badge className="bg-white/5 text-white/40 border-white/10 uppercase tracking-widest font-black text-[10px]">
                               {filteredPurchases.length} RECORDS
                            </Badge>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table dir="rtl">
                                <TableHeader className="bg-white/5">
                                    <TableRow className="border-white/5">
                                        <TableHead className="text-right font-black text-white/40 uppercase text-[10px] tracking-widest">Date</TableHead>
                                        <TableHead className="text-right font-black text-white/40 uppercase text-[10px] tracking-widest">Bill #</TableHead>
                                        <TableHead className="text-right font-black text-white/40 uppercase text-[10px] tracking-widest">Vendor</TableHead>
                                        <TableHead className="text-right font-black text-white/40 uppercase text-[10px] tracking-widest">Amount (Excl.)</TableHead>
                                        <TableHead className="text-right font-black text-white/40 uppercase text-[10px] tracking-widest">GST (6%)</TableHead>
                                        <TableHead className="text-right font-black text-white/40 uppercase text-[10px] tracking-widest">Total</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredPurchases.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-20 text-white/20 font-black uppercase tracking-[0.2em]">
                                                No purchase records for this period
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredPurchases.map((purchase) => (
                                            <TableRow key={purchase.id} className="border-white/5 hover:bg-white/5 transition-colors group">
                                                <TableCell className="text-right font-medium">{formatDate(purchase.date)}</TableCell>
                                                <TableCell className="text-right font-black text-white">{purchase.billNumber || '-'}</TableCell>
                                                <TableCell className="text-right text-sm font-bold text-white/60">{purchase.vendorName}</TableCell>
                                                <TableCell className="text-right font-medium">{settings.shop.currency} {purchase.amount.toFixed(2)}</TableCell>
                                                <TableCell className="text-right font-black text-orange-500">{settings.shop.currency} {purchase.gstAmount.toFixed(2)}</TableCell>
                                                <TableCell className="text-right font-black text-primary">
                                                    {settings.shop.currency} {(purchase.amount + purchase.gstAmount).toFixed(2)}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            </ScrollArea>

            {/* Add Purchase Dialog */}
            <Dialog open={isAddPurchaseDialogOpen} onOpenChange={setIsAddPurchaseDialogOpen}>
                <DialogContent className="sm:max-w-[500px] font-faruma bg-[#0a0a1a] border-white/10 text-white" dir="rtl">
                    <DialogHeader>
                        <DialogTitle className="text-right text-2xl font-black">{renderBoth('record_local_purchase')}</DialogTitle>
                        <DialogDescription className="text-right text-white/40">{renderBoth('record_purchase_description')}</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-6 py-6">
                        <div className="space-y-2">
                            <Label className="text-right block text-[10px] font-black uppercase text-white/40 tracking-widest">{renderBoth('select_vendor')}*</Label>
                            <Select value={newPurchase.vendorId} onValueChange={(val) => setNewPurchase({ ...newPurchase, vendorId: val })}>
                                <SelectTrigger className="w-full bg-white/5 border-white/10 text-right h-12 rounded-xl">
                                    <SelectValue placeholder="Choose Vendor" />
                                </SelectTrigger>
                                <SelectContent className="bg-[#0a0a1a] border-white/10 text-white">
                                    <div className="p-2 sticky top-0 bg-[#0a0a1a] border-b border-white/5 z-10">
                                        <Input 
                                          placeholder="Search vendors..." 
                                          value={vendorSearchQuery}
                                          onChange={(e) => setVendorSearchQuery(e.target.value)}
                                          className="h-9 bg-white/5 border-white/10 text-right"
                                        />
                                    </div>
                                    <ScrollArea className="h-40">
                                        {filteredVendors.map(v => (
                                            <SelectItem key={v.id} value={v.id} className="text-right hover:bg-white/5">
                                                {v.name_dv || v.name_en}
                                            </SelectItem>
                                        ))}
                                    </ScrollArea>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-right block text-[10px] font-black uppercase text-white/40 tracking-widest">{renderBoth('bill_number')}</Label>
                                <Input value={newPurchase.billNumber} onChange={(e) => setNewPurchase({ ...newPurchase, billNumber: e.target.value })} className="text-right h-12 bg-white/5 border-white/10 rounded-xl font-mono" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-right block text-[10px] font-black uppercase text-white/40 tracking-widest">{renderBoth('date')}</Label>
                                <Input type="date" value={newPurchase.date} onChange={(e) => setNewPurchase({ ...newPurchase, date: e.target.value })} className="text-right h-12 bg-white/5 border-white/10 rounded-xl" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-right block text-[10px] font-black uppercase text-white/40 tracking-widest">{renderBoth('total_amount_incl_gst')}*</Label>
                            <Input 
                              type="number" 
                              value={newPurchase.totalAmount} 
                              onChange={(e) => setNewPurchase({ ...newPurchase, totalAmount: e.target.value })} 
                              onFocus={handleFocus}
                              className="text-right h-14 bg-white/5 border-white/10 rounded-xl text-2xl font-black text-primary" 
                              placeholder="0.00"
                            />
                            <p className="text-[10px] text-white/20 text-right italic">GST (6%) will be automatically calculated from this total.</p>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-right block text-[10px] font-black uppercase text-white/40 tracking-widest">{renderBoth('description')}</Label>
                            <Input value={newPurchase.description} onChange={(e) => setNewPurchase({ ...newPurchase, description: e.target.value })} className="text-right h-12 bg-white/5 border-white/10 rounded-xl" />
                        </div>
                    </div>
                    <DialogFooter className="gap-3 pt-4 border-t border-white/5">
                        <Button variant="ghost" onClick={() => setIsAddPurchaseDialogOpen(false)} className="flex-1 h-12 border-white/10 hover:bg-white/5 text-white">
                            {renderBoth('cancel')}
                        </Button>
                        <Button onClick={handleAddPurchase} className="flex-1 h-12 bg-primary hover:bg-primary/90 font-black">
                            {renderBoth('save_purchase')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default GSTReports;
