// POS keyboard shortcut definitions, defaults and helpers.
// Custom shortcuts are stored in settings.shop.posShortcuts (synced to Supabase),
// so they apply on every computer (Windows app and web app).

import type { KeyboardEvent as ReactKeyboardEvent } from 'react';

export type PosShortcutAction =
  | 'focusSearch'
  | 'focusSearchAlt'
  | 'focusQuantity'
  | 'cashPayment'
  | 'creditSale'
  | 'splitPayment'
  | 'awaitingTransfer'
  | 'printReceipt';

export type PosShortcutMap = Record<PosShortcutAction, string>;

export const POS_SHORTCUT_ACTIONS: { action: PosShortcutAction; label: string; description: string }[] = [
  { action: 'focusSearch', label: 'Focus Product Search', description: 'Jump to the product search bar (works anywhere)' },
  { action: 'focusSearchAlt', label: 'Focus Product Search (Alt)', description: 'Secondary key for the product search bar' },
  { action: 'focusQuantity', label: 'Edit Last Item Quantity', description: 'Focus the quantity of the last cart item (works anywhere)' },
  { action: 'cashPayment', label: 'Cash Payment', description: 'Open the cash payment dialog' },
  { action: 'creditSale', label: 'Credit Sale', description: 'Open the credit sale dialog' },
  { action: 'splitPayment', label: 'Split Payment', description: 'Open the split payment dialog' },
  { action: 'awaitingTransfer', label: 'Awaiting Transfer', description: 'Open the awaiting bank transfer dialog' },
  { action: 'printReceipt', label: 'Print Last Receipt', description: 'Instantly print the latest receipt' },
];

export const DEFAULT_POS_SHORTCUTS: PosShortcutMap = {
  focusSearch: 'F2',
  focusSearchAlt: 'F4',
  focusQuantity: 'F10',
  cashPayment: 'Enter',
  creditSale: 'F11',
  splitPayment: 'F6',
  awaitingTransfer: 'F8',
  printReceipt: 'F9',
};

const MODIFIER_KEYS = new Set(['Control', 'Shift', 'Alt', 'Meta', 'AltGraph', 'CapsLock']);

const normalizeKeyName = (key: string): string => {
  if (key === ' ') return 'Space';
  if (key.length === 1) return key.toUpperCase();
  return key;
};

/** Converts a keyboard event into a combo string like "Ctrl+Shift+K" or "F2". Returns null for bare modifier presses. */
export const eventToCombo = (e: KeyboardEvent | ReactKeyboardEvent): string | null => {
  if (MODIFIER_KEYS.has(e.key)) return null;
  const parts: string[] = [];
  if (e.ctrlKey) parts.push('Ctrl');
  if (e.altKey) parts.push('Alt');
  if (e.shiftKey) parts.push('Shift');
  if (e.metaKey) parts.push('Meta');
  parts.push(normalizeKeyName(e.key));
  return parts.join('+');
};

/** Merges saved shortcuts with defaults so newly added actions always have a key. */
export const resolvePosShortcuts = (saved?: Partial<PosShortcutMap> | null): PosShortcutMap => ({
  ...DEFAULT_POS_SHORTCUTS,
  ...(saved && typeof saved === 'object' ? saved : {}),
});

/** Returns the action matching this keyboard event, or null. Empty strings mean "disabled". */
export const matchPosShortcut = (e: KeyboardEvent, shortcuts: PosShortcutMap): PosShortcutAction | null => {
  const combo = eventToCombo(e);
  if (!combo) return null;
  const lower = combo.toLowerCase();
  for (const { action } of POS_SHORTCUT_ACTIONS) {
    const value = shortcuts[action];
    if (value && value.toLowerCase() === lower) return action;
  }
  return null;
};

/** True if the combo would interfere with typing (e.g. a plain letter/number without Ctrl/Alt). */
export const isTypingCombo = (combo: string): boolean => {
  const parts = combo.split('+');
  const key = parts[parts.length - 1];
  const hasCtrlOrAlt = parts.includes('Ctrl') || parts.includes('Alt') || parts.includes('Meta');
  return !hasCtrlOrAlt && (key.length === 1 || key === 'Space' || key === 'Backspace' || key === 'Delete');
};
