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
  Info
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
  
  // Local state for shrinkage records (mocked for now)
  const [records, setRecords] = useState<ShrinkageRecord[]>([]);

  // Form state
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

    // Update stock in AppContext
    const currentStock = newRecord.location === 'shop' ? selectedProduct.stock_shop : selectedProduct.stock_godown;
    if (currentStock < newRecord.qty) {
      showError(`Insufficient stock in ${newRecord.location}. Current: ${currentStock}`);
      return;
    }

    // In a real app, we'd have a specific shrinkage function in AppContext
    // For now, we manually update stock
    await updateStock(newRecord.productId, currentStock - newRecord.qty);

    setRecords([record, ...records]);
    setIsAddDialogOpen(false);
    setNewRecord({
      productId: '',
      qty: 0,
      reason: 'damaged',
      location: 'shop',
      notes: '',
      date: new Date().toISOString().split('T')[0]
    });
    showSuccess('Shrinkage recorded and stock updated');
  };

  const totalLossValue = records.reduce((sum, r) => sum + r.totalLoss, 0);

  const exportToExcel = () => {
    const data = records.map(r => ({
      Date: r.date,
      Product: r.productName,
      Quantity: r.qty,
      Reason: r.reason.toUpperCase(),
      Location: r.location.toUpperCase(),
      'Cost Price': r.costPrice,
      'Total Loss': r.totalLoss,
      Notes: r.notes
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Shrinkage Report");
    XLSX.writeFile(wb, `Shrinkage_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const filteredRecords = records.filter(r => 
    r.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.notes.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 font-faruma flex flex-col h-full bg-[#050510] text-white overflow-auto" dir="rtl">
      {/* Header */}
      <div className="flex justify-between items-center mb-8 sticky top-0 bg-[#050510]/80 backdrop-blur-md z-20 py-2 border-b border-white/5">
        <div className="text-right flex-1">
          <h1 className="text-3xl font-black text-white flex items-center justify-end gap-3">
            {renderBoth('shrinkage_report')} <FileText className="h-8 w-8 text-primary" />
          </h1>
          <p className="text-sm text-white/40 mt-1">Track stock losses due to damage, expiry, or theft</p>
        </div>
        
        <div className="flex gap-3 mr-4">
          <div className="relative w-64">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20" />
            <Input 
              placeholder="Search records..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-white/5 border-white/10 text-right pr-10"
            />
          </div>
          <Button onClick={exportToExcel} variant="outline" className="gap-2 border-white/10 hover:bg-white/5">
            <Download className="h-4 w-4" /> {renderBoth('download_report')}
          </Button>
          <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2 bg-primary hover:bg-primary/90">
            <PlusCircle className="h-4 w-4" /> {renderBoth('record_shrinkage')}
          </Button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="bg-[#0a0a1a] border-white/5 shadow-2xl overflow-hidden relative group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/10 rounded-full -mr-12 -mt-12 blur-2xl group-hover:bg-red-500/20 transition-all" />
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <TrendingDown className="h-5 w-5 text-red-500" />
              <CardTitle className="text-xs font-bold text-white/40 uppercase tracking-widest">Total Loss Value</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-white">
              {settings.shop.currency} {totalLossValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#0a0a1a] border-white/5 shadow-2xl">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <CardTitle className="text-xs font-bold text-white/40 uppercase tracking-widest">Total Incidents</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-white">{records.length}</div>
          </CardContent>
        </Card>

        <Card className="bg-[#0a0a1a] border-white/5 shadow-2xl">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <Package className="h-5 w-5 text-blue-500" />
              <CardTitle className="text-xs font-bold text-white/40 uppercase tracking-widest">Items Lost</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-white">{records.reduce((sum, r) => sum + r.qty, 0)}</div>
          </CardContent>
        </Card>

        <Card className="bg-[#0a0a1a] border-white/5 shadow-2xl">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <Calendar className="h-5 w-5 text-purple-500" />
              <CardTitle className="text-xs font-bold text-white/40 uppercase tracking-widest">This Month</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-white">
              {settings.shop.currency} {records.filter(r => new Date(r.date).getMonth() === new Date().getMonth()).reduce((sum, r) => sum + r.totalLoss, 0).toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Records Table */}
      <Card className="bg-[#0a0a1a] border-white/5 shadow-2xl flex-1 flex flex-col min-h-0">
        <CardHeader className="border-b border-white/5 flex flex-row items-center justify-between">
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" className="text-xs text-white/40 hover:text-white gap-2">
              <Filter className="h-3 w-3" /> Filter
            </Button>
          </div>
          <CardTitle className="text-lg font-black flex items-center gap-2">
             Recent Incidents <Info className="h-4 w-4 text-white/20" />
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 flex-1 overflow-hidden">
          <ScrollArea className="h-full custom-scrollbar">
            <Table dir="rtl">
              <TableHeader className="bg-white/5 sticky top-0 z-10">
                <TableRow className="border-white/5 hover:bg-transparent">
                  <TableHead className="text-right font-black text-white/40 uppercase text-[10px] tracking-widest">Date</TableHead>
                  <TableHead className="text-right font-black text-white/40 uppercase text-[10px] tracking-widest">Product</TableHead>
                  <TableHead className="text-right font-black text-white/40 uppercase text-[10px] tracking-widest">Qty</TableHead>
                  <TableHead className="text-right font-black text-white/40 uppercase text-[10px] tracking-widest">Reason</TableHead>
                  <TableHead className="text-right font-black text-white/40 uppercase text-[10px] tracking-widest">Location</TableHead>
                  <TableHead className="text-right font-black text-white/40 uppercase text-[10px] tracking-widest">Loss Value</TableHead>
                  <TableHead className="text-right font-black text-white/40 uppercase text-[10px] tracking-widest">Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-20 text-white/20 font-black uppercase tracking-[0.2em]">
                      No shrinkage records found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRecords.map((record) => (
                    <TableRow key={record.id} className="border-white/5 hover:bg-white/5 transition-colors group">
                      <TableCell className="text-right font-mono text-xs text-white/60">{record.date}</TableCell>
                      <TableCell className="text-right font-black text-white">{record.productName}</TableCell>
                      <TableCell className="text-right">
                         <Badge variant="outline" className="bg-white/5 border-white/10 text-white font-black">
                           {record.qty}
                         </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge className={cn(
                          "font-black uppercase text-[8px] tracking-widest",
                          record.reason === 'damaged' && "bg-orange-500/20 text-orange-500 border-orange-500/20",
                          record.reason === 'expired' && "bg-yellow-500/20 text-yellow-500 border-yellow-500/20",
                          record.reason === 'stolen' && "bg-red-500/20 text-red-500 border-red-500/20",
                          record.reason === 'other' && "bg-blue-500/20 text-blue-500 border-blue-500/20"
                        )}>
                          {record.reason}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">{record.location}</span>
                      </TableCell>
                      <TableCell className="text-right font-black text-red-500">
                        {settings.shop.currency} {record.totalLoss.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right text-xs text-white/40 max-w-[200px] truncate">
                        {record.notes || '-'}
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
        <DialogContent className="bg-[#0a0a1a] border-white/10 text-white font-faruma sm:max-w-[500px]" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right text-2xl font-black">Record Stock Shrinkage</DialogTitle>
            <DialogDescription className="text-right text-white/40">Enter details of stock loss for tracking and inventory adjustment.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label className="text-right block text-[10px] font-black uppercase text-white/40 tracking-widest">Select Product</Label>
              <Select value={newRecord.productId} onValueChange={(val) => setNewRecord({...newRecord, productId: val})}>
                <SelectTrigger className="bg-white/5 border-white/10 text-right h-12 rounded-xl">
                  <SelectValue placeholder="Choose a product..." />
                </SelectTrigger>
                <SelectContent className="bg-[#0a0a1a] border-white/10 text-white">
                  <div className="p-2 sticky top-0 bg-[#0a0a1a] border-b border-white/5 z-10">
                    <Input 
                      placeholder="Search products..." 
                      className="h-8 bg-white/5 border-white/10 text-right"
                      onChange={(e) => {/* Add local filtering if needed */}}
                    />
                  </div>
                  <ScrollArea className="h-[200px]">
                    {products.map(p => (
                      <SelectItem key={p.id} value={p.id} className="text-right hover:bg-white/5">
                        {p.name_en} ({p.name_dv})
                      </SelectItem>
                    ))}
                  </ScrollArea>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-right block text-[10px] font-black uppercase text-white/40 tracking-widest">Quantity</Label>
                <Input 
                  type="number" 
                  value={newRecord.qty}
                  onChange={(e) => setNewRecord({...newRecord, qty: parseFloat(e.target.value)})}
                  className="bg-white/5 border-white/10 text-right h-12 rounded-xl font-black text-lg"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-right block text-[10px] font-black uppercase text-white/40 tracking-widest">Date</Label>
                <Input 
                  type="date" 
                  value={newRecord.date}
                  onChange={(e) => setNewRecord({...newRecord, date: e.target.value})}
                  className="bg-white/5 border-white/10 text-right h-12 rounded-xl"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-right block text-[10px] font-black uppercase text-white/40 tracking-widest">Reason</Label>
                <Select value={newRecord.reason} onValueChange={(val: any) => setNewRecord({...newRecord, reason: val})}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-right h-12 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0a0a1a] border-white/10 text-white">
                    <SelectItem value="damaged" className="text-right">Damaged</SelectItem>
                    <SelectItem value="expired" className="text-right">Expired</SelectItem>
                    <SelectItem value="stolen" className="text-right">Stolen</SelectItem>
                    <SelectItem value="other" className="text-right">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-right block text-[10px] font-black uppercase text-white/40 tracking-widest">Location</Label>
                <Select value={newRecord.location} onValueChange={(val: any) => setNewRecord({...newRecord, location: val})}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-right h-12 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0a0a1a] border-white/10 text-white">
                    <SelectItem value="shop" className="text-right">Shop</SelectItem>
                    <SelectItem value="godown" className="text-right">Godown</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-right block text-[10px] font-black uppercase text-white/40 tracking-widest">Notes / Remarks</Label>
              <Input 
                value={newRecord.notes}
                onChange={(e) => setNewRecord({...newRecord, notes: e.target.value})}
                className="bg-white/5 border-white/10 text-right h-12 rounded-xl"
                placeholder="Additional details..."
              />
            </div>

            {selectedProduct && (
              <div className="p-4 bg-white/5 rounded-xl border border-white/5 space-y-2">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-red-500">{settings.shop.currency} {(selectedProduct.cost_price || 0) * newRecord.qty}</span>
                  <span className="text-white/40 uppercase tracking-widest">Estimated Loss</span>
                </div>
                <div className="flex justify-between text-xs font-bold">
                  <span className={cn(
                    (newRecord.location === 'shop' ? selectedProduct.stock_shop : selectedProduct.stock_godown) < newRecord.qty ? "text-red-500" : "text-green-500"
                  )}>
                    {newRecord.location === 'shop' ? selectedProduct.stock_shop : selectedProduct.stock_godown}
                  </span>
                  <span className="text-white/40 uppercase tracking-widest">Current Stock ({newRecord.location})</span>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-3 mt-4">
            <Button variant="ghost" onClick={() => setIsAddDialogOpen(false)} className="flex-1 border-white/5 hover:bg-white/5">Cancel</Button>
            <Button onClick={handleAddRecord} className="flex-1 bg-primary hover:bg-primary/90 font-black">Record Shrinkage</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ShrinkageReport;
