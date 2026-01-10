import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { X } from 'lucide-react';
import { CommitInfo } from './CommitInfo';
import { CommitFileList } from './CommitFileList';
import { DiffView } from '../diff';
import { useRepositoryStore } from '../../store/repositoryStore';
import type { Commit, GraphCommit } from '../../types';
import './CommitDetailPanel.css';

interface CommitDetailPanelProps {
  commit: Commit | GraphCommit;
  onClose: () => void;
}

export function CommitDetailPanel({ commit, onClose }: CommitDetailPanelProps) {
  const {
    selectedCommitFiles,
    selectedCommitFile,
    isLoadingCommitFiles,
    selectCommitFile,
  } = useRepositoryStore();

  return (
    <div className="commit-detail-panel">
      <div className="commit-detail-header">
        <span className="commit-detail-title">
          {commit.summary}
        </span>
        <button className="commit-detail-close" onClick={onClose} title="Close">
          <X size={16} />
        </button>
      </div>
      <div className="commit-detail-content">
        <CommitInfo commit={commit} />
        <PanelGroup direction="horizontal" autoSaveId="commit-detail-layout">
          <Panel defaultSize={35} minSize={20} maxSize={50}>
            <CommitFileList
              files={selectedCommitFiles}
              selectedFile={selectedCommitFile}
              onSelectFile={selectCommitFile}
              isLoading={isLoadingCommitFiles}
            />
          </Panel>
          <PanelResizeHandle className="resize-handle" />
          <Panel minSize={50}>
            <DiffView diff={selectedCommitFile} isLoading={isLoadingCommitFiles} />
          </Panel>
        </PanelGroup>
      </div>
    </div>
  );
}
