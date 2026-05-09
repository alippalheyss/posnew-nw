"use client";

import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Home, Package, Boxes, Users, DollarSign, Settings, BarChart, 
  Receipt, CalendarDays, AlertTriangle, Building2, LogOut, FileText 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';

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

  const navItems = allNavItems.filter(item => can(item.permission));

  return (
    <div className="flex flex-col h-screen bg-[#080812] border-l border-white/5 w-[240px] font-faruma overflow-hidden z-50">
      {/* Branding */}
      <div className="p-6 pb-2">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(0,132,255,0.4)]">
            <span className="text-white text-lg font-black tracking-tighter">MV</span>
          </div>
          <div className="text-right">
            <h1 className="text-lg font-black text-white leading-tight tracking-tight">
              {t('mvpos')}
            </h1>
            <p className="text-[9px] text-primary font-bold uppercase tracking-widest opacity-80">Enterprise POS</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto px-4 custom-scrollbar" dir="rtl">
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.path}>
              <Link
                to={item.path}
                className={cn(
                  "flex items-center justify-between p-2.5 rounded-lg transition-all group",
                  location.pathname === item.path 
                    ? "bg-primary text-white shadow-[0_0_10px_rgba(0,132,255,0.2)]" 
                    : "text-white/60 hover:text-white hover:bg-white/5"
                )}
              >
                <div className="flex items-center gap-3">
                  <item.icon className={cn(
                    "h-4 w-4 transition-transform group-hover:scale-110",
                    location.pathname === item.path ? "text-white" : "text-primary"
                  )} />
                  <span className="text-[11px] font-bold whitespace-nowrap">
                    {item.name_dv} <span className="opacity-50 font-normal">({item.name_en})</span>
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {/* Bottom User Section */}
      <div className="p-4 mt-auto border-t border-white/5">
        <div className="flex items-center justify-between mb-4 px-2">
          <div className="text-right">
            <p className="text-[10px] text-white/40 uppercase font-black tracking-tighter">{currentUser?.role}</p>
            <p className="text-xs font-bold text-white truncate w-32">{currentUser?.name_dv}</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
             <Users className="h-4 w-4 text-primary" />
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 p-2.5 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-lg transition-all text-xs font-black uppercase tracking-widest"
        >
          <LogOut className="h-4 w-4" />
          {t('logout')}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;