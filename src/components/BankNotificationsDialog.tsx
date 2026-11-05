"use client";

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  CheckCircle2,
  Copy,
  Smartphone,
  BellRing,
  Sparkles,
  Check,
  Clock,
  ArrowRightLeft,
  Trash2,
  Send,
  ShieldCheck,
  AlertCircle,
  RotateCw,
} from 'lucide-react';
import { BankNotification } from '@/utils/bankNotificationParser';
import { supabaseUrl, supabaseAnonKey, DEFAULT_SETTINGS_USER_ID } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import { formatTime, formatDate } from '@/utils/formatters';
import { showSuccess } from '@/utils/toast';
import { cn } from '@/lib/utils';

interface BankNotificationsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notifications: BankNotification[];
  currentCartTotal?: number;
  pendingTransfers?: any[];
  currency?: string;
  onVerifyNotification: (id: string, note?: string) => void;
  onDismissNotification: (id: string) => void;
  onClearVerified: () => void;
  onSimulateIncoming: (payload: { title: string; body: string; timestamp: number }) => Promise<void>;
  onApplyToCurrentCart?: (notification: BankNotification) => void;
  onVerifyPendingTransfer?: (transferId: string, notification: BankNotification) => void;
}

export const BANK_WEBHOOK_ROW_ID = '320e8d7f-9329-41ec-9f65-9a9130bb2801';

export const BankNotificationsDialog: React.FC<BankNotificationsDialogProps> = ({
  open,
  onOpenChange,
  notifications,
  currentCartTotal = 0,
  pendingTransfers = [],
  currency = 'MVR',
  onVerifyNotification,
  onDismissNotification,
  onClearVerified,
  onSimulateIncoming,
  onApplyToCurrentCart,
  onVerifyPendingTransfer,
}) => {
  const { syncBankWebhooksFromCloud } = useAppContext();
  const [activeTab, setActiveTab] = useState<'feed' | 'setup'>('feed');
  const [filterMode, setFilterMode] = useState<'unclaimed' | 'all'>('unclaimed');
  const [simAmount, setSimAmount] = useState<string>(() =>
    currentCartTotal > 0 ? currentCartTotal.toFixed(2) : '150.00'
  );
  const [simSender, setSimSender] = useState<string>('AHMED IBRAHIM');
  const [isSimulating, setIsSimulating] = useState(false);
  const [isSyncingFeed, setIsSyncingFeed] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      if (currentCartTotal > 0) {
        setSimAmount(currentCartTotal.toFixed(2));
      }
      syncBankWebhooksFromCloud().catch(() => {});
    }
  }, [open, currentCartTotal, syncBankWebhooksFromCloud]);

  const handleManualSync = async () => {
    setIsSyncingFeed(true);
    try {
      await syncBankWebhooksFromCloud();
      showSuccess('Synced latest bank alerts from cloud');
    } finally {
      setIsSyncingFeed(false);
    }
  };

  const copyText = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(key);
    showSuccess('Copied to clipboard!');
    setTimeout(() => setCopiedField(null), 2000);
  };

  const webhookEndpoint = `${supabaseUrl}/rest/v1/settings?on_conflict=id`;

  const macroDroidJsonBody = JSON.stringify(
    {
      id: BANK_WEBHOOK_ROW_ID,
      user_id: DEFAULT_SETTINGS_USER_ID,
      category: 'bank_webhook_incoming',
      settings: {
        title: '{not_title}',
        body: '{notification}',
        big_text: '{not_big_text}',
        sub_text: '{not_sub_text}',
        ticker: '{not_ticker}',
        timestamp: '{time_ms}',
        app: 'BML',
      },
    },
    null,
    2
  );

  const taskerJsonBody = JSON.stringify(
    {
      id: BANK_WEBHOOK_ROW_ID,
      user_id: DEFAULT_SETTINGS_USER_ID,
      category: 'bank_webhook_incoming',
      settings: {
        title: '%evtprm2',
        body: '%evtprm3',
        timestamp: '%TIMEMS',
        app: 'BML',
      },
    },
    null,
    2
  );

  const unclaimedCount = notifications.filter((n) => n.status === 'unclaimed').length;
  const displayedNotifications = notifications.filter((n) =>
    filterMode === 'unclaimed' ? n.status === 'unclaimed' : true
  );

  const handleSimulate = async () => {
    const amt = parseFloat(simAmount) || 150;
    setIsSimulating(true);
    try {
      await onSimulateIncoming({
        title: 'BML Mobile Banking',
        body: `You have received ${currency} ${amt.toFixed(2)} from ${simSender || 'CUSTOMER'} to Account 7730000442060. Ref: BML${Date.now().toString().slice(-6)}`,
        timestamp: Date.now(),
      });
      setActiveTab('feed');
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[44rem] w-[min(95vw,44rem)] max-h-[92vh] overflow-y-auto overflow-x-hidden flex flex-col font-faruma apple-glass-dialog text-foreground border border-white/20 dark:border-white/10 text-right p-5 sm:p-6 shadow-2xl rounded-3xl box-border [&>button]:left-4 [&>button]:right-auto space-y-4"
        dir="rtl"
      >
        <DialogHeader className="pb-3 text-right space-y-1.5 border-b border-border/60 pl-10">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-right">
              <DialogTitle className="text-xl sm:text-2xl font-black text-foreground flex items-center justify-start gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 flex items-center justify-center shrink-0">
                  <BellRing className="h-5 w-5" />
                </div>
                <span>ބޭންކް ޓްރާންސްފަރ ނޮޓިފިކޭޝަން (Live Bank Alerts)</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-1 text-right">
                Verify incoming BML / MIB mobile app push notifications directly on POS
              </DialogDescription>
            </div>

            <div className="bg-muted p-1 rounded-xl border border-border flex items-center gap-1" dir="ltr">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveTab('feed')}
                className={cn(
                  'h-8 px-3 rounded-lg text-xs font-black transition-all gap-1.5',
                  activeTab === 'feed'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Live Feed ({unclaimedCount})</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveTab('setup')}
                className={cn(
                  'h-8 px-3 rounded-lg text-xs font-black transition-all gap-1.5',
                  activeTab === 'setup'
                    ? 'bg-primary text-white shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Smartphone className="h-3.5 w-3.5" />
                <span>MacroDroid / Tasker Setup</span>
              </Button>
            </div>
          </div>
        </DialogHeader>

        {activeTab === 'feed' ? (
          <div className="space-y-3.5 w-full min-w-0">
            {/* Top Bar: Filter & Quick Test */}
            <div className="flex flex-wrap items-center justify-between gap-2 bg-muted/50 p-2.5 rounded-2xl border border-border" dir="ltr">
              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant={filterMode === 'unclaimed' ? 'default' : 'outline'}
                  onClick={() => setFilterMode('unclaimed')}
                  className="h-7 px-3 rounded-lg text-[11px] font-black"
                >
                  Unclaimed ({unclaimedCount})
                </Button>
                <Button
                  size="sm"
                  variant={filterMode === 'all' ? 'default' : 'outline'}
                  onClick={() => setFilterMode('all')}
                  className="h-7 px-3 rounded-lg text-[11px] font-black"
                >
                  All History ({notifications.length})
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleManualSync}
                  disabled={isSyncingFeed}
                  className="h-7 px-2.5 rounded-lg text-[11px] font-black gap-1"
                  title="Check cloud for missed or offline BML alerts"
                >
                  <RotateCw className={cn("h-3 w-3 text-emerald-500", isSyncingFeed && "animate-spin")} />
                  Sync
                </Button>
                {notifications.some((n) => n.status !== 'unclaimed') && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={onClearVerified}
                    className="h-7 px-2.5 text-[11px] font-bold text-muted-foreground hover:text-destructive gap-1"
                  >
                    <Trash2 className="h-3 w-3" />
                    Clear Verified
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setActiveTab('setup')}
                  className="h-7 px-2.5 text-[11px] font-black border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 gap-1"
                >
                  <Sparkles className="h-3 w-3" />
                  Test / Setup Phone
                </Button>
              </div>
            </div>

            {/* Current Cart Match Banner */}
            {currentCartTotal > 0 && (
              <div className="px-4 py-2.5 rounded-2xl bg-primary/10 border border-primary/25 flex items-center justify-between text-xs font-bold" dir="ltr">
                <span className="text-muted-foreground">Active Cart Total to Match:</span>
                <span className="font-mono text-base font-black text-primary">
                  {currency} {currentCartTotal.toFixed(2)}
                </span>
              </div>
            )}

            <ScrollArea className="h-[360px] pr-1 custom-scrollbar">
              {displayedNotifications.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-center p-6 border border-dashed border-border rounded-2xl bg-muted/20 gap-2" dir="ltr">
                  <BellRing className="h-10 w-10 text-muted-foreground/30" />
                  <p className="text-sm font-black text-foreground">No Unclaimed Bank Notifications</p>
                  <p className="text-xs text-muted-foreground max-w-sm">
                    When your dedicated Android phone receives a BML / MIB transfer push notification, it will appear here automatically in real time.
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setActiveTab('setup')}
                    className="mt-2 rounded-xl text-xs font-black border-primary/30 text-primary hover:bg-primary/10"
                  >
                    Open Phone Setup & Simulator
                  </Button>
                </div>
              ) : (
                <div className="space-y-2.5" dir="ltr">
                  {displayedNotifications.map((notif) => {
                    const isUnclaimed = notif.status === 'unclaimed';
                    const matchesCurrentCart =
                      isUnclaimed &&
                      currentCartTotal > 0 &&
                      notif.amount !== null &&
                      Math.abs(notif.amount - currentCartTotal) < 0.01;

                    const matchingPendingTransfer = isUnclaimed
                      ? pendingTransfers.find(
                          (pt) =>
                            notif.amount !== null &&
                            Math.abs(Number(pt.grandTotal || 0) - notif.amount) < 0.01
                        )
                      : null;

                    return (
                      <div
                        key={notif.id}
                        className={cn(
                          'p-4 rounded-2xl border transition-all flex flex-col gap-2.5 shadow-xs',
                          matchesCurrentCart || matchingPendingTransfer
                            ? 'bg-emerald-500/10 border-emerald-500 ring-2 ring-emerald-500/25'
                            : isUnclaimed
                            ? 'bg-card border-border hover:border-primary/40'
                            : 'bg-muted/40 border-border/50 opacity-75'
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Badge
                              className={cn(
                                'text-[10px] font-black uppercase px-2 py-0.5 rounded-md shrink-0',
                                notif.bankName === 'BML'
                                  ? 'bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30'
                                  : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                              )}
                            >
                              {notif.bankName}
                            </Badge>
                            {notif.amount !== null ? (
                              <span className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                                {notif.currency} {notif.amount.toFixed(2)}
                              </span>
                            ) : (
                              <span className="text-sm font-bold text-foreground">{notif.title}</span>
                            )}
                            {matchesCurrentCart && (
                              <Badge className="bg-emerald-500 text-white text-[10px] font-black px-2 py-0.5 animate-pulse">
                                ✨ MATCHES ACTIVE CART
                              </Badge>
                            )}
                            {matchingPendingTransfer && !matchesCurrentCart && (
                              <Badge className="bg-amber-500 text-black text-[10px] font-black px-2 py-0.5">
                                ⚡ MATCHES PENDING TRANSFER
                              </Badge>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground shrink-0">
                            <Clock className="h-3 w-3" />
                            <span>
                              {formatDate(notif.receivedAt)} {formatTime(notif.receivedAt)}
                            </span>
                          </div>
                        </div>

                        <p className="text-xs text-foreground/90 font-mono bg-background/60 p-2.5 rounded-xl border border-border/60 break-words leading-relaxed">
                          {notif.body}
                        </p>

                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                          <div className="text-[11px] font-bold text-muted-foreground">
                            {notif.senderOrRef ? (
                              <span>Sender / Ref: <strong className="text-foreground">{notif.senderOrRef}</strong></span>
                            ) : (
                              <span>Status: <strong className="uppercase">{notif.status}</strong></span>
                            )}
                          </div>

                          {isUnclaimed ? (
                            <div className="flex flex-wrap items-center gap-2">
                              {matchesCurrentCart && onApplyToCurrentCart && (
                                <Button
                                  size="sm"
                                  onClick={() => onApplyToCurrentCart(notif)}
                                  className="h-8 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl gap-1.5 shadow-sm"
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  Verify & Complete Active Cart
                                </Button>
                              )}
                              {matchingPendingTransfer && onVerifyPendingTransfer && (
                                <Button
                                  size="sm"
                                  onClick={() => onVerifyPendingTransfer(matchingPendingTransfer.id, notif)}
                                  className="h-8 px-3 bg-amber-500 hover:bg-amber-600 text-black text-xs font-black rounded-xl gap-1.5 shadow-sm"
                                >
                                  <ArrowRightLeft className="h-3.5 w-3.5" />
                                  Verify Pending Transfer ({matchingPendingTransfer.customer?.name_dv || matchingPendingTransfer.tempCustomerName || 'Guest'})
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => onVerifyNotification(notif.id)}
                                className="h-8 px-3 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 text-xs font-black rounded-xl gap-1"
                              >
                                <Check className="h-3.5 w-3.5" />
                                Mark Verified
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => onDismissNotification(notif.id)}
                                className="h-8 px-2.5 text-muted-foreground hover:text-destructive text-xs font-bold rounded-xl"
                              >
                                Dismiss
                              </Button>
                            </div>
                          ) : (
                            <Badge variant="outline" className="text-[10px] font-black text-emerald-600 border-emerald-500/30 bg-emerald-500/10">
                              ✓ VERIFIED {notif.matchedCustomerName ? `(${notif.matchedCustomerName})` : ''}
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>
        ) : (
          <div className="space-y-4 w-full min-w-0 text-left" dir="ltr">
            {/* Simulator Card */}
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4" />
                    Test Live Bank Notification Now
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
                    Send a test BML notification through Supabase to see how cashiers verify transfers on POS.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="text-[10px] font-black uppercase text-muted-foreground block mb-1">
                    Amount ({currency})
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={simAmount}
                    onChange={(e) => setSimAmount(e.target.value)}
                    className="h-9 font-mono font-black text-sm bg-background"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-muted-foreground block mb-1">
                    Sender Name
                  </label>
                  <Input
                    value={simSender}
                    onChange={(e) => setSimSender(e.target.value)}
                    className="h-9 font-bold text-xs bg-background"
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    onClick={handleSimulate}
                    disabled={isSimulating}
                    className="w-full h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl gap-1.5"
                  >
                    <Send className="h-3.5 w-3.5" />
                    {isSimulating ? 'Sending...' : 'Send Test Alert'}
                  </Button>
                </div>
              </div>
            </div>

            {/* Step-by-step MacroDroid / Tasker Instructions */}
            <div className="p-4 rounded-2xl bg-card border border-border space-y-3">
              <h4 className="text-sm font-black text-foreground flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-primary" />
                MacroDroid / Tasker Setup (No Extra Server Required)
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Your POS connects directly to your Supabase cloud database. In <strong>MacroDroid</strong> or <strong>Tasker</strong> on your shop Android phone:
                <br />
                1. <strong>Trigger</strong>: Notification Received → Select App: <strong>BML Mobile</strong> (or MIB).
                <br />
                2. <strong>Action</strong>: HTTP Request → Method: <strong>POST</strong> → Content Type: <code>application/json</code>.
              </p>

              {/* URL */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase text-muted-foreground">1. Webhook POST URL</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyText('url', webhookEndpoint)}
                    className="h-6 px-2 text-[10px] font-black gap-1 text-primary"
                  >
                    <Copy className="h-3 w-3" />
                    {copiedField === 'url' ? 'Copied!' : 'Copy URL'}
                  </Button>
                </div>
                <code className="block p-2 rounded-xl bg-muted text-[11px] font-mono break-all select-all border border-border">
                  {webhookEndpoint}
                </code>
              </div>

              {/* Headers */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase text-muted-foreground">2. HTTP Headers (Add these 3 headers)</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      copyText(
                        'headers',
                        `apikey: ${supabaseAnonKey}\nAuthorization: Bearer ${supabaseAnonKey}\nPrefer: resolution=merge-duplicates`
                      )
                    }
                    className="h-6 px-2 text-[10px] font-black gap-1 text-primary"
                  >
                    <Copy className="h-3 w-3" />
                    {copiedField === 'headers' ? 'Copied!' : 'Copy Headers'}
                  </Button>
                </div>
                <pre className="p-2.5 rounded-xl bg-muted text-[10px] font-mono overflow-x-auto border border-border leading-relaxed">
{`apikey: ${supabaseAnonKey}
Authorization: Bearer ${supabaseAnonKey}
Prefer: resolution=merge-duplicates`}
                </pre>
              </div>

              {/* JSON Body */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase text-muted-foreground">3A. MacroDroid JSON Body</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyText('macrodroid', macroDroidJsonBody)}
                      className="h-6 px-2 text-[10px] font-black gap-1 text-primary"
                    >
                      <Copy className="h-3 w-3" />
                      {copiedField === 'macrodroid' ? 'Copied!' : 'Copy'}
                    </Button>
                  </div>
                  <pre className="p-2.5 rounded-xl bg-muted text-[10px] font-mono overflow-x-auto border border-border">
                    {macroDroidJsonBody}
                  </pre>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase text-muted-foreground">3B. Tasker JSON Body</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyText('tasker', taskerJsonBody)}
                      className="h-6 px-2 text-[10px] font-black gap-1 text-primary"
                    >
                      <Copy className="h-3 w-3" />
                      {copiedField === 'tasker' ? 'Copied!' : 'Copy'}
                    </Button>
                  </div>
                  <pre className="p-2.5 rounded-xl bg-muted text-[10px] font-mono overflow-x-auto border border-border">
                    {taskerJsonBody}
                  </pre>
                </div>
              </div>

              {/* Locked Phone & Offline Reconnect Guide */}
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-1.5">
                <p className="text-xs font-black text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  Locked Screen &amp; Offline Phone Fix (BML Notifications)
                </p>
                <ul className="text-[11px] text-muted-foreground space-y-1 list-disc pl-4 leading-relaxed">
                  <li>
                    <strong>When Phone is Locked (Android Doze Mode):</strong> Set Battery Optimization to <strong>Unrestricted</strong> for both <strong>MacroDroid</strong> and <strong>BML Mobile</strong> in Android Settings. In MacroDroid, add the action <strong>Screen On</strong> (or enable Wake Lock) right before the HTTP Request so Android does not block network access while the screen is off.
                  </li>
                  <li>
                    <strong>When Phone is Offline &amp; Reconnects:</strong> In your MacroDroid macro, add the action <strong>Wait Until Trigger → Network Connectivity (Connected)</strong> right before the <strong>HTTP Request</strong> action. If a BML notification arrives while offline, MacroDroid will hold it and immediately send it to POS the moment Wi-Fi or Mobile Data reconnects.
                  </li>
                  <li>
                    <strong>POS Auto-Catchup:</strong> Even if the POS computer was offline or asleep when the transfer happened, POS now automatically syncs missed bank alerts from the cloud every 6 seconds and whenever connection is restored.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

