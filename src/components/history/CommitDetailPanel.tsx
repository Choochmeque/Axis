import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { X } from 'lucide-react';
import { CommitInfo } from './CommitInfo';
import { CommitFileList } from './CommitFileList';
import { DiffView } from '../diff';
import { useRepositoryStore } from '../../store/repositoryStore';
import type { Commit, GraphCommit } from '../../types';

interface CommitDetailPanelProps {
  commit: Commit | GraphCommit;
  onClose: () => void;
}

export function CommitDetailPanel({ commit, onClose }: CommitDetailPanelProps) {
  const { selectedCommitFiles, selectedCommitFile, isLoadingCommitFiles, selectCommitFile } =
    useRepositoryStore();

  return (
    <div className="flex flex-col h-full bg-(--bg-primary) border-t border-(--border-color)">
      <div className="flex items-center gap-3 py-2 px-3 bg-(--bg-toolbar) border-b border-(--border-color) shrink-0">
        <span className="flex-1 text-[13px] font-medium text-(--text-primary) whitespace-nowrap overflow-hidden text-ellipsis">
          {commit.summary}
        </span>
        <button
          className="flex items-center justify-center w-6 h-6 border-none bg-transparent text-(--text-secondary) cursor-pointer rounded transition-colors shrink-0 hover:bg-(--bg-hover) hover:text-(--text-primary)"
          onClick={onClose}
          title="Close"
        >
          <X size={16} />
        </button>
      </div>
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden *:data-panel-group:flex-1 *:data-panel-group:min-h-0">
        <PanelGroup direction="horizontal" autoSaveId="commit-detail-layout">
          <Panel defaultSize={35} minSize={20} maxSize={50}>
            <PanelGroup direction="vertical" autoSaveId="commit-detail-left-layout">
              <Panel defaultSize={60} minSize={30}>
                <CommitFileList
                  files={selectedCommitFiles}
                  selectedFile={selectedCommitFile}
                  onSelectFile={selectCommitFile}
                  isLoading={isLoadingCommitFiles}
                />
              </Panel>
              <PanelResizeHandle className="h-1 bg-(--border-color) cursor-row-resize transition-colors hover:bg-(--accent-color) data-[resize-handle-state=hover]:bg-(--accent-color) data-[resize-handle-state=drag]:bg-(--accent-color)" />
              <Panel defaultSize={40} minSize={20}>
                <CommitInfo commit={commit} />
              </Panel>
            </PanelGroup>
          </Panel>
          <PanelResizeHandle className="w-1 bg-(--border-color) cursor-col-resize transition-colors hover:bg-(--accent-color) data-[resize-handle-state=hover]:bg-(--accent-color) data-[resize-handle-state=drag]:bg-(--accent-color)" />
          <Panel minSize={50}>
            <DiffView diff={selectedCommitFile} isLoading={isLoadingCommitFiles} />
          </Panel>
        </PanelGroup>
      </div>
    </div>
  );
}
