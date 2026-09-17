"use client";

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ChevronDown, ChevronUp, Upload, Image as ImageIcon, Trash2, Settings, Landmark, Monitor, Layout, FileText, Printer, Building2, X, Edit, UserPlus, Shield, Database, Languages, Palette, Globe, CreditCard, Receipt, Percent, LogOut, Gift, Clock, Users, CheckCircle2, Copy, ExternalLink, RefreshCw, Loader2, Send, Moon, BellRing } from 'lucide-react';
import { testTelegramBot, setTelegramWebhook, getTelegramWebhookInfo, deleteTelegramWebhook, setBotCommands, BOT_COMMANDS, TelegramBotInfo, DEFAULT_TELEGRAM_BOT_TOKEN, DEFAULT_TELEGRAM_BOT_USERNAME, sendTelegramMessage, sendNightlyExecutiveBriefing } from '@/services/telegramService';
import { showSuccess, showError } from '@/utils/toast';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import { useAuth, User } from '@/context/AuthContext';
import UserDialog from '@/components/UserDialog';
import CustomerDisplayOfferDialog from '@/components/CustomerDisplayOfferDialog';
import { CustomerDisplayOffer } from '@/context/AppContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNavigate } from 'react-router-dom';
import { PWAInstallButton } from '@/components/PWAInstallButton';


const Admin = () => {
  const { t, i18n } = useTranslation();
  const { settings, updateSettings, clearAllData, sales, customers } = useAppContext();
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const shopSettings = settings.shop;
  const accountingSettings = settings.accounting;
  const softwareSettings = settings.software;
  const generalSettings = settings.general;
  const reportSettings = settings.reports;
  const printingSettings = settings.printing;
  const telegramSettings = settings.telegram || {
    botToken: DEFAULT_TELEGRAM_BOT_TOKEN,
    botUsername: DEFAULT_TELEGRAM_BOT_USERNAME,
    autoSendPaymentReceipts: true,
    autoSendSaleReceipts: false,
    webhookUrl: '',
    ownerChatId: '',
    autoExecutiveBriefing: true,
    autoCreditReminderThreshold: true,
    creditReminderThresholdPct: 90,
    autoMonthlyCreditReminder: true,
  };

  const [botInfo, setBotInfo] = useState<TelegramBotInfo | null>(null);
  const [isTestingBot, setIsTestingBot] = useState(false);
  const [isSendingTestBriefing, setIsSendingTestBriefing] = useState(false);
  const [webhookUrlInput, setWebhookUrlInput] = useState(telegramSettings.webhookUrl || 'https://zmbbgfpzgfcsoexybrle.supabase.co/functions/v1/telegram-webhook');
  const [isRegisteringWebhook, setIsRegisteringWebhook] = useState(false);

  const TelegramIcon = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
    </svg>
  );

  const handleTestBot = async () => {
    try {
      setIsTestingBot(true);
      const res = await testTelegramBot(telegramSettings.botToken);
      if (res.ok && res.bot) {
        setBotInfo(res.bot);
        showSuccess(`Bot verified: @${res.bot.username} (${res.bot.first_name})`);
      } else {
        showError(res.error || 'Failed to authenticate bot');
      }
    } catch (err: any) {
      showError(err.message || 'Error testing bot');
    } finally {
      setIsTestingBot(false);
    }
  };

  const handleTestBriefing = async () => {
    const groupChat = groupChatIdInput || shopSettings?.telegramGroupChatId || telegramSettings.ownerChatId;
    if (!groupChat) {
      showError('Please configure or link the "B BACK" Telegram Group Chat ID first');
      return;
    }
    setIsSendingTestBriefing(true);
    try {
      const allSettlements = (customers || []).flatMap(c => c.settlement_history || []);
      const res = await sendNightlyExecutiveBriefing({
        chatId: groupChat,
        sales: sales || [],
        settlements: allSettlements,
        shopSettings: settings.shop,
        token: telegramSettings.botToken,
      });
      if (res?.ok) {
        showSuccess('Test Store Close Briefing sent to B BACK Telegram group! 📊');
      } else {
        showError(res?.description || 'Failed to send test briefing');
      }
    } catch (err: any) {
      showError(err.message || 'Failed to send test briefing');
    } finally {
      setIsSendingTestBriefing(false);
    }
  };

  const handleRegisterWebhook = async () => {
    if (!webhookUrlInput.trim()) {
      showError('Please enter a valid webhook URL');
      return;
    }
    try {
      setIsRegisteringWebhook(true);
      const res = await setTelegramWebhook(webhookUrlInput, telegramSettings.botToken);
      if (res.ok) {
        showSuccess('Webhook successfully registered with Telegram! 🚀');
        handleSettingsChange('telegram', 'webhookUrl', webhookUrlInput);
      } else {
        showError(res.description || 'Failed to register webhook');
      }
    } catch (err: any) {
      showError(err.message || 'Error registering webhook');
    } finally {
      setIsRegisteringWebhook(false);
    }
  };

  const [webhookLiveUrl, setWebhookLiveUrl] = useState<string | null>(null);
  const [isLoadingWebhookStatus, setIsLoadingWebhookStatus] = useState(false);

  const fetchWebhookStatus = async () => {
    try {
      setIsLoadingWebhookStatus(true);
      const res = await getTelegramWebhookInfo(telegramSettings.botToken);
      if (res.ok) {
        setWebhookLiveUrl(res.url || '');
      }
    } catch (e) {
      // silent
    } finally {
      setIsLoadingWebhookStatus(false);
    }
  };

  const handleActivateVercelWebhook = async () => {
    if (typeof window === 'undefined') return;
    const autoUrl = `${window.location.origin}/api/telegram-webhook`;
    setWebhookUrlInput(autoUrl);
    try {
      setIsRegisteringWebhook(true);
      const res = await setTelegramWebhook(autoUrl, telegramSettings.botToken);
      if (res.ok) {
        showSuccess('24/7 Cloud Webhook successfully activated! 🚀');
        setWebhookLiveUrl(autoUrl);
        handleSettingsChange('telegram', 'webhookUrl', autoUrl);
      } else {
        showError(res.description || 'Failed to activate webhook');
      }
    } catch (err: any) {
      showError(err.message || 'Error registering webhook');
    } finally {
      setIsRegisteringWebhook(false);
    }
  };

  const handleDeleteWebhook = async () => {
    try {
      setIsRegisteringWebhook(true);
      const res = await deleteTelegramWebhook(telegramSettings.botToken);
      if (res.ok) {
        showSuccess('Switched to Live Browser Polling mode! 🟡');
        setWebhookLiveUrl('');
        handleSettingsChange('telegram', 'webhookUrl', '');
      } else {
        showError(res.description || 'Failed to switch mode');
      }
    } catch (err: any) {
      showError(err.message || 'Error deleting webhook');
    } finally {
      setIsRegisteringWebhook(false);
    }
  };

  const [isSyncingCommands, setIsSyncingCommands] = useState(false);

  const handleSyncCommands = async () => {
    try {
      setIsSyncingCommands(true);
      const res = await setBotCommands(telegramSettings.botToken);
      if (res.ok) {
        showSuccess('Telegram bot menu commands successfully configured! 🤖');
      } else {
        showError('Failed to sync bot commands: ' + (res.description || 'Unknown error'));
      }
    } catch (err: any) {
      showError('Error syncing commands: ' + (err.message || 'Unknown error'));
    } finally {
      setIsSyncingCommands(false);
    }
  };

  const [groupChatIdInput, setGroupChatIdInput] = useState(shopSettings?.telegramGroupChatId || '');
  const [isSendingGroupTest, setIsSendingGroupTest] = useState(false);

  useEffect(() => {
    if (shopSettings?.telegramGroupChatId) {
      setGroupChatIdInput(String(shopSettings.telegramGroupChatId));
    } else {
      supabase
        .from('transfer_slips')
        .select('telegram_chat_id')
        .eq('file_id', 'group_config')
        .maybeSingle()
        .then(({ data }) => {
          if (data?.telegram_chat_id) {
            setGroupChatIdInput(String(data.telegram_chat_id));
          }
        })
        .catch(() => {});
    }
  }, [shopSettings?.telegramGroupChatId]);

  const handleSaveGroupChatId = async () => {
    const idStr = String(groupChatIdInput).trim();
    if (!idStr) {
      showError('Please enter a valid Group Chat ID');
      return;
    }
    handleSettingsChange('shop', 'telegramGroupChatId', idStr);
    try {
      await updateSettings('shop', {
        ...shopSettings,
        telegramGroupChatId: idStr,
      });

      // Also persist to transfer_slips (100% accessible to anon webhook)
      const numericId = parseInt(idStr, 10) || 0;
      const { data: existing } = await supabase
        .from('transfer_slips')
        .select('id')
        .eq('file_id', 'group_config')
        .maybeSingle();

      const payload = {
        telegram_chat_id: numericId,
        customer_name: 'B BACK',
        file_id: 'group_config',
        status: 'system_config',
        caption: JSON.stringify({ telegramGroupChatId: idStr, telegramGroupTitle: 'B BACK' }),
        updated_at: new Date().toISOString(),
      };

      if (existing) {
        await supabase.from('transfer_slips').update(payload).eq('id', existing.id);
      } else {
        await supabase.from('transfer_slips').insert(payload);
      }
      showSuccess('Group Chat ID saved & synced with bot! ✅');
    } catch (e: any) {
      showError('Error saving group: ' + (e.message || 'Unknown error'));
    }
  };

  const handleTestGroupNotification = async () => {
    const targetId = groupChatIdInput || shopSettings?.telegramGroupChatId;
    if (!targetId) {
      showError('Please enter a Group Chat ID or add the bot to the "B BACK" group first');
      return;
    }
    setIsSendingGroupTest(true);
    try {
      const res = await sendTelegramMessage(
        targetId,
        `🔔 *Test Notification from B BACK POS*\n\nThis group is successfully connected to the POS system! All customer bank transfer slips will be delivered here with customer profile details.`
      );
      if (res?.ok) {
        showSuccess('Test notification sent to Telegram group! 🚀');
      } else {
        showError(res?.description || 'Failed to send message to group');
      }
    } catch (err: any) {
      showError(err.message || 'Failed to send test message');
    } finally {
      setIsSendingGroupTest(false);
    }
  };

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
          <div className="w-80 flex-shrink-0 bg-card rounded-3xl border border-border p-4 flex flex-col gap-2 overflow-y-auto custom-scrollbar">
            <Button variant={activeTab === 'shopSettings' ? 'default' : 'ghost'} className="justify-start gap-3 rounded-xl font-bold h-auto py-3 whitespace-normal text-right" onClick={() => setActiveTab('shopSettings')}><Building2 className="h-5 w-5 shrink-0" /> {renderBoth('shop_settings')}</Button>
            <Button variant={activeTab === 'accountingSettings' ? 'default' : 'ghost'} className="justify-start gap-3 rounded-xl font-bold h-auto py-3 whitespace-normal text-right" onClick={() => setActiveTab('accountingSettings')}><Landmark className="h-5 w-5 shrink-0" /> {renderBoth('accounting_settings')}</Button>
            <Button variant={activeTab === 'softwareSettings' ? 'default' : 'ghost'} className="justify-start gap-3 rounded-xl font-bold h-auto py-3 whitespace-normal text-right" onClick={() => setActiveTab('softwareSettings')}><Monitor className="h-5 w-5 shrink-0" /> {renderBoth('software_settings')}</Button>
            <Button variant={activeTab === 'generalSettings' ? 'default' : 'ghost'} className="justify-start gap-3 rounded-xl font-bold h-auto py-3 whitespace-normal text-right" onClick={() => setActiveTab('generalSettings')}><Layout className="h-5 w-5 shrink-0" /> {renderBoth('general_settings')}</Button>
            <Button variant={activeTab === 'reportSettings' ? 'default' : 'ghost'} className="justify-start gap-3 rounded-xl font-bold h-auto py-3 whitespace-normal text-right" onClick={() => setActiveTab('reportSettings')}><FileText className="h-5 w-5 shrink-0" /> {renderBoth('report_settings')}</Button>
            <Button variant={activeTab === 'printingSettings' ? 'default' : 'ghost'} className="justify-start gap-3 rounded-xl font-bold h-auto py-3 whitespace-normal text-right" onClick={() => setActiveTab('printingSettings')}><Printer className="h-5 w-5 shrink-0" /> {renderBoth('printing_settings')}</Button>
            <Button variant={activeTab === 'telegramSettings' ? 'default' : 'ghost'} className="justify-start gap-3 rounded-xl font-bold h-auto py-3 whitespace-normal text-right text-[#229ED9]" onClick={() => setActiveTab('telegramSettings')}><TelegramIcon className="h-5 w-5 shrink-0" /> Telegram Bot</Button>
            <Button variant={activeTab === 'userManagement' ? 'default' : 'ghost'} className="justify-start gap-3 rounded-xl font-bold h-auto py-3 whitespace-normal text-right" onClick={() => setActiveTab('userManagement')}><Users className="h-5 w-5 shrink-0" /> {renderBoth('user_management')}</Button>
            <Button variant={activeTab === 'dataManagement' ? 'default' : 'ghost'} className="justify-start gap-3 rounded-xl font-bold h-auto py-3 whitespace-normal text-right" onClick={() => setActiveTab('dataManagement')}><Database className="h-5 w-5 shrink-0" /> {renderBoth('data_management')}</Button>
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

             {/* Software & PWA App Settings */}
             {activeTab === 'softwareSettings' && (
                  <div className="space-y-8">
                     <div className="p-6 bg-muted/40 border border-border rounded-3xl space-y-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                           <div className="w-full md:w-64">
                              <PWAInstallButton />
                           </div>
                           <div className="text-right">
                              <h3 className="text-lg font-black text-foreground flex items-center justify-end gap-2">
                                <span>Progressive Web App (PWA)</span>
                                <Monitor className="h-5 w-5 text-primary" />
                              </h3>
                              <p className="text-xs text-muted-foreground mt-1">
                                Install MVPOS as a native standalone desktop / mobile application with offline caching and silent kiosk printing.
                              </p>
                           </div>
                        </div>

                        <Separator className="bg-border" />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-right">
                           <div className="p-4 bg-muted rounded-2xl border border-border space-y-2">
                              <h4 className="text-sm font-black text-orange-400">Silent Kiosk Printing in PWA</h4>
                              <p className="text-xs text-muted-foreground leading-relaxed">
                                To bypass the browser print dialog completely, add <code className="px-1.5 py-0.5 bg-background rounded text-foreground font-mono">--kiosk-printing</code> to the end of the Windows PWA desktop shortcut's <strong>Target</strong> property.
                              </p>
                           </div>

                           <div className="p-4 bg-muted rounded-2xl border border-border space-y-2">
                              <h4 className="text-sm font-black text-emerald-400">Offline & Fast Caching</h4>
                              <p className="text-xs text-muted-foreground leading-relaxed">
                                Once installed, MVPOS service worker precaches all core assets, icons, fonts, and UI scripts for lightning-fast loading even with slow connectivity.
                              </p>
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
                                checked={generalSettings.enableLoyaltyProgram ?? true} 
                                onCheckedChange={(val) => handleSettingsChange('general', 'enableLoyaltyProgram', val)}
                                className="data-[state=checked]:bg-primary"
                              />
                           </div>
                        </div>
                        <div className="space-y-2">
                           <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Amount to earn 1 Point ({shopSettings.currency})</Label>
                           <div className="relative">
                              <Input 
                                type="number"
                                value={generalSettings.loyaltyAmountPerPoint ?? 20} 
                                onChange={(e) => handleSettingsChange('general', 'loyaltyAmountPerPoint', parseFloat(e.target.value))}
                                className="bg-muted border-border h-12 rounded-xl text-right font-bold"
                              />
                           </div>
                        </div>
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-2">
                           <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Points for 1.00 {shopSettings.currency} discount</Label>
                           <div className="relative">
                              <Input 
                                type="number"
                                value={generalSettings.loyaltyPointsValue ?? 10} 
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
                                value={generalSettings.loyaltyMinRedeemPoints ?? 10} 
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

              {/* Telegram Integration Settings */}
              {activeTab === 'telegramSettings' && (
                <div className="space-y-8 text-right" dir="rtl">
                  <div>
                    <h3 className="text-2xl font-black text-foreground flex items-center justify-end gap-3">
                      <span>Telegram Bot Integration</span>
                      <TelegramIcon className="h-7 w-7 text-[#229ED9]" />
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Configure automated payment receipts, QR code customer linking, and Telegram webhook
                    </p>
                  </div>

                  {/* Bot Credentials & Connection Test */}
                  <div className="bg-card border border-border p-6 rounded-3xl space-y-6">
                    <div className="flex items-center justify-between pb-4 border-b border-border/60">
                      <Button
                        type="button"
                        onClick={handleTestBot}
                        disabled={isTestingBot}
                        className="bg-[#229ED9] hover:bg-[#229ED9]/90 text-white font-bold h-10 px-5 rounded-xl gap-2 text-xs"
                      >
                        {isTestingBot ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                        <span>Test Bot Connection</span>
                      </Button>
                      <h4 className="text-lg font-black text-foreground flex items-center gap-2">
                        <span>Bot Credentials</span>
                        <TelegramIcon className="h-5 w-5 text-[#229ED9]" />
                      </h4>
                    </div>

                    {botInfo && (
                      <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-right space-y-1">
                        <p className="text-xs font-black text-emerald-500 flex items-center justify-end gap-1.5">
                          <span>Bot Verified & Connected Successfully!</span>
                          <CheckCircle2 className="h-4 w-4" />
                        </p>
                        <p className="text-xs font-mono text-muted-foreground">
                          Name: <b>{botInfo.first_name}</b> • Handle: <b>@{botInfo.username}</b> • ID: <code>{botInfo.id}</code>
                        </p>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2 text-right">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                          Bot Username (without @)
                        </Label>
                        <Input
                          value={telegramSettings.botUsername || ''}
                          onChange={(e) => handleSettingsChange('telegram', 'botUsername', e.target.value.replace('@', '').trim())}
                          placeholder="e.g. Bbacksh0p_bot"
                          className="h-12 bg-muted border-border rounded-xl font-mono text-left"
                          dir="ltr"
                        />
                      </div>

                      <div className="space-y-2 text-right">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                          Telegram Bot Token (HTTP API)
                        </Label>
                        <Input
                          type="password"
                          value={telegramSettings.botToken || ''}
                          onChange={(e) => handleSettingsChange('telegram', 'botToken', e.target.value.trim())}
                          placeholder="e.g. 8815725998:AAHVMSujW5JM-ND4CJAzPr_Qsj_enXm2cYQ"
                          className="h-12 bg-muted border-border rounded-xl font-mono text-left text-xs"
                          dir="ltr"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Automated Receipt Settings */}
                  <div className="bg-card border border-border p-6 rounded-3xl space-y-6">
                    <h4 className="text-lg font-black text-foreground pb-3 border-b border-border/60">
                      Automated Receipt Delivery
                    </h4>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-muted/40 rounded-2xl border border-border">
                        <Switch
                          checked={telegramSettings.autoSendPaymentReceipts !== false}
                          onCheckedChange={(val) => handleSettingsChange('telegram', 'autoSendPaymentReceipts', val)}
                        />
                        <div className="text-right">
                          <p className="text-sm font-black text-foreground">Auto-Send Debt Payment Settlement Receipts</p>
                          <p className="text-xs text-muted-foreground">
                            Automatically send a formal receipt to the customer's Telegram whenever a credit balance is settled
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-muted/40 rounded-2xl border border-border">
                        <Switch
                          checked={Boolean(telegramSettings.autoSendSaleReceipts)}
                          onCheckedChange={(val) => handleSettingsChange('telegram', 'autoSendSaleReceipts', val)}
                        />
                        <div className="text-right">
                          <p className="text-sm font-black text-foreground">Auto-Send Sales Receipts (Every Transaction)</p>
                          <p className="text-xs text-muted-foreground">
                            Automatically send an itemized receipt to linked customers on standard cash/card/split sales
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Nightly Store Close Daily Briefing (B BACK Group) */}
                  <div className="bg-card border border-border p-6 rounded-3xl space-y-6">
                    <div className="flex items-center justify-between pb-3 border-b border-border/60">
                      <Button
                        type="button"
                        onClick={handleTestBriefing}
                        disabled={isSendingTestBriefing || (!groupChatIdInput && !shopSettings?.telegramGroupChatId)}
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs font-bold gap-1.5 bg-[#229ED9]/10 text-[#229ED9] border-[#229ED9]/30 hover:bg-[#229ED9]/20"
                      >
                        {isSendingTestBriefing ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Moon className="h-3.5 w-3.5" />
                        )}
                        <span>Send Test Briefing to Group</span>
                      </Button>
                      <div className="text-right">
                        <h4 className="text-lg font-black text-foreground">
                          Nightly "Store Close" Daily Briefing (B BACK Group)
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          Clean daily summary automatically sent to the "B BACK" Telegram group at midnight
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-muted/40 rounded-2xl border border-border">
                        <span className="font-mono text-xs font-bold text-foreground bg-background/80 px-3 py-1.5 rounded-lg border border-border">
                          {groupChatIdInput || shopSettings?.telegramGroupChatId ? `Chat ID: ${groupChatIdInput || shopSettings?.telegramGroupChatId}` : '⚠️ Not configured'}
                        </span>
                        <div className="text-right">
                          <p className="text-sm font-black text-foreground">Destination Group</p>
                          <p className="text-xs text-muted-foreground">
                            Delivers directly to the store Telegram group configured above
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-muted/40 rounded-2xl border border-border">
                        <Switch
                          checked={telegramSettings.autoExecutiveBriefing !== false}
                          onCheckedChange={(val) => handleSettingsChange('telegram', 'autoExecutiveBriefing', val)}
                        />
                        <div className="text-right">
                          <p className="text-sm font-black text-foreground">Auto-Send Midnight Store Close Summary</p>
                          <p className="text-xs text-muted-foreground">
                            Sends daily total sales breakdown (Cash | Transfer | Credit), credit collections settled today, and top selling items
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Automated Customer Tab Overdue & 90% Threshold Reminders */}
                  <div className="bg-card border border-border p-6 rounded-3xl space-y-6">
                    <h4 className="text-lg font-black text-foreground pb-3 border-b border-border/60">
                      Automated Customer Tab Overdue Reminders
                    </h4>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-muted/40 rounded-2xl border border-border">
                        <Switch
                          checked={telegramSettings.autoMonthlyCreditReminder !== false}
                          onCheckedChange={(val) => handleSettingsChange('telegram', 'autoMonthlyCreditReminder', val)}
                        />
                        <div className="text-right">
                          <p className="text-sm font-black text-foreground">1st of Every Month Tab Reminders</p>
                          <p className="text-xs text-muted-foreground">
                            Politely sends friendly private balance reminders with direct [ 📤 Send Transfer Slip ] button on the 1st of each month
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-muted/40 rounded-2xl border border-border">
                        <Switch
                          checked={telegramSettings.autoCreditReminderThreshold !== false}
                          onCheckedChange={(val) => handleSettingsChange('telegram', 'autoCreditReminderThreshold', val)}
                        />
                        <div className="text-right">
                          <p className="text-sm font-black text-foreground">Credit Threshold Alert (When Tab Crosses Limit)</p>
                          <p className="text-xs text-muted-foreground">
                            Automatically notifies linked customers when their outstanding tab reaches or exceeds threshold percentage
                          </p>
                        </div>
                      </div>

                      <div className="p-4 bg-muted/40 rounded-2xl border border-border space-y-2 text-right">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold text-primary">
                            {telegramSettings.creditReminderThresholdPct || 90}%
                          </span>
                          <Label className="text-xs font-black text-foreground">
                            Credit Limit Threshold Percentage
                          </Label>
                        </div>
                        <Input
                          type="number"
                          min="50"
                          max="100"
                          value={telegramSettings.creditReminderThresholdPct || 90}
                          onChange={(e) => handleSettingsChange('telegram', 'creditReminderThresholdPct', Number(e.target.value))}
                          className="h-10 bg-background border-border rounded-xl font-mono text-left w-32"
                          dir="ltr"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 24/7 Cloud Webhook & Hosting Configuration */}
                  <div className="bg-card border border-border p-6 rounded-3xl space-y-6">
                    <div className="flex items-center justify-between pb-3 border-b border-border/60">
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          onClick={fetchWebhookStatus}
                          disabled={isLoadingWebhookStatus}
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs font-bold gap-1.5"
                        >
                          <RefreshCw className={cn("h-3.5 w-3.5", isLoadingWebhookStatus && "animate-spin")} />
                          <span>Check Status</span>
                        </Button>
                        {webhookLiveUrl ? (
                          <Button
                            type="button"
                            onClick={handleDeleteWebhook}
                            disabled={isRegisteringWebhook}
                            variant="destructive"
                            size="sm"
                            className="h-8 text-xs font-bold"
                          >
                            Switch to Browser Mode
                          </Button>
                        ) : null}
                      </div>
                      <div className="text-right">
                        <h4 className="text-lg font-black text-foreground">
                          24/7 Cloud Bot Hosting (Always Active)
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          Keep bot responding 24/7 even when POS computer is turned off
                        </p>
                      </div>
                    </div>

                    {/* Current Mode Badge */}
                    <div className="p-4 rounded-2xl border bg-muted/30 flex items-center justify-between">
                      <div className="text-left">
                        {webhookLiveUrl ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                            <CheckCircle2 className="h-3.5 w-3.5" /> 24/7 Cloud Webhook Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                            🟡 Live Browser Polling Mode (Active while POS open)
                          </span>
                        )}
                        {webhookLiveUrl && (
                          <p className="text-[11px] font-mono text-muted-foreground mt-1.5 truncate max-w-md">
                            {webhookLiveUrl}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-foreground">Current Operating Mode</p>
                        <p className="text-[10px] text-muted-foreground">
                          {webhookLiveUrl ? "Responses handled in cloud 24/7" : "Responses handled by active POS browser tab"}
                        </p>
                      </div>
                    </div>

                    {/* 1-Click Activate Vercel Webhook */}
                    <div className="p-4 rounded-2xl border border-primary/20 bg-primary/5 flex items-center justify-between">
                      <Button
                        type="button"
                        onClick={handleActivateVercelWebhook}
                        disabled={isRegisteringWebhook}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-10 px-5 rounded-xl gap-2 text-xs"
                      >
                        {isRegisteringWebhook ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                        <span>🚀 Activate 24/7 Cloud Mode</span>
                      </Button>
                      <div className="text-right">
                        <p className="text-sm font-black text-foreground">One-Click Vercel Cloud Webhook</p>
                        <p className="text-xs text-muted-foreground">
                          Connects <code className="text-primary font-mono text-[10px]">/api/telegram-webhook</code> on your live website for 24/7 instant replies
                        </p>
                      </div>
                    </div>

                    {/* Custom URL Option */}
                    <div className="space-y-2 text-right">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                        Custom Webhook URL (Optional)
                      </Label>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          onClick={handleRegisterWebhook}
                          disabled={isRegisteringWebhook || !webhookUrlInput}
                          variant="outline"
                          className="font-bold h-11 px-4 rounded-xl text-xs shrink-0"
                        >
                          Save Custom URL
                        </Button>
                        <Input
                          value={webhookUrlInput}
                          onChange={(e) => {
                            setWebhookUrlInput(e.target.value);
                            handleSettingsChange('telegram', 'webhookUrl', e.target.value);
                          }}
                          placeholder="https://YOUR_DOMAIN/api/telegram-webhook"
                          className="h-11 bg-muted border-border rounded-xl font-mono text-left text-xs"
                          dir="ltr"
                        />
                      </div>
                    </div>
                  </div>

                  {/* B BACK Group Forwarding Card */}
                  <div className="bg-card border border-border p-6 rounded-3xl space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-border/60">
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleTestGroupNotification}
                          disabled={isSendingGroupTest}
                          className="h-10 text-xs font-bold gap-1.5 rounded-xl border-border"
                        >
                          {isSendingGroupTest ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                          <span>Test Group Message</span>
                        </Button>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <h4 className="text-lg font-black text-foreground">
                            B BACK Telegram Group Forwarding
                          </h4>
                          {shopSettings?.telegramGroupChatId ? (
                            <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                              CONNECTED
                            </Badge>
                          ) : (
                            <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs">
                              AUTO-DETECT READY
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Automatically forwards all customer transfer slips and profile details to your "B BACK" group
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs font-bold text-foreground block text-right mb-1.5">
                          Group Chat ID (Auto-detected or Manual)
                        </Label>
                        <div className="flex gap-2" dir="ltr">
                          <Button
                            type="button"
                            onClick={handleSaveGroupChatId}
                            variant="outline"
                            className="font-bold h-11 px-4 rounded-xl text-xs shrink-0"
                          >
                            Save Group ID
                          </Button>
                          <Input
                            value={groupChatIdInput}
                            onChange={(e) => setGroupChatIdInput(e.target.value)}
                            placeholder="e.g. -1001234567890"
                            className="h-11 bg-muted border-border rounded-xl font-mono text-left text-xs"
                            dir="ltr"
                          />
                        </div>
                      </div>

                      <div className="p-3 bg-muted/60 border border-border/60 rounded-2xl text-xs space-y-1 text-right" dir="rtl">
                        <p className="font-bold text-foreground">އޮޓޮމެޓިކުން ގްރޫޕް ގުޅައިދޭނެ ގޮތް:</p>
                        <p className="text-muted-foreground text-[11px]">
                          1. ޓެލެގްރާމްގައި ހަދާފައިވާ "B BACK" ގްރޫޕަށް <span className="font-mono text-primary font-bold">@Bbacksh0p_bot</span> އެޑްކޮށްލައްވާ.
                        </p>
                        <p className="text-muted-foreground text-[11px]">
                          2. ގްރޫޕަށް ކޮންމެވެސް މެސެޖެއް ނުވަތަ <span className="font-mono text-primary font-bold">/setgroup</span> ފޮނުވާލައްވާ.
                        </p>
                        <p className="text-muted-foreground text-[11px]">
                          3. ބޮޓުން އަމިއްލައަށް ގްރޫޕް ދެނެގަނެ، ކަސްޓަމަރުން ފޮނުވާ ހުރިހާ ސްލިޕްތަކެއް ވަގުތުން މި ގްރޫޕަށް ފޯވާރޑް ކުރާނެއެވެ!
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Bot Commands Management Card */}
                  <div className="bg-card border border-border p-6 rounded-3xl space-y-6">
                    <div className="flex items-center justify-between pb-3 border-b border-border/60">
                      <Button
                        type="button"
                        onClick={handleSyncCommands}
                        disabled={isSyncingCommands}
                        className="bg-[#229ED9] hover:bg-[#229ED9]/90 text-white font-bold h-10 px-5 rounded-xl gap-2 text-xs"
                      >
                        {isSyncingCommands ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                        <span>Sync Bot Menu</span>
                      </Button>
                      <div className="text-right">
                        <h4 className="text-lg font-black text-foreground">
                          Bot Menu Commands
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          Official Telegram [/] popup menu buttons & automated responses
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3" dir="ltr">
                      {BOT_COMMANDS.map((cmd) => (
                        <div key={cmd.command} className="p-3 bg-muted/60 border border-border/60 rounded-2xl flex items-start gap-3">
                          <code className="px-2 py-1 bg-primary/10 text-primary font-mono font-bold text-xs rounded-lg shrink-0">
                            /{cmd.command}
                          </code>
                          <div className="text-xs">
                            <p className="font-bold text-foreground">{cmd.description}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">Automated bot reply enabled ✅</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <p className="text-xs text-muted-foreground text-right" dir="rtl">
                      ބޮޓުގެ ކޮމާންޑްތައް ޓެލެގްރާމްގެ [/] މެނޫއަށް އަޕްޑޭޓްކުރުމަށް "Sync Bot Menu" އަށް ފިއްތާލައްވާ. ކަސްޓަމަރުން މި ކޮމާންޑްތައް ފޮނުވުމުން އަމިއްލައަށް ޖަވާބު ދެވޭނެއެވެ.
                    </p>
                  </div>

                  {/* Database Migration Instructions */}
                  <div className="bg-card border border-border p-6 rounded-3xl space-y-4">
                    <div className="flex items-center justify-between">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText("ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS telegram_chat_id BIGINT UNIQUE;\nCREATE INDEX IF NOT EXISTS idx_customers_telegram_chat_id ON public.customers(telegram_chat_id);\nALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;\nDROP POLICY IF EXISTS \"Allow all access to customers\" ON public.customers;\nCREATE POLICY \"Allow all access to customers\" ON public.customers FOR ALL USING (true) WITH CHECK (true);\nGRANT ALL ON TABLE public.customers TO anon, authenticated;");
                          showSuccess("SQL copied to clipboard!");
                        }}
                        className="h-8 text-xs font-bold gap-1.5"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copy SQL</span>
                      </Button>
                      <h4 className="text-sm font-black text-foreground">
                        Supabase SQL Migration Required (Once)
                      </h4>
                    </div>

                    <div className="p-3 bg-muted rounded-xl font-mono text-xs text-foreground/80 overflow-x-auto text-left" dir="ltr">
                      <code>
                        ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS telegram_chat_id BIGINT UNIQUE;<br/>
                        CREATE INDEX IF NOT EXISTS idx_customers_telegram_chat_id ON public.customers(telegram_chat_id);<br/>
                        ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;<br/>
                        DROP POLICY IF EXISTS "Allow all access to customers" ON public.customers;<br/>
                        CREATE POLICY "Allow all access to customers" ON public.customers FOR ALL USING (true) WITH CHECK (true);<br/>
                        GRANT ALL ON TABLE public.customers TO anon, authenticated;
                      </code>
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