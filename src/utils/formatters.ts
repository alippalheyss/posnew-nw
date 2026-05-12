
// Robustly extract YYYY-MM-DD for comparison logic
export const extractDateOnly = (date: string | Date | undefined | null): string => {
  if (!date) return '';
  
  // If it's already a string, try to parse it
  if (typeof date === 'string') {
    // Check if it's YYYY-MM-DD HH:mm:ss
    if (date.includes('-') && date.includes(':') && date.includes(' ')) {
      const parts = date.split(' ')[0].split('-');
      if (parts[0].length === 4) return date.split(' ')[0]; // YYYY-MM-DD
    }
    
    // Check if it's YYYY-MM-DD
    if (date.includes('-')) {
      const parts = date.split('-');
      if (parts[0].length === 4) return date; // YYYY-MM-DD
      if (parts[2].length === 4) return `${parts[2]}-${parts[1]}-${parts[0]}`; // DD-MM-YYYY -> YYYY-MM-DD
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

export const formatTime = (date: string | Date): string => {
  if (!date) return '';
  
  // If it's a string with a space (YYYY-MM-DD HH:mm:ss), take the time part directly
  if (typeof date === 'string' && date.includes(' ')) {
    const timePart = date.split(' ')[1];
    if (timePart && timePart.includes(':')) {
      const parts = timePart.split(':');
      // Return HH:mm if seconds are not needed, or HH:mm:ss
      return `${parts[0]}:${parts[1]}${parts[2] ? ':' + parts[2] : ''}`;
    }
  }

  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  
  return d.toLocaleTimeString('en-GB', { 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit',
    hour12: false 
  });
};

export const formatDateTime = (date: string | Date): string => {
  if (!date) return '';
  // If it's our standard YYYY-MM-DD HH:mm:ss string
  if (typeof date === 'string' && date.includes(' ')) {
    const [datePart, timePart] = date.split(' ');
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
