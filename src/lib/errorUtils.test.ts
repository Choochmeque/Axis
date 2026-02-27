import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getErrorMessage, isAxisError } from './errorUtils';

vi.mock('@/i18n', () => ({
  default: {
    t: (key: string) => key,
  },
}));

describe('errorUtils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('isAxisError', () => {
    it('should return true for objects with type property', () => {
      expect(isAxisError({ type: 'GitError' })).toBe(true);
      expect(isAxisError({ type: 'IoError', data: 'some data' })).toBe(true);
    });

    it('should return false for null', () => {
      expect(isAxisError(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isAxisError(undefined)).toBe(false);
    });

    it('should return false for primitive values', () => {
      expect(isAxisError('string')).toBe(false);
      expect(isAxisError(123)).toBe(false);
      expect(isAxisError(true)).toBe(false);
    });

    it('should return false for objects without type property', () => {
      expect(isAxisError({})).toBe(false);
      expect(isAxisError({ error: 'something' })).toBe(false);
      expect(isAxisError({ message: 'error' })).toBe(false);
    });
  });

  describe('getErrorMessage', () => {
    it('should extract data field from AxisError', () => {
      const error = { type: 'GitError', data: 'Repository not found' };
      expect(getErrorMessage(error)).toBe('Repository not found');
    });

    it('should use fallback message for AxisError without data', () => {
      const error = { type: 'GitError' };
      expect(getErrorMessage(error)).toBe('lib.errors.gitError');
    });

    it('should handle Error instances', () => {
      const error = new Error('Standard error message');
      expect(getErrorMessage(error)).toBe('Standard error message');
    });

    it('should stringify other values', () => {
      expect(getErrorMessage('string error')).toBe('string error');
      expect(getErrorMessage(123)).toBe('123');
    });

    it('should handle all AxisError types with fallback messages', () => {
      // Array of [errorType, expectedKey] pairs
      const errorTypeToKey: Array<[string, string]> = [
        ['GitError', 'lib.errors.gitError'],
        ['IoError', 'lib.errors.ioError'],
        ['DatabaseError', 'lib.errors.databaseError'],
        ['SerializationError', 'lib.errors.serializationError'],
        ['NoRepositoryOpen', 'lib.errors.noRepositoryOpen'],
        ['CannotFastForward', 'lib.errors.cannotFastForward'],
        ['RebaseRequired', 'lib.errors.rebaseRequired'],
        ['MergeConflict', 'lib.errors.mergeConflict'],
        ['OAuthError', 'lib.errors.oauthError'],
        ['OAuthCancelled', 'lib.errors.oauthCancelled'],
        ['IntegrationError', 'lib.errors.integrationError'],
        ['IntegrationNotConnected', 'lib.errors.integrationNotConnected'],
        ['CheckoutConflict', 'lib.errors.checkoutConflict'],
        ['StashApplyConflict', 'lib.errors.stashApplyConflict'],
      ];

      for (const [type, expectedKey] of errorTypeToKey) {
        const error = { type };
        const message = getErrorMessage(error);
        expect(message).toBe(expectedKey);
      }
    });

    it('should use unknown error message for unknown AxisError types', () => {
      const error = { type: 'UnknownErrorType' };
      expect(getErrorMessage(error)).toBe('lib.errors.unknown');
    });

    it('should handle AxisError with empty data field', () => {
      const error = { type: 'GitError', data: '' };
      expect(getErrorMessage(error)).toBe('lib.errors.gitError');
    });

    it('should handle AxisError with null data field', () => {
      const error = { type: 'GitError', data: null };
      expect(getErrorMessage(error)).toBe('lib.errors.gitError');
    });
  });
});
