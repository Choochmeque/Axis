import { useState, useEffect, useCallback } from 'react';
import {
  GitBranch,
  Check,
  Upload,
  Plus,
  RefreshCw,
  AlertCircle,
  X,
  Settings,
  Rocket,
  Bug,
} from 'lucide-react';
import { gitflowApi } from '../../services/api';
import type { GitFlowConfig, GitFlowResult, GitFlowBranchType } from '../../types';
import { cn } from '../../lib/utils';

const btnIconClass =
  'flex items-center justify-center w-7 h-7 p-0 bg-transparent border-none rounded text-(--text-secondary) cursor-pointer transition-colors hover:bg-(--bg-hover) hover:text-(--text-primary) disabled:opacity-50 disabled:cursor-not-allowed';
const btnIconSmallClass =
  'flex items-center justify-center w-5.5 h-5.5 p-0 bg-(--bg-secondary) border border-(--border-color) rounded text-(--text-secondary) cursor-pointer hover:bg-(--bg-hover) hover:text-(--text-primary)';
const overlayClass = 'fixed inset-0 bg-black/50 flex items-center justify-center z-9999';
const dialogClass =
  'bg-(--bg-primary) rounded-lg shadow-xl w-100 max-w-[90vw] max-h-[80vh] flex flex-col';
const headerClass = 'flex items-center justify-between py-4 px-4 border-b border-(--border-color)';
const titleClass = 'flex items-center gap-2 text-base font-semibold text-(--text-primary)';
const closeClass =
  'flex items-center justify-center w-7 h-7 p-0 bg-transparent border-none rounded text-(--text-secondary) cursor-pointer transition-colors hover:bg-(--bg-hover) hover:text-(--text-primary)';
const contentClass = 'flex-1 p-4 overflow-y-auto';
const footerClass = 'flex justify-end gap-2 py-3 px-4 border-t border-(--border-color)';
const formGroupClass = 'mb-4';
const labelClass = 'block mb-1.5 text-[13px] font-medium text-(--text-secondary)';
const inputClass =
  'w-full py-2 px-3 border border-(--border-color) rounded bg-(--bg-primary) text-(--text-primary) text-sm outline-none focus:border-(--accent-color)';
const btnClass =
  'flex items-center gap-1.5 py-2 px-4 text-[13px] font-medium rounded cursor-pointer transition-colors disabled:opacity-60 disabled:cursor-not-allowed';

interface GitFlowViewProps {
  onRefresh?: () => void;
}

export function GitFlowView({ onRefresh }: GitFlowViewProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [config, setConfig] = useState<GitFlowConfig | null>(null);
  const [features, setFeatures] = useState<string[]>([]);
  const [releases, setReleases] = useState<string[]>([]);
  const [hotfixes, setHotfixes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Dialog state
  const [showInitDialog, setShowInitDialog] = useState(false);
  const [showStartDialog, setShowStartDialog] = useState(false);
  const [startType, setStartType] = useState<GitFlowBranchType>('feature');
  const [branchName, setBranchName] = useState('');

  // Init options
  const [initMaster, setInitMaster] = useState('main');
  const [initDevelop, setInitDevelop] = useState('develop');

  const loadState = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const initialized = await gitflowApi.isInitialized();
      setIsInitialized(initialized);

      if (initialized) {
        const cfg = await gitflowApi.getConfig();
        setConfig(cfg);

        const [featureList, releaseList, hotfixList] = await Promise.all([
          gitflowApi.feature.list(),
          gitflowApi.release.list(),
          gitflowApi.hotfix.list(),
        ]);

        setFeatures(featureList);
        setReleases(releaseList);
        setHotfixes(hotfixList);
      }
    } catch (err) {
      console.error('Failed to load git-flow state:', err);
      setError('Failed to load git-flow state');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadState();
  }, [loadState]);

  const handleInit = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await gitflowApi.init({
        master: initMaster,
        develop: initDevelop,
      });

      if (result.success) {
        setShowInitDialog(false);
        setSuccess('Git-flow initialized successfully');
        await loadState();
        onRefresh?.();
      } else {
        setError(result.message);
      }
    } catch (err) {
      console.error('Failed to initialize git-flow:', err);
      setError('Failed to initialize git-flow');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStart = async () => {
    if (!branchName.trim()) {
      setError('Branch name is required');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      let result: GitFlowResult;
      switch (startType) {
        case 'feature':
          result = await gitflowApi.feature.start(branchName);
          break;
        case 'release':
          result = await gitflowApi.release.start(branchName);
          break;
        case 'hotfix':
          result = await gitflowApi.hotfix.start(branchName);
          break;
        default:
          throw new Error('Invalid branch type');
      }

      if (result.success) {
        setShowStartDialog(false);
        setBranchName('');
        setSuccess(result.message);
        await loadState();
        onRefresh?.();
      } else {
        setError(result.message);
      }
    } catch (err) {
      console.error('Failed to start branch:', err);
      setError('Failed to start branch');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinish = async (type: GitFlowBranchType, name: string) => {
    setIsLoading(true);
    setError(null);
    try {
      let result: GitFlowResult;
      switch (type) {
        case 'feature':
          result = await gitflowApi.feature.finish(name, { no_ff: true });
          break;
        case 'release':
          result = await gitflowApi.release.finish(name, { no_ff: true });
          break;
        case 'hotfix':
          result = await gitflowApi.hotfix.finish(name, { no_ff: true });
          break;
        default:
          throw new Error('Invalid branch type');
      }

      if (result.success) {
        setSuccess(result.message);
        await loadState();
        onRefresh?.();
      } else {
        setError(result.message);
      }
    } catch (err) {
      console.error('Failed to finish branch:', err);
      setError('Failed to finish branch');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePublish = async (type: GitFlowBranchType, name: string) => {
    setIsLoading(true);
    setError(null);
    try {
      let result: GitFlowResult;
      switch (type) {
        case 'feature':
          result = await gitflowApi.feature.publish(name);
          break;
        case 'release':
          result = await gitflowApi.release.publish(name);
          break;
        case 'hotfix':
          result = await gitflowApi.hotfix.publish(name);
          break;
        default:
          throw new Error('Invalid branch type');
      }

      if (result.success) {
        setSuccess(result.message);
      } else {
        setError(result.message);
      }
    } catch (err) {
      console.error('Failed to publish branch:', err);
      setError('Failed to publish branch');
    } finally {
      setIsLoading(false);
    }
  };

  const openStartDialog = (type: GitFlowBranchType) => {
    setStartType(type);
    setBranchName('');
    setShowStartDialog(true);
  };

  const getTypeLabel = (type: GitFlowBranchType) => {
    switch (type) {
      case 'feature':
        return 'Feature';
      case 'release':
        return 'Release';
      case 'hotfix':
        return 'Hotfix';
      default:
        return type;
    }
  };

  const getTypeIcon = (type: GitFlowBranchType) => {
    switch (type) {
      case 'feature':
        return <GitBranch size={14} />;
      case 'release':
        return <Rocket size={14} />;
      case 'hotfix':
        return <Bug size={14} />;
      default:
        return <GitBranch size={14} />;
    }
  };

  return (
    <div className="flex flex-col h-full bg-(--bg-secondary) rounded">
      <div className="flex items-center justify-between py-2 px-3 border-b border-(--border-color)">
        <div className="flex items-center gap-2 font-medium text-(--text-primary)">
          <GitBranch size={16} />
          <span>Git Flow</span>
        </div>
        <div className="flex gap-1">
          {!isInitialized && (
            <button
              className={btnIconClass}
              onClick={() => setShowInitDialog(true)}
              title="Initialize Git Flow"
            >
              <Settings size={16} />
            </button>
          )}
          <button className={btnIconClass} onClick={loadState} title="Refresh" disabled={isLoading}>
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 py-2 px-3 m-2 bg-error/10 text-error rounded text-[13px]">
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

      {success && (
        <div className="flex items-center gap-2 py-2 px-3 m-2 bg-success/10 text-success rounded text-[13px]">
          <Check size={14} />
          <span className="flex-1">{success}</span>
          <button
            className="p-0.5 bg-transparent border-none text-inherit cursor-pointer opacity-70 hover:opacity-100"
            onClick={() => setSuccess(null)}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {!isInitialized ? (
        <div className="flex flex-col items-center justify-center py-6 px-4 text-center text-(--text-secondary)">
          <p className="mb-4">Git Flow is not initialized in this repository.</p>
          <button
            className={cn(btnClass, 'bg-(--accent-color) text-white hover:opacity-90')}
            onClick={() => setShowInitDialog(true)}
          >
            <Settings size={14} />
            Initialize Git Flow
          </button>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-2">
          {/* Features Section */}
          <div className="mb-4">
            <div className="flex items-center justify-between py-1.5 px-2 bg-(--bg-tertiary) rounded mb-1">
              <div className="flex items-center gap-1.5 text-xs font-medium text-(--text-primary)">
                <GitBranch size={14} />
                <span>Features</span>
                <span className="px-1.5 py-0.5 bg-(--bg-secondary) rounded-xl text-[11px] text-(--text-secondary)">
                  {features.length}
                </span>
              </div>
              <button
                className={btnIconSmallClass}
                onClick={() => openStartDialog('feature')}
                title="Start new feature"
              >
                <Plus size={14} />
              </button>
            </div>
            {features.length === 0 ? (
              <div className="py-3 text-center text-(--text-muted) text-xs">No active features</div>
            ) : (
              <div className="flex flex-col gap-0.5">
                {features.map((name) => (
                  <div
                    key={name}
                    className="flex items-center justify-between py-1.5 px-2 rounded cursor-pointer hover:bg-(--bg-hover) group"
                  >
                    <span className="text-[13px] text-(--text-primary) font-mono">
                      {config?.feature_prefix}
                      {name}
                    </span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        className={btnIconSmallClass}
                        onClick={() => handlePublish('feature', name)}
                        title="Publish"
                      >
                        <Upload size={12} />
                      </button>
                      <button
                        className={btnIconSmallClass}
                        onClick={() => handleFinish('feature', name)}
                        title="Finish"
                      >
                        <Check size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Releases Section */}
          <div className="mb-4">
            <div className="flex items-center justify-between py-1.5 px-2 bg-(--bg-tertiary) rounded mb-1">
              <div className="flex items-center gap-1.5 text-xs font-medium text-(--text-primary)">
                <Rocket size={14} />
                <span>Releases</span>
                <span className="px-1.5 py-0.5 bg-(--bg-secondary) rounded-xl text-[11px] text-(--text-secondary)">
                  {releases.length}
                </span>
              </div>
              <button
                className={btnIconSmallClass}
                onClick={() => openStartDialog('release')}
                title="Start new release"
              >
                <Plus size={14} />
              </button>
            </div>
            {releases.length === 0 ? (
              <div className="py-3 text-center text-(--text-muted) text-xs">No active releases</div>
            ) : (
              <div className="flex flex-col gap-0.5">
                {releases.map((name) => (
                  <div
                    key={name}
                    className="flex items-center justify-between py-1.5 px-2 rounded cursor-pointer hover:bg-(--bg-hover) group"
                  >
                    <span className="text-[13px] text-(--text-primary) font-mono">
                      {config?.release_prefix}
                      {name}
                    </span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        className={btnIconSmallClass}
                        onClick={() => handlePublish('release', name)}
                        title="Publish"
                      >
                        <Upload size={12} />
                      </button>
                      <button
                        className={btnIconSmallClass}
                        onClick={() => handleFinish('release', name)}
                        title="Finish"
                      >
                        <Check size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Hotfixes Section */}
          <div className="mb-4">
            <div className="flex items-center justify-between py-1.5 px-2 bg-(--bg-tertiary) rounded mb-1">
              <div className="flex items-center gap-1.5 text-xs font-medium text-(--text-primary)">
                <Bug size={14} />
                <span>Hotfixes</span>
                <span className="px-1.5 py-0.5 bg-(--bg-secondary) rounded-xl text-[11px] text-(--text-secondary)">
                  {hotfixes.length}
                </span>
              </div>
              <button
                className={btnIconSmallClass}
                onClick={() => openStartDialog('hotfix')}
                title="Start new hotfix"
              >
                <Plus size={14} />
              </button>
            </div>
            {hotfixes.length === 0 ? (
              <div className="py-3 text-center text-(--text-muted) text-xs">No active hotfixes</div>
            ) : (
              <div className="flex flex-col gap-0.5">
                {hotfixes.map((name) => (
                  <div
                    key={name}
                    className="flex items-center justify-between py-1.5 px-2 rounded cursor-pointer hover:bg-(--bg-hover) group"
                  >
                    <span className="text-[13px] text-(--text-primary) font-mono">
                      {config?.hotfix_prefix}
                      {name}
                    </span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        className={btnIconSmallClass}
                        onClick={() => handlePublish('hotfix', name)}
                        title="Publish"
                      >
                        <Upload size={12} />
                      </button>
                      <button
                        className={btnIconSmallClass}
                        onClick={() => handleFinish('hotfix', name)}
                        title="Finish"
                      >
                        <Check size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Initialize Dialog */}
      {showInitDialog && (
        <div className={overlayClass} onClick={() => setShowInitDialog(false)}>
          <div className={dialogClass} onClick={(e) => e.stopPropagation()}>
            <div className={headerClass}>
              <div className={titleClass}>
                <Settings size={20} />
                <span>Initialize Git Flow</span>
              </div>
              <button className={closeClass} onClick={() => setShowInitDialog(false)}>
                <X size={18} />
              </button>
            </div>
            <div className={contentClass}>
              <div className={formGroupClass}>
                <label htmlFor="init-master" className={labelClass}>
                  Production branch
                </label>
                <input
                  id="init-master"
                  type="text"
                  value={initMaster}
                  onChange={(e) => setInitMaster(e.target.value)}
                  placeholder="main"
                  className={inputClass}
                />
              </div>
              <div className={formGroupClass}>
                <label htmlFor="init-develop" className={labelClass}>
                  Development branch
                </label>
                <input
                  id="init-develop"
                  type="text"
                  value={initDevelop}
                  onChange={(e) => setInitDevelop(e.target.value)}
                  placeholder="develop"
                  className={inputClass}
                />
              </div>
            </div>
            <div className={footerClass}>
              <button
                className={cn(
                  btnClass,
                  'bg-(--bg-secondary) border border-(--border-color) text-(--text-primary) hover:bg-(--bg-hover)'
                )}
                onClick={() => setShowInitDialog(false)}
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                className={cn(
                  btnClass,
                  'bg-(--accent-color) border border-(--accent-color) text-white hover:opacity-90'
                )}
                onClick={handleInit}
                disabled={isLoading}
              >
                {isLoading ? 'Initializing...' : 'Initialize'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Start Branch Dialog */}
      {showStartDialog && (
        <div className={overlayClass} onClick={() => setShowStartDialog(false)}>
          <div className={dialogClass} onClick={(e) => e.stopPropagation()}>
            <div className={headerClass}>
              <div className={titleClass}>
                {getTypeIcon(startType)}
                <span>Start {getTypeLabel(startType)}</span>
              </div>
              <button className={closeClass} onClick={() => setShowStartDialog(false)}>
                <X size={18} />
              </button>
            </div>
            <div className={contentClass}>
              <div className={formGroupClass}>
                <label htmlFor="branch-name" className={labelClass}>
                  {getTypeLabel(startType)} name
                </label>
                <input
                  id="branch-name"
                  type="text"
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  placeholder={startType === 'release' ? '1.0.0' : 'my-feature'}
                  autoFocus
                  className={inputClass}
                />
                <p className="mt-1 text-xs text-(--text-muted)">
                  Branch will be created as:{' '}
                  {config?.[`${startType}_prefix` as keyof GitFlowConfig]}
                  {branchName || '...'}
                </p>
              </div>
            </div>
            <div className={footerClass}>
              <button
                className={cn(
                  btnClass,
                  'bg-(--bg-secondary) border border-(--border-color) text-(--text-primary) hover:bg-(--bg-hover)'
                )}
                onClick={() => setShowStartDialog(false)}
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                className={cn(
                  btnClass,
                  'bg-(--accent-color) border border-(--accent-color) text-white hover:opacity-90'
                )}
                onClick={handleStart}
                disabled={isLoading || !branchName.trim()}
              >
                {isLoading ? 'Starting...' : `Start ${getTypeLabel(startType)}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
