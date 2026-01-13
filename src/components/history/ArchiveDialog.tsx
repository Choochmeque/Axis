import { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Archive, X, AlertCircle, Check, FolderOpen } from 'lucide-react';
import { open } from '@tauri-apps/plugin-dialog';
import { archiveApi } from '../../services/api';
import type { ArchiveResult, ArchiveFormat } from '../../types';
import { useRepositoryStore } from '../../store/repositoryStore';

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
  const [result, setResult] = useState<ArchiveResult | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Reset form when opening
      setFormat('zip');
      setOutputPath('');
      setPrefix(repository?.name ? `${repository.name}/` : '');
      setError(null);
      setResult(null);
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
      const archiveResult = await archiveApi.create({
        reference: commitOid || 'HEAD',
        format,
        output_path: outputPath,
        prefix: prefix || undefined,
      });

      if (archiveResult.success) {
        setResult(archiveResult);
      } else {
        setError(archiveResult.message);
      }
    } catch (err) {
      console.error('Failed to create archive:', err);
      setError(err instanceof Error ? err.message : 'Failed to create archive');
    } finally {
      setIsLoading(false);
    }
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay-animated" />
        <Dialog.Content className="dialog-content max-w-112.5">
          <Dialog.Title className="dialog-title">
            <Archive size={18} />
            Create Archive
          </Dialog.Title>

          <div className="dialog-body">
            {error && (
              <div className="alert alert-error mb-4">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            {result && result.success ? (
              <div className="alert alert-success mb-4">
                <Check size={16} />
                <div className="flex flex-col gap-1">
                  <span>Archive created successfully</span>
                  {result.size_bytes && (
                    <span className="text-xs opacity-80">
                      Size: {formatFileSize(result.size_bytes)}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <>
                <div className="field">
                  <label className="label">Source:</label>
                  <div className="flex items-center gap-2 p-2 bg-(--bg-tertiary) rounded text-[13px]">
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

                <div className="field">
                  <label htmlFor="archive-format" className="label">
                    Format:
                  </label>
                  <select
                    id="archive-format"
                    value={format}
                    onChange={(e) => setFormat(e.target.value as ArchiveFormat)}
                    disabled={isLoading}
                    className="input"
                  >
                    {ARCHIVE_FORMATS.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label} ({f.extension})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label htmlFor="output-path" className="label">
                    Save to:
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="output-path"
                      type="text"
                      value={outputPath}
                      onChange={(e) => setOutputPath(e.target.value)}
                      placeholder="Select output file..."
                      disabled={isLoading}
                      className="input flex-1"
                    />
                    <button
                      type="button"
                      onClick={handleBrowse}
                      disabled={isLoading}
                      className="btn btn-secondary"
                    >
                      <FolderOpen size={14} />
                    </button>
                  </div>
                </div>

                <div className="field">
                  <label htmlFor="archive-prefix" className="label">
                    Prefix (optional):
                  </label>
                  <input
                    id="archive-prefix"
                    type="text"
                    value={prefix}
                    onChange={(e) => setPrefix(e.target.value)}
                    placeholder="e.g., project-name/"
                    disabled={isLoading}
                    className="input"
                  />
                  <span className="text-xs text-(--text-tertiary) mt-1">
                    Prepended to all file paths in the archive
                  </span>
                </div>
              </>
            )}
          </div>

          <div className="dialog-footer">
            {result && result.success ? (
              <button className="btn btn-primary" onClick={onClose}>
                Close
              </button>
            ) : (
              <>
                <Dialog.Close asChild>
                  <button className="btn btn-secondary" disabled={isLoading}>
                    Cancel
                  </button>
                </Dialog.Close>
                <button
                  className="btn btn-primary"
                  onClick={handleCreate}
                  disabled={isLoading || !outputPath.trim()}
                >
                  {isLoading ? 'Creating...' : 'Create Archive'}
                </button>
              </>
            )}
          </div>

          <Dialog.Close asChild>
            <button className="btn-close absolute top-3 right-3" aria-label="Close">
              <X size={16} />
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
