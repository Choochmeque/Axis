import type { OperationProgress } from '@/store/operationStore';
import { ProgressStage } from '@/types';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatProgressText(progress: OperationProgress): string {
  const bytes = formatBytes(progress.receivedBytes);

  if (
    progress.stage === ProgressStage.Resolving &&
    progress.totalDeltas &&
    progress.indexedDeltas
  ) {
    return `Resolving: ${progress.indexedDeltas}/${progress.totalDeltas}`;
  }

  if (progress.totalObjects && progress.receivedObjects !== undefined) {
    return `${progress.stage}: ${progress.receivedObjects}/${progress.totalObjects} (${bytes})`;
  }

  return `${progress.stage}: ${bytes}`;
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
  const percent = getProgressPercent(progress);

  return (
    <div className={className}>
      <div className="operations-progress-bar">
        <div className="operations-progress-fill" style={{ width: `${percent}%` }} />
      </div>
      <div className="operations-progress-text">{formatProgressText(progress)}</div>
    </div>
  );
}
