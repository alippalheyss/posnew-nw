import React, { useEffect, useState } from 'react';
import { Keyboard, RotateCcw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { showError, showSuccess } from '@/utils/toast';
import {
  POS_SHORTCUT_ACTIONS,
  DEFAULT_POS_SHORTCUTS,
  PosShortcutAction,
  PosShortcutMap,
  eventToCombo,
  isTypingCombo,
  resolvePosShortcuts,
} from '@/utils/posShortcuts';

interface PosShortcutSettingsProps {
  saved?: Partial<Record<string, string>>;
  onSave: (shortcuts: PosShortcutMap) => void;
}

// Keys reserved by the browser / Windows app that should not be assigned
const RESERVED_COMBOS = new Set(['F5', 'Ctrl+R', 'Ctrl+W', 'Ctrl+T', 'Ctrl+N', 'Alt+F4', 'F12', 'Ctrl+Shift+I', 'Tab', 'Escape']);

const PosShortcutSettings: React.FC<PosShortcutSettingsProps> = ({ saved, onSave }) => {
  const shortcuts = resolvePosShortcuts(saved as any);
  const [recording, setRecording] = useState<PosShortcutAction | null>(null);

  useEffect(() => {
    if (!recording) return;

    const handler = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (e.key === 'Escape') {
        setRecording(null);
        return;
      }

      const combo = eventToCombo(e);
      if (!combo) return; // only a modifier pressed so far

      if (RESERVED_COMBOS.has(combo)) {
        showError(`${combo} is reserved by the browser/app and cannot be used.`);
        return;
      }
      if (isTypingCombo(combo)) {
        showError(`${combo} would interfere with typing/barcode scanning. Use a function key (F1-F12) or add Ctrl/Alt.`);
        return;
      }

      const conflict = POS_SHORTCUT_ACTIONS.find(
        a => a.action !== recording && (shortcuts[a.action] || '').toLowerCase() === combo.toLowerCase()
      );
      if (conflict) {
        showError(`${combo} is already used for "${conflict.label}". Clear that one first.`);
        return;
      }

      onSave({ ...shortcuts, [recording]: combo });
      showSuccess(`Shortcut set to ${combo}`);
      setRecording(null);
    };

    // Capture phase so the key never reaches other handlers while recording
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [recording, shortcuts, onSave]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Keyboard className="h-5 w-5 text-primary" />
          <Label className="text-sm font-black uppercase tracking-widest">POS Shortcut Keys</Label>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-xl gap-2 font-bold"
          onClick={() => {
            onSave({ ...DEFAULT_POS_SHORTCUTS });
            showSuccess('POS shortcuts reset to defaults');
          }}
        >
          <RotateCcw className="h-4 w-4" /> Reset All
        </Button>
      </div>
      <p className="text-[11px] text-muted-foreground font-bold">
        Click a key to change it, then press the new key combination (Esc to cancel). Changes are saved to the cloud and apply on all computers (Windows app &amp; web app).
      </p>

      <div className="rounded-2xl border border-border divide-y divide-border overflow-hidden">
        {POS_SHORTCUT_ACTIONS.map(({ action, label, description }) => {
          const value = shortcuts[action];
          const isRecording = recording === action;
          const isDefault = value === DEFAULT_POS_SHORTCUTS[action];
          return (
            <div key={action} className="flex items-center justify-between gap-4 px-4 py-3 bg-muted/30">
              <div className="min-w-0 text-left" dir="ltr">
                <div className="text-sm font-bold">{label}</div>
                <div className="text-[11px] text-muted-foreground">{description}</div>
                {value === 'F11' && (
                  <div className="text-[10px] text-amber-500 font-bold mt-0.5">
                    Note: in the Windows app F11 toggles fullscreen.
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  type="button"
                  variant={isRecording ? 'default' : 'outline'}
                  className={cn('min-w-[120px] h-10 rounded-xl font-mono font-black', isRecording && 'animate-pulse')}
                  onClick={() => setRecording(isRecording ? null : action)}
                  dir="ltr"
                >
                  {isRecording ? 'Press keys...' : value || 'Not set'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-xl"
                  title="Reset to default"
                  disabled={isDefault}
                  onClick={() => {
                    const def = DEFAULT_POS_SHORTCUTS[action];
                    const conflict = POS_SHORTCUT_ACTIONS.find(
                      a => a.action !== action && (shortcuts[a.action] || '').toLowerCase() === def.toLowerCase()
                    );
                    if (conflict) {
                      showError(`${def} is already used for "${conflict.label}". Change that one first.`);
                      return;
                    }
                    onSave({ ...shortcuts, [action]: def });
                  }}
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-xl text-destructive"
                  title="Disable this shortcut"
                  disabled={!value}
                  onClick={() => onSave({ ...shortcuts, [action]: '' })}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PosShortcutSettings;
