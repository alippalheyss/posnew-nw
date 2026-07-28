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
  const [lastUpdate, setLastUpdate] = useState<number>(Date.now());
  const [isIdle, setIsIdle] = useState(true);
  const [adIndex, setAdIndex] = useState(0);

  const idleTimeoutMs = (settings.general.customerDisplayIdleTimeout || 10) * 60 * 1000;

  // Filter products for ads (prefer those with images)
  const adProducts = useMemo(() => {
    const withImages = products.filter(p => p.image);
    return withImages.length > 0 ? withImages : products.slice(0, 10);
  }, [products]);

  useEffect(() => {
    // Read initial state
    const saved = localStorage.getItem('customer_display_sync');
    if (saved) {
      try {
        const { cart, timestamp } = JSON.parse(saved);
        setActiveCart(cart);
        setLastUpdate(timestamp || Date.now());
      } catch (e) {
        console.error('Error parsing customer_display_sync', e);
      }
    }

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'customer_display_sync' && e.newValue) {
        try {
          const { cart, timestamp } = JSON.parse(e.newValue);
          setActiveCart(cart);
          setLastUpdate(timestamp || Date.now());
          setIsIdle(false);
        } catch (error) {
          console.error("Error parsing cart update from localStorage", error);
        }
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
    if (isIdle && adProducts.length > 0) {
      const interval = setInterval(() => {
        setAdIndex(prev => (prev + 1) % adProducts.length);
      }, 5000); // Switch ad every 5 seconds
      return () => clearInterval(interval);
    }
  }, [isIdle, adProducts]);

  if (!settings.general.enableCustomerDisplay) {
    return (
      <div className="min-h-screen bg-[#050510] flex items-center justify-center text-white p-8">
        <h1 className="text-3xl font-black text-white/50">Customer Display is disabled</h1>
      </div>
    );
  }

  const calculateSubtotal = () => {
    if (!activeCart) return 0;
    return activeCart.items.reduce((total, item) => total + ((item.price * item.quantity) - (item.discount || 0)), 0);
  };

  const gstRate = settings.shop.taxRate || 0;
  const subtotal = calculateSubtotal();
  const gstAmount = subtotal * (gstRate / 100);
  const grandTotal = subtotal + gstAmount;

  if (isIdle || !activeCart || activeCart.items.length === 0) {
    const adProduct = adProducts[adIndex];
    return (
      <div className="min-h-screen bg-[#050510] flex flex-col items-center justify-center text-white p-8 relative overflow-hidden font-faruma" dir="rtl">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-[#050510] to-orange-500/10 opacity-50" />
        
        {settings.shop.logo && (
          <img src={settings.shop.logo} alt="Shop Logo" className="absolute top-8 right-8 max-h-24 object-contain rounded-2xl drop-shadow-2xl z-10" />
        )}

        <div className="z-10 max-w-4xl w-full text-center space-y-12 animate-in fade-in zoom-in duration-1000">
          <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-400 mb-8 tracking-tight drop-shadow-lg">
            Welcome to {settings.shop.shopName}
          </h1>
          
          {adProduct && (
            <Card className="bg-white/5 border-white/10 p-12 rounded-[3rem] backdrop-blur-xl shadow-2xl overflow-hidden relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
              <div className="flex flex-col md:flex-row items-center gap-12 relative z-10">
                <div className="w-full md:w-1/2 aspect-square relative rounded-3xl overflow-hidden bg-[#0a0a1a] flex items-center justify-center border border-white/5 shadow-inner">
                  {adProduct.image ? (
                    <img src={adProduct.image} alt={adProduct.name_en} className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-1000" />
                  ) : (
                    <ImageIcon className="h-32 w-32 text-white/10" />
                  )}
                  <div className="absolute top-4 right-4 bg-orange-500 text-white px-4 py-1 rounded-full font-black text-sm uppercase tracking-widest shadow-lg">
                    Featured
                  </div>
                </div>
                <div className="w-full md:w-1/2 text-right space-y-6">
                  <div>
                    <h2 className="text-5xl font-black text-white leading-tight mb-2">{adProduct.name_dv}</h2>
                    <h3 className="text-2xl text-white/60 font-bold">{adProduct.name_en}</h3>
                  </div>
                  <div className="pt-6 border-t border-white/10">
                    <p className="text-sm font-black text-orange-400 uppercase tracking-widest mb-1">Price</p>
                    <p className="text-6xl font-black text-primary drop-shadow-md">
                      <span className="text-3xl text-white/50">{settings.shop.currency}</span> {adProduct.price.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            </Card>
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

        <ScrollArea className="flex-1 min-h-0 -mx-4 px-4 custom-scrollbar relative z-10">
          <div className="space-y-4 pb-4">
            {activeCart.items.map((item, index) => (
              <Card key={`${item.productId}-${index}`} className="bg-[#0a0a1a] border-white/5 p-6 rounded-3xl animate-in slide-in-from-right-4 fade-in duration-300 shadow-lg group">
                <div className="flex justify-between items-center gap-6">
                  <div className="flex items-center gap-6 flex-1">
                    <div className="h-20 w-20 bg-white/5 rounded-2xl flex items-center justify-center overflow-hidden border border-white/10 flex-shrink-0">
                      {item.image ? (
                        <img src={item.image} alt={item.name_en} className="w-full h-full object-cover" />
                      ) : (
                        <Tag className="h-8 w-8 text-white/20" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-white mb-1 group-hover:text-primary transition-colors">{item.name_dv}</h3>
                      <p className="text-white/50 text-lg">{item.name_en}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-12 text-right">
                    <div>
                      <p className="text-sm font-black text-white/40 uppercase tracking-widest mb-1">Qty</p>
                      <p className="text-2xl font-bold">{item.quantity}</p>
                    </div>
                    <div>
                      <p className="text-sm font-black text-white/40 uppercase tracking-widest mb-1">Price</p>
                      <p className="text-2xl font-bold">{item.price.toFixed(2)}</p>
                    </div>
                    <div className="w-32">
                      <p className="text-sm font-black text-white/40 uppercase tracking-widest mb-1">Total</p>
                      <p className="text-3xl font-black text-primary">
                        {((item.price * item.quantity) - (item.discount || 0)).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </ScrollArea>
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
