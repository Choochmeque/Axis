import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Trash2, AlertTriangle } from 'lucide-react';
import { branchApi } from '../../services/api';
import { useRepositoryStore } from '../../store/repositoryStore';
import type { Branch } from '../../types';
import './BranchDialog.css';

interface DeleteBranchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branch?: Branch;
}

export function DeleteBranchDialog({
  open,
  onOpenChange,
  branch,
}: DeleteBranchDialogProps) {
  const [force, setForce] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { loadBranches, refreshRepository } = useRepositoryStore();

  const handleDelete = async () => {
    if (!branch) return;

    setIsLoading(true);
    setError(null);

    try {
      await branchApi.delete(branch.name, force);
      await loadBranches();
      await refreshRepository();
      onOpenChange(false);
    } catch (err) {
      const errorMsg = String(err);
      if (errorMsg.includes('not fully merged') && !force) {
        setError('Branch is not fully merged. Check "Force delete" to delete anyway.');
      } else {
        setError(errorMsg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!branch) return null;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-content">
          <Dialog.Title className="dialog-title">
            <Trash2 size={18} />
            Delete Branch
          </Dialog.Title>

          <div className="dialog-body">
            <div className="warning-message">
              <AlertTriangle size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} />
              This action cannot be undone.
            </div>

            <div className="branch-info">
              <div className="branch-info-row">
                <span className="branch-info-label">Branch:</span>
                <span className="branch-info-value">{branch.name}</span>
              </div>
              <div className="branch-info-row">
                <span className="branch-info-label">Last commit:</span>
                <span className="branch-info-value">{branch.last_commit_summary}</span>
              </div>
            </div>

            <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 16 }}>
              Are you sure you want to delete the branch "{branch.name}"?
            </p>

            <div className="form-field checkbox-field">
              <input
                id="force-delete"
                type="checkbox"
                checked={force}
                onChange={(e) => setForce(e.target.checked)}
              />
              <label htmlFor="force-delete">
                Force delete (even if not fully merged)
              </label>
            </div>

            {error && <div className="error-message">{error}</div>}
          </div>

          <div className="dialog-footer">
            <Dialog.Close asChild>
              <button className="dialog-button secondary">Cancel</button>
            </Dialog.Close>
            <button
              className="dialog-button danger"
              onClick={handleDelete}
              disabled={isLoading}
            >
              {isLoading ? 'Deleting...' : 'Delete Branch'}
            </button>
          </div>

          <Dialog.Close asChild>
            <button className="dialog-close" aria-label="Close">
              <X size={16} />
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
