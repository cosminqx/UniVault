export function confirmAction(message) {
  if (typeof window === 'undefined') return false;
  return window.confirm(message);
}