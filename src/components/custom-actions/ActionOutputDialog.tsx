import { CheckCircle, Terminal, XCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTitle,
} from '@/components/ui';
import { useCustomActionsStore } from '@/store/customActionsStore';

export function ActionOutputDialog() {
  const { t } = useTranslation();
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
          {isSuccess ? t('customActions.output.completed') : t('customActions.output.failed')}
        </DialogTitle>

        <DialogBody className="space-y-4">
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <Terminal className="h-4 w-4" />
            <span>{t('customActions.output.exitCode', { code: lastResult.exitCode })}</span>
            <span className="text-muted-foreground/60">({lastResult.durationMs}ms)</span>
          </div>

          {lastResult.stdout && (
            <div>
              <div className="mb-1 text-sm font-medium">
                {t('customActions.output.outputLabel')}
              </div>
              <pre className="bg-muted max-h-60 overflow-auto rounded p-3 font-mono text-xs">
                {lastResult.stdout}
              </pre>
            </div>
          )}

          {lastResult.stderr && (
            <div>
              <div className="mb-1 text-sm font-medium text-destructive">
                {isSuccess ? t('customActions.output.warnings') : t('customActions.output.error')}
              </div>
              <pre className="bg-destructive/10 text-destructive max-h-40 overflow-auto rounded p-3 font-mono text-xs">
                {lastResult.stderr}
              </pre>
            </div>
          )}

          {!lastResult.stdout && !lastResult.stderr && (
            <p className="text-muted-foreground text-sm">{t('customActions.output.noOutput')}</p>
          )}
        </DialogBody>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary">{t('common.close')}</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
