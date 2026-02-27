import { AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Button,
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTitle,
} from '@/components/ui';
import { useCustomActionsStore } from '@/store/customActionsStore';

export function ActionConfirmDialog() {
  const { t } = useTranslation();
  const showConfirmDialog = useCustomActionsStore((s) => s.showConfirmDialog);
  const pendingAction = useCustomActionsStore((s) => s.pendingAction);
  const cancelConfirmation = useCustomActionsStore((s) => s.cancelConfirmation);
  const proceedWithExecution = useCustomActionsStore((s) => s.proceedWithExecution);

  if (!pendingAction) return null;

  const message =
    pendingAction.confirmMessage ||
    t('customActions.confirm.defaultMessage', { name: pendingAction.name });

  return (
    <Dialog open={showConfirmDialog} onOpenChange={(open) => !open && cancelConfirmation()}>
      <DialogContent className="max-w-100">
        <DialogTitle icon={AlertTriangle} iconClassName="text-warning">
          {t('customActions.confirm.title')}
        </DialogTitle>

        <DialogBody>
          <Alert variant="warning">{message}</Alert>
          {pendingAction.description && (
            <p className="text-muted-foreground mt-2 text-sm">{pendingAction.description}</p>
          )}
        </DialogBody>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary">{t('common.cancel')}</Button>
          </DialogClose>
          <Button variant="primary" onClick={proceedWithExecution}>
            {t('customActions.confirm.runButton')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
