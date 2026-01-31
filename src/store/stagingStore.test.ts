import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useStagingStore } from './stagingStore';
import { stagingApi, repositoryApi, diffApi, commitApi, lfsApi } from '../services/api';
import { useSettingsStore } from '../store/settingsStore';

// Mock the API modules
vi.mock('../services/api', () => ({
  stagingApi: {
    stageFile: vi.fn(),
    stageFiles: vi.fn(),
    stageAll: vi.fn(),
    unstageFile: vi.fn(),
    unstageFiles: vi.fn(),
    unstageAll: vi.fn(),
    stageHunk: vi.fn(),
    unstageHunk: vi.fn(),
    discardFile: vi.fn(),
    discardUnstaged: vi.fn(),
    checkFilesForLfs: vi.fn(),
  },
  repositoryApi: {
    getStatus: vi.fn(),
  },
  diffApi: {
    getFile: vi.fn(),
  },
  commitApi: {
    create: vi.fn(),
    amend: vi.fn(),
  },
  lfsApi: {
    track: vi.fn(),
  },
}));

// Mock the settings store
vi.mock('../store/settingsStore', () => ({
  useSettingsStore: {
    getState: vi.fn(() => ({ settings: null })),
  },
}));

// Mock the dialog store
const mockOpenLargeBinaryWarningDialog = vi.fn();
vi.mock('../store/dialogStore', () => ({
  useDialogStore: {
    getState: vi.fn(() => ({
      openLargeBinaryWarningDialog: mockOpenLargeBinaryWarningDialog,
    })),
  },
}));

describe('stagingStore', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Reset store state before each test
    useStagingStore.setState({
      status: null,
      isLoadingStatus: false,
      selectedFile: null,
      selectedFileDiff: null,
      isSelectedFileStaged: false,
      isLoadingDiff: false,
      commitMessage: '',
      isAmending: false,
      isCommitting: false,
      error: null,
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('loadStatus', () => {
    it('should load repository status', async () => {
      const mockStatus = {
        staged: [
          {
            path: 'staged.txt',
            status: 'Added' as const,
            stagedStatus: 'Added' as const,
            unstagedStatus: null,
            isConflict: false,
            oldPath: null,
          },
        ],
        unstaged: [],
        untracked: [],
        conflicted: [],
      };

      vi.mocked(repositoryApi.getStatus).mockResolvedValue(mockStatus);

      useStagingStore.getState().loadStatus();
      await vi.runAllTimersAsync();

      const state = useStagingStore.getState();
      expect(state.status).toEqual(mockStatus);
      expect(state.isLoadingStatus).toBe(false);
    });

    it('should set error on failure', async () => {
      vi.mocked(repositoryApi.getStatus).mockRejectedValue(new Error('Failed to get status'));

      useStagingStore.getState().loadStatus();
      await vi.runAllTimersAsync();

      const state = useStagingStore.getState();
      expect(state.error).toBe('Failed to get status');
      expect(state.isLoadingStatus).toBe(false);
    });
  });

  describe('selectFile', () => {
    it('should select a file and load its diff', async () => {
      const mockFile = {
        path: 'test.txt',
        status: 'Modified' as const,
        stagedStatus: null,
        unstagedStatus: 'Modified' as const,
        isConflict: false,
        oldPath: null,
      };

      const mockDiff = {
        oldPath: 'test.txt',
        newPath: 'test.txt',
        oldOid: 'abc123',
        newOid: 'def456',
        status: 'Modified' as const,
        binary: false,
        hunks: [],
        additions: 5,
        deletions: 2,
      };

      vi.mocked(diffApi.getFile).mockResolvedValue(mockDiff);

      await useStagingStore.getState().selectFile(mockFile, false);

      const state = useStagingStore.getState();
      expect(state.selectedFile).toEqual(mockFile);
      expect(state.selectedFileDiff).toEqual(mockDiff);
      expect(state.isLoadingDiff).toBe(false);
    });

    it('should clear selection when null is passed', async () => {
      // Set initial selected file
      useStagingStore.setState({
        selectedFile: {
          path: 'test.txt',
          status: 'Modified',
          stagedStatus: null,
          unstagedStatus: 'Modified',
          isConflict: false,
          oldPath: null,
        },
        selectedFileDiff: {
          oldPath: 'test.txt',
          newPath: 'test.txt',
          oldOid: null,
          newOid: null,
          status: 'Modified',
          binary: false,
          hunks: [],
          additions: 0,
          deletions: 0,
        },
      });

      await useStagingStore.getState().selectFile(null, false);

      const state = useStagingStore.getState();
      expect(state.selectedFile).toBeNull();
      expect(state.selectedFileDiff).toBeNull();
    });
  });

  describe('stageFile', () => {
    it('should stage a file and reload status', async () => {
      const mockStatus = { staged: [], unstaged: [], untracked: [], conflicted: [] };
      vi.mocked(stagingApi.stageFile).mockResolvedValue(null);
      vi.mocked(repositoryApi.getStatus).mockResolvedValue(mockStatus);

      await useStagingStore.getState().stageFile('test.txt');
      await vi.runAllTimersAsync();

      expect(stagingApi.stageFile).toHaveBeenCalledWith('test.txt');
      expect(repositoryApi.getStatus).toHaveBeenCalled();
    });
  });

  describe('unstageFile', () => {
    it('should unstage a file and reload status', async () => {
      const mockStatus = { staged: [], unstaged: [], untracked: [], conflicted: [] };
      vi.mocked(stagingApi.unstageFile).mockResolvedValue(null);
      vi.mocked(repositoryApi.getStatus).mockResolvedValue(mockStatus);

      await useStagingStore.getState().unstageFile('test.txt');
      await vi.runAllTimersAsync();

      expect(stagingApi.unstageFile).toHaveBeenCalledWith('test.txt');
      expect(repositoryApi.getStatus).toHaveBeenCalled();
    });
  });

  describe('discardFile', () => {
    it('should discard file changes and reload status', async () => {
      const mockStatus = { staged: [], unstaged: [], untracked: [], conflicted: [] };
      vi.mocked(stagingApi.discardFile).mockResolvedValue(null);
      vi.mocked(repositoryApi.getStatus).mockResolvedValue(mockStatus);

      await useStagingStore.getState().discardFile('test.txt');
      await vi.runAllTimersAsync();

      expect(stagingApi.discardFile).toHaveBeenCalledWith('test.txt');
      expect(repositoryApi.getStatus).toHaveBeenCalled();
    });

    it('should clear selected file if it was the discarded one', async () => {
      const mockFile = {
        path: 'test.txt',
        status: 'Modified' as const,
        stagedStatus: null,
        unstagedStatus: 'Modified' as const,
        isConflict: false,
        oldPath: null,
      };
      useStagingStore.setState({ selectedFile: mockFile });

      const mockStatus = { staged: [], unstaged: [], untracked: [], conflicted: [] };
      vi.mocked(stagingApi.discardFile).mockResolvedValue(null);
      vi.mocked(repositoryApi.getStatus).mockResolvedValue(mockStatus);

      await useStagingStore.getState().discardFile('test.txt');
      await vi.runAllTimersAsync();

      const state = useStagingStore.getState();
      expect(state.selectedFile).toBeNull();
    });
  });

  describe('stageHunk', () => {
    it('should stage a hunk and reload status', async () => {
      const mockStatus = { staged: [], unstaged: [], untracked: [], conflicted: [] };
      vi.mocked(stagingApi.stageHunk).mockResolvedValue(null);
      vi.mocked(repositoryApi.getStatus).mockResolvedValue(mockStatus);

      const patch =
        'diff --git a/test.txt b/test.txt\n--- a/test.txt\n+++ b/test.txt\n@@ -1,1 +1,2 @@\n line1\n+line2\n';
      await useStagingStore.getState().stageHunk(patch);
      await vi.runAllTimersAsync();

      expect(stagingApi.stageHunk).toHaveBeenCalledWith(patch);
      expect(repositoryApi.getStatus).toHaveBeenCalled();
    });

    it('should refresh diff for selected file after staging hunk', async () => {
      const mockFile = {
        path: 'test.txt',
        status: 'Modified' as const,
        stagedStatus: null,
        unstagedStatus: 'Modified' as const,
        isConflict: false,
        oldPath: null,
      };
      const mockDiff = {
        oldPath: 'test.txt',
        newPath: 'test.txt',
        oldOid: null,
        newOid: null,
        status: 'Modified' as const,
        binary: false,
        hunks: [],
        additions: 0,
        deletions: 0,
      };
      useStagingStore.setState({ selectedFile: mockFile, isSelectedFileStaged: false });

      const mockStatus = { staged: [], unstaged: [], untracked: [], conflicted: [] };
      vi.mocked(stagingApi.stageHunk).mockResolvedValue(null);
      vi.mocked(repositoryApi.getStatus).mockResolvedValue(mockStatus);
      vi.mocked(diffApi.getFile).mockResolvedValue(mockDiff);

      const patch =
        'diff --git a/test.txt b/test.txt\n--- a/test.txt\n+++ b/test.txt\n@@ -1,1 +1,2 @@\n line1\n+line2\n';
      await useStagingStore.getState().stageHunk(patch);
      await vi.runAllTimersAsync();

      expect(diffApi.getFile).toHaveBeenCalledWith('test.txt', false, expect.any(Object));
      expect(useStagingStore.getState().selectedFileDiff).toEqual(mockDiff);
    });

    it('should set error on failure', async () => {
      vi.mocked(stagingApi.stageHunk).mockRejectedValue(new Error('Failed to stage hunk'));

      const patch =
        'diff --git a/test.txt b/test.txt\n--- a/test.txt\n+++ b/test.txt\n@@ -1,1 +1,2 @@\n line1\n+line2\n';
      await useStagingStore.getState().stageHunk(patch);

      expect(useStagingStore.getState().error).toBe('Failed to stage hunk');
    });
  });

  describe('unstageHunk', () => {
    it('should unstage a hunk and reload status', async () => {
      const mockStatus = { staged: [], unstaged: [], untracked: [], conflicted: [] };
      vi.mocked(stagingApi.unstageHunk).mockResolvedValue(null);
      vi.mocked(repositoryApi.getStatus).mockResolvedValue(mockStatus);

      const patch =
        'diff --git a/test.txt b/test.txt\n--- a/test.txt\n+++ b/test.txt\n@@ -1,1 +1,2 @@\n line1\n+line2\n';
      await useStagingStore.getState().unstageHunk(patch);
      await vi.runAllTimersAsync();

      expect(stagingApi.unstageHunk).toHaveBeenCalledWith(patch);
      expect(repositoryApi.getStatus).toHaveBeenCalled();
    });

    it('should refresh diff for selected file after unstaging hunk', async () => {
      const mockFile = {
        path: 'test.txt',
        status: 'Modified' as const,
        stagedStatus: 'Modified' as const,
        unstagedStatus: null,
        isConflict: false,
        oldPath: null,
      };
      const mockDiff = {
        oldPath: 'test.txt',
        newPath: 'test.txt',
        oldOid: null,
        newOid: null,
        status: 'Modified' as const,
        binary: false,
        hunks: [],
        additions: 0,
        deletions: 0,
      };
      useStagingStore.setState({ selectedFile: mockFile, isSelectedFileStaged: true });

      const mockStatus = { staged: [], unstaged: [], untracked: [], conflicted: [] };
      vi.mocked(stagingApi.unstageHunk).mockResolvedValue(null);
      vi.mocked(repositoryApi.getStatus).mockResolvedValue(mockStatus);
      vi.mocked(diffApi.getFile).mockResolvedValue(mockDiff);

      const patch =
        'diff --git a/test.txt b/test.txt\n--- a/test.txt\n+++ b/test.txt\n@@ -1,1 +1,2 @@\n line1\n+line2\n';
      await useStagingStore.getState().unstageHunk(patch);
      await vi.runAllTimersAsync();

      expect(diffApi.getFile).toHaveBeenCalledWith('test.txt', true, expect.any(Object));
      expect(useStagingStore.getState().selectedFileDiff).toEqual(mockDiff);
    });

    it('should set error on failure', async () => {
      vi.mocked(stagingApi.unstageHunk).mockRejectedValue(new Error('Failed to unstage hunk'));

      const patch =
        'diff --git a/test.txt b/test.txt\n--- a/test.txt\n+++ b/test.txt\n@@ -1,1 +1,2 @@\n line1\n+line2\n';
      await useStagingStore.getState().unstageHunk(patch);

      expect(useStagingStore.getState().error).toBe('Failed to unstage hunk');
    });
  });

  describe('commitMessage', () => {
    it('should update commit message', () => {
      useStagingStore.getState().setCommitMessage('Test commit message');

      expect(useStagingStore.getState().commitMessage).toBe('Test commit message');
    });
  });

  describe('createCommit', () => {
    it('should create a commit and reset state', async () => {
      useStagingStore.setState({ commitMessage: 'Test commit' });
      const mockStatus = { staged: [], unstaged: [], untracked: [], conflicted: [] };

      vi.mocked(commitApi.create).mockResolvedValue('abc123');
      vi.mocked(repositoryApi.getStatus).mockResolvedValue(mockStatus);

      const oid = await useStagingStore.getState().createCommit();

      expect(oid).toBe('abc123');
      expect(commitApi.create).toHaveBeenCalledWith(
        'Test commit',
        undefined,
        undefined,
        undefined,
        undefined
      );
      expect(useStagingStore.getState().commitMessage).toBe('');
      expect(useStagingStore.getState().isCommitting).toBe(false);
    });

    it('should throw error when commit message is empty', async () => {
      useStagingStore.setState({ commitMessage: '' });

      await expect(useStagingStore.getState().createCommit()).rejects.toThrow(
        'Commit message is required'
      );

      expect(useStagingStore.getState().error).toBe('Commit message is required');
    });
  });

  describe('amendCommit', () => {
    it('should amend a commit', async () => {
      useStagingStore.setState({ commitMessage: 'Amended message', isAmending: true });
      const mockStatus = { staged: [], unstaged: [], untracked: [], conflicted: [] };

      vi.mocked(commitApi.amend).mockResolvedValue('def456');
      vi.mocked(repositoryApi.getStatus).mockResolvedValue(mockStatus);

      const oid = await useStagingStore.getState().amendCommit();

      expect(oid).toBe('def456');
      expect(commitApi.amend).toHaveBeenCalledWith('Amended message', undefined);
      expect(useStagingStore.getState().commitMessage).toBe('');
      expect(useStagingStore.getState().isAmending).toBe(false);
    });
  });

  describe('clearError', () => {
    it('should clear error state', () => {
      useStagingStore.setState({ error: 'Some error' });

      useStagingStore.getState().clearError();

      expect(useStagingStore.getState().error).toBeNull();
    });
  });

  describe('stageFiles', () => {
    it('should stage multiple files and reload status', async () => {
      const mockStatus = { staged: [], unstaged: [], untracked: [], conflicted: [] };
      vi.mocked(stagingApi.stageFiles).mockResolvedValue(null);
      vi.mocked(repositoryApi.getStatus).mockResolvedValue(mockStatus);

      await useStagingStore.getState().stageFiles(['file1.txt', 'file2.txt']);
      await vi.runAllTimersAsync();

      expect(stagingApi.stageFiles).toHaveBeenCalledWith(['file1.txt', 'file2.txt']);
      expect(repositoryApi.getStatus).toHaveBeenCalled();
    });

    it('should set error on failure', async () => {
      vi.mocked(stagingApi.stageFiles).mockRejectedValue(new Error('Failed to stage files'));

      await useStagingStore.getState().stageFiles(['file1.txt']);

      expect(useStagingStore.getState().error).toBe('Failed to stage files');
    });
  });

  describe('stageAll', () => {
    it('should stage all files and reload status', async () => {
      const mockStatus = { staged: [], unstaged: [], untracked: [], conflicted: [] };
      vi.mocked(stagingApi.stageAll).mockResolvedValue(null);
      vi.mocked(repositoryApi.getStatus).mockResolvedValue(mockStatus);

      await useStagingStore.getState().stageAll();
      await vi.runAllTimersAsync();

      expect(stagingApi.stageAll).toHaveBeenCalled();
      expect(repositoryApi.getStatus).toHaveBeenCalled();
    });

    it('should set error on failure', async () => {
      vi.mocked(stagingApi.stageAll).mockRejectedValue(new Error('Failed to stage all'));

      await useStagingStore.getState().stageAll();

      expect(useStagingStore.getState().error).toBe('Failed to stage all');
    });
  });

  describe('unstageFiles', () => {
    it('should unstage multiple files and reload status', async () => {
      const mockStatus = { staged: [], unstaged: [], untracked: [], conflicted: [] };
      vi.mocked(stagingApi.unstageFiles).mockResolvedValue(null);
      vi.mocked(repositoryApi.getStatus).mockResolvedValue(mockStatus);

      await useStagingStore.getState().unstageFiles(['file1.txt', 'file2.txt']);
      await vi.runAllTimersAsync();

      expect(stagingApi.unstageFiles).toHaveBeenCalledWith(['file1.txt', 'file2.txt']);
      expect(repositoryApi.getStatus).toHaveBeenCalled();
    });

    it('should set error on failure', async () => {
      vi.mocked(stagingApi.unstageFiles).mockRejectedValue(new Error('Failed to unstage files'));

      await useStagingStore.getState().unstageFiles(['file1.txt']);

      expect(useStagingStore.getState().error).toBe('Failed to unstage files');
    });
  });

  describe('unstageAll', () => {
    it('should unstage all files and reload status', async () => {
      const mockStatus = { staged: [], unstaged: [], untracked: [], conflicted: [] };
      vi.mocked(stagingApi.unstageAll).mockResolvedValue(null);
      vi.mocked(repositoryApi.getStatus).mockResolvedValue(mockStatus);

      await useStagingStore.getState().unstageAll();
      await vi.runAllTimersAsync();

      expect(stagingApi.unstageAll).toHaveBeenCalled();
      expect(repositoryApi.getStatus).toHaveBeenCalled();
    });

    it('should set error on failure', async () => {
      vi.mocked(stagingApi.unstageAll).mockRejectedValue(new Error('Failed to unstage all'));

      await useStagingStore.getState().unstageAll();

      expect(useStagingStore.getState().error).toBe('Failed to unstage all');
    });
  });

  describe('discardUnstaged', () => {
    it('should discard all unstaged changes and reload status', async () => {
      const mockStatus = { staged: [], unstaged: [], untracked: [], conflicted: [] };
      vi.mocked(stagingApi.discardUnstaged).mockResolvedValue(null);
      vi.mocked(repositoryApi.getStatus).mockResolvedValue(mockStatus);

      await useStagingStore.getState().discardUnstaged();
      await vi.runAllTimersAsync();

      expect(stagingApi.discardUnstaged).toHaveBeenCalled();
      expect(repositoryApi.getStatus).toHaveBeenCalled();
    });

    it('should clear selected file after discard', async () => {
      const mockFile = {
        path: 'test.txt',
        status: 'Modified' as const,
        stagedStatus: null,
        unstagedStatus: 'Modified' as const,
        isConflict: false,
        oldPath: null,
      };
      useStagingStore.setState({ selectedFile: mockFile });

      const mockStatus = { staged: [], unstaged: [], untracked: [], conflicted: [] };
      vi.mocked(stagingApi.discardUnstaged).mockResolvedValue(null);
      vi.mocked(repositoryApi.getStatus).mockResolvedValue(mockStatus);

      await useStagingStore.getState().discardUnstaged();
      await vi.runAllTimersAsync();

      expect(useStagingStore.getState().selectedFile).toBeNull();
    });

    it('should set error on failure', async () => {
      vi.mocked(stagingApi.discardUnstaged).mockRejectedValue(new Error('Failed to discard'));

      await useStagingStore.getState().discardUnstaged();

      expect(useStagingStore.getState().error).toBe('Failed to discard');
    });
  });

  describe('setIsAmending', () => {
    it('should update isAmending state', () => {
      useStagingStore.getState().setIsAmending(true);

      expect(useStagingStore.getState().isAmending).toBe(true);
    });
  });

  describe('setPushAfterCommit', () => {
    it('should update pushAfterCommit state', () => {
      useStagingStore.getState().setPushAfterCommit(true);

      expect(useStagingStore.getState().pushAfterCommit).toBe(true);
    });
  });

  describe('setStructuredMode', () => {
    it('should update structuredMode state', () => {
      useStagingStore.getState().setStructuredMode(true);

      expect(useStagingStore.getState().structuredMode).toBe(true);
    });
  });

  describe('setCommitParts', () => {
    it('should update commitParts state', () => {
      const parts = {
        type: 'feat' as const,
        scope: 'core',
        subject: 'test',
        body: '',
        breaking: false,
      };
      useStagingStore.getState().setCommitParts(parts);

      expect(useStagingStore.getState().commitParts).toEqual(parts);
    });
  });

  describe('cache management', () => {
    it('should save state to cache', () => {
      useStagingStore.setState({
        commitMessage: 'Test message',
        isAmending: true,
        pushAfterCommit: true,
        structuredMode: true,
        commitParts: {
          type: 'feat' as const,
          scope: '',
          subject: 'test',
          body: '',
          breaking: false,
        },
      });

      useStagingStore.getState().saveToCache('/path/to/repo');

      expect(useStagingStore.getState().repoCache.has('/path/to/repo')).toBe(true);
    });

    it('should restore state from cache', () => {
      const cached = {
        commitMessage: 'Cached message',
        isAmending: true,
        pushAfterCommit: true,
        structuredMode: true,
        commitParts: {
          type: 'fix' as const,
          scope: 'ui',
          subject: 'bug',
          body: '',
          breaking: false,
        },
      };
      const cache = new Map();
      cache.set('/path/to/repo', cached);
      useStagingStore.setState({ repoCache: cache });

      const result = useStagingStore.getState().restoreFromCache('/path/to/repo');

      expect(result).toBe(true);
      expect(useStagingStore.getState().commitMessage).toBe('Cached message');
      expect(useStagingStore.getState().isAmending).toBe(true);
      expect(useStagingStore.getState().structuredMode).toBe(true);
    });

    it('should return false and reset when no cache exists', () => {
      useStagingStore.setState({
        commitMessage: 'Some message',
        isAmending: true,
      });

      const result = useStagingStore.getState().restoreFromCache('/nonexistent');

      expect(result).toBe(false);
      expect(useStagingStore.getState().commitMessage).toBe('');
      expect(useStagingStore.getState().isAmending).toBe(false);
    });

    it('should clear cache for repo', () => {
      const cache = new Map();
      cache.set('/path/to/repo', { commitMessage: 'test' });
      useStagingStore.setState({ repoCache: cache });

      useStagingStore.getState().clearCache('/path/to/repo');

      expect(useStagingStore.getState().repoCache.has('/path/to/repo')).toBe(false);
    });
  });

  describe('reset', () => {
    it('should reset store to initial state', () => {
      useStagingStore.setState({
        status: { staged: [], unstaged: [], untracked: [], conflicted: [] },
        commitMessage: 'Test',
        isAmending: true,
        error: 'Error',
      });

      useStagingStore.getState().reset();

      const state = useStagingStore.getState();
      expect(state.status).toBeNull();
      expect(state.commitMessage).toBe('');
      expect(state.isAmending).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('stageFile error handling', () => {
    it('should set error on failure', async () => {
      vi.mocked(stagingApi.stageFile).mockRejectedValue(new Error('Failed to stage'));

      await useStagingStore.getState().stageFile('test.txt');

      expect(useStagingStore.getState().error).toBe('Failed to stage');
    });
  });

  describe('unstageFile error handling', () => {
    it('should set error on failure', async () => {
      vi.mocked(stagingApi.unstageFile).mockRejectedValue(new Error('Failed to unstage'));

      await useStagingStore.getState().unstageFile('test.txt');

      expect(useStagingStore.getState().error).toBe('Failed to unstage');
    });
  });

  describe('discardFile error handling', () => {
    it('should set error on failure', async () => {
      vi.mocked(stagingApi.discardFile).mockRejectedValue(new Error('Failed to discard'));

      await useStagingStore.getState().discardFile('test.txt');

      expect(useStagingStore.getState().error).toBe('Failed to discard');
    });
  });

  describe('selectFile error handling', () => {
    it('should set error on failure', async () => {
      const mockFile = {
        path: 'test.txt',
        status: 'Modified' as const,
        stagedStatus: null,
        unstagedStatus: 'Modified' as const,
        isConflict: false,
        oldPath: null,
      };
      vi.mocked(diffApi.getFile).mockRejectedValue(new Error('Failed to load diff'));

      await useStagingStore.getState().selectFile(mockFile, false);

      expect(useStagingStore.getState().error).toBe('Failed to load diff');
      expect(useStagingStore.getState().selectedFileDiff).toBeNull();
    });
  });

  describe('amendCommit error handling', () => {
    it('should set error on failure', async () => {
      useStagingStore.setState({ commitMessage: 'Test', isAmending: true });
      vi.mocked(commitApi.amend).mockRejectedValue(new Error('Failed to amend'));

      await expect(useStagingStore.getState().amendCommit()).rejects.toThrow();

      expect(useStagingStore.getState().error).toBe('Failed to amend');
      expect(useStagingStore.getState().isCommitting).toBe(false);
    });
  });

  describe('createCommit error handling', () => {
    it('should set error on failure', async () => {
      useStagingStore.setState({ commitMessage: 'Test commit' });
      vi.mocked(commitApi.create).mockRejectedValue(new Error('Failed to create commit'));

      await expect(useStagingStore.getState().createCommit()).rejects.toThrow();

      expect(useStagingStore.getState().error).toBe('Failed to create commit');
      expect(useStagingStore.getState().isCommitting).toBe(false);
    });
  });

  describe('createCommit with options', () => {
    it('should pass sign option to API', async () => {
      useStagingStore.setState({ commitMessage: 'Test commit' });
      const mockStatus = { staged: [], unstaged: [], untracked: [], conflicted: [] };

      vi.mocked(commitApi.create).mockResolvedValue('abc123');
      vi.mocked(repositoryApi.getStatus).mockResolvedValue(mockStatus);

      await useStagingStore.getState().createCommit(true, false);

      expect(commitApi.create).toHaveBeenCalledWith(
        'Test commit',
        undefined,
        undefined,
        true,
        false
      );
    });

    it('should pass bypassHooks option to API', async () => {
      useStagingStore.setState({ commitMessage: 'Test commit' });
      const mockStatus = { staged: [], unstaged: [], untracked: [], conflicted: [] };

      vi.mocked(commitApi.create).mockResolvedValue('abc123');
      vi.mocked(repositoryApi.getStatus).mockResolvedValue(mockStatus);

      await useStagingStore.getState().createCommit(false, true);

      expect(commitApi.create).toHaveBeenCalledWith(
        'Test commit',
        undefined,
        undefined,
        false,
        true
      );
    });
  });

  describe('amendCommit with options', () => {
    it('should pass bypassHooks option to API', async () => {
      useStagingStore.setState({ commitMessage: 'Amended', isAmending: true });
      const mockStatus = { staged: [], unstaged: [], untracked: [], conflicted: [] };

      vi.mocked(commitApi.amend).mockResolvedValue('def456');
      vi.mocked(repositoryApi.getStatus).mockResolvedValue(mockStatus);

      await useStagingStore.getState().amendCommit(true);

      expect(commitApi.amend).toHaveBeenCalledWith('Amended', true);
    });
  });

  describe('LFS check before staging', () => {
    const mockLfsCheckResult = {
      files: [
        {
          path: 'assets/image.psd',
          size: 15728640,
          isBinary: true,
          isLfsTracked: false,
          suggestedPattern: '*.psd',
        },
      ],
      lfsInstalled: true,
      lfsInitialized: true,
    };

    const enableLfsSettings = () => {
      vi.mocked(useSettingsStore.getState).mockReturnValue({
        settings: {
          largeBinaryWarningEnabled: true,
          largeBinaryThreshold: 10485760,
        },
      } as ReturnType<typeof useSettingsStore.getState>);
    };

    const disableLfsSettings = () => {
      vi.mocked(useSettingsStore.getState).mockReturnValue({
        settings: {
          largeBinaryWarningEnabled: false,
          largeBinaryThreshold: 10485760,
        },
      } as ReturnType<typeof useSettingsStore.getState>);
    };

    it('should skip LFS check when warning is disabled in settings', async () => {
      disableLfsSettings();
      const mockStatus = { staged: [], unstaged: [], untracked: [], conflicted: [] };
      vi.mocked(stagingApi.stageFile).mockResolvedValue(null);
      vi.mocked(repositoryApi.getStatus).mockResolvedValue(mockStatus);

      await useStagingStore.getState().stageFile('test.txt');
      await vi.runAllTimersAsync();

      expect(stagingApi.checkFilesForLfs).not.toHaveBeenCalled();
      expect(stagingApi.stageFile).toHaveBeenCalledWith('test.txt');
    });

    it('should skip LFS check when settings are null', async () => {
      vi.mocked(useSettingsStore.getState).mockReturnValue({
        settings: null,
      } as ReturnType<typeof useSettingsStore.getState>);

      const mockStatus = { staged: [], unstaged: [], untracked: [], conflicted: [] };
      vi.mocked(stagingApi.stageFile).mockResolvedValue(null);
      vi.mocked(repositoryApi.getStatus).mockResolvedValue(mockStatus);

      await useStagingStore.getState().stageFile('test.txt');
      await vi.runAllTimersAsync();

      expect(stagingApi.checkFilesForLfs).not.toHaveBeenCalled();
      expect(stagingApi.stageFile).toHaveBeenCalledWith('test.txt');
    });

    it('should proceed with staging when no large binary files found', async () => {
      enableLfsSettings();
      const emptyResult = { files: [], lfsInstalled: true, lfsInitialized: true };
      vi.mocked(stagingApi.checkFilesForLfs).mockResolvedValue(emptyResult);

      const mockStatus = { staged: [], unstaged: [], untracked: [], conflicted: [] };
      vi.mocked(stagingApi.stageFile).mockResolvedValue(null);
      vi.mocked(repositoryApi.getStatus).mockResolvedValue(mockStatus);

      await useStagingStore.getState().stageFile('test.txt');
      await vi.runAllTimersAsync();

      expect(stagingApi.checkFilesForLfs).toHaveBeenCalledWith(['test.txt'], 10485760);
      expect(stagingApi.stageFile).toHaveBeenCalledWith('test.txt');
    });

    it('should open warning dialog and pause staging when large binary files found', async () => {
      enableLfsSettings();
      vi.mocked(stagingApi.checkFilesForLfs).mockResolvedValue(mockLfsCheckResult);

      await useStagingStore.getState().stageFile('assets/image.psd');

      expect(mockOpenLargeBinaryWarningDialog).toHaveBeenCalledWith(
        expect.objectContaining({
          files: mockLfsCheckResult.files,
          pendingPaths: ['assets/image.psd'],
          lfsInstalled: true,
          lfsInitialized: true,
        })
      );
      // Staging should NOT have been called directly
      expect(stagingApi.stageFile).not.toHaveBeenCalled();
    });

    it('should proceed with staging on LFS check API error', async () => {
      enableLfsSettings();
      vi.mocked(stagingApi.checkFilesForLfs).mockRejectedValue(new Error('API error'));

      const mockStatus = { staged: [], unstaged: [], untracked: [], conflicted: [] };
      vi.mocked(stagingApi.stageFile).mockResolvedValue(null);
      vi.mocked(repositoryApi.getStatus).mockResolvedValue(mockStatus);

      await useStagingStore.getState().stageFile('test.txt');
      await vi.runAllTimersAsync();

      // Should still stage despite the error
      expect(stagingApi.stageFile).toHaveBeenCalledWith('test.txt');
    });

    it('should check LFS for stageFiles with multiple paths', async () => {
      enableLfsSettings();
      const emptyResult = { files: [], lfsInstalled: true, lfsInitialized: true };
      vi.mocked(stagingApi.checkFilesForLfs).mockResolvedValue(emptyResult);

      const mockStatus = { staged: [], unstaged: [], untracked: [], conflicted: [] };
      vi.mocked(stagingApi.stageFiles).mockResolvedValue(null);
      vi.mocked(repositoryApi.getStatus).mockResolvedValue(mockStatus);

      await useStagingStore.getState().stageFiles(['file1.txt', 'file2.txt']);
      await vi.runAllTimersAsync();

      expect(stagingApi.checkFilesForLfs).toHaveBeenCalledWith(
        ['file1.txt', 'file2.txt'],
        10485760
      );
      expect(stagingApi.stageFiles).toHaveBeenCalledWith(['file1.txt', 'file2.txt']);
    });

    it('should pause stageFiles when large binary files found', async () => {
      enableLfsSettings();
      vi.mocked(stagingApi.checkFilesForLfs).mockResolvedValue(mockLfsCheckResult);

      await useStagingStore.getState().stageFiles(['assets/image.psd']);

      expect(mockOpenLargeBinaryWarningDialog).toHaveBeenCalled();
      expect(stagingApi.stageFiles).not.toHaveBeenCalled();
    });

    it('should check LFS for stageAll using unstaged and untracked paths', async () => {
      enableLfsSettings();
      useStagingStore.setState({
        status: {
          staged: [],
          unstaged: [
            {
              path: 'modified.txt',
              status: 'Modified',
              stagedStatus: null,
              unstagedStatus: 'Modified',
              isConflict: false,
              oldPath: null,
            },
          ],
          untracked: [
            {
              path: 'new.bin',
              status: 'Untracked',
              stagedStatus: null,
              unstagedStatus: 'Untracked',
              isConflict: false,
              oldPath: null,
            },
          ],
          conflicted: [],
        },
      });

      const emptyResult = { files: [], lfsInstalled: true, lfsInitialized: true };
      vi.mocked(stagingApi.checkFilesForLfs).mockResolvedValue(emptyResult);

      const mockStatus = { staged: [], unstaged: [], untracked: [], conflicted: [] };
      vi.mocked(stagingApi.stageAll).mockResolvedValue(null);
      vi.mocked(repositoryApi.getStatus).mockResolvedValue(mockStatus);

      await useStagingStore.getState().stageAll();
      await vi.runAllTimersAsync();

      expect(stagingApi.checkFilesForLfs).toHaveBeenCalledWith(
        ['modified.txt', 'new.bin'],
        10485760
      );
      expect(stagingApi.stageAll).toHaveBeenCalled();
    });

    it('should execute onStageAnyway callback when dialog confirms', async () => {
      enableLfsSettings();
      vi.mocked(stagingApi.checkFilesForLfs).mockResolvedValue(mockLfsCheckResult);

      const mockStatus = { staged: [], unstaged: [], untracked: [], conflicted: [] };
      vi.mocked(stagingApi.stageFile).mockResolvedValue(null);
      vi.mocked(repositoryApi.getStatus).mockResolvedValue(mockStatus);

      await useStagingStore.getState().stageFile('assets/image.psd');

      // Get the onStageAnyway callback that was passed to the dialog
      const dialogCall = mockOpenLargeBinaryWarningDialog.mock.calls[0][0];
      expect(dialogCall.onStageAnyway).toBeDefined();

      // Simulate clicking "Stage Anyway"
      await dialogCall.onStageAnyway();
      await vi.runAllTimersAsync();

      expect(stagingApi.stageFile).toHaveBeenCalledWith('assets/image.psd');
    });

    it('should execute onTrackWithLfs callback with LFS tracking', async () => {
      enableLfsSettings();
      vi.mocked(stagingApi.checkFilesForLfs).mockResolvedValue(mockLfsCheckResult);

      const mockStatus = { staged: [], unstaged: [], untracked: [], conflicted: [] };
      vi.mocked(stagingApi.stageFile).mockResolvedValue(null);
      vi.mocked(repositoryApi.getStatus).mockResolvedValue(mockStatus);
      vi.mocked(lfsApi.track).mockResolvedValue({
        success: true,
        message: 'Tracking *.psd',
        affectedFiles: [],
      });

      await useStagingStore.getState().stageFile('assets/image.psd');

      // Get the onTrackWithLfs callback that was passed to the dialog
      const dialogCall = mockOpenLargeBinaryWarningDialog.mock.calls[0][0];
      expect(dialogCall.onTrackWithLfs).toBeDefined();

      // Simulate clicking "Track with LFS"
      await dialogCall.onTrackWithLfs(['*.psd']);
      await vi.runAllTimersAsync();

      expect(lfsApi.track).toHaveBeenCalledWith('*.psd');
      expect(stagingApi.stageFile).toHaveBeenCalledWith('assets/image.psd');
    });
  });
});
