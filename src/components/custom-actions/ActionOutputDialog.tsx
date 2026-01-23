import { CheckCircle, XCircle, Terminal } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogBody,
  DialogFooter,
  DialogClose,
  Button,
} from '@/components/ui';
import { useCustomActionsStore } from '@/store/customActionsStore';

export function ActionOutputDialog() {
  const showOutputDialog = useCustomActionsStore((s) => s.showOutputDialog);
  const lastResult = useCustomActionsStore((s) => s.lastResult);
  const closeOutputDialog = useCustomActionsStore((s) => s.closeOutputDialog);

  if (!lastResult) return null;

  const isSuccess = lastResult.exitCode === 0;
  const Icon = isSuccess ? CheckCircle : XCircle;
  const iconClass = isSuccess ? 'text-success' : 'text-destructive';

  return (
    <Dialog open={showOutputDialog} onOpenChange={(open) => !open && closeOutputDialog()}>
      <DialogContent className="max-w-150">
        <DialogTitle icon={Icon} iconClassName={iconClass}>
          {isSuccess ? 'Action Completed' : 'Action Failed'}
        </DialogTitle>

        <DialogBody className="space-y-4">
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <Terminal className="h-4 w-4" />
            <span>Exit code: {lastResult.exitCode}</span>
            <span className="text-muted-foreground/60">({lastResult.durationMs}ms)</span>
          </div>

          {lastResult.stdout && (
            <div>
              <div className="mb-1 text-sm font-medium">Output:</div>
              <pre className="bg-muted max-h-60 overflow-auto rounded p-3 font-mono text-xs">
                {lastResult.stdout}
              </pre>
            </div>
          )}

          {lastResult.stderr && (
            <div>
              <div className="mb-1 text-sm font-medium text-destructive">
                {isSuccess ? 'Warnings:' : 'Error:'}
              </div>
              <pre className="bg-destructive/10 text-destructive max-h-40 overflow-auto rounded p-3 font-mono text-xs">
                {lastResult.stderr}
              </pre>
            </div>
          )}

          {!lastResult.stdout && !lastResult.stderr && (
            <p className="text-muted-foreground text-sm">No output</p>
          )}
        </DialogBody>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
