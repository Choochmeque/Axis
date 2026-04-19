import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Group, Panel, Separator, useDefaultLayout } from 'react-resizable-panels';
import { useRepositoryStore } from '../../store/repositoryStore';
import type { Commit, GraphCommit } from '../../types';
import { DiffView } from '../diff';
import { CommitFileList } from './CommitFileList';
import { CommitInfo } from './CommitInfo';

interface CommitDetailPanelProps {
  commit: Commit | GraphCommit;
  onClose: () => void;
  onScrollToCommit?: (oid: string) => void;
}

export function CommitDetailPanel({ commit, onClose, onScrollToCommit }: CommitDetailPanelProps) {
  const { t } = useTranslation();
  const { defaultLayout: mainLayout, onLayoutChanged: onMainLayoutChanged } = useDefaultLayout({
    groupId: 'commit-detail-layout',
    storage: localStorage,
  });
  const { defaultLayout: leftLayout, onLayoutChanged: onLeftLayoutChanged } = useDefaultLayout({
    groupId: 'commit-detail-left-layout',
    storage: localStorage,
  });
  const { selectedCommitFiles, selectedCommitFile, isLoadingCommitFiles, selectCommitFile } =
    useRepositoryStore();

  // Get parent commit OID for image diff comparison (first parent for regular commits)
  const parentCommitOid = commit.parentOids.length > 0 ? commit.parentOids[0] : undefined;

  return (
    <div className="flex flex-col h-full bg-(--bg-primary) border-t border-(--border-color)">
      <div className="flex items-center gap-3 py-2 px-3 bg-(--bg-toolbar) border-b border-(--border-color) shrink-0">
        <span className="flex-1 text-base font-medium text-(--text-primary) whitespace-nowrap overflow-hidden text-ellipsis">
          {commit.summary}
        </span>
        <button
          className="flex items-center justify-center w-6 h-6 border-none bg-transparent text-(--text-secondary) cursor-pointer rounded transition-colors shrink-0 hover:bg-(--bg-hover) hover:text-(--text-primary)"
          onClick={onClose}
          title={t('common.close')}
        >
          <X size={16} />
        </button>
      </div>
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden *:data-panel-group:flex-1 *:data-panel-group:min-h-0">
        <Group
          orientation="horizontal"
          defaultLayout={mainLayout}
          onLayoutChange={onMainLayoutChanged}
        >
          <Panel id="left" defaultSize="35%" minSize="20%" maxSize="50%">
            <Group
              orientation="vertical"
              defaultLayout={leftLayout}
              onLayoutChange={onLeftLayoutChanged}
            >
              <Panel id="files" defaultSize="60%" minSize="30%">
                <CommitFileList
                  files={selectedCommitFiles}
                  selectedFile={selectedCommitFile}
                  onSelectFile={selectCommitFile}
                  isLoading={isLoadingCommitFiles}
                  commitOid={commit.oid}
                />
              </Panel>
              <Separator className="resize-handle-vertical" />
              <Panel id="info" defaultSize="40%" minSize="20%">
                <CommitInfo commit={commit} onScrollToCommit={onScrollToCommit} />
              </Panel>
            </Group>
          </Panel>
          <Separator className="resize-handle" />
          <Panel id="diff" minSize="50%">
            <DiffView
              diff={selectedCommitFile}
              isLoading={isLoadingCommitFiles}
              commitOid={commit.oid}
              parentCommitOid={parentCommitOid}
            />
          </Panel>
        </Group>
      </div>
    </div>
  );
}
