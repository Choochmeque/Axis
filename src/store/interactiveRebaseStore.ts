import { create } from 'zustand';
import { getErrorMessage } from '@/lib/errorUtils';
import { rebaseApi } from '@/services/api';
import type { InteractiveRebaseEntry, InteractiveRebasePreview, RebaseAction } from '@/types';

interface InteractiveRebaseState {
  // Dialog state
  isOpen: boolean;
  onto: string;

  // Data
  preview: InteractiveRebasePreview | null;
  entries: InteractiveRebaseEntry[];

  // Loading/error state
  isLoading: boolean;
  error: string | null;

  // Actions
  open: (onto: string) => Promise<void>;
  close: () => void;
  setEntryAction: (index: number, action: RebaseAction) => void;
  moveEntry: (fromIndex: number, toIndex: number) => void;
  reset: () => void;
}

const initialState = {
  isOpen: false,
  onto: '',
  preview: null,
  entries: [],
  isLoading: false,
  error: null,
};

export const useInteractiveRebaseStore = create<InteractiveRebaseState>((set, get) => ({
  ...initialState,

  open: async (onto: string) => {
    set({ isLoading: true, error: null, onto, isOpen: true });
    try {
      const preview = await rebaseApi.getInteractivePreview(onto);
      set({
        preview,
        entries: preview.entries,
        isLoading: false,
      });
    } catch (error) {
      set({
        error: getErrorMessage(error),
        isLoading: false,
      });
    }
  },

  close: () => {
    set({ isOpen: false });
  },

  setEntryAction: (index: number, action: RebaseAction) => {
    const entries = [...get().entries];
    if (index >= 0 && index < entries.length) {
      entries[index] = { ...entries[index], action };
      set({ entries });
    }
  },

  moveEntry: (fromIndex: number, toIndex: number) => {
    const entries = [...get().entries];
    if (
      fromIndex >= 0 &&
      fromIndex < entries.length &&
      toIndex >= 0 &&
      toIndex < entries.length &&
      fromIndex !== toIndex
    ) {
      const [removed] = entries.splice(fromIndex, 1);
      entries.splice(toIndex, 0, removed);
      set({ entries });
    }
  },

  reset: () => {
    set(initialState);
  },
}));
