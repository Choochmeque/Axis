import { useState, useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';
import { useOperationStore, type Operation } from '@/store/operationStore';

function formatDuration(startedAt: number): string {
  const seconds = Math.floor((Date.now() - startedAt) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ${seconds % 60}s`;
}

function OperationItem({ operation }: { operation: Operation }) {
  const [, forceUpdate] = useState(0);

  // Update duration every second
  useEffect(() => {
    const interval = setInterval(() => forceUpdate((n) => n + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="operations-item">
      <Loader2 size={14} className="operations-item-spinner" />
      <div className="operations-item-content">
        <div className="operations-item-name">{operation.name}</div>
        {operation.description && (
          <div className="operations-item-description">{operation.description}</div>
        )}
      </div>
      <div className="operations-item-time">{formatDuration(operation.startedAt)}</div>
    </div>
  );
}

interface OperationsIndicatorProps {
  className?: string;
}

export function OperationsIndicator({ className }: OperationsIndicatorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const operations = useOperationStore((s) => s.operations);

  const operationsList = Array.from(operations.values());
  const count = operationsList.length;

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
        title={`${count} operation${count !== 1 ? 's' : ''} in progress`}
        aria-label="Operations in progress"
        aria-expanded={isOpen}
      >
        <Loader2 size={14} className="operations-spinner" />
        <span className="operations-badge">{count}</span>
      </button>

      {isOpen && (
        <div className="operations-dropdown">
          <div className="operations-header">Operations in Progress</div>
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
