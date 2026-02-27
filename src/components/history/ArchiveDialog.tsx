import { open } from '@tauri-apps/plugin-dialog';
import { Archive, FolderOpen } from 'lucide-react';
import { useEffect, useState } from 'react';
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
  FormField,
  Input,
  Label,
  Select,
  SelectItem,
} from '@/components/ui';
import { toast } from '@/hooks';
import { getErrorMessage } from '@/lib/errorUtils';
import { archiveApi } from '../../services/api';
import { useRepositoryStore } from '../../store/repositoryStore';
import type { ArchiveFormat } from '../../types';

interface ArchiveDialogProps {
  isOpen: boolean;
  onClose: () => void;
  commitOid?: string;
  commitSummary?: string;
}

const ARCHIVE_FORMATS: { value: ArchiveFormat; labelKey: string; extension: string }[] = [
  { value: 'zip', labelKey: 'history.archive.formats.zip', extension: '.zip' },
  { value: 'tar', labelKey: 'history.archive.formats.tar', extension: '.tar' },
  { value: 'tar.gz', labelKey: 'history.archive.formats.targz', extension: '.tar.gz' },
  { value: 'tar.bz2', labelKey: 'history.archive.formats.tarbz2', extension: '.tar.bz2' },
];

export function ArchiveDialog({ isOpen, onClose, commitOid, commitSummary }: ArchiveDialogProps) {
  const { t } = useTranslation();
  const repository = useRepositoryStore((state) => state.repository);
  const [format, setFormat] = useState<ArchiveFormat>('zip');
  const [outputPath, setOutputPath] = useState('');
  const [prefix, setPrefix] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Reset form when opening
      setFormat('zip');
      setOutputPath('');
      setPrefix(repository?.name ? `${repository.name}/` : '');
      setError(null);
    }
  }, [isOpen, repository?.name]);

  const handleBrowse = async () => {
    try {
      const selectedFormat = ARCHIVE_FORMATS.find((f) => f.value === format);
      const defaultName = `${repository?.name || 'archive'}-${commitOid?.slice(0, 7) || 'HEAD'}${selectedFormat?.extension || '.zip'}`;

      const path = await open({
        directory: false,
        multiple: false,
        defaultPath: defaultName,
        filters: [
          {
            name: selectedFormat ? t(selectedFormat.labelKey) : 'Archive',
            extensions: [
              format === 'tar.gz' ? 'tar.gz' : format === 'tar.bz2' ? 'tar.bz2' : format,
            ],
          },
        ],
        title: t('history.archive.saveArchiveAs'),
      });

      if (path && typeof path === 'string') {
        setOutputPath(path);
      }
    } catch (err) {
      console.error('Failed to open file dialog:', err);
    }
  };

  const handleCreate = async () => {
    if (!outputPath.trim()) {
      setError(t('history.archive.outputPathRequired'));
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await archiveApi.create({
        reference: commitOid || 'HEAD',
        format,
        outputPath: outputPath,
        prefix: prefix || null,
      });

      onClose();
      toast.success(t('history.archive.archiveCreated'));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-112.5">
        <DialogTitle icon={Archive}>{t('history.archive.title')}</DialogTitle>

        <DialogBody>
          {error && (
            <Alert variant="error" className="mb-4">
              {error}
            </Alert>
          )}

          <div className="field">
            <Label>{t('history.archive.source')}</Label>
            <div className="flex items-center gap-2 p-2 bg-(--bg-tertiary) rounded text-base">
              <span className="font-mono text-(--text-secondary)">
                {commitOid ? commitOid.slice(0, 7) : 'HEAD'}
              </span>
              {commitSummary && (
                <span className="text-(--text-tertiary) overflow-hidden text-ellipsis whitespace-nowrap">
                  - {commitSummary}
                </span>
              )}
            </div>
          </div>

          <FormField label={t('history.archive.format')} htmlFor="archive-format">
            <Select
              id="archive-format"
              value={format}
              onValueChange={(value) => setFormat(value as ArchiveFormat)}
              disabled={isLoading}
            >
              {ARCHIVE_FORMATS.map((f) => (
                <SelectItem key={f.value} value={f.value}>
                  {t(f.labelKey)} ({f.extension})
                </SelectItem>
              ))}
            </Select>
          </FormField>

          <FormField label={t('history.archive.saveTo')} htmlFor="output-path">
            <div className="flex gap-2">
              <Input
                id="output-path"
                type="text"
                value={outputPath}
                onChange={(e) => setOutputPath(e.target.value)}
                placeholder={t('history.archive.selectOutputFile')}
                disabled={isLoading}
                className="flex-1"
              />
              <Button variant="secondary" onClick={handleBrowse} disabled={isLoading}>
                <FolderOpen size={14} />
              </Button>
            </div>
          </FormField>

          <FormField
            label={t('history.archive.prefix')}
            htmlFor="archive-prefix"
            hint={t('history.archive.prefixHint')}
          >
            <Input
              id="archive-prefix"
              type="text"
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
              placeholder={t('history.archive.prefixPlaceholder')}
              disabled={isLoading}
            />
          </FormField>
        </DialogBody>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary" disabled={isLoading}>
              {t('common.cancel')}
            </Button>
          </DialogClose>
          <Button
            variant="primary"
            onClick={handleCreate}
            disabled={isLoading || !outputPath.trim()}
          >
            {isLoading ? t('history.archive.creating') : t('history.archive.createButton')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
