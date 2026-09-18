"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Search, 
  Camera, 
  QrCode, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  Plus, 
  Minus, 
  Trash2, 
  Share2, 
  Save, 
  FileSpreadsheet, 
  RotateCcw, 
  Layers, 
  Store, 
  Warehouse, 
  User as UserIcon, 
  Sparkles, 
  Check, 
  X, 
  Info,
  Clock,
  ChevronDown,
  ChevronUp,
  Boxes
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { QRCodeSVG } from 'qrcode.react';
import * as XLSX from 'xlsx';
import { useAppContext, Product } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { showSuccess, showError, showInfo } from '@/utils/toast';
import { formatCurrency, formatNumber } from '@/utils/formatters';
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

// Audio beep synthesizer for barcode scanner
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
  } catch (e) {
    console.warn('Audio beep error:', e);
  }
};

const StockAudit: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { products, updateProduct, settings } = useAppContext();
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

  const [isLoadingAudit, setIsLoadingAudit] = useState(true);
  const [isRealtimeActive, setIsRealtimeActive] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'counted' | 'uncounted' | 'discrepancy'>('all');
  const [locationFilter, setLocationFilter] = useState<'all' | 'shop' | 'godown'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Scanner modal state
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const scannerStreamRef = useRef<MediaStream | null>(null);

  // Quick Count Modal for specific product
  const [activeCountingProduct, setActiveCountingProduct] = useState<Product | null>(null);
  const [countInput, setCountInput] = useState<string>('1');
  const [countLocation, setCountLocation] = useState<'shop' | 'godown'>('shop');
  const [selectedUnitMultiplier, setSelectedUnitMultiplier] = useState<number>(1);
  const [selectedUnitName, setSelectedUnitName] = useState<string>('Piece (NOS)');

  // QR share modal
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Commit to inventory confirmation modal
  const [isCommitModalOpen, setIsCommitModalOpen] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [commitOnlyCounted, setCommitOnlyCounted] = useState(true);

  // Reset audit session modal
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  // Expanded details toggle for product cards
  const [expandedProductIds, setExpandedProductIds] = useState<Record<string, boolean>>({});

  // 1. Load active audit from Supabase / localStorage on mount
  useEffect(() => {
    let isMounted = true;

    const loadAuditSession = async () => {
      setIsLoadingAudit(true);
      try {
        // Try loading from Supabase settings first
        if (supabase) {
          const { data, error } = await supabase
            .from('settings')
            .select('data')
            .eq('category', 'active_stock_audit')
            .maybeSingle();

          if (data?.data && isMounted) {
            setAuditSession(data.data as ActiveAuditSession);
            localStorage.setItem('cached_stock_audit', JSON.stringify(data.data));
            setIsLoadingAudit(false);
            return;
          }
        }
      } catch (err) {
        console.warn('Supabase audit fetch note:', err);
      }

      // Fallback to localStorage
      try {
        const cached = localStorage.getItem('cached_stock_audit');
        if (cached && isMounted) {
          setAuditSession(JSON.parse(cached));
        }
      } catch (e) {
        console.error('Error reading cached audit:', e);
      } finally {
        if (isMounted) setIsLoadingAudit(false);
      }
    };

    loadAuditSession();

    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Set up Supabase Realtime Channel for instant multi-user synchronization
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

  // 3. Save audit session helper & broadcast to other devices
  const saveAuditSession = async (newSession: ActiveAuditSession, sender = counterName) => {
    setAuditSession(newSession);
    localStorage.setItem('cached_stock_audit', JSON.stringify(newSession));

    // Save to Supabase settings table
    if (supabase) {
      try {
        const { data: existing } = await supabase
          .from('settings')
          .select('id')
          .eq('category', 'active_stock_audit')
          .maybeSingle();

        const payload = {
          category: 'active_stock_audit',
          data: newSession,
          updated_at: new Date().toISOString()
        };

        if (existing?.id) {
          await supabase.from('settings').update(payload).eq('id', existing.id);
        } else {
          await supabase.from('settings').insert({ ...payload, id: crypto.randomUUID() });
        }

        // Broadcast to other users
        const channel = supabase.channel('stock_audit_room');
        channel.send({
          type: 'broadcast',
          event: 'audit_update',
          payload: { session: newSession, sender }
        });
      } catch (err) {
        console.warn('Error saving audit to Supabase:', err);
      }
    }
  };

  // 4. Additive count handler: adds new count entry for a product
  const handleAddCount = async (
    product: Product, 
    qty: number, 
    location: 'shop' | 'godown' = 'shop',
    unitName = 'Piece (NOS)',
    unitMultiplier = 1
  ) => {
    if (isNaN(qty) || qty <= 0) {
      showError('Please enter a valid quantity greater than 0');
      return;
    }

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

    const existingItem = auditSession.items[product.id] || {
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
      ...auditSession,
      items: {
        ...auditSession.items,
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

    await saveAuditSession(updatedSession);
    playBeep(980, 'sine', 0.1);
    showSuccess(`+${effectiveQty} added to ${product.name_en} (${location})`);
  };

  // Delete an individual count entry (e.g. if user made a typo)
  const handleDeleteEntry = async (productId: string, entryId: string) => {
    const item = auditSession.items[productId];
    if (!item) return;

    const updatedEntries = item.entries.filter(e => e.id !== entryId);
    const totalShopCounted = updatedEntries
      .filter(e => e.location === 'shop')
      .reduce((sum, e) => sum + e.quantity, 0);
    const totalGodownCounted = updatedEntries
      .filter(e => e.location === 'godown')
      .reduce((sum, e) => sum + e.quantity, 0);
    const totalCounted = totalShopCounted + totalGodownCounted;

    const newItems = { ...auditSession.items };
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

    const updatedSession = { ...auditSession, items: newItems };
    await saveAuditSession(updatedSession);
    showSuccess('Count entry removed');
  };

  // 5. Camera Barcode Scanner
  const startCameraScanner = async () => {
    setIsScannerOpen(true);
    setScannerError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } }
      });
      scannerStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      // Check if native BarcodeDetector API is supported
      if ('BarcodeDetector' in window) {
        const barcodeDetector = new (window as any).BarcodeDetector({
          formats: ['qr_code', 'ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e', 'itf']
        });

        const scanInterval = setInterval(async () => {
          if (!videoRef.current || !isScannerOpen) {
            clearInterval(scanInterval);
            return;
          }
          try {
            const barcodes = await barcodeDetector.detect(videoRef.current);
            if (barcodes && barcodes.length > 0) {
              const code = barcodes[0].rawValue;
              clearInterval(scanInterval);
              handleScannedCode(code);
            }
          } catch (e) {
            // Frame detection error, ignore and continue
          }
        }, 200);
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      setScannerError('Could not open camera. Please ensure camera permissions are granted.');
    }
  };

  const stopCameraScanner = () => {
    if (scannerStreamRef.current) {
      scannerStreamRef.current.getTracks().forEach(t => t.stop());
      scannerStreamRef.current = null;
    }
    setIsScannerOpen(false);
  };

  const handleScannedCode = (code: string) => {
    stopCameraScanner();
    playBeep(1050, 'sine', 0.15);

    const cleanCode = code.trim();
    const matchedProduct = products.find(p => 
      p.barcode === cleanCode || 
      p.item_code === cleanCode || 
      p.barcode.toLowerCase() === cleanCode.toLowerCase()
    );

    if (matchedProduct) {
      openQuickCountModal(matchedProduct);
      showSuccess(`Scanned: ${matchedProduct.name_en}`);
    } else {
      setSearchTerm(cleanCode);
      showError(`No product found with barcode "${cleanCode}". Search filtered.`);
    }
  };

  // Open Quick Count Modal for a product
  const openQuickCountModal = (product: Product) => {
    setActiveCountingProduct(product);
    setCountInput('1');
    setCountLocation('shop');
    setSelectedUnitMultiplier(1);
    setSelectedUnitName('Piece (NOS)');
  };

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach(p => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [products]);

  // Filtered products
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      // Category filter
      if (selectedCategory !== 'all' && product.category !== selectedCategory) {
        return false;
      }

      // Search match
      const search = searchTerm.toLowerCase().trim();
      const matchesSearch = !search ||
        product.name_en?.toLowerCase().includes(search) ||
        product.name_dv?.toLowerCase().includes(search) ||
        product.barcode?.toLowerCase().includes(search) ||
        product.item_code?.toLowerCase().includes(search);

      if (!matchesSearch) return false;

      // Audit status filters
      const auditItem = auditSession.items[product.id];
      const isCounted = !!auditItem && auditItem.totalCounted > 0;
      const totalSystemStock = (product.stock_shop || 0) + (product.stock_godown || 0);
      const variance = isCounted ? (auditItem.totalCounted - totalSystemStock) : 0;
      const hasDiscrepancy = isCounted && variance !== 0;

      if (filterMode === 'counted') return isCounted;
      if (filterMode === 'uncounted') return !isCounted;
      if (filterMode === 'discrepancy') return hasDiscrepancy;

      return true;
    });
  }, [products, searchTerm, selectedCategory, filterMode, auditSession]);

  // Audit Statistics
  const stats = useMemo(() => {
    const totalProducts = products.length;
    let countedCount = 0;
    let discrepancyCount = 0;
    let totalVarianceUnits = 0;
    let totalVarianceValue = 0;

    products.forEach(p => {
      const item = auditSession.items[p.id];
      const systemStock = (p.stock_shop || 0) + (p.stock_godown || 0);
      if (item && item.totalCounted > 0) {
        countedCount++;
        const diff = item.totalCounted - systemStock;
        if (diff !== 0) {
          discrepancyCount++;
          totalVarianceUnits += diff;
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
      totalVarianceUnits,
      totalVarianceValue,
      progressPercent
    };
  }, [products, auditSession]);

  // 6. Commit Audit to Live Inventory
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
          // If specific locations were counted:
          if (item.totalShopCounted > 0 || item.totalGodownCounted > 0) {
            newShopStock = item.totalShopCounted;
            newGodownStock = item.totalGodownCounted;
          } else {
            // Default to updating shop stock with total count
            newShopStock = item.totalCounted;
          }
        } else if (!commitOnlyCounted) {
          // If uncounted products are treated as 0 stock
          newShopStock = 0;
          newGodownStock = 0;
        }

        const updatedProduct: Product = {
          ...product,
          stock_shop: Math.max(0, Math.round(newShopStock)),
          stock_godown: Math.max(0, Math.round(newGodownStock))
        };

        await updateProduct(updatedProduct);
        updatedCount++;
      }

      // Mark session as completed
      const completedSession: ActiveAuditSession = {
        ...auditSession,
        status: 'completed'
      };
      await saveAuditSession(completedSession);

      showSuccess(`Audit committed successfully! ${updatedCount} products updated in inventory.`);
      setIsCommitModalOpen(false);
    } catch (err: any) {
      console.error('Error committing audit:', err);
      showError(err?.message || 'Failed to commit audit to inventory');
    } finally {
      setIsCommitting(false);
    }
  };

  // 7. Reset / Start New Audit Session
  const handleResetAudit = async () => {
    const newSession: ActiveAuditSession = {
      id: `audit-${Date.now()}`,
      title: `Stock Audit ${new Date().toLocaleDateString()}`,
      startedAt: new Date().toISOString(),
      status: 'active',
      items: {}
    };

    await saveAuditSession(newSession);
    setIsResetModalOpen(false);
    showSuccess('New audit session started. All product counts reset.');
  };

  // 8. Export Audit to Excel
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
        const varianceVal = diff * cost;

        const counters = item?.entries
          ? Array.from(new Set(item.entries.map(e => e.counterName))).join(', ')
          : '-';

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
          'Variance Value (MVR)': isCounted ? varianceVal.toFixed(2) : '-',
          'Counted By': counters
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Stock Audit');
      XLSX.writeFile(workbook, `Stock_Audit_${new Date().toISOString().split('T')[0]}.xlsx`);
      showSuccess('Audit report exported to Excel!');
    } catch (err: any) {
      console.error('Error exporting excel:', err);
      showError('Failed to export audit report');
    }
  };

  // Share audit link URL
  const auditShareUrl = window.location.origin + '/stock-audit';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-faruma flex flex-col pb-24 selection:bg-primary/30" dir="rtl">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 px-4 py-3 shadow-lg">
        <div className="flex items-center justify-between gap-2 max-w-7xl mx-auto">
          {/* Back button & Brand */}
          <div className="flex items-center gap-2.5">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate('/stock')}
              className="h-10 w-10 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black text-white leading-tight">ސްޓޮކް އޮޑިޓް</h1>
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-[10px] font-bold py-0 h-5">
                  Mobile Audit
                </Badge>
              </div>
              <p className="text-[11px] text-slate-400 font-sans tracking-wide">Multi-Device Live Stock Audit</p>
            </div>
          </div>

          {/* Right Action Icons */}
          <div className="flex items-center gap-1.5">
            {/* Realtime Pulse */}
            <div 
              title={isRealtimeActive ? "Connected to Live Cloud Sync" : "Local / Offline Sync"}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border",
                isRealtimeActive 
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" 
                  : "bg-amber-500/10 text-amber-400 border-amber-500/30"
              )}
            >
              <span className={cn("h-2 w-2 rounded-full", isRealtimeActive ? "bg-emerald-500 animate-pulse" : "bg-amber-500")} />
              <span className="hidden sm:inline font-sans">{isRealtimeActive ? 'Live Sync' : 'Local'}</span>
            </div>

            {/* Counter Profile Pill */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setTempCounterName(counterName);
                setIsCounterNameDialogOpen(true);
              }}
              className="h-9 px-3 rounded-xl bg-slate-800/80 border-slate-700 hover:bg-slate-700 text-xs font-bold gap-1.5 text-slate-200"
            >
              <UserIcon className="h-3.5 w-3.5 text-primary" />
              <span className="max-w-[80px] truncate">{counterName}</span>
            </Button>

            {/* QR Share Link */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsShareModalOpen(true)}
              className="h-9 w-9 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300"
              title="Share Audit Link / QR"
            >
              <QrCode className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-5 space-y-4">
        {/* Audit Stats Dashboard Card */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-800 border border-slate-800 shadow-xl space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Audit Progress</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-white">{stats.countedCount}</span>
                <span className="text-xs text-slate-400">/ {stats.totalProducts} items ({stats.progressPercent}%)</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportExcel}
                className="h-8 px-3 rounded-xl bg-slate-800 border-slate-700 hover:bg-slate-700 text-xs font-bold gap-1.5 text-emerald-400"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Export Excel</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsResetModalOpen(true)}
                className="h-8 px-3 rounded-xl bg-slate-800 border-slate-700 hover:bg-red-500/20 text-xs font-bold gap-1.5 text-red-400"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Reset</span>
              </Button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-amber-500 via-primary to-emerald-500 h-full transition-all duration-500 rounded-full"
              style={{ width: `${stats.progressPercent}%` }}
            />
          </div>

          {/* Metric Chips */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80 text-center">
              <p className="text-[10px] text-slate-400 font-bold uppercase">Counted</p>
              <p className="text-base font-black text-emerald-400">{stats.countedCount}</p>
            </div>
            <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80 text-center">
              <p className="text-[10px] text-slate-400 font-bold uppercase">Uncounted</p>
              <p className="text-base font-black text-amber-400">{stats.uncountedCount}</p>
            </div>
            <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80 text-center">
              <p className="text-[10px] text-slate-400 font-bold uppercase">Discrepancy</p>
              <p className="text-base font-black text-rose-400">{stats.discrepancyCount}</p>
            </div>
          </div>
        </div>

        {/* Live Search & Camera Scan Bar */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search product name, barcode, or code..."
              className="h-12 pr-10 pl-10 rounded-2xl bg-slate-900 border-slate-800 text-white placeholder:text-slate-500 focus:border-primary font-bold text-sm shadow-inner"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <Button
            onClick={startCameraScanner}
            className="h-12 px-4 rounded-2xl bg-primary hover:bg-primary/90 text-slate-950 font-black gap-2 shadow-lg shadow-primary/20 shrink-0"
          >
            <Camera className="h-5 w-5" />
            <span className="hidden sm:inline">Scan Barcode</span>
          </Button>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar text-xs font-bold">
          <button
            onClick={() => setFilterMode('all')}
            className={cn(
              "px-3.5 py-2 rounded-xl border transition-all whitespace-nowrap",
              filterMode === 'all'
                ? "bg-primary text-slate-950 border-primary font-black shadow-md shadow-primary/20"
                : "bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800"
            )}
          >
            All Products ({products.length})
          </button>
          <button
            onClick={() => setFilterMode('counted')}
            className={cn(
              "px-3.5 py-2 rounded-xl border transition-all whitespace-nowrap",
              filterMode === 'counted'
                ? "bg-emerald-500 text-slate-950 border-emerald-500 font-black shadow-md shadow-emerald-500/20"
                : "bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800"
            )}
          >
            Counted ({stats.countedCount})
          </button>
          <button
            onClick={() => setFilterMode('uncounted')}
            className={cn(
              "px-3.5 py-2 rounded-xl border transition-all whitespace-nowrap",
              filterMode === 'uncounted'
                ? "bg-amber-500 text-slate-950 border-amber-500 font-black shadow-md shadow-amber-500/20"
                : "bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800"
            )}
          >
            Uncounted ({stats.uncountedCount})
          </button>
          <button
            onClick={() => setFilterMode('discrepancy')}
            className={cn(
              "px-3.5 py-2 rounded-xl border transition-all whitespace-nowrap",
              filterMode === 'discrepancy'
                ? "bg-rose-500 text-slate-950 border-rose-500 font-black shadow-md shadow-rose-500/20"
                : "bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800"
            )}
          >
            Discrepancies ({stats.discrepancyCount})
          </button>
        </div>

        {/* Product Audit List */}
        <div className="space-y-3">
          {filteredProducts.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-3">
              <Boxes className="h-10 w-10 text-slate-600 mx-auto" />
              <p className="text-slate-400 font-bold text-sm">No products matched your search or filter</p>
              {searchTerm && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setSearchTerm('')} 
                  className="bg-slate-800 text-xs text-slate-200"
                >
                  Clear Search
                </Button>
              )}
            </div>
          ) : (
            filteredProducts.map((product) => {
              const auditItem = auditSession.items[product.id];
              const isCounted = !!auditItem && auditItem.totalCounted > 0;
              const systemShop = product.stock_shop || 0;
              const systemGodown = product.stock_godown || 0;
              const totalSystem = systemShop + systemGodown;
              const countedTotal = isCounted ? auditItem.totalCounted : 0;
              const variance = isCounted ? (countedTotal - totalSystem) : 0;
              const isExpanded = !!expandedProductIds[product.id];

              return (
                <Card 
                  key={product.id}
                  className={cn(
                    "bg-slate-900/90 border transition-all duration-200 overflow-hidden shadow-md",
                    isCounted 
                      ? (variance === 0 ? "border-emerald-500/40 bg-emerald-950/10" : "border-amber-500/40 bg-amber-950/10")
                      : "border-slate-800 hover:border-slate-700"
                  )}
                >
                  <CardContent className="p-3.5 space-y-3">
                    {/* Header Row: Names & Audit Pill */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <h3 className="text-base font-black text-white leading-tight">{product.name_dv}</h3>
                          {isCounted && (
                            <Badge 
                              className={cn(
                                "text-[10px] font-black px-2 py-0.5 rounded-full",
                                variance === 0 
                                  ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" 
                                  : (variance > 0 ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/30" : "bg-rose-500/20 text-rose-400 border-rose-500/30")
                              )}
                            >
                              {variance === 0 ? "✓ Matched" : (variance > 0 ? `+${variance} Over` : `${variance} Short`)}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs font-bold text-slate-300 font-sans mt-0.5">{product.name_en}</p>
                        <div className="flex items-center justify-end gap-3 text-[11px] text-slate-400 font-sans mt-1">
                          {product.barcode && <span>Barcode: <strong className="text-slate-200">{product.barcode}</strong></span>}
                          {product.item_code && <span>Code: <strong className="text-slate-200">{product.item_code}</strong></span>}
                          <span>Price: <strong className="text-primary">{formatCurrency(product.price)}</strong></span>
                        </div>
                      </div>
                    </div>

                    {/* Stock Comparison Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80 font-sans">
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase">System Shop</span>
                        <p className="text-sm font-black text-slate-200">{systemShop} pcs</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase">System Godown</span>
                        <p className="text-sm font-black text-slate-200">{systemGodown} pcs</p>
                      </div>
                      <div className="border-t sm:border-t-0 sm:border-r border-slate-800 pt-1 sm:pt-0 sm:pr-2">
                        <span className="text-[10px] text-slate-400 font-bold uppercase">Total Counted</span>
                        <p className={cn(
                          "text-base font-black",
                          isCounted ? "text-emerald-400" : "text-slate-500"
                        )}>
                          {isCounted ? `${countedTotal} pcs` : 'Not counted'}
                        </p>
                      </div>
                      <div className="border-t sm:border-t-0 sm:border-r border-slate-800 pt-1 sm:pt-0 sm:pr-2">
                        <span className="text-[10px] text-slate-400 font-bold uppercase">Variance</span>
                        <p className={cn(
                          "text-base font-black",
                          variance === 0 ? "text-slate-400" : (variance > 0 ? "text-cyan-400" : "text-rose-400")
                        )}>
                          {isCounted ? `${variance > 0 ? '+' : ''}${variance} pcs` : '-'}
                        </p>
                      </div>
                    </div>

                    {/* Quick Count Adders & Open Counter Button */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      {/* Quick +Chips */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] text-slate-400 font-bold pl-1 font-sans">Quick Add:</span>
                        {[1, 5, 10, 12, 24].map((q) => (
                          <Button
                            key={q}
                            size="sm"
                            variant="outline"
                            onClick={() => handleAddCount(product, q, 'shop')}
                            className="h-8 px-2.5 rounded-lg bg-slate-800/90 border-slate-700 hover:bg-primary hover:text-slate-950 text-xs font-black transition-all"
                          >
                            +{q}
                          </Button>
                        ))}
                      </div>

                      {/* Custom Count Button & Details Toggle */}
                      <div className="flex items-center gap-1.5 mr-auto">
                        <Button
                          size="sm"
                          onClick={() => openQuickCountModal(product)}
                          className="h-8 px-3 rounded-lg bg-primary hover:bg-primary/90 text-slate-950 text-xs font-black gap-1"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>Custom Count</span>
                        </Button>

                        {auditItem && auditItem.entries.length > 0 && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setExpandedProductIds(prev => ({ ...prev, [product.id]: !prev[product.id] }))}
                            className="h-8 w-8 p-0 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"
                            title="View Count History"
                          >
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Expanded Count History (Who added what) */}
                    {isExpanded && auditItem && auditItem.entries.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-slate-800 space-y-1.5 font-sans">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Count Submissions ({auditItem.entries.length}):</p>
                        <div className="space-y-1 max-h-40 overflow-y-auto custom-scrollbar">
                          {auditItem.entries.map((entry) => (
                            <div 
                              key={entry.id}
                              className="flex items-center justify-between p-2 rounded-lg bg-slate-950/80 border border-slate-800/80 text-xs"
                            >
                              <div className="flex items-center gap-2">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => handleDeleteEntry(product.id, entry.id)}
                                  className="h-6 w-6 text-red-400 hover:bg-red-500/10 rounded"
                                  title="Delete this entry"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                                <span className="font-bold text-emerald-400">+{entry.quantity} pcs</span>
                                <Badge variant="outline" className="text-[9px] h-4 py-0 uppercase border-slate-700">
                                  {entry.location}
                                </Badge>
                                {entry.unitName && <span className="text-[10px] text-slate-400">({entry.unitName})</span>}
                              </div>
                              <div className="text-right text-[11px] text-slate-400">
                                <strong className="text-slate-200">{entry.counterName}</strong> • {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </main>

      {/* Floating Bottom Action Bar */}
      <footer className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 p-3 shadow-2xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button
              onClick={startCameraScanner}
              className="h-12 px-5 rounded-2xl bg-slate-800 border border-slate-700 hover:bg-slate-700 text-white font-bold gap-2"
            >
              <Camera className="h-5 w-5 text-primary" />
              <span>Scan Item</span>
            </Button>

            <div className="hidden sm:block text-right">
              <p className="text-xs text-slate-400">Counted Products</p>
              <p className="text-sm font-black text-emerald-400">{stats.countedCount} of {stats.totalProducts}</p>
            </div>
          </div>

          <Button
            onClick={() => setIsCommitModalOpen(true)}
            disabled={stats.countedCount === 0}
            className="h-12 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-slate-950 font-black gap-2 shadow-lg shadow-emerald-500/20"
          >
            <Save className="h-5 w-5" />
            <span>Apply Audit to Inventory</span>
          </Button>
        </div>
      </footer>

      {/* 1. Custom Count Dialog */}
      <Dialog open={!!activeCountingProduct} onOpenChange={(open) => !open && setActiveCountingProduct(null)}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-md p-5 rounded-2xl font-faruma" dir="rtl">
          {activeCountingProduct && (
            <div className="space-y-4">
              <DialogHeader className="text-right space-y-1">
                <DialogTitle className="text-lg font-black text-white">{activeCountingProduct.name_dv}</DialogTitle>
                <DialogDescription className="text-xs text-slate-400 font-sans">{activeCountingProduct.name_en}</DialogDescription>
              </DialogHeader>

              {/* Location Switcher */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Location:</label>
                <div className="grid grid-cols-2 gap-2 font-sans">
                  <button
                    type="button"
                    onClick={() => setCountLocation('shop')}
                    className={cn(
                      "p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all",
                      countLocation === 'shop'
                        ? "bg-primary text-slate-950 border-primary font-black shadow-md shadow-primary/20"
                        : "bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800"
                    )}
                  >
                    <Store className="h-4 w-4" />
                    <span>Shop Shelf</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCountLocation('godown')}
                    className={cn(
                      "p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all",
                      countLocation === 'godown'
                        ? "bg-primary text-slate-950 border-primary font-black shadow-md shadow-primary/20"
                        : "bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800"
                    )}
                  >
                    <Warehouse className="h-4 w-4" />
                    <span>Godown / Storage</span>
                  </button>
                </div>
              </div>

              {/* Unit Selection if Available */}
              {activeCountingProduct.units && Array.isArray(activeCountingProduct.units) && activeCountingProduct.units.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 font-sans">Unit Size:</label>
                  <div className="flex flex-wrap gap-1.5 font-sans">
                    <Button
                      type="button"
                      size="sm"
                      variant={selectedUnitMultiplier === 1 ? 'default' : 'outline'}
                      onClick={() => {
                        setSelectedUnitMultiplier(1);
                        setSelectedUnitName('Piece (NOS)');
                      }}
                      className={cn(
                        "h-8 text-xs font-bold rounded-lg",
                        selectedUnitMultiplier === 1 ? "bg-primary text-slate-950" : "bg-slate-950 border-slate-800 text-slate-300"
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
                            "h-8 text-xs font-bold rounded-lg",
                            selectedUnitMultiplier === mult ? "bg-primary text-slate-950" : "bg-slate-950 border-slate-800 text-slate-300"
                          )}
                        >
                          {uName} ({mult} pcs)
                        </Button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Quantity Input with Stepper */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 font-sans">Quantity to Add:</label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCountInput(prev => String(Math.max(1, (parseInt(prev) || 1) - 1)))}
                    className="h-12 w-12 rounded-xl bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
                  >
                    <Minus className="h-5 w-5" />
                  </Button>
                  <Input
                    type="number"
                    min="1"
                    value={countInput}
                    onChange={(e) => setCountInput(e.target.value)}
                    className="h-12 text-center text-xl font-black rounded-xl bg-slate-950 border-slate-800 text-white font-sans"
                    autoFocus
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCountInput(prev => String((parseInt(prev) || 0) + 1))}
                    className="h-12 w-12 rounded-xl bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
                  >
                    <Plus className="h-5 w-5" />
                  </Button>
                </div>
                {selectedUnitMultiplier > 1 && (
                  <p className="text-xs text-primary font-bold text-center font-sans">
                    = Total {(parseInt(countInput) || 0) * selectedUnitMultiplier} individual pieces
                  </p>
                )}
              </div>

              {/* Quick Number Grid */}
              <div className="grid grid-cols-4 gap-2 font-sans">
                {[5, 10, 12, 24].map((n) => (
                  <Button
                    key={n}
                    type="button"
                    variant="outline"
                    onClick={() => setCountInput(String(n))}
                    className="h-9 rounded-lg bg-slate-950 border-slate-800 text-xs font-bold text-slate-300 hover:bg-slate-800"
                  >
                    Set {n}
                  </Button>
                ))}
              </div>

              <DialogFooter className="flex-row gap-2 pt-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setActiveCountingProduct(null)}
                  className="flex-1 h-11 rounded-xl bg-slate-800 border-slate-700 text-slate-300"
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
                  className="flex-1 h-11 rounded-xl bg-primary hover:bg-primary/90 text-slate-950 font-black"
                >
                  Add Count
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 2. Live Camera Scanner Dialog */}
      <Dialog open={isScannerOpen} onOpenChange={(open) => !open && stopCameraScanner()}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-md p-5 rounded-2xl font-faruma" dir="rtl">
          <DialogHeader className="text-right space-y-1">
            <DialogTitle className="text-lg font-black text-white">Camera Barcode Scanner</DialogTitle>
            <DialogDescription className="text-xs text-slate-400 font-sans">
              Point your camera at any product barcode to automatically scan and add counts.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {/* Live Video Window */}
            <div className="relative aspect-video rounded-xl bg-black overflow-hidden border border-slate-800 flex items-center justify-center">
              <video 
                ref={videoRef} 
                playsInline 
                muted 
                className="w-full h-full object-cover"
              />
              {/* Aiming Reticle */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-48 h-28 border-2 border-primary/80 rounded-lg shadow-[0_0_15px_rgba(249,115,22,0.4)] animate-pulse" />
              </div>
            </div>

            {scannerError && (
              <p className="text-xs text-rose-400 font-bold text-center font-sans">{scannerError}</p>
            )}

            {/* Fallback Manual Code Input */}
            <div className="space-y-1 font-sans">
              <label className="text-[11px] text-slate-400 font-bold">Or enter barcode manually:</label>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter barcode..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.currentTarget.value) {
                      handleScannedCode(e.currentTarget.value);
                    }
                  }}
                  className="h-10 rounded-xl bg-slate-950 border-slate-800 text-white text-sm"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={stopCameraScanner}
              className="w-full h-11 rounded-xl bg-slate-800 border-slate-700 text-slate-300 font-bold"
            >
              Close Scanner
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 3. QR Share Dialog */}
      <Dialog open={isShareModalOpen} onOpenChange={setIsShareModalOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-sm p-6 rounded-2xl font-faruma text-center" dir="rtl">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-lg font-black text-white">Join Stock Audit</DialogTitle>
            <DialogDescription className="text-xs text-slate-400 font-sans">
              Scan this QR code with any phone camera to open this audit session instantly.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 flex flex-col items-center justify-center space-y-4">
            <div className="p-3 bg-white rounded-2xl shadow-xl">
              <QRCodeSVG value={auditShareUrl} size={180} />
            </div>

            <div className="w-full space-y-1.5 font-sans">
              <p className="text-xs text-slate-400 truncate">{auditShareUrl}</p>
              <Button
                onClick={() => {
                  navigator.clipboard.writeText(auditShareUrl);
                  showSuccess('Audit link copied to clipboard!');
                }}
                className="w-full h-10 rounded-xl bg-primary hover:bg-primary/90 text-slate-950 font-bold text-xs gap-1.5"
              >
                <Share2 className="h-4 w-4" />
                <span>Copy Link</span>
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsShareModalOpen(false)}
              className="w-full h-10 rounded-xl bg-slate-800 border-slate-700 text-slate-300 font-bold text-xs"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 4. Counter Profile Edit Dialog */}
      <Dialog open={isCounterNameDialogOpen} onOpenChange={setIsCounterNameDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-sm p-5 rounded-2xl font-faruma" dir="rtl">
          <DialogHeader className="text-right space-y-1">
            <DialogTitle className="text-base font-black text-white">Your Counter Name</DialogTitle>
            <DialogDescription className="text-xs text-slate-400 font-sans">
              This name will be stamped on all your stock counts so staff know who counted each item.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-2 font-sans">
            <Input
              value={tempCounterName}
              onChange={(e) => setTempCounterName(e.target.value)}
              placeholder="e.g. Ahmed (Shelf 1) or Cashier 1"
              className="h-11 rounded-xl bg-slate-950 border-slate-800 text-white font-bold text-sm"
              autoFocus
            />
          </div>

          <DialogFooter className="flex-row gap-2 pt-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsCounterNameDialogOpen(false)}
              className="flex-1 h-10 rounded-xl bg-slate-800 border-slate-700 text-slate-300 font-bold text-xs"
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
                  showSuccess(`Counter name updated to ${tempCounterName.trim()}`);
                }
              }}
              className="flex-1 h-10 rounded-xl bg-primary hover:bg-primary/90 text-slate-950 font-black text-xs"
            >
              Save Name
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 5. Commit Audit Confirmation Modal */}
      <Dialog open={isCommitModalOpen} onOpenChange={setIsCommitModalOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-md p-5 rounded-2xl font-faruma" dir="rtl">
          <DialogHeader className="text-right space-y-1">
            <DialogTitle className="text-lg font-black text-white flex items-center justify-end gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-400" />
              <span>Apply Audit to Live Inventory</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400 font-sans">
              This will update the live stock count for all counted products to match the audited numbers.
            </DialogDescription>
          </DialogHeader>

          <div className="py-3 space-y-3 font-sans">
            <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Total Products Counted:</span>
                <strong className="text-white">{stats.countedCount} items</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Discrepancy Items:</span>
                <strong className="text-amber-400">{stats.discrepancyCount} items</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Total Variance Value:</span>
                <strong className={stats.totalVarianceValue >= 0 ? "text-emerald-400" : "text-rose-400"}>
                  {stats.totalVarianceValue >= 0 ? '+' : ''}{formatCurrency(stats.totalVarianceValue)}
                </strong>
              </div>
            </div>

            <div className="flex items-center space-x-2 rtl:space-x-reverse text-xs text-slate-300">
              <input 
                type="checkbox"
                id="commitOnlyCounted"
                checked={commitOnlyCounted}
                onChange={(e) => setCommitOnlyCounted(e.target.checked)}
                className="rounded border-slate-700 bg-slate-950 text-primary"
              />
              <label htmlFor="commitOnlyCounted" className="cursor-pointer">
                Only update stock for <strong>counted products</strong> (keep uncounted products unchanged)
              </label>
            </div>
          </div>

          <DialogFooter className="flex-row gap-2 pt-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsCommitModalOpen(false)}
              className="flex-1 h-11 rounded-xl bg-slate-800 border-slate-700 text-slate-300 font-bold"
            >
              Cancel
            </Button>
            <Button 
              type="button" 
              onClick={handleCommitAudit}
              disabled={isCommitting}
              className="flex-1 h-11 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black"
            >
              {isCommitting ? 'Applying...' : 'Confirm & Apply'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 6. Reset Audit Confirmation Modal */}
      <Dialog open={isResetModalOpen} onOpenChange={setIsResetModalOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-sm p-5 rounded-2xl font-faruma" dir="rtl">
          <DialogHeader className="text-right space-y-1">
            <DialogTitle className="text-base font-black text-rose-400 flex items-center justify-end gap-2">
              <AlertTriangle className="h-5 w-5" />
              <span>Reset Audit Session?</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400 font-sans">
              Are you sure you want to reset all counted quantities and start a fresh stock audit session?
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex-row gap-2 pt-3">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsResetModalOpen(false)}
              className="flex-1 h-10 rounded-xl bg-slate-800 border-slate-700 text-slate-300 font-bold text-xs"
            >
              Cancel
            </Button>
            <Button 
              type="button" 
              onClick={handleResetAudit}
              className="flex-1 h-10 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs"
            >
              Reset Session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StockAudit;
