import { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, Check, X, RefreshCw } from 'lucide-react';
import { conflictApi, operationApi } from '@/services/api';
import { ConflictResolution } from '@/types';
import type { ConflictedFile, ConflictContent, OperationState } from '@/types';
import { cn } from '@/lib/utils';

const btnIconClass =
  'flex items-center justify-center w-7 h-7 p-0 bg-transparent border-none rounded text-(--text-secondary) cursor-pointer transition-colors hover:bg-(--bg-hover) hover:text-(--text-primary)';
const btnSmallClass =
  'py-1 px-2.5 text-[11px] font-medium border border-(--border-color) rounded bg-(--bg-secondary) text-(--text-primary) cursor-pointer hover:bg-(--bg-hover)';
const btnPrimarySmallClass =
  'py-1 px-2.5 text-[11px] font-medium border-none rounded bg-(--accent-color) text-white cursor-pointer hover:opacity-90';

interface ConflictResolverProps {
  onAllResolved?: () => void;
}

export function ConflictResolver({ onAllResolved }: ConflictResolverProps) {
  const [conflicts, setConflicts] = useState<ConflictedFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [conflictContent, setConflictContent] = useState<ConflictContent | null>(null);
  const [operationState, setOperationState] = useState<OperationState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mergedContent, setMergedContent] = useState<string>('');

  const loadConflicts = useCallback(async () => {
    try {
      const [conflictedFiles, opState] = await Promise.all([
        conflictApi.getConflictedFiles(),
        operationApi.getState(),
      ]);
      setConflicts(conflictedFiles);
      setOperationState(opState);

      if (conflictedFiles.length === 0 && opState !== 'None') {
        onAllResolved?.();
      }

      // Select first conflict if none selected
      if (conflictedFiles.length > 0 && !selectedFile) {
        setSelectedFile(conflictedFiles[0].path);
      }
    } catch (err) {
      console.error('Failed to load conflicts:', err);
      setError('Failed to load conflicts');
    }
  }, [selectedFile, onAllResolved]);

  useEffect(() => {
    loadConflicts();
  }, [loadConflicts]);

  useEffect(() => {
    const loadContent = async () => {
      if (!selectedFile) {
        setConflictContent(null);
        return;
      }

      setIsLoading(true);
      try {
        const content = await conflictApi.getConflictContent(selectedFile);
        setConflictContent(content);
        setMergedContent(content.merged);
      } catch (err) {
        console.error('Failed to load conflict content:', err);
        setError('Failed to load file content');
      } finally {
        setIsLoading(false);
      }
    };

    loadContent();
  }, [selectedFile]);

  const handleResolveOurs = async () => {
    if (!selectedFile) return;

    try {
      await conflictApi.resolveConflict(selectedFile, ConflictResolution.Ours);
      await loadConflicts();
      setSelectedFile(null);
    } catch (err) {
      console.error('Failed to resolve conflict:', err);
      setError('Failed to resolve conflict');
    }
  };

  const handleResolveTheirs = async () => {
    if (!selectedFile) return;

    try {
      await conflictApi.resolveConflict(selectedFile, ConflictResolution.Theirs);
      await loadConflicts();
      setSelectedFile(null);
    } catch (err) {
      console.error('Failed to resolve conflict:', err);
      setError('Failed to resolve conflict');
    }
  };

  const handleResolveMerged = async () => {
    if (!selectedFile) return;

    try {
      await conflictApi.resolveConflict(selectedFile, ConflictResolution.Merged, mergedContent);
      await loadConflicts();
      setSelectedFile(null);
    } catch (err) {
      console.error('Failed to resolve conflict:', err);
      setError('Failed to resolve conflict');
    }
  };

  const getOperationLabel = () => {
    if (!operationState || operationState === 'None') return '';
    if ('Merging' in operationState) {
      const { branch } = operationState.Merging;
      return `Merging${branch ? ` ${branch}` : ''}`;
    }
    if ('Rebasing' in operationState) {
      const { current, total } = operationState.Rebasing;
      return `Rebasing${current != null && total != null ? ` (${String(current)}/${String(total)})` : ''}`;
    }
    if ('CherryPicking' in operationState) {
      return 'Cherry Picking';
    }
    if ('Reverting' in operationState) {
      return 'Reverting';
    }
    return '';
  };

  if (conflicts.length === 0 && operationState === 'None') {
    return null;
  }

  return (
    <div className="flex flex-col h-full bg-(--bg-primary) border border-(--border-color) rounded-lg overflow-hidden">
      <div className="flex items-center justify-between py-3 px-4 bg-warning/10 border-b border-warning/30">
        <div className="flex items-center gap-2 text-sm font-semibold text-(--text-primary)">
          <AlertTriangle size={18} className="text-warning" />
          <span>Resolve Conflicts</span>
          {operationState && operationState !== 'None' && (
            <span className="py-0.5 px-2 text-[11px] font-medium bg-(--bg-secondary) rounded text-(--text-secondary)">
              {getOperationLabel()}
            </span>
          )}
        </div>
        <button className={btnIconClass} onClick={loadConflicts} title="Refresh conflicts">
          <RefreshCw size={16} />
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 py-2 px-4 bg-error/10 border-b border-error/30 text-error text-xs">
          <AlertTriangle size={14} />
          <span className="flex-1">{error}</span>
          <button
            className="p-0.5 bg-transparent border-none text-inherit cursor-pointer opacity-70 hover:opacity-100"
            onClick={() => setError(null)}
          >
            <X size={14} />
          </button>
        </div>
      )}

      <div className="flex flex-1 min-h-0">
        <div className="w-62.5 border-r border-(--border-color) bg-(--bg-secondary) overflow-y-auto">
          <div className="py-2 px-3 text-[11px] font-semibold text-(--text-secondary) uppercase tracking-wide border-b border-(--border-color)">
            {conflicts.length} conflicted file{conflicts.length !== 1 ? 's' : ''}
          </div>
          {conflicts.map((conflict) => (
            <div
              key={conflict.path}
              className={cn(
                'flex items-center justify-between py-2 px-3 text-[13px] cursor-pointer transition-colors border-b border-(--border-color)',
                selectedFile === conflict.path
                  ? 'bg-(--bg-active) border-l-2 border-l-(--accent-color) pl-2.5'
                  : 'hover:bg-(--bg-hover)',
                conflict.isResolved && 'opacity-60'
              )}
              onClick={() => setSelectedFile(conflict.path)}
            >
              <span
                className={cn(
                  'font-mono overflow-hidden text-ellipsis whitespace-nowrap',
                  conflict.isResolved ? 'text-success' : 'text-warning'
                )}
              >
                {conflict.path}
              </span>
              {conflict.isResolved && <Check size={14} className="text-success shrink-0" />}
            </div>
          ))}
        </div>

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-full text-(--text-secondary) text-sm">
              Loading...
            </div>
          ) : conflictContent ? (
            <>
              <div className="flex flex-1 min-h-0 border-b border-(--border-color)">
                <div className="flex-1 flex flex-col min-w-0 border-r border-(--border-color)">
                  <div className="flex items-center justify-between py-2 px-3 bg-blue-500/10 border-b border-(--border-color) text-xs font-semibold text-blue-500">
                    <span>Ours (Current)</span>
                    <button className={btnSmallClass} onClick={handleResolveOurs}>
                      Use This
                    </button>
                  </div>
                  <pre className="flex-1 m-0 p-3 overflow-auto font-mono text-xs leading-relaxed whitespace-pre-wrap wrap-break-word bg-(--bg-primary) text-(--text-primary)">
                    {conflictContent.ours || '(deleted)'}
                  </pre>
                </div>

                <div className="flex-1 flex flex-col min-w-0">
                  <div className="flex items-center justify-between py-2 px-3 bg-purple-500/10 border-b border-(--border-color) text-xs font-semibold text-purple-500">
                    <span>Theirs (Incoming)</span>
                    <button className={btnSmallClass} onClick={handleResolveTheirs}>
                      Use This
                    </button>
                  </div>
                  <pre className="flex-1 m-0 p-3 overflow-auto font-mono text-xs leading-relaxed whitespace-pre-wrap wrap-break-word bg-(--bg-primary) text-(--text-primary)">
                    {conflictContent.theirs || '(deleted)'}
                  </pre>
                </div>
              </div>

              <div className="flex flex-col h-[40%] min-h-37.5">
                <div className="flex items-center justify-between py-2 px-3 bg-green-500/10 border-b border-(--border-color) text-xs font-semibold text-green-500">
                  <span>Merged Result</span>
                  <button className={btnPrimarySmallClass} onClick={handleResolveMerged}>
                    Mark Resolved
                  </button>
                </div>
                <textarea
                  className="flex-1 m-0 p-3 font-mono text-xs leading-relaxed bg-(--bg-input) text-(--text-primary) border-none resize-none outline-none focus:bg-(--bg-primary)"
                  value={mergedContent}
                  onChange={(e) => setMergedContent(e.target.value)}
                  spellCheck={false}
                />
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-(--text-secondary) text-sm">
              Select a file to resolve conflicts
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
