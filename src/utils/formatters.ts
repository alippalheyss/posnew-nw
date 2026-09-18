
// Robustly extract YYYY-MM-DD for comparison logic
export const extractDateOnly = (date: string | Date | undefined | null): string => {
  if (!date) return '';
  
  // If it's already a string, try to parse it
  if (typeof date === 'string') {
    // Check if it's ISO timestamp (e.g. 2026-09-18T15:22:26)
    if (date.includes('T')) {
      const datePart = date.split('T')[0];
      if (datePart.split('-')[0].length === 4) return datePart;
    }
    
    // Check if it's YYYY-MM-DD HH:mm:ss
    if (date.includes('-') && date.includes(':') && date.includes(' ')) {
      const parts = date.split(' ')[0].split('-');
      if (parts[0].length === 4) return date.split(' ')[0]; // YYYY-MM-DD
    }
    
    // Check if it's YYYY-MM-DD
    if (date.includes('-')) {
      const parts = date.split('-');
      if (parts[0].length === 4) return parts.slice(0, 3).join('-'); // YYYY-MM-DD
      if (parts[2]?.length === 4) return `${parts[2]}-${parts[1]}-${parts[0]}`; // DD-MM-YYYY -> YYYY-MM-DD
    }
  }

  // Fallback to standard Date parsing
  const d = new Date(date);
  if (isNaN(d.getTime())) return String(date);
  
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  
  return `${year}-${month}-${day}`;
};

export const formatDate = (date: string | Date): string => {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) {
    // If it's already DD-MM-YYYY or similar
    const extracted = extractDateOnly(date);
    if (extracted.includes('-')) {
      const [y, m, d_part] = extracted.split('-');
      return `${d_part}-${m}-${y}`;
    }
    return String(date);
  }
  
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  
  return `${day}-${month}-${year}`;
};

/**
 * Format time in Maldives local timezone (UTC+5), e.g. "03:52 PM" or "15:52"
 */
export const formatMaldivesTime = (date: string | Date = new Date(), use12Hour: boolean = true): string => {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '';
  try {
    return d.toLocaleTimeString('en-US', {
      timeZone: 'Indian/Maldives',
      hour: '2-digit',
      minute: '2-digit',
      hour12: use12Hour,
    });
  } catch (e) {
    const hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    if (use12Hour) {
      const period = hours >= 12 ? 'PM' : 'AM';
      const h12 = hours % 12 || 12;
      return `${String(h12).padStart(2, '0')}:${minutes} ${period}`;
    }
    return `${String(hours).padStart(2, '0')}:${minutes}`;
  }
};

/**
 * Format date in Maldives local timezone (UTC+5), e.g. "14-09-2026"
 */
export const formatMaldivesDate = (date: string | Date = new Date()): string => {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return formatDate(date);
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Indian/Maldives',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(d);
    return parts.replace(/\//g, '-');
  } catch (e) {
    return formatDate(date);
  }
};

export const formatTime = (date: string | Date, use12Hour: boolean = true): string => {
  if (!date) return '';
  
  // If it's a pure date without time (e.g. "YYYY-MM-DD" or "DD-MM-YYYY"), do not fabricate a fake 05:00:00 midnight time!
  if (typeof date === 'string' && !date.includes(':') && !date.includes('T')) {
    return '';
  }

  // If it's a string with a space (YYYY-MM-DD HH:mm:ss) without timezone, it's pre-formatted local time
  if (typeof date === 'string' && date.includes(' ') && !date.includes('Z') && !date.includes('+')) {
    const timePart = date.split(' ')[1];
    if (timePart && timePart.includes(':')) {
      const parts = timePart.split(':');
      const h = parseInt(parts[0], 10);
      const m = parts[1];
      if (use12Hour) {
        const period = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12;
        return `${String(h12).padStart(2, '0')}:${m} ${period}`;
      }
      return `${String(h).padStart(2, '0')}:${m}${parts[2] ? ':' + parts[2] : ''}`;
    }
  }

  const d = new Date(date);
  if (isNaN(d.getTime())) {
    if (typeof date === 'string' && date.includes('T')) {
      const timePart = date.split('T')[1].split('.')[0];
      return timePart;
    }
    return '';
  }
  
  // Convert to Maldives / local time (12-hour format e.g. "05:42 PM")
  try {
    return d.toLocaleTimeString('en-US', {
      timeZone: 'Indian/Maldives',
      hour: '2-digit',
      minute: '2-digit',
      hour12: use12Hour,
    });
  } catch (e) {
    const hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    if (use12Hour) {
      const period = hours >= 12 ? 'PM' : 'AM';
      const h12 = hours % 12 || 12;
      return `${String(h12).padStart(2, '0')}:${minutes} ${period}`;
    }
    return `${String(hours).padStart(2, '0')}:${minutes}`;
  }
};

export const formatDateTime = (date: string | Date): string => {
  if (!date) return '';
  
  // If it's our standard YYYY-MM-DD HH:mm:ss string
  if (typeof date === 'string' && date.includes(' ')) {
    const [datePart, timePart] = date.split(' ');
    const [y, m, d] = datePart.split('-');
    return `${d}-${m}-${y} ${timePart}`;
  }

  // Handle ISO T format
  if (typeof date === 'string' && date.includes('T')) {
    const [datePart, timePartFull] = date.split('T');
    const timePart = timePartFull.split('.')[0];
    const [y, m, d] = datePart.split('-');
    return `${d}-${m}-${y} ${timePart}`;
  }
  
  return `${formatDate(date)} ${formatTime(date)}`;
};

// Strict ISO format for DB (YYYY-MM-DD)
export const toISODate = (date: Date = new Date()): string => {
  return extractDateOnly(date);
};

// Full ISO timestamp for DB (YYYY-MM-DD HH:mm:ss)
export const toISODatetime = (date: Date = new Date()): string => {
  const datePart = extractDateOnly(date);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${datePart} ${hours}:${minutes}:${seconds}`;
};

export const formatCurrency = (amount: number | string | undefined | null, currency: string = 'MVR'): string => {
  const num = typeof amount === 'string' ? parseFloat(amount) : Number(amount || 0);
  if (isNaN(num)) return `${currency} 0.00`;
  return `${currency} ${num.toFixed(2)}`;
};

