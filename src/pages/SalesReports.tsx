"use client";

import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAppContext } from '@/context/AppContext';
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
  Calendar
} from 'lucide-react';
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
  const { sales, settings, products } = useAppContext();

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

  const StatCard = ({ title, stats, icon: Icon, color, profit, onDownload, downloadLabel }: any) => (
    <Card className="bg-card border-border hover:border-primary/40 transition-all rounded-[2rem] overflow-hidden group flex flex-col justify-between shadow-sm">
      <CardContent className="p-6 text-right flex-1 flex flex-col justify-between">
        <div>
          <div className="flex justify-between items-center mb-6">
            <div className={cn("p-3 rounded-2xl bg-muted border border-border group-hover:scale-110 transition-transform", color)}>
              <Icon className="h-6 w-6" />
            </div>
            <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest">{title}</p>
          </div>
          
          <div className="space-y-1 mb-6">
             <p className="text-3xl font-black text-foreground">
               {settings.shop.currency} {stats.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
             </p>
             <div className="flex items-center justify-end gap-2">
                <span className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest">{stats.count} TRANSACTIONS</span>
                <Activity className="h-3 w-3 text-foreground/10" />
             </div>
          </div>

          {profit && (
            <div className="pt-4 border-t border-border flex justify-between items-center mb-4">
               <div className="flex items-center gap-1 text-green-500">
                  <ArrowUpRight className="h-3 w-3" />
                  <span className="text-[10px] font-black">{profit.margin.toFixed(1)}% MARGIN</span>
               </div>
               <div className="text-right">
                  <p className="text-[8px] font-black text-muted-foreground/50 uppercase tracking-widest">EST. PROFIT</p>
                  <p className="text-sm font-black text-foreground">{settings.shop.currency} {profit.profit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
               </div>
            </div>
          )}
        </div>

        {onDownload && (
          <Button
            variant="outline"
            size="sm"
            onClick={onDownload}
            className="w-full mt-2 h-9 rounded-xl border-border/80 bg-muted/50 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all text-xs font-bold gap-2 flex items-center justify-center group/btn shadow-xs"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-500 group-hover/btn:text-primary-foreground transition-colors" />
            <span>{downloadLabel || "Download Excel (އެކްސެލް ޑައުންލޯޑް)"}</span>
          </Button>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="p-6 font-faruma flex flex-col h-full bg-background text-foreground overflow-hidden" dir="rtl">
      {/* Header with quick download action buttons */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div className="text-right">
           <h1 className="text-3xl font-black text-foreground flex items-center justify-end gap-3">
             {renderBoth('sales_reports')} <BarChart3 className="h-8 w-8 text-primary" />
           </h1>
           <p className="text-sm text-muted-foreground mt-1">{renderBoth('sales_reports_description')}</p>
        </div>

        {/* Action Buttons for downloading daily, monthly, yearly sales */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportDailySales}
            className="rounded-xl border-border/80 bg-card hover:bg-primary hover:text-primary-foreground transition-all text-xs font-black gap-2 shadow-xs h-9 px-3.5"
          >
            <FileSpreadsheet className="h-4 w-4 text-primary" />
            <span>Daily Sales Excel (މިއަދު)</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportMonthlySales}
            className="rounded-xl border-border/80 bg-card hover:bg-purple-600 hover:text-white transition-all text-xs font-black gap-2 shadow-xs h-9 px-3.5"
          >
            <FileSpreadsheet className="h-4 w-4 text-purple-500" />
            <span>Monthly Sales Excel (މިމަސް)</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportYearlySales}
            className="rounded-xl border-border/80 bg-card hover:bg-emerald-600 hover:text-white transition-all text-xs font-black gap-2 shadow-xs h-9 px-3.5"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
            <span>Yearly Sales Excel (މިއަހަރު)</span>
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 custom-scrollbar">
        <div className="space-y-8 pb-6">
          {/* Main Stats with direct Download buttons */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard 
              title={t('today_sales')} 
              stats={dayStats} 
              icon={TrendingUp} 
              color="text-primary" 
              profit={dayProfit}
              onDownload={handleExportDailySales}
              downloadLabel="Download Daily Sales (މިއަދުގެ ސޭލްސް)"
            />
            <StatCard 
              title={t('this_month')} 
              stats={monthStats} 
              icon={BarChart3} 
              color="text-purple-500" 
              profit={monthProfit}
              onDownload={handleExportMonthlySales}
              downloadLabel="Download Monthly Sales (މިމަހުގެ ސޭލްސް)"
            />
            <StatCard 
              title={t('this_year')} 
              stats={yearStats} 
              icon={PieChart} 
              color="text-green-500" 
              profit={yearProfit}
              onDownload={handleExportYearlySales}
              downloadLabel="Download Yearly Sales (މިއަހަރުގެ ސޭލްސް)"
            />
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
    </div>
  );
};

export default SalesReports;