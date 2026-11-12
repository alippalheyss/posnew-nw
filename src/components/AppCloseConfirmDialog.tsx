import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Power, LogOut, Minimize2, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const AppCloseConfirmDialog: React.FC = () => {
  const [open, setOpen] = useState(false);
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const api = (window as any).electronAPI;
    let unsubscribeElectron: (() => void) | undefined;

    if (api && typeof api.onCloseRequested === 'function') {
      unsubscribeElectron = api.onCloseRequested(() => {
        setOpen(true);
      });
    }

    const handleCustomCloseRequest = () => {
      setOpen(true);
    };

    window.addEventListener('mvpos-request-close', handleCustomCloseRequest);

    return () => {
      if (unsubscribeElectron) {
        unsubscribeElectron();
      }
      window.removeEventListener('mvpos-request-close', handleCustomCloseRequest);
    };
  }, []);

  const handleConfirmClose = () => {
    setOpen(false);
    const api = (window as any).electronAPI;
    if (api && typeof api.forceClose === 'function') {
      api.forceClose();
    } else if (api && typeof api.close === 'function') {
      api.close();
    } else {
      window.close();
    }
  };

  const handleMinimize = () => {
    setOpen(false);
    const api = (window as any).electronAPI;
    if (api && typeof api.minimize === 'function') {
      api.minimize();
    }
  };

  const handleLogout = () => {
    setOpen(false);
    logout();
    navigate('/login');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className="sm:max-w-[30rem] w-[94vw] font-faruma apple-glass-dialog text-foreground border border-white/25 dark:border-white/10 text-right p-6 sm:p-7 shadow-[0_25px_70px_-15px_rgba(0,0,0,0.65)] rounded-3xl overflow-hidden [&>button]:left-4 [&>button]:right-auto"
        dir="rtl"
      >
        <DialogHeader className="pb-3 text-right space-y-1.5 border-b border-border/60 pl-10 pr-1">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-500 shrink-0 shadow-xs">
              <Power className="h-6 w-6" />
            </div>
            <div className="text-right flex-1 min-w-0">
              <DialogTitle className="text-xl sm:text-2xl font-black text-foreground leading-snug">
                ޕްރޮގްރާމް ބަންދުކުރައްވަނީތޯ؟
              </DialogTitle>
              <DialogDescription className="text-xs font-bold text-muted-foreground text-right mt-0.5 font-sans">
                Confirm Close • Choose an action for MVPOS Terminal
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-3 space-y-3.5">
          {/* BIG Primary Close Application Button */}
          <button
            type="button"
            onClick={handleConfirmClose}
            className="w-full py-5 px-6 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white border border-red-400/40 shadow-[0_14px_32px_-6px_rgba(220,38,38,0.55)] hover:shadow-[0_18px_38px_-6px_rgba(220,38,38,0.7)] transition-all active:scale-[0.98] flex items-center justify-between group cursor-pointer"
          >
            <div className="w-13 h-13 rounded-2xl bg-white/20 flex items-center justify-center shrink-0 shadow-inner group-hover:scale-105 transition-transform">
              <Power className="h-7 w-7 text-white stroke-[2.5]" />
            </div>
            <div className="text-right flex-1 pr-4">
              <div className="text-lg sm:text-xl font-black leading-tight tracking-tight">
                ޕްރޮގްރާމް ބަންދުކުރޭ (Close App)
              </div>
              <div className="text-xs font-bold text-white/85 font-mono uppercase tracking-wider mt-1">
                Exit Windows Application Completely
              </div>
            </div>
          </button>

          {/* Secondary Actions: Minimize & Logout */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Minimize Button */}
            <button
              type="button"
              onClick={handleMinimize}
              className="py-4 px-4 rounded-2xl border-2 border-sky-500/35 bg-sky-500/10 hover:bg-sky-500 text-sky-600 dark:text-sky-400 hover:text-white transition-all active:scale-[0.98] flex items-center justify-between group cursor-pointer shadow-sm"
            >
              <div className="w-10 h-10 rounded-xl bg-sky-500/20 group-hover:bg-white/20 flex items-center justify-center shrink-0 transition-colors">
                <Minimize2 className="h-5 w-5" />
              </div>
              <div className="text-right flex-1 pr-3">
                <div className="text-sm sm:text-base font-black leading-tight">
                  ކުޑަކޮށްލާ
                </div>
                <div className="text-[11px] font-bold uppercase font-mono opacity-85 mt-0.5">
                  Minimize App
                </div>
              </div>
            </button>

            {/* Logout Button */}
            <button
              type="button"
              onClick={handleLogout}
              disabled={!currentUser}
              className="py-4 px-4 rounded-2xl border-2 border-amber-500/35 bg-amber-500/10 hover:bg-amber-500 text-amber-600 dark:text-amber-400 hover:text-white disabled:opacity-40 disabled:pointer-events-none transition-all active:scale-[0.98] flex items-center justify-between group cursor-pointer shadow-sm"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 group-hover:bg-white/20 flex items-center justify-center shrink-0 transition-colors">
                <LogOut className="h-5 w-5" />
              </div>
              <div className="text-right flex-1 pr-3">
                <div className="text-sm sm:text-base font-black leading-tight">
                  ލޮގްއައުޓް
                </div>
                <div className="text-[11px] font-bold uppercase font-mono opacity-85 mt-0.5">
                  Logout User
                </div>
              </div>
            </button>
          </div>
        </div>

        <div className="pt-2 border-t border-border/50">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setOpen(false)}
            className="w-full h-11 rounded-2xl font-black text-xs sm:text-sm text-muted-foreground hover:text-foreground flex items-center justify-center gap-2"
          >
            <X className="h-4 w-4" />
            <span>ކެންސަލް / Stay in POS</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AppCloseConfirmDialog;

