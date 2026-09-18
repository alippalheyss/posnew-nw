"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Search, 
  Camera, 
  QrCode, 
  AlertTriangle, 
  Plus, 
  Minus, 
  Trash2, 
  Share2, 
  Save, 
  FileSpreadsheet, 
  RotateCcw, 
  Store, 
  Warehouse, 
  User as UserIcon, 
  X, 
  ChevronDown,
  ChevronUp,
  Boxes,
  Loader2,
  CheckCircle2,
  Flashlight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { QRCodeSVG } from 'qrcode.react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import * as XLSX from 'xlsx';
import { useAppContext, Product } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { showSuccess, showError, showInfo } from '@/utils/toast';
import { formatCurrency } from '@/utils/formatters';
import { cn } from '@/lib/utils';

export interface AuditEntry {
  id: string;
  counterName: string;
  quantity: number;
  location: 'shop' | 'godown';
  unitName?: string;
  unitMultiplier?: number;
  timestamp: string;
  note?: string;
}

export interface ProductAuditState {
  productId: string;
  entries: AuditEntry[];
  totalShopCounted: number;
  totalGodownCounted: number;
  totalCounted: number;
  lastUpdated: string;
}

export interface ActiveAuditSession {
  id: string;
  title: string;
  startedAt: string;
  status: 'active' | 'completed';
  items: Record<string, ProductAuditState>;
}

// Crisp beep synthesizer
const playBeep = (freq = 880, type: OscillatorType = 'sine', duration = 0.12) => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (e) {}
};

// Memoized Individual Product Card (Light Mode)
interface ProductAuditCardProps {
  product: Product;
  auditItem?: ProductAuditState;
  isExpanded: boolean;
  onToggleExpand: (productId: string) => void;
  onQuickAdd: (product: Product, qty: number, location: 'shop' | 'godown') => void;
  onOpenCustomCount: (product: Product) => void;
  onDeleteEntry: (productId: string, entryId: string) => void;
}

const ProductAuditCard = React.memo<ProductAuditCardProps>(({
  product,
  auditItem,
  isExpanded,
  onToggleExpand,
  onQuickAdd,
  onOpenCustomCount,
  onDeleteEntry
}) => {
  const isCounted = !!auditItem && auditItem.totalCounted > 0;
  const systemShop = product.stock_shop || 0;
  const systemGodown = product.stock_godown || 0;
  const totalSystem = systemShop + systemGodown;
  const countedTotal = isCounted ? auditItem.totalCounted : 0;
  const variance = isCounted ? (countedTotal - totalSystem) : 0;

  return (
    <Card 
      className={cn(
        "bg-white border transition-colors duration-150 overflow-hidden shadow-sm rounded-2xl",
        isCounted 
          ? (variance === 0 ? "border-emerald-300 bg-emerald-50/40" : "border-amber-300 bg-amber-50/40")
          : "border-slate-200 hover:border-slate-300"
      )}
    >
      <CardContent className="p-3.5 space-y-2.5">
        {/* Header: Dhivehi + English Name & Status Badge */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 text-right">
            <div className="flex items-center justify-end gap-2 flex-wrap">
              <h3 className="text-base font-black text-slate-900 leading-tight">{product.name_dv}</h3>
              {isCounted && (
                <Badge 
                  className={cn(
                    "text-[10px] font-black px-2 py-0.5 rounded-full border shadow-none",
                    variance === 0 
                      ? "bg-emerald-100 text-emerald-800 border-emerald-300" 
                      : (variance > 0 ? "bg-cyan-100 text-cyan-800 border-cyan-300" : "bg-rose-100 text-rose-800 border-rose-300")
                  )}
                >
                  {variance === 0 ? "✓ Matched" : (variance > 0 ? `+${variance} Over` : `${variance} Short`)}
                </Badge>
              )}
            </div>
            <p className="text-xs font-bold text-slate-600 font-sans mt-0.5">{product.name_en}</p>
            <div className="flex items-center justify-end gap-3 text-[11px] text-slate-500 font-sans mt-1">
              {product.barcode && <span>Barcode: <strong className="text-slate-800 font-mono">{product.barcode}</strong></span>}
              {product.item_code && <span>Code: <strong className="text-slate-800 font-mono">{product.item_code}</strong></span>}
              <span>Price: <strong className="text-primary font-black">{formatCurrency(product.price)}</strong></span>
            </div>
          </div>
        </div>

        {/* Stock Comparison Grid (Light Theme) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 font-sans text-xs">
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase">System Shop</span>
            <p className="font-black text-slate-800">{systemShop} pcs</p>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase">System Godown</span>
            <p className="font-black text-slate-800">{systemGodown} pcs</p>
          </div>
          <div className="border-t sm:border-t-0 sm:border-r border-slate-200 pt-1 sm:pt-0 sm:pr-2">
            <span className="text-[10px] text-slate-500 font-bold uppercase">Total Counted</span>
            <p className={cn("font-black text-sm", isCounted ? "text-emerald-700" : "text-slate-400")}>
              {isCounted ? `${countedTotal} pcs` : 'Not counted'}
            </p>
          </div>
          <div className="border-t sm:border-t-0 sm:border-r border-slate-200 pt-1 sm:pt-0 sm:pr-2">
            <span className="text-[10px] text-slate-500 font-bold uppercase">Variance</span>
            <p className={cn("font-black text-sm", variance === 0 ? "text-slate-500" : (variance > 0 ? "text-cyan-700" : "text-rose-600"))}>
              {isCounted ? `${variance > 0 ? '+' : ''}${variance} pcs` : '-'}
            </p>
          </div>
        </div>

        {/* Quick Add Buttons & Custom Count */}
        <div className="flex flex-wrap items-center justify-between gap-1.5 pt-0.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-slate-500 font-bold font-sans">Quick:</span>
            {[1, 5, 10, 12, 24].map((q) => (
              <Button
                key={q}
                size="sm"
                variant="outline"
                onClick={() => onQuickAdd(product, q, 'shop')}
                className="h-8 px-2.5 rounded-xl bg-slate-100 hover:bg-primary hover:text-white text-slate-800 border-slate-300 text-xs font-black transition-colors"
              >
                +{q}
              </Button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 mr-auto">
            <Button
              size="sm"
              onClick={() => onOpenCustomCount(product)}
              className="h-8 px-3 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-black gap-1 shadow-sm"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Custom</span>
            </Button>

            {auditItem && auditItem.entries.length > 0 && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onToggleExpand(product.id)}
                className="h-8 w-8 p-0 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200"
                title="View Count History"
              >
                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            )}
          </div>
        </div>

        {/* Expanded Count Log */}
        {isExpanded && auditItem && auditItem.entries.length > 0 && (
          <div className="mt-2 pt-2 border-t border-slate-200 space-y-1.5 font-sans text-xs">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Entries ({auditItem.entries.length}):</p>
            <div className="space-y-1 max-h-36 overflow-y-auto custom-scrollbar">
              {auditItem.entries.map((entry) => (
                <div 
                  key={entry.id}
                  className="flex items-center justify-between p-2 rounded-xl bg-slate-100 border border-slate-200 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => onDeleteEntry(product.id, entry.id)}
                      className="h-6 w-6 text-red-500 hover:bg-red-100 rounded-lg"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                    <span className="font-bold text-emerald-700">+{entry.quantity} pcs</span>
                    <Badge variant="outline" className="text-[9px] h-4 py-0 uppercase bg-white border-slate-300 text-slate-700">
                      {entry.location}
                    </Badge>
                  </div>
                  <div className="text-right text-[11px] text-slate-600">
                    <strong className="text-slate-800">{entry.counterName}</strong> • {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

const StockAudit: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { products, updateProduct } = useAppContext();
  const { currentUser } = useAuth();

  // Counter identification
  const [counterName, setCounterName] = useState<string>(() => {
    return localStorage.getItem('stock_audit_counter_name') || currentUser?.name_en || currentUser?.username || 'Staff ' + Math.floor(100 + Math.random() * 900);
  });
  const [isCounterNameDialogOpen, setIsCounterNameDialogOpen] = useState(false);
  const [tempCounterName, setTempCounterName] = useState(counterName);

  // Audit state
  const [auditSession, setAuditSession] = useState<ActiveAuditSession>({
    id: 'audit-session-current',
    title: 'Shop Stock Audit',
    startedAt: new Date().toISOString(),
    status: 'active',
    items: {}
  });

  const [isRealtimeActive, setIsRealtimeActive] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'counted' | 'uncounted' | 'discrepancy'>('all');

  // Virtual pagination limit (renders in 30 item chunks)
  const [visibleLimit, setVisibleLimit] = useState<number>(30);

  // Html5Qrcode Scanner modal state
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const [isScannerRunning, setIsScannerRunning] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);

  // Quick Count Modal
  const [activeCountingProduct, setActiveCountingProduct] = useState<Product | null>(null);
  const [countInput, setCountInput] = useState<string>('1');
  const [countLocation, setCountLocation] = useState<'shop' | 'godown'>('shop');
  const [selectedUnitMultiplier, setSelectedUnitMultiplier] = useState<number>(1);
  const [selectedUnitName, setSelectedUnitName] = useState<string>('Piece (NOS)');

  // Modals
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isCommitModalOpen, setIsCommitModalOpen] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [commitOnlyCounted, setCommitOnlyCounted] = useState(true);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [expandedProductIds, setExpandedProductIds] = useState<Record<string, boolean>>({});

  // Sync debounce ref
  const syncTimeoutRef = useRef<any>(null);

  // 1. Load active audit session
  useEffect(() => {
    let isMounted = true;

    const loadAuditSession = async () => {
      try {
        if (supabase) {
          const { data, error } = await supabase
            .from('settings')
            .select('id, category, settings')
            .eq('category', 'active_stock_audit')
            .maybeSingle();

          if (!error && data?.settings && isMounted) {
            const session = (data.settings as any)?.session || data.settings;
            if (session) {
              setAuditSession(session as ActiveAuditSession);
              localStorage.setItem('cached_stock_audit', JSON.stringify(session));
              return;
            }
          }
        }
      } catch (err) {
        console.warn('Note loading audit session:', err);
      }

      try {
        const cached = localStorage.getItem('cached_stock_audit');
        if (cached && isMounted) {
          setAuditSession(JSON.parse(cached));
        }
      } catch (e) {}
    };

    loadAuditSession();
    return () => { isMounted = false; };
  }, []);

  // 2. Realtime Channel setup
  useEffect(() => {
    if (!supabase) return;

    const channel = supabase.channel('stock_audit_room', {
      config: { broadcast: { self: false } }
    });

    channel
      .on('broadcast', { event: 'audit_update' }, ({ payload }) => {
        if (payload?.session) {
          setAuditSession(payload.session);
          localStorage.setItem('cached_stock_audit', JSON.stringify(payload.session));
          showInfo(`Live count update from ${payload.sender || 'another user'}`);
          playBeep(1200, 'sine', 0.08);
        }
      })
      .subscribe((status) => {
        setIsRealtimeActive(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // 3. Debounced cloud save & broadcast
  const saveAuditSessionDebounced = useCallback((newSession: ActiveAuditSession, sender = counterName) => {
    setAuditSession(newSession);
    localStorage.setItem('cached_stock_audit', JSON.stringify(newSession));

    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    syncTimeoutRef.current = setTimeout(async () => {
      if (supabase) {
        try {
          const { data: existing } = await supabase
            .from('settings')
            .select('id')
            .eq('category', 'active_stock_audit')
            .maybeSingle();

          const payload = {
            category: 'active_stock_audit',
            settings: { session: newSession },
            updated_at: new Date().toISOString()
          };

          if (existing?.id) {
            await supabase.from('settings').update(payload).eq('id', existing.id);
          } else {
            await supabase.from('settings').insert({ ...payload, id: crypto.randomUUID() });
          }

          const channel = supabase.channel('stock_audit_room');
          channel.send({
            type: 'broadcast',
            event: 'audit_update',
            payload: { session: newSession, sender }
          });
        } catch (err) {
          console.warn('Note saving stock audit to cloud:', err);
        }
      }
    }, 300);
  }, [counterName]);

  // 4. Additive count handler
  const handleAddCount = useCallback((
    product: Product, 
    qty: number, 
    location: 'shop' | 'godown' = 'shop',
    unitName = 'Piece (NOS)',
    unitMultiplier = 1
  ) => {
    if (isNaN(qty) || qty <= 0) return;

    const effectiveQty = qty * unitMultiplier;
    const newEntry: AuditEntry = {
      id: `entry-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      counterName: counterName.trim() || 'Staff',
      quantity: effectiveQty,
      location,
      unitName: unitMultiplier > 1 ? `${qty} × ${unitName} (${effectiveQty} pcs)` : unitName,
      unitMultiplier,
      timestamp: new Date().toISOString()
    };

    setAuditSession(prev => {
      const existingItem = prev.items[product.id] || {
        productId: product.id,
        entries: [],
        totalShopCounted: 0,
        totalGodownCounted: 0,
        totalCounted: 0,
        lastUpdated: new Date().toISOString()
      };

      const updatedEntries = [newEntry, ...existingItem.entries];
      const totalShopCounted = updatedEntries
        .filter(e => e.location === 'shop')
        .reduce((sum, e) => sum + e.quantity, 0);
      const totalGodownCounted = updatedEntries
        .filter(e => e.location === 'godown')
        .reduce((sum, e) => sum + e.quantity, 0);
      const totalCounted = totalShopCounted + totalGodownCounted;

      const updatedSession: ActiveAuditSession = {
        ...prev,
        items: {
          ...prev.items,
          [product.id]: {
            productId: product.id,
            entries: updatedEntries,
            totalShopCounted,
            totalGodownCounted,
            totalCounted,
            lastUpdated: new Date().toISOString()
          }
        }
      };

      saveAuditSessionDebounced(updatedSession);
      return updatedSession;
    });

    playBeep(980, 'sine', 0.08);
    showSuccess(`+${effectiveQty} added to ${product.name_en}`);
  }, [counterName, saveAuditSessionDebounced]);

  // Delete individual entry
  const handleDeleteEntry = useCallback((productId: string, entryId: string) => {
    setAuditSession(prev => {
      const item = prev.items[productId];
      if (!item) return prev;

      const updatedEntries = item.entries.filter(e => e.id !== entryId);
      const totalShopCounted = updatedEntries
        .filter(e => e.location === 'shop')
        .reduce((sum, e) => sum + e.quantity, 0);
      const totalGodownCounted = updatedEntries
        .filter(e => e.location === 'godown')
        .reduce((sum, e) => sum + e.quantity, 0);
      const totalCounted = totalShopCounted + totalGodownCounted;

      const newItems = { ...prev.items };
      if (updatedEntries.length === 0) {
        delete newItems[productId];
      } else {
        newItems[productId] = {
          ...item,
          entries: updatedEntries,
          totalShopCounted,
          totalGodownCounted,
          totalCounted,
          lastUpdated: new Date().toISOString()
        };
      }

      const updatedSession = { ...prev, items: newItems };
      saveAuditSessionDebounced(updatedSession);
      return updatedSession;
    });

    showSuccess('Count entry removed');
  }, [saveAuditSessionDebounced]);

  // Toggle card expansion
  const handleToggleExpand = useCallback((productId: string) => {
    setExpandedProductIds(prev => ({ ...prev, [productId]: !prev[productId] }));
  }, []);

  // Open custom modal
  const handleOpenCustomCount = useCallback((product: Product) => {
    setActiveCountingProduct(product);
    setCountInput('1');
    setCountLocation('shop');
    setSelectedUnitMultiplier(1);
    setSelectedUnitName('Piece (NOS)');
  }, []);

  // 5. Html5Qrcode Barcode Scanner setup
  const startCameraScanner = () => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setScannerError(null);
    setIsScannerOpen(true);
  };

  const stopCameraScanner = useCallback(async () => {
    // 1. Immediately kill media tracks on active video elements to release hardware
    try {
      const videoElements = document.querySelectorAll('#stock-audit-qr-reader video');
      videoElements.forEach(v => {
        const video = v as HTMLVideoElement;
        if (video.srcObject) {
          const stream = video.srcObject as MediaStream;
          stream.getTracks().forEach(track => {
            try { track.stop(); } catch (e) {}
          });
          video.srcObject = null;
        }
      });
    } catch (e) {}

    // 2. Stop and clear Html5Qrcode instance safely
    const qrInstance = html5QrCodeRef.current;
    html5QrCodeRef.current = null;
    if (qrInstance) {
      try {
        if (qrInstance.isScanning) {
          await qrInstance.stop().catch(() => {});
        }
      } catch (e) {}
      try {
        qrInstance.clear();
      } catch (e) {}
    }

    setIsScannerRunning(false);
    setIsScannerOpen(false);
    setScannerError(null);

    // Guarantee document body pointer-events and scroll restore
    setTimeout(() => {
      document.body.style.pointerEvents = 'auto';
      document.body.style.overflow = 'auto';
    }, 50);
  }, []);

  useEffect(() => {
    let html5QrCode: Html5Qrcode | null = null;
    let isMounted = true;

    if (isScannerOpen) {
      const timer = setTimeout(async () => {
        try {
          const container = document.getElementById('stock-audit-qr-reader');
          if (!container || !isMounted) return;

          html5QrCode = new Html5Qrcode('stock-audit-qr-reader', {
            formatsToSupport: [
              Html5QrcodeSupportedFormats.EAN_13,
              Html5QrcodeSupportedFormats.EAN_8,
              Html5QrcodeSupportedFormats.CODE_128,
              Html5QrcodeSupportedFormats.CODE_39,
              Html5QrcodeSupportedFormats.UPC_A,
              Html5QrcodeSupportedFormats.UPC_E,
              Html5QrcodeSupportedFormats.UPC_EAN_EXTENSION,
              Html5QrcodeSupportedFormats.ITF,
              Html5QrcodeSupportedFormats.QR_CODE
            ],
            verbose: false
          });
          html5QrCodeRef.current = html5QrCode;

          const config = {
            fps: 15,
            qrbox: { width: 250, height: 160 },
            aspectRatio: 1.3333
          };

          await html5QrCode.start(
            { facingMode: 'environment' },
            config,
            (decodedText) => {
              if (decodedText && isMounted) {
                handleScannedCode(decodedText);
              }
            },
            () => {}
          );
          if (isMounted) setIsScannerRunning(true);
        } catch (err: any) {
          console.error('Html5Qrcode start error:', err);
          if (isMounted) setScannerError(err?.message || 'Could not access camera. Please allow camera permissions.');
        }
      }, 250);

      return () => {
        isMounted = false;
        clearTimeout(timer);
        try {
          const videoElements = document.querySelectorAll('#stock-audit-qr-reader video');
          videoElements.forEach(v => {
            const video = v as HTMLVideoElement;
            if (video.srcObject) {
              const stream = video.srcObject as MediaStream;
              stream.getTracks().forEach(track => {
                try { track.stop(); } catch (e) {}
              });
              video.srcObject = null;
            }
          });
        } catch (e) {}

        if (html5QrCode) {
          html5QrCode.stop().catch(() => {}).finally(() => {
            try {
              html5QrCode?.clear();
            } catch (e) {}
          });
        }
        setTimeout(() => {
          document.body.style.pointerEvents = 'auto';
          document.body.style.overflow = 'auto';
        }, 50);
      };
    }
  }, [isScannerOpen]);

  const handleScannedCode = async (code: string) => {
    await stopCameraScanner();
    playBeep(1050, 'sine', 0.15);
    try {
      if (navigator.vibrate) navigator.vibrate(100);
    } catch (e) {}

    const cleanCode = code.trim().toLowerCase();
    const matchedProduct = products.find(p => 
      p.barcode?.toLowerCase() === cleanCode || 
      p.item_code?.toLowerCase() === cleanCode
    );

    if (matchedProduct) {
      setTimeout(() => {
        handleOpenCustomCount(matchedProduct);
        showSuccess(`Scanned: ${matchedProduct.name_en}`);
      }, 100);
    } else {
      setSearchTerm(cleanCode);
      showError(`No product found with barcode "${code}". Filtered in search.`);
    }
  };

  // Filtered Products (Fast indexing)
  const filteredProducts = useMemo(() => {
    const search = searchTerm.toLowerCase().trim();

    return products.filter(product => {
      if (search) {
        const matches = 
          product.name_en?.toLowerCase().includes(search) ||
          product.name_dv?.toLowerCase().includes(search) ||
          product.barcode?.toLowerCase().includes(search) ||
          product.item_code?.toLowerCase().includes(search);
        if (!matches) return false;
      }

      if (filterMode !== 'all') {
        const auditItem = auditSession.items[product.id];
        const isCounted = !!auditItem && auditItem.totalCounted > 0;
        const totalSystemStock = (product.stock_shop || 0) + (product.stock_godown || 0);
        const variance = isCounted ? (auditItem.totalCounted - totalSystemStock) : 0;
        const hasDiscrepancy = isCounted && variance !== 0;

        if (filterMode === 'counted') return isCounted;
        if (filterMode === 'uncounted') return !isCounted;
        if (filterMode === 'discrepancy') return hasDiscrepancy;
      }

      return true;
    });
  }, [products, searchTerm, filterMode, auditSession.items]);

  // Sliced products for ultra-fast DOM rendering
  const visibleProducts = useMemo(() => {
    return filteredProducts.slice(0, visibleLimit);
  }, [filteredProducts, visibleLimit]);

  useEffect(() => {
    setVisibleLimit(30);
  }, [searchTerm, filterMode]);

  // Statistics
  const stats = useMemo(() => {
    const totalProducts = products.length;
    let countedCount = 0;
    let discrepancyCount = 0;
    let totalVarianceValue = 0;

    products.forEach(p => {
      const item = auditSession.items[p.id];
      const systemStock = (p.stock_shop || 0) + (p.stock_godown || 0);
      if (item && item.totalCounted > 0) {
        countedCount++;
        const diff = item.totalCounted - systemStock;
        if (diff !== 0) {
          discrepancyCount++;
          totalVarianceValue += diff * (p.cost_price || p.price || 0);
        }
      }
    });

    const uncountedCount = Math.max(0, totalProducts - countedCount);
    const progressPercent = totalProducts > 0 ? Math.round((countedCount / totalProducts) * 100) : 0;

    return {
      totalProducts,
      countedCount,
      uncountedCount,
      discrepancyCount,
      totalVarianceValue,
      progressPercent
    };
  }, [products, auditSession.items]);

  // Commit audit to inventory
  const handleCommitAudit = async () => {
    setIsCommitting(true);
    try {
      let updatedCount = 0;
      const productsToUpdate = products.filter(p => {
        const item = auditSession.items[p.id];
        return commitOnlyCounted ? (item && item.totalCounted > 0) : true;
      });

      for (const product of productsToUpdate) {
        const item = auditSession.items[product.id];
        let newShopStock = product.stock_shop || 0;
        let newGodownStock = product.stock_godown || 0;

        if (item) {
          if (item.totalShopCounted > 0 || item.totalGodownCounted > 0) {
            newShopStock = item.totalShopCounted;
            newGodownStock = item.totalGodownCounted;
          } else {
            newShopStock = item.totalCounted;
          }
        } else if (!commitOnlyCounted) {
          newShopStock = 0;
          newGodownStock = 0;
        }

        await updateProduct({
          ...product,
          stock_shop: Math.max(0, Math.round(newShopStock)),
          stock_godown: Math.max(0, Math.round(newGodownStock))
        });
        updatedCount++;
      }

      const completedSession: ActiveAuditSession = {
        ...auditSession,
        status: 'completed'
      };
      saveAuditSessionDebounced(completedSession);

      showSuccess(`Audit committed! ${updatedCount} products updated in live stock.`);
      setIsCommitModalOpen(false);
    } catch (err: any) {
      showError(err?.message || 'Failed to commit audit');
    } finally {
      setIsCommitting(false);
    }
  };

  // Reset session
  const handleResetAudit = () => {
    const newSession: ActiveAuditSession = {
      id: `audit-${Date.now()}`,
      title: `Stock Audit ${new Date().toLocaleDateString()}`,
      startedAt: new Date().toISOString(),
      status: 'active',
      items: {}
    };
    saveAuditSessionDebounced(newSession);
    setIsResetModalOpen(false);
    showSuccess('Audit session reset. Fresh count started.');
  };

  // Export Excel
  const handleExportExcel = () => {
    try {
      const rows = products.map(product => {
        const item = auditSession.items[product.id];
        const systemShop = product.stock_shop || 0;
        const systemGodown = product.stock_godown || 0;
        const totalSystem = systemShop + systemGodown;
        const countedShop = item ? item.totalShopCounted : 0;
        const countedGodown = item ? item.totalGodownCounted : 0;
        const totalCounted = item ? item.totalCounted : 0;
        const isCounted = !!item && totalCounted > 0;
        const diff = isCounted ? (totalCounted - totalSystem) : 0;
        const cost = product.cost_price || product.price || 0;

        return {
          'Item Code': product.item_code || '-',
          'Barcode': product.barcode || '-',
          'Product Name (EN)': product.name_en,
          'Product Name (DV)': product.name_dv,
          'Category': product.category || '-',
          'System Shop Stock': systemShop,
          'System Godown Stock': systemGodown,
          'Total System Stock': totalSystem,
          'Counted Shop': isCounted ? countedShop : '-',
          'Counted Godown': isCounted ? countedGodown : '-',
          'Total Counted': isCounted ? totalCounted : 'Not Counted',
          'Variance (Units)': isCounted ? diff : '-',
          'Cost Price (MVR)': cost,
          'Variance Value (MVR)': isCounted ? (diff * cost).toFixed(2) : '-'
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Stock Audit');
      XLSX.writeFile(workbook, `Stock_Audit_${new Date().toISOString().split('T')[0]}.xlsx`);
      showSuccess('Audit report exported to Excel!');
    } catch (err) {
      showError('Failed to export audit report');
    }
  };

  const auditShareUrl = window.location.origin + '/stock-audit';

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-faruma flex flex-col pb-24 selection:bg-primary/20" dir="rtl">
      {/* Top Header Bar (Light Mode) */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 px-3.5 py-2.5 shadow-sm">
        <div className="flex items-center justify-between gap-2 max-w-7xl mx-auto">
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate('/stock')}
              className="h-9 w-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-base font-black text-slate-900 leading-tight">ސްޓޮކް އޮޑިޓް</h1>
                <Badge className="bg-primary/15 text-primary border-primary/30 text-[9px] font-bold py-0 h-4 shadow-none">
                  Mobile
                </Badge>
              </div>
              <p className="text-[10px] text-slate-500 font-sans">Multi-Device Live Audit</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Live Indicator */}
            <div 
              className={cn(
                "flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border",
                isRealtimeActive 
                  ? "bg-emerald-50 text-emerald-700 border-emerald-300" 
                  : "bg-amber-50 text-amber-700 border-amber-300"
              )}
            >
              <span className={cn("h-1.5 w-1.5 rounded-full", isRealtimeActive ? "bg-emerald-600 animate-pulse" : "bg-amber-500")} />
              <span className="font-sans">{isRealtimeActive ? 'Live' : 'Local'}</span>
            </div>

            {/* Counter Name Pill */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setTempCounterName(counterName);
                setIsCounterNameDialogOpen(true);
              }}
              className="h-8 px-2.5 rounded-xl bg-slate-50 border-slate-300 hover:bg-slate-100 text-[11px] font-bold gap-1 text-slate-800"
            >
              <UserIcon className="h-3.5 w-3.5 text-primary" />
              <span className="max-w-[70px] truncate">{counterName}</span>
            </Button>

            {/* Share QR */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsShareModalOpen(true)}
              className="h-8 w-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700"
            >
              <QrCode className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-4 space-y-3">
        {/* Progress Dashboard (Light Mode) */}
        <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <span className="text-[10px] text-slate-500 font-bold uppercase">Audit Progress</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-black text-slate-900">{stats.countedCount}</span>
                <span className="text-xs text-slate-500">/ {stats.totalProducts} items ({stats.progressPercent}%)</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportExcel}
                className="h-8 px-2.5 rounded-xl bg-slate-50 border-slate-300 hover:bg-slate-100 text-xs font-bold gap-1 text-emerald-700"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                <span>Export</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsResetModalOpen(true)}
                className="h-8 px-2.5 rounded-xl bg-slate-50 border-slate-300 hover:bg-red-50 text-xs font-bold gap-1 text-red-600"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset</span>
              </Button>
            </div>
          </div>

          <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-amber-500 via-primary to-emerald-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${stats.progressPercent}%` }}
            />
          </div>

          <div className="grid grid-cols-3 gap-2 pt-0.5">
            <div className="bg-slate-50 p-2 rounded-xl border border-slate-200 text-center">
              <p className="text-[9px] text-slate-500 font-bold uppercase">Counted</p>
              <p className="text-sm font-black text-emerald-700">{stats.countedCount}</p>
            </div>
            <div className="bg-slate-50 p-2 rounded-xl border border-slate-200 text-center">
              <p className="text-[9px] text-slate-500 font-bold uppercase">Uncounted</p>
              <p className="text-sm font-black text-amber-700">{stats.uncountedCount}</p>
            </div>
            <div className="bg-slate-50 p-2 rounded-xl border border-slate-200 text-center">
              <p className="text-[9px] text-slate-500 font-bold uppercase">Discrepancy</p>
              <p className="text-sm font-black text-rose-600">{stats.discrepancyCount}</p>
            </div>
          </div>
        </div>

        {/* Search Bar + Barcode Scanner Trigger */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search product name, barcode, code..."
              className="h-12 pr-10 pl-9 rounded-2xl bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 font-bold text-sm shadow-sm"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <Button
            onClick={startCameraScanner}
            className="h-12 px-4 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black gap-1.5 shadow-md shrink-0 text-xs"
          >
            <Camera className="h-5 w-5" />
            <span className="hidden sm:inline">Scan Barcode</span>
            <span className="sm:hidden">Scan</span>
          </Button>
        </div>

        {/* Filter Chips (Light Mode) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar text-xs font-bold">
          <button
            onClick={() => setFilterMode('all')}
            className={cn(
              "px-3.5 py-2 rounded-xl border transition-colors whitespace-nowrap text-xs shadow-sm",
              filterMode === 'all'
                ? "bg-primary text-white border-primary font-black"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
            )}
          >
            All ({products.length})
          </button>
          <button
            onClick={() => setFilterMode('counted')}
            className={cn(
              "px-3.5 py-2 rounded-xl border transition-colors whitespace-nowrap text-xs shadow-sm",
              filterMode === 'counted'
                ? "bg-emerald-600 text-white border-emerald-600 font-black"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
            )}
          >
            Counted ({stats.countedCount})
          </button>
          <button
            onClick={() => setFilterMode('uncounted')}
            className={cn(
              "px-3.5 py-2 rounded-xl border transition-colors whitespace-nowrap text-xs shadow-sm",
              filterMode === 'uncounted'
                ? "bg-amber-600 text-white border-amber-600 font-black"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
            )}
          >
            Uncounted ({stats.uncountedCount})
          </button>
          <button
            onClick={() => setFilterMode('discrepancy')}
            className={cn(
              "px-3.5 py-2 rounded-xl border transition-colors whitespace-nowrap text-xs shadow-sm",
              filterMode === 'discrepancy'
                ? "bg-rose-600 text-white border-rose-600 font-black"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
            )}
          >
            Discrepancies ({stats.discrepancyCount})
          </button>
        </div>

        {/* Product List */}
        <div className="space-y-2.5">
          {visibleProducts.length === 0 ? (
            <div className="p-10 text-center rounded-2xl bg-white border border-slate-200 space-y-2 shadow-sm">
              <Boxes className="h-8 w-8 text-slate-400 mx-auto" />
              <p className="text-slate-600 font-bold text-sm">No products matched your search or filter</p>
            </div>
          ) : (
            visibleProducts.map((product) => (
              <ProductAuditCard
                key={product.id}
                product={product}
                auditItem={auditSession.items[product.id]}
                isExpanded={!!expandedProductIds[product.id]}
                onToggleExpand={handleToggleExpand}
                onQuickAdd={handleAddCount}
                onOpenCustomCount={handleOpenCustomCount}
                onDeleteEntry={handleDeleteEntry}
              />
            ))
          )}

          {/* Load More Button */}
          {visibleProducts.length < filteredProducts.length && (
            <div className="pt-2 text-center">
              <Button
                variant="outline"
                onClick={() => setVisibleLimit(prev => Math.min(filteredProducts.length, prev + 30))}
                className="w-full h-11 rounded-2xl bg-white border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-sm"
              >
                Load More ({filteredProducts.length - visibleProducts.length} remaining)
              </Button>
            </div>
          )}
        </div>
      </main>

      {/* Floating Bottom Apply Bar (Light Mode) */}
      <footer className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 p-3 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
          <Button
            onClick={startCameraScanner}
            className="h-12 px-5 rounded-2xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 font-bold gap-2 text-xs shadow-sm"
          >
            <Camera className="h-4 w-4 text-primary" />
            <span>Scan Barcode</span>
          </Button>

          <Button
            onClick={() => setIsCommitModalOpen(true)}
            disabled={stats.countedCount === 0}
            className="h-12 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black gap-2 text-xs shadow-md shadow-emerald-600/20"
          >
            <Save className="h-4 w-4" />
            <span>Apply Audit ({stats.countedCount})</span>
          </Button>
        </div>
      </footer>

      {/* 1. Custom Count Dialog (Light Mode) */}
      <Dialog open={!!activeCountingProduct} onOpenChange={(open) => !open && setActiveCountingProduct(null)}>
        <DialogContent className="bg-white border-slate-200 text-slate-900 max-w-sm p-5 rounded-3xl font-faruma shadow-2xl" dir="rtl">
          {activeCountingProduct && (
            <div className="space-y-3.5">
              <DialogHeader className="text-right space-y-0.5">
                <DialogTitle className="text-base font-black text-slate-900">{activeCountingProduct.name_dv}</DialogTitle>
                <DialogDescription className="text-xs text-slate-500 font-sans">{activeCountingProduct.name_en}</DialogDescription>
              </DialogHeader>

              {/* Location Switcher */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 font-sans">Location:</label>
                <div className="grid grid-cols-2 gap-2 font-sans">
                  <button
                    type="button"
                    onClick={() => setCountLocation('shop')}
                    className={cn(
                      "p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all",
                      countLocation === 'shop'
                        ? "bg-primary text-white border-primary font-black shadow-sm"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                    )}
                  >
                    <Store className="h-4 w-4" />
                    <span>Shop Shelf</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCountLocation('godown')}
                    className={cn(
                      "p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all",
                      countLocation === 'godown'
                        ? "bg-primary text-white border-primary font-black shadow-sm"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                    )}
                  >
                    <Warehouse className="h-4 w-4" />
                    <span>Godown</span>
                  </button>
                </div>
              </div>

              {/* Unit multiplier if available */}
              {activeCountingProduct.units && Array.isArray(activeCountingProduct.units) && activeCountingProduct.units.length > 0 && (
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 font-sans">Unit Size:</label>
                  <div className="flex flex-wrap gap-1 font-sans">
                    <Button
                      type="button"
                      size="sm"
                      variant={selectedUnitMultiplier === 1 ? 'default' : 'outline'}
                      onClick={() => {
                        setSelectedUnitMultiplier(1);
                        setSelectedUnitName('Piece (NOS)');
                      }}
                      className={cn(
                        "h-8 text-xs font-bold rounded-xl",
                        selectedUnitMultiplier === 1 ? "bg-primary text-white" : "bg-slate-50 border-slate-200 text-slate-700"
                      )}
                    >
                      Piece (1 pc)
                    </Button>
                    {activeCountingProduct.units.map((u: any, idx: number) => {
                      const mult = Number(u.multiplier || u.quantity) || 1;
                      const uName = u.name_en || u.name_dv || u.unit || `Box of ${mult}`;
                      return (
                        <Button
                          key={idx}
                          type="button"
                          size="sm"
                          variant={selectedUnitMultiplier === mult ? 'default' : 'outline'}
                          onClick={() => {
                            setSelectedUnitMultiplier(mult);
                            setSelectedUnitName(uName);
                          }}
                          className={cn(
                            "h-8 text-xs font-bold rounded-xl",
                            selectedUnitMultiplier === mult ? "bg-primary text-white" : "bg-slate-50 border-slate-200 text-slate-700"
                          )}
                        >
                          {uName} ({mult} pcs)
                        </Button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Quantity Stepper */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 font-sans">Quantity to Add:</label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCountInput(prev => String(Math.max(1, (parseInt(prev) || 1) - 1)))}
                    className="h-12 w-12 rounded-2xl bg-slate-100 border-slate-300 text-slate-800 hover:bg-slate-200"
                  >
                    <Minus className="h-5 w-5" />
                  </Button>
                  <Input
                    type="number"
                    min="1"
                    value={countInput}
                    onChange={(e) => setCountInput(e.target.value)}
                    className="h-12 text-center text-xl font-black rounded-2xl bg-slate-50 border-slate-300 text-slate-900 font-sans"
                    autoFocus
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCountInput(prev => String((parseInt(prev) || 0) + 1))}
                    className="h-12 w-12 rounded-2xl bg-slate-100 border-slate-300 text-slate-800 hover:bg-slate-200"
                  >
                    <Plus className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              <DialogFooter className="flex-row gap-2 pt-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setActiveCountingProduct(null)}
                  className="flex-1 h-11 rounded-2xl bg-slate-100 border-slate-300 text-slate-700 text-xs font-bold"
                >
                  Cancel
                </Button>
                <Button 
                  type="button" 
                  onClick={() => {
                    const qty = parseInt(countInput) || 0;
                    if (qty > 0 && activeCountingProduct) {
                      handleAddCount(activeCountingProduct, qty, countLocation, selectedUnitName, selectedUnitMultiplier);
                      setActiveCountingProduct(null);
                    }
                  }}
                  className="flex-1 h-11 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black text-xs shadow-md"
                >
                  Add Count
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 2. Html5Qrcode Camera Scanner Modal (Safe Overlay Modal) */}
      {isScannerOpen && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 font-faruma"
          dir="rtl"
          onClick={(e) => {
            if (e.target === e.currentTarget) stopCameraScanner();
          }}
        >
          <div 
            className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl space-y-3 text-slate-900 animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <Camera className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">Barcode Scanner</h3>
                  <p className="text-[10px] text-slate-500 font-sans">Aim at product barcode (EAN, UPC, Code 128)</p>
                </div>
              </div>
              <button
                type="button"
                onClick={stopCameraScanner}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2 py-1">
              <div 
                id="stock-audit-qr-reader" 
                className="w-full rounded-2xl overflow-hidden bg-black aspect-[4/3] flex items-center justify-center border border-slate-200 relative shadow-inner"
              />

              {scannerError && (
                <p className="text-xs text-rose-600 font-bold text-center font-sans bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                  {scannerError}
                </p>
              )}
            </div>

            <Button 
              type="button" 
              variant="outline" 
              onClick={stopCameraScanner}
              className="w-full h-11 rounded-2xl bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800 font-bold text-xs shadow-sm"
            >
              Close Camera
            </Button>
          </div>
        </div>
      )}

      {/* 3. QR Share Dialog */}
      <Dialog open={isShareModalOpen} onOpenChange={setIsShareModalOpen}>
        <DialogContent className="bg-white border-slate-200 text-slate-900 max-w-xs p-5 rounded-3xl font-faruma text-center shadow-2xl" dir="rtl">
          <DialogHeader className="space-y-0.5">
            <DialogTitle className="text-base font-black text-slate-900">Join Stock Audit</DialogTitle>
            <DialogDescription className="text-xs text-slate-500 font-sans">
              Scan with phone camera to start counting together
            </DialogDescription>
          </DialogHeader>

          <div className="py-3 flex flex-col items-center justify-center space-y-3">
            <div className="p-3 bg-white border border-slate-200 rounded-2xl shadow-md">
              <QRCodeSVG value={auditShareUrl} size={160} />
            </div>

            <div className="w-full space-y-1 font-sans">
              <Button
                onClick={() => {
                  navigator.clipboard.writeText(auditShareUrl);
                  showSuccess('Audit link copied!');
                }}
                className="w-full h-10 rounded-2xl bg-primary hover:bg-primary/90 text-white font-bold text-xs gap-1.5 shadow-sm"
              >
                <Share2 className="h-4 w-4" />
                <span>Copy Audit Link</span>
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsShareModalOpen(false)}
              className="w-full h-10 rounded-2xl bg-slate-100 border-slate-300 text-slate-700 text-xs font-bold"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 4. Counter Name Dialog */}
      <Dialog open={isCounterNameDialogOpen} onOpenChange={setIsCounterNameDialogOpen}>
        <DialogContent className="bg-white border-slate-200 text-slate-900 max-w-xs p-5 rounded-3xl font-faruma shadow-2xl" dir="rtl">
          <DialogHeader className="text-right space-y-0.5">
            <DialogTitle className="text-base font-black text-slate-900">Counter Profile Name</DialogTitle>
            <DialogDescription className="text-xs text-slate-500 font-sans">
              This name is stamped on all counts you add
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 font-sans">
            <Input
              value={tempCounterName}
              onChange={(e) => setTempCounterName(e.target.value)}
              placeholder="e.g. Ahmed or Counter 1"
              className="h-11 rounded-2xl bg-slate-50 border-slate-300 text-slate-900 font-bold text-sm"
              autoFocus
            />
          </div>

          <DialogFooter className="flex-row gap-2 pt-1">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsCounterNameDialogOpen(false)}
              className="flex-1 h-10 rounded-2xl bg-slate-100 border-slate-300 text-slate-700 text-xs font-bold"
            >
              Cancel
            </Button>
            <Button 
              type="button" 
              onClick={() => {
                if (tempCounterName.trim()) {
                  setCounterName(tempCounterName.trim());
                  localStorage.setItem('stock_audit_counter_name', tempCounterName.trim());
                  setIsCounterNameDialogOpen(false);
                  showSuccess(`Counter set to ${tempCounterName.trim()}`);
                }
              }}
              className="flex-1 h-10 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black text-xs shadow-md"
            >
              Save Name
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 5. Commit Confirmation */}
      <Dialog open={isCommitModalOpen} onOpenChange={setIsCommitModalOpen}>
        <DialogContent className="bg-white border-slate-200 text-slate-900 max-w-sm p-5 rounded-3xl font-faruma shadow-2xl" dir="rtl">
          <DialogHeader className="text-right space-y-0.5">
            <DialogTitle className="text-base font-black text-slate-900 flex items-center justify-end gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <span>Apply to Store Inventory</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 font-sans">
              Updates store stock to match counted numbers.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-2.5 font-sans text-xs">
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Products Counted:</span>
                <strong className="text-slate-900 font-black">{stats.countedCount} items</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Discrepancies:</span>
                <strong className="text-amber-700 font-black">{stats.discrepancyCount} items</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Variance Value:</span>
                <strong className={stats.totalVarianceValue >= 0 ? "text-emerald-700" : "text-rose-600"}>
                  {stats.totalVarianceValue >= 0 ? '+' : ''}{formatCurrency(stats.totalVarianceValue)}
                </strong>
              </div>
            </div>

            <div className="flex items-center space-x-2 rtl:space-x-reverse text-xs text-slate-700">
              <input 
                type="checkbox"
                id="commitOnlyCounted"
                checked={commitOnlyCounted}
                onChange={(e) => setCommitOnlyCounted(e.target.checked)}
                className="rounded border-slate-300 text-primary"
              />
              <label htmlFor="commitOnlyCounted" className="cursor-pointer">
                Only update <strong>counted products</strong> (leave uncounted as is)
              </label>
            </div>
          </div>

          <DialogFooter className="flex-row gap-2 pt-1">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsCommitModalOpen(false)}
              className="flex-1 h-11 rounded-2xl bg-slate-100 border-slate-300 text-slate-700 text-xs font-bold"
            >
              Cancel
            </Button>
            <Button 
              type="button" 
              onClick={handleCommitAudit}
              disabled={isCommitting}
              className="flex-1 h-11 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-md"
            >
              {isCommitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm & Apply'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 6. Reset Confirmation */}
      <Dialog open={isResetModalOpen} onOpenChange={setIsResetModalOpen}>
        <DialogContent className="bg-white border-slate-200 text-slate-900 max-w-xs p-5 rounded-3xl font-faruma shadow-2xl" dir="rtl">
          <DialogHeader className="text-right space-y-0.5">
            <DialogTitle className="text-base font-black text-rose-600 flex items-center justify-end gap-1.5">
              <AlertTriangle className="h-5 w-5" />
              <span>Reset Audit Session?</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 font-sans">
              Resets all counted quantities to start fresh.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex-row gap-2 pt-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsResetModalOpen(false)}
              className="flex-1 h-10 rounded-2xl bg-slate-100 border-slate-300 text-slate-700 text-xs font-bold"
            >
              Cancel
            </Button>
            <Button 
              type="button" 
              onClick={handleResetAudit}
              className="flex-1 h-10 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs shadow-md"
            >
              Reset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Error Boundary to prevent any camera/render issue from causing a white screen
class StockAuditErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: any }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error('StockAudit caught runtime error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-6 text-center font-faruma text-slate-800">
          <div className="max-w-md w-full bg-white rounded-3xl p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="h-8 w-8" />
            </div>
            <h2 className="text-lg font-black text-slate-900">Stock Audit Recovery</h2>
            <p className="text-xs text-slate-500 font-sans">
              Camera or display encountered a temporary issue. Click below to reload.
            </p>
            <Button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="w-full h-11 rounded-2xl bg-primary text-white font-bold text-sm shadow-md"
            >
              Reload Stock Audit
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const StockAuditPage = () => (
  <StockAuditErrorBoundary>
    <StockAudit />
  </StockAuditErrorBoundary>
);

export default StockAuditPage;
