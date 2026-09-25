"use client";

import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAppContext, TransferSlip, Customer } from '@/context/AppContext';
import { formatMaldivesDate, formatMaldivesTime } from '@/utils/formatters';
import {
  CheckCircle2,
  XCircle,
  ExternalLink,
  RotateCw,
  ZoomIn,
  Clock,
  User,
  Phone,
  DollarSign,
  AlertCircle,
  Receipt,
  FileImage,
  RefreshCw,
  Eye,
  CreditCard,
  MessageSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TransferSlipsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialSlipId?: string | null;
}

export const TransferSlipsDialog: React.FC<TransferSlipsDialogProps> = ({
  open,
  onOpenChange,
  initialSlipId,
}) => {
  const {
    transferSlips,
    customers,
    settings,
    confirmTransferSlip,
    rejectTransferSlip,
    fetchTransferSlips,
  } = useAppContext();

  const [activeTab, setActiveTab] = useState<'pending' | 'confirmed' | 'rejected'>('pending');
  const [selectedSlipId, setSelectedSlipId] = useState<string | null>(initialSlipId || null);
  const [rotationDegrees, setRotationDegrees] = useState<number>(0);
  const [isZoomed, setIsZoomed] = useState<boolean>(false);
  const [settleAmount, setSettleAmount] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isRejecting, setIsRejecting] = useState<boolean>(false);
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [showRejectForm, setShowRejectForm] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isConfirmSettleModalOpen, setIsConfirmSettleModalOpen] = useState<boolean>(false);

  const currency = settings?.shop?.currency || 'MVR';

  // Filter slips by tab
  const filteredSlips = useMemo(() => {
    return transferSlips.filter((s) => s.status === activeTab);
  }, [transferSlips, activeTab]);

  // Selected slip object
  const selectedSlip = useMemo(() => {
    if (selectedSlipId) {
      const found = transferSlips.find((s) => s.id === selectedSlipId);
      if (found) return found;
    }
    // Default to the first pending slip if available
    return filteredSlips[0] || null;
  }, [selectedSlipId, transferSlips, filteredSlips]);

  // Matching customer for selected slip
  const linkedCustomer: Customer | undefined = useMemo(() => {
    if (!selectedSlip) return undefined;
    return customers.find(
      (c) =>
        (selectedSlip.customer_id && c.id === selectedSlip.customer_id) ||
        (c.telegram_chat_id && String(c.telegram_chat_id) === String(selectedSlip.telegram_chat_id))
    );
  }, [selectedSlip, customers]);

  // Initialize or update settleAmount when selected slip or suggested_amount changes
  React.useEffect(() => {
    if (selectedSlip) {
      setShowRejectForm(false);
      setRejectionReason('');
      setRotationDegrees(0);
      setIsZoomed(false);

      if (selectedSlip.suggested_amount && selectedSlip.suggested_amount > 0) {
        setSettleAmount(String(selectedSlip.suggested_amount));
      } else if (linkedCustomer && linkedCustomer.outstanding_balance > 0) {
        setSettleAmount(String(linkedCustomer.outstanding_balance));
      } else {
        setSettleAmount('');
      }
    }
  }, [selectedSlip?.id, selectedSlip?.suggested_amount, linkedCustomer?.outstanding_balance]);

  // Rotation handler
  const handleRotate = () => {
    setRotationDegrees((prev) => (prev + 90) % 360);
  };

  // Refresh slips from database
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchTransferSlips();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  // Open confirmation modal
  const handleConfirmSettlement = () => {
    if (!selectedSlip) return;
    const amount = parseFloat(settleAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid settlement amount greater than 0.');
      return;
    }
    setIsConfirmSettleModalOpen(true);
  };

  // Execute confirmed settlement
  const executeSettlement = async () => {
    if (!selectedSlip) return;
    const amount = parseFloat(settleAmount);
    if (isNaN(amount) || amount <= 0) return;

    setIsSubmitting(true);
    try {
      const success = await confirmTransferSlip(selectedSlip.id, amount);
      if (success) {
        setIsConfirmSettleModalOpen(false);
        // Move to the next pending slip if available
        const remaining = transferSlips.filter(
          (s) => s.status === 'pending' && s.id !== selectedSlip.id
        );
        if (remaining.length > 0) {
          setSelectedSlipId(remaining[0].id);
        } else {
          setSelectedSlipId(null);
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reject slip handler
  const handleRejectSlip = async (reasonToUse?: string) => {
    if (!selectedSlip) return;
    const reason = (reasonToUse || rejectionReason).trim();
    if (!reason) {
      alert('Please select or provide a reason for declining.');
      return;
    }

    setIsRejecting(true);
    try {
      const success = await rejectTransferSlip(selectedSlip.id, reason);
      if (success) {
        setShowRejectForm(false);
        setRejectionReason('');
        const remaining = transferSlips.filter(
          (s) => s.status === 'pending' && s.id !== selectedSlip.id
        );
        if (remaining.length > 0) {
          setSelectedSlipId(remaining[0].id);
        } else {
          setSelectedSlipId(null);
        }
      }
    } finally {
      setIsRejecting(false);
    }
  };

  const pendingCount = transferSlips.filter((s) => s.status === 'pending').length;
  const confirmedCount = transferSlips.filter((s) => s.status === 'confirmed').length;
  const rejectedCount = transferSlips.filter((s) => s.status === 'rejected').length;

  const currentOutstanding = linkedCustomer ? linkedCustomer.outstanding_balance : 0;
  const parsedAmount = parseFloat(settleAmount) || 0;
  const newOutstandingPreview = Math.max(0, currentOutstanding - parsedAmount);

  const presetReasons = [
    'Transfer not found in bank account',
    'Slip image blurry or unreadable',
    'Duplicate / already settled previously',
    'Payment amount does not match',
    'Transferred to wrong account number',
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[96vw] lg:max-w-6xl w-full max-h-[94vh] flex flex-col p-0 gap-0 overflow-hidden apple-liquid-glass bg-card/95 border border-white/20 dark:border-white/10 text-foreground rounded-[2rem] shadow-2xl box-border">
        {/* Header */}
        <DialogHeader className="p-6 pb-4 border-b border-border/80 flex flex-row items-center justify-between">
          <div>
            <DialogTitle className="text-2xl font-black flex items-center gap-3">
              <CreditCard className="h-6 w-6 text-primary" />
              Bank Transfer Slips Verification
              {pendingCount > 0 && (
                <Badge className="bg-amber-500 text-black font-bold animate-pulse">
                  {pendingCount} PENDING
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              Verify customer bank transfer slips sent to Telegram bot and settle debt balances in real time.
            </DialogDescription>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="gap-2 rounded-xl border-border"
            >
              <RefreshCw className={cn('h-3.5 w-3.5', isRefreshing && 'animate-spin')} />
              Refresh
            </Button>
          </div>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex items-center justify-between px-6 pt-3 pb-2 border-b border-border/50 bg-muted/20">
          <div className="flex gap-2">
            <Button
              variant={activeTab === 'pending' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => {
                setActiveTab('pending');
                setSelectedSlipId(null);
              }}
              className={cn(
                'rounded-xl font-bold gap-2 text-xs h-9',
                activeTab === 'pending' ? 'bg-amber-500 text-black hover:bg-amber-600' : ''
              )}
            >
              <Clock className="h-3.5 w-3.5" />
              Pending ({pendingCount})
            </Button>
            <Button
              variant={activeTab === 'confirmed' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => {
                setActiveTab('confirmed');
                setSelectedSlipId(null);
              }}
              className={cn(
                'rounded-xl font-bold gap-2 text-xs h-9',
                activeTab === 'confirmed' ? 'bg-green-600 text-white hover:bg-green-700' : ''
              )}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Confirmed ({confirmedCount})
            </Button>
            <Button
              variant={activeTab === 'rejected' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => {
                setActiveTab('rejected');
                setSelectedSlipId(null);
              }}
              className={cn(
                'rounded-xl font-bold gap-2 text-xs h-9',
                activeTab === 'rejected' ? 'bg-red-600 text-white hover:bg-red-700' : ''
              )}
            >
              <XCircle className="h-3.5 w-3.5" />
              Declined ({rejectedCount})
            </Button>
          </div>

          <span className="text-xs text-muted-foreground">
            {filteredSlips.length} {activeTab} {filteredSlips.length === 1 ? 'slip' : 'slips'}
          </span>
        </div>

        {/* Body Content */}
        {filteredSlips.length === 0 ? (
          <div className="flex-1 min-h-[380px] flex flex-col items-center justify-center p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-muted/60 flex items-center justify-center mb-4 text-muted-foreground">
              <FileImage className="h-8 w-8 opacity-40" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-1">
              No {activeTab} transfer slips
            </h3>
            <p className="text-sm text-muted-foreground max-w-md">
              {activeTab === 'pending'
                ? 'When customers send transfer slips or receipts to the Telegram bot, they will appear here instantly for cashier approval.'
                : `No slips in the ${activeTab} category.`}
            </p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-[500px]">
            {/* Sidebar list of slips */}
            <div className="w-full md:w-64 lg:w-72 md:border-r border-b md:border-b-0 border-border overflow-y-auto custom-scrollbar bg-muted/10 p-3 space-y-2 shrink-0">
              {filteredSlips.map((slip) => {
                const isSelected = selectedSlip?.id === slip.id;
                const slipDate = new Date(slip.created_at);
                const dateLabel = formatMaldivesDate(slipDate);
                const timeLabel = formatMaldivesTime(slipDate, true);

                return (
                  <div
                    key={slip.id}
                    onClick={() => setSelectedSlipId(slip.id)}
                    className={cn(
                      'p-3 rounded-2xl border transition-all cursor-pointer text-left',
                      isSelected
                        ? 'bg-card border-primary shadow-sm ring-1 ring-primary/30'
                        : 'bg-card/60 border-border hover:border-border/80 hover:bg-card'
                    )}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold truncate text-foreground">
                        {slip.customer_name}
                      </span>
                      {slip.status === 'pending' && (
                        <Badge className="text-[9px] bg-amber-500/20 text-amber-400 border-amber-500/30 px-1.5 py-0">
                          NEW
                        </Badge>
                      )}
                      {slip.status === 'confirmed' && (
                        <Badge className="text-[9px] bg-green-500/20 text-green-400 border-green-500/30 px-1.5 py-0">
                          SETTLED
                        </Badge>
                      )}
                      {slip.status === 'rejected' && (
                        <Badge className="text-[9px] bg-red-500/20 text-red-400 border-red-500/30 px-1.5 py-0">
                          DECLINED
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>{dateLabel}</span>
                      <span>{timeLabel}</span>
                    </div>

                    {slip.suggested_amount && (
                      <p className="mt-1 text-xs font-black text-green-500">
                        {currency} {slip.suggested_amount.toFixed(2)}
                      </p>
                    )}

                    {slip.caption && (
                      <p className="mt-1 text-[10px] text-muted-foreground/80 truncate italic">
                        "{slip.caption}"
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Main Slip Review Panel */}
            {selectedSlip ? (
              <div className="flex-1 flex flex-col md:flex-row overflow-y-auto">
                {/* Image View Panel */}
                <div className="md:w-1/2 p-6 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-border bg-black/40">
                  <div className="w-full flex items-center justify-between mb-3 text-xs text-muted-foreground">
                    <span className="font-bold flex items-center gap-1.5">
                      <FileImage className="h-4 w-4 text-primary" />
                      Slip Receipt Photo
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleRotate}
                        className="h-8 px-2 text-xs gap-1"
                        title="Rotate 90 degrees"
                      >
                        <RotateCw className="h-3.5 w-3.5" />
                        Rotate
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsZoomed(!isZoomed)}
                        className="h-8 px-2 text-xs gap-1"
                        title="Toggle zoom"
                      >
                        <ZoomIn className="h-3.5 w-3.5" />
                        {isZoomed ? 'Fit' : 'Zoom'}
                      </Button>
                      {selectedSlip.file_url && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(selectedSlip.file_url, '_blank')}
                          className="h-8 px-2 text-xs gap-1 text-primary"
                          title="Open original in new tab"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Open
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Image container */}
                  <div className="w-full flex-1 min-h-[360px] max-h-[480px] rounded-2xl overflow-auto bg-black/60 border border-border flex items-center justify-center p-2 relative group">
                    {selectedSlip.file_url ? (
                      <img
                        src={selectedSlip.file_url}
                        alt="Transfer Slip"
                        style={{
                          transform: `rotate(${rotationDegrees}deg) ${isZoomed ? 'scale(1.7)' : 'scale(1)'}`,
                          transition: 'transform 0.2s ease-in-out',
                        }}
                        className="max-h-full max-w-full object-contain rounded-lg shadow-lg cursor-pointer"
                        onClick={() => setIsZoomed(!isZoomed)}
                      />
                    ) : (
                      <div className="text-center p-6 text-muted-foreground">
                        <AlertCircle className="h-10 w-10 mx-auto mb-2 text-amber-500" />
                        <p className="font-bold">Image preview unavailable directly</p>
                        <p className="text-xs mt-1">Telegram file ID: {selectedSlip.file_id}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Details & Actions Panel */}
                <div className="md:w-1/2 p-6 flex flex-col justify-between overflow-y-auto">
                  <div className="space-y-4">
                    {/* Customer Profile Card */}
                    <div className="p-4 rounded-2xl bg-card border border-border">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-10 h-10 rounded-xl bg-primary/20 text-primary flex items-center justify-center font-black text-sm">
                            <User className="h-5 w-5" />
                          </div>
                          <div>
                            <h4 className="font-black text-foreground leading-tight">
                              {selectedSlip.customer_name}
                            </h4>
                            {linkedCustomer && (
                              <p className="text-xs text-muted-foreground">
                                {linkedCustomer.name_dv}
                              </p>
                            )}
                          </div>
                        </div>

                        {linkedCustomer && (
                          <Badge variant="outline" className="font-mono text-xs">
                            {linkedCustomer.code}
                          </Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border text-xs">
                        <div>
                          <span className="text-muted-foreground block text-[10px] uppercase font-bold">
                            Phone
                          </span>
                          <span className="font-medium text-foreground flex items-center gap-1 mt-0.5">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            {linkedCustomer?.phone || selectedSlip.customer_phone || 'Not available'}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[10px] uppercase font-bold">
                            Current Debt Tab
                          </span>
                          <span className="font-black text-base text-amber-500 block mt-0.5">
                            {currency} {currentOutstanding.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Slip Details & Note */}
                    <div className="p-4 rounded-2xl bg-muted/40 border border-border space-y-2 text-xs">
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5" />
                          Submitted at:
                        </span>
                        <span className="font-bold text-foreground">
                          {formatMaldivesDate(new Date(selectedSlip.created_at))} |{' '}
                          {formatMaldivesTime(new Date(selectedSlip.created_at), true)}
                        </span>
                      </div>

                      {selectedSlip.caption && (
                        <div className="pt-2 border-t border-border/60">
                          <span className="text-muted-foreground block text-[10px] font-bold uppercase mb-1">
                            Customer Note / Caption:
                          </span>
                          <p className="text-foreground italic bg-background/60 p-2.5 rounded-xl border border-border/60 text-xs">
                            "{selectedSlip.caption}"
                          </p>
                        </div>
                      )}

                      {/* Status specific details */}
                      {selectedSlip.status === 'confirmed' && (
                        <div className="pt-2 border-t border-border/60 space-y-1">
                          <div className="flex justify-between font-bold text-green-500">
                            <span>Settled Amount:</span>
                            <span>{currency} {(selectedSlip.settled_amount || 0).toFixed(2)}</span>
                          </div>
                          {selectedSlip.settlement_id && (
                            <div className="flex justify-between text-[11px] text-muted-foreground">
                              <span>Receipt #:</span>
                              <span className="font-mono">{selectedSlip.settlement_id}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {selectedSlip.status === 'rejected' && selectedSlip.rejection_reason && (
                        <div className="pt-2 border-t border-border/60">
                          <span className="text-red-400 font-bold block text-[10px] uppercase mb-1">
                            Decline Reason:
                          </span>
                          <p className="text-red-400 bg-red-500/10 p-2.5 rounded-xl border border-red-500/20 text-xs">
                            {selectedSlip.rejection_reason}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Settle Form (Only for pending slips) */}
                    {selectedSlip.status === 'pending' && !showRejectForm && (
                      <div className="p-4 rounded-2xl bg-card border border-primary/30 shadow-sm space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="block text-xs font-black uppercase tracking-wider text-foreground">
                            Amount to Settle ({currency})
                          </label>
                          {selectedSlip.suggested_amount && selectedSlip.suggested_amount > 0 && (
                            <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px] font-black px-2 py-0.5 rounded-lg">
                              ✨ From Customer: {currency} {selectedSlip.suggested_amount.toFixed(2)}
                            </Badge>
                          )}
                        </div>

                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-black text-primary/70 font-mono select-none">
                            {currency}
                          </span>
                          <Input
                            type="number"
                            step="any"
                            placeholder="0.00"
                            value={settleAmount}
                            onChange={(e) => setSettleAmount(e.target.value)}
                            className="pl-14 text-lg font-black bg-background border-border rounded-xl h-12 text-primary font-mono"
                          />
                        </div>

                        {/* Quick amount pills */}
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setSettleAmount(String(currentOutstanding))}
                            className="text-xs h-7 rounded-lg border-border"
                          >
                            Full Balance ({currentOutstanding.toFixed(0)})
                          </Button>
                          {currentOutstanding > 0 && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setSettleAmount(String((currentOutstanding / 2).toFixed(2)))
                              }
                              className="text-xs h-7 rounded-lg border-border"
                            >
                              Half ({(currentOutstanding / 2).toFixed(0)})
                            </Button>
                          )}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setSettleAmount('')}
                            className="text-xs h-7 text-muted-foreground ml-auto"
                          >
                            Clear
                          </Button>
                        </div>

                        {/* Live calculation */}
                        <div className="p-2.5 rounded-xl bg-muted/40 border border-border/50 text-xs flex justify-between items-center">
                          <span className="text-muted-foreground">Remaining Debt After Settlement:</span>
                          <span
                            className={cn(
                              'font-black',
                              newOutstandingPreview === 0 ? 'text-green-500' : 'text-amber-500'
                            )}
                          >
                            {currency} {newOutstandingPreview.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Decline Reason Form */}
                    {selectedSlip.status === 'pending' && showRejectForm && (
                      <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-black text-red-400 uppercase tracking-wider">
                            Select Reason to Decline
                          </label>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowRejectForm(false)}
                            className="h-6 text-xs text-muted-foreground"
                          >
                            Cancel
                          </Button>
                        </div>

                        <div className="space-y-1.5">
                          {presetReasons.map((reason) => (
                            <button
                              key={reason}
                              type="button"
                              onClick={() => handleRejectSlip(reason)}
                              className="w-full text-left p-2.5 rounded-xl bg-card hover:bg-card/80 border border-border text-xs font-medium text-foreground transition-all hover:border-red-500/40"
                            >
                              • {reason}
                            </button>
                          ))}
                        </div>

                        <div className="pt-2">
                          <span className="text-[10px] text-muted-foreground uppercase font-bold block mb-1">
                            Or Type Custom Reason:
                          </span>
                          <div className="flex gap-2">
                            <Input
                              placeholder="e.g. Please send the complete BML transfer page..."
                              value={rejectionReason}
                              onChange={(e) => setRejectionReason(e.target.value)}
                              className="text-xs bg-background border-border rounded-xl h-9"
                            />
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleRejectSlip()}
                              disabled={isRejecting || !rejectionReason.trim()}
                              className="rounded-xl h-9 px-4 text-xs font-bold"
                            >
                              Decline
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions Footer */}
                  {selectedSlip.status === 'pending' && !showRejectForm && (
                    <div className="pt-6 border-t border-border flex gap-3 mt-4">
                      <Button
                        variant="destructive"
                        onClick={() => setShowRejectForm(true)}
                        disabled={isSubmitting}
                        className="rounded-xl font-bold h-12 px-5 gap-2"
                      >
                        <XCircle className="h-4 w-4" />
                        Decline Slip
                      </Button>

                      <Button
                        onClick={handleConfirmSettlement}
                        disabled={isSubmitting || parsedAmount <= 0}
                        className="flex-1 rounded-xl font-black text-white bg-green-600 hover:bg-green-700 h-12 shadow-[0_0_20px_rgba(22,163,74,0.3)] gap-2"
                      >
                        <CheckCircle2 className="h-5 w-5" />
                        {isSubmitting ? 'Processing...' : `Confirm & Settle ${currency} ${parsedAmount > 0 ? parsedAmount.toFixed(2) : ''}`}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </DialogContent>

      {/* Confirmation Modal before Settling Slip */}
      {isConfirmSettleModalOpen && selectedSlip && (
        <Dialog open={isConfirmSettleModalOpen} onOpenChange={setIsConfirmSettleModalOpen}>
          <DialogContent className="sm:max-w-[460px] w-[calc(100vw-2rem)] max-h-[90vh] overflow-y-auto font-faruma apple-glass-card bg-card/95 text-foreground border border-white/20 dark:border-white/10 p-6 sm:p-7 shadow-2xl rounded-3xl box-border overflow-hidden [&>button]:left-4 [&>button]:right-auto space-y-4" dir="rtl">
            <DialogHeader className="text-right pb-3 border-b border-border/60">
              <DialogTitle className="text-xl font-black text-foreground flex items-center justify-end gap-2.5">
                <span>ޓްރާންސްފަރ ސްލިޕް ކަށަވަރުކުރުން</span>
                <div className="h-9 w-9 rounded-xl bg-green-500/15 text-green-600 dark:text-green-400 flex items-center justify-center shrink-0 ring-1 ring-green-500/30">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-1 text-right">
                Confirm Bank Transfer Settlement
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-1 text-right">
              <div className="p-4 rounded-2xl bg-muted/50 border border-border space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">ކަސްޓަމަރު (Customer):</span>
                  <span className="font-black text-foreground">{selectedSlip.customer_name}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">ކުރީގެ ދަރަނި (Old Debt):</span>
                  <span className="font-mono font-bold">{currency} {currentOutstanding.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-sm pt-2 border-t border-border/60">
                  <span className="font-black text-green-600 dark:text-green-400">ޚަލާޞްކުރާ ޢަދަދު (Settle Amount):</span>
                  <span className="font-mono text-lg font-black text-green-600 dark:text-green-400">{currency} {parsedAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-xs pt-1">
                  <span className="text-muted-foreground">ބާކީ ދަރަނި (Remaining Debt):</span>
                  <span className="font-mono font-black text-primary">{currency} {newOutstandingPreview.toFixed(2)}</span>
                </div>
              </div>

              <p className="text-[11px] text-muted-foreground leading-relaxed px-1">
                💬 ކަށަވަރުކުރުމުން ކަސްޓަމަރުގެ ދަރަނި ކެނޑި، ރަސްމީ ރަސީދު ޓެލެގްރާމް މެދުވެރިކޮށް ކަސްޓަމަރަށް އޮޓޮމެޓިކުން ފޮނުވޭނެއެވެ.
              </p>
            </div>

            <DialogFooter className="gap-3 pt-2 border-t border-border flex flex-row justify-between items-center">
              <Button
                variant="outline"
                onClick={() => setIsConfirmSettleModalOpen(false)}
                disabled={isSubmitting}
                className="flex-1 h-11 border-border hover:bg-muted text-foreground rounded-xl font-bold text-xs"
              >
                ކެންސަލް (Cancel)
              </Button>
              <Button
                onClick={executeSettlement}
                disabled={isSubmitting}
                className="flex-1 h-11 bg-green-600 hover:bg-green-700 text-white font-black rounded-xl shadow-lg shadow-green-600/20 text-xs uppercase tracking-wider gap-2"
              >
                {isSubmitting ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                <span>{isSubmitting ? 'ކަށަވަރުކުރަނީ...' : 'ކަށަވަރުކުރޭ (Confirm)'}</span>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  );
};
