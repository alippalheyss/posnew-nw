import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { QRCodeSVG } from 'qrcode.react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Customer, useAppContext } from '@/context/AppContext';
import {
  generateTelegramConnectLink,
  sendTelegramTestMessage,
  checkAndLinkCustomerLive,
} from '@/services/telegramService';
import { showSuccess, showError } from '@/utils/toast';
import {
  CheckCircle2,
  Copy,
  ExternalLink,
  Send,
  Trash2,
  QrCode,
  Smartphone,
  Info,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TelegramConnectDialogProps {
  customer: Customer | null;
  isOpen: boolean;
  onClose: () => void;
  onCustomerUpdated?: (updatedCustomer: Customer) => void;
}

export const TelegramConnectDialog: React.FC<TelegramConnectDialogProps> = ({
  customer,
  isOpen,
  onClose,
  onCustomerUpdated,
}) => {
  const { t } = useTranslation();
  const { settings, updateCustomer } = useAppContext();
  const [manualChatId, setManualChatId] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [isCheckingLive, setIsCheckingLive] = useState(false);

  const botUsername = settings.telegram?.botUsername || 'Bbacksh0p_bot';
  const botToken = settings.telegram?.botToken || '';
  const isLinked = Boolean(customer?.telegram_chat_id);
  // Use customer ID as primary deep link ref, fallback to code
  const deepLink = customer ? generateTelegramConnectLink(customer.id || customer.code, botUsername) : '';

  const checkLiveActivation = async () => {
    if (!customer || isLinked || isCheckingLive) return;
    try {
      setIsCheckingLive(true);
      const res = await checkAndLinkCustomerLive({
        customerId: customer.id,
        customerCode: customer.code,
        customerName: customer.name_en || customer.name_dv || 'Customer',
        token: botToken,
      });

      if (res.linked && res.chatId) {
        const updated: Customer = {
          ...customer,
          telegram_chat_id: res.chatId,
        };
        await updateCustomer(updated);
        if (onCustomerUpdated) onCustomerUpdated(updated);
        showSuccess(`Customer connected in real-time via Telegram! 🎉`);
      }
    } catch (err) {
      console.warn('Live link check error:', err);
    } finally {
      setIsCheckingLive(false);
    }
  };

  useEffect(() => {
    if (!isOpen || isLinked || !customer) return;

    // Check immediately upon opening
    checkLiveActivation();

    // Poll every 3.5 seconds while modal is open
    const interval = setInterval(() => {
      checkLiveActivation();
    }, 3500);

    return () => clearInterval(interval);
  }, [isOpen, isLinked, customer?.id]);

  if (!customer) return null;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(deepLink);
      showSuccess('Telegram connection link copied to clipboard!');
    } catch {
      showError('Failed to copy link');
    }
  };

  const handleOpenTelegram = () => {
    window.open(deepLink, '_blank');
  };

  const handleSaveManualChatId = async () => {
    const trimmed = manualChatId.trim();
    if (!trimmed || isNaN(Number(trimmed))) {
      showError('Please enter a valid numeric Telegram Chat ID');
      return;
    }

    try {
      setIsSaving(true);
      const updated: Customer = {
        ...customer,
        telegram_chat_id: Number(trimmed),
      };
      await updateCustomer(updated);
      if (onCustomerUpdated) onCustomerUpdated(updated);
      setManualChatId('');
      showSuccess('Telegram Chat ID saved successfully!');
    } catch (err: any) {
      showError(err.message || 'Failed to save Chat ID');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm(`Are you sure you want to disconnect Telegram for ${customer.name_en || customer.name_dv}?`)) {
      return;
    }
    try {
      setIsSaving(true);
      const updated: Customer = {
        ...customer,
        telegram_chat_id: null,
      };
      await updateCustomer(updated);
      if (onCustomerUpdated) onCustomerUpdated(updated);
      showSuccess('Telegram disconnected successfully');
    } catch (err: any) {
      showError(err.message || 'Failed to disconnect');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendTestMessage = async () => {
    if (!customer.telegram_chat_id) return;
    try {
      setIsSendingTest(true);
      const res = await sendTelegramTestMessage(
        customer.telegram_chat_id,
        customer.name_en || customer.name_dv || 'Customer',
        botToken
      );
      if (res.ok) {
        showSuccess('Test message sent to Telegram successfully! 🚀');
      } else {
        showError(res.description || 'Failed to send test message');
      }
    } catch (err: any) {
      showError(err.message || 'Failed to send test message');
    } finally {
      setIsSendingTest(false);
    }
  };

  const TelegramSvg = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
    </svg>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px] font-faruma bg-card text-foreground border border-border p-6 shadow-2xl rounded-3xl overflow-hidden box-border" dir="rtl">
        <DialogHeader className="text-right pb-3 border-b border-border/60">
          <div className="flex items-center justify-between">
            <Badge
              variant="outline"
              className={
                isLinked
                  ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30 gap-1.5 text-xs py-1"
                  : "bg-blue-500/10 text-blue-400 border-blue-500/30 gap-1.5 text-xs py-1"
              }
            >
              {isLinked ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Linked (ގުޅިފައި)</span>
                </>
              ) : (
                <>
                  <QrCode className="h-3.5 w-3.5" />
                  <span>Scan to Connect (ގުޅާލަން)</span>
                </>
              )}
            </Badge>

            <div className="flex items-center gap-2">
              <DialogTitle className="text-xl font-black text-foreground flex items-center gap-2">
                <span>Telegram Bot Connect</span>
                <TelegramSvg className="h-6 w-6 text-[#229ED9]" />
              </DialogTitle>
            </div>
          </div>
          <DialogDescription className="text-right text-xs text-muted-foreground mt-1">
            {customer.name_dv} ({customer.name_en}) • {customer.code}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-5 text-right">
          {/* Linked State Banner */}
          {isLinked ? (
            <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleDisconnect}
                  disabled={isSaving}
                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-8 px-2 text-xs font-bold gap-1.5"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Disconnect</span>
                </Button>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-emerald-400">Telegram Chat ID:</span>
                  <code className="bg-background/80 px-2.5 py-0.5 rounded text-xs font-mono font-black text-foreground">
                    {customer.telegram_chat_id}
                  </code>
                </div>
              </div>

              <p className="text-[11px] text-muted-foreground leading-relaxed">
                ✅ This customer will automatically receive digital receipts and payment settlement confirmations directly in Telegram.
              </p>

              <Button
                onClick={handleSendTestMessage}
                disabled={isSendingTest}
                className="w-full bg-[#229ED9] hover:bg-[#229ED9]/90 text-white font-bold h-10 rounded-xl gap-2 text-xs"
              >
                {isSendingTest ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                <span>Send Test Notification (ޓެސްޓް މެސެޖެއް ފޮނުވާ)</span>
              </Button>
            </div>
          ) : (
            <>
              {/* QR Code Section */}
              <div className="flex flex-col items-center justify-center p-4 bg-muted/40 border border-border rounded-2xl">
                <div className="p-3 bg-white rounded-2xl shadow-md">
                  <QRCodeSVG
                    value={deepLink}
                    size={190}
                    level="H"
                    includeMargin={false}
                  />
                </div>
                <div className="mt-3 text-center space-y-1">
                  <p className="text-xs font-black text-foreground">
                    Scan with Phone Camera or Telegram
                  </p>
                  <p className="text-[11px] text-muted-foreground font-mono">
                    @{botUsername}
                  </p>
                </div>

                {/* Live Link Auto-Detection Status */}
                <div className="mt-3 flex items-center justify-between w-full px-3 py-2 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={checkLiveActivation}
                    disabled={isCheckingLive}
                    className="h-7 px-2.5 text-xs font-bold text-blue-400 hover:bg-blue-500/20 gap-1.5"
                  >
                    <RefreshCw className={cn("h-3.5 w-3.5", isCheckingLive && "animate-spin")} />
                    <span>Check Status</span>
                  </Button>
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span className="text-[11px] font-bold text-foreground/80">
                      Waiting for customer to tap Start...
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={handleOpenTelegram}
                  className="bg-[#229ED9] hover:bg-[#229ED9]/90 text-white font-bold h-10 rounded-xl gap-2 text-xs"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span>Open Telegram</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={handleCopyLink}
                  className="border-border hover:bg-muted font-bold h-10 rounded-xl gap-2 text-xs"
                >
                  <Copy className="h-4 w-4" />
                  <span>Copy Link</span>
                </Button>
              </div>

              {/* Instructions */}
              <div className="bg-muted/30 border border-border/60 p-3 rounded-xl space-y-1.5 text-xs text-muted-foreground">
                <p className="font-bold text-foreground flex items-center gap-1.5 justify-end">
                  <span>How it works</span>
                  <Info className="h-3.5 w-3.5 text-primary" />
                </p>
                <ol className="list-decimal list-inside space-y-1 text-[11px] leading-relaxed pr-1 text-right">
                  <li>ކަސްޓަމަރު ފޯނުން މި QR ކޯޑު ސްކޭން ކުރައްވާ</li>
                  <li>Telegram ގައި <b>Start</b> ބަޓަނަށް ފިއްތާލައްވާ</li>
                  <li>އެކައުންޓް އޮޓޮމެޓިކުން ގުޅި، ރަސީދުތައް ލިބެން ފަށާނެ</li>
                </ol>
              </div>

              {/* Manual Input Alternative */}
              <div className="pt-2 border-t border-border/50 space-y-2">
                <Label className="text-[11px] font-bold text-muted-foreground block text-right">
                  Or enter numeric Chat ID manually (އަތުން Chat ID ޖައްސަވާ):
                </Label>
                <div className="flex gap-2">
                  <Button
                    onClick={handleSaveManualChatId}
                    disabled={isSaving || !manualChatId.trim()}
                    className="bg-primary text-foreground font-bold h-9 px-4 text-xs rounded-xl"
                  >
                    {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save'}
                  </Button>
                  <Input
                    placeholder="e.g. 123456789"
                    value={manualChatId}
                    onChange={(e) => setManualChatId(e.target.value)}
                    className="h-9 text-xs font-mono text-left bg-muted border-border rounded-xl flex-1"
                    dir="ltr"
                  />
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="sm:justify-start pt-2 border-t border-border/50">
          <Button
            variant="ghost"
            onClick={onClose}
            className="w-full sm:w-auto text-xs font-bold text-muted-foreground hover:text-foreground"
          >
            Close (ލައްޕާލާ)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
