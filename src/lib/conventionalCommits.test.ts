import { describe, it, expect } from 'vitest';
import {
  formatConventionalCommit,
  parseConventionalCommit,
  getEmptyCommitParts,
  COMMIT_TYPES,
  type ConventionalCommitParts,
} from './conventionalCommits';

describe('conventionalCommits', () => {
  describe('formatConventionalCommit', () => {
    it('should format a simple commit with type and subject', () => {
      const parts: ConventionalCommitParts = {
        type: 'feat',
        scope: '',
        breaking: false,
        subject: 'add new feature',
        body: '',
      };
      expect(formatConventionalCommit(parts)).toBe('feat: add new feature');
    });

    it('should include scope when provided', () => {
      const parts: ConventionalCommitParts = {
        type: 'fix',
        scope: 'auth',
        breaking: false,
        subject: 'fix login bug',
        body: '',
      };
      expect(formatConventionalCommit(parts)).toBe('fix(auth): fix login bug');
    });

    it('should add breaking change indicator when breaking is true', () => {
      const parts: ConventionalCommitParts = {
        type: 'feat',
        scope: 'api',
        breaking: true,
        subject: 'change endpoint structure',
        body: '',
      };
      expect(formatConventionalCommit(parts)).toBe('feat(api)!: change endpoint structure');
    });

    it('should include body when provided', () => {
      const parts: ConventionalCommitParts = {
        type: 'docs',
        scope: '',
        breaking: false,
        subject: 'update readme',
        body: 'Added installation instructions',
      };
      expect(formatConventionalCommit(parts)).toBe(
        'docs: update readme\n\nAdded installation instructions'
      );
    });

    it('should return empty string when type is empty', () => {
      const parts: ConventionalCommitParts = {
        type: '',
        scope: '',
        breaking: false,
        subject: 'some subject',
        body: '',
      };
      expect(formatConventionalCommit(parts)).toBe('');
    });

    it('should return empty string when subject is empty', () => {
      const parts: ConventionalCommitParts = {
        type: 'feat',
        scope: '',
        breaking: false,
        subject: '',
        body: '',
      };
      expect(formatConventionalCommit(parts)).toBe('');
    });

    it('should return empty string when subject is whitespace only', () => {
      const parts: ConventionalCommitParts = {
        type: 'feat',
        scope: '',
        breaking: false,
        subject: '   ',
        body: '',
      };
      expect(formatConventionalCommit(parts)).toBe('');
    });

    it('should trim whitespace from scope, subject, and body', () => {
      const parts: ConventionalCommitParts = {
        type: 'feat',
        scope: '  auth  ',
        breaking: false,
        subject: '  add feature  ',
        body: '  body text  ',
      };
      expect(formatConventionalCommit(parts)).toBe('feat(auth): add feature\n\nbody text');
    });

    it('should handle breaking change without scope', () => {
      const parts: ConventionalCommitParts = {
        type: 'feat',
        scope: '',
        breaking: true,
        subject: 'breaking change',
        body: '',
      };
      expect(formatConventionalCommit(parts)).toBe('feat!: breaking change');
    });
  });

  describe('parseConventionalCommit', () => {
    it('should parse a simple commit message', () => {
      const result = parseConventionalCommit('feat: add new feature');
      expect(result).toEqual({
        type: 'feat',
        scope: '',
        breaking: false,
        subject: 'add new feature',
        body: '',
      });
    });

    it('should parse commit with scope', () => {
      const result = parseConventionalCommit('fix(auth): fix login bug');
      expect(result).toEqual({
        type: 'fix',
        scope: 'auth',
        breaking: false,
        subject: 'fix login bug',
        body: '',
      });
    });

    it('should detect breaking change indicator', () => {
      const result = parseConventionalCommit('feat!: breaking change');
      expect(result).toEqual({
        type: 'feat',
        scope: '',
        breaking: true,
        subject: 'breaking change',
        body: '',
      });
    });

    it('should detect breaking change with scope', () => {
      const result = parseConventionalCommit('feat(api)!: breaking api change');
      expect(result).toEqual({
        type: 'feat',
        scope: 'api',
        breaking: true,
        subject: 'breaking api change',
        body: '',
      });
    });

    it('should extract body from multiline message', () => {
      const message = 'feat: add feature\n\nThis is the body\nwith multiple lines';
      const result = parseConventionalCommit(message);
      expect(result).toEqual({
        type: 'feat',
        scope: '',
        breaking: false,
        subject: 'add feature',
        body: 'This is the body\nwith multiple lines',
      });
    });

    it('should return null for non-conventional commit', () => {
      expect(parseConventionalCommit('random commit message')).toBeNull();
      expect(parseConventionalCommit('Add new feature')).toBeNull();
    });

    it('should return null for invalid commit type', () => {
      expect(parseConventionalCommit('invalid: some message')).toBeNull();
      expect(parseConventionalCommit('feature: some message')).toBeNull();
    });

    it('should return null for empty message', () => {
      expect(parseConventionalCommit('')).toBeNull();
      expect(parseConventionalCommit('   ')).toBeNull();
    });

    it('should handle all valid commit types', () => {
      const validTypes = COMMIT_TYPES.map((t) => t.value);
      for (const type of validTypes) {
        const result = parseConventionalCommit(`${type}: test message`);
        expect(result).not.toBeNull();
        expect(result?.type).toBe(type);
      }
    });

    it('should handle empty scope in parentheses', () => {
      const result = parseConventionalCommit('feat(): message');
      expect(result).toEqual({
        type: 'feat',
        scope: '',
        breaking: false,
        subject: 'message',
        body: '',
      });
    });

    it('should strip leading newlines from body', () => {
      const message = 'feat: subject\n\n\n\nbody starts here';
      const result = parseConventionalCommit(message);
      expect(result?.body).toBe('body starts here');
    });
  });

  describe('getEmptyCommitParts', () => {
    it('should return object with all fields initialized to defaults', () => {
      const result = getEmptyCommitParts();
      expect(result).toEqual({
        type: '',
        scope: '',
        breaking: false,
        subject: '',
        body: '',
      });
    });

    it('should return a new object each time', () => {
      const result1 = getEmptyCommitParts();
      const result2 = getEmptyCommitParts();
      expect(result1).not.toBe(result2);
    });
  });

  describe('COMMIT_TYPES', () => {
    it('should contain all expected commit types', () => {
      const expectedTypes = [
        'feat',
        'fix',
        'docs',
        'style',
        'refactor',
        'perf',
        'test',
        'build',
        'ci',
        'chore',
        'revert',
      ];
      const actualTypes = COMMIT_TYPES.map((t) => t.value);
      expect(actualTypes).toEqual(expectedTypes);
    });

    it('should have label equal to value for all types', () => {
      for (const type of COMMIT_TYPES) {
        expect(type.label).toBe(type.value);
      }
    });

    it('should have descriptionKey for all types', () => {
      for (const type of COMMIT_TYPES) {
        expect(type.descriptionKey).toBe(`lib.commitTypes.${type.value}`);
      }
    });
  });
});
