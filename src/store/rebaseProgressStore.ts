import { create } from 'zustand';
import { toast } from '@/hooks';
import { getErrorMessage } from '@/lib/errorUtils';
import { rebaseApi } from '@/services/api';
import type { RebaseProgress } from '@/types';

interface RebaseProgressState {
  // Data
  progress: RebaseProgress | null;

  // Loading state
  isLoading: boolean;

  // Dialog states
  rewordDialogOpen: boolean;
  editPauseDialogOpen: boolean;

  // Actions
  loadProgress: () => Promise<void>;
  clearProgress: () => void;
  openRewordDialog: () => void;
  closeRewordDialog: () => void;
  openEditPauseDialog: () => void;
  closeEditPauseDialog: () => void;
  continueWithMessage: (message: string) => Promise<boolean>;
}

const initialState = {
  progress: null,
  isLoading: false,
  rewordDialogOpen: false,
  editPauseDialogOpen: false,
};

export const useRebaseProgressStore = create<RebaseProgressState>((set) => ({
  ...initialState,

  loadProgress: async () => {
    set({ isLoading: true });
    try {
      const progress = await rebaseApi.getProgress();
      set({ progress, isLoading: false });

      // Auto-open dialogs based on paused action
      if (progress?.pausedAction === 'Edit') {
        set({ editPauseDialogOpen: true });
      } else if (progress?.pausedAction === 'Reword') {
        set({ rewordDialogOpen: true });
      }
    } catch (error) {
      console.error('Failed to load rebase progress:', error);
      set({ progress: null, isLoading: false });
    }
  },

  clearProgress: () => {
    set(initialState);
  },

  openRewordDialog: () => {
    set({ rewordDialogOpen: true });
  },

  closeRewordDialog: () => {
    set({ rewordDialogOpen: false });
  },

  openEditPauseDialog: () => {
    set({ editPauseDialogOpen: true });
  },

  closeEditPauseDialog: () => {
    set({ editPauseDialogOpen: false });
  },

  continueWithMessage: async (message: string) => {
    set({ isLoading: true });
    try {
      const result = await rebaseApi.continueWithMessage(message);
      set({ isLoading: false });

      if (result.success) {
        return true;
      }

      if (result.conflicts.length > 0) {
        toast.warning(getErrorMessage('Conflicts detected. Please resolve and continue.'));
        return false;
      }

      toast.error(result.message);
      return false;
    } catch (error) {
      set({ isLoading: false });
      toast.error(getErrorMessage(error));
      return false;
    }
  },
}));
