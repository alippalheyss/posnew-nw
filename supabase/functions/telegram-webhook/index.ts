// Supabase Edge Function: telegram-webhook
// Deploy with: supabase functions deploy telegram-webhook --no-verify-jwt
// Set secrets with: supabase secrets set TELEGRAM_BOT_TOKEN=8815725998:AAHVMSujW5JM-ND4CJAzPr_Qsj_enXm2cYQ

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN") || "8815725998:AAHVMSujW5JM-ND4CJAzPr_Qsj_enXm2cYQ";

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

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const update = await req.json();

    if (update.message && update.message.text) {
      const text = update.message.text.trim();
      const cmd = text.toLowerCase().trim();
      const chatId = update.message.chat.id;
      const firstName = update.message.from?.first_name || "Valued Customer";

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

      // Case 3: Customer profile enquiry /account
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

      // Case 4: /help
      else if (cmd === "/help" || cmd === "help") {
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
📞 *Phone:* +960 777-1234
🏦 *BML Account:* \`7730000442060\`
⏰ *Hours:* Sat - Thu: 08:30 - 22:00 | Fri: 14:00 - 22:00

_For assistance, visit our shop or contact the cashier._`
        );
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
