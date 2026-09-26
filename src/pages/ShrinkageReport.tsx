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
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  AlertTriangle, 
  PlusCircle, 
  Search, 
  Trash2, 
  TrendingDown, 
  Package, 
  Calendar,
  Filter,
  Download,
  Info,
  ChevronRight,
  TrendingUp,
  Activity,
  History
} from 'lucide-react';
import { useAppContext, Product } from '@/context/AppContext';
import { showSuccess, showError } from '@/utils/toast';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';

interface ShrinkageRecord {
  id: string;
  date: string;
  productId: string;
  productName: string;
  qty: number;
  reason: 'damaged' | 'expired' | 'stolen' | 'other';
  location: 'shop' | 'godown';
  costPrice: number;
  totalLoss: number;
  notes: string;
}

const ShrinkageReport = () => {
  const { t } = useTranslation();
  const { products, settings, updateStock } = useAppContext();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [records, setRecords] = useState<ShrinkageRecord[]>([]);

  const [newRecord, setNewRecord] = useState({
    productId: '',
    qty: 0,
    reason: 'damaged' as const,
    location: 'shop' as const,
    notes: '',
    date: new Date().toISOString().split('T')[0]
  });

  const renderBoth = (key: string, options?: any) => (
    <>
      {t(key, options)} ({t(key, { ...options, lng: 'en' })})
    </>
  );

  const selectedProduct = products.find(p => p.id === newRecord.productId);

  const handleAddRecord = async () => {
    if (!newRecord.productId || newRecord.qty <= 0) {
      showError('Please select a product and enter a valid quantity');
      return;
    }

    if (!selectedProduct) return;

    const record: ShrinkageRecord = {
      id: `sh-${Date.now()}`,
      date: newRecord.date,
      productId: newRecord.productId,
      productName: selectedProduct.name_en,
      qty: newRecord.qty,
      reason: newRecord.reason,
      location: newRecord.location,
      costPrice: selectedProduct.cost_price || 0,
      totalLoss: (selectedProduct.cost_price || 0) * newRecord.qty,
      notes: newRecord.notes
    };

    const currentStock = newRecord.location === 'shop' ? selectedProduct.stock_shop : selectedProduct.stock_godown;
    if (currentStock < newRecord.qty) {
      showError(`Insufficient stock in ${newRecord.location}. Current: ${currentStock}`);
      return;
    }

    const newStock = currentStock - newRecord.qty;
    updateStock(selectedProduct.id, newStock, newRecord.location);

    setRecords(prev => [record, ...prev]);
    setIsAddDialogOpen(false);
    setNewRecord({
      productId: '',
      qty: 0,
      reason: 'damaged' as const,
      location: 'shop' as const,
      notes: '',
      date: new Date().toISOString().split('T')[0]
    });
    showSuccess('Shrinkage record added and stock updated');
  };

  const handleDeleteRecord = (id: string) => {
    if (window.confirm('Delete this record? Note: Stock will not be automatically restored.')) {
      setRecords(prev => prev.filter(r => r.id !== id));
      showSuccess('Record deleted');
    }
  };

  const exportToExcel = () => {
    const data = [
      ["Shrinkage & Loss Report", settings.shop.shopName],
      ["Generated Date", new Date().toLocaleDateString()],
      [],
      ["Date", "Product", "Qty", "Reason", "Location", "Cost Price", "Total Loss", "Notes"]
    ];

    records.forEach(r => {
      data.push([
        r.date,
        r.productName,
        r.qty,
        r.reason.toUpperCase(),
        r.location.toUpperCase(),
        r.costPrice.toFixed(2),
        r.totalLoss.toFixed(2),
        r.notes
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Shrinkage Report");
    XLSX.writeFile(wb, `Shrinkage_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const filteredRecords = records.filter(r => 
    r.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.notes.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.reason.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalLoss = records.reduce((sum, r) => sum + r.totalLoss, 0);

  return (
    <div className="p-6 font-faruma flex flex-col h-full bg-background text-foreground overflow-hidden" dir="rtl">
      {/* Header Section */}
      <div className="flex justify-between items-center mb-8">
        <div className="text-right">
           <h1 className="text-3xl font-black text-foreground flex items-center justify-end gap-3">
             Shrinkage Report <FileText className="h-8 w-8 text-red-500" />
           </h1>
           <p className="text-sm text-muted-foreground mt-1">Track inventory losses due to damage, expiry, or theft</p>
        </div>

        <div className="flex gap-3">
           <Button 
             variant="outline" 
             onClick={exportToExcel}
             className="gap-2 border-border hover:bg-muted h-11 px-6 rounded-xl"
           >
             <Download className="h-4 w-4" /> EXPORT EXCEL
           </Button>
           <Button 
             onClick={() => setIsAddDialogOpen(true)}
             className="gap-2 bg-red-600 hover:bg-red-700 h-11 px-6 rounded-xl font-black shadow-[0_0_20px_rgba(220,38,38,0.3)]"
           >
             <PlusCircle className="h-4 w-4" /> RECORD LOSS
           </Button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
         <Card className="apple-glass-card border border-red-500/25 rounded-[2rem] p-6 relative overflow-hidden group shadow-md">
            <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/10 rounded-full -mr-12 -mt-12 blur-2xl group-hover:bg-red-500/20 transition-all" />
            <div className="flex justify-between items-center mb-4">
               <TrendingDown className="h-5 w-5 text-red-500" />
               <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Total Value Loss</span>
            </div>
            <p className="text-3xl font-black text-foreground">{settings.shop.currency} {totalLoss.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            <p className="text-[10px] text-muted-foreground/60 mt-1 font-bold uppercase tracking-widest">ACCUMULATED SHRINKAGE</p>
         </Card>

         <Card className="apple-glass-card border border-orange-500/25 rounded-[2rem] p-6 relative overflow-hidden group shadow-md">
            <div className="flex justify-between items-center mb-4">
               <AlertTriangle className="h-5 w-5 text-orange-500" />
               <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Loss Incidents</span>
            </div>
            <p className="text-3xl font-black text-foreground">{records.length}</p>
            <p className="text-[10px] text-muted-foreground/60 mt-1 font-bold uppercase tracking-widest">TOTAL RECORDS</p>
         </Card>

         <Card className="apple-glass-card border border-white/20 dark:border-white/10 rounded-[2rem] p-6 relative overflow-hidden group shadow-md">
            <div className="flex justify-between items-center mb-4">
               <Package className="h-5 w-5 text-primary" />
               <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Highest Loss Reason</span>
            </div>
            <p className="text-2xl font-black text-foreground uppercase truncate">
               {records.length > 0 ? records[0].reason : 'N/A'}
            </p>
            <p className="text-[10px] text-muted-foreground/60 mt-1 font-bold uppercase tracking-widest">BY FREQUENCY</p>
         </Card>
      </div>

      {/* Search Bar */}
      <div className="relative mb-8">
         <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
         <Input 
           placeholder="Search records by product or notes..."
           value={searchTerm}
           onChange={(e) => setSearchTerm(e.target.value)}
           className="w-full apple-glass-input rounded-2xl pr-12 h-14 text-right font-bold transition-all text-lg shadow-sm"
         />
      </div>

      {/* Main Table Container */}
      <Card className="apple-glass-card border border-white/25 dark:border-white/10 rounded-[2rem] overflow-hidden shadow-2xl flex-1 flex flex-col">
         <CardHeader className="border-b border-white/20 dark:border-white/10 px-8 py-6 flex flex-row items-center justify-between bg-white/30 dark:bg-white/5 backdrop-blur-md">
            <div className="flex items-center gap-2">
               <History className="h-5 w-5 text-primary" />
               <span className="text-sm font-black text-foreground">Loss History Log</span>
            </div>
            <Badge className="bg-white/20 text-foreground border-white/20 uppercase tracking-widest font-black text-[10px]">
               {filteredRecords.length} ENTRIES
            </Badge>
         </CardHeader>
         <CardContent className="p-0 flex-1 overflow-hidden">
            <ScrollArea className="h-full custom-scrollbar">
               <Table dir="rtl">
                  <TableHeader className="bg-white/40 dark:bg-white/5 backdrop-blur-md sticky top-0 z-10 border-b border-white/20 dark:border-white/10">
                     <TableRow className="border-white/20 dark:border-white/10">
                        <TableHead className="text-right font-black text-muted-foreground uppercase text-[10px] tracking-widest">Date</TableHead>
                        <TableHead className="text-right font-black text-muted-foreground uppercase text-[10px] tracking-widest">Product</TableHead>
                        <TableHead className="text-right font-black text-muted-foreground uppercase text-[10px] tracking-widest">Qty</TableHead>
                        <TableHead className="text-right font-black text-muted-foreground uppercase text-[10px] tracking-widest">Reason</TableHead>
                        <TableHead className="text-right font-black text-muted-foreground uppercase text-[10px] tracking-widest">Loss Value</TableHead>
                        <TableHead className="text-right font-black text-muted-foreground uppercase text-[10px] tracking-widest">Actions</TableHead>
                     </TableRow>
                  </TableHeader>
                  <TableBody>
                     {filteredRecords.length === 0 ? (
                        <TableRow>
                           <TableCell colSpan={6} className="text-center py-20 text-muted-foreground/50 font-black uppercase tracking-[0.2em]">
                              No loss records found
                           </TableCell>
                        </TableRow>
                     ) : (
                        filteredRecords.map((record) => (
                           <TableRow key={record.id} className="border-border hover:bg-muted transition-colors group">
                              <TableCell className="text-right font-mono text-xs text-muted-foreground">{record.date}</TableCell>
                              <TableCell className="text-right">
                                 <div className="flex flex-col">
                                    <span className="font-black text-foreground group-hover:text-primary transition-colors">{record.productName}</span>
                                    <span className="text-[10px] text-muted-foreground uppercase font-bold">{record.location.toUpperCase()} STOCK</span>
                                 </div>
                              </TableCell>
                              <TableCell className="text-right font-black text-foreground">{record.qty}</TableCell>
                              <TableCell className="text-right">
                                 <Badge className={cn(
                                    "border-none text-[8px] font-black uppercase px-2 py-0.5 rounded-full",
                                    record.reason === 'damaged' ? "bg-orange-500/20 text-orange-500" :
                                    record.reason === 'expired' ? "bg-red-500/20 text-red-500" :
                                    record.reason === 'stolen' ? "bg-purple-500/20 text-purple-500" :
                                    "bg-muted/80 text-muted-foreground"
                                 )}>
                                    {record.reason}
                                 </Badge>
                              </TableCell>
                              <TableCell className="text-right font-black text-red-500">
                                 {settings.shop.currency} {record.totalLoss.toFixed(2)}
                              </TableCell>
                              <TableCell className="text-right">
                                 <Button 
                                   variant="ghost" 
                                   size="icon" 
                                   onClick={() => handleDeleteRecord(record.id)}
                                   className="h-9 w-9 rounded-xl hover:bg-red-500/10 text-red-400 group/btn"
                                 >
                                    <Trash2 className="h-4 w-4 transition-transform group-hover/btn:scale-110" />
                                 </Button>
                              </TableCell>
                           </TableRow>
                        ))
                     )}
                  </TableBody>
               </Table>
            </ScrollArea>
         </CardContent>
      </Card>

      {/* Add Record Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[500px] font-faruma apple-glass-dialog border-white/20 dark:border-white/10 text-foreground shadow-2xl rounded-3xl p-6 sm:p-7" dir="rtl">
          <DialogHeader className="text-right pb-3 border-b border-white/10">
            <DialogTitle className="text-right text-2xl font-black text-foreground">Record Inventory Loss</DialogTitle>
            <DialogDescription className="text-right text-xs text-muted-foreground font-bold">Enter the details of the damaged or missing stock.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-1.5">
              <Label className="text-right block text-[10px] font-black uppercase text-muted-foreground tracking-widest">Select Product*</Label>
              <Select value={newRecord.productId} onValueChange={(val) => setNewRecord({ ...newRecord, productId: val })}>
                <SelectTrigger className="w-full apple-glass-input text-right h-12 rounded-2xl font-bold">
                  <SelectValue placeholder="Choose product..." />
                </SelectTrigger>
                <SelectContent className="apple-glass-dialog border border-white/20 text-foreground">
                  <ScrollArea className="h-40">
                    {products.map(p => (
                      <SelectItem key={p.id} value={p.id} className="text-right hover:bg-white/10">
                        {p.name_dv} ({p.name_en})
                      </SelectItem>
                    ))}
                  </ScrollArea>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-1.5">
                 <Label className="text-right block text-[10px] font-black uppercase text-muted-foreground tracking-widest">Quantity*</Label>
                 <Input 
                   type="number" 
                   value={newRecord.qty || ''} 
                   onChange={(e) => setNewRecord({ ...newRecord, qty: parseFloat(e.target.value) || 0 })} 
                   className="text-right h-12 apple-glass-input rounded-2xl font-mono font-bold"
                 />
               </div>
               <div className="space-y-1.5">
                 <Label className="text-right block text-[10px] font-black uppercase text-muted-foreground tracking-widest">Date</Label>
                 <Input 
                   type="date" 
                   value={newRecord.date} 
                   onChange={(e) => setNewRecord({ ...newRecord, date: e.target.value })} 
                   className="text-right h-12 apple-glass-input rounded-2xl font-mono"
                 />
               </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-1.5">
                 <Label className="text-right block text-[10px] font-black uppercase text-muted-foreground tracking-widest">Reason*</Label>
                 <Select value={newRecord.reason} onValueChange={(val: any) => setNewRecord({ ...newRecord, reason: val })}>
                    <SelectTrigger className="w-full apple-glass-input text-right h-12 rounded-2xl font-bold">
                       <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="apple-glass-dialog border border-white/20 text-foreground">
                       <SelectItem value="damaged" className="text-right">Damaged</SelectItem>
                       <SelectItem value="expired" className="text-right">Expired</SelectItem>
                       <SelectItem value="stolen" className="text-right">Stolen / Lost</SelectItem>
                       <SelectItem value="other" className="text-right">Other</SelectItem>
                    </SelectContent>
                 </Select>
               </div>
               <div className="space-y-1.5">
                 <Label className="text-right block text-[10px] font-black uppercase text-muted-foreground tracking-widest">From Location*</Label>
                 <Select value={newRecord.location} onValueChange={(val: any) => setNewRecord({ ...newRecord, location: val })}>
                    <SelectTrigger className="w-full apple-glass-input text-right h-12 rounded-2xl font-bold">
                       <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="apple-glass-dialog border border-white/20 text-foreground">
                       <SelectItem value="shop" className="text-right">Shop Stock</SelectItem>
                       <SelectItem value="godown" className="text-right">Godown Stock</SelectItem>
                    </SelectContent>
                 </Select>
               </div>
            </div>

            <div className="space-y-1.5">
               <Label className="text-right block text-[10px] font-black uppercase text-muted-foreground tracking-widest">Additional Notes</Label>
               <Input 
                 value={newRecord.notes} 
                 onChange={(e) => setNewRecord({ ...newRecord, notes: e.target.value })} 
                 className="text-right h-12 apple-glass-input rounded-2xl"
                 placeholder="Enter details..."
               />
            </div>
          </div>
          <DialogFooter className="gap-2.5 pt-3 border-t border-white/10 flex flex-row">
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} className="flex-1 h-11 border-white/20 dark:border-white/10 hover:bg-white/10 text-foreground font-bold text-xs rounded-2xl">
              CANCEL
            </Button>
            <Button onClick={handleAddRecord} className="flex-1 h-11 bg-red-600 hover:bg-red-500 font-black text-white text-xs rounded-2xl shadow-lg shadow-red-600/25 uppercase">
              RECORD LOSS
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ShrinkageReport;
