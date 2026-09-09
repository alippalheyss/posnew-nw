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
  msg += `─────────────────────────\n`;

  items.forEach((item, index) => {
    const unitLabel = item.selected_unit && item.selected_unit !== 'Piece' ? ` [${item.selected_unit}]` : '';
    const lineTotal = (Number(item.price || 0) * Number(item.qty || 0)).toFixed(2);
    const itemName = item.name_en || item.name_dv;
    msg += `${index + 1}. ${itemName}${unitLabel}\n   ${item.qty} x ${currency} ${Number(item.price || 0).toFixed(2)} = ${currency} ${lineTotal}\n`;
  });

  msg += `─────────────────────────\n`;
  msg += `Subtotal: ${currency} ${totals.subtotal.toFixed(2)}\n`;
  if (totals.gstAmount > 0) {
    msg += `GST (${taxRate}%): ${currency} ${totals.gstAmount.toFixed(2)}\n`;
  }
  msg += `*Total Due: ${currency} ${totals.grandTotal.toFixed(2)}*\n`;
  msg += `─────────────────────────\n`;

  if (shopSettings?.receiptFooter) {
    msg += `🏦 *Transfer Information:*\n${shopSettings.receiptFooter}\n`;
  } else if (shopSettings?.shopPhone) {
    msg += `🏦 *Transfer Information:*\nPlease transfer to our BML account and send the slip.\nContact / BML MobilePay: ${shopSettings.shopPhone}\n`;
  }

  msg += `Thank you for shopping with us! 🙏`;
  return msg;
};

export const formatCreditStatementViberMessage = (
  customer: Customer,
  shopSettings?: any
): string => {
  const shopName = shopSettings?.shopName || 'Shop';
  const currency = shopSettings?.currency || 'MVR';
  const now = new Date().toISOString();
  const balance = Number(customer.outstanding_balance || 0).toFixed(2);

  let msg = `📋 *${shopName} - Outstanding Statement*\n`;
  msg += `📅 Date: ${formatDate(now)}\n`;
  msg += `👤 Customer: ${customer.name_en || customer.name_dv} (${customer.code || ''})\n`;
  if (customer.phone) {
    msg += `📞 Phone: ${customer.phone}\n`;
  }
  msg += `─────────────────────────\n`;
  msg += `*Outstanding Balance: ${currency} ${balance}*\n`;
  msg += `─────────────────────────\n`;

  if (shopSettings?.receiptFooter) {
    msg += `🏦 *Account for Settlement:*\n${shopSettings.receiptFooter}\n`;
  } else if (shopSettings?.shopPhone) {
    msg += `🏦 *Account for Settlement:*\nPlease transfer to our BML account and send the receipt.\nContact / Account: ${shopSettings.shopPhone}\n`;
  }

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
  // 1. Always copy text to clipboard for zero-friction paste
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    }
  } catch (err) {
    console.warn('Clipboard write error:', err);
  }

  const cleaned = cleanMaldivesPhone(phone);
  const encodedText = encodeURIComponent(text);

  // 2. Open Viber via URI scheme
  if (cleaned) {
    // Direct chat link with customer's phone
    window.location.href = `viber://chat?number=${cleaned}&draft=${encodedText}`;
    showSuccess(`Copied statement & opening Viber chat with ${phone}!`);
  } else {
    // Open Viber share dialog
    window.location.href = `viber://forward?text=${encodedText}`;
    showSuccess('Copied cart summary & opening Viber!');
  }
};
