import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserPlus, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import { Customer } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import { CustomerRegistration } from '@/services/onlineShopService';
import { showError, showSuccess } from '@/utils/toast';

interface PendingRegistrationsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  registrations: CustomerRegistration[];
  defaultCreditLimit: number;
  getNextCustomerCode: () => string;
  addCustomer: (customer: Customer) => Promise<Customer | void>;
  onRefresh: () => Promise<void>;
}

export const PendingRegistrationsDialog: React.FC<PendingRegistrationsDialogProps> = ({
  open,
  onOpenChange,
  registrations,
  defaultCreditLimit,
  getNextCustomerCode,
  addCustomer,
  onRefresh,
}) => {
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [codeInputs, setCodeInputs] = useState<Record<string, string>>({});
  const [limitInputs, setLimitInputs] = useState<Record<string, string>>({});

  const pendingList = registrations.filter((r) => r.status === 'PENDING');

  const handleApprove = async (reg: CustomerRegistration) => {
    const code = (codeInputs[reg.id] ?? getNextCustomerCode()).trim();
    const creditLimit = parseFloat(limitInputs[reg.id] ?? String(defaultCreditLimit || 0)) || 0;

    if (!code) {
      showError('Please enter a Customer Code.');
      return;
    }

    setProcessingId(reg.id);
    try {
      const newCustomer: Customer = {
        id: `cust_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        code,
        name_en: reg.name_en,
        name_dv: reg.name_dv || reg.name_en,
        phone: reg.phone,
        email: reg.email || '',
        credit_limit: creditLimit,
        loyalty_points: 0,
        outstanding_balance: 0,
      };

      await addCustomer(newCustomer);

      if (supabase) {
        await supabase
          .from('customer_registrations')
          .update({
            status: 'APPROVED',
            assigned_code: code,
            credit_limit: creditLimit,
            reviewed_at: new Date().toISOString(),
          })
          .eq('id', reg.id);
      }

      showSuccess(`Approved ${reg.name_en} as Customer #${code}! They can now shop on shop.bback.store.`);
      await onRefresh();
    } catch (err: any) {
      showError(err?.message || 'Failed to approve customer.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (reg: CustomerRegistration) => {
    setProcessingId(reg.id);
    try {
      if (supabase) {
        await supabase
          .from('customer_registrations')
          .update({
            status: 'REJECTED',
            reviewed_at: new Date().toISOString(),
          })
          .eq('id', reg.id);
      }
      showSuccess(`Declined registration for ${reg.name_en}.`);
      await onRefresh();
    } catch (err: any) {
      showError(err?.message || 'Failed to reject registration.');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl w-[calc(100vw-1.5rem)] max-h-[85vh] flex flex-col bg-card border-border rounded-xl p-5 font-faruma" dir="ltr">
        <DialogHeader>
          <div className="flex items-center justify-between gap-2 pr-6">
            <div>
              <DialogTitle className="text-lg font-black flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-primary" />
                <span>Pending Customer Registrations</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Approve new customers from shop.bback.store to save them into POS Customers and unlock shopping.
              </DialogDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onRefresh()}
              className="h-8 px-2.5 rounded-lg text-xs font-bold gap-1"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Refresh</span>
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-3 pr-1 pt-2">
          {pendingList.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No pending customer registrations.
            </div>
          ) : (
            pendingList.map((reg) => {
              const suggestedCode = codeInputs[reg.id] ?? getNextCustomerCode();
              const suggestedLimit = limitInputs[reg.id] ?? String(defaultCreditLimit || 0);

              return (
                <div
                  key={reg.id}
                  className="p-4 rounded-xl bg-background border border-border space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-black text-foreground">{reg.name_en}</p>
                      {reg.name_dv && (
                        <p className="text-xs font-bold text-muted-foreground">{reg.name_dv}</p>
                      )}
                      <p className="text-xs font-mono text-primary font-bold mt-1">{reg.phone}</p>
                      {reg.address && (
                        <p className="text-[11px] text-muted-foreground mt-0.5">Address: {reg.address}</p>
                      )}
                      {reg.email && (
                        <p className="text-[11px] text-muted-foreground">Email: {reg.email}</p>
                      )}
                    </div>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                      PENDING
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-border/60">
                    <div className="space-y-1">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground">
                        Assign Code
                      </Label>
                      <Input
                        value={suggestedCode}
                        onChange={(e) =>
                          setCodeInputs((prev) => ({ ...prev, [reg.id]: e.target.value }))
                        }
                        className="h-9 bg-card border-border rounded-lg font-mono font-bold text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground">
                        Credit Limit
                      </Label>
                      <Input
                        type="number"
                        value={suggestedLimit}
                        onChange={(e) =>
                          setLimitInputs((prev) => ({ ...prev, [reg.id]: e.target.value }))
                        }
                        className="h-9 bg-card border-border rounded-lg font-mono font-bold text-xs"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={processingId === reg.id}
                      onClick={() => handleReject(reg)}
                      className="h-8 px-3 rounded-lg text-xs font-bold text-rose-500 border-rose-500/30 hover:bg-rose-500/10 gap-1"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      <span>Decline</span>
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      disabled={processingId === reg.id}
                      onClick={() => handleApprove(reg)}
                      className="h-8 px-3.5 rounded-lg text-xs font-black gap-1"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Approve & Save Customer</span>
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

