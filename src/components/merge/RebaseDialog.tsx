import { useState, useEffect } from 'react';
import { GitBranch, AlertCircle, Check, Loader2 } from 'lucide-react';
import { rebaseApi, branchApi } from '../../services/api';
import {
  BranchType,
  type Branch,
  type Commit,
  type RebasePreview,
  type RebaseResult,
} from '../../types';
import { RebasePreviewDiagram } from './RebasePreviewDiagram';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogBody,
  DialogFooter,
  DialogClose,
  Button,
  FormField,
  Select,
  Label,
  Alert,
} from '@/components/ui';

interface RebaseDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onRebaseComplete?: (result: RebaseResult) => void;
  currentBranch: string;
  targetCommit?: Commit;
}

export function RebaseDialog({
  isOpen,
  onClose,
  onRebaseComplete,
  currentBranch,
  targetCommit,
}: RebaseDialogProps) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RebaseResult | null>(null);
  const [preview, setPreview] = useState<RebasePreview | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setResult(null);
      setSelectedBranch('');
      setPreview(null);
      if (!targetCommit) {
        loadBranches();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, targetCommit]);

  // Load preview when target changes
  useEffect(() => {
    const loadPreview = async () => {
      const rebaseTarget = targetCommit?.oid ?? selectedBranch;
      if (!rebaseTarget || !isOpen) {
        setPreview(null);
        return;
      }

      setIsLoadingPreview(true);
      try {
        const previewData = await rebaseApi.getPreview(rebaseTarget);
        setPreview(previewData);
      } catch (err) {
        console.error('Failed to load rebase preview:', err);
        setPreview(null);
      } finally {
        setIsLoadingPreview(false);
      }
    };

    loadPreview();
  }, [isOpen, targetCommit, selectedBranch]);

  const loadBranches = async () => {
    try {
      const allBranches = await branchApi.list(true, true);
      // Filter out the current branch
      const otherBranches = allBranches.filter((b) => b.name !== currentBranch && !b.isHead);
      setBranches(otherBranches);
    } catch (err) {
      console.error('Failed to load branches:', err);
      setError('Failed to load branches');
    }
  };

  const handleRebase = async () => {
    const rebaseTarget = targetCommit ? targetCommit.oid : selectedBranch;

    if (!rebaseTarget) {
      setError('Please select a branch to rebase onto');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const rebaseResult = await rebaseApi.rebase({
        onto: rebaseTarget,
        interactive: false,
        preserveMerges: false,
        autosquash: false,
      });

      setResult(rebaseResult);

      if (rebaseResult.success) {
        onRebaseComplete?.(rebaseResult);
      }
    } catch (err) {
      console.error('Rebase failed:', err);
      setError(err instanceof Error ? err.message : 'Rebase failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAbort = async () => {
    try {
      await rebaseApi.abort();
      setResult(null);
      setError(null);
      onClose();
    } catch (err) {
      console.error('Failed to abort rebase:', err);
      setError('Failed to abort rebase');
    }
  };

  const handleContinue = async () => {
    setIsLoading(true);
    try {
      const continueResult = await rebaseApi.continue();
      setResult(continueResult);
      if (continueResult.success) {
        onRebaseComplete?.(continueResult);
      }
    } catch (err) {
      console.error('Failed to continue rebase:', err);
      setError('Failed to continue rebase');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = async () => {
    setIsLoading(true);
    try {
      const skipResult = await rebaseApi.skip();
      setResult(skipResult);
      if (skipResult.success) {
        onRebaseComplete?.(skipResult);
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
          <GitBranch size={18} />
          Rebase Branch
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
              <FormField label="Current Branch">
                <div className="py-2.5 px-3 text-sm font-mono text-(--accent-color) bg-(--bg-secondary) rounded-md font-medium">
                  {currentBranch}
                </div>
              </FormField>

              {targetCommit ? (
                <div className="field">
                  <Label>Rebase Onto Commit</Label>
                  <div className="flex items-center gap-3 py-2.5 px-3 border border-(--border-color) rounded-md bg-(--bg-secondary)">
                    <span className="shrink-0 font-mono text-xs font-semibold text-(--accent-color)">
                      {targetCommit.shortOid}
                    </span>
                    <span className="flex-1 text-[13px] text-(--text-primary) overflow-hidden text-ellipsis whitespace-nowrap">
                      {targetCommit.summary}
                    </span>
                  </div>
                </div>
              ) : (
                <FormField label="Rebase Onto" htmlFor="rebase-branch">
                  <Select
                    id="rebase-branch"
                    value={selectedBranch}
                    onChange={(e) => setSelectedBranch(e.target.value)}
                    disabled={isLoading}
                  >
                    <option value="">Select a branch...</option>
                    {branches.map((branch) => (
                      <option key={branch.fullName} value={branch.name}>
                        {branch.name}
                        {branch.branchType === BranchType.Remote && ` (${branch.branchType})`}
                      </option>
                    ))}
                  </Select>
                </FormField>
              )}

              {isLoadingPreview && (
                <div className="flex items-center justify-center p-4">
                  <Loader2 size={16} className="animate-spin text-(--text-secondary)" />
                  <span className="ml-2 text-sm text-(--text-secondary)">Loading preview...</span>
                </div>
              )}

              {preview && !isLoadingPreview && (
                <RebasePreviewDiagram preview={preview} currentBranch={currentBranch} />
              )}

              <div className="p-3 bg-(--bg-secondary) rounded-md text-[13px] text-(--text-secondary)">
                <p className="m-0 mb-2">
                  This will replay all commits from{' '}
                  <strong className="text-(--text-primary) font-mono">{currentBranch}</strong> on
                  top of{' '}
                  <strong className="text-(--text-primary) font-mono">
                    {targetCommit ? targetCommit.shortOid : selectedBranch || '...'}
                  </strong>
                  .
                </p>
                <p className="m-0 text-xs text-warning">
                  Warning: Rebase rewrites commit history. Only rebase commits that haven't been
                  pushed to a shared repository.
                </p>
              </div>
            </>
          )}

          {result && result.conflicts.length > 0 && (
            <div className="mt-4 p-3 bg-(--bg-secondary) rounded-md">
              <h4 className="m-0 mb-2 text-[13px] font-semibold text-(--text-primary)">
                Conflicted Files
              </h4>
              <ul className="m-0 p-0 list-none">
                {result.conflicts.map((conflict) => (
                  <li
                    key={conflict.path}
                    className="py-1.5 text-[13px] font-mono text-warning border-b border-(--border-color) last:border-b-0"
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
                Abort Rebase
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
                onClick={handleRebase}
                disabled={isLoading || (!targetCommit && !selectedBranch)}
              >
                {isLoading ? 'Rebasing...' : 'Rebase'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
