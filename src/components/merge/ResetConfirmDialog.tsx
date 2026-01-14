import { useState } from 'react';
import { RotateCcw, AlertCircle, AlertTriangle } from 'lucide-react';
import { operationApi } from '../../services/api';
import type { Commit, ResetMode } from '../../types';
import { cn } from '../../lib/utils';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogBody,
  DialogFooter,
  DialogClose,
  Button,
  Label,
  Alert,
} from '@/components/ui';

interface ResetConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onResetComplete?: () => void;
  commit: Commit;
  mode: ResetMode;
  currentBranch: string;
}

const modeDescriptions: Record<ResetMode, { title: string; description: string; warning: string }> =
  {
    Soft: {
      title: 'Soft Reset',
      description: 'Move branch pointer to target commit. All changes will be kept staged.',
      warning: 'This is a safe operation. No changes will be lost.',
    },
    Mixed: {
      title: 'Mixed Reset',
      description: 'Move branch pointer to target commit. All changes will be kept but unstaged.',
      warning: 'This is a safe operation. No changes will be lost.',
    },
    Hard: {
      title: 'Hard Reset',
      description:
        'Move branch pointer to target commit. All changes will be permanently discarded.',
      warning: 'This will permanently delete all uncommitted changes. This cannot be undone!',
    },
  };

export function ResetConfirmDialog({
  isOpen,
  onClose,
  onResetComplete,
  commit,
  mode,
  currentBranch,
}: ResetConfirmDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const modeInfo = modeDescriptions[mode];
  const isHardReset = mode === 'Hard';

  const handleReset = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await operationApi.reset({
        target: commit.oid,
        mode,
      });
      onResetComplete?.();
      onClose();
    } catch (err) {
      console.error('Reset failed:', err);
      setError(err instanceof Error ? err.message : 'Reset failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open && !isLoading) {
      setError(null);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-125">
        <DialogTitle>
          <RotateCcw size={18} />
          {modeInfo.title}
        </DialogTitle>

        <DialogBody>
          {error && (
            <Alert variant="error" className="mb-4">
              <AlertCircle size={16} />
              <span>{error}</span>
            </Alert>
          )}

          <div className="field">
            <Label>Branch</Label>
            <div className="py-2.5 px-3 text-sm font-mono text-(--accent-color) bg-(--bg-secondary) rounded-md font-medium">
              {currentBranch}
            </div>
          </div>

          <div className="field">
            <Label>Reset to Commit</Label>
            <div className="flex items-center gap-3 py-2.5 px-3 border border-(--border-color) rounded-md bg-(--bg-secondary)">
              <span className="shrink-0 font-mono text-xs font-semibold text-(--accent-color)">
                {commit.shortOid}
              </span>
              <span className="flex-1 text-[13px] text-(--text-primary) overflow-hidden text-ellipsis whitespace-nowrap">
                {commit.summary}
              </span>
            </div>
          </div>

          <div className="p-3 bg-(--bg-secondary) rounded-md text-[13px] text-(--text-secondary)">
            <p className="m-0 mb-2">{modeInfo.description}</p>
          </div>

          <div
            className={cn(
              'p-3 rounded-md text-[13px] flex items-start gap-2',
              isHardReset
                ? 'bg-error/10 text-error border border-error/30'
                : 'bg-(--bg-secondary) text-(--text-secondary)'
            )}
          >
            {isHardReset ? <AlertTriangle size={16} className="shrink-0 mt-0.5" /> : null}
            <p className="m-0">{modeInfo.warning}</p>
          </div>
        </DialogBody>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary" disabled={isLoading}>
              Cancel
            </Button>
          </DialogClose>
          <Button
            variant={isHardReset ? 'destructive' : 'primary'}
            onClick={handleReset}
            disabled={isLoading}
          >
            {isLoading ? 'Resetting...' : `Reset ${mode.charAt(0).toUpperCase() + mode.slice(1)}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
