// All dates and times in MVPOS strictly follow Maldives Time (Indian/Maldives, GMT+5 / UTC+05:00)
// regardless of the operating system or browser timezone configuration on the client machine.

const MALDIVES_OFFSET_MS = 5 * 60 * 60 * 1000; // Permanent UTC+5 (no DST)

export const parseMaldivesDate = (date: string | Date): Date => {
  if (date instanceof Date) return date;
  const s = String(date || '').trim();
  if (!s) return new Date(NaN);

  // Pure YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return new Date(`${s}T12:00:00+05:00`);
  }

  // Pure DD-MM-YYYY
  if (/^\d{2}-\d{2}-\d{4}$/.test(s)) {
    const [dd, mm, yyyy] = s.split('-');
    return new Date(`${yyyy}-${mm}-${dd}T12:00:00+05:00`);
  }

  // YYYY-MM-DD HH:mm(:ss) or YYYY-MM-DDTHH:mm(:ss) WITHOUT a timezone designator -> treat as Maldives local time (+05:00)
  if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(s)) {
    return new Date(`${s.replace(' ', 'T')}+05:00`);
  }

  // Has explicit timezone (Z, +00:00, +05:00, etc.) or other standard date string
  return new Date(s.replace(' ', 'T'));
};

export const getMaldivesParts = (date: string | Date = new Date()) => {
  const d = parseMaldivesDate(date);
  if (isNaN(d.getTime())) return null;
  const mv = new Date(d.getTime() + MALDIVES_OFFSET_MS);
  return {
    year: String(mv.getUTCFullYear()),
    month: String(mv.getUTCMonth() + 1).padStart(2, '0'),
    day: String(mv.getUTCDate()).padStart(2, '0'),
    hours24: mv.getUTCHours(),
    hours: String(mv.getUTCHours()).padStart(2, '0'),
    minutes: String(mv.getUTCMinutes()).padStart(2, '0'),
    seconds: String(mv.getUTCSeconds()).padStart(2, '0'),
  };
};

// Robustly extract YYYY-MM-DD in Maldives timezone (GMT+5) for comparison logic
export const extractDateOnly = (date: string | Date | undefined | null): string => {
  if (!date) return '';

  if (typeof date === 'string') {
    const s = date.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    if (/^\d{2}-\d{2}-\d{4}$/.test(s)) {
      const [dd, mm, yyyy] = s.split('-');
      return `${yyyy}-${mm}-${dd}`;
    }
  }

  const parts = getMaldivesParts(date);
  if (parts) {
    return `${parts.year}-${parts.month}-${parts.day}`;
  }

  // Fallback for unexpected string formats
  if (typeof date === 'string') {
    if (date.includes('T')) {
      const datePart = date.split('T')[0];
      if (datePart.split('-')[0].length === 4) return datePart;
    }
    if (date.includes(' ')) {
      const datePart = date.split(' ')[0];
      if (datePart.split('-')[0].length === 4) return datePart;
    }
  }

  return String(date);
};

export const formatDate = (date: string | Date): string => {
  if (!date) return '';
  const parts = getMaldivesParts(date);
  if (parts) {
    return `${parts.day}-${parts.month}-${parts.year}`;
  }

  const extracted = extractDateOnly(date);
  if (extracted.includes('-')) {
    const [y, m, dPart] = extracted.split('-');
    if (y && m && dPart) return `${dPart}-${m}-${y}`;
  }
  return String(date);
};

/**
 * Format time in Maldives local timezone (UTC+5), e.g. "03:52 PM" or "15:52"
 */
export const formatMaldivesTime = (date: string | Date = new Date(), use12Hour: boolean = true): string => {
  return formatTime(date, use12Hour);
};

/**
 * Format date in Maldives local timezone (UTC+5), e.g. "14-09-2026"
 */
export const formatMaldivesDate = (date: string | Date = new Date()): string => {
  return formatDate(date);
};

export const formatTime = (date: string | Date, use12Hour: boolean = true): string => {
  if (!date) return '';

  // If it's a pure date without time (e.g. "YYYY-MM-DD" or "DD-MM-YYYY"), do not fabricate a fake time
  if (typeof date === 'string' && !date.includes(':') && !date.includes('T')) {
    return '';
  }

  const parts = getMaldivesParts(date);
  if (!parts) return '';

  if (use12Hour) {
    const period = parts.hours24 >= 12 ? 'PM' : 'AM';
    const h12 = parts.hours24 % 12 || 12;
    return `${String(h12).padStart(2, '0')}:${parts.minutes} ${period}`;
  }
  return `${parts.hours}:${parts.minutes}`;
};

export const formatDateTime = (date: string | Date): string => {
  if (!date) return '';
  const dateFormatted = formatDate(date);
  const timeFormatted = formatTime(date);
  if (timeFormatted) {
    return `${dateFormatted} ${timeFormatted}`;
  }
  return dateFormatted;
};

// Strict ISO date format for DB in Maldives GMT+5 (YYYY-MM-DD)
export const toISODate = (date: Date = new Date()): string => {
  const parts = getMaldivesParts(date) || getMaldivesParts(new Date())!;
  return `${parts.year}-${parts.month}-${parts.day}`;
};

// Full ISO timestamp for DB with explicit Maldives GMT+5 offset (YYYY-MM-DDTHH:mm:ss+05:00)
export const toISODatetime = (date: Date = new Date()): string => {
  const parts = getMaldivesParts(date) || getMaldivesParts(new Date())!;
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hours}:${parts.minutes}:${parts.seconds}+05:00`;
};

export const formatCurrency = (amount: number | string | undefined | null, currency: string = 'MVR'): string => {
  const num = typeof amount === 'string' ? parseFloat(amount) : Number(amount || 0);
  if (isNaN(num)) return `${currency} 0.00`;
  return `${currency} ${num.toFixed(2)}`;
};
