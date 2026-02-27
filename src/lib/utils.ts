import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Compute label badge colors based on perceived brightness.
 * Dark label colors get a lightened text so they remain visible on dark backgrounds.
 */
export function getLabelColors(hex: string): {
  backgroundColor: string;
  color: string;
  border: string;
} {
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  // Perceived brightness (ITU-R BT.709)
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

  if (luminance < 0.3) {
    // Dark label: lighten the color for text visibility
    const lighten = (c: number) => Math.min(255, c + Math.round((255 - c) * 0.6));
    const lr = lighten(r).toString(16).padStart(2, '0');
    const lg = lighten(g).toString(16).padStart(2, '0');
    const lb = lighten(b).toString(16).padStart(2, '0');
    return {
      backgroundColor: `#${hex}50`,
      color: `#${lr}${lg}${lb}`,
      border: `1px solid #${hex}90`,
    };
  }

  return {
    backgroundColor: `#${hex}38`,
    color: `#${hex}`,
    border: `1px solid #${hex}80`,
  };
}

/**
 * Natural string comparison that handles numbers correctly.
 * e.g., "file2" < "file10" instead of "file10" < "file2"
 */
export function naturalCompare(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

/**
 * Returns an `aria-label` for a given E2E test identifier.
 * Spread the result onto any JSX element: `<div {...testId('e2e-my-element')}>`.
 *
 * All Appium drivers (mac2, windows, linux) locate elements via the
 * accessibility name derived from `aria-label`.
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export function testId(id: string): { 'aria-label': string } {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  return { 'aria-label': id };
}

/**
 * Normalize a path for consistent cache key usage.
 * Removes trailing slashes to ensure paths match regardless of source.
 */
export function normalizePath(path: string): string {
  return path.replace(/\/+$/, '');
}
