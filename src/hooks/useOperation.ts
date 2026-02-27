import { useCallback } from 'react';

import { type OperationCategory, useOperationStore } from '@/store/operationStore';

interface TrackOperationOptions {
  name: string;
  description?: string;
  category?: OperationCategory;
  id?: string;
}

export function useOperation() {
  const startOperation = useOperationStore((s) => s.startOperation);
  const updateOperation = useOperationStore((s) => s.updateOperation);
  const completeOperation = useOperationStore((s) => s.completeOperation);

  const trackOperation = useCallback(
    async <T>(options: TrackOperationOptions, asyncFn: () => Promise<T>): Promise<T> => {
      const id = startOperation(options.name, {
        id: options.id,
        description: options.description,
        category: options.category,
      });

      try {
        return await asyncFn();
      } finally {
        completeOperation(id);
      }
    },
    [startOperation, completeOperation]
  );

  return {
    trackOperation,
    startOperation: useCallback(
      (
        name: string,
        options?: { description?: string; category?: OperationCategory; id?: string }
      ) => startOperation(name, options),
      [startOperation]
    ),
    updateOperation,
    completeOperation,
  };
}
