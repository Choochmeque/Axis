import { useQuery } from '@tanstack/react-query';
import { GitCommit, History, Loader2 } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Group, Panel, Separator, useDefaultLayout } from 'react-resizable-panels';
import {
  Avatar,
  CheckboxField,
  Dialog,
  DialogBody,
  DialogContent,
  DialogTitle,
} from '@/components/ui';
import { formatMediumDate } from '@/lib/dateUtils';
import { getErrorMessage } from '@/lib/errorUtils';
import { cn } from '@/lib/utils';
import { graphApi } from '@/services/api';
import type { Commit } from '@/types';
import { DiffView } from '../diff';
import { CommitInfo } from './CommitInfo';

interface FileLogDialogProps {
  isOpen: boolean;
  onClose: () => void;
  filePaths: string[];
}

const PAGE_SIZE = 50;

export function FileLogDialog({ isOpen, onClose, filePaths }: FileLogDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      {isOpen && <FileLogDialogContent filePaths={filePaths} />}
    </Dialog>
  );
}

function FileLogDialogContent({ filePaths }: { filePaths: string[] }) {
  const { t } = useTranslation();
  const { defaultLayout: mainLayout, onLayoutChanged: onMainLayoutChanged } = useDefaultLayout({
    groupId: 'file-log-layout',
    storage: localStorage,
  });
  const { defaultLayout: leftLayout, onLayoutChanged: onLeftLayoutChanged } = useDefaultLayout({
    groupId: 'file-log-left-layout',
    storage: localStorage,
  });
  const [extraCommits, setExtraCommits] = useState<Commit[]>([]);
  const [selectedCommit, setSelectedCommit] = useState<Commit | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreOverride, setHasMoreOverride] = useState<boolean | null>(null);
  const [followRenames, setFollowRenames] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const displayPath = filePaths.length === 1 ? filePaths[0] : `${filePaths.length} files`;

  const {
    data: initialResult,
    isLoading,
    error: queryError,
  } = useQuery({
    queryKey: ['file-log', filePaths, followRenames],
    queryFn: () =>
      graphApi.getFileHistory({
        paths: filePaths,
        limit: PAGE_SIZE,
        skip: 0,
        followRenames,
      }),
    enabled: filePaths.length > 0,
  });

  const initialCommits = initialResult?.commits ?? [];
  const commits = [...initialCommits, ...extraCommits];
  const hasMore = hasMoreOverride ?? initialResult?.hasMore ?? false;
  const error = queryError ? getErrorMessage(queryError) : null;

  const loadMore = useCallback(async () => {
    if (filePaths.length === 0) return;
    setIsLoadingMore(true);
    try {
      const result = await graphApi.getFileHistory({
        paths: filePaths,
        limit: PAGE_SIZE,
        skip: initialCommits.length + extraCommits.length,
        followRenames,
      });
      setExtraCommits((prev) => [...prev, ...result.commits]);
      setHasMoreOverride(result.hasMore);
    } catch (err) {
      console.error('Failed to load more commits:', err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [filePaths, followRenames, initialCommits.length, extraCommits.length]);

  const { data: selectedDiff = null, isLoading: isLoadingDiff } = useQuery({
    queryKey: ['file-log-diff', selectedCommit?.oid, filePaths[0]],
    queryFn: () => {
      if (!selectedCommit || filePaths.length === 0) return null;
      return graphApi.getFileDiffInCommit(selectedCommit.oid, filePaths[0]);
    },
    enabled: !!selectedCommit && filePaths.length > 0,
  });

  const handleScroll = useCallback(() => {
    if (!listRef.current || isLoadingMore || !hasMore) return;

    const { scrollTop, scrollHeight, clientHeight } = listRef.current;
    const scrollThreshold = 200;

    if (scrollHeight - scrollTop - clientHeight < scrollThreshold) {
      loadMore();
    }
  }, [isLoadingMore, hasMore, loadMore]);

  const handleCommitClick = useCallback((commit: Commit) => {
    setSelectedCommit((prev) => (prev?.oid === commit.oid ? null : commit));
  }, []);

  const handleFollowRenamesChange = useCallback((checked: boolean) => {
    setFollowRenames(checked);
    setExtraCommits([]);
    setHasMoreOverride(null);
    setSelectedCommit(null);
  }, []);

  return (
    <DialogContent className="max-w-[90vw] w-[90vw] h-[85vh] flex flex-col">
      <DialogTitle icon={History}>{t('history.fileLog.title', { path: displayPath })}</DialogTitle>

      <DialogBody className="flex-1 min-h-0 p-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-full gap-2 text-(--text-secondary)">
            <Loader2 size={20} className="animate-spin" />
            <span>{t('history.fileLog.loading')}</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-(--text-secondary)">
            <GitCommit size={48} strokeWidth={1} />
            <p>{t('history.fileLog.errorLoading')}</p>
            <p className="text-xs text-(--text-tertiary)">{error}</p>
          </div>
        ) : commits.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-(--text-secondary)">
            <GitCommit size={48} strokeWidth={1} />
            <p>{t('history.fileLog.noCommits')}</p>
          </div>
        ) : (
          <div className="flex flex-col h-full">
            <div className="flex-1 min-h-0">
              <Group
                orientation="horizontal"
                defaultLayout={mainLayout}
                onLayoutChange={onMainLayoutChanged}
              >
                <Panel id="left" defaultSize="40%" minSize="25%" maxSize="60%">
                  <div className="flex flex-col h-full">
                    <Group
                      orientation="vertical"
                      defaultLayout={leftLayout}
                      onLayoutChange={onLeftLayoutChanged}
                    >
                      <Panel id="commits" defaultSize="65%" minSize="30%">
                        <div className="flex flex-col h-full border-r border-(--border-color)">
                          <div
                            ref={listRef}
                            className="flex-1 overflow-auto"
                            onScroll={handleScroll}
                          >
                            <table className="w-full text-sm border-collapse">
                              <thead className="sticky top-0 bg-(--bg-toolbar) z-10">
                                <tr className="text-xs text-(--text-secondary) border-b border-(--border-color)">
                                  <th className="text-left py-2 px-3 font-semibold whitespace-nowrap">
                                    {t('history.fileLog.changeset')}
                                  </th>
                                  <th className="text-left py-2 px-3 font-semibold whitespace-nowrap">
                                    {t('history.fileLog.date')}
                                  </th>
                                  <th className="text-left py-2 px-3 font-semibold whitespace-nowrap">
                                    {t('history.fileLog.user')}
                                  </th>
                                  <th className="text-left py-2 px-3 font-semibold">
                                    {t('history.fileLog.description')}
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {commits.map((commit) => (
                                  <FileLogCommitRow
                                    key={commit.oid}
                                    commit={commit}
                                    isSelected={selectedCommit?.oid === commit.oid}
                                    onClick={() => handleCommitClick(commit)}
                                  />
                                ))}
                              </tbody>
                            </table>
                            {isLoadingMore && (
                              <div className="flex items-center justify-center gap-2 p-3 text-(--text-secondary) text-xs">
                                <Loader2 size={14} className="animate-spin" />
                                <span>{t('history.fileLog.loadingMore')}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </Panel>
                      <Separator className="resize-handle-vertical" />
                      <Panel id="info" defaultSize="35%" minSize="20%">
                        {selectedCommit ? (
                          <CommitInfo commit={selectedCommit} />
                        ) : (
                          <div className="flex items-center justify-center h-full text-(--text-secondary) text-sm">
                            {t('history.fileLog.selectCommit')}
                          </div>
                        )}
                      </Panel>
                    </Group>
                  </div>
                </Panel>
                <Separator className="resize-handle" />
                <Panel id="diff" minSize="40%">
                  <DiffView
                    diff={selectedDiff}
                    isLoading={isLoadingDiff}
                    commitOid={selectedCommit?.oid}
                    parentCommitOid={selectedCommit?.parentOids[0]}
                  />
                </Panel>
              </Group>
            </div>
            <div className="shrink-0 p-3 border-t border-(--border-color) bg-(--bg-secondary)">
              <CheckboxField
                id="follow-renames"
                label={t('history.fileLog.followRenames')}
                checked={followRenames}
                onCheckedChange={handleFollowRenamesChange}
              />
            </div>
          </div>
        )}
      </DialogBody>
    </DialogContent>
  );
}

interface FileLogCommitRowProps {
  commit: Commit;
  isSelected: boolean;
  onClick: () => void;
}

function FileLogCommitRow({ commit, isSelected, onClick }: FileLogCommitRowProps) {
  return (
    <tr
      className={cn(
        'cursor-pointer border-b border-(--border-color) transition-colors',
        isSelected ? 'bg-(--bg-active)' : 'hover:bg-(--bg-hover)'
      )}
      onClick={onClick}
    >
      <td className="py-2 px-3 whitespace-nowrap">
        <code className="font-mono text-xs">{commit.oid.substring(0, 7)}</code>
      </td>
      <td className="py-2 px-3 whitespace-nowrap text-xs text-(--text-secondary)">
        {formatMediumDate(commit.timestamp)}
      </td>
      <td className="py-2 px-3 whitespace-nowrap text-xs text-(--text-secondary) max-w-32 truncate">
        <span className="flex items-center gap-1.5">
          <Avatar
            email={commit.author.email}
            sha={commit.oid}
            name={commit.author.name}
            size={14}
          />
          {commit.author.name}
        </span>
      </td>
      <td className="py-2 px-3 truncate max-w-xs">{commit.summary}</td>
    </tr>
  );
}
