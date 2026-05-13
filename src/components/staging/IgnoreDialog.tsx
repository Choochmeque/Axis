import { useQuery } from '@tanstack/react-query';
import { EyeOff } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  CheckboxField,
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTitle,
  FormField,
  Input,
  Select,
  SelectItem,
} from '@/components/ui';
import { toast } from '@/hooks/useToast';
import { getErrorMessage } from '@/lib/errorUtils';
import { gitignoreApi } from '@/services/api';
import { useStagingStore } from '@/store/stagingStore';
import type { IgnoreSuggestion } from '@/types';

interface IgnoreDialogProps {
  isOpen: boolean;
  onClose: () => void;
  filePath: string;
}

export function IgnoreDialog({ isOpen, onClose, filePath }: IgnoreDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      {isOpen && <IgnoreDialogContent onClose={onClose} filePath={filePath} />}
    </Dialog>
  );
}

interface IgnoreDialogContentProps {
  onClose: () => void;
  filePath: string;
}

function IgnoreDialogContent({ onClose, filePath }: IgnoreDialogContentProps) {
  const { t } = useTranslation();
  const loadStatus = useStagingStore((s) => s.loadStatus);
  const [selectedPattern, setSelectedPattern] = useState<string>('');
  const [customPattern, setCustomPattern] = useState<string>('');
  const [selectedGitignore, setSelectedGitignore] = useState<string>('');
  const [useGlobal, setUseGlobal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const {
    data: options,
    isLoading: loading,
    error: loadError,
  } = useQuery({
    queryKey: ['gitignore-options', filePath],
    queryFn: () => gitignoreApi.getOptions(filePath),
    enabled: !!filePath,
  });

  if (loadError) {
    toast.error(t('staging.ignoreDialog.loadFailed'), getErrorMessage(loadError));
    onClose();
  }

  const effectiveGitignore = selectedGitignore || options?.defaultGitignore || '.gitignore';
  const effectivePattern = selectedPattern || options?.suggestions[0]?.pattern || '';

  const handleSubmit = async () => {
    const pattern = effectivePattern === 'custom' ? customPattern.trim() : effectivePattern;

    if (!pattern) {
      toast.error(t('staging.ignoreDialog.patternRequired'));
      return;
    }

    setSubmitting(true);
    try {
      const result = useGlobal
        ? await gitignoreApi.addToGlobal(pattern)
        : await gitignoreApi.addPattern(pattern, effectiveGitignore);

      toast.success(result.message);
      await loadStatus();
      onClose();
    } catch (err) {
      toast.error(t('staging.ignoreDialog.addFailed'), getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const getSuggestionLabel = (suggestion: IgnoreSuggestion) => {
    return `${suggestion.pattern} - ${suggestion.description}`;
  };

  return (
    <DialogContent className="max-w-120">
      <DialogTitle icon={EyeOff}>{t('staging.ignoreDialog.title')}</DialogTitle>

      <DialogBody>
        {loading ? (
          <div className="text-center py-4 text-(--text-secondary)">
            {t('staging.ignoreDialog.loading')}
          </div>
        ) : options ? (
          <>
            <FormField label={t('staging.ignoreDialog.pattern')} htmlFor="ignore-pattern">
              <Select
                id="ignore-pattern"
                value={effectivePattern}
                onValueChange={setSelectedPattern}
              >
                {options.suggestions.map((suggestion) => (
                  <SelectItem key={suggestion.pattern} value={suggestion.pattern}>
                    {getSuggestionLabel(suggestion)}
                  </SelectItem>
                ))}
                <SelectItem value="custom">{t('staging.ignoreDialog.customPattern')}</SelectItem>
              </Select>
            </FormField>

            {effectivePattern === 'custom' && (
              <FormField
                label={t('staging.ignoreDialog.customPatternLabel')}
                htmlFor="custom-pattern"
              >
                <Input
                  id="custom-pattern"
                  type="text"
                  value={customPattern}
                  onChange={(e) => setCustomPattern(e.target.value)}
                  placeholder={t('staging.ignoreDialog.customPatternPlaceholder')}
                />
              </FormField>
            )}

            <FormField label={t('staging.ignoreDialog.targetGitignore')} htmlFor="target-gitignore">
              <Select
                id="target-gitignore"
                value={effectiveGitignore}
                onValueChange={setSelectedGitignore}
                disabled={useGlobal}
              >
                {options.gitignoreFiles.map((file) => (
                  <SelectItem key={file} value={file}>
                    {file}
                  </SelectItem>
                ))}
              </Select>
            </FormField>

            <CheckboxField
              id="use-global"
              label={t('staging.ignoreDialog.addToGlobal')}
              description={t('staging.ignoreDialog.addToGlobalDesc')}
              checked={useGlobal}
              onCheckedChange={setUseGlobal}
            />
          </>
        ) : null}
      </DialogBody>

      <DialogFooter>
        <DialogClose asChild>
          <Button variant="secondary">{t('common.cancel')}</Button>
        </DialogClose>
        <Button variant="primary" onClick={handleSubmit} disabled={loading || submitting}>
          {submitting ? t('staging.ignoreDialog.adding') : t('staging.ignoreDialog.addButton')}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
