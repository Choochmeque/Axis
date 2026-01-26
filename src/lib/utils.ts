import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Natural string comparison that handles numbers correctly.
 * e.g., "file2" < "file10" instead of "file10" < "file2"
 */
export function naturalCompare(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

/**
 * Normalize a path for consistent cache key usage.
 * Removes trailing slashes to ensure paths match regardless of source.
 */
export function normalizePath(path: string): string {
  return path.replace(/\/+$/, '');
}
