"use client";

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAppContext } from '@/context/AppContext';
import { format, isPast, parseISO, addDays } from 'date-fns';
import { AlertCircle, CheckCircle2, AlertTriangle, Clock, Calendar, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

const ExpiryAlerts = () => {
  const { t } = useTranslation();
  const { products } = useAppContext();
  const today = new Date();
  const thirtyDaysFromNow = addDays(today, 30);

  const expiringProducts = products.filter(product => {
    if (!product.expiry_date) return false;
    const expiryDate = parseISO(product.expiry_date);
    return isPast(expiryDate) || (expiryDate <= thirtyDaysFromNow);
  }).sort((a, b) => {
    if (!a.expiry_date || !b.expiry_date) return 0;
    return parseISO(a.expiry_date).getTime() - parseISO(b.expiry_date).getTime();
  });

  const renderBoth = (key: string, options?: any) => (
    <>
      {t(key, options)} ({t(key, { ...options, lng: 'en' })})
    </>
  );

  return (
    <div className="p-6 font-faruma flex flex-col h-full bg-[#050510] text-white overflow-hidden" dir="rtl">
      {/* Header Section */}
      <div className="flex justify-between items-center mb-8">
        <div className="text-right">
           <h1 className="text-3xl font-black text-white flex items-center justify-end gap-3">
             {renderBoth('expiry_alerts')} <ShieldAlert className="h-8 w-8 text-red-500" />
           </h1>
           <p className="text-sm text-white/40 mt-1">{renderBoth('expiry_alerts_description')}</p>
        </div>
      </div>

      <ScrollArea className="flex-1 custom-scrollbar">
        {expiringProducts.length === 0 ? (
          <div className="h-60 flex flex-col items-center justify-center text-white/20 uppercase tracking-[0.2em] font-black">
             <CheckCircle2 className="h-16 w-16 mb-4 opacity-10" />
             All products are within safety range
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-6">
            {expiringProducts.map((product) => {
              const expiryDate = product.expiry_date ? parseISO(product.expiry_date) : null;
              const isExpired = expiryDate ? isPast(expiryDate) : false;
              const isNearingExpiry = expiryDate ? (expiryDate <= thirtyDaysFromNow && !isExpired) : false;

              return (
                <Card key={product.id} className={cn(
                  "bg-[#0a0a1a] border-white/5 hover:border-primary/30 transition-all rounded-[2rem] overflow-hidden group relative",
                  isExpired ? "border-red-500/20" : isNearingExpiry ? "border-orange-500/20" : ""
                )}>
                   <CardContent className="p-0">
                      <div className="p-6">
                         <div className="flex justify-between items-start mb-6">
                            <div className={cn(
                              "w-12 h-12 rounded-2xl flex items-center justify-center border transition-all group-hover:scale-110",
                              isExpired ? "bg-red-500/10 border-red-500/20 text-red-500" : "bg-orange-500/10 border-orange-500/20 text-orange-500"
                            )}>
                               <AlertTriangle className="h-6 w-6" />
                            </div>
                            <Badge className={cn(
                              "border-none text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest",
                              isExpired ? "bg-red-500 text-white animate-pulse" : "bg-orange-500 text-white"
                            )}>
                               {isExpired ? 'EXPIRED' : 'NEARING EXPIRY'}
                            </Badge>
                         </div>

                         <div className="text-right mb-6">
                            <h3 className="text-lg font-black text-white leading-tight mb-1 truncate">{product.name_dv}</h3>
                            <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest truncate">{product.name_en}</p>
                            <p className="text-[10px] font-mono text-primary mt-2">ID: {product.item_code}</p>
                         </div>

                         <div className={cn(
                           "p-4 rounded-2xl border flex flex-col items-center justify-center transition-all",
                           isExpired ? "bg-red-500/10 border-red-500/10" : "bg-orange-500/10 border-orange-500/10"
                         )}>
                            <div className="flex items-center gap-2 mb-1">
                               <Calendar className={cn("h-4 w-4", isExpired ? "text-red-500" : "text-orange-500")} />
                               <span className="text-[10px] font-black uppercase tracking-widest text-white/40">EXPIRY DATE</span>
                            </div>
                            <p className={cn(
                              "text-xl font-black",
                              isExpired ? "text-red-500" : "text-orange-500"
                            )}>
                               {format(expiryDate!, 'dd MMMM yyyy')}
                            </p>
                            <div className="flex items-center gap-1 mt-2">
                               <Clock className="h-3 w-3 text-white/20" />
                               <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">
                                  {isExpired ? 'STOCK SHOULD BE REMOVED' : `${Math.ceil((expiryDate!.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))} DAYS REMAINING`}
                               </span>
                            </div>
                         </div>
                      </div>
                   </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};

export default ExpiryAlerts;