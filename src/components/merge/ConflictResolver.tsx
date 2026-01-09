import { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, Check, X, RefreshCw } from 'lucide-react';
import { conflictApi, operationApi } from '../../services/api';
import type { ConflictedFile, ConflictContent, OperationState } from '../../types';
import './ConflictResolver.css';

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

      if (conflictedFiles.length === 0 && opState.type !== 'none') {
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
      await conflictApi.resolveConflict(selectedFile, 'ours');
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
      await conflictApi.resolveConflict(selectedFile, 'theirs');
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
      await conflictApi.resolveConflict(selectedFile, 'merged', mergedContent);
      await loadConflicts();
      setSelectedFile(null);
    } catch (err) {
      console.error('Failed to resolve conflict:', err);
      setError('Failed to resolve conflict');
    }
  };

  const getOperationLabel = () => {
    if (!operationState) return '';
    switch (operationState.type) {
      case 'merging':
        return `Merging${operationState.branch ? ` ${operationState.branch}` : ''}`;
      case 'rebasing':
        return `Rebasing${operationState.current && operationState.total ? ` (${operationState.current}/${operationState.total})` : ''}`;
      case 'cherry_picking':
        return 'Cherry Picking';
      case 'reverting':
        return 'Reverting';
      default:
        return '';
    }
  };

  if (conflicts.length === 0 && operationState?.type === 'none') {
    return null;
  }

  return (
    <div className="conflict-resolver">
      <div className="conflict-resolver-header">
        <div className="conflict-resolver-title">
          <AlertTriangle size={18} className="warning-icon" />
          <span>Resolve Conflicts</span>
          {operationState && operationState.type !== 'none' && (
            <span className="operation-badge">{getOperationLabel()}</span>
          )}
        </div>
        <button
          className="btn-icon"
          onClick={loadConflicts}
          title="Refresh conflicts"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {error && (
        <div className="conflict-error">
          <AlertTriangle size={14} />
          <span>{error}</span>
          <button onClick={() => setError(null)}>
            <X size={14} />
          </button>
        </div>
      )}

      <div className="conflict-resolver-body">
        <div className="conflict-file-list">
          <div className="conflict-file-list-header">
            {conflicts.length} conflicted file{conflicts.length !== 1 ? 's' : ''}
          </div>
          {conflicts.map((conflict) => (
            <div
              key={conflict.path}
              className={`conflict-file-item ${selectedFile === conflict.path ? 'selected' : ''} ${conflict.is_resolved ? 'resolved' : ''}`}
              onClick={() => setSelectedFile(conflict.path)}
            >
              <span className="conflict-file-path">{conflict.path}</span>
              {conflict.is_resolved && (
                <Check size={14} className="resolved-icon" />
              )}
            </div>
          ))}
        </div>

        <div className="conflict-content-area">
          {isLoading ? (
            <div className="conflict-loading">Loading...</div>
          ) : conflictContent ? (
            <>
              <div className="conflict-versions">
                <div className="conflict-version ours">
                  <div className="version-header">
                    <span>Ours (Current)</span>
                    <button
                      className="btn btn-small"
                      onClick={handleResolveOurs}
                    >
                      Use This
                    </button>
                  </div>
                  <pre className="version-content">
                    {conflictContent.ours || '(deleted)'}
                  </pre>
                </div>

                <div className="conflict-version theirs">
                  <div className="version-header">
                    <span>Theirs (Incoming)</span>
                    <button
                      className="btn btn-small"
                      onClick={handleResolveTheirs}
                    >
                      Use This
                    </button>
                  </div>
                  <pre className="version-content">
                    {conflictContent.theirs || '(deleted)'}
                  </pre>
                </div>
              </div>

              <div className="conflict-merged">
                <div className="version-header">
                  <span>Merged Result</span>
                  <button
                    className="btn btn-primary btn-small"
                    onClick={handleResolveMerged}
                  >
                    Mark Resolved
                  </button>
                </div>
                <textarea
                  className="merged-editor"
                  value={mergedContent}
                  onChange={(e) => setMergedContent(e.target.value)}
                  spellCheck={false}
                />
              </div>
            </>
          ) : (
            <div className="conflict-placeholder">
              Select a file to resolve conflicts
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
