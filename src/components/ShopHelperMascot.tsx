import React, { useState } from 'react';
import { X, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ShopHelperMascotProps {
  isLoggedIn: boolean;
  onSelectEssentials?: () => void;
  onOpenCart?: () => void;
}

const TIPS_LOGGED_IN = [
  { text: 'Need Onion, Rice, Oil or Milk? Tap for Daily Essentials!', actionLabel: 'Open Essentials', actionType: 'ESSENTIALS' as const },
  { text: 'Delivery from MVR 100 • Store Pickup has NO minimum!', actionLabel: 'View Cart', actionType: 'CART' as const },
  { text: 'Pay with Credit or upload your Bank Transfer Slip!', actionLabel: 'Browse Essentials', actionType: 'ESSENTIALS' as const },
];

const TIPS_GUEST = [
  { text: 'Hi! Sign in with your Customer Code & Mobile Number to shop!', actionLabel: null, actionType: null },
  { text: 'New customer? Tap Register and our store will approve you fast!', actionLabel: null, actionType: null },
  { text: 'Fresh groceries, snacks & Maldivian daily essentials ready!', actionLabel: null, actionType: null },
];

export const ShopHelperMascot: React.FC<ShopHelperMascotProps> = ({
  isLoggedIn,
  onSelectEssentials,
  onOpenCart,
}) => {
  const [isDismissed, setIsDismissed] = useState(false);
  const [isReacting, setIsReacting] = useState(false);
  const [showBubble, setShowBubble] = useState(true);
  const [tipIndex, setTipIndex] = useState(0);

  if (isDismissed) return null;

  const tips = isLoggedIn ? TIPS_LOGGED_IN : TIPS_GUEST;
  const activeTip = tips[tipIndex % tips.length];

  const handleMascotClick = () => {
    setIsReacting(true);
    setShowBubble(true);
    setTipIndex((prev) => (prev + 1) % tips.length);
    setTimeout(() => setIsReacting(false), 650);
  };

  const handleQuickAction = () => {
    if (activeTip.actionType === 'ESSENTIALS' && onSelectEssentials) {
      onSelectEssentials();
    } else if (activeTip.actionType === 'CART' && onOpenCart) {
      onOpenCart();
    }
  };

  return (
    <div className="fixed bottom-4 right-3 sm:right-5 z-40 flex flex-col items-end gap-2 pointer-events-none select-none">
      {/* Interactive Speech Bubble */}
      {showBubble && (
        <div className="pointer-events-auto max-w-[230px] bg-card border border-primary/35 shadow-lg rounded-2xl rounded-br-sm p-3 text-left relative animate-in fade-in slide-in-from-bottom-2 duration-200">
          <button
            type="button"
            onClick={() => setShowBubble(false)}
            aria-label="Hide tip"
            className="absolute top-1.5 right-1.5 text-muted-foreground hover:text-foreground p-0.5 rounded"
          >
            <X className="h-3 w-3" />
          </button>
          <p className="text-[11px] font-bold text-foreground pr-4 leading-snug">
            {activeTip.text}
          </p>
          {activeTip.actionLabel && (
            <button
              type="button"
              onClick={handleQuickAction}
              className="mt-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary text-primary-foreground text-[10px] font-black hover:bg-primary/90 transition-colors"
            >
              <Sparkles className="h-3 w-3" />
              <span>{activeTip.actionLabel}</span>
            </button>
          )}
        </div>
      )}

      {/* Custom Waving SVG Mascot Button */}
      <div className="relative pointer-events-auto group">
        <button
          type="button"
          onClick={() => setIsDismissed(true)}
          aria-label="Close shop helper"
          className="absolute -top-1 -left-1 z-10 h-5 w-5 rounded-full bg-card border border-border text-muted-foreground hover:text-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-xs"
        >
          <X className="h-3 w-3" />
        </button>

        {/* Sparkle burst on click */}
        {isReacting && (
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 pointer-events-none flex gap-2">
            <span className="shop-sparkle-pop text-amber-400 text-sm font-black">✦</span>
            <span className="shop-sparkle-pop text-emerald-400 text-xs font-black">★</span>
            <span className="shop-sparkle-pop text-primary text-sm font-black">✦</span>
          </div>
        )}

        <button
          type="button"
          onClick={handleMascotClick}
          aria-label="B BACK Shop Assistant — tap for tips"
          className={cn(
            'relative h-16 w-16 sm:h-[72px] sm:w-[72px] rounded-full bg-card/95 border-2 border-primary/40 shadow-lg flex items-center justify-center transition-transform cursor-pointer hover:scale-105 active:scale-95',
            isReacting ? 'shop-mascot-jump' : 'shop-mascot-peek'
          )}
        >
          <svg
            viewBox="0 0 80 80"
            className="w-14 h-14 overflow-visible"
            aria-hidden="true"
          >
            {/* Bag Handle */}
            <path
              d="M28 24 C28 13, 52 13, 52 24"
              fill="none"
              stroke="#0ea5e9"
              strokeWidth="4"
              strokeLinecap="round"
            />
            {/* Waving Left Arm */}
            <g className="shop-mascot-wave" style={{ transformOrigin: '20px 44px' }}>
              <path
                d="M20 44 C11 39, 7 29, 10 23"
                fill="none"
                stroke="#10b981"
                strokeWidth="5"
                strokeLinecap="round"
              />
              <circle cx="10" cy="22" r="4" fill="#fbbf24" />
            </g>
            {/* Right Arm */}
            <path
              d="M60 44 C67 47, 70 53, 66 57"
              fill="none"
              stroke="#10b981"
              strokeWidth="5"
              strokeLinecap="round"
            />
            {/* Shopping Bag Body */}
            <rect
              x="20"
              y="24"
              width="40"
              height="42"
              rx="10"
              fill="#0f766e"
              stroke="#2dd4bf"
              strokeWidth="2.5"
            />
            {/* Top Rim */}
            <rect x="20" y="24" width="40" height="9" rx="4.5" fill="#14b8a6" />
            {/* Blinking Eyes */}
            <g className="shop-mascot-blink" style={{ transformOrigin: '40px 42px' }}>
              <circle cx="33" cy="42" r="3.2" fill="#ffffff" />
              <circle cx="47" cy="42" r="3.2" fill="#ffffff" />
              <circle cx="33.8" cy="42" r="1.5" fill="#0f172a" />
              <circle cx="47.8" cy="42" r="1.5" fill="#0f172a" />
            </g>
            {/* Happy Smile */}
            <path
              d={isReacting ? 'M33 49 Q40 57 47 49' : 'M34 50 Q40 55 46 50'}
              fill="none"
              stroke="#fbbf24"
              strokeWidth="2.6"
              strokeLinecap="round"
            />
            {/* Cute B Badge */}
            <text
              x="40"
              y="62"
              textAnchor="middle"
              fontSize="7"
              fontWeight="900"
              fill="#99f6e4"
              fontFamily="sans-serif"
            >
              B BACK
            </text>
          </svg>
        </button>
      </div>
    </div>
  );
};
