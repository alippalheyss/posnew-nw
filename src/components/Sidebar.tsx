"use client";

import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Home, Package, Boxes, Users, DollarSign, Settings, BarChart, 
  Receipt, CalendarDays, AlertTriangle, Building2, LogOut, FileText, ChevronRight, ChevronLeft, Activity, Pin, PinOff, Wallet, Menu, X,
  ShieldCheck, Check, Lock, Edit3, Save, User as UserIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { useAppContext } from '@/context/AppContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { showSuccess, showError } from '@/utils/toast';
import { Sheet, SheetContent, SheetTrigger } from './ui/sheet';

const Sidebar = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, logout, updateUser } = useAuth();
  const { can } = usePermissions();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [editNameDv, setEditNameDv] = useState('');
  const [editNameEn, setEditNameEn] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setEditNameDv(currentUser.name_dv || '');
      setEditNameEn(currentUser.name_en || '');
    }
  }, [currentUser, isProfileOpen]);

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setIsSavingName(true);
    try {
      await updateUser(currentUser.id, {
        name_dv: editNameDv.trim() || currentUser.name_dv,
        name_en: editNameEn.trim() || currentUser.name_en,
      });
      showSuccess('ޕްރޮފައިލް ނަން ކާމިޔާބުކަމާއެކު ބަދަލުކުރެވިއްޖެ! (Name updated)');
    } catch (err) {
      console.error(err);
      showError('Failed to update name');
    } finally {
      setIsSavingName(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const permissionsList = [
    { key: 'canAccessPOS', labelDv: 'ޕީ.އޯ.އެސް ވިއްކުން', labelEn: 'POS Checkout & Sales', granted: can('canAccessPOS') },
    { key: 'canAccessProducts', labelDv: 'މުދަލުގެ މަޢުލޫމާތު', labelEn: 'Products Catalog', granted: can('canAccessProducts') },
    { key: 'canAccessStock', labelDv: 'ސްޓޮކް ބެލެހެއްޓުން', labelEn: 'Stock & Inventory', granted: can('canAccessStock') },
    { key: 'canAccessCustomers', labelDv: 'ކަސްޓަމަރުންނާއި ދަރަނި', labelEn: 'Customers & Balance', granted: can('canAccessCustomers') },
    { key: 'canAccessSales', labelDv: 'ދުވަހުގެ ވިޔަފާރި', labelEn: 'Daily Sales & Invoices', granted: can('canAccessSales') },
    { key: 'canAccessReports', labelDv: 'ރިޕޯޓްތައް', labelEn: 'Reports & Statements', granted: can('canAccessReports') },
    { key: 'canAccessAdmin', labelDv: 'ސިސްޓަމް އެޑްމިން ސެޓިންގްސް', labelEn: 'Admin System Settings', granted: can('canAccessAdmin') },
    { key: 'canEditProducts', labelDv: 'މުދާ ބަދަލުކުރުމުގެ ހުއްދަ', labelEn: 'Edit Product Details', granted: can('canEditProducts') },
    { key: 'canMakeCreditSales', labelDv: 'ދަރަންޏަށް ދޫކުރުން', labelEn: 'Credit Sales Authorization', granted: can('canMakeCreditSales') },
    { key: 'canDeleteSales', labelDv: 'ސޭލްސް ފޮހެލުމުގެ ހުއްދަ', labelEn: 'Delete Sales Transactions', granted: can('canDeleteSales') },
  ];

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
          <div className="w-11 h-11 flex-shrink-0 bg-white rounded-2xl flex items-center justify-center p-1.5 shadow-[0_4px_16px_rgba(0,132,255,0.25)] border border-white/20 overflow-hidden">
            <img src="/pwa-192x192.png" alt="MVPOS" className="w-full h-full object-contain" />
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
      <div className="flex-1 overflow-y-auto px-3.5 custom-scrollbar whitespace-nowrap py-2">
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
                    "flex items-center justify-between p-3 rounded-2xl transition-all duration-300 group relative overflow-hidden apple-glass-pill",
                    isActive 
                      ? "bg-primary text-white font-bold shadow-[0_10px_25px_-5px_rgba(0,132,255,0.4)] border border-white/20" 
                      : "text-muted-foreground hover:text-foreground hover:bg-white/10 dark:hover:bg-white/5"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "h-9 w-9 rounded-xl flex items-center justify-center transition-all shrink-0",
                      isActive 
                        ? "bg-white/20 text-white shadow-inner" 
                        : "bg-muted/80 text-muted-foreground group-hover:bg-primary/20 group-hover:text-primary"
                    )}>
                      <item.icon className="h-4.5 w-4.5" />
                    </div>
                    <div className="flex flex-col text-right">
                      <span className="text-[14px] sm:text-[15px] font-black leading-tight mb-0.5 whitespace-nowrap">{item.name_dv}</span>
                      <span className={cn(
                        "text-[10px] sm:text-[11px] font-bold uppercase tracking-wide whitespace-nowrap font-mono",
                        isActive ? "text-white/80" : "text-muted-foreground/70"
                      )}>{item.name_en}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isCreditOutstanding && pendingSlipsCount > 0 && (
                      <span className="px-2 py-0.5 text-[10px] font-black bg-amber-400 text-black rounded-full animate-pulse shadow-[0_0_12px_rgba(251,191,36,0.6)]">
                        {pendingSlipsCount}
                      </span>
                    )}
                    <ChevronRight className={cn(
                      "h-3.5 w-3.5 transition-all shrink-0",
                      isActive ? "text-white opacity-100" : "opacity-0 group-hover:opacity-40"
                    )} />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Bottom User Section */}
      <div className="p-4 mt-auto border-t border-white/10 bg-background/40 backdrop-blur-md rounded-b-[2.5rem] flex flex-col gap-3">
        <button
          type="button"
          onClick={() => {
            setIsProfileOpen(true);
            setMobileOpen(false);
          }}
          className="flex items-center justify-between p-2.5 rounded-2xl bg-background/80 hover:bg-background border border-white/20 shadow-xs transition-all text-right group/user cursor-pointer active:scale-[0.98]"
          title="ބޭނުންކުރާ ފަރާތުގެ ޕްރޮފައިލް ބައްލަވާ / Click to view profile, accesses & logout"
        >
          <div className="flex items-center gap-1.5 text-muted-foreground group-hover/user:text-foreground">
            <ChevronLeft className="h-4 w-4 transition-transform group-hover/user:-translate-x-0.5" />
          </div>
          <div className="flex items-center gap-3 min-w-0">
            <div className="text-right flex-1 min-w-0">
              <div className="flex items-center justify-end gap-1.5">
                <span className="text-[10px] text-primary font-black uppercase tracking-wider">{currentUser?.role || 'User'}</span>
              </div>
              <p className="text-sm font-black text-foreground truncate max-w-[130px] leading-tight">
                {currentUser?.name_dv || currentUser?.name_en || currentUser?.username}
              </p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/25 shadow-xs flex items-center justify-center relative shrink-0">
              <Users className="h-4 w-4 text-primary" />
              <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-background" />
            </div>
          </div>
        </button>
      </div>
    </div>
  );

  const [isHovered, setIsHovered] = useState(false);
  const isExpanded = !sidebarCollapsed || isHovered;

  return (
    <>
      {/* Mobile Floating Menu Button */}
      <div className="md:hidden fixed top-4 right-4 z-[90]">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button 
              variant="default" 
              size="icon" 
              className="h-11 w-11 rounded-2xl bg-primary text-foreground shadow-lg shadow-primary/30 flex items-center justify-center apple-glass-pill"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="p-0 w-80 apple-liquid-glass glass3d border-white/15">
            {renderNavContent(true)}
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Sidebar Spacer */}
      <div className={cn("flex-shrink-0 transition-all duration-300 hidden md:block", sidebarCollapsed ? "w-0" : "w-72 xl:w-80 2xl:w-88")} />
      
      {/* Invisible edge trigger zone when sidebar is collapsed */}
      {sidebarCollapsed && (
        <div 
          onMouseEnter={() => setIsHovered(true)}
          className="hidden md:flex fixed right-0 top-0 bottom-0 w-5 z-[95] items-center justify-end cursor-pointer group/edge"
          title="Hover to view navigation bar"
        >
          <div className="h-20 w-2.5 bg-primary/40 group-hover/edge:bg-primary group-hover/edge:w-3.5 rounded-l-2xl border-l border-y border-white/30 shadow-md backdrop-blur-md transition-all duration-300 mr-0" />
        </div>
      )}

      {/* Desktop Floating Right-Side Liquid Glass Sidebar */}
      <div 
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={cn(
          "hidden md:flex flex-col font-faruma overflow-hidden z-[100] transition-all duration-300 group/sidebar fixed right-3 top-3 bottom-3 rounded-[2.5rem] apple-liquid-glass shadow-[0_25px_60px_-15px_rgba(0,0,0,0.35)] border border-white/25 dark:border-white/10",
          isExpanded 
            ? "w-72 xl:w-80 2xl:w-88 opacity-100 pointer-events-auto translate-x-0" 
            : "w-0 opacity-0 pointer-events-none translate-x-12 border-none shadow-none"
        )}
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            setSidebarCollapsed(!sidebarCollapsed);
            if (sidebarCollapsed) setIsHovered(false);
          }}
          className="absolute top-5 left-5 z-[120] transition-all h-8 w-8 bg-background/80 hover:bg-background text-muted-foreground hover:text-foreground rounded-2xl border border-white/20 dark:border-white/10 shadow-xs backdrop-blur-md apple-glass-pill cursor-pointer"
          title={sidebarCollapsed ? "Pin Sidebar Open" : "Unpin (Auto-hide)"}
        >
          {sidebarCollapsed ? <Pin className="h-4 w-4" /> : <PinOff className="h-4 w-4" />}
        </Button>

        <div className={cn("flex-1 flex flex-col h-full transition-opacity duration-300", isExpanded ? "opacity-100" : "opacity-0")}>
          {renderNavContent(false)}
        </div>
      </div>

      {/* User Profile Modal with Name Editing, Granted Accesses & Logout */}
      <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
        <DialogContent 
          className="sm:max-w-[34rem] w-[95vw] font-faruma apple-glass-dialog text-foreground border border-white/20 dark:border-white/10 text-right p-6 sm:p-7 shadow-2xl rounded-3xl overflow-hidden [&>button]:left-4 [&>button]:right-auto" 
          dir="rtl"
        >
          <DialogHeader className="pb-3 text-right space-y-1.5 border-b border-border/60 pl-10 pr-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary shrink-0 shadow-xs">
                <Users className="h-5 w-5" />
              </div>
              <div className="text-right flex-1 min-w-0">
                <DialogTitle className="text-xl sm:text-2xl font-black text-foreground">
                  ބޭނުންކުރާ ފަރާތުގެ ޕްރޮފައިލް (User Profile)
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground text-right mt-0.5">
                  ތިބާގެ އެކައުންޓް މަޢުލޫމާތާއި ލިބިފައިވާ ހުއްދަތައް ބައްލަވައި ނަން ބަދަލުކުރައްވާ
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <ScrollArea className="max-h-[70vh] pr-1 pl-1">
            <div className="py-2 space-y-4">
              {/* Profile Card Header */}
              <div className="bg-gradient-to-l from-primary/15 via-primary/5 to-transparent border border-primary/20 rounded-2xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Active Now
                  </Badge>
                  <Badge className="bg-primary/20 text-primary border border-primary/30 font-black text-xs uppercase px-2.5 py-0.5 rounded-full">
                    {currentUser?.role || 'User'}
                  </Badge>
                </div>
                <div className="text-right">
                  <p className="font-mono text-xs text-muted-foreground">@{currentUser?.username || 'user'}</p>
                  <p className="font-black text-base text-foreground mt-0.5">
                    {currentUser?.name_dv || currentUser?.name_en || currentUser?.username}
                  </p>
                </div>
              </div>

              {/* Edit Name Section */}
              <form onSubmit={handleSaveName} className="space-y-3 bg-muted/40 border border-border/80 rounded-2xl p-4">
                <div className="flex items-center justify-between border-b border-border/50 pb-2">
                  <span className="text-[10px] text-muted-foreground font-mono">Dhivehi & English Name</span>
                  <div className="flex items-center gap-1.5 text-xs font-black text-foreground">
                    <span>ނަން ބަދަލުކުރުން (Edit Name)</span>
                    <Edit3 className="h-3.5 w-3.5 text-primary" />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1 text-right">
                    <Label htmlFor="editNameDv" className="text-xs font-bold text-muted-foreground block">
                      ނަން (ދިވެހިން) - Dhivehi Name
                    </Label>
                    <Input
                      id="editNameDv"
                      value={editNameDv}
                      onChange={(e) => setEditNameDv(e.target.value)}
                      placeholder="މުޙައްމަދު ޢަލީ"
                      className="h-10 text-right bg-background border-border font-bold text-sm rounded-xl"
                      dir="rtl"
                    />
                  </div>

                  <div className="space-y-1 text-right">
                    <Label htmlFor="editNameEn" className="text-xs font-bold text-muted-foreground block">
                      Name (English)
                    </Label>
                    <Input
                      id="editNameEn"
                      value={editNameEn}
                      onChange={(e) => setEditNameEn(e.target.value)}
                      placeholder="Mohamed Ali"
                      className="h-10 text-left bg-background border-border font-bold text-sm rounded-xl font-sans"
                      dir="ltr"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isSavingName || (!editNameDv.trim() && !editNameEn.trim())}
                    className="w-full h-10 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs uppercase gap-2 transition-all shadow-sm active:scale-95"
                  >
                    <Save className="h-3.5 w-3.5" />
                    <span>{isSavingName ? 'ރައްކާކުރަނީ...' : 'ނަން ސޭވްކުރޭ (Save Changes)'}</span>
                  </Button>
                </div>
              </form>

              {/* Accesses & Permissions Section */}
              <div className="space-y-2.5 bg-muted/40 border border-border/80 rounded-2xl p-4">
                <div className="flex items-center justify-between border-b border-border/50 pb-2">
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {permissionsList.filter(p => p.granted).length} / {permissionsList.length} Granted
                  </span>
                  <div className="flex items-center gap-1.5 text-xs font-black text-foreground">
                    <span>ލިބިފައިވާ ހުއްދަތައް (Access & Permissions)</span>
                    <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {permissionsList.map((perm) => (
                    <div 
                      key={perm.key}
                      className={cn(
                        "flex items-center justify-between p-2.5 rounded-xl border text-right transition-all",
                        perm.granted 
                          ? "bg-emerald-500/5 border-emerald-500/20 text-foreground" 
                          : "bg-muted/30 border-border/50 text-muted-foreground/60 opacity-60"
                      )}
                    >
                      <div className="shrink-0 pl-1">
                        {perm.granted ? (
                          <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                            <Check className="h-3 w-3 stroke-[3]" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-muted text-muted-foreground flex items-center justify-center">
                            <Lock className="h-3 w-3" />
                          </div>
                        )}
                      </div>
                      <div className="text-right flex-1 pr-2 min-w-0">
                        <p className="text-xs font-black truncate">{perm.labelDv}</p>
                        <p className="text-[10px] text-muted-foreground font-mono truncate">{perm.labelEn}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Prominent Logout Button Inside Profile */}
              <div className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsProfileOpen(false);
                    handleLogout();
                  }}
                  className="w-full h-12 rounded-2xl border-2 border-red-500/30 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white font-black text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-red-500/10 active:scale-[0.98]"
                >
                  <LogOut className="h-4.5 w-4.5" />
                  <span>ލޮގްއައުޓް (Logout from System)</span>
                </Button>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Sidebar;