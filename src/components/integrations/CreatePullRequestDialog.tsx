import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { GitBranch, Sparkles } from 'lucide-react';

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
  CheckboxField,
  Select,
  SelectItem,
  Alert,
} from '@/components/ui';
import { useRepositoryStore } from '@/store/repositoryStore';
import { useIntegrationStore } from '@/store/integrationStore';
import { useSettingsStore } from '@/store/settingsStore';
import { aiApi } from '@/services/api';
import { getErrorMessage } from '@/lib/errorUtils';
import { toast } from '@/hooks';

interface CreatePullRequestDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function CreatePullRequestDialog({
  isOpen,
  onClose,
  onCreated,
}: CreatePullRequestDialogProps) {
  const { t } = useTranslation();
  const { branches, loadBranches } = useRepositoryStore();
  const { createPullRequest } = useIntegrationStore();
  const { settings } = useSettingsStore();

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [sourceBranch, setSourceBranch] = useState('');
  const [targetBranch, setTargetBranch] = useState('');
  const [isDraft, setIsDraft] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get local branches for selection
  const localBranches = useMemo(() => branches.filter((b) => b.branchType === 'Local'), [branches]);

  // Get current branch for default source
  const currentBranch = useMemo(() => localBranches.find((b) => b.isHead), [localBranches]);

  // Check if selected source branch has been pushed to remote
  const sourceBranchData = useMemo(
    () => localBranches.find((b) => b.name === sourceBranch),
    [localBranches, sourceBranch]
  );
  const isSourceBranchPushed = !!sourceBranchData?.upstream;

  // Common target branches
  const defaultTargetBranches = useMemo(() => ['main', 'master', 'develop', 'dev'], []);

  // Reload branches when dialog opens
  useEffect(() => {
    if (isOpen) {
      loadBranches();
    }
  }, [isOpen, loadBranches]);

  // Reset form when dialog opens (separate effect to avoid loop)
  useEffect(() => {
    if (isOpen && localBranches.length > 0) {
      setTitle('');
      setBody('');
      setSourceBranch(currentBranch?.name ?? '');
      const defaultTarget =
        localBranches.find((b) => defaultTargetBranches.includes(b.name))?.name ?? '';
      setTargetBranch(defaultTarget);
      setIsDraft(false);
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Clear target if it matches the new source
  useEffect(() => {
    if (sourceBranch && targetBranch === sourceBranch) {
      setTargetBranch('');
    }
  }, [sourceBranch, targetBranch]);

  const handleGenerateWithAi = useCallback(async () => {
    if (!sourceBranch || !targetBranch) {
      setError(t('integrations.pullRequests.create.selectBranchesFirst'));
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const response = await aiApi.generatePrDescription(sourceBranch, targetBranch, true);
      setTitle(response.title);
      setBody(response.body);
      toast.success(
        t('integrations.pullRequests.create.aiGenerated', { model: response.modelUsed })
      );
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsGenerating(false);
    }
  }, [sourceBranch, targetBranch, t]);

  const handleSubmit = useCallback(async () => {
    if (!title.trim()) {
      setError(t('integrations.pullRequests.create.titleRequired'));
      return;
    }
    if (!sourceBranch) {
      setError(t('integrations.pullRequests.create.sourceBranchRequired'));
      return;
    }
    if (!targetBranch) {
      setError(t('integrations.pullRequests.create.targetBranchRequired'));
      return;
    }
    if (!isSourceBranchPushed) {
      setError(t('integrations.pullRequests.create.sourceMustBePushed'));
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await createPullRequest({
        title: title.trim(),
        body: body.trim() || null,
        sourceBranch,
        targetBranch,
        draft: isDraft,
      });
      toast.success(t('integrations.pullRequests.create.created'));
      onCreated();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }, [
    title,
    body,
    sourceBranch,
    targetBranch,
    isDraft,
    isSourceBranchPushed,
    createPullRequest,
    onCreated,
    t,
  ]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogTitle icon={GitBranch}>{t('integrations.pullRequests.create.title')}</DialogTitle>

        <DialogBody>
          {error && (
            <Alert variant="error" inline className="mb-3">
              {error}
            </Alert>
          )}

          <FormField
            label={t('integrations.pullRequests.create.fromLabel')}
            htmlFor="pr-source"
            error={
              sourceBranch && !isSourceBranchPushed
                ? t('integrations.pullRequests.create.notPushed')
                : undefined
            }
          >
            <Select
              id="pr-source"
              value={sourceBranch}
              onValueChange={setSourceBranch}
              placeholder={t('integrations.pullRequests.create.selectBranch')}
            >
              {localBranches.map((branch) => (
                <SelectItem key={branch.name} value={branch.name}>
                  {branch.name}
                  {branch.isHead ? t('integrations.pullRequests.create.currentSuffix') : ''}
                </SelectItem>
              ))}
            </Select>
          </FormField>

          <FormField label={t('integrations.pullRequests.create.intoLabel')} htmlFor="pr-target">
            <Select
              id="pr-target"
              value={targetBranch}
              onValueChange={setTargetBranch}
              placeholder={t('integrations.pullRequests.create.selectBranch')}
            >
              {localBranches
                .filter((branch) => branch.name !== sourceBranch)
                .map((branch) => (
                  <SelectItem key={branch.name} value={branch.name}>
                    {branch.name}
                  </SelectItem>
                ))}
            </Select>
          </FormField>

          <div className="field">
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="pr-title" className="text-base font-medium text-(--text-secondary)">
                {t('integrations.pullRequests.create.titleLabel')}
              </label>
              <Button
                variant="ghost"
                size="icon"
                className="flex items-center justify-center h-7 w-7 p-0"
                onClick={handleGenerateWithAi}
                disabled={
                  !settings?.aiEnabled ||
                  !sourceBranch ||
                  !targetBranch ||
                  isGenerating ||
                  isSubmitting
                }
                title={
                  isGenerating
                    ? t('integrations.pullRequests.create.generating')
                    : t('integrations.pullRequests.create.generateWithAi')
                }
              >
                <Sparkles size={14} className={isGenerating ? 'animate-pulse' : ''} />
              </Button>
            </div>
            <Input
              id="pr-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('integrations.pullRequests.create.titlePlaceholder')}
              autoFocus
            />
          </div>

          <FormField
            label={t('integrations.pullRequests.create.descriptionLabel')}
            htmlFor="pr-body"
          >
            <Textarea
              id="pr-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={t('integrations.pullRequests.create.descriptionPlaceholder')}
              rows={6}
            />
          </FormField>

          <CheckboxField
            id="pr-draft"
            label={t('integrations.pullRequests.create.createAsDraft')}
            checked={isDraft}
            onCheckedChange={setIsDraft}
          />
        </DialogBody>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary" disabled={isSubmitting}>
              {t('common.cancel')}
            </Button>
          </DialogClose>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={isSubmitting || !title.trim() || !sourceBranch || !targetBranch}
          >
            {isSubmitting
              ? t('integrations.pullRequests.create.creating')
              : t('integrations.pullRequests.create.createButton')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
