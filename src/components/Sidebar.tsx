"use client";

import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Home, Package, Boxes, Users, DollarSign, Settings, BarChart, 
  Receipt, CalendarDays, AlertTriangle, Building2, LogOut, FileText, ChevronRight, ChevronLeft, Activity, Pin, PinOff, Wallet, Menu, X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { useAppContext } from '@/context/AppContext';
import { Button } from './ui/button';
import { PWAInstallButton } from './PWAInstallButton';
import { Sheet, SheetContent, SheetTrigger } from './ui/sheet';

const Sidebar = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const { can } = usePermissions();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const allNavItems = [
    { name_dv: t('pos_title'), name_en: t('pos_title', { lng: 'en' }), icon: Home, path: '/', permission: 'canAccessPOS' as const },
    { name_dv: t('products'), name_en: t('products', { lng: 'en' }), icon: Package, path: '/products', permission: 'canAccessProducts' as const },
    { name_dv: t('credit_outstanding'), name_en: t('credit_outstanding', { lng: 'en' }), icon: DollarSign, path: '/credit-outstanding', permission: 'canAccessSales' as const },
    { name_dv: t('credit_invoices'), name_en: t('credit_invoices', { lng: 'en' }), icon: Receipt, path: '/credit-invoices', permission: 'canAccessSales' as const },
    { name_dv: t('customers'), name_en: t('customers', { lng: 'en' }), icon: Users, path: '/customers', permission: 'canAccessCustomers' as const },
    { name_dv: t('daily_sales'), name_en: t('daily_sales', { lng: 'en' }), icon: CalendarDays, path: '/daily-sales', permission: 'canAccessSales' as const },
    { name_dv: t('stock'), name_en: t('stock', { lng: 'en' }), icon: Boxes, path: '/stock', permission: 'canAccessStock' as const },
    // Stock Audit is kept as a route but intentionally hidden from sidebar navigation
    { name_dv: t('sales_reports'), name_en: t('sales_reports', { lng: 'en' }), icon: BarChart, path: '/sales-reports', permission: 'canAccessReports' as const },
    { name_dv: t('expenses') || 'ޚަރަދުތައް', name_en: t('expenses', { lng: 'en' }) || 'Expenses', icon: Wallet, path: '/expenses', permission: 'canAccessSales' as const },
    { name_dv: t('expiry_alerts'), name_en: t('expiry_alerts', { lng: 'en' }), icon: AlertTriangle, path: '/expiry-alerts', permission: 'canAccessStock' as const },
    { name_dv: "Shrinkage Report", name_en: "Shrinkage Report", icon: FileText, path: '/shrinkage-report', permission: 'canAccessReports' as const },
    { name_dv: t('gst_reports'), name_en: t('gst_reports', { lng: 'en' }), icon: Receipt, path: '/gst-reports', permission: 'canAccessReports' as const },
    { name_dv: t('admin_settings'), name_en: t('admin_settings', { lng: 'en' }), icon: Settings, path: '/admin', permission: 'canAccessAdmin' as const },
  ];

  const { sidebarCollapsed, setSidebarCollapsed, pendingSlipsCount } = useAppContext();
  const navItems = allNavItems.filter(item => can(item.permission));

  if (location.pathname === '/mobile-purchase' || location.pathname === '/stock-audit' || location.pathname === '/audit') {
    return null;
  }

  const renderNavContent = (isMobile = false) => (
    <div className="flex flex-col h-full font-faruma text-foreground" dir="rtl">
      {/* Branding */}
      <div className="p-6 pb-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-11 h-11 flex-shrink-0 bg-primary rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(249,115,22,0.4)]">
            <span className="text-foreground text-lg font-black tracking-tighter">MV</span>
          </div>
          <div className="text-right whitespace-nowrap">
            <h1 className="text-xl font-black text-foreground leading-tight tracking-tight">
              {t('mvpos')}
            </h1>
            <div className="flex items-center justify-end gap-1.5 opacity-60">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-[10px] text-foreground font-bold uppercase tracking-widest">System Online</p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-4 custom-scrollbar whitespace-nowrap py-2">
        <ul className="space-y-1.5">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const isCreditOutstanding = item.path === '/credit-outstanding';
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  onClick={() => isMobile && setMobileOpen(false)}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-2xl transition-all group relative overflow-hidden",
                    isActive 
                      ? "bg-muted text-foreground font-bold" 
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                  )}
                >
                  {isActive && (
                    <div className="absolute right-0 top-0 bottom-0 w-1 bg-primary rounded-l-full shadow-[0_0_15px_rgba(249,115,22,1)]" />
                  )}
                  
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "h-9 w-9 rounded-xl flex items-center justify-center transition-all shrink-0",
                      isActive ? "bg-primary text-white" : "bg-muted text-muted-foreground group-hover:bg-muted/80 group-hover:text-foreground"
                    )}>
                      <item.icon className="h-4.5 w-4.5" />
                    </div>
                    <div className="flex flex-col text-right">
                      <span className="text-[14px] sm:text-[15px] font-black leading-tight mb-0.5 whitespace-nowrap">{item.name_dv}</span>
                      <span className="text-[11px] sm:text-xs font-bold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{item.name_en}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isCreditOutstanding && pendingSlipsCount > 0 && (
                      <span className="px-2 py-0.5 text-[10px] font-black bg-amber-500 text-black rounded-full animate-pulse shadow-[0_0_10px_rgba(245,158,11,0.5)]">
                        {pendingSlipsCount}
                      </span>
                    )}
                    <ChevronRight className={cn(
                      "h-3.5 w-3.5 transition-all shrink-0",
                      isActive ? "text-primary opacity-100" : "opacity-0 group-hover:opacity-30"
                    )} />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Bottom Install & User Section */}
      <div className="p-5 mt-auto border-t border-border bg-muted/40 flex flex-col gap-3">
        <PWAInstallButton />
        <div className="flex items-center justify-between px-1">
          <div className="text-right">
            <p className="text-[10px] text-primary uppercase font-black tracking-wider mb-0.5">{currentUser?.role}</p>
            <p className="text-base font-black text-foreground truncate w-32">{currentUser?.name_dv}</p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-muted border border-border flex items-center justify-center relative">
            <Users className="h-4 w-4 text-muted-foreground" />
            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-background" />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Floating Menu Button */}
      <div className="md:hidden fixed top-4 right-4 z-[90]">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button 
              variant="default" 
              size="icon" 
              className="h-11 w-11 rounded-2xl bg-primary text-foreground shadow-lg shadow-primary/30 flex items-center justify-center"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="p-0 w-80 bg-background border-border">
            {renderNavContent(true)}
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Sidebar Spacer */}
      <div className={cn("flex-shrink-0 transition-all duration-300 hidden md:block", sidebarCollapsed ? "w-0" : "w-72 xl:w-80 2xl:w-88")} />
      
      {/* Desktop Fixed Sidebar */}
      <div className={cn(
        "hidden md:flex flex-col h-screen font-faruma overflow-hidden z-[100] transition-all duration-300 group/sidebar fixed right-0 top-0 bottom-0",
        sidebarCollapsed 
          ? "w-2 hover:w-72 xl:hover:w-80 2xl:hover:w-88 bg-transparent hover:bg-background hover:border-l hover:border-border hover:shadow-[-20px_0_50px_rgba(0,0,0,0.5)]" 
          : "w-72 xl:w-80 2xl:w-88 bg-background border-l border-border shadow-[-20px_0_50px_rgba(0,0,0,0.5)]"
      )}>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className={cn(
            "absolute top-5 left-5 z-[110] transition-all h-8 w-8 bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground rounded-xl border border-border",
            sidebarCollapsed ? "opacity-0 group-hover/sidebar:opacity-100" : "opacity-100"
          )}
        >
          {sidebarCollapsed ? <Pin className="h-4 w-4" /> : <PinOff className="h-4 w-4" />}
        </Button>

        <div className={cn("flex-1 flex flex-col h-full transition-opacity duration-300", sidebarCollapsed ? "opacity-0 group-hover/sidebar:opacity-100" : "opacity-100")}>
          {renderNavContent(false)}
        </div>
      </div>
    </>
  );
};

export default Sidebar;