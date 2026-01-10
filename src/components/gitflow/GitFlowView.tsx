import { useState, useEffect, useCallback } from 'react';
import {
  GitBranch,
  Play,
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
import './GitFlowView.css';

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
    <div className="gitflow-view">
      <div className="gitflow-header">
        <div className="gitflow-title">
          <GitBranch size={16} />
          <span>Git Flow</span>
        </div>
        <div className="gitflow-actions">
          {!isInitialized && (
            <button
              className="btn-icon"
              onClick={() => setShowInitDialog(true)}
              title="Initialize Git Flow"
            >
              <Settings size={16} />
            </button>
          )}
          <button
            className="btn-icon"
            onClick={loadState}
            title="Refresh"
            disabled={isLoading}
          >
            <RefreshCw size={16} className={isLoading ? 'spinning' : ''} />
          </button>
        </div>
      </div>

      {error && (
        <div className="gitflow-error">
          <AlertCircle size={14} />
          <span>{error}</span>
          <button onClick={() => setError(null)}>
            <X size={14} />
          </button>
        </div>
      )}

      {success && (
        <div className="gitflow-success">
          <Check size={14} />
          <span>{success}</span>
          <button onClick={() => setSuccess(null)}>
            <X size={14} />
          </button>
        </div>
      )}

      {!isInitialized ? (
        <div className="gitflow-not-initialized">
          <p>Git Flow is not initialized in this repository.</p>
          <button className="btn btn-primary" onClick={() => setShowInitDialog(true)}>
            <Settings size={14} />
            Initialize Git Flow
          </button>
        </div>
      ) : (
        <div className="gitflow-content">
          {/* Features Section */}
          <div className="gitflow-section">
            <div className="gitflow-section-header">
              <div className="gitflow-section-title">
                <GitBranch size={14} />
                <span>Features</span>
                <span className="gitflow-count">{features.length}</span>
              </div>
              <button
                className="btn-icon-small"
                onClick={() => openStartDialog('feature')}
                title="Start new feature"
              >
                <Plus size={14} />
              </button>
            </div>
            {features.length === 0 ? (
              <div className="gitflow-empty">No active features</div>
            ) : (
              <div className="gitflow-branch-list">
                {features.map((name) => (
                  <div key={name} className="gitflow-branch-item">
                    <span className="gitflow-branch-name">
                      {config?.feature_prefix}{name}
                    </span>
                    <div className="gitflow-branch-actions">
                      <button
                        className="btn-icon-small"
                        onClick={() => handlePublish('feature', name)}
                        title="Publish"
                      >
                        <Upload size={12} />
                      </button>
                      <button
                        className="btn-icon-small"
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
          <div className="gitflow-section">
            <div className="gitflow-section-header">
              <div className="gitflow-section-title">
                <Rocket size={14} />
                <span>Releases</span>
                <span className="gitflow-count">{releases.length}</span>
              </div>
              <button
                className="btn-icon-small"
                onClick={() => openStartDialog('release')}
                title="Start new release"
              >
                <Plus size={14} />
              </button>
            </div>
            {releases.length === 0 ? (
              <div className="gitflow-empty">No active releases</div>
            ) : (
              <div className="gitflow-branch-list">
                {releases.map((name) => (
                  <div key={name} className="gitflow-branch-item">
                    <span className="gitflow-branch-name">
                      {config?.release_prefix}{name}
                    </span>
                    <div className="gitflow-branch-actions">
                      <button
                        className="btn-icon-small"
                        onClick={() => handlePublish('release', name)}
                        title="Publish"
                      >
                        <Upload size={12} />
                      </button>
                      <button
                        className="btn-icon-small"
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
          <div className="gitflow-section">
            <div className="gitflow-section-header">
              <div className="gitflow-section-title">
                <Bug size={14} />
                <span>Hotfixes</span>
                <span className="gitflow-count">{hotfixes.length}</span>
              </div>
              <button
                className="btn-icon-small"
                onClick={() => openStartDialog('hotfix')}
                title="Start new hotfix"
              >
                <Plus size={14} />
              </button>
            </div>
            {hotfixes.length === 0 ? (
              <div className="gitflow-empty">No active hotfixes</div>
            ) : (
              <div className="gitflow-branch-list">
                {hotfixes.map((name) => (
                  <div key={name} className="gitflow-branch-item">
                    <span className="gitflow-branch-name">
                      {config?.hotfix_prefix}{name}
                    </span>
                    <div className="gitflow-branch-actions">
                      <button
                        className="btn-icon-small"
                        onClick={() => handlePublish('hotfix', name)}
                        title="Publish"
                      >
                        <Upload size={12} />
                      </button>
                      <button
                        className="btn-icon-small"
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
        <div className="dialog-overlay" onClick={() => setShowInitDialog(false)}>
          <div className="dialog gitflow-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-header">
              <div className="dialog-title">
                <Settings size={20} />
                <span>Initialize Git Flow</span>
              </div>
              <button className="dialog-close" onClick={() => setShowInitDialog(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="dialog-content">
              <div className="form-group">
                <label htmlFor="init-master">Production branch</label>
                <input
                  id="init-master"
                  type="text"
                  value={initMaster}
                  onChange={(e) => setInitMaster(e.target.value)}
                  placeholder="main"
                />
              </div>
              <div className="form-group">
                <label htmlFor="init-develop">Development branch</label>
                <input
                  id="init-develop"
                  type="text"
                  value={initDevelop}
                  onChange={(e) => setInitDevelop(e.target.value)}
                  placeholder="develop"
                />
              </div>
            </div>
            <div className="dialog-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setShowInitDialog(false)}
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
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
        <div className="dialog-overlay" onClick={() => setShowStartDialog(false)}>
          <div className="dialog gitflow-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-header">
              <div className="dialog-title">
                {getTypeIcon(startType)}
                <span>Start {getTypeLabel(startType)}</span>
              </div>
              <button className="dialog-close" onClick={() => setShowStartDialog(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="dialog-content">
              <div className="form-group">
                <label htmlFor="branch-name">{getTypeLabel(startType)} name</label>
                <input
                  id="branch-name"
                  type="text"
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  placeholder={startType === 'release' ? '1.0.0' : 'my-feature'}
                  autoFocus
                />
                <p className="form-hint">
                  Branch will be created as: {config?.[`${startType}_prefix` as keyof GitFlowConfig]}{branchName || '...'}
                </p>
              </div>
            </div>
            <div className="dialog-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setShowStartDialog(false)}
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
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
