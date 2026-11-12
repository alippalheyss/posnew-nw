"use client";

import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAppContext, Sale, ReturnItem } from '@/context/AppContext';
import { usePersistedState } from '@/hooks/usePersistedState';
import { 
  TrendingUp, 
  BarChart3, 
  PieChart, 
  DollarSign, 
  Activity, 
  ShoppingBag, 
  ArrowUpRight, 
  Download, 
  FileSpreadsheet,
  Calendar,
  Eye,
  X,
  Undo2,
  CreditCard,
  Wallet,
  Layers,
  Package,
  Search,
  Receipt,
  ArrowUpDown,
  Sparkles,
  RotateCcw,
  ChevronRight,
  Hash
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDate, formatTime, formatDateTime, toISODate, extractDateOnly } from '@/utils/formatters';
import { showSuccess } from '@/utils/toast';
import * as XLSX from 'xlsx';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';

const SalesReports = () => {
  const { t } = useTranslation();
  const { sales, settings, products, processReturn } = useAppContext();

  // --- Return Sale State ---
  const [returnSale, setReturnSale] = useState<Sale | null>(null);
  const [returnQtys, setReturnQtys] = useState<Record<string, number>>({});
  const [isProcessingReturn, setIsProcessingReturn] = useState(false);

  const openReturnDialog = (sale: Sale) => {
    // Don't allow returning a return-record
    if ((sale.paymentMethod as any) === 'return' || (sale.invoiceNumber || '').startsWith('RET-')) return;
    const initial: Record<string, number> = {};
    (sale.items || []).forEach(item => { initial[item.id] = 0; });
    setReturnQtys(initial);
    setReturnSale(sale);
  };

  const handleConfirmReturn = async () => {
    if (!returnSale) return;
    const returnItems: ReturnItem[] = (returnSale.items || [])
      .filter(item => (returnQtys[item.id] || 0) > 0)
      .map(item => ({
        itemId: item.id,
        name: item.name_en || item.name_dv || (item as any).name || 'Item',
        returnQty: returnQtys[item.id],
        unitPrice: Number(item.price || 0),
      }));
    if (returnItems.length === 0) return;
    setIsProcessingReturn(true);
    try {
      await processReturn(returnSale, returnItems);
      setReturnSale(null);
    } catch (e) {
      console.error('Return failed:', e);
    } finally {
      setIsProcessingReturn(false);
    }
  };


  const num = (n: any) => Number(n) || 0;

  const calculateSalesForPeriod = (period: 'day' | 'month' | 'year') => {
    const today = new Date();
    const todayStr = toISODate(today);
    const filtered = sales.filter(sale => {
      if (!sale.date) return false;
      const saleDate = new Date(sale.date);
      if (period === 'day') {
        return extractDateOnly(sale.date) === todayStr || saleDate.toDateString() === today.toDateString();
      }
      if (period === 'month') return saleDate.getMonth() === today.getMonth() && saleDate.getFullYear() === today.getFullYear();
      if (period === 'year') return saleDate.getFullYear() === today.getFullYear();
      return false;
    });

    const total = filtered.reduce((sum, sale) => sum + (Number(sale.grandTotal) || 0), 0);
    return { total, count: filtered.length, items: filtered };
  };

  const calculateProfitForPeriod = (period: 'day' | 'month' | 'year') => {
    const filtered = calculateSalesForPeriod(period).items;

    let totalRevenue = 0;
    let totalCost = 0;

    filtered.forEach(sale => {
      (sale.items || []).forEach(item => {
        const product = products.find(p => p.id === item.id);
        if (product) {
          const revenue = Number(item.price || 0) * Number(item.qty || 0);
          const cost = Number(product.cost_price || 0) * Number(item.qty || 0);

          totalRevenue += revenue;
          totalCost += cost;
        }
      });
    });

    const grossProfit = totalRevenue - totalCost;
    const profitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

    return {
      revenue: totalRevenue,
      cost: totalCost,
      profit: grossProfit,
      margin: profitMargin
    };
  };

  const dayStats = calculateSalesForPeriod('day');
  const monthStats = calculateSalesForPeriod('month');
  const yearStats = calculateSalesForPeriod('year');

  const dayProfit = calculateProfitForPeriod('day');
  const monthProfit = calculateProfitForPeriod('month');
  const yearProfit = calculateProfitForPeriod('year');

  // --- Drill-down Detail Modal State ---
  const [activeDetailModal, setActiveDetailModal] = useState<
    'today' | 'month' | 'year' | 'cash' | 'card' | 'transfer' | 'credit' | 'profit' | 'top_products' | 'returns' | 'gst' | null
  >(null);
  const [detailSearchQuery, setDetailSearchQuery] = useState('');
  const [detailPeriodFilter, setDetailPeriodFilter] = useState<'today' | 'month' | 'all'>('today');

  // Breakdown of sales by payment method across periods
  const paymentMethodStats = useMemo(() => {
    const todayStr = toISODate(new Date());
    const todaySales = sales.filter(s => s.date && (extractDateOnly(s.date) === todayStr || new Date(s.date).toDateString() === new Date().toDateString()));
    const now = new Date();
    const thisMonthSales = sales.filter(s => {
      if (!s.date) return false;
      const d = new Date(s.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });

    const compute = (list: Sale[]) => {
      const cash = list.filter(s => (s.paymentMethod || 'cash').toLowerCase() === 'cash');
      const card = list.filter(s => (s.paymentMethod || '').toLowerCase() === 'card');
      const transfer = list.filter(s => (s.paymentMethod || '').toLowerCase() === 'transfer');
      const credit = list.filter(s => (s.paymentMethod || '').toLowerCase() === 'credit');
      const returns = list.filter(s => (s.paymentMethod as any) === 'return' || String(s.invoiceNumber || '').startsWith('RET-'));

      const sumTotal = (arr: Sale[]) => arr.reduce((acc, s) => acc + (Number(s.grandTotal) || 0), 0);

      // GST calculations
      const gstRate = Number(settings.shop.taxRate) || 8;
      let totalGstCollected = 0;
      let taxableSupplies = 0;
      let zeroRatedSupplies = 0;

      list.forEach(s => {
        if (Array.isArray(s.items) && s.items.length > 0) {
          s.items.forEach(it => {
            const line = Number(it.price || 0) * Number(it.qty || 0);
            if (it.is_zero_tax) {
              zeroRatedSupplies += line;
            } else {
              const tax = line - (line / (1 + gstRate / 100));
              totalGstCollected += tax;
              taxableSupplies += line - tax;
            }
          });
        } else {
          const grand = Number(s.grandTotal || 0);
          const tax = grand - (grand / (1 + gstRate / 100));
          totalGstCollected += tax;
          taxableSupplies += grand - tax;
        }
      });

      return {
        cash: { list: cash, count: cash.length, total: sumTotal(cash) },
        card: { list: card, count: card.length, total: sumTotal(card) },
        transfer: { list: transfer, count: transfer.length, total: sumTotal(transfer) },
        credit: { list: credit, count: credit.length, total: sumTotal(credit) },
        returns: { list: returns, count: returns.length, total: sumTotal(returns) },
        gst: { totalGst: totalGstCollected, taxable: taxableSupplies, zeroRated: zeroRatedSupplies, count: list.length, list },
      };
    };

    return {
      today: compute(todaySales),
      month: compute(thisMonthSales),
      all: compute(sales),
    };
  }, [sales, settings.shop.taxRate]);

  // Product sales ranking (Best-selling products)
  const productRanking = useMemo(() => {
    const map = new Map<string, {
      id: string;
      nameEn: string;
      nameDv: string;
      itemCode: string;
      barcode: string;
      category: string;
      price: number;
      costPrice: number;
      totalQty: number;
      totalRevenue: number;
      totalCost: number;
      totalProfit: number;
    }>();

    const targetSales = detailPeriodFilter === 'today'
      ? dayStats.items
      : detailPeriodFilter === 'month'
        ? monthStats.items
        : sales;

    targetSales.forEach(sale => {
      (sale.items || []).forEach(item => {
        const prod = products.find(p => p.id === item.id);
        const key = item.id || (prod?.id) || item.name_en || item.name_dv || 'unknown';
        const existing = map.get(key) || {
          id: key,
          nameEn: item.name_en || prod?.name_en || 'Product',
          nameDv: item.name_dv || prod?.name_dv || '',
          itemCode: prod?.item_code || '',
          barcode: prod?.barcode || '',
          category: prod?.category || 'OTHER',
          price: Number(item.price || prod?.price || 0),
          costPrice: Number(prod?.cost_price || 0),
          totalQty: 0,
          totalRevenue: 0,
          totalCost: 0,
          totalProfit: 0,
        };

        const qty = Number(item.qty || 0);
        const rev = Number(item.price || 0) * qty;
        const cst = Number(prod?.cost_price || 0) * qty;

        existing.totalQty += qty;
        existing.totalRevenue += rev;
        existing.totalCost += cst;
        existing.totalProfit += (rev - cst);

        map.set(key, existing);
      });
    });

    return Array.from(map.values()).sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [sales, dayStats.items, monthStats.items, products, detailPeriodFilter]);

  // --- Custom Report State ---
  const [customPeriodType, setCustomPeriodType] = usePersistedState<'date' | 'month' | 'quarter' | 'year'>('sales_reports_period_type', 'date');
  const [customDate, setCustomDate] = usePersistedState<string>('sales_reports_custom_date', toISODate(new Date()));
  const [customMonth, setCustomMonth] = usePersistedState<string>('sales_reports_custom_month', `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`);
  const [customQuarter, setCustomQuarter] = usePersistedState<string>('sales_reports_custom_quarter', String(Math.floor(new Date().getMonth() / 3) + 1));
  const [customYear, setCustomYear] = usePersistedState<string>('sales_reports_custom_year', String(new Date().getFullYear()));
  const [showCustomPreview, setShowCustomPreview] = usePersistedState<boolean>('sales_reports_show_preview', false);

  // Filter sales for custom period
  const customSales = useMemo(() => {
    return sales.filter(sale => {
      if (!sale.date) return false;
      const saleDate = new Date(sale.date);
      if (customPeriodType === 'date') {
        return extractDateOnly(sale.date) === customDate || saleDate.toDateString() === new Date(customDate).toDateString();
      }
      if (customPeriodType === 'month') {
        const [yr, mo] = customMonth.split('-').map(Number);
        return saleDate.getFullYear() === yr && saleDate.getMonth() === mo - 1;
      }
      if (customPeriodType === 'quarter') {
        const qNum = Number(customQuarter);
        const startMonth = (qNum - 1) * 3;
        const endMonth = startMonth + 2;
        return (
          saleDate.getFullYear() === Number(customYear) &&
          saleDate.getMonth() >= startMonth &&
          saleDate.getMonth() <= endMonth
        );
      }
      if (customPeriodType === 'year') {
        return saleDate.getFullYear() === Number(customYear);
      }
      return false;
    });
  }, [sales, customPeriodType, customDate, customMonth, customQuarter, customYear]);

  const customTotalSales = customSales.reduce((sum, s) => sum + num(s.grandTotal), 0);
  const customCashTotal = customSales.filter(s => (s.paymentMethod || 'cash').toLowerCase() === 'cash').reduce((sum, s) => sum + num(s.grandTotal), 0);
  const customCardTotal = customSales.filter(s => (s.paymentMethod || '').toLowerCase() === 'card').reduce((sum, s) => sum + num(s.grandTotal), 0);
  const customTransferTotal = customSales.filter(s => (s.paymentMethod || '').toLowerCase() === 'transfer').reduce((sum, s) => sum + num(s.grandTotal), 0);
  const customCreditTotal = customSales.filter(s => (s.paymentMethod || '').toLowerCase() === 'credit').reduce((sum, s) => sum + num(s.grandTotal), 0);

  const getCustomPeriodLabel = () => {
    if (customPeriodType === 'date') return formatDate(new Date(customDate + 'T00:00:00'));
    if (customPeriodType === 'month') {
      const [yr, mo] = customMonth.split('-').map(Number);
      return new Date(yr, mo - 1, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' });
    }
    if (customPeriodType === 'quarter') {
      const qLabels = ['Q1 (Jan - Mar)', 'Q2 (Apr - Jun)', 'Q3 (Jul - Sep)', 'Q4 (Oct - Dec)'];
      return `${qLabels[Number(customQuarter) - 1]} ${customYear}`;
    }
    return customYear;
  };

  const handleExportCustomReport = () => {
    const currency = settings.shop.currency || 'MVR';
    const gstRate = settings.shop.taxRate || 0;
    const totalSalesAmount = customTotalSales;
    const totalTaxable = customSales.reduce((sum, s) => sum + (num(s.grandTotal) / (1 + (gstRate / 100))), 0);
    const totalGst = totalSalesAmount - totalTaxable;

    let totalCost = 0;
    customSales.forEach(sale => {
      (sale.items || []).forEach(item => {
        const prod = products.find(p => p.id === item.id);
        if (prod) totalCost += num(prod.cost_price) * num(item.qty);
      });
    });
    const estProfit = totalSalesAmount - totalCost;
    const margin = totalSalesAmount > 0 ? ((estProfit / totalSalesAmount) * 100).toFixed(1) : '0';

    const periodLabel = getCustomPeriodLabel();

    const data: any[][] = [
      [settings.shop.shopName || 'POS Store'],
      [`SALES & GST REPORT — ${periodLabel.toUpperCase()}`],
      ['Report Period', periodLabel],
      ['Generated At', formatDateTime(new Date())],
      [],
      ['=== MIRA GST & FINANCIAL SUMMARY ==='],
      ['Total Gross Sales (Inc. GST)', `${currency} ${totalSalesAmount.toFixed(2)}`],
      ['Taxable Standard-Rated Supplies', `${currency} ${totalTaxable.toFixed(2)}`],
      [`Output GST @ ${gstRate}%`, `${currency} ${totalGst.toFixed(2)}`],
      ['Total Cost of Goods Sold', `${currency} ${totalCost.toFixed(2)}`],
      ['Estimated Gross Profit', `${currency} ${estProfit.toFixed(2)} (${margin}% Margin)`],
      ['Total Transactions', customSales.length],
      ['Average Transaction Value', `${currency} ${(customSales.length > 0 ? totalSalesAmount / customSales.length : 0).toFixed(2)}`],
      [],
      ['=== PAYMENT METHOD BREAKDOWN ==='],
      ['Cash Sales', `${currency} ${customCashTotal.toFixed(2)}`],
      ['Card Sales', `${currency} ${customCardTotal.toFixed(2)}`],
      ['Bank Transfer Sales', `${currency} ${customTransferTotal.toFixed(2)}`],
      ['Credit (Tab) Sales', `${currency} ${customCreditTotal.toFixed(2)}`],
      []
    ];

    if (customPeriodType === 'quarter') {
      const qNum = Number(customQuarter);
      const startMo = (qNum - 1) * 3;
      data.push(['=== MONTHLY BREAKDOWN IN QUARTER ===']);
      data.push(['Month', 'Transactions', `Taxable Sales (${currency})`, `GST (${currency})`, `Gross Sales (${currency})`]);
      
      for (let m = 0; m < 3; m++) {
        const targetMo = startMo + m;
        const moSales = customSales.filter(s => new Date(s.date).getMonth() === targetMo);
        const moGross = moSales.reduce((sum, s) => sum + num(s.grandTotal), 0);
        const moTaxable = moSales.reduce((sum, s) => sum + (num(s.grandTotal) / (1 + (gstRate / 100))), 0);
        const moGst = moGross - moTaxable;
        const moName = new Date(Number(customYear), targetMo, 1).toLocaleString('en-US', { month: 'long' });
        data.push([moName, moSales.length, Number(moTaxable.toFixed(2)), Number(moGst.toFixed(2)), Number(moGross.toFixed(2))]);
      }
      data.push([]);
    }

    data.push(['=== DETAILED TRANSACTIONS ===']);
    data.push(['Invoice / ID', 'Date', 'Time', 'Customer', 'Payment Method', 'Items', `Subtotal (${currency})`, `GST (${currency})`, `Grand Total (${currency})`]);

    customSales.forEach(sale => {
      const sub = num(sale.grandTotal) / (1 + (gstRate / 100));
      const gst = num(sale.grandTotal) - sub;
      const itemsSummary = (sale.items || []).map(i => `${i.qty}x ${i.name_en || i.name_dv || 'Item'}`).join('; ');
      const customerName = sale.customer ? (sale.customer.name_en || sale.customer.name_dv) : 'Walk-in';
      const sDate = new Date(sale.date);
      data.push([
        sale.invoiceNumber || sale.id,
        sDate.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }),
        formatTime(sale.date),
        customerName,
        (sale.paymentMethod || 'CASH').toUpperCase(),
        itemsSummary,
        Number(sub.toFixed(2)),
        Number(gst.toFixed(2)),
        Number(num(sale.grandTotal).toFixed(2))
      ]);
    });

    data.push(['TOTAL', '', '', '', '', '', Number(totalTaxable.toFixed(2)), Number(totalGst.toFixed(2)), Number(totalSalesAmount.toFixed(2))]);

    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [{ wch: 22 }, { wch: 14 }, { wch: 10 }, { wch: 22 }, { wch: 16 }, { wch: 45 }, { wch: 16 }, { wch: 14 }, { wch: 18 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sales & GST Report');
    const safeLabel = periodLabel.replace(/[^a-zA-Z0-9_-]/g, '_');
    XLSX.writeFile(wb, `Sales_GST_Report_${safeLabel}.xlsx`);
    showSuccess(`Quarterly/Sales report for ${periodLabel} downloaded!`);
  };

  // --- MIRA GST Output Tax Statement Export (Version 23.1) ---
  const handleExportGSTOutputTaxStatement = (salesToExport?: Sale[], customLabel?: string) => {
    const list = salesToExport || (showCustomPreview ? customSales : sales);
    const periodLabel = customLabel || (showCustomPreview ? getCustomPeriodLabel() : 'All_Sales');
    const gstRate = settings.shop.taxRate || 8;
    const rateDecimal = gstRate / 100;

    const formatDDMMYYYY = (d: Date | string | undefined): string => {
      if (!d) return '';
      const dateObj = typeof d === 'string' ? new Date(d) : d;
      if (isNaN(dateObj.getTime())) {
        if (typeof d === 'string') {
          const match = d.match(/^(\d{4})-(\d{2})-(\d{2})/);
          if (match) return `${match[3]}/${match[2]}/${match[1]}`;
        }
        return '';
      }
      const day = String(dateObj.getDate()).padStart(2, '0');
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const year = dateObj.getFullYear();
      return `${day}/${month}/${year}`;
    };

    let startDateStr = '';
    let endDateStr = '';

    if (showCustomPreview) {
      if (customPeriodType === 'date') {
        startDateStr = formatDDMMYYYY(customDate);
        endDateStr = formatDDMMYYYY(customDate);
      } else if (customPeriodType === 'month') {
        const [yr, mo] = customMonth.split('-').map(Number);
        const start = new Date(yr, mo - 1, 1);
        const lastDay = new Date(yr, mo, 0).getDate();
        const end = new Date(yr, mo - 1, lastDay);
        startDateStr = formatDDMMYYYY(start);
        endDateStr = formatDDMMYYYY(end);
      } else if (customPeriodType === 'quarter') {
        const qNum = Number(customQuarter);
        const startMonth = (qNum - 1) * 3;
        const start = new Date(Number(customYear), startMonth, 1);
        const endMonth = startMonth + 2;
        const lastDay = new Date(Number(customYear), endMonth + 1, 0).getDate();
        const end = new Date(Number(customYear), endMonth, lastDay);
        startDateStr = formatDDMMYYYY(start);
        const now = new Date();
        if (now >= start && now <= end) {
          endDateStr = formatDDMMYYYY(now);
        } else {
          endDateStr = formatDDMMYYYY(end);
        }
      } else {
        startDateStr = `01/01/${customYear}`;
        endDateStr = `31/12/${customYear}`;
      }
    } else if (list.length > 0) {
      const timestamps = list.map(s => new Date(s.date).getTime()).filter(t => !isNaN(t));
      if (timestamps.length > 0) {
        const minD = new Date(Math.min(...timestamps));
        const maxD = new Date(Math.max(...timestamps));
        startDateStr = formatDDMMYYYY(minD);
        endDateStr = formatDDMMYYYY(maxD);
      }
    }
    if (!startDateStr) startDateStr = formatDDMMYYYY(new Date());
    if (!endDateStr) endDateStr = formatDDMMYYYY(new Date());

    const tinNumber = (settings.shop as any)?.tin || (settings.shop as any)?.tin_number || (settings.shop as any)?.tinNumber || (settings.shop as any)?.taxNumber || '1021550GST501';
    const taxpayerName = (settings.shop as any)?.taxpayerName || settings.shop.shopName || 'BBACK';

    let totalTaxable = 0;
    let totalZero = 0;

    const rows = list.map((sale) => {
      const customerTin = (sale.customer as any)?.tin_number || (sale.customer as any)?.tax_number || (sale.customer as any)?.tin || '';
      const customerName = sale.customer 
        ? (sale.customer.name_en || sale.customer.name_dv || '') 
        : 'General Consumer';
      const invoiceNumber = sale.invoiceNumber || sale.id;
      const invoiceDate = formatDDMMYYYY(sale.date);

      let taxable = 0;
      let zeroRated = 0;

      if (Array.isArray(sale.items) && sale.items.length > 0) {
        sale.items.forEach(item => {
          const itemTotal = Number(item.price || 0) * Number(item.qty || 0);
          if (item.is_zero_tax) {
            zeroRated += itemTotal;
          } else {
            taxable += itemTotal / (1 + rateDecimal);
          }
        });
      } else {
        const grand = num(sale.grandTotal);
        taxable = grand / (1 + rateDecimal);
      }

      totalTaxable += taxable;
      totalZero += zeroRated;

      return [
        customerTin,
        customerName,
        invoiceNumber,
        invoiceDate,
        taxable > 0 ? Number(taxable.toFixed(2)) : '',
        zeroRated > 0 ? Number(zeroRated.toFixed(2)) : '',
        '', // Value of Exempt
        '', // Value of Out-of-Scope
        1   // Your Taxable Activity No.
      ];
    });

    // MIRA Output Tax Statement Version 23.1 Template Construction
    const sheetData: any[][] = [
      ['', '', '', 'Output Tax Statement', '', '', '', '', 'Version 23.1'],
      ['TIN:', tinNumber],
      ['Taxpayer Name:', taxpayerName],
      ['Taxable Period', startDateStr, '', 'Taxable Period', endDateStr],
      [],
      [
        'Customer TIN',
        'Customer Name',
        'Invoice No.',
        'Invoice Date',
        'Value of Supplies Subject to GST at 8% or 16% (excluding GST)',
        'Value of Zero-Rated Supplies',
        'Value of Exempt',
        'Value of Out-of-Scope',
        'Your Taxable Activity No.'
      ],
      ...rows,
      [],
      [],
      [
        'Your Taxable Activity No.',
        'Value of Supplies Subject to GST at 8% or 16% (excluding GST)',
        'Value of Zero-Rated Supplies',
        'Value of Exempt Supplies',
        'Value of Out-of-Scope'
      ],
      [
        1,
        Number(totalTaxable.toFixed(2)),
        totalZero > 0 ? Number(totalZero.toFixed(2)) : '',
        '',
        ''
      ]
    ];

    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    ws['!cols'] = [
      { wch: 20 }, // Customer TIN / Your Taxable Activity No.
      { wch: 32 }, // Customer Name / Value of Supplies Subject to GST...
      { wch: 22 }, // Invoice No. / Value of Zero-Rated Supplies
      { wch: 16 }, // Invoice Date / Value of Exempt Supplies
      { wch: 36 }, // Value of Supplies Subject to GST at 8% or 16% (excluding GST) / Value of Out-of-Scope
      { wch: 26 }, // Value of Zero-Rated Supplies
      { wch: 18 }, // Value of Exempt
      { wch: 20 }, // Value of Out-of-Scope
      { wch: 24 }, // Your Taxable Activity No.
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Output Tax Statement');
    const safeLabel = periodLabel.replace(/[^a-zA-Z0-9_-]/g, '_');
    XLSX.writeFile(wb, `GST_Output_Tax_Statement_${safeLabel}.xlsx`);
    showSuccess(`GST Output Tax Statement for ${periodLabel} downloaded successfully!`);
  };

  // --- Excel Export Handlers ---

  // 1. Export Daily Sales
  const handleExportDailySales = () => {
    const today = new Date();
    const todayStr = toISODate(today);
    const daySales = calculateSalesForPeriod('day').items;

    const currency = settings.shop.currency || 'MVR';
    const gstRate = settings.shop.taxRate || 0;

    const totalSalesAmount = daySales.reduce((sum, s) => sum + num(s.grandTotal), 0);
    const cashSales = daySales.filter(s => (s.paymentMethod || 'cash').toLowerCase() === 'cash');
    const cardSales = daySales.filter(s => (s.paymentMethod || '').toLowerCase() === 'card');
    const transferSales = daySales.filter(s => (s.paymentMethod || '').toLowerCase() === 'transfer');
    const creditSales = daySales.filter(s => (s.paymentMethod || '').toLowerCase() === 'credit');

    const cashTotal = cashSales.reduce((sum, s) => sum + num(s.grandTotal), 0);
    const cardTotal = cardSales.reduce((sum, s) => sum + num(s.grandTotal), 0);
    const transferTotal = transferSales.reduce((sum, s) => sum + num(s.grandTotal), 0);
    const creditTotal = creditSales.reduce((sum, s) => sum + num(s.grandTotal), 0);

    const totalTaxable = daySales.reduce((sum, s) => sum + (num(s.grandTotal) / (1 + (gstRate / 100))), 0);
    const totalGst = totalSalesAmount - totalTaxable;

    let totalCost = 0;
    daySales.forEach(sale => {
      (sale.items || []).forEach(item => {
        const prod = products.find(p => p.id === item.id);
        if (prod) {
          totalCost += num(prod.cost_price) * num(item.qty);
        }
      });
    });
    const estProfit = totalSalesAmount - totalCost;
    const margin = totalSalesAmount > 0 ? ((estProfit / totalSalesAmount) * 100).toFixed(1) : '0';

    const data: any[][] = [
      [settings.shop.shopName || "POS Store"],
      ["DAILY SALES REPORT (މިއަދުގެ ސޭލްސް ރިޕޯޓް)"],
      ["Report Date", formatDate(today)],
      ["Generated At", formatDateTime(new Date())],
      [],
      ["--- Summary Statistics ---"],
      ["Total Sales Amount", `${currency} ${totalSalesAmount.toFixed(2)}`],
      ["Total Transactions", daySales.length],
      ["Average Transaction", `${currency} ${(daySales.length > 0 ? totalSalesAmount / daySales.length : 0).toFixed(2)}`],
      ["Estimated Profit", `${currency} ${estProfit.toFixed(2)} (${margin}% Margin)`],
      ["Cash Sales", `${currency} ${cashTotal.toFixed(2)} (${cashSales.length} txns)`],
      ["Card Sales", `${currency} ${cardTotal.toFixed(2)} (${cardSales.length} txns)`],
      ["Transfer Sales", `${currency} ${transferTotal.toFixed(2)} (${transferSales.length} txns)`],
      ["Credit Sales", `${currency} ${creditTotal.toFixed(2)} (${creditSales.length} txns)`],
      ["Subtotal (Excl. GST)", `${currency} ${totalTaxable.toFixed(2)}`],
      [`Total GST (${gstRate}%)`, `${currency} ${totalGst.toFixed(2)}`],
      [],
      ["--- Detailed Transactions ---"],
      [
        "Invoice / ID",
        "Time",
        "Customer",
        "Payment Method",
        "Items Count",
        "Items Summary",
        `Subtotal (${currency})`,
        `GST (${currency})`,
        `Grand Total (${currency})`
      ]
    ];

    daySales.forEach(sale => {
      const sub = num(sale.grandTotal) / (1 + (gstRate / 100));
      const gst = num(sale.grandTotal) - sub;
      const itemsSummary = (sale.items || []).map(i => `${i.qty}x ${i.name_en || i.name_dv || 'Item'}`).join('; ');
      const customerName = sale.customer ? `${sale.customer.name_en || sale.customer.name_dv}` : 'Walk-in Customer';

      data.push([
        sale.invoiceNumber || sale.id,
        formatTime(sale.date),
        customerName,
        (sale.paymentMethod || 'CASH').toUpperCase(),
        sale.items ? sale.items.length : 0,
        itemsSummary,
        Number(sub.toFixed(2)),
        Number(gst.toFixed(2)),
        Number(num(sale.grandTotal).toFixed(2))
      ]);
    });

    data.push([
      "TOTAL",
      "",
      "",
      "",
      daySales.reduce((acc, s) => acc + (s.items?.length || 0), 0),
      "",
      Number(totalTaxable.toFixed(2)),
      Number(totalGst.toFixed(2)),
      Number(totalSalesAmount.toFixed(2))
    ]);

    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [
      { wch: 18 },
      { wch: 12 },
      { wch: 22 },
      { wch: 16 },
      { wch: 12 },
      { wch: 45 },
      { wch: 16 },
      { wch: 14 },
      { wch: 18 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Daily Sales");
    XLSX.writeFile(wb, `Daily_Sales_Report_${todayStr}.xlsx`);
    showSuccess('Daily sales report downloaded (މިއަދުގެ ސޭލްސް ރިޕޯޓް ޑައުންލޯޑް ކުރެވިއްޖެ)');
  };

  // 2. Export Monthly Sales
  const handleExportMonthlySales = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const monthName = now.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    const monthSales = calculateSalesForPeriod('month').items;

    const currency = settings.shop.currency || 'MVR';
    const gstRate = settings.shop.taxRate || 0;
    const totalSalesAmount = monthSales.reduce((sum, s) => sum + num(s.grandTotal), 0);

    const cashSales = monthSales.filter(s => (s.paymentMethod || 'cash').toLowerCase() === 'cash');
    const cardSales = monthSales.filter(s => (s.paymentMethod || '').toLowerCase() === 'card');
    const transferSales = monthSales.filter(s => (s.paymentMethod || '').toLowerCase() === 'transfer');
    const creditSales = monthSales.filter(s => (s.paymentMethod || '').toLowerCase() === 'credit');

    const cashTotal = cashSales.reduce((sum, s) => sum + num(s.grandTotal), 0);
    const cardTotal = cardSales.reduce((sum, s) => sum + num(s.grandTotal), 0);
    const transferTotal = transferSales.reduce((sum, s) => sum + num(s.grandTotal), 0);
    const creditTotal = creditSales.reduce((sum, s) => sum + num(s.grandTotal), 0);

    const totalTaxable = monthSales.reduce((sum, s) => sum + (num(s.grandTotal) / (1 + (gstRate / 100))), 0);
    const totalGst = totalSalesAmount - totalTaxable;

    let totalCost = 0;
    monthSales.forEach(sale => {
      (sale.items || []).forEach(item => {
        const prod = products.find(p => p.id === item.id);
        if (prod) {
          totalCost += num(prod.cost_price) * num(item.qty);
        }
      });
    });
    const estProfit = totalSalesAmount - totalCost;
    const margin = totalSalesAmount > 0 ? ((estProfit / totalSalesAmount) * 100).toFixed(1) : '0';

    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const dailyBreakdownData: any[][] = [
      [settings.shop.shopName || "POS Store"],
      [`MONTHLY SALES REPORT - ${monthName.toUpperCase()} (މިމަހުގެ ސޭލްސް ރިޕޯޓް)`],
      ["Generated At", formatDateTime(new Date())],
      [],
      ["--- Monthly Summary ---"],
      ["Total Sales Amount", `${currency} ${totalSalesAmount.toFixed(2)}`],
      ["Total Transactions", monthSales.length],
      ["Average Basket Value", `${currency} ${(monthSales.length > 0 ? totalSalesAmount / monthSales.length : 0).toFixed(2)}`],
      ["Estimated Profit", `${currency} ${estProfit.toFixed(2)} (${margin}% Margin)`],
      ["Cash Sales", `${currency} ${cashTotal.toFixed(2)} (${cashSales.length} txns)`],
      ["Card Sales", `${currency} ${cardTotal.toFixed(2)} (${cardSales.length} txns)`],
      ["Transfer Sales", `${currency} ${transferTotal.toFixed(2)} (${transferSales.length} txns)`],
      ["Credit Sales", `${currency} ${creditTotal.toFixed(2)} (${creditSales.length} txns)`],
      ["Subtotal (Excl. GST)", `${currency} ${totalTaxable.toFixed(2)}`],
      [`Total GST (${gstRate}%)`, `${currency} ${totalGst.toFixed(2)}`],
      [],
      ["--- Day by Day Breakdown ---"],
      [
        "Date",
        "Day of Week",
        "Transactions",
        `Cash (${currency})`,
        `Card (${currency})`,
        `Transfer (${currency})`,
        `Credit (${currency})`,
        `Total Sales (${currency})`
      ]
    ];

    for (let day = 1; day <= daysInMonth; day++) {
      const dateObj = new Date(currentYear, currentMonth, day);
      const dayDateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });

      const daySalesList = monthSales.filter(s => {
        if (!s.date) return false;
        return extractDateOnly(s.date) === dayDateStr;
      });

      const dayCash = daySalesList.filter(s => (s.paymentMethod || 'cash').toLowerCase() === 'cash').reduce((sum, s) => sum + num(s.grandTotal), 0);
      const dayCard = daySalesList.filter(s => (s.paymentMethod || '').toLowerCase() === 'card').reduce((sum, s) => sum + num(s.grandTotal), 0);
      const dayTransfer = daySalesList.filter(s => (s.paymentMethod || '').toLowerCase() === 'transfer').reduce((sum, s) => sum + num(s.grandTotal), 0);
      const dayCredit = daySalesList.filter(s => (s.paymentMethod || '').toLowerCase() === 'credit').reduce((sum, s) => sum + num(s.grandTotal), 0);
      const dayTotal = daySalesList.reduce((sum, s) => sum + num(s.grandTotal), 0);

      dailyBreakdownData.push([
        dayDateStr,
        dayName,
        daySalesList.length,
        Number(dayCash.toFixed(2)),
        Number(dayCard.toFixed(2)),
        Number(dayTransfer.toFixed(2)),
        Number(dayCredit.toFixed(2)),
        Number(dayTotal.toFixed(2))
      ]);
    }

    dailyBreakdownData.push([
      "TOTAL",
      "",
      monthSales.length,
      Number(cashTotal.toFixed(2)),
      Number(cardTotal.toFixed(2)),
      Number(transferTotal.toFixed(2)),
      Number(creditTotal.toFixed(2)),
      Number(totalSalesAmount.toFixed(2))
    ]);

    const txData: any[][] = [
      [
        "Invoice / ID",
        "Date",
        "Time",
        "Customer",
        "Payment Method",
        "Items Count",
        "Items Summary",
        `Subtotal (${currency})`,
        `GST (${currency})`,
        `Grand Total (${currency})`
      ]
    ];

    monthSales.forEach(sale => {
      const sub = num(sale.grandTotal) / (1 + (gstRate / 100));
      const gst = num(sale.grandTotal) - sub;
      const itemsSummary = (sale.items || []).map(i => `${i.qty}x ${i.name_en || i.name_dv || 'Item'}`).join('; ');
      const customerName = sale.customer ? `${sale.customer.name_en || sale.customer.name_dv}` : 'Walk-in Customer';

      txData.push([
        sale.invoiceNumber || sale.id,
        formatDate(sale.date),
        formatTime(sale.date),
        customerName,
        (sale.paymentMethod || 'CASH').toUpperCase(),
        sale.items ? sale.items.length : 0,
        itemsSummary,
        Number(sub.toFixed(2)),
        Number(gst.toFixed(2)),
        Number(num(sale.grandTotal).toFixed(2))
      ]);
    });

    const wb = XLSX.utils.book_new();
    const wsSummary = XLSX.utils.aoa_to_sheet(dailyBreakdownData);
    wsSummary['!cols'] = [
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 18 }
    ];
    XLSX.utils.book_append_sheet(wb, wsSummary, "Monthly Summary");

    const wsTx = XLSX.utils.aoa_to_sheet(txData);
    wsTx['!cols'] = [
      { wch: 18 },
      { wch: 14 },
      { wch: 12 },
      { wch: 22 },
      { wch: 16 },
      { wch: 12 },
      { wch: 45 },
      { wch: 16 },
      { wch: 14 },
      { wch: 18 }
    ];
    XLSX.utils.book_append_sheet(wb, wsTx, "All Transactions");

    const fileMonth = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
    XLSX.writeFile(wb, `Monthly_Sales_Report_${fileMonth}.xlsx`);
    showSuccess('Monthly sales report downloaded (މިމަހުގެ ސޭލްސް ރިޕޯޓް ޑައުންލޯޑް ކުރެވިއްޖެ)');
  };

  // 3. Export Yearly Sales
  const handleExportYearlySales = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const yearSales = calculateSalesForPeriod('year').items;

    const currency = settings.shop.currency || 'MVR';
    const gstRate = settings.shop.taxRate || 0;
    const totalSalesAmount = yearSales.reduce((sum, s) => sum + num(s.grandTotal), 0);

    const cashSales = yearSales.filter(s => (s.paymentMethod || 'cash').toLowerCase() === 'cash');
    const cardSales = yearSales.filter(s => (s.paymentMethod || '').toLowerCase() === 'card');
    const transferSales = yearSales.filter(s => (s.paymentMethod || '').toLowerCase() === 'transfer');
    const creditSales = yearSales.filter(s => (s.paymentMethod || '').toLowerCase() === 'credit');

    const cashTotal = cashSales.reduce((sum, s) => sum + num(s.grandTotal), 0);
    const cardTotal = cardSales.reduce((sum, s) => sum + num(s.grandTotal), 0);
    const transferTotal = transferSales.reduce((sum, s) => sum + num(s.grandTotal), 0);
    const creditTotal = creditSales.reduce((sum, s) => sum + num(s.grandTotal), 0);

    const totalTaxable = yearSales.reduce((sum, s) => sum + (num(s.grandTotal) / (1 + (gstRate / 100))), 0);
    const totalGst = totalSalesAmount - totalTaxable;

    let totalCost = 0;
    yearSales.forEach(sale => {
      (sale.items || []).forEach(item => {
        const prod = products.find(p => p.id === item.id);
        if (prod) {
          totalCost += num(prod.cost_price) * num(item.qty);
        }
      });
    });
    const estProfit = totalSalesAmount - totalCost;
    const margin = totalSalesAmount > 0 ? ((estProfit / totalSalesAmount) * 100).toFixed(1) : '0';

    const monthsNameArr = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];

    const yearlyBreakdownData: any[][] = [
      [settings.shop.shopName || "POS Store"],
      [`YEARLY SALES REPORT - ${currentYear} (މިއަހަރުގެ ސޭލްސް ރިޕޯޓް)`],
      ["Generated At", formatDateTime(new Date())],
      [],
      ["--- Annual Summary ---"],
      ["Total Sales Amount", `${currency} ${totalSalesAmount.toFixed(2)}`],
      ["Total Transactions", yearSales.length],
      ["Average Basket Value", `${currency} ${(yearSales.length > 0 ? totalSalesAmount / yearSales.length : 0).toFixed(2)}`],
      ["Estimated Profit", `${currency} ${estProfit.toFixed(2)} (${margin}% Margin)`],
      ["Cash Sales", `${currency} ${cashTotal.toFixed(2)} (${cashSales.length} txns)`],
      ["Card Sales", `${currency} ${cardTotal.toFixed(2)} (${cardSales.length} txns)`],
      ["Transfer Sales", `${currency} ${transferTotal.toFixed(2)} (${transferSales.length} txns)`],
      ["Credit Sales", `${currency} ${creditTotal.toFixed(2)} (${creditSales.length} txns)`],
      ["Subtotal (Excl. GST)", `${currency} ${totalTaxable.toFixed(2)}`],
      [`Total GST (${gstRate}%)`, `${currency} ${totalGst.toFixed(2)}`],
      [],
      ["--- Month by Month Breakdown ---"],
      [
        "Month",
        "Transactions",
        `Cash (${currency})`,
        `Card (${currency})`,
        `Transfer (${currency})`,
        `Credit (${currency})`,
        `Total Sales (${currency})`
      ]
    ];

    monthsNameArr.forEach((mName, mIdx) => {
      const mSales = yearSales.filter(s => {
        const d = new Date(s.date);
        return d.getMonth() === mIdx;
      });

      const mCash = mSales.filter(s => (s.paymentMethod || 'cash').toLowerCase() === 'cash').reduce((sum, s) => sum + num(s.grandTotal), 0);
      const mCard = mSales.filter(s => (s.paymentMethod || '').toLowerCase() === 'card').reduce((sum, s) => sum + num(s.grandTotal), 0);
      const mTransfer = mSales.filter(s => (s.paymentMethod || '').toLowerCase() === 'transfer').reduce((sum, s) => sum + num(s.grandTotal), 0);
      const mCredit = mSales.filter(s => (s.paymentMethod || '').toLowerCase() === 'credit').reduce((sum, s) => sum + num(s.grandTotal), 0);
      const mTotal = mSales.reduce((sum, s) => sum + num(s.grandTotal), 0);

      yearlyBreakdownData.push([
        mName,
        mSales.length,
        Number(mCash.toFixed(2)),
        Number(mCard.toFixed(2)),
        Number(mTransfer.toFixed(2)),
        Number(mCredit.toFixed(2)),
        Number(mTotal.toFixed(2))
      ]);
    });

    yearlyBreakdownData.push([
      "TOTAL",
      yearSales.length,
      Number(cashTotal.toFixed(2)),
      Number(cardTotal.toFixed(2)),
      Number(transferTotal.toFixed(2)),
      Number(creditTotal.toFixed(2)),
      Number(totalSalesAmount.toFixed(2))
    ]);

    const txData: any[][] = [
      [
        "Invoice / ID",
        "Date",
        "Time",
        "Customer",
        "Payment Method",
        "Items Count",
        "Items Summary",
        `Subtotal (${currency})`,
        `GST (${currency})`,
        `Grand Total (${currency})`
      ]
    ];

    yearSales.forEach(sale => {
      const sub = num(sale.grandTotal) / (1 + (gstRate / 100));
      const gst = num(sale.grandTotal) - sub;
      const itemsSummary = (sale.items || []).map(i => `${i.qty}x ${i.name_en || i.name_dv || 'Item'}`).join('; ');
      const customerName = sale.customer ? `${sale.customer.name_en || sale.customer.name_dv}` : 'Walk-in Customer';

      txData.push([
        sale.invoiceNumber || sale.id,
        formatDate(sale.date),
        formatTime(sale.date),
        customerName,
        (sale.paymentMethod || 'CASH').toUpperCase(),
        sale.items ? sale.items.length : 0,
        itemsSummary,
        Number(sub.toFixed(2)),
        Number(gst.toFixed(2)),
        Number(num(sale.grandTotal).toFixed(2))
      ]);
    });

    const wb = XLSX.utils.book_new();
    const wsSummary = XLSX.utils.aoa_to_sheet(yearlyBreakdownData);
    wsSummary['!cols'] = [
      { wch: 16 },
      { wch: 14 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 18 }
    ];
    XLSX.utils.book_append_sheet(wb, wsSummary, "Yearly Summary");

    const wsTx = XLSX.utils.aoa_to_sheet(txData);
    wsTx['!cols'] = [
      { wch: 18 },
      { wch: 14 },
      { wch: 12 },
      { wch: 22 },
      { wch: 16 },
      { wch: 12 },
      { wch: 45 },
      { wch: 16 },
      { wch: 14 },
      { wch: 18 }
    ];
    XLSX.utils.book_append_sheet(wb, wsTx, "All Transactions");

    XLSX.writeFile(wb, `Yearly_Sales_Report_${currentYear}.xlsx`);
    showSuccess('Yearly sales report downloaded (މިއަހަރުގެ ސޭލްސް ރިޕޯޓް ޑައުންލޯޑް ކުރެވިއްޖެ)');
  };

  const renderBoth = (key: string, options?: any) => (
    <>
      {t(key, options)} ({t(key, { ...options, lng: 'en' })})
    </>
  );

  // Dynamic monthly revenue data for the last 6 months
  const monthlyGrowthData = useMemo(() => {
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthShort = d.toLocaleString('en-US', { month: 'short' });
      const year = d.getFullYear();
      const monthIndex = d.getMonth();

      const totalForMonth = sales
        .filter(sale => {
          const sDate = new Date(sale.date);
          return sDate.getFullYear() === year && sDate.getMonth() === monthIndex;
        })
        .reduce((sum, s) => sum + (Number(s.grandTotal) || 0), 0);

      months.push({
        name: monthShort,
        fullName: `${monthShort} ${year}`,
        revenue: Math.round(totalForMonth * 100) / 100
      });
    }
    return months;
  }, [sales]);

  // Dynamic Key Insights from actual sales
  const keyInsights = useMemo(() => {
    // 1. Highest Revenue Day
    const dayTotals = new Map<string, number>();
    sales.forEach(s => {
      if (!s.date) return;
      const dayKey = s.date.slice(0, 10);
      dayTotals.set(dayKey, (dayTotals.get(dayKey) || 0) + (Number(s.grandTotal) || 0));
    });

    let highestDayDate: string | null = null;
    let highestDayAmount = 0;
    dayTotals.forEach((amt, day) => {
      if (amt > highestDayAmount) {
        highestDayAmount = amt;
        highestDayDate = day;
      }
    });

    let highestDayLabel = '-';
    if (highestDayDate) {
      const d = new Date(highestDayDate);
      highestDayLabel = `${d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} (${settings.shop.currency} ${highestDayAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`;
    }

    // 2. Best Selling Category
    const categoryQty = new Map<string, number>();
    sales.forEach(s => {
      (s.items || []).forEach(item => {
        const prod = products.find(p => p.id === item.id);
        const cat = prod?.category || 'General';
        categoryQty.set(cat, (categoryQty.get(cat) || 0) + (Number(item.qty) || 0));
      });
    });

    let bestCategory = '-';
    let bestCategoryQty = 0;
    categoryQty.forEach((qty, cat) => {
      if (qty > bestCategoryQty) {
        bestCategoryQty = qty;
        bestCategory = cat;
      }
    });
    const bestCategoryLabel = bestCategory !== '-' ? `${bestCategory} (${bestCategoryQty} units)` : '-';

    // 3. Average Basket Value
    const totalRevenue = sales.reduce((sum, s) => sum + (Number(s.grandTotal) || 0), 0);
    const avgBasket = sales.length > 0 ? (totalRevenue / sales.length) : 0;
    const avgBasketLabel = `${settings.shop.currency} ${avgBasket.toFixed(2)}`;

    return {
      highestDayLabel,
      bestCategoryLabel,
      avgBasketLabel
    };
  }, [sales, products, settings.shop.currency]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border border-border px-3 py-2 rounded-xl shadow-xl text-popover-foreground text-xs font-faruma text-right" dir="rtl">
          <p className="font-bold text-muted-foreground">{label}</p>
          <p className="font-black text-primary text-sm mt-0.5" dir="ltr">
            {settings.shop.currency} {Number(payload[0].value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
      );
    }
    return null;
  };

  const StatCard = ({ title, stats, icon: Icon, color, profit, onDownload, downloadLabel, onClick }: any) => (
    <Card 
      onClick={onClick}
      className={cn(
        "apple-glass-card border border-white/20 dark:border-white/10 hover:border-primary/50 transition-all duration-300 rounded-[2rem] overflow-hidden group flex flex-col justify-between shadow-md hover:shadow-xl",
        onClick && "cursor-pointer select-none"
      )}
    >
      <CardContent className="p-6 text-right flex-1 flex flex-col justify-between">
        <div>
          <div className="flex justify-between items-center mb-6">
            <div className={cn("p-3.5 rounded-2xl bg-white/40 dark:bg-white/10 border border-white/20 dark:border-white/10 group-hover:scale-110 transition-transform shadow-xs", color)}>
              <Icon className="h-6 w-6" />
            </div>
            <div className="flex items-center gap-2">
              {onClick && (
                <span className="text-[9px] font-black uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20">
                  Click for details
                </span>
              )}
              <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest">{title}</p>
            </div>
          </div>
          
          <div className="space-y-1 mb-6">
             <p className="text-3xl font-black text-foreground font-mono">
               {settings.shop.currency} {stats.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
             </p>
             <div className="flex items-center justify-end gap-2">
                <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">{stats.count} TRANSACTIONS</span>
                <Activity className="h-3 w-3 text-primary/40" />
             </div>
          </div>

          {profit && (
            <div className="pt-4 border-t border-white/15 dark:border-white/10 flex justify-between items-center mb-4">
               <div className="flex items-center gap-1 text-emerald-500">
                  <ArrowUpRight className="h-3.5 w-3.5" />
                  <span className="text-[11px] font-black">{profit.margin.toFixed(1)}% MARGIN</span>
               </div>
               <div className="text-right">
                  <p className="text-[8px] font-black text-muted-foreground/60 uppercase tracking-widest">EST. PROFIT</p>
                  <p className="text-sm font-black text-foreground font-mono">{settings.shop.currency} {profit.profit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
               </div>
            </div>
          )}
        </div>

        {onDownload && (
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onDownload();
            }}
            className="w-full mt-2 h-9.5 rounded-xl transition-all text-xs font-bold gap-2 flex items-center justify-center group/btn apple-glass-pill"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-500 group-hover/btn:text-primary transition-colors" />
            <span>{downloadLabel || "Download Excel (އެކްސެލް ޑައުންލޯޑް)"}</span>
          </Button>
        )}
      </CardContent>
    </Card>
  );

  const InteractiveKpiCard = ({
    titleEn,
    titleDv,
    value,
    badge,
    subValue,
    icon: Icon,
    iconColor,
    onClick,
  }: {
    titleEn: string;
    titleDv: string;
    value: string | number;
    badge?: string;
    subValue?: string;
    icon: any;
    iconColor: string;
    onClick?: () => void;
  }) => (
    <Card
      onClick={onClick}
      className="apple-glass-card border border-white/20 dark:border-white/10 hover:border-primary/50 transition-all duration-300 rounded-3xl overflow-hidden group cursor-pointer hover:shadow-xl hover:-translate-y-0.5 flex flex-col justify-between select-none shadow-sm"
    >
      <CardContent className="p-5 text-right flex-1 flex flex-col justify-between">
        <div>
          <div className="flex justify-between items-center mb-3">
            <div className={cn("p-2.5 rounded-2xl bg-white/40 dark:bg-white/10 border border-white/20 dark:border-white/10 group-hover:scale-110 transition-transform shadow-xs shrink-0", iconColor)}>
              <Icon className="h-5 w-5" />
            </div>
            {badge && (
              <Badge variant="outline" className="text-[10px] font-black uppercase tracking-wider bg-white/40 dark:bg-white/10 border-white/20 px-2 py-0.5">
                {badge}
              </Badge>
            )}
          </div>

          <div className="space-y-0.5 text-right">
            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">{titleEn}</p>
            <p className="text-xs font-bold text-foreground/80 font-faruma">{titleDv}</p>
          </div>

          <div className="mt-3">
            <p className="text-2xl font-black font-mono text-foreground tracking-tight">
              {value}
            </p>
            {subValue && (
              <p className="text-[11px] font-bold text-muted-foreground mt-0.5">
                {subValue}
              </p>
            )}
          </div>
        </div>

        <div className="pt-3 mt-3 border-t border-white/10 flex items-center justify-between text-[10px] font-black text-primary group-hover:translate-x-[-2px] transition-transform">
          <ChevronRight className="h-3.5 w-3.5 rotate-180 text-primary" />
          <span>Click to view details</span>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="p-4 sm:p-6 font-faruma flex flex-col h-full bg-background text-foreground overflow-hidden" dir="rtl">
      {/* Unified Top Header Bar */}
      <div className="shrink-0 mb-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-4 apple-glass-card border border-white/20 dark:border-white/10 rounded-3xl p-4 sm:px-6 shadow-sm">
          {/* Title & Subtitle (Right side in RTL) */}
          <div className="flex items-center gap-3.5 text-right">
            <div className="w-12 h-12 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary shrink-0 shadow-xs">
              <BarChart3 className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-foreground leading-tight">
                {renderBoth('sales_reports')}
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5" dir="ltr">
                Sales analytics, profit metrics &amp; MIRA GST reports
              </p>
            </div>
          </div>

          {/* Today's Summary + Quick Export Action Buttons (Left side in RTL) */}
          <div className="flex flex-wrap items-center gap-2.5 mr-auto sm:mr-0" dir="ltr">
            {/* Compact Today's Sales Summary Card */}
            <div className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-primary/10 border border-primary/20">
              <div className="w-8 h-8 rounded-xl bg-primary/20 text-primary flex items-center justify-center shrink-0">
                <DollarSign className="h-4 w-4" />
              </div>
              <div className="text-left">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">
                    Today&apos;s Sales
                  </span>
                  <span className="text-[9px] font-black bg-primary/20 text-primary px-1.5 py-0.2 rounded-md font-mono">
                    {dayStats.count} txns
                  </span>
                </div>
                <p className="text-base sm:text-lg font-black font-mono text-foreground leading-tight">
                  {settings.shop.currency} {dayStats.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            {/* Action Buttons for downloading daily, monthly, yearly, and GST statements */}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportDailySales}
                className="rounded-xl border-border bg-card hover:bg-muted transition-all text-xs font-black gap-1.5 h-10 px-3.5"
                title="Download today's sales report as Excel"
              >
                <FileSpreadsheet className="h-4 w-4 text-primary" />
                <span>Daily</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleExportMonthlySales}
                className="rounded-xl border-border bg-card hover:bg-muted transition-all text-xs font-black gap-1.5 h-10 px-3.5"
                title="Download this month's sales report as Excel"
              >
                <FileSpreadsheet className="h-4 w-4 text-purple-500" />
                <span>Monthly</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleExportYearlySales}
                className="rounded-xl border-border bg-card hover:bg-muted transition-all text-xs font-black gap-1.5 h-10 px-3.5"
                title="Download this year's sales report as Excel"
              >
                <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
                <span>Yearly</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExportGSTOutputTaxStatement()}
                className="rounded-xl border-blue-500/30 hover:border-blue-500/60 bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 transition-all text-xs font-black gap-1.5 h-10 px-3.5"
                title="Download MIRA GST Output Tax Statement"
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">GST Statement</span>
                <span className="sm:hidden">GST</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Unified Custom Period Filter Bar */}
        <div className="apple-glass-card border border-white/20 dark:border-white/10 rounded-2xl p-2.5 sm:p-3 flex flex-wrap items-center justify-between gap-3" dir="ltr">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-black text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mr-1">
              <Calendar className="h-3.5 w-3.5 text-primary" /> Period:
            </span>

            {/* Period Type Selector */}
            <div className="flex bg-muted rounded-xl p-0.5 gap-1 border border-border/60">
              {(['date', 'month', 'quarter', 'year'] as const).map(pt => (
                <button
                  key={pt}
                  onClick={() => { setCustomPeriodType(pt); setShowCustomPreview(false); }}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-xs font-black transition-all',
                    customPeriodType === pt
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {pt === 'date' ? 'Date' : pt === 'month' ? 'Month' : pt === 'quarter' ? 'Quarter' : 'Year'}
                </button>
              ))}
            </div>

            {/* Period Picker */}
            {customPeriodType === 'date' && (
              <input
                type="date"
                value={customDate}
                onChange={e => { setCustomDate(e.target.value); setShowCustomPreview(false); }}
                className="h-9 px-3 rounded-xl border border-border bg-muted text-foreground text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary"
              />
            )}
            {customPeriodType === 'month' && (
              <input
                type="month"
                value={customMonth}
                onChange={e => { setCustomMonth(e.target.value); setShowCustomPreview(false); }}
                className="h-9 px-3 rounded-xl border border-border bg-muted text-foreground text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary"
              />
            )}
            {customPeriodType === 'quarter' && (
              <div className="flex items-center gap-2">
                <select
                  value={customQuarter}
                  onChange={e => { setCustomQuarter(e.target.value); setShowCustomPreview(false); }}
                  className="h-9 px-3 rounded-xl border border-border bg-muted text-foreground text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                  dir="ltr"
                >
                  <option value="1">Q1 (Jan - Mar)</option>
                  <option value="2">Q2 (Apr - Jun)</option>
                  <option value="3">Q3 (Jul - Sep)</option>
                  <option value="4">Q4 (Oct - Dec)</option>
                </select>
                <input
                  type="number"
                  value={customYear}
                  min="2020"
                  max="2099"
                  onChange={e => { setCustomYear(e.target.value); setShowCustomPreview(false); }}
                  className="h-9 px-3 w-20 rounded-xl border border-border bg-muted text-foreground text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary"
                  dir="ltr"
                />
              </div>
            )}
            {customPeriodType === 'year' && (
              <input
                type="number"
                value={customYear}
                min="2020"
                max="2099"
                onChange={e => { setCustomYear(e.target.value); setShowCustomPreview(false); }}
                className="h-9 px-3 w-24 rounded-xl border border-border bg-muted text-foreground text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary"
                dir="ltr"
              />
            )}

            <Button
              variant={showCustomPreview ? "default" : "outline"}
              size="sm"
              onClick={() => setShowCustomPreview(!showCustomPreview)}
              className="h-9 rounded-xl text-xs font-black gap-1.5 border-primary/40"
            >
              <Eye className="h-3.5 w-3.5" />
              <span>{showCustomPreview ? 'Hide Details' : 'Preview Details'}</span>
            </Button>
          </div>

          {/* Quick period summary metrics */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-muted/60 border border-border">
              <span className="text-[11px] font-bold text-muted-foreground">{getCustomPeriodLabel()}:</span>
              <span className="font-mono font-black text-foreground">{settings.shop.currency} {customTotalSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              <span className="text-[10px] text-muted-foreground font-mono">({customSales.length} txns)</span>
            </div>

            <Button
              onClick={handleExportCustomReport}
              size="sm"
              className="h-9 rounded-xl text-xs font-black gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              <span>Export Custom</span>
            </Button>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 custom-scrollbar">
        <div className="space-y-6 pb-6">

          {/* ── Custom Report Preview Panel (Shown when preview is enabled) ── */}
          {showCustomPreview && (
            <div className="apple-glass-card border border-white/20 dark:border-white/10 rounded-[2rem] overflow-hidden shadow-md">
              <div className="p-6 space-y-5">
                {/* Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'Total Sales', value: customTotalSales, color: 'text-primary' },
                    { label: 'Cash', value: customCashTotal, color: 'text-emerald-500' },
                    { label: 'Transfer', value: customTransferTotal, color: 'text-blue-500' },
                    { label: 'Credit', value: customCreditTotal, color: 'text-amber-500' },
                  ].map(item => (
                    <div key={item.label} className="bg-muted/50 rounded-2xl p-4 text-right border border-border">
                      <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-1">{item.label}</p>
                      <p className={cn('text-lg font-black', item.color)}>
                        {settings.shop.currency} {item.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      onClick={handleExportCustomReport}
                      size="sm"
                      className="h-9 rounded-xl text-xs font-black gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      <FileSpreadsheet className="h-3.5 w-3.5" />
                      Download Excel Report
                    </Button>
                    <Button
                      onClick={() => handleExportGSTOutputTaxStatement(customSales, getCustomPeriodLabel())}
                      size="sm"
                      variant="outline"
                      className="h-9 rounded-xl text-xs font-black gap-1.5 border-blue-500/40 text-blue-600 dark:text-blue-400 hover:bg-blue-600 hover:text-white"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download GST Output Tax Statement
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground font-bold">
                    {customSales.length} transaction{customSales.length !== 1 ? 's' : ''} for <span className="text-foreground">{getCustomPeriodLabel()}</span>
                  </p>
                </div>

                {/* Transactions Table */}
                {customSales.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground">
                    <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-20" />
                    <p className="text-sm font-bold">No sales found for this period</p>
                  </div>
                ) : (
                  <div className="overflow-auto rounded-2xl border border-border" dir="ltr">
                    <table className="w-full text-xs min-w-[640px]">
                      <thead>
                        <tr className="bg-muted/60 border-b border-border">
                          {['Invoice', 'Date', 'Time', 'Customer', 'Method', 'Items', `Total (${settings.shop.currency})`, 'Return'].map(h => (
                            <th key={h} className="px-3 py-2.5 text-left font-black text-muted-foreground uppercase tracking-wider whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {customSales.map(sale => {
                          const sDate = new Date(sale.date);
                          const itemsSummary = (sale.items || []).slice(0, 3).map(i => `${i.qty}× ${i.name_en || i.name_dv || '?'}`).join(', ') + (sale.items && sale.items.length > 3 ? ` +${sale.items.length - 3} more` : '');
                          const customerName = sale.customer ? (sale.customer.name_en || sale.customer.name_dv) : 'Walk-in';
                          const methodColors: Record<string, string> = {
                            cash: 'bg-emerald-500/10 text-emerald-500',
                            card: 'bg-blue-500/10 text-blue-500',
                            transfer: 'bg-blue-500/10 text-blue-500',
                            credit: 'bg-amber-500/10 text-amber-500'
                          };
                          const method = (sale.paymentMethod || 'cash').toLowerCase();
                          return (
                            <tr key={sale.id} className={cn('hover:bg-muted/30 transition-colors', (sale.paymentMethod as any) === 'return' && 'bg-red-500/5')}>
                              <td className="px-3 py-2.5 font-mono text-[10px] text-muted-foreground">{(sale.invoiceNumber || sale.id || '').toString().slice(-8)}</td>
                              <td className="px-3 py-2.5 font-bold whitespace-nowrap">{sDate.toLocaleDateString('en-US', { day: '2-digit', month: 'short' })}</td>
                              <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{formatTime(sale.date)}</td>
                              <td className="px-3 py-2.5 font-bold max-w-[120px] truncate">{customerName}</td>
                              <td className="px-3 py-2.5">
                                <span className={cn('px-2 py-0.5 rounded-full font-black text-[10px]', methodColors[method] || 'bg-muted text-muted-foreground')}>
                                  {(sale.paymentMethod || 'Cash').toUpperCase()}
                                </span>
                              </td>
                              <td className="px-3 py-2.5 text-muted-foreground max-w-[180px] truncate">{itemsSummary || '—'}</td>
                              <td className="px-3 py-2.5 font-black text-right">{num(sale.grandTotal).toFixed(2)}</td>
                              <td className="px-3 py-2.5 text-center">
                                {(sale.paymentMethod as any) !== 'return' && !String(sale.invoiceNumber || '').startsWith('RET-') && (
                                  <button
                                    type="button"
                                    onClick={() => openReturnDialog(sale)}
                                    title="Process Return"
                                    className="h-7 w-7 flex items-center justify-center rounded-lg bg-orange-500/10 text-orange-500 hover:bg-orange-500/25 border border-orange-500/20 transition-all"
                                  >
                                    <Undo2 className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="bg-muted/60 border-t-2 border-border font-black">
                          <td colSpan={7} className="px-3 py-2.5 text-right text-xs uppercase tracking-wider">Total</td>
                          <td className="px-3 py-2.5 text-right text-sm text-primary">{customTotalSales.toFixed(2)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Main Stats with direct Download buttons */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard 
              title={t('today_sales')} 
              stats={dayStats} 
              icon={TrendingUp} 
              color="text-primary" 
              profit={dayProfit}
              onClick={() => { setDetailPeriodFilter('today'); setActiveDetailModal('today'); }}
              onDownload={handleExportDailySales}
              downloadLabel="Download Daily Sales (މިއަދުގެ ސޭލްސް)"
            />
            <StatCard 
              title={t('this_month')} 
              stats={monthStats} 
              icon={BarChart3} 
              color="text-purple-500" 
              profit={monthProfit}
              onClick={() => { setDetailPeriodFilter('month'); setActiveDetailModal('month'); }}
              onDownload={handleExportMonthlySales}
              downloadLabel="Download Monthly Sales (މިމަހުގެ ސޭލްސް)"
            />
            <StatCard 
              title={t('this_year')} 
              stats={yearStats} 
              icon={PieChart} 
              color="text-green-500" 
              profit={yearProfit}
              onClick={() => { setDetailPeriodFilter('all'); setActiveDetailModal('year'); }}
              onDownload={handleExportYearlySales}
              downloadLabel="Download Yearly Sales (މިއަހަރުގެ ސޭލްސް)"
            />
          </div>

          {/* Shop Sales Breakdown & Highlights Grid (Clickable interactive cards) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                Interactive Sales Drilldown &amp; Payment Channels
              </span>
              <h3 className="text-sm font-black text-foreground flex items-center gap-1.5 font-faruma">
                <span>ސޭލްސް އަދި ވިޔަފާރީގެ ތަފްޞީލުތައް</span>
                <Sparkles className="h-4 w-4 text-primary" />
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <InteractiveKpiCard
                titleEn="Cash Sales"
                titleDv="ނަގުދު ފައިސާ"
                value={`${settings.shop.currency} ${paymentMethodStats.today.cash.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                subValue={`${paymentMethodStats.today.cash.count} transactions today • Month: ${settings.shop.currency} ${paymentMethodStats.month.cash.total.toFixed(0)}`}
                badge={`${paymentMethodStats.today.cash.count} txns`}
                icon={Wallet}
                iconColor="text-emerald-500"
                onClick={() => { setDetailPeriodFilter('today'); setActiveDetailModal('cash'); }}
              />

              <InteractiveKpiCard
                titleEn="Card Payments"
                titleDv="ކާޑު ޕޭމަންޓް"
                value={`${settings.shop.currency} ${paymentMethodStats.today.card.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                subValue={`${paymentMethodStats.today.card.count} card swipes today • Month: ${settings.shop.currency} ${paymentMethodStats.month.card.total.toFixed(0)}`}
                badge={`${paymentMethodStats.today.card.count} txns`}
                icon={CreditCard}
                iconColor="text-purple-500"
                onClick={() => { setDetailPeriodFilter('today'); setActiveDetailModal('card'); }}
              />

              <InteractiveKpiCard
                titleEn="Bank Transfer (BML Pay)"
                titleDv="ބޭންކް ޓްރާންސްފަރ"
                value={`${settings.shop.currency} ${paymentMethodStats.today.transfer.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                subValue={`${paymentMethodStats.today.transfer.count} transfers verified • Month: ${settings.shop.currency} ${paymentMethodStats.month.transfer.total.toFixed(0)}`}
                badge={`${paymentMethodStats.today.transfer.count} txns`}
                icon={Receipt}
                iconColor="text-blue-500"
                onClick={() => { setDetailPeriodFilter('today'); setActiveDetailModal('transfer'); }}
              />

              <InteractiveKpiCard
                titleEn="Credit (Customer Dharani)"
                titleDv="ދަރަންޏަށް ދޫކުރި ސޭލްސް"
                value={`${settings.shop.currency} ${paymentMethodStats.today.credit.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                subValue={`${paymentMethodStats.today.credit.count} credit invoices • Month: ${settings.shop.currency} ${paymentMethodStats.month.credit.total.toFixed(0)}`}
                badge={`${paymentMethodStats.today.credit.count} txns`}
                icon={DollarSign}
                iconColor="text-amber-500"
                onClick={() => { setDetailPeriodFilter('today'); setActiveDetailModal('credit'); }}
              />

              <InteractiveKpiCard
                titleEn="Top Selling Products"
                titleDv="އެންމެ ގިނައިން ވިކުނު ތަކެތި"
                value={productRanking.length > 0 ? (productRanking[0].name_en || productRanking[0].name_dv || 'Top Product') : 'No items sold'}
                subValue={productRanking.length > 0 ? `#1: ${productRanking[0].totalQty} sold (${settings.shop.currency} ${productRanking[0].totalRevenue.toFixed(0)})` : 'Click to view product ranking'}
                badge={`${productRanking.length} products`}
                icon={Package}
                iconColor="text-amber-400"
                onClick={() => { setDetailPeriodFilter('today'); setActiveDetailModal('top_products'); }}
              />

              <InteractiveKpiCard
                titleEn="Gross Profit & Margin"
                titleDv="ޖުމްލަ ފައިދާ އަދި މާރޖިން"
                value={`${settings.shop.currency} ${dayProfit.profit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                subValue={`${dayProfit.margin.toFixed(1)}% margin today • Cost: ${settings.shop.currency} ${dayProfit.cost.toFixed(0)}`}
                badge={`${dayProfit.margin.toFixed(0)}% Margin`}
                icon={ArrowUpRight}
                iconColor="text-emerald-400"
                onClick={() => { setDetailPeriodFilter('today'); setActiveDetailModal('profit'); }}
              />

              <InteractiveKpiCard
                titleEn="Returns & Exchanges"
                titleDv="ރިޓާން އަދި ރީފަންޑް"
                value={`${paymentMethodStats.today.returns.count} Returns`}
                subValue={`Total Refunded: ${settings.shop.currency} ${paymentMethodStats.today.returns.total.toFixed(2)} (${paymentMethodStats.month.returns.count} this month)`}
                badge={`${paymentMethodStats.today.returns.count} returned`}
                icon={RotateCcw}
                iconColor="text-orange-500"
                onClick={() => { setDetailPeriodFilter('today'); setActiveDetailModal('returns'); }}
              />

              <InteractiveKpiCard
                titleEn="MIRA 8% GST Collected"
                titleDv="ޖީއެސްޓީ ޓެކްސް"
                value={`${settings.shop.currency} ${paymentMethodStats.today.gst.totalGst.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                subValue={`Taxable: ${settings.shop.currency} ${paymentMethodStats.today.gst.taxable.toFixed(0)} • Zero: ${settings.shop.currency} ${paymentMethodStats.today.gst.zeroRated.toFixed(0)}`}
                badge={`MIRA Output GST`}
                icon={Layers}
                iconColor="text-sky-500"
                onClick={() => { setDetailPeriodFilter('today'); setActiveDetailModal('gst'); }}
              />
            </div>
          </div>

          {/* Performance Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
             <Card className="bg-card border-border rounded-[2rem] p-8">
                <CardHeader className="p-0 mb-6 flex flex-row items-center justify-between">
                   <CardTitle className="text-xl font-black text-foreground flex items-center gap-2">
                      <Activity className="h-5 w-5 text-primary" /> {renderBoth('monthly_growth')}
                   </CardTitle>
                   <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest bg-muted px-2.5 py-1 rounded-lg border border-border">
                     Last 6 Months
                   </span>
                </CardHeader>
                <div className="h-64 w-full" dir="ltr">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlyGrowthData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="growthGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.6} />
                      <XAxis 
                        dataKey="name" 
                        stroke="hsl(var(--muted-foreground))" 
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis 
                        stroke="hsl(var(--muted-foreground))" 
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => `${value >= 1000 ? `${(value/1000).toFixed(0)}k` : value}`}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Area 
                        type="monotone" 
                        dataKey="revenue" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={2.5}
                        fillOpacity={1} 
                        fill="url(#growthGradient)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
             </Card>

             <Card className="bg-card border-border rounded-[2rem] p-8">
                <CardHeader className="p-0 mb-6 flex flex-row items-center justify-between">
                   <CardTitle className="text-xl font-black text-foreground flex items-center gap-2">
                      <ShoppingBag className="h-5 w-5 text-orange-500" /> {renderBoth('key_insights')}
                   </CardTitle>
                </CardHeader>
                <div className="space-y-4">
                   <div className="p-4 bg-muted rounded-2xl border border-border flex items-center justify-between">
                      <ArrowUpRight className="h-5 w-5 text-green-500 shrink-0" />
                      <div className="text-right">
                         <p className="text-sm font-black text-foreground">{renderBoth('highest_revenue_day')}</p>
                         <p className="text-[11px] text-muted-foreground font-bold tracking-wide mt-0.5">{keyInsights.highestDayLabel}</p>
                      </div>
                   </div>
                   <div className="p-4 bg-muted rounded-2xl border border-border flex items-center justify-between">
                      <TrendingUp className="h-5 w-5 text-blue-500 shrink-0" />
                      <div className="text-right">
                         <p className="text-sm font-black text-foreground">{renderBoth('best_selling_category')}</p>
                         <p className="text-[11px] text-muted-foreground font-bold tracking-wide mt-0.5">{keyInsights.bestCategoryLabel}</p>
                      </div>
                   </div>
                   <div className="p-4 bg-muted rounded-2xl border border-border flex items-center justify-between">
                      <Activity className="h-5 w-5 text-purple-500 shrink-0" />
                      <div className="text-right">
                         <p className="text-sm font-black text-foreground">{renderBoth('average_basket_value')}</p>
                         <p className="text-[11px] text-muted-foreground font-bold tracking-wide mt-0.5">{keyInsights.avgBasketLabel}</p>
                      </div>
                   </div>
                </div>
             </Card>
          </div>
        </div>
      </ScrollArea>

      {/* ── Drill-down Detail Modal Dialog ── */}
      {activeDetailModal && (
        <Dialog open={Boolean(activeDetailModal)} onOpenChange={(open) => { if (!open) { setActiveDetailModal(null); setDetailSearchQuery(''); } }}>
          <DialogContent className="max-w-5xl max-h-[90vh] apple-glass-dialog border border-white/20 dark:border-white/10 rounded-3xl p-0 flex flex-col overflow-hidden text-foreground z-[180]">
            <DialogHeader className="p-6 pb-4 border-b border-white/15 dark:border-white/10 space-y-3">
              <div className="flex items-center justify-between gap-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => { setActiveDetailModal(null); setDetailSearchQuery(''); }}
                  className="h-8 w-8 rounded-xl border border-white/20 dark:border-white/10 hover:bg-white/10"
                >
                  <X className="h-4 w-4" />
                </Button>
                <div className="text-right flex-1">
                  <DialogTitle className="text-lg font-black text-foreground flex items-center justify-end gap-2">
                    <span>
                      {activeDetailModal === 'cash' && 'Cash Sales (ނަގުދު ފައިސާގެ ތަފްޞީލް)'}
                      {activeDetailModal === 'card' && 'Card Payments (ކާޑު ޕޭމަންޓްގެ ތަފްޞީލް)'}
                      {activeDetailModal === 'transfer' && 'Bank Transfer Sales (ބޭންކް ޓްރާންސްފަރގެ ތަފްޞީލް)'}
                      {activeDetailModal === 'credit' && 'Credit Sales (ދަރަންޏަށް ދޫކުރި ސޭލްސް)'}
                      {activeDetailModal === 'top_products' && 'Top Selling Products (އެންމެ ގިނައިން ވިކުނު ތަކެތި)'}
                      {activeDetailModal === 'profit' && 'Estimated Profit & Margins (ފައިދާ އަދި މާރޖިން)'}
                      {activeDetailModal === 'returns' && 'Returns & Refunds History (ރިޓާން އަދި ރީފަންޑް)'}
                      {activeDetailModal === 'gst' && 'MIRA 8% Output GST Statement (ޖީއެސްޓީ ޓެކްސް)'}
                      {activeDetailModal === 'today' && "Today's All Invoices (މިއަދުގެ ހުރިހާ ސޭލްސް)"}
                      {activeDetailModal === 'month' && "This Month's Invoices (މިމަހުގެ ހުރިހާ ސޭލްސް)"}
                      {activeDetailModal === 'year' && "This Year's Invoices (މިއަހަރުގެ ހުރިހާ ސޭލްސް)"}
                    </span>
                    <Sparkles className="h-5 w-5 text-primary" />
                  </DialogTitle>
                  <p className="text-xs text-muted-foreground mt-0.5" dir="ltr">
                    Detailed shop transactions, items breakdown &amp; return management
                  </p>
                </div>
              </div>

              {/* Period Filter Tabs & Search Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2" dir="ltr">
                <div className="flex bg-muted/80 p-0.5 rounded-xl border border-border">
                  {(['today', 'month', 'all'] as const).map(p => (
                    <button
                      key={p}
                      onClick={() => setDetailPeriodFilter(p)}
                      className={cn(
                        "px-3 py-1 rounded-lg text-xs font-black transition-all",
                        detailPeriodFilter === p ? "bg-primary text-white shadow-xs" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {p === 'today' ? "Today" : p === 'month' ? "This Month" : "All Time"}
                    </button>
                  ))}
                </div>

                <div className="relative flex-1 min-w-[220px] max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search invoice #, customer, or item..."
                    value={detailSearchQuery}
                    onChange={(e) => setDetailSearchQuery(e.target.value)}
                    className="h-9 pl-9 pr-8 rounded-xl apple-glass-input text-xs font-bold"
                  />
                  {detailSearchQuery && (
                    <button
                      onClick={() => setDetailSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            </DialogHeader>

            <ScrollArea className="flex-1 p-6 custom-scrollbar max-h-[60vh]">
              {activeDetailModal === 'top_products' ? (
                /* Top Products Ranking Table */
                <div>
                  {filteredProductRanking.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Package className="h-10 w-10 mx-auto mb-2 opacity-30" />
                      <p className="text-sm font-bold">No product sales found for this period</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-2xl border border-border" dir="ltr">
                      <table className="w-full text-xs min-w-[700px]">
                        <thead>
                          <tr className="bg-muted/70 border-b border-border text-muted-foreground font-black uppercase tracking-wider text-[10px]">
                            <th className="px-3 py-3 text-center w-12"># Rank</th>
                            <th className="px-3 py-3 text-left">Product Name</th>
                            <th className="px-3 py-3 text-left">Category</th>
                            <th className="px-3 py-3 text-left">Barcode / Code</th>
                            <th className="px-3 py-3 text-right">Price</th>
                            <th className="px-3 py-3 text-right">Cost</th>
                            <th className="px-3 py-3 text-center">Qty Sold</th>
                            <th className="px-3 py-3 text-right">Total Revenue</th>
                            <th className="px-3 py-3 text-right">Est. Profit</th>
                            <th className="px-3 py-3 text-right">Margin</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {filteredProductRanking.map((p, idx) => {
                            const marginPct = p.totalRevenue > 0 ? ((p.totalProfit / p.totalRevenue) * 100) : 0;
                            return (
                              <tr key={p.id + idx} className="hover:bg-muted/40 transition-colors">
                                <td className="px-3 py-2.5 text-center font-mono font-black text-primary">
                                  #{idx + 1}
                                </td>
                                <td className="px-3 py-2.5">
                                  <p className="font-black text-foreground truncate max-w-[180px]">{p.name_en || p.nameEn}</p>
                                  {p.nameDv && <p className="text-[11px] font-bold text-muted-foreground font-faruma" dir="rtl">{p.nameDv}</p>}
                                </td>
                                <td className="px-3 py-2.5">
                                  <Badge variant="outline" className="text-[9px] font-black uppercase tracking-wider bg-primary/10 text-primary border-primary/20">
                                    {p.category}
                                  </Badge>
                                </td>
                                <td className="px-3 py-2.5 font-mono text-[11px] text-muted-foreground">
                                  {p.barcode || p.itemCode || '—'}
                                </td>
                                <td className="px-3 py-2.5 text-right font-mono font-bold">
                                  {settings.shop.currency} {p.price.toFixed(2)}
                                </td>
                                <td className="px-3 py-2.5 text-right font-mono text-muted-foreground">
                                  {p.costPrice > 0 ? `${settings.shop.currency} ${p.costPrice.toFixed(2)}` : '—'}
                                </td>
                                <td className="px-3 py-2.5 text-center font-mono font-black text-sm text-foreground">
                                  {p.totalQty}
                                </td>
                                <td className="px-3 py-2.5 text-right font-mono font-black text-sm text-primary">
                                  {settings.shop.currency} {p.totalRevenue.toFixed(2)}
                                </td>
                                <td className="px-3 py-2.5 text-right font-mono font-black text-xs text-emerald-500">
                                  {settings.shop.currency} {p.totalProfit.toFixed(2)}
                                </td>
                                <td className="px-3 py-2.5 text-right font-mono font-black text-xs">
                                  <span className={cn(
                                    "px-1.5 py-0.5 rounded",
                                    marginPct >= 30 ? "bg-emerald-500/15 text-emerald-500" : marginPct > 0 ? "bg-amber-500/15 text-amber-500" : "text-muted-foreground"
                                  )}>
                                    {marginPct.toFixed(1)}%
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot>
                          <tr className="bg-muted/80 border-t-2 border-border font-black text-xs">
                            <td colSpan={6} className="px-3 py-3 text-right uppercase tracking-wider">Total Ranking Summary</td>
                            <td className="px-3 py-3 text-center font-mono">{filteredProductRanking.reduce((sum, p) => sum + p.totalQty, 0)} pcs</td>
                            <td className="px-3 py-3 text-right font-mono text-primary">
                              {settings.shop.currency} {filteredProductRanking.reduce((sum, p) => sum + p.totalRevenue, 0).toFixed(2)}
                            </td>
                            <td className="px-3 py-3 text-right font-mono text-emerald-500">
                              {settings.shop.currency} {filteredProductRanking.reduce((sum, p) => sum + p.totalProfit, 0).toFixed(2)}
                            </td>
                            <td></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </div>
              ) : (
                /* Standard Invoices / Transactions Table */
                <div>
                  {filteredDrilldownSales.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Receipt className="h-10 w-10 mx-auto mb-2 opacity-30" />
                      <p className="text-sm font-bold">No transactions found for this period</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-2xl border border-border" dir="ltr">
                      <table className="w-full text-xs min-w-[700px]">
                        <thead>
                          <tr className="bg-muted/70 border-b border-border text-muted-foreground font-black uppercase tracking-wider text-[10px]">
                            <th className="px-3 py-3 text-left">Invoice #</th>
                            <th className="px-3 py-3 text-left">Date / Time</th>
                            <th className="px-3 py-3 text-left">Customer</th>
                            <th className="px-3 py-3 text-left">Method</th>
                            <th className="px-3 py-3 text-left">Items Sold</th>
                            <th className="px-3 py-3 text-right">Subtotal</th>
                            <th className="px-3 py-3 text-right">GST (8%)</th>
                            <th className="px-3 py-3 text-right">Grand Total</th>
                            <th className="px-3 py-3 text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {filteredDrilldownSales.map((sale) => {
                            const sub = num(sale.grandTotal) / (1 + (Number(settings.shop.taxRate || 8) / 100));
                            const gst = num(sale.grandTotal) - sub;
                            const itemsSummary = (sale.items || []).map(i => `${i.qty}× ${i.name_en || i.name_dv || 'Item'}`).join(', ');
                            const customerName = sale.customer ? (sale.customer.name_en || sale.customer.name_dv) : 'Walk-in';
                            const method = (sale.paymentMethod || 'cash').toLowerCase();
                            const isReturnRecord = (sale.paymentMethod as any) === 'return' || String(sale.invoiceNumber || '').startsWith('RET-');

                            return (
                              <tr key={sale.id} className={cn("hover:bg-muted/40 transition-colors", isReturnRecord && "bg-orange-500/5")}>
                                <td className="px-3 py-2.5 font-mono font-bold text-foreground">
                                  {sale.invoiceNumber || sale.id.slice(-8)}
                                </td>
                                <td className="px-3 py-2.5 whitespace-nowrap">
                                  <p className="font-bold">{formatDate(sale.date)}</p>
                                  <p className="text-[10px] text-muted-foreground">{formatTime(sale.date)}</p>
                                </td>
                                <td className="px-3 py-2.5 font-bold truncate max-w-[130px]">
                                  {customerName}
                                </td>
                                <td className="px-3 py-2.5">
                                  <Badge variant="outline" className={cn(
                                    "text-[9px] font-black uppercase tracking-wider px-2 py-0.5",
                                    method === 'cash' ? "bg-emerald-500/15 text-emerald-500 border-emerald-500/30" :
                                    method === 'card' ? "bg-purple-500/15 text-purple-500 border-purple-500/30" :
                                    method === 'transfer' ? "bg-blue-500/15 text-blue-500 border-blue-500/30" :
                                    method === 'credit' ? "bg-amber-500/15 text-amber-500 border-amber-500/30" :
                                    isReturnRecord ? "bg-orange-500/15 text-orange-500 border-orange-500/30" : "bg-muted text-muted-foreground"
                                  )}>
                                    {(sale.paymentMethod || 'CASH').toUpperCase()}
                                  </Badge>
                                </td>
                                <td className="px-3 py-2.5 text-muted-foreground max-w-[200px] truncate" title={itemsSummary}>
                                  {itemsSummary || '—'}
                                </td>
                                <td className="px-3 py-2.5 text-right font-mono text-muted-foreground">
                                  {settings.shop.currency} {sub.toFixed(2)}
                                </td>
                                <td className="px-3 py-2.5 text-right font-mono text-muted-foreground">
                                  {settings.shop.currency} {gst.toFixed(2)}
                                </td>
                                <td className="px-3 py-2.5 text-right font-mono font-black text-sm text-foreground">
                                  {settings.shop.currency} {num(sale.grandTotal).toFixed(2)}
                                </td>
                                <td className="px-3 py-2.5 text-center">
                                  {!isReturnRecord && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => openReturnDialog(sale)}
                                      className="h-7 px-2 rounded-lg text-[10px] font-black text-orange-500 hover:bg-orange-500/15 gap-1"
                                      title="Process return or exchange for this invoice"
                                    >
                                      <Undo2 className="h-3 w-3" />
                                      <span>Return</span>
                                    </Button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot>
                          <tr className="bg-muted/80 border-t-2 border-border font-black text-xs">
                            <td colSpan={5} className="px-3 py-3 text-right uppercase tracking-wider">
                              Total ({filteredDrilldownSales.length} transactions)
                            </td>
                            <td className="px-3 py-3 text-right font-mono text-muted-foreground">
                              {settings.shop.currency} {filteredDrilldownSales.reduce((sum, s) => sum + (num(s.grandTotal) / (1 + (Number(settings.shop.taxRate || 8) / 100))), 0).toFixed(2)}
                            </td>
                            <td className="px-3 py-3 text-right font-mono text-muted-foreground">
                              {settings.shop.currency} {filteredDrilldownSales.reduce((sum, s) => {
                                const sub = num(s.grandTotal) / (1 + (Number(settings.shop.taxRate || 8) / 100));
                                return sum + (num(s.grandTotal) - sub);
                              }, 0).toFixed(2)}
                            </td>
                            <td className="px-3 py-3 text-right font-mono text-primary text-sm">
                              {settings.shop.currency} {filteredDrilldownSales.reduce((sum, s) => sum + num(s.grandTotal), 0).toFixed(2)}
                            </td>
                            <td></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>

            {/* Modal Footer with quick export */}
            <div className="p-4 px-6 border-t border-white/15 dark:border-white/10 flex items-center justify-between gap-4 bg-muted/40" dir="ltr">
              <span className="text-xs font-bold text-muted-foreground">
                Showing {activeDetailModal === 'top_products' ? filteredProductRanking.length : filteredDrilldownSales.length} items
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (activeDetailModal === 'top_products') {
                      const data = [
                        ['Rank', 'Product Name', 'Category', 'Barcode / Code', 'Price', 'Cost', 'Qty Sold', 'Total Revenue', 'Est. Profit', 'Margin %'],
                        ...filteredProductRanking.map((p, idx) => [
                          idx + 1,
                          p.name_en || p.nameEn,
                          p.category,
                          p.barcode || p.itemCode,
                          p.price,
                          p.costPrice,
                          p.totalQty,
                          p.totalRevenue,
                          p.totalProfit,
                          p.totalRevenue > 0 ? ((p.totalProfit / p.totalRevenue) * 100).toFixed(1) + '%' : '0%'
                        ])
                      ];
                      const ws = XLSX.utils.aoa_to_sheet(data);
                      const wb = XLSX.utils.book_new();
                      XLSX.utils.book_append_sheet(wb, ws, 'Top Products');
                      XLSX.writeFile(wb, `Top_Products_Report_${toISODate(new Date())}.xlsx`);
                      showSuccess('Top Products Excel report downloaded!');
                    } else {
                      const data = [
                        ['Invoice', 'Date', 'Time', 'Customer', 'Method', 'Items', 'Subtotal', 'GST', 'Grand Total'],
                        ...filteredDrilldownSales.map(s => {
                          const sub = num(s.grandTotal) / (1 + (Number(settings.shop.taxRate || 8) / 100));
                          const gst = num(s.grandTotal) - sub;
                          return [
                            s.invoiceNumber || s.id,
                            formatDate(s.date),
                            formatTime(s.date),
                            s.customer ? (s.customer.name_en || s.customer.name_dv) : 'Walk-in',
                            (s.paymentMethod || 'CASH').toUpperCase(),
                            (s.items || []).map(i => `${i.qty}x ${i.name_en || i.name_dv}`).join('; '),
                            Number(sub.toFixed(2)),
                            Number(gst.toFixed(2)),
                            Number(num(s.grandTotal).toFixed(2))
                          ];
                        })
                      ];
                      const ws = XLSX.utils.aoa_to_sheet(data);
                      const wb = XLSX.utils.book_new();
                      XLSX.utils.book_append_sheet(wb, ws, 'Sales Invoices');
                      XLSX.writeFile(wb, `Sales_Drilldown_${activeDetailModal}_${toISODate(new Date())}.xlsx`);
                      showSuccess('Sales drilldown Excel report downloaded!');
                    }
                  }}
                  className="rounded-xl text-xs font-black gap-1.5 h-9"
                >
                  <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
                  <span>Download Excel</span>
                </Button>
                <Button
                  onClick={() => { setActiveDetailModal(null); setDetailSearchQuery(''); }}
                  className="rounded-xl text-xs font-black h-9 px-4 bg-primary text-white"
                >
                  Close
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Return Sale Dialog */}
      {returnSale && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/40 dark:bg-black/60 backdrop-blur-md p-4 animate-in fade-in"
          onClick={(e) => { if (e.target === e.currentTarget) setReturnSale(null); }}
        >
          <div className="w-full max-w-lg apple-glass-dialog border border-orange-500/30 rounded-3xl p-6 shadow-2xl space-y-5 text-foreground animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/15 dark:border-white/10 pb-3">
              <button type="button" onClick={() => setReturnSale(null)} className="h-8 w-8 rounded-xl border border-white/20 dark:border-white/10 bg-white/10 hover:bg-white/20 text-foreground flex items-center justify-center">
                <X className="h-4 w-4" />
              </button>
              <div className="text-right">
                <div className="flex items-center justify-end gap-2 mb-0.5">
                  <h3 className="text-base font-black text-foreground">Process Return</h3>
                  <Undo2 className="h-5 w-5 text-orange-500" />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Invoice: {returnSale.invoiceNumber || returnSale.id.slice(-8)} •{' '}
                  {(returnSale.paymentMethod || 'cash').toUpperCase()} •{' '}
                  {settings.shop.currency} {Number(returnSale.grandTotal).toFixed(2)}
                </p>
              </div>
            </div>

            {/* Items List */}
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
              <p className="text-[11px] font-black uppercase text-muted-foreground">Select quantities to return:</p>
              {(returnSale.items || []).map(item => (
                <div key={item.id} className="flex items-center justify-between gap-4 p-3 apple-glass-card rounded-2xl border border-white/20 dark:border-white/10">
                  <div className="flex-1 min-w-0 text-right">
                    <p className="font-black text-sm text-foreground line-clamp-1">{item.name_dv || item.name_en || 'Item'}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">
                      Sold: {item.qty} × {settings.shop.currency} {Number(item.price || 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <label className="text-[10px] font-black text-muted-foreground uppercase">Qty Return:</label>
                    <input
                      type="number"
                      min="0"
                      max={item.qty}
                      step="1"
                      value={returnQtys[item.id] ?? 0}
                      onChange={(e) => {
                        const v = Math.min(Number(e.target.value) || 0, item.qty);
                        setReturnQtys(prev => ({ ...prev, [item.id]: v }));
                      }}
                      onFocus={(e) => e.target.select()}
                      className="w-16 h-9 text-center font-black font-mono text-sm apple-glass-input rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Refund Summary */}
            {(() => {
              const refundTotal = (returnSale.items || []).reduce((sum, item) => {
                const qty = returnQtys[item.id] || 0;
                return sum + qty * Number(item.price || 0);
              }, 0);
              return refundTotal > 0 ? (
                <div className="p-3 bg-orange-500/15 border border-orange-500/30 rounded-2xl flex items-center justify-between">
                  <span className="font-mono font-black text-orange-500 text-lg">{settings.shop.currency} {refundTotal.toFixed(2)}</span>
                  <span className="text-sm font-black text-foreground">Refund Total</span>
                </div>
              ) : (
                <div className="p-3 apple-glass-card rounded-2xl text-center text-xs text-muted-foreground font-bold">
                  Enter return quantities above
                </div>
              );
            })()}

            {/* Info note for credit */}
            {(returnSale.paymentMethod || '').toLowerCase() === 'credit' && (
              <p className="text-[11px] text-amber-500 font-bold text-right">
                ⚠ Credit sale — customer's outstanding balance will be reduced by the refund amount.
              </p>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button type="button" onClick={() => setReturnSale(null)}
                className="flex-1 h-11 rounded-2xl border border-white/20 dark:border-white/10 hover:bg-white/10 text-foreground font-bold text-xs transition-all">
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReturn}
                disabled={isProcessingReturn || Object.values(returnQtys).every(v => v === 0)}
                className="flex-1 h-11 rounded-2xl bg-orange-500 hover:bg-orange-500/90 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <Undo2 className="h-4 w-4" />
                {isProcessingReturn ? 'Processing...' : 'Confirm Return'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesReports;