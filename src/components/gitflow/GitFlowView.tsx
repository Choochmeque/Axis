import {
  AlertCircle,
  Bug,
  Check,
  GitBranch,
  Plus,
  RefreshCw,
  Rocket,
  Settings,
  Upload,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTitle,
  FormField,
  Input,
} from '@/components/ui';
import { gitflowApi } from '../../services/api';
import type { GitFlowBranchType, GitFlowConfig, GitFlowResult } from '../../types';

const btnIconClass =
  'flex items-center justify-center w-7 h-7 p-0 bg-transparent border-none rounded text-(--text-secondary) cursor-pointer transition-colors hover:bg-(--bg-hover) hover:text-(--text-primary) disabled:opacity-50 disabled:cursor-not-allowed';
const btnIconSmallClass =
  'flex items-center justify-center w-5.5 h-5.5 p-0 bg-(--bg-secondary) border border-(--border-color) rounded text-(--text-secondary) cursor-pointer hover:bg-(--bg-hover) hover:text-(--text-primary)';

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
  const [startType, setStartType] = useState<GitFlowBranchType>('Feature');
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
        case 'Feature':
          result = await gitflowApi.feature.start(branchName);
          break;
        case 'Release':
          result = await gitflowApi.release.start(branchName);
          break;
        case 'Hotfix':
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
        case 'Feature':
          result = await gitflowApi.feature.finish(name, { noFf: true });
          break;
        case 'Release':
          result = await gitflowApi.release.finish(name, { noFf: true });
          break;
        case 'Hotfix':
          result = await gitflowApi.hotfix.finish(name, { noFf: true });
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
        case 'Feature':
          result = await gitflowApi.feature.publish(name);
          break;
        case 'Release':
          result = await gitflowApi.release.publish(name);
          break;
        case 'Hotfix':
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
      case 'Feature':
        return 'Feature';
      case 'Release':
        return 'Release';
      case 'Hotfix':
        return 'Hotfix';
      default:
        return type;
    }
  };

  const getTypeIcon = (type: GitFlowBranchType) => {
    switch (type) {
      case 'Feature':
        return GitBranch;
      case 'Release':
        return Rocket;
      case 'Hotfix':
        return Bug;
      default:
        return GitBranch;
    }
  };

  const getTypePrefix = (type: GitFlowBranchType): string => {
    if (!config) return '';
    switch (type) {
      case 'Feature':
        return config.featurePrefix;
      case 'Release':
        return config.releasePrefix;
      case 'Hotfix':
        return config.hotfixPrefix;
      default:
        return '';
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
        <div className="flex items-center gap-2 py-2 px-3 m-2 bg-error/10 text-error rounded text-base">
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
        <div className="flex items-center gap-2 py-2 px-3 m-2 bg-success/10 text-success rounded text-base">
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
          <Button variant="primary" hasIcon onClick={() => setShowInitDialog(true)}>
            <Settings size={14} />
            Initialize Git Flow
          </Button>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-2">
          {/* Features Section */}
          <div className="mb-4">
            <div className="flex items-center justify-between py-1.5 px-2 bg-(--bg-tertiary) rounded mb-1">
              <div className="flex items-center gap-1.5 text-xs font-medium text-(--text-primary)">
                <GitBranch size={14} />
                <span>Features</span>
                <span className="px-1.5 py-0.5 bg-(--bg-secondary) rounded-xl text-sm text-(--text-secondary)">
                  {features.length}
                </span>
              </div>
              <button
                className={btnIconSmallClass}
                onClick={() => openStartDialog('Feature')}
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
                    <span className="text-base text-(--text-primary) font-mono">
                      {config?.featurePrefix}
                      {name}
                    </span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        className={btnIconSmallClass}
                        onClick={() => handlePublish('Feature', name)}
                        title="Publish"
                      >
                        <Upload size={12} />
                      </button>
                      <button
                        className={btnIconSmallClass}
                        onClick={() => handleFinish('Feature', name)}
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
                <span className="px-1.5 py-0.5 bg-(--bg-secondary) rounded-xl text-sm text-(--text-secondary)">
                  {releases.length}
                </span>
              </div>
              <button
                className={btnIconSmallClass}
                onClick={() => openStartDialog('Release')}
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
                    <span className="text-base text-(--text-primary) font-mono">
                      {config?.releasePrefix}
                      {name}
                    </span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        className={btnIconSmallClass}
                        onClick={() => handlePublish('Release', name)}
                        title="Publish"
                      >
                        <Upload size={12} />
                      </button>
                      <button
                        className={btnIconSmallClass}
                        onClick={() => handleFinish('Release', name)}
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
                <span className="px-1.5 py-0.5 bg-(--bg-secondary) rounded-xl text-sm text-(--text-secondary)">
                  {hotfixes.length}
                </span>
              </div>
              <button
                className={btnIconSmallClass}
                onClick={() => openStartDialog('Hotfix')}
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
                    <span className="text-base text-(--text-primary) font-mono">
                      {config?.hotfixPrefix}
                      {name}
                    </span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        className={btnIconSmallClass}
                        onClick={() => handlePublish('Hotfix', name)}
                        title="Publish"
                      >
                        <Upload size={12} />
                      </button>
                      <button
                        className={btnIconSmallClass}
                        onClick={() => handleFinish('Hotfix', name)}
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
      <Dialog open={showInitDialog} onOpenChange={setShowInitDialog}>
        <DialogContent className="max-w-100">
          <DialogTitle icon={Settings}>Initialize Git Flow</DialogTitle>

          <DialogBody>
            <FormField label="Production branch" htmlFor="init-master">
              <Input
                id="init-master"
                type="text"
                value={initMaster}
                onChange={(e) => setInitMaster(e.target.value)}
                placeholder="main"
              />
            </FormField>
            <FormField label="Development branch" htmlFor="init-develop">
              <Input
                id="init-develop"
                type="text"
                value={initDevelop}
                onChange={(e) => setInitDevelop(e.target.value)}
                placeholder="develop"
              />
            </FormField>
          </DialogBody>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary" disabled={isLoading}>
                Cancel
              </Button>
            </DialogClose>
            <Button variant="primary" onClick={handleInit} disabled={isLoading}>
              {isLoading ? 'Initializing...' : 'Initialize'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Start Branch Dialog */}
      <Dialog open={showStartDialog} onOpenChange={setShowStartDialog}>
        <DialogContent className="max-w-100">
          <DialogTitle icon={getTypeIcon(startType)}>Start {getTypeLabel(startType)}</DialogTitle>

          <DialogBody>
            <FormField
              label={`${getTypeLabel(startType)} name`}
              htmlFor="branch-name"
              hint={`Branch will be created as: ${getTypePrefix(startType)}${branchName || '...'}`}
            >
              <Input
                id="branch-name"
                type="text"
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                placeholder={startType === 'Release' ? '1.0.0' : 'my-feature'}
                autoFocus
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
              onClick={handleStart}
              disabled={isLoading || !branchName.trim()}
            >
              {isLoading ? 'Starting...' : `Start ${getTypeLabel(startType)}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
