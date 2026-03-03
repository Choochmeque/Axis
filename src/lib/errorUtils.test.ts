import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getErrorMessage, isAxisError } from './errorUtils';

vi.mock('@/i18n', () => ({
  default: {
    t: (key: string, params?: Record<string, string>) => {
      if (params) {
        let result = key;
        for (const [k, v] of Object.entries(params)) {
          result += `|${k}=${v}`;
        }
        return result;
      }
      return key;
    },
  },
}));

vi.mock('./utils', () => ({
  formatBytes: (bytes: number) => `${bytes} bytes`,
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
    it('should handle Error instances', () => {
      const error = new Error('Standard error message');
      expect(getErrorMessage(error)).toBe('Standard error message');
    });

    it('should stringify other values', () => {
      expect(getErrorMessage('string error')).toBe('string error');
      expect(getErrorMessage(123)).toBe('123');
    });

    it('should use unknown error message for unknown AxisError types', () => {
      const error = { type: 'UnknownErrorType' };
      expect(getErrorMessage(error)).toBe('lib.errors.unknown');
    });

    describe('errors without data', () => {
      it('should return i18n key for errors without data', () => {
        const errorTypes = [
          ['NoRepositoryOpen', 'lib.errors.noRepositoryOpen'],
          ['CannotFastForward', 'lib.errors.cannotFastForward'],
          ['RebaseRequired', 'lib.errors.rebaseRequired'],
          ['MergeConflict', 'lib.errors.mergeConflict'],
          ['OAuthCancelled', 'lib.errors.oauthCancelled'],
          ['SshKeygenNotFound', 'lib.errors.sshKeygenNotFound'],
        ];

        for (const [type, expectedKey] of errorTypes) {
          expect(getErrorMessage({ type })).toBe(expectedKey);
        }
      });

      it('should handle empty data field', () => {
        const error = { type: 'GitError', data: '' };
        expect(getErrorMessage(error)).toBe('lib.errors.gitError');
      });

      it('should handle null data field', () => {
        const error = { type: 'GitError', data: null };
        expect(getErrorMessage(error)).toBe('lib.errors.gitError');
      });
    });

    describe('errors with string data', () => {
      it('should interpolate message for GitError', () => {
        const error = { type: 'GitError', data: 'Repository not found' };
        expect(getErrorMessage(error)).toBe('lib.errors.gitError|message=Repository not found');
      });

      it('should interpolate message for IoError', () => {
        const error = { type: 'IoError', data: 'File not accessible' };
        expect(getErrorMessage(error)).toBe('lib.errors.ioError|message=File not accessible');
      });

      it('should interpolate path for InvalidRepositoryPath', () => {
        const error = { type: 'InvalidRepositoryPath', data: '/invalid/path' };
        expect(getErrorMessage(error)).toBe('lib.errors.invalidRepositoryPath|path=/invalid/path');
      });

      it('should interpolate path for FileNotFound', () => {
        const error = { type: 'FileNotFound', data: 'src/main.rs' };
        expect(getErrorMessage(error)).toBe('lib.errors.fileNotFound|path=src/main.rs');
      });

      it('should interpolate ref for InvalidReference', () => {
        const error = { type: 'InvalidReference', data: 'bad-ref' };
        expect(getErrorMessage(error)).toBe('lib.errors.invalidReference|ref=bad-ref');
      });

      it('should interpolate branch for BranchNotFound', () => {
        const error = { type: 'BranchNotFound', data: 'feature-branch' };
        expect(getErrorMessage(error)).toBe('lib.errors.branchNotFound|branch=feature-branch');
      });

      it('should interpolate branch for BranchNotMerged', () => {
        const error = { type: 'BranchNotMerged', data: 'unmerged-branch' };
        expect(getErrorMessage(error)).toBe('lib.errors.branchNotMerged|branch=unmerged-branch');
      });

      it('should interpolate provider for ApiKeyNotConfigured', () => {
        const error = { type: 'ApiKeyNotConfigured', data: 'OpenAI' };
        expect(getErrorMessage(error)).toBe('lib.errors.apiKeyNotConfigured|provider=OpenAI');
      });

      it('should interpolate provider for IntegrationNotConnected', () => {
        const error = { type: 'IntegrationNotConnected', data: 'GitHub' };
        expect(getErrorMessage(error)).toBe('lib.errors.integrationNotConnected|provider=GitHub');
      });

      it('should interpolate name for SshKeyAlreadyExists', () => {
        const error = { type: 'SshKeyAlreadyExists', data: 'id_ed25519' };
        expect(getErrorMessage(error)).toBe('lib.errors.sshKeyAlreadyExists|name=id_ed25519');
      });

      it('should interpolate name for InvalidKeyFilename', () => {
        const error = { type: 'InvalidKeyFilename', data: '../evil' };
        expect(getErrorMessage(error)).toBe('lib.errors.invalidKeyFilename|name=../evil');
      });
    });

    describe('errors with special data types', () => {
      it('should format DiffTooLarge with human-readable size', () => {
        const error = { type: 'DiffTooLarge', data: 2456789 };
        expect(getErrorMessage(error)).toBe('lib.errors.diffTooLarge|size=2456789 bytes');
      });

      it('should format CheckoutConflict with file list', () => {
        const error = { type: 'CheckoutConflict', data: ['file1.ts', 'file2.ts'] };
        expect(getErrorMessage(error)).toBe('lib.errors.checkoutConflict|files=file1.ts, file2.ts');
      });

      it('should format StashApplyConflict with file list', () => {
        const error = { type: 'StashApplyConflict', data: ['conflict.rs'] };
        expect(getErrorMessage(error)).toBe('lib.errors.stashApplyConflict|files=conflict.rs');
      });

      it('should handle empty file list', () => {
        const error = { type: 'CheckoutConflict', data: [] };
        expect(getErrorMessage(error)).toBe('lib.errors.checkoutConflict|files=');
      });
    });

    describe('all error types have i18n keys', () => {
      it('should have i18n keys for all known error types', () => {
        const allErrorTypes = [
          'InvalidRepositoryPath',
          'GitError',
          'IoError',
          'DatabaseError',
          'SerializationError',
          'InvalidReference',
          'NoRepositoryOpen',
          'BranchNotFound',
          'BranchNotMerged',
          'FileNotFound',
          'CannotFastForward',
          'RebaseRequired',
          'MergeConflict',
          'CheckoutConflict',
          'StashApplyConflict',
          'AiServiceError',
          'ApiKeyNotConfigured',
          'DiffTooLarge',
          'Other',
          'IntegrationNotConnected',
          'IntegrationError',
          'OAuthError',
          'OAuthCancelled',
          'SshKeyError',
          'SshKeyAlreadyExists',
          'SshKeygenNotFound',
          'InvalidKeyFilename',
        ];

        for (const type of allErrorTypes) {
          const result = getErrorMessage({ type });
          expect(result).toContain('lib.errors.');
          expect(result).not.toBe('lib.errors.unknown');
        }
      });
    });
  });
});
