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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { Customer, Product, ShopSettings } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import { showError, showSuccess } from '@/utils/toast';
import {
  MIN_DELIVERY_AMOUNT,
  OnlineOrder,
  OnlineOrderItem,
  checkRegistrationStatus,
  fetchCustomerOrders,
  fetchPublicShopData,
  loginShopCustomer,
  placeOnlineOrder,
  refreshShopCustomer,
  submitCustomerRegistration,
  uploadOrderSlip,
} from '@/services/onlineShopService';

interface CartEntry {
  product: Product;
  quantity: number;
}

const SESSION_STORAGE_KEY = 'bback_shop_customer_session_v1';

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

  const currency = shopSettings.currency || 'MVR';
  const isStoreOpen = shopSettings.onlineShopEnabled !== false;

  const loadShop = async () => {
    setIsLoading(true);
    try {
      const data = await fetchPublicShopData();
      setProducts(data.products);
      setShopSettings(data.shopSettings);
      setBotToken(data.telegramBotToken);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadShop();
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
    return ['ALL', ...Array.from(cats).sort()];
  }, [products]);

  const filteredProducts = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return products.filter((p) => {
      if (selectedCategory !== 'ALL' && p.category !== selectedCategory) return false;
      if (!q) return true;
      return (
        (p.name_en || '').toLowerCase().includes(q) ||
        (p.name_dv || '').toLowerCase().includes(q) ||
        (p.item_code || '').toLowerCase().includes(q) ||
        (p.barcode || '').toLowerCase().includes(q)
      );
    });
  }, [products, searchTerm, selectedCategory]);

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
      const res = await loginShopCustomer(loginCode, loginPhone);
      if (res.ok && res.customer) {
        setCustomer(res.customer);
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(res.customer));
        showSuccess(`Welcome back, ${res.customer.name_en || res.customer.name_dv}!`);
      } else {
        showError(res.error || 'Login failed');
      }
    } finally {
      setIsLoggingIn(false);
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
        `Approved! ${res.name_en} — Your Customer Code is #${res.assigned_code}. You can login now!`
      );
      setLoginCode(res.assigned_code || '');
      setLoginPhone(statusCheckPhone);
    } else if (res.status === 'REJECTED') {
      setStatusCheckResult('Registration was declined. Please contact the store.');
    } else {
      setStatusCheckResult('Still pending Admin approval. Please check again shortly.');
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
  // UNAUTHENTICATED VIEW: LOGIN / REGISTER
  // ============================================================================
  if (!customer) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4 sm:p-6 font-faruma" dir="ltr">
        <div className="w-full max-w-md space-y-4">
          {/* Store Branding */}
          <div className="text-center space-y-2">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 border border-primary/25 flex items-center justify-center text-primary">
              <ShoppingBag className="h-7 w-7" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-foreground">
              {shopSettings.shopName || 'B BACK'} Online Shop
            </h1>
            <p className="text-xs text-muted-foreground">
              shop.bback.store • Login with your Customer Code & Mobile Number
            </p>
          </div>

          <div className="bg-card border border-border rounded-xl p-5 sm:p-6 shadow-sm space-y-5">
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
                <Button
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full h-11 rounded-lg font-black text-sm"
                >
                  {isLoggingIn ? 'Signing in...' : 'Sign In & Start Shopping'}
                </Button>
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
        </div>
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
          {shopSettings.onlineShopClosedMessage ||
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

        {/* Search & Category Filter */}
        <div className="flex flex-col sm:flex-row gap-2.5 bg-card border border-border rounded-xl p-2.5">
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
                    : 'bg-muted text-muted-foreground border-border hover:text-foreground'
                )}
              >
                {cat === 'ALL' ? 'All Items' : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {filteredProducts.map((product) => {
            const stock = Number(product.stock_shop || 0);
            const inCartQty = cart[product.id]?.quantity || 0;
            const outOfStock = stock <= 0;

            return (
              <article
                key={product.id}
                className="bg-card border border-border rounded-xl overflow-hidden flex flex-col justify-between p-3 gap-2.5 hover:border-primary/40 transition-colors"
              >
                <header className="space-y-2">
                  <div className="aspect-square rounded-lg bg-muted border border-border/60 overflow-hidden flex items-center justify-center relative">
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.name_en || product.name_dv}
                        loading="lazy"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ShoppingBag className="h-8 w-8 text-muted-foreground/40" />
                    )}
                    {outOfStock && (
                      <span className="absolute inset-0 bg-background/75 flex items-center justify-center text-[11px] font-black text-rose-600 dark:text-rose-400">
                        Out of Stock
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-black text-foreground line-clamp-2 leading-snug">
                      {product.name_en || product.name_dv}
                    </h3>
                    {product.name_dv && (
                      <p className="text-[11px] text-muted-foreground font-bold truncate mt-0.5">
                        {product.name_dv}
                      </p>
                    )}
                  </div>
                </header>

                <footer className="space-y-2 pt-1 border-t border-border/60">
                  <div className="flex items-baseline justify-between gap-1">
                    <span className="font-mono font-black text-sm tabular-nums text-primary">
                      {currency} {Number(product.price || 0).toFixed(2)}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono tabular-nums">
                      {outOfStock ? '0 left' : `${stock} left`}
                    </span>
                  </div>

                  {inCartQty > 0 ? (
                    <div className="flex items-center justify-between gap-1 bg-muted rounded-lg p-1 border border-border">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => updateCartQty(product, -1)}
                        className="h-7 w-7 rounded-md"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </Button>
                      <span className="font-mono font-black text-xs tabular-nums">{inCartQty}</span>
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
                      className="w-full h-8 rounded-lg text-xs font-black gap-1"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Add</span>
                    </Button>
                  )}
                </footer>
              </article>
            );
          })}
        </div>

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
    </div>
  );
};

export default Shop;

