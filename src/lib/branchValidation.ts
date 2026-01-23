import type { TFunction } from 'i18next';

/**
 * Validate branch name according to git rules
 * @returns Error message string if invalid, null if valid
 */
export function validateBranchName(name: string, t: TFunction): string | null {
  if (!name.trim()) return null; // Empty is handled separately

  if (name.includes(' ')) return t('branches.validation.cannotContainSpaces');
  if (name.startsWith('.')) return t('branches.validation.cannotStartWithDot');
  if (name.endsWith('/')) return t('branches.validation.cannotEndWithSlash');
  if (name.endsWith('.lock')) return t('branches.validation.cannotEndWithLock');
  if (name.includes('..')) return t('branches.validation.cannotContainConsecutiveDots');
  if (/[~^:?*[\]\\@{]/.test(name)) return t('branches.validation.containsInvalidCharacters');
  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x1f\x7f]/.test(name)) return t('branches.validation.containsControlCharacters');

  return null;
}
