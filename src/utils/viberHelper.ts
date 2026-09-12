import { showSuccess, showError } from '@/utils/toast';
import { formatDate, formatTime } from '@/utils/formatters';
import { Customer, CartItem } from '@/context/AppContext';

export const cleanMaldivesPhone = (phone?: string): string => {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('960') && digits.length >= 10) {
    return digits;
  }
  if (digits.length === 7) {
    return `960${digits}`;
  }
  return digits;
};

interface CartTotals {
  subtotal: number;
  gstAmount: number;
  grandTotal: number;
}

export const formatCartViberMessage = (
  items: CartItem[],
  totals: CartTotals,
  shopSettings?: any,
  customer?: Customer | null
): string => {
  const shopName = shopSettings?.shopName || 'Shop';
  const currency = shopSettings?.currency || 'MVR';
  const taxRate = shopSettings?.taxRate || 8;
  const now = new Date().toISOString();

  let msg = `🛒 *${shopName} - Cart Summary*\n`;
  msg += `📅 ${formatDate(now)} | ${formatTime(now)}\n`;
  if (customer) {
    msg += `👤 Customer: ${customer.name_en || customer.name_dv} (${customer.code || ''})\n`;
  }
  msg += `-------------------------\n`;

  items.forEach((item, index) => {
    const unitLabel = item.selected_unit && item.selected_unit !== 'Piece' ? ` [${item.selected_unit}]` : '';
    const lineTotal = (Number(item.price || 0) * Number(item.qty || 0)).toFixed(2);
    const itemName = item.name_en || item.name_dv;
    msg += `${index + 1}. ${itemName}${unitLabel}\n   ${item.qty} x ${currency} ${Number(item.price || 0).toFixed(2)} = ${currency} ${lineTotal}\n`;
  });

  msg += `-------------------------\n`;
  msg += `Subtotal: ${currency} ${totals.subtotal.toFixed(2)}\n`;
  if (totals.gstAmount > 0) {
    msg += `GST (${taxRate}%): ${currency} ${totals.gstAmount.toFixed(2)}\n`;
  }
  msg += `*Total Due: ${currency} ${totals.grandTotal.toFixed(2)}*\n`;
  msg += `-------------------------\n`;
  msg += `🏦 *BML: 7730000442060 (B BACK)*\n`;
  if (shopSettings?.shopPhone) {
    msg += `📞 Contact / MobilePay: ${shopSettings.shopPhone}\n`;
  }
  msg += `Please transfer and send the slip. Thank you! 🙏`;
  return msg;
};

export const formatCreditStatementViberMessage = (
  customer: Customer,
  shopSettings?: any,
  overrideBalance?: number
): string => {
  const shopName = shopSettings?.shopName || 'Shop';
  const currency = shopSettings?.currency || 'MVR';
  const now = new Date().toISOString();

  // Robustly extract the balance from override or any customer balance field
  const rawBalance = 
    overrideBalance !== undefined && overrideBalance !== null
      ? overrideBalance
      : (customer.outstanding_balance ?? 
         (customer as any).balance ?? 
         (customer as any).total_outstanding ?? 
         (customer as any).outstanding ?? 
         0);
  const balance = Number(rawBalance || 0).toFixed(2);
  const customerName = customer.name_en || customer.name_dv || 'Customer';

  let msg = `📋 *${shopName} - Outstanding Statement*\n`;
  msg += `👤 Customer: ${customerName}${customer.code ? ` (${customer.code})` : ''}\n`;
  msg += `💰 *OUTSTANDING: ${currency} ${balance}*\n`;
  msg += `📅 Date: ${formatDate(now)}\n`;
  msg += `-------------------------\n`;
  msg += `🏦 *BML: 7730000442060 (B BACK)*\n`;
  msg += `-------------------------\n`;
  msg += `Please send the transfer slip once payment is made. Thank you! 🙏`;
  return msg;
};

export const shareViaViber = async ({
  phone,
  text
}: {
  phone?: string;
  text: string;
}): Promise<void> => {
  // 1. Always copy text to clipboard for 100% complete zero-friction manual paste
  let copied = false;
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      copied = true;
    }
  } catch (err) {
    console.warn('Clipboard write error:', err);
  }

  const cleaned = cleanMaldivesPhone(phone);
  const encodedDraft = encodeURIComponent(text);

  // 2. Open Viber via URI scheme
  // CRITICAL FIX: Passing ONLY 'draft' (NOT both 'text' and 'draft').
  // Providing both parameters doubled the URI length (exceeding Windows/Viber CLI buffer)
  // and pushed 'draft' past the buffer cutoff, causing Viber desktop to truncate the message.
  if (cleaned) {
    window.location.href = `viber://chat?number=${cleaned}&draft=${encodedDraft}`;
    showSuccess(
      copied
        ? `Copied statement & opening Viber! (Press Ctrl+V to paste full statement)`
        : `Opening Viber chat with ${phone}!`
    );
  } else {
    window.location.href = `viber://forward?text=${encodedDraft}`;
    showSuccess(
      copied
        ? 'Copied statement & opening Viber! (Press Ctrl+V to paste full statement)'
        : 'Opening Viber!'
    );
  }
};
