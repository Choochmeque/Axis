import { useState, useEffect } from 'react';
import { GitMerge, AlertCircle } from 'lucide-react';
import { toast } from '@/hooks';
import { getErrorMessage } from '@/lib/errorUtils';
import { mergeApi, branchApi } from '../../services/api';
import { BranchType, type Branch, type MergeResult } from '../../types';
import { cn } from '../../lib/utils';
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
  Textarea,
  CheckboxField,
  Alert,
} from '@/components/ui';

interface MergeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onMergeComplete?: (result: MergeResult) => void;
  currentBranch: string;
}

export function MergeDialog({ isOpen, onClose, onMergeComplete, currentBranch }: MergeDialogProps) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [noFastForward, setNoFastForward] = useState(false);
  const [squash, setSquash] = useState(false);
  const [customMessage, setCustomMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MergeResult | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadBranches();
      setError(null);
      setResult(null);
      setSelectedBranch('');
      setNoFastForward(false);
      setSquash(false);
      setCustomMessage('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const loadBranches = async () => {
    try {
      const allBranches = await branchApi.list(true, true);
      // Filter out the current branch
      const otherBranches = allBranches.filter((b) => b.name !== currentBranch && !b.isHead);
      setBranches(otherBranches);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleMerge = async () => {
    if (!selectedBranch) {
      setError('Please select a branch to merge');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const mergeResult = await mergeApi.merge({
        branch: selectedBranch,
        message: customMessage || null,
        noFf: noFastForward,
        ffOnly: false,
        squash,
      });

      if (mergeResult.success && mergeResult.conflicts.length === 0) {
        onMergeComplete?.(mergeResult);
        onClose();
        toast.success(`Merged "${selectedBranch}" into ${currentBranch}`);
      } else {
        setResult(mergeResult);
        if (mergeResult.success) {
          onMergeComplete?.(mergeResult);
        }
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleAbort = async () => {
    try {
      await mergeApi.abort();
      setResult(null);
      setError(null);
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-125">
        <DialogTitle icon={GitMerge}>Merge Branch</DialogTitle>

        <DialogBody>
          {error && (
            <Alert variant="error" className="mb-4">
              <AlertCircle size={16} />
              <span>{error}</span>
            </Alert>
          )}

          {result && (
            <Alert variant="warning" className="mb-4">
              <AlertCircle size={16} />
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

              <FormField label="Merge From" htmlFor="merge-branch">
                <Select
                  id="merge-branch"
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

              <FormField label="Commit Message (optional)" htmlFor="merge-message">
                <Textarea
                  id="merge-message"
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder={`Merge branch '${selectedBranch || '...'}' into ${currentBranch}`}
                  disabled={isLoading}
                  rows={3}
                  className={cn('resize-y min-h-15')}
                />
              </FormField>

              <CheckboxField
                id="no-ff"
                label="Create merge commit (--no-ff)"
                description="Always create a merge commit, even if fast-forward is possible"
                checked={noFastForward}
                disabled={isLoading || squash}
                onCheckedChange={setNoFastForward}
              />

              <CheckboxField
                id="squash"
                label="Squash commits"
                description="Combine all commits into a single commit"
                checked={squash}
                disabled={isLoading}
                onCheckedChange={(checked) => {
                  setSquash(checked);
                  if (checked) setNoFastForward(false);
                }}
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
          {result ? (
            <>
              <Button variant="secondary" onClick={handleAbort}>
                Abort Merge
              </Button>
              <Button variant="primary" onClick={onClose}>
                Resolve Conflicts
              </Button>
            </>
          ) : (
            <>
              <DialogClose asChild>
                <Button variant="secondary" disabled={isLoading}>
                  Cancel
                </Button>
              </DialogClose>
              <Button
                variant="primary"
                onClick={handleMerge}
                disabled={isLoading || !selectedBranch}
              >
                {isLoading ? 'Merging...' : 'Merge'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
