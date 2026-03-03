import { describe, expect, it } from 'vitest';
import { cn, formatBytes, naturalCompare, normalizePath } from './utils';

describe('utils', () => {
  describe('cn', () => {
    it('should merge class names', () => {
      expect(cn('foo', 'bar')).toBe('foo bar');
    });

    it('should handle conditional classes', () => {
      const shouldInclude = false;
      const shouldIncludeBar = true;
      expect(cn('foo', shouldInclude && 'bar', 'baz')).toBe('foo baz');
      expect(cn('foo', shouldIncludeBar && 'bar', 'baz')).toBe('foo bar baz');
    });

    it('should handle tailwind conflicts', () => {
      expect(cn('p-4', 'p-2')).toBe('p-2');
      expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
    });

    it('should handle arrays', () => {
      expect(cn(['foo', 'bar'])).toBe('foo bar');
    });

    it('should handle objects', () => {
      expect(cn({ foo: true, bar: false, baz: true })).toBe('foo baz');
    });

    it('should handle mixed inputs', () => {
      expect(cn('foo', ['bar', 'baz'], { qux: true })).toBe('foo bar baz qux');
    });

    it('should handle undefined and null', () => {
      expect(cn('foo', undefined, null, 'bar')).toBe('foo bar');
    });
  });

  describe('naturalCompare', () => {
    it('should sort strings with numbers naturally', () => {
      expect(naturalCompare('file2', 'file10')).toBeLessThan(0);
      expect(naturalCompare('file10', 'file2')).toBeGreaterThan(0);
    });

    it('should handle file2 < file10 correctly', () => {
      const files = ['file10', 'file2', 'file1', 'file20'];
      files.sort(naturalCompare);
      expect(files).toEqual(['file1', 'file2', 'file10', 'file20']);
    });

    it('should be case insensitive', () => {
      expect(naturalCompare('File', 'file')).toBe(0);
      expect(naturalCompare('ABC', 'abc')).toBe(0);
    });

    it('should handle strings without numbers', () => {
      expect(naturalCompare('apple', 'banana')).toBeLessThan(0);
      expect(naturalCompare('banana', 'apple')).toBeGreaterThan(0);
    });

    it('should handle equal strings', () => {
      expect(naturalCompare('same', 'same')).toBe(0);
    });
  });

  describe('normalizePath', () => {
    it('should remove trailing slashes', () => {
      expect(normalizePath('/path/to/dir/')).toBe('/path/to/dir');
    });

    it('should handle multiple trailing slashes', () => {
      expect(normalizePath('/path/to/dir///')).toBe('/path/to/dir');
    });

    it('should leave paths without trailing slash unchanged', () => {
      expect(normalizePath('/path/to/dir')).toBe('/path/to/dir');
    });

    it('should handle root path', () => {
      expect(normalizePath('/')).toBe('');
    });

    it('should handle empty string', () => {
      expect(normalizePath('')).toBe('');
    });
  });

  describe('formatBytes', () => {
    it('should format 0 bytes', () => {
      expect(formatBytes(0)).toBe('0 B');
    });

    it('should format bytes', () => {
      expect(formatBytes(500)).toBe('500 B');
      expect(formatBytes(1023)).toBe('1023 B');
    });

    it('should format kilobytes', () => {
      expect(formatBytes(1024)).toBe('1 KB');
      expect(formatBytes(2048)).toBe('2 KB');
      expect(formatBytes(1536)).toBe('1.5 KB');
    });

    it('should format megabytes', () => {
      expect(formatBytes(1048576)).toBe('1 MB');
      expect(formatBytes(2456789)).toBe('2.34 MB');
      expect(formatBytes(104857600)).toBe('100 MB');
    });

    it('should format gigabytes', () => {
      expect(formatBytes(1073741824)).toBe('1 GB');
      expect(formatBytes(2147483648)).toBe('2 GB');
    });
  });
});
