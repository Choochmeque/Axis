import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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

    it('should handle ToggleSidebar action (currently noop)', async () => {
      renderHook(() => useMenuActions());

      await waitFor(() => {
        expect(mocks.mockMenuActionListen).toHaveBeenCalled();
      });

      const handler = mocks.mockMenuActionListen.mock.calls[0][0];
      // Should not throw even though it's a TODO
      await expect(
        act(async () => {
          await handler({ payload: { actionId: MenuAction.ToggleSidebar } });
        })
      ).resolves.not.toThrow();
    });

    it('should handle unknown action', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      renderHook(() => useMenuActions());

      await waitFor(() => {
        expect(mocks.mockMenuActionListen).toHaveBeenCalled();
      });

      const handler = mocks.mockMenuActionListen.mock.calls[0][0];
      await act(async () => {
        await handler({ payload: { actionId: 'unknown-action' } });
      });

      expect(consoleSpy).toHaveBeenCalledWith('Unhandled menu action:', 'unknown-action');
      consoleSpy.mockRestore();
    });
  });

  describe('repository-dependent actions', () => {
    beforeEach(() => {
      mocks.mockRepository.current = { path: '/test/repo', currentBranch: 'main' };
      mocks.mockBranches.push({ isHead: true, upstream: 'origin/main', name: 'main' });
    });

    it('should handle Fetch action when repository exists', async () => {
      const { remoteApi } = await import('@/services/api');

      renderHook(() => useMenuActions());

      await waitFor(() => {
        expect(mocks.mockMenuActionListen).toHaveBeenCalled();
      });

      const handler = mocks.mockMenuActionListen.mock.calls[0][0];
      await act(async () => {
        await handler({ payload: { actionId: MenuAction.Fetch } });
      });

      expect(remoteApi.fetchAll).toHaveBeenCalled();
      expect(mocks.mockRefreshRepository).toHaveBeenCalled();
    });

    it('should handle Fetch error', async () => {
      const { remoteApi } = await import('@/services/api');
      const { toast } = await import('@/hooks');
      vi.mocked(remoteApi.fetchAll).mockRejectedValueOnce(new Error('Fetch failed'));

      renderHook(() => useMenuActions());

      await waitFor(() => {
        expect(mocks.mockMenuActionListen).toHaveBeenCalled();
      });

      const handler = mocks.mockMenuActionListen.mock.calls[0][0];
      await act(async () => {
        await handler({ payload: { actionId: MenuAction.Fetch } });
      });

      expect(toast.error).toHaveBeenCalledWith('Fetch failed');
    });

    it('should handle Pull action when repository exists', async () => {
      const { remoteApi } = await import('@/services/api');
      const { toast } = await import('@/hooks');

      renderHook(() => useMenuActions());

      await waitFor(() => {
        expect(mocks.mockMenuActionListen).toHaveBeenCalled();
      });

      const handler = mocks.mockMenuActionListen.mock.calls[0][0];
      await act(async () => {
        await handler({ payload: { actionId: MenuAction.Pull } });
      });

      expect(remoteApi.pull).toHaveBeenCalledWith('origin', 'main', {
        rebase: false,
        ffOnly: false,
      });
      expect(mocks.mockRefreshRepository).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith('notifications.success.pullComplete');
    });

    it('should handle Pull error', async () => {
      const { remoteApi } = await import('@/services/api');
      const { toast } = await import('@/hooks');
      vi.mocked(remoteApi.pull).mockRejectedValueOnce(new Error('Pull failed'));

      renderHook(() => useMenuActions());

      await waitFor(() => {
        expect(mocks.mockMenuActionListen).toHaveBeenCalled();
      });

      const handler = mocks.mockMenuActionListen.mock.calls[0][0];
      await act(async () => {
        await handler({ payload: { actionId: MenuAction.Pull } });
      });

      expect(toast.error).toHaveBeenCalledWith('Pull failed');
    });

    it('should handle Push action when repository exists', async () => {
      const { remoteApi } = await import('@/services/api');
      const { toast } = await import('@/hooks');

      renderHook(() => useMenuActions());

      await waitFor(() => {
        expect(mocks.mockMenuActionListen).toHaveBeenCalled();
      });

      const handler = mocks.mockMenuActionListen.mock.calls[0][0];
      await act(async () => {
        await handler({ payload: { actionId: MenuAction.Push } });
      });

      expect(remoteApi.pushCurrentBranch).toHaveBeenCalledWith('origin', {
        force: false,
        setUpstream: false, // upstream exists
        tags: false,
      });
      expect(mocks.mockRefreshRepository).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith('notifications.success.pushComplete');
    });

    it('should set upstream when branch has no upstream', async () => {
      // Update branch to have no upstream
      mocks.mockBranches.length = 0;
      mocks.mockBranches.push({ isHead: true, upstream: null, name: 'feature' });

      const { remoteApi } = await import('@/services/api');

      renderHook(() => useMenuActions());

      await waitFor(() => {
        expect(mocks.mockMenuActionListen).toHaveBeenCalled();
      });

      const handler = mocks.mockMenuActionListen.mock.calls[0][0];
      await act(async () => {
        await handler({ payload: { actionId: MenuAction.Push } });
      });

      expect(remoteApi.pushCurrentBranch).toHaveBeenCalledWith('origin', {
        force: false,
        setUpstream: true, // no upstream, so needs to set it
        tags: false,
      });
    });

    it('should handle Push error', async () => {
      const { remoteApi } = await import('@/services/api');
      const { toast } = await import('@/hooks');
      vi.mocked(remoteApi.pushCurrentBranch).mockRejectedValueOnce(new Error('Push failed'));

      renderHook(() => useMenuActions());

      await waitFor(() => {
        expect(mocks.mockMenuActionListen).toHaveBeenCalled();
      });

      const handler = mocks.mockMenuActionListen.mock.calls[0][0];
      await act(async () => {
        await handler({ payload: { actionId: MenuAction.Push } });
      });

      expect(toast.error).toHaveBeenCalledWith('Push failed');
    });

    it('should handle Stash action when repository exists', async () => {
      const { stashApi } = await import('@/services/api');
      const { toast } = await import('@/hooks');

      renderHook(() => useMenuActions());

      await waitFor(() => {
        expect(mocks.mockMenuActionListen).toHaveBeenCalled();
      });

      const handler = mocks.mockMenuActionListen.mock.calls[0][0];
      await act(async () => {
        await handler({ payload: { actionId: MenuAction.Stash } });
      });

      expect(stashApi.save).toHaveBeenCalledWith({
        message: null,
        includeUntracked: false,
        keepIndex: false,
        includeIgnored: false,
      });
      expect(mocks.mockRefreshRepository).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith('notifications.success.stashCreated');
    });

    it('should handle Stash error', async () => {
      const { stashApi } = await import('@/services/api');
      const { toast } = await import('@/hooks');
      vi.mocked(stashApi.save).mockRejectedValueOnce(new Error('Stash failed'));

      renderHook(() => useMenuActions());

      await waitFor(() => {
        expect(mocks.mockMenuActionListen).toHaveBeenCalled();
      });

      const handler = mocks.mockMenuActionListen.mock.calls[0][0];
      await act(async () => {
        await handler({ payload: { actionId: MenuAction.Stash } });
      });

      expect(toast.error).toHaveBeenCalledWith('Stash failed');
    });

    it('should handle PopStash action when repository exists', async () => {
      const { stashApi } = await import('@/services/api');
      const { toast } = await import('@/hooks');

      renderHook(() => useMenuActions());

      await waitFor(() => {
        expect(mocks.mockMenuActionListen).toHaveBeenCalled();
      });

      const handler = mocks.mockMenuActionListen.mock.calls[0][0];
      await act(async () => {
        await handler({ payload: { actionId: MenuAction.PopStash } });
      });

      expect(stashApi.pop).toHaveBeenCalledWith({ index: 0, reinstateIndex: false });
      expect(mocks.mockRefreshRepository).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith('notifications.success.stashApplied');
    });

    it('should handle PopStash error', async () => {
      const { stashApi } = await import('@/services/api');
      const { toast } = await import('@/hooks');
      vi.mocked(stashApi.pop).mockRejectedValueOnce(new Error('Pop failed'));

      renderHook(() => useMenuActions());

      await waitFor(() => {
        expect(mocks.mockMenuActionListen).toHaveBeenCalled();
      });

      const handler = mocks.mockMenuActionListen.mock.calls[0][0];
      await act(async () => {
        await handler({ payload: { actionId: MenuAction.PopStash } });
      });

      expect(toast.error).toHaveBeenCalledWith('Pop failed');
    });
  });

  describe('NewWindow action', () => {
    it('should open dialog and open repository when path selected', async () => {
      const { open } = await import('@tauri-apps/plugin-dialog');
      vi.mocked(open).mockResolvedValueOnce('/path/to/repo');

      renderHook(() => useMenuActions());

      await waitFor(() => {
        expect(mocks.mockMenuActionListen).toHaveBeenCalled();
      });

      const handler = mocks.mockMenuActionListen.mock.calls[0][0];
      await act(async () => {
        await handler({ payload: { actionId: MenuAction.NewWindow } });
      });

      expect(open).toHaveBeenCalledWith({
        directory: true,
        multiple: false,
        title: 'dialogs.openRepository.title',
      });
      expect(mocks.mockOpenRepository).toHaveBeenCalledWith('/path/to/repo');
    });

    it('should not open repository when dialog cancelled', async () => {
      const { open } = await import('@tauri-apps/plugin-dialog');
      vi.mocked(open).mockResolvedValueOnce(null);

      renderHook(() => useMenuActions());

      await waitFor(() => {
        expect(mocks.mockMenuActionListen).toHaveBeenCalled();
      });

      const handler = mocks.mockMenuActionListen.mock.calls[0][0];
      await act(async () => {
        await handler({ payload: { actionId: MenuAction.NewWindow } });
      });

      expect(open).toHaveBeenCalled();
      expect(mocks.mockOpenRepository).not.toHaveBeenCalled();
    });
  });

  describe('actions without repository', () => {
    it('should not call fetch when repository is null', async () => {
      const { remoteApi } = await import('@/services/api');

      renderHook(() => useMenuActions());

      await waitFor(() => {
        expect(mocks.mockMenuActionListen).toHaveBeenCalled();
      });

      const handler = mocks.mockMenuActionListen.mock.calls[0][0];
      await act(async () => {
        await handler({ payload: { actionId: MenuAction.Fetch } });
      });

      expect(remoteApi.fetchAll).not.toHaveBeenCalled();
    });

    it('should not call pull when repository is null', async () => {
      const { remoteApi } = await import('@/services/api');

      renderHook(() => useMenuActions());

      await waitFor(() => {
        expect(mocks.mockMenuActionListen).toHaveBeenCalled();
      });

      const handler = mocks.mockMenuActionListen.mock.calls[0][0];
      await act(async () => {
        await handler({ payload: { actionId: MenuAction.Pull } });
      });

      expect(remoteApi.pull).not.toHaveBeenCalled();
    });

    it('should not call push when repository is null', async () => {
      const { remoteApi } = await import('@/services/api');

      renderHook(() => useMenuActions());

      await waitFor(() => {
        expect(mocks.mockMenuActionListen).toHaveBeenCalled();
      });

      const handler = mocks.mockMenuActionListen.mock.calls[0][0];
      await act(async () => {
        await handler({ payload: { actionId: MenuAction.Push } });
      });

      expect(remoteApi.pushCurrentBranch).not.toHaveBeenCalled();
    });

    it('should not call stash when repository is null', async () => {
      const { stashApi } = await import('@/services/api');

      renderHook(() => useMenuActions());

      await waitFor(() => {
        expect(mocks.mockMenuActionListen).toHaveBeenCalled();
      });

      const handler = mocks.mockMenuActionListen.mock.calls[0][0];
      await act(async () => {
        await handler({ payload: { actionId: MenuAction.Stash } });
      });

      expect(stashApi.save).not.toHaveBeenCalled();
    });

    it('should not call pop stash when repository is null', async () => {
      const { stashApi } = await import('@/services/api');

      renderHook(() => useMenuActions());

      await waitFor(() => {
        expect(mocks.mockMenuActionListen).toHaveBeenCalled();
      });

      const handler = mocks.mockMenuActionListen.mock.calls[0][0];
      await act(async () => {
        await handler({ payload: { actionId: MenuAction.PopStash } });
      });

      expect(stashApi.pop).not.toHaveBeenCalled();
    });
  });
});
