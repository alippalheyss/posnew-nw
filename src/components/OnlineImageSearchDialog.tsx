"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Sparkles, Loader2, Image as ImageIcon, Check, ExternalLink } from 'lucide-react';
import { searchProductImages, OnlineProductImage } from '@/services/productImageService';
import { cn } from '@/lib/utils';
import { showSuccess, showError } from '@/utils/toast';

interface OnlineImageSearchDialogProps {
  isOpen: boolean;
  onClose: () => void;
  productName: string;
  barcode?: string;
  onSelectImage: (imageUrl: string) => void;
}

export const OnlineImageSearchDialog: React.FC<OnlineImageSearchDialogProps> = ({
  isOpen,
  onClose,
  productName,
  barcode,
  onSelectImage
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [images, setImages] = useState<OnlineProductImage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);

  // When dialog opens, initialize query from product name and trigger search
  useEffect(() => {
    if (isOpen) {
      const initial = (productName || '').trim();
      setSearchTerm(initial);
      setSelectedUrl(null);
      if (initial || barcode) {
        performSearch(initial, barcode);
      } else {
        setImages([]);
      }
    }
  }, [isOpen, productName, barcode]);

  const performSearch = async (query: string, code?: string) => {
    setIsLoading(true);
    try {
      const results = await searchProductImages(query, code);
      setImages(results);
    } catch (err) {
      console.error('Error finding images:', err);
      showError('Failed to fetch online images');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim() || barcode) {
      performSearch(searchTerm.trim(), barcode);
    }
  };

  const handleChoose = (img: OnlineProductImage) => {
    setSelectedUrl(img.url);
    onSelectImage(img.url);
    showSuccess('Product image updated! 📸');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[720px] w-[min(95vw,720px)] max-h-[90vh] flex flex-col p-5 sm:p-6 apple-glass-dialog rounded-3xl border border-white/20 dark:border-white/10 text-foreground box-border" dir="rtl">
        <DialogHeader className="pb-3 text-right border-b border-border/60">
          <div className="flex items-center justify-between pl-8">
            <div className="text-right flex-1 min-w-0">
              <DialogTitle className="text-xl font-black text-foreground flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-500 shrink-0" />
                <span>އޮންލައިން ފޮޓޯ ހޯދާ (Find Product Image)</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-1">
                Search open retail repositories (Open Food Facts & Wikimedia) for packaging and photos
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="flex gap-2 pt-3" dir="ltr">
          <Button
            type="submit"
            disabled={isLoading}
            className="h-11 px-5 rounded-xl bg-primary text-white font-bold gap-2 shrink-0 shadow-md shadow-primary/20"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            <span>Search</span>
          </Button>
          <div className="relative flex-1">
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Type English product name (e.g. Coca Cola 330ml, Lipton Tea, Nutella)..."
              className="w-full h-11 rounded-xl bg-muted/60 border-border font-bold text-foreground pr-4 pl-4 text-sm"
            />
          </div>
        </form>

        {/* Image Grid Area */}
        <ScrollArea className="flex-1 min-h-[320px] max-h-[480px] mt-4 pr-2 custom-scrollbar">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-xs font-bold">Searching matching product packaging online...</p>
            </div>
          ) : images.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground gap-3 bg-muted/20 rounded-2xl border border-dashed border-border/80">
              <ImageIcon className="h-10 w-10 text-muted-foreground/30" />
              <div>
                <p className="text-sm font-bold text-foreground">No online images found</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Try typing the English brand or generic name (e.g. "Sprite Can", "Oreo biscuit", "Apples")
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pb-2" dir="ltr">
              {images.map((img) => {
                const isSelected = selectedUrl === img.url;
                return (
                  <div
                    key={img.id}
                    onClick={() => handleChoose(img)}
                    className={cn(
                      "group relative rounded-2xl border bg-card p-2 cursor-pointer transition-all duration-200 overflow-hidden flex flex-col justify-between hover:shadow-lg hover:-translate-y-0.5",
                      isSelected
                        ? "border-primary ring-2 ring-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <div className="aspect-square rounded-xl overflow-hidden bg-white/5 border border-border/40 relative flex items-center justify-center">
                      <img
                        src={img.thumbnail || img.url}
                        alt={img.title}
                        loading="lazy"
                        className="w-full h-full object-contain p-1 group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          // Hide broken thumbnails
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                      {isSelected && (
                        <div className="absolute inset-0 bg-primary/20 backdrop-blur-xs flex items-center justify-center">
                          <Check className="h-8 w-8 text-primary drop-shadow-md" />
                        </div>
                      )}
                    </div>

                    <div className="mt-2 text-left">
                      <p className="text-[11px] font-bold text-foreground line-clamp-1 leading-tight" title={img.title}>
                        {img.title}
                      </p>
                      <div className="flex items-center justify-between mt-1">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[8px] font-mono px-1 py-0",
                            img.source === 'Barcode DB'
                              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                              : "bg-blue-500/10 text-blue-600 border-blue-500/30"
                          )}
                        >
                          {img.source}
                        </Badge>
                        <span className="text-[10px] text-primary font-black opacity-0 group-hover:opacity-100 transition-opacity">
                          Use Image →
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Footer info */}
        <div className="pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground" dir="rtl">
          <span>ފޮޓޯއަށް ފިއްތާލުމުން އަމިއްލައަށް ކަނޑައެޅޭނެ (Click image to select)</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="h-9 px-4 rounded-xl border-border text-foreground font-bold"
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OnlineImageSearchDialog;
