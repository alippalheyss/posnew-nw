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
import { ChevronDown, ChevronUp, Upload, Image as ImageIcon, Trash2, Settings, Landmark, Monitor, Layout, FileText, Printer, Building2, X, Edit, UserPlus, Shield, Database, Languages, Palette, Globe, CreditCard, Receipt, Percent, LogOut, Gift, Clock, Users } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import { cn } from '@/lib/utils';
import { useAppContext } from '@/context/AppContext';
import { useAuth, User } from '@/context/AuthContext';
import UserDialog from '@/components/UserDialog';
import CustomerDisplayOfferDialog from '@/components/CustomerDisplayOfferDialog';
import { CustomerDisplayOffer } from '@/context/AppContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNavigate } from 'react-router-dom';

const Admin = () => {
  const { t, i18n } = useTranslation();
  const { settings, updateSettings, clearAllData } = useAppContext();
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const shopSettings = settings.shop;
  const accountingSettings = settings.accounting;
  const softwareSettings = settings.software;
  const generalSettings = settings.general;
  const reportSettings = settings.reports;
  const printingSettings = settings.printing;

  const [isOfferDialogOpen, setIsOfferDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('shopSettings');

  const [isClearingData, setIsClearingData] = useState(false);
  const { users, deleteUser } = useAuth();
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // const toggleSection = (section: string) => setActiveTab(section);

  const handleSettingsChange = (category: string, field: string, value: any) => {
    updateSettings(category as any, { [field]: value });
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const max_size = 500;

          if (width > height) {
            if (width > max_size) {
              height *= max_size / width;
              width = max_size;
            }
          } else {
            if (height > max_size) {
              width *= max_size / height;
              height = max_size;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL('image/png', 0.8);
          handleSettingsChange('shop', 'logo', compressedBase64);
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDatabaseUploadClick = () => {
    document.getElementById('database-upload')?.click();
  };

  const handleAddOffer = (offer: CustomerDisplayOffer) => {
    const currentOffers = generalSettings.customerDisplayOffers || [];
    if (currentOffers.length >= 5) {
      showError('Maximum 5 custom offers allowed');
      return;
    }
    handleSettingsChange('general', 'customerDisplayOffers', [...currentOffers, offer]);
    showSuccess('Offer added successfully');
  };

  const handleRemoveOffer = (id: string) => {
    const currentOffers = generalSettings.customerDisplayOffers || [];
    handleSettingsChange('general', 'customerDisplayOffers', currentOffers.filter(o => o.id !== id));
    showSuccess('Offer removed');
  };

  const renderBoth = (key: string, options?: any) => (
    <>
      {t(key, options)} ({t(key, { ...options, lng: 'en' })})
    </>
  );

  

  return (
    <div className="p-6 font-faruma flex flex-col h-full bg-background text-foreground overflow-hidden" dir="rtl">
       <div className="flex justify-between items-center mb-8">
          <Button 
            onClick={() => {
              logout();
              navigate('/login');
            }}
            variant="destructive"
            className="bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-foreground h-11 px-6 rounded-xl font-black gap-2 transition-all"
          >
             <LogOut className="h-4 w-4" /> {renderBoth('logout')}
          </Button>
          <div className="text-right">
             <h1 className="text-3xl font-black text-foreground flex items-center justify-end gap-3">
               {renderBoth('admin_settings')} <Settings className="h-8 w-8 text-primary" />
             </h1>
             <p className="text-sm text-muted-foreground mt-1">Configure your system, users and business logic</p>
          </div>
       </div>

       <div className="flex-1 flex overflow-hidden max-w-7xl mx-auto w-full gap-6 pb-6">
          <div className="w-64 flex-shrink-0 bg-card rounded-3xl border border-border p-4 flex flex-col gap-2 overflow-y-auto custom-scrollbar">
            <Button variant={activeTab === 'shopSettings' ? 'default' : 'ghost'} className="justify-start gap-3 rounded-xl font-bold" onClick={() => setActiveTab('shopSettings')}><Building2 className="h-4 w-4" /> {renderBoth('shop_settings')}</Button>
            <Button variant={activeTab === 'accountingSettings' ? 'default' : 'ghost'} className="justify-start gap-3 rounded-xl font-bold" onClick={() => setActiveTab('accountingSettings')}><Landmark className="h-4 w-4" /> {renderBoth('accounting_settings')}</Button>
            <Button variant={activeTab === 'softwareSettings' ? 'default' : 'ghost'} className="justify-start gap-3 rounded-xl font-bold" onClick={() => setActiveTab('softwareSettings')}><Monitor className="h-4 w-4" /> {renderBoth('software_settings')}</Button>
            <Button variant={activeTab === 'generalSettings' ? 'default' : 'ghost'} className="justify-start gap-3 rounded-xl font-bold" onClick={() => setActiveTab('generalSettings')}><Layout className="h-4 w-4" /> {renderBoth('general_settings')}</Button>
            <Button variant={activeTab === 'reportSettings' ? 'default' : 'ghost'} className="justify-start gap-3 rounded-xl font-bold" onClick={() => setActiveTab('reportSettings')}><FileText className="h-4 w-4" /> {renderBoth('report_settings')}</Button>
            <Button variant={activeTab === 'printingSettings' ? 'default' : 'ghost'} className="justify-start gap-3 rounded-xl font-bold" onClick={() => setActiveTab('printingSettings')}><Printer className="h-4 w-4" /> {renderBoth('printing_settings')}</Button>
            <Button variant={activeTab === 'userManagement' ? 'default' : 'ghost'} className="justify-start gap-3 rounded-xl font-bold" onClick={() => setActiveTab('userManagement')}><Users className="h-4 w-4" /> {renderBoth('user_management')}</Button>
            <Button variant={activeTab === 'dataManagement' ? 'default' : 'ghost'} className="justify-start gap-3 rounded-xl font-bold" onClick={() => setActiveTab('dataManagement')}><Database className="h-4 w-4" /> {renderBoth('data_management')}</Button>
          </div>
          <ScrollArea className="flex-1 custom-scrollbar bg-card rounded-3xl border border-border">
            <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
             {/* Shop Settings */}
             {activeTab === 'shopSettings' && (
                  <div className="space-y-8">
                    
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                           <div className="space-y-2">
                              <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">{renderBoth('shop_name')}</Label>
                              <Input 
                                value={shopSettings.shopName} 
                                onChange={(e) => handleSettingsChange('shop', 'shopName', e.target.value)}
                                className="bg-muted border-border h-12 rounded-xl text-right font-bold"
                              />
                           </div>
                           <div className="space-y-2">
                              <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">{renderBoth('shop_address')}</Label>
                              <Input 
                                value={shopSettings.shopAddress} 
                                onChange={(e) => handleSettingsChange('shop', 'shopAddress', e.target.value)}
                                className="bg-muted border-border h-12 rounded-xl text-right font-bold"
                              />
                           </div>
                           <div className="space-y-2">
                              <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">{renderBoth('shop_phone')}</Label>
                              <Input 
                                value={shopSettings.shopPhone} 
                                onChange={(e) => handleSettingsChange('shop', 'shopPhone', e.target.value)}
                                className="bg-muted border-border h-12 rounded-xl text-right font-mono"
                              />
                           </div>
                        </div>

                        <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-border rounded-3xl bg-white/2">
                           {shopSettings.logo ? (
                             <div className="relative group">
                                <img src={shopSettings.logo} className="h-32 w-auto object-contain drop-shadow-2xl" />
                                <Button 
                                  variant="destructive" 
                                  size="icon" 
                                  className="absolute -top-2 -right-2 h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={() => handleSettingsChange('shop', 'logo', '')}
                                >
                                   <Trash2 className="h-4 w-4" />
                                </Button>
                             </div>
                           ) : (
                             <div className="text-center">
                                <ImageIcon className="h-12 w-12 text-foreground/10 mx-auto mb-4" />
                                <Label htmlFor="logo-upload" className="cursor-pointer bg-primary text-foreground px-6 py-2 rounded-xl font-bold hover:bg-primary/90 transition-all">
                                   UPLOAD LOGO
                                </Label>
                                <input id="logo-upload" type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                             </div>
                           )}
                           <p className="text-[10px] text-muted-foreground/50 mt-4 font-bold uppercase tracking-widest">Recommended size: 500x200px</p>
                        </div>
                     </div>

                     <div className="grid grid-cols-2 gap-8">
                        <div className="space-y-2">
                           <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">{renderBoth('currency')}</Label>
                           <Input 
                             value={shopSettings.currency} 
                             onChange={(e) => handleSettingsChange('shop', 'currency', e.target.value)}
                             className="bg-muted border-border h-12 rounded-xl text-right font-black text-primary"
                           />
                        </div>
                        <div className="space-y-2">
                           <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">{renderBoth('tax_rate')} (%)</Label>
                           <Input 
                             type="number"
                             value={shopSettings.taxRate} 
                             onChange={(e) => handleSettingsChange('shop', 'taxRate', parseFloat(e.target.value))}
                             className="bg-muted border-border h-12 rounded-xl text-right font-black"
                           />
                        </div>
                     </div>
                  
                  </div>
                )}

             {/* Accounting Settings */}
             {activeTab === 'accountingSettings' && (
                  <div className="space-y-8">
                    
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="flex items-center justify-between p-4 bg-muted rounded-2xl border border-border">
                           <CreditCard className="h-5 w-5 text-primary" />
                           <div className="text-right">
                              <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-2 block">Enable Credit Sales</Label>
                              <Switch 
                                checked={accountingSettings.enableCreditSales} 
                                onCheckedChange={(val) => handleSettingsChange('accounting', 'enableCreditSales', val)}
                                className="data-[state=checked]:bg-primary"
                              />
                           </div>
                        </div>
                        <div className="space-y-2">
                           <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Default Credit Limit</Label>
                           <div className="relative">
                              <Percent className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                              <Input 
                                type="number"
                                value={accountingSettings.creditLimit} 
                                onChange={(e) => handleSettingsChange('accounting', 'creditLimit', parseFloat(e.target.value))}
                                className="bg-muted border-border h-12 rounded-xl text-right font-bold pr-10"
                              />
                           </div>
                        </div>
                     </div>
                  
                  </div>
                )}

             {/* Loyalty Settings */}
             {activeTab === 'generalSettings' && (
                  <div className="space-y-8">
                    
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="flex items-center justify-between p-4 bg-muted rounded-2xl border border-border">
                           <Gift className="h-5 w-5 text-primary" />
                           <div className="text-right">
                              <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-2 block">Enable Loyalty Program</Label>
                              <Switch 
                                checked={generalSettings.enableLoyaltyProgram} 
                                onCheckedChange={(val) => handleSettingsChange('general', 'enableLoyaltyProgram', val)}
                                className="data-[state=checked]:bg-primary"
                              />
                           </div>
                        </div>
                        <div className="space-y-2">
                           <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Amount to earn 1 Point</Label>
                           <div className="relative">
                              <Input 
                                type="number"
                                value={generalSettings.loyaltyAmountPerPoint || 20} 
                                onChange={(e) => handleSettingsChange('general', 'loyaltyAmountPerPoint', parseFloat(e.target.value))}
                                className="bg-muted border-border h-12 rounded-xl text-right font-bold"
                              />
                           </div>
                        </div>
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-2">
                           <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Points for 1 {shopSettings.currency} discount</Label>
                           <div className="relative">
                              <Input 
                                type="number"
                                value={generalSettings.loyaltyPointsValue || 100} 
                                onChange={(e) => handleSettingsChange('general', 'loyaltyPointsValue', parseFloat(e.target.value))}
                                className="bg-muted border-border h-12 rounded-xl text-right font-bold"
                              />
                           </div>
                        </div>
                        <div className="space-y-2">
                           <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Minimum Points to Redeem</Label>
                           <div className="relative">
                              <Input 
                                type="number"
                                value={generalSettings.loyaltyMinRedeemPoints || 1000} 
                                onChange={(e) => handleSettingsChange('general', 'loyaltyMinRedeemPoints', parseFloat(e.target.value))}
                                className="bg-muted border-border h-12 rounded-xl text-right font-bold"
                              />
                           </div>
                        </div>
                     </div>
                     <div className="pt-6 border-t border-border grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="flex items-center justify-between p-4 bg-muted rounded-2xl border border-border">
                           <Monitor className="h-5 w-5 text-primary" />
                           <div className="text-right">
                              <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-2 block">Enable Customer Display</Label>
                              <Switch 
                                checked={generalSettings.enableCustomerDisplay ?? true} 
                                onCheckedChange={(val) => handleSettingsChange('general', 'enableCustomerDisplay', val)}
                                className="data-[state=checked]:bg-primary"
                              />
                           </div>
                        </div>
                        <div className="space-y-2">
                           <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Idle Timeout (Minutes)</Label>
                           <div className="relative">
                              <Clock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                              <Input 
                                type="number"
                                value={generalSettings.customerDisplayIdleTimeout || 10} 
                                onChange={(e) => handleSettingsChange('general', 'customerDisplayIdleTimeout', parseFloat(e.target.value))}
                                className="bg-muted border-border h-12 rounded-xl text-right font-bold pr-10"
                              />
                           </div>
                        </div>
                     </div>
                     
                     <div className="pt-6 border-t border-border space-y-4">
                        <div className="flex justify-between items-center">
                           <Button onClick={() => setIsOfferDialogOpen(true)} className="bg-primary hover:bg-primary/90 text-foreground rounded-xl">
                             Add Custom Offer
                           </Button>
                           <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest block text-right">
                             Custom Offers (Ad Mode)
                           </Label>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                           {(generalSettings.customerDisplayOffers || []).map((offer, idx) => (
                             <div key={offer.id || idx} className="bg-muted border border-border rounded-2xl p-4 relative group">
                               <Button 
                                 variant="destructive" 
                                 size="icon" 
                                 className="absolute -top-2 -right-2 h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                 onClick={() => handleRemoveOffer(offer.id)}
                               >
                                 <Trash2 className="h-4 w-4" />
                               </Button>
                               
                               {offer.type === 'image' ? (
                                 <div className="aspect-video w-full rounded-xl overflow-hidden bg-black/50">
                                   <img src={offer.image} className="w-full h-full object-cover" alt="Custom offer" />
                                 </div>
                               ) : (
                                 <div className="aspect-video w-full rounded-xl bg-primary/10 border border-primary/20 flex flex-col items-center justify-center text-center p-4">
                                   <h4 className="font-black text-xl text-foreground mb-1">{offer.title}</h4>
                                   {offer.subtitle && <p className="text-muted-foreground/80 text-sm mb-2">{offer.subtitle}</p>}
                                   {offer.priceText && <div className="bg-orange-500 text-foreground text-xs font-black px-2 py-1 rounded-md">{offer.priceText}</div>}
                                 </div>
                               )}
                             </div>
                           ))}
                           {(generalSettings.customerDisplayOffers || []).length === 0 && (
                             <div className="col-span-full text-center py-8 text-muted-foreground border border-dashed border-border rounded-2xl">
                               No custom offers added yet. Click "Add Custom Offer" to create one.
                             </div>
                           )}
                        </div>
                     </div>
                  
                  </div>
                )}

             {/* Printing Settings */}
             {activeTab === 'printingSettings' && (
                  <div className="space-y-8">
                    
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                           <div className="flex items-center justify-between p-4 bg-muted rounded-2xl border border-border">
                              <Receipt className="h-5 w-5 text-primary" />
                              <div className="text-right">
                                 <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-2 block">Print Mode</Label>
                                 <Select value={printingSettings.printMode} onValueChange={(val) => handleSettingsChange('printing', 'printMode', val)}>
                                    <SelectTrigger className="w-[120px] bg-muted/80 border-none h-9 text-right font-bold">
                                       <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-card border-border text-foreground">
                                       <SelectItem value="auto" className="text-right">Automatic</SelectItem>
                                       <SelectItem value="ask" className="text-right">Ask Always</SelectItem>
                                       <SelectItem value="off" className="text-right">Disabled</SelectItem>
                                    </SelectContent>
                                 </Select>
                              </div>
                           </div>
                        </div>
                        <div className="space-y-4">
                           <div className="flex items-center justify-between p-4 bg-muted rounded-2xl border border-border">
                              <Layout className="h-5 w-5 text-primary" />
                              <div className="text-right">
                                 <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-2 block">Paper Width</Label>
                                 <Select value={printingSettings.thermalPrinterWidth} onValueChange={(val) => handleSettingsChange('printing', 'thermalPrinterWidth', val)}>
                                    <SelectTrigger className="w-[120px] bg-muted/80 border-none h-9 text-right font-bold">
                                       <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-card border-border text-foreground">
                                       <SelectItem value="58mm" className="text-right">58mm</SelectItem>
                                       <SelectItem value="80mm" className="text-right">80mm</SelectItem>
                                    </SelectContent>
                                 </Select>
                              </div>
                           </div>
                        </div>
                     </div>
                     <div className="space-y-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-muted rounded-2xl border border-border gap-4">
                           <div className="flex items-center gap-3">
                             <Printer className="h-5 w-5 text-primary" />
                             <div>
                               <Label className="text-sm font-bold text-foreground mb-1 block">QZ Tray Direct Printing</Label>
                               <p className="text-xs text-foreground/50">Print silently by bypassing the browser dialog. Requires QZ Tray.</p>
                             </div>
                           </div>
                           <div className="flex items-center gap-4">
                             {printingSettings.useQzTray && (
                               <Input 
                                 placeholder="Exact Printer Name" 
                                 className="w-[200px] bg-muted/80 border-border text-foreground placeholder:text-foreground/30"
                                 value={printingSettings.printerName || ''}
                                 onChange={(e) => handleSettingsChange('printing', 'printerName', e.target.value)}
                               />
                             )}
                             <Switch 
                               checked={printingSettings.useQzTray} 
                               onCheckedChange={(checked) => handleSettingsChange('printing', 'useQzTray', checked)} 
                             />
                           </div>
                        </div>
                     </div>
                  
                  </div>
                )}

             {/* Report Settings */}
             {activeTab === 'reportSettings' && (
                  <div className="space-y-8">
                    
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4 text-right">
                           <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Invoice Header</Label>
                           <Input 
                             value={reportSettings.invoiceHeader} 
                             onChange={(e) => handleSettingsChange('reports', 'invoiceHeader', e.target.value)}
                             className="bg-muted border-border rounded-xl text-right"
                           />
                        </div>
                        <div className="space-y-4 text-right">
                           <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Invoice Footer</Label>
                           <Input 
                             value={reportSettings.invoiceFooter} 
                             onChange={(e) => handleSettingsChange('reports', 'invoiceFooter', e.target.value)}
                             className="bg-muted border-border rounded-xl text-right"
                           />
                        </div>
                     </div>
                  
                  </div>
                )}

             {/* User Management */}
             {activeTab === 'userManagement' && (
                  <div className="space-y-8">
                    
                     <div className="flex justify-between items-center">
                        <Button 
                          onClick={() => { setSelectedUser(null); setUserDialogOpen(true); }}
                          className="bg-primary hover:bg-primary/90 h-11 px-6 rounded-xl font-black gap-2"
                        >
                           <UserPlus className="h-4 w-4" /> {renderBoth('add_user')}
                        </Button>
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Manage system access levels</p>
                     </div>

                     <div className="grid grid-cols-1 gap-4">
                        {users.map((user) => (
                          <div key={user.id} className="p-4 bg-muted border border-border rounded-2xl flex items-center justify-between group hover:bg-muted/80 transition-all">
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
                                   <span className="text-lg font-black text-foreground">{user.name_dv}</span>
                                   <span className="bg-primary/20 text-primary text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">{user.role}</span>
                                </div>
                                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">{user.username}</p>
                             </div>
                          </div>
                        ))}
                     </div>
                  
                  </div>
                )}

             {/* Software Settings */}
             {activeTab === 'softwareSettings' && (
                  <div className="space-y-8">
                    
                     <div className="grid grid-cols-2 gap-8">
                        <div className="space-y-4">
                           <div className="flex items-center justify-between p-4 bg-muted rounded-2xl border border-border">
                              <Languages className="h-5 w-5 text-primary" />
                              <div className="text-right">
                                 <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-2 block">System Language</Label>
                                 <Select value={softwareSettings.language} onValueChange={(val) => handleSettingsChange('software', 'language', val)}>
                                    <SelectTrigger className="w-[120px] bg-muted/80 border-none h-9 text-right font-bold">
                                       <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-card border-border text-foreground">
                                       <SelectItem value="dv" className="text-right">ދިވެހި</SelectItem>
                                       <SelectItem value="en" className="text-right">English</SelectItem>
                                    </SelectContent>
                                 </Select>
                              </div>
                           </div>
                        </div>
                        <div className="space-y-4">
                           <div className="flex items-center justify-between p-4 bg-muted rounded-2xl border border-border">
                              <Palette className="h-5 w-5 text-purple-500" />
                              <div className="text-right">
                                 <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-2 block">System Theme</Label>
                                 <Select value={softwareSettings.theme} onValueChange={(val) => handleSettingsChange('software', 'theme', val)}>
                                    <SelectTrigger className="w-[120px] bg-muted/80 border-none h-9 text-right font-bold">
                                       <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-card border-border text-foreground">
                                       <SelectItem value="dark" className="text-right">Dark Mode</SelectItem>
                                       <SelectItem value="light" className="text-right">Light Mode</SelectItem>
                                    </SelectContent>
                                 </Select>
                              </div>
                           </div>
                        </div>
                     </div>
                  
                  </div>
                )}

             {/* Data Management */}
             {activeTab === 'dataManagement' && (
                  <div className="space-y-8">
                    
                     <div className="p-6 bg-red-500/5 border border-red-500/20 rounded-3xl">
                        <div className="flex items-start gap-4 text-right">
                           <div className="flex-1">
                              <h4 className="text-lg font-black text-red-500 mb-2">CRITICAL ACTION: CLEAR ALL DATA</h4>
                              <p className="text-xs text-muted-foreground leading-relaxed mb-6">
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
                  
                  </div>
                )}
          </div>
          </ScrollArea>
       </div>
       <UserDialog 
         open={userDialogOpen}
         onOpenChange={(open) => setUserDialogOpen(open)}
         user={selectedUser}
         onSave={() => {}}
       />
       <CustomerDisplayOfferDialog 
         open={isOfferDialogOpen} 
         onOpenChange={setIsOfferDialogOpen} 
         onSave={handleAddOffer} 
       />
    </div>
  );
};

export default Admin;