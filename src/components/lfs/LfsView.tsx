import { useState, useEffect } from 'react';
import {
  HardDrive,
  RefreshCw,
  Plus,
  Download,
  Upload,
  AlertCircle,
  X,
  Check,
  FileBox,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import { useLfsStore } from '@/store/lfsStore';
import { cn } from '@/lib/utils';
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
} from '@/components/ui';
import type { LfsFile } from '@/bindings/api';

const btnIconClass =
  'flex items-center justify-center w-7 h-7 p-0 bg-transparent border-none rounded text-(--text-secondary) cursor-pointer transition-colors hover:bg-(--bg-hover) hover:text-(--text-primary) disabled:opacity-50 disabled:cursor-not-allowed';
const btnSmallClass =
  'flex items-center gap-1 py-1 px-2 text-xs rounded cursor-pointer transition-colors border';

type TabType = 'patterns' | 'files';

export function LfsView() {
  const {
    status,
    patterns,
    files,
    isLoadingStatus,
    isLoadingPatterns,
    isLoadingFiles,
    isInstalling,
    isPulling,
    isPushing,
    loadAll,
    install,
    track,
    untrack,
    pull,
    push,
  } = useLfsStore();

  const [activeTab, setActiveTab] = useState<TabType>('patterns');
  const [showTrackDialog, setShowTrackDialog] = useState(false);
  const [trackPattern, setTrackPattern] = useState('');
  const [error, setError] = useState<string | null>(null);

  const isLoading = isLoadingStatus || isLoadingPatterns || isLoadingFiles;

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleTrack = async () => {
    if (!trackPattern.trim()) {
      setError('Pattern is required');
      return;
    }

    const success = await track(trackPattern);
    if (success) {
      setShowTrackDialog(false);
      setTrackPattern('');
    }
  };

  const handleUntrack = async (pattern: string) => {
    if (!confirm(`Untrack pattern "${pattern}"?`)) {
      return;
    }
    await untrack(pattern);
  };

  const formatSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
  };

  // Not installed view
  if (status && !status.isInstalled) {
    return (
      <div className="flex flex-col h-full bg-(--bg-secondary)">
        <div className="flex items-center justify-between py-2 px-3 border-b border-(--border-color)">
          <div className="flex items-center gap-2 font-medium text-(--text-primary)">
            <HardDrive size={16} />
            <span>Git LFS</span>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center max-w-80">
            <AlertCircle size={48} className="mx-auto mb-4 text-(--text-muted)" />
            <h3 className="text-lg font-medium text-(--text-primary) mb-2">
              Git LFS Not Installed
            </h3>
            <p className="text-sm text-(--text-muted) mb-4">
              Git LFS is not installed on your system. Install it to manage large files efficiently.
            </p>
            <a
              href="https://git-lfs.com"
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                btnSmallClass,
                'inline-flex bg-(--accent-color) border-(--accent-color) text-white hover:opacity-90'
              )}
            >
              <ExternalLink size={14} />
              Install Git LFS
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Not initialized view
  if (status && !status.isInitialized) {
    return (
      <div className="flex flex-col h-full bg-(--bg-secondary)">
        <div className="flex items-center justify-between py-2 px-3 border-b border-(--border-color)">
          <div className="flex items-center gap-2 font-medium text-(--text-primary)">
            <HardDrive size={16} />
            <span>Git LFS</span>
            {status.version && (
              <span className="text-xs text-(--text-muted)">v{status.version}</span>
            )}
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center max-w-80">
            <HardDrive size={48} className="mx-auto mb-4 text-(--text-muted)" />
            <h3 className="text-lg font-medium text-(--text-primary) mb-2">Initialize Git LFS</h3>
            <p className="text-sm text-(--text-muted) mb-4">
              Git LFS is not initialized in this repository. Initialize it to start tracking large
              files.
            </p>
            <button
              className={cn(
                btnSmallClass,
                'bg-(--accent-color) border-(--accent-color) text-white hover:opacity-90'
              )}
              onClick={() => install()}
              disabled={isInstalling}
            >
              {isInstalling ? 'Initializing...' : 'Initialize LFS'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const downloadedFiles = files.filter((f) => f.isDownloaded);
  const pointerFiles = files.filter((f) => !f.isDownloaded);

  return (
    <div className="flex flex-col h-full bg-(--bg-secondary)">
      {/* Header */}
      <div className="flex items-center justify-between py-2 px-3 border-b border-(--border-color)">
        <div className="flex items-center gap-2 font-medium text-(--text-primary)">
          <HardDrive size={16} />
          <span>Git LFS</span>
          {status?.version && (
            <span className="text-xs text-(--text-muted)">v{status.version}</span>
          )}
        </div>
        <div className="flex gap-1">
          <button
            className={btnIconClass}
            onClick={() => setShowTrackDialog(true)}
            title="Track pattern"
          >
            <Plus size={16} />
          </button>
          <button
            className={btnIconClass}
            onClick={() => pull()}
            title="Pull LFS objects"
            disabled={isPulling || files.length === 0}
          >
            <Download size={16} className={isPulling ? 'animate-pulse' : ''} />
          </button>
          <button
            className={btnIconClass}
            onClick={() => push()}
            title="Push LFS objects"
            disabled={isPushing || files.length === 0}
          >
            <Upload size={16} className={isPushing ? 'animate-pulse' : ''} />
          </button>
          <button
            className={btnIconClass}
            onClick={() => loadAll()}
            title="Refresh"
            disabled={isLoading}
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="flex items-center gap-2 py-2 px-3 m-2 bg-error/10 text-error rounded text-xs">
          <AlertCircle size={14} />
          <span className="flex-1">{error}</span>
          <button
            className="p-0.5 bg-transparent border-none text-inherit cursor-pointer opacity-70 hover:opacity-100"
            onClick={() => setError(null)}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-(--border-color)">
        <button
          className={cn(
            'flex-1 py-2 px-3 text-sm border-b-2 transition-colors',
            activeTab === 'patterns'
              ? 'border-(--accent-color) text-(--text-primary)'
              : 'border-transparent text-(--text-muted) hover:text-(--text-secondary)'
          )}
          onClick={() => setActiveTab('patterns')}
        >
          Patterns ({patterns.length})
        </button>
        <button
          className={cn(
            'flex-1 py-2 px-3 text-sm border-b-2 transition-colors',
            activeTab === 'files'
              ? 'border-(--accent-color) text-(--text-primary)'
              : 'border-transparent text-(--text-muted) hover:text-(--text-secondary)'
          )}
          onClick={() => setActiveTab('files')}
        >
          Files ({files.length})
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-2">
        {activeTab === 'patterns' && (
          <>
            {patterns.length === 0 ? (
              <div className="py-6 text-center text-(--text-muted) text-sm">
                No tracked patterns. Click + to add one.
              </div>
            ) : (
              patterns.map((pattern, idx) => (
                <div
                  key={`${pattern.pattern}-${idx}`}
                  className="flex items-center justify-between p-3 mb-2 rounded-md bg-(--bg-primary) border border-transparent hover:border-(--border-color)"
                >
                  <div>
                    <div className="font-mono text-sm text-(--text-primary)">{pattern.pattern}</div>
                    <div className="text-xs text-(--text-muted)">{pattern.sourceFile}</div>
                  </div>
                  <button
                    className={cn(
                      btnSmallClass,
                      'bg-error/10 border-error text-error hover:bg-error/20'
                    )}
                    onClick={() => handleUntrack(pattern.pattern)}
                    title="Untrack pattern"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))
            )}
          </>
        )}

        {activeTab === 'files' && (
          <>
            {files.length === 0 ? (
              <div className="py-6 text-center text-(--text-muted) text-sm">No LFS files</div>
            ) : (
              <>
                {/* Downloaded files */}
                {downloadedFiles.length > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center gap-2 px-2 py-1 text-xs text-(--text-muted) font-medium">
                      <Check size={12} className="text-success" />
                      Downloaded ({downloadedFiles.length})
                    </div>
                    {downloadedFiles.map((file) => (
                      <LfsFileItem key={file.path} file={file} formatSize={formatSize} />
                    ))}
                  </div>
                )}

                {/* Pointer files (not downloaded) */}
                {pointerFiles.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 px-2 py-1 text-xs text-(--text-muted) font-medium">
                      <FileBox size={12} className="text-warning" />
                      Pointers ({pointerFiles.length})
                    </div>
                    {pointerFiles.map((file) => (
                      <LfsFileItem key={file.path} file={file} formatSize={formatSize} />
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* Track Pattern Dialog */}
      <Dialog open={showTrackDialog} onOpenChange={setShowTrackDialog}>
        <DialogContent className="max-w-100">
          <DialogTitle icon={Plus}>Track Pattern</DialogTitle>

          <DialogBody>
            <FormField label="Pattern" htmlFor="lfs-pattern">
              <Input
                id="lfs-pattern"
                type="text"
                value={trackPattern}
                onChange={(e) => setTrackPattern(e.target.value)}
                placeholder="*.psd, *.zip, assets/**/*.png"
              />
            </FormField>
            <p className="text-xs text-(--text-muted) mt-2">
              Use glob patterns to match files. Examples: *.psd, *.zip, assets/**/*.png
            </p>
          </DialogBody>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary">Cancel</Button>
            </DialogClose>
            <Button variant="primary" onClick={handleTrack} disabled={!trackPattern.trim()}>
              Track Pattern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface LfsFileItemProps {
  file: LfsFile;
  formatSize: (bytes: number) => string;
}

function LfsFileItem({ file, formatSize }: LfsFileItemProps) {
  return (
    <div className="flex items-center justify-between p-2 mb-1 rounded bg-(--bg-primary) hover:bg-(--bg-hover)">
      <div className="flex items-center gap-2 min-w-0">
        {file.isDownloaded ? (
          <Check size={14} className="text-success shrink-0" />
        ) : (
          <FileBox size={14} className="text-warning shrink-0" />
        )}
        <span className="text-sm text-(--text-primary) truncate">{file.path}</span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-xs text-(--text-muted)">{formatSize(file.size)}</span>
        <span className="font-mono text-xs text-(--text-muted)">{file.oid.substring(0, 8)}</span>
      </div>
    </div>
  );
}
