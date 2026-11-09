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
      <div className="animate-in fade-in slide-in-from-top-6 zoom-in-95 duration-300 flex items-center gap-3.5 px-5 py-2.5 sm:px-6 sm:py-3 rounded-full bg-gradient-to-r from-emerald-50/95 via-white/95 to-teal-50/95 dark:from-emerald-950/95 dark:via-slate-900/95 dark:to-teal-950/95 text-slate-900 dark:text-white border-2 border-emerald-400/80 dark:border-emerald-500/70 shadow-[0_12px_35px_rgba(16,185,129,0.25)] backdrop-blur-2xl max-w-[92vw]">
        {/* Crisp Emerald Bank Icon Container */}
        <div className="w-9 h-9 rounded-full bg-emerald-500 text-white shadow-md shadow-emerald-500/30 flex items-center justify-center shrink-0">
          <Landmark className="h-4.5 w-4.5" />
        </div>

        {/* Text Details */}
        <div className="flex flex-col text-left leading-tight">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
              <ArrowDownLeft className="h-3 w-3 stroke-[2.5]" />
              Live Bank Alert ({activeTopBankAlert.bankName || 'BML'})
            </span>
            <span className="text-[9px] bg-emerald-500/15 dark:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 px-1.5 py-0.2 rounded-full font-bold">
              Just now
            </span>
          </div>

          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-lg sm:text-xl font-black font-mono text-emerald-700 dark:text-emerald-300 tracking-tight">
              {amtText}
            </span>
            {activeTopBankAlert.senderOrRef && (
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300 truncate max-w-[180px] sm:max-w-[320px]">
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
