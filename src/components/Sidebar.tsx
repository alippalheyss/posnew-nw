"use client";

import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Home, Package, Boxes, Users, DollarSign, Settings, BarChart, 
  Receipt, CalendarDays, AlertTriangle, Building2, LogOut, FileText, ChevronRight, ChevronLeft, Activity, Pin, PinOff
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { useAppContext } from '@/context/AppContext';
import { Button } from './ui/button';

const Sidebar = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const { can } = usePermissions();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const allNavItems = [
    { name_dv: t('pos_title'), name_en: t('pos_title', { lng: 'en' }), icon: Home, path: '/', permission: 'canAccessPOS' as const },
    { name_dv: t('products'), name_en: t('products', { lng: 'en' }), icon: Package, path: '/products', permission: 'canAccessProducts' as const },
    { name_dv: t('stock'), name_en: t('stock', { lng: 'en' }), icon: Boxes, path: '/stock', permission: 'canAccessStock' as const },
    { name_dv: t('customers'), name_en: t('customers', { lng: 'en' }), icon: Users, path: '/customers', permission: 'canAccessCustomers' as const },
    { name_dv: t('vendors'), name_en: t('vendors', { lng: 'en' }), icon: Building2, path: '/vendors', permission: 'canAccessAdmin' as const },
    { name_dv: t('credit_outstanding'), name_en: t('credit_outstanding', { lng: 'en' }), icon: DollarSign, path: '/credit-outstanding', permission: 'canAccessSales' as const },
    { name_dv: t('daily_sales'), name_en: t('daily_sales', { lng: 'en' }), icon: CalendarDays, path: '/daily-sales', permission: 'canAccessSales' as const },
    { name_dv: t('credit_invoices'), name_en: t('credit_invoices', { lng: 'en' }), icon: Receipt, path: '/credit-invoices', permission: 'canAccessSales' as const },
    { name_dv: t('sales_reports'), name_en: t('sales_reports', { lng: 'en' }), icon: BarChart, path: '/sales-reports', permission: 'canAccessReports' as const },
    { name_dv: t('expiry_alerts'), name_en: t('expiry_alerts', { lng: 'en' }), icon: AlertTriangle, path: '/expiry-alerts', permission: 'canAccessStock' as const },
    { name_dv: "Shrinkage Report", name_en: "Shrinkage Report", icon: FileText, path: '/shrinkage-report', permission: 'canAccessReports' as const },
    { name_dv: t('gst_reports'), name_en: t('gst_reports', { lng: 'en' }), icon: Receipt, path: '/gst-reports', permission: 'canAccessReports' as const },
    { name_dv: t('admin_settings'), name_en: t('admin_settings', { lng: 'en' }), icon: Settings, path: '/admin', permission: 'canAccessAdmin' as const },
  ];

  const { sidebarCollapsed, setSidebarCollapsed } = useAppContext();
  const navItems = allNavItems.filter(item => can(item.permission));

  return (
    <>
      <div className={cn("flex-shrink-0 transition-all duration-300 hidden md:block", sidebarCollapsed ? "w-0" : "w-[280px]")} />
      <div className={cn(
        "flex flex-col h-screen border-l font-faruma overflow-hidden z-[100] transition-all duration-300 group/sidebar shadow-[-20px_0_50px_rgba(0,0,0,0.5)] bg-background border-border fixed right-0 top-0 bottom-0",
        sidebarCollapsed 
          ? "w-20 hover:w-[280px]" 
          : "w-[280px]"
      )}>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className={cn(
            "absolute top-6 left-6 z-[110] transition-all h-8 w-8 bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground rounded-lg border border-border",
            sidebarCollapsed ? "opacity-0 group-hover/sidebar:opacity-100" : "opacity-100"
          )}
        >
          {sidebarCollapsed ? <Pin className="h-4 w-4" /> : <PinOff className="h-4 w-4" />}
        </Button>
      {/* Branding */}
      <div className={cn("p-8 pb-10 transition-all duration-300", sidebarCollapsed ? "opacity-0 group-hover/sidebar:opacity-100 px-8" : "opacity-100")}>
        <div className="flex items-center gap-4 mb-2">
          <div className="w-12 h-12 flex-shrink-0 bg-primary rounded-[1rem] flex items-center justify-center shadow-[0_0_30px_rgba(0,132,255,0.4)] rotate-3">
            <span className="text-foreground text-xl font-black tracking-tighter -rotate-3">MV</span>
          </div>
          <div className={cn("text-right whitespace-nowrap transition-all duration-300", sidebarCollapsed ? "w-0 overflow-hidden group-hover/sidebar:w-auto" : "w-auto")}>
            <h1 className="text-2xl font-black text-foreground leading-tight tracking-tighter">
              {t('mvpos')}
            </h1>
            <div className="flex items-center justify-end gap-1.5 opacity-60">
               <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
               <p className="text-[10px] text-foreground font-bold uppercase tracking-widest">System Online</p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className={cn("flex-1 overflow-y-auto px-4 custom-scrollbar whitespace-nowrap", sidebarCollapsed ? "py-6 opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-300 delay-75" : "")} dir="rtl">
        <ul className="space-y-1.5">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={cn(
                    "flex items-center justify-between p-3.5 rounded-2xl transition-all group relative overflow-hidden",
                    isActive 
                      ? "bg-muted text-foreground" 
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                  )}
                >
                  {isActive && (
                    <div className="absolute right-0 top-0 bottom-0 w-1 bg-primary rounded-l-full shadow-[0_0_15px_rgba(0,132,255,1)]" />
                  )}
                  
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "h-9 w-9 rounded-xl flex items-center justify-center transition-all shrink-0",
                      isActive ? "bg-primary text-foreground" : "bg-muted text-muted-foreground group-hover:bg-muted/80 group-hover:text-foreground"
                    )}>
                       <item.icon className="h-4.5 w-4.5" />
                    </div>
                    <div className="flex flex-col text-right">
                      <span className="text-[11px] font-black leading-none mb-0.5 whitespace-nowrap">{item.name_dv}</span>
                      <span className="text-[9px] font-bold opacity-40 uppercase tracking-widest whitespace-nowrap">{item.name_en}</span>
                    </div>
                  </div>
                  
                  <ChevronRight className={cn(
                    "h-3 w-3 transition-all shrink-0",
                    isActive ? "text-primary opacity-100" : "opacity-0 group-hover:opacity-20"
                  )} />
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Bottom User Section */}
      <div className={cn("p-6 mt-auto border-t border-border bg-muted/30", sidebarCollapsed ? "hidden" : "block")}>
        <div className="flex items-center justify-between mb-6 px-2">
          <div className="text-right">
            <p className="text-[9px] text-primary uppercase font-black tracking-widest mb-0.5">{currentUser?.role}</p>
            <p className="text-sm font-black text-foreground truncate w-32">{currentUser?.name_dv}</p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-muted border border-border flex items-center justify-center relative">
             <Users className="h-5 w-5 text-muted-foreground" />
             <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-[#050510]" />
          </div>
        </div>
      </div>
      </div>
    </>
  );
};

export default Sidebar;