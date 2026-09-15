// @ts-nocheck
// Supabase Edge Function: telegram-webhook
// Deploy with: supabase functions deploy telegram-webhook --no-verify-jwt
// Set secrets with: supabase secrets set TELEGRAM_BOT_TOKEN=8815725998:AAHVMSujW5JM-ND4CJAzPr_Qsj_enXm2cYQ

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN") || "8815725998:AAHVMSujW5JM-ND4CJAzPr_Qsj_enXm2cYQ";
const BOT_TOKEN = botToken;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function sendTelegramMessage(chatId: number | string, text: string) {
  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        parse_mode: "Markdown",
        text: text,
      }),
    });
  } catch (err) {
    console.error("Failed to send telegram message:", err);
  }
}

async function getTelegramFileUrl(fileId: string): Promise<string | null> {
  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${encodeURIComponent(fileId)}`);
    const data = await res.json();
    if (data.ok && data.result?.file_path) {
      return `https://api.telegram.org/file/bot${BOT_TOKEN}/${data.result.file_path}`;
    }
  } catch (err) {
    console.warn("Failed to get file path in edge function:", err);
  }
  return null;
}
// Robust Group Config Storage (using transfer_slips which allows anon RLS, plus settings table)
const getTelegramGroupConfig = async (): Promise<{ chatId: string | number | null; title?: string }> => {
  // 1. Try transfer_slips (accessible to anon and service keys)
  try {
    const { data: configRow } = await supabase
      .from("transfer_slips")
      .select("telegram_chat_id, customer_name, caption")
      .eq("file_id", "group_config")
      .maybeSingle();

    if (configRow?.telegram_chat_id) {
      return {
        chatId: configRow.telegram_chat_id,
        title: configRow.customer_name || "B BACK",
      };
    }
    if (configRow?.caption) {
      try {
        const parsed = JSON.parse(configRow.caption);
        if (parsed.telegramGroupChatId) {
          return {
            chatId: parsed.telegramGroupChatId,
            title: parsed.telegramGroupTitle || "B BACK",
          };
        }
      } catch {}
    }
  } catch (e) {
    console.warn("Error reading group from transfer_slips:", e);
  }

  // 2. Try settings table
  try {
    const { data: shopRow } = await supabase.from("settings").select("settings").eq("category", "shop").maybeSingle();
    if (shopRow?.settings?.telegramGroupChatId) {
      return {
        chatId: shopRow.settings.telegramGroupChatId,
        title: shopRow.settings.telegramGroupTitle || "B BACK",
      };
    }
  } catch (e) {
    console.warn("Error reading group from settings:", e);
  }

  // 3. Try env var
  const envChatId = Deno.env.get("TELEGRAM_GROUP_CHAT_ID");
  if (envChatId) {
    return {
      chatId: envChatId,
      title: "B BACK",
    };
  }

  return { chatId: null };
};

const saveTelegramGroupConfig = async (groupChatId: string | number, groupTitle: string) => {
  const numericId = typeof groupChatId === "number" ? groupChatId : parseInt(String(groupChatId), 10) || 0;

  // 1. Save in transfer_slips
  try {
    const { data: existing } = await supabase
      .from("transfer_slips")
      .select("id")
      .eq("file_id", "group_config")
      .maybeSingle();

    const payload = {
      telegram_chat_id: numericId,
      customer_name: groupTitle,
      file_id: "group_config",
      status: "system_config",
      caption: JSON.stringify({ telegramGroupChatId: groupChatId, telegramGroupTitle: groupTitle }),
      updated_at: new Date().toISOString(),
    };

    if (existing) {
      await supabase.from("transfer_slips").update(payload).eq("id", existing.id);
    } else {
      await supabase.from("transfer_slips").insert(payload);
    }
  } catch (e) {
    console.error("Error saving group in transfer_slips:", e);
  }

  // 2. Also try settings table
  try {
    const { data: shopRow } = await supabase.from("settings").select("settings").eq("category", "shop").maybeSingle();
    if (shopRow?.settings) {
      await supabase.from("settings").update({
        settings: { ...shopRow.settings, telegramGroupChatId: groupChatId, telegramGroupTitle: groupTitle },
        updated_at: new Date().toISOString(),
      }).eq("category", "shop");
    }
  } catch (e) {
    console.warn("Error saving group in settings:", e);
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
  const dateStr = now.toLocaleDateString("en-GB", { timeZone: "Indian/Maldives" }).replace(/\//g, "-");
  const timeStr = now.toLocaleTimeString("en-US", { timeZone: "Indian/Maldives", hour: "2-digit", minute: "2-digit", hour12: true });
  const dueStr = Number(customer.outstanding_balance || 0).toFixed(2);
  const custName = customer.name_en || customer.name_dv || "Customer";
  const custCode = customer.code || "N/A";
  const custPhone = customer.phone || "Not provided";
  const cleanNote = (customerCaption || "").trim();

  const groupCaptionMd = 
`📥 *NEW BANK TRANSFER SLIP*
━━━━━━━━━━━━━━━━━━━━
🏪 *Shop:* B BACK
👤 *Customer:* ${custName} (\`${custCode}\`)
📞 *Phone:* ${custPhone}
💰 *Outstanding Tab:* *MVR ${dueStr}*
📅 *Submitted:* ${dateStr} | ${timeStr}
${cleanNote ? `📝 *Customer Note:* _${cleanNote}_\n` : "" }━━━━━━━━━━━━━━━━━━━━
⚡ _Awaiting cashier verification & settlement in POS._`;

  const groupCaptionPlain = 
`📥 NEW BANK TRANSFER SLIP
━━━━━━━━━━━━━━━━━━━━
🏪 Shop: B BACK
👤 Customer: ${custName} (${custCode})
📞 Phone: ${custPhone}
💰 Outstanding Tab: MVR ${dueStr}
📅 Submitted: ${dateStr} | ${timeStr}
${cleanNote ? `📝 Customer Note: ${cleanNote}\n` : "" }━━━━━━━━━━━━━━━━━━━━
⚡ Awaiting cashier verification & settlement in POS.`;

  const endpoint = isDocument ? "sendDocument" : "sendPhoto";
  const fieldName = isDocument ? "document" : "photo";

  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: groupChatId,
        [fieldName]: fileId,
        caption: groupCaptionMd,
        parse_mode: "Markdown",
      }),
    });
    const json = await res.json();

    if (!json.ok) {
      console.warn("Telegram Markdown forward failed, retrying plain text:", json.description);
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: groupChatId,
          [fieldName]: fileId,
          caption: groupCaptionPlain,
        }),
      });
    }
  } catch (err) {
    console.error("forwardSlipToGroup network error:", err);
async function answerCallbackQuery(callbackQueryId: string, text?: string) {
  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text: text,
      }),
    });
  } catch (err) {
    console.warn("Failed to answer callback query:", err);
  }
}

async function getOwnerChatId(): Promise<string | number | null> {
  try {
    const { data: shopRow } = await supabase.from("settings").select("settings").eq("category", "shop").maybeSingle();
    if (shopRow?.settings?.ownerTelegramChatId) return shopRow.settings.ownerTelegramChatId;
    if (shopRow?.settings?.ownerChatId) return shopRow.settings.ownerChatId;
  } catch {}

  const envOwner = Deno.env.get("TELEGRAM_OWNER_CHAT_ID");
  if (envOwner) return envOwner;

  const groupConfig = await getTelegramGroupConfig();
  return groupConfig.chatId;
}

async function generateExecutiveBriefingMessage(targetDateIso?: string): Promise<string> {
  const now = targetDateIso ? new Date(targetDateIso) : new Date();
  const dateStr = now.toLocaleDateString("en-GB", { timeZone: "Indian/Maldives" }).replace(/\//g, "-");
  const timeStr = now.toLocaleTimeString("en-US", { timeZone: "Indian/Maldives", hour: "2-digit", minute: "2-digit", hour12: true });

  let shopName = "B BACK";
  try {
    const { data: shopRow } = await supabase.from("settings").select("settings").eq("category", "shop").maybeSingle();
    if (shopRow?.settings?.shopName) {
      shopName = shopRow.settings.shopName;
    }
  } catch {}

  // Current date formatted as YYYY-MM-DD in Indian/Maldives timezone
  const yyyy = now.toLocaleDateString("en-CA", { timeZone: "Indian/Maldives" });

  const { data: salesData } = await supabase
    .from("sales")
    .select("*")
    .gte("date", `${yyyy}T00:00:00`)
    .lte("date", `${yyyy}T23:59:59.999Z`);

  let totalSales = 0;
  let cashSales = 0;
  let transferSales = 0;
  let creditSales = 0;
  const itemMap = new Map<string, { name: string; qty: number; unit?: string }>();

  if (salesData) {
    salesData.forEach((s: any) => {
      const grandTotal = Number(s.grand_total || 0);
      totalSales += grandTotal;
      const method = String(s.payment_method || "cash").toLowerCase();

      if (method === "cash") {
        cashSales += grandTotal;
      } else if (method === "credit") {
        creditSales += grandTotal;
      } else if (method === "transfer" || method === "card" || method === "bml") {
        transferSales += grandTotal;
      } else if (method === "split" && s.split_details) {
        let details = s.split_details;
        if (typeof details === "string") {
          try { details = JSON.parse(details); } catch {}
        }
        if (Array.isArray(details)) {
          details.forEach((d: any) => {
            const dMethod = String(d.method || "").toLowerCase();
            const dAmount = Number(d.amount || 0);
            if (dMethod === "cash") cashSales += dAmount;
            else if (dMethod === "credit") creditSales += dAmount;
            else if (dMethod === "transfer" || dMethod === "card" || dMethod === "bml") transferSales += dAmount;
          });
        }
      }

      let items = s.items;
      if (typeof items === "string") {
        try { items = JSON.parse(items); } catch {}
      }
      if (Array.isArray(items)) {
        items.forEach((item: any) => {
          const name = (item.name_en || item.name_dv || "Item").trim();
          const qty = Number(item.qty || 0);
          const unit = item.selected_unit || "";
          const existing = itemMap.get(name);
          if (existing) {
            existing.qty += qty;
          } else {
            itemMap.set(name, { name, qty, unit });
          }
        });
      }
    });
  }

  const topItems = Array.from(itemMap.values())
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  let creditCollections = 0;
  try {
    const { data: settlementsData } = await supabase
      .from("settlements")
      .select("amount_paid, date, created_at")
      .or(`date.gte.${yyyy}T00:00:00,created_at.gte.${yyyy}T00:00:00`);

    if (settlementsData) {
      creditCollections = settlementsData.reduce((sum: number, st: any) => sum + Number(st.amount_paid || 0), 0);
    }
  } catch (e) {
    console.warn("Error querying settlements:", e);
  }

  const totalTx = salesData ? salesData.length : 0;
  const avgTx = totalTx > 0 ? totalSales / totalTx : 0;
  const formatMvr = (n: number) => `MVR ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  let msg = `📊 *STORE CLOSE EXECUTIVE BRIEFING*\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `🏪 *Shop:* ${shopName}\n`;
  msg += `📅 *Date:* ${dateStr} | ${timeStr}\n\n`;

  msg += `💰 *Total Sales:* *${formatMvr(totalSales)}*\n`;
  msg += `(💵 Cash: ${formatMvr(cashSales)} | 💳 BML/Transfer: ${formatMvr(transferSales)} | 📝 Credit: ${formatMvr(creditSales)})\n\n`;

  msg += `🧾 *Credit Collections:* *${formatMvr(creditCollections)}* settled today\n\n`;

  msg += `🏆 *Top Selling Items:*\n`;
  if (topItems.length === 0) {
    msg += `_No items recorded today_\n`;
  } else {
    topItems.forEach((it, idx) => {
      const unitLabel = it.unit && it.unit !== "Piece" ? ` ${it.unit}` : " pcs";
      msg += `${idx + 1}. *${it.name}* (${it.qty}${unitLabel})\n`;
    });
  }

  msg += `\n📈 *Store Performance:*\n`;
  msg += `• Receipts Issued: *${totalTx} transactions*\n`;
  msg += `• Average Ticket: *${formatMvr(avgTx)}*\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `🌙 _Have a restful night! Store close automated report._`;

  return msg;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const bodyText = await req.text();
    let update: any = {};
    try {
      update = JSON.parse(bodyText);
    } catch {}

    // Direct API Invocation (Cron or POS trigger: action = "nightly_briefing")
    if (update?.action === "nightly_briefing" || update?.action === "send_briefing") {
      const ownerChatId = update.chat_id || update.chatId || (await getOwnerChatId());
      if (ownerChatId) {
        const briefingMsg = await generateExecutiveBriefingMessage(update.date);
        await sendTelegramMessage(ownerChatId, briefingMsg);
        return new Response(JSON.stringify({ ok: true, sent_to: ownerChatId }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ ok: false, error: "No owner chat ID configured" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Handle inline button callback queries ([ 📤 Send Transfer Slip ])
    if (update?.callback_query) {
      const cb = update.callback_query;
      const cbChatId = cb.message?.chat?.id || cb.from?.id;
      const data = cb.data;

      if (data === "cmd_transfer" || data === "send_slip") {
        await answerCallbackQuery(cb.id, "Please attach your transfer slip photo! 📎");
        const promptMsg = 
`📸 *Upload Your Bank Transfer Slip*
━━━━━━━━━━━━━━━━━━━━
🏪 *B BACK*
🏦 *Bank:* Bank of Maldives (BML)
💳 *Account:* \`7730000442060\`

Please attach and send your transfer receipt/screenshot photo directly in this chat! 📎

Our cashier will immediately verify the transaction and credit it to your account. 🙏`;
        await sendTelegramMessage(cbChatId, promptMsg);
      }
      return new Response(JSON.stringify({ ok: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }
    const msg = update?.message || update?.channel_post;
    const myChatMember = update?.my_chat_member;

    // A. Detect Group Member Update (when bot is added to group)
    if (myChatMember && (myChatMember.chat?.type === "group" || myChatMember.chat?.type === "supergroup")) {
      const groupChatId = myChatMember.chat.id;
      const groupTitle = myChatMember.chat.title || "B BACK";
      await saveTelegramGroupConfig(groupChatId, groupTitle);

      await sendTelegramMessage(
        groupChatId,
        `✅ *B BACK Store Bot Connected!*\n━━━━━━━━━━━━━━━━━━━━\n📍 *Group:* ${groupTitle}\n🆔 *Chat ID:* \`${groupChatId}\`\n\nAll customer bank transfer slips will now be forwarded directly to this group with customer details! 🚀`
      );
      return new Response(JSON.stringify({ ok: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (msg && msg.chat?.id) {
      const chatId = msg.chat.id;
      const firstName = msg.from?.first_name || "Valued Customer";

      // B. Handle Group Messages & Auto-detection
      if (msg.chat.type === "group" || msg.chat.type === "supergroup") {
        const groupChatId = msg.chat.id;
        const groupTitle = msg.chat.title || "B BACK";
        const msgText = (msg.text || "").trim().toLowerCase();

        await saveTelegramGroupConfig(groupChatId, groupTitle);

        // Check if slip was posted directly in group
        if (msg.photo || msg.document) {
          const senderId = msg.from?.id;
          if (senderId) {
            const { data: customer } = await supabase
              .from("customers")
              .select("*")
              .eq("telegram_chat_id", senderId)
              .maybeSingle();

            if (customer) {
              const photoList = msg.photo;
              const fileId = photoList && photoList.length > 0
                ? photoList[photoList.length - 1].file_id
                : msg.document?.file_id;

              if (fileId) {
                const fileUrl = await getTelegramFileUrl(fileId);
                const caption = (msg.caption || "").trim();
                const amtMatch = caption.match(/(?:mvr|rf|ރ)?\s*([0-9]+(?:\.[0-9]{1,2})?)/i);
                const suggestedAmount = amtMatch ? parseFloat(amtMatch[1]) : null;

                await supabase.from("transfer_slips").insert({
                  customer_id: customer.id,
                  telegram_chat_id: senderId,
                  customer_name: customer.name_en || customer.name_dv || firstName,
                  customer_phone: customer.phone,
                  file_id: fileId,
                  file_url: fileUrl,
                  caption: caption || null,
                  suggested_amount: suggestedAmount,
                  status: "pending",
                  created_at: new Date().toISOString(),
                });

                const dueStr = Number(customer.outstanding_balance || 0).toFixed(2);
                await sendTelegramMessage(
                  groupChatId,
                  `👤 *Customer Identified:* ${customer.name_en || customer.name_dv || "Customer"} (\`${customer.code}\`)\n📞 *Phone:* ${customer.phone || "N/A"}\n💰 *Current Tab Due:* MVR ${dueStr}\n⚡ *Slip logged in POS for verification.*`
                );
              }
            }
          }
          return new Response(JSON.stringify({ ok: true }), {
            headers: { "Content-Type": "application/json" },
          });
        }

        if (msgText.startsWith("/setgroup") || msgText.startsWith("/id") || msgText === "setgroup") {
          await sendTelegramMessage(
            groupChatId,
            `✅ *B BACK Store Group Linked!*\n━━━━━━━━━━━━━━━━━━━━\n📍 *Group:* ${groupTitle}\n🆔 *Chat ID:* \`${groupChatId}\`\n\nAll customer bank transfer slips will be automatically forwarded to this group in real-time with customer details! 🚀`
          );

          // Auto-forward recent pending slips
          try {
            const { data: pendingSlips } = await supabase
              .from("transfer_slips")
              .select("*, customers(*)")
              .eq("status", "pending")
              .neq("file_id", "group_config")
              .order("created_at", { ascending: false })
              .limit(3);

            if (pendingSlips && pendingSlips.length > 0) {
              for (const slip of pendingSlips) {
                const cust = slip.customers || {
                  name_en: slip.customer_name,
                  code: "CUST",
                  phone: slip.customer_phone,
                  outstanding_balance: slip.suggested_amount || 0,
                };
                await forwardSlipToGroup(groupChatId, slip.file_id, false, cust, slip.caption);
              }
            }
          } catch (e) {
            console.warn("Error auto-forwarding pending slips:", e);
          }
        }
        return new Response(JSON.stringify({ ok: true }), {
          headers: { "Content-Type": "application/json" },
        });
      }

      // Case A: Transfer Slip Photo or Document (sent to bot in private chat)
      if (msg.photo || msg.document) {
        const photoList = msg.photo;
        const fileId = photoList && photoList.length > 0
          ? photoList[photoList.length - 1].file_id
          : msg.document?.file_id;

        if (fileId) {
          const { data: customer } = await supabase
            .from("customers")
            .select("*")
            .eq("telegram_chat_id", chatId)
            .maybeSingle();

          if (!customer) {
            await sendTelegramMessage(
              chatId,
              `⚠️ *Your Telegram is not linked yet.*\n\nPlease ask our cashier to connect your account or scan your QR code on the POS screen before sending transfer slips.`
            );
          } else {
            const fileUrl = await getTelegramFileUrl(fileId);
            const caption = (msg.caption || "").trim();
            const amtMatch = caption.match(/(?:mvr|rf|ރ)?\s*([0-9]+(?:\.[0-9]{1,2})?)/i);
            const suggestedAmount = amtMatch ? parseFloat(amtMatch[1]) : null;

            await supabase.from("transfer_slips").insert({
              customer_id: customer.id,
              telegram_chat_id: chatId,
              customer_name: customer.name_en || customer.name_dv || firstName,
              customer_phone: customer.phone,
              file_id: fileId,
              file_url: fileUrl,
              caption: caption || null,
              suggested_amount: suggestedAmount,
              status: "pending",
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
                console.warn("Cannot forward slip: no groupChatId found in transfer_slips or settings");
              }
            } catch (fwdErr) {
              console.warn("Error forwarding slip to group:", fwdErr);
            }
          }
        }
        return new Response(JSON.stringify({ ok: true }), {
          headers: { "Content-Type": "application/json" },
        });
      }

      // Case B: Text Commands
      if (msg.text) {
        const text = msg.text.trim();
        const cmd = text.toLowerCase().trim();

        // Case 1: Deep link activation /start <CUSTOMER_ID_OR_CODE>
        if (cmd.startsWith("/start") || cmd.startsWith("start")) {
        const parts = text.split(" ");
        const customerRef = parts[1]?.trim();

        if (customerRef) {
          // Look up customer by ID first, then by code
          let query = supabase.from("customers").select("*");
          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(customerRef);

          if (isUuid) {
            query = query.eq("id", customerRef);
          } else {
            query = query.eq("code", customerRef);
          }

          const { data: customer, error: fetchErr } = await query.maybeSingle();

          if (!fetchErr && customer) {
            // Update customer record with telegram_chat_id
            await supabase
              .from("customers")
              .update({ telegram_chat_id: chatId })
              .eq("id", customer.id);

            const custName = customer.name_en || customer.name_dv || firstName;
            const balance = Number(customer.outstanding_balance || 0).toFixed(2);
            const limit = Number(customer.credit_limit || 0).toFixed(2);

            const welcomeMsg = 
`✅ *Welcome to B BACK, ${custName}!*
━━━━━━━━━━━━━━━━━━━━
Your Telegram account is now successfully linked to customer ID: \`${customer.code}\`.

💰 *Current Tab Balance:* MVR ${balance}
💳 *Credit Limit:* MVR ${limit}
⭐ *Loyalty Points:* ${(customer.loyalty_points || 0).toFixed(0)} pts

━━━━━━━━━━━━━━━━━━━━
You will automatically receive:
• 🧾 Real-time payment receipts
• 🛍️ Purchase notifications
• 📊 Tab balance updates

Type */balance* anytime to view your outstanding statement.
Thank you for shopping with us! 🙏`;

            await sendTelegramMessage(chatId, welcomeMsg);
          } else {
            await sendTelegramMessage(
              chatId,
              `⚠️ We couldn't find an account matching code \`${customerRef}\`. Please contact our shop cashier to get your valid connection link.`
            );
          }
        } else {
          // Regular /start with no parameters
          // Check if already linked
          const { data: existingCustomer } = await supabase
            .from("customers")
            .select("*")
            .eq("telegram_chat_id", chatId)
            .maybeSingle();

          if (existingCustomer) {
            await sendTelegramMessage(
              chatId,
              `👋 *Hello, ${existingCustomer.name_en || existingCustomer.name_dv}!*

Your account is linked (Code: \`${existingCustomer.code}\`).
Type */balance* to check your current tab balance.`
            );
          } else {
            await sendTelegramMessage(
              chatId,
              `👋 *Welcome to B BACK Store Bot!*

To link your store account and receive digital receipts, please scan the QR code displayed on our shop POS screen or ask our cashier for your personal link.`
            );
          }
        }
      }

      // Case 2: Balance enquiry /balance or /statement
      else if (cmd === "/balance" || cmd === "balance" || cmd === "/statement") {
        const { data: customer } = await supabase
          .from("customers")
          .select("*")
          .eq("telegram_chat_id", chatId)
          .maybeSingle();

        if (customer) {
          const balance = Number(customer.outstanding_balance || 0).toFixed(2);
          const limit = Number(customer.credit_limit || 0).toFixed(2);
          const now = new Date();
          const dateStr = now.toLocaleDateString('en-GB', { timeZone: 'Indian/Maldives' }).replace(/\//g, '-');
          const timeStr = now.toLocaleTimeString('en-US', { timeZone: 'Indian/Maldives', hour: '2-digit', minute: '2-digit', hour12: true });

          const statementMsg = 
`📋 *B BACK - Credit Statement*
━━━━━━━━━━━━━━━━━━━━
👤 *Customer:* ${customer.name_en || customer.name_dv} (\`${customer.code}\`)
📅 *Date:* ${dateStr} | ${timeStr}
💰 *Current Due:* MVR ${balance}
💳 *Credit Limit:* MVR ${limit}
⭐ *Loyalty Points:* ${(customer.loyalty_points || 0).toFixed(0)} pts

━━━━━━━━━━━━━━━━━━━━
🏦 *Bank Transfer Payment:*
Bank of Maldives (BML)
Account: \`7730000442060\` (B BACK)

_Please send transfer slip to cashier after payment._`;

          await sendTelegramMessage(chatId, statementMsg);
        } else {
          await sendTelegramMessage(
            chatId,
            `⚠️ Your Telegram is not linked to any store account yet.\n\nPlease ask our cashier to connect your account or scan the QR code on the POS screen.`
          );
        }
      }

      // Case 3: Transfer slip submission /transfer or /slip
      else if (cmd === "/transfer" || cmd === "transfer" || cmd === "/slip" || cmd === "slip") {
        const { data: customer } = await supabase
          .from("customers")
          .select("*")
          .eq("telegram_chat_id", chatId)
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

      // Case 4: Customer profile enquiry /account
      else if (cmd === "/account" || cmd === "account") {
        const { data: customer } = await supabase
          .from("customers")
          .select("*")
          .eq("telegram_chat_id", chatId)
          .maybeSingle();

        if (customer) {
          const balance = Number(customer.outstanding_balance || 0).toFixed(2);
          const limit = Number(customer.credit_limit || 0).toFixed(2);

          const accountMsg = 
`👤 *B BACK - Linked Account Profile*
━━━━━━━━━━━━━━━━━━━━
• *Name:* ${customer.name_en || customer.name_dv}
• *Customer Code:* \`${customer.code}\`
• *Phone:* ${customer.phone || "Not provided"}
• *Email:* ${customer.email || "Not provided"}
• *Status:* Active ✅
• *Credit Limit:* MVR ${limit}
• *Outstanding Due:* MVR ${balance}
• *Loyalty Points:* ${(customer.loyalty_points || 0).toFixed(0)} pts

_Need to update your contact info? Please notify the cashier at the counter._`;

          await sendTelegramMessage(chatId, accountMsg);
        } else {
          await sendTelegramMessage(
            chatId,
            `⚠️ Your Telegram is not linked to any store account yet.\n\nPlease ask our cashier to connect your account or scan your QR code on the POS screen.`
          );
        }
      }

      // Case 5: /help
      else if (cmd === "/help" || cmd === "help") {
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

      // Case 6: Executive Briefing (/briefing, /close, /today, /summary)
      else if (cmd === "/briefing" || cmd === "briefing" || cmd === "/close" || cmd === "close" || cmd === "/today" || cmd === "/summary") {
        const briefingMsg = await generateExecutiveBriefingMessage();
        await sendTelegramMessage(chatId, briefingMsg);
      }

      // Case 7: Owner registration (/setowner)
      else if (cmd === "/setowner" || cmd === "setowner") {
        try {
          const { data: shopRow } = await supabase.from("settings").select("settings").eq("category", "shop").maybeSingle();
          if (shopRow?.settings) {
            await supabase.from("settings").update({
              settings: { ...shopRow.settings, ownerTelegramChatId: chatId },
              updated_at: new Date().toISOString(),
            }).eq("category", "shop");
          }
        } catch {}

        await sendTelegramMessage(
          chatId,
          `✅ *Owner Telegram Account Connected!*\n━━━━━━━━━━━━━━━━━━━━\n🆔 *Your Chat ID:* \`${chatId}\`\n\nYou will now receive the Nightly Store Close Executive Briefing here at midnight! 📊\n\nType */briefing* anytime to request an instant sales summary.`
        );
      }
    }
  }

  return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err: any) {
    console.error("Webhook processing error:", err);
    return new Response(JSON.stringify({ error: err?.message || "Unknown error" }), {
      headers: { "Content-Type": "application/json" },
      status: 200, // Always return 200 to Telegram
    });
  }
});
