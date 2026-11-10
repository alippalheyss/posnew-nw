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
  _rowUpdatedAt?: string;
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

  // Parse timestamp or fallback to row updated_at / current time
  let receivedAt = '';
  if (payload.timestamp) {
    const tsNum = Number(payload.timestamp);
    if (!isNaN(tsNum) && tsNum > 1000000000) {
      const ms = tsNum < 10000000000 ? tsNum * 1000 : tsNum;
      const d = new Date(ms);
      if (!isNaN(d.getTime())) {
        receivedAt = d.toISOString();
      }
    } else if (typeof payload.timestamp === 'string' && !payload.timestamp.includes('{') && !payload.timestamp.includes('%')) {
      const d = new Date(payload.timestamp);
      if (!isNaN(d.getTime())) {
        receivedAt = d.toISOString();
      }
    }
  }
  if (!receivedAt && payload._rowUpdatedAt) {
    const d = new Date(payload._rowUpdatedAt);
    if (!isNaN(d.getTime())) {
      receivedAt = d.toISOString();
    }
  }
  if (!receivedAt) {
    receivedAt = new Date().toISOString();
  }

  // Deterministic ID based on title + body so the same webhook never creates different random IDs across refreshes/devices
  const deterministicKey = `${rawTitle.trim().toLowerCase()}|${rawBody.trim().toLowerCase()}`;
  let hash = 2166136261;
  for (let i = 0; i < deterministicKey.length; i++) {
    hash ^= deterministicKey.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const deterministicId = `bnotif-${(hash >>> 0).toString(36)}`;

  return {
    id: payload.id || deterministicId,
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

/**
 * Deduplicates a list of bank notifications by ID and normalized title+body content.
 * Preserves 'verified' or 'dismissed' status over 'unclaimed' and keeps the earliest receivedAt timestamp.
 */
export function deduplicateBankNotifications(list: BankNotification[]): BankNotification[] {
  if (!Array.isArray(list) || list.length === 0) return [];

  const byContentKey = new Map<string, BankNotification>();

  for (const item of list) {
    if (!item || (!item.body && !item.title)) continue;
    const key = `${String(item.title || '').trim().toLowerCase()}|${String(item.body || '').trim().toLowerCase()}`;
    const existing = byContentKey.get(key);

    if (!existing) {
      byContentKey.set(key, item);
    } else {
      // Merge: prefer verified > dismissed > unclaimed
      const statusPriority = { verified: 3, dismissed: 2, unclaimed: 1 };
      const bestStatus =
        (statusPriority[item.status] || 1) > (statusPriority[existing.status] || 1)
          ? item.status
          : existing.status;

      // Keep earliest valid receivedAt so refreshes don't bump old alerts to "Just now"
      const tExisting = new Date(existing.receivedAt).getTime();
      const tItem = new Date(item.receivedAt).getTime();
      const earliestReceivedAt =
        !isNaN(tExisting) && !isNaN(tItem)
          ? tItem < tExisting
            ? item.receivedAt
            : existing.receivedAt
          : existing.receivedAt || item.receivedAt;

      byContentKey.set(key, {
        ...existing,
        ...item,
        id: existing.id || item.id,
        status: bestStatus,
        receivedAt: earliestReceivedAt,
        matchedCustomerName: existing.matchedCustomerName || item.matchedCustomerName || null,
        matchedSaleId: existing.matchedSaleId || item.matchedSaleId || null,
        verifiedAt: existing.verifiedAt || item.verifiedAt || null,
      });
    }
  }

  return Array.from(byContentKey.values())
    .sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime())
    .slice(0, 50);
}
