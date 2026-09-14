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

// Robust Group Config Storage (using transfer_slips which allows anon RLS, plus settings table)
const getTelegramGroupConfig = async (): Promise<{ chatId: string | number | null; title?: string }> => {
  // 1. Try transfer_slips (100% accessible to anon key)
  try {
    const { data: configRow } = await supabase
      .from('transfer_slips')
      .select('telegram_chat_id, customer_name, caption')
      .eq('file_id', 'group_config')
      .maybeSingle();

    if (configRow?.telegram_chat_id) {
      return {
        chatId: configRow.telegram_chat_id,
        title: configRow.customer_name || 'B BACK',
      };
    }
    if (configRow?.caption) {
      try {
        const parsed = JSON.parse(configRow.caption);
        if (parsed.telegramGroupChatId) {
          return {
            chatId: parsed.telegramGroupChatId,
            title: parsed.telegramGroupTitle || 'B BACK',
          };
        }
      } catch {}
    }
  } catch (e) {
    console.warn('Error reading group from transfer_slips:', e);
  }

  // 2. Try settings table
  try {
    const { data: shopRow } = await supabase.from('settings').select('settings').eq('category', 'shop').maybeSingle();
    if (shopRow?.settings?.telegramGroupChatId) {
      return {
        chatId: shopRow.settings.telegramGroupChatId,
        title: shopRow.settings.telegramGroupTitle || 'B BACK',
      };
    }
  } catch (e) {
    console.warn('Error reading group from settings:', e);
  }

  // 3. Try env var
  if (process.env.TELEGRAM_GROUP_CHAT_ID) {
    return {
      chatId: process.env.TELEGRAM_GROUP_CHAT_ID,
      title: 'B BACK',
    };
  }

  return { chatId: null };
};

const saveTelegramGroupConfig = async (groupChatId: string | number, groupTitle: string) => {
  const numericId = typeof groupChatId === 'number' ? groupChatId : parseInt(String(groupChatId), 10) || 0;

  // 1. Save in transfer_slips (guaranteed to succeed with anon key)
  try {
    const { data: existing } = await supabase
      .from('transfer_slips')
      .select('id')
      .eq('file_id', 'group_config')
      .maybeSingle();

    const payload = {
      telegram_chat_id: numericId,
      customer_name: groupTitle,
      file_id: 'group_config',
      status: 'system_config',
      caption: JSON.stringify({ telegramGroupChatId: groupChatId, telegramGroupTitle: groupTitle }),
      updated_at: new Date().toISOString(),
    };

    if (existing) {
      await supabase.from('transfer_slips').update(payload).eq('id', existing.id);
    } else {
      await supabase.from('transfer_slips').insert(payload);
    }
  } catch (e) {
    console.error('Error saving group in transfer_slips:', e);
  }

  // 2. Also try settings table
  try {
    const { data: shopRow } = await supabase.from('settings').select('settings').eq('category', 'shop').maybeSingle();
    if (shopRow?.settings) {
      await supabase.from('settings').update({
        settings: { ...shopRow.settings, telegramGroupChatId: groupChatId, telegramGroupTitle: groupTitle },
        updated_at: new Date().toISOString(),
      }).eq('category', 'shop');
    }
  } catch (e) {
    console.warn('Error saving group in settings:', e);
  }
};

const forwardSlipToGroup = async (
  groupChatId: string | number,
  fileId: string,
  isDocument: boolean,
  customer: any,
  customerCaption?: string
) => {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB', { timeZone: 'Indian/Maldives' }).replace(/\//g, '-');
  const timeStr = now.toLocaleTimeString('en-US', { timeZone: 'Indian/Maldives', hour: '2-digit', minute: '2-digit', hour12: true });
  const dueStr = Number(customer.outstanding_balance || 0).toFixed(2);
  const custName = customer.name_en || customer.name_dv || 'Customer';
  const custCode = customer.code || 'N/A';
  const custPhone = customer.phone || 'Not provided';
  const cleanNote = (customerCaption || '').trim();

  const groupCaptionMd = 
`📥 *NEW BANK TRANSFER SLIP*
━━━━━━━━━━━━━━━━━━━━
🏪 *Shop:* B BACK
👤 *Customer:* ${custName} (\`${custCode}\`)
📞 *Phone:* ${custPhone}
💰 *Outstanding Tab:* *MVR ${dueStr}*
📅 *Submitted:* ${dateStr} | ${timeStr}
${cleanNote ? `📝 *Customer Note:* _${cleanNote}_\n` : ''}━━━━━━━━━━━━━━━━━━━━
⚡ _Awaiting cashier verification & settlement in POS._`;

  const groupCaptionPlain = 
`📥 NEW BANK TRANSFER SLIP
━━━━━━━━━━━━━━━━━━━━
🏪 Shop: B BACK
👤 Customer: ${custName} (${custCode})
📞 Phone: ${custPhone}
💰 Outstanding Tab: MVR ${dueStr}
📅 Submitted: ${dateStr} | ${timeStr}
${cleanNote ? `📝 Customer Note: ${cleanNote}\n` : ''}━━━━━━━━━━━━━━━━━━━━
⚡ Awaiting cashier verification & settlement in POS.`;

  const endpoint = isDocument ? 'sendDocument' : 'sendPhoto';
  const fieldName = isDocument ? 'document' : 'photo';

  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: groupChatId,
        [fieldName]: fileId,
        caption: groupCaptionMd,
        parse_mode: 'Markdown',
      }),
    });
    const json = await res.json();

    // If Markdown parsing failed (due to special chars), retry immediately in plain text
    if (!json.ok) {
      console.warn('Telegram Markdown forward failed, retrying plain text:', json.description);
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: groupChatId,
          [fieldName]: fileId,
          caption: groupCaptionPlain,
        }),
      });
    }
  } catch (err) {
    console.error('forwardSlipToGroup network error:', err);
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
    const msg = update?.message || update?.channel_post;
    const myChatMember = update?.my_chat_member;

    // A. Detect Group Member Update (when bot is added to group)
    if (myChatMember && (myChatMember.chat?.type === 'group' || myChatMember.chat?.type === 'supergroup')) {
      const groupChatId = myChatMember.chat.id;
      const groupTitle = myChatMember.chat.title || 'B BACK';
      await saveTelegramGroupConfig(groupChatId, groupTitle);

      await sendTelegramMessage(
        groupChatId,
        `✅ *B BACK Store Bot Connected!*\n━━━━━━━━━━━━━━━━━━━━\n📍 *Group:* ${groupTitle}\n🆔 *Chat ID:* \`${groupChatId}\`\n\nAll customer bank transfer slips will now be forwarded directly to this group with customer details! 🚀`
      );
      return res.status(200).json({ ok: true });
    }

    if (msg && msg.chat?.id) {
      const chatId = msg.chat.id;
      const firstName = msg.from?.first_name || 'Valued Customer';

      // B. Handle Group Messages & Auto-detection
      if (msg.chat.type === 'group' || msg.chat.type === 'supergroup') {
        const groupChatId = msg.chat.id;
        const groupTitle = msg.chat.title || 'B BACK';
        const msgText = (msg.text || '').trim().toLowerCase();

        // Always save group ID when message received from group
        await saveTelegramGroupConfig(groupChatId, groupTitle);

        // Check if group received a slip directly posted in the group
        if (msg.photo || msg.document) {
          const senderId = msg.from?.id;
          if (senderId) {
            const { data: customer } = await supabase
              .from('customers')
              .select('*')
              .eq('telegram_chat_id', senderId)
              .maybeSingle();

            if (customer) {
              const photoList = msg.photo;
              const fileId = photoList && photoList.length > 0
                ? photoList[photoList.length - 1].file_id
                : msg.document?.file_id;

              if (fileId) {
                const fileUrl = await getTelegramFileUrl(fileId);
                const caption = (msg.caption || '').trim();
                const amtMatch = caption.match(/(?:mvr|rf|ރ)?\s*([0-9]+(?:\.[0-9]{1,2})?)/i);
                const suggestedAmount = amtMatch ? parseFloat(amtMatch[1]) : null;

                await supabase.from('transfer_slips').insert({
                  customer_id: customer.id,
                  telegram_chat_id: senderId,
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
                await sendTelegramMessage(
                  groupChatId,
                  `👤 *Customer Identified:* ${customer.name_en || customer.name_dv || 'Customer'} (\`${customer.code}\`)\n📞 *Phone:* ${customer.phone || 'N/A'}\n💰 *Current Tab Due:* MVR ${dueStr}\n⚡ *Slip logged in POS for verification.*`
                );
              }
            }
          }
          return res.status(200).json({ ok: true });
        }

        if (msgText.startsWith('/setgroup') || msgText.startsWith('/id') || msgText === 'setgroup') {
          await sendTelegramMessage(
            groupChatId,
            `✅ *B BACK Store Group Linked!*\n━━━━━━━━━━━━━━━━━━━━\n📍 *Group:* ${groupTitle}\n🆔 *Chat ID:* \`${groupChatId}\`\n\nAll customer bank transfer slips will be automatically forwarded to this group in real-time with customer details! 🚀`
          );

          // Auto-forward any recent pending slips that were received
          try {
            const { data: pendingSlips } = await supabase
              .from('transfer_slips')
              .select('*, customers(*)')
              .eq('status', 'pending')
              .neq('file_id', 'group_config')
              .order('created_at', { ascending: false })
              .limit(3);

            if (pendingSlips && pendingSlips.length > 0) {
              for (const slip of pendingSlips) {
                const cust = slip.customers || {
                  name_en: slip.customer_name,
                  code: 'CUST',
                  phone: slip.customer_phone,
                  outstanding_balance: slip.suggested_amount || 0,
                };
                await forwardSlipToGroup(groupChatId, slip.file_id, false, cust, slip.caption);
              }
            }
          } catch (e) {
            console.warn('Error auto-forwarding pending slips:', e);
          }
        }
        return res.status(200).json({ ok: true });
      }

      // 1. Bank Transfer Slip Photo or Document (sent to bot in private chat)
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

            // Forward to B BACK group
            try {
              const { chatId: groupChatId } = await getTelegramGroupConfig();
              if (groupChatId) {
                await forwardSlipToGroup(
                  groupChatId,
                  fileId,
                  Boolean(!photoList || photoList.length === 0),
                  customer,
                  caption
                );
              } else {
                console.warn('Cannot forward slip: no groupChatId found in transfer_slips or settings');
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
