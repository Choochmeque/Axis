import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2 } from 'lucide-react';
import { toast } from '@/hooks';
import { getErrorMessage } from '@/lib/errorUtils';
import { tagApi } from '@/services/api';
import { useRepositoryStore } from '@/store/repositoryStore';
import type { Tag, Remote } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogBody,
  DialogFooter,
  DialogClose,
  Button,
  CheckboxField,
  Alert,
} from '@/components/ui';

interface DeleteTagDialogProps {
  isOpen: boolean;
  onClose: () => void;
  tag?: Tag;
  remotes: Remote[];
}

export function DeleteTagDialog({ isOpen, onClose, tag, remotes }: DeleteTagDialogProps) {
  const { t } = useTranslation();
  const [deleteRemote, setDeleteRemote] = useState(false);
  const [selectedRemote, setSelectedRemote] = useState('origin');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { loadTags, refreshRepository } = useRepositoryStore();

  useEffect(() => {
    if (isOpen) {
      setDeleteRemote(false);
      setSelectedRemote('origin');
      setError(null);
    }
  }, [isOpen]);

  const hasRemotes = remotes.length > 0;

  const handleDelete = async () => {
    if (!tag) return;

    setIsLoading(true);
    setError(null);

    try {
      await tagApi.delete(tag.name);

      if (deleteRemote && hasRemotes) {
        await tagApi.deleteRemote(tag.name, selectedRemote);
      }

      await loadTags();
      await refreshRepository();
      onClose();
      toast.success(t('notifications.success.tagDeleted', { name: tag.name }));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  if (!tag) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogTitle icon={Trash2}>{t('sidebar.tag.delete.title')}</DialogTitle>

        <DialogBody>
          <Alert variant="warning" className="mb-4">
            {t('sidebar.tag.delete.warning')}
          </Alert>

          <div className="dialog-info-box">
            <div className="flex justify-between text-base py-1">
              <span className="text-(--text-secondary)">{t('sidebar.tag.delete.tagLabel')}</span>
              <span className="text-(--text-primary) font-medium">{tag.name}</span>
            </div>
            <div className="flex justify-between text-base py-1">
              <span className="text-(--text-secondary)">{t('sidebar.tag.delete.targetLabel')}</span>
              <span className="text-(--text-primary) font-medium">{tag.shortOid}</span>
            </div>
            {tag.isAnnotated && (
              <div className="flex justify-between text-base py-1">
                <span className="text-(--text-secondary)">{t('sidebar.tag.delete.typeLabel')}</span>
                <span className="text-(--text-primary) font-medium">
                  {t('sidebar.tag.list.annotated')}
                </span>
              </div>
            )}
          </div>

          <p className="text-sm text-(--text-secondary) mb-4">
            {t('sidebar.tag.delete.confirmMessage', { name: tag.name })}
          </p>

          {hasRemotes && (
            <div className="flex items-center gap-2">
              <CheckboxField
                id="delete-remote-tag"
                label={
                  remotes.length === 1
                    ? t('sidebar.tag.delete.deleteRemote', { remote: remotes[0].name })
                    : t('sidebar.tag.delete.deleteRemoteSelect')
                }
                checked={deleteRemote}
                onCheckedChange={setDeleteRemote}
              />
              {deleteRemote && remotes.length > 1 && (
                <select
                  className="text-sm bg-(--bg-tertiary) border border-(--border-primary) rounded px-2 py-1 text-(--text-primary)"
                  value={selectedRemote}
                  onChange={(e) => setSelectedRemote(e.target.value)}
                >
                  {remotes.map((remote) => (
                    <option key={remote.name} value={remote.name}>
                      {remote.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {error && (
            <Alert variant="error" inline className="mt-3">
              {error}
            </Alert>
          )}
        </DialogBody>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary">{t('common.cancel')}</Button>
          </DialogClose>
          <Button variant="destructive" onClick={handleDelete} disabled={isLoading}>
            {isLoading ? t('common.deleting') : t('sidebar.tag.delete.deleteButton')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
