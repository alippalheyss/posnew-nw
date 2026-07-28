import React, { useEffect, useState, useMemo } from 'react';
import { useAppContext, Cart } from '@/context/AppContext';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ShoppingCart, Tag, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function CustomerDisplay() {
  const { settings, products } = useAppContext();
  const { t } = useTranslation();
  const [activeCart, setActiveCart] = useState<Cart | null>(null);
  const [cartTotals, setCartTotals] = useState<any>(null);
  const [lastUpdate, setLastUpdate] = useState<number>(Date.now());
  const [isIdle, setIsIdle] = useState(true);
  const [adIndex, setAdIndex] = useState(0);
  const [isPosActive, setIsPosActive] = useState(() => localStorage.getItem('pos_active') === 'true');

  const idleTimeoutMs = (settings.general.customerDisplayIdleTimeout || 10) * 60 * 1000;

  // Combine custom offers and regular products for the ad playlist
  const combinedAds = useMemo(() => {
    const customOffers = settings.general.customerDisplayOffers || [];
    
    // Get products with images, fallback to top 10 products if none have images
    let adProductsList = products.filter(p => p.image);
    if (adProductsList.length === 0) {
      adProductsList = products.slice(0, 10);
    } else {
      adProductsList = adProductsList.slice(0, 10);
    }
    
    const productAds = adProductsList.map(p => ({
      isProduct: true as const,
      image: p.image,
      title: p.name_dv,
      subtitle: p.name_en,
      price: p.price
    }));

    let playlist: any[] = [];
    
    if (customOffers.length > 0) {
      if (productAds.length > 0) {
        // Interleave custom offers with product ads so offers show up very frequently (50% of the time)
        let offerIdx = 0;
        for (let i = 0; i < productAds.length; i++) {
          playlist.push(customOffers[offerIdx % customOffers.length]);
          playlist.push(productAds[i]);
          offerIdx++;
        }
      } else {
        playlist = [...customOffers];
      }
    } else {
      playlist = [...productAds];
    }
    
    return playlist.length > 0 ? playlist : null;
  }, [settings.general.customerDisplayOffers, products]);

  useEffect(() => {
    // Read initial state
    const saved = localStorage.getItem('customer_display_sync');
    if (saved) {
      try {
        const { cart, timestamp, totals } = JSON.parse(saved);
        setActiveCart(cart);
        if (totals) setCartTotals(totals);
        setLastUpdate(timestamp || Date.now());
      } catch (e) {
        console.error('Error parsing customer_display_sync', e);
      }
    }

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'customer_display_sync' && e.newValue) {
        try {
          const { cart, timestamp, totals } = JSON.parse(e.newValue);
          setActiveCart(cart);
          if (totals) setCartTotals(totals);
          setLastUpdate(timestamp || Date.now());
          setIsIdle(false);
        } catch (error) {
          console.error("Error parsing cart update from localStorage", error);
        }
      } else if (e.key === 'pos_active') {
        setIsPosActive(e.newValue === 'true');
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (Date.now() - lastUpdate > idleTimeoutMs || (activeCart && activeCart.items.length === 0 && Date.now() - lastUpdate > 30000)) {
        setIsIdle(true);
      } else {
        setIsIdle(false);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [lastUpdate, idleTimeoutMs, activeCart]);

  useEffect(() => {
    if (isIdle && combinedAds) {
      const interval = setInterval(() => {
        setAdIndex(prev => (prev + 1) % combinedAds.length);
      }, 5000); // Switch ad every 5 seconds
      return () => clearInterval(interval);
    }
  }, [isIdle, combinedAds]);

  if (!settings.general.enableCustomerDisplay) {
    return (
      <div className="min-h-screen bg-[#050510] flex items-center justify-center text-white p-8">
        <h1 className="text-3xl font-black text-white/50">Customer Display is disabled</h1>
      </div>
    );
  }

  const subtotal = cartTotals?.subtotal || 0;
  const gstAmount = cartTotals?.gstAmount || 0;
  const grandTotal = cartTotals?.grandTotal || 0;
  const gstRate = settings.shop.taxRate || 0;

  if (!isPosActive || isIdle || !activeCart || activeCart.items.length === 0) {
    const currentAd = combinedAds ? combinedAds[adIndex] : null;
    return (
      <div className="min-h-screen bg-[#050510] flex flex-col items-center justify-center text-white p-8 relative overflow-hidden font-faruma" dir="rtl">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-[#050510] to-orange-500/10 opacity-50" />
        
        {settings.shop.logo && (
          <img src={settings.shop.logo} alt="Shop Logo" className="absolute top-8 right-8 max-h-24 object-contain rounded-2xl drop-shadow-2xl z-10" />
        )}

        <div className="z-10 max-w-5xl w-full text-center space-y-12 animate-in fade-in zoom-in duration-1000">
          <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-400 mb-8 tracking-tight drop-shadow-lg">
            Welcome to {settings.shop.shopName}
          </h1>
          
          {currentAd && (
            <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
              {('isProduct' in currentAd) ? (
                // Product Ad
                <Card className="bg-white/5 border-white/10 p-12 rounded-[3rem] backdrop-blur-xl shadow-2xl overflow-hidden relative group">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                  <div className="flex flex-col md:flex-row items-center gap-12 relative z-10">
                    <div className="w-full md:w-1/2 aspect-square relative rounded-3xl overflow-hidden bg-[#0a0a1a] flex items-center justify-center border border-white/5 shadow-inner">
                      {currentAd.image ? (
                        <img src={currentAd.image} alt={currentAd.subtitle} className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-1000" />
                      ) : (
                        <ImageIcon className="h-32 w-32 text-white/10" />
                      )}
                      <div className="absolute top-4 right-4 bg-orange-500 text-white px-4 py-1 rounded-full font-black text-sm uppercase tracking-widest shadow-lg">
                        Featured Product
                      </div>
                    </div>
                    <div className="w-full md:w-1/2 text-right space-y-6">
                      <div>
                        <h2 className="text-5xl font-black text-white leading-tight mb-2">{currentAd.title}</h2>
                        <h3 className="text-2xl text-white/60 font-bold">{currentAd.subtitle}</h3>
                      </div>
                      <div className="pt-6 border-t border-white/10">
                        <p className="text-sm font-black text-orange-400 uppercase tracking-widest mb-1">Price</p>
                        <p className="text-6xl font-black text-primary drop-shadow-md">
                          <span className="text-3xl text-white/50">{settings.shop.currency}</span> {currentAd.price?.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                </Card>
              ) : currentAd.type === 'image' ? (
                // Custom Image Offer
                <div className="rounded-[3rem] overflow-hidden shadow-2xl border border-white/10 relative">
                   <img src={currentAd.image} className="w-full max-h-[60vh] object-contain bg-black/50" alt="Special Offer" />
                </div>
              ) : (
                // Custom Text Offer
                <Card className="bg-gradient-to-br from-primary/20 via-[#0a0a1a] to-orange-500/20 border-white/10 p-16 rounded-[3rem] backdrop-blur-xl shadow-2xl">
                   <div className="space-y-8 flex flex-col items-center justify-center text-center">
                      <h2 className="text-6xl font-black text-white leading-tight drop-shadow-lg">{currentAd.title}</h2>
                      {currentAd.subtitle && (
                        <h3 className="text-3xl text-white/80 font-bold">{currentAd.subtitle}</h3>
                      )}
                      {currentAd.priceText && (
                        <div className="mt-8 inline-block bg-orange-500 text-white text-4xl font-black px-12 py-4 rounded-full shadow-[0_0_40px_rgba(249,115,22,0.4)] transform hover:scale-105 transition-transform">
                          {currentAd.priceText}
                        </div>
                      )}
                   </div>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-[#050510] flex text-white font-faruma overflow-hidden" dir="rtl">
      {/* Items List */}
      <div className="flex-1 flex flex-col p-8 border-l border-white/10 relative min-h-0">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
        
        <div className="flex items-center justify-between mb-8 relative z-10">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 bg-primary/20 rounded-2xl flex items-center justify-center">
              <ShoppingCart className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-4xl font-black">Your Cart</h1>
              <p className="text-white/50 text-lg">Current items in order</p>
            </div>
          </div>
          {settings.shop.logo && (
            <img src={settings.shop.logo} alt="Shop Logo" className="max-h-16 object-contain rounded-xl" />
          )}
        </div>

        <div className="flex-1 min-h-0 relative z-10 w-full overflow-hidden flex flex-col justify-center">
          <div className={cn(
            "grid gap-4 w-full max-h-full",
            activeCart.items.length > 12 ? "grid-cols-3" : activeCart.items.length > 6 ? "grid-cols-2" : "grid-cols-1"
          )}>
            {activeCart.items.map((item: any, index) => {
              const isDense = activeCart.items.length > 6;
              const isVeryDense = activeCart.items.length > 12;
              
              return (
                <Card key={`${item.productId || item.id}-${index}`} className={cn(
                  "bg-[#0a0a1a] border-white/5 shadow-lg group overflow-hidden",
                  isVeryDense ? "p-3 rounded-xl" : isDense ? "p-4 rounded-2xl" : "p-6 rounded-3xl"
                )}>
                  <div className="flex justify-between items-center gap-4">
                    <div className="flex items-center gap-4 flex-1 overflow-hidden">
                      {!isVeryDense && (
                        <div className={cn(
                          "bg-white/5 flex items-center justify-center overflow-hidden border border-white/10 flex-shrink-0",
                          isDense ? "h-12 w-12 rounded-xl" : "h-20 w-20 rounded-2xl"
                        )}>
                          {item.image ? (
                            <img src={item.image} alt={item.name_en} className="w-full h-full object-cover" />
                          ) : (
                            <Tag className={isDense ? "h-5 w-5 text-white/20" : "h-8 w-8 text-white/20"} />
                          )}
                        </div>
                      )}
                      <div className="min-w-0">
                        <h3 className={cn("font-bold text-white group-hover:text-primary transition-colors truncate", isVeryDense ? "text-lg" : isDense ? "text-xl" : "text-2xl mb-1")}>{item.name_dv}</h3>
                        {!isVeryDense && <p className={cn("text-white/50 truncate", isDense ? "text-sm" : "text-lg")}>{item.name_en}</p>}
                      </div>
                    </div>
                    
                    <div className={cn("flex items-center text-right shrink-0", isVeryDense ? "gap-4" : isDense ? "gap-6" : "gap-12")}>
                      <div>
                        <p className={cn("font-black text-white/40 uppercase tracking-widest", isVeryDense ? "hidden" : "text-[10px] mb-1")}>Qty</p>
                        <p className={cn("font-bold", isVeryDense ? "text-lg" : isDense ? "text-xl" : "text-2xl")}>{item.qty}x</p>
                      </div>
                      {!isVeryDense && (
                        <div>
                          <p className={cn("font-black text-white/40 uppercase tracking-widest text-[10px] mb-1")}>Price</p>
                          <p className={cn("font-bold", isDense ? "text-xl" : "text-2xl")}>{Number(item.price).toFixed(2)}</p>
                        </div>
                      )}
                      <div className={isDense ? "w-24" : "w-32"}>
                        <p className={cn("font-black text-white/40 uppercase tracking-widest", isVeryDense ? "hidden" : "text-[10px] mb-1")}>Total</p>
                        <p className={cn("font-black text-primary", isVeryDense ? "text-xl" : isDense ? "text-2xl" : "text-3xl")}>
                          {((Number(item.price) * Number(item.qty)) - (Number(item.discount) || 0)).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </div>

      {/* Totals Sidebar */}
      <div className="w-[450px] bg-[#0a0a1a] p-8 flex flex-col justify-end shadow-[-20px_0_40px_rgba(0,0,0,0.5)] z-20">
        <div className="space-y-6">
          <div className="bg-white/5 rounded-[2rem] p-8 border border-white/10 space-y-6">
            <div className="flex justify-between items-center">
              <span className="text-xl text-white/60 font-bold uppercase tracking-wider">Subtotal</span>
              <span className="text-2xl font-bold">{settings.shop.currency} {subtotal.toFixed(2)}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-xl text-white/60 font-bold uppercase tracking-wider">GST ({gstRate}%)</span>
              <span className="text-2xl font-bold text-orange-400">{settings.shop.currency} {gstAmount.toFixed(2)}</span>
            </div>

            <div className="pt-6 border-t border-white/10">
              <div className="flex justify-between items-end">
                <span className="text-2xl text-white/60 font-black uppercase tracking-widest">Total to Pay</span>
                <div className="text-right">
                  <span className="text-3xl text-primary font-black mr-2">{settings.shop.currency}</span>
                  <span className="text-6xl font-black text-white">{grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-primary/10 border border-primary/20 rounded-[2rem] p-6 text-center">
            <p className="text-primary font-black text-xl mb-1">Thank you for shopping!</p>
            <p className="text-primary/60">Please proceed to checkout</p>
          </div>
        </div>
      </div>
    </div>
  );
}
