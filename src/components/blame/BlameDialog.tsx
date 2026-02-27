import { FileText } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { CommitInfo } from '@/components/history/CommitInfo';
import { Dialog, DialogBody, DialogContent, DialogTitle } from '@/components/ui';
import { getErrorMessage } from '@/lib/errorUtils';
import { commitApi } from '@/services/api';
import { useBlameStore } from '@/store/blameStore';
import type { Commit } from '@/types';
import { BlameView } from './BlameView';

interface BlameDialogProps {
  isOpen: boolean;
  onClose: () => void;
  filePath: string;
  commitOid?: string;
}

export function BlameDialog({ isOpen, onClose, filePath, commitOid }: BlameDialogProps) {
  const { t } = useTranslation();
  const { result, isLoading, error, hoveredCommitOid, loadBlame, setHoveredCommit, clear } =
    useBlameStore();

  const [hoveredCommit, setHoveredCommitData] = useState<Commit | null>(null);
  const [isLoadingCommit, setIsLoadingCommit] = useState(false);
  const prevHoveredOidRef = useRef<string | null>(null);

  // Load blame when dialog opens
  useEffect(() => {
    if (isOpen && filePath) {
      loadBlame(filePath, commitOid);
    }
  }, [isOpen, filePath, commitOid, loadBlame]);

  // Clean up when dialog closes
  useEffect(() => {
    if (!isOpen) {
      clear();
    }
  }, [isOpen, clear]);

  // Fetch commit details
  const fetchCommitDetails = useCallback(async (oid: string) => {
    setIsLoadingCommit(true);
    try {
      const commit = await commitApi.getCommit(oid);
      setHoveredCommitData(commit);
    } catch (err) {
      console.error('Failed to fetch commit:', getErrorMessage(err));
    } finally {
      setIsLoadingCommit(false);
    }
  }, []);

  // Trigger fetch when hovering changes
  useEffect(() => {
    // Skip if no OID or same OID as before
    if (!hoveredCommitOid || hoveredCommitOid === prevHoveredOidRef.current) {
      return;
    }
    prevHoveredOidRef.current = hoveredCommitOid;
    fetchCommitDetails(hoveredCommitOid);
  }, [hoveredCommitOid, fetchCommitDetails]);

  // Derive the displayed commit - only show if it matches the current hovered OID
  const displayedCommit =
    hoveredCommitOid && hoveredCommit?.oid === hoveredCommitOid ? hoveredCommit : null;

  const handleCommitClick = useCallback(
    (oid: string) => {
      // TODO: Navigate to history view and select commit
      setHoveredCommit(oid);
    },
    [setHoveredCommit]
  );

  const handleClose = useCallback(() => {
    setHoveredCommitData(null);
    onClose();
  }, [onClose]);

  const fileName = filePath.split('/').pop() || filePath;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-[90vw] w-[90vw] h-[85vh] flex flex-col">
        <DialogTitle icon={FileText}>{t('blame.title', { path: fileName })}</DialogTitle>

        <DialogBody className="flex-1 min-h-0 p-0">
          <PanelGroup direction="horizontal" autoSaveId="blame-layout">
            <Panel defaultSize={70} minSize={50}>
              <BlameView
                lines={result?.lines ?? []}
                isLoading={isLoading}
                error={error}
                hoveredCommitOid={hoveredCommitOid}
                onHoverCommit={setHoveredCommit}
                onClickCommit={handleCommitClick}
              />
            </Panel>
            <PanelResizeHandle className="resize-handle" />
            <Panel defaultSize={30} minSize={20}>
              {displayedCommit ? (
                <CommitInfo commit={displayedCommit} />
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-2 text-(--text-secondary) text-sm p-4">
                  {isLoadingCommit ? (
                    <span>{t('common.loading')}</span>
                  ) : (
                    <span className="text-center">{t('blame.selectCommitForDetails')}</span>
                  )}
                </div>
              )}
            </Panel>
          </PanelGroup>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
