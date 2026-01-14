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
import { cn } from '../../lib/utils';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogBody,
  DialogFooter,
  DialogClose,
  Button,
  FormField,
  Input,
} from '@/components/ui';

const btnIconClass =
  'flex items-center justify-center w-7 h-7 p-0 bg-transparent border-none rounded text-(--text-secondary) cursor-pointer transition-colors hover:bg-(--bg-hover) hover:text-(--text-primary) disabled:opacity-50 disabled:cursor-not-allowed';
const btnSmallClass =
  'flex items-center gap-1 py-1 px-2 text-xs rounded cursor-pointer transition-colors border';

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
        branch: addBranch || null,
        name: null,
        depth: null,
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
        force: false,
        remote: false,
        rebase: false,
        merge: false,
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
      case 'Current':
        return <Check size={14} className="text-success" />;
      case 'Modified':
        return <AlertTriangle size={14} className="text-warning" />;
      case 'Uninitialized':
        return <Circle size={14} className="text-(--text-muted)" />;
      case 'Missing':
        return <AlertCircle size={14} className="text-error" />;
      case 'Conflict':
        return <AlertCircle size={14} className="text-error" />;
      case 'Dirty':
        return <AlertTriangle size={14} className="text-warning" />;
      default:
        return <Circle size={14} className="text-(--text-muted)" />;
    }
  };

  const getStatusLabel = (status: SubmoduleStatus) => {
    switch (status) {
      case 'Current':
        return 'Up to date';
      case 'Modified':
        return 'Modified';
      case 'Uninitialized':
        return 'Not initialized';
      case 'Missing':
        return 'Missing';
      case 'Conflict':
        return 'Conflict';
      case 'Dirty':
        return 'Dirty';
      default:
        return 'Unknown';
    }
  };

  const getStatusClass = (status: SubmoduleStatus) => {
    switch (status) {
      case 'Current':
        return 'text-success';
      case 'Modified':
      case 'Dirty':
        return 'text-warning';
      case 'Missing':
      case 'Conflict':
        return 'text-error';
      default:
        return 'text-(--text-muted)';
    }
  };

  return (
    <div className="flex flex-col h-full bg-(--bg-secondary)">
      <div className="flex items-center justify-between py-2 px-3 border-b border-(--border-color)">
        <div className="flex items-center gap-2 font-medium text-(--text-primary)">
          <FolderGit2 size={16} />
          <span>Submodules</span>
          <span className="px-1.5 text-xs bg-(--bg-tertiary) rounded-full text-(--text-secondary)">
            {submodules.length}
          </span>
        </div>
        <div className="flex gap-1">
          <button
            className={btnIconClass}
            onClick={() => setShowAddDialog(true)}
            title="Add submodule"
          >
            <Plus size={16} />
          </button>
          <button
            className={btnIconClass}
            onClick={() => handleUpdate()}
            title="Update all submodules"
            disabled={isLoading || submodules.length === 0}
          >
            <Download size={16} />
          </button>
          <button
            className={btnIconClass}
            onClick={loadSubmodules}
            title="Refresh"
            disabled={isLoading}
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

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

      <div className="flex-1 overflow-y-auto p-2">
        {submodules.length === 0 ? (
          <div className="py-6 text-center text-(--text-muted) text-sm">No submodules</div>
        ) : (
          submodules.map((submodule) => (
            <div
              key={submodule.path}
              className={cn(
                'p-3 mb-2 rounded-md cursor-pointer transition-colors border',
                selectedPath === submodule.path
                  ? 'bg-(--bg-active) border-(--accent-color)'
                  : 'bg-(--bg-primary) border-transparent hover:bg-(--bg-hover)'
              )}
              onClick={() => setSelectedPath(submodule.path)}
            >
              <div className="flex items-center gap-2 mb-1">
                {getStatusIcon(submodule.status)}
                <span className="font-mono text-sm text-(--text-primary) font-medium">
                  {submodule.path}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-(--text-muted) mb-1">
                {submodule.shortOid && (
                  <span className="font-mono text-(--accent-color)">{submodule.shortOid}</span>
                )}
                {submodule.branch && (
                  <span className="px-1.5 py-0.5 bg-(--bg-tertiary) rounded">
                    {submodule.branch}
                  </span>
                )}
                <span className={getStatusClass(submodule.status)}>
                  {getStatusLabel(submodule.status)}
                </span>
              </div>
              {submodule.url && (
                <div className="text-xs text-(--text-muted) truncate">{submodule.url}</div>
              )}
              {selectedPath === submodule.path && (
                <div className="flex gap-2 mt-3 pt-3 border-t border-(--border-color)">
                  {submodule.status === 'Uninitialized' && (
                    <button
                      className={cn(
                        btnSmallClass,
                        'bg-(--accent-color) border-(--accent-color) text-white hover:opacity-90'
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleInit(submodule.path);
                      }}
                    >
                      Initialize
                    </button>
                  )}
                  <button
                    className={cn(
                      btnSmallClass,
                      'bg-(--bg-secondary) border-(--border-color) text-(--text-primary) hover:bg-(--bg-hover) disabled:opacity-50'
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUpdate(submodule.path);
                    }}
                    disabled={submodule.status === 'Uninitialized'}
                  >
                    <Download size={12} />
                    Update
                  </button>
                  <button
                    className={cn(
                      btnSmallClass,
                      'bg-error/10 border-error text-error hover:bg-error/20'
                    )}
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

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-100">
          <DialogTitle>
            <FolderGit2 size={18} />
            Add Submodule
          </DialogTitle>

          <DialogBody>
            <FormField label="Repository URL" htmlFor="submodule-url">
              <Input
                id="submodule-url"
                type="text"
                value={addUrl}
                onChange={(e) => setAddUrl(e.target.value)}
                placeholder="https://github.com/user/repo.git"
              />
            </FormField>
            <FormField label="Path" htmlFor="submodule-path">
              <Input
                id="submodule-path"
                type="text"
                value={addPath}
                onChange={(e) => setAddPath(e.target.value)}
                placeholder="lib/submodule"
              />
            </FormField>
            <FormField label="Branch (optional)" htmlFor="submodule-branch">
              <Input
                id="submodule-branch"
                type="text"
                value={addBranch}
                onChange={(e) => setAddBranch(e.target.value)}
                placeholder="main"
              />
            </FormField>
          </DialogBody>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary" disabled={isLoading}>
                Cancel
              </Button>
            </DialogClose>
            <Button
              variant="primary"
              onClick={handleAdd}
              disabled={isLoading || !addUrl.trim() || !addPath.trim()}
            >
              {isLoading ? 'Adding...' : 'Add Submodule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
