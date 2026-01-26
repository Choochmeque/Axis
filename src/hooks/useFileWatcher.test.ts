import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

// Use vi.hoisted for variables used in vi.mock factories
const mocks = vi.hoisted(() => {
  const mockUnlisten = vi.fn();
  return {
    mockLoadStatus: vi.fn(),
    mockLoadCommits: vi.fn(),
    mockLoadBranches: vi.fn(),
    mockLoadTags: vi.fn(),
    mockLoadStashes: vi.fn(),
    mockStagingLoadStatus: vi.fn(),
    mockUnlisten,
    mockFilesChangedListen: vi.fn().mockResolvedValue(mockUnlisten),
    mockIndexChangedListen: vi.fn().mockResolvedValue(mockUnlisten),
    mockHeadChangedListen: vi.fn().mockResolvedValue(mockUnlisten),
    mockRefChangedListen: vi.fn().mockResolvedValue(mockUnlisten),
    mockWatchErrorListen: vi.fn().mockResolvedValue(mockUnlisten),
    mockRepository: { current: null as { path: string } | null },
  };
});

vi.mock('@/bindings/api', () => ({
  events: {
    filesChangedEvent: { listen: mocks.mockFilesChangedListen },
    indexChangedEvent: { listen: mocks.mockIndexChangedListen },
    headChangedEvent: { listen: mocks.mockHeadChangedListen },
    refChangedEvent: { listen: mocks.mockRefChangedListen },
    watchErrorEvent: { listen: mocks.mockWatchErrorListen },
  },
}));

vi.mock('@/hooks', () => ({
  toast: {
    error: vi.fn(),
  },
}));

vi.mock('@/store/repositoryStore', () => ({
  useRepositoryStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      repository: mocks.mockRepository.current,
      loadStatus: mocks.mockLoadStatus,
      loadCommits: mocks.mockLoadCommits,
      loadBranches: mocks.mockLoadBranches,
      loadTags: mocks.mockLoadTags,
      loadStashes: mocks.mockLoadStashes,
    }),
}));

vi.mock('@/store/stagingStore', () => ({
  useStagingStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      loadStatus: mocks.mockStagingLoadStatus,
    }),
}));

import { useFileWatcher } from './useFileWatcher';

describe('useFileWatcher', () => {
  beforeEach(() => {
    mocks.mockRepository.current = null;
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should not setup listeners when no repository', () => {
    mocks.mockRepository.current = null;

    renderHook(() => useFileWatcher());

    expect(mocks.mockFilesChangedListen).not.toHaveBeenCalled();
    expect(mocks.mockIndexChangedListen).not.toHaveBeenCalled();
    expect(mocks.mockHeadChangedListen).not.toHaveBeenCalled();
    expect(mocks.mockRefChangedListen).not.toHaveBeenCalled();
    expect(mocks.mockWatchErrorListen).not.toHaveBeenCalled();
  });

  it('should setup listeners when repository exists', async () => {
    mocks.mockRepository.current = { path: '/test/repo' };

    renderHook(() => useFileWatcher());

    await waitFor(() => {
      expect(mocks.mockFilesChangedListen).toHaveBeenCalled();
      expect(mocks.mockIndexChangedListen).toHaveBeenCalled();
      expect(mocks.mockHeadChangedListen).toHaveBeenCalled();
      expect(mocks.mockRefChangedListen).toHaveBeenCalled();
      expect(mocks.mockWatchErrorListen).toHaveBeenCalled();
    });
  });

  it('should cleanup listeners on unmount', async () => {
    mocks.mockRepository.current = { path: '/test/repo' };

    const { unmount } = renderHook(() => useFileWatcher());

    await waitFor(() => {
      expect(mocks.mockFilesChangedListen).toHaveBeenCalled();
    });

    unmount();

    expect(mocks.mockUnlisten).toHaveBeenCalled();
  });

  describe('event handlers', () => {
    it('should call loadStatus on files changed event', async () => {
      mocks.mockRepository.current = { path: '/test/repo' };

      renderHook(() => useFileWatcher());

      await waitFor(() => {
        expect(mocks.mockFilesChangedListen).toHaveBeenCalled();
      });

      const handler = mocks.mockFilesChangedListen.mock.calls[0][0];
      handler();

      expect(mocks.mockLoadStatus).toHaveBeenCalled();
      expect(mocks.mockStagingLoadStatus).toHaveBeenCalled();
    });

    it('should call loadStatus on index changed event', async () => {
      mocks.mockRepository.current = { path: '/test/repo' };

      renderHook(() => useFileWatcher());

      await waitFor(() => {
        expect(mocks.mockIndexChangedListen).toHaveBeenCalled();
      });

      const handler = mocks.mockIndexChangedListen.mock.calls[0][0];
      handler();

      expect(mocks.mockLoadStatus).toHaveBeenCalled();
      expect(mocks.mockStagingLoadStatus).toHaveBeenCalled();
    });

    it('should call loadCommits and loadBranches on head changed event', async () => {
      mocks.mockRepository.current = { path: '/test/repo' };

      renderHook(() => useFileWatcher());

      await waitFor(() => {
        expect(mocks.mockHeadChangedListen).toHaveBeenCalled();
      });

      const handler = mocks.mockHeadChangedListen.mock.calls[0][0];
      handler();

      expect(mocks.mockLoadCommits).toHaveBeenCalled();
      expect(mocks.mockLoadStatus).toHaveBeenCalled();
      expect(mocks.mockStagingLoadStatus).toHaveBeenCalled();
      expect(mocks.mockLoadBranches).toHaveBeenCalled();
    });

    it('should call loadTags on tag ref changed event', async () => {
      mocks.mockRepository.current = { path: '/test/repo' };

      renderHook(() => useFileWatcher());

      await waitFor(() => {
        expect(mocks.mockRefChangedListen).toHaveBeenCalled();
      });

      const handler = mocks.mockRefChangedListen.mock.calls[0][0];
      handler({ payload: { refName: 'refs/tags/v1.0.0' } });

      expect(mocks.mockLoadTags).toHaveBeenCalled();
    });

    it('should call loadBranches on branch ref changed event', async () => {
      mocks.mockRepository.current = { path: '/test/repo' };

      renderHook(() => useFileWatcher());

      await waitFor(() => {
        expect(mocks.mockRefChangedListen).toHaveBeenCalled();
      });

      const handler = mocks.mockRefChangedListen.mock.calls[0][0];
      handler({ payload: { refName: 'refs/heads/feature' } });

      expect(mocks.mockLoadBranches).toHaveBeenCalled();
      expect(mocks.mockLoadCommits).toHaveBeenCalled();
    });

    it('should call loadStashes on stash ref changed event', async () => {
      mocks.mockRepository.current = { path: '/test/repo' };

      renderHook(() => useFileWatcher());

      await waitFor(() => {
        expect(mocks.mockRefChangedListen).toHaveBeenCalled();
      });

      const handler = mocks.mockRefChangedListen.mock.calls[0][0];
      handler({ payload: { refName: 'refs/stash' } });

      expect(mocks.mockLoadStashes).toHaveBeenCalled();
    });
  });
});
