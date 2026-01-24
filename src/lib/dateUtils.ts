/**
 * Centralized date formatting utilities.
 * All functions use native JS Date APIs - no external dependencies.
 */

import i18n from '@/i18n';

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
    return i18n.t('lib.dates.justNow');
  }
  if (minutes < 60) {
    return i18n.t('lib.dates.minutesAgo', { count: minutes });
  }
  if (hours < 24) {
    return i18n.t('lib.dates.hoursAgo', { count: hours });
  }
  if (days === 1) {
    return i18n.t('lib.dates.yesterday');
  }
  if (days < 7) {
    return i18n.t('lib.dates.daysAgo', { count: days });
  }
  if (days < 30) {
    return i18n.t('lib.dates.weeksAgo', { count: Math.floor(days / 7) });
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
    return i18n.t('lib.dates.lessThanMinuteAgo');
  }
  if (seconds < 90) {
    return i18n.t('lib.dates.aboutMinuteAgo');
  }
  if (minutes < 45) {
    return i18n.t('lib.dates.minutesAgoLong', { count: minutes });
  }
  if (minutes < 90) {
    return i18n.t('lib.dates.aboutHourAgo');
  }
  if (hours < 24) {
    return i18n.t('lib.dates.aboutHoursAgo', { count: hours });
  }
  if (hours < 42) {
    return i18n.t('lib.dates.dayAgo');
  }
  if (days < 30) {
    return i18n.t('lib.dates.daysAgoLong', { count: days });
  }
  if (days < 45) {
    return i18n.t('lib.dates.aboutMonthAgo');
  }
  if (days < 365) {
    return i18n.t('lib.dates.monthsAgo', { count: months });
  }
  if (months < 18) {
    return i18n.t('lib.dates.aboutYearAgo');
  }
  return i18n.t('lib.dates.yearsAgo', { count: years });
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
