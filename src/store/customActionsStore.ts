import { create } from 'zustand';

import { customActionsApi } from '@/services/api';
import { useToastStore } from '@/store/toastStore';
import { ActionContext, ActionStorageType } from '@/types';
import type { CustomAction, ActionVariables, ActionExecutionResult } from '@/types';

interface CustomActionsState {
  // Actions
  globalActions: CustomAction[];
  repoActions: CustomAction[];
  isLoading: boolean;
  error: string | null;

  // Execution state
  executingActionId: string | null;
  lastResult: ActionExecutionResult | null;
  showOutputDialog: boolean;

  // Confirmation dialog
  pendingAction: CustomAction | null;
  pendingVariables: ActionVariables | null;
  showConfirmDialog: boolean;

  // Actions
  loadGlobalActions: () => Promise<void>;
  loadRepoActions: () => Promise<void>;
  loadAllActions: () => Promise<void>;
  saveAction: (action: CustomAction, storage: ActionStorageType) => Promise<void>;
  deleteAction: (actionId: string, storage: ActionStorageType) => Promise<void>;
  getActionsForContext: (context: ActionContext) => CustomAction[];
  executeAction: (action: CustomAction, variables: ActionVariables) => Promise<void>;
  confirmAndExecute: (action: CustomAction, variables: ActionVariables) => void;
  cancelConfirmation: () => void;
  proceedWithExecution: () => Promise<void>;
  closeOutputDialog: () => void;
  reset: () => void;
}

const initialState = {
  globalActions: [] as CustomAction[],
  repoActions: [] as CustomAction[],
  isLoading: false,
  error: null as string | null,
  executingActionId: null as string | null,
  lastResult: null as ActionExecutionResult | null,
  showOutputDialog: false,
  pendingAction: null as CustomAction | null,
  pendingVariables: null as ActionVariables | null,
  showConfirmDialog: false,
};

export const useCustomActionsStore = create<CustomActionsState>((set, get) => ({
  ...initialState,

  loadGlobalActions: async () => {
    try {
      const globalActions = await customActionsApi.listGlobal();
      set({ globalActions });
    } catch (error) {
      console.error('Failed to load global actions:', error);
      set({ error: 'Failed to load global actions' });
    }
  },

  loadRepoActions: async () => {
    try {
      const repoActions = await customActionsApi.listRepo();
      set({ repoActions });
    } catch (error) {
      console.error('Failed to load repo actions:', error);
      // Not an error if no repo is open
    }
  },

  loadAllActions: async () => {
    set({ isLoading: true, error: null });
    try {
      await Promise.all([get().loadGlobalActions(), get().loadRepoActions()]);
    } finally {
      set({ isLoading: false });
    }
  },

  saveAction: async (action: CustomAction, storage: ActionStorageType) => {
    try {
      if (storage === ActionStorageType.Global) {
        await customActionsApi.saveGlobal(action);
        await get().loadGlobalActions();
      } else {
        await customActionsApi.saveRepo(action);
        await get().loadRepoActions();
      }
      useToastStore.getState().addToast({
        type: 'success',
        title: 'Action saved',
        message: `"${action.name}" has been saved`,
      });
    } catch (error) {
      console.error('Failed to save action:', error);
      useToastStore.getState().addToast({
        type: 'error',
        title: 'Failed to save action',
        message: String(error),
      });
      throw error;
    }
  },

  deleteAction: async (actionId: string, storage: ActionStorageType) => {
    try {
      if (storage === ActionStorageType.Global) {
        await customActionsApi.deleteGlobal(actionId);
        await get().loadGlobalActions();
      } else {
        await customActionsApi.deleteRepo(actionId);
        await get().loadRepoActions();
      }
      useToastStore.getState().addToast({
        type: 'success',
        title: 'Action deleted',
      });
    } catch (error) {
      console.error('Failed to delete action:', error);
      useToastStore.getState().addToast({
        type: 'error',
        title: 'Failed to delete action',
        message: String(error),
      });
      throw error;
    }
  },

  getActionsForContext: (context: ActionContext): CustomAction[] => {
    const { globalActions, repoActions } = get();

    // Merge actions: repo actions override global by id
    const seenIds = new Set<string>();
    const merged: CustomAction[] = [];

    // Repo actions first (priority)
    for (const action of repoActions) {
      if (action.enabled && action.contexts.includes(context)) {
        seenIds.add(action.id);
        merged.push(action);
      }
    }

    // Global actions that aren't overridden
    for (const action of globalActions) {
      if (!seenIds.has(action.id) && action.enabled && action.contexts.includes(context)) {
        merged.push(action);
      }
    }

    // Sort by order
    return merged.sort((a, b) => a.order - b.order);
  },

  confirmAndExecute: (action: CustomAction, variables: ActionVariables) => {
    if (action.confirm) {
      set({
        pendingAction: action,
        pendingVariables: variables,
        showConfirmDialog: true,
      });
    } else {
      get().executeAction(action, variables);
    }
  },

  cancelConfirmation: () => {
    set({
      pendingAction: null,
      pendingVariables: null,
      showConfirmDialog: false,
    });
  },

  proceedWithExecution: async () => {
    const { pendingAction, pendingVariables } = get();
    set({
      showConfirmDialog: false,
    });
    if (pendingAction && pendingVariables) {
      await get().executeAction(pendingAction, pendingVariables);
    }
    set({
      pendingAction: null,
      pendingVariables: null,
    });
  },

  executeAction: async (action: CustomAction, variables: ActionVariables) => {
    set({ executingActionId: action.id, lastResult: null });
    try {
      const result = await customActionsApi.execute(action.id, variables);
      set({
        lastResult: result,
        executingActionId: null,
        showOutputDialog: action.showOutput ?? true,
      });

      // Show toast based on result
      if (result.exitCode === 0) {
        useToastStore.getState().addToast({
          type: 'success',
          title: `"${action.name}" completed`,
          message: result.stdout ? result.stdout.slice(0, 100) : undefined,
        });
      } else {
        useToastStore.getState().addToast({
          type: 'error',
          title: `"${action.name}" failed`,
          message: result.stderr ? result.stderr.slice(0, 100) : `Exit code: ${result.exitCode}`,
        });
      }
    } catch (error) {
      console.error('Failed to execute action:', error);
      set({ executingActionId: null });
      useToastStore.getState().addToast({
        type: 'error',
        title: 'Failed to execute action',
        message: String(error),
      });
    }
  },

  closeOutputDialog: () => {
    set({ showOutputDialog: false, lastResult: null });
  },

  reset: () => {
    set(initialState);
  },
}));
