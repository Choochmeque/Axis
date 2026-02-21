import { useEffect, useRef } from 'react';
import { UnlistenFn } from '@tauri-apps/api/event';

import { events } from '@/bindings/api';
import i18n from '@/i18n';
import { operations } from '@/store/operationStore';
import { HookStage } from '@/types';

function getHookName(hookType: string): string {
  return i18n.t(`repoSettings.hooks.labels.${hookType}`);
}

export function useHookProgress() {
  const unlistenRef = useRef<UnlistenFn | null>(null);

  useEffect(() => {
    const setupListener = async () => {
      unlistenRef.current = await events.hookProgressEvent.listen((event) => {
        const { operationId, hookType, stage, message } = event.payload;

        const isTerminal =
          stage === HookStage.Complete ||
          stage === HookStage.Failed ||
          stage === HookStage.Cancelled;

        if (isTerminal) {
          operations.complete(operationId);
          return;
        }

        operations.start(getHookName(hookType), {
          id: operationId,
          category: 'hook',
          cancellable: true,
          description: message ?? undefined,
        });
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
