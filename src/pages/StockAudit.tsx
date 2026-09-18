"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Search, 
  Camera, 
  Plus, 
  Trash2, 
  Pencil,
  Store, 
  Warehouse, 
  X, 
  CheckCircle2,
  Clock,
  ShieldCheck,
  RefreshCw,
  Users as UsersIcon,
  Check,
  RotateCcw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
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
  timestamp: string;
}

export interface ProductAuditState {
  productId: string;
  entries: AuditEntry[];
  totalShopCounted: number;
  totalGodownCounted: number;
  totalCounted: number;
  isApproved?: boolean;
  approvedBy?: string;
  approvedAt?: string;
  lastUpdated: string;
}

export interface ActiveAuditSession {
  id: string;
  title: string;
  startedAt: string;
  status: 'active' | 'completed';
  items: Record<string, ProductAuditState>;
}

// Audio synthesizer for beep feedback
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

export default function StockAudit() {
  const navigate = useNavigate();
  const { products, setProducts, updateProduct } = useAppContext();
  const { currentUser, isAdmin } = useAuth();

  // Active user name
  const counterName = useMemo(() => {
    return currentUser?.name_en || currentUser?.username || 'Staff';
  }, [currentUser]);

  // Active Tab: 'search' (Search & Count) | 'counted' (Counted Products)
  const [activeTab, setActiveTab] = useState<'search' | 'counted'>('search');

  // Search input
  const [searchQuery, setSearchQuery] = useState('');

  // Count Dialog state (for adding count)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [countQuantity, setCountQuantity] = useState<string>('1');
  const [countLocation, setCountLocation] = useState<'shop' | 'godown'>('shop');

  // Edit Dialog state (for editing existing entry)
  const [editingEntry, setEditingEntry] = useState<{
    productId: string;
    product: Product;
    entry: AuditEntry;
  } | null>(null);
  const [editQtyInput, setEditQtyInput] = useState<string>('1');
  const [editLocation, setEditLocation] = useState<'shop' | 'godown'>('shop');

  // Barcode Scanner Modal State
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);

  // Active Audit Session
  const [auditSession, setAuditSession] = useState<ActiveAuditSession>(() => {
    try {
      const cached = localStorage.getItem('cached_stock_audit');
      if (cached) return JSON.parse(cached);
    } catch (e) {}
    return {
      id: 'default-session',
      title: 'Store Audit',
      startedAt: new Date().toISOString(),
      status: 'active',
      items: {}
    };
  });

  const auditSessionRef = useRef<ActiveAuditSession>(auditSession);
  auditSessionRef.current = auditSession;

  // Realtime channel & sync timeout
  const channelRef = useRef<any>(null);
  const syncTimeoutRef = useRef<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);

  // 1. Load active audit session from Supabase cloud
  const fetchCloudSession = useCallback(async () => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('settings')
        .eq('category', 'active_stock_audit')
        .maybeSingle();

      if (!error && data?.settings?.session) {
        const cloudSession: ActiveAuditSession = data.settings.session;
        setAuditSession(cloudSession);
        auditSessionRef.current = cloudSession;
        localStorage.setItem('cached_stock_audit', JSON.stringify(cloudSession));
      }
    } catch (err) {
      console.warn('Note fetching cloud audit:', err);
    }
  }, []);

  useEffect(() => {
    fetchCloudSession();
    const interval = setInterval(fetchCloudSession, 4000);
    return () => clearInterval(interval);
  }, [fetchCloudSession]);

  // 2. Realtime broadcast subscription
  useEffect(() => {
    if (!supabase) return;
    const channel = supabase.channel('stock_audit_realtime_channel', {
      config: { broadcast: { self: false } }
    });
    channelRef.current = channel;

    channel
      .on('broadcast', { event: 'audit_update' }, ({ payload }) => {
        if (payload?.session) {
          setAuditSession(payload.session);
          auditSessionRef.current = payload.session;
          localStorage.setItem('cached_stock_audit', JSON.stringify(payload.session));
        }
      })
      .on('broadcast', { event: 'audit_approved' }, ({ payload }) => {
        if (payload?.session) {
          setAuditSession(payload.session);
          auditSessionRef.current = payload.session;
          localStorage.setItem('cached_stock_audit', JSON.stringify(payload.session));
        }
      })
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      channelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, []);

  // 3. Debounced cloud save & broadcast
  const saveAuditSessionDebounced = useCallback((newSession: ActiveAuditSession, sender = counterName, eventType = 'audit_update') => {
    setAuditSession(newSession);
    auditSessionRef.current = newSession;
    localStorage.setItem('cached_stock_audit', JSON.stringify(newSession));

    if (channelRef.current) {
      try {
        channelRef.current.send({
          type: 'broadcast',
          event: eventType,
          payload: { session: newSession, sender }
        });
      } catch (e) {}
    }

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
        } catch (err) {
          console.warn('Note saving stock audit to cloud:', err);
        }
      }
    }, 250);
  }, [counterName]);

  // 4. Add Count Submit Handler
  const handleSubmitCount = useCallback(() => {
    if (!selectedProduct) return;
    const qty = parseInt(countQuantity);
    if (isNaN(qty) || qty <= 0) {
      showError('Please enter a valid count number');
      return;
    }

    const newEntry: AuditEntry = {
      id: `entry-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      counterName: counterName.trim() || 'Staff',
      quantity: qty,
      location: countLocation,
      timestamp: new Date().toISOString()
    };

    setAuditSession(prev => {
      const existingItem = prev.items[selectedProduct.id] || {
        productId: selectedProduct.id,
        entries: [],
        totalShopCounted: 0,
        totalGodownCounted: 0,
        totalCounted: 0,
        isApproved: false,
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
          [selectedProduct.id]: {
            productId: selectedProduct.id,
            entries: updatedEntries,
            totalShopCounted,
            totalGodownCounted,
            totalCounted,
            isApproved: false, // reset approval on new count
            lastUpdated: new Date().toISOString()
          }
        }
      };

      saveAuditSessionDebounced(updatedSession, counterName, 'audit_update');
      return updatedSession;
    });

    playBeep(980, 'sine', 0.1);
    showSuccess(`+${qty} (${countLocation}) submitted for ${selectedProduct.name_en}`);
    setSelectedProduct(null);
    setCountQuantity('1');
  }, [selectedProduct, countQuantity, countLocation, counterName, saveAuditSessionDebounced]);

  // 5. Edit Existing Count Handler
  const handleSaveEditEntry = useCallback(() => {
    if (!editingEntry) return;
    const newQty = parseInt(editQtyInput);
    if (isNaN(newQty) || newQty <= 0) {
      showError('Please enter a valid count greater than 0');
      return;
    }

    const { productId, entry, product } = editingEntry;

    setAuditSession(prev => {
      const item = prev.items[productId];
      if (!item) return prev;

      const updatedEntries = item.entries.map(e => {
        if (e.id === entry.id) {
          return {
            ...e,
            quantity: newQty,
            location: editLocation,
            timestamp: new Date().toISOString()
          };
        }
        return e;
      });

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
          [productId]: {
            ...item,
            entries: updatedEntries,
            totalShopCounted,
            totalGodownCounted,
            totalCounted,
            isApproved: false, // reset approval on modification
            lastUpdated: new Date().toISOString()
          }
        }
      };

      saveAuditSessionDebounced(updatedSession, counterName, 'audit_update');
      return updatedSession;
    });

    playBeep(1000, 'sine', 0.1);
    showSuccess(`Updated ${product.name_en} count to ${newQty} pcs`);
    setEditingEntry(null);
  }, [editingEntry, editQtyInput, editLocation, counterName, saveAuditSessionDebounced]);

  // 6. Delete Count Entry
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
          isApproved: false,
          lastUpdated: new Date().toISOString()
        };
      }

      const updatedSession = { ...prev, items: newItems };
      saveAuditSessionDebounced(updatedSession, counterName, 'audit_update');
      return updatedSession;
    });

    showSuccess('Count entry removed');
  }, [counterName, saveAuditSessionDebounced]);

  // 7. Admin Single Product Stock Update & Approval
  const handleApproveStock = useCallback(async (product: Product) => {
    if (!isAdmin) {
      showError('Only administrators can approve and commit stock counts');
      return;
    }

    const item = auditSession.items[product.id];
    if (!item || item.totalCounted === 0) {
      showError('No counts available to approve for this item');
      return;
    }

    try {
      const newShopStock = item.totalShopCounted > 0 || item.totalGodownCounted > 0 ? item.totalShopCounted : item.totalCounted;
      const newGodownStock = item.totalGodownCounted;

      // 1. Direct Supabase update specifically on stock columns
      if (supabase) {
        const { error } = await supabase
          .from('products')
          .update({
            stock_shop: Math.max(0, Math.round(newShopStock)),
            stock_godown: Math.max(0, Math.round(newGodownStock))
          })
          .eq('id', product.id);

        if (error) {
          console.warn('Direct stock update warning, attempting full update:', error);
          await updateProduct({
            ...product,
            stock_shop: Math.max(0, Math.round(newShopStock)),
            stock_godown: Math.max(0, Math.round(newGodownStock))
          });
        }
      }

      // 2. Immediately update AppContext state so POS and Products pages reflect it
      setProducts(prev => prev.map(p =>
        p.id === product.id
          ? { ...p, stock_shop: Math.max(0, Math.round(newShopStock)), stock_godown: Math.max(0, Math.round(newGodownStock)) }
          : p
      ));

      // 3. Mark approved in audit session
      const updatedItem: ProductAuditState = {
        ...item,
        isApproved: true,
        approvedBy: counterName,
        approvedAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      };

      const updatedSession: ActiveAuditSession = {
        ...auditSession,
        items: {
          ...auditSession.items,
          [product.id]: updatedItem
        }
      };

      saveAuditSessionDebounced(updatedSession, counterName, 'audit_approved');
      playBeep(1200, 'sine', 0.15);
      showSuccess(`✓ Stock updated for ${product.name_en} (${item.totalCounted} pcs)!`);
    } catch (err: any) {
      console.error('Failed to update stock:', err);
      showError(err?.message || 'Failed to update stock');
    }
  }, [isAdmin, auditSession, counterName, updateProduct, setProducts, saveAuditSessionDebounced]);

  // 8. Admin Batch Approve All Counted Products
  const handleBatchApproveAll = useCallback(async () => {
    if (!isAdmin) {
      showError('Only administrators can approve stock');
      return;
    }

    const countedProductIds = Object.keys(auditSession.items).filter(id => {
      const item = auditSession.items[id];
      return item && item.totalCounted > 0 && !item.isApproved;
    });

    if (countedProductIds.length === 0) {
      showInfo('No pending counts to approve');
      return;
    }

    setIsCommitting(true);
    let successCount = 0;

    try {
      const updatedItems = { ...auditSession.items };

      for (const id of countedProductIds) {
        const product = products.find(p => p.id === id);
        const item = auditSession.items[id];
        if (!product || !item) continue;

        const newShopStock = item.totalShopCounted > 0 || item.totalGodownCounted > 0 ? item.totalShopCounted : item.totalCounted;
        const newGodownStock = item.totalGodownCounted;

        if (supabase) {
          await supabase
            .from('products')
            .update({
              stock_shop: Math.max(0, Math.round(newShopStock)),
              stock_godown: Math.max(0, Math.round(newGodownStock))
            })
            .eq('id', product.id);
        }

        setProducts(prev => prev.map(p =>
          p.id === product.id
            ? { ...p, stock_shop: Math.max(0, Math.round(newShopStock)), stock_godown: Math.max(0, Math.round(newGodownStock)) }
            : p
        ));

        updatedItems[id] = {
          ...item,
          isApproved: true,
          approvedBy: counterName,
          approvedAt: new Date().toISOString(),
          lastUpdated: new Date().toISOString()
        };

        successCount++;
      }

      const completedSession: ActiveAuditSession = {
        ...auditSession,
        items: updatedItems
      };

      saveAuditSessionDebounced(completedSession, counterName, 'audit_approved');
      playBeep(1300, 'sine', 0.2);
      showSuccess(`✓ Batch Approved! ${successCount} products updated in live stock.`);
    } catch (err: any) {
      showError(err?.message || 'Failed to complete batch update');
    } finally {
      setIsCommitting(false);
    }
  }, [isAdmin, auditSession, products, counterName, setProducts, saveAuditSessionDebounced]);

  // 9. Camera Scanner Stop Function
  const stopCameraScanner = useCallback(async () => {
    try {
      const videoElements = document.querySelectorAll('#stock-audit-camera-box video');
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

    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
      } catch (e) {}
      try {
        html5QrCodeRef.current.clear();
      } catch (e) {}
      html5QrCodeRef.current = null;
    }

    setIsScannerOpen(false);
    setScannerError(null);

    setTimeout(() => {
      document.body.style.pointerEvents = 'auto';
      document.body.style.overflow = 'auto';
    }, 50);
  }, []);

  // 10. Barcode Scanner Runner
  useEffect(() => {
    let html5QrCode: Html5Qrcode | null = null;
    let isMounted = true;

    if (isScannerOpen) {
      const timer = setTimeout(async () => {
        try {
          const container = document.getElementById('stock-audit-camera-box');
          if (!container || !isMounted) return;

          html5QrCode = new Html5Qrcode('stock-audit-camera-box', {
            formatsToSupport: [
              Html5QrcodeSupportedFormats.EAN_13,
              Html5QrcodeSupportedFormats.EAN_8,
              Html5QrcodeSupportedFormats.CODE_128,
              Html5QrcodeSupportedFormats.CODE_39,
              Html5QrcodeSupportedFormats.UPC_A,
              Html5QrcodeSupportedFormats.UPC_E,
              Html5QrcodeSupportedFormats.QR_CODE
            ],
            verbose: false
          });
          html5QrCodeRef.current = html5QrCode;

          await html5QrCode.start(
            { facingMode: 'environment' },
            { fps: 15, qrbox: { width: 250, height: 160 }, aspectRatio: 1.3333 },
            (decodedText) => {
              if (decodedText && isMounted) {
                handleScannedBarcode(decodedText);
              }
            },
            () => {}
          );
        } catch (err: any) {
          if (isMounted) setScannerError(err?.message || 'Could not access camera. Please allow camera permissions.');
        }
      }, 200);

      return () => {
        isMounted = false;
        clearTimeout(timer);
        try {
          const videoElements = document.querySelectorAll('#stock-audit-camera-box video');
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
            try { html5QrCode?.clear(); } catch (e) {}
          });
        }
        setTimeout(() => {
          document.body.style.pointerEvents = 'auto';
          document.body.style.overflow = 'auto';
        }, 50);
      };
    }
  }, [isScannerOpen]);

  // Barcode scanned callback
  const handleScannedBarcode = async (code: string) => {
    await stopCameraScanner();
    playBeep(1050, 'sine', 0.15);

    const cleanCode = code.trim().toLowerCase();
    const matchedProduct = products.find(p => 
      (p.barcode && p.barcode.trim().toLowerCase() === cleanCode) ||
      (p.item_code && p.item_code.trim().toLowerCase() === cleanCode)
    );

    if (matchedProduct) {
      setSelectedProduct(matchedProduct);
      setCountQuantity('1');
      setCountLocation('shop');
      showSuccess(`Scanned: ${matchedProduct.name_en}`);
    } else {
      showError(`No product found matching barcode: ${code}`);
      setSearchQuery(code);
    }
  };

  // Filter products for Search Tab
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      // Return first 30 products if no search query
      return products.slice(0, 30);
    }
    return products.filter(p => 
      (p.name_en && p.name_en.toLowerCase().includes(q)) ||
      (p.name_dv && p.name_dv.includes(q)) ||
      (p.barcode && p.barcode.toLowerCase().includes(q)) ||
      (p.item_code && p.item_code.toLowerCase().includes(q))
    ).slice(0, 50);
  }, [products, searchQuery]);

  // List of counted products
  const countedProductsList = useMemo(() => {
    return products
      .filter(p => {
        const item = auditSession.items[p.id];
        return item && item.totalCounted > 0;
      })
      .map(p => ({
        product: p,
        auditState: auditSession.items[p.id]!
      }));
  }, [products, auditSession.items]);

  const totalCountedItems = countedProductsList.length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-24 font-faruma selection:bg-primary selection:text-white" dir="rtl">
      
      {/* 1. Header Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 px-3.5 py-2.5 shadow-xs">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/')}
              className="h-9 w-9 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-sm sm:text-base font-black text-slate-900 leading-tight">ސްޓޮކް އޮޑިޓް</h1>
              <p className="text-[10px] text-slate-500 font-sans font-medium">Mobile Stock Audit</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 font-sans">
            <div className="flex items-center gap-1 px-2 py-1 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-bold">
              <span className={cn("w-2 h-2 rounded-full", isConnected ? "bg-emerald-500 animate-pulse" : "bg-amber-400")} />
              <span>{counterName}</span>
              {isAdmin && <ShieldCheck className="h-3 w-3 text-emerald-600 mr-0.5" />}
            </div>
          </div>
        </div>
      </header>

      {/* 2. Clean Segmented Tabs Switcher */}
      <div className="max-w-md mx-auto px-3.5 pt-3">
        <div className="grid grid-cols-2 p-1 bg-slate-200/80 rounded-2xl text-xs font-bold gap-1 font-sans">
          <button
            onClick={() => setActiveTab('search')}
            className={cn(
              "py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-none",
              activeTab === 'search' 
                ? "bg-white text-slate-900 font-black shadow-xs" 
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            <Search className="h-3.5 w-3.5" />
            <span>Search & Count</span>
          </button>

          <button
            onClick={() => setActiveTab('counted')}
            className={cn(
              "py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-none",
              activeTab === 'counted' 
                ? "bg-white text-slate-900 font-black shadow-xs" 
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            <span>Counted Items</span>
            {totalCountedItems > 0 && (
              <Badge className="bg-emerald-600 text-white text-[9px] px-1.5 py-0 rounded-full font-black">
                {totalCountedItems}
              </Badge>
            )}
          </button>
        </div>
      </div>

      {/* 3. Main Content View */}
      <main className="max-w-md mx-auto px-3.5 pt-3 space-y-3">

        {/* ================= TAB 1: SEARCH & COUNT ================= */}
        {activeTab === 'search' && (
          <div className="space-y-3">
            {/* Search Input with Barcode Camera Button */}
            <div className="relative flex items-center gap-1.5">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <Input
                  type="text"
                  placeholder="ހޯދާ / Search item, code, barcode..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-9 pl-8 h-11 rounded-2xl bg-white border-slate-200 text-xs sm:text-sm font-sans focus-visible:ring-primary shadow-xs"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Barcode Camera Scanner Button */}
              <Button
                type="button"
                onClick={() => setIsScannerOpen(true)}
                className="h-11 w-11 rounded-2xl bg-primary hover:bg-primary/90 text-white p-0 shrink-0 shadow-xs flex items-center justify-center"
                title="Scan Barcode with Camera"
              >
                <Camera className="h-5 w-5" />
              </Button>
            </div>

            {/* Product List */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] text-slate-500 font-sans px-1">
                <span>{searchQuery ? `Matching products (${searchResults.length})` : 'All Products (Tap to count)'}</span>
              </div>

              {searchResults.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center space-y-1 font-sans text-xs">
                  <p className="font-bold text-slate-700">No products found</p>
                  <p className="text-slate-400 text-[11px]">Try typing a different name or scanning the barcode.</p>
                </div>
              ) : (
                searchResults.map(product => {
                  const auditItem = auditSession.items[product.id];
                  const hasCount = auditItem && auditItem.totalCounted > 0;

                  return (
                    <div
                      key={product.id}
                      onClick={() => {
                        setSelectedProduct(product);
                        setCountQuantity('1');
                        setCountLocation('shop');
                      }}
                      className={cn(
                        "p-3 rounded-2xl bg-white border transition-all cursor-pointer flex items-center justify-between gap-2 shadow-xs active:scale-[0.99]",
                        hasCount ? "border-emerald-300 bg-emerald-50/20" : "border-slate-200 hover:border-slate-300"
                      )}
                    >
                      <div className="flex-1 text-right truncate">
                        <div className="flex items-center justify-end gap-1.5">
                          <h3 className="text-xs sm:text-sm font-black text-slate-900 truncate">{product.name_dv}</h3>
                          {hasCount && (
                            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[9px] font-black px-1.5 py-0 rounded-md">
                              {auditItem.totalCounted} pcs
                            </Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-600 font-sans font-bold truncate mt-0.5">{product.name_en}</p>
                        <div className="flex items-center justify-end gap-2 text-[10px] text-slate-400 font-sans mt-0.5">
                          {product.barcode && <span>Barcode: <strong className="text-slate-600 font-mono">{product.barcode}</strong></span>}
                          <span>Shop: <strong className="text-slate-700">{product.stock_shop || 0}</strong></span>
                          <span>Godown: <strong className="text-slate-700">{product.stock_godown || 0}</strong></span>
                        </div>
                      </div>

                      <Button
                        size="sm"
                        className="h-8 px-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs shrink-0 gap-1 shadow-none"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Count</span>
                      </Button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ================= TAB 2: COUNTED PRODUCTS LIST ================= */}
        {activeTab === 'counted' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1 text-xs font-sans text-slate-600">
              <span className="font-bold">Counted Items ({countedProductsList.length})</span>
              {isAdmin && countedProductsList.some(item => !item.auditState.isApproved) && (
                <Button
                  size="sm"
                  onClick={handleBatchApproveAll}
                  disabled={isCommitting}
                  className="h-7 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[11px] gap-1 shadow-xs"
                >
                  <CheckCircle2 className="h-3 w-3" />
                  <span>Update All Stock</span>
                </Button>
              )}
            </div>

            {countedProductsList.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-2 font-sans text-xs">
                <p className="font-bold text-slate-700">No items counted yet</p>
                <p className="text-slate-400 text-[11px]">Go to the Search & Count tab to search products or scan barcodes.</p>
                <Button
                  onClick={() => setActiveTab('search')}
                  className="h-8 px-4 rounded-xl bg-primary text-white text-xs font-bold mt-2"
                >
                  Start Counting
                </Button>
              </div>
            ) : (
              countedProductsList.map(({ product, auditState }) => {
                const totalSystem = (product.stock_shop || 0) + (product.stock_godown || 0);
                const variance = auditState.totalCounted - totalSystem;

                return (
                  <div 
                    key={product.id}
                    className={cn(
                      "p-3 rounded-2xl bg-white border transition-all space-y-2 shadow-xs",
                      auditState.isApproved 
                        ? "border-emerald-400 bg-emerald-50/20" 
                        : "border-slate-200"
                    )}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          <h3 className="text-xs sm:text-sm font-black text-slate-900">{product.name_dv}</h3>
                          {auditState.isApproved ? (
                            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[9px] font-black px-1.5 py-0 rounded-full flex items-center gap-1 shadow-none">
                              <CheckCircle2 className="h-2.5 w-2.5 text-emerald-600" />
                              <span>Approved</span>
                            </Badge>
                          ) : (
                            <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-[9px] font-black px-1.5 py-0 rounded-full flex items-center gap-1 shadow-none">
                              <Clock className="h-2.5 w-2.5 text-amber-700" />
                              <span>Pending Review</span>
                            </Badge>
                          )}
                        </div>
                        <p className="text-[11px] font-bold text-slate-600 font-sans mt-0.5 truncate">{product.name_en}</p>
                      </div>

                      {/* Add more count button */}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedProduct(product);
                          setCountQuantity('1');
                          setCountLocation('shop');
                        }}
                        className="h-7 px-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300 text-[10px] font-bold shrink-0 gap-1"
                      >
                        <Plus className="h-3 w-3" />
                        <span>Add Count</span>
                      </Button>
                    </div>

                    {/* Stock & Counted Comparison Bar */}
                    <div className="grid grid-cols-4 gap-1 bg-slate-50 p-1.5 rounded-xl border border-slate-200 font-sans text-center text-xs">
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold uppercase block">Shop</span>
                        <span className="font-black text-slate-800 text-xs">{auditState.totalShopCounted}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold uppercase block">Godown</span>
                        <span className="font-black text-slate-800 text-xs">{auditState.totalGodownCounted}</span>
                      </div>
                      <div className="border-r border-slate-200">
                        <span className="text-[9px] text-slate-400 font-bold uppercase block">Total</span>
                        <span className="font-black text-emerald-700 text-xs">{auditState.totalCounted}</span>
                      </div>
                      <div className="border-r border-slate-200">
                        <span className="text-[9px] text-slate-400 font-bold uppercase block">Diff</span>
                        <span className={cn("font-black text-xs", variance === 0 ? "text-slate-500" : (variance > 0 ? "text-cyan-700" : "text-rose-600"))}>
                          {variance > 0 ? `+${variance}` : variance}
                        </span>
                      </div>
                    </div>

                    {/* Entries Log List with EDIT and DELETE */}
                    <div className="space-y-1 font-sans text-xs pt-0.5">
                      <p className="text-[9px] font-bold text-slate-400 uppercase">Count Entries ({auditState.entries.length}):</p>
                      <div className="space-y-1">
                        {auditState.entries.map((entry) => (
                          <div 
                            key={entry.id}
                            className="bg-slate-50 border border-slate-200 p-2 rounded-xl flex items-center justify-between text-[11px]"
                          >
                            <div className="flex items-center gap-1.5">
                              <span className="font-black text-slate-800">+{entry.quantity} pcs</span>
                              <Badge variant="outline" className="text-[9px] px-1 py-0 bg-white border-slate-200 text-slate-600 font-bold uppercase">
                                {entry.location}
                              </Badge>
                              <span className="text-[10px] text-slate-400">by {entry.counterName}</span>
                            </div>

                            <div className="flex items-center gap-1">
                              {/* Edit Entry Action */}
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setEditingEntry({ productId: product.id, product, entry });
                                  setEditQtyInput(String(entry.quantity));
                                  setEditLocation(entry.location);
                                }}
                                className="h-6 w-6 p-0 rounded-lg text-slate-600 hover:text-primary hover:bg-primary/10"
                                title="Edit Count"
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>

                              {/* Delete Entry Action */}
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteEntry(product.id, entry.id)}
                                className="h-6 w-6 p-0 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                title="Delete Entry"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Admin Accept & Update Stock Button */}
                    {isAdmin && !auditState.isApproved && (
                      <Button
                        size="sm"
                        onClick={() => handleApproveStock(product)}
                        className="w-full h-8 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs gap-1.5 shadow-xs"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Accept & Update Stock ({auditState.totalCounted} pcs)</span>
                      </Button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </main>

      {/* ================= DIALOG 1: ENTER QUANTITY MODAL ================= */}
      <Dialog open={!!selectedProduct} onOpenChange={(open) => { if (!open) setSelectedProduct(null); }}>
        <DialogContent className="bg-white border-slate-200 text-slate-900 max-w-sm p-4 rounded-3xl font-faruma shadow-2xl" dir="rtl">
          <DialogHeader className="text-right space-y-0.5">
            <DialogTitle className="text-sm sm:text-base font-black text-slate-900">
              {selectedProduct?.name_dv}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 font-sans font-bold">
              {selectedProduct?.name_en}
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-3 font-sans text-xs">
            {/* Location Selector */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-600">Location / ތަން:</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setCountLocation('shop')}
                  className={cn(
                    "p-2 rounded-xl border text-xs font-black flex items-center justify-center gap-1.5 transition-all",
                    countLocation === 'shop'
                      ? "bg-primary text-white border-primary shadow-xs"
                      : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                  )}
                >
                  <Store className="h-3.5 w-3.5" />
                  <span>Shop ({selectedProduct?.stock_shop || 0})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCountLocation('godown')}
                  className={cn(
                    "p-2 rounded-xl border text-xs font-black flex items-center justify-center gap-1.5 transition-all",
                    countLocation === 'godown'
                      ? "bg-primary text-white border-primary shadow-xs"
                      : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                  )}
                >
                  <Warehouse className="h-3.5 w-3.5" />
                  <span>Godown ({selectedProduct?.stock_godown || 0})</span>
                </button>
              </div>
            </div>

            {/* Number Input & Quick presets */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-600">Quantity (Pieces) / އަދަދު:</label>
              <Input
                type="number"
                min="1"
                step="1"
                value={countQuantity}
                onChange={(e) => setCountQuantity(e.target.value)}
                className="h-11 rounded-2xl bg-white border-slate-300 text-base font-black text-center font-sans focus-visible:ring-primary shadow-xs"
                placeholder="Enter pieces"
                autoFocus
              />

              {/* Quick Add Presets */}
              <div className="grid grid-cols-4 gap-1.5 pt-1">
                {[1, 5, 10, 12].map(num => (
                  <Button
                    key={num}
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const current = parseInt(countQuantity) || 0;
                      setCountQuantity(String(current + num));
                    }}
                    className="h-8 rounded-xl bg-slate-100 hover:bg-primary hover:text-white text-slate-800 text-xs font-black border-slate-300 transition-colors"
                  >
                    +{num}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="flex-row gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => setSelectedProduct(null)}
              className="flex-1 h-10 rounded-2xl bg-slate-100 border-slate-300 text-slate-700 text-xs font-bold"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmitCount}
              className="flex-1 h-10 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-xs"
            >
              Submit Count
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================= DIALOG 2: EDIT COUNT ENTRY MODAL ================= */}
      <Dialog open={!!editingEntry} onOpenChange={(open) => { if (!open) setEditingEntry(null); }}>
        <DialogContent className="bg-white border-slate-200 text-slate-900 max-w-sm p-4 rounded-3xl font-faruma shadow-2xl" dir="rtl">
          <DialogHeader className="text-right space-y-0.5">
            <DialogTitle className="text-sm sm:text-base font-black text-slate-900 flex items-center justify-end gap-1.5">
              <Pencil className="h-4 w-4 text-primary" />
              <span>Edit Submitted Count</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 font-sans font-bold">
              {editingEntry?.product?.name_en}
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-3 font-sans text-xs">
            {/* Location Selector */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-600">Location:</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setEditLocation('shop')}
                  className={cn(
                    "p-2 rounded-xl border text-xs font-black flex items-center justify-center gap-1.5 transition-all",
                    editLocation === 'shop'
                      ? "bg-primary text-white border-primary shadow-xs"
                      : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                  )}
                >
                  <Store className="h-3.5 w-3.5" />
                  <span>Shop</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEditLocation('godown')}
                  className={cn(
                    "p-2 rounded-xl border text-xs font-black flex items-center justify-center gap-1.5 transition-all",
                    editLocation === 'godown'
                      ? "bg-primary text-white border-primary shadow-xs"
                      : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                  )}
                >
                  <Warehouse className="h-3.5 w-3.5" />
                  <span>Godown</span>
                </button>
              </div>
            </div>

            {/* Quantity */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-600">Quantity (Pieces):</label>
              <Input
                type="number"
                min="1"
                step="1"
                value={editQtyInput}
                onChange={(e) => setEditQtyInput(e.target.value)}
                className="h-11 rounded-2xl bg-white border-slate-300 text-base font-black text-center font-sans focus-visible:ring-primary shadow-xs"
              />
            </div>
          </div>

          <DialogFooter className="flex-row gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditingEntry(null)}
              className="flex-1 h-10 rounded-2xl bg-slate-100 border-slate-300 text-slate-700 text-xs font-bold"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSaveEditEntry}
              className="flex-1 h-10 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-xs"
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================= DIALOG 3: BARCODE SCANNER MODAL ================= */}
      {isScannerOpen && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 font-faruma"
          dir="rtl"
          onClick={(e) => {
            if (e.target === e.currentTarget) stopCameraScanner();
          }}
        >
          <div 
            className="w-full max-w-sm bg-white rounded-3xl p-4 sm:p-5 shadow-2xl space-y-3 text-slate-900 animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <div className="flex items-center gap-1.5">
                <div className="w-7 h-7 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <Camera className="h-3.5 w-3.5" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-black text-slate-900">Barcode Scanner</h3>
                  <p className="text-[9px] text-slate-500 font-sans">Aim camera at product barcode</p>
                </div>
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={stopCameraScanner}
                className="h-7 w-7 rounded-full text-slate-400 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Video Box */}
            <div className="relative overflow-hidden rounded-2xl bg-black aspect-4/3 flex items-center justify-center border border-slate-200">
              <div id="stock-audit-camera-box" className="w-full h-full" />
              {scannerError && (
                <div className="absolute inset-0 bg-white/95 p-4 flex flex-col items-center justify-center text-center text-rose-600 text-xs font-sans space-y-2">
                  <p className="font-bold">{scannerError}</p>
                  <Button size="sm" onClick={stopCameraScanner} className="h-8 rounded-xl bg-slate-200 text-slate-800 text-xs">
                    Close
                  </Button>
                </div>
              )}
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={stopCameraScanner}
              className="w-full h-9 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold"
            >
              Cancel & Close
            </Button>
          </div>
        </div>
      )}

    </div>
  );
}
