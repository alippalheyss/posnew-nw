import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CustomerDisplayOffer } from '@/context/AppContext';
import { Upload, Image as ImageIcon, Type } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (offer: CustomerDisplayOffer) => void;
}

export default function CustomerDisplayOfferDialog({ open, onOpenChange, onSave }: Props) {
  const { t } = useTranslation();
  const [type, setType] = useState<'image' | 'text'>('image');
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [priceText, setPriceText] = useState('');
  const [image, setImage] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const max_size = 800; // slightly larger for display ads

          if (width > height) {
            if (width > max_size) {
              height *= max_size / width;
              width = max_size;
            }
          } else {
            if (height > max_size) {
              width *= max_size / height;
              height = max_size;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);
          setImage(compressedBase64);
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    if (type === 'image' && !image) {
      showError('Please upload an image for the offer');
      return;
    }
    if (type === 'text' && !title) {
      showError('Please enter a title for the offer');
      return;
    }

    const newOffer: CustomerDisplayOffer = {
      id: crypto.randomUUID(),
      type,
      image: type === 'image' ? image : undefined,
      title: type === 'text' ? title : undefined,
      subtitle: type === 'text' ? subtitle : undefined,
      priceText: type === 'text' ? priceText : undefined,
    };

    onSave(newOffer);
    
    // Reset form
    setType('image');
    setTitle('');
    setSubtitle('');
    setPriceText('');
    setImage('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] font-faruma glass-dark text-white border-white/10" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-right text-2xl font-black">Add Custom Offer</DialogTitle>
          <DialogDescription className="text-right text-white/50">Create a promotional offer for the customer display.</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4 text-right">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-white/40 tracking-widest">Offer Type</Label>
            <Select value={type} onValueChange={(v: 'image' | 'text') => setType(v)}>
              <SelectTrigger className="bg-white/5 border-white/10 h-12 rounded-xl text-right font-bold" dir="rtl">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent className="bg-[#0a0a1a] border-white/10 text-white" dir="rtl">
                <SelectItem value="image" className="text-right"><span className="flex items-center justify-end gap-2"><ImageIcon className="h-4 w-4"/> Image Graphic</span></SelectItem>
                <SelectItem value="text" className="text-right"><span className="flex items-center justify-end gap-2"><Type className="h-4 w-4"/> Custom Text</span></SelectItem>
              </SelectContent>
            </Select>
          </div>

          {type === 'image' ? (
            <div className="space-y-4">
              <Label className="text-[10px] font-black uppercase text-white/40 tracking-widest block text-right">Upload Graphic</Label>
              <div 
                className="border-2 border-dashed border-white/10 rounded-2xl p-8 flex flex-col items-center justify-center gap-4 cursor-pointer hover:bg-white/5 hover:border-primary/50 transition-all text-center"
                onClick={() => fileInputRef.current?.click()}
              >
                {image ? (
                  <img src={image} alt="Preview" className="max-h-40 rounded-xl shadow-lg object-contain" />
                ) : (
                  <>
                    <Upload className="h-10 w-10 text-white/20" />
                    <div>
                      <p className="font-bold text-white/80">Click to upload graphic</p>
                      <p className="text-xs text-white/40 mt-1">PNG, JPG up to 5MB</p>
                    </div>
                  </>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-white/40 tracking-widest block text-right">Headline Title</Label>
                <Input 
                  value={title} 
                  onChange={e => setTitle(e.target.value)} 
                  placeholder="e.g. Weekend Special!"
                  className="bg-white/5 border-white/10 h-12 rounded-xl text-right font-bold"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-white/40 tracking-widest block text-right">Subtitle (Optional)</Label>
                <Input 
                  value={subtitle} 
                  onChange={e => setSubtitle(e.target.value)} 
                  placeholder="e.g. 50% off all soft drinks"
                  className="bg-white/5 border-white/10 h-12 rounded-xl text-right font-bold"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-white/40 tracking-widest block text-right">Price Tag / Badge Text (Optional)</Label>
                <Input 
                  value={priceText} 
                  onChange={e => setPriceText(e.target.value)} 
                  placeholder="e.g. Only $5.00!"
                  className="bg-white/5 border-white/10 h-12 rounded-xl text-right font-bold"
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 border-t border-white/10 pt-4">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl">Cancel</Button>
          <Button onClick={handleSave} className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold">
            Add Offer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
