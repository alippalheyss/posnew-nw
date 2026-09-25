"use client";

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAppContext } from '@/context/AppContext';
import { format, isPast, parseISO, addDays } from 'date-fns';
import { AlertCircle, CheckCircle2, AlertTriangle, Clock, Calendar, ShieldAlert, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import ExpiryUpdateDialog from '@/components/ExpiryUpdateDialog';
import { NearExpiryBroadcastDialog } from '@/components/NearExpiryBroadcastDialog';

const ExpiryAlerts = () => {
  const { t } = useTranslation();
  const { products, customers, settings, updateProduct } = useAppContext();
  const today = new Date();
  const thirtyDaysFromNow = addDays(today, 30);
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const [isBroadcastDialogOpen, setIsBroadcastDialogOpen] = useState(false);

  const expiringProducts = products.filter(product => {
    if (!product.expiry_date) return false;
    const expiryDate = parseISO(product.expiry_date);
    return isPast(expiryDate) || (expiryDate <= thirtyDaysFromNow);
  }).sort((a, b) => {
    if (!a.expiry_date || !b.expiry_date) return 0;
    return parseISO(a.expiry_date).getTime() - parseISO(b.expiry_date).getTime();
  });

  const nearExpiryCount = expiringProducts.filter(p => {
    if (!p.expiry_date) return false;
    const exp = parseISO(p.expiry_date);
    return !isPast(exp) && exp <= thirtyDaysFromNow;
  }).length;

  const renderBoth = (key: string, options?: any) => (
    <>
      {t(key, options)} ({t(key, { ...options, lng: 'en' })})
    </>
  );

  return (
    <div className="p-6 font-faruma flex flex-col h-full bg-background text-foreground overflow-hidden" dir="rtl">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div className="text-right">
           <h1 className="text-3xl font-black text-foreground flex items-center justify-end gap-3">
             {renderBoth('expiry_alerts')} <ShieldAlert className="h-8 w-8 text-red-500" />
           </h1>
           <p className="text-sm text-muted-foreground mt-1">{renderBoth('expiry_alerts_description')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
           <Button
             onClick={() => setIsBroadcastDialogOpen(true)}
             className="gap-2 bg-gradient-to-r from-orange-600 via-amber-600 to-orange-500 hover:opacity-95 text-white h-10 px-5 rounded-xl font-black shadow-lg shadow-orange-500/25 text-xs uppercase tracking-wider relative"
           >
             <Flame className="h-4 w-4 fill-white/20" />
             <span>އަގު ތިރިކުރުމާއި ޓެލެގްރާމް އެލާޓް (Drop Price & Alert)</span>
             {nearExpiryCount > 0 && (
               <Badge className="bg-white text-orange-600 font-mono text-[10px] font-black px-1.5 py-0 rounded-full ml-1 border-none shadow-xs">
                 {nearExpiryCount}
               </Badge>
             )}
           </Button>

           <Button
             onClick={() => setIsUpdateDialogOpen(true)}
             className="gap-2 bg-primary hover:bg-primary/90 h-10 px-5 rounded-xl font-black shadow-[0_0_20px_rgba(0,132,255,0.3)] text-foreground uppercase tracking-widest text-xs"
           >
             <Calendar className="h-4 w-4" /> Update Expiry Dates
           </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 custom-scrollbar">
        {expiringProducts.length === 0 ? (
          <div className="h-60 flex flex-col items-center justify-center text-muted-foreground/50 uppercase tracking-[0.2em] font-black">
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
                  "apple-glass-card transition-all duration-300 rounded-[2rem] overflow-hidden group relative shadow-md hover:shadow-xl border",
                  isExpired 
                    ? "border-red-500/40 shadow-[0_4px_20px_rgba(239,68,68,0.15)]" 
                    : isNearingExpiry 
                    ? "border-amber-500/40 shadow-[0_4px_20px_rgba(245,158,11,0.15)]" 
                    : "border-white/20 dark:border-white/10"
                )}>
                   <CardContent className="p-0">
                      <div className="p-6">
                         <div className="flex justify-between items-start mb-6">
                            <div className={cn(
                              "w-12 h-12 rounded-2xl flex items-center justify-center border transition-all group-hover:scale-110 shadow-xs",
                              isExpired ? "bg-red-500/15 border-red-500/30 text-red-500" : "bg-amber-500/15 border-amber-500/30 text-amber-500"
                            )}>
                               <AlertTriangle className="h-6 w-6" />
                            </div>
                            <Badge variant={isExpired ? "destructive" : "warning"} className="text-[9px] font-black px-2.5 py-0.5 uppercase tracking-wider">
                               {isExpired ? 'EXPIRED' : 'NEARING EXPIRY'}
                            </Badge>
                         </div>

                         <div className="text-right mb-6">
                            <h3 className="text-lg font-black text-foreground leading-tight mb-1 truncate">{product.name_dv}</h3>
                            <p className="text-xs sm:text-[13px] font-bold text-muted-foreground uppercase tracking-wider truncate">{product.name_en}</p>
                            <p className="text-xs font-mono text-primary font-bold mt-2">ID: #{product.item_code}</p>
                         </div>

                         <div className={cn(
                           "p-4 rounded-2xl border flex flex-col items-center justify-center transition-all apple-glass-card",
                           isExpired ? "bg-red-500/10 border-red-500/20" : "bg-amber-500/10 border-amber-500/20"
                         )}>
                            <div className="flex items-center gap-2 mb-1">
                               <Calendar className={cn("h-4 w-4", isExpired ? "text-red-500" : "text-amber-500")} />
                               <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">EXPIRY DATE</span>
                            </div>
                            <p className={cn(
                              "text-xl font-black",
                              isExpired ? "text-red-500" : "text-amber-500"
                            )}>
                               {format(expiryDate!, 'dd MMMM yyyy')}
                            </p>
                            <div className="flex items-center gap-1 mt-2">
                               <Clock className="h-3 w-3 text-muted-foreground/50" />
                               <span className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-widest">
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
      
      <ExpiryUpdateDialog 
        isOpen={isUpdateDialogOpen}
        onClose={() => setIsUpdateDialogOpen(false)}
      />

      {/* Near Expiry Management & Telegram Clearance Broadcast Modal */}
      <NearExpiryBroadcastDialog
        open={isBroadcastDialogOpen}
        onOpenChange={setIsBroadcastDialogOpen}
        products={products}
        customers={customers}
        settings={settings}
        updateProduct={updateProduct}
      />
    </div>
  );
};

export default ExpiryAlerts;