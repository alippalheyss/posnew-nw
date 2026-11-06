"use client";

import React from 'react';
import { Landmark, ArrowDownLeft } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';

export const BankAlertPill: React.FC = () => {
  const { activeTopBankAlert } = useAppContext();

  if (!activeTopBankAlert) return null;

  const amtText =
    activeTopBankAlert.amount !== null
      ? `${activeTopBankAlert.currency} ${activeTopBankAlert.amount.toFixed(2)}`
      : activeTopBankAlert.title;

  return (
    <div
      className="fixed top-4 left-1/2 -translate-x-1/2 z-[99999] pointer-events-none select-none transition-all duration-300"
      style={{ pointerEvents: 'none', userSelect: 'none' }}
      aria-live="polite"
    >
      <div className="animate-in fade-in slide-in-from-top-6 zoom-in-95 duration-300 flex items-center gap-3.5 px-5 py-2.5 sm:px-6 sm:py-3 rounded-full bg-zinc-950/95 dark:bg-black/95 text-white border-2 border-emerald-500/80 shadow-[0_12px_40px_rgba(16,185,129,0.45)] backdrop-blur-2xl max-w-[92vw]">
        {/* Pulsing Emerald Bank Icon Container */}
        <div className="w-9 h-9 rounded-full bg-emerald-500/20 border border-emerald-400 text-emerald-400 flex items-center justify-center shrink-0 animate-pulse">
          <Landmark className="h-5 w-5" />
        </div>

        {/* Text Details */}
        <div className="flex flex-col text-left leading-tight">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1">
              <ArrowDownLeft className="h-3 w-3" />
              Live Bank Alert
            </span>
            <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded-full font-bold">
              Just now
            </span>
          </div>

          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-lg sm:text-xl font-black font-mono text-emerald-300 tracking-tight">
              {amtText}
            </span>
            {activeTopBankAlert.senderOrRef && (
              <span className="text-xs font-bold text-zinc-300 truncate max-w-[180px] sm:max-w-[320px]">
                • {activeTopBankAlert.senderOrRef}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BankAlertPill;
