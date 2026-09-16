import React, { useEffect, useState } from 'react';
import { Download, CheckCircle2, Monitor } from 'lucide-react';
import { Button } from './ui/button';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const PWAInstallButton: React.FC<{ collapsed?: boolean }> = ({ collapsed }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if running in standalone PWA mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
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

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choiceResult = await deferredPrompt.userChoice;
    if (choiceResult.outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  if (isInstalled) {
    if (collapsed) return null;
    return (
      <div className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-[10px] font-bold">
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
        <span>PWA Installed & Ready</span>
      </div>
    );
  }

  if (!deferredPrompt) {
    return null;
  }

  if (collapsed) {
    return (
      <Button
        onClick={handleInstallClick}
        variant="ghost"
        size="icon"
        title="Install MVPPOS PWA"
        className="h-8 w-8 rounded-lg bg-primary/20 text-primary hover:bg-primary hover:text-foreground"
      >
        <Download className="h-4 w-4 animate-bounce" />
      </Button>
    );
  }

  return (
    <Button
      onClick={handleInstallClick}
      className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-foreground font-black text-xs h-9 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 transition-all hover:scale-[1.02]"
    >
      <Download className="h-4 w-4" />
      <span>Install MVPOS App</span>
    </Button>
  );
};
