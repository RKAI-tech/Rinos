export function normalizeWhiteSpace(text) {
  return text.replace(/\s+/g, ' ').trim();
}

export function trimStringWithEllipsis(str, maxLength) {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - 1) + '…';
}


export function oneLine(s) {
  return s.replace(/\n/g, '↵').replace(/\t/g, '⇆');
}


export function escapeInputValue(value) {
  if (typeof value !== 'string') {
    return value;
  }
  
  // Escape special characters that could cause issues in selectors or execution
  return value
    .replace(/\\/g, '\\\\')  // Escape backslashes
    .replace(/'/g, "\\'")    // Escape single quotes
    .replace(/"/g, '\\"')    // Escape double quotes
    .replace(/\n/g, '\\n')   // Escape newlines
    .replace(/\r/g, '\\r')   // Escape carriage returns
    .replace(/\t/g, '\\t');  // Escape tabs
}


export function escapeSelector(value) {
  if (!value) return '';
  const fallbackEscape = function(s) { return String(s).replace(/[^\w-]/g, '\\$&'); };
  const esc = (window.CSS && typeof window.CSS.escape === 'function') ? window.CSS.escape : fallbackEscape;
  return esc(value).replace(/\\/g, '\\\\');
}


export function isMeaningfulValue(value) {
  if (!value || !value.trim()) return false;
  const trimmed = value.trim();
  // Skip generic values, IDs, and very short values
  if (trimmed.length < 2) return false;
  // Allow pure numeric strings to be meaningful for selectors
  // Previously: if (/^[0-9]+$/.test(trimmed)) return false;
  if (/^[a-zA-Z0-9_-]+$/.test(trimmed) && trimmed.length < 3) return false; // Short alphanumeric
  return true;
}
