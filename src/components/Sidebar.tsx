"use client";

import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Package, Boxes, Users, DollarSign, Settings, BarChart, Receipt, CalendarDays, AlertTriangle, Building2, LogOut } from 'lucide-react';
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

  const renderBoth = (key: string, options?: any) => (
    <>
      {t(key, options)} ({t(key, { ...options, lng: 'en' })})
    </>
  );

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
    { name_dv: t('gst_reports'), name_en: t('gst_reports', { lng: 'en' }), icon: Receipt, path: '/gst-reports', permission: 'canAccessReports' as const },
    { name_dv: t('admin_settings'), name_en: t('admin_settings', { lng: 'en' }), icon: Settings, path: '/admin', permission: 'canAccessAdmin' as const },
  ];

  // Filter menu items based on permissions
  const navItems = allNavItems.filter(item => can(item.permission));

  return (
    <div className="flex flex-col h-screen bg-sidebar text-sidebar-foreground w-64 p-4 font-faruma overflow-hidden">
      <div className="text-left mb-6 flex-shrink-0">
        {/* MVPOS Branding */}
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
            <span className="text-white text-lg font-black">MV</span>
          </div>
          <div>
            <h1 className="text-xl font-black bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {t('mvpos')}
            </h1>
            <p className="text-[10px] text-sidebar-foreground/60">Point of Sale System</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 overflow-hidden">
        <ul className="space-y-2 h-full">
          {navItems.map((item) => (
            <li key={item.name_dv}>
              <Link
                to={item.path}
                className={cn(
                  "flex items-center p-3 rounded-md text-left hover:bg-sidebar-accent transition-colors",
                  location.pathname === item.path ? "bg-sidebar-primary hover:bg-sidebar-primary" : ""
                )}
              >
                <span className="flex-1 text-sm break-words">{item.name_dv} ({item.name_en})</span>
                <item.icon className="h-5 w-5 ml-2" />
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* User Info & Logout */}
      <div className="mt-auto pt-4 border-t border-sidebar-border flex-shrink-0">
        <div className="p-3 bg-sidebar-accent rounded-md">
          <div className="text-xs text-sidebar-foreground/70 mb-2">
            {t('logged_in_as')}
          </div>
          <div className="font-semibold text-sm mb-3">
            {currentUser?.name_dv} ({currentUser?.name_en})
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 p-2 bg-red-500 hover:bg-red-600 text-white rounded-md transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <span className="text-sm">{t('logout')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;