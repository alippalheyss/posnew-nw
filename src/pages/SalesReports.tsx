"use client";

import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useAppContext } from '@/context/AppContext';
import { TrendingUp, BarChart3, PieChart, Calendar, DollarSign, Activity, ShoppingBag, ArrowUpRight, ArrowDownRight, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
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

  const calculateSalesForPeriod = (period: 'day' | 'month' | 'year') => {
    const today = new Date();
    const filtered = sales.filter(sale => {
      const saleDate = new Date(sale.date);
      if (period === 'day') return saleDate.toDateString() === today.toDateString();
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

  const StatCard = ({ title, stats, icon: Icon, color, profit }: any) => (
    <Card className="bg-card border-border hover:border-primary/30 transition-all rounded-[2rem] overflow-hidden group">
      <CardContent className="p-6 text-right">
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
          <div className="pt-4 border-t border-border flex justify-between items-center">
             <div className="flex items-center gap-1 text-green-500">
                <ArrowUpRight className="h-3 w-3" />
                <span className="text-[10px] font-black">{profit.margin.toFixed(1)}% MARGIN</span>
             </div>
             <div className="text-right">
                <p className="text-[8px] font-black text-muted-foreground/50 uppercase tracking-widest">EST. PROFIT</p>
                <p className="text-sm font-black text-foreground">{settings.shop.currency} {profit.profit.toLocaleString()}</p>
             </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="p-6 font-faruma flex flex-col h-full bg-background text-foreground overflow-hidden" dir="rtl">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div className="text-right">
           <h1 className="text-3xl font-black text-foreground flex items-center justify-end gap-3">
             {renderBoth('sales_reports')} <BarChart3 className="h-8 w-8 text-primary" />
           </h1>
           <p className="text-sm text-muted-foreground mt-1">{renderBoth('sales_reports_description')}</p>
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