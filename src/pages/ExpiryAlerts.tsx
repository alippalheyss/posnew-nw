"use client";

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAppContext } from '@/context/AppContext';
import { format, isPast, parseISO, addDays } from 'date-fns';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

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
    <div className="p-4 font-faruma flex flex-col h-full">
      <Card className="flex-1">
        <CardHeader>
          <CardTitle className="text-right text-xl">{renderBoth('expiry_alerts')}</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden">
          <p className="text-right mb-4">{renderBoth('expiry_alerts_description')}</p>
          <ScrollArea className="h-[calc(100vh-250px)] pr-4">
            {expiringProducts.length === 0 ? (
              <p className="text-center text-gray-500">{renderBoth('no_expiry_alerts')}</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                {expiringProducts.map((product) => {
                  const expiryDate = product.expiry_date ? parseISO(product.expiry_date) : null;
                  const isExpired = expiryDate ? isPast(expiryDate) : false;
                  const isNearingExpiry = expiryDate ? (expiryDate <= thirtyDaysFromNow && !isExpired) : false;

                  return (
                    <Card
                      key={product.id}
                      className={cn(
                        "text-right flex flex-col h-full",
                        isExpired && "border-red-500 bg-red-50 dark:bg-red-900/10",
                        isNearingExpiry && "border-yellow-500 bg-yellow-50 dark:bg-yellow-900/10"
                      )}
                    >
                      <CardContent className="p-3 flex flex-col h-full">
                        <div className="flex justify-center mb-2 relative">
                          <img src={product.image} alt={product.name_dv} className="w-20 h-20 object-cover rounded-md border shadow-sm" />
                          <div className="absolute -top-1 -right-1">
                            {isExpired ? (
                              <AlertCircle className="h-4 w-4 text-red-600 fill-white rounded-full bg-red-50" />
                            ) : isNearingExpiry ? (
                              <AlertCircle className="h-4 w-4 text-yellow-600 fill-white rounded-full bg-yellow-50" />
                            ) : (
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                            )}
                          </div>
                        </div>

                        <div className="flex-1 flex flex-col justify-between text-center">
                          <div>
                            <p className="font-bold text-sm leading-tight mb-1 text-gray-900 dark:text-white truncate">{product.name_dv}</p>
                            <p className="text-[10px] text-gray-500 mb-2 truncate">{product.name_en}</p>
                          </div>

                          <div className={cn(
                            "rounded p-1.5 text-[9px] font-bold border",
                            isExpired ? "bg-red-500 text-white border-red-600" : isNearingExpiry ? "bg-amber-100 text-amber-800 border-amber-200" : "bg-gray-100 text-gray-700 border-gray-200"
                          )}>
                            <p className="uppercase opacity-70 mb-0.5">{isExpired ? t('expired') : t('expiry_date')}</p>
                            <p>{format(expiryDate!, 'dd/MM/yyyy')}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default ExpiryAlerts;