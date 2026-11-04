export interface BankNotification {
  id: string;
  title: string;
  body: string;
  amount: number | null;
  currency: string;
  senderOrRef: string | null;
  bankName: string;
  receivedAt: string;
  status: 'unclaimed' | 'verified' | 'dismissed';
  matchedSaleId?: string | null;
  matchedCustomerName?: string | null;
  verifiedAt?: string | null;
}

/**
 * Strips unresolved MacroDroid / Tasker magic text placeholders (e.g. "{not_text}", "{not_big_text}", "%evtprm3")
 */
function cleanMacroPlaceholders(str: string): string {
  return str
    .replace(/\{(?:not_text|notification|not_big_text|not_sub_text|not_ticker|not_title|time_ms)\}/gi, '')
    .replace(/%(?:evtprm\d+|notification_text|notification_title|TIMEMS)/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Parses bank mobile app push notification text (e.g. BML Mobile, MIB, Favara)
 * to extract the transferred amount, currency, sender/reference, and bank name.
 */
export function parseBankNotificationPayload(payload: {
  id?: string;
  title?: string;
  body?: string;
  big_text?: string;
  sub_text?: string;
  ticker?: string;
  text?: string;
  message?: string;
  timestamp?: string | number;
  app?: string;
}): BankNotification {
  const cleanedTitle = cleanMacroPlaceholders(String(payload.title || payload.app || ''));
  const rawTitle = cleanedTitle || 'Bank Notification';

  // Combine standard notification text + expanded big_text + sub_text (deduplicated)
  const parts = [
    cleanMacroPlaceholders(String(payload.body || payload.text || payload.message || '')),
    cleanMacroPlaceholders(String(payload.big_text || '')),
    cleanMacroPlaceholders(String(payload.sub_text || '')),
    cleanMacroPlaceholders(String(payload.ticker || '')),
  ].filter(Boolean);

  // Pick the most detailed non-duplicate body string
  const uniqueParts: string[] = [];
  for (const p of parts) {
    if (!uniqueParts.some((existing) => existing.includes(p))) {
      // If this new part contains an existing shorter part, replace the shorter part
      const shorterIdx = uniqueParts.findIndex((existing) => p.includes(existing));
      if (shorterIdx !== -1) {
        uniqueParts[shorterIdx] = p;
      } else {
        uniqueParts.push(p);
      }
    }
  }

  const rawBody = uniqueParts.join(' — ') || rawTitle;
  const combined = `${rawTitle} ${rawBody}`;

  // Detect bank name
  let bankName = 'BML';
  if (/islamic|mib/i.test(combined)) {
    bankName = 'MIB';
  } else if (/favara/i.test(combined)) {
    bankName = 'Favara';
  } else if (/bml|bank of maldives/i.test(combined)) {
    bankName = 'BML';
  }

  // Detect currency
  let currency = 'MVR';
  if (/\bUSD\b|\$/i.test(combined)) {
    currency = 'USD';
  }

  // Extract amount: matches patterns like:
  // "MVR 1,250.50", "MVR150.00", "MVR 150", "Rf 250.00", "150.00 MVR", "USD 50.00", "amount of 320.00"
  let amount: number | null = null;
  const amountPatterns = [
    /(?:MVR|Rf\.?|USD|\$)\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)/i,
    /([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)\s*(?:MVR|Rf\.?|USD)/i,
    /(?:received|credited|transferred|amount|payment\s+of)\s*:?\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)/i,
  ];

  for (const regex of amountPatterns) {
    const match = rawBody.match(regex) || combined.match(regex);
    if (match && match[1]) {
      const cleaned = match[1].replace(/,/g, '');
      const parsed = parseFloat(cleaned);
      if (!isNaN(parsed) && parsed > 0) {
        amount = parsed;
        break;
      }
    }
  }

  // Extract sender or reference if present (e.g., "from AHMED ALI", "Ref: 123456", "by IBRAHIM")
  let senderOrRef: string | null = null;
  const fromMatch = rawBody.match(/(?:from|by|sender)\s+([A-Za-z0-9\s._/-]{2,35}?)(?:\s+(?:to|on|at|ref|acc|account|\.)|$)/i);
  const refMatch = rawBody.match(/(?:ref(?:erence)?|trx|txn|id)\s*[#:]?\s*([A-Za-z0-9-]{4,25})/i);
  if (fromMatch && fromMatch[1]) {
    senderOrRef = fromMatch[1].trim();
  } else if (refMatch && refMatch[1]) {
    senderOrRef = `Ref: ${refMatch[1].trim()}`;
  }

  // Parse timestamp or fallback to current time
  let receivedAt = new Date().toISOString();
  if (payload.timestamp) {
    const tsNum = Number(payload.timestamp);
    if (!isNaN(tsNum) && tsNum > 1000000000) {
      const ms = tsNum < 10000000000 ? tsNum * 1000 : tsNum;
      const d = new Date(ms);
      if (!isNaN(d.getTime())) {
        receivedAt = d.toISOString();
      }
    } else if (typeof payload.timestamp === 'string') {
      const d = new Date(payload.timestamp);
      if (!isNaN(d.getTime())) {
        receivedAt = d.toISOString();
      }
    }
  }

  return {
    id: payload.id || `bnotif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: rawTitle,
    body: rawBody,
    amount,
    currency,
    senderOrRef,
    bankName,
    receivedAt,
    status: 'unclaimed',
  };
}
