import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useCustomActionsStore } from './customActionsStore';
import { ActionContext, ActionStorageType } from '@/types';
import type { CustomAction, ActionExecutionResult, ActionVariables } from '@/types';

vi.mock('@/services/api', () => ({
  customActionsApi: {
    listGlobal: vi.fn(),
    listRepo: vi.fn(),
    saveGlobal: vi.fn(),
    saveRepo: vi.fn(),
    deleteGlobal: vi.fn(),
    deleteRepo: vi.fn(),
    execute: vi.fn(),
  },
}));

vi.mock('@/i18n', () => ({
  default: {
    t: (key: string, params?: Record<string, string>) => {
      if (params) {
        return `${key}: ${JSON.stringify(params)}`;
      }
      return key;
    },
  },
}));

vi.mock('@/lib/errorUtils', () => ({
  getErrorMessage: (err: unknown) => (err instanceof Error ? err.message : String(err)),
}));

const mockAddToast = vi.fn();
vi.mock('@/store/toastStore', () => ({
  useToastStore: {
    getState: () => ({
      addToast: mockAddToast,
    }),
  },
}));

import { customActionsApi } from '@/services/api';

describe('customActionsStore', () => {
  const mockAction: CustomAction = {
    id: 'action-1',
    name: 'Test Action',
    description: null,
    command: 'echo test',
    workingDir: null,
    contexts: [ActionContext.Commit],
    shortcut: null,
    confirm: false,
    confirmMessage: null,
    showOutput: true,
    enabled: true,
    order: 0,
  };

  const mockVariables: ActionVariables = {
    repoPath: '/path/to/repo',
    branch: 'main',
    file: null,
    selectedFiles: null,
    commitHash: 'abc123',
    commitShort: 'abc123',
    commitMessage: 'Test commit',
    remoteUrl: null,
    tag: null,
    stashRef: null,
  };

  const mockExecutionResult: ActionExecutionResult = {
    exitCode: 0,
    stdout: 'test output',
    stderr: '',
    durationMs: 100,
  };

  beforeEach(() => {
    vi.useFakeTimers();
    useCustomActionsStore.setState({
      globalActions: [],
      repoActions: [],
      isLoading: false,
      error: null,
      executingActionId: null,
      lastResult: null,
      showOutputDialog: false,
      pendingAction: null,
      pendingVariables: null,
      showConfirmDialog: false,
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('loadGlobalActions', () => {
    it('should load global actions', async () => {
      vi.mocked(customActionsApi.listGlobal).mockResolvedValue([mockAction]);

      await useCustomActionsStore.getState().loadGlobalActions();

      expect(customActionsApi.listGlobal).toHaveBeenCalled();
      expect(useCustomActionsStore.getState().globalActions).toHaveLength(1);
    });

    it('should handle errors', async () => {
      vi.mocked(customActionsApi.listGlobal).mockRejectedValue(new Error('Load failed'));

      await useCustomActionsStore.getState().loadGlobalActions();

      expect(useCustomActionsStore.getState().error).toBe('store.customActions.loadGlobalFailed');
    });
  });

  describe('loadRepoActions', () => {
    it('should load repo actions', async () => {
      vi.mocked(customActionsApi.listRepo).mockResolvedValue([mockAction]);

      await useCustomActionsStore.getState().loadRepoActions();

      expect(customActionsApi.listRepo).toHaveBeenCalled();
      expect(useCustomActionsStore.getState().repoActions).toHaveLength(1);
    });

    it('should handle errors silently', async () => {
      vi.mocked(customActionsApi.listRepo).mockRejectedValue(new Error('No repo'));

      await useCustomActionsStore.getState().loadRepoActions();

      // No error should be set (silent fail)
      expect(useCustomActionsStore.getState().error).toBeNull();
    });
  });

  describe('loadAllActions', () => {
    it('should load both global and repo actions', async () => {
      vi.mocked(customActionsApi.listGlobal).mockResolvedValue([mockAction]);
      vi.mocked(customActionsApi.listRepo).mockResolvedValue([{ ...mockAction, id: 'action-2' }]);

      await useCustomActionsStore.getState().loadAllActions();

      const state = useCustomActionsStore.getState();
      expect(state.globalActions).toHaveLength(1);
      expect(state.repoActions).toHaveLength(1);
      expect(state.isLoading).toBe(false);
    });

    it('should set loading state', async () => {
      let resolveGlobal: (value: CustomAction[]) => void;
      const globalPromise = new Promise<CustomAction[]>((resolve) => {
        resolveGlobal = resolve;
      });
      vi.mocked(customActionsApi.listGlobal).mockReturnValue(globalPromise);
      vi.mocked(customActionsApi.listRepo).mockResolvedValue([]);

      const loadPromise = useCustomActionsStore.getState().loadAllActions();

      expect(useCustomActionsStore.getState().isLoading).toBe(true);

      resolveGlobal!([]);
      await loadPromise;

      expect(useCustomActionsStore.getState().isLoading).toBe(false);
    });
  });

  describe('saveAction', () => {
    it('should save global action', async () => {
      vi.mocked(customActionsApi.saveGlobal).mockResolvedValue(null);
      vi.mocked(customActionsApi.listGlobal).mockResolvedValue([mockAction]);

      await useCustomActionsStore.getState().saveAction(mockAction, ActionStorageType.Global);

      expect(customActionsApi.saveGlobal).toHaveBeenCalledWith(mockAction);
      expect(customActionsApi.listGlobal).toHaveBeenCalled();
    });

    it('should save repo action', async () => {
      vi.mocked(customActionsApi.saveRepo).mockResolvedValue(null);
      vi.mocked(customActionsApi.listRepo).mockResolvedValue([mockAction]);

      await useCustomActionsStore.getState().saveAction(mockAction, ActionStorageType.Repository);

      expect(customActionsApi.saveRepo).toHaveBeenCalledWith(mockAction);
      expect(customActionsApi.listRepo).toHaveBeenCalled();
    });

    it('should handle save errors', async () => {
      vi.mocked(customActionsApi.saveGlobal).mockRejectedValue(new Error('Save failed'));

      await expect(
        useCustomActionsStore.getState().saveAction(mockAction, ActionStorageType.Global)
      ).rejects.toThrow('Save failed');

      expect(mockAddToast).toHaveBeenCalled();
    });
  });

  describe('deleteAction', () => {
    it('should delete global action', async () => {
      vi.mocked(customActionsApi.deleteGlobal).mockResolvedValue(null);
      vi.mocked(customActionsApi.listGlobal).mockResolvedValue([]);

      await useCustomActionsStore.getState().deleteAction('action-1', ActionStorageType.Global);

      expect(customActionsApi.deleteGlobal).toHaveBeenCalledWith('action-1');
      expect(customActionsApi.listGlobal).toHaveBeenCalled();
    });

    it('should delete repo action', async () => {
      vi.mocked(customActionsApi.deleteRepo).mockResolvedValue(null);
      vi.mocked(customActionsApi.listRepo).mockResolvedValue([]);

      await useCustomActionsStore.getState().deleteAction('action-1', ActionStorageType.Repository);

      expect(customActionsApi.deleteRepo).toHaveBeenCalledWith('action-1');
      expect(customActionsApi.listRepo).toHaveBeenCalled();
    });

    it('should handle delete errors', async () => {
      vi.mocked(customActionsApi.deleteGlobal).mockRejectedValue(new Error('Delete failed'));

      await expect(
        useCustomActionsStore.getState().deleteAction('action-1', ActionStorageType.Global)
      ).rejects.toThrow('Delete failed');
    });
  });

  describe('getActionsForContext', () => {
    it('should return actions matching context', () => {
      const action1 = { ...mockAction, contexts: [ActionContext.Commit] };
      const action2 = { ...mockAction, id: 'action-2', contexts: [ActionContext.File] };
      useCustomActionsStore.setState({ globalActions: [action1, action2] });

      const result = useCustomActionsStore.getState().getActionsForContext(ActionContext.Commit);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('action-1');
    });

    it('should filter out disabled actions', () => {
      const disabledAction = { ...mockAction, enabled: false };
      useCustomActionsStore.setState({ globalActions: [disabledAction] });

      const result = useCustomActionsStore.getState().getActionsForContext(ActionContext.Commit);

      expect(result).toHaveLength(0);
    });

    it('should prioritize repo actions over global', () => {
      const globalAction = { ...mockAction, name: 'Global' };
      const repoAction = { ...mockAction, name: 'Repo' };
      useCustomActionsStore.setState({
        globalActions: [globalAction],
        repoActions: [repoAction],
      });

      const result = useCustomActionsStore.getState().getActionsForContext(ActionContext.Commit);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Repo');
    });

    it('should sort by order', () => {
      const action1 = { ...mockAction, id: 'a1', order: 2 };
      const action2 = { ...mockAction, id: 'a2', order: 1 };
      useCustomActionsStore.setState({ globalActions: [action1, action2] });

      const result = useCustomActionsStore.getState().getActionsForContext(ActionContext.Commit);

      expect(result[0].id).toBe('a2');
      expect(result[1].id).toBe('a1');
    });
  });

  describe('executeAction', () => {
    it('should execute action and show result', async () => {
      vi.mocked(customActionsApi.execute).mockResolvedValue(mockExecutionResult);

      await useCustomActionsStore.getState().executeAction(mockAction, mockVariables);

      expect(customActionsApi.execute).toHaveBeenCalledWith('action-1', mockVariables);
      const state = useCustomActionsStore.getState();
      expect(state.lastResult).toEqual(mockExecutionResult);
      expect(state.showOutputDialog).toBe(true);
      expect(state.executingActionId).toBeNull();
    });

    it('should set executing action id during execution', async () => {
      let resolvePromise: (value: ActionExecutionResult) => void;
      const pendingPromise = new Promise<ActionExecutionResult>((resolve) => {
        resolvePromise = resolve;
      });
      vi.mocked(customActionsApi.execute).mockReturnValue(pendingPromise);

      const executePromise = useCustomActionsStore
        .getState()
        .executeAction(mockAction, mockVariables);

      expect(useCustomActionsStore.getState().executingActionId).toBe('action-1');

      resolvePromise!(mockExecutionResult);
      await executePromise;

      expect(useCustomActionsStore.getState().executingActionId).toBeNull();
    });

    it('should handle execution errors', async () => {
      vi.mocked(customActionsApi.execute).mockRejectedValue(new Error('Execution failed'));

      await useCustomActionsStore.getState().executeAction(mockAction, mockVariables);

      expect(useCustomActionsStore.getState().executingActionId).toBeNull();
      expect(mockAddToast).toHaveBeenCalled();
    });

    it('should respect showOutput setting', async () => {
      const noOutputAction = { ...mockAction, showOutput: false };
      vi.mocked(customActionsApi.execute).mockResolvedValue(mockExecutionResult);

      await useCustomActionsStore.getState().executeAction(noOutputAction, mockVariables);

      expect(useCustomActionsStore.getState().showOutputDialog).toBe(false);
    });

    it('should show error toast on non-zero exit code', async () => {
      const errorResult = { ...mockExecutionResult, exitCode: 1, stderr: 'Error message' };
      vi.mocked(customActionsApi.execute).mockResolvedValue(errorResult);

      await useCustomActionsStore.getState().executeAction(mockAction, mockVariables);

      expect(mockAddToast).toHaveBeenCalled();
    });
  });

  describe('confirmAndExecute', () => {
    it('should execute directly if no confirmation required', async () => {
      vi.mocked(customActionsApi.execute).mockResolvedValue(mockExecutionResult);

      useCustomActionsStore.getState().confirmAndExecute(mockAction, mockVariables);

      // Since confirm is false, it should execute immediately
      await vi.runAllTimersAsync();
      expect(customActionsApi.execute).toHaveBeenCalled();
    });

    it('should show confirm dialog if confirmation required', () => {
      const confirmAction = { ...mockAction, confirm: true };

      useCustomActionsStore.getState().confirmAndExecute(confirmAction, mockVariables);

      const state = useCustomActionsStore.getState();
      expect(state.showConfirmDialog).toBe(true);
      expect(state.pendingAction).toEqual(confirmAction);
      expect(state.pendingVariables).toEqual(mockVariables);
      expect(customActionsApi.execute).not.toHaveBeenCalled();
    });
  });

  describe('cancelConfirmation', () => {
    it('should clear pending action and close dialog', () => {
      useCustomActionsStore.setState({
        pendingAction: mockAction,
        pendingVariables: mockVariables,
        showConfirmDialog: true,
      });

      useCustomActionsStore.getState().cancelConfirmation();

      const state = useCustomActionsStore.getState();
      expect(state.pendingAction).toBeNull();
      expect(state.pendingVariables).toBeNull();
      expect(state.showConfirmDialog).toBe(false);
    });
  });

  describe('proceedWithExecution', () => {
    it('should execute pending action', async () => {
      vi.mocked(customActionsApi.execute).mockResolvedValue(mockExecutionResult);
      useCustomActionsStore.setState({
        pendingAction: mockAction,
        pendingVariables: mockVariables,
        showConfirmDialog: true,
      });

      await useCustomActionsStore.getState().proceedWithExecution();

      expect(customActionsApi.execute).toHaveBeenCalledWith('action-1', mockVariables);
      const state = useCustomActionsStore.getState();
      expect(state.showConfirmDialog).toBe(false);
      expect(state.pendingAction).toBeNull();
      expect(state.pendingVariables).toBeNull();
    });

    it('should do nothing if no pending action', async () => {
      await useCustomActionsStore.getState().proceedWithExecution();

      expect(customActionsApi.execute).not.toHaveBeenCalled();
    });
  });

  describe('closeOutputDialog', () => {
    it('should close dialog and clear result', () => {
      useCustomActionsStore.setState({
        showOutputDialog: true,
        lastResult: mockExecutionResult,
      });

      useCustomActionsStore.getState().closeOutputDialog();

      const state = useCustomActionsStore.getState();
      expect(state.showOutputDialog).toBe(false);
      expect(state.lastResult).toBeNull();
    });
  });

  describe('reset', () => {
    it('should reset all state to initial values', () => {
      useCustomActionsStore.setState({
        globalActions: [mockAction],
        repoActions: [mockAction],
        isLoading: true,
        error: 'Some error',
        executingActionId: 'action-1',
        lastResult: mockExecutionResult,
        showOutputDialog: true,
        pendingAction: mockAction,
        pendingVariables: mockVariables,
        showConfirmDialog: true,
      });

      useCustomActionsStore.getState().reset();

      const state = useCustomActionsStore.getState();
      expect(state.globalActions).toHaveLength(0);
      expect(state.repoActions).toHaveLength(0);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.executingActionId).toBeNull();
      expect(state.lastResult).toBeNull();
      expect(state.showOutputDialog).toBe(false);
      expect(state.pendingAction).toBeNull();
      expect(state.pendingVariables).toBeNull();
      expect(state.showConfirmDialog).toBe(false);
    });
  });
});
