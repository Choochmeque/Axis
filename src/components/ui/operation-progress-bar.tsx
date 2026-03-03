import { useTranslation } from 'react-i18next';

import { formatBytes } from '@/lib/utils';
import type { OperationProgress } from '@/store/operationStore';
import { ProgressStage } from '@/types';

function formatProgressText(progress: OperationProgress, t: (key: string) => string): string {
  const bytes = formatBytes(progress.receivedBytes);
  const stage = t(`ui.operations.stages.${progress.stage}`);

  if (
    progress.stage === ProgressStage.Resolving &&
    progress.totalDeltas &&
    progress.indexedDeltas
  ) {
    return `${stage}: ${progress.indexedDeltas}/${progress.totalDeltas}`;
  }

  if (progress.totalObjects && progress.receivedObjects !== undefined) {
    return `${stage}: ${progress.receivedObjects}/${progress.totalObjects} (${bytes})`;
  }

  return `${stage}: ${bytes}`;
}

function getProgressPercent(progress: OperationProgress): number {
  if (
    progress.stage === ProgressStage.Resolving &&
    progress.totalDeltas &&
    progress.indexedDeltas
  ) {
    return Math.round((progress.indexedDeltas / progress.totalDeltas) * 100);
  }

  if (progress.totalObjects && progress.receivedObjects !== undefined) {
    return Math.round((progress.receivedObjects / progress.totalObjects) * 100);
  }

  return 0;
}

interface OperationProgressBarProps {
  progress: OperationProgress;
  className?: string;
}

export function OperationProgressBar({ progress, className }: OperationProgressBarProps) {
  const { t } = useTranslation();
  const percent = getProgressPercent(progress);

  return (
    <div className={className}>
      <div className="operations-progress-bar">
        <div className="operations-progress-fill" style={{ width: `${percent}%` }} />
      </div>
      <div className="operations-progress-text">{formatProgressText(progress, t)}</div>
    </div>
  );
}
