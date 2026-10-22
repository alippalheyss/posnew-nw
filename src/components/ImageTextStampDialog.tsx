import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Type, Sparkles, Check, Undo2, LayoutTemplate, Palette } from 'lucide-react';

interface ImageTextStampDialogProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string | null;
  productName?: string;
  flavourNames?: string[];
  onApplyImage: (stampedDataUrl: string) => void;
}

type StylePreset = 'bottom-banner' | 'top-banner' | 'top-right-pill' | 'bottom-right-pill' | 'center-badge';
type ColorTheme = 'dark' | 'red' | 'emerald' | 'amber' | 'sky' | 'white';

const COLOR_MAP: Record<ColorTheme, { bg: string; text: string; label: string; border?: string }> = {
  dark: { bg: 'rgba(0, 0, 0, 0.78)', text: '#ffffff', label: 'Dark' },
  red: { bg: 'rgba(220, 38, 38, 0.90)', text: '#ffffff', label: 'Red' },
  emerald: { bg: 'rgba(5, 150, 105, 0.90)', text: '#ffffff', label: 'Green' },
  amber: { bg: 'rgba(217, 119, 6, 0.90)', text: '#ffffff', label: 'Amber' },
  sky: { bg: 'rgba(2, 132, 199, 0.90)', text: '#ffffff', label: 'Blue' },
  white: { bg: 'rgba(255, 255, 255, 0.92)', text: '#111827', label: 'White', border: '#e5e7eb' },
};

const COMMON_PRESETS = ['NEW', 'HOT', '500ML', '1KG', 'OFFER', 'ORIGINAL', 'PACK OF 2', 'BUY 1 GET 1'];

export const ImageTextStampDialog: React.FC<ImageTextStampDialogProps> = ({
  isOpen,
  onClose,
  imageUrl,
  productName = '',
  flavourNames = [],
  onApplyImage
}) => {
  const [stampText, setStampText] = useState<string>('');
  const [stylePreset, setStylePreset] = useState<StylePreset>('bottom-banner');
  const [colorTheme, setColorTheme] = useState<ColorTheme>('dark');
  const [fontScale, setFontScale] = useState<number>(24);
  const [isUppercase, setIsUppercase] = useState<boolean>(true);
  
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sourceImageRef = useRef<HTMLImageElement | null>(null);
  const [imageLoaded, setImageLoaded] = useState<boolean>(false);

  // Load image when dialog opens or imageUrl changes
  useEffect(() => {
    if (isOpen && imageUrl) {
      setImageLoaded(false);
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        sourceImageRef.current = img;
        setImageLoaded(true);
      };
      img.onerror = () => {
        // Fallback for CORS issues if any: re-attempt without crossOrigin
        const fallbackImg = new Image();
        fallbackImg.onload = () => {
          sourceImageRef.current = fallbackImg;
          setImageLoaded(true);
        };
        fallbackImg.src = imageUrl;
      };
      img.src = imageUrl;
    }
  }, [isOpen, imageUrl]);

  // Render on canvas whenever text, preset, color, or image changes
  useEffect(() => {
    if (!imageLoaded || !sourceImageRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = sourceImageRef.current;
    const width = img.naturalWidth || 600;
    const height = img.naturalHeight || 600;

    canvas.width = width;
    canvas.height = height;

    // 1. Draw base image
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    const displayText = isUppercase ? stampText.toUpperCase().trim() : stampText.trim();
    if (!displayText) return; // Nothing to stamp

    // 2. Compute dynamic font size relative to image width
    // Base scale 24 = ~6.5% of image width
    const calculatedFontSize = Math.max(16, Math.round((width / 400) * fontScale));
    ctx.font = `900 ${calculatedFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    ctx.textBaseline = 'middle';

    const textMetrics = ctx.measureText(displayText);
    const textWidth = textMetrics.width;
    const textHeight = calculatedFontSize * 1.2;

    const colors = COLOR_MAP[colorTheme];

    if (stylePreset === 'bottom-banner' || stylePreset === 'top-banner') {
      const bannerHeight = Math.round(textHeight * 1.6);
      const y = stylePreset === 'bottom-banner' ? height - bannerHeight : 0;

      // Draw banner background
      ctx.fillStyle = colors.bg;
      ctx.fillRect(0, y, width, bannerHeight);

      // Draw subtle top/bottom accent line
      ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.fillRect(0, stylePreset === 'bottom-banner' ? y : y + bannerHeight - 2, width, 2);

      // Draw centered text
      ctx.textAlign = 'center';
      ctx.fillStyle = colors.text;
      ctx.fillText(displayText, width / 2, y + bannerHeight / 2);

    } else if (stylePreset === 'top-right-pill' || stylePreset === 'bottom-right-pill') {
      const padX = calculatedFontSize * 0.8;
      const padY = calculatedFontSize * 0.45;
      const pillWidth = textWidth + padX * 2;
      const pillHeight = textHeight + padY * 2;
      const radius = pillHeight / 2;
      const margin = Math.round(width * 0.04);

      const x = width - pillWidth - margin;
      const y = stylePreset === 'top-right-pill' ? margin : height - pillHeight - margin;

      // Draw rounded pill
      ctx.beginPath();
      ctx.roundRect(x, y, pillWidth, pillHeight, radius);
      ctx.fillStyle = colors.bg;
      ctx.fill();

      // Shadow / border
      ctx.strokeStyle = colors.border || 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = Math.max(1.5, width * 0.003);
      ctx.stroke();

      // Draw text
      ctx.textAlign = 'center';
      ctx.fillStyle = colors.text;
      ctx.fillText(displayText, x + pillWidth / 2, y + pillHeight / 2);

    } else if (stylePreset === 'center-badge') {
      const padX = calculatedFontSize * 1.2;
      const padY = calculatedFontSize * 0.6;
      const badgeWidth = textWidth + padX * 2;
      const badgeHeight = textHeight + padY * 2;
      const radius = 12;

      const x = (width - badgeWidth) / 2;
      const y = (height - badgeHeight) / 2;

      ctx.beginPath();
      ctx.roundRect(x, y, badgeWidth, badgeHeight, radius);
      ctx.fillStyle = colors.bg;
      ctx.fill();

      ctx.strokeStyle = colors.border || 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = Math.max(2, width * 0.004);
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.fillStyle = colors.text;
      ctx.fillText(displayText, width / 2, height / 2);
    }
  }, [imageLoaded, stampText, stylePreset, colorTheme, fontScale, isUppercase]);

  const handleApply = () => {
    if (!canvasRef.current) return;
    try {
      const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.92);
      onApplyImage(dataUrl);
      onClose();
    } catch (e) {
      console.error('Failed to export canvas:', e);
    }
  };

  const handleChipClick = (val: string) => {
    setStampText(val);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="sm:max-w-[48rem] 2xl:max-w-[54rem] w-[95vw] max-h-[92vh] overflow-hidden flex flex-col font-faruma apple-glass-dialog glass3d text-foreground border border-white/20 dark:border-white/10 p-0 shadow-2xl rounded-3xl"
        dir="ltr"
      >
        <DialogHeader className="text-left px-6 pt-5 pb-3 border-b border-white/15 dark:border-white/10 bg-white/20 dark:bg-white/5 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary shadow-xs">
              <Type className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-black text-foreground">
                Add Text / Flavour Label on Product Image
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Stamp a clear label (e.g. Chocolate, 500ml, Spicy) directly onto this product's photo.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          {/* Left Canvas Preview (7 cols) */}
          <div className="md:col-span-7 flex flex-col items-center justify-center space-y-3">
            <div className="w-full max-w-[360px] aspect-square rounded-2xl overflow-hidden border-2 border-border/80 bg-black/10 dark:bg-black/30 shadow-md flex items-center justify-center relative">
              <canvas
                ref={canvasRef}
                className="w-full h-full object-contain"
              />
              {!imageLoaded && (
                <div className="text-xs text-muted-foreground animate-pulse">Loading image preview...</div>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground/80 font-medium text-center">
              Live preview. Text is permanently stamped when applied.
            </p>
          </div>

          {/* Right Controls Panel (5 cols) */}
          <div className="md:col-span-5 space-y-4">
            {/* Text Input */}
            <div className="space-y-1.5">
              <Label className="text-xs font-black uppercase tracking-wider text-foreground">
                Label Text
              </Label>
              <Input
                placeholder="e.g. CHOCOLATE, 500ML"
                value={stampText}
                onChange={(e) => setStampText(e.target.value)}
                className="h-10 text-sm font-bold bg-muted/70 border-border focus:border-primary rounded-xl"
                autoFocus
              />
            </div>

            {/* Quick Chips */}
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                Quick Preset Tags
              </Label>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto custom-scrollbar p-0.5">
                {/* Product flavours if any */}
                {flavourNames.map((fName, idx) => (
                  <Badge
                    key={`flavour-${idx}`}
                    variant="outline"
                    onClick={() => handleChipClick(fName)}
                    className="cursor-pointer bg-primary/10 hover:bg-primary/25 border-primary/40 text-primary text-[10px] font-black px-2 py-0.5 rounded-lg transition-all"
                  >
                    ✨ {fName}
                  </Badge>
                ))}
                {COMMON_PRESETS.map((preset) => (
                  <Badge
                    key={preset}
                    variant="outline"
                    onClick={() => handleChipClick(preset)}
                    className="cursor-pointer bg-muted hover:bg-muted/80 border-border text-foreground text-[10px] font-bold px-2 py-0.5 rounded-lg transition-all"
                  >
                    {preset}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Position / Layout Preset */}
            <div className="space-y-1.5">
              <Label className="text-xs font-black uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <LayoutTemplate className="h-3.5 w-3.5 text-primary" />
                Position / Style
              </Label>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: 'bottom-banner', label: 'Bottom Banner' },
                  { id: 'top-banner', label: 'Top Banner' },
                  { id: 'top-right-pill', label: 'Top-Right Pill' },
                  { id: 'bottom-right-pill', label: 'Bottom-Right Pill' },
                  { id: 'center-badge', label: 'Center Badge' },
                ].map((pos) => (
                  <Button
                    key={pos.id}
                    type="button"
                    variant={stylePreset === pos.id ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setStylePreset(pos.id as StylePreset)}
                    className={`h-8 text-[11px] font-black rounded-xl transition-all ${
                      stylePreset === pos.id ? 'bg-primary text-primary-foreground shadow-xs' : 'border-border text-muted-foreground'
                    }`}
                  >
                    {pos.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Color Palette */}
            <div className="space-y-1.5">
              <Label className="text-xs font-black uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <Palette className="h-3.5 w-3.5 text-primary" />
                Color Theme
              </Label>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(COLOR_MAP) as ColorTheme[]).map((theme) => {
                  const c = COLOR_MAP[theme];
                  const isSelected = colorTheme === theme;
                  return (
                    <button
                      key={theme}
                      type="button"
                      onClick={() => setColorTheme(theme)}
                      className={`h-7 px-2.5 rounded-lg text-[10px] font-black flex items-center gap-1.5 border transition-all ${
                        isSelected ? 'ring-2 ring-primary ring-offset-1 scale-105 shadow-xs' : 'opacity-85 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: c.bg, color: c.text, borderColor: c.border || 'transparent' }}
                    >
                      {isSelected && <Check className="h-3 w-3" />}
                      {c.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Font Size Slider */}
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between items-center text-xs font-bold text-muted-foreground">
                <span>Text Size</span>
                <span>{fontScale}px</span>
              </div>
              <Slider
                value={[fontScale]}
                onValueChange={(val) => setFontScale(val[0])}
                min={16}
                max={44}
                step={2}
                className="py-1"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="px-6 py-3.5 border-t border-white/15 dark:border-white/10 bg-white/20 dark:bg-white/5 backdrop-blur-md flex justify-between items-center">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="rounded-xl text-xs font-bold text-muted-foreground"
          >
            Cancel
          </Button>

          <Button
            type="button"
            onClick={handleApply}
            disabled={!stampText.trim()}
            className="rounded-xl bg-primary hover:bg-primary/90 text-white font-black text-xs px-5 gap-1.5 shadow-md"
          >
            <Check className="h-4 w-4" />
            Apply to Image
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
