import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  formatDateTime,
  formatFullDateTime,
  formatMediumDate,
  formatRelativeTime,
  formatShortDate,
  formatTimeAgo,
  formatTimestamp,
} from './dateUtils';

vi.mock('@/i18n', () => ({
  default: {
    t: (key: string, options?: { count?: number }) => {
      if (options?.count !== undefined) {
        return `${key}:${options.count}`;
      }
      return key;
    },
  },
}));

describe('dateUtils', () => {
  const Now = new Date('2024-01-15T12:00:00Z').getTime();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(Now);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('formatRelativeTime', () => {
    it('should return "just now" for times less than 60 seconds ago', () => {
      const timestamp = Now - 30 * 1000; // 30 seconds ago
      expect(formatRelativeTime(timestamp)).toBe('lib.dates.justNow');
    });

    it('should return minutes ago for times less than 60 minutes', () => {
      const timestamp = Now - 5 * 60 * 1000; // 5 minutes ago
      expect(formatRelativeTime(timestamp)).toBe('lib.dates.minutesAgo:5');
    });

    it('should return hours ago for times less than 24 hours', () => {
      const timestamp = Now - 3 * 60 * 60 * 1000; // 3 hours ago
      expect(formatRelativeTime(timestamp)).toBe('lib.dates.hoursAgo:3');
    });

    it('should return "yesterday" for 1 day ago', () => {
      const timestamp = Now - 24 * 60 * 60 * 1000; // 1 day ago
      expect(formatRelativeTime(timestamp)).toBe('lib.dates.yesterday');
    });

    it('should return days ago for times less than 7 days', () => {
      const timestamp = Now - 3 * 24 * 60 * 60 * 1000; // 3 days ago
      expect(formatRelativeTime(timestamp)).toBe('lib.dates.daysAgo:3');
    });

    it('should return weeks ago for times less than 30 days', () => {
      const timestamp = Now - 14 * 24 * 60 * 60 * 1000; // 14 days ago = 2 weeks
      expect(formatRelativeTime(timestamp)).toBe('lib.dates.weeksAgo:2');
    });

    it('should return locale date for older times', () => {
      const timestamp = Now - 60 * 24 * 60 * 60 * 1000; // 60 days ago
      const result = formatRelativeTime(timestamp);
      // Should be a locale date string, not a translation key
      expect(result).not.toContain('lib.dates');
    });

    it('should accept both number and string timestamps', () => {
      const numTimestamp = Now - 5 * 60 * 1000;
      const strTimestamp = new Date(numTimestamp).toISOString();

      expect(formatRelativeTime(numTimestamp)).toBe('lib.dates.minutesAgo:5');
      expect(formatRelativeTime(strTimestamp)).toBe('lib.dates.minutesAgo:5');
    });
  });

  describe('formatTimeAgo', () => {
    it('should return "less than a minute ago" for < 30 seconds', () => {
      const timestamp = Now - 20 * 1000;
      expect(formatTimeAgo(timestamp)).toBe('lib.dates.lessThanMinuteAgo');
    });

    it('should return "about a minute ago" for < 90 seconds', () => {
      const timestamp = Now - 60 * 1000;
      expect(formatTimeAgo(timestamp)).toBe('lib.dates.aboutMinuteAgo');
    });

    it('should return "X minutes ago" for < 45 minutes', () => {
      const timestamp = Now - 30 * 60 * 1000;
      expect(formatTimeAgo(timestamp)).toBe('lib.dates.minutesAgoLong:30');
    });

    it('should return "about an hour ago" for < 90 minutes', () => {
      const timestamp = Now - 60 * 60 * 1000;
      expect(formatTimeAgo(timestamp)).toBe('lib.dates.aboutHourAgo');
    });

    it('should return "about X hours ago" for < 24 hours', () => {
      const timestamp = Now - 5 * 60 * 60 * 1000;
      expect(formatTimeAgo(timestamp)).toBe('lib.dates.aboutHoursAgo:5');
    });

    it('should return "a day ago" for < 42 hours', () => {
      const timestamp = Now - 30 * 60 * 60 * 1000;
      expect(formatTimeAgo(timestamp)).toBe('lib.dates.dayAgo');
    });

    it('should return "X days ago" for < 30 days', () => {
      const timestamp = Now - 10 * 24 * 60 * 60 * 1000;
      expect(formatTimeAgo(timestamp)).toBe('lib.dates.daysAgoLong:10');
    });

    it('should return "about a month ago" for < 45 days', () => {
      const timestamp = Now - 35 * 24 * 60 * 60 * 1000;
      expect(formatTimeAgo(timestamp)).toBe('lib.dates.aboutMonthAgo');
    });

    it('should return "X months ago" for < 365 days', () => {
      const timestamp = Now - 100 * 24 * 60 * 60 * 1000;
      expect(formatTimeAgo(timestamp)).toBe('lib.dates.monthsAgo:3');
    });

    it('should return "about a year ago" for < 18 months', () => {
      const timestamp = Now - 400 * 24 * 60 * 60 * 1000;
      expect(formatTimeAgo(timestamp)).toBe('lib.dates.aboutYearAgo');
    });

    it('should return "X years ago" for older dates', () => {
      const timestamp = Now - 800 * 24 * 60 * 60 * 1000;
      expect(formatTimeAgo(timestamp)).toBe('lib.dates.yearsAgo:2');
    });
  });

  describe('formatShortDate', () => {
    it('should return formatted date and title', () => {
      const timestamp = new Date('2024-01-15T10:30:45Z').getTime();
      const result = formatShortDate(timestamp);

      expect(result).toHaveProperty('formatted');
      expect(result).toHaveProperty('title');
      expect(typeof result.formatted).toBe('string');
      expect(typeof result.title).toBe('string');
    });

    it('should accept string timestamp', () => {
      const timestamp = '2024-01-15T10:30:45Z';
      const result = formatShortDate(timestamp);

      expect(result).toHaveProperty('formatted');
      expect(result).toHaveProperty('title');
    });
  });

  describe('formatFullDateTime', () => {
    it('should format date with full details', () => {
      const timestamp = new Date('2024-01-15T10:30:45Z').getTime();
      const result = formatFullDateTime(timestamp);

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should accept string timestamp', () => {
      const result = formatFullDateTime('2024-01-15T10:30:45Z');
      expect(typeof result).toBe('string');
    });
  });

  describe('formatMediumDate', () => {
    it('should format date with medium details', () => {
      const timestamp = new Date('2024-01-15T10:30:45Z').getTime();
      const result = formatMediumDate(timestamp);

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should accept string timestamp', () => {
      const result = formatMediumDate('2024-01-15T10:30:45Z');
      expect(typeof result).toBe('string');
    });
  });

  describe('formatTimestamp', () => {
    it('should format date and time separately', () => {
      const timestamp = new Date('2024-01-15T10:30:45Z').getTime();
      const result = formatTimestamp(timestamp);

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should return empty string for null', () => {
      expect(formatTimestamp(null)).toBe('');
    });

    it('should accept string timestamp', () => {
      const result = formatTimestamp('2024-01-15T10:30:45Z');
      expect(typeof result).toBe('string');
    });
  });

  describe('formatDateTime', () => {
    it('should format locale datetime', () => {
      const timestamp = new Date('2024-01-15T10:30:45Z').getTime();
      const result = formatDateTime(timestamp);

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should accept string timestamp', () => {
      const result = formatDateTime('2024-01-15T10:30:45Z');
      expect(typeof result).toBe('string');
    });
  });
});
