import { Customer, Sale } from '@/context/AppContext';
import { formatDate, formatTime, formatMaldivesDate, formatMaldivesTime, extractDateOnly, toISODate } from '@/utils/formatters';
import { supabase } from '@/lib/supabase';

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
 * Get current Telegram Webhook Info
 */
export const getTelegramWebhookInfo = async (
  token?: string
): Promise<{ ok: boolean; url?: string; pending_update_count?: number; error?: string }> => {
  const activeToken = (token || DEFAULT_TELEGRAM_BOT_TOKEN).trim();
  try {
    const res = await fetch(`https://api.telegram.org/bot${activeToken}/getWebhookInfo`);
    const data = await res.json();
    if (data.ok) {
      return {
        ok: true,
        url: data.result?.url || '',
        pending_update_count: data.result?.pending_update_count || 0,
      };
    }
    return { ok: false, error: data.description || 'Failed to fetch webhook info' };
  } catch (err: any) {
    return { ok: false, error: err.message || 'Network error' };
  }
};

/**
 * Get direct download / preview URL for a Telegram file by file_id
 */
export const getTelegramFileDirectUrl = async (
  fileId: string,
  token?: string
): Promise<string | null> => {
  const activeToken = (token || DEFAULT_TELEGRAM_BOT_TOKEN).trim();
  if (!fileId || !activeToken) return null;

  try {
    const res = await fetch(`https://api.telegram.org/bot${activeToken}/getFile?file_id=${encodeURIComponent(fileId)}`);
    const data = await res.json();
    if (data.ok && data.result?.file_path) {
      return `https://api.telegram.org/file/bot${activeToken}/${data.result.file_path}`;
    }
    return null;
  } catch (err) {
    console.warn('Failed to get Telegram file path:', err);
    return null;
  }
};

/**
 * Delete Telegram Webhook (switch back to getUpdates polling)
 */
export const deleteTelegramWebhook = async (
  token?: string
): Promise<{ ok: boolean; description?: string }> => {
  const activeToken = (token || DEFAULT_TELEGRAM_BOT_TOKEN).trim();
  if (!activeToken) return { ok: false, description: 'No token' };
  try {
    const res = await fetch(`https://api.telegram.org/bot${activeToken}/deleteWebhook?drop_pending_updates=false`, {
      method: 'POST',
    });
    const data = await res.json();
    return { ok: Boolean(data.ok), description: data.description };
  } catch (err: any) {
    return { ok: false, description: err.message };
  }
};

/**
 * Bot commands configuration
 */
export const BOT_COMMANDS = [
  { command: 'start', description: 'Connect your store account and activate receipts' },
  { command: 'balance', description: 'View your current credit tab and outstanding amount' },
  { command: 'transfer', description: 'Send bank transfer slip' },
  { command: 'account', description: 'View your linked customer profile details' },
  { command: 'help', description: 'How to use this bot and store contact details' },
];

/**
 * Configure Telegram Bot menu commands via setMyCommands API
 */
export const setBotCommands = async (token?: string): Promise<{ ok: boolean; description?: string }> => {
  const activeToken = (token || DEFAULT_TELEGRAM_BOT_TOKEN).trim();
  try {
    const res = await fetch(`https://api.telegram.org/bot${activeToken}/setMyCommands`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commands: BOT_COMMANDS }),
    });
    const data = await res.json();
    return { ok: Boolean(data.ok), description: data.description };
  } catch (err: any) {
    return { ok: false, description: err.message || 'Failed to set bot commands' };
  }
};

let isPollInFlight = false;
let nextAllowedPollTime = 0;

/**
 * Poll recent Telegram updates (works 100% in browser without any webhook or CLI)
 */
export const pollTelegramUpdates = async (
  offset?: number,
  token?: string
): Promise<{ ok: boolean; updates: any[]; error?: string }> => {
  const activeToken = (token || DEFAULT_TELEGRAM_BOT_TOKEN).trim();
  if (!activeToken) return { ok: false, updates: [], error: 'Bot token missing' };

  // If in backoff cooldown or another request is currently in-flight, return silently
  if (Date.now() < nextAllowedPollTime || isPollInFlight) {
    return { ok: false, updates: [] };
  }

  isPollInFlight = true;

  try {
    const url = offset
      ? `https://api.telegram.org/bot${activeToken}/getUpdates?offset=${offset}&timeout=0`
      : `https://api.telegram.org/bot${activeToken}/getUpdates?timeout=0`;
    const res = await fetch(url);
    const data = await res.json().catch(() => ({}));

    if (data && data.ok) {
      nextAllowedPollTime = 0;
      return { ok: true, updates: data.result || [] };
    }

    // Auto-resolve Telegram 409 Conflict error
    // If a webhook was active or another instance is running, delete webhook and back off for 15s
    if (res.status === 409 || data.error_code === 409) {
      nextAllowedPollTime = Date.now() + 15000;
      try {
        await deleteTelegramWebhook(activeToken);
      } catch (e) {}
      return { ok: false, updates: [], error: data.description || '409 Conflict' };
    }

    return { ok: false, updates: [], error: data.description };
  } catch (err: any) {
    return { ok: false, updates: [], error: err.message };
  } finally {
    isPollInFlight = false;
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
 * Send raw Telegram Message (supports Markdown/HTML and optional inline keyboards/replyMarkup)
 */
export const sendTelegramMessage = async (
  chatId: string | number,
  text: string,
  token?: string,
  parseMode: 'Markdown' | 'HTML' = 'Markdown',
  replyMarkup?: any
): Promise<{ ok: boolean; message_id?: number; description?: string }> => {
  const activeToken = (token || DEFAULT_TELEGRAM_BOT_TOKEN).trim();
  if (!activeToken) {
    return { ok: false, description: 'Bot token missing' };
  }
  if (!chatId) {
    return { ok: false, description: 'Telegram Chat ID missing' };
  }

  try {
    const payload: any = {
      chat_id: chatId,
      text: text,
      parse_mode: parseMode,
      disable_web_page_preview: true,
    };

    if (replyMarkup) {
      payload.reply_markup = replyMarkup;
    }

    const res = await fetch(`https://api.telegram.org/bot${activeToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    return data;
  } catch (err: any) {
    console.error('sendTelegramMessage error:', err);
    return { ok: false, description: err.message || 'Network error' };
  }
};

/**
 * Answer Telegram Callback Query (for inline buttons)
 */
export const answerCallbackQuery = async (
  callbackQueryId: string,
  text?: string,
  showAlert: boolean = false,
  token?: string
): Promise<{ ok: boolean }> => {
  const activeToken = (token || DEFAULT_TELEGRAM_BOT_TOKEN).trim();
  if (!activeToken || !callbackQueryId) return { ok: false };

  try {
    const res = await fetch(`https://api.telegram.org/bot${activeToken}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text: text,
        show_alert: showAlert,
      }),
    });
    return await res.json();
  } catch (err) {
    console.warn('answerCallbackQuery error:', err);
    return { ok: false };
  }
};

/**
 * Handle incoming bot commands (/start, /balance, /account, /help)
 */
export const handleTelegramBotCommand = async ({
  text,
  chatId,
  senderName,
  customers,
  sales,
  settlements,
  onCustomerLinked,
  shopSettings,
  token,
}: {
  text: string;
  chatId: number;
  senderName?: string;
  customers: Customer[];
  sales?: Sale[];
  settlements?: any[];
  onCustomerLinked?: (customerId: string, chatId: number) => Promise<void> | void;
  shopSettings?: any;
  token?: string;
}) => {
  const cleanText = text.trim();
  // Strip bot username suffix like /balance@Bbacksh0p_bot -> /balance
  const cmd = cleanText.split(' ')[0].toLowerCase().replace(/@\w+/g, '');

  // 0. Check if message is an amount entry (e.g. "250", "250.00", "MVR 250", "250 MVR", "250/-", "rf 250")
  const cleanForAmt = cleanText.replace(/,/g, '').trim();
  const amtRegex = /(?:mvr|rf|ރ|amount|slip)?\s*([0-9]+(?:\.[0-9]{1,2})?)\s*(?:mvr|rf|ރ|\/-|rufiyaa)?/i;
  const numMatch = cleanForAmt.match(amtRegex);

  if (numMatch && !cleanText.startsWith('/') && !['start', 'balance', 'help', 'account', 'transfer', 'statement', 'briefing', 'today', 'close', 'summary'].includes(cmd)) {
    const typedAmount = parseFloat(numMatch[1]);
    if (!isNaN(typedAmount) && typedAmount > 0 && supabase) {
      const isChatLinked = (c: Customer) => Boolean(c.telegram_chat_id) && String(c.telegram_chat_id).trim() === String(chatId).trim();
      const customer = customers.find(isChatLinked);

      let slipQuery = supabase
        .from('transfer_slips')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1);

      if (customer) {
        slipQuery = slipQuery.or(`telegram_chat_id.eq.${chatId},customer_id.eq.${customer.id}`);
      } else {
        slipQuery = slipQuery.eq('telegram_chat_id', chatId);
      }

      const { data: recentSlip } = await slipQuery.maybeSingle();

      if (recentSlip) {
        await supabase
          .from('transfer_slips')
          .update({
            suggested_amount: typedAmount,
            caption: (recentSlip.caption ? `${recentSlip.caption} | ` : '') + `Entered Amount: MVR ${typedAmount.toFixed(2)}`,
            updated_at: new Date().toISOString()
          })
          .eq('id', recentSlip.id);

        await sendTelegramMessage(
          chatId,
          `✅ *ފައިސާގެ އަދަދު ރައްކާކުރެވިއްޖެ: MVR ${typedAmount.toFixed(2)}*
━━━━━━━━━━━━━━━━━━━━
💰 *Transfer Amount Recorded:* MVR ${typedAmount.toFixed(2)}

ކޭޝިއަރު ވެރިފައި ކުރުމަށްފަހު ރަސްމީ ރަސީދު މި ޗެޓަށް ލިބޭނެއެވެ. ޝުކުރިއްޔާ! 🙏
_Your slip has been updated in POS for instant cashier verification._`,
          token
        );
        return;
      } else if (customer) {
        await sendTelegramMessage(
          chatId,
          `✅ *ފައިސާގެ އަދަދު: MVR ${typedAmount.toFixed(2)}*
━━━━━━━━━━━━━━━━━━━━
📸 *މިހާރު ޓްރާންސްފަރ ސްލިޕް ފޮނުއްވާލައްވާ!*
Please attach and send your BML payment slip screenshot now to complete verification. 🙏`,
          token
        );
        return;
      }
    }
  }

  // 1. /start <code_or_id> or bare /start
  if (cmd.startsWith('/start') || cmd.startsWith('start')) {
    const parts = cleanText.split(' ');
    const ref = (parts[1] || '').trim().toLowerCase();

    if (ref) {
      const match = customers.find(c => 
        c.id?.toLowerCase() === ref || 
        c.code?.toLowerCase() === ref
      );

      if (match) {
        if (onCustomerLinked) {
          await onCustomerLinked(match.id, chatId);
        }
        const name = match.name_en || match.name_dv || senderName || 'Valued Customer';
        const balance = Number(match.outstanding_balance || 0).toFixed(2);
        const limit = Number(match.credit_limit || 0).toFixed(2);
        const points = Number(match.loyalty_points || 0).toFixed(0);

        const welcomeMsg = 
`✅ *Welcome to B BACK, ${name}!*
━━━━━━━━━━━━━━━━━━━━
Your Telegram account is now linked to store account: \`${match.code}\`.

💰 *Current Due:* MVR ${balance}
💳 *Credit Limit:* MVR ${limit}
⭐ *Loyalty Points:* ${points} pts

━━━━━━━━━━━━━━━━━━━━
You will automatically receive:
• 🧾 Real-time sales receipts
• 💳 Payment settlement confirmations
• 📊 Monthly credit statements

Type */balance* or */account* anytime! 🙏`;

        await sendTelegramMessage(chatId, welcomeMsg, token);
        return;
      }
    }

    // Helper to match customer by chatId
    const isChatLinked = (c: Customer) => Boolean(c.telegram_chat_id) && String(c.telegram_chat_id).trim() === String(chatId).trim();

    // Bare /start
    const linkedCustomer = customers.find(isChatLinked);
    if (linkedCustomer) {
      const name = linkedCustomer.name_en || linkedCustomer.name_dv || senderName || 'Valued Customer';
      const greeting = 
`👋 *Welcome back, ${name}!*
━━━━━━━━━━━━━━━━━━━━
Your Telegram is connected to store code: \`${linkedCustomer.code}\`.

Available Commands:
• */balance* - View current credit tab & due amount
• */account* - View linked customer profile details
• */help* - Store hours, contact & bank transfer details`;

      await sendTelegramMessage(chatId, greeting, token);
    } else {
      const intro = 
`👋 *Welcome to B BACK Store Bot!*
━━━━━━━━━━━━━━━━━━━━
Connect your store account and activate real-time digital receipts:

• Open your customer profile on our shop POS screen
• Scan the personal QR code displayed
• Or ask our cashier for your connection link!

Commands:
• */help* - How to use this bot & store contact details`;

      await sendTelegramMessage(chatId, intro, token);
    }
    return;
  }

  // Helper to match customer by chatId
  const isChatLinked = (c: Customer) => Boolean(c.telegram_chat_id) && String(c.telegram_chat_id).trim() === String(chatId).trim();

  // 2. /balance or balance or /statement
  if (cmd === '/balance' || cmd === 'balance' || cmd === '/statement' || cmd === 'statement') {
    const customer = customers.find(isChatLinked);
    if (customer) {
      const name = customer.name_en || customer.name_dv;
      const balance = Number(customer.outstanding_balance || 0).toFixed(2);
      const limit = Number(customer.credit_limit || 0).toFixed(2);
      const points = Number(customer.loyalty_points || 0).toFixed(0);
      const now = new Date();
      const dateStr = formatMaldivesDate(now);
      const timeStr = formatMaldivesTime(now, true);

      const msg = 
`📋 *B BACK - Credit Statement*
━━━━━━━━━━━━━━━━━━━━
👤 *Customer:* ${name} (\`${customer.code}\`)
📅 *Date:* ${dateStr} | ${timeStr}
💰 *Current Due:* MVR ${balance}
💳 *Credit Limit:* MVR ${limit}
⭐ *Loyalty Points:* ${points} pts

━━━━━━━━━━━━━━━━━━━━
🏦 *Bank Transfer Payment:*
Bank of Maldives (BML)
Account: \`7730000442060\` (B BACK)

_Please send transfer receipt slip to the cashier._`;

      await sendTelegramMessage(chatId, msg, token);
    } else {
      await sendTelegramMessage(
        chatId,
        `⚠️ Your Telegram is not linked to any store account yet.\n\nPlease ask our cashier to connect your account or scan your QR code on the POS screen.`,
        token
      );
    }
    return;
  }

  // 3. /account or account or /profile
  if (cmd === '/account' || cmd === 'account' || cmd === '/profile' || cmd === 'profile') {
    const customer = customers.find(isChatLinked);
    if (customer) {
      const name = customer.name_en || customer.name_dv;
      const balance = Number(customer.outstanding_balance || 0).toFixed(2);
      const limit = Number(customer.credit_limit || 0).toFixed(2);
      const points = Number(customer.loyalty_points || 0).toFixed(0);

      const msg = 
`👤 *B BACK - Linked Customer Profile*
━━━━━━━━━━━━━━━━━━━━
• *Name:* ${name}
• *Customer Code:* \`${customer.code}\`
• *Phone:* ${customer.phone || 'Not provided'}
• *Email:* ${customer.email || 'Not provided'}
• *Status:* Active ✅
• *Credit Limit:* MVR ${limit}
• *Outstanding Due:* MVR ${balance}
• *Loyalty Points:* ${points} pts

_To update your contact details, please inform the cashier at the counter._`;

      await sendTelegramMessage(chatId, msg, token);
    } else {
      await sendTelegramMessage(
        chatId,
        `⚠️ Your Telegram is not linked to any store account yet.\n\nPlease ask our cashier to connect your account or scan your QR code on the POS screen.`,
        token
      );
    }
    return;
  }

  // 3. /transfer or transfer or /slip or slip
  if (cmd === '/transfer' || cmd === 'transfer' || cmd === '/slip' || cmd === 'slip') {
    const customer = customers.find(isChatLinked);
    const shopName = shopSettings?.shopName || 'B BACK';
    const currency = shopSettings?.currency || 'MVR';
    const balance = customer ? Number(customer.outstanding_balance || 0).toFixed(2) : undefined;
    const name = customer ? (customer.name_en || customer.name_dv) : undefined;

    let msg = `💳 *${shopName} - Bank Transfer Payment*\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━\n`;
    if (customer) {
      msg += `👤 *Customer:* ${name} (\`${customer.code}\`)\n`;
      msg += `💰 *Current Tab Due:* *${currency} ${balance}*\n`;
      msg += `━━━━━━━━━━━━━━━━━━━━\n`;
    }
    msg += `🏪 *Transfer to Our BML Account:*\n`;
    msg += `• *Bank:* Bank of Maldives (BML)\n`;
    msg += `• *Account Name:* ${shopName}\n`;
    msg += `• *Account Number:* \`7730000442060\`\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `📸 *Please Send Your Slip:*\n`;
    msg += `1. Complete the transfer on your BML app.\n`;
    msg += `2. Take a screenshot or save the payment slip.\n`;
    msg += `3. *Attach and send the slip photo directly in this chat!* 📎\n\n`;
    msg += `_Our cashier will verify the transfer in our bank account and settle your tab immediately._ 🙏`;

    await sendTelegramMessage(chatId, msg, token);
    return;
  }

  // 4. /help or help
  if (cmd === '/help' || cmd === 'help') {
    const shopName = shopSettings?.shopName || 'B BACK';
    const shopPhone = shopSettings?.shopPhone || '+960 9336337';
    const shopAddress = shopSettings?.shopAddress || 'Malé, Maldives';

    const msg = 
`🤖 *${shopName} Store Bot - Commands & Help*
━━━━━━━━━━━━━━━━━━━━
• */start* - Connect your store account and activate receipts
• */balance* - View your current credit tab and outstanding amount
• */transfer* - Send bank transfer slip
• */account* - View your linked customer profile details
• */help* - How to use this bot and store contact details

━━━━━━━━━━━━━━━━━━━━
🏪 *Store Contact Details:*
📍 *Address:* ${shopAddress}
📞 *Phone:* ${shopPhone}
🏦 *BML Account:* \`7730000442060\`
⏰ *Hours:* Sat - Thu: 08:30 - 22:00 | Fri: 14:00 - 22:00

_For assistance, visit our shop or contact the cashier._`;

    await sendTelegramMessage(chatId, msg, token);
    return;
  }

  // 5. /briefing or /close or /today or /summary (Executive Store Close Briefing)
  if (cmd === '/briefing' || cmd === '/close' || cmd === '/today' || cmd === '/summary') {
    if (sales && sales.length >= 0) {
      const briefing = formatExecutiveBriefingMessage({
        sales,
        settlements,
        shopSettings,
        date: new Date(),
      });
      await sendTelegramMessage(chatId, briefing, token);
    } else {
      await sendTelegramMessage(
        chatId,
        `📊 *Store Close Briefing*\nPlease trigger from POS or check connected sales records.`,
        token
      );
    }
    return;
  }
};

/**
 * Process any pending updates from Telegram
 */
export const processPendingTelegramUpdates = async ({
  customers,
  sales,
  settlements,
  onCustomerLinked,
  onTransferSlipReceived,
  shopSettings,
  token,
}: {
  customers: Customer[];
  sales?: Sale[];
  settlements?: any[];
  onCustomerLinked?: (customerId: string, chatId: number) => Promise<void> | void;
  onTransferSlipReceived?: (slipData: any) => Promise<void> | void;
  shopSettings?: any;
  token?: string;
}): Promise<{ processedCount: number }> => {
  const result = await pollTelegramUpdates(undefined, token);
  if (!result.ok || !result.updates || !result.updates.length) {
    return { processedCount: 0 };
  }

  let maxUpdateId = 0;
  for (const update of result.updates) {
    if (update.update_id > maxUpdateId) maxUpdateId = update.update_id;

    // Handle Telegram inline keyboard callback query (e.g. [ 📤 Send Transfer Slip ])
    if (update.callback_query) {
      const cb = update.callback_query;
      const cbChatId = cb.message?.chat?.id || cb.from?.id;
      const data = cb.data;
      if (data === 'cmd_transfer' || data === 'send_slip') {
        await answerCallbackQuery(cb.id, '📸 Please tap the 📎 (attachment) icon below to send your BML transfer slip photo.', true, token);
        const shopName = shopSettings?.shopName || 'B BACK';
        const bankName = shopSettings?.bankName || 'Bank of Maldives (BML)';
        const accountNum = shopSettings?.accountNumber || '7730000442060';
        const promptMsg = 
`📸 *Upload Your Bank Transfer Slip*
━━━━━━━━━━━━━━━━━━━━
🏪 *${shopName}*
🏦 *Bank:* ${bankName}
💳 *Account:* \`${accountNum}\`

Please tap the 📎 (paperclip) icon at the bottom of your screen to attach and send your transfer receipt/screenshot directly in this chat! 📎

Our cashier will immediately verify the transaction and update your account balance. 🙏`;
        await sendTelegramMessage(cbChatId, promptMsg, token);
      }
      continue;
    }

    const msg = update.message;
    if (!msg || !msg.chat?.id) continue;
    const chatId = msg.chat.id;

    // A. Check if customer sent a photo or document (Bank Transfer Slip)
    if (msg.photo || msg.document) {
      try {
        const photoList = msg.photo;
        const fileId = photoList && photoList.length > 0
          ? photoList[photoList.length - 1].file_id
          : msg.document?.file_id;

        if (fileId) {
          const isChatLinked = (c: Customer) => Boolean(c.telegram_chat_id) && String(c.telegram_chat_id).trim() === String(chatId).trim();
          const customer = customers.find(isChatLinked);

          if (!customer) {
            await sendTelegramMessage(
              chatId,
              `⚠️ *Your Telegram is not linked yet.*\n\nPlease ask our cashier to connect your account or scan your QR code on the POS screen before sending transfer slips.`,
              token
            );
          } else {
            const fileUrl = await getTelegramFileDirectUrl(fileId, token);
            const caption = (msg.caption || '').trim();
            // Parse possible amount from caption
            const amtMatch = caption.match(/(?:mvr|rf|ރ)?\s*([0-9]+(?:\.[0-9]{1,2})?)/i);
            const suggestedAmount = amtMatch ? parseFloat(amtMatch[1]) : null;

            const slipData = {
              customer_id: customer.id,
              telegram_chat_id: chatId,
              customer_name: customer.name_en || customer.name_dv || 'Customer',
              customer_phone: customer.phone,
              file_id: fileId,
              file_url: fileUrl || undefined,
              caption: caption || undefined,
              suggested_amount: suggestedAmount,
              status: 'pending',
              created_at: new Date().toISOString(),
            };

            if (onTransferSlipReceived) {
              await onTransferSlipReceived(slipData);
            }

            const shopName = shopSettings?.shopName || 'B BACK';
            const currency = shopSettings?.currency || 'MVR';
            const dueStr = Number(customer.outstanding_balance || 0).toFixed(2);
            const ackMsg = 
`📥 *Bank Transfer Slip Received!*
━━━━━━━━━━━━━━━━━━━━
🏪 *${shopName}*
👤 *Customer:* ${slipData.customer_name}
📊 *Current Tab Due:* *${currency} ${dueStr}*
${suggestedAmount ? `💰 *Detected Amount:* ${currency} ${suggestedAmount.toFixed(2)}\n` : ''}${caption && !suggestedAmount ? `📝 *Note:* _${caption}_\n` : ''}━━━━━━━━━━━━━━━━━━━━
✍️ *Please type & reply with the transfer amount (e.g. \`250.00\` or \`150\`):*
This will record the exact amount for cashier verification & official receipt! 🙏`;

            await sendTelegramMessage(chatId, ackMsg, token);

            // Forward to B BACK group if configured
            const groupChatId = shopSettings?.telegramGroupChatId;
            if (groupChatId) {
              await forwardSlipToTelegramGroup({
                fileId,
                isDocument: Boolean(msg.document),
                customerName: slipData.customer_name,
                customerCode: customer.code,
                customerPhone: customer.phone,
                outstandingBalance: customer.outstanding_balance,
                caption,
                groupChatId,
                token,
              }).catch(err => console.warn('Failed to forward slip to group:', err));
            }
          }
        }
      } catch (slipErr) {
        console.warn('Error processing incoming transfer slip:', slipErr);
      }
      continue;
    }

    // B. Group messages & auto-linking
    if (msg.chat?.type === 'group' || msg.chat?.type === 'supergroup') {
      const groupChatId = msg.chat.id;
      const groupTitle = msg.chat.title || 'B BACK';
      const text = (msg.text || '').trim().toLowerCase();

      if (text.startsWith('/setgroup') || text.startsWith('/start') || groupTitle.toLowerCase().includes('b back')) {
        if (shopSettings && shopSettings.telegramGroupChatId !== groupChatId) {
          shopSettings.telegramGroupChatId = groupChatId;
          shopSettings.telegramGroupTitle = groupTitle;
          if (text.startsWith('/setgroup')) {
            await sendTelegramMessage(
              groupChatId,
              `✅ *B BACK Store Group Linked!*\n━━━━━━━━━━━━━━━━━━━━\n📍 *Group:* ${groupTitle}\n🆔 *Chat ID:* \`${groupChatId}\`\n\nAll customer bank transfer slips will be automatically forwarded to this group with customer profile details! 🚀`,
              token
            );
          }
        }
      }
      continue;
    }

    // C. Text commands
    if (msg.text) {
      try {
        await handleTelegramBotCommand({
          text: msg.text,
          chatId,
          senderName: msg.from?.first_name,
          customers,
          sales,
          settlements,
          onCustomerLinked,
          shopSettings,
          token,
        });
      } catch (cmdErr) {
        console.warn('Error handling bot command:', cmdErr);
      }
    }
  }

  if (maxUpdateId > 0) {
    await pollTelegramUpdates(maxUpdateId + 1, token).catch(() => {});
  }

  return { processedCount: result.updates.length };
};

/**
 * Forward customer bank transfer slip to the store's Telegram group (B BACK)
 */
export const forwardSlipToTelegramGroup = async ({
  fileId,
  isDocument = false,
  customerName,
  customerCode,
  customerPhone,
  outstandingBalance,
  caption,
  groupChatId,
  token,
}: {
  fileId: string;
  isDocument?: boolean;
  customerName: string;
  customerCode?: string;
  customerPhone?: string;
  outstandingBalance?: number;
  caption?: string;
  groupChatId: string | number;
  token?: string;
}) => {
  const activeToken = (token || DEFAULT_TELEGRAM_BOT_TOKEN).trim();
  if (!activeToken || !groupChatId || !fileId) return { ok: false };

  const now = new Date();
  const dateStr = formatMaldivesDate(now);
  const timeStr = formatMaldivesTime(now, true);
  const balanceStr = outstandingBalance !== undefined ? Number(outstandingBalance).toFixed(2) : '0.00';

  const groupCaption = 
`📥 *NEW BANK TRANSFER SLIP RECEIVED*
━━━━━━━━━━━━━━━━━━━━
🏪 *Shop:* B BACK
👤 *Customer:* ${customerName}${customerCode ? ` (\`${customerCode}\`)` : ''}
📞 *Phone:* ${customerPhone || 'Not provided'}
💰 *Current Tab Due:* *MVR ${balanceStr}*
📅 *Submitted:* ${dateStr} | ${timeStr}
${caption ? `📝 *Customer Note:* _${caption}_\n` : ''}━━━━━━━━━━━━━━━━━━━━
⚡ _Awaiting cashier verification & settlement in POS._`;

  const endpoint = isDocument ? 'sendDocument' : 'sendPhoto';
  const bodyField = isDocument ? 'document' : 'photo';

  try {
    const res = await fetch(`https://api.telegram.org/bot${activeToken}/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: groupChatId,
        [bodyField]: fileId,
        caption: groupCaption,
        parse_mode: 'Markdown',
      }),
    });
    const json = await res.json();

    // If Markdown parsing fails due to special characters, retry in plain text
    if (!json.ok) {
      console.warn('forwardSlipToTelegramGroup markdown failed, retrying plain text:', json);
      const plainCaption = 
`📥 NEW BANK TRANSFER SLIP RECEIVED
━━━━━━━━━━━━━━━━━━━━
🏪 Shop: B BACK
👤 Customer: ${customerName}${customerCode ? ` (${customerCode})` : ''}
📞 Phone: ${customerPhone || 'Not provided'}
💰 Current Tab Due: MVR ${balanceStr}
📅 Submitted: ${dateStr} | ${timeStr}
${caption ? `📝 Customer Note: ${caption}\n` : ''}━━━━━━━━━━━━━━━━━━━━
⚡ Awaiting cashier verification & settlement in POS.`;

      const retryRes = await fetch(`https://api.telegram.org/bot${activeToken}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: groupChatId,
          [bodyField]: fileId,
          caption: plainCaption,
        }),
      });
      return await retryRes.json();
    }
    return json;
  } catch (err: any) {
    console.error('forwardSlipToTelegramGroup error:', err);
    return { ok: false, error: err.message };
  }
};

/**
 * Send settlement status update to the store's Telegram group
 */
export const sendGroupSlipSettledNotification = async ({
  groupChatId,
  customerName,
  customerCode,
  settledAmount,
  remainingBalance,
  receiptNo,
  token,
}: {
  groupChatId: string | number;
  customerName: string;
  customerCode?: string;
  settledAmount: number;
  remainingBalance: number;
  receiptNo: string;
  token?: string;
}) => {
  const activeToken = (token || DEFAULT_TELEGRAM_BOT_TOKEN).trim();
  if (!activeToken || !groupChatId) return;

  const now = new Date();
  const dateStr = formatMaldivesDate(now);
  const timeStr = formatMaldivesTime(now, true);

  const msg = 
`✅ *TRANSFER SLIP SETTLED IN POS*
━━━━━━━━━━━━━━━━━━━━
👤 *Customer:* ${customerName}${customerCode ? ` (\`${customerCode}\`)` : ''}
💰 *Amount Settled:* *MVR ${settledAmount.toFixed(2)}*
📉 *Remaining Tab:* *MVR ${remainingBalance.toFixed(2)}*
🧾 *Receipt #:* \`${receiptNo}\`
📅 *Time:* ${dateStr} | ${timeStr}
━━━━━━━━━━━━━━━━━━━━
_Verified by cashier at the counter._`;

  return sendTelegramMessage(groupChatId, msg, activeToken);
};

/**
 * Send Transfer Slip Approval & Settlement Message
 */
export const sendTelegramSlipApprovedMessage = async ({
  chatId,
  customerName,
  amountPaid,
  remainingBalance,
  receiptNo,
  shopSettings,
  token,
}: {
  chatId: number | string;
  customerName: string;
  amountPaid: number;
  remainingBalance: number;
  receiptNo: string;
  shopSettings?: any;
  token?: string;
}) => {
  const shopName = shopSettings?.shopName || 'B BACK';
  const currency = shopSettings?.currency || 'MVR';
  const now = new Date();
  const dateStr = formatMaldivesDate(now);
  const timeStr = formatMaldivesTime(now, true);

  const msg = 
`✅ *Transfer Slip Verified & Debt Settled!*
━━━━━━━━━━━━━━━━━━━━
🏪 *${shopName}*
🧾 *Receipt #:* \`${receiptNo}\`
📅 *Date:* ${dateStr} | ${timeStr}
━━━━━━━━━━━━━━━━━━━━
👤 *Customer:* ${customerName}
💰 *Amount Settled:* *${currency} ${amountPaid.toFixed(2)}*
📉 *Remaining Due:* ${Number(remainingBalance) <= 0 ? '✅ *CLEARED (0.00)*' : `*${currency} ${Number(remainingBalance).toFixed(2)}*`}

✅ Your bank transfer slip has been verified by the cashier and applied to your account.

_Thank you for your payment!_ 🙏`;

  return sendTelegramMessage(chatId, msg, token);
};

/**
 * Send Transfer Slip Declined Message
 */
export const sendTelegramSlipDeclinedMessage = async ({
  chatId,
  customerName,
  reason,
  shopSettings,
  token,
}: {
  chatId: number | string;
  customerName: string;
  reason: string;
  shopSettings?: any;
  token?: string;
}) => {
  const shopName = shopSettings?.shopName || 'B BACK';
  const shopPhone = shopSettings?.shopPhone || '+960 9336337';
  const now = new Date();
  const dateStr = formatMaldivesDate(now);
  const timeStr = formatMaldivesTime(now, true);

  const msg = 
`⚠️ *Transfer Slip Not Approved*
━━━━━━━━━━━━━━━━━━━━
🏪 *${shopName}*
📅 *Date:* ${dateStr} | ${timeStr}
👤 *Customer:* ${customerName}

❌ *Reason:* ${reason}

Please check your bank transfer details or contact the shop:
📞 *Phone:* ${shopPhone}

_You can also attach a clear copy of the slip again in this chat._`;

  return sendTelegramMessage(chatId, msg, token);
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
  const now = new Date();
  const formattedDate = `${formatMaldivesDate(now)} | ${formatMaldivesTime(now, true)}`;

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
  const now = new Date();
  const dateStr = formatMaldivesDate(now);
  const timeStr = formatMaldivesTime(now, true);
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
  msg += `📅 *Date:* ${dateStr} | ${timeStr}\n`;
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
  const saleDateStr = formatMaldivesDate(sale.date);
  const saleTimeStr = formatMaldivesTime(sale.date, true);

  let msg = `🛍️ *${shopName.toUpperCase()} - SALES RECEIPT*\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `*Invoice:* \`${invoiceNo}\`\n`;
  msg += `*Date:* ${saleDateStr} | ${saleTimeStr}\n`;
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

// ==========================================
// 1. NIGHTLY "STORE CLOSE" EXECUTIVE BRIEFING
// ==========================================

export interface ExecutiveBriefingData {
  dateStr: string;
  timeStr: string;
  totalSales: number;
  cashSales: number;
  transferSales: number;
  creditSales: number;
  otherSales: number;
  totalTransactions: number;
  averageTransaction: number;
  creditCollections: number;
  settlementCount: number;
  topItems: { name: string; qty: number; unit?: string; totalAmount: number }[];
}

/**
 * Calculate comprehensive daily sales & collections metrics for the Executive Briefing
 */
export const calculateExecutiveBriefingData = ({
  sales,
  settlements = [],
  targetDate,
}: {
  sales: Sale[];
  settlements?: any[];
  targetDate?: Date | string;
}): ExecutiveBriefingData => {
  const now = targetDate ? new Date(targetDate) : new Date();
  const targetDateStr = extractDateOnly(now.toISOString());
  const dateStr = formatMaldivesDate(now);
  const timeStr = formatMaldivesTime(now, true);

  // 1. Filter sales for target date
  const salesToday = (sales || []).filter(s => {
    if (!s.date) return false;
    return extractDateOnly(s.date) === targetDateStr;
  });

  let totalSales = 0;
  let cashSales = 0;
  let transferSales = 0;
  let creditSales = 0;
  let otherSales = 0;
  const itemMap = new Map<string, { name: string; qty: number; unit?: string; totalAmount: number }>();

  salesToday.forEach(s => {
    const grandTotal = Number(s.grandTotal || 0);
    totalSales += grandTotal;
    const method = String(s.paymentMethod || 'cash').toLowerCase();

    if (method === 'cash') {
      cashSales += grandTotal;
    } else if (method === 'credit') {
      creditSales += grandTotal;
    } else if (method === 'transfer' || method === 'card' || method === 'bml') {
      transferSales += grandTotal;
    } else if (method === 'split' && Array.isArray(s.splitDetails) && s.splitDetails.length > 0) {
      s.splitDetails.forEach((d: any) => {
        const dMethod = String(d.method || '').toLowerCase();
        const dAmount = Number(d.amount || 0);
        if (dMethod === 'cash') cashSales += dAmount;
        else if (dMethod === 'credit') creditSales += dAmount;
        else if (dMethod === 'transfer' || dMethod === 'card' || dMethod === 'bml') transferSales += dAmount;
        else otherSales += dAmount;
      });
    } else {
      otherSales += grandTotal;
    }

    // Accumulate items
    if (Array.isArray(s.items)) {
      s.items.forEach(item => {
        const name = (item.name_en || item.name_dv || 'Item').trim();
        const qty = Number(item.qty || 0);
        const price = Number(item.price || 0);
        const unit = item.selected_unit || '';
        const existing = itemMap.get(name);
        if (existing) {
          existing.qty += qty;
          existing.totalAmount += qty * price;
        } else {
          itemMap.set(name, { name, qty, unit, totalAmount: qty * price });
        }
      });
    }
  });

  // Sort top selling items by quantity
  const topItems = Array.from(itemMap.values())
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  // 2. Filter settlements for target date
  const settlementsToday = (settlements || []).filter(st => {
    if (!st.date) return false;
    return extractDateOnly(st.date) === targetDateStr;
  });

  const creditCollections = settlementsToday.reduce((sum, st) => sum + Number(st.amount_paid || 0), 0);

  const totalTransactions = salesToday.length;
  const averageTransaction = totalTransactions > 0 ? totalSales / totalTransactions : 0;

  return {
    dateStr,
    timeStr,
    totalSales,
    cashSales,
    transferSales,
    creditSales,
    otherSales,
    totalTransactions,
    averageTransaction,
    creditCollections,
    settlementCount: settlementsToday.length,
    topItems,
  };
};

/**
 * Format Executive Briefing Telegram message for the Owner
 */
export const formatExecutiveBriefingMessage = ({
  sales,
  settlements = [],
  shopSettings,
  date,
}: {
  sales: Sale[];
  settlements?: any[];
  shopSettings?: any;
  date?: Date | string;
}): string => {
  const data = calculateExecutiveBriefingData({ sales, settlements, targetDate: date });
  const shopName = shopSettings?.shopName || 'B BACK';
  const currency = shopSettings?.currency || 'MVR';

  const formatMvr = (val: number) => `${currency} ${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  let msg = `📊 *STORE CLOSE DAILY BRIEFING - B BACK*\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `🏪 *Shop:* ${shopName}\n`;
  msg += `📅 *Date:* ${data.dateStr} | ${data.timeStr}\n\n`;

  msg += `💰 *Total Sales:* *${formatMvr(data.totalSales)}*\n`;
  msg += `(💵 Cash: ${formatMvr(data.cashSales)} | 💳 BML/Transfer: ${formatMvr(data.transferSales)} | 📝 Credit: ${formatMvr(data.creditSales)})\n\n`;

  msg += `🧾 *Credit Collections:* *${formatMvr(data.creditCollections)}* settled today\n\n`;

  msg += `🏆 *Top Selling Items:*\n`;
  if (data.topItems.length === 0) {
    msg += `_No items recorded today_\n`;
  } else {
    data.topItems.forEach((it, idx) => {
      const unitLabel = it.unit && it.unit !== 'Piece' ? ` ${it.unit}` : ' pcs';
      msg += `${idx + 1}. *${it.name}* (${it.qty}${unitLabel})\n`;
    });
  }

  msg += `\n📈 *Store Performance:*\n`;
  msg += `• Receipts Issued: *${data.totalTransactions} transactions*\n`;
  msg += `• Average Ticket: *${formatMvr(data.averageTransaction)}*\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `🌙 _Have a restful night! Store close automated report._`;

  return msg;
};

/**
 * Send the Nightly Executive Briefing directly to the B BACK Telegram group
 */
export const sendNightlyExecutiveBriefing = async ({
  chatId,
  sales,
  settlements = [],
  shopSettings,
  date,
  token,
}: {
  chatId?: string | number;
  sales: Sale[];
  settlements?: any[];
  shopSettings?: any;
  date?: Date | string;
  token?: string;
}) => {
  const targetChatId = chatId || shopSettings?.telegramGroupChatId;
  if (!targetChatId) {
    return { ok: false, description: 'No B BACK Telegram group Chat ID found in settings.' };
  }
  const message = formatExecutiveBriefingMessage({ sales, settlements, shopSettings, date });
  return await sendTelegramMessage(targetChatId, message, token);
};

// ==========================================
// 2. AUTOMATED TAB OVERDUE REMINDERS
// ==========================================

/**
 * Format polite, respectful automated credit reminder message
 */
export const formatPoliteCreditReminderMessage = ({
  customer,
  shopSettings,
  balance,
  isThreshold = false,
  thresholdPct,
  creditLimit,
}: {
  customer: Customer;
  shopSettings?: any;
  balance: number;
  isThreshold?: boolean;
  thresholdPct?: number;
  creditLimit?: number;
}): string => {
  const shopName = shopSettings?.shopName || 'B BACK';
  const currency = shopSettings?.currency || 'MVR';
  const customerName = customer.name_en || customer.name_dv || 'Valued Customer';
  const bankName = shopSettings?.bankName || 'Bank of Maldives (BML)';
  const accountName = shopSettings?.accountName || shopName;
  const accountNumber = shopSettings?.accountNumber || '7730000442060';
  const balanceStr = Number(balance).toFixed(2);
  const limit = creditLimit !== undefined ? creditLimit : Number(customer.credit_limit || 0);
  const limitStr = limit.toFixed(2);
  const actualPct = thresholdPct || (limit > 0 ? Math.round((balance / limit) * 100) : 90);

  let msg = `🌙 *As-salamu alaykum ${customerName},*\n\n`;
  msg += `🏪 *${shopName}* — _(Automated Reminder)_\n\n`;
  msg += `We hope this message finds you in good health.\n\n`;

  if (isThreshold) {
    msg += `This is a friendly automated notification that your store credit tab has reached *${actualPct}%* of your account limit.\n\n`;
  } else {
    msg += `This is a gentle automated reminder regarding your store credit tab for this month.\n\n`;
  }

  msg += `💰 *Outstanding Balance:* *${currency} ${balanceStr}*\n`;
  if (isThreshold && limit > 0) {
    msg += `💳 *Credit Limit:* ${currency} ${limitStr}\n`;
  }
  msg += `━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `To settle your tab comfortably, you may transfer to our bank account:\n`;
  msg += `🏦 *Bank:* ${bankName}\n`;
  msg += `👤 *Account Name:* ${accountName}\n`;
  msg += `💳 *Account Number:* \`${accountNumber}\`\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `Once transferred, please send your transfer slip photo directly in this chat (or to the cashier), and our team will verify and settle your account immediately.\n\n`;
  msg += `_JazakAllahu Khayran for your continued trust and support!_ 🙏`;

  return msg;
};

/**
 * Send automated credit reminder (clean text notification)
 */
export const sendAutomatedCreditReminder = async ({
  chatId,
  customer,
  shopSettings,
  balance,
  isThreshold = false,
  thresholdPct,
  creditLimit,
  token,
}: {
  chatId: string | number;
  customer: Customer;
  shopSettings?: any;
  balance: number;
  isThreshold?: boolean;
  thresholdPct?: number;
  creditLimit?: number;
  token?: string;
}) => {
  const text = formatPoliteCreditReminderMessage({
    customer,
    shopSettings,
    balance,
    isThreshold,
    thresholdPct,
    creditLimit,
  });

  return await sendTelegramMessage(chatId, text, token, 'Markdown');
};

/**
 * Format notification for when an unconfirmed awaiting transfer is automatically moved to customer credit tab
 */
export const formatAutoTransferToCreditMessage = ({
  customer,
  amount,
  newBalance,
  shopSettings,
}: {
  customer: Customer;
  amount: number;
  newBalance?: number;
  shopSettings?: any;
}): string => {
  const shopName = shopSettings?.shopName || 'B BACK';
  const currency = shopSettings?.currency || 'MVR';
  const customerName = customer.name_en || customer.name_dv || 'Valued Customer';
  const amountStr = Number(amount || 0).toFixed(2);
  const newBalanceStr = newBalance !== undefined ? Number(newBalance).toFixed(2) : undefined;
  const accountNumber = shopSettings?.accountNumber || '7730000442060';

  let msg = `🌙 *As-salamu alaykum ${customerName},*\n\n`;
  msg += `🏪 *${shopName}* — _(Awaiting Transfer Update)_\n\n`;
  msg += `Your unconfirmed pending transfer of *${currency} ${amountStr}* has been automatically recorded to your store credit tab.\n\n`;
  
  if (newBalanceStr) {
    msg += `💰 *Updated Tab Balance:* *${currency} ${newBalanceStr}*\n\n`;
  }
  
  msg += `━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `If you have already made the transfer to our BML account (\`${accountNumber}\`), please send your transfer receipt photo directly in this chat so our cashier can verify and settle your tab.\n\n`;
  msg += `_JazakAllahu Khayran for your continued trust and support!_ 🙏`;

  return msg;
};

/**
 * Send auto transfer to credit notification to customer Telegram
 */
export const sendAutoTransferToCreditNotification = async ({
  chatId,
  customer,
  amount,
  newBalance,
  shopSettings,
  token,
}: {
  chatId: string | number;
  customer: Customer;
  amount: number;
  newBalance?: number;
  shopSettings?: any;
  token?: string;
}) => {
  const text = formatAutoTransferToCreditMessage({
    customer,
    amount,
    newBalance,
    shopSettings,
  });
  return await sendTelegramMessage(chatId, text, token, 'Markdown');
};

/**
 * Format an eye-catching, attention-seeking promotional broadcast for near-expiry clearance products
 */
export const formatNearExpiryClearanceBroadcastMessage = ({
  items,
  shopSettings,
}: {
  items: Array<{
    name_dv: string;
    name_en: string;
    price: number;
    original_price?: number;
    price_before?: number;
    expiry_date?: string;
    stock_shop?: number;
  }>;
  shopSettings?: any;
}): string => {
  const shopName = shopSettings?.shopName || 'B BACK';
  const shopPhone = shopSettings?.shopPhone || '+960 9336337';
  const currency = shopSettings?.currency || 'MVR';
  const now = new Date();

  let msg = `🚨🔥 *SPECIAL FLASH CLEARANCE DEALS!* 🔥🚨\n`;
  msg += `*ޚާއްސަ އަގުހެޔޮ ސޭލް — މުއްދަތު ހަމަވާ މުދާ ބޮޑު ޑިސްކައުންޓުގައި!*\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `🏪 *${shopName}*\n`;
  msg += `⚡ *LIMITED QUANTITIES — HURRY WHILE STOCKS LAST!* ⚡\n\n`;
  msg += `🛒 *FEATURED CLEARANCE PRODUCTS:*\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━\n\n`;

  items.forEach((item, idx) => {
    const numEmoji = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'][idx] || `🔹`;
    const priceBefore = item.original_price || item.price_before || (item.price > 0 ? item.price : 0);
    const currentPrice = item.price;
    
    let discountPct = 0;
    if (priceBefore > currentPrice && priceBefore > 0) {
      discountPct = Math.round(((priceBefore - currentPrice) / priceBefore) * 100);
    }

    let expiryText = '';
    if (item.expiry_date) {
      const exp = new Date(item.expiry_date);
      const diffDays = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const expFormatted = formatMaldivesDate(exp);
      expiryText = diffDays > 0 ? `${expFormatted} (${diffDays} days left)` : `${expFormatted} (Expiring soon)`;
    }

    msg += `${numEmoji} *${item.name_dv}* (${item.name_en})\n`;
    if (expiryText) {
      msg += `   ⏳ *Expiry Date:* ${expiryText}\n`;
    }
    if (priceBefore > currentPrice && discountPct > 0) {
      msg += `   💰 *Price Before:* ~${currency} ${priceBefore.toFixed(2)}~\n`;
      msg += `   🔥 *CLEARANCE PRICE:* *${currency} ${currentPrice.toFixed(2)}* (*${discountPct}% OFF!*)\n`;
    } else {
      msg += `   🔥 *CLEARANCE PRICE:* *${currency} ${currentPrice.toFixed(2)}*\n`;
    }
    if (item.stock_shop !== undefined && item.stock_shop > 0) {
      msg += `   📦 *Available Stock:* ${item.stock_shop} units\n`;
    }
    msg += `\n`;
  });

  msg += `━━━━━━━━━━━━━━━━━━━━\n`;
  if (shopPhone) {
    msg += `📞 *Contact:* ${shopPhone}\n\n`;
  }
  msg += `_Don't miss out on these limited special price drops!_ ✨`;

  return msg;
};

/**
 * Broadcast near expiry promotional message to all Telegram-connected customers & store group
 */
export const sendNearExpiryClearanceBroadcast = async ({
  items,
  customers,
  shopSettings,
  token,
}: {
  items: Array<{
    name_dv: string;
    name_en: string;
    price: number;
    original_price?: number;
    price_before?: number;
    expiry_date?: string;
    stock_shop?: number;
  }>;
  customers: Customer[];
  shopSettings?: any;
  token?: string;
}): Promise<{ successCount: number; failedCount: number; totalRecipients: number; error?: string }> => {
  const activeToken = (token || DEFAULT_TELEGRAM_BOT_TOKEN).trim();
  if (!activeToken || items.length === 0) {
    return { successCount: 0, failedCount: 0, totalRecipients: 0, error: 'Missing token or no items' };
  }

  const messageText = formatNearExpiryClearanceBroadcastMessage({ items, shopSettings });

  // Gather unique recipient chat IDs
  const recipientChatIds = new Set<string | number>();

  // 1. All linked customers
  customers.forEach(c => {
    if (c.telegram_chat_id) {
      recipientChatIds.add(c.telegram_chat_id);
    }
  });

  // 2. Store Telegram group
  const groupChatId = shopSettings?.telegramGroupChatId;
  if (groupChatId) {
    recipientChatIds.add(groupChatId);
  }

  const chatIdsArray = Array.from(recipientChatIds);
  let successCount = 0;
  let failedCount = 0;
  let lastError = '';

  for (const chatId of chatIdsArray) {
    try {
      const res = await sendTelegramMessage(chatId, messageText, activeToken, 'Markdown');
      if (res.ok) {
        successCount++;
      } else {
        lastError = res.description || 'Failed to send';
        // Retry plain text if Markdown entity parsing failed
        if (res.description && res.description.toLowerCase().includes('parse')) {
          const plainText = messageText.replace(/[*_~`]/g, '');
          const retryRes = await sendTelegramMessage(chatId, plainText, activeToken);
          if (retryRes.ok) {
            successCount++;
          } else {
            failedCount++;
            lastError = retryRes.description || lastError;
          }
        } else {
          failedCount++;
        }
      }
    } catch (e: any) {
      failedCount++;
      lastError = e?.message || 'Network error';
    }
    // Small throttling delay to avoid Telegram rate limits
    await new Promise(r => setTimeout(r, 60));
  }

  return {
    successCount,
    failedCount,
    totalRecipients: chatIdsArray.length,
    error: lastError,
  };
};

