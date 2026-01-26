import { describe, it, expect, vi } from 'vitest';
import { validateBranchName } from './branchValidation';

const mockT = vi.fn((key: string) => key);

describe('branchValidation', () => {
  describe('validateBranchName', () => {
    it('should return null for valid branch names', () => {
      expect(validateBranchName('main', mockT)).toBeNull();
      expect(validateBranchName('develop', mockT)).toBeNull();
      expect(validateBranchName('feature/my-feature', mockT)).toBeNull();
      expect(validateBranchName('release/1.0.0', mockT)).toBeNull();
      expect(validateBranchName('hotfix/bug-fix', mockT)).toBeNull();
      expect(validateBranchName('feature/JIRA-123', mockT)).toBeNull();
    });

    it('should return null for empty or whitespace name', () => {
      expect(validateBranchName('', mockT)).toBeNull();
      expect(validateBranchName('   ', mockT)).toBeNull();
    });

    it('should reject names with spaces', () => {
      expect(validateBranchName('my branch', mockT)).toBe(
        'branches.validation.cannotContainSpaces'
      );
      expect(validateBranchName('feature/my branch', mockT)).toBe(
        'branches.validation.cannotContainSpaces'
      );
    });

    it('should reject names starting with dot', () => {
      expect(validateBranchName('.hidden', mockT)).toBe('branches.validation.cannotStartWithDot');
      expect(validateBranchName('.feature/test', mockT)).toBe(
        'branches.validation.cannotStartWithDot'
      );
    });

    it('should reject names ending with slash', () => {
      expect(validateBranchName('feature/', mockT)).toBe('branches.validation.cannotEndWithSlash');
      expect(validateBranchName('release/1.0/', mockT)).toBe(
        'branches.validation.cannotEndWithSlash'
      );
    });

    it('should reject names ending with .lock', () => {
      expect(validateBranchName('branch.lock', mockT)).toBe(
        'branches.validation.cannotEndWithLock'
      );
      expect(validateBranchName('feature/test.lock', mockT)).toBe(
        'branches.validation.cannotEndWithLock'
      );
    });

    it('should reject names with consecutive dots', () => {
      expect(validateBranchName('feature..test', mockT)).toBe(
        'branches.validation.cannotContainConsecutiveDots'
      );
      expect(validateBranchName('release/1..0', mockT)).toBe(
        'branches.validation.cannotContainConsecutiveDots'
      );
    });

    it('should reject names with special characters', () => {
      expect(validateBranchName('branch~name', mockT)).toBe(
        'branches.validation.containsInvalidCharacters'
      );
      expect(validateBranchName('branch^name', mockT)).toBe(
        'branches.validation.containsInvalidCharacters'
      );
      expect(validateBranchName('branch:name', mockT)).toBe(
        'branches.validation.containsInvalidCharacters'
      );
      expect(validateBranchName('branch?name', mockT)).toBe(
        'branches.validation.containsInvalidCharacters'
      );
      expect(validateBranchName('branch*name', mockT)).toBe(
        'branches.validation.containsInvalidCharacters'
      );
      expect(validateBranchName('branch[name', mockT)).toBe(
        'branches.validation.containsInvalidCharacters'
      );
      expect(validateBranchName('branch]name', mockT)).toBe(
        'branches.validation.containsInvalidCharacters'
      );
      expect(validateBranchName('branch\\name', mockT)).toBe(
        'branches.validation.containsInvalidCharacters'
      );
      expect(validateBranchName('branch@name', mockT)).toBe(
        'branches.validation.containsInvalidCharacters'
      );
      expect(validateBranchName('branch{name', mockT)).toBe(
        'branches.validation.containsInvalidCharacters'
      );
    });

    it('should reject names with control characters', () => {
      expect(validateBranchName('branch\x00name', mockT)).toBe(
        'branches.validation.containsControlCharacters'
      );
      expect(validateBranchName('branch\x1fname', mockT)).toBe(
        'branches.validation.containsControlCharacters'
      );
      expect(validateBranchName('branch\x7fname', mockT)).toBe(
        'branches.validation.containsControlCharacters'
      );
    });
  });
});
