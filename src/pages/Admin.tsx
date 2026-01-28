"use client";

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ChevronDown, ChevronUp, Upload, Image as ImageIcon, Trash2, Settings, Landmark, Monitor, Layout, FileText, Printer, Building2, X, Edit, UserPlus } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import { cn } from '@/lib/utils';

import { useAppContext } from '@/context/AppContext';
import { useAuth, User } from '@/context/AuthContext';
import UserDialog from '@/components/UserDialog';

const Admin = () => {
  const { t, i18n } = useTranslation();
  const { settings, updateSettings } = useAppContext();

  const shopSettings = settings.shop;
  const accountingSettings = settings.accounting;
  const softwareSettings = settings.software;
  const generalSettings = settings.general;
  const reportSettings = settings.reports;
  const printingSettings = settings.printing;

  // State for managing which sections are expanded
  const [expandedSections, setExpandedSections] = useState({
    shopSettings: true,
    accountingSettings: false,
    softwareSettings: false,
    generalSettings: false,
    reportSettings: false,
    printingSettings: false,
    userManagement: false,
  });

  // User management state
  const { users, deleteUser } = useAuth();
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Apply saved theme and language on mount
  React.useEffect(() => {
    applyTheme(softwareSettings.theme);
    i18n.changeLanguage(softwareSettings.language);
  }, []);

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleShopSettingsChange = (field: string, value: string | number | boolean) => {
    updateSettings('shop', { [field]: value });
  };

  const handleAccountingSettingsChange = (field: string, value: string | number | boolean) => {
    updateSettings('accounting', { [field]: value });
  };

  const handleSoftwareSettingsChange = (field: string, value: string | number | boolean) => {
    // Handle language change
    if (field === 'language' && typeof value === 'string') {
      i18n.changeLanguage(value);
    }
    // Handle theme change
    if (field === 'theme' && typeof value === 'string') {
      applyTheme(value);
    }
    updateSettings('software', { [field]: value });
  };

  const handleGeneralSettingsChange = (field: string, value: string | number | boolean) => {
    updateSettings('general', { [field]: value });
  };

  const handleReportSettingsChange = (field: string, value: string | boolean) => {
    updateSettings('reports', { [field]: value });
  };

  const handlePrintingSettingsChange = (field: string, value: string | boolean) => {
    updateSettings('printing', { [field]: value });
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        handleShopSettingsChange('logo', reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = () => {
    handleShopSettingsChange('logo', '');
  };

  const saveAllSettings = () => {
    showSuccess(t('settings_saved_successfully'));
  };

  const applyTheme = (theme: string) => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else if (theme === 'light') {
      root.classList.remove('dark');
    } else if (theme === 'system') {
      // Check system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  };

  const renderBoth = (key: string, options?: any) => (
    <>
      {t(key, options)} ({t(key, { ...options, lng: 'en' })})
    </>
  );

  // User management handlers
  const handleAddUser = () => {
    setSelectedUser(null);
    setUserDialogOpen(true);
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setUserDialogOpen(true);
  };

  const handleDeleteUser = (userId: string) => {
    if (window.confirm(t('confirm_delete_user'))) {
      deleteUser(userId);
      showSuccess(t('user_deleted'));
    }
  };

  const renderBothString = (key: string, options?: any) => {
    return `${t(key, options)} (${t(key, { ...options, lng: 'en' })})`;
  };

  return (
    <div className="p-6 font-faruma flex flex-col h-full bg-gray-50/50 dark:bg-gray-900/50 overflow-auto">
      <div className="flex justify-between items-center mb-8 sticky top-0 bg-gray-50/80 dark:bg-gray-900/80 backdrop-blur-md z-20 py-2 border-b">
        <div>
          <h1 className="text-right text-3xl font-black text-gray-900 dark:text-white flex items-center justify-end gap-3">
            {renderBoth('admin_settings')} <Settings className="h-8 w-8 text-primary group-hover:rotate-90 transition-transform duration-500" />
          </h1>
          <p className="text-right text-sm opacity-60 mt-1">{renderBoth('admin_panel_description')}</p>
        </div>
        <Button onClick={saveAllSettings} size="lg" className="font-faruma bg-primary hover:bg-primary/90 shadow-xl hover:shadow-primary/20 transition-all px-8">
          <Landmark className="h-4 w-4 mr-2" /> {renderBoth('save_all_settings')}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pb-20">
        {/* Shop Settings */}
        <Card className={cn("transition-all duration-300 border-none shadow-sm hover:shadow-md group", expandedSections.shopSettings ? "ring-2 ring-primary/20" : "")}>
          <CardHeader className="cursor-pointer select-none pb-4" onClick={() => toggleSection('shopSettings')}>
            <div className="flex justify-between items-center font-black">
              <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-blue-600 group-hover:scale-110 transition-transform">
                <Building2 className="h-6 w-6" />
              </div>
              <div className="text-right flex-1 px-4">
                <CardTitle className="text-lg">{renderBoth('shop_settings')}</CardTitle>
                <CardDescription className="text-[11px] leading-tight mt-1">{renderBoth('manage_shop_profile')}</CardDescription>
              </div>
              {expandedSections.shopSettings ? <ChevronUp className="h-4 w-4 opacity-40" /> : <ChevronDown className="h-4 w-4 opacity-40" />}
            </div>
          </CardHeader>
          <Separator className="opacity-40" />
          {expandedSections.shopSettings && (
            <CardContent className="pt-6 space-y-5 animate-in fade-in slide-in-from-top-1">
              <div className="grid gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase opacity-50 block text-right">{renderBoth('shop_name')}</Label>
                  <Input value={shopSettings.shopName} onChange={(e) => handleShopSettingsChange('shopName', e.target.value)} className="text-right h-9 border-gray-100" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase opacity-50 block text-right">{renderBoth('shop_address')}</Label>
                  <Input value={shopSettings.shopAddress} onChange={(e) => handleShopSettingsChange('shopAddress', e.target.value)} className="text-right h-9 border-gray-100" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase opacity-50 block text-right">{renderBoth('shop_phone')}</Label>
                    <Input value={shopSettings.shopPhone} onChange={(e) => handleShopSettingsChange('shopPhone', e.target.value)} className="text-right h-9 border-gray-100" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase opacity-50 block text-right">{renderBoth('currency')}</Label>
                    <Select value={shopSettings.currency} onValueChange={(value) => handleShopSettingsChange('currency', value)}>
                      <SelectTrigger className="text-right h-9 border-gray-100"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MVR">MVR</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-black/10 rounded-lg border border-dashed border-gray-200">
                  <Label className="text-xs font-bold">{renderBoth('enable_card_payment')}</Label>
                  <Switch checked={shopSettings.enableCardPayment} onCheckedChange={(checked) => handleShopSettingsChange('enableCardPayment', checked)} />
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Accounting */}
        <Card className={cn("transition-all duration-300 border-none shadow-sm hover:shadow-md group", expandedSections.accountingSettings ? "ring-2 ring-primary/20" : "")}>
          <CardHeader className="cursor-pointer select-none pb-4" onClick={() => toggleSection('accountingSettings')}>
            <div className="flex justify-between items-center font-black">
              <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-xl text-amber-600 group-hover:scale-110 transition-transform">
                <Landmark className="h-6 w-6" />
              </div>
              <div className="text-right flex-1 px-4">
                <CardTitle className="text-lg">{renderBoth('accounting_settings')}</CardTitle>
                <CardDescription className="text-[11px] leading-tight mt-1">{renderBoth('configure_accounting')}</CardDescription>
              </div>
              {expandedSections.accountingSettings ? <ChevronUp className="h-4 w-4 opacity-40" /> : <ChevronDown className="h-4 w-4 opacity-40" />}
            </div>
          </CardHeader>
          <Separator className="opacity-40" />
          {expandedSections.accountingSettings && (
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase opacity-50 block text-right">{renderBoth('tax_calculation')}</Label>
                  <Select value={accountingSettings.taxCalculation} onValueChange={(value) => handleAccountingSettingsChange('taxCalculation', value)}>
                    <SelectTrigger className="text-right h-9 border-gray-100"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="inclusive">{renderBoth('tax_inclusive')}</SelectItem>
                      <SelectItem value="exclusive">{renderBoth('tax_exclusive')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase opacity-50 block text-right">{renderBoth('default_tax_rate')} (%)</Label>
                  <Input type="number" value={shopSettings.taxRate} onChange={(e) => handleShopSettingsChange('taxRate', parseFloat(e.target.value) || 0)} className="text-right h-9 border-gray-100" />
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-black/10 rounded-lg border border-dashed border-gray-200">
                  <Label className="text-xs font-bold">{renderBoth('enable_credit_sales')}</Label>
                  <Switch checked={accountingSettings.enableCreditSales} onCheckedChange={(checked) => handleAccountingSettingsChange('enableCreditSales', checked)} />
                </div>
                {accountingSettings.enableCreditSales && (
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase opacity-50 block text-right">{renderBoth('default_credit_limit')}</Label>
                    <Input type="number" value={accountingSettings.creditLimit} onChange={(e) => handleAccountingSettingsChange('creditLimit', parseFloat(e.target.value) || 0)} className="text-right h-9 border-gray-100" />
                  </div>
                )}
              </div>
            </CardContent>
          )}
        </Card>

        {/* Software Settings */}
        <Card className={cn("transition-all duration-300 border-none shadow-sm hover:shadow-md group", expandedSections.softwareSettings ? "ring-2 ring-primary/20" : "")}>
          <CardHeader className="cursor-pointer select-none pb-4" onClick={() => toggleSection('softwareSettings')}>
            <div className="flex justify-between items-center font-black">
              <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-xl text-green-600 group-hover:scale-110 transition-transform">
                <Monitor className="h-6 w-6" />
              </div>
              <div className="text-right flex-1 px-4">
                <CardTitle className="text-lg">{renderBoth('software_settings')}</CardTitle>
                <CardDescription className="text-[11px] leading-tight mt-1">{renderBoth('adjust_software_options')}</CardDescription>
              </div>
              {expandedSections.softwareSettings ? <ChevronUp className="h-4 w-4 opacity-40" /> : <ChevronDown className="h-4 w-4 opacity-40" />}
            </div>
          </CardHeader>
          <Separator className="opacity-40" />
          {expandedSections.softwareSettings && (
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase opacity-50 block text-right">{renderBoth('language')}</Label>
                  <Select value={softwareSettings.language} onValueChange={(value) => handleSoftwareSettingsChange('language', value)}>
                    <SelectTrigger className="text-right h-9 border-gray-100"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dv">ދިވެހި (Dhivehi)</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase opacity-50 block text-right">{renderBoth('theme')}</Label>
                  <Select value={softwareSettings.theme} onValueChange={(value) => handleSoftwareSettingsChange('theme', value)}>
                    <SelectTrigger className="text-right h-9 border-gray-100"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">{renderBoth('light_theme')}</SelectItem>
                      <SelectItem value="dark">{renderBoth('dark_theme')}</SelectItem>
                      <SelectItem value="system">{renderBoth('system_theme')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-black/10 rounded-lg border border-dashed border-gray-200">
                  <Label className="text-xs font-bold">{renderBoth('auto_backup')}</Label>
                  <Switch checked={softwareSettings.autoBackup} onCheckedChange={(checked) => handleSoftwareSettingsChange('autoBackup', checked)} />
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Global Control */}
        <Card className={cn("transition-all duration-300 border-none shadow-sm hover:shadow-md group", expandedSections.generalSettings ? "ring-2 ring-primary/20" : "")}>
          <CardHeader className="cursor-pointer select-none pb-4" onClick={() => toggleSection('generalSettings')}>
            <div className="flex justify-between items-center font-black">
              <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-xl text-purple-600 group-hover:scale-110 transition-transform">
                <Layout className="h-6 w-6" />
              </div>
              <div className="text-right flex-1 px-4">
                <CardTitle className="text-lg">{renderBoth('general_settings')}</CardTitle>
                <CardDescription className="text-[11px] leading-tight mt-1">{renderBoth('general_app_settings')}</CardDescription>
              </div>
              {expandedSections.generalSettings ? <ChevronUp className="h-4 w-4 opacity-40" /> : <ChevronDown className="h-4 w-4 opacity-40" />}
            </div>
          </CardHeader>
          <Separator className="opacity-40" />
          {expandedSections.generalSettings && (
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-black/10 rounded-lg border border-dashed border-gray-200">
                  <Label className="text-xs font-bold">{renderBoth('enable_multi_cart')}</Label>
                  <Switch checked={generalSettings.enableMultiCart} onCheckedChange={(checked) => handleGeneralSettingsChange('enableMultiCart', checked)} />
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-black/10 rounded-lg border border-dashed border-gray-200">
                  <Label className="text-xs font-bold">{renderBoth('enable_loyalty_program')}</Label>
                  <Switch checked={generalSettings.enableLoyaltyProgram} onCheckedChange={(checked) => handleGeneralSettingsChange('enableLoyaltyProgram', checked)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase opacity-50 block text-right">{renderBoth('default_discount')} (%)</Label>
                  <Input type="number" value={generalSettings.defaultDiscount} onChange={(e) => handleGeneralSettingsChange('defaultDiscount', parseFloat(e.target.value) || 0)} className="text-right h-9 border-gray-100" />
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Printing */}
        <Card className={cn("transition-all duration-300 border-none shadow-sm hover:shadow-md group", expandedSections.printingSettings ? "ring-2 ring-primary/20" : "")}>
          <CardHeader className="cursor-pointer select-none pb-4" onClick={() => toggleSection('printingSettings')}>
            <div className="flex justify-between items-center font-black">
              <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl text-indigo-600 group-hover:scale-110 transition-transform">
                <Printer className="h-6 w-6" />
              </div>
              <div className="text-right flex-1 px-4">
                <CardTitle className="text-lg">{renderBoth('printing_settings')}</CardTitle>
                <CardDescription className="text-[11px] leading-tight mt-1">{renderBoth('manage_thermal_printer')}</CardDescription>
              </div>
              {expandedSections.printingSettings ? <ChevronUp className="h-4 w-4 opacity-40" /> : <ChevronDown className="h-4 w-4 opacity-40" />}
            </div>
          </CardHeader>
          <Separator className="opacity-40" />
          {expandedSections.printingSettings && (
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase opacity-50 block text-right">{renderBoth('print_mode')}</Label>
                  <Select value={printingSettings.printMode} onValueChange={(value) => handlePrintingSettingsChange('printMode', value)}>
                    <SelectTrigger className="text-right h-9 border-gray-100"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto" className="text-right">{renderBoth('print_mode_auto')}</SelectItem>
                      <SelectItem value="ask" className="text-right">{renderBoth('print_mode_ask')}</SelectItem>
                      <SelectItem value="off" className="text-right">{renderBoth('print_mode_off')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase opacity-50 block text-right">{renderBoth('thermal_printer_width')}</Label>
                  <Select value={printingSettings.thermalPrinterWidth} onValueChange={(value) => handlePrintingSettingsChange('thermalPrinterWidth', value)}>
                    <SelectTrigger className="text-right h-9 border-gray-100"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="58mm" className="text-right">58mm (Small)</SelectItem>
                      <SelectItem value="80mm" className="text-right">80mm (Standard)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase opacity-50 block text-right">{renderBoth('printer_name')}</Label>
                  <Input value={printingSettings.printerName} onChange={(e) => handlePrintingSettingsChange('printerName', e.target.value)} className="text-right h-9 border-gray-100" placeholder="e.g. POS-80" />
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Reports */}
        <Card className={cn("transition-all duration-300 border-none shadow-sm hover:shadow-md group", expandedSections.reportSettings ? "ring-2 ring-primary/20" : "")}>
          <CardHeader className="cursor-pointer select-none pb-4" onClick={() => toggleSection('reportSettings')}>
            <div className="flex justify-between items-center font-black">
              <div className="p-2 bg-rose-50 dark:bg-rose-900/20 rounded-xl text-rose-600 group-hover:scale-110 transition-transform">
                <FileText className="h-6 w-6" />
              </div>
              <div className="text-right flex-1 px-4">
                <CardTitle className="text-lg">{renderBoth('report_customization')}</CardTitle>
                <CardDescription className="text-[11px] leading-tight mt-1">{renderBoth('customize_documents')}</CardDescription>
              </div>
              {expandedSections.reportSettings ? <ChevronUp className="h-4 w-4 opacity-40" /> : <ChevronDown className="h-4 w-4 opacity-40" />}
            </div>
          </CardHeader>
          <Separator className="opacity-40" />
          {expandedSections.reportSettings && (
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase opacity-50 block text-right">{renderBoth('invoice_header')}</Label>
                  <Input value={reportSettings.invoiceHeader} onChange={(e) => handleReportSettingsChange('invoiceHeader', e.target.value)} className="text-right h-9 border-gray-100" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase opacity-50 block text-right">{renderBoth('customer_outstanding_report_header')}</Label>
                  <Input value={reportSettings.customerOutstandingHeader} onChange={(e) => handleReportSettingsChange('customerOutstandingHeader', e.target.value)} className="text-right h-9 border-gray-100" />
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-black/10 rounded-lg border border-dashed border-gray-100">
                  <Label className="text-xs font-bold">{renderBoth('show_logo_on_reports')}</Label>
                  <Switch checked={reportSettings.showLogo} onCheckedChange={(checked) => handleReportSettingsChange('showLogo', checked)} />
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        {/* User Management Section */}
        <Card className={cn("transition-all duration-300 border-none shadow-sm hover:shadow-md group", expandedSections.userManagement ? "ring-2 ring-primary/20" : "")}>
          <CardHeader
            className="cursor-pointer hover:bg-accent/50 transition-colors rounded-t-lg"
            onClick={() => toggleSection('userManagement')}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
                  <UserPlus className="h-5 w-5 text-white" />
                </div>
                <CardTitle className="text-lg">{renderBoth('user_management')}</CardTitle>
              </div>
              {expandedSections.userManagement ? <ChevronUp className="h-4 w-4 opacity-40" /> : <ChevronDown className="h-4 w-4 opacity-40" />}
            </div>
          </CardHeader>

          {expandedSections.userManagement && (
            <CardContent className="space-y-6 pt-6">
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">
                  {renderBoth('manage_users_description')}
                </p>
                <Button onClick={handleAddUser} className="gap-2">
                  <UserPlus className="h-4 w-4" />
                  {t('add_user')}
                </Button>
              </div>

              {/* Users Table */}
              <div className="border rounded-lg overflow-x-auto">
                <table className="w-full min-w-[800px]">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-right p-3 text-sm font-medium">{t('username')}</th>
                      <th className="text-right p-3 text-sm font-medium">{t('full_name')}</th>
                      <th className="text-right p-3 text-sm font-medium">{t('role')}</th>
                      <th className="text-right p-3 text-sm font-medium">{t('status')}</th>
                      <th className="text-right p-3 text-sm font-medium">{t('last_login')}</th>
                      <th className="text-right p-3 text-sm font-medium whitespace-nowrap">{t('actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id} className="border-t hover:bg-muted/50">
                        <td className="p-3 text-right">{user.username}</td>
                        <td className="p-3 text-right whitespace-nowrap">
                          {user.name_dv} ({user.name_en})
                        </td>
                        <td className="p-3 text-right">
                          <span className={cn(
                            "px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap",
                            user.role === 'admin' ? "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300" : "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                          )}>
                            {t(user.role)}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <span className={cn(
                            "px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap",
                            user.isActive ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" : "bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300"
                          )}>
                            {t(user.isActive ? 'active' : 'inactive')}
                          </span>
                        </td>
                        <td className="p-3 text-right text-sm text-muted-foreground whitespace-nowrap">
                          {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : t('never')}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex gap-2 justify-end whitespace-nowrap">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditUser(user)}
                              className="h-8 w-8 p-0"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteUser(user.id)}
                              disabled={user.id === 'admin_default'}
                              className="h-8 w-8 p-0"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          )}
        </Card>
      </div>

      {/* User Dialog */}
      <UserDialog
        open={userDialogOpen}
        onOpenChange={setUserDialogOpen}
        user={selectedUser}
        onSave={() => {
          // Refresh will happen automatically via context
        }}
      />
    </div>
  );
};

export default Admin;