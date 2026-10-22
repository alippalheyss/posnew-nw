"use client";

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Product, useAppContext } from '@/context/AppContext';
import { Sparkles, Tag, Check, Package } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FlavourSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onSelect: (flavourName?: string) => void;
}

const FlavourSelectionDialog: React.FC<FlavourSelectionDialogProps> = ({
  isOpen,
  onClose,
  product,
  onSelect,
}) => {
  const { t } = useTranslation();
  const { settings } = useAppContext();

  if (!product) return null;

  const currency = settings?.shop?.currency || 'MVR';
  const flavours = product.flavours || [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[460px] font-faruma apple-glass-dialog border-white/20 dark:border-white/10 text-foreground shadow-2xl rounded-3xl p-6" dir="rtl">
        <DialogHeader className="text-right pb-3 border-b border-white/10">
          <DialogTitle className="text-xl font-black flex items-center justify-end gap-2 text-foreground">
            <span>ފްލޭވާ / ވޭރިއަންޓް އިޚްތިޔާރުކުރޭ</span>
            <span className="text-xs font-normal text-muted-foreground font-sans">(Select Flavour)</span>
            <div className="h-8 w-8 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center">
              <Sparkles className="h-4 w-4" />
            </div>
          </DialogTitle>
          <DialogDescription className="text-right text-muted-foreground text-xs mt-1">
            <span className="font-black text-foreground text-sm block">{product.name_dv}</span>
            <span className="text-[11px] text-muted-foreground font-mono">{product.name_en}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2 py-3 max-h-[60vh] overflow-y-auto pr-1">
          {/* Default / No specific flavour option */}
          <button
            type="button"
            className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-white/5 dark:bg-black/20 hover:bg-primary/15 border border-white/10 hover:border-primary/40 backdrop-blur-md transition-all duration-200 text-right group cursor-pointer active:scale-[0.98]"
            onClick={() => {
              onSelect(undefined);
              onClose();
            }}
          >
            <div className="text-left font-mono">
              <span className="text-base font-black text-primary group-hover:text-primary transition-colors block">
                {currency} {Number(product.price || 0).toFixed(2)}
              </span>
              <span className="text-[10px] text-muted-foreground font-sans">
                Standard Price
              </span>
            </div>

            <div className="text-right flex items-center gap-3">
              <div>
                <div className="flex items-center justify-end gap-1.5 mb-0.5">
                  <Badge variant="secondary" className="text-[9px] font-bold uppercase tracking-wider bg-white/10 text-muted-foreground border-white/10">
                    Default
                  </Badge>
                  <span className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                    ވަކި ފްލޭވާއެއް ނެތި (Standard)
                  </span>
                </div>
                <span className="text-[10px] text-muted-foreground block font-mono">
                  Base product without variant tag
                </span>
              </div>
              <div className="h-9 w-9 rounded-xl bg-white/10 dark:bg-black/30 border border-white/10 flex items-center justify-center text-muted-foreground group-hover:text-primary group-hover:border-primary/40 transition-all shrink-0">
                <Package className="h-4 w-4" />
              </div>
            </div>
          </button>

          {/* List of flavours */}
          {flavours.map((flavour, idx) => {
            const price = Number(flavour.price || product.price || 0);
            return (
              <button
                key={idx}
                type="button"
                className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-amber-500/5 dark:bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 hover:border-amber-500/50 backdrop-blur-md transition-all duration-200 text-right group cursor-pointer active:scale-[0.98]"
                onClick={() => {
                  onSelect(flavour.name);
                  onClose();
                }}
              >
                <div className="text-left font-mono">
                  <span className="text-base font-black text-amber-500 group-hover:text-amber-400 transition-colors block">
                    {currency} {price.toFixed(2)}
                  </span>
                  {flavour.price && flavour.price !== product.price ? (
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-sans font-bold">
                      Custom price
                    </span>
                  ) : (
                    <span className="text-[10px] text-muted-foreground font-sans">
                      Standard
                    </span>
                  )}
                </div>

                <div className="text-right flex items-center gap-3">
                  <div>
                    <div className="flex items-center justify-end gap-1.5 mb-0.5">
                      <span className="font-black text-sm text-foreground group-hover:text-amber-400 transition-colors">
                        {flavour.name}
                      </span>
                    </div>
                    {flavour.barcode && (
                      <span className="text-[10px] text-muted-foreground block font-mono font-bold tracking-wider">
                        #{flavour.barcode}
                      </span>
                    )}
                  </div>
                  <div className="h-9 w-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-500 group-hover:bg-amber-500 group-hover:text-white transition-all shrink-0">
                    <Tag className="h-4 w-4" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FlavourSelectionDialog;
