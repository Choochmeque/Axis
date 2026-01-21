/**
 * Centralized date formatting utilities.
 * All functions use native JS Date APIs - no external dependencies.
 */

/**
 * Converts a timestamp to a Date object.
 */
function toDate(timestamp: number | string): Date {
  return typeof timestamp === 'number' ? new Date(timestamp) : new Date(timestamp);
}

/**
 * Relative time (compact): "just now", "5m ago", "2h ago", "3d ago", "1w ago", or locale date.
 * Used for lists and compact displays.
 */
export function formatRelativeTime(timestamp: number | string): string {
  const date = toDate(timestamp);
  const now = Date.now();
  const diff = now - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) {
    return 'just now';
  }
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  if (hours < 24) {
    return `${hours}h ago`;
  }
  if (days === 1) {
    return 'yesterday';
  }
  if (days < 7) {
    return `${days}d ago`;
  }
  if (days < 30) {
    return `${Math.floor(days / 7)}w ago`;
  }
  return date.toLocaleDateString();
}

/**
 * Relative time (natural): "about 2 hours ago", "3 days ago".
 * Replaces date-fns formatDistanceToNow with addSuffix: true.
 */
export function formatTimeAgo(timestamp: number | string): string {
  const date = toDate(timestamp);
  const now = Date.now();
  const diff = now - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (seconds < 30) {
    return 'less than a minute ago';
  }
  if (seconds < 90) {
    return 'about a minute ago';
  }
  if (minutes < 45) {
    return `${minutes} minutes ago`;
  }
  if (minutes < 90) {
    return 'about an hour ago';
  }
  if (hours < 24) {
    return `about ${hours} hours ago`;
  }
  if (hours < 42) {
    return 'a day ago';
  }
  if (days < 30) {
    return `${days} days ago`;
  }
  if (days < 45) {
    return 'about a month ago';
  }
  if (days < 365) {
    return `${months} months ago`;
  }
  if (months < 18) {
    return 'about a year ago';
  }
  return `${years} years ago`;
}

/**
 * Short date with tooltip: { formatted: "1/21/2026", title: "1/21/2026, 10:30:45 AM" }.
 * Used in commit tables with hover tooltips.
 */
export function formatShortDate(timestamp: number | string): { formatted: string; title: string } {
  const date = toDate(timestamp);
  return {
    formatted: date.toLocaleDateString(),
    title: date.toLocaleString(),
  };
}

/**
 * Full datetime: "Jan 21, 2026, 10:30:45 AM".
 * Replaces date-fns format(date, 'PPpp').
 */
export function formatFullDateTime(timestamp: number | string): string {
  const date = toDate(timestamp);
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * Medium date: "Jan 21, 2026".
 * Replaces date-fns format(date, 'MMM d, yyyy').
 */
export function formatMediumDate(timestamp: number | string): string {
  const date = toDate(timestamp);
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Date and time separate: "1/21/2026 10:30:45 AM".
 * Used for reflog, stash, and tag timestamps.
 */
export function formatTimestamp(timestamp: number | string | null): string {
  if (timestamp === null) {
    return '';
  }
  const date = toDate(timestamp);
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
}

/**
 * Locale datetime: "Jan 21, 2026, 10:30 AM".
 * Used for detail views (issues, PRs).
 */
export function formatDateTime(timestamp: number | string): string {
  const date = toDate(timestamp);
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
