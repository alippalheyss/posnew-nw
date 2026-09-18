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
  Pencil,
  Share2, 
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
  ShieldCheck,
  Clock,
  Users as UsersIcon
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

// Audio synthesizer
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

// Memoized Individual Product Card (Mobile Optimized Light Mode)
interface ProductAuditCardProps {
  product: Product;
  auditItem?: ProductAuditState;
  isExpanded: boolean;
  isAdmin: boolean;
  currentCounterName: string;
  onToggleExpand: (productId: string) => void;
  onQuickAdd: (product: Product, qty: number, location: 'shop' | 'godown') => void;
  onOpenCustomCount: (product: Product) => void;
  onDeleteEntry: (productId: string, entryId: string) => void;
  onEditEntry: (product: Product, entry: AuditEntry) => void;
  onApproveSingle: (product: Product) => void;
  onUnapproveSingle?: (product: Product) => void;
}

const ProductAuditCard = React.memo<ProductAuditCardProps>(({
  product,
  auditItem,
  isExpanded,
  isAdmin,
  currentCounterName,
  onToggleExpand,
  onQuickAdd,
  onOpenCustomCount,
  onDeleteEntry,
  onEditEntry,
  onApproveSingle,
  onUnapproveSingle
}) => {
  const isCounted = !!auditItem && auditItem.totalCounted > 0;
  const isApproved = !!auditItem?.isApproved;
  const systemShop = product.stock_shop || 0;
  const systemGodown = product.stock_godown || 0;
  const totalSystem = systemShop + systemGodown;
  const countedTotal = isCounted ? auditItem.totalCounted : 0;
  const variance = isCounted ? (countedTotal - totalSystem) : 0;

  // Breakdown of user counts
  const userBreakdown = useMemo(() => {
    if (!auditItem || !auditItem.entries.length) return [];
    const map: Record<string, { total: number; shop: number; godown: number; count: number }> = {};
    auditItem.entries.forEach(e => {
      const name = e.counterName || 'Staff';
      if (!map[name]) map[name] = { total: 0, shop: 0, godown: 0, count: 0 };
      map[name].total += e.quantity;
      if (e.location === 'shop') map[name].shop += e.quantity;
      if (e.location === 'godown') map[name].godown += e.quantity;
      map[name].count += 1;
    });
    return Object.entries(map).map(([name, data]) => ({ name, ...data }));
  }, [auditItem?.entries]);

  // My contribution
  const myTotal = useMemo(() => {
    if (!auditItem || !auditItem.entries.length) return 0;
    const cleanCurrent = currentCounterName.trim().toLowerCase();
    return auditItem.entries
      .filter(e => (e.counterName || '').trim().toLowerCase() === cleanCurrent)
      .reduce((sum, e) => sum + e.quantity, 0);
  }, [auditItem?.entries, currentCounterName]);

  return (
    <Card 
      className={cn(
        "bg-white border transition-all duration-150 overflow-hidden shadow-xs rounded-2xl",
        isApproved
          ? "border-emerald-400 bg-emerald-50/25"
          : (isCounted 
              ? (variance === 0 ? "border-emerald-300 bg-emerald-50/15" : "border-amber-300 bg-amber-50/15")
              : "border-slate-200 hover:border-slate-300")
      )}
    >
      <CardContent className="p-3 space-y-2">
        {/* Header: Dhivehi + English Name & Status Badges */}
        <div className="flex items-start justify-between gap-1.5">
          <div className="flex-1 text-right">
            <div className="flex items-center justify-end gap-1.5 flex-wrap">
              <h3 className="text-sm sm:text-base font-black text-slate-900 leading-snug">{product.name_dv}</h3>
              
              {/* Approval status badge */}
              {isApproved ? (
                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[9px] sm:text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 shadow-none">
                  <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                  <span>Approved ({auditItem?.approvedBy || 'Admin'})</span>
                </Badge>
              ) : (isCounted ? (
                <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-[9px] sm:text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 shadow-none">
                  <Clock className="h-3 w-3 text-amber-700" />
                  <span>Pending Review</span>
                </Badge>
              ) : null)}

              {/* Variance badge */}
              {isCounted && (
                <Badge 
                  className={cn(
                    "text-[9px] sm:text-[10px] font-black px-2 py-0.5 rounded-full border shadow-none",
                    variance === 0 
                      ? "bg-emerald-100 text-emerald-800 border-emerald-300" 
                      : (variance > 0 ? "bg-cyan-100 text-cyan-800 border-cyan-300" : "bg-rose-100 text-rose-800 border-rose-300")
                  )}
                >
                  {variance === 0 ? "✓ Matched" : (variance > 0 ? `+${variance} Over` : `${variance} Short`)}
                </Badge>
              )}
            </div>

            <p className="text-xs font-bold text-slate-600 font-sans mt-0.5 truncate">{product.name_en}</p>
            
            <div className="flex items-center justify-end gap-2 text-[10px] sm:text-[11px] text-slate-500 font-sans mt-0.5 flex-wrap">
              {product.barcode && <span>Barcode: <strong className="text-slate-800 font-mono">{product.barcode}</strong></span>}
              {product.item_code && <span>Code: <strong className="text-slate-800 font-mono">{product.item_code}</strong></span>}
              <span>Price: <strong className="text-primary font-black">{formatCurrency(product.price)}</strong></span>
            </div>
          </div>
        </div>

        {/* Multi-User Count Breakdown Summary Banner */}
        {isCounted && userBreakdown.length > 0 && (
          <div className="bg-slate-50 p-2 rounded-xl border border-slate-200 font-sans text-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-1">
                <UsersIcon className="h-3 w-3 text-primary" />
                <span>Counts Breakdown:</span>
              </span>
              {myTotal > 0 && (
                <Badge variant="outline" className="bg-primary/10 border-primary/30 text-primary text-[9px] font-bold px-1.5 py-0">
                  You: +{myTotal} pcs
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-1 flex-wrap">
              {userBreakdown.map((u) => (
                <span 
                  key={u.name}
                  className={cn(
                    "px-1.5 py-0.5 rounded-lg text-[10px] sm:text-[11px] font-bold border flex items-center gap-1",
                    u.name.toLowerCase() === currentCounterName.toLowerCase()
                      ? "bg-primary/15 border-primary/30 text-primary font-black"
                      : "bg-white border-slate-200 text-slate-800"
                  )}
                >
                  <strong>{u.name}:</strong>
                  <span>+{u.total}</span>
                  <span className="text-[9px] text-slate-400">({u.shop}s/{u.godown}g)</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Stock Comparison Grid (Optimized Light Theme) */}
        <div className="grid grid-cols-4 gap-1 sm:gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200 font-sans text-center text-xs">
          <div className="p-1">
            <span className="text-[9px] text-slate-500 font-bold uppercase block">Shop</span>
            <p className="font-black text-slate-800 text-xs sm:text-sm">{systemShop}</p>
          </div>
          <div className="p-1">
            <span className="text-[9px] text-slate-500 font-bold uppercase block">Godown</span>
            <p className="font-black text-slate-800 text-xs sm:text-sm">{systemGodown}</p>
          </div>
          <div className="p-1 border-r border-slate-200">
            <span className="text-[9px] text-slate-500 font-bold uppercase block">Counted</span>
            <p className={cn("font-black text-xs sm:text-sm", isCounted ? "text-emerald-700" : "text-slate-400")}>
              {isCounted ? `${countedTotal}` : '-'}
            </p>
          </div>
          <div className="p-1 border-r border-slate-200">
            <span className="text-[9px] text-slate-500 font-bold uppercase block">Diff</span>
            <p className={cn("font-black text-xs sm:text-sm", variance === 0 ? "text-slate-500" : (variance > 0 ? "text-cyan-700" : "text-rose-600"))}>
              {isCounted ? `${variance > 0 ? '+' : ''}${variance}` : '-'}
            </p>
          </div>
        </div>

        {/* Admin Single Product Approval Button */}
        {isAdmin && isCounted && (
          <div className="pt-0.5 flex items-center justify-between gap-1.5">
            {isApproved ? (
              <div className="flex items-center justify-between w-full bg-emerald-50 border border-emerald-200 rounded-xl px-2.5 py-1">
                <span className="text-[11px] text-emerald-800 font-bold flex items-center gap-1 font-sans">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Stock Updated ({countedTotal} pcs)</span>
                </span>
                {onUnapproveSingle && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onUnapproveSingle(product)}
                    className="h-6 px-1.5 text-[9px] font-bold text-slate-500 hover:text-slate-800 rounded-lg"
                  >
                    Reopen
                  </Button>
                )}
              </div>
            ) : (
              <Button
                size="sm"
                onClick={() => onApproveSingle(product)}
                className="w-full h-8 sm:h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black gap-1.5 shadow-xs"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Accept & Update Stock ({countedTotal} pcs)</span>
              </Button>
            )}
          </div>
        )}

        {/* Quick Add Buttons & Custom Count Controls */}
        <div className="flex items-center justify-between gap-1 pt-0.5">
          <div className="flex items-center gap-1 flex-wrap">
            {[1, 5, 10, 12].map((q) => (
              <Button
                key={q}
                size="sm"
                variant="outline"
                onClick={() => onQuickAdd(product, q, 'shop')}
                className="h-7 sm:h-8 px-2 rounded-xl bg-slate-100 hover:bg-primary hover:text-white text-slate-800 border-slate-300 text-[11px] font-black transition-colors"
              >
                +{q}
              </Button>
            ))}
          </div>

          <div className="flex items-center gap-1 mr-auto">
            <Button
              size="sm"
              onClick={() => onOpenCustomCount(product)}
              className="h-7 sm:h-8 px-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white text-[11px] font-black gap-1 shadow-xs"
            >
              <Plus className="h-3 w-3" />
              <span>Custom</span>
            </Button>

            {auditItem && auditItem.entries.length > 0 && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onToggleExpand(product.id)}
                className="h-7 sm:h-8 w-7 sm:w-8 p-0 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200"
                title="View Count History"
              >
                {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </Button>
            )}
          </div>
        </div>

        {/* Expanded Count Log with Edit & Delete */}
        {isExpanded && auditItem && auditItem.entries.length > 0 && (
          <div className="mt-1.5 pt-1.5 border-t border-slate-200 space-y-1 font-sans text-xs">
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Entries Log ({auditItem.entries.length}):</p>
            <div className="space-y-1 max-h-40 overflow-y-auto custom-scrollbar">
              {auditItem.entries.map((entry) => {
                const isMyEntry = (entry.counterName || '').trim().toLowerCase() === currentCounterName.trim().toLowerCase();
                const canModify = isAdmin || isMyEntry;

                return (
                  <div 
                    key={entry.id}
                    className={cn(
                      "flex items-center justify-between p-1.5 sm:p-2 rounded-xl border text-xs",
                      isMyEntry ? "bg-primary/5 border-primary/20" : "bg-slate-100 border-slate-200"
                    )}
                  >
                    <div className="flex items-center gap-1 sm:gap-2">
                      {canModify && (
                        <div className="flex items-center gap-0.5">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => onEditEntry(product, entry)}
                            className="h-6 w-6 text-primary hover:bg-primary/10 rounded-lg"
                            title="Edit this count"
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => onDeleteEntry(product.id, entry.id)}
                            className="h-6 w-6 text-rose-500 hover:bg-rose-100 rounded-lg"
                            title="Remove this count"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                      <span className="font-bold text-emerald-700 text-xs">+{entry.quantity} pcs</span>
                      <Badge variant="outline" className="text-[8px] sm:text-[9px] h-4 py-0 uppercase bg-white border-slate-300 text-slate-700">
                        {entry.location}
                      </Badge>
                    </div>
                    <div className="text-right text-[10px] sm:text-[11px] text-slate-600">
                      <strong className={cn("text-slate-800", isMyEntry && "text-primary")}>
                        {entry.counterName} {isMyEntry && '(You)'}
                      </strong> • {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                );
              })}
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
  const { currentUser, isAdmin } = useAuth();

  const isAdminUser = isAdmin() || currentUser?.role === 'admin';

  // Counter identification
  const [counterName, setCounterName] = useState<string>(() => {
    return localStorage.getItem('stock_audit_counter_name') || currentUser?.name_en || currentUser?.username || 'Staff ' + Math.floor(100 + Math.random() * 900);
  });
  const [isCounterNameDialogOpen, setIsCounterNameDialogOpen] = useState(false);
  const [tempCounterName, setTempCounterName] = useState(counterName);

  // Keep counterName synced with logged-in user
  useEffect(() => {
    if (currentUser?.name_en || currentUser?.username) {
      const activeName = currentUser.name_en || currentUser.username;
      setCounterName(activeName);
      localStorage.setItem('stock_audit_counter_name', activeName);
    }
  }, [currentUser]);

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
  const [filterMode, setFilterMode] = useState<'all' | 'my_counts' | 'counted' | 'pending' | 'approved' | 'discrepancy'>('all');

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

  // Edit Count Entry Modal
  const [editingEntry, setEditingEntry] = useState<{
    productId: string;
    product: Product;
    entry: AuditEntry;
  } | null>(null);
  const [editQtyInput, setEditQtyInput] = useState<string>('1');
  const [editLocation, setEditLocation] = useState<'shop' | 'godown'>('shop');

  // Modals
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isBatchApproveModalOpen, setIsBatchApproveModalOpen] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [batchScope, setBatchScope] = useState<'pending' | 'all'>('pending');
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [expandedProductIds, setExpandedProductIds] = useState<Record<string, boolean>>({});

  // Sync refs
  const syncTimeoutRef = useRef<any>(null);
  const auditSessionRef = useRef<ActiveAuditSession>(auditSession);
  auditSessionRef.current = auditSession;
  const channelRef = useRef<any>(null);

  // 1. Cloud Pull and Sync Engine
  const fetchCloudAuditSession = useCallback(async () => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('id, category, settings')
        .eq('category', 'active_stock_audit')
        .maybeSingle();

      if (!error && data?.settings) {
        const cloudSession = (data.settings as any)?.session || data.settings;
        if (cloudSession && cloudSession.items) {
          setAuditSession(prev => {
            const prevKeys = Object.keys(prev.items || {});
            const cloudKeys = Object.keys(cloudSession.items || {});
            
            // If cloud has data and differs, update
            const prevStr = JSON.stringify(prev.items);
            const cloudStr = JSON.stringify(cloudSession.items);
            if (prevStr !== cloudStr || (cloudKeys.length > 0 && prevKeys.length === 0)) {
              localStorage.setItem('cached_stock_audit', JSON.stringify(cloudSession));
              return cloudSession as ActiveAuditSession;
            }
            return prev;
          });
        }
      }
    } catch (err) {
      console.warn('Note pulling cloud audit session:', err);
    }
  }, []);

  // 1. Load active audit session on mount + regular 3s cloud pull interval
  useEffect(() => {
    let isMounted = true;

    // Load from local storage cache first for instant render
    try {
      const cached = localStorage.getItem('cached_stock_audit');
      if (cached && isMounted) {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.items) {
          setAuditSession(parsed);
        }
      }
    } catch (e) {}

    // Pull fresh data from Supabase immediately
    fetchCloudAuditSession();

    // Regular interval to pull updates in background
    const interval = setInterval(() => {
      if (isMounted) fetchCloudAuditSession();
    }, 3000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [fetchCloudAuditSession]);

  // 2. Realtime Channel setup with Peer Sync
  useEffect(() => {
    if (!supabase) return;

    const channel = supabase.channel('stock_audit_room', {
      config: { broadcast: { self: false } }
    });

    channelRef.current = channel;

    channel
      .on('broadcast', { event: 'audit_update' }, ({ payload }) => {
        if (payload?.session) {
          setAuditSession(payload.session);
          localStorage.setItem('cached_stock_audit', JSON.stringify(payload.session));
          showInfo(`Live count update from ${payload.sender || 'another user'}`);
          playBeep(1200, 'sine', 0.08);
        }
      })
      .on('broadcast', { event: 'audit_approved' }, ({ payload }) => {
        if (payload?.session) {
          setAuditSession(payload.session);
          localStorage.setItem('cached_stock_audit', JSON.stringify(payload.session));
          showSuccess(`Admin approved stock update: ${payload.productName || 'products'}`);
          playBeep(1400, 'sine', 0.12);
        }
      })
      .on('broadcast', { event: 'audit_sync_request' }, ({ payload }) => {
        // When a new device/window joins, send our session to them
        const currentItems = auditSessionRef.current?.items || {};
        if (Object.keys(currentItems).length > 0) {
          channel.send({
            type: 'broadcast',
            event: 'audit_sync_response',
            payload: { session: auditSessionRef.current, sender: counterName }
          });
        }
      })
      .on('broadcast', { event: 'audit_sync_response' }, ({ payload }) => {
        // Receive session from peer
        if (payload?.session && payload.session.items) {
          setAuditSession(prev => {
            const prevKeys = Object.keys(prev.items || {});
            const newKeys = Object.keys(payload.session.items || {});
            if (newKeys.length >= prevKeys.length) {
              localStorage.setItem('cached_stock_audit', JSON.stringify(payload.session));
              return payload.session;
            }
            return prev;
          });
        }
      })
      .subscribe((status) => {
        setIsRealtimeActive(status === 'SUBSCRIBED');
        if (status === 'SUBSCRIBED') {
          // Send request for peers to sync their state
          channel.send({
            type: 'broadcast',
            event: 'audit_sync_request',
            payload: { requester: counterName }
          });
        }
      });

    return () => {
      channelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [counterName]);

  // 3. Debounced cloud save & broadcast
  const saveAuditSessionDebounced = useCallback((newSession: ActiveAuditSession, sender = counterName, eventType = 'audit_update', extraPayload: any = {}) => {
    setAuditSession(newSession);
    auditSessionRef.current = newSession;
    localStorage.setItem('cached_stock_audit', JSON.stringify(newSession));

    // Send realtime broadcast immediately via subscribed channel
    if (channelRef.current) {
      try {
        channelRef.current.send({
          type: 'broadcast',
          event: eventType,
          payload: { session: newSession, sender, ...extraPayload }
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
    }, 200);
  }, [counterName]);

  // 4. Additive count handler (for any user)
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
          [product.id]: {
            productId: product.id,
            entries: updatedEntries,
            totalShopCounted,
            totalGodownCounted,
            totalCounted,
            isApproved: false, // New count resets approval status for admin review
            lastUpdated: new Date().toISOString()
          }
        }
      };

      saveAuditSessionDebounced(updatedSession, counterName, 'audit_update');
      return updatedSession;
    });

    playBeep(980, 'sine', 0.08);
    showSuccess(`+${effectiveQty} submitted by ${counterName} for ${product.name_en}`);
  }, [counterName, saveAuditSessionDebounced]);

  // Open Edit Dialog for an entry
  const handleOpenEditEntry = useCallback((product: Product, entry: AuditEntry) => {
    setEditingEntry({ productId: product.id, product, entry });
    setEditQtyInput(String(entry.quantity));
    setEditLocation(entry.location);
  }, []);

  // Save modified count entry
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
            isApproved: false, // Modified count resets approval status for admin review
            lastUpdated: new Date().toISOString()
          }
        }
      };

      saveAuditSessionDebounced(updatedSession, counterName, 'audit_update');
      return updatedSession;
    });

    setEditingEntry(null);
    playBeep(980, 'sine', 0.08);
    showSuccess(`Updated ${product.name_en} count to ${newQty} pcs`);
  }, [editingEntry, editQtyInput, editLocation, counterName, saveAuditSessionDebounced]);

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

  // Admin Single Product Approval Handler
  const handleApproveSingleProduct = useCallback(async (product: Product) => {
    if (!isAdminUser) {
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

      // Update actual product in live store
      await updateProduct({
        ...product,
        stock_shop: Math.max(0, Math.round(newShopStock)),
        stock_godown: Math.max(0, Math.round(newGodownStock))
      });

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

      saveAuditSessionDebounced(updatedSession, counterName, 'audit_approved', { productName: product.name_en });
      playBeep(1200, 'sine', 0.15);
      showSuccess(`✓ Accepted & updated ${product.name_en} to ${item.totalCounted} pcs!`);
    } catch (err: any) {
      showError(err?.message || 'Failed to update stock');
    }
  }, [isAdminUser, auditSession, counterName, updateProduct, saveAuditSessionDebounced]);

  // Admin Single Product Un-approve / Reopen
  const handleUnapproveSingleProduct = useCallback((product: Product) => {
    if (!isAdminUser) return;
    const item = auditSession.items[product.id];
    if (!item) return;

    const updatedItem: ProductAuditState = {
      ...item,
      isApproved: false,
      approvedBy: undefined,
      approvedAt: undefined,
      lastUpdated: new Date().toISOString()
    };

    const updatedSession: ActiveAuditSession = {
      ...auditSession,
      items: {
        ...auditSession.items,
        [product.id]: updatedItem
      }
    };

    saveAuditSessionDebounced(updatedSession, counterName, 'audit_update');
    showInfo(`Reopened count for ${product.name_en}`);
  }, [isAdminUser, auditSession, counterName, saveAuditSessionDebounced]);

  // Admin Batch Approval & Stock Commit
  const handleBatchApprove = async () => {
    if (!isAdminUser) {
      showError('Only administrators can approve and commit stock counts');
      return;
    }

    setIsCommitting(true);
    try {
      let updatedCount = 0;
      const updatedItems = { ...auditSession.items };

      for (const product of products) {
        const item = auditSession.items[product.id];
        if (!item || item.totalCounted === 0) continue;
        if (batchScope === 'pending' && item.isApproved) continue;

        const newShopStock = item.totalShopCounted > 0 || item.totalGodownCounted > 0 ? item.totalShopCounted : item.totalCounted;
        const newGodownStock = item.totalGodownCounted;

        await updateProduct({
          ...product,
          stock_shop: Math.max(0, Math.round(newShopStock)),
          stock_godown: Math.max(0, Math.round(newGodownStock))
        });

        updatedItems[product.id] = {
          ...item,
          isApproved: true,
          approvedBy: counterName,
          approvedAt: new Date().toISOString(),
          lastUpdated: new Date().toISOString()
        };

        updatedCount++;
      }

      const completedSession: ActiveAuditSession = {
        ...auditSession,
        items: updatedItems
      };

      saveAuditSessionDebounced(completedSession, counterName, 'audit_approved', { productName: `${updatedCount} items` });
      playBeep(1300, 'sine', 0.2);
      showSuccess(`✓ Batch Approved! ${updatedCount} products updated in live inventory.`);
      setIsBatchApproveModalOpen(false);
    } catch (err: any) {
      showError(err?.message || 'Failed to commit audit');
    } finally {
      setIsCommitting(false);
    }
  };

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

  // Filtered Products
  const filteredProducts = useMemo(() => {
    const search = searchTerm.toLowerCase().trim();
    const cleanCounter = counterName.trim().toLowerCase();

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
        const isApproved = !!auditItem?.isApproved;
        const totalSystemStock = (product.stock_shop || 0) + (product.stock_godown || 0);
        const variance = isCounted ? (auditItem.totalCounted - totalSystemStock) : 0;
        const hasDiscrepancy = isCounted && variance !== 0;

        if (filterMode === 'my_counts') {
          return !!auditItem?.entries.some(e => (e.counterName || '').trim().toLowerCase() === cleanCounter);
        }
        if (filterMode === 'counted') return isCounted;
        if (filterMode === 'pending') return isCounted && !isApproved;
        if (filterMode === 'approved') return isApproved;
        if (filterMode === 'discrepancy') return hasDiscrepancy;
      }

      return true;
    });
  }, [products, searchTerm, filterMode, auditSession.items, counterName]);

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
    let pendingApprovalCount = 0;
    let approvedCount = 0;
    let discrepancyCount = 0;
    let totalVarianceValue = 0;
    let myCountedCount = 0;
    let myTotalPcs = 0;

    const cleanCounter = counterName.trim().toLowerCase();

    products.forEach(p => {
      const item = auditSession.items[p.id];
      const systemStock = (p.stock_shop || 0) + (p.stock_godown || 0);
      if (item && item.totalCounted > 0) {
        countedCount++;
        if (item.isApproved) {
          approvedCount++;
        } else {
          pendingApprovalCount++;
        }

        const diff = item.totalCounted - systemStock;
        if (diff !== 0) {
          discrepancyCount++;
          totalVarianceValue += diff * (p.cost_price || p.price || 0);
        }

        const myEntries = item.entries.filter(e => (e.counterName || '').trim().toLowerCase() === cleanCounter);
        if (myEntries.length > 0) {
          myCountedCount++;
          myTotalPcs += myEntries.reduce((sum, e) => sum + e.quantity, 0);
        }
      }
    });

    const uncountedCount = Math.max(0, totalProducts - countedCount);
    const progressPercent = totalProducts > 0 ? Math.round((countedCount / totalProducts) * 100) : 0;

    return {
      totalProducts,
      countedCount,
      pendingApprovalCount,
      approvedCount,
      uncountedCount,
      discrepancyCount,
      totalVarianceValue,
      progressPercent,
      myCountedCount,
      myTotalPcs
    };
  }, [products, auditSession.items, counterName]);

  // Reset session (Admin Only)
  const handleResetAudit = () => {
    if (!isAdminUser) {
      showError('Only administrators can reset the audit session');
      return;
    }

    const newSession: ActiveAuditSession = {
      id: `audit-${Date.now()}`,
      title: `Stock Audit ${new Date().toLocaleDateString()}`,
      startedAt: new Date().toISOString(),
      status: 'active',
      items: {}
    };
    saveAuditSessionDebounced(newSession, counterName, 'audit_update');
    setIsResetModalOpen(false);
    showSuccess('Audit session reset. Fresh count started.');
  };

  // Export Excel Report
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
        const contributors = item?.entries?.map(e => `${e.counterName}(+${e.quantity})`).join(', ') || '-';

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
          'Variance Value (MVR)': isCounted ? (diff * cost).toFixed(2) : '-',
          'Contributors': contributors,
          'Status': item?.isApproved ? `Approved by ${item.approvedBy}` : (isCounted ? 'Pending Review' : 'Uncounted')
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
    <div className="min-h-screen bg-slate-100 text-slate-900 font-faruma flex flex-col pb-24 sm:pb-28 selection:bg-primary/20" dir="rtl">
      {/* Top Header Bar (Compact Mobile First) */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 px-3 py-2 shadow-xs">
        <div className="flex items-center justify-between gap-2 max-w-5xl mx-auto">
          <div className="flex items-center gap-1.5">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate('/stock')}
              className="h-8 w-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-1">
                <h1 className="text-sm sm:text-base font-black text-slate-900 leading-tight">ސްޓޮކް އޮޑިޓް</h1>
                <Badge className={cn(
                  "text-[8px] sm:text-[9px] font-bold py-0 h-4 shadow-none",
                  isAdminUser ? "bg-amber-100 text-amber-900 border-amber-300" : "bg-primary/15 text-primary border-primary/30"
                )}>
                  {isAdminUser ? '👑 Admin' : 'Counter'}
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Live Indicator */}
            <div 
              className={cn(
                "flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold border",
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
              className="h-7 sm:h-8 px-2 rounded-xl bg-slate-50 border-slate-300 hover:bg-slate-100 text-[10px] sm:text-[11px] font-bold gap-1 text-slate-800"
            >
              <UserIcon className="h-3 w-3 text-primary" />
              <span className="max-w-[70px] truncate">{counterName}</span>
            </Button>

            {/* Share QR */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsShareModalOpen(true)}
              className="h-7 sm:h-8 w-7 sm:w-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700"
              title="Share Audit Link"
            >
              <QrCode className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-3 py-2.5 sm:p-4 space-y-2.5">
        {/* Role & Instruction Notice */}
        <div className={cn(
          "p-2.5 rounded-2xl border text-xs font-sans flex items-center justify-between gap-2 shadow-xs",
          isAdminUser 
            ? "bg-amber-50/80 border-amber-200 text-amber-900" 
            : "bg-blue-50/80 border-blue-200 text-blue-900"
        )}>
          <div className="flex items-center gap-2">
            {isAdminUser ? (
              <ShieldCheck className="h-4 w-4 text-amber-600 shrink-0" />
            ) : (
              <Store className="h-4 w-4 text-blue-600 shrink-0" />
            )}
            <p className="font-bold text-[11px] sm:text-xs">
              {isAdminUser 
                ? `👑 Admin Mode: Inspect user counts & accept items into live stock.`
                : `📱 Logged as ${counterName}: Counts are submitted live for Admin review.`}
            </p>
          </div>
          {isAdminUser && stats.pendingApprovalCount > 0 && (
            <Button
              size="sm"
              onClick={() => setIsBatchApproveModalOpen(true)}
              className="h-7 px-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-[11px] shrink-0 shadow-xs gap-1"
            >
              <CheckCircle2 className="h-3 w-3" />
              <span>Review ({stats.pendingApprovalCount})</span>
            </Button>
          )}
        </div>

        {/* Progress Dashboard */}
        <div className="p-3 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div>
              <span className="text-[9px] text-slate-500 font-bold uppercase">Audit Progress</span>
              <div className="flex items-baseline gap-1">
                <span className="text-lg sm:text-xl font-black text-slate-900">{stats.countedCount}</span>
                <span className="text-[11px] text-slate-500">/ {stats.totalProducts} ({stats.progressPercent}%)</span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportExcel}
                className="h-7 px-2 rounded-xl bg-slate-50 border-slate-300 hover:bg-slate-100 text-[11px] font-bold gap-1 text-emerald-700"
              >
                <FileSpreadsheet className="h-3 w-3" />
                <span>Export</span>
              </Button>

              {isAdminUser && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsResetModalOpen(true)}
                  className="h-7 px-2 rounded-xl bg-slate-50 border-slate-300 hover:bg-red-50 text-[11px] font-bold gap-1 text-red-600"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Reset</span>
                </Button>
              )}
            </div>
          </div>

          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-amber-500 via-primary to-emerald-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${stats.progressPercent}%` }}
            />
          </div>

          <div className="grid grid-cols-4 gap-1 pt-0.5 font-sans">
            <div className="bg-slate-50 p-1.5 rounded-xl border border-slate-200 text-center">
              <p className="text-[8px] text-slate-500 font-bold uppercase">Counted</p>
              <p className="text-xs sm:text-sm font-black text-emerald-700">{stats.countedCount}</p>
            </div>
            <div className="bg-slate-50 p-1.5 rounded-xl border border-slate-200 text-center">
              <p className="text-[8px] text-slate-500 font-bold uppercase">Pending</p>
              <p className="text-xs sm:text-sm font-black text-amber-700">{stats.pendingApprovalCount}</p>
            </div>
            <div className="bg-slate-50 p-1.5 rounded-xl border border-slate-200 text-center">
              <p className="text-[8px] text-slate-500 font-bold uppercase">Approved</p>
              <p className="text-xs sm:text-sm font-black text-emerald-600">{stats.approvedCount}</p>
            </div>
            <div className="bg-slate-50 p-1.5 rounded-xl border border-slate-200 text-center">
              <p className="text-[8px] text-slate-500 font-bold uppercase">Diff</p>
              <p className="text-xs sm:text-sm font-black text-rose-600">{stats.discrepancyCount}</p>
            </div>
          </div>
        </div>

        {/* Search Bar + Barcode Scanner Trigger */}
        <div className="flex gap-1.5">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search product name, barcode, code..."
              className="h-11 pr-9 pl-8 rounded-2xl bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 font-bold text-xs sm:text-sm shadow-xs"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          <Button
            onClick={startCameraScanner}
            className="h-11 px-3.5 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black gap-1.5 shadow-xs shrink-0 text-xs"
          >
            <Camera className="h-4 w-4" />
            <span>Scan</span>
          </Button>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 custom-scrollbar text-xs font-bold">
          <button
            onClick={() => setFilterMode('all')}
            className={cn(
              "px-3 py-1.5 rounded-xl border transition-colors whitespace-nowrap text-[11px] shadow-xs",
              filterMode === 'all'
                ? "bg-slate-900 text-white border-slate-900 font-black"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
            )}
          >
            All ({products.length})
          </button>
          <button
            onClick={() => setFilterMode('my_counts')}
            className={cn(
              "px-3 py-1.5 rounded-xl border transition-colors whitespace-nowrap text-[11px] shadow-xs",
              filterMode === 'my_counts'
                ? "bg-primary text-white border-primary font-black"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
            )}
          >
            🏷️ My Counts ({stats.myCountedCount})
          </button>
          <button
            onClick={() => setFilterMode('counted')}
            className={cn(
              "px-3 py-1.5 rounded-xl border transition-colors whitespace-nowrap text-[11px] shadow-xs",
              filterMode === 'counted'
                ? "bg-emerald-700 text-white border-emerald-700 font-black"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
            )}
          >
            Counted ({stats.countedCount})
          </button>
          <button
            onClick={() => setFilterMode('pending')}
            className={cn(
              "px-3 py-1.5 rounded-xl border transition-colors whitespace-nowrap text-[11px] shadow-xs",
              filterMode === 'pending'
                ? "bg-amber-600 text-white border-amber-600 font-black"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
            )}
          >
            ⏳ Pending ({stats.pendingApprovalCount})
          </button>
          <button
            onClick={() => setFilterMode('approved')}
            className={cn(
              "px-3 py-1.5 rounded-xl border transition-colors whitespace-nowrap text-[11px] shadow-xs",
              filterMode === 'approved'
                ? "bg-emerald-600 text-white border-emerald-600 font-black"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
            )}
          >
            ✓ Approved ({stats.approvedCount})
          </button>
          <button
            onClick={() => setFilterMode('discrepancy')}
            className={cn(
              "px-3 py-1.5 rounded-xl border transition-colors whitespace-nowrap text-[11px] shadow-xs",
              filterMode === 'discrepancy'
                ? "bg-rose-600 text-white border-rose-600 font-black"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
            )}
          >
            Diff ({stats.discrepancyCount})
          </button>
        </div>

        {/* Product List */}
        <div className="space-y-2">
          {visibleProducts.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-white border border-slate-200 space-y-2 shadow-xs">
              <Boxes className="h-7 w-7 text-slate-400 mx-auto" />
              <p className="text-slate-600 font-bold text-xs">No products matched your search or filter</p>
            </div>
          ) : (
            visibleProducts.map((product) => (
              <ProductAuditCard
                key={product.id}
                product={product}
                auditItem={auditSession.items[product.id]}
                isExpanded={!!expandedProductIds[product.id]}
                isAdmin={isAdminUser}
                currentCounterName={counterName}
                onToggleExpand={handleToggleExpand}
                onQuickAdd={handleAddCount}
                onOpenCustomCount={handleOpenCustomCount}
                onDeleteEntry={handleDeleteEntry}
                onEditEntry={handleOpenEditEntry}
                onApproveSingle={handleApproveSingleProduct}
                onUnapproveSingle={handleUnapproveSingleProduct}
              />
            ))
          )}

          {/* Load More Button */}
          {visibleProducts.length < filteredProducts.length && (
            <div className="pt-1 text-center">
              <Button
                variant="outline"
                onClick={() => setVisibleLimit(prev => Math.min(filteredProducts.length, prev + 30))}
                className="w-full h-10 rounded-2xl bg-white border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-xs"
              >
                Load More ({filteredProducts.length - visibleProducts.length} remaining)
              </Button>
            </div>
          )}
        </div>
      </main>

      {/* Floating Bottom Action Bar */}
      <footer className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-3 py-2 shadow-md">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-2">
          <Button
            onClick={startCameraScanner}
            className="h-11 px-3.5 rounded-2xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 font-bold gap-1.5 text-xs shadow-xs"
          >
            <Camera className="h-4 w-4 text-primary" />
            <span>Scan</span>
          </Button>

          {isAdminUser ? (
            <Button
              onClick={() => setIsBatchApproveModalOpen(true)}
              disabled={stats.countedCount === 0}
              className="h-11 px-4 sm:px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black gap-1.5 text-xs shadow-sm"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>Batch Accept ({stats.pendingApprovalCount || stats.countedCount})</span>
            </Button>
          ) : (
            <div className="flex items-center gap-1.5 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-2xl font-sans text-xs">
              <Clock className="h-3.5 w-3.5 text-amber-600" />
              <div className="text-right">
                <p className="font-bold text-slate-800 text-[11px]">Your Counts: {stats.myCountedCount} items ({stats.myTotalPcs} pcs)</p>
                <p className="text-[9px] text-slate-500">Submitted for Admin Review</p>
              </div>
            </div>
          )}
        </div>
      </footer>

      {/* 1. Custom Count Dialog */}
      <Dialog open={!!activeCountingProduct} onOpenChange={(open) => !open && setActiveCountingProduct(null)}>
        <DialogContent className="bg-white border-slate-200 text-slate-900 max-w-sm p-4 rounded-3xl font-faruma shadow-2xl" dir="rtl">
          {activeCountingProduct && (
            <div className="space-y-3">
              <DialogHeader className="text-right space-y-0.5">
                <DialogTitle className="text-sm sm:text-base font-black text-slate-900">{activeCountingProduct.name_dv}</DialogTitle>
                <DialogDescription className="text-xs text-slate-500 font-sans truncate">{activeCountingProduct.name_en}</DialogDescription>
              </DialogHeader>

              {/* Location Switcher */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-600 font-sans">Count Location:</label>
                <div className="grid grid-cols-2 gap-1.5 font-sans">
                  <button
                    type="button"
                    onClick={() => setCountLocation('shop')}
                    className={cn(
                      "p-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all",
                      countLocation === 'shop'
                        ? "bg-primary text-white border-primary font-black shadow-xs"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                    )}
                  >
                    <Store className="h-3.5 w-3.5" />
                    <span>Shop Shelf</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCountLocation('godown')}
                    className={cn(
                      "p-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all",
                      countLocation === 'godown'
                        ? "bg-primary text-white border-primary font-black shadow-xs"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                    )}
                  >
                    <Warehouse className="h-3.5 w-3.5" />
                    <span>Godown / Store</span>
                  </button>
                </div>
              </div>

              {/* Unit multiplier if available */}
              {activeCountingProduct.units && Array.isArray(activeCountingProduct.units) && activeCountingProduct.units.length > 0 && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 font-sans">Package Unit:</label>
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
                        "h-7 text-xs font-bold rounded-xl",
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
                            "h-7 text-xs font-bold rounded-xl",
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
                <label className="text-[10px] font-bold text-slate-600 font-sans">
                  Quantity ({selectedUnitName}):
                </label>
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCountInput(prev => String(Math.max(1, (parseInt(prev) || 1) - 1)))}
                    className="h-11 w-11 rounded-2xl bg-slate-100 border-slate-300 text-slate-800 hover:bg-slate-200"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Input
                    type="number"
                    min="1"
                    value={countInput}
                    onChange={(e) => setCountInput(e.target.value)}
                    className="h-11 text-center text-lg font-black bg-slate-50 border-slate-300 text-slate-900 rounded-2xl font-sans"
                    autoFocus
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCountInput(prev => String((parseInt(prev) || 0) + 1))}
                    className="h-11 w-11 rounded-2xl bg-slate-100 border-slate-300 text-slate-800 hover:bg-slate-200"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <DialogFooter className="flex-row gap-2 pt-1">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setActiveCountingProduct(null)}
                  className="flex-1 h-10 rounded-2xl bg-slate-100 border-slate-300 text-slate-700 text-xs font-bold"
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
                  className="flex-1 h-10 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black text-xs shadow-xs"
                >
                  Submit Count
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 2. Edit Entry Dialog */}
      <Dialog open={!!editingEntry} onOpenChange={(open) => !open && setEditingEntry(null)}>
        <DialogContent className="bg-white border-slate-200 text-slate-900 max-w-sm p-4 rounded-3xl font-faruma shadow-2xl" dir="rtl">
          {editingEntry && (
            <div className="space-y-3">
              <DialogHeader className="text-right space-y-0.5">
                <DialogTitle className="text-sm sm:text-base font-black text-slate-900 flex items-center justify-end gap-1.5">
                  <Pencil className="h-4 w-4 text-primary" />
                  <span>Edit Count ({editingEntry.product.name_dv})</span>
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 font-sans truncate">
                  {editingEntry.product.name_en} • By {editingEntry.entry.counterName}
                </DialogDescription>
              </DialogHeader>

              {/* Location Switcher */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-600 font-sans">Count Location:</label>
                <div className="grid grid-cols-2 gap-1.5 font-sans">
                  <button
                    type="button"
                    onClick={() => setEditLocation('shop')}
                    className={cn(
                      "p-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all",
                      editLocation === 'shop'
                        ? "bg-primary text-white border-primary font-black shadow-xs"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                    )}
                  >
                    <Store className="h-3.5 w-3.5" />
                    <span>Shop Shelf</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditLocation('godown')}
                    className={cn(
                      "p-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all",
                      editLocation === 'godown'
                        ? "bg-primary text-white border-primary font-black shadow-xs"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                    )}
                  >
                    <Warehouse className="h-3.5 w-3.5" />
                    <span>Godown / Store</span>
                  </button>
                </div>
              </div>

              {/* Quantity Stepper */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-600 font-sans">
                  New Quantity (Pieces):
                </label>
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditQtyInput(prev => String(Math.max(1, (parseInt(prev) || 1) - 1)))}
                    className="h-11 w-11 rounded-2xl bg-slate-100 border-slate-300 text-slate-800 hover:bg-slate-200"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Input
                    type="number"
                    min="1"
                    value={editQtyInput}
                    onChange={(e) => setEditQtyInput(e.target.value)}
                    className="h-11 text-center text-lg font-black bg-slate-50 border-slate-300 text-slate-900 rounded-2xl font-sans"
                    autoFocus
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditQtyInput(prev => String((parseInt(prev) || 0) + 1))}
                    className="h-11 w-11 rounded-2xl bg-slate-100 border-slate-300 text-slate-800 hover:bg-slate-200"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
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
                  className="flex-1 h-10 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black text-xs shadow-xs"
                >
                  Save Changes
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 3. Html5Qrcode Camera Scanner Modal (Safe Overlay Modal) */}
      {isScannerOpen && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 font-faruma"
          dir="rtl"
          onClick={(e) => {
            if (e.target === e.currentTarget) stopCameraScanner();
          }}
        >
          <div 
            className="w-full max-w-sm bg-white rounded-3xl p-4 sm:p-5 shadow-2xl space-y-2.5 text-slate-900 animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <div className="flex items-center gap-1.5">
                <div className="w-7 h-7 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <Camera className="h-3.5 w-3.5" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-black text-slate-900">Barcode Scanner</h3>
                  <p className="text-[9px] text-slate-500 font-sans">Aim at product barcode</p>
                </div>
              </div>
              <button
                type="button"
                onClick={stopCameraScanner}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="space-y-2 py-0.5">
              <div 
                id="stock-audit-qr-reader" 
                className="w-full rounded-2xl overflow-hidden bg-black aspect-[4/3] flex items-center justify-center border border-slate-200 relative shadow-inner"
              />

              {scannerError && (
                <p className="text-xs text-rose-600 font-bold text-center font-sans bg-rose-50 p-2 rounded-xl border border-rose-200">
                  {scannerError}
                </p>
              )}
            </div>

            <Button 
              type="button" 
              variant="outline" 
              onClick={stopCameraScanner}
              className="w-full h-10 rounded-2xl bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800 font-bold text-xs shadow-xs"
            >
              Close Camera
            </Button>
          </div>
        </div>
      )}

      {/* 4. QR Share Dialog */}
      <Dialog open={isShareModalOpen} onOpenChange={setIsShareModalOpen}>
        <DialogContent className="bg-white border-slate-200 text-slate-900 max-w-xs p-4 rounded-3xl font-faruma text-center shadow-2xl" dir="rtl">
          <DialogHeader className="space-y-0.5">
            <DialogTitle className="text-sm sm:text-base font-black text-slate-900">Join Stock Audit</DialogTitle>
            <DialogDescription className="text-xs text-slate-500 font-sans">
              Scan with phone camera to start counting together
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 flex flex-col items-center justify-center space-y-2.5">
            <div className="p-3 bg-white border border-slate-200 rounded-2xl shadow-xs">
              <QRCodeSVG value={auditShareUrl} size={150} />
            </div>

            <div className="w-full space-y-1 font-sans">
              <Button
                onClick={() => {
                  navigator.clipboard.writeText(auditShareUrl);
                  showSuccess('Audit link copied!');
                }}
                className="w-full h-9 rounded-2xl bg-primary hover:bg-primary/90 text-white font-bold text-xs gap-1.5 shadow-xs"
              >
                <Share2 className="h-3.5 w-3.5" />
                <span>Copy Audit Link</span>
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsShareModalOpen(false)}
              className="w-full h-9 rounded-2xl bg-slate-100 border-slate-300 text-slate-700 text-xs font-bold"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 5. Counter Name Dialog */}
      <Dialog open={isCounterNameDialogOpen} onOpenChange={setIsCounterNameDialogOpen}>
        <DialogContent className="bg-white border-slate-200 text-slate-900 max-w-xs p-4 rounded-3xl font-faruma shadow-2xl" dir="rtl">
          <DialogHeader className="text-right space-y-0.5">
            <DialogTitle className="text-sm sm:text-base font-black text-slate-900">Counter Name</DialogTitle>
            <DialogDescription className="text-xs text-slate-500 font-sans">
              This name stamps all counts you add
            </DialogDescription>
          </DialogHeader>

          <div className="py-1.5 font-sans">
            <Input
              value={tempCounterName}
              onChange={(e) => setTempCounterName(e.target.value)}
              placeholder="e.g. Ahmed or Counter 1"
              className="h-10 rounded-2xl bg-slate-50 border-slate-300 text-slate-900 font-bold text-xs sm:text-sm"
              autoFocus
            />
          </div>

          <DialogFooter className="flex-row gap-2 pt-1">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsCounterNameDialogOpen(false)}
              className="flex-1 h-9 rounded-2xl bg-slate-100 border-slate-300 text-slate-700 text-xs font-bold"
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
              className="flex-1 h-9 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black text-xs shadow-xs"
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 6. Admin Batch Review & Approval Modal */}
      <Dialog open={isBatchApproveModalOpen} onOpenChange={setIsBatchApproveModalOpen}>
        <DialogContent className="bg-white border-slate-200 text-slate-900 max-w-lg p-4 sm:p-5 rounded-3xl font-faruma shadow-2xl" dir="rtl">
          <DialogHeader className="text-right space-y-0.5">
            <DialogTitle className="text-sm sm:text-base font-black text-slate-900 flex items-center justify-end gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span>Admin Batch Audit Approval</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 font-sans">
              Review all user counts and commit to live inventory.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-2.5 font-sans text-xs">
            {/* Stats card */}
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Total Counted:</span>
                <strong className="text-slate-900 font-black">{stats.countedCount} items</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Pending Review:</span>
                <strong className="text-amber-700 font-black">{stats.pendingApprovalCount} items</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Discrepancies:</span>
                <strong className="text-rose-600 font-black">{stats.discrepancyCount} items</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Variance Value:</span>
                <strong className={stats.totalVarianceValue >= 0 ? "text-emerald-700" : "text-rose-600"}>
                  {stats.totalVarianceValue >= 0 ? '+' : ''}{formatCurrency(stats.totalVarianceValue)}
                </strong>
              </div>
            </div>

            {/* Scope selection */}
            <div className="space-y-1">
              <label className="text-slate-700 font-bold block text-[11px]">Approval Scope:</label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setBatchScope('pending')}
                  className={cn(
                    "p-2 rounded-xl border text-xs font-bold text-center transition-all",
                    batchScope === 'pending'
                      ? "bg-amber-100 border-amber-400 text-amber-900 font-black"
                      : "bg-slate-50 border-slate-200 text-slate-700"
                  )}
                >
                  Only Pending ({stats.pendingApprovalCount})
                </button>
                <button
                  type="button"
                  onClick={() => setBatchScope('all')}
                  className={cn(
                    "p-2 rounded-xl border text-xs font-bold text-center transition-all",
                    batchScope === 'all'
                      ? "bg-emerald-100 border-emerald-400 text-emerald-900 font-black"
                      : "bg-slate-50 border-slate-200 text-slate-700"
                  )}
                >
                  All Counted ({stats.countedCount})
                </button>
              </div>
            </div>

            {/* Counted products preview */}
            <div className="max-h-40 overflow-y-auto space-y-1 border border-slate-200 rounded-2xl p-1.5 bg-slate-50 custom-scrollbar">
              {products
                .filter(p => {
                  const item = auditSession.items[p.id];
                  if (!item || item.totalCounted === 0) return false;
                  return batchScope === 'pending' ? !item.isApproved : true;
                })
                .map(p => {
                  const item = auditSession.items[p.id]!;
                  const totalSys = (p.stock_shop || 0) + (p.stock_godown || 0);
                  const diff = item.totalCounted - totalSys;
                  const contributors = item.entries.map(e => `${e.counterName} (+${e.quantity})`).join(', ');

                  return (
                    <div key={p.id} className="p-1.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between text-[11px]">
                      <div className="truncate pl-2">
                        <p className="font-bold text-slate-900 truncate">{p.name_en}</p>
                        <p className="text-[9px] text-slate-500 truncate">By: {contributors}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-black text-emerald-700">{item.totalCounted} pcs</span>
                        <span className={cn("block text-[9px] font-bold", diff === 0 ? "text-slate-400" : (diff > 0 ? "text-cyan-700" : "text-rose-600"))}>
                          {diff > 0 ? `+${diff}` : diff}
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          <DialogFooter className="flex-row gap-2 pt-1">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsBatchApproveModalOpen(false)}
              className="flex-1 h-10 rounded-2xl bg-slate-100 border-slate-300 text-slate-700 text-xs font-bold"
            >
              Cancel
            </Button>
            <Button 
              type="button" 
              onClick={handleBatchApprove}
              disabled={isCommitting || stats.countedCount === 0}
              className="flex-1 h-10 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-xs"
            >
              {isCommitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm & Update Stock'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 7. Reset Confirmation */}
      <Dialog open={isResetModalOpen} onOpenChange={setIsResetModalOpen}>
        <DialogContent className="bg-white border-slate-200 text-slate-900 max-w-xs p-4 rounded-3xl font-faruma shadow-2xl" dir="rtl">
          <DialogHeader className="text-right space-y-0.5">
            <DialogTitle className="text-sm sm:text-base font-black text-rose-600 flex items-center justify-end gap-1.5">
              <AlertTriangle className="h-4 w-4" />
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
              className="flex-1 h-9 rounded-2xl bg-slate-100 border-slate-300 text-slate-700 text-xs font-bold"
            >
              Cancel
            </Button>
            <Button 
              type="button" 
              onClick={handleResetAudit}
              className="flex-1 h-9 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs shadow-xs"
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
