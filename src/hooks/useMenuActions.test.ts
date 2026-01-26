import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { MenuAction } from '@/types';

// Use vi.hoisted for variables used in vi.mock factories
const mocks = vi.hoisted(() => {
  const mockUnlisten = vi.fn();
  return {
    mockOpenRepository: vi.fn(),
    mockCloseRepository: vi.fn(),
    mockRefreshRepository: vi.fn(),
    mockStageAll: vi.fn(),
    mockUnstageAll: vi.fn(),
    mockOpenSettingsDialog: vi.fn(),
    mockRepository: { current: null as { path: string; currentBranch: string | null } | null },
    mockBranches: [] as Array<{ isHead: boolean; upstream: string | null; name: string }>,
    mockUnlisten,
    mockMenuActionListen: vi.fn().mockResolvedValue(mockUnlisten),
  };
});

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@tauri-apps/plugin-dialog', () => ({
  open: vi.fn().mockResolvedValue(null),
}));

vi.mock('@/bindings/api', () => ({
  events: {
    menuActionEvent: { listen: mocks.mockMenuActionListen },
  },
}));

vi.mock('@/hooks', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/lib/actions', () => ({
  notifyNewCommits: vi.fn(),
}));

vi.mock('@/lib/errorUtils', () => ({
  getErrorMessage: (err: unknown) => (err instanceof Error ? err.message : String(err)),
}));

vi.mock('@/services/api', () => ({
  remoteApi: {
    fetchAll: vi.fn().mockResolvedValue(undefined),
    pull: vi.fn().mockResolvedValue(undefined),
    pushCurrentBranch: vi.fn().mockResolvedValue(undefined),
  },
  stashApi: {
    save: vi.fn().mockResolvedValue(undefined),
    pop: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@/store/dialogStore', () => ({
  useDialogStore: () => ({
    openSettingsDialog: mocks.mockOpenSettingsDialog,
  }),
}));

vi.mock('@/store/repositoryStore', () => ({
  useRepositoryStore: Object.assign(
    () => ({
      openRepository: mocks.mockOpenRepository,
      closeRepository: mocks.mockCloseRepository,
      refreshRepository: mocks.mockRefreshRepository,
      repository: mocks.mockRepository.current,
      branches: mocks.mockBranches,
    }),
    {
      getState: () => ({
        branches: mocks.mockBranches,
      }),
    }
  ),
}));

vi.mock('@/store/stagingStore', () => ({
  useStagingStore: () => ({
    stageAll: mocks.mockStageAll,
    unstageAll: mocks.mockUnstageAll,
  }),
}));

import { useMenuActions } from './useMenuActions';

describe('useMenuActions', () => {
  beforeEach(() => {
    mocks.mockRepository.current = null;
    mocks.mockBranches.length = 0;
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should setup menu action listener on mount', async () => {
    renderHook(() => useMenuActions());

    await waitFor(() => {
      expect(mocks.mockMenuActionListen).toHaveBeenCalled();
    });
  });

  it('should cleanup listener on unmount', async () => {
    const { unmount } = renderHook(() => useMenuActions());

    await waitFor(() => {
      expect(mocks.mockMenuActionListen).toHaveBeenCalled();
    });

    unmount();

    await waitFor(() => {
      expect(mocks.mockUnlisten).toHaveBeenCalled();
    });
  });

  describe('menu actions', () => {
    it('should handle CloseRepository action', async () => {
      renderHook(() => useMenuActions());

      await waitFor(() => {
        expect(mocks.mockMenuActionListen).toHaveBeenCalled();
      });

      const handler = mocks.mockMenuActionListen.mock.calls[0][0];
      await act(async () => {
        await handler({ payload: { actionId: MenuAction.CloseRepository } });
      });

      expect(mocks.mockCloseRepository).toHaveBeenCalled();
    });

    it('should handle Refresh action', async () => {
      renderHook(() => useMenuActions());

      await waitFor(() => {
        expect(mocks.mockMenuActionListen).toHaveBeenCalled();
      });

      const handler = mocks.mockMenuActionListen.mock.calls[0][0];
      await act(async () => {
        await handler({ payload: { actionId: MenuAction.Refresh } });
      });

      expect(mocks.mockRefreshRepository).toHaveBeenCalled();
    });

    it('should handle Settings action', async () => {
      renderHook(() => useMenuActions());

      await waitFor(() => {
        expect(mocks.mockMenuActionListen).toHaveBeenCalled();
      });

      const handler = mocks.mockMenuActionListen.mock.calls[0][0];
      await act(async () => {
        await handler({ payload: { actionId: MenuAction.Settings } });
      });

      expect(mocks.mockOpenSettingsDialog).toHaveBeenCalled();
    });

    it('should handle StageAll action', async () => {
      renderHook(() => useMenuActions());

      await waitFor(() => {
        expect(mocks.mockMenuActionListen).toHaveBeenCalled();
      });

      const handler = mocks.mockMenuActionListen.mock.calls[0][0];
      await act(async () => {
        await handler({ payload: { actionId: MenuAction.StageAll } });
      });

      expect(mocks.mockStageAll).toHaveBeenCalled();
    });

    it('should handle UnstageAll action', async () => {
      renderHook(() => useMenuActions());

      await waitFor(() => {
        expect(mocks.mockMenuActionListen).toHaveBeenCalled();
      });

      const handler = mocks.mockMenuActionListen.mock.calls[0][0];
      await act(async () => {
        await handler({ payload: { actionId: MenuAction.UnstageAll } });
      });

      expect(mocks.mockUnstageAll).toHaveBeenCalled();
    });

    it('should handle Commit action by dispatching custom event', async () => {
      const dispatchEventSpy = vi.spyOn(document, 'dispatchEvent');

      renderHook(() => useMenuActions());

      await waitFor(() => {
        expect(mocks.mockMenuActionListen).toHaveBeenCalled();
      });

      const handler = mocks.mockMenuActionListen.mock.calls[0][0];
      await act(async () => {
        await handler({ payload: { actionId: MenuAction.Commit } });
      });

      expect(dispatchEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'focus-commit-form' })
      );
    });

    it('should handle NewBranch action by dispatching custom event', async () => {
      const dispatchEventSpy = vi.spyOn(document, 'dispatchEvent');

      renderHook(() => useMenuActions());

      await waitFor(() => {
        expect(mocks.mockMenuActionListen).toHaveBeenCalled();
      });

      const handler = mocks.mockMenuActionListen.mock.calls[0][0];
      await act(async () => {
        await handler({ payload: { actionId: MenuAction.NewBranch } });
      });

      expect(dispatchEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'open-new-branch-dialog' })
      );
    });

    it('should handle NewTag action by dispatching custom event', async () => {
      const dispatchEventSpy = vi.spyOn(document, 'dispatchEvent');

      renderHook(() => useMenuActions());

      await waitFor(() => {
        expect(mocks.mockMenuActionListen).toHaveBeenCalled();
      });

      const handler = mocks.mockMenuActionListen.mock.calls[0][0];
      await act(async () => {
        await handler({ payload: { actionId: MenuAction.NewTag } });
      });

      expect(dispatchEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'open-new-tag-dialog' })
      );
    });
  });
});
