import { Loader2, X } from 'lucide-react';
import { startTransition, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/utils';
import { shellApi } from '@/services/api';
import { type Operation, type OperationProgress, useOperationStore } from '@/store/operationStore';
import { ProgressStage } from '@/types';

function formatDuration(startedAt: number): string {
  const seconds = Math.floor((Date.now() - startedAt) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ${seconds % 60}s`;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`;
}

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

function OperationItem({ operation }: { operation: Operation }) {
  const { t } = useTranslation();
  const [, forceUpdate] = useState(0);

  // Update duration every second
  useEffect(() => {
    const interval = setInterval(() => forceUpdate((n) => n + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const handleCancel = async () => {
    try {
      await shellApi.cancelOperation(operation.id);
    } catch (err) {
      console.warn('Failed to cancel operation:', err);
    }
  };

  const progress = operation.progress;
  const percent = progress ? getProgressPercent(progress) : 0;

  return (
    <div className="operations-item">
      <Loader2 size={14} className="operations-item-spinner" />
      <div className="operations-item-content">
        <div className="operations-item-name">{operation.name}</div>
        {operation.description && (
          <div className="operations-item-description">{operation.description}</div>
        )}
        {progress && (
          <>
            <div className="operations-progress-bar">
              <div className="operations-progress-fill" style={{ width: `${percent}%` }} />
            </div>
            <div className="operations-progress-text">{formatProgressText(progress, t)}</div>
          </>
        )}
      </div>
      <div className="operations-item-time">{formatDuration(operation.startedAt)}</div>
      {operation.cancellable && (
        <button className="operations-cancel-btn" onClick={handleCancel}>
          <X size={14} />
        </button>
      )}
    </div>
  );
}

interface OperationsIndicatorProps {
  className?: string;
}

export function OperationsIndicator({ className }: OperationsIndicatorProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const prevProgressCountRef = useRef(0);
  const operations = useOperationStore((s) => s.operations);

  const operationsList = Array.from(operations.values());
  const count = operationsList.length;

  // Auto-open when an operation with progress starts
  const progressCount = operationsList.filter((op) => op.progress).length;
  useEffect(() => {
    if (progressCount > prevProgressCountRef.current && progressCount > 0) {
      startTransition(() => setIsOpen(true));
    }
    prevProgressCountRef.current = progressCount;
  }, [progressCount]);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Close on escape
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  // Don't render if no active operations
  if (count === 0) return null;

  return (
    <div className={cn('operations-wrapper', className)} ref={dropdownRef}>
      <button
        className="operations-trigger"
        onClick={() => setIsOpen(!isOpen)}
        title={t('ui.operations.count', { count })}
        aria-label={t('ui.operations.ariaLabel')}
        aria-expanded={isOpen}
      >
        <Loader2 size={14} className="operations-spinner" />
        <span className="operations-badge">{count}</span>
      </button>

      {isOpen && (
        <div className="operations-dropdown">
          <div className="operations-header">{t('ui.operations.title')}</div>
          <div className="operations-list">
            {operationsList.map((op) => (
              <OperationItem key={op.id} operation={op} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
