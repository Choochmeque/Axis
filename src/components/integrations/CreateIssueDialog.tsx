import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { CircleDot } from 'lucide-react';

import { getErrorMessage } from '@/lib/errorUtils';
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
  Textarea,
  Alert,
} from '@/components/ui';
import { useIntegrationStore } from '@/store/integrationStore';
import { toast } from '@/hooks';

interface CreateIssueDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function CreateIssueDialog({ isOpen, onClose, onCreated }: CreateIssueDialogProps) {
  const { t } = useTranslation();
  const { createIssue } = useIntegrationStore();

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [labels, setLabels] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setBody('');
      setLabels('');
      setError(null);
    }
  }, [isOpen]);

  const handleSubmit = useCallback(async () => {
    if (!title.trim()) {
      setError(t('integrations.issues.create.titleRequired'));
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const labelList = labels
        .split(',')
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

      await createIssue({
        title: title.trim(),
        body: body.trim() || null,
        labels: labelList,
        assignees: [],
      });
      toast.success(t('integrations.issues.create.created'));
      onCreated();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }, [title, body, labels, createIssue, onCreated, t]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogTitle icon={CircleDot}>{t('integrations.issues.create.title')}</DialogTitle>

        <DialogBody>
          {error && (
            <Alert variant="error" inline className="mb-3">
              {error}
            </Alert>
          )}

          <FormField label={t('integrations.issues.create.titleLabel')} htmlFor="issue-title">
            <Input
              id="issue-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('integrations.issues.create.titlePlaceholder')}
              autoFocus
            />
          </FormField>

          <FormField label={t('integrations.issues.create.descriptionLabel')} htmlFor="issue-body">
            <Textarea
              id="issue-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={t('integrations.issues.create.descriptionPlaceholder')}
              rows={8}
            />
          </FormField>

          <FormField
            label={t('integrations.issues.create.labelsLabel')}
            htmlFor="issue-labels"
            hint={t('integrations.issues.create.labelsHint')}
          >
            <Input
              id="issue-labels"
              value={labels}
              onChange={(e) => setLabels(e.target.value)}
              placeholder={t('integrations.issues.create.labelsPlaceholder')}
            />
          </FormField>
        </DialogBody>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary" disabled={isSubmitting}>
              {t('common.cancel')}
            </Button>
          </DialogClose>
          <Button variant="primary" onClick={handleSubmit} disabled={isSubmitting || !title.trim()}>
            {isSubmitting
              ? t('integrations.issues.create.creating')
              : t('integrations.issues.create.createButton')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
