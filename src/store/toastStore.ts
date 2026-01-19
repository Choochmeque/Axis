import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  createdAt: number;
  duration: number;
}

export interface ToastHistoryItem extends Toast {
  dismissedAt: number;
}

interface ToastState {
  toasts: Toast[];
  history: ToastHistoryItem[];
  historyCapacity: number;

  addToast: (toast: Omit<Toast, 'id' | 'createdAt'>) => string;
  removeToast: (id: string) => void;
  clearAll: () => void;
  clearHistory: () => void;
  setHistoryCapacity: (capacity: number) => void;
}

const DEFAULT_DURATIONS: Record<ToastType, number> = {
  success: 3000,
  info: 4000,
  warning: 5000,
  error: 6000,
};

let toastCounter = 0;

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  history: [],
  historyCapacity: 50,

  addToast: (toast) => {
    const id = `toast-${++toastCounter}-${Date.now()}`;
    const duration = toast.duration ?? DEFAULT_DURATIONS[toast.type];
    const newToast: Toast = {
      ...toast,
      id,
      duration,
      createdAt: Date.now(),
    };

    set((state) => ({
      toasts: [...state.toasts, newToast],
    }));

    // Auto-dismiss after duration
    if (duration > 0) {
      setTimeout(() => {
        get().removeToast(id);
      }, duration);
    }

    return id;
  },

  removeToast: (id) => {
    set((state) => {
      const toast = state.toasts.find((t) => t.id === id);
      if (!toast) {
        return state;
      }

      const historyItem: ToastHistoryItem = {
        ...toast,
        dismissedAt: Date.now(),
      };

      // Add to history, trim if over capacity
      let newHistory = [historyItem, ...state.history];
      if (newHistory.length > state.historyCapacity) {
        newHistory = newHistory.slice(0, state.historyCapacity);
      }

      return {
        toasts: state.toasts.filter((t) => t.id !== id),
        history: newHistory,
      };
    });
  },

  clearAll: () => {
    set((state) => {
      // Move all active toasts to history
      const now = Date.now();
      const historyItems: ToastHistoryItem[] = state.toasts.map((t) => ({
        ...t,
        dismissedAt: now,
      }));

      let newHistory = [...historyItems, ...state.history];
      if (newHistory.length > state.historyCapacity) {
        newHistory = newHistory.slice(0, state.historyCapacity);
      }

      return {
        toasts: [],
        history: newHistory,
      };
    });
  },

  clearHistory: () => {
    set({ history: [] });
  },

  setHistoryCapacity: (capacity) => {
    set((state) => {
      const newCapacity = Math.min(Math.max(capacity, 10), 200);
      let newHistory = state.history;
      if (newHistory.length > newCapacity) {
        newHistory = newHistory.slice(0, newCapacity);
      }
      return {
        historyCapacity: newCapacity,
        history: newHistory,
      };
    });
  },
}));
