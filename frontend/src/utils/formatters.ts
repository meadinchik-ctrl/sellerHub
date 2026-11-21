// Russian date and time formatting utilities

/**
 * Formats date to Russian format: DD.MM.YYYY
 */
export function formatDateRU(dateInput?: string | Date | null): string {
  if (!dateInput) return '—';
  
  // If format is already YYYY-MM-DD
  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
    const [year, month, day] = dateInput.split('-');
    return `${day}.${month}.${year}`;
  }

  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}.${month}.${year}`;
  } catch {
    return String(dateInput);
  }
}

/**
 * Formats date and time in 24-hour Russian format: DD.MM.YYYY в HH:mm
 */
export function formatDateTimeRU(dateInput?: string | Date | null): string {
  if (!dateInput) return '—';
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}.${month}.${year} в ${hours}:${minutes}`;
  } catch {
    return String(dateInput);
  }
}

/**
 * Ensures 24h format HH:mm
 */
export function formatTime24(timeStr?: string | null): string {
  if (!timeStr) return '';
  return timeStr.slice(0, 5);
}
