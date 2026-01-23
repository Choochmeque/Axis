import { AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogBody,
  DialogFooter,
  DialogClose,
  Button,
  Alert,
} from '@/components/ui';
import { useCustomActionsStore } from '@/store/customActionsStore';

export function ActionConfirmDialog() {
  const showConfirmDialog = useCustomActionsStore((s) => s.showConfirmDialog);
  const pendingAction = useCustomActionsStore((s) => s.pendingAction);
  const cancelConfirmation = useCustomActionsStore((s) => s.cancelConfirmation);
  const proceedWithExecution = useCustomActionsStore((s) => s.proceedWithExecution);

  if (!pendingAction) return null;

  const message =
    pendingAction.confirmMessage || `Are you sure you want to run "${pendingAction.name}"?`;

  return (
    <Dialog open={showConfirmDialog} onOpenChange={(open) => !open && cancelConfirmation()}>
      <DialogContent className="max-w-100">
        <DialogTitle icon={AlertTriangle} iconClassName="text-warning">
          Confirm Action
        </DialogTitle>

        <DialogBody>
          <Alert variant="warning">{message}</Alert>
          {pendingAction.description && (
            <p className="text-muted-foreground mt-2 text-sm">{pendingAction.description}</p>
          )}
        </DialogBody>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary">Cancel</Button>
          </DialogClose>
          <Button variant="primary" onClick={proceedWithExecution}>
            Run
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
