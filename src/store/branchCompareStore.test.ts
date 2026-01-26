import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useBranchCompareStore } from './branchCompareStore';
import type { BranchCompareResult, FileDiff, Commit } from '@/types';

vi.mock('@/services/api', () => ({
  branchApi: {
    compare: vi.fn(),
  },
  diffApi: {
    getCommit: vi.fn(),
  },
}));

vi.mock('@/lib/errorUtils', () => ({
  getErrorMessage: (err: unknown) => (err instanceof Error ? err.message : String(err)),
}));

import { branchApi, diffApi } from '@/services/api';

describe('branchCompareStore', () => {
  const mockFileDiff: FileDiff = {
    path: 'src/test.ts',
    oldPath: null,
    status: 'Modified',
    additions: 10,
    deletions: 5,
    isBinary: false,
    hunks: [],
  };

  const mockCommit: Commit = {
    oid: 'abc123',
    shortOid: 'abc123',
    summary: 'Test commit',
    body: null,
    time: Date.now(),
    author: { name: 'Test', email: 'test@example.com' },
    committer: { name: 'Test', email: 'test@example.com' },
    parents: [],
    refs: [],
    isHead: false,
    isMerge: false,
    signature: null,
    gpgStatus: null,
  };

  const mockCompareResult: BranchCompareResult = {
    baseRef: 'main',
    compareRef: 'feature',
    aheadCount: 2,
    behindCount: 1,
    files: [mockFileDiff],
    commits: [mockCommit],
  };

  beforeEach(() => {
    vi.useFakeTimers();
    useBranchCompareStore.setState({
      compareResult: null,
      isLoading: false,
      error: null,
      activeTab: 'commits',
      selectedCommit: null,
      selectedCommitFiles: [],
      selectedFile: null,
      isLoadingFiles: false,
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('compare', () => {
    it('should load comparison result', async () => {
      vi.mocked(branchApi.compare).mockResolvedValue(mockCompareResult);

      await useBranchCompareStore.getState().compare('main', 'feature');

      expect(branchApi.compare).toHaveBeenCalledWith('main', 'feature');
      const state = useBranchCompareStore.getState();
      expect(state.compareResult).toEqual(mockCompareResult);
      expect(state.isLoading).toBe(false);
      expect(state.selectedFile).toEqual(mockFileDiff);
    });

    it('should set loading state during fetch', async () => {
      let resolvePromise: (value: BranchCompareResult) => void;
      const pendingPromise = new Promise<BranchCompareResult>((resolve) => {
        resolvePromise = resolve;
      });
      vi.mocked(branchApi.compare).mockReturnValue(pendingPromise);

      const comparePromise = useBranchCompareStore.getState().compare('main', 'feature');

      expect(useBranchCompareStore.getState().isLoading).toBe(true);

      resolvePromise!(mockCompareResult);
      await comparePromise;

      expect(useBranchCompareStore.getState().isLoading).toBe(false);
    });

    it('should handle errors', async () => {
      vi.mocked(branchApi.compare).mockRejectedValue(new Error('Compare failed'));

      await useBranchCompareStore.getState().compare('main', 'feature');

      const state = useBranchCompareStore.getState();
      expect(state.error).toBe('Compare failed');
      expect(state.isLoading).toBe(false);
      expect(state.compareResult).toBeNull();
    });

    it('should auto-select first file when available', async () => {
      vi.mocked(branchApi.compare).mockResolvedValue(mockCompareResult);

      await useBranchCompareStore.getState().compare('main', 'feature');

      expect(useBranchCompareStore.getState().selectedFile).toEqual(mockFileDiff);
    });

    it('should not auto-select file when no files', async () => {
      const emptyResult = { ...mockCompareResult, files: [] };
      vi.mocked(branchApi.compare).mockResolvedValue(emptyResult);

      await useBranchCompareStore.getState().compare('main', 'feature');

      expect(useBranchCompareStore.getState().selectedFile).toBeNull();
    });
  });

  describe('setActiveTab', () => {
    it('should update active tab', () => {
      useBranchCompareStore.getState().setActiveTab('files');

      expect(useBranchCompareStore.getState().activeTab).toBe('files');
    });

    it('should clear commit selection when switching to files tab', () => {
      useBranchCompareStore.setState({
        compareResult: mockCompareResult,
        selectedCommit: mockCommit,
        selectedCommitFiles: [mockFileDiff],
      });

      useBranchCompareStore.getState().setActiveTab('files');

      const state = useBranchCompareStore.getState();
      expect(state.selectedCommit).toBeNull();
      expect(state.selectedCommitFiles).toHaveLength(0);
      expect(state.selectedFile).toEqual(mockFileDiff);
    });

    it('should not affect state when switching to commits tab', () => {
      useBranchCompareStore.setState({
        selectedCommit: mockCommit,
        selectedCommitFiles: [mockFileDiff],
      });

      useBranchCompareStore.getState().setActiveTab('commits');

      expect(useBranchCompareStore.getState().selectedCommit).toEqual(mockCommit);
    });
  });

  describe('selectCommit', () => {
    it('should load files for selected commit', async () => {
      vi.mocked(diffApi.getCommit).mockResolvedValue([mockFileDiff]);

      await useBranchCompareStore.getState().selectCommit(mockCommit);

      expect(diffApi.getCommit).toHaveBeenCalledWith(mockCommit.oid);
      const state = useBranchCompareStore.getState();
      expect(state.selectedCommit).toEqual(mockCommit);
      expect(state.selectedCommitFiles).toHaveLength(1);
      expect(state.selectedFile).toEqual(mockFileDiff);
      expect(state.isLoadingFiles).toBe(false);
    });

    it('should clear selection when passing null', async () => {
      useBranchCompareStore.setState({
        selectedCommit: mockCommit,
        selectedCommitFiles: [mockFileDiff],
        selectedFile: mockFileDiff,
      });

      await useBranchCompareStore.getState().selectCommit(null);

      const state = useBranchCompareStore.getState();
      expect(state.selectedCommit).toBeNull();
      expect(state.selectedCommitFiles).toHaveLength(0);
      expect(state.selectedFile).toBeNull();
      expect(diffApi.getCommit).not.toHaveBeenCalled();
    });

    it('should set loading state during fetch', async () => {
      let resolvePromise: (value: FileDiff[]) => void;
      const pendingPromise = new Promise<FileDiff[]>((resolve) => {
        resolvePromise = resolve;
      });
      vi.mocked(diffApi.getCommit).mockReturnValue(pendingPromise);

      const selectPromise = useBranchCompareStore.getState().selectCommit(mockCommit);

      expect(useBranchCompareStore.getState().isLoadingFiles).toBe(true);

      resolvePromise!([mockFileDiff]);
      await selectPromise;

      expect(useBranchCompareStore.getState().isLoadingFiles).toBe(false);
    });

    it('should handle errors', async () => {
      vi.mocked(diffApi.getCommit).mockRejectedValue(new Error('Load failed'));

      await useBranchCompareStore.getState().selectCommit(mockCommit);

      const state = useBranchCompareStore.getState();
      expect(state.error).toBe('Load failed');
      expect(state.selectedCommitFiles).toHaveLength(0);
      expect(state.isLoadingFiles).toBe(false);
    });

    it('should auto-select first file when available', async () => {
      vi.mocked(diffApi.getCommit).mockResolvedValue([mockFileDiff]);

      await useBranchCompareStore.getState().selectCommit(mockCommit);

      expect(useBranchCompareStore.getState().selectedFile).toEqual(mockFileDiff);
    });

    it('should not auto-select when no files', async () => {
      vi.mocked(diffApi.getCommit).mockResolvedValue([]);

      await useBranchCompareStore.getState().selectCommit(mockCommit);

      expect(useBranchCompareStore.getState().selectedFile).toBeNull();
    });
  });

  describe('selectFile', () => {
    it('should update selected file', () => {
      useBranchCompareStore.getState().selectFile(mockFileDiff);

      expect(useBranchCompareStore.getState().selectedFile).toEqual(mockFileDiff);
    });

    it('should allow setting to null', () => {
      useBranchCompareStore.setState({ selectedFile: mockFileDiff });

      useBranchCompareStore.getState().selectFile(null);

      expect(useBranchCompareStore.getState().selectedFile).toBeNull();
    });
  });

  describe('clear', () => {
    it('should reset all state to initial values', () => {
      useBranchCompareStore.setState({
        compareResult: mockCompareResult,
        isLoading: true,
        error: 'Some error',
        activeTab: 'files',
        selectedCommit: mockCommit,
        selectedCommitFiles: [mockFileDiff],
        selectedFile: mockFileDiff,
        isLoadingFiles: true,
      });

      useBranchCompareStore.getState().clear();

      const state = useBranchCompareStore.getState();
      expect(state.compareResult).toBeNull();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.activeTab).toBe('commits');
      expect(state.selectedCommit).toBeNull();
      expect(state.selectedCommitFiles).toHaveLength(0);
      expect(state.selectedFile).toBeNull();
      expect(state.isLoadingFiles).toBe(false);
    });
  });
});
