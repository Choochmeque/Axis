import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { Diff, GitBranch, ArrowRight, FileCode, GitCommit } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogBody, Alert, Button } from '@/components/ui';
import { DiffView } from '@/components/diff';
import { CommitCompareList } from './CommitCompareList';
import { CommitFileList } from '@/components/history/CommitFileList';
import { useBranchCompareStore } from '@/store/branchCompareStore';
import { cn } from '@/lib/utils';
import type { Branch } from '@/types';

interface BranchCompareDialogProps {
  isOpen: boolean;
  onClose: () => void;
  baseBranch: Branch | null;
  compareBranch: Branch | null;
}

export function BranchCompareDialog({
  isOpen,
  onClose,
  baseBranch,
  compareBranch,
}: BranchCompareDialogProps) {
  const { t } = useTranslation();
  const {
    compareResult,
    isLoading,
    error,
    activeTab,
    selectedCommit,
    selectedCommitFiles,
    selectedFile,
    isLoadingFiles,
    compare,
    setActiveTab,
    selectCommit,
    selectFile,
    clear,
  } = useBranchCompareStore();

  // Load comparison when dialog opens
  useEffect(() => {
    if (isOpen && baseBranch && compareBranch) {
      compare(baseBranch.name, compareBranch.name);
    }
  }, [isOpen, baseBranch, compareBranch, compare]);

  // Clean up when dialog closes
  useEffect(() => {
    if (!isOpen) {
      clear();
    }
  }, [isOpen, clear]);

  if (!baseBranch || !compareBranch) return null;

  // Get parent OID for diff view
  const parentOid =
    activeTab === 'commits'
      ? selectedCommit?.parentOids[0]
      : (compareResult?.mergeBaseOid ?? compareResult?.baseOid);

  const commitOid = activeTab === 'commits' ? selectedCommit?.oid : compareResult?.compareOid;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent maxWidth="2xl" className="h-[80vh] flex flex-col">
        <DialogTitle icon={Diff}>
          <div className="flex items-center gap-2">
            <span>{t('branches.compare.title')}</span>
          </div>
        </DialogTitle>

        <DialogBody className="flex-1 min-h-0 flex flex-col gap-3 overflow-hidden">
          {/* Branch info header */}
          <div className="flex items-center gap-3 py-2 px-3 bg-(--bg-secondary) rounded-md border border-(--border-color)">
            <div className="flex items-center gap-2">
              <GitBranch size={14} className="text-(--text-secondary)" />
              <span className="text-sm font-medium text-(--text-primary)">{baseBranch.name}</span>
            </div>
            <ArrowRight size={14} className="text-(--text-tertiary)" />
            <div className="flex items-center gap-2">
              <GitBranch size={14} className="text-(--text-secondary)" />
              <span className="text-sm font-medium text-(--text-primary)">
                {compareBranch.name}
              </span>
            </div>
            {compareResult && (
              <div className="flex items-center gap-3 ml-auto text-xs">
                <span className="flex items-center gap-1">
                  <span className="text-success font-medium">
                    +{compareResult.aheadCommits.length}
                  </span>
                  <span className="text-(--text-tertiary)">{t('branches.compare.ahead')}</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="text-warning font-medium">
                    -{compareResult.behindCommits.length}
                  </span>
                  <span className="text-(--text-tertiary)">{t('branches.compare.behind')}</span>
                </span>
              </div>
            )}
          </div>

          {/* Tab buttons */}
          <div className="flex gap-1 shrink-0">
            <TabButton
              active={activeTab === 'commits'}
              onClick={() => setActiveTab('commits')}
              icon={GitCommit}
              label={t('branches.compare.commits')}
              count={
                compareResult
                  ? compareResult.aheadCommits.length + compareResult.behindCommits.length
                  : undefined
              }
            />
            <TabButton
              active={activeTab === 'files'}
              onClick={() => setActiveTab('files')}
              icon={FileCode}
              label={t('branches.compare.files')}
              count={compareResult?.files.length}
            />
          </div>

          {/* Error state */}
          {error && (
            <Alert variant="error" inline>
              {error}
            </Alert>
          )}

          {/* Loading state */}
          {isLoading && (
            <div className="flex-1 flex items-center justify-center text-(--text-secondary)">
              {t('branches.compare.loading')}
            </div>
          )}

          {/* Main content panels */}
          {!isLoading && compareResult && (
            <div className="flex-1 min-h-0 border border-(--border-color) rounded-md overflow-hidden">
              <PanelGroup direction="horizontal" autoSaveId="branch-compare-layout">
                <Panel defaultSize={35} minSize={20} maxSize={50}>
                  {activeTab === 'commits' ? (
                    <CommitCompareList
                      aheadCommits={compareResult.aheadCommits}
                      behindCommits={compareResult.behindCommits}
                      selectedCommit={selectedCommit}
                      onSelectCommit={selectCommit}
                      isLoading={false}
                    />
                  ) : (
                    <CommitFileList
                      files={compareResult.files}
                      selectedFile={selectedFile}
                      onSelectFile={selectFile}
                      isLoading={false}
                    />
                  )}
                </Panel>
                <PanelResizeHandle className="resize-handle" />
                <Panel minSize={50}>
                  {activeTab === 'commits' && !selectedCommit ? (
                    <div className="flex flex-col h-full items-center justify-center text-(--text-secondary) text-sm">
                      {t('branches.compare.selectCommitPrompt')}
                    </div>
                  ) : activeTab === 'commits' && selectedCommit ? (
                    <PanelGroup direction="vertical" autoSaveId="branch-compare-commit-layout">
                      <Panel defaultSize={30} minSize={15} maxSize={50}>
                        <CommitFileList
                          files={selectedCommitFiles}
                          selectedFile={selectedFile}
                          onSelectFile={selectFile}
                          isLoading={isLoadingFiles}
                          commitOid={selectedCommit?.oid}
                        />
                      </Panel>
                      <PanelResizeHandle className="resize-handle-vertical" />
                      <Panel minSize={50}>
                        <DiffView
                          diff={selectedFile}
                          isLoading={isLoadingFiles}
                          commitOid={commitOid}
                          parentCommitOid={parentOid}
                        />
                      </Panel>
                    </PanelGroup>
                  ) : (
                    <DiffView
                      diff={selectedFile}
                      isLoading={false}
                      commitOid={commitOid}
                      parentCommitOid={parentOid}
                    />
                  )}
                </Panel>
              </PanelGroup>
            </div>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  count?: number;
}

function TabButton({ active, onClick, icon: Icon, label, count }: TabButtonProps) {
  return (
    <Button
      variant={active ? 'primary' : 'secondary'}
      size="sm"
      onClick={onClick}
      className={cn('gap-1.5', !active && 'bg-transparent')}
    >
      <Icon size={14} />
      <span>{label}</span>
      {count !== undefined && (
        <span
          className={cn(
            'badge text-xs',
            active ? 'bg-white/20 text-white' : 'bg-(--bg-tertiary) text-(--text-secondary)'
          )}
        >
          {count}
        </span>
      )}
    </Button>
  );
}
