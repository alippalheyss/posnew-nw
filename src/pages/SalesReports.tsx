"use client";

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useAppContext } from '@/context/AppContext';
import { TrendingUp, BarChart3, PieChart, Calendar, DollarSign } from 'lucide-react';

const SalesReports = () => {
  const { t } = useTranslation();
  const { sales, settings, products } = useAppContext();

  const calculateSalesForPeriod = (period: 'day' | 'month' | 'year') => {
    const today = new Date();
    const filtered = sales.filter(sale => {
      const saleDate = new Date(sale.date);
      if (period === 'day') return saleDate.toDateString() === today.toDateString();
      if (period === 'month') return saleDate.getMonth() === today.getMonth() && saleDate.getFullYear() === today.getFullYear();
      if (period === 'year') return saleDate.getFullYear() === today.getFullYear();
      return false;
    });

    const total = filtered.reduce((sum, sale) => sum + (parseFloat(sale.grandTotal as any) || 0), 0);
    return { total, count: filtered.length, items: filtered };
  };

  // Calculate profit for period
  const calculateProfitForPeriod = (period: 'day' | 'month' | 'year') => {
    const filtered = calculateSalesForPeriod(period).items;

    let totalRevenue = 0;
    let totalCost = 0;

    filtered.forEach(sale => {
      sale.items.forEach(item => {
        const product = products.find(p => p.id === item.id);
        const price = parseFloat(item.price as any) || 0;
        const qty = parseFloat(item.qty as any) || 0;
        const productCost = parseFloat(product?.cost_price as any) || 0;

        const revenue = price * qty;
        const cost = productCost * qty;

        totalRevenue += revenue;
        totalCost += cost;
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

  const renderBoth = (key: string, options?: any) => (
    <>
      {t(key, options)} ({t(key, { ...options, lng: 'en' })})
    </>
  );

  const StatCard = ({ title, stats, icon: Icon }: any) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6 text-right">
        <div className="flex justify-between items-center mb-4">
          <div className="bg-primary/10 p-2 rounded-full">
            <Icon className="h-6 w-6 text-primary" />
          </div>
          <p className="text-gray-500 text-sm font-bold">{title}</p>
        </div>
        <p className="text-3xl font-black text-gray-900 dark:text-white">
          {settings.shop.currency} {stats.total.toFixed(2)}
        </p>
        <div className="mt-2 flex justify-between text-xs text-gray-500 font-semibold border-t pt-2">
          <span>{stats.count} {t('sales')}</span>
          <span>{t('revenue')}</span>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="p-4 font-faruma flex flex-col h-full bg-gray-50/50 dark:bg-gray-900/50" dir="rtl">
      <div className="mb-6 text-right">
        <h1 className="text-2xl font-black text-gray-900 dark:text-white mb-1">{renderBoth('sales_reports')}</h1>
        <p className="text-gray-500">{renderBoth('sales_reports_description')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title={t('today_sales')} stats={dayStats} icon={TrendingUp} />
        <StatCard title={t('this_month')} stats={monthStats} icon={BarChart3} />
        <StatCard title={t('this_year')} stats={yearStats} icon={PieChart} />
      </div>

      {/* Profit Analysis Card */}
      <Card className="mt-6 border-none shadow-sm border-r-4 border-r-green-500">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="p-2 bg-green-50 rounded-full text-green-600"><DollarSign className="h-4 w-4" /></div>
          <CardTitle className="text-right text-lg">{t('profit_analysis')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-right p-4 bg-blue-50 rounded-lg">
              <p className="text-xs text-gray-600 mb-1 font-bold uppercase">{t('total_revenue')}</p>
              <p className="text-2xl font-black text-blue-600">{settings.shop.currency} {calculateProfitForPeriod('month').revenue.toFixed(2)}</p>
            </div>
            <div className="text-right p-4 bg-red-50 rounded-lg">
              <p className="text-xs text-gray-600 mb-1 font-bold uppercase">{t('total_cost')}</p>
              <p className="text-2xl font-black text-red-600">{settings.shop.currency} {calculateProfitForPeriod('month').cost.toFixed(2)}</p>
            </div>
            <div className="text-right p-4 bg-green-50 rounded-lg">
              <p className="text-xs text-gray-600 mb-1 font-bold uppercase">{t('gross_profit')}</p>
              <p className="text-2xl font-black text-green-600">{settings.shop.currency} {calculateProfitForPeriod('month').profit.toFixed(2)}</p>
            </div>
            <div className="text-right p-4 bg-purple-50 rounded-lg">
              <p className="text-xs text-gray-600 mb-1 font-bold uppercase">{t('profit_margin')}</p>
              <p className="text-2xl font-black text-purple-600">{calculateProfitForPeriod('month').margin.toFixed(2)}%</p>
            </div>
          </div>
          <div className="mt-4 text-right text-xs text-gray-500 italic">
            {t('profit_calculation_note')}
          </div>
        </CardContent>
      </Card>

      <Card className="mt-8 flex-1">
        <CardHeader className="border-b">
          <CardTitle className="text-right text-lg">{t('performance_overview')}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-x-reverse border-b">
            <div className="p-6 text-center">
              <p className="text-xs text-gray-500 mb-1 font-bold uppercase">{t('avg_sale')}</p>
              <p className="text-xl font-black">{settings.shop.currency} {(dayStats.total / (dayStats.count || 1)).toFixed(2)}</p>
            </div>
            <div className="p-6 text-center">
              <p className="text-xs text-gray-500 mb-1 font-bold uppercase">{t('transactions')}</p>
              <p className="text-xl font-black">{monthStats.count}</p>
            </div>
            <div className="p-6 text-center">
              <p className="text-xs text-gray-500 mb-1 font-bold uppercase">{t('revenue')}</p>
              <p className="text-xl font-black">{settings.shop.currency} {monthStats.total.toFixed(2)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SalesReports;