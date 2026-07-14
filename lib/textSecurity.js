export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;',
  })[char]);
}

export function cleanSingleLine(value, maxLength) {
  if (typeof value !== 'string') return null;
  const clean = value.trim();
  if (clean.length > maxLength || /[\r\n\0]/.test(clean)) return null;
  return clean;
}

export function cleanMultiline(value, maxLength) {
  if (typeof value !== 'string') return null;
  const clean = value.trim();
  if (clean.length > maxLength || clean.includes('\0')) return null;
  return clean;
}

export function isValidEmail(value) {
  return typeof value === 'string'
    && value.length <= 254
    && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
