import { useState, useEffect } from 'react';
import { Search, AlertCircle, CheckCircle2, XCircle, SkipForward } from 'lucide-react';

import { toast, useOperation } from '@/hooks';
import { getErrorMessage } from '@/lib/errorUtils';
import { bisectApi } from '@/services/api';
import { BisectMarkType, type BisectState, type BisectResult } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogBody,
  DialogFooter,
  DialogClose,
  Button,
  FormField,
  Input,
  Alert,
} from '@/components/ui';

interface BisectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onBisectComplete?: (result: BisectResult) => void;
  badCommit?: string;
  goodCommit?: string;
}

export function BisectDialog({
  isOpen,
  onClose,
  onBisectComplete,
  badCommit: initialBad,
  goodCommit: initialGood,
}: BisectDialogProps) {
  const [badCommit, setBadCommit] = useState(initialBad ?? '');
  const [goodCommit, setGoodCommit] = useState(initialGood ?? '');
  const [bisectState, setBisectState] = useState<BisectState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { trackOperation } = useOperation();

  useEffect(() => {
    if (isOpen) {
      loadBisectState();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const loadBisectState = async () => {
    try {
      const state = await bisectApi.getState();
      setBisectState(state);
      if (!state.isActive) {
        setBadCommit(initialBad ?? '');
        setGoodCommit(initialGood ?? '');
      }
      setError(null);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleStart = async () => {
    if (!goodCommit) {
      setError('Please specify a good (old) commit');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await trackOperation(
        { name: 'Bisect Start', description: 'Starting bisect session', category: 'git' },
        () =>
          bisectApi.start({
            badCommit: badCommit || undefined,
            goodCommit,
          })
      );

      if (result.success) {
        setBisectState(result.state);
        toast.success(
          'Bisect started',
          `Testing commit ${result.state.currentCommit?.substring(0, 7)}`
        );
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleMark = async (mark: BisectMarkType) => {
    setIsLoading(true);
    setError(null);

    try {
      const markLabels = {
        [BisectMarkType.Good]: 'good',
        [BisectMarkType.Bad]: 'bad',
        [BisectMarkType.Skip]: 'skipped',
      };

      const result = await trackOperation(
        {
          name: `Mark ${markLabels[mark]}`,
          description: `Marking commit as ${markLabels[mark]}`,
          category: 'git',
        },
        () => bisectApi.mark(mark)
      );

      if (result.state.firstBadCommit) {
        toast.success(
          'Bisect complete',
          `First bad commit: ${result.state.firstBadCommit.substring(0, 7)}`
        );
        setBisectState(result.state);
        onBisectComplete?.(result);
      } else if (result.success) {
        setBisectState(result.state);
        toast.info('Testing next commit', result.state.currentCommit?.substring(0, 7));
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async () => {
    setIsLoading(true);
    try {
      await bisectApi.reset();
      setBisectState(null);
      onClose();
      toast.success('Bisect ended');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const isActive = bisectState?.isActive ?? false;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-125">
        <DialogTitle icon={Search}>Git Bisect</DialogTitle>

        <DialogBody>
          {error && (
            <Alert variant="error" className="mb-4">
              <AlertCircle size={16} />
              <span>{error}</span>
            </Alert>
          )}

          {bisectState?.firstBadCommit && (
            <div className="p-4 bg-success/10 border border-success/30 rounded-md mb-4">
              <div className="flex items-center gap-2 text-success font-semibold mb-2">
                <CheckCircle2 size={18} />
                <span>First Bad Commit Found</span>
              </div>
              <code className="block p-2 bg-(--bg-secondary) rounded font-mono text-sm">
                {bisectState.firstBadCommit}
              </code>
            </div>
          )}

          {!isActive && !bisectState?.firstBadCommit && (
            <>
              <FormField label="Bad (New) Commit" htmlFor="bad-commit">
                <Input
                  id="bad-commit"
                  value={badCommit}
                  onChange={(e) => setBadCommit(e.target.value)}
                  placeholder="HEAD (leave empty for current)"
                  disabled={isLoading}
                />
              </FormField>

              <FormField label="Good (Old) Commit" htmlFor="good-commit" required>
                <Input
                  id="good-commit"
                  value={goodCommit}
                  onChange={(e) => setGoodCommit(e.target.value)}
                  placeholder="Enter commit hash or ref"
                  disabled={isLoading}
                />
              </FormField>

              <div className="p-3 bg-(--bg-secondary) rounded-md text-sm text-(--text-secondary)">
                <p className="m-0">
                  Bisect uses binary search to find the commit that introduced a bug. Specify a
                  known good (working) commit and optionally a bad (broken) commit.
                </p>
              </div>
            </>
          )}

          {isActive && !bisectState?.firstBadCommit && (
            <>
              <div className="p-3 bg-(--bg-secondary) rounded-md mb-4">
                <div className="text-sm text-(--text-secondary) mb-2">Current commit to test:</div>
                <code className="block p-2 bg-(--bg-primary) rounded font-mono text-sm text-(--accent-color)">
                  {bisectState?.currentCommit?.substring(0, 12)}
                </code>
                {bisectState?.stepsRemaining !== undefined && (
                  <div className="text-xs text-(--text-tertiary) mt-2">
                    ~{bisectState.stepsRemaining} steps remaining ({bisectState.totalCommits}{' '}
                    commits left)
                  </div>
                )}
              </div>

              <div className="text-sm text-(--text-secondary) mb-3">
                Test this commit and mark it:
              </div>

              <div className="flex gap-2 justify-center">
                <Button
                  variant="secondary"
                  onClick={() => handleMark(BisectMarkType.Good)}
                  disabled={isLoading}
                  className="flex-1"
                >
                  <CheckCircle2 size={16} className="text-success" />
                  Good
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => handleMark(BisectMarkType.Bad)}
                  disabled={isLoading}
                  className="flex-1"
                >
                  <XCircle size={16} className="text-error" />
                  Bad
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => handleMark(BisectMarkType.Skip)}
                  disabled={isLoading}
                  className="flex-1"
                >
                  <SkipForward size={16} />
                  Skip
                </Button>
              </div>

              {((bisectState?.goodCommits?.length ?? 0) > 0 ||
                (bisectState?.skippedCommits?.length ?? 0) > 0) && (
                <div className="mt-4 text-xs text-(--text-tertiary)">
                  <div>Good: {bisectState?.goodCommits?.length ?? 0} commits</div>
                  <div>Skipped: {bisectState?.skippedCommits?.length ?? 0} commits</div>
                </div>
              )}
            </>
          )}
        </DialogBody>

        <DialogFooter>
          {isActive || bisectState?.firstBadCommit ? (
            <>
              <Button variant="destructive" onClick={handleReset} disabled={isLoading}>
                End Bisect
              </Button>
              <DialogClose asChild>
                <Button variant="secondary">Close</Button>
              </DialogClose>
            </>
          ) : (
            <>
              <DialogClose asChild>
                <Button variant="secondary" disabled={isLoading}>
                  Cancel
                </Button>
              </DialogClose>
              <Button variant="primary" onClick={handleStart} disabled={isLoading || !goodCommit}>
                {isLoading ? 'Starting...' : 'Start Bisect'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
