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
import { ChevronDown, ChevronUp, Upload, Image as ImageIcon, Trash2, Settings, Landmark, Monitor, Layout, FileText, Printer, Building2, X, Edit, UserPlus, Shield, Database, Languages, Palette, Globe } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import { cn } from '@/lib/utils';
import { useAppContext } from '@/context/AppContext';
import { useAuth, User } from '@/context/AuthContext';
import UserDialog from '@/components/UserDialog';
import { ScrollArea } from '@/components/ui/scroll-area';

const Admin = () => {
  const { t, i18n } = useTranslation();
  const { settings, updateSettings, clearAllData } = useAppContext();
  const { currentUser } = useAuth();

  const shopSettings = settings.shop;
  const accountingSettings = settings.accounting;
  const softwareSettings = settings.software;
  const generalSettings = settings.general;
  const reportSettings = settings.reports;
  const printingSettings = settings.printing;

  const [expandedSections, setExpandedSections] = useState({
    shopSettings: true,
    accountingSettings: false,
    softwareSettings: false,
    generalSettings: false,
    reportSettings: false,
    printingSettings: false,
    userManagement: false,
    dataManagement: false,
  });

  const [isClearingData, setIsClearingData] = useState(false);
  const { users, deleteUser } = useAuth();
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleShopSettingsChange = (field: string, value: string | number | boolean) => {
    updateSettings('shop', { [field]: value });
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

  const renderBoth = (key: string, options?: any) => (
    <>
      {t(key, options)} ({t(key, { ...options, lng: 'en' })})
    </>
  );

  const SectionHeader = ({ id, icon: Icon, title, expanded }: any) => (
    <div 
      onClick={() => toggleSection(id)}
      className={cn(
        "flex items-center justify-between p-6 cursor-pointer transition-all border-b border-white/5 hover:bg-white/5",
        expanded ? "bg-white/5" : ""
      )}
    >
      <div className="flex items-center gap-4">
         <div className={cn(
           "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
           expanded ? "bg-primary text-white shadow-[0_0_15px_rgba(0,132,255,0.3)]" : "bg-white/5 text-white/40"
         )}>
            <Icon className="h-5 w-5" />
         </div>
         <div className="text-right">
            <h3 className="text-lg font-black text-white">{title}</h3>
            <p className="text-[10px] text-white/20 uppercase font-bold tracking-widest">Configuration Settings</p>
         </div>
      </div>
      {expanded ? <ChevronUp className="text-white/20" /> : <ChevronDown className="text-white/20" />}
    </div>
  );

  return (
    <div className="p-6 font-faruma flex flex-col h-full bg-[#050510] text-white overflow-hidden" dir="rtl">
       <div className="flex justify-between items-center mb-8">
          <div className="text-right">
             <h1 className="text-3xl font-black text-white flex items-center justify-end gap-3">
               {renderBoth('admin_settings')} <Settings className="h-8 w-8 text-primary" />
             </h1>
             <p className="text-sm text-white/40 mt-1">Configure your system, users and business logic</p>
          </div>
       </div>

       <ScrollArea className="flex-1 custom-scrollbar">
          <div className="max-w-4xl mx-auto space-y-6 pb-10">
             {/* Shop Settings */}
             <Card className="bg-[#0a0a1a] border-white/5 rounded-3xl overflow-hidden shadow-2xl">
                <SectionHeader 
                  id="shopSettings" 
                  icon={Building2} 
                  title={renderBoth('shop_settings')} 
                  expanded={expandedSections.shopSettings} 
                />
                {expandedSections.shopSettings && (
                  <CardContent className="p-8 space-y-8 animate-in fade-in slide-in-from-top-4 duration-300">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                           <div className="space-y-2">
                              <Label className="text-[10px] font-black uppercase text-white/40 tracking-widest">{renderBoth('shop_name')}</Label>
                              <Input 
                                value={shopSettings.shopName} 
                                onChange={(e) => handleShopSettingsChange('shopName', e.target.value)}
                                className="bg-white/5 border-white/10 h-12 rounded-xl text-right font-bold"
                              />
                           </div>
                           <div className="space-y-2">
                              <Label className="text-[10px] font-black uppercase text-white/40 tracking-widest">{renderBoth('shop_address')}</Label>
                              <Input 
                                value={shopSettings.shopAddress} 
                                onChange={(e) => handleShopSettingsChange('shopAddress', e.target.value)}
                                className="bg-white/5 border-white/10 h-12 rounded-xl text-right font-bold"
                              />
                           </div>
                           <div className="space-y-2">
                              <Label className="text-[10px] font-black uppercase text-white/40 tracking-widest">{renderBoth('shop_phone')}</Label>
                              <Input 
                                value={shopSettings.shopPhone} 
                                onChange={(e) => handleShopSettingsChange('shopPhone', e.target.value)}
                                className="bg-white/5 border-white/10 h-12 rounded-xl text-right font-mono"
                              />
                           </div>
                        </div>

                        <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-white/5 rounded-3xl bg-white/2">
                           {shopSettings.logo ? (
                             <div className="relative group">
                                <img src={shopSettings.logo} className="h-32 w-auto object-contain drop-shadow-2xl" />
                                <Button 
                                  variant="destructive" 
                                  size="icon" 
                                  className="absolute -top-2 -right-2 h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={() => handleShopSettingsChange('logo', '')}
                                >
                                   <Trash2 className="h-4 w-4" />
                                </Button>
                             </div>
                           ) : (
                             <div className="text-center">
                                <ImageIcon className="h-12 w-12 text-white/10 mx-auto mb-4" />
                                <Label htmlFor="logo-upload" className="cursor-pointer bg-primary text-white px-6 py-2 rounded-xl font-bold hover:bg-primary/90 transition-all">
                                   UPLOAD LOGO
                                </Label>
                                <input id="logo-upload" type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                             </div>
                           )}
                           <p className="text-[10px] text-white/20 mt-4 font-bold uppercase tracking-widest">Recommended size: 500x200px</p>
                        </div>
                     </div>

                     <div className="grid grid-cols-2 gap-8">
                        <div className="space-y-2">
                           <Label className="text-[10px] font-black uppercase text-white/40 tracking-widest">{renderBoth('currency')}</Label>
                           <Input 
                             value={shopSettings.currency} 
                             onChange={(e) => handleShopSettingsChange('currency', e.target.value)}
                             className="bg-white/5 border-white/10 h-12 rounded-xl text-right font-black text-primary"
                           />
                        </div>
                        <div className="space-y-2">
                           <Label className="text-[10px] font-black uppercase text-white/40 tracking-widest">{renderBoth('tax_rate')} (%)</Label>
                           <Input 
                             type="number"
                             value={shopSettings.taxRate} 
                             onChange={(e) => handleShopSettingsChange('taxRate', parseFloat(e.target.value))}
                             className="bg-white/5 border-white/10 h-12 rounded-xl text-right font-black"
                           />
                        </div>
                     </div>
                  </CardContent>
                )}
             </Card>

             {/* User Management */}
             <Card className="bg-[#0a0a1a] border-white/5 rounded-3xl overflow-hidden shadow-2xl">
                <SectionHeader 
                  id="userManagement" 
                  icon={Shield} 
                  title={renderBoth('user_management')} 
                  expanded={expandedSections.userManagement} 
                />
                {expandedSections.userManagement && (
                  <CardContent className="p-8 space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">
                     <div className="flex justify-between items-center">
                        <Button 
                          onClick={() => { setSelectedUser(null); setUserDialogOpen(true); }}
                          className="bg-primary hover:bg-primary/90 h-11 px-6 rounded-xl font-black gap-2"
                        >
                           <UserPlus className="h-4 w-4" /> {renderBoth('add_user')}
                        </Button>
                        <p className="text-xs font-bold text-white/40 uppercase tracking-widest">Manage system access levels</p>
                     </div>

                     <div className="grid grid-cols-1 gap-4">
                        {users.map((user) => (
                          <div key={user.id} className="p-4 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between group hover:bg-white/10 transition-all">
                             <div className="flex gap-2">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-9 w-9 rounded-xl hover:bg-blue-500/10 text-blue-400"
                                  onClick={() => { setSelectedUser(user); setUserDialogOpen(true); }}
                                >
                                   <Edit className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-9 w-9 rounded-xl hover:bg-red-500/10 text-red-400"
                                  onClick={() => deleteUser(user.id)}
                                >
                                   <Trash2 className="h-4 w-4" />
                                </Button>
                             </div>
                             <div className="text-right">
                                <div className="flex items-center justify-end gap-3 mb-1">
                                   <span className="text-lg font-black text-white">{user.name_dv}</span>
                                   <span className="bg-primary/20 text-primary text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">{user.role}</span>
                                </div>
                                <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">{user.username}</p>
                             </div>
                          </div>
                        ))}
                     </div>
                  </CardContent>
                )}
             </Card>

             {/* Software Settings */}
             <Card className="bg-[#0a0a1a] border-white/5 rounded-3xl overflow-hidden shadow-2xl">
                <SectionHeader 
                  id="softwareSettings" 
                  icon={Monitor} 
                  title={renderBoth('software_settings')} 
                  expanded={expandedSections.softwareSettings} 
                />
                {expandedSections.softwareSettings && (
                  <CardContent className="p-8 space-y-8 animate-in fade-in slide-in-from-top-4 duration-300">
                     <div className="grid grid-cols-2 gap-8">
                        <div className="space-y-4">
                           <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
                              <Languages className="h-5 w-5 text-primary" />
                              <div className="text-right">
                                 <Label className="text-[10px] font-black uppercase text-white/40 tracking-widest mb-2 block">System Language</Label>
                                 <Select value={softwareSettings.language} onValueChange={(val) => updateSettings('software', { language: val })}>
                                    <SelectTrigger className="w-[120px] bg-white/10 border-none h-9 text-right font-bold">
                                       <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-[#0a0a1a] border-white/10 text-white">
                                       <SelectItem value="dv" className="text-right">ދިވެހި</SelectItem>
                                       <SelectItem value="en" className="text-right">English</SelectItem>
                                    </SelectContent>
                                 </Select>
                              </div>
                           </div>
                        </div>
                        <div className="space-y-4">
                           <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
                              <Palette className="h-5 w-5 text-purple-500" />
                              <div className="text-right">
                                 <Label className="text-[10px] font-black uppercase text-white/40 tracking-widest mb-2 block">System Theme</Label>
                                 <Select value={softwareSettings.theme} onValueChange={(val) => updateSettings('software', { theme: val })}>
                                    <SelectTrigger className="w-[120px] bg-white/10 border-none h-9 text-right font-bold">
                                       <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-[#0a0a1a] border-white/10 text-white">
                                       <SelectItem value="dark" className="text-right">Dark Mode</SelectItem>
                                       <SelectItem value="light" className="text-right">Light Mode</SelectItem>
                                    </SelectContent>
                                 </Select>
                              </div>
                           </div>
                        </div>
                     </div>
                  </CardContent>
                )}
             </Card>

             {/* Data Management */}
             <Card className="bg-[#0a0a1a] border-white/5 rounded-3xl overflow-hidden shadow-2xl border-red-500/10">
                <SectionHeader 
                  id="dataManagement" 
                  icon={Database} 
                  title={renderBoth('data_management')} 
                  expanded={expandedSections.dataManagement} 
                />
                {expandedSections.dataManagement && (
                  <CardContent className="p-8 space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">
                     <div className="p-6 bg-red-500/5 border border-red-500/20 rounded-3xl">
                        <div className="flex items-start gap-4 text-right">
                           <div className="flex-1">
                              <h4 className="text-lg font-black text-red-500 mb-2">CRITICAL ACTION: CLEAR ALL DATA</h4>
                              <p className="text-xs text-white/40 leading-relaxed mb-6">
                                This action will permanently delete all sales, products, customers, vendors and settings from the local database. 
                                This process cannot be undone. Please ensure you have a backup before proceeding.
                              </p>
                              <Button 
                                variant="destructive" 
                                onClick={async () => {
                                   const code = window.prompt("ENTER SECRET CODE TO PROCEED:");
                                   if (code === '1234') {
                                      if (window.confirm("ARE YOU ABSOLUTELY SURE? ALL DATA WILL BE WIPED.")) {
                                         setIsClearingData(true);
                                         await clearAllData();
                                         setIsClearingData(false);
                                         showSuccess("SYSTEM DATA WIPED SUCCESSFULLY");
                                      }
                                   } else if (code !== null) {
                                      showError("INVALID SECRET CODE");
                                   }
                                }}
                                className="bg-red-600 hover:bg-red-700 h-12 px-8 rounded-xl font-black gap-2 uppercase tracking-widest shadow-lg shadow-red-500/20"
                                disabled={isClearingData}
                              >
                                 <Trash2 className="h-5 w-5" /> {isClearingData ? "CLEARING..." : "WIPE SYSTEM DATA"}
                              </Button>
                           </div>
                           <div className="w-12 h-12 rounded-2xl bg-red-500/20 flex items-center justify-center text-red-500">
                              <Shield className="h-6 w-6" />
                           </div>
                        </div>
                     </div>
                  </CardContent>
                )}
             </Card>
          </div>
       </ScrollArea>

       <UserDialog 
         isOpen={userDialogOpen}
         onClose={() => setUserDialogOpen(false)}
         user={selectedUser}
       />
    </div>
  );
};

export default Admin;