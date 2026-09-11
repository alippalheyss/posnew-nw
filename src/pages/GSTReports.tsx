"use client";

import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Download, PlusCircle, Receipt, Building2, Calculator, ArrowUpRight, ArrowDownLeft, Landmark, X, ShoppingCart, Archive, Play, Trash2, Save, Package, FileText, Info, TrendingDown, TrendingUp } from 'lucide-react';
import { useAppContext, Purchase, Vendor, PurchaseItem, Product } from '@/context/AppContext';
import { Badge } from '@/components/ui/badge';
import { showSuccess, showError } from '@/utils/toast';
import { formatDate, extractDateOnly } from '@/utils/formatters';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';
import MobilePurchase from './MobilePurchase';

const GSTReports = () => {
    const { t } = useTranslation();
    const [searchParams, setSearchParams] = useSearchParams();
    const initialTab = searchParams.get('tab') === 'mobile' || searchParams.get('tab') === 'mobile-purchase' ? 'mobile_purchase' : 'gst_reports';
    const [activeTab, setActiveTab] = useState(initialTab);
    const { sales, purchases, vendors, settings, setIsPurchaseWindowOpen, deletePurchase } = useAppContext();
    const [timeRange, setTimeRange] = useState('this_month');
    const [purchaseToDelete, setPurchaseToDelete] = useState<Purchase | null>(null);

    const handleTabChange = (val: string) => {
        setActiveTab(val);
        setSearchParams(val === 'mobile_purchase' ? { tab: 'mobile' } : {});
    };
    
    const renderBoth = (key: string, options?: any) => (
        <>
            {t(key, options)} ({t(key, { ...options, lng: 'en' })})
        </>
    );

    const handleFocus = (event: React.FocusEvent<HTMLInputElement>) => {
        event.target.select();
    };

    const filterByRange = (dateStr: string) => {
        const pureDateStr = extractDateOnly(dateStr);
        if (!pureDateStr) return false;
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




    const filteredSales = sales.filter(s => filterByRange(s.date));
    const filteredPurchases = purchases.filter(p => filterByRange(p.date));

    const outputGST = filteredSales.reduce((sum, s) => {
        if (!Array.isArray(s.items)) return sum;
        const taxableTotal = s.items.filter(i => !i.is_zero_tax).reduce((itemSum, i) => itemSum + (i.price * i.qty), 0);
        const taxRate = settings.shop.taxRate / 100;
        // Formula for tax-inclusive amount
        const gstAmount = taxableTotal - (taxableTotal / (1 + taxRate));
        return sum + gstAmount;
    }, 0);

    const inputGST = filteredPurchases.reduce((sum, p) => sum + p.gstAmount, 0);
    const netGST = outputGST - inputGST;

    const totalTaxableSales = filteredSales.reduce((sum, s) => {
        if (!Array.isArray(s.items)) return sum;
        const taxableTotal = s.items.filter(i => !i.is_zero_tax).reduce((itemSum, i) => itemSum + (i.price * i.qty), 0);
        const taxRate = settings.shop.taxRate / 100;
        return sum + (taxableTotal / (1 + taxRate));
    }, 0);

    const totalPurchases = filteredPurchases.reduce((sum, p) => sum + p.amount, 0);


    const exportToExcel = () => {
        const headers = [
            "#",
            "Supplier TIN",
            "Supplier Name",
            "Supplier Invoice Number",
            "Invoice Date",
            "Invoice Total (excluding GST)",
            "GST Charged at 6%",
            "GST Charged at 8%",
            "GST Charged at 12%",
            "GST Charged at 16%",
            "GST Charged at 17%",
            "Your Taxable Activity Number",
            "Revenue / Capital"
        ];

        const rows = filteredPurchases.map((p, index) => {
            const matchedVendor = vendors.find(v =>
                (p.vendorId && v.id === p.vendorId) ||
                (v.name_en && p.vendor && v.name_en.trim().toLowerCase() === p.vendor.trim().toLowerCase()) ||
                (v.name_dv && p.vendor && v.name_dv.trim().toLowerCase() === p.vendor.trim().toLowerCase()) ||
                (v.name_en && (p as any).vendorName && v.name_en.trim().toLowerCase() === (p as any).vendorName.trim().toLowerCase()) ||
                (v.name_dv && (p as any).vendorName && v.name_dv.trim().toLowerCase() === (p as any).vendorName.trim().toLowerCase())
            );

            const supplierTin = matchedVendor?.tin_number || '';
            const supplierName = matchedVendor?.name_en || matchedVendor?.name_dv || (p as any).vendorName || p.vendor || '';
            const supplierInvoiceNumber = p.billNumber || '';
            const invoiceDate = extractDateOnly(p.date) || p.date || '';
            const invoiceTotalExclGst = Number((p.amount || 0).toFixed(2));
            const gstChargedAt6 = 0;
            const gstChargedAt8 = Number((p.gstAmount || 0).toFixed(2));
            const gstChargedAt12 = 0;
            const gstChargedAt16 = 0;
            const gstChargedAt17 = 0;
            const taxableActivityNumber = 1;
            const revenueCapital = "Revenue";

            return [
                index + 1,
                supplierTin,
                supplierName,
                supplierInvoiceNumber,
                invoiceDate,
                invoiceTotalExclGst,
                gstChargedAt6,
                gstChargedAt8,
                gstChargedAt12,
                gstChargedAt16,
                gstChargedAt17,
                taxableActivityNumber,
                revenueCapital
            ];
        });

        const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

        ws['!cols'] = [
            { wch: 6 },  // #
            { wch: 18 }, // Supplier TIN
            { wch: 30 }, // Supplier Name
            { wch: 25 }, // Supplier Invoice Number
            { wch: 15 }, // Invoice Date
            { wch: 30 }, // Invoice Total (excluding GST)
            { wch: 18 }, // GST Charged at 6%
            { wch: 18 }, // GST Charged at 8%
            { wch: 18 }, // GST Charged at 12%
            { wch: 18 }, // GST Charged at 16%
            { wch: 18 }, // GST Charged at 17%
            { wch: 28 }, // Your Taxable Activity Number
            { wch: 20 }  // Revenue / Capital
        ];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Input Tax Statement");
        XLSX.writeFile(wb, `MIRA_Input_Tax_Statement_${timeRange}.xlsx`);
        showSuccess('MIRA Input Tax Statement downloaded successfully');
    };

    return (
        <div className="p-6 font-faruma flex flex-col h-full bg-background text-foreground overflow-hidden" dir="rtl">
            <Tabs value={activeTab} onValueChange={handleTabChange} className="flex-1 flex flex-col min-h-0">
                {/* Header with Title and Tab Switcher */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 flex-shrink-0">
                    <div className="text-right">
                        <h1 className="text-3xl font-black text-foreground flex items-center justify-end gap-3">
                            {activeTab === 'gst_reports' ? (
                                <>
                                    {renderBoth('gst_reports')} <Landmark className="h-8 w-8 text-primary" />
                                </>
                            ) : (
                                <>
                                    <span>ބިލް އެޅުން (Purchase Bill)</span> <Receipt className="h-8 w-8 text-primary" />
                                </>
                            )}
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            {activeTab === 'gst_reports' 
                                ? renderBoth('gst_reports_description') 
                                : 'Record purchase bills with 8% GST, paper bill photos & vendor tracking'
                            }
                        </p>
                    </div>

                    {/* Tabs Switcher */}
                    <TabsList className="bg-muted border border-border p-1 rounded-2xl h-12 flex gap-1">
                        <TabsTrigger 
                            value="gst_reports"
                            className="rounded-xl px-5 h-10 font-black text-xs gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg transition-all"
                        >
                            <Landmark className="h-4 w-4" />
                            <span>{renderBoth('gst_reports')}</span>
                        </TabsTrigger>
                        <TabsTrigger 
                            value="mobile_purchase"
                            className="rounded-xl px-5 h-10 font-black text-xs gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg transition-all"
                        >
                            <Receipt className="h-4 w-4" />
                            <span>ބިލް އެޅުން (Mobile Bill)</span>
                        </TabsTrigger>
                    </TabsList>
                </div>

                {/* TAB 1: GST Reports Overview */}
                <TabsContent value="gst_reports" className="flex-1 flex flex-col min-h-0 mt-0 outline-none data-[state=inactive]:hidden">
                    {/* Period & Export Action Controls */}
                    <div className="flex flex-wrap justify-between items-center gap-3 mb-6 flex-shrink-0">
                        <div className="text-xs text-muted-foreground font-bold">
                            Total Input Tax records: <span className="text-foreground">{filteredPurchases.length}</span>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            <Select value={timeRange} onValueChange={setTimeRange}>
                                <SelectTrigger className="w-[180px] bg-muted border-border text-right h-11 rounded-xl font-bold">
                                    <SelectValue placeholder="Time Period" />
                                </SelectTrigger>
                                <SelectContent className="bg-card border-border text-foreground">
                                    <SelectItem value="today" className="text-right">Today</SelectItem>
                                    <SelectItem value="this_month" className="text-right">This Month</SelectItem>
                                    <SelectItem value="this_year" className="text-right">This Year</SelectItem>
                                    <SelectItem value="q1" className="text-right">Q1 (Jan-Mar)</SelectItem>
                                    <SelectItem value="q2" className="text-right">Q2 (Apr-Jun)</SelectItem>
                                    <SelectItem value="q3" className="text-right">Q3 (Jul-Sep)</SelectItem>
                                    <SelectItem value="q4" className="text-right">Q4 (Oct-Dec)</SelectItem>
                                </SelectContent>
                            </Select>
                            <Button onClick={exportToExcel} variant="outline" className="gap-2 border-border hover:bg-muted h-11 px-6 rounded-xl font-black">
                                <Download className="h-4 w-4" /> {renderBoth('download_excel')}
                            </Button>
                            <Button onClick={() => handleTabChange('mobile_purchase')} className="gap-2 bg-primary hover:bg-primary/90 h-11 px-6 rounded-xl font-black shadow-[0_0_20px_rgba(0,132,255,0.3)]">
                                <PlusCircle className="h-4 w-4" /> {renderBoth('record_local_purchase')}
                            </Button>
                        </div>
                    </div>

                    <ScrollArea className="flex-1 custom-scrollbar">
                        <div className="space-y-8 pb-6">
                            {/* Summary Stats */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <Card className="bg-card border-border rounded-[2rem] p-6 relative group overflow-hidden">
                                   <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full -mr-12 -mt-12 blur-2xl" />
                                   <div className="flex justify-between items-center mb-4">
                                      <ArrowUpRight className="h-5 w-5 text-primary" />
                                      <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Output GST (Sales)</span>
                                   </div>
                                   <p className="text-3xl font-black text-foreground">{settings.shop.currency} {outputGST.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                                   <p className="text-[10px] text-muted-foreground/50 mt-1 font-bold uppercase tracking-widest">TOTAL TAXABLE: {totalTaxableSales.toLocaleString()}</p>
                                </Card>

                                <Card className="bg-card border-border rounded-[2rem] p-6 relative group overflow-hidden">
                                   <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/10 rounded-full -mr-12 -mt-12 blur-2xl" />
                                   <div className="flex justify-between items-center mb-4">
                                      <ArrowDownLeft className="h-5 w-5 text-orange-500" />
                                      <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Input GST (Purchases)</span>
                                   </div>
                                   <p className="text-3xl font-black text-foreground">{settings.shop.currency} {inputGST.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                                   <p className="text-[10px] text-muted-foreground/50 mt-1 font-bold uppercase tracking-widest">TOTAL PURCHASES: {totalPurchases.toLocaleString()}</p>
                                </Card>

                                <Card className="bg-card border-border rounded-[2rem] p-6 relative group overflow-hidden">
                                   <div className={cn(
                                     "absolute top-0 right-0 w-24 h-24 rounded-full -mr-12 -mt-12 blur-2xl",
                                     netGST >= 0 ? "bg-red-500/10" : "bg-green-500/10"
                                   )} />
                                   <div className="flex justify-between items-center mb-4">
                                      <Calculator className="h-5 w-5 text-purple-500" />
                                      <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Net GST Payable</span>
                                   </div>
                                   <p className={cn(
                                     "text-3xl font-black",
                                     netGST >= 0 ? "text-red-500" : "text-green-500"
                                   )}>{settings.shop.currency} {Math.abs(netGST).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                                   <p className="text-[10px] text-muted-foreground/50 mt-1 font-bold uppercase tracking-widest">
                                     {netGST >= 0 ? "AMOUNT TO PAY" : "TAX CREDIT"}
                                   </p>
                                </Card>
                            </div>

                            {/* Input GST Table */}
                            <Card className="bg-card border-border rounded-[2rem] overflow-hidden shadow-2xl flex flex-col">
                                <CardHeader className="border-b border-border px-8 py-6 flex flex-row items-center justify-between">
                                    <div className="flex items-center gap-2">
                                       <FileText className="h-5 w-5 text-primary" />
                                       <span className="text-sm font-black text-foreground">Purchase History (Input GST)</span>
                                    </div>
                                    <Badge className="bg-muted text-muted-foreground border-border uppercase tracking-widest font-black text-[10px]">
                                       {filteredPurchases.length} RECORDS
                                    </Badge>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <Table dir="rtl">
                                        <TableHeader className="bg-muted">
                                            <TableRow className="border-border">
                                                <TableHead className="text-right font-black text-muted-foreground uppercase text-[10px] tracking-widest">Date</TableHead>
                                                <TableHead className="text-right font-black text-muted-foreground uppercase text-[10px] tracking-widest">Bill #</TableHead>
                                                <TableHead className="text-right font-black text-muted-foreground uppercase text-[10px] tracking-widest">Vendor</TableHead>
                                                <TableHead className="text-right font-black text-muted-foreground uppercase text-[10px] tracking-widest">Amount (Excl.)</TableHead>
                                                <TableHead className="text-right font-black text-muted-foreground uppercase text-[10px] tracking-widest">GST ({settings.shop.taxRate}%)</TableHead>
                                                <TableHead className="text-right font-black text-muted-foreground uppercase text-[10px] tracking-widest">Total</TableHead>
                                                <TableHead className="text-center font-black text-muted-foreground uppercase text-[10px] tracking-widest w-12"></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredPurchases.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={7} className="text-center py-20 text-muted-foreground/50 font-black uppercase tracking-[0.2em]">
                                                        No purchase records for this period
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                filteredPurchases.map((purchase) => (
                                                    <TableRow key={purchase.id} className="border-border hover:bg-muted transition-colors group">
                                                        <TableCell className="text-right font-medium">{formatDate(purchase.date)}</TableCell>
                                                        <TableCell className="text-right font-black text-foreground">
                                                            <div>{purchase.billNumber || '-'}</div>
                                                            {purchase.description && (
                                                                <div className="text-[10px] text-muted-foreground font-normal truncate max-w-[180px]" title={purchase.description}>
                                                                    {purchase.description}
                                                                </div>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-right text-sm font-bold text-muted-foreground/80">
                                                            <div>{purchase.vendorName || purchase.vendor || '-'}</div>
                                                            {(() => {
                                                                const matchedVendor = vendors.find(v =>
                                                                    (purchase.vendorId && v.id === purchase.vendorId) ||
                                                                    (v.name_en && purchase.vendor && v.name_en.trim().toLowerCase() === purchase.vendor.trim().toLowerCase()) ||
                                                                    (v.name_dv && purchase.vendor && v.name_dv.trim().toLowerCase() === purchase.vendor.trim().toLowerCase()) ||
                                                                    (v.name_en && (purchase as any).vendorName && v.name_en.trim().toLowerCase() === (purchase as any).vendorName.trim().toLowerCase()) ||
                                                                    (v.name_dv && (purchase as any).vendorName && v.name_dv.trim().toLowerCase() === (purchase as any).vendorName.trim().toLowerCase())
                                                                );
                                                                return matchedVendor?.tin_number ? (
                                                                    <div className="text-[10px] font-mono text-primary/80 font-normal">TIN: {matchedVendor.tin_number}</div>
                                                                ) : null;
                                                            })()}
                                                        </TableCell>
                                                        <TableCell className="text-right font-medium">{settings.shop.currency} {purchase.amount.toFixed(2)}</TableCell>
                                                        <TableCell className="text-right font-black text-orange-500">{settings.shop.currency} {purchase.gstAmount.toFixed(2)}</TableCell>
                                                        <TableCell className="text-right font-black text-primary">
                                                            {settings.shop.currency} {(purchase.amount + purchase.gstAmount).toFixed(2)}
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => setPurchaseToDelete(purchase)}
                                                                className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg opacity-60 group-hover:opacity-100 transition-all"
                                                                title="Delete Purchase Record"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
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
                </TabsContent>

                {/* TAB 2: Purchase Bill (Mobile) */}
                <TabsContent value="mobile_purchase" className="flex-1 min-h-0 mt-0 outline-none overflow-y-auto custom-scrollbar data-[state=inactive]:hidden">
                    <MobilePurchase embedded={true} />
                </TabsContent>
            </Tabs>

            {/* Delete Purchase Confirmation Dialog */}
            <Dialog open={!!purchaseToDelete} onOpenChange={(open) => !open && setPurchaseToDelete(null)}>
                <DialogContent className="font-faruma bg-card border-border text-foreground max-w-sm" dir="rtl">
                    <DialogHeader className="text-right">
                        <DialogTitle className="text-base font-black flex items-center justify-end gap-2 text-red-500">
                            <span>ބިލް ޑިލީޓް ކުރަންވީތަ؟</span>
                            <Trash2 className="h-5 w-5" />
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground text-right mt-2 space-y-1">
                            {purchaseToDelete && (
                                <>
                                    <div>ބިލް ނަންބަރު: <strong className="text-foreground">{purchaseToDelete.billNumber || '-'}</strong> ({purchaseToDelete.vendorName || purchaseToDelete.vendor})</div>
                                    <div>ތާރީޚް: <strong className="text-foreground">{formatDate(purchaseToDelete.date)}</strong></div>
                                    <div>ޖުމްލަ އަގު: <strong className="text-primary">{settings.shop.currency} {(purchaseToDelete.amount + purchaseToDelete.gstAmount).toFixed(2)}</strong></div>
                                </>
                            )}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex gap-2 mt-4">
                        <Button variant="ghost" onClick={() => setPurchaseToDelete(null)} className="flex-1 h-10 text-xs font-bold">
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={async () => {
                                if (purchaseToDelete) {
                                    await deletePurchase(purchaseToDelete.id);
                                    setPurchaseToDelete(null);
                                }
                            }}
                            className="flex-1 h-10 text-xs font-black bg-red-600 hover:bg-red-700"
                        >
                            Delete Bill
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default GSTReports;
