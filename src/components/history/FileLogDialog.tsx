import { useState, useEffect, useCallback, useRef } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { History, GitCommit, Loader2 } from 'lucide-react';
import { graphApi } from '@/services/api';
import { formatMediumDate } from '@/lib/dateUtils';
import { getErrorMessage } from '@/lib/errorUtils';
import { cn } from '@/lib/utils';
import { CommitInfo } from './CommitInfo';
import { DiffView } from '../diff';
import type { Commit, FileDiff } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogBody,
  CheckboxField,
  Avatar,
} from '@/components/ui';

interface FileLogDialogProps {
  isOpen: boolean;
  onClose: () => void;
  filePaths: string[];
}

const PAGE_SIZE = 50;

export function FileLogDialog({ isOpen, onClose, filePaths }: FileLogDialogProps) {
  const [commits, setCommits] = useState<Commit[]>([]);
  const [selectedCommit, setSelectedCommit] = useState<Commit | null>(null);
  const [selectedDiff, setSelectedDiff] = useState<FileDiff | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isLoadingDiff, setIsLoadingDiff] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [followRenames, setFollowRenames] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const displayPath = filePaths.length === 1 ? filePaths[0] : `${filePaths.length} files`;

  const loadCommits = useCallback(
    async (skip: number = 0) => {
      if (filePaths.length === 0) return;

      const isInitialLoad = skip === 0;
      if (isInitialLoad) {
        setIsLoading(true);
        setError(null);
      } else {
        setIsLoadingMore(true);
      }

      try {
        const result = await graphApi.getFileHistory({
          paths: filePaths,
          limit: PAGE_SIZE,
          skip,
          followRenames,
        });

        if (isInitialLoad) {
          setCommits(result.commits);
        } else {
          setCommits((prev) => [...prev, ...result.commits]);
        }
        setHasMore(result.hasMore);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        if (isInitialLoad) {
          setIsLoading(false);
        } else {
          setIsLoadingMore(false);
        }
      }
    },
    [filePaths, followRenames]
  );

  // Load commits when dialog opens or followRenames changes
  useEffect(() => {
    if (isOpen) {
      setCommits([]);
      setSelectedCommit(null);
      setSelectedDiff(null);
      loadCommits(0);
    }
  }, [isOpen, loadCommits]);

  // Load diff when commit is selected
  useEffect(() => {
    if (!selectedCommit || filePaths.length === 0) {
      setSelectedDiff(null);
      return;
    }

    const loadDiff = async () => {
      setIsLoadingDiff(true);
      try {
        // Get diff for the first file path in the selected commit
        const diff = await graphApi.getFileDiffInCommit(selectedCommit.oid, filePaths[0]);
        setSelectedDiff(diff);
      } catch (err) {
        console.error('Failed to load file diff:', err);
        setSelectedDiff(null);
      } finally {
        setIsLoadingDiff(false);
      }
    };

    loadDiff();
  }, [selectedCommit, filePaths]);

  const handleScroll = useCallback(() => {
    if (!listRef.current || isLoadingMore || !hasMore) return;

    const { scrollTop, scrollHeight, clientHeight } = listRef.current;
    const scrollThreshold = 200;

    if (scrollHeight - scrollTop - clientHeight < scrollThreshold) {
      loadCommits(commits.length);
    }
  }, [isLoadingMore, hasMore, loadCommits, commits.length]);

  const handleCommitClick = useCallback((commit: Commit) => {
    setSelectedCommit((prev) => (prev?.oid === commit.oid ? null : commit));
  }, []);

  const handleFollowRenamesChange = useCallback((checked: boolean) => {
    setFollowRenames(checked);
    setCommits([]);
    setSelectedCommit(null);
    setSelectedDiff(null);
  }, []);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[90vw] w-[90vw] h-[85vh] flex flex-col">
        <DialogTitle icon={History}>Log: {displayPath}</DialogTitle>

        <DialogBody className="flex-1 min-h-0 p-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-full gap-2 text-(--text-secondary)">
              <Loader2 size={20} className="animate-spin" />
              <span>Loading history...</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-(--text-secondary)">
              <GitCommit size={48} strokeWidth={1} />
              <p>Error loading history</p>
              <p className="text-xs text-(--text-tertiary)">{error}</p>
            </div>
          ) : commits.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-(--text-secondary)">
              <GitCommit size={48} strokeWidth={1} />
              <p>No commits found that modified this file</p>
            </div>
          ) : (
            <div className="flex flex-col h-full">
              <div className="flex-1 min-h-0">
                <PanelGroup direction="horizontal" autoSaveId="file-log-layout">
                  <Panel defaultSize={40} minSize={25} maxSize={60}>
                    <div className="flex flex-col h-full">
                      <PanelGroup direction="vertical" autoSaveId="file-log-left-layout">
                        <Panel defaultSize={65} minSize={30}>
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
                                      Changeset
                                    </th>
                                    <th className="text-left py-2 px-3 font-semibold whitespace-nowrap">
                                      Date
                                    </th>
                                    <th className="text-left py-2 px-3 font-semibold whitespace-nowrap">
                                      User
                                    </th>
                                    <th className="text-left py-2 px-3 font-semibold">
                                      Description
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
                                  <span>Loading more...</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </Panel>
                        <PanelResizeHandle className="resize-handle-vertical" />
                        <Panel defaultSize={35} minSize={20}>
                          {selectedCommit ? (
                            <CommitInfo commit={selectedCommit} />
                          ) : (
                            <div className="flex items-center justify-center h-full text-(--text-secondary) text-sm">
                              Select a commit to view details
                            </div>
                          )}
                        </Panel>
                      </PanelGroup>
                    </div>
                  </Panel>
                  <PanelResizeHandle className="resize-handle" />
                  <Panel minSize={40}>
                    <DiffView
                      diff={selectedDiff}
                      isLoading={isLoadingDiff}
                      commitOid={selectedCommit?.oid}
                      parentCommitOid={selectedCommit?.parentOids[0]}
                    />
                  </Panel>
                </PanelGroup>
              </div>
              <div className="shrink-0 p-3 border-t border-(--border-color) bg-(--bg-secondary)">
                <CheckboxField
                  id="follow-renames"
                  label="Follow renamed files"
                  checked={followRenames}
                  onCheckedChange={handleFollowRenamesChange}
                />
              </div>
            </div>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
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
