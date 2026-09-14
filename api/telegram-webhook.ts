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

const getTelegramFileUrl = async (fileId: string) => {
  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${encodeURIComponent(fileId)}`);
    const data = await res.json();
    if (data.ok && data.result?.file_path) {
      return `https://api.telegram.org/file/bot${BOT_TOKEN}/${data.result.file_path}`;
    }
  } catch (err) {
    console.warn('Failed to get file path in webhook:', err);
  }
  return null;
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
    const msg = update?.message || update?.channel_post;
    const myChatMember = update?.my_chat_member;

    // A. Detect Group Member Update (when bot is added to B BACK group)
    if (myChatMember && (myChatMember.chat?.type === 'group' || myChatMember.chat?.type === 'supergroup')) {
      const groupChatId = myChatMember.chat.id;
      const groupTitle = myChatMember.chat.title || 'B BACK';
      try {
        const { data: shopRow } = await supabase.from('settings').select('settings').eq('category', 'shop').maybeSingle();
        if (shopRow?.settings) {
          await supabase.from('settings').update({
            settings: { ...shopRow.settings, telegramGroupChatId: groupChatId, telegramGroupTitle: groupTitle },
            updated_at: new Date().toISOString()
          }).eq('category', 'shop');
        }
      } catch (e) {
        console.warn('Error saving groupChatId in webhook:', e);
      }

      await sendTelegramMessage(
        groupChatId,
        `✅ *B BACK Store Bot Connected!*\n━━━━━━━━━━━━━━━━━━━━\n📍 *Group:* ${groupTitle}\n🆔 *Chat ID:* \`${groupChatId}\`\n\nAll customer bank transfer slips will now be forwarded directly to this group with customer details! 🚀`
      );
      return res.status(200).json({ ok: true });
    }

    if (msg && msg.chat?.id) {
      const chatId = msg.chat.id;
      const firstName = msg.from?.first_name || 'Valued Customer';

      // B. Auto-link group when any message or /setgroup is sent in the group
      if (msg.chat.type === 'group' || msg.chat.type === 'supergroup') {
        const groupChatId = msg.chat.id;
        const groupTitle = msg.chat.title || 'B BACK';
        const msgText = (msg.text || '').trim().toLowerCase();

        if (msgText.startsWith('/setgroup') || msgText.startsWith('/start') || msgText.startsWith('/id') || groupTitle.toLowerCase().includes('b back')) {
          try {
            const { data: shopRow } = await supabase.from('settings').select('settings').eq('category', 'shop').maybeSingle();
            if (shopRow?.settings) {
              await supabase.from('settings').update({
                settings: { ...shopRow.settings, telegramGroupChatId: groupChatId, telegramGroupTitle: groupTitle },
                updated_at: new Date().toISOString()
              }).eq('category', 'shop');
            }
          } catch (e) {
            console.warn('Error saving groupChatId:', e);
          }

          if (msgText.startsWith('/setgroup') || msgText.startsWith('/id')) {
            await sendTelegramMessage(
              groupChatId,
              `✅ *B BACK Store Group Linked!*\n━━━━━━━━━━━━━━━━━━━━\n📍 *Group:* ${groupTitle}\n🆔 *Chat ID:* \`${groupChatId}\`\n\nAll customer bank transfer slips will be automatically forwarded to this group in real-time with customer details! 🚀`
            );
          }
        }
        return res.status(200).json({ ok: true });
      }

      // 1. Bank Transfer Slip Photo or Document
      if (msg.photo || msg.document) {
        const photoList = msg.photo;
        const fileId = photoList && photoList.length > 0
          ? photoList[photoList.length - 1].file_id
          : msg.document?.file_id;

        if (fileId) {
          const { data: customer } = await supabase
            .from('customers')
            .select('*')
            .eq('telegram_chat_id', chatId)
            .maybeSingle();

          if (!customer) {
            await sendTelegramMessage(
              chatId,
              `⚠️ *Your Telegram is not linked yet.*\n\nPlease ask our cashier to connect your account or scan your QR code on the POS screen before sending transfer slips.`
            );
          } else {
            const fileUrl = await getTelegramFileUrl(fileId);
            const caption = (msg.caption || '').trim();
            const amtMatch = caption.match(/(?:mvr|rf|ރ)?\s*([0-9]+(?:\.[0-9]{1,2})?)/i);
            const suggestedAmount = amtMatch ? parseFloat(amtMatch[1]) : null;

            await supabase.from('transfer_slips').insert({
              customer_id: customer.id,
              telegram_chat_id: chatId,
              customer_name: customer.name_en || customer.name_dv || firstName,
              customer_phone: customer.phone,
              file_id: fileId,
              file_url: fileUrl,
              caption: caption || null,
              suggested_amount: suggestedAmount,
              status: 'pending',
              created_at: new Date().toISOString(),
            });

            const dueStr = Number(customer.outstanding_balance || 0).toFixed(2);
            const ackMsg = 
`📥 *Bank Transfer Slip Received!*
━━━━━━━━━━━━━━━━━━━━
🏪 *B BACK*
👤 *Customer:* ${customer.name_en || customer.name_dv || firstName}
📊 *Current Tab Due:* *MVR ${dueStr}*
${caption ? `📝 *Note:* _${caption}_\n` : ''}
━━━━━━━━━━━━━━━━━━━━
✅ Your slip has been submitted to our cashier for verification.
Once verified in our bank account, your balance will be settled and you'll receive your official receipt here!

_Thank you!_ 🙏`;

            await sendTelegramMessage(chatId, ackMsg);

            // Forward to B BACK group if groupChatId is configured
            try {
              const { data: shopRow } = await supabase.from('settings').select('settings').eq('category', 'shop').maybeSingle();
              const groupChatId = shopRow?.settings?.telegramGroupChatId || process.env.TELEGRAM_GROUP_CHAT_ID;

              if (groupChatId) {
                const now = new Date();
                const dateStr = now.toLocaleDateString('en-GB', { timeZone: 'Indian/Maldives' }).replace(/\//g, '-');
                const timeStr = now.toLocaleTimeString('en-US', { timeZone: 'Indian/Maldives', hour: '2-digit', minute: '2-digit', hour12: true });

                const groupCaption = 
`📥 *NEW BANK TRANSFER SLIP RECEIVED*
━━━━━━━━━━━━━━━━━━━━
🏪 *Shop:* B BACK
👤 *Customer:* ${customer.name_en || customer.name_dv || firstName} (\`${customer.code}\`)
📞 *Phone:* ${customer.phone || 'Not provided'}
💰 *Outstanding Tab:* *MVR ${dueStr}*
📅 *Submitted:* ${dateStr} | ${timeStr}
${caption ? `📝 *Customer Note:* _${caption}_\n` : ''}━━━━━━━━━━━━━━━━━━━━
⚡ _Awaiting cashier verification & settlement in POS._`;

                const endpoint = photoList && photoList.length > 0 ? 'sendPhoto' : 'sendDocument';
                const fieldName = photoList && photoList.length > 0 ? 'photo' : 'document';

                await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${endpoint}`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    chat_id: groupChatId,
                    [fieldName]: fileId,
                    caption: groupCaption,
                    parse_mode: 'Markdown',
                  }),
                });
              }
            } catch (fwdErr) {
              console.warn('Error forwarding slip to group:', fwdErr);
            }
          }
        }
        return res.status(200).json({ ok: true });
      }

      // 2. Text Commands
      if (msg.text) {
        const text = String(msg.text).trim();
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

      // 3. /transfer
      else if (cleanCmd === '/transfer' || cleanCmd === 'transfer' || cleanCmd === '/slip' || cleanCmd === 'slip') {
        const { data: customer } = await supabase
          .from('customers')
          .select('*')
          .eq('telegram_chat_id', chatId)
          .maybeSingle();

        const name = customer ? (customer.name_en || customer.name_dv || firstName) : undefined;
        const balance = customer ? Number(customer.outstanding_balance || 0).toFixed(2) : undefined;

        let msg = `💳 *B BACK - Bank Transfer Payment*\n`;
        msg += `━━━━━━━━━━━━━━━━━━━━\n`;
        if (customer) {
          msg += `👤 *Customer:* ${name} (\`${customer.code}\`)\n`;
          msg += `💰 *Current Tab Due:* *MVR ${balance}*\n`;
          msg += `━━━━━━━━━━━━━━━━━━━━\n`;
        }
        msg += `🏪 *Transfer to Our BML Account:*\n`;
        msg += `• *Bank:* Bank of Maldives (BML)\n`;
        msg += `• *Account Name:* B BACK\n`;
        msg += `• *Account Number:* \`7730000442060\`\n`;
        msg += `━━━━━━━━━━━━━━━━━━━━\n`;
        msg += `📸 *Please Send Your Slip:*\n`;
        msg += `1. Complete the transfer on your BML app.\n`;
        msg += `2. Take a screenshot or save the payment slip.\n`;
        msg += `3. *Attach and send the slip photo directly in this chat!* 📎\n\n`;
        msg += `_Our cashier will verify the transfer in our bank account and settle your tab immediately._ 🙏`;

        await sendTelegramMessage(chatId, msg);
      }

      // 4. /account
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

      // 5. /help
      else if (cleanCmd === '/help' || cleanCmd === 'help') {
        await sendTelegramMessage(
          chatId,
          `🤖 *B BACK Store Bot - Commands & Help*
━━━━━━━━━━━━━━━━━━━━
• */start* - Connect your store account and activate receipts
• */balance* - View your current credit tab and outstanding amount
• */transfer* - Send bank transfer slip
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
