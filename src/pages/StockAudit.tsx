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
  RotateCcw,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Lock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { useAppContext, Product } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { supabase, DEFAULT_SETTINGS_USER_ID } from '@/lib/supabase';
import { showSuccess, showError, showInfo } from '@/utils/toast';
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

// Helper: Merge product state between local and cloud without losing entries or approval
export function mergeProductItems(localItem?: ProductAuditState, cloudItem?: ProductAuditState): ProductAuditState {
  if (!localItem) return cloudItem!;
  if (!cloudItem) return localItem;

  // Union entries by unique entry id
  const entryMap = new Map<string, AuditEntry>();
  for (const e of (localItem.entries || [])) {
    entryMap.set(e.id, e);
  }
  for (const e of (cloudItem.entries || [])) {
    entryMap.set(e.id, e);
  }
  const entries = Array.from(entryMap.values()).sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const totalShopCounted = entries.filter(e => e.location === 'shop').reduce((sum, e) => sum + e.quantity, 0);
  const totalGodownCounted = entries.filter(e => e.location === 'godown').reduce((sum, e) => sum + e.quantity, 0);
  const totalCounted = totalShopCounted + totalGodownCounted;

  const localTime = new Date(localItem.lastUpdated || 0).getTime();
  const cloudTime = new Date(cloudItem.lastUpdated || 0).getTime();

  let isApproved = false;
  let approvedBy: string | undefined = undefined;
  let approvedAt: string | undefined = undefined;

  // Most recent approval decision takes precedence
  if (cloudTime >= localTime) {
    isApproved = Boolean(cloudItem.isApproved);
    approvedBy = cloudItem.approvedBy;
    approvedAt = cloudItem.approvedAt;
  } else {
    isApproved = Boolean(localItem.isApproved);
    approvedBy = localItem.approvedBy;
    approvedAt = localItem.approvedAt;
  }

  // If approved, but a subsequent count was logged after approvedAt, re-require admin approval
  if (isApproved && approvedAt) {
    const approvedAtTime = new Date(approvedAt).getTime();
    const hasNewerEntry = entries.some(e => new Date(e.timestamp).getTime() > approvedAtTime + 1000);
    if (hasNewerEntry) {
      isApproved = false;
    }
  }

  return {
    productId: localItem.productId || cloudItem.productId,
    entries,
    totalShopCounted,
    totalGodownCounted,
    totalCounted,
    isApproved,
    approvedBy: isApproved ? approvedBy : undefined,
    approvedAt: isApproved ? approvedAt : undefined,
    lastUpdated: new Date(Math.max(localTime, cloudTime, Date.now())).toISOString()
  };
}

// Helper: Merge complete audit sessions across devices
export function mergeAuditSessions(localSession: ActiveAuditSession, cloudSession: ActiveAuditSession): ActiveAuditSession {
  if (!cloudSession || !cloudSession.items) return localSession;
  if (!localSession || !localSession.items) return cloudSession;

  const mergedItems: Record<string, ProductAuditState> = {};
  const allProductIds = new Set([
    ...Object.keys(localSession.items || {}),
    ...Object.keys(cloudSession.items || {})
  ]);

  for (const pid of allProductIds) {
    const localItem = localSession.items?.[pid];
    const cloudItem = cloudSession.items?.[pid];
    mergedItems[pid] = mergeProductItems(localItem, cloudItem);
  }

  return {
    id: cloudSession.id || localSession.id || 'default-session',
    title: cloudSession.title || localSession.title || 'Store Audit',
    startedAt: cloudSession.startedAt || localSession.startedAt || new Date().toISOString(),
    status: cloudSession.status || localSession.status || 'active',
    items: mergedItems
  };
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
  const { products, setProducts, updateProduct, refreshProducts } = useAppContext();
  const { currentUser, isAdmin } = useAuth();

  // Check if current user is admin
  const isAdminUser = useMemo(() => {
    if (typeof isAdmin === 'function') {
      return isAdmin();
    }
    return currentUser?.role === 'admin';
  }, [currentUser, isAdmin]);

  // Active user name
  const counterName = useMemo(() => {
    return currentUser?.name_en || currentUser?.username || 'Staff';
  }, [currentUser]);

  // Active Tab: 'search' (Search & Count) | 'counted' (Counted Products)
  const [activeTab, setActiveTab] = useState<'search' | 'counted'>('search');

  // Search input
  const [searchQuery, setSearchQuery] = useState('');
  const [countedSearchQuery, setCountedSearchQuery] = useState('');

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


  // Live stock sync state from Main App
  const [isSyncingProducts, setIsSyncingProducts] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('Just now');
  const lastStockSyncRef = useRef<string>(new Date(Date.now() - 30000).toISOString());

  // Function to sync fresh stock from Main App (Supabase products table)
  const syncFreshStockFromDb = useCallback(async (isFullRefresh = false) => {
    if (!supabase) return;
    try {
      if (isFullRefresh) {
        setIsSyncingProducts(true);
        if (typeof refreshProducts === 'function') {
          await refreshProducts(false);
        }
        setLastSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        setIsSyncingProducts(false);
        return;
      }

      // Fast incremental sync: check if any products were updated in Main App
      const { data, error } = await supabase
        .from('products')
        .select('id, stock_shop, stock_godown, updated_at')
        .gt('updated_at', lastStockSyncRef.current);

      if (!error && data && data.length > 0) {
        lastStockSyncRef.current = new Date().toISOString();
        setProducts(prev => prev.map(p => {
          const fresh = data.find((d: any) => d.id === p.id);
          if (fresh) {
            return {
              ...p,
              stock_shop: fresh.stock_shop,
              stock_godown: fresh.stock_godown
            };
          }
          return p;
        }));
        setLastSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      }
    } catch (err) {
      console.warn('Note syncing fresh stock from main app:', err);
    } finally {
      setIsSyncingProducts(false);
    }
  }, [refreshProducts, setProducts]);

  // Initial fresh stock sync and continuous background polling from Main App
  useEffect(() => {
    syncFreshStockFromDb(true);
    const stockInterval = setInterval(() => {
      syncFreshStockFromDb(false);
    }, 3500);
    return () => clearInterval(stockInterval);
  }, [syncFreshStockFromDb]);

  // 1. Load active audit session from Supabase cloud with automatic multi-device merge
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
        setAuditSession(prev => {
          const merged = mergeAuditSessions(prev, cloudSession);
          const prevStr = JSON.stringify(prev);
          const mergedStr = JSON.stringify(merged);
          if (prevStr === mergedStr) return prev;
          auditSessionRef.current = merged;
          localStorage.setItem('cached_stock_audit', mergedStr);
          return merged;
        });
      }
    } catch (err) {
      console.warn('Note fetching cloud audit:', err);
    }
  }, []);

  useEffect(() => {
    fetchCloudSession();
    const interval = setInterval(fetchCloudSession, 2500);
    return () => clearInterval(interval);
  }, [fetchCloudSession]);

  // 2. Realtime broadcast subscription for instant multi-device sync
  useEffect(() => {
    if (!supabase) return;
    const channel = supabase.channel('stock_audit_realtime_channel', {
      config: { broadcast: { self: false } }
    });
    channelRef.current = channel;

    channel
      .on('broadcast', { event: 'audit_update' }, ({ payload }) => {
        if (payload?.session) {
          setAuditSession(prev => {
            const merged = mergeAuditSessions(prev, payload.session);
            auditSessionRef.current = merged;
            localStorage.setItem('cached_stock_audit', JSON.stringify(merged));
            return merged;
          });
        }
      })
      .on('broadcast', { event: 'audit_approved' }, ({ payload }) => {
        if (payload?.session) {
          setAuditSession(prev => {
            const merged = mergeAuditSessions(prev, payload.session);
            auditSessionRef.current = merged;
            localStorage.setItem('cached_stock_audit', JSON.stringify(merged));
            return merged;
          });
        }
      })
      .on('broadcast', { event: 'audit_stock_committed' }, ({ payload }) => {
        if (payload?.updates && Array.isArray(payload.updates)) {
          setProducts(prev => prev.map(p => {
            const matched = payload.updates.find((u: any) => u.productId === p.id);
            return matched ? { ...p, stock_shop: matched.stock_shop, stock_godown: matched.stock_godown } : p;
          }));
        } else if (payload?.productId) {
          setProducts(prev => prev.map(p => 
            p.id === payload.productId
              ? { ...p, stock_shop: payload.stock_shop, stock_godown: payload.stock_godown }
              : p
          ));
        }
      })
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      channelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [setProducts]);

  // Save audit session to cloud directly with cloud merge to prevent clobbering
  const saveAuditSessionToCloudDirectly = useCallback(async (session: ActiveAuditSession) => {
    if (!supabase) return;
    try {
      const { data: existing } = await supabase
        .from('settings')
        .select('id, settings')
        .eq('category', 'active_stock_audit')
        .maybeSingle();

      let sessionToSave = session;
      if (existing?.settings?.session) {
        sessionToSave = mergeAuditSessions(session, existing.settings.session);
        auditSessionRef.current = sessionToSave;
        localStorage.setItem('cached_stock_audit', JSON.stringify(sessionToSave));
      }

      const payload = {
        category: 'active_stock_audit',
        user_id: DEFAULT_SETTINGS_USER_ID,
        settings: { session: sessionToSave },
        updated_at: new Date().toISOString()
      };

      if (existing?.id) {
        await supabase.from('settings').update({
          settings: { session: sessionToSave },
          updated_at: new Date().toISOString()
        }).eq('id', existing.id);
      } else {
        await supabase.from('settings').insert({
          ...payload,
          id: '11111111-2222-3333-4444-555555555555'
        });
      }
    } catch (err) {
      console.warn('Error persisting stock audit to cloud:', err);
    }
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
    syncTimeoutRef.current = setTimeout(() => {
      saveAuditSessionToCloudDirectly(newSession);
    }, 250);
  }, [counterName, saveAuditSessionToCloudDirectly]);

  // 4. Add Count Submit Handler (Staff or Admin enters count)
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
            isApproved: false, // reset approval on new count so Admin must approve
            lastUpdated: new Date().toISOString()
          }
        }
      };

      saveAuditSessionDebounced(updatedSession, counterName, 'audit_update');
      return updatedSession;
    });

    playBeep(980, 'sine', 0.1);
    showSuccess(`+${qty} (${countLocation}) submitted for ${selectedProduct.name_en}. Pending Admin Approval.`);
    setSelectedProduct(null);
    setCountQuantity('1');
  }, [selectedProduct, countQuantity, countLocation, counterName, saveAuditSessionDebounced]);

  // 5. Edit Existing Count Handler
  const handleSaveEditEntry = useCallback(() => {
    if (!editingEntry) return;

    const { productId, entry, product } = editingEntry;
    const currentItem = auditSessionRef.current?.items?.[productId];

    if (currentItem?.isApproved && !isAdminUser) {
      showError('Approved products cannot be edited. Please submit a new count to add more.');
      setEditingEntry(null);
      return;
    }

    const newQty = parseInt(editQtyInput);
    if (isNaN(newQty) || newQty <= 0) {
      showError('Please enter a valid count greater than 0');
      return;
    }

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
    showSuccess(`Updated ${product.name_en} count to ${newQty} pcs. Pending Admin Approval.`);
    setEditingEntry(null);
  }, [editingEntry, editQtyInput, editLocation, counterName, saveAuditSessionDebounced]);

  // 6. Delete Count Entry
  const handleDeleteEntry = useCallback((productId: string, entryId: string) => {
    const currentItem = auditSessionRef.current?.items?.[productId];

    if (currentItem?.isApproved && !isAdminUser) {
      showError('Approved products cannot be deleted. Please submit a new count to adjust.');
      return;
    }

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

  // 7. Admin Single Product Stock Approval & Direct Commit to Main App
  const handleApproveStock = useCallback(async (product: Product) => {
    if (!isAdminUser) {
      showError('Only administrators can approve and commit stock counts');
      return;
    }

    const currentSession = auditSessionRef.current;
    const item = currentSession.items[product.id];
    if (!item || item.totalCounted === 0) {
      showError('No counts available to approve for this item');
      return;
    }

    try {
      const hasShopEntries = item.entries.some(e => e.location === 'shop');
      const hasGodownEntries = item.entries.some(e => e.location === 'godown');

      // Preserve un-audited location instead of wiping to 0
      const newShopStock = hasShopEntries 
        ? item.totalShopCounted 
        : (product.stock_shop || 0);

      const newGodownStock = hasGodownEntries 
        ? item.totalGodownCounted 
        : (product.stock_godown || 0);

      const nowIso = new Date().toISOString();

      // 1. Direct Supabase update specifically on stock columns
      if (supabase) {
        const { error } = await supabase
          .from('products')
          .update({
            stock_shop: Math.max(0, Math.round(newShopStock)),
            stock_godown: Math.max(0, Math.round(newGodownStock)),
            updated_at: nowIso
          })
          .eq('id', product.id);

        if (error) {
          console.warn('Direct stock update warning, attempting context update:', error);
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

      // 3. Broadcast real-time stock change event so all connected devices/POS PCs update instantly
      if (channelRef.current) {
        try {
          channelRef.current.send({
            type: 'broadcast',
            event: 'audit_stock_committed',
            payload: {
              productId: product.id,
              stock_shop: Math.max(0, Math.round(newShopStock)),
              stock_godown: Math.max(0, Math.round(newGodownStock))
            }
          });
        } catch (e) {}
      }

      // 4. Mark approved in audit session
      const updatedItem: ProductAuditState = {
        ...item,
        isApproved: true,
        approvedBy: counterName,
        approvedAt: nowIso,
        lastUpdated: nowIso
      };

      const updatedSession: ActiveAuditSession = {
        ...currentSession,
        items: {
          ...currentSession.items,
          [product.id]: updatedItem
        }
      };

      // 5. Update local state immediately
      setAuditSession(updatedSession);
      auditSessionRef.current = updatedSession;
      localStorage.setItem('cached_stock_audit', JSON.stringify(updatedSession));

      // 6. Broadcast approval event to all other open devices immediately
      if (channelRef.current) {
        try {
          channelRef.current.send({
            type: 'broadcast',
            event: 'audit_approved',
            payload: { session: updatedSession, sender: counterName }
          });
        } catch (e) {}
      }

      // 7. Persist immediately to Supabase cloud (no debouncing for approval)
      await saveAuditSessionToCloudDirectly(updatedSession);

      playBeep(1200, 'sine', 0.15);
      showSuccess(`✓ Approved! ${product.name_en} updated in Main App to ${item.totalCounted} pcs.`);
    } catch (err: any) {
      console.error('Failed to update stock:', err);
      showError(err?.message || 'Failed to update stock');
    }
  }, [isAdminUser, counterName, updateProduct, setProducts, saveAuditSessionToCloudDirectly]);

  // 8. Admin Batch Approve All Counted Products to Main App
  const handleBatchApproveAll = useCallback(async () => {
    if (!isAdminUser) {
      showError('Only administrators can approve stock');
      return;
    }

    const currentSession = auditSessionRef.current;
    const pendingProductIds = Object.keys(currentSession.items).filter(id => {
      const item = currentSession.items[id];
      return item && item.totalCounted > 0 && !item.isApproved;
    });

    if (pendingProductIds.length === 0) {
      showInfo('No pending counts to approve');
      return;
    }

    setIsCommitting(true);
    let successCount = 0;
    const stockUpdates: Array<{ productId: string; stock_shop: number; stock_godown: number }> = [];

    try {
      const updatedItems = { ...currentSession.items };
      const nowIso = new Date().toISOString();

      for (const id of pendingProductIds) {
        const product = products.find(p => p.id === id);
        const item = currentSession.items[id];
        if (!product || !item) continue;

        const hasShopEntries = item.entries.some(e => e.location === 'shop');
        const hasGodownEntries = item.entries.some(e => e.location === 'godown');

        const newShopStock = hasShopEntries 
          ? item.totalShopCounted 
          : (product.stock_shop || 0);

        const newGodownStock = hasGodownEntries 
          ? item.totalGodownCounted 
          : (product.stock_godown || 0);

        if (supabase) {
          await supabase
            .from('products')
            .update({
              stock_shop: Math.max(0, Math.round(newShopStock)),
              stock_godown: Math.max(0, Math.round(newGodownStock)),
              updated_at: nowIso
            })
            .eq('id', product.id);
        }

        setProducts(prev => prev.map(p =>
          p.id === product.id
            ? { ...p, stock_shop: Math.max(0, Math.round(newShopStock)), stock_godown: Math.max(0, Math.round(newGodownStock)) }
            : p
        ));

        stockUpdates.push({
          productId: product.id,
          stock_shop: Math.max(0, Math.round(newShopStock)),
          stock_godown: Math.max(0, Math.round(newGodownStock))
        });

        updatedItems[id] = {
          ...item,
          isApproved: true,
          approvedBy: counterName,
          approvedAt: nowIso,
          lastUpdated: nowIso
        };

        successCount++;
      }

      // Broadcast batch stock updates to all devices / PC POS
      if (channelRef.current && stockUpdates.length > 0) {
        try {
          channelRef.current.send({
            type: 'broadcast',
            event: 'audit_stock_committed',
            payload: { updates: stockUpdates }
          });
        } catch (e) {}
      }

      const completedSession: ActiveAuditSession = {
        ...currentSession,
        items: updatedItems
      };

      setAuditSession(completedSession);
      auditSessionRef.current = completedSession;
      localStorage.setItem('cached_stock_audit', JSON.stringify(completedSession));

      // Broadcast immediately to all other connected devices
      if (channelRef.current) {
        try {
          channelRef.current.send({
            type: 'broadcast',
            event: 'audit_approved',
            payload: { session: completedSession, sender: counterName }
          });
        } catch (e) {}
      }

      // Save directly to cloud immediately
      await saveAuditSessionToCloudDirectly(completedSession);

      playBeep(1300, 'sine', 0.2);
      showSuccess(`✓ Batch Approved! ${successCount} products updated in Main App.`);
    } catch (err: any) {
      showError(err?.message || 'Failed to complete batch update');
    } finally {
      setIsCommitting(false);
    }
  }, [isAdminUser, products, counterName, setProducts, saveAuditSessionToCloudDirectly]);

  // 9. Camera Scanner Stop Function
  const stopCameraScanner = useCallback(() => {
    setIsScannerOpen(false);
    setScannerError(null);
    document.body.style.pointerEvents = 'auto';
    document.body.style.overflow = 'auto';
  }, []);

  // 10. Barcode Scanner Runner
  useEffect(() => {
    let html5QrCode: Html5Qrcode | null = null;
    let isStarting = false;
    let isStopped = false;

    if (isScannerOpen) {
      const container = document.getElementById('stock-audit-camera-box');
      if (!container) return;

      try {
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

        isStarting = true;
        html5QrCode.start(
          { facingMode: 'environment' },
          { fps: 15, qrbox: { width: 250, height: 160 }, aspectRatio: 1.3333 },
          (decodedText) => {
            if (!isStopped) {
              handleScannedBarcode(decodedText);
            }
          },
          () => {}
        ).then(() => {
          isStarting = false;
          if (isStopped && html5QrCode) {
            try {
              if (html5QrCode.isScanning) {
                html5QrCode.stop().catch(() => {}).finally(() => {
                  try { html5QrCode?.clear(); } catch (e) {}
                });
              }
            } catch (e) {}
          }
        }).catch((err) => {
          isStarting = false;
          if (!isStopped) {
            setScannerError(err?.message || 'Could not access camera. Please allow camera permissions.');
          }
        });
      } catch (err: any) {
        setScannerError(err?.message || 'Camera error');
      }

      return () => {
        isStopped = true;
        if (html5QrCode && !isStarting) {
          try {
            if (html5QrCode.isScanning) {
              html5QrCode.stop().catch(() => {}).finally(() => {
                try { html5QrCode?.clear(); } catch (e) {}
              });
            } else {
              try { html5QrCode.clear(); } catch (e) {}
            }
          } catch (e) {}
        }

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

        document.body.style.pointerEvents = 'auto';
        document.body.style.overflow = 'auto';
      };
    }
  }, [isScannerOpen]);

  // Barcode scanned callback
  const handleScannedBarcode = useCallback((code: string) => {
    stopCameraScanner();
    playBeep(1050, 'sine', 0.15);

    setTimeout(() => {
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
    }, 100);
  }, [stopCameraScanner, products]);

  // Filter products for Search Tab
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
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
  const allCountedList = useMemo(() => {
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

  const countedProductsList = useMemo(() => {
    if (!countedSearchQuery.trim()) {
      return allCountedList;
    }
    const q = countedSearchQuery.trim().toLowerCase();
    return allCountedList.filter(({ product, auditState }) => {
      const matchNameEn = product.name_en?.toLowerCase().includes(q);
      const matchNameDv = product.name_dv?.toLowerCase().includes(q);
      const matchBarcode = product.barcode?.toLowerCase().includes(q);
      const matchCode = product.item_code?.toLowerCase().includes(q);
      const matchCounter = auditState.entries.some(e => e.counterName?.toLowerCase().includes(q));
      return matchNameEn || matchNameDv || matchBarcode || matchCode || matchCounter;
    });
  }, [allCountedList, countedSearchQuery]);

  const totalCountedItems = allCountedList.length;
  const pendingApprovalCount = useMemo(() => {
    return allCountedList.filter(item => !item.auditState.isApproved).length;
  }, [allCountedList]);

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
            {/* Manual Sync from Main App Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                await syncFreshStockFromDb(true);
                await fetchCloudSession();
                showSuccess('Synced latest stock from Main App');
              }}
              disabled={isSyncingProducts}
              className="h-9 px-2 sm:px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700 text-[11px] font-bold gap-1 shadow-none"
              title="Sync stock from Main App"
            >
              <RefreshCw className={cn("h-3.5 w-3.5 text-primary", isSyncingProducts && "animate-spin")} />
              <span className="hidden sm:inline">Sync Stock</span>
            </Button>

            <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-bold">
              <span className={cn("w-2 h-2 rounded-full", isConnected ? "bg-emerald-500 animate-pulse" : "bg-amber-400")} />
              <span>{counterName}</span>
              {isAdminUser && (
                <Badge className="bg-emerald-600 text-white text-[9px] px-1 py-0 rounded-md font-bold mr-0.5">
                  Admin
                </Badge>
              )}
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
              <Badge className={cn("text-[9px] px-1.5 py-0 rounded-full font-black", pendingApprovalCount > 0 ? "bg-amber-500 text-white" : "bg-emerald-600 text-white")}>
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
                  const isApproved = hasCount && auditItem.isApproved;

                  return (
                    <div
                      key={product.id}
                      className={cn(
                        "p-3 rounded-2xl bg-white border transition-all space-y-2 shadow-xs",
                        isApproved
                          ? "border-emerald-400 bg-emerald-50/15"
                          : (hasCount ? "border-amber-300 bg-amber-50/15" : "border-slate-200 hover:border-slate-300")
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 text-right truncate">
                          <div className="flex items-center justify-end gap-1.5 flex-wrap">
                            <h3 className="text-xs sm:text-sm font-black text-slate-900 truncate">{product.name_dv}</h3>
                            {hasCount && (
                              isApproved ? (
                                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[9px] font-black px-1.5 py-0 rounded-md">
                                  ✓ Live Stock Updated
                                </Badge>
                              ) : (
                                <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-[9px] font-black px-1.5 py-0 rounded-md">
                                  Pending Approval ({auditItem.totalCounted} pcs)
                                </Badge>
                              )
                            )}
                          </div>
                          <p className="text-[11px] text-slate-600 font-sans font-bold truncate mt-0.5">{product.name_en}</p>
                          <div className="flex items-center justify-end gap-2 text-[10px] text-slate-400 font-sans mt-0.5 flex-wrap">
                            {product.barcode && <span>Barcode: <strong className="text-slate-600 font-mono">{product.barcode}</strong></span>}
                            <span>Shop: <strong className="text-emerald-700 font-bold">{product.stock_shop || 0}</strong></span>
                            <span>Godown: <strong className="text-slate-700 font-bold">{product.stock_godown || 0}</strong></span>
                            <span>Total: <strong className="text-primary font-black">{(product.stock_shop || 0) + (product.stock_godown || 0)}</strong></span>
                          </div>
                        </div>

                        {/* Quick Count Button */}
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedProduct(product);
                            setCountQuantity('1');
                            setCountLocation('shop');
                          }}
                          className="h-8 px-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs shrink-0 gap-1 shadow-none"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>Count</span>
                        </Button>
                      </div>

                      {/* Admin Quick Approval Row if Pending Count exists */}
                      {isAdminUser && hasCount && !isApproved && (
                        <div className="pt-1 border-t border-slate-100 flex items-center justify-between gap-2 font-sans text-xs">
                          <span className="text-[10px] text-amber-700 font-bold">
                            Counted: <strong>{auditItem.totalCounted} pcs</strong>
                          </span>
                          <Button
                            size="sm"
                            onClick={() => handleApproveStock(product)}
                            className="h-7 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[11px] gap-1 shadow-xs"
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            <span>Approve & Update Main App</span>
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ================= TAB 2: COUNTED PRODUCTS ================= */}
        {activeTab === 'counted' && (
          <div className="space-y-3">
            {/* Admin Notice / Batch Approve Card */}
            {isAdminUser && pendingApprovalCount > 0 && (
              <div className="bg-amber-50 border border-amber-200 p-3 rounded-2xl flex items-center justify-between gap-2 shadow-xs font-sans">
                <div>
                  <h4 className="text-xs font-black text-amber-900">Admin Approval Required</h4>
                  <p className="text-[10px] text-amber-700">{pendingApprovalCount} product count(s) waiting to update main stock.</p>
                </div>
                <Button
                  size="sm"
                  onClick={handleBatchApproveAll}
                  disabled={isCommitting}
                  className="h-8 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shrink-0 gap-1 shadow-xs"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Batch Update ({pendingApprovalCount})</span>
                </Button>
              </div>
            )}

            {/* Search Input in Counted Items */}
            {totalCountedItems > 0 && (
              <div className="relative flex items-center gap-1.5">
                <div className="relative flex-1">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <Input
                    type="text"
                    placeholder="ގުނާފައިވާ ތަކެތިން ހޯދާ / Search counted items..."
                    value={countedSearchQuery}
                    onChange={(e) => setCountedSearchQuery(e.target.value)}
                    className="pr-9 pl-8 h-10 rounded-2xl bg-white border-slate-200 text-xs sm:text-sm font-sans focus-visible:ring-primary shadow-xs"
                  />
                  {countedSearchQuery && (
                    <button
                      onClick={() => setCountedSearchQuery('')}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                      title="Clear Search"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between px-1 text-xs font-sans text-slate-600">
              <span className="font-bold">
                Counted Items ({totalCountedItems})
                {countedSearchQuery && ` — Matching (${countedProductsList.length})`}
              </span>
              <span className="text-[11px] text-slate-400">
                {pendingApprovalCount > 0 ? `${pendingApprovalCount} pending review` : 'All approved'}
              </span>
            </div>

            {totalCountedItems === 0 ? (
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
            ) : countedProductsList.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center space-y-2 font-sans text-xs">
                <p className="font-bold text-slate-700">No matching counted items</p>
                <p className="text-slate-400 text-[11px]">No counted items match "{countedSearchQuery}".</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setCountedSearchQuery('')}
                  className="h-8 px-3 rounded-xl border-slate-200 text-xs font-bold"
                >
                  Clear Search
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
                              <span>Approved ({auditState.approvedBy || 'Admin'})</span>
                            </Badge>
                          ) : (
                            <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-[9px] font-black px-1.5 py-0 rounded-full flex items-center gap-1 shadow-none">
                              <Clock className="h-2.5 w-2.5 text-amber-700" />
                              <span>Pending Admin Approval</span>
                            </Badge>
                          )}
                        </div>
                        <p className="text-[11px] font-bold text-slate-600 font-sans mt-0.5 truncate">{product.name_en}</p>
                      </div>

                      {/* Add more count button */}
                      <Button
                        size="sm"
                        variant={auditState.isApproved ? "default" : "outline"}
                        onClick={() => {
                          setSelectedProduct(product);
                          setCountQuantity('1');
                          setCountLocation('shop');
                        }}
                        className={cn(
                          "h-7 px-2.5 rounded-xl text-[10px] font-bold shrink-0 gap-1 shadow-none",
                          auditState.isApproved
                            ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                            : "bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300"
                        )}
                        title={auditState.isApproved ? "Submit a new count for this approved product" : "Add count"}
                      >
                        <Plus className="h-3 w-3" />
                        <span>{auditState.isApproved ? '+ Add More' : 'Add'}</span>
                      </Button>
                    </div>

                    {/* Stock & Counted Comparison Bar */}
                    <div className="grid grid-cols-4 gap-1 bg-slate-50 p-1.5 rounded-xl border border-slate-200 font-sans text-center text-xs">
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold uppercase block">Main App</span>
                        <span className="font-black text-slate-800 text-[11px] block">{product.stock_shop || 0}s / {product.stock_godown || 0}g</span>
                        <span className="text-[9px] text-slate-500 font-bold block">Tot: {totalSystem}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold uppercase block">Audit Total</span>
                        <span className="font-black text-emerald-700 text-xs block">{auditState.totalCounted}</span>
                        <span className="text-[9px] text-slate-500 font-bold block">{auditState.totalShopCounted}s / {auditState.totalGodownCounted}g</span>
                      </div>
                      <div className="border-r border-slate-200">
                        <span className="text-[9px] text-slate-400 font-bold uppercase block">Shop Diff</span>
                        <span className={cn("font-black text-xs block", (auditState.totalShopCounted - (product.stock_shop || 0)) === 0 ? "text-slate-500" : ((auditState.totalShopCounted - (product.stock_shop || 0)) > 0 ? "text-cyan-700" : "text-rose-600"))}>
                          {auditState.totalShopCounted - (product.stock_shop || 0) > 0 ? `+${auditState.totalShopCounted - (product.stock_shop || 0)}` : (auditState.totalShopCounted - (product.stock_shop || 0))}
                        </span>
                      </div>
                      <div className="border-r border-slate-200">
                        <span className="text-[9px] text-slate-400 font-bold uppercase block">Total Diff</span>
                        <span className={cn("font-black text-xs block", variance === 0 ? "text-slate-500" : (variance > 0 ? "text-cyan-700" : "text-rose-600"))}>
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

                            {/* If approved, regular users cannot edit or delete. They must submit a new count */}
                            {auditState.isApproved && !isAdminUser ? (
                              <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1 bg-emerald-100/70 px-2 py-0.5 rounded-lg border border-emerald-200">
                                <Lock className="h-2.5 w-2.5 text-emerald-600" />
                                <span>Approved</span>
                              </span>
                            ) : (
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
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Admin Accept & Update Main App Stock Button */}
                    {isAdminUser && !auditState.isApproved && (
                      <Button
                        size="sm"
                        onClick={() => handleApproveStock(product)}
                        className="w-full h-8.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs gap-1.5 shadow-xs"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Approve & Update Main App Stock ({auditState.totalCounted} pcs)</span>
                      </Button>
                    )}

                    {/* If Already Approved, show notice and user guidance */}
                    {auditState.isApproved && (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-2.5 py-1.5 flex items-center justify-between text-[11px] font-sans text-emerald-800 font-bold">
                        <span className="flex items-center gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                          <span>
                            {isAdminUser
                              ? `Stock Synced with Main App (${auditState.totalCounted} pcs)`
                              : `Approved & locked. To add more count, tap "+ Add More" above.`}
                          </span>
                        </span>
                        {isAdminUser && (
                          <button
                            onClick={async () => {
                              const current = auditSessionRef.current;
                              const currentItem = current.items[product.id];
                              if (!currentItem) return;
                              const nowIso = new Date().toISOString();
                              const updatedItem: ProductAuditState = {
                                ...currentItem,
                                isApproved: false,
                                approvedBy: undefined,
                                approvedAt: undefined,
                                lastUpdated: nowIso
                              };
                              const updated: ActiveAuditSession = {
                                ...current,
                                items: {
                                  ...current.items,
                                  [product.id]: updatedItem
                                }
                              };
                              setAuditSession(updated);
                              auditSessionRef.current = updated;
                              localStorage.setItem('cached_stock_audit', JSON.stringify(updated));
                              if (channelRef.current) {
                                try {
                                  channelRef.current.send({
                                    type: 'broadcast',
                                    event: 'audit_update',
                                    payload: { session: updated, sender: counterName }
                                  });
                                } catch (e) {}
                              }
                              await saveAuditSessionToCloudDirectly(updated);
                              showInfo('Reopened count for approval');
                            }}
                            className="text-[10px] text-slate-500 hover:text-slate-800 underline shrink-0 mr-1"
                          >
                            Reopen
                          </button>
                        )}
                      </div>
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

      {/* ================= DIALOG 3: BARCODE SCANNER MODAL (KEPT IN DOM) ================= */}
      <div 
        className={cn(
          "fixed inset-0 z-[100] items-center justify-center bg-black/85 backdrop-blur-sm p-4 font-faruma",
          isScannerOpen ? "flex" : "hidden pointer-events-none"
        )}
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

          {/* Video Box - Always kept in DOM so html5-qrcode never fails on null element */}
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

    </div>
  );
}
