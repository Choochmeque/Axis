import { useState, useEffect } from 'react';
import { Archive, FolderOpen } from 'lucide-react';
import { open } from '@tauri-apps/plugin-dialog';
import { toast } from '@/hooks';
import { getErrorMessage } from '@/lib/errorUtils';
import { archiveApi } from '../../services/api';
import type { ArchiveFormat } from '../../types';
import { useRepositoryStore } from '../../store/repositoryStore';
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
  Select,
  SelectItem,
  Label,
  Alert,
} from '@/components/ui';

interface ArchiveDialogProps {
  isOpen: boolean;
  onClose: () => void;
  commitOid?: string;
  commitSummary?: string;
}

const ARCHIVE_FORMATS: { value: ArchiveFormat; label: string; extension: string }[] = [
  { value: 'zip', label: 'ZIP Archive', extension: '.zip' },
  { value: 'tar', label: 'TAR Archive', extension: '.tar' },
  { value: 'tar.gz', label: 'Gzipped TAR', extension: '.tar.gz' },
  { value: 'tar.bz2', label: 'Bzip2 TAR', extension: '.tar.bz2' },
];

export function ArchiveDialog({ isOpen, onClose, commitOid, commitSummary }: ArchiveDialogProps) {
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
            name: selectedFormat?.label || 'Archive',
            extensions: [
              format === 'tar.gz' ? 'tar.gz' : format === 'tar.bz2' ? 'tar.bz2' : format,
            ],
          },
        ],
        title: 'Save Archive As',
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
      setError('Output path is required');
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
      toast.success('Archive created');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-112.5">
        <DialogTitle icon={Archive}>Create Archive</DialogTitle>

        <DialogBody>
          {error && (
            <Alert variant="error" className="mb-4">
              {error}
            </Alert>
          )}

          <div className="field">
            <Label>Source:</Label>
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

          <FormField label="Format:" htmlFor="archive-format">
            <Select
              id="archive-format"
              value={format}
              onValueChange={(value) => setFormat(value as ArchiveFormat)}
              disabled={isLoading}
            >
              {ARCHIVE_FORMATS.map((f) => (
                <SelectItem key={f.value} value={f.value}>
                  {f.label} ({f.extension})
                </SelectItem>
              ))}
            </Select>
          </FormField>

          <FormField label="Save to:" htmlFor="output-path">
            <div className="flex gap-2">
              <Input
                id="output-path"
                type="text"
                value={outputPath}
                onChange={(e) => setOutputPath(e.target.value)}
                placeholder="Select output file..."
                disabled={isLoading}
                className="flex-1"
              />
              <Button variant="secondary" onClick={handleBrowse} disabled={isLoading}>
                <FolderOpen size={14} />
              </Button>
            </div>
          </FormField>

          <FormField
            label="Prefix (optional):"
            htmlFor="archive-prefix"
            hint="Prepended to all file paths in the archive"
          >
            <Input
              id="archive-prefix"
              type="text"
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
              placeholder="e.g., project-name/"
              disabled={isLoading}
            />
          </FormField>
        </DialogBody>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary" disabled={isLoading}>
              Cancel
            </Button>
          </DialogClose>
          <Button
            variant="primary"
            onClick={handleCreate}
            disabled={isLoading || !outputPath.trim()}
          >
            {isLoading ? 'Creating...' : 'Create Archive'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
