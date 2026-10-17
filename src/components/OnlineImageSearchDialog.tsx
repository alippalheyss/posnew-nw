"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Sparkles, Loader2, Image as ImageIcon, Check, ExternalLink, Link2, Copy, AlertCircle } from 'lucide-react';
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

const GoogleIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
  </svg>
);

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

  // Direct pasted URL state
  const [pastedUrl, setPastedUrl] = useState('');
  const [isPastingValid, setIsPastingValid] = useState(false);

  // When dialog opens, initialize query from product name and trigger search
  useEffect(() => {
    if (isOpen) {
      const initial = (productName || '').trim();
      setSearchTerm(initial);
      setSelectedUrl(null);
      setPastedUrl('');
      setIsPastingValid(false);
      if (initial || barcode) {
        performSearch(initial, barcode);
      } else {
        setImages([]);
      }
    }
  }, [isOpen, productName, barcode]);

  // Validate pasted URL
  useEffect(() => {
    const trimmed = pastedUrl.trim();
    if (!trimmed) {
      setIsPastingValid(false);
      return;
    }
    const looksLikeUrl = trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:image/');
    setIsPastingValid(looksLikeUrl);
  }, [pastedUrl]);

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

  const handleOpenGoogleImages = () => {
    const q = (searchTerm || productName || '').trim();
    if (!q) {
      showError('Please type a product name first');
      return;
    }
    const googleUrl = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(q)}`;
    window.open(googleUrl, '_blank', 'noopener,noreferrer');
  };

  const handleApplyPastedUrl = () => {
    const trimmed = pastedUrl.trim();
    if (!trimmed) {
      showError('Please paste an image URL first');
      return;
    }
    setSelectedUrl(trimmed);
    onSelectImage(trimmed);
    showSuccess('Google product image applied! 📸');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[760px] w-[min(96vw,760px)] max-h-[92vh] flex flex-col p-5 sm:p-6 apple-glass-dialog rounded-3xl border border-white/20 dark:border-white/10 text-foreground box-border" dir="rtl">
        <DialogHeader className="pb-3 text-right border-b border-border/60">
          <div className="flex items-center justify-between pl-8">
            <div className="text-right flex-1 min-w-0">
              <DialogTitle className="text-xl font-black text-foreground flex items-center gap-2">
                <GoogleIcon className="h-5 w-5 shrink-0" />
                <span>ގޫގުލް އާއި އޮންލައިން ފޮޓޯ ހޯދާ (Google & Online Image Search)</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-1">
                Select matching product packaging directly or pick from Google Images
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
              placeholder="Type English product name (e.g. Coca Cola 330ml, Nutella, Milo)..."
              className="w-full h-11 rounded-xl bg-muted/60 border-border font-bold text-foreground pr-4 pl-4 text-sm"
            />
          </div>
        </form>

        {/* Google Images Helper Card */}
        <div className="mt-3 p-3.5 bg-card/80 border border-border/70 rounded-2xl space-y-2.5 text-right" dir="ltr">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            <Button
              type="button"
              onClick={handleOpenGoogleImages}
              className="h-10 px-4 rounded-xl bg-white hover:bg-white/90 text-slate-800 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800 border border-border shadow-xs font-bold gap-2 text-xs shrink-0 transition-all"
            >
              <GoogleIcon className="h-4 w-4 shrink-0" />
              <span>Search on Google Images ↗</span>
            </Button>
            <p className="text-[11px] text-muted-foreground text-left sm:text-right flex items-center gap-1.5 leading-tight">
              <span>Right-click any image in Google → click <b>"Copy image address"</b> → paste below:</span>
            </p>
          </div>

          <div className="flex gap-2 items-center">
            <div className="relative flex-1">
              <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={pastedUrl}
                onChange={(e) => setPastedUrl(e.target.value)}
                placeholder="Paste Google Image URL (https://... or encrypted-tbn0.gstatic.com/...)"
                className="w-full h-10 pl-9 pr-3 rounded-xl bg-muted/40 border-border font-mono text-xs text-foreground"
              />
            </div>
            {isPastingValid && (
              <div className="w-10 h-10 rounded-xl border border-border overflow-hidden shrink-0 bg-muted flex items-center justify-center">
                <img
                  src={pastedUrl.trim()}
                  alt="Pasted Preview"
                  className="w-full h-full object-contain"
                  onError={() => setIsPastingValid(false)}
                />
              </div>
            )}
            <Button
              type="button"
              disabled={!isPastingValid}
              onClick={handleApplyPastedUrl}
              className="h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shrink-0 gap-1.5 shadow-sm"
            >
              <Check className="h-3.5 w-3.5" />
              <span>Use Image</span>
            </Button>
          </div>
        </div>

        {/* Automatic Image Grid Area */}
        <ScrollArea className="flex-1 min-h-[260px] max-h-[440px] mt-3 pr-2 custom-scrollbar">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-xs font-bold">Finding matching packaging & retail photos online...</p>
            </div>
          ) : images.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground gap-3 bg-muted/20 rounded-2xl border border-dashed border-border/80">
              <ImageIcon className="h-10 w-10 text-muted-foreground/30" />
              <div>
                <p className="text-sm font-bold text-foreground">No automatic catalog matches found</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Click <b>"Search on Google Images ↗"</b> above to find and copy any image from Google!
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
