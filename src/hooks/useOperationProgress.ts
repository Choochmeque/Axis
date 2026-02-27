import { useMemo } from 'react';

import { type Operation, useOperationStore } from '@/store/operationStore';
import type { GitOperationType } from '@/types';

/**
 * Hook to get the current operation progress for a specific operation type.
 * Useful for dialogs that want to show progress inline.
 */
export function useOperationProgress(operationType: GitOperationType): Operation | undefined {
  const operations = useOperationStore((s) => s.operations);

  return useMemo(() => {
    for (const op of operations.values()) {
      if (op.operationType === operationType && op.progress) {
        return op;
      }
    }
    return undefined;
  }, [operations, operationType]);
}
