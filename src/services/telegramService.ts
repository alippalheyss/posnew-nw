import { Customer, Sale } from '@/context/AppContext';
import { formatDate, formatTime, formatMaldivesDate, formatMaldivesTime } from '@/utils/formatters';

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
  try {
    const res = await fetch(`https://api.telegram.org/bot${activeToken}/deleteWebhook`, {
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
 * Handle incoming bot commands (/start, /balance, /account, /help)
 */
export const handleTelegramBotCommand = async ({
  text,
  chatId,
  senderName,
  customers,
  onCustomerLinked,
  shopSettings,
  token,
}: {
  text: string;
  chatId: number;
  senderName?: string;
  customers: Customer[];
  onCustomerLinked?: (customerId: string, chatId: number) => Promise<void> | void;
  shopSettings?: any;
  token?: string;
}) => {
  const cleanText = text.trim();
  // Strip bot username suffix like /balance@Bbacksh0p_bot -> /balance
  const cmd = cleanText.split(' ')[0].toLowerCase().replace(/@\w+/g, '');

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
};

/**
 * Process any pending updates from Telegram
 */
export const processPendingTelegramUpdates = async ({
  customers,
  onCustomerLinked,
  onTransferSlipReceived,
  shopSettings,
  token,
}: {
  customers: Customer[];
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
${caption ? `📝 *Note:* _${caption}_\n` : ''}
━━━━━━━━━━━━━━━━━━━━
✅ Your slip has been submitted to our cashier for verification.
Once verified in our bank account, your balance will be settled and you'll receive your official receipt here!

_Thank you!_ 🙏`;

            await sendTelegramMessage(chatId, ackMsg, token);
          }
        }
      } catch (slipErr) {
        console.warn('Error processing incoming transfer slip:', slipErr);
      }
      continue;
    }

    // B. Text commands
    if (msg.text) {
      try {
        await handleTelegramBotCommand({
          text: msg.text,
          chatId,
          senderName: msg.from?.first_name,
          customers,
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
