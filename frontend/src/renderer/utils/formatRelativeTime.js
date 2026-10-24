// frontend/src/renderer/utils/formatRelativeTime.js
// Short relative time for history rows ("5 min ago"). `timestamp` is epoch
// milliseconds, the unit the backend stores. Returns '' for a missing or
// invalid timestamp so callers can skip rendering it.

export function formatRelativeTime(timestamp, now = Date.now()) {
  if (typeof timestamp !== 'number' || Number.isNaN(timestamp)) {
    return '';
  }

  const seconds = Math.max(0, Math.round((now - timestamp) / 1000));
  if (seconds < 60) {
    return 'Just now';
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes} min ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} h ago`;
  }

  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `${days} d ago`;
  }

  return new Date(timestamp).toLocaleDateString();
}
