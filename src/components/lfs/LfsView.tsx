import {
  AlertCircle,
  Check,
  Download,
  ExternalLink,
  FileBox,
  HardDrive,
  Plus,
  RefreshCw,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { LfsFile } from '@/bindings/api';
import {
  Button,
  ConfirmDialog,
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTitle,
  FormField,
  Input,
  VirtualList,
} from '@/components/ui';
import { cn } from '@/lib/utils';
import { useLfsStore } from '@/store/lfsStore';

type LfsListItem =
  | { type: 'header'; label: string; icon: 'downloaded' | 'pointer'; count: number }
  | { type: 'file'; file: LfsFile };

const btnIconClass =
  'flex items-center justify-center w-7 h-7 p-0 bg-transparent border-none rounded text-(--text-secondary) cursor-pointer transition-colors hover:bg-(--bg-hover) hover:text-(--text-primary) disabled:opacity-50 disabled:cursor-not-allowed';
const btnSmallClass =
  'flex items-center gap-1 py-1 px-2 text-xs rounded cursor-pointer transition-colors border';

type TabType = 'patterns' | 'files';

export function LfsView() {
  const { t } = useTranslation();
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
  const [untrackPattern, setUntrackPattern] = useState<string | null>(null);

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

  const handleUntrack = (pattern: string) => {
    setUntrackPattern(pattern);
  };

  const formatSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / 1024 ** i).toFixed(1)} ${units[i]}`;
  };

  const downloadedFiles = files.filter((f) => f.isDownloaded);
  const pointerFiles = files.filter((f) => !f.isDownloaded);

  const fileListItems = useMemo<LfsListItem[]>(() => {
    const items: LfsListItem[] = [];
    if (downloadedFiles.length > 0) {
      items.push({
        type: 'header',
        label: t('lfs.files.downloaded'),
        icon: 'downloaded',
        count: downloadedFiles.length,
      });
      items.push(...downloadedFiles.map((file): LfsListItem => ({ type: 'file', file })));
    }
    if (pointerFiles.length > 0) {
      items.push({
        type: 'header',
        label: t('lfs.files.pointers'),
        icon: 'pointer',
        count: pointerFiles.length,
      });
      items.push(...pointerFiles.map((file): LfsListItem => ({ type: 'file', file })));
    }
    return items;
  }, [downloadedFiles, pointerFiles, t]);

  // Not installed view
  if (status && !status.isInstalled) {
    return (
      <div className="flex flex-col h-full bg-(--bg-secondary)">
        <div className="flex items-center justify-between py-2 px-3 border-b border-(--border-color)">
          <div className="flex items-center gap-2 font-medium text-(--text-primary)">
            <HardDrive size={16} />
            <span>{t('lfs.title')}</span>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center max-w-80">
            <AlertCircle size={48} className="mx-auto mb-4 text-(--text-muted)" />
            <h3 className="text-lg font-medium text-(--text-primary) mb-2">
              {t('lfs.notInstalled.title')}
            </h3>
            <p className="text-sm text-(--text-muted) mb-4">{t('lfs.notInstalled.message')}</p>
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
              {t('common.install')} Git LFS
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
            <span>{t('lfs.title')}</span>
            {status.version && (
              <span className="text-xs text-(--text-muted)">v{status.version}</span>
            )}
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center max-w-80">
            <HardDrive size={48} className="mx-auto mb-4 text-(--text-muted)" />
            <h3 className="text-lg font-medium text-(--text-primary) mb-2">
              {t('lfs.initialize.button')}
            </h3>
            <p className="text-sm text-(--text-muted) mb-4">{t('lfs.notInstalled.message')}</p>
            <button
              className={cn(
                btnSmallClass,
                'bg-(--accent-color) border-(--accent-color) text-white hover:opacity-90'
              )}
              onClick={() => install()}
              disabled={isInstalling}
            >
              {isInstalling ? t('lfs.initialize.initializing') : t('lfs.initialize.buttonShort')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-(--bg-secondary)">
      {/* Header */}
      <div className="flex items-center justify-between py-2 px-3 border-b border-(--border-color)">
        <div className="flex items-center gap-2 font-medium text-(--text-primary)">
          <HardDrive size={16} />
          <span>{t('lfs.title')}</span>
          {status?.version && (
            <span className="text-xs text-(--text-muted)">v{status.version}</span>
          )}
        </div>
        <div className="flex gap-1">
          <button
            className={btnIconClass}
            onClick={() => setShowTrackDialog(true)}
            title={t('lfs.actions.trackPattern')}
          >
            <Plus size={16} />
          </button>
          <button
            className={btnIconClass}
            onClick={() => pull()}
            title={t('lfs.actions.pullObjects')}
            disabled={isPulling || files.length === 0}
          >
            <Download size={16} className={isPulling ? 'animate-pulse' : ''} />
          </button>
          <button
            className={btnIconClass}
            onClick={() => push()}
            title={t('lfs.actions.pushObjects')}
            disabled={isPushing || files.length === 0}
          >
            <Upload size={16} className={isPushing ? 'animate-pulse' : ''} />
          </button>
          <button
            className={btnIconClass}
            onClick={() => loadAll()}
            title={t('common.refresh')}
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
          {t('lfs.tabs.patterns')} ({patterns.length})
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
          {t('lfs.tabs.files')} ({files.length})
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-2">
        {activeTab === 'patterns' && (
          <>
            {patterns.length === 0 ? (
              <div className="py-6 text-center text-(--text-muted) text-sm">
                {t('lfs.patterns.empty')}
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
          <VirtualList
            items={fileListItems}
            getItemKey={(item, index) =>
              item.type === 'header' ? `header-${index}` : item.file.path
            }
            itemHeight={36}
            emptyMessage={t('lfs.files.empty')}
            className="h-full"
            itemClassName={(item) =>
              item.type === 'header' ? '!cursor-default !hover:bg-transparent' : ''
            }
          >
            {(item) =>
              item.type === 'header' ? (
                <LfsHeaderItem label={item.label} icon={item.icon} count={item.count} />
              ) : (
                <LfsFileItemContent file={item.file} formatSize={formatSize} />
              )
            }
          </VirtualList>
        )}
      </div>

      {/* Track Pattern Dialog */}
      <Dialog open={showTrackDialog} onOpenChange={setShowTrackDialog}>
        <DialogContent className="max-w-100">
          <DialogTitle icon={Plus}>{t('lfs.trackDialog.title')}</DialogTitle>

          <DialogBody>
            <FormField label={t('lfs.trackDialog.patternLabel')} htmlFor="lfs-pattern">
              <Input
                id="lfs-pattern"
                type="text"
                value={trackPattern}
                onChange={(e) => setTrackPattern(e.target.value)}
                placeholder={t('lfs.trackDialog.patternPlaceholder')}
              />
            </FormField>
            <p className="text-xs text-(--text-muted) mt-2">
              Use glob patterns to match files. Examples: *.psd, *.zip, assets/**/*.png
            </p>
          </DialogBody>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary">{t('common.cancel')}</Button>
            </DialogClose>
            <Button variant="primary" onClick={handleTrack} disabled={!trackPattern.trim()}>
              {t('lfs.trackDialog.trackButton')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        isOpen={untrackPattern !== null}
        onClose={() => setUntrackPattern(null)}
        onConfirm={async () => {
          if (untrackPattern) {
            await untrack(untrackPattern);
          }
          setUntrackPattern(null);
        }}
        title={t('lfs.patterns.untrackTitle')}
        message={t('lfs.patterns.untrackConfirm', { pattern: untrackPattern ?? '' })}
        confirmLabel={t('common.remove')}
      />
    </div>
  );
}

interface LfsHeaderItemProps {
  label: string;
  icon: 'downloaded' | 'pointer';
  count: number;
}

function LfsHeaderItem({ label, icon, count }: LfsHeaderItemProps) {
  return (
    <div className="flex items-center gap-2 text-xs text-(--text-muted) font-medium">
      {icon === 'downloaded' ? (
        <Check size={12} className="text-success" />
      ) : (
        <FileBox size={12} className="text-warning" />
      )}
      {label} ({count})
    </div>
  );
}

interface LfsFileItemContentProps {
  file: LfsFile;
  formatSize: (bytes: number) => string;
}

function LfsFileItemContent({ file, formatSize }: LfsFileItemContentProps) {
  return (
    <>
      {file.isDownloaded ? (
        <Check size={14} className="text-success shrink-0" />
      ) : (
        <FileBox size={14} className="text-warning shrink-0" />
      )}
      <span className="flex-1 text-sm text-(--text-primary) truncate">{file.path}</span>
      <span className="text-xs text-(--text-muted) shrink-0">{formatSize(file.size)}</span>
      <span className="font-mono text-xs text-(--text-muted) shrink-0">
        {file.oid.substring(0, 8)}
      </span>
    </>
  );
}
