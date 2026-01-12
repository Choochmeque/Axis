import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useStagingStore } from './stagingStore';
import { stagingApi, repositoryApi, diffApi, commitApi } from '../services/api';

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
    discardAll: vi.fn(),
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
}));

describe('stagingStore', () => {
  beforeEach(() => {
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

  describe('loadStatus', () => {
    it('should load repository status', async () => {
      const mockStatus = {
        staged: [
          {
            path: 'staged.txt',
            status: 'added' as const,
            staged_status: 'added' as const,
            unstaged_status: null,
            is_conflict: false,
            old_path: null,
          },
        ],
        unstaged: [],
        untracked: [],
        conflicted: [],
      };

      vi.mocked(repositoryApi.getStatus).mockResolvedValue(mockStatus);

      await useStagingStore.getState().loadStatus();

      const state = useStagingStore.getState();
      expect(state.status).toEqual(mockStatus);
      expect(state.isLoadingStatus).toBe(false);
    });

    it('should set error on failure', async () => {
      vi.mocked(repositoryApi.getStatus).mockRejectedValue(new Error('Failed to get status'));

      await useStagingStore.getState().loadStatus();

      const state = useStagingStore.getState();
      expect(state.error).toBe('Error: Failed to get status');
      expect(state.isLoadingStatus).toBe(false);
    });
  });

  describe('selectFile', () => {
    it('should select a file and load its diff', async () => {
      const mockFile = {
        path: 'test.txt',
        status: 'modified' as const,
        staged_status: null,
        unstaged_status: 'modified' as const,
        is_conflict: false,
        old_path: null,
      };

      const mockDiff = {
        old_path: 'test.txt',
        new_path: 'test.txt',
        old_oid: 'abc123',
        new_oid: 'def456',
        status: 'modified' as const,
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
          status: 'modified',
          staged_status: null,
          unstaged_status: 'modified',
          is_conflict: false,
          old_path: null,
        },
        selectedFileDiff: {
          old_path: 'test.txt',
          new_path: 'test.txt',
          old_oid: null,
          new_oid: null,
          status: 'modified',
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
      vi.mocked(stagingApi.stageFile).mockResolvedValue(undefined);
      vi.mocked(repositoryApi.getStatus).mockResolvedValue(mockStatus);

      await useStagingStore.getState().stageFile('test.txt');

      expect(stagingApi.stageFile).toHaveBeenCalledWith('test.txt');
      expect(repositoryApi.getStatus).toHaveBeenCalled();
    });
  });

  describe('unstageFile', () => {
    it('should unstage a file and reload status', async () => {
      const mockStatus = { staged: [], unstaged: [], untracked: [], conflicted: [] };
      vi.mocked(stagingApi.unstageFile).mockResolvedValue(undefined);
      vi.mocked(repositoryApi.getStatus).mockResolvedValue(mockStatus);

      await useStagingStore.getState().unstageFile('test.txt');

      expect(stagingApi.unstageFile).toHaveBeenCalledWith('test.txt');
      expect(repositoryApi.getStatus).toHaveBeenCalled();
    });
  });

  describe('discardFile', () => {
    it('should discard file changes and reload status', async () => {
      const mockStatus = { staged: [], unstaged: [], untracked: [], conflicted: [] };
      vi.mocked(stagingApi.discardFile).mockResolvedValue(undefined);
      vi.mocked(repositoryApi.getStatus).mockResolvedValue(mockStatus);

      await useStagingStore.getState().discardFile('test.txt');

      expect(stagingApi.discardFile).toHaveBeenCalledWith('test.txt');
      expect(repositoryApi.getStatus).toHaveBeenCalled();
    });

    it('should clear selected file if it was the discarded one', async () => {
      const mockFile = {
        path: 'test.txt',
        status: 'modified' as const,
        staged_status: null,
        unstaged_status: 'modified' as const,
        is_conflict: false,
        old_path: null,
      };
      useStagingStore.setState({ selectedFile: mockFile });

      const mockStatus = { staged: [], unstaged: [], untracked: [], conflicted: [] };
      vi.mocked(stagingApi.discardFile).mockResolvedValue(undefined);
      vi.mocked(repositoryApi.getStatus).mockResolvedValue(mockStatus);

      await useStagingStore.getState().discardFile('test.txt');

      const state = useStagingStore.getState();
      expect(state.selectedFile).toBeNull();
    });
  });

  describe('stageHunk', () => {
    it('should stage a hunk and reload status', async () => {
      const mockStatus = { staged: [], unstaged: [], untracked: [], conflicted: [] };
      vi.mocked(stagingApi.stageHunk).mockResolvedValue(undefined);
      vi.mocked(repositoryApi.getStatus).mockResolvedValue(mockStatus);

      const patch =
        'diff --git a/test.txt b/test.txt\n--- a/test.txt\n+++ b/test.txt\n@@ -1,1 +1,2 @@\n line1\n+line2\n';
      await useStagingStore.getState().stageHunk(patch);

      expect(stagingApi.stageHunk).toHaveBeenCalledWith(patch);
      expect(repositoryApi.getStatus).toHaveBeenCalled();
    });

    it('should refresh diff for selected file after staging hunk', async () => {
      const mockFile = {
        path: 'test.txt',
        status: 'modified' as const,
        staged_status: null,
        unstaged_status: 'modified' as const,
        is_conflict: false,
        old_path: null,
      };
      const mockDiff = {
        old_path: 'test.txt',
        new_path: 'test.txt',
        old_oid: null,
        new_oid: null,
        status: 'modified' as const,
        binary: false,
        hunks: [],
        additions: 0,
        deletions: 0,
      };
      useStagingStore.setState({ selectedFile: mockFile, isSelectedFileStaged: false });

      const mockStatus = { staged: [], unstaged: [], untracked: [], conflicted: [] };
      vi.mocked(stagingApi.stageHunk).mockResolvedValue(undefined);
      vi.mocked(repositoryApi.getStatus).mockResolvedValue(mockStatus);
      vi.mocked(diffApi.getFile).mockResolvedValue(mockDiff);

      const patch =
        'diff --git a/test.txt b/test.txt\n--- a/test.txt\n+++ b/test.txt\n@@ -1,1 +1,2 @@\n line1\n+line2\n';
      await useStagingStore.getState().stageHunk(patch);

      expect(diffApi.getFile).toHaveBeenCalledWith('test.txt', false, expect.any(Object));
      expect(useStagingStore.getState().selectedFileDiff).toEqual(mockDiff);
    });

    it('should set error on failure', async () => {
      vi.mocked(stagingApi.stageHunk).mockRejectedValue(new Error('Failed to stage hunk'));

      const patch =
        'diff --git a/test.txt b/test.txt\n--- a/test.txt\n+++ b/test.txt\n@@ -1,1 +1,2 @@\n line1\n+line2\n';
      await useStagingStore.getState().stageHunk(patch);

      expect(useStagingStore.getState().error).toBe('Error: Failed to stage hunk');
    });
  });

  describe('unstageHunk', () => {
    it('should unstage a hunk and reload status', async () => {
      const mockStatus = { staged: [], unstaged: [], untracked: [], conflicted: [] };
      vi.mocked(stagingApi.unstageHunk).mockResolvedValue(undefined);
      vi.mocked(repositoryApi.getStatus).mockResolvedValue(mockStatus);

      const patch =
        'diff --git a/test.txt b/test.txt\n--- a/test.txt\n+++ b/test.txt\n@@ -1,1 +1,2 @@\n line1\n+line2\n';
      await useStagingStore.getState().unstageHunk(patch);

      expect(stagingApi.unstageHunk).toHaveBeenCalledWith(patch);
      expect(repositoryApi.getStatus).toHaveBeenCalled();
    });

    it('should refresh diff for selected file after unstaging hunk', async () => {
      const mockFile = {
        path: 'test.txt',
        status: 'modified' as const,
        staged_status: 'modified' as const,
        unstaged_status: null,
        is_conflict: false,
        old_path: null,
      };
      const mockDiff = {
        old_path: 'test.txt',
        new_path: 'test.txt',
        old_oid: null,
        new_oid: null,
        status: 'modified' as const,
        binary: false,
        hunks: [],
        additions: 0,
        deletions: 0,
      };
      useStagingStore.setState({ selectedFile: mockFile, isSelectedFileStaged: true });

      const mockStatus = { staged: [], unstaged: [], untracked: [], conflicted: [] };
      vi.mocked(stagingApi.unstageHunk).mockResolvedValue(undefined);
      vi.mocked(repositoryApi.getStatus).mockResolvedValue(mockStatus);
      vi.mocked(diffApi.getFile).mockResolvedValue(mockDiff);

      const patch =
        'diff --git a/test.txt b/test.txt\n--- a/test.txt\n+++ b/test.txt\n@@ -1,1 +1,2 @@\n line1\n+line2\n';
      await useStagingStore.getState().unstageHunk(patch);

      expect(diffApi.getFile).toHaveBeenCalledWith('test.txt', true, expect.any(Object));
      expect(useStagingStore.getState().selectedFileDiff).toEqual(mockDiff);
    });

    it('should set error on failure', async () => {
      vi.mocked(stagingApi.unstageHunk).mockRejectedValue(new Error('Failed to unstage hunk'));

      const patch =
        'diff --git a/test.txt b/test.txt\n--- a/test.txt\n+++ b/test.txt\n@@ -1,1 +1,2 @@\n line1\n+line2\n';
      await useStagingStore.getState().unstageHunk(patch);

      expect(useStagingStore.getState().error).toBe('Error: Failed to unstage hunk');
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
      expect(commitApi.create).toHaveBeenCalledWith('Test commit', undefined, undefined, undefined);
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
      expect(commitApi.amend).toHaveBeenCalledWith('Amended message');
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
});
