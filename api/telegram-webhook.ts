import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://zmbbgfpzgfcsoexybrle.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InptYmJnZnB6Z2Zjc29leHlicmxlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1NzA2OTksImV4cCI6MjA4NTE0NjY5OX0.hN7hEElA0nn2ncbKSYEmObIuSypLBvB2lp4VwmX2x_s';
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8815725998:AAHVMSujW5JM-ND4CJAzPr_Qsj_enXm2cYQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const sendTelegramMessage = async (chatId: number | string, text: string) => {
  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
        disable_web_page_preview: true,
      }),
    });
  } catch (err) {
    console.error('sendTelegramMessage error in webhook:', err);
  }
};

export default async function handler(req: any, res: any) {
  if (req.method === 'GET') {
    return res.status(200).json({ ok: true, message: 'B BACK Telegram Webhook is active' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const update = req.body;
    if (update?.message?.text && update?.message?.chat?.id) {
      const text = String(update.message.text).trim();
      const chatId = update.message.chat.id;
      const firstName = update.message.from?.first_name || 'Valued Customer';
      const cleanCmd = text.split(' ')[0].toLowerCase().replace(/@\w+/g, '');

      const now = new Date();
      const dateStr = now.toLocaleDateString('en-GB', { timeZone: 'Indian/Maldives' }).replace(/\//g, '-');
      const timeStr = now.toLocaleTimeString('en-US', { timeZone: 'Indian/Maldives', hour: '2-digit', minute: '2-digit', hour12: true });

      // 1. /start
      if (cleanCmd === '/start' || cleanCmd === 'start') {
        const parts = text.split(' ');
        const ref = (parts[1] || '').trim();

        if (ref) {
          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ref);
          let query = supabase.from('customers').select('*');
          if (isUuid) {
            query = query.eq('id', ref);
          } else {
            query = query.eq('code', ref);
          }
          const { data: customer } = await query.maybeSingle();

          if (customer) {
            await supabase
              .from('customers')
              .update({ telegram_chat_id: chatId, updated_at: new Date().toISOString() })
              .eq('id', customer.id);

            const name = customer.name_en || customer.name_dv || firstName;
            const balance = Number(customer.outstanding_balance || 0).toFixed(2);
            const limit = Number(customer.credit_limit || 0).toFixed(2);
            const points = Number(customer.loyalty_points || 0).toFixed(0);

            await sendTelegramMessage(
              chatId,
              `✅ *Welcome to B BACK, ${name}!*
━━━━━━━━━━━━━━━━━━━━
Your Telegram account is now linked to customer ID: \`${customer.code}\`.

💰 *Current Due:* MVR ${balance}
💳 *Credit Limit:* MVR ${limit}
⭐ *Loyalty Points:* ${points} pts

━━━━━━━━━━━━━━━━━━━━
You will automatically receive:
• 🧾 Real-time sales receipts
• 💳 Payment settlement confirmations
• 📊 Monthly credit statements

Type */balance* or */account* anytime! 🙏`
            );
            return res.status(200).json({ ok: true });
          }
        }

        // Bare /start
        const { data: existingCustomer } = await supabase
          .from('customers')
          .select('*')
          .eq('telegram_chat_id', chatId)
          .maybeSingle();

        if (existingCustomer) {
          const name = existingCustomer.name_en || existingCustomer.name_dv || firstName;
          await sendTelegramMessage(
            chatId,
            `👋 *Welcome back, ${name}!*
━━━━━━━━━━━━━━━━━━━━
Your Telegram is connected to store code: \`${existingCustomer.code}\`.

Available Commands:
• */balance* - View current credit tab & due amount
• */account* - View linked customer profile details
• */help* - Store hours, contact & bank transfer details`
          );
        } else {
          await sendTelegramMessage(
            chatId,
            `👋 *Welcome to B BACK Store Bot!*
━━━━━━━━━━━━━━━━━━━━
Connect your store account and activate real-time digital receipts:

• Open your customer profile on our shop POS screen
• Scan the personal QR code displayed
• Or ask our cashier for your connection link!

Commands:
• */help* - How to use this bot & store contact details`
          );
        }
      }

      // 2. /balance
      else if (cleanCmd === '/balance' || cleanCmd === 'balance' || cleanCmd === '/statement') {
        const { data: customer } = await supabase
          .from('customers')
          .select('*')
          .eq('telegram_chat_id', chatId)
          .maybeSingle();

        if (customer) {
          const name = customer.name_en || customer.name_dv;
          const balance = Number(customer.outstanding_balance || 0).toFixed(2);
          const limit = Number(customer.credit_limit || 0).toFixed(2);
          const points = Number(customer.loyalty_points || 0).toFixed(0);

          await sendTelegramMessage(
            chatId,
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

_Please send transfer receipt slip to the cashier._`
          );
        } else {
          await sendTelegramMessage(
            chatId,
            `⚠️ Your Telegram is not linked to any store account yet.\n\nPlease ask our cashier to connect your account or scan your QR code on the POS screen.`
          );
        }
      }

      // 3. /account
      else if (cleanCmd === '/account' || cleanCmd === 'account' || cleanCmd === '/profile') {
        const { data: customer } = await supabase
          .from('customers')
          .select('*')
          .eq('telegram_chat_id', chatId)
          .maybeSingle();

        if (customer) {
          const name = customer.name_en || customer.name_dv;
          const balance = Number(customer.outstanding_balance || 0).toFixed(2);
          const limit = Number(customer.credit_limit || 0).toFixed(2);
          const points = Number(customer.loyalty_points || 0).toFixed(0);

          await sendTelegramMessage(
            chatId,
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

_To update your contact details, please inform the cashier at the counter._`
          );
        } else {
          await sendTelegramMessage(
            chatId,
            `⚠️ Your Telegram is not linked to any store account yet.\n\nPlease ask our cashier to connect your account or scan your QR code on the POS screen.`
          );
        }
      }

      // 4. /help
      else if (cleanCmd === '/help' || cleanCmd === 'help') {
        await sendTelegramMessage(
          chatId,
          `🤖 *B BACK Store Bot - Commands & Help*
━━━━━━━━━━━━━━━━━━━━
• */start* - Connect your store account and activate receipts
• */balance* - View your current credit tab and outstanding amount
• */account* - View your linked customer profile details
• */help* - How to use this bot and store contact details

━━━━━━━━━━━━━━━━━━━━
🏪 *Store Contact Details:*
📍 *Shop:* B BACK
📞 *Phone:* +960 9336337
🏦 *BML Account:* \`7730000442060\`
⏰ *Hours:* Sat - Thu: 08:30 - 22:00 | Fri: 14:00 - 22:00

_For assistance, visit our shop or contact the cashier._`
        );
      }
    }

    return res.status(200).json({ ok: true });
  } catch (error: any) {
    console.error('Webhook handler error:', error);
    return res.status(200).json({ ok: true, error: error.message });
  }
}
