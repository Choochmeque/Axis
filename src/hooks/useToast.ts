import { useCallback } from 'react';

import { useToastStore, type ToastType } from '@/store/toastStore';

interface ToastHelpers {
  success: (title: string, description?: string) => string;
  error: (title: string, description?: string) => string;
  warning: (title: string, description?: string) => string;
  info: (title: string, description?: string) => string;
  dismiss: (id: string) => void;
  dismissAll: () => void;
}

// Standalone toast object for non-component code (hooks, stores)
export const toast: ToastHelpers = {
  success: (title: string, description?: string) =>
    useToastStore.getState().addToast({ type: 'success', title, description, duration: 3000 }),
  error: (title: string, description?: string) =>
    useToastStore.getState().addToast({ type: 'error', title, description, duration: 6000 }),
  warning: (title: string, description?: string) =>
    useToastStore.getState().addToast({ type: 'warning', title, description, duration: 5000 }),
  info: (title: string, description?: string) =>
    useToastStore.getState().addToast({ type: 'info', title, description, duration: 4000 }),
  dismiss: (id: string) => useToastStore.getState().removeToast(id),
  dismissAll: () => useToastStore.getState().clearAll(),
};

// React hook for components
export function useToast(): ToastHelpers {
  const addToast = useToastStore((s) => s.addToast);
  const removeToast = useToastStore((s) => s.removeToast);
  const clearAll = useToastStore((s) => s.clearAll);

  const createToast = useCallback(
    (type: ToastType, title: string, description?: string) => {
      const durations: Record<ToastType, number> = {
        success: 3000,
        error: 6000,
        warning: 5000,
        info: 4000,
      };
      return addToast({ type, title, description, duration: durations[type] });
    },
    [addToast]
  );

  return {
    success: useCallback(
      (title: string, description?: string) => createToast('success', title, description),
      [createToast]
    ),
    error: useCallback(
      (title: string, description?: string) => createToast('error', title, description),
      [createToast]
    ),
    warning: useCallback(
      (title: string, description?: string) => createToast('warning', title, description),
      [createToast]
    ),
    info: useCallback(
      (title: string, description?: string) => createToast('info', title, description),
      [createToast]
    ),
    dismiss: useCallback((id: string) => removeToast(id), [removeToast]),
    dismissAll: useCallback(() => clearAll(), [clearAll]),
  };
}
