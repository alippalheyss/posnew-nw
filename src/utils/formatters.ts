
export const formatDate = (date: string | Date): string => {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) {
    // Try parsing DD-MM-YYYY
    if (typeof date === 'string' && date.includes('-')) {
      const parts = date.split(' ')[0].split('-');
      if (parts.length === 3 && parts[0].length === 2) {
        return date.split(' ')[0]; // Already in DD-MM-YYYY
      }
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
  return `${formatDate(date)} ${formatTime(date)}`;
};

// Strict ISO format for DB (YYYY-MM-DD)
export const toISODate = (date: Date = new Date()): string => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${year}-${month}-${day}`;
};

// Full ISO timestamp for DB (YYYY-MM-DD HH:mm:ss)
export const toISODatetime = (date: Date = new Date()): string => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};
