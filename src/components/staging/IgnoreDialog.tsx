import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { EyeOff } from 'lucide-react';
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
  SelectItem,
  Input,
  CheckboxField,
} from '@/components/ui';
import { gitignoreApi } from '@/services/api';
import { toast } from '@/hooks/useToast';
import { getErrorMessage } from '@/lib/errorUtils';
import { useStagingStore } from '@/store/stagingStore';
import type { IgnoreOptions, IgnoreSuggestion } from '@/types';

interface IgnoreDialogProps {
  isOpen: boolean;
  onClose: () => void;
  filePath: string;
}

export function IgnoreDialog({ isOpen, onClose, filePath }: IgnoreDialogProps) {
  const { t } = useTranslation();
  const loadStatus = useStagingStore((s) => s.loadStatus);
  const [options, setOptions] = useState<IgnoreOptions | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedPattern, setSelectedPattern] = useState<string>('');
  const [customPattern, setCustomPattern] = useState<string>('');
  const [selectedGitignore, setSelectedGitignore] = useState<string>('.gitignore');
  const [useGlobal, setUseGlobal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && filePath) {
      setLoading(true);
      gitignoreApi
        .getOptions(filePath)
        .then((opts) => {
          setOptions(opts);
          setSelectedGitignore(opts.defaultGitignore);
          if (opts.suggestions.length > 0) {
            setSelectedPattern(opts.suggestions[0].pattern);
          }
        })
        .catch((err) => {
          toast.error(t('staging.ignoreDialog.loadFailed'), getErrorMessage(err));
          onClose();
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, filePath, onClose, t]);

  const handleSubmit = async () => {
    const pattern = selectedPattern === 'custom' ? customPattern.trim() : selectedPattern;

    if (!pattern) {
      toast.error(t('staging.ignoreDialog.patternRequired'));
      return;
    }

    setSubmitting(true);
    try {
      const result = useGlobal
        ? await gitignoreApi.addToGlobal(pattern)
        : await gitignoreApi.addPattern(pattern, selectedGitignore);

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
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
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
                  value={selectedPattern}
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

              {selectedPattern === 'custom' && (
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

              <FormField
                label={t('staging.ignoreDialog.targetGitignore')}
                htmlFor="target-gitignore"
              >
                <Select
                  id="target-gitignore"
                  value={selectedGitignore}
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
    </Dialog>
  );
}
