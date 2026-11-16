import React, { useEffect, useMemo, useState } from 'react';
import {
  ShoppingBag,
  ShoppingCart,
  Search,
  LogOut,
  Plus,
  Minus,
  Trash2,
  Truck,
  Store,
  CreditCard,
  Banknote,
  Upload,
  CheckCircle2,
  Clock,
  Package,
  AlertCircle,
  Copy,
  Check,
  RotateCcw,
  UserPlus,
  LogIn,
  RefreshCw,
  FileImage,
  X,
  Lock,
  ExternalLink,
  Send,
  LayoutGrid,
  List,
  MapPin,
  Sparkles,
  Phone,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { Customer, Product, ShopSettings } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import { showError, showSuccess } from '@/utils/toast';
import { getAdaptedImageUrl, generatePlaceholderImage } from '@/utils/imageUtils';
import { ShopHelperMascot } from '@/components/ShopHelperMascot';
import {
  generateTelegramConnectLink,
  checkAndLinkCustomerLive,
} from '@/services/telegramService';
import {
  DAY_ORDER,
  DEFAULT_WEEKLY_OPENING_HOURS,
  MIN_DELIVERY_AMOUNT,
  OnlineOrder,
  OnlineOrderItem,
  checkRegistrationStatus,
  completeShopPasswordSetup,
  fetchCustomerOrders,
  fetchPublicShopData,
  formatTime12h,
  isMaldivesDailyEssential,
  isOnlineShopCurrentlyOpen,
  loginShopCustomerWithPassword,
  placeOnlineOrder,
  refreshShopCustomer,
  requestTelegramPasswordReset,
  submitCustomerRegistration,
  uploadOrderSlip,
  verifyAndResetTelegramPassword,
  verifyShopCustomerCredentials,
} from '@/services/onlineShopService';

interface CartEntry {
  product: Product;
  quantity: number;
}

const SESSION_STORAGE_KEY = 'bback_shop_customer_session_v1';
const SHOP_STORE_BG_URL =
  'https://lh3.googleusercontent.com/gps-cs-s/ANWiy9T_skQvKv3lrCq1mRsdnU1o3aKCe1qi8YOGMR32FDo5hkobeq52OkKCv9m4gRvWPAUiHisRlw1wyiWzkgdNiOdDXAW-4TV7zS7urNx1oMzMOsrZ_wepFFE1-omhVxlZKTo4mNPa=w293-h209-n-k-no';

const STATUS_BADGE_MAP: Record<string, { label: string; className: string }> = {
  NEW: { label: 'Order Placed', className: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30' },
  ACCEPTED: { label: 'Accepted', className: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30' },
  PREPARING: { label: 'Preparing', className: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30' },
  READY: { label: 'Ready', className: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' },
  COMPLETED: { label: 'Completed', className: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' },
  CANCELLED: { label: 'Cancelled', className: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30' },
};

const Shop: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [shopSettings, setShopSettings] = useState<Partial<ShopSettings>>({
    currency: 'MVR',
    shopName: 'B BACK',
    onlineShopEnabled: true,
  });
  const [botToken, setBotToken] = useState<string | undefined>(undefined);

  // Customer session
  const [customer, setCustomer] = useState<Customer | null>(() => {
    try {
      const saved = localStorage.getItem(SESSION_STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Auth / Register state
  const [authTab, setAuthTab] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [loginCode, setLoginCode] = useState('');
  const [loginPhone, setLoginPhone] = useState('');
  const [loginStep, setLoginStep] = useState<'CREDENTIALS' | 'SET_PASSWORD' | 'ENTER_PASSWORD' | 'RESET_PASSWORD'>('CREDENTIALS');
  const [pendingLoginCustomer, setPendingLoginCustomer] = useState<Customer | null>(null);
  const [loginPassword, setLoginPassword] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [isSendingResetOtp, setIsSendingResetOtp] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [regNameEn, setRegNameEn] = useState('');
  const [regNameDv, setRegNameDv] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regAddress, setRegAddress] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [isSubmittingReg, setIsSubmittingReg] = useState(false);
  const [regSubmittedMsg, setRegSubmittedMsg] = useState('');

  const [statusCheckPhone, setStatusCheckPhone] = useState('');
  const [statusCheckResult, setStatusCheckResult] = useState<string | null>(null);

  // Catalog state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [priceSort, setPriceSort] = useState<'DEFAULT' | 'LOW_TO_HIGH' | 'HIGH_TO_LOW'>('DEFAULT');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [viewMode, setViewMode] = useState<'GRID' | 'LIST'>('GRID');
  const [cart, setCart] = useState<Record<string, CartEntry>>({});

  // Checkout state
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [fulfillmentType, setFulfillmentType] = useState<'DELIVERY' | 'PICKUP'>('DELIVERY');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'CREDIT' | 'CASH_TRANSFER'>('CASH_TRANSFER');
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [slipPreviewUrl, setSlipPreviewUrl] = useState<string>('');
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [copiedAccount, setCopiedAccount] = useState(false);

  // Orders history state
  const [isOrdersOpen, setIsOrdersOpen] = useState(false);
  const [orders, setOrders] = useState<OnlineOrder[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [timeTick, setTimeTick] = useState(0);
  const [botUsername, setBotUsername] = useState<string | undefined>(undefined);
  const [isTelegramConnectOpen, setIsTelegramConnectOpen] = useState(false);
  const [isCheckingTelegram, setIsCheckingTelegram] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setTimeTick((t) => t + 1), 30000);
    return () => clearInterval(timer);
  }, []);

  const currency = shopSettings.currency || 'MVR';
  const storeOpenStatus = useMemo(
    () => isOnlineShopCurrentlyOpen(shopSettings),
    [shopSettings, timeTick]
  );
  const isStoreOpen = storeOpenStatus.isOpen;

  const loadShop = async () => {
    setIsLoading(true);
    try {
      const data = await fetchPublicShopData();
      setProducts(data.products);
      setShopSettings(data.shopSettings);
      setBotToken(data.telegramBotToken);
      setBotUsername(data.telegramBotUsername);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadShop();

    if (!supabase) return;
    const settingsChannel = supabase
      .channel('shop_public_settings_sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'settings' },
        () => {
          fetchPublicShopData().then((data) => {
            setShopSettings(data.shopSettings);
            setBotToken(data.telegramBotToken);
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(settingsChannel);
    };
  }, []);

  // Refresh customer balance/limit & orders when logged in
  useEffect(() => {
    if (!customer?.id) return;
    let active = true;

    const syncCustomerAndOrders = async () => {
      const fresh = await refreshShopCustomer(customer.id);
      if (fresh && active) {
        setCustomer(fresh);
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(fresh));
      }
      setIsLoadingOrders(true);
      const list = await fetchCustomerOrders(customer.id);
      if (active) {
        setOrders(list);
        setIsLoadingOrders(false);
      }
    };

    syncCustomerAndOrders();

    // Realtime order status updates for the logged-in customer
    if (!supabase) return;
    const channel = supabase
      .channel(`shop_customer_orders_${customer.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'online_orders',
          filter: `customer_id=eq.${customer.id}`,
        },
        async () => {
          const list = await fetchCustomerOrders(customer.id);
          if (active) setOrders(list);
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [customer?.id]);

  const categories = useMemo(() => {
    const cats = new Set<string>();
    products.forEach((p) => {
      if (p.category) cats.add(p.category);
    });
    return ['ALL', 'ESSENTIALS', ...Array.from(cats).sort()];
  }, [products]);

  const filteredProducts = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const tokens = q ? q.split(/\s+/).filter(Boolean) : [];
    const minP = minPrice !== '' ? Number(minPrice) : null;
    const maxP = maxPrice !== '' ? Number(maxPrice) : null;

    const list = products.filter((p) => {
      if (selectedCategory === 'ESSENTIALS') {
        if (!isMaldivesDailyEssential(p)) return false;
      } else if (selectedCategory !== 'ALL' && p.category !== selectedCategory) {
        return false;
      }
      const stock = Number(p.stock_shop || 0);
      if (inStockOnly && stock <= 0) return false;
      const price = Number(p.price || 0);
      if (minP !== null && !Number.isNaN(minP) && price < minP) return false;
      if (maxP !== null && !Number.isNaN(maxP) && price > maxP) return false;
      if (tokens.length === 0) return true;
      const searchable = `${p.name_en || ''} ${p.name_dv || ''} ${p.category || ''} ${p.item_code || ''} ${p.barcode || ''}`.toLowerCase();
      return tokens.every((tok) => searchable.includes(tok));
    });

    return [...list].sort((a, b) => {
      const aAvail = Number(a.stock_shop || 0) > 0 ? 1 : 0;
      const bAvail = Number(b.stock_shop || 0) > 0 ? 1 : 0;
      if (aAvail !== bAvail) return bAvail - aAvail;

      if (priceSort === 'LOW_TO_HIGH') {
        return Number(a.price || 0) - Number(b.price || 0);
      }
      if (priceSort === 'HIGH_TO_LOW') {
        return Number(b.price || 0) - Number(a.price || 0);
      }
      return 0;
    });
  }, [products, searchTerm, selectedCategory, inStockOnly, priceSort, minPrice, maxPrice]);

  const cartItems = useMemo(() => Object.values(cart), [cart]);
  const cartCount = useMemo(
    () => cartItems.reduce((sum, entry) => sum + entry.quantity, 0),
    [cartItems]
  );
  const cartSubtotal = useMemo(
    () => cartItems.reduce((sum, entry) => sum + Number(entry.product.price || 0) * entry.quantity, 0),
    [cartItems]
  );

  const creditLimit = Number(customer?.credit_limit || 0);
  const outstandingBalance = Number(customer?.outstanding_balance || 0);
  const availableCredit = Math.max(0, creditLimit - outstandingBalance);
  const canUseCredit = creditLimit > 0 && cartSubtotal <= availableCredit;
  const deliveryShortfall = Math.max(0, MIN_DELIVERY_AMOUNT - cartSubtotal);
  const deliveryMinimumMet = fulfillmentType === 'PICKUP' || cartSubtotal >= MIN_DELIVERY_AMOUNT;

  const activeOrdersCount = useMemo(
    () => orders.filter((o) => !['COMPLETED', 'CANCELLED'].includes(o.status)).length,
    [orders]
  );

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    try {
      if (loginStep === 'CREDENTIALS') {
        const res = await verifyShopCustomerCredentials(loginCode, loginPhone);
        if (!res.ok || !res.customer) {
          showError(res.error || 'Login failed');
          return;
        }
        setPendingLoginCustomer(res.customer);
        if (res.needsPasswordSetup) {
          setLoginStep('SET_PASSWORD');
          setNewPassword('');
          setConfirmPassword('');
          showSuccess('Account verified! Please set a password to protect your account.');
        } else {
          setLoginStep('ENTER_PASSWORD');
          setLoginPassword('');
        }
        return;
      }

      if (loginStep === 'SET_PASSWORD' && pendingLoginCustomer) {
        if (newPassword.length < 4) {
          showError('Password must be at least 4 characters.');
          return;
        }
        if (newPassword !== confirmPassword) {
          showError('Passwords do not match.');
          return;
        }
        const res = await completeShopPasswordSetup(pendingLoginCustomer.id, newPassword);
        if (res.ok && res.customer) {
          setCustomer(res.customer);
          localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(res.customer));
          setLoginStep('CREDENTIALS');
          setPendingLoginCustomer(null);
          showSuccess(`Password saved! Welcome, ${res.customer.name_en || res.customer.name_dv}!`);
        } else {
          showError(res.error || 'Could not save password.');
        }
        return;
      }

      if (loginStep === 'ENTER_PASSWORD') {
        const res = await loginShopCustomerWithPassword(loginCode, loginPhone, loginPassword);
        if (res.ok && res.customer) {
          setCustomer(res.customer);
          localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(res.customer));
          setLoginStep('CREDENTIALS');
          setPendingLoginCustomer(null);
          showSuccess(`Welcome back, ${res.customer.name_en || res.customer.name_dv}!`);
        } else {
          showError(res.error || 'Incorrect password.');
        }
        return;
      }

      if (loginStep === 'RESET_PASSWORD') {
        if (newPassword.length < 4) {
          showError('New password must be at least 4 characters.');
          return;
        }
        if (newPassword !== confirmPassword) {
          showError('Passwords do not match.');
          return;
        }
        const res = await verifyAndResetTelegramPassword(loginCode, loginPhone, resetOtp, newPassword);
        if (res.ok && res.customer) {
          setCustomer(res.customer);
          localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(res.customer));
          setLoginStep('CREDENTIALS');
          setPendingLoginCustomer(null);
          setResetOtp('');
          setNewPassword('');
          setConfirmPassword('');
          showSuccess('Password reset successfully!');
        } else {
          showError(res.error || 'Could not reset password.');
        }
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSendTelegramResetOtp = async () => {
    setIsSendingResetOtp(true);
    try {
      const res = await requestTelegramPasswordReset(loginCode, loginPhone, botToken);
      if (res.ok) {
        setResetOtp('');
        setNewPassword('');
        setConfirmPassword('');
        setLoginStep('RESET_PASSWORD');
        showSuccess('6-digit reset code sent to your Telegram!');
      } else {
        showError(res.error || 'Could not send reset code.');
      }
    } finally {
      setIsSendingResetOtp(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingReg(true);
    setRegSubmittedMsg('');
    try {
      const res = await submitCustomerRegistration(
        {
          name_en: regNameEn,
          name_dv: regNameDv,
          phone: regPhone,
          address: regAddress,
          email: regEmail,
        },
        shopSettings,
        botToken
      );

      if (res.ok) {
        setRegSubmittedMsg(
          'Registration submitted! Our POS Admin will review and approve your account shortly. Once approved, you can log in with your Customer Code and Mobile Number.'
        );
        setRegNameEn('');
        setRegNameDv('');
        setRegPhone('');
        setRegAddress('');
        setRegEmail('');
        showSuccess('Registration sent for Admin approval!');
      } else {
        showError(res.error || 'Could not submit registration.');
      }
    } finally {
      setIsSubmittingReg(false);
    }
  };

  const handleCheckRegStatus = async () => {
    if (!statusCheckPhone.trim()) return;
    const res = await checkRegistrationStatus(statusCheckPhone);
    if (!res.found) {
      setStatusCheckResult('No registration found for this mobile number.');
    } else if (res.status === 'APPROVED') {
      setStatusCheckResult(
        'This mobile number is registered and approved! Please sign in using the Customer Code provided by the store.'
      );
      setLoginPhone(statusCheckPhone);
    } else if (res.status === 'REJECTED') {
      setStatusCheckResult('Registration was declined. Please contact the store.');
    } else {
      setStatusCheckResult('Still pending Admin approval. Please check again shortly.');
    }
  };

  const handleCheckTelegramLink = async () => {
    if (!customer) return;
    setIsCheckingTelegram(true);
    try {
      // 1. Check DB first (in case Telegram webhook already linked it)
      const fresh = await refreshShopCustomer(customer.id);
      if (fresh?.telegram_chat_id) {
        setCustomer(fresh);
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(fresh));
        setIsTelegramConnectOpen(false);
        showSuccess('Telegram connected successfully!');
        return;
      }

      // 2. Fallback: poll Telegram bot updates directly
      const res = await checkAndLinkCustomerLive({
        customer,
        botToken,
        onLinked: async (chatId) => {
          const updated = { ...customer, telegram_chat_id: chatId };
          setCustomer(updated);
          localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(updated));
          if (supabase) {
            await supabase
              .from('customers')
              .update({ telegram_chat_id: chatId, updated_at: new Date().toISOString() })
              .eq('id', customer.id);
          }
        },
      });

      if (res.linked) {
        setIsTelegramConnectOpen(false);
        showSuccess('Telegram connected successfully!');
      } else {
        showError('Not linked yet. Tap "Open Telegram & Connect" and press Start in the bot, then click Verify.');
      }
    } finally {
      setIsCheckingTelegram(false);
    }
  };

  const handleLogout = () => {
    setCustomer(null);
    setCart({});
    setOrders([]);
    localStorage.removeItem(SESSION_STORAGE_KEY);
  };

  const updateCartQty = (product: Product, delta: number) => {
    setCart((prev) => {
      const existing = prev[product.id];
      const currentQty = existing?.quantity || 0;
      const maxStock = Math.max(0, Number(product.stock_shop || 0));
      const nextQty = Math.min(maxStock, currentQty + delta);

      if (nextQty <= 0) {
        const copy = { ...prev };
        delete copy[product.id];
        return copy;
      }

      return {
        ...prev,
        [product.id]: { product, quantity: nextQty },
      };
    });
  };

  const handleSlipSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSlipFile(file);
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setSlipPreviewUrl(url);
    } else {
      setSlipPreviewUrl('');
    }
  };

  const handleCopyAccountNumber = () => {
    const acc = shopSettings.accountNumber || '';
    if (!acc) return;
    navigator.clipboard.writeText(acc);
    setCopiedAccount(true);
    setTimeout(() => setCopiedAccount(false), 1800);
  };

  const handlePlaceOrder = async () => {
    if (!customer) return;
    if (!isStoreOpen) {
      showError('Online store is currently closed.');
      return;
    }
    if (cartItems.length === 0) {
      showError('Your cart is empty.');
      return;
    }
    if (!deliveryMinimumMet) {
      showError(`Delivery requires a minimum order of ${currency} ${MIN_DELIVERY_AMOUNT}.`);
      return;
    }
    if (fulfillmentType === 'DELIVERY' && !deliveryAddress.trim()) {
      showError('Please enter your delivery address.');
      return;
    }
    if (paymentMethod === 'CREDIT' && !canUseCredit) {
      showError('Insufficient credit limit for this order.');
      return;
    }
    if (paymentMethod === 'CASH_TRANSFER' && !slipFile) {
      showError('Please upload your bank transfer slip.');
      return;
    }

    setIsPlacingOrder(true);
    try {
      let slipUrl = '';
      if (paymentMethod === 'CASH_TRANSFER' && slipFile) {
        const uploadRes = await uploadOrderSlip(slipFile, customer.code || 'cust');
        if (!uploadRes.ok || !uploadRes.url) {
          showError(uploadRes.error || 'Failed to upload payment slip.');
          return;
        }
        slipUrl = uploadRes.url;
      }

      const itemsPayload: OnlineOrderItem[] = cartItems.map((entry) => ({
        product_id: entry.product.id,
        name_en: entry.product.name_en || entry.product.name_dv,
        name_dv: entry.product.name_dv || '',
        image: entry.product.image || '',
        quantity: entry.quantity,
        unit_price: Number(entry.product.price || 0),
        line_total: Number((Number(entry.product.price || 0) * entry.quantity).toFixed(2)),
      }));

      const res = await placeOnlineOrder({
        customer,
        fulfillment_type: fulfillmentType,
        delivery_address: fulfillmentType === 'DELIVERY' ? deliveryAddress : '',
        delivery_notes: deliveryNotes,
        payment_method: paymentMethod,
        payment_slip_url: slipUrl,
        items: itemsPayload,
        shopSettings,
        botToken,
      });

      if (res.ok && res.order) {
        showSuccess(`Order ${res.order.order_number} placed!`);
        setCart({});
        setSlipFile(null);
        setSlipPreviewUrl('');
        setDeliveryNotes('');
        setIsCartOpen(false);
        setOrders((prev) => [res.order!, ...prev]);
        setIsOrdersOpen(true);
      } else {
        showError(res.error || 'Could not place order.');
      }
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const handleReorder = (order: OnlineOrder) => {
    const nextCart: Record<string, CartEntry> = {};
    let addedCount = 0;

    for (const item of order.items || []) {
      const prod = products.find((p) => p.id === item.product_id);
      if (prod && Number(prod.stock_shop || 0) > 0) {
        const qty = Math.min(Number(prod.stock_shop || 0), item.quantity);
        nextCart[prod.id] = { product: prod, quantity: qty };
        addedCount++;
      }
    }

    if (addedCount === 0) {
      showError('Items from this order are currently out of stock.');
      return;
    }

    setCart(nextCart);
    setIsOrdersOpen(false);
    setIsCartOpen(true);
    showSuccess('Order items added to your cart!');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6">
        <RefreshCw className="h-8 w-8 animate-spin text-primary mb-3" />
        <p className="text-sm font-bold text-muted-foreground">Loading {shopSettings.shopName || 'B BACK'} Shop...</p>
      </div>
    );
  }

  // ============================================================================
  // STORE OFFLINE OR OUTSIDE SCHEDULED OPENING HOURS: FULL-SCREEN CLOSED VIEW
  // ============================================================================
  if (!isStoreOpen) {
    const isMasterDisabled = shopSettings.onlineShopEnabled === false;
    const customClosedMessage = (shopSettings.onlineShopClosedMessage || '').trim();
    const weekly = shopSettings.onlineShopWeeklyHours || DEFAULT_WEEKLY_OPENING_HOURS;

    if (isMasterDisabled) {
      return (
        <div
          className="relative min-h-screen w-full bg-gradient-to-b from-emerald-50 via-teal-50/70 to-amber-50/50 text-slate-900 flex flex-col items-center justify-center p-5 sm:p-10 overflow-hidden font-faruma"
          dir="ltr"
        >
          {/* Soft Light-Theme Store Photo Backdrop */}
          <img
            src={SHOP_STORE_BG_URL}
            alt=""
            aria-hidden="true"
            referrerPolicy="no-referrer"
            onError={(e) => {
              const target = e.currentTarget;
              if (!target.dataset.fallbackApplied) {
                target.dataset.fallbackApplied = '1';
                target.src = '/shop-hero.jpg';
              }
            }}
            className="shop-hero-pan absolute inset-0 w-full h-full object-cover opacity-15 pointer-events-none"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-white/80 via-emerald-50/75 to-teal-50/90 pointer-events-none" />

          {/* Decorative Top Flat-Lay Grocery Strip (inspired by clean editorial Coming Soon) */}
          <div className="relative z-10 w-full max-w-2xl flex flex-col items-center text-center space-y-6">
            {/* Store Logo + Brand */}
            <div className="flex flex-col items-center gap-2.5">
              {shopSettings.logo ? (
                <img
                  src={shopSettings.logo}
                  alt={shopSettings.shopName || 'B BACK'}
                  className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl object-contain bg-white p-2 border border-teal-200 shadow-md"
                />
              ) : (
                <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl bg-teal-600 text-white flex items-center justify-center shadow-md">
                  <ShoppingBag className="h-10 w-10 sm:h-12 sm:w-12" />
                </div>
              )}
              <span className="text-xs sm:text-sm font-black tracking-widest uppercase text-teal-800">
                {shopSettings.shopName || 'B BACK'} • shop.bback.store
              </span>
            </div>

            {/* Bold Centered COMING SOON Headline */}
            <div className="space-y-2.5">
              <h1 className="text-4xl sm:text-6xl font-black tracking-tight uppercase text-slate-900 leading-none">
                COMING SOON
              </h1>
              <p className="text-sm sm:text-lg font-bold text-teal-900/80 max-w-lg mx-auto leading-relaxed whitespace-pre-line">
                {customClosedMessage ||
                  'Fresh groceries, daily essentials & fast doorstep delivery — launching soon!'}
              </p>
            </div>

            {/* Clean Pill-Shaped Store Contact & Action Bar */}
            <div className="w-full max-w-md bg-white/95 border-2 border-teal-500/30 rounded-full p-1.5 pl-4 flex items-center justify-between gap-2 shadow-sm">
              <div className="min-w-0 text-left">
                <p className="text-[11px] sm:text-xs font-black text-slate-800 truncate">
                  {shopSettings.shopPhone ? `Call Us: ${shopSettings.shopPhone}` : (shopSettings.shopAddress || 'B BACK Store')}
                </p>
                {shopSettings.shopAddress && shopSettings.shopPhone && (
                  <p className="text-[10px] text-slate-500 truncate">{shopSettings.shopAddress}</p>
                )}
              </div>
              {shopSettings.shopPhone ? (
                <a
                  href={`tel:${shopSettings.shopPhone}`}
                  className="h-9 px-4 rounded-full bg-teal-600 hover:bg-teal-700 text-white text-xs font-black inline-flex items-center gap-1.5 shrink-0 transition-colors"
                >
                  <Phone className="h-3.5 w-3.5" />
                  <span>CALL</span>
                </a>
              ) : (
                <Button
                  type="button"
                  onClick={() => loadShop()}
                  className="h-9 px-4 rounded-full bg-teal-600 hover:bg-teal-700 text-white text-xs font-black shrink-0"
                >
                  REFRESH
                </Button>
              )}
            </div>

            {/* Circular Quick Action Icons (Maps, Phone, Refresh) */}
            <div className="flex items-center justify-center gap-3 pt-1">
              <a
                href="https://maps.app.goo.gl/qXnbomJZLFY3BLiUA"
                target="_blank"
                rel="noreferrer"
                title="Open in Google Maps"
                className="h-11 w-11 rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center shadow-sm transition-transform hover:scale-105"
              >
                <MapPin className="h-5 w-5" />
              </a>
              {shopSettings.shopPhone && (
                <a
                  href={`tel:${shopSettings.shopPhone}`}
                  title={`Call ${shopSettings.shopPhone}`}
                  className="h-11 w-11 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center shadow-sm transition-transform hover:scale-105"
                >
                  <Phone className="h-5 w-5" />
                </a>
              )}
              <button
                type="button"
                onClick={() => loadShop()}
                title="Refresh Store Status"
                className="h-11 w-11 rounded-full bg-amber-500 hover:bg-amber-600 text-white flex items-center justify-center shadow-sm transition-transform hover:scale-105"
              >
                <RefreshCw className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4 sm:p-6 font-faruma" dir="ltr">
        <div className="w-full max-w-md bg-card border border-border rounded-xl p-6 sm:p-8 text-center space-y-4 shadow-sm">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/25 flex items-center justify-center text-rose-500">
            <Clock className="h-7 w-7" />
          </div>
          <div className="space-y-1.5">
            <span className="inline-block text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
              Shop Closed
            </span>
            <h1 className="text-xl font-black text-foreground">
              {shopSettings.shopName || 'B BACK'} Online Shop is Closed
            </h1>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {storeOpenStatus.reason || 'Online ordering is only available during our opening hours.'}
            </p>
          </div>

          {/* Show Opening Times when closed due to schedule */}
          {!isMasterDisabled && shopSettings.onlineShopScheduleEnabled && (
            <div className="text-left bg-muted/60 border border-border rounded-xl p-3.5 space-y-2">
              <p className="text-[11px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-primary" />
                <span>Opening Times</span>
              </p>
              <div className="space-y-1.5 text-xs">
                {DAY_ORDER.map(({ key, label }) => {
                  const dayData = weekly[key];
                  const slotsText =
                    dayData?.enabled && dayData.slots?.length
                      ? dayData.slots.map((s) => `${formatTime12h(s.open)} – ${formatTime12h(s.close)}`).join(', ')
                      : 'Closed';
                  return (
                    <div key={key} className="flex items-start justify-between gap-2">
                      <span className="font-bold text-foreground">{label}</span>
                      <span className="font-mono text-[11px] text-muted-foreground text-right tabular-nums">
                        {slotsText}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {shopSettings.shopPhone && (
            <p className="text-xs font-mono font-bold text-foreground bg-muted rounded-lg py-2 px-3 border border-border">
              Store Contact: {shopSettings.shopPhone}
            </p>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={() => loadShop()}
            className="h-10 px-5 rounded-lg text-xs font-black gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Check Again</span>
          </Button>
        </div>
      </div>
    );
  }

  // ============================================================================
  // UNAUTHENTICATED VIEW: STORE ADVERTISING LANDING PAGE + LOGIN / REGISTER
  // ============================================================================
  if (!customer) {
    const showcaseProducts = products
      .filter((p) => Number(p.stock_shop || 0) > 0)
      .slice(0, 6);
    const weekly = shopSettings.onlineShopWeeklyHours || DEFAULT_WEEKLY_OPENING_HOURS;

    return (
      <div className="relative min-h-screen bg-background text-foreground flex flex-col font-faruma overflow-x-hidden" dir="ltr">
        {/* Store Photo Background */}
        <div className="fixed inset-0 z-0 pointer-events-none">
          <img
            src={SHOP_STORE_BG_URL}
            alt=""
            aria-hidden="true"
            referrerPolicy="no-referrer"
            onError={(e) => {
              const target = e.currentTarget;
              if (!target.dataset.fallbackApplied) {
                target.dataset.fallbackApplied = '1';
                target.src = '/shop-hero.jpg';
              }
            }}
            className="w-full h-full object-cover opacity-20 dark:opacity-25"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/85 to-background/95" />
        </div>

        {/* Top Landing Bar */}
        <header className="relative z-10 bg-card/95 border-b border-border px-4 sm:px-6 py-3">
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              {shopSettings.logo ? (
                <img
                  src={shopSettings.logo}
                  alt={shopSettings.shopName || 'B BACK'}
                  className="h-9 w-9 rounded-lg object-contain bg-muted border border-border p-0.5"
                />
              ) : (
                <div className="h-9 w-9 rounded-lg bg-primary/10 border border-primary/25 flex items-center justify-center text-primary">
                  <ShoppingBag className="h-5 w-5" />
                </div>
              )}
              <div>
                <p className="text-sm sm:text-base font-black tracking-tight text-foreground">
                  {shopSettings.shopName || 'B BACK'}
                </p>
                <p className="text-[11px] text-muted-foreground">shop.bback.store</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black px-2.5 py-1 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                OPEN FOR ORDERS
              </span>
              <a
                href="https://maps.app.goo.gl/qXnbomJZLFY3BLiUA"
                target="_blank"
                rel="noreferrer"
                className="hidden sm:inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border bg-muted hover:bg-muted/80 text-xs font-bold text-foreground transition-colors"
              >
                <MapPin className="h-3.5 w-3.5 text-rose-500" />
                <span>Find Us on Maps</span>
              </a>
            </div>
          </div>
        </header>

        {/* Animated Store Perks Marquee */}
        <div className="relative z-10 shop-marquee-wrap bg-primary/10 border-b border-primary/20 overflow-hidden py-1.5">
          <div className="shop-marquee-track text-[11px] font-black text-primary whitespace-nowrap">
            <span className="px-6">🚚 Doorstep Delivery from {currency} {MIN_DELIVERY_AMOUNT}</span>
            <span className="px-6">🏪 Free Store Pickup (No Minimum)</span>
            <span className="px-6">💳 Store Credit &amp; Instant Bank Transfer Slip</span>
            <span className="px-6">📲 Live Telegram Order Status Updates</span>
            <span className="px-6">✨ Fresh Essentials &amp; Daily Groceries</span>
            <span className="px-6" aria-hidden="true">🚚 Doorstep Delivery from {currency} {MIN_DELIVERY_AMOUNT}</span>
            <span className="px-6" aria-hidden="true">🏪 Free Store Pickup (No Minimum)</span>
            <span className="px-6" aria-hidden="true">💳 Store Credit &amp; Instant Bank Transfer Slip</span>
            <span className="px-6" aria-hidden="true">📲 Live Telegram Order Status Updates</span>
            <span className="px-6" aria-hidden="true">✨ Fresh Essentials &amp; Daily Groceries</span>
          </div>
        </div>

        {/* Main 2-Column Landing + Login Layout */}
        <main className="relative z-10 flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Visual Hero Art + Store Showcase */}
          <section className="lg:col-span-7 space-y-5">
            {/* Hero Visual Banner Card */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
              <div className="relative aspect-[16/9] w-full bg-slate-900 overflow-hidden">
                <img
                  src="/shop-hero.jpg"
                  alt={`${shopSettings.shopName || 'B BACK'} Online Store`}
                  className="shop-hero-pan w-full h-full object-cover"
                />
                {/* Floating Motion Badges */}
                <div className="absolute top-3 right-3 flex flex-col items-end gap-2 pointer-events-none">
                  <span className="shop-float-slow inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-950/75 text-white border border-white/15 text-[10px] font-black shadow-md backdrop-blur-xs">
                    <Truck className="h-3 w-3 text-emerald-400" /> Delivery from {currency} {MIN_DELIVERY_AMOUNT}
                  </span>
                  <span className="shop-float-delayed inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-950/75 text-white border border-white/15 text-[10px] font-black shadow-md backdrop-blur-xs">
                    <Store className="h-3 w-3 text-amber-400" /> Free Store Pickup
                  </span>
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/35 to-transparent flex flex-col justify-end p-5 sm:p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500 text-white shadow-sm">
                      <Sparkles className="h-3 w-3" /> Official Online Store
                    </span>
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-white/15 text-white backdrop-blur-xs">
                      Maldives • {currency}
                    </span>
                  </div>
                  <h1 className="text-xl sm:text-3xl font-black tracking-tight text-white leading-tight">
                    Fresh Essentials &amp; Daily Needs at {shopSettings.shopName || 'B BACK'}
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-200 mt-1.5 max-w-xl leading-relaxed">
                    Order straight from your phone for fast doorstep delivery or quick store pickup — pay via store credit or instant bank transfer slip.
                  </p>
                </div>
              </div>

              <div className="p-4 sm:p-5 space-y-4">
                {/* Store Highlights */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="shop-card-hover p-3 rounded-xl bg-gradient-to-br from-primary/10 to-transparent border border-primary/20 space-y-1">
                    <div className="h-7 w-7 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
                      <Truck className="h-4 w-4" />
                    </div>
                    <p className="text-xs font-black text-foreground">Fast Delivery</p>
                    <p className="text-[10px] text-muted-foreground">Min. {currency} {MIN_DELIVERY_AMOUNT}</p>
                  </div>
                  <div className="shop-card-hover p-3 rounded-xl bg-gradient-to-br from-emerald-500/10 to-transparent border border-emerald-500/20 space-y-1">
                    <div className="h-7 w-7 rounded-lg bg-emerald-500/15 text-emerald-500 flex items-center justify-center">
                      <Store className="h-4 w-4" />
                    </div>
                    <p className="text-xs font-black text-foreground">Store Pickup</p>
                    <p className="text-[10px] text-muted-foreground">No min. limit</p>
                  </div>
                  <div className="shop-card-hover p-3 rounded-xl bg-gradient-to-br from-amber-500/10 to-transparent border border-amber-500/20 space-y-1">
                    <div className="h-7 w-7 rounded-lg bg-amber-500/15 text-amber-500 flex items-center justify-center">
                      <CreditCard className="h-4 w-4" />
                    </div>
                    <p className="text-xs font-black text-foreground">Credit &amp; Slip</p>
                    <p className="text-[10px] text-muted-foreground">Flexible payment</p>
                  </div>
                  <div className="shop-card-hover p-3 rounded-xl bg-gradient-to-br from-[#229ED9]/10 to-transparent border-[#229ED9]/25 border space-y-1">
                    <div className="h-7 w-7 rounded-lg bg-[#229ED9]/15 text-[#229ED9] flex items-center justify-center">
                      <Send className="h-4 w-4" />
                    </div>
                    <p className="text-xs font-black text-foreground">Telegram Alerts</p>
                    <p className="text-[10px] text-muted-foreground">Live order updates</p>
                  </div>
                </div>

                {/* Store Contact & Google Maps Location */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border text-xs">
                  <div className="space-y-0.5 text-muted-foreground">
                    {shopSettings.shopAddress && (
                      <p className="font-bold text-foreground flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                        <span>{shopSettings.shopAddress}</span>
                      </p>
                    )}
                    {shopSettings.shopPhone && (
                      <p className="font-mono pl-5">Tel: {shopSettings.shopPhone}</p>
                    )}
                  </div>
                  <a
                    href="https://maps.app.goo.gl/qXnbomJZLFY3BLiUA"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 text-xs font-black text-rose-600 dark:text-rose-400 transition-colors"
                  >
                    <MapPin className="h-3.5 w-3.5" />
                    <span>Open in Google Maps</span>
                  </a>
                </div>
              </div>
            </div>

            {/* Popular Products Preview */}
            {showcaseProducts.length > 0 && (
              <div className="bg-card border border-border rounded-xl p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-black text-foreground">Available In Store Now</h2>
                  <span className="text-[11px] font-bold text-muted-foreground">Sign in to order</span>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {showcaseProducts.map((prod) => (
                    <div key={prod.id} className="shop-card-hover rounded-lg border border-border bg-background p-1.5 space-y-1">
                      <div className="h-16 w-full rounded bg-muted overflow-hidden">
                        <img
                          src={getAdaptedImageUrl(prod.image, prod.name_en || prod.name_dv, prod.item_code)}
                          alt={prod.name_en || prod.name_dv}
                          loading="lazy"
                          onError={(e) => {
                            const target = e.currentTarget;
                            if (!target.dataset.fallbackApplied) {
                              target.dataset.fallbackApplied = '1';
                              target.src = generatePlaceholderImage(prod.name_en || prod.name_dv || 'Item', prod.item_code);
                            }
                          }}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <p className="text-[10px] font-bold text-foreground truncate">
                        {prod.name_en || prod.name_dv}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Opening Hours Summary (if scheduled) */}
            {shopSettings.onlineShopScheduleEnabled && (
              <div className="bg-card border border-border rounded-xl p-4 space-y-2">
                <p className="text-xs font-black text-foreground flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-primary" />
                  <span>Store Opening Hours</span>
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  {DAY_ORDER.map(({ key, label }) => {
                    const dayData = weekly[key];
                    const slotsText =
                      dayData?.enabled && dayData.slots?.length
                        ? dayData.slots.map((s) => `${formatTime12h(s.open)} – ${formatTime12h(s.close)}`).join(', ')
                        : 'Closed';
                    return (
                      <div key={key} className="flex items-center justify-between gap-2 py-0.5">
                        <span className="font-bold text-foreground">{label}</span>
                        <span className="font-mono text-[11px] text-muted-foreground tabular-nums">{slotsText}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>

          {/* Right Column: Customer Login / Register */}
          <section className="lg:col-span-5 w-full">
            <div className="bg-card border border-border rounded-xl p-5 sm:p-6 shadow-sm space-y-5">
              <div className="space-y-1">
                <h2 className="text-lg font-black text-foreground">Customer Access</h2>
                <p className="text-xs text-muted-foreground">
                  Sign in with your Customer Code &amp; Mobile Number, or register a new account.
                </p>
              </div>
              {/* Tabs */}
            <div className="grid grid-cols-2 gap-1 bg-muted p-1 rounded-lg border border-border">
              <button
                type="button"
                aria-pressed={authTab === 'LOGIN'}
                onClick={() => setAuthTab('LOGIN')}
                className={cn(
                  'h-9 rounded-md text-xs font-black flex items-center justify-center gap-1.5 transition-colors',
                  authTab === 'LOGIN'
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <LogIn className="h-3.5 w-3.5" />
                <span>Customer Login</span>
              </button>
              <button
                type="button"
                aria-pressed={authTab === 'REGISTER'}
                onClick={() => setAuthTab('REGISTER')}
                className={cn(
                  'h-9 rounded-md text-xs font-black flex items-center justify-center gap-1.5 transition-colors',
                  authTab === 'REGISTER'
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <UserPlus className="h-3.5 w-3.5" />
                <span>Register</span>
              </button>
            </div>

            {authTab === 'LOGIN' ? (
              <form onSubmit={handleLogin} className="space-y-4">
                {loginStep === 'CREDENTIALS' && (
                  <>
                    <div className="space-y-1.5">
                      <Label htmlFor="shopLoginCode" className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                        Customer Code
                      </Label>
                      <Input
                        id="shopLoginCode"
                        placeholder="e.g. 001"
                        value={loginCode}
                        onChange={(e) => setLoginCode(e.target.value)}
                        className="h-11 bg-background border-border rounded-lg font-mono font-bold"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="shopLoginPhone" className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                        Mobile Number
                      </Label>
                      <Input
                        id="shopLoginPhone"
                        type="tel"
                        placeholder="e.g. 7771234"
                        value={loginPhone}
                        onChange={(e) => setLoginPhone(e.target.value)}
                        className="h-11 bg-background border-border rounded-lg font-mono font-bold"
                        required
                      />
                    </div>
                  </>
                )}

                {loginStep === 'SET_PASSWORD' && pendingLoginCustomer && (
                  <div className="space-y-3">
                    <div className="p-3 rounded-lg bg-primary/10 border border-primary/25 text-xs">
                      <p className="font-black text-foreground flex items-center gap-1.5">
                        <Lock className="h-3.5 w-3.5 text-primary" />
                        Set Your Shop Password
                      </p>
                      <p className="text-muted-foreground mt-0.5">
                        Hi <strong className="text-foreground">{pendingLoginCustomer.name_en || pendingLoginCustomer.name_dv}</strong> (#{pendingLoginCustomer.code}), create a password so others cannot access your account.
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="newShopPass" className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                        New Password (min 4 characters)
                      </Label>
                      <Input
                        id="newShopPass"
                        type="password"
                        placeholder="Enter new password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="h-11 bg-background border-border rounded-lg"
                        required
                        autoFocus
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="confirmShopPass" className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                        Confirm Password
                      </Label>
                      <Input
                        id="confirmShopPass"
                        type="password"
                        placeholder="Re-enter new password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="h-11 bg-background border-border rounded-lg"
                        required
                      />
                    </div>
                  </div>
                )}

                {loginStep === 'ENTER_PASSWORD' && pendingLoginCustomer && (
                  <div className="space-y-3">
                    <div className="p-3 rounded-lg bg-muted border border-border text-xs">
                      <p className="font-black text-foreground">
                        {pendingLoginCustomer.name_en || pendingLoginCustomer.name_dv} (#{pendingLoginCustomer.code})
                      </p>
                      <p className="text-muted-foreground mt-0.5">
                        Enter your shop password to continue.
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="enterShopPass" className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                        Password
                      </Label>
                      <Input
                        id="enterShopPass"
                        type="password"
                        placeholder="Enter your password"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        className="h-11 bg-background border-border rounded-lg"
                        required
                        autoFocus
                      />
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        disabled={isSendingResetOtp}
                        onClick={handleSendTelegramResetOtp}
                        className="text-[11px] font-bold text-[#229ED9] hover:underline flex items-center gap-1"
                      >
                        <Send className="h-3 w-3" />
                        <span>{isSendingResetOtp ? 'Sending code to Telegram...' : 'Forgot Password? Reset via Telegram'}</span>
                      </button>
                    </div>
                  </div>
                )}

                {loginStep === 'RESET_PASSWORD' && pendingLoginCustomer && (
                  <div className="space-y-3">
                    <div className="p-3 rounded-lg bg-[#229ED9]/10 border border-[#229ED9]/30 text-xs">
                      <p className="font-black text-foreground flex items-center gap-1.5">
                        <Send className="h-3.5 w-3.5 text-[#229ED9]" />
                        Check Your Telegram
                      </p>
                      <p className="text-muted-foreground mt-0.5">
                        Enter the 6-digit reset code sent to your Telegram and choose a new password.
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="resetOtpInput" className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                        6-Digit Telegram Code
                      </Label>
                      <Input
                        id="resetOtpInput"
                        inputMode="numeric"
                        maxLength={6}
                        placeholder="123456"
                        value={resetOtp}
                        onChange={(e) => setResetOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        className="h-11 bg-background border-border rounded-lg font-mono font-bold tracking-widest"
                        required
                        autoFocus
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="resetNewPass" className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                        New Password (min 4 characters)
                      </Label>
                      <Input
                        id="resetNewPass"
                        type="password"
                        placeholder="Enter new password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="h-11 bg-background border-border rounded-lg"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="resetConfirmPass" className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                        Confirm Password
                      </Label>
                      <Input
                        id="resetConfirmPass"
                        type="password"
                        placeholder="Re-enter new password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="h-11 bg-background border-border rounded-lg"
                        required
                      />
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  {loginStep !== 'CREDENTIALS' && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setLoginStep('CREDENTIALS');
                        setPendingLoginCustomer(null);
                      }}
                      className="h-11 px-4 rounded-lg font-bold text-xs"
                    >
                      Back
                    </Button>
                  )}
                  <Button
                    type="submit"
                    disabled={isLoggingIn}
                    className="flex-1 h-11 rounded-lg font-black text-sm"
                  >
                    {isLoggingIn
                      ? 'Please wait...'
                      : loginStep === 'CREDENTIALS'
                        ? 'Continue'
                        : loginStep === 'SET_PASSWORD'
                          ? 'Save Password & Start Shopping'
                          : loginStep === 'RESET_PASSWORD'
                            ? 'Reset Password & Sign In'
                            : 'Sign In & Start Shopping'}
                  </Button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-3">
                {regSubmittedMsg && (
                  <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
                    {regSubmittedMsg}
                  </div>
                )}
                <div className="space-y-1">
                  <Label htmlFor="regNameEn" className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                    Full Name (English) *
                  </Label>
                  <Input
                    id="regNameEn"
                    placeholder="Your full name"
                    value={regNameEn}
                    onChange={(e) => setRegNameEn(e.target.value)}
                    className="h-10 bg-background border-border rounded-lg"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="regNameDv" className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                    Name in Dhivehi (Optional)
                  </Label>
                  <Input
                    id="regNameDv"
                    dir="rtl"
                    placeholder="ދިވެހި ނަން"
                    value={regNameDv}
                    onChange={(e) => setRegNameDv(e.target.value)}
                    className="h-10 bg-background border-border rounded-lg font-faruma text-right"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="regPhone" className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                    Mobile Number *
                  </Label>
                  <Input
                    id="regPhone"
                    type="tel"
                    placeholder="e.g. 7771234"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    className="h-10 bg-background border-border rounded-lg font-mono"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="regAddress" className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                    Address / House Name
                  </Label>
                  <Input
                    id="regAddress"
                    placeholder="Delivery address / Island"
                    value={regAddress}
                    onChange={(e) => setRegAddress(e.target.value)}
                    className="h-10 bg-background border-border rounded-lg"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="regEmail" className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                    Email (Optional)
                  </Label>
                  <Input
                    id="regEmail"
                    type="email"
                    placeholder="name@example.com"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    className="h-10 bg-background border-border rounded-lg"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={isSubmittingReg}
                  className="w-full h-11 rounded-lg font-black text-sm mt-1"
                >
                  {isSubmittingReg ? 'Submitting...' : 'Submit Registration for Approval'}
                </Button>
                <p className="text-[11px] text-muted-foreground text-center">
                  After POS Admin approves your registration, you can login and shop immediately.
                </p>
              </form>
            )}

            {/* Registration Status Checker */}
            <div className="pt-4 border-t border-border space-y-2">
              <p className="text-[11px] font-bold text-muted-foreground">
                Already registered? Check approval status by mobile number:
              </p>
              <div className="flex gap-2">
                <Input
                  type="tel"
                  placeholder="Mobile number..."
                  value={statusCheckPhone}
                  onChange={(e) => setStatusCheckPhone(e.target.value)}
                  className="h-9 bg-background border-border rounded-lg text-xs font-mono"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCheckRegStatus}
                  className="h-9 px-3 rounded-lg text-xs font-bold shrink-0"
                >
                  Check
                </Button>
              </div>
              {statusCheckResult && (
                <p className="text-xs font-semibold text-primary bg-primary/10 border border-primary/20 rounded-lg p-2.5">
                  {statusCheckResult}
                </p>
              )}
            </div>
          </div>
          </section>
        </main>
        <ShopHelperMascot isLoggedIn={false} />
      </div>
    );
  }

  // ============================================================================
  // AUTHENTICATED STOREFRONT VIEW
  // ============================================================================
  return (
    <div className="min-h-screen bg-background text-foreground font-faruma flex flex-col" dir="ltr">
      {/* Top Store Header */}
      <header className="sticky top-0 z-30 bg-card border-b border-border px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/25 flex items-center justify-center text-primary shrink-0">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black tracking-tight">
                  {shopSettings.shopName || 'B BACK'} Shop
                </h1>
                <span
                  className={cn(
                    'text-[10px] font-black px-2 py-0.5 rounded-md border',
                    isStoreOpen
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                      : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30'
                  )}
                >
                  {isStoreOpen ? 'OPEN' : 'CLOSED'}
                </span>
                {storeOpenStatus.hoursLabel && (
                  <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold text-muted-foreground">
                    <Clock className="h-3 w-3" /> {storeOpenStatus.hoursLabel}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground font-semibold">
                #{customer.code} • {customer.name_en || customer.name_dv}
              </p>
            </div>
          </div>

          {/* Credit Summary + Orders + Cart */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="hidden md:flex items-center gap-3 px-3 py-1.5 rounded-xl bg-muted border border-border text-xs">
              <div>
                <span className="text-muted-foreground mr-1">Balance:</span>
                <span className="font-mono font-black tabular-nums text-amber-600 dark:text-amber-400">
                  {currency} {outstandingBalance.toFixed(2)}
                </span>
              </div>
              <span className="text-border">|</span>
              <div>
                <span className="text-muted-foreground mr-1">Avail. Credit:</span>
                <span className="font-mono font-black tabular-nums text-emerald-600 dark:text-emerald-400">
                  {currency} {availableCredit.toFixed(2)}
                </span>
              </div>
            </div>

            {customer.telegram_chat_id ? (
              <span
                title="Telegram notifications linked"
                className="hidden sm:inline-flex items-center gap-1 h-9 px-2.5 rounded-xl bg-[#229ED9]/10 border border-[#229ED9]/25 text-[#229ED9] text-[11px] font-black"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Telegram ✓</span>
              </span>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsTelegramConnectOpen(true)}
                className="h-9 px-3 rounded-xl border-[#229ED9]/40 bg-[#229ED9]/10 hover:bg-[#229ED9]/20 text-[#229ED9] text-xs font-black gap-1.5"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Connect Telegram</span>
              </Button>
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsOrdersOpen(true)}
              className="h-9 px-3 rounded-xl border-border text-xs font-bold gap-1.5 relative"
            >
              <Package className="h-4 w-4" />
              <span>My Orders</span>
              {activeOrdersCount > 0 && (
                <span className="px-1.5 py-0.2 bg-primary text-primary-foreground rounded-full text-[10px] font-black tabular-nums">
                  {activeOrdersCount}
                </span>
              )}
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={() => setIsCartOpen(true)}
              className="h-9 px-3.5 rounded-xl text-xs font-black gap-1.5"
            >
              <ShoppingCart className="h-4 w-4" />
              <span>Cart ({cartCount})</span>
              {cartSubtotal > 0 && (
                <span className="font-mono tabular-nums">• {currency} {cartSubtotal.toFixed(2)}</span>
              )}
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              title="Logout"
              className="h-9 w-9 rounded-xl text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Store Closed Banner */}
      {!isStoreOpen && (
        <div className="bg-rose-500/10 border-b border-rose-500/30 px-4 py-2.5 text-center text-xs font-bold text-rose-600 dark:text-rose-400">
          {storeOpenStatus.reason ||
            shopSettings.onlineShopClosedMessage ||
            'Online ordering is temporarily paused. Please check back later or contact the store.'}
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-5 space-y-4">
        {/* Mobile Credit Pill */}
        <div className="flex md:hidden items-center justify-between gap-2 px-3 py-2 rounded-xl bg-card border border-border text-xs">
          <div>
            <span className="text-muted-foreground mr-1">Balance:</span>
            <span className="font-mono font-black tabular-nums text-amber-600 dark:text-amber-400">
              {currency} {outstandingBalance.toFixed(2)}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground mr-1">Avail. Credit:</span>
            <span className="font-mono font-black tabular-nums text-emerald-600 dark:text-emerald-400">
              {currency} {availableCredit.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Search, Category, Availability & Price Filter */}
        <div className="flex flex-col gap-2.5 bg-card border border-border rounded-xl p-2.5">
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search products by name, Dhivehi, or code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9 pl-9 pr-8 bg-background border-border rounded-lg text-xs font-semibold"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  aria-pressed={selectedCategory === cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={cn(
                    'h-8 px-3 rounded-lg text-[11px] font-black whitespace-nowrap border transition-colors',
                    selectedCategory === cat
                      ? 'bg-primary text-primary-foreground border-primary'
                      : cat === 'ESSENTIALS'
                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                        : 'bg-muted text-muted-foreground border-border hover:text-foreground'
                  )}
                >
                  {cat === 'ALL' ? 'All Items' : cat === 'ESSENTIALS' ? '🇲🇻 Daily Essentials' : cat}
                </button>
              ))}
            </div>
          </div>

          {/* Availability & Price Filter Row */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/60">
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                aria-pressed={inStockOnly}
                onClick={() => setInStockOnly((v) => !v)}
                className={cn(
                  'h-8 px-3 rounded-lg text-[11px] font-black border transition-colors flex items-center gap-1.5',
                  inStockOnly
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-muted text-muted-foreground border-border hover:text-foreground'
                )}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Available Only</span>
              </button>

              <div className="flex items-center gap-1 bg-muted p-1 rounded-lg border border-border">
                <button
                  type="button"
                  aria-pressed={priceSort === 'DEFAULT'}
                  onClick={() => setPriceSort('DEFAULT')}
                  className={cn(
                    'h-6 px-2 rounded text-[11px] font-bold transition-colors',
                    priceSort === 'DEFAULT' ? 'bg-card text-foreground shadow-2xs' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  Default
                </button>
                <button
                  type="button"
                  aria-pressed={priceSort === 'LOW_TO_HIGH'}
                  onClick={() => setPriceSort('LOW_TO_HIGH')}
                  className={cn(
                    'h-6 px-2 rounded text-[11px] font-bold transition-colors',
                    priceSort === 'LOW_TO_HIGH' ? 'bg-card text-primary font-black shadow-2xs' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  Price: Low → High
                </button>
                <button
                  type="button"
                  aria-pressed={priceSort === 'HIGH_TO_LOW'}
                  onClick={() => setPriceSort('HIGH_TO_LOW')}
                  className={cn(
                    'h-6 px-2 rounded text-[11px] font-bold transition-colors',
                    priceSort === 'HIGH_TO_LOW' ? 'bg-card text-primary font-black shadow-2xs' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  Price: High → Low
                </button>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-muted-foreground">Price ({currency}):</span>
              <Input
                type="number"
                min="0"
                placeholder="Min"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                className="h-8 w-20 bg-background border-border rounded-lg text-xs font-mono tabular-nums"
              />
              <span className="text-muted-foreground text-xs">–</span>
              <Input
                type="number"
                min="0"
                placeholder="Max"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                className="h-8 w-20 bg-background border-border rounded-lg text-xs font-mono tabular-nums"
              />
              {(minPrice || maxPrice || inStockOnly || priceSort !== 'DEFAULT') && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setMinPrice('');
                    setMaxPrice('');
                    setInStockOnly(false);
                    setPriceSort('DEFAULT');
                  }}
                  className="h-8 px-2 text-[11px] font-bold text-muted-foreground hover:text-foreground"
                >
                  Reset
                </Button>
              )}

              {/* Grid / List View Toggle */}
              <div className="flex items-center gap-0.5 bg-muted p-0.5 rounded-lg border border-border ml-1">
                <button
                  type="button"
                  aria-pressed={viewMode === 'GRID'}
                  onClick={() => setViewMode('GRID')}
                  title="Grid View"
                  className={cn(
                    'h-7 w-7 rounded flex items-center justify-center transition-colors',
                    viewMode === 'GRID'
                      ? 'bg-card text-primary shadow-2xs'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  aria-pressed={viewMode === 'LIST'}
                  onClick={() => setViewMode('LIST')}
                  title="List View"
                  className={cn(
                    'h-7 w-7 rounded flex items-center justify-center transition-colors',
                    viewMode === 'LIST'
                      ? 'bg-card text-primary shadow-2xs'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <List className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Product Grid or List */}
        {viewMode === 'GRID' ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 sm:gap-2.5">
            {filteredProducts.map((product) => {
              const stock = Number(product.stock_shop || 0);
              const inCartQty = cart[product.id]?.quantity || 0;
              const outOfStock = stock <= 0;

              return (
                <article
                  key={product.id}
                  className="bg-card border border-border rounded-xl overflow-hidden flex flex-col justify-between p-2 sm:p-2.5 gap-1.5 hover:border-primary/40 transition-colors"
                >
                  <header className="space-y-1.5">
                    <div className="h-20 sm:h-28 w-full rounded-lg bg-muted border border-border/60 overflow-hidden flex items-center justify-center relative">
                      <img
                        src={getAdaptedImageUrl(product.image, product.name_en || product.name_dv, product.item_code)}
                        alt={product.name_en || product.name_dv}
                        loading="lazy"
                        onError={(e) => {
                          const target = e.currentTarget;
                          if (!target.dataset.fallbackApplied) {
                            target.dataset.fallbackApplied = '1';
                            target.src = generatePlaceholderImage(product.name_en || product.name_dv || 'Item', product.item_code);
                          }
                        }}
                        className="w-full h-full object-cover"
                      />
                      {outOfStock && (
                        <span className="absolute inset-0 bg-background/75 flex items-center justify-center text-[10px] font-black text-rose-600 dark:text-rose-400">
                          Out of Stock
                        </span>
                      )}
                    </div>
                    <div>
                      <h3 className="text-[11px] sm:text-xs font-black text-foreground line-clamp-2 leading-tight">
                        {product.name_en || product.name_dv}
                      </h3>
                      {product.name_dv && (
                        <p className="text-[10px] text-muted-foreground font-bold truncate mt-0.5">
                          {product.name_dv}
                        </p>
                      )}
                    </div>
                  </header>

                  <footer className="space-y-1.5 pt-1 border-t border-border/60">
                    <div className="flex items-baseline justify-between gap-1">
                      <span className="font-mono font-black text-xs sm:text-sm tabular-nums text-primary truncate">
                        {currency} {Number(product.price || 0).toFixed(2)}
                      </span>
                      <span className="text-[9px] text-muted-foreground font-mono tabular-nums shrink-0">
                        {outOfStock ? '0' : `${stock}`}
                      </span>
                    </div>

                    {inCartQty > 0 ? (
                      <div className="flex items-center justify-between gap-0.5 bg-muted rounded-lg p-0.5 border border-border">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => updateCartQty(product, -1)}
                          className="h-6 w-6 rounded-md"
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="font-mono font-black text-[11px] tabular-nums">{inCartQty}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={inCartQty >= stock}
                          onClick={() => updateCartQty(product, 1)}
                          className="h-6 w-6 rounded-md"
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        disabled={outOfStock || !isStoreOpen}
                        onClick={() => updateCartQty(product, 1)}
                        className="w-full h-7 rounded-lg text-[11px] font-black gap-1"
                      >
                        <Plus className="h-3 w-3" />
                        <span>Add</span>
                      </Button>
                    )}
                  </footer>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filteredProducts.map((product) => {
              const stock = Number(product.stock_shop || 0);
              const inCartQty = cart[product.id]?.quantity || 0;
              const outOfStock = stock <= 0;

              return (
                <article
                  key={product.id}
                  className="bg-card border border-border rounded-xl p-2 sm:p-2.5 flex items-center gap-2.5 hover:border-primary/40 transition-colors"
                >
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg bg-muted border border-border/60 overflow-hidden flex items-center justify-center relative shrink-0">
                    <img
                      src={getAdaptedImageUrl(product.image, product.name_en || product.name_dv, product.item_code)}
                      alt={product.name_en || product.name_dv}
                      loading="lazy"
                      onError={(e) => {
                        const target = e.currentTarget;
                        if (!target.dataset.fallbackApplied) {
                          target.dataset.fallbackApplied = '1';
                          target.src = generatePlaceholderImage(product.name_en || product.name_dv || 'Item', product.item_code);
                        }
                      }}
                      className="w-full h-full object-cover"
                    />
                    {outOfStock && (
                      <span className="absolute inset-0 bg-background/80 flex items-center justify-center text-[9px] font-black text-rose-600 dark:text-rose-400 text-center leading-tight px-1">
                        Out
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="text-xs sm:text-sm font-black text-foreground truncate leading-snug">
                      {product.name_en || product.name_dv}
                    </h3>
                    {product.name_dv && (
                      <p className="text-[11px] text-muted-foreground font-bold truncate">
                        {product.name_dv}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="font-mono font-black text-xs sm:text-sm tabular-nums text-primary">
                        {currency} {Number(product.price || 0).toFixed(2)}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono tabular-nums">
                        • {outOfStock ? 'Out of stock' : `${stock} left`}
                      </span>
                    </div>
                  </div>

                  <div className="shrink-0">
                    {inCartQty > 0 ? (
                      <div className="flex items-center gap-1 bg-muted rounded-lg p-1 border border-border">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => updateCartQty(product, -1)}
                          className="h-7 w-7 rounded-md"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </Button>
                        <span className="w-5 text-center font-mono font-black text-xs tabular-nums">{inCartQty}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={inCartQty >= stock}
                          onClick={() => updateCartQty(product, 1)}
                          className="h-7 w-7 rounded-md"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        disabled={outOfStock || !isStoreOpen}
                        onClick={() => updateCartQty(product, 1)}
                        className="h-8 px-3 rounded-lg text-xs font-black gap-1"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Add</span>
                      </Button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {filteredProducts.length === 0 && (
          <div className="text-center py-12 text-sm text-muted-foreground">
            No products found matching your search.
          </div>
        )}
      </main>

      {/* Cart & Checkout Dialog */}
      <Dialog open={isCartOpen} onOpenChange={setIsCartOpen}>
        <DialogContent className="sm:max-w-lg w-[calc(100vw-1.5rem)] max-h-[90vh] overflow-y-auto bg-card border-border rounded-xl p-5 font-faruma" dir="ltr">
          <DialogHeader>
            <DialogTitle className="text-lg font-black flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-primary" />
              <span>Your Cart & Checkout</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Minimum {currency} {MIN_DELIVERY_AMOUNT} required for Delivery. No minimum for Store Pickup.
            </DialogDescription>
          </DialogHeader>

          {cartItems.length === 0 ? (
            <div className="py-10 text-center space-y-2">
              <ShoppingBag className="h-10 w-10 text-muted-foreground/40 mx-auto" />
              <p className="text-sm font-bold text-muted-foreground">Your cart is empty.</p>
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              {/* Cart Items */}
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {cartItems.map(({ product, quantity }) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-muted/50 border border-border"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-black truncate">{product.name_en || product.name_dv}</p>
                      <p className="text-[11px] font-mono tabular-nums text-muted-foreground">
                        {currency} {Number(product.price || 0).toFixed(2)} x {quantity} ={' '}
                        <span className="font-bold text-foreground">
                          {currency} {(Number(product.price || 0) * quantity).toFixed(2)}
                        </span>
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => updateCartQty(product, -1)}
                        className="h-7 w-7 rounded-md"
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-6 text-center text-xs font-mono font-black tabular-nums">{quantity}</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        disabled={quantity >= Number(product.stock_shop || 0)}
                        onClick={() => updateCartQty(product, 1)}
                        className="h-7 w-7 rounded-md"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => updateCartQty(product, -quantity)}
                        className="h-7 w-7 rounded-md text-rose-500 hover:text-rose-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Fulfillment Selector */}
              <div className="space-y-2">
                <Label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                  Fulfillment Method
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    aria-pressed={fulfillmentType === 'DELIVERY'}
                    onClick={() => setFulfillmentType('DELIVERY')}
                    className={cn(
                      'p-2.5 rounded-lg border text-left transition-colors',
                      fulfillmentType === 'DELIVERY'
                        ? 'bg-primary/10 border-primary text-foreground'
                        : 'bg-background border-border text-muted-foreground'
                    )}
                  >
                    <div className="flex items-center gap-1.5 text-xs font-black">
                      <Truck className="h-4 w-4 text-primary" />
                      <span>Delivery</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Min. {currency} {MIN_DELIVERY_AMOUNT}
                    </p>
                  </button>

                  <button
                    type="button"
                    aria-pressed={fulfillmentType === 'PICKUP'}
                    onClick={() => setFulfillmentType('PICKUP')}
                    className={cn(
                      'p-2.5 rounded-lg border text-left transition-colors',
                      fulfillmentType === 'PICKUP'
                        ? 'bg-primary/10 border-primary text-foreground'
                        : 'bg-background border-border text-muted-foreground'
                    )}
                  >
                    <div className="flex items-center gap-1.5 text-xs font-black">
                      <Store className="h-4 w-4 text-primary" />
                      <span>Store Pickup</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">No minimum limit</p>
                  </button>
                </div>

                {fulfillmentType === 'DELIVERY' && !deliveryMinimumMet && (
                  <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-semibold">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>
                      Add <strong>{currency} {deliveryShortfall.toFixed(2)}</strong> more for Delivery, or switch to{' '}
                      <strong>Store Pickup</strong>.
                    </span>
                  </div>
                )}

                {fulfillmentType === 'DELIVERY' && (
                  <div className="space-y-1.5">
                    <Label htmlFor="deliveryAddr" className="text-xs font-bold">
                      Delivery Address *
                    </Label>
                    <Input
                      id="deliveryAddr"
                      placeholder="House / Building / Road / Island"
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      className="h-9 bg-background border-border rounded-lg text-xs"
                    />
                  </div>
                )}

                <Input
                  placeholder="Order notes (optional)"
                  value={deliveryNotes}
                  onChange={(e) => setDeliveryNotes(e.target.value)}
                  className="h-9 bg-background border-border rounded-lg text-xs"
                />
              </div>

              {/* Payment Method Selector */}
              <div className="space-y-2">
                <Label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                  Payment Method
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    aria-pressed={paymentMethod === 'CASH_TRANSFER'}
                    onClick={() => setPaymentMethod('CASH_TRANSFER')}
                    className={cn(
                      'p-2.5 rounded-lg border text-left transition-colors',
                      paymentMethod === 'CASH_TRANSFER'
                        ? 'bg-primary/10 border-primary text-foreground'
                        : 'bg-background border-border text-muted-foreground'
                    )}
                  >
                    <div className="flex items-center gap-1.5 text-xs font-black">
                      <Banknote className="h-4 w-4 text-emerald-500" />
                      <span>Cash / Transfer</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Upload payment slip</p>
                  </button>

                  <button
                    type="button"
                    aria-pressed={paymentMethod === 'CREDIT'}
                    onClick={() => setPaymentMethod('CREDIT')}
                    className={cn(
                      'p-2.5 rounded-lg border text-left transition-colors',
                      paymentMethod === 'CREDIT'
                        ? 'bg-primary/10 border-primary text-foreground'
                        : 'bg-background border-border text-muted-foreground'
                    )}
                  >
                    <div className="flex items-center gap-1.5 text-xs font-black">
                      <CreditCard className="h-4 w-4 text-amber-500" />
                      <span>Credit (ދަރަނި)</span>
                    </div>
                    <p className="text-[10px] font-mono tabular-nums text-muted-foreground mt-0.5">
                      Avail: {currency} {availableCredit.toFixed(2)}
                    </p>
                  </button>
                </div>

                {paymentMethod === 'CREDIT' && !canUseCredit && (
                  <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold">
                    Insufficient credit limit. Available credit: {currency} {availableCredit.toFixed(2)}. Please pay via Cash / Transfer.
                  </div>
                )}

                {paymentMethod === 'CASH_TRANSFER' && (
                  <div className="p-3 rounded-lg bg-muted border border-border space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs space-y-0.5">
                        <p className="font-black text-foreground">
                          {shopSettings.bankName || 'Bank Transfer Account'}
                        </p>
                        {shopSettings.accountName && (
                          <p className="text-muted-foreground">{shopSettings.accountName}</p>
                        )}
                        <p className="font-mono font-black text-primary tabular-nums">
                          {shopSettings.accountNumber || 'Contact store for account number'}
                        </p>
                      </div>
                      {shopSettings.accountNumber && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleCopyAccountNumber}
                          className="h-8 px-2.5 rounded-lg text-xs font-bold gap-1 shrink-0"
                        >
                          {copiedAccount ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                          <span>{copiedAccount ? 'Copied' : 'Copy'}</span>
                        </Button>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="orderSlipUpload" className="text-xs font-bold flex items-center gap-1.5">
                        <Upload className="h-3.5 w-3.5 text-primary" />
                        <span>Upload Payment Slip (Required) *</span>
                      </Label>
                      <Input
                        id="orderSlipUpload"
                        type="file"
                        accept="image/*,.pdf"
                        onChange={handleSlipSelected}
                        className="h-9 bg-background border-border rounded-lg text-xs file:mr-2 file:text-xs file:font-bold"
                      />
                      {slipPreviewUrl && (
                        <img
                          src={slipPreviewUrl}
                          alt="Slip preview"
                          className="max-h-32 rounded-lg border border-border object-contain mt-1"
                        />
                      )}
                      {slipFile && !slipPreviewUrl && (
                        <p className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                          <FileImage className="h-3.5 w-3.5" /> {slipFile.name}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Total & Submit */}
              <div className="pt-3 border-t border-border space-y-3">
                <div className="flex items-center justify-between text-sm font-black">
                  <span>Order Total</span>
                  <span className="font-mono text-lg tabular-nums text-primary">
                    {currency} {cartSubtotal.toFixed(2)}
                  </span>
                </div>
                <Button
                  type="button"
                  disabled={
                    isPlacingOrder ||
                    !isStoreOpen ||
                    !deliveryMinimumMet ||
                    (paymentMethod === 'CREDIT' && !canUseCredit) ||
                    (paymentMethod === 'CASH_TRANSFER' && !slipFile)
                  }
                  onClick={handlePlaceOrder}
                  className="w-full h-11 rounded-lg font-black text-sm"
                >
                  {isPlacingOrder ? 'Placing Order...' : 'Confirm & Place Order'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* My Orders & Live Status Tracker Dialog */}
      <Dialog open={isOrdersOpen} onOpenChange={setIsOrdersOpen}>
        <DialogContent className="sm:max-w-lg w-[calc(100vw-1.5rem)] max-h-[85vh] overflow-y-auto bg-card border-border rounded-xl p-5 font-faruma" dir="ltr">
          <DialogHeader>
            <DialogTitle className="text-lg font-black flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              <span>My Orders & Live Status</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Track your orders in real time or reorder in 1 tap.
            </DialogDescription>
          </DialogHeader>

          {isLoadingOrders ? (
            <div className="py-8 text-center text-xs text-muted-foreground">Loading your orders...</div>
          ) : orders.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">You have not placed any online orders yet.</div>
          ) : (
            <div className="space-y-3 pt-2">
              {orders.map((order) => {
                const badge = STATUS_BADGE_MAP[order.status] || STATUS_BADGE_MAP.NEW;
                return (
                  <div
                    key={order.id}
                    className="p-3.5 rounded-xl bg-background border border-border space-y-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-xs font-mono font-black">{order.order_number}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(order.created_at).toLocaleString()}
                        </p>
                      </div>
                      <span className={cn('text-[10px] font-black px-2 py-0.5 rounded-md border', badge.className)}>
                        {badge.label}
                      </span>
                    </div>

                    <div className="text-xs space-y-1 border-t border-border/60 pt-2">
                      {(order.items || []).map((it, idx) => (
                        <div key={idx} className="flex justify-between gap-2">
                          <span className="truncate">
                            {it.name_en} <span className="text-muted-foreground">x{it.quantity}</span>
                          </span>
                          <span className="font-mono tabular-nums shrink-0">
                            {currency} {Number(it.line_total).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/60">
                      <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                        <span>{order.fulfillment_type}</span>
                        <span>•</span>
                        <span>{order.payment_method === 'CREDIT' ? 'Credit' : 'Cash/Transfer'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-xs tabular-nums">
                          {currency} {Number(order.total).toFixed(2)}
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleReorder(order)}
                          className="h-7 px-2.5 rounded-lg text-[10px] font-black gap-1"
                        >
                          <RotateCcw className="h-3 w-3" />
                          <span>Reorder</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Connect Telegram Dialog */}
      <Dialog open={isTelegramConnectOpen} onOpenChange={setIsTelegramConnectOpen}>
        <DialogContent className="sm:max-w-md w-[calc(100vw-1.5rem)] bg-card border-border rounded-xl p-5 font-faruma" dir="ltr">
          <DialogHeader>
            <DialogTitle className="text-lg font-black flex items-center gap-2">
              <Send className="h-5 w-5 text-[#229ED9]" />
              <span>Connect Telegram</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Link your Telegram account to receive instant order status updates and credit receipts.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2 text-center">
            <div className="mx-auto w-fit p-3 rounded-xl bg-white border border-border">
              <QRCodeSVG
                value={generateTelegramConnectLink(customer.id, botUsername)}
                size={168}
                level="M"
              />
            </div>

            <p className="text-xs text-muted-foreground">
              Tap the button below (or scan the QR code), then press <strong className="text-foreground">Start</strong> in Telegram.
            </p>

            <div className="flex flex-col sm:flex-row gap-2">
              <a
                href={generateTelegramConnectLink(customer.id, botUsername)}
                target="_blank"
                rel="noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-lg bg-[#229ED9] hover:bg-[#1e8cc2] text-white text-xs font-black transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
                <span>Open Telegram &amp; Connect</span>
              </a>
              <Button
                type="button"
                variant="outline"
                disabled={isCheckingTelegram}
                onClick={handleCheckTelegramLink}
                className="h-10 px-4 rounded-lg text-xs font-black gap-1.5"
              >
                <RefreshCw className={cn('h-3.5 w-3.5', isCheckingTelegram && 'animate-spin')} />
                <span>{isCheckingTelegram ? 'Checking...' : 'Verify Link'}</span>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ShopHelperMascot
        isLoggedIn={true}
        onSelectEssentials={() => setSelectedCategory('ESSENTIALS')}
        onOpenCart={() => setIsCartOpen(true)}
      />
    </div>
  );
};

export default Shop;

