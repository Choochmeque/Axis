import { useState } from 'react';
import { Cherry, AlertCircle, Check } from 'lucide-react';
import { cherryPickApi } from '../../services/api';
import type { Commit, CherryPickResult } from '../../types';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogBody,
  DialogFooter,
  DialogClose,
  Button,
  Label,
  CheckboxField,
  Alert,
} from '@/components/ui';

interface CherryPickDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCherryPickComplete?: (result: CherryPickResult) => void;
  commits: Commit[];
}

export function CherryPickDialog({
  isOpen,
  onClose,
  onCherryPickComplete,
  commits,
}: CherryPickDialogProps) {
  const [noCommit, setNoCommit] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CherryPickResult | null>(null);

  const handleCherryPick = async () => {
    if (commits.length === 0) {
      setError('No commits selected');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const cherryPickResult = await cherryPickApi.cherryPick({
        commits: commits.map((c) => c.oid),
        noCommit: noCommit,
        allowEmpty: false,
      });

      setResult(cherryPickResult);

      if (cherryPickResult.success) {
        onCherryPickComplete?.(cherryPickResult);
      }
    } catch (err) {
      console.error('Cherry-pick failed:', err);
      setError(err instanceof Error ? err.message : 'Cherry-pick failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAbort = async () => {
    try {
      await cherryPickApi.abort();
      setResult(null);
      setError(null);
      onClose();
    } catch (err) {
      console.error('Failed to abort cherry-pick:', err);
      setError('Failed to abort cherry-pick');
    }
  };

  const handleContinue = async () => {
    setIsLoading(true);
    try {
      const continueResult = await cherryPickApi.continue();
      setResult(continueResult);
      if (continueResult.success) {
        onCherryPickComplete?.(continueResult);
      }
    } catch (err) {
      console.error('Failed to continue cherry-pick:', err);
      setError('Failed to continue cherry-pick');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = async () => {
    setIsLoading(true);
    try {
      const skipResult = await cherryPickApi.skip();
      setResult(skipResult);
      if (skipResult.success) {
        onCherryPickComplete?.(skipResult);
      }
    } catch (err) {
      console.error('Failed to skip commit:', err);
      setError('Failed to skip commit');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-125">
        <DialogTitle>
          <Cherry size={18} />
          Cherry Pick
        </DialogTitle>

        <DialogBody>
          {error && (
            <Alert variant="error" className="mb-4">
              <AlertCircle size={16} />
              <span>{error}</span>
            </Alert>
          )}

          {result && (
            <Alert variant={result.success ? 'success' : 'warning'} className="mb-4">
              {result.success ? <Check size={16} /> : <AlertCircle size={16} />}
              <span>{result.message}</span>
            </Alert>
          )}

          {!result && (
            <>
              <div className="field">
                <Label>
                  {commits.length === 1 ? 'Commit to Cherry Pick' : 'Commits to Cherry Pick'}
                </Label>
                <div className="max-h-50 overflow-y-auto border border-(--border-color) rounded-md">
                  {commits.map((commit) => (
                    <div
                      key={commit.oid}
                      className="flex items-center gap-3 py-2.5 px-3 border-b border-(--border-color) last:border-b-0"
                    >
                      <span className="shrink-0 font-mono text-xs font-semibold text-(--accent-color)">
                        {commit.shortOid}
                      </span>
                      <span className="flex-1 text-base text-(--text-primary) overflow-hidden text-ellipsis whitespace-nowrap">
                        {commit.summary}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <CheckboxField
                id="no-commit"
                label="Stage changes only (--no-commit)"
                description="Apply changes without creating a commit"
                checked={noCommit}
                disabled={isLoading}
                onCheckedChange={setNoCommit}
              />
            </>
          )}

          {result && result.conflicts.length > 0 && (
            <div className="mt-4 p-3 bg-(--bg-secondary) rounded-md">
              <h4 className="m-0 mb-2 text-base font-semibold text-(--text-primary)">
                Conflicted Files
              </h4>
              <ul className="m-0 p-0 list-none">
                {result.conflicts.map((conflict) => (
                  <li
                    key={conflict.path}
                    className="py-1.5 text-base font-mono text-warning border-b border-(--border-color) last:border-b-0"
                  >
                    {conflict.path}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </DialogBody>

        <DialogFooter>
          {result && !result.success ? (
            <>
              <Button variant="destructive" onClick={handleAbort}>
                Abort
              </Button>
              <Button variant="secondary" onClick={handleSkip} disabled={isLoading}>
                Skip Commit
              </Button>
              <Button variant="primary" onClick={handleContinue} disabled={isLoading}>
                Continue
              </Button>
            </>
          ) : result && result.success ? (
            <Button variant="primary" onClick={onClose}>
              Close
            </Button>
          ) : (
            <>
              <DialogClose asChild>
                <Button variant="secondary" disabled={isLoading}>
                  Cancel
                </Button>
              </DialogClose>
              <Button
                variant="primary"
                onClick={handleCherryPick}
                disabled={isLoading || commits.length === 0}
              >
                {isLoading ? 'Cherry Picking...' : 'Cherry Pick'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
