import {
  GitCommit,
  ArrowDownToLine,
  ArrowUpFromLine,
  RefreshCw,
  GitBranch,
  GitMerge,
  Archive,
  FolderOpen,
} from 'lucide-react';
import { useRepositoryStore } from '../../store/repositoryStore';
import { open } from '@tauri-apps/plugin-dialog';
import './Toolbar.css';

export function Toolbar() {
  const { repository, openRepository, refreshRepository } = useRepositoryStore();

  const handleOpenRepository = async () => {
    const selected = await open({
      directory: true,
      multiple: false,
      title: 'Select Repository',
    });

    if (selected && typeof selected === 'string') {
      await openRepository(selected);
    }
  };

  const handleRefresh = async () => {
    await refreshRepository();
  };

  return (
    <div className="toolbar">
      <div className="toolbar-group">
        <button
          className="toolbar-button"
          onClick={handleOpenRepository}
          title="Open Repository"
        >
          <FolderOpen size={18} />
          <span>Open</span>
        </button>
      </div>

      {repository && (
        <>
          <div className="toolbar-separator" />
          <div className="toolbar-group">
            <button className="toolbar-button" title="Commit" disabled>
              <GitCommit size={18} />
              <span>Commit</span>
            </button>
            <button className="toolbar-button" title="Pull" disabled>
              <ArrowDownToLine size={18} />
              <span>Pull</span>
            </button>
            <button className="toolbar-button" title="Push" disabled>
              <ArrowUpFromLine size={18} />
              <span>Push</span>
            </button>
            <button
              className="toolbar-button"
              onClick={handleRefresh}
              title="Fetch"
            >
              <RefreshCw size={18} />
              <span>Fetch</span>
            </button>
          </div>

          <div className="toolbar-separator" />
          <div className="toolbar-group">
            <button className="toolbar-button" title="Branch" disabled>
              <GitBranch size={18} />
              <span>Branch</span>
            </button>
            <button className="toolbar-button" title="Merge" disabled>
              <GitMerge size={18} />
              <span>Merge</span>
            </button>
            <button className="toolbar-button" title="Stash" disabled>
              <Archive size={18} />
              <span>Stash</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
