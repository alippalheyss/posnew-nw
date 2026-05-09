"use client";

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useAppContext } from '@/context/AppContext';
import { TrendingUp, BarChart3, PieChart, Calendar, DollarSign, Activity, ShoppingBag, ArrowUpRight, ArrowDownRight, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

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

    const total = filtered.reduce((sum, sale) => sum + sale.grandTotal, 0);
    return { total, count: filtered.length, items: filtered };
  };

  const calculateProfitForPeriod = (period: 'day' | 'month' | 'year') => {
    const filtered = calculateSalesForPeriod(period).items;

    let totalRevenue = 0;
    let totalCost = 0;

    filtered.forEach(sale => {
      sale.items.forEach(item => {
        const product = products.find(p => p.id === item.id);
        if (product) {
          const revenue = item.price * item.qty;
          const cost = (product.cost_price || 0) * item.qty;

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

  const renderBoth = (key: string, options?: any) => (
    <>
      {t(key, options)} ({t(key, { ...options, lng: 'en' })})
    </>
  );

  const StatCard = ({ title, stats, icon: Icon, color, profit }: any) => (
    <Card className="bg-[#0a0a1a] border-white/5 hover:border-primary/30 transition-all rounded-[2rem] overflow-hidden group">
      <CardContent className="p-6 text-right">
        <div className="flex justify-between items-center mb-6">
          <div className={cn("p-3 rounded-2xl bg-white/5 border border-white/10 group-hover:scale-110 transition-transform", color)}>
            <Icon className="h-6 w-6" />
          </div>
          <p className="text-white/40 text-[10px] font-black uppercase tracking-widest">{title}</p>
        </div>
        
        <div className="space-y-1 mb-6">
           <p className="text-3xl font-black text-white">
             {settings.shop.currency} {stats.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
           </p>
           <div className="flex items-center justify-end gap-2">
              <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">{stats.count} TRANSACTIONS</span>
              <Activity className="h-3 w-3 text-white/10" />
           </div>
        </div>

        {profit && (
          <div className="pt-4 border-t border-white/5 flex justify-between items-center">
             <div className="flex items-center gap-1 text-green-500">
                <ArrowUpRight className="h-3 w-3" />
                <span className="text-[10px] font-black">{profit.margin.toFixed(1)}% MARGIN</span>
             </div>
             <div className="text-right">
                <p className="text-[8px] font-black text-white/20 uppercase tracking-widest">EST. PROFIT</p>
                <p className="text-sm font-black text-white">{settings.shop.currency} {profit.profit.toLocaleString()}</p>
             </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="p-6 font-faruma flex flex-col h-full bg-[#050510] text-white overflow-hidden" dir="rtl">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div className="text-right">
           <h1 className="text-3xl font-black text-white flex items-center justify-end gap-3">
             {renderBoth('sales_reports')} <BarChart3 className="h-8 w-8 text-primary" />
           </h1>
           <p className="text-sm text-white/40 mt-1">{renderBoth('sales_reports_description')}</p>
        </div>
      </div>

      <ScrollArea className="flex-1 custom-scrollbar">
        <div className="space-y-8 pb-6">
          {/* Main Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard title={t('today_sales')} stats={dayStats} icon={TrendingUp} color="text-primary" profit={dayProfit} />
            <StatCard title={t('this_month')} stats={monthStats} icon={BarChart3} color="text-purple-500" profit={monthProfit} />
            <StatCard title={t('this_year')} stats={yearStats} icon={PieChart} color="text-green-500" />
          </div>

          {/* Performance Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
             <Card className="bg-[#0a0a1a] border-white/5 rounded-[2rem] p-8">
                <CardHeader className="p-0 mb-6 flex flex-row items-center justify-between">
                   <CardTitle className="text-xl font-black text-white flex items-center gap-2">
                      <Activity className="h-5 w-5 text-primary" /> Monthly Growth
                   </CardTitle>
                </CardHeader>
                <div className="h-60 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-3xl bg-white/5">
                   <p className="text-white/20 font-black uppercase tracking-widest">Chart Visualisation Placeholder</p>
                   <p className="text-[10px] text-white/10 mt-2 font-bold">UPGRADE TO PRO FOR ADVANCED ANALYTICS</p>
                </div>
             </Card>

             <Card className="bg-[#0a0a1a] border-white/5 rounded-[2rem] p-8">
                <CardHeader className="p-0 mb-6 flex flex-row items-center justify-between">
                   <CardTitle className="text-xl font-black text-white flex items-center gap-2">
                      <ShoppingBag className="h-5 w-5 text-orange-500" /> Key Insights
                   </CardTitle>
                </CardHeader>
                <div className="space-y-4">
                   <div className="p-4 bg-white/5 rounded-2xl border border-white/5 flex items-center justify-between">
                      <ArrowUpRight className="h-5 w-5 text-green-500" />
                      <div className="text-right">
                         <p className="text-sm font-black text-white">Highest Revenue Day</p>
                         <p className="text-[10px] text-white/40 uppercase font-bold tracking-widest">Saturday, May 3rd</p>
                      </div>
                   </div>
                   <div className="p-4 bg-white/5 rounded-2xl border border-white/5 flex items-center justify-between">
                      <TrendingUp className="h-5 w-5 text-blue-500" />
                      <div className="text-right">
                         <p className="text-sm font-black text-white">Best Selling Category</p>
                         <p className="text-[10px] text-white/40 uppercase font-bold tracking-widest">Soft Drinks & Beverages</p>
                      </div>
                   </div>
                   <div className="p-4 bg-white/5 rounded-2xl border border-white/5 flex items-center justify-between">
                      <Activity className="h-5 w-5 text-purple-500" />
                      <div className="text-right">
                         <p className="text-sm font-black text-white">Average Basket Value</p>
                         <p className="text-[10px] text-white/40 uppercase font-bold tracking-widest">{settings.shop.currency} 45.50</p>
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