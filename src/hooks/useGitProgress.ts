import { useEffect, useRef } from 'react';
import { UnlistenFn } from '@tauri-apps/api/event';

import { events } from '@/bindings/api';
import { operations, OperationProgress } from '@/store/operationStore';
import { GitOperationType, ProgressStage } from '@/types';

/* eslint-disable @typescript-eslint/naming-convention */
const OPERATION_NAMES: Record<GitOperationType, string> = {
  Clone: 'Cloning repository',
  Fetch: 'Fetching',
  Push: 'Pushing',
  Pull: 'Pulling',
};
/* eslint-enable @typescript-eslint/naming-convention */

export function useGitProgress() {
  const unlistenRef = useRef<UnlistenFn | null>(null);

  useEffect(() => {
    const setupListener = async () => {
      unlistenRef.current = await events.gitOperationProgressEvent.listen((event) => {
        const {
          operationId,
          operationType,
          stage,
          totalObjects,
          receivedObjects,
          indexedObjects,
          receivedBytes,
          totalDeltas,
          indexedDeltas,
          message,
        } = event.payload;

        const isTerminal =
          stage === ProgressStage.Complete ||
          stage === ProgressStage.Failed ||
          stage === ProgressStage.Cancelled;

        if (isTerminal) {
          operations.complete(operationId);
          return;
        }

        const progress: OperationProgress = {
          stage,
          totalObjects: totalObjects ?? undefined,
          receivedObjects: receivedObjects ?? undefined,
          indexedObjects: indexedObjects ?? undefined,
          receivedBytes,
          totalDeltas: totalDeltas ?? undefined,
          indexedDeltas: indexedDeltas ?? undefined,
          message: message ?? undefined,
        };

        // Start operation if not exists, or update progress
        operations.start(OPERATION_NAMES[operationType], {
          id: operationId,
          category: 'git',
          operationType,
          cancellable: operationType === 'Clone' || operationType === 'Fetch',
        });

        operations.updateProgress(operationId, progress);
      });
    };

    setupListener();

    return () => {
      if (unlistenRef.current) {
        unlistenRef.current();
        unlistenRef.current = null;
      }
    };
  }, []);
}
