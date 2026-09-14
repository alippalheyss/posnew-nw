import { Customer, Sale } from '@/context/AppContext';
import { formatDate, formatTime } from '@/utils/formatters';

export const DEFAULT_TELEGRAM_BOT_TOKEN = '8815725998:AAHVMSujW5JM-ND4CJAzPr_Qsj_enXm2cYQ';
export const DEFAULT_TELEGRAM_BOT_USERNAME = 'Bbacksh0p_bot';

export interface TelegramBotInfo {
  id: number;
  is_bot: boolean;
  first_name: string;
  username: string;
  can_join_groups?: boolean;
  can_read_all_group_messages?: boolean;
  supports_inline_queries?: boolean;
}

/**
 * Generate deep-link to connect a customer account
 * Example: https://t.me/Bbacksh0p_bot?start=cust-123
 */
export const generateTelegramConnectLink = (
  customerRef: string,
  botUsername: string = DEFAULT_TELEGRAM_BOT_USERNAME
): string => {
  const cleanUsername = (botUsername || DEFAULT_TELEGRAM_BOT_USERNAME).replace('@', '').trim();
  const cleanRef = encodeURIComponent(customerRef.trim());
  return `https://t.me/${cleanUsername}?start=${cleanRef}`;
};

/**
 * Test Bot Token by calling Telegram getMe API
 */
export const testTelegramBot = async (token?: string): Promise<{ ok: boolean; bot?: TelegramBotInfo; error?: string }> => {
  const activeToken = (token || DEFAULT_TELEGRAM_BOT_TOKEN).trim();
  if (!activeToken) {
    return { ok: false, error: 'Telegram Bot Token is missing' };
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${activeToken}/getMe`);
    const data = await res.json();
    if (data.ok) {
      return { ok: true, bot: data.result };
    }
    return { ok: false, error: data.description || 'Failed to authenticate bot token' };
  } catch (err: any) {
    console.error('Telegram getMe error:', err);
    return { ok: false, error: err.message || 'Network error communicating with Telegram API' };
  }
};

/**
 * Register Webhook URL with Telegram
 */
export const setTelegramWebhook = async (
  webhookUrl: string,
  token?: string
): Promise<{ ok: boolean; description?: string }> => {
  const activeToken = (token || DEFAULT_TELEGRAM_BOT_TOKEN).trim();
  const cleanUrl = webhookUrl.trim();

  if (!cleanUrl) {
    return { ok: false, description: 'Webhook URL cannot be empty' };
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${activeToken}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: cleanUrl }),
    });
    const data = await res.json();
    return { ok: data.ok, description: data.description };
  } catch (err: any) {
    return { ok: false, description: err.message || 'Failed to register webhook' };
  }
};

/**
 * Poll recent Telegram updates (works 100% in browser without any webhook or CLI)
 */
export const pollTelegramUpdates = async (
  offset?: number,
  token?: string
): Promise<{ ok: boolean; updates: any[]; error?: string }> => {
  const activeToken = (token || DEFAULT_TELEGRAM_BOT_TOKEN).trim();
  try {
    const url = offset
      ? `https://api.telegram.org/bot${activeToken}/getUpdates?offset=${offset}&timeout=0`
      : `https://api.telegram.org/bot${activeToken}/getUpdates?timeout=0`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.ok) {
      return { ok: true, updates: data.result || [] };
    }
    return { ok: false, updates: [], error: data.description };
  } catch (err: any) {
    return { ok: false, updates: [], error: err.message };
  }
};

/**
 * Check if a specific customer has tapped /start in Telegram, and link them automatically
 */
export const checkAndLinkCustomerLive = async ({
  customerId,
  customerCode,
  customerName,
  token,
}: {
  customerId: string;
  customerCode?: string;
  customerName: string;
  token?: string;
}): Promise<{ linked: boolean; chatId?: number; error?: string }> => {
  const result = await pollTelegramUpdates(undefined, token);
  if (!result.ok || !result.updates.length) {
    return { linked: false, error: result.error };
  }

  const cleanId = customerId.toLowerCase();
  const cleanCode = (customerCode || '').toLowerCase();
  let foundChatId: number | null = null;
  let maxUpdateId = 0;

  for (const update of result.updates) {
    if (update.update_id > maxUpdateId) maxUpdateId = update.update_id;
    const text = update.message?.text?.trim() || '';
    if (text.startsWith('/start')) {
      const parts = text.split(' ');
      const ref = (parts[1] || '').trim().toLowerCase();
      if (ref && (ref === cleanId || (cleanCode && ref === cleanCode))) {
        foundChatId = update.message.chat.id;
      }
    }
  }

  if (foundChatId) {
    // Send instant welcome confirmation to the user's phone
    const welcomeMsg = `✅ *Welcome, ${customerName}!*\n\nYour Telegram account is now successfully linked to your store account. You will automatically receive digital receipts and payment confirmations here.`;
    await sendTelegramMessage(foundChatId, welcomeMsg, token);

    // Acknowledge updates up to this ID so getUpdates remains clean
    if (maxUpdateId > 0) {
      pollTelegramUpdates(maxUpdateId + 1, token).catch(() => {});
    }

    return { linked: true, chatId: foundChatId };
  }

  return { linked: false };
};

/**
 * Send raw Telegram Message
 */
export const sendTelegramMessage = async (
  chatId: string | number,
  text: string,
  token?: string,
  parseMode: 'Markdown' | 'HTML' = 'Markdown'
): Promise<{ ok: boolean; message_id?: number; description?: string }> => {
  const activeToken = (token || DEFAULT_TELEGRAM_BOT_TOKEN).trim();
  if (!activeToken) {
    return { ok: false, description: 'Bot token missing' };
  }
  if (!chatId) {
    return { ok: false, description: 'Telegram Chat ID missing' };
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${activeToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: parseMode,
        disable_web_page_preview: true,
      }),
    });
    const data = await res.json();
    return data;
  } catch (err: any) {
    console.error('sendTelegramMessage error:', err);
    return { ok: false, description: err.message || 'Network error' };
  }
};

/**
 * Send Automated Payment Settlement Receipt
 */
export const sendTelegramPaymentReceipt = async ({
  chatId,
  customerName,
  customerCode,
  paidAmount,
  previousOutstanding,
  remainingBalance,
  receiptNo,
  shopSettings,
  token,
}: {
  chatId: string | number;
  customerName: string;
  customerCode?: string;
  paidAmount: number;
  previousOutstanding?: number;
  remainingBalance: number;
  receiptNo?: string;
  shopSettings?: any;
  token?: string;
}) => {
  const shopName = shopSettings?.shopName || 'B BACK';
  const currency = shopSettings?.currency || 'MVR';
  const now = new Date().toISOString();
  const formattedDate = `${formatDate(now)} ${formatTime(now)}`;

  let msg = `🧾 *${shopName.toUpperCase()} - PAYMENT RECEIPT*\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━\n`;
  if (receiptNo) {
    msg += `*Receipt #:* \`${receiptNo}\`\n`;
  }
  msg += `*Date:* ${formattedDate}\n`;
  msg += `*Customer:* ${customerName}${customerCode ? ` (\`${customerCode}\`)` : ''}\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━\n`;

  if (previousOutstanding !== undefined && previousOutstanding > 0) {
    msg += `*Previous Balance:* ${currency} ${Number(previousOutstanding).toFixed(2)}\n`;
  }
  msg += `*Amount Paid:* 💰 *${currency} ${Number(paidAmount).toFixed(2)}*\n`;
  msg += `*Remaining Due:* ${Number(remainingBalance) <= 0 ? '✅ *CLEARED (0.00)*' : `*${currency} ${Number(remainingBalance).toFixed(2)}*`}\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `_Thank you for your payment!_ 🙏\n`;
  if (shopSettings?.shopPhone) {
    msg += `📞 Support: ${shopSettings.shopPhone}`;
  }

  return await sendTelegramMessage(chatId, msg, token);
};

/**
 * Send Credit Tab Statement on Demand
 */
export const sendTelegramOutstandingStatement = async ({
  chatId,
  customer,
  shopSettings,
  overrideBalance,
  token,
}: {
  chatId: string | number;
  customer: Customer;
  shopSettings?: any;
  overrideBalance?: number;
  token?: string;
}) => {
  const shopName = shopSettings?.shopName || 'B BACK';
  const currency = shopSettings?.currency || 'MVR';
  const now = new Date().toISOString();
  const customerName = customer.name_en || customer.name_dv || 'Customer';

  const rawBalance =
    overrideBalance !== undefined && overrideBalance !== null
      ? overrideBalance
      : customer.outstanding_balance || 0;
  const balance = Number(rawBalance || 0).toFixed(2);
  const limit = Number(customer.credit_limit || 0).toFixed(2);
  const points = Number(customer.loyalty_points || 0).toFixed(0);

  let msg = `📋 *${shopName.toUpperCase()} - OUTSTANDING STATEMENT*\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `👤 *Customer:* ${customerName}${customer.code ? ` (\`${customer.code}\`)` : ''}\n`;
  msg += `📅 *Date:* ${formatDate(now)} | ${formatTime(now)}\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `💰 *OUTSTANDING DUE:* *${currency} ${balance}*\n`;
  msg += `💳 *Credit Limit:* ${currency} ${limit}\n`;
  if (customer.loyalty_points > 0) {
    msg += `⭐ *Loyalty Points:* ${points} pts\n`;
  }
  msg += `━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `🏦 *Bank Transfer Details:*\n`;
  msg += `Bank of Maldives (BML)\n`;
  msg += `Account: \`7730000442060\` (${shopName})\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `_Please transfer and send the payment slip. Thank you!_ 🙏`;

  return await sendTelegramMessage(chatId, msg, token);
};

/**
 * Send Sale Receipt to Telegram
 */
export const sendTelegramSaleReceipt = async ({
  chatId,
  customer,
  sale,
  shopSettings,
  token,
}: {
  chatId: string | number;
  customer?: Customer | null;
  sale: Sale;
  shopSettings?: any;
  token?: string;
}) => {
  const shopName = shopSettings?.shopName || 'B BACK';
  const currency = shopSettings?.currency || 'MVR';
  const invoiceNo = sale.invoiceNumber || sale.id.slice(0, 8).toUpperCase();
  const customerName = customer ? (customer.name_en || customer.name_dv) : 'Walk-in Customer';

  let msg = `🛍️ *${shopName.toUpperCase()} - SALES RECEIPT*\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `*Invoice:* \`${invoiceNo}\`\n`;
  msg += `*Date:* ${formatDate(sale.date)} | ${formatTime(sale.date)}\n`;
  if (customer) {
    msg += `*Customer:* ${customerName} (\`${customer.code}\`)\n`;
  }
  msg += `*Payment:* ${sale.paymentMethod.toUpperCase()}\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━\n`;

  sale.items.forEach((item, index) => {
    const unitLabel = item.selected_unit && item.selected_unit !== 'Piece' ? ` [${item.selected_unit}]` : '';
    const lineTotal = (Number(item.price || 0) * Number(item.qty || 0)).toFixed(2);
    const itemName = (item.name_en || item.name_dv || 'Item').replace(/[*_`]/g, '');
    msg += `${index + 1}. *${itemName}*${unitLabel}\n`;
    msg += `   ${item.qty} × ${currency} ${Number(item.price || 0).toFixed(2)} = *${currency} ${lineTotal}*\n`;
  });

  msg += `━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `*Grand Total: ${currency} ${sale.grandTotal.toFixed(2)}*\n`;
  if (sale.paidAmount !== undefined && sale.paidAmount > 0) {
    msg += `*Paid Amount:* ${currency} ${sale.paidAmount.toFixed(2)}\n`;
  }
  if (sale.balance !== undefined && sale.balance > 0) {
    msg += `*Change / Balance:* ${currency} ${sale.balance.toFixed(2)}\n`;
  }
  msg += `━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `_Thank you for shopping with us!_ 🙏`;

  return await sendTelegramMessage(chatId, msg, token);
};

/**
 * Send quick test message to verify link
 */
export const sendTelegramTestMessage = async (
  chatId: string | number,
  customerName: string,
  token?: string
) => {
  const text = `🔔 *Test Message from B BACK*\n\nHello *${customerName}*! Your Telegram connection is working perfectly. You will receive real-time receipts and balance statements here.`;
  return await sendTelegramMessage(chatId, text, token);
};
