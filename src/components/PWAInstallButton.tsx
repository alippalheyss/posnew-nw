import React, { useEffect, useState } from 'react';
import { Download, CheckCircle2, Monitor, Smartphone, Apple, HelpCircle, Laptop, Share, PlusSquare } from 'lucide-react';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const PWAInstallButton: React.FC<{ 
  collapsed?: boolean;
  className?: string;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}> = ({ collapsed, className, variant, size }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showHelpDialog, setShowHelpDialog] = useState(false);
  const [platform, setPlatform] = useState<'ios' | 'android' | 'desktop'>('desktop');

  useEffect(() => {
    // Detect Platform
    const userAgent = window.navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(userAgent)) {
      setPlatform('ios');
    } else if (/android/.test(userAgent)) {
      setPlatform('android');
    } else {
      setPlatform('desktop');
    }

    // Check if already installed
    const isStandalone = 
      window.matchMedia('(display-mode: standalone)').matches || 
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://');

    if (isStandalone) {
      setIsInstalled(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);

    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choiceResult = await deferredPrompt.userChoice;
        if (choiceResult.outcome === 'accepted') {
          setIsInstalled(true);
          setDeferredPrompt(null);
        }
      } catch (err) {
        console.warn('Install prompt error, showing guide:', err);
        setShowHelpDialog(true);
      }
    } else {
      setShowHelpDialog(true);
    }
  };

  if (isInstalled) {
    if (collapsed) {
      return (
        <div 
          title="MVPOS App is Installed" 
          className="h-9 w-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto"
        >
          <CheckCircle2 className="h-4 w-4" />
        </div>
      );
    }
    return (
      <div className="flex items-center justify-center gap-2 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs font-bold w-full">
        <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
        <span className="truncate">App Installed & Ready</span>
      </div>
    );
  }

  if (collapsed) {
    return (
      <>
        <Button
          onClick={handleInstallClick}
          variant="ghost"
          size="icon"
          title="Install MVPOS App (PWA)"
          className="h-10 w-10 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-foreground shadow-lg shadow-orange-500/30 mx-auto transition-transform hover:scale-105"
        >
          <Download className="h-4 w-4 animate-bounce" />
        </Button>

        <InstallGuideDialog 
          isOpen={showHelpDialog} 
          onClose={() => setShowHelpDialog(false)} 
          platform={platform} 
        />
      </>
    );
  }

  return (
    <>
      <Button
        onClick={handleInstallClick}
        className={className || "w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-foreground font-black text-xs h-10 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-orange-500/25 transition-all hover:scale-[1.02] border border-orange-400/30"}
      >
        <Download className="h-4 w-4 shrink-0 animate-pulse" />
        <span className="truncate">Install MVPOS App</span>
      </Button>

      <InstallGuideDialog 
        isOpen={showHelpDialog} 
        onClose={() => setShowHelpDialog(false)} 
        platform={platform} 
      />
    </>
  );
};

const InstallGuideDialog: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  platform: 'ios' | 'android' | 'desktop';
}> = ({ isOpen, onClose, platform }) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md font-faruma apple-glass-dialog border-white/20 dark:border-white/10 text-foreground shadow-2xl rounded-3xl p-6 sm:p-7" dir="rtl">
        <DialogHeader className="text-right pb-3 border-b border-white/10">
          <DialogTitle className="text-xl font-black text-foreground flex items-center justify-end gap-2">
            <span>Install MVPOS App</span>
            <Laptop className="h-5 w-5 text-primary" />
          </DialogTitle>
          <DialogDescription className="text-right text-xs text-muted-foreground mt-1 font-bold">
            Install MVPOS as a standalone desktop or mobile application for instant offline access and seamless printing.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-3 text-right">
          {/* Desktop instructions */}
          <div className="p-4 rounded-2xl bg-white/5 dark:bg-black/20 border border-white/10 space-y-2.5 backdrop-blur-md">
            <div className="flex items-center justify-end gap-2 text-sm font-black text-orange-400">
              <span>Google Chrome / Microsoft Edge (Windows & Mac)</span>
              <Monitor className="h-4 w-4" />
            </div>
            <ol className="list-decimal list-inside text-xs space-y-2 text-foreground/90 font-medium pr-1">
              <li>Look at the right side of the browser's <strong>address bar (URL bar)</strong> at the top.</li>
              <li>Click the <strong>Install App icon (⊕ or 💻)</strong>.</li>
              <li>Or click the 3 dots menu <strong className="px-1.5 py-0.5 bg-white/10 rounded border border-white/10">⋮</strong> in the top right ➔ click <strong>"Install MVPOS..."</strong>.</li>
            </ol>
          </div>

          {/* Android instructions */}
          <div className="p-4 rounded-2xl bg-white/5 dark:bg-black/20 border border-white/10 space-y-2.5 backdrop-blur-md">
            <div className="flex items-center justify-end gap-2 text-sm font-black text-emerald-400">
              <span>Android (Chrome)</span>
              <Smartphone className="h-4 w-4" />
            </div>
            <ol className="list-decimal list-inside text-xs space-y-2 text-foreground/90 font-medium pr-1">
              <li>Tap the three dots menu <strong className="px-1.5 py-0.5 bg-white/10 rounded border border-white/10">⋮</strong> in the top right corner of Chrome.</li>
              <li>Select <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.</li>
            </ol>
          </div>

          {/* iOS / Safari instructions */}
          <div className="p-4 rounded-2xl bg-white/5 dark:bg-black/20 border border-white/10 space-y-2.5 backdrop-blur-md">
            <div className="flex items-center justify-end gap-2 text-sm font-black text-blue-400">
              <span>iPhone / iPad (Safari)</span>
              <Apple className="h-4 w-4" />
            </div>
            <ol className="list-decimal list-inside text-xs space-y-2 text-foreground/90 font-medium pr-1">
              <li>Tap the <strong>Share</strong> button at the bottom of Safari.</li>
              <li>Scroll down and tap <strong>"Add to Home Screen"</strong> (<PlusSquare className="inline h-3.5 w-3.5 mx-1" />).</li>
            </ol>
          </div>
        </div>

        <div className="flex justify-end pt-3 border-t border-white/10">
          <Button onClick={onClose} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs h-11 rounded-2xl shadow-lg shadow-primary/25 uppercase">
            Got it
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
