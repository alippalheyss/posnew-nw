"use client";

import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Wallet, Zap, Landmark, Truck, Trash2, PlusCircle, Search, 
  Download, FileSpreadsheet, Printer, PencilLine, Trash, 
  Calendar as CalendarIcon, DollarSign, Receipt, Filter, 
  CheckCircle2, ArrowRightLeft, Clock, HelpCircle, FileText
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useAppContext, Expense, ExpenseCategory } from '@/context/AppContext';
import { formatDate, formatTime, formatDateTime, toISODate, extractDateOnly } from '@/utils/formatters';
import { showSuccess, showError } from '@/utils/toast';
import { printContent } from '@/utils/printHelper';
import type { DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const CATEGORY_CONFIG: Record<ExpenseCategory, {
  label_dv: string;
  label_en: string;
  icon: any;
  colorClass: string;
  badgeBg: string;
  borderColor: string;
}> = {
  electricity: {
    label_dv: "ކަރަންޓު",
    label_en: "Electricity",
    icon: Zap,
    colorClass: "text-amber-500",
    badgeBg: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    borderColor: "hover:border-amber-500/40"
  },
  zakat_al_mal: {
    label_dv: "ޒަކާތުލް މާލް",
    label_en: "Zakat al-Mal",
    icon: Landmark,
    colorClass: "text-emerald-500",
    badgeBg: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    borderColor: "hover:border-emerald-500/40"
  },
  naalu: {
    label_dv: "ނާލު (ދަތުރުފަތުރު)",
    label_en: "Naalu (Freight & Cargo)",
    icon: Truck,
    colorClass: "text-blue-500",
    badgeBg: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    borderColor: "hover:border-blue-500/40"
  },
  disposal_charge: {
    label_dv: "ކުނި އުކާލުމުގެ ޚަރަދު",
    label_en: "Disposal Charge",
    icon: Trash2,
    colorClass: "text-purple-500",
    badgeBg: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    borderColor: "hover:border-purple-500/40"
  },
  other: {
    label_dv: "އެހެނިހެން ޚަރަދު",
    label_en: "Other Expense",
    icon: Receipt,
    colorClass: "text-slate-400",
    badgeBg: "bg-muted text-muted-foreground border-border",
    borderColor: "hover:border-primary/40"
  }
};

const Expenses: React.FC = () => {
  const { t } = useTranslation();
  const { expenses, addExpense, updateExpense, deleteExpense, settings } = useAppContext();

  // Filter states
  const [selectedCategory, setSelectedCategory] = useState<ExpenseCategory | 'all'>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'this_month' | 'this_year' | 'custom'>('this_month');
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(),
    to: new Date()
  });
  const [searchTerm, setSearchTerm] = useState('');

  // Dialog states
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    category: 'electricity' as ExpenseCategory,
    date: toISODate(),
    title: '',
    amount: '',
    paymentMethod: 'cash' as 'cash' | 'card' | 'transfer' | 'other',
    referenceNumber: '',
    notes: '',
    recordedBy: 'Staff'
  });

  const resetForm = () => {
    setFormData({
      category: 'electricity',
      date: toISODate(),
      title: '',
      amount: '',
      paymentMethod: 'cash',
      referenceNumber: '',
      notes: '',
      recordedBy: 'Staff'
    });
  };

  const handleOpenAddDialog = (defaultCategory?: ExpenseCategory) => {
    resetForm();
    if (defaultCategory) {
      setFormData(prev => ({ ...prev, category: defaultCategory }));
    }
    setIsAddDialogOpen(true);
  };

  const handleOpenEditDialog = (expense: Expense) => {
    setSelectedExpense(expense);
    setFormData({
      category: expense.category,
      date: expense.date,
      title: expense.title,
      amount: String(expense.amount),
      paymentMethod: expense.paymentMethod,
      referenceNumber: expense.referenceNumber || '',
      notes: expense.notes || '',
      recordedBy: expense.recordedBy || 'Staff'
    });
    setIsEditDialogOpen(true);
  };

  const handleOpenDeleteDialog = (expense: Expense) => {
    setSelectedExpense(expense);
    setIsDeleteDialogOpen(true);
  };

  const handleSaveAdd = async () => {
    const numAmount = parseFloat(formData.amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      showError('Please enter a valid expense amount');
      return;
    }
    if (!formData.title.trim()) {
      showError('Please enter a description or title for the expense');
      return;
    }

    const newExpense: Expense = {
      id: `exp-${Date.now()}`,
      date: formData.date || toISODate(),
      category: formData.category,
      title: formData.title.trim(),
      amount: numAmount,
      paymentMethod: formData.paymentMethod,
      referenceNumber: formData.referenceNumber.trim() || undefined,
      notes: formData.notes.trim() || undefined,
      recordedBy: formData.recordedBy.trim() || 'Staff',
      createdAt: new Date().toISOString()
    };

    await addExpense(newExpense);
    setIsAddDialogOpen(false);
    resetForm();
  };

  const handleSaveEdit = async () => {
    if (!selectedExpense) return;
    const numAmount = parseFloat(formData.amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      showError('Please enter a valid expense amount');
      return;
    }
    if (!formData.title.trim()) {
      showError('Please enter a description or title for the expense');
      return;
    }

    const updated: Expense = {
      ...selectedExpense,
      date: formData.date || selectedExpense.date,
      category: formData.category,
      title: formData.title.trim(),
      amount: numAmount,
      paymentMethod: formData.paymentMethod,
      referenceNumber: formData.referenceNumber.trim() || undefined,
      notes: formData.notes.trim() || undefined,
      recordedBy: formData.recordedBy.trim() || selectedExpense.recordedBy
    };

    await updateExpense(updated);
    setIsEditDialogOpen(false);
    setSelectedExpense(null);
    resetForm();
  };

  const handleConfirmDelete = async () => {
    if (!selectedExpense) return;
    await deleteExpense(selectedExpense.id);
    setIsDeleteDialogOpen(false);
    setSelectedExpense(null);
  };

  // Date filtering logic
  const filteredByDate = useMemo(() => {
    const now = new Date();
    const todayY = now.getFullYear();
    const todayM = now.getMonth();
    const todayD = now.getDate();

    return expenses.filter(exp => {
      if (!exp.date) return false;
      const pureDate = extractDateOnly(exp.date);
      const d = new Date(pureDate);
      const dY = d.getFullYear();
      const dM = d.getMonth();
      const dD = d.getDate();

      if (dateFilter === 'today') {
        return dY === todayY && dM === todayM && dD === todayD;
      }
      if (dateFilter === 'this_month') {
        return dY === todayY && dM === todayM;
      }
      if (dateFilter === 'this_year') {
        return dY === todayY;
      }
      if (dateFilter === 'custom' && dateRange?.from) {
        const from = new Date(dateRange.from);
        from.setHours(0, 0, 0, 0);
        const to = dateRange.to ? new Date(dateRange.to) : new Date(dateRange.from);
        to.setHours(23, 59, 59, 999);
        const expTime = d.getTime();
        return expTime >= from.getTime() && expTime <= to.getTime();
      }
      return true; // 'all'
    });
  }, [expenses, dateFilter, dateRange]);

  // Combined search & category filtered expenses
  const filteredExpenses = useMemo(() => {
    return filteredByDate.filter(exp => {
      const matchCategory = selectedCategory === 'all' || exp.category === selectedCategory;
      const term = searchTerm.toLowerCase();
      const matchSearch = !term ||
        exp.title.toLowerCase().includes(term) ||
        (exp.referenceNumber && exp.referenceNumber.toLowerCase().includes(term)) ||
        (exp.notes && exp.notes.toLowerCase().includes(term)) ||
        CATEGORY_CONFIG[exp.category]?.label_en.toLowerCase().includes(term) ||
        CATEGORY_CONFIG[exp.category]?.label_dv.includes(term);

      return matchCategory && matchSearch;
    });
  }, [filteredByDate, selectedCategory, searchTerm]);

  // Category totals for metrics
  const totalExpensesAmount = useMemo(() => {
    return filteredByDate.reduce((sum, e) => sum + e.amount, 0);
  }, [filteredByDate]);

  const categoryTotals = useMemo(() => {
    const totals: Record<ExpenseCategory, { amount: number; count: number }> = {
      electricity: { amount: 0, count: 0 },
      zakat_al_mal: { amount: 0, count: 0 },
      naalu: { amount: 0, count: 0 },
      disposal_charge: { amount: 0, count: 0 },
      other: { amount: 0, count: 0 }
    };

    filteredByDate.forEach(exp => {
      if (totals[exp.category]) {
        totals[exp.category].amount += exp.amount;
        totals[exp.category].count += 1;
      }
    });

    return totals;
  }, [filteredByDate]);

  const getDateFilterLabel = () => {
    if (dateFilter === 'today') return 'Today';
    if (dateFilter === 'this_month') return 'This Month';
    if (dateFilter === 'this_year') return 'This Year';
    if (dateFilter === 'all') return 'All Time';
    if (dateFilter === 'custom' && dateRange?.from) {
      if (dateRange.to && format(dateRange.from, 'yyyy-MM-dd') !== format(dateRange.to, 'yyyy-MM-dd')) {
        return `${format(dateRange.from, 'dd/MM/yyyy')} - ${format(dateRange.to, 'dd/MM/yyyy')}`;
      }
      return format(dateRange.from, 'dd/MM/yyyy');
    }
    return 'Custom Range';
  };

  // Excel export
  const handleDownloadExcel = () => {
    const currency = settings.shop.currency;
    const filterLabel = getDateFilterLabel();
    const catLabel = selectedCategory === 'all' ? 'All Categories' : CATEGORY_CONFIG[selectedCategory]?.label_en;

    const data: any[][] = [
      [settings.shop.shopName],
      ["Expenses Report"],
      ["Generated At", formatDateTime(new Date())],
      ["Period / Filter", filterLabel],
      ["Category Filter", catLabel],
      ["Search Term", searchTerm || "None"],
      [],
      ["--- Category Summary ---"],
      ["Category", "Records", `Total Amount (${currency})`],
      ["Electricity", categoryTotals.electricity.count, Number(categoryTotals.electricity.amount.toFixed(2))],
      ["Zakat al-Mal", categoryTotals.zakat_al_mal.count, Number(categoryTotals.zakat_al_mal.amount.toFixed(2))],
      ["Naalu (Freight & Cargo)", categoryTotals.naalu.count, Number(categoryTotals.naalu.amount.toFixed(2))],
      ["Disposal Charge", categoryTotals.disposal_charge.count, Number(categoryTotals.disposal_charge.amount.toFixed(2))],
      ["Other Expenses", categoryTotals.other.count, Number(categoryTotals.other.amount.toFixed(2))],
      ["TOTAL EXPENSES", filteredByDate.length, Number(totalExpensesAmount.toFixed(2))],
      [],
      ["--- Detailed Expense Entries ---"],
      [
        "Expense ID",
        "Date",
        "Category (EN)",
        "Category (DV)",
        "Title / Description",
        "Reference / Bill #",
        "Payment Method",
        `Amount (${currency})`,
        "Recorded By",
        "Notes"
      ]
    ];

    filteredExpenses.forEach(exp => {
      const config = CATEGORY_CONFIG[exp.category];
      data.push([
        exp.id,
        formatDate(exp.date),
        config?.label_en || exp.category,
        config?.label_dv || exp.category,
        exp.title,
        exp.referenceNumber || '-',
        exp.paymentMethod.toUpperCase(),
        Number(exp.amount.toFixed(2)),
        exp.recordedBy || 'Staff',
        exp.notes || '-'
      ]);
    });

    data.push([
      "TOTAL",
      "",
      "",
      "",
      "",
      "",
      "",
      Number(filteredExpenses.reduce((s, e) => s + e.amount, 0).toFixed(2)),
      "",
      ""
    ]);

    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [
      { wch: 16 },
      { wch: 14 },
      { wch: 22 },
      { wch: 22 },
      { wch: 35 },
      { wch: 18 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 30 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Expenses");

    const safeFilter = dateFilter === 'custom' && dateRange?.from
      ? `custom_${format(dateRange.from, 'yyyyMMdd')}`
      : dateFilter;

    XLSX.writeFile(wb, `Expenses_${safeFilter}_${new Date().toISOString().split('T')[0]}.xlsx`);
    showSuccess('Expenses Excel report downloaded successfully');
  };

  // PDF export
  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    const currency = settings.shop.currency;

    doc.setFontSize(20);
    doc.text('Expenses Report', 14, 22);

    doc.setFontSize(11);
    doc.text(`Period: ${getDateFilterLabel().toUpperCase()}`, 14, 30);
    doc.text(`Total Expenses: ${currency} ${totalExpensesAmount.toFixed(2)}`, 14, 36);
    doc.text(`Category: ${selectedCategory === 'all' ? 'ALL CATEGORIES' : CATEGORY_CONFIG[selectedCategory]?.label_en.toUpperCase()}`, 14, 42);

    const tableColumn = ["Date", "Category", "Description", "Ref #", "Method", "Amount"];
    const tableRows: any[] = [];

    filteredExpenses.forEach(exp => {
      tableRows.push([
        formatDate(exp.date),
        CATEGORY_CONFIG[exp.category]?.label_en || exp.category,
        exp.title,
        exp.referenceNumber || '-',
        exp.paymentMethod.toUpperCase(),
        `${currency} ${exp.amount.toFixed(2)}`
      ]);
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 50,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [220, 38, 38] }
    });

    doc.save(`expenses-report-${dateFilter}.pdf`);
  };

  // Print single payment voucher
  const handlePrintVoucher = (expense: Expense) => {
    const currency = settings.shop.currency;
    const cat = CATEGORY_CONFIG[expense.category];

    const htmlContent = `
      <html>
        <head>
          <title>Expense Voucher ${expense.id}</title>
          <style>
            body { font-family: sans-serif; padding: 25px; color: #111; text-align: right; direction: rtl; }
            .header { text-align: center; border-bottom: 2px solid #ddd; padding-bottom: 15px; margin-bottom: 20px; }
            .shop-name { font-size: 18px; font-weight: bold; margin-bottom: 4px; }
            .voucher-title { font-size: 14px; font-weight: bold; color: #555; text-transform: uppercase; letter-spacing: 1px; }
            .grid { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 13px; }
            .label { color: #666; font-weight: bold; }
            .value { font-weight: bold; }
            .amount-box { border: 2px solid #222; border-radius: 8px; padding: 12px; text-align: center; margin: 20px 0; background: #fafafa; }
            .amount-label { font-size: 11px; text-transform: uppercase; color: #666; margin-bottom: 4px; }
            .amount-value { font-size: 22px; font-weight: bold; }
            .signatures { display: flex; justify-content: space-between; margin-top: 50px; padding-top: 10px; font-size: 12px; }
            .sig-line { border-top: 1px solid #333; width: 140px; text-align: center; padding-top: 5px; }
            .footer { font-size: 10px; color: #888; text-align: center; margin-top: 25px; }
            @media print { body { padding: 15px; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="shop-name">${settings.shop.shopName}</div>
            <div class="voucher-title">Payment Voucher / ޚަރަދު ވައުޗަރ</div>
            <div style="font-size: 11px; color: #666; margin-top: 5px;">${settings.shop.shopAddress} | Tel: ${settings.shop.shopPhone}</div>
          </div>

          <div class="grid">
            <div><span class="label">ތާރީޚް / Date:</span> <span class="value">${formatDate(expense.date)}</span></div>
            <div><span class="label">ވައުޗަރ ނަންބަރު:</span> <span class="value">${expense.id}</span></div>
          </div>

          <div class="grid">
            <div><span class="label">ޚަރަދުގެ ބާވަތް / Category:</span> <span class="value">${cat?.label_dv} (${cat?.label_en})</span></div>
            <div><span class="label">ދެއްކި ގޮތް / Method:</span> <span class="value">${expense.paymentMethod.toUpperCase()}</span></div>
          </div>

          ${expense.referenceNumber ? `
            <div class="grid">
              <div><span class="label">ބިލް / ރިފަރެންސް ނަންބަރު:</span> <span class="value">${expense.referenceNumber}</span></div>
              <div></div>
            </div>
          ` : ''}

          <div class="grid" style="margin-top: 10px;">
            <div><span class="label">ތަފްސީލް / Description:</span> <span class="value">${expense.title}</span></div>
          </div>

          ${expense.notes ? `
            <div class="grid" style="margin-top: 6px;">
              <div><span class="label">ނޯޓް / Remarks:</span> <span class="value">${expense.notes}</span></div>
            </div>
          ` : ''}

          <div class="amount-box">
            <div class="amount-label">ޖުމްލަ ޚަރަދުވި އަދަދު / Total Amount Paid</div>
            <div class="amount-value">${currency} ${expense.amount.toFixed(2)}</div>
          </div>

          <div class="signatures">
            <div class="sig-line">ފައިސާ ހަވާލުކުރި ފަރާތް<br/>Paid By: ${expense.recordedBy || 'Staff'}</div>
            <div class="sig-line">ފައިސާ ލިބުނު ފަރާތް<br/>Received By</div>
            <div class="sig-line">ހުއްދަ ދިން ފަރާތް<br/>Authorized By</div>
          </div>

          <div class="footer">
            Printed on ${formatDateTime(new Date())} - System Generated Voucher
          </div>
        </body>
      </html>
    `;

    printContent(htmlContent, settings);
  };

  const renderBoth = (key: string, options?: any) => (
    <>
      {t(key, options)} ({t(key, { ...options, lng: 'en' })})
    </>
  );

  return (
    <div className="p-6 font-faruma flex flex-col h-full bg-background text-foreground overflow-hidden" dir="rtl">
      {/* Header Section */}
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <div className="text-right">
          <h1 className="text-3xl font-black text-foreground flex items-center justify-end gap-3">
            {renderBoth('expenses')} <Wallet className="h-8 w-8 text-primary" />
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Record and monitor operational expenses (Electricity, Zakat al-Mal, Naalu freight, Disposal charges)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={() => handleOpenAddDialog()}
            className="gap-2 bg-primary hover:bg-primary/90 h-11 px-6 rounded-2xl font-black shadow-[0_0_25px_rgba(0,132,255,0.35)]"
          >
            <PlusCircle className="h-4 w-4" />
            {t('record_expense') || 'Record Expense'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadExcel}
            className="bg-muted border-border hover:bg-emerald-500/10 hover:border-emerald-500/30 hover:text-emerald-500 text-foreground gap-2 h-11 px-4 rounded-2xl text-xs font-bold transition-all"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
            Excel
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadPDF}
            className="bg-muted border-border hover:bg-primary/10 hover:border-primary/30 hover:text-primary text-foreground gap-2 h-11 px-4 rounded-2xl text-xs font-bold transition-all"
          >
            <Download className="h-4 w-4 text-primary" />
            PDF
          </Button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {/* Total Expenses */}
        <Card className="bg-card border-border rounded-3xl p-5 relative overflow-hidden group shadow-lg">
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full -mr-12 -mt-12 blur-2xl group-hover:bg-primary/20 transition-all" />
          <div className="flex justify-between items-center mb-3">
            <Wallet className="h-5 w-5 text-primary" />
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Total Expenses</span>
          </div>
          <p className="text-2xl font-black text-foreground">
            {settings.shop.currency} {totalExpensesAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-muted-foreground/60 mt-1 font-bold uppercase tracking-widest">
            {filteredByDate.length} TRANSACTIONS ({getDateFilterLabel().toUpperCase()})
          </p>
        </Card>

        {/* Electricity Card */}
        <Card 
          onClick={() => setSelectedCategory(selectedCategory === 'electricity' ? 'all' : 'electricity')}
          className={cn(
            "bg-card border-border rounded-3xl p-5 relative overflow-hidden group cursor-pointer transition-all shadow-lg",
            selectedCategory === 'electricity' ? "border-amber-500/60 ring-2 ring-amber-500/20" : "hover:border-amber-500/40"
          )}
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full -mr-12 -mt-12 blur-2xl group-hover:bg-amber-500/20 transition-all" />
          <div className="flex justify-between items-center mb-3">
            <Zap className="h-5 w-5 text-amber-500" />
            <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">ކަރަންޓު / Electricity</span>
          </div>
          <p className="text-2xl font-black text-foreground">
            {settings.shop.currency} {categoryTotals.electricity.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
          <div className="flex items-center justify-between mt-1">
            <span className="text-[10px] text-muted-foreground/60 font-bold uppercase tracking-widest">
              {categoryTotals.electricity.count} BILLS
            </span>
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={(e) => { e.stopPropagation(); handleOpenAddDialog('electricity'); }} 
              className="h-6 px-2 text-[10px] text-amber-500 hover:bg-amber-500/10 font-bold"
            >
              + Record
            </Button>
          </div>
        </Card>

        {/* Zakat al-Mal Card */}
        <Card 
          onClick={() => setSelectedCategory(selectedCategory === 'zakat_al_mal' ? 'all' : 'zakat_al_mal')}
          className={cn(
            "bg-card border-border rounded-3xl p-5 relative overflow-hidden group cursor-pointer transition-all shadow-lg",
            selectedCategory === 'zakat_al_mal' ? "border-emerald-500/60 ring-2 ring-emerald-500/20" : "hover:border-emerald-500/40"
          )}
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full -mr-12 -mt-12 blur-2xl group-hover:bg-emerald-500/20 transition-all" />
          <div className="flex justify-between items-center mb-3">
            <Landmark className="h-5 w-5 text-emerald-500" />
            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">ޒަކާތް / Zakat al-Mal</span>
          </div>
          <p className="text-2xl font-black text-foreground">
            {settings.shop.currency} {categoryTotals.zakat_al_mal.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
          <div className="flex items-center justify-between mt-1">
            <span className="text-[10px] text-muted-foreground/60 font-bold uppercase tracking-widest">
              {categoryTotals.zakat_al_mal.count} RECORDS
            </span>
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={(e) => { e.stopPropagation(); handleOpenAddDialog('zakat_al_mal'); }} 
              className="h-6 px-2 text-[10px] text-emerald-500 hover:bg-emerald-500/10 font-bold"
            >
              + Record
            </Button>
          </div>
        </Card>

        {/* Naalu Card */}
        <Card 
          onClick={() => setSelectedCategory(selectedCategory === 'naalu' ? 'all' : 'naalu')}
          className={cn(
            "bg-card border-border rounded-3xl p-5 relative overflow-hidden group cursor-pointer transition-all shadow-lg",
            selectedCategory === 'naalu' ? "border-blue-500/60 ring-2 ring-blue-500/20" : "hover:border-blue-500/40"
          )}
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full -mr-12 -mt-12 blur-2xl group-hover:bg-blue-500/20 transition-all" />
          <div className="flex justify-between items-center mb-3">
            <Truck className="h-5 w-5 text-blue-500" />
            <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">ނާލު / Freight (Naalu)</span>
          </div>
          <p className="text-2xl font-black text-foreground">
            {settings.shop.currency} {categoryTotals.naalu.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
          <div className="flex items-center justify-between mt-1">
            <span className="text-[10px] text-muted-foreground/60 font-bold uppercase tracking-widest">
              {categoryTotals.naalu.count} SHIPMENTS
            </span>
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={(e) => { e.stopPropagation(); handleOpenAddDialog('naalu'); }} 
              className="h-6 px-2 text-[10px] text-blue-500 hover:bg-blue-500/10 font-bold"
            >
              + Record
            </Button>
          </div>
        </Card>

        {/* Disposal Charge Card */}
        <Card 
          onClick={() => setSelectedCategory(selectedCategory === 'disposal_charge' ? 'all' : 'disposal_charge')}
          className={cn(
            "bg-card border-border rounded-3xl p-5 relative overflow-hidden group cursor-pointer transition-all shadow-lg",
            selectedCategory === 'disposal_charge' ? "border-purple-500/60 ring-2 ring-purple-500/20" : "hover:border-purple-500/40"
          )}
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full -mr-12 -mt-12 blur-2xl group-hover:bg-purple-500/20 transition-all" />
          <div className="flex justify-between items-center mb-3">
            <Trash2 className="h-5 w-5 text-purple-500" />
            <span className="text-[10px] font-black text-purple-500 uppercase tracking-widest">ކުނި / Disposal Charge</span>
          </div>
          <p className="text-2xl font-black text-foreground">
            {settings.shop.currency} {categoryTotals.disposal_charge.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
          <div className="flex items-center justify-between mt-1">
            <span className="text-[10px] text-muted-foreground/60 font-bold uppercase tracking-widest">
              {categoryTotals.disposal_charge.count} PAYMENTS
            </span>
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={(e) => { e.stopPropagation(); handleOpenAddDialog('disposal_charge'); }} 
              className="h-6 px-2 text-[10px] text-purple-500 hover:bg-purple-500/10 font-bold"
            >
              + Record
            </Button>
          </div>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-1.5 bg-muted p-1.5 rounded-2xl border border-border">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedCategory('all')}
            className={cn(
              "px-3 h-8 rounded-xl text-[11px] font-black transition-all",
              selectedCategory === 'all' ? "bg-primary text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            All Categories ({filteredByDate.length})
          </Button>

          {(['electricity', 'zakat_al_mal', 'naalu', 'disposal_charge', 'other'] as ExpenseCategory[]).map(catKey => {
            const config = CATEGORY_CONFIG[catKey];
            const Icon = config.icon;
            const count = categoryTotals[catKey].count;
            const isSelected = selectedCategory === catKey;

            return (
              <Button
                key={catKey}
                variant="ghost"
                size="sm"
                onClick={() => setSelectedCategory(catKey)}
                className={cn(
                  "px-3 h-8 rounded-xl text-[11px] font-black flex items-center gap-1.5 transition-all",
                  isSelected 
                    ? "bg-card text-foreground shadow-sm border border-border" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className={cn("h-3.5 w-3.5", config.colorClass)} />
                <span>{config.label_dv}</span>
                <span className="opacity-50 text-[10px]">({count})</span>
              </Button>
            );
          })}
        </div>

        {/* Date Filter & Search */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Date Selector */}
          <div className="bg-muted p-1 rounded-2xl border border-border flex items-center gap-1">
            {(['today', 'this_month', 'this_year', 'all'] as const).map(filter => (
              <Button
                key={filter}
                variant="ghost"
                size="sm"
                onClick={() => setDateFilter(filter)}
                className={cn(
                  "px-3 h-8 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all",
                  dateFilter === filter ? "bg-primary text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {filter === 'this_month' ? 'This Month' : filter === 'this_year' ? 'This Year' : filter}
              </Button>
            ))}

            {/* Custom Range Popover */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDateFilter('custom')}
                  className={cn(
                    "px-3 h-8 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all",
                    dateFilter === 'custom' ? "bg-primary text-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <CalendarIcon className="h-3.5 w-3.5" />
                  <span>{dateFilter === 'custom' && dateRange?.from ? getDateFilterLabel() : 'Custom Range'}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-card border-border text-foreground" align="end">
                <Calendar
                  mode="range"
                  selected={dateRange}
                  onSelect={range => {
                    setDateRange(range);
                    if (range?.from) {
                      setDateFilter('custom');
                    }
                  }}
                  numberOfMonths={2}
                  initialFocus
                  className="font-faruma"
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative mb-6">
        <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
        <Input
          placeholder="Search expenses by title, bill/ref number, category, or remarks..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full bg-muted border-border rounded-2xl pr-12 h-12 text-right font-bold focus:border-primary/50 transition-all"
        />
      </div>

      {/* Expense Entries List */}
      <ScrollArea className="flex-1 custom-scrollbar">
        <div className="space-y-3 pb-8">
          {filteredExpenses.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-muted-foreground/50 uppercase tracking-[0.2em] font-black">
              <Receipt className="h-16 w-16 mb-4 opacity-10" />
              <p>No expense records found for this period</p>
              <Button 
                onClick={() => handleOpenAddDialog(selectedCategory !== 'all' ? selectedCategory : undefined)}
                variant="outline"
                className="mt-4 gap-2 border-border text-xs rounded-xl"
              >
                <PlusCircle className="h-4 w-4" /> Record New Expense
              </Button>
            </div>
          ) : (
            filteredExpenses.map(expense => {
              const config = CATEGORY_CONFIG[expense.category] || CATEGORY_CONFIG.other;
              const Icon = config.icon;

              return (
                <Card
                  key={expense.id}
                  className={cn(
                    "bg-card border-border transition-all rounded-3xl p-5 group shadow-sm",
                    config.borderColor
                  )}
                >
                  <div className="flex items-center justify-between gap-6">
                    {/* Right info (Title, Category, Date) */}
                    <div className="flex items-center gap-5">
                      <div className={cn(
                        "h-12 w-12 rounded-2xl flex items-center justify-center border transition-transform group-hover:scale-110",
                        config.badgeBg
                      )}>
                        <Icon className="h-6 w-6" />
                      </div>

                      <div className="text-right">
                        <div className="flex items-center justify-end gap-2.5 mb-1">
                          <span className="text-base font-black text-foreground group-hover:text-primary transition-colors">
                            {expense.title}
                          </span>
                          <Badge className={cn("text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 border", config.badgeBg)}>
                            {config.label_dv}
                          </Badge>
                          <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground border-border">
                            {expense.paymentMethod}
                          </Badge>
                        </div>

                        <div className="flex items-center justify-end gap-3 text-xs text-muted-foreground font-bold">
                          <span>{formatDate(expense.date)}</span>
                          {expense.referenceNumber && (
                            <>
                              <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />
                              <span className="text-foreground/80">Ref: {expense.referenceNumber}</span>
                            </>
                          )}
                          {expense.notes && (
                            <>
                              <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />
                              <span className="truncate max-w-[200px] text-muted-foreground/70">{expense.notes}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Middle details */}
                    <div className="hidden md:flex items-center gap-6 text-muted-foreground">
                      <div className="flex flex-col items-center">
                        <Clock className="h-3.5 w-3.5 mb-1 text-muted-foreground/60" />
                        <span className="text-[9px] font-black uppercase tracking-wider">{expense.recordedBy || 'Staff'}</span>
                      </div>
                    </div>

                    {/* Left amount and action buttons */}
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-0.5">Amount</p>
                        <p className="text-2xl font-black text-red-500">
                          {settings.shop.currency} {expense.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handlePrintVoucher(expense)}
                          title="Print Payment Voucher"
                          className="h-10 w-10 rounded-xl bg-muted border border-border hover:bg-primary hover:text-foreground transition-all text-muted-foreground"
                        >
                          <Printer className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEditDialog(expense)}
                          title="Edit Expense"
                          className="h-10 w-10 rounded-xl bg-muted border border-border hover:bg-blue-500 hover:text-foreground transition-all text-muted-foreground"
                        >
                          <PencilLine className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDeleteDialog(expense)}
                          title="Delete Expense"
                          className="h-10 w-10 rounded-xl bg-muted border border-border hover:bg-red-500 hover:text-foreground transition-all text-muted-foreground"
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* Add Expense Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[550px] bg-card border-border text-foreground font-faruma" dir="rtl">
          <DialogHeader className="text-right">
            <DialogTitle className="text-xl font-black flex items-center justify-end gap-2 text-primary">
              <PlusCircle className="h-5 w-5" /> {t('record_expense') || 'Record Operational Expense'}
            </DialogTitle>
            <DialogDescription className="text-right text-xs text-muted-foreground">
              Record electricity bills, zakat al mal disbursements, boat naalu (freight), disposal charges, and other overheads.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            {/* Category selection */}
            <div>
              <Label className="text-xs font-bold mb-1.5 block text-right">ޚަރަދުގެ ބާވަތް (Expense Category)</Label>
              <Select
                value={formData.category}
                onValueChange={(val: ExpenseCategory) => setFormData(prev => ({ ...prev, category: val }))}
              >
                <SelectTrigger className="w-full bg-muted border-border rounded-xl h-11 text-right font-bold">
                  <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border text-foreground font-faruma" align="end">
                  {(['electricity', 'zakat_al_mal', 'naalu', 'disposal_charge', 'other'] as ExpenseCategory[]).map(catKey => {
                    const cfg = CATEGORY_CONFIG[catKey];
                    const Icon = cfg.icon;
                    return (
                      <SelectItem key={catKey} value={catKey} className="text-right">
                        <div className="flex items-center gap-2">
                          <Icon className={cn("h-4 w-4", cfg.colorClass)} />
                          <span>{cfg.label_dv} ({cfg.label_en})</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Description / Title */}
            <div>
              <Label className="text-xs font-bold mb-1.5 block text-right">ތަފްސީލް / ނަން (Title / Description) *</Label>
              <Input
                placeholder="e.g. STELCO Electricity Bill, Boat Naalu, WAMCO Waste Disposal..."
                value={formData.title}
                onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="bg-muted border-border rounded-xl h-11 text-right font-bold"
              />
            </div>

            {/* Amount & Date in 2 columns */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold mb-1.5 block text-right">ޚަރަދުވި އަދަދު (Amount in {settings.shop.currency}) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={e => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                  className="bg-muted border-border rounded-xl h-11 text-right font-black text-lg"
                />
              </div>

              <div>
                <Label className="text-xs font-bold mb-1.5 block text-right">ތާރީޚް (Date)</Label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={e => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  className="bg-muted border-border rounded-xl h-11 text-right font-bold"
                />
              </div>
            </div>

            {/* Payment Method & Reference # */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold mb-1.5 block text-right">ދެއްކި ގޮތް (Payment Method)</Label>
                <Select
                  value={formData.paymentMethod}
                  onValueChange={(val: any) => setFormData(prev => ({ ...prev, paymentMethod: val }))}
                >
                  <SelectTrigger className="w-full bg-muted border-border rounded-xl h-11 text-right font-bold">
                    <SelectValue placeholder="Payment Method" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border text-foreground font-faruma" align="end">
                    <SelectItem value="cash" className="text-right">Cash (ފައިސާ)</SelectItem>
                    <SelectItem value="transfer" className="text-right">Bank Transfer (ޓްރާންސްފަރ)</SelectItem>
                    <SelectItem value="card" className="text-right">Card (ކާޑު)</SelectItem>
                    <SelectItem value="other" className="text-right">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-bold mb-1.5 block text-right">ބިލް / ރިފަރެންސް ނަންބަރު (Bill / Ref #)</Label>
                <Input
                  placeholder="Optional bill or invoice no."
                  value={formData.referenceNumber}
                  onChange={e => setFormData(prev => ({ ...prev, referenceNumber: e.target.value }))}
                  className="bg-muted border-border rounded-xl h-11 text-right font-bold"
                />
              </div>
            </div>

            {/* Remarks / Notes */}
            <div>
              <Label className="text-xs font-bold mb-1.5 block text-right">ނޯޓް / އިތުރު މަޢުލޫމާތު (Notes / Remarks)</Label>
              <Textarea
                placeholder="Additional notes, meter readings, boat name, recipient details..."
                value={formData.notes}
                onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                className="bg-muted border-border rounded-xl min-h-[70px] text-right font-medium"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={() => setIsAddDialogOpen(false)}
              className="rounded-xl h-11 px-5"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveAdd}
              className="bg-primary hover:bg-primary/90 text-foreground font-black rounded-xl h-11 px-6 shadow-md"
            >
              Save Expense
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Expense Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[550px] bg-card border-border text-foreground font-faruma" dir="rtl">
          <DialogHeader className="text-right">
            <DialogTitle className="text-xl font-black flex items-center justify-end gap-2 text-blue-500">
              <PencilLine className="h-5 w-5" /> {t('edit_expense') || 'Edit Expense Record'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div>
              <Label className="text-xs font-bold mb-1.5 block text-right">ޚަރަދުގެ ބާވަތް (Expense Category)</Label>
              <Select
                value={formData.category}
                onValueChange={(val: ExpenseCategory) => setFormData(prev => ({ ...prev, category: val }))}
              >
                <SelectTrigger className="w-full bg-muted border-border rounded-xl h-11 text-right font-bold">
                  <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border text-foreground font-faruma" align="end">
                  {(['electricity', 'zakat_al_mal', 'naalu', 'disposal_charge', 'other'] as ExpenseCategory[]).map(catKey => {
                    const cfg = CATEGORY_CONFIG[catKey];
                    const Icon = cfg.icon;
                    return (
                      <SelectItem key={catKey} value={catKey} className="text-right">
                        <div className="flex items-center gap-2">
                          <Icon className={cn("h-4 w-4", cfg.colorClass)} />
                          <span>{cfg.label_dv} ({cfg.label_en})</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-bold mb-1.5 block text-right">ތަފްސީލް / ނަން (Title / Description) *</Label>
              <Input
                value={formData.title}
                onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="bg-muted border-border rounded-xl h-11 text-right font-bold"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold mb-1.5 block text-right">ޚަރަދުވި އަދަދު (Amount) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={e => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                  className="bg-muted border-border rounded-xl h-11 text-right font-black text-lg"
                />
              </div>

              <div>
                <Label className="text-xs font-bold mb-1.5 block text-right">ތާރީޚް (Date)</Label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={e => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  className="bg-muted border-border rounded-xl h-11 text-right font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold mb-1.5 block text-right">ދެއްކި ގޮތް (Payment Method)</Label>
                <Select
                  value={formData.paymentMethod}
                  onValueChange={(val: any) => setFormData(prev => ({ ...prev, paymentMethod: val }))}
                >
                  <SelectTrigger className="w-full bg-muted border-border rounded-xl h-11 text-right font-bold">
                    <SelectValue placeholder="Payment Method" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border text-foreground font-faruma" align="end">
                    <SelectItem value="cash" className="text-right">Cash (ފައިސާ)</SelectItem>
                    <SelectItem value="transfer" className="text-right">Bank Transfer (ޓްރާންސްފަރ)</SelectItem>
                    <SelectItem value="card" className="text-right">Card (ކާޑު)</SelectItem>
                    <SelectItem value="other" className="text-right">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-bold mb-1.5 block text-right">ބިލް / ރިފަރެންސް ނަންބަރު</Label>
                <Input
                  value={formData.referenceNumber}
                  onChange={e => setFormData(prev => ({ ...prev, referenceNumber: e.target.value }))}
                  className="bg-muted border-border rounded-xl h-11 text-right font-bold"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-bold mb-1.5 block text-right">ނޯޓް / އިތުރު މަޢުލޫމާތު</Label>
              <Textarea
                value={formData.notes}
                onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                className="bg-muted border-border rounded-xl min-h-[70px] text-right font-medium"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={() => setIsEditDialogOpen(false)}
              className="rounded-xl h-11 px-5"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              className="bg-blue-600 hover:bg-blue-700 text-foreground font-black rounded-xl h-11 px-6 shadow-md"
            >
              Update Record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Expense Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[420px] bg-card border-border text-foreground font-faruma" dir="rtl">
          <DialogHeader className="text-right">
            <DialogTitle className="text-lg font-black text-red-500 flex items-center justify-end gap-2">
              <Trash className="h-5 w-5" /> ޚަރަދު ފޮހެލަންވީތަ؟
            </DialogTitle>
            <DialogDescription className="text-right text-sm text-muted-foreground mt-2">
              Are you sure you want to delete this expense record: <strong className="text-foreground">{selectedExpense?.title}</strong> ({settings.shop.currency} {selectedExpense?.amount.toFixed(2)})? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 mt-4">
            <Button
              variant="ghost"
              onClick={() => setIsDeleteDialogOpen(false)}
              className="rounded-xl h-10 px-4"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700 text-foreground font-black rounded-xl h-10 px-5"
            >
              Delete Record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Expenses;
