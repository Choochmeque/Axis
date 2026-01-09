import { useState, useEffect, useCallback } from 'react';
import {
  FolderGit2,
  RefreshCw,
  Plus,
  Download,
  AlertCircle,
  X,
  Check,
  AlertTriangle,
  Circle,
  Trash2,
} from 'lucide-react';
import { submoduleApi } from '../../services/api';
import type { Submodule, SubmoduleStatus } from '../../types';
import './SubmoduleView.css';

interface SubmoduleViewProps {
  onRefresh?: () => void;
}

export function SubmoduleView({ onRefresh }: SubmoduleViewProps) {
  const [submodules, setSubmodules] = useState<Submodule[]>([]);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);

  // Add dialog state
  const [addUrl, setAddUrl] = useState('');
  const [addPath, setAddPath] = useState('');
  const [addBranch, setAddBranch] = useState('');

  const loadSubmodules = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const submoduleList = await submoduleApi.list();
      setSubmodules(submoduleList);
    } catch (err) {
      console.error('Failed to load submodules:', err);
      setError('Failed to load submodules');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSubmodules();
  }, [loadSubmodules]);

  const handleAdd = async () => {
    if (!addUrl.trim() || !addPath.trim()) {
      setError('URL and path are required');
      return;
    }

    setIsLoading(true);
    try {
      const result = await submoduleApi.add({
        url: addUrl,
        path: addPath,
        branch: addBranch || undefined,
      });

      if (result.success) {
        setShowAddDialog(false);
        setAddUrl('');
        setAddPath('');
        setAddBranch('');
        await loadSubmodules();
        onRefresh?.();
      } else {
        setError(result.message);
      }
    } catch (err) {
      console.error('Failed to add submodule:', err);
      setError('Failed to add submodule');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInit = async (path?: string) => {
    setIsLoading(true);
    try {
      const result = await submoduleApi.init(path ? [path] : []);
      if (result.success) {
        await loadSubmodules();
      } else {
        setError(result.message);
      }
    } catch (err) {
      console.error('Failed to init submodule:', err);
      setError('Failed to init submodule');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdate = async (path?: string) => {
    setIsLoading(true);
    try {
      const result = await submoduleApi.update({
        paths: path ? [path] : [],
        init: true,
        recursive: true,
      });
      if (result.success) {
        await loadSubmodules();
        onRefresh?.();
      } else {
        setError(result.message);
      }
    } catch (err) {
      console.error('Failed to update submodule:', err);
      setError('Failed to update submodule');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemove = async (path: string) => {
    if (!confirm(`Remove submodule '${path}'? This will delete the submodule directory.`)) {
      return;
    }

    setIsLoading(true);
    try {
      const result = await submoduleApi.remove(path);
      if (result.success) {
        await loadSubmodules();
        if (selectedPath === path) {
          setSelectedPath(null);
        }
        onRefresh?.();
      } else {
        setError(result.message);
      }
    } catch (err) {
      console.error('Failed to remove submodule:', err);
      setError('Failed to remove submodule');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: SubmoduleStatus) => {
    switch (status) {
      case 'current':
        return <Check size={14} className="status-icon current" />;
      case 'modified':
        return <AlertTriangle size={14} className="status-icon modified" />;
      case 'uninitialized':
        return <Circle size={14} className="status-icon uninitialized" />;
      case 'missing':
        return <AlertCircle size={14} className="status-icon missing" />;
      case 'conflict':
        return <AlertCircle size={14} className="status-icon conflict" />;
      case 'dirty':
        return <AlertTriangle size={14} className="status-icon dirty" />;
      default:
        return <Circle size={14} className="status-icon unknown" />;
    }
  };

  const getStatusLabel = (status: SubmoduleStatus) => {
    switch (status) {
      case 'current':
        return 'Up to date';
      case 'modified':
        return 'Modified';
      case 'uninitialized':
        return 'Not initialized';
      case 'missing':
        return 'Missing';
      case 'conflict':
        return 'Conflict';
      case 'dirty':
        return 'Dirty';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className="submodule-view">
      <div className="submodule-header">
        <div className="submodule-title">
          <FolderGit2 size={16} />
          <span>Submodules</span>
          <span className="submodule-count">{submodules.length}</span>
        </div>
        <div className="submodule-actions">
          <button
            className="btn-icon"
            onClick={() => setShowAddDialog(true)}
            title="Add submodule"
          >
            <Plus size={16} />
          </button>
          <button
            className="btn-icon"
            onClick={() => handleUpdate()}
            title="Update all submodules"
            disabled={isLoading || submodules.length === 0}
          >
            <Download size={16} />
          </button>
          <button
            className="btn-icon"
            onClick={loadSubmodules}
            title="Refresh"
            disabled={isLoading}
          >
            <RefreshCw size={16} className={isLoading ? 'spinning' : ''} />
          </button>
        </div>
      </div>

      {error && (
        <div className="submodule-error">
          <AlertCircle size={14} />
          <span>{error}</span>
          <button onClick={() => setError(null)}>
            <X size={14} />
          </button>
        </div>
      )}

      <div className="submodule-list">
        {submodules.length === 0 ? (
          <div className="submodule-empty">No submodules</div>
        ) : (
          submodules.map((submodule) => (
            <div
              key={submodule.path}
              className={`submodule-item ${selectedPath === submodule.path ? 'selected' : ''}`}
              onClick={() => setSelectedPath(submodule.path)}
            >
              <div className="submodule-item-header">
                {getStatusIcon(submodule.status)}
                <span className="submodule-path">{submodule.path}</span>
              </div>
              <div className="submodule-item-meta">
                {submodule.short_oid && (
                  <span className="submodule-oid">{submodule.short_oid}</span>
                )}
                {submodule.branch && (
                  <span className="submodule-branch">{submodule.branch}</span>
                )}
                <span className={`submodule-status ${submodule.status}`}>
                  {getStatusLabel(submodule.status)}
                </span>
              </div>
              {submodule.url && (
                <div className="submodule-url">{submodule.url}</div>
              )}
              {selectedPath === submodule.path && (
                <div className="submodule-item-actions">
                  {submodule.status === 'uninitialized' && (
                    <button
                      className="btn btn-small btn-primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleInit(submodule.path);
                      }}
                    >
                      Initialize
                    </button>
                  )}
                  <button
                    className="btn btn-small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUpdate(submodule.path);
                    }}
                    disabled={submodule.status === 'uninitialized'}
                  >
                    <Download size={12} />
                    Update
                  </button>
                  <button
                    className="btn btn-small btn-danger"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemove(submodule.path);
                    }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {showAddDialog && (
        <div className="dialog-overlay" onClick={() => setShowAddDialog(false)}>
          <div className="dialog submodule-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-header">
              <div className="dialog-title">
                <FolderGit2 size={20} />
                <span>Add Submodule</span>
              </div>
              <button className="dialog-close" onClick={() => setShowAddDialog(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="dialog-content">
              <div className="form-group">
                <label htmlFor="submodule-url">Repository URL</label>
                <input
                  id="submodule-url"
                  type="text"
                  value={addUrl}
                  onChange={(e) => setAddUrl(e.target.value)}
                  placeholder="https://github.com/user/repo.git"
                />
              </div>
              <div className="form-group">
                <label htmlFor="submodule-path">Path</label>
                <input
                  id="submodule-path"
                  type="text"
                  value={addPath}
                  onChange={(e) => setAddPath(e.target.value)}
                  placeholder="lib/submodule"
                />
              </div>
              <div className="form-group">
                <label htmlFor="submodule-branch">Branch (optional)</label>
                <input
                  id="submodule-branch"
                  type="text"
                  value={addBranch}
                  onChange={(e) => setAddBranch(e.target.value)}
                  placeholder="main"
                />
              </div>
            </div>
            <div className="dialog-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setShowAddDialog(false)}
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleAdd}
                disabled={isLoading || !addUrl.trim() || !addPath.trim()}
              >
                {isLoading ? 'Adding...' : 'Add Submodule'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
