import { useState, useEffect, useMemo, useRef, startTransition } from 'react';
import { Settings, Palette, GitBranch, FileText, Sparkles, Link2 } from 'lucide-react';
import { toast } from '@/hooks';
import { getErrorMessage } from '@/lib/errorUtils';
import { settingsApi, signingApi, aiApi, lfsApi } from '@/services/api';
import type { GitEnvironment } from '@/bindings/api';
import { useSettingsStore } from '@/store/settingsStore';
import { useIntegrationStore, initIntegrationListeners } from '@/store/integrationStore';
import { SigningFormat, Theme, AiProvider } from '@/types';
import type {
  AppSettings,
  Theme as ThemeType,
  SigningFormat as SigningFormatType,
  AiProvider as AiProviderType,
  GpgKey,
  SshKey,
} from '@/types';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogFooter,
  DialogClose,
  Button,
  FormField,
  Input,
  Select,
  SelectItem,
  CheckboxField,
  Alert,
} from '@/components/ui';

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsChange?: (settings: AppSettings) => void;
}

type SettingsTab = 'appearance' | 'git' | 'diff' | 'ai' | 'integrations';

const DEFAULT_SETTINGS: AppSettings = {
  theme: Theme.System,
  fontSize: 12,
  showLineNumbers: true,
  autoFetchInterval: 5,
  confirmBeforeDiscard: true,
  signCommits: false,
  signingFormat: SigningFormat.Gpg,
  signingKey: null,
  gpgProgram: null,
  sshProgram: null,
  diffContextLines: 3,
  diffWordWrap: false,
  diffSideBySide: false,
  spellCheckCommitMessages: false,
  conventionalCommitsEnabled: false,
  conventionalCommitsScopes: null,
  notificationHistoryCapacity: 50,
  aiEnabled: false,
  aiProvider: AiProvider.OpenAi,
  aiModel: null,
  aiOllamaUrl: null,
};

export function SettingsDialog({ isOpen, onClose, onSettingsChange }: SettingsDialogProps) {
  const updateSettingsToStore = useSettingsStore((state) => state.updateSettings);
  const [activeTab, setActiveTab] = useState<SettingsTab>('appearance');
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [originalSettings, setOriginalSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen]);

  useEffect(() => {
    setHasChanges(JSON.stringify(settings) !== JSON.stringify(originalSettings));
  }, [settings, originalSettings]);

  const loadSettings = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const loaded = await settingsApi.get();
      setSettings(loaded);
      setOriginalSettings(loaded);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      await updateSettingsToStore(settings);
      setOriginalSettings(settings);
      onSettingsChange?.(settings);
      onClose();
      toast.success('Settings saved');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setSettings(originalSettings);
  };

  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
    { id: 'appearance', label: 'Appearance', icon: <Palette size={16} /> },
    { id: 'git', label: 'Git', icon: <GitBranch size={16} /> },
    { id: 'diff', label: 'Diff & Editor', icon: <FileText size={16} /> },
    { id: 'ai', label: 'AI', icon: <Sparkles size={16} /> },
    { id: 'integrations', label: 'Integrations', icon: <Link2 size={16} /> },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-175 max-h-[80vh] flex flex-col overflow-hidden">
        <DialogTitle icon={Settings}>Settings</DialogTitle>

        <div className="flex flex-1 min-h-0 overflow-hidden">
          <div className="w-45 shrink-0 p-3 bg-(--bg-tertiary) border-r border-(--border-color) flex flex-col gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={cn(
                  'flex items-center gap-2 py-2.5 px-3 bg-transparent border-none rounded-md text-base cursor-pointer text-left transition-colors',
                  activeTab === tab.id
                    ? 'bg-(--accent-color) text-white'
                    : 'text-(--text-secondary) hover:bg-(--bg-hover) hover:text-(--text-primary)'
                )}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="flex-1 py-5 px-6 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center h-50 text-(--text-muted)">
                Loading settings...
              </div>
            ) : (
              <>
                {activeTab === 'appearance' && (
                  <AppearanceSettings settings={settings} updateSetting={updateSetting} />
                )}
                {activeTab === 'git' && (
                  <GitSettings settings={settings} updateSetting={updateSetting} />
                )}
                {activeTab === 'diff' && (
                  <DiffSettings settings={settings} updateSetting={updateSetting} />
                )}
                {activeTab === 'ai' && (
                  <AiSettings settings={settings} updateSetting={updateSetting} />
                )}
                {activeTab === 'integrations' && <IntegrationsSettings />}
              </>
            )}
          </div>
        </div>

        {error && (
          <Alert variant="error" className="mx-4">
            {error}
          </Alert>
        )}

        <DialogFooter className="justify-between">
          <Button variant="secondary" onClick={handleReset} disabled={!hasChanges || isSaving}>
            Reset
          </Button>
          <div className="flex gap-2">
            <DialogClose asChild>
              <Button variant="secondary" disabled={isSaving}>
                Cancel
              </Button>
            </DialogClose>
            <Button variant="primary" onClick={handleSave} disabled={!hasChanges || isSaving}>
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface SettingsPanelProps {
  settings: AppSettings;
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
}

const sectionTitleClass =
  'm-0 mb-4 pb-2 border-b border-(--border-color) text-sm font-semibold text-(--text-primary) first:mt-0 not-first:mt-6';
const groupClass = 'mb-5';
const numberInputClass =
  'w-full max-w-30 py-2 px-3 border border-(--border-color) rounded bg-(--bg-primary) text-(--text-primary) text-base outline-none focus:border-(--accent-color)';

function AppearanceSettings({ settings, updateSetting }: SettingsPanelProps) {
  return (
    <div>
      <h3 className={sectionTitleClass}>Appearance</h3>

      <FormField label="Theme" htmlFor="theme" hint="Choose your preferred color theme">
        <Select
          id="theme"
          value={settings.theme}
          onValueChange={(value) => updateSetting('theme', value as ThemeType)}
        >
          <SelectItem value={Theme.System}>System</SelectItem>
          <SelectItem value={Theme.Light}>Light</SelectItem>
          <SelectItem value={Theme.Dark}>Dark</SelectItem>
        </Select>
      </FormField>

      <FormField
        label="Font Size"
        htmlFor="fontSize"
        hint="Base font size for the interface (10-24)"
      >
        <Input
          id="fontSize"
          type="number"
          min={10}
          max={24}
          value={settings.fontSize}
          onChange={(e) => updateSetting('fontSize', parseInt(e.target.value) || 13)}
          className={numberInputClass}
        />
      </FormField>

      <div className={groupClass}>
        <CheckboxField
          id="show-line-numbers"
          label="Show line numbers"
          description="Display line numbers in diff and file views"
          checked={settings.showLineNumbers}
          onCheckedChange={(checked) => updateSetting('showLineNumbers', checked === true)}
        />
      </div>

      <h3 className={sectionTitleClass}>Notifications</h3>

      <FormField
        label="Notification History Capacity"
        htmlFor="notificationHistoryCapacity"
        hint="Maximum number of notifications to keep in history (10-200)"
      >
        <Input
          id="notificationHistoryCapacity"
          type="number"
          min={10}
          max={200}
          value={settings.notificationHistoryCapacity}
          onChange={(e) =>
            updateSetting(
              'notificationHistoryCapacity',
              Math.min(200, Math.max(10, parseInt(e.target.value) || 50))
            )
          }
          className={numberInputClass}
        />
      </FormField>
    </div>
  );
}

function GitSettings({ settings, updateSetting }: SettingsPanelProps) {
  const [gpgKeys, setGpgKeys] = useState<GpgKey[]>([]);
  const [sshKeys, setSshKeys] = useState<SshKey[]>([]);
  const [isLoadingKeys, setIsLoadingKeys] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [gitEnv, setGitEnv] = useState<GitEnvironment | null>(null);
  const [isLoadingEnv, setIsLoadingEnv] = useState(false);

  useEffect(() => {
    loadKeys();
    loadGitEnvironment();
  }, []);

  const loadGitEnvironment = async () => {
    setIsLoadingEnv(true);
    try {
      const env = await lfsApi.getGitEnvironment();
      setGitEnv(env);
    } catch (err) {
      console.error('Failed to load git environment:', err);
    } finally {
      setIsLoadingEnv(false);
    }
  };

  const loadKeys = async () => {
    setIsLoadingKeys(true);
    try {
      const [gpg, ssh] = await Promise.all([signingApi.listGpgKeys(), signingApi.listSshKeys()]);
      setGpgKeys(gpg);
      setSshKeys(ssh);
    } catch (err) {
      console.error('Failed to load keys:', err);
    } finally {
      setIsLoadingKeys(false);
    }
  };

  const handleDetectConfig = async () => {
    setIsDetecting(true);
    setTestResult(null);
    try {
      const config = await signingApi.getConfig();
      if (config.signingKey) {
        updateSetting('signingFormat', config.format);
        updateSetting('signingKey', config.signingKey);
        if (config.gpgProgram) updateSetting('gpgProgram', config.gpgProgram);
        if (config.sshProgram) updateSetting('sshProgram', config.sshProgram);
        setTestResult({ success: true, message: 'Configuration detected from git config' });
      } else {
        setTestResult({ success: false, message: 'No signing key found in git config' });
      }
    } catch {
      setTestResult({ success: false, message: 'Failed to detect configuration' });
    } finally {
      setIsDetecting(false);
    }
  };

  const handleTestSigning = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const result = await signingApi.testSigning({
        format: settings.signingFormat,
        signingKey: settings.signingKey,
        gpgProgram: settings.gpgProgram,
        sshProgram: settings.sshProgram,
      });
      if (result.success) {
        setTestResult({ success: true, message: `Signing works! Using: ${result.programUsed}` });
      } else {
        setTestResult({ success: false, message: result.error || 'Signing test failed' });
      }
    } catch {
      setTestResult({ success: false, message: 'Failed to test signing' });
    } finally {
      setIsTesting(false);
    }
  };

  const availableKeys =
    settings.signingFormat === SigningFormat.Gpg
      ? gpgKeys.map((k) => ({ value: k.keyId, label: `${k.keyId} - ${k.userId}` }))
      : sshKeys.map((k) => ({ value: k.path, label: `${k.keyType} - ${k.comment || k.path}` }));

  return (
    <div>
      <h3 className={sectionTitleClass}>Git</h3>

      <FormField
        label="Auto-fetch Interval (minutes)"
        htmlFor="autoFetch"
        hint="Automatically fetch from remote (0 = disabled)"
      >
        <Input
          id="autoFetch"
          type="number"
          min={0}
          max={60}
          value={settings.autoFetchInterval}
          onChange={(e) => updateSetting('autoFetchInterval', parseInt(e.target.value) || 0)}
          className={numberInputClass}
        />
      </FormField>

      <div className={groupClass}>
        <CheckboxField
          id="confirm-before-discard"
          label="Confirm before discarding changes"
          description="Show confirmation dialog before discarding changes"
          checked={settings.confirmBeforeDiscard}
          onCheckedChange={(checked) => updateSetting('confirmBeforeDiscard', checked === true)}
        />
      </div>

      <h3 className={sectionTitleClass}>Commit Signing</h3>

      <div className={groupClass}>
        <CheckboxField
          id="sign-commits"
          label="Sign commits by default"
          description="Automatically sign all commits"
          checked={settings.signCommits}
          onCheckedChange={(checked) => updateSetting('signCommits', checked === true)}
        />
      </div>

      <FormField
        label="Signing Format"
        htmlFor="signingFormat"
        hint="Choose GPG or SSH for signing commits"
      >
        <Select
          id="signingFormat"
          value={settings.signingFormat}
          onValueChange={(value) => {
            updateSetting('signingFormat', value as SigningFormatType);
            updateSetting('signingKey', null);
            setTestResult(null);
          }}
        >
          <SelectItem value={SigningFormat.Gpg}>GPG</SelectItem>
          <SelectItem value={SigningFormat.Ssh}>SSH</SelectItem>
        </Select>
      </FormField>

      <FormField
        label="Signing Key"
        htmlFor="signingKey"
        hint={
          settings.signingFormat === SigningFormat.Gpg
            ? 'Select your GPG key or enter a key ID'
            : 'Select your SSH key file'
        }
      >
        <div className="flex gap-2">
          <Select
            id="signingKey"
            value={settings.signingKey || ''}
            onValueChange={(value) => {
              updateSetting('signingKey', value || null);
              setTestResult(null);
            }}
            className="flex-1"
            disabled={isLoadingKeys}
            placeholder={isLoadingKeys ? 'Loading keys...' : 'Select a key...'}
          >
            {availableKeys.map((key) => (
              <SelectItem key={key.value} value={key.value}>
                {key.label}
              </SelectItem>
            ))}
          </Select>
          <Button variant="secondary" onClick={handleDetectConfig} disabled={isDetecting}>
            {isDetecting ? 'Detecting...' : 'Auto-detect'}
          </Button>
        </div>
        {!settings.signingKey && availableKeys.length === 0 && !isLoadingKeys && (
          <p className="mt-1.5 text-xs text-warning">
            No {settings.signingFormat === SigningFormat.Gpg ? 'GPG' : 'SSH'} keys found on this
            system
          </p>
        )}
      </FormField>

      {settings.signingFormat === SigningFormat.Gpg && (
        <FormField
          label="GPG Program (optional)"
          htmlFor="gpgProgram"
          hint="Custom path to GPG executable (leave empty for auto-detect)"
        >
          <Input
            id="gpgProgram"
            type="text"
            value={settings.gpgProgram || ''}
            onChange={(e) => updateSetting('gpgProgram', e.target.value || null)}
            placeholder="Auto-detect"
          />
        </FormField>
      )}

      {settings.signingFormat === SigningFormat.Ssh && (
        <FormField
          label="SSH Program (optional)"
          htmlFor="sshProgram"
          hint="Custom path to ssh-keygen executable (leave empty for auto-detect)"
        >
          <Input
            id="sshProgram"
            type="text"
            value={settings.sshProgram || ''}
            onChange={(e) => updateSetting('sshProgram', e.target.value || null)}
            placeholder="Auto-detect"
          />
        </FormField>
      )}

      <div className={groupClass}>
        <Button
          variant="secondary"
          onClick={handleTestSigning}
          disabled={!settings.signingKey || isTesting}
        >
          {isTesting ? 'Testing...' : 'Test Signing'}
        </Button>
        {testResult && (
          <p className={cn('mt-2 text-xs', testResult.success ? 'text-success' : 'text-error')}>
            {testResult.message}
          </p>
        )}
      </div>

      <h3 className={sectionTitleClass}>Environment</h3>

      {isLoadingEnv ? (
        <p className="text-sm text-(--text-muted)">Loading environment info...</p>
      ) : gitEnv ? (
        <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <span className="text-(--text-secondary)">Git CLI:</span>
          <span className="text-(--text-primary) font-mono">
            {gitEnv.gitVersion || 'Not found'}
          </span>

          <span className="text-(--text-secondary)">Git Path:</span>
          <span className="text-(--text-primary) font-mono text-xs break-all">
            {gitEnv.gitPath || 'Not found'}
          </span>

          <span className="text-(--text-secondary)">libgit2:</span>
          <span className="text-(--text-primary) font-mono">{gitEnv.libgit2Version}</span>

          <span className="text-(--text-secondary)">Git LFS:</span>
          <span className="text-(--text-primary)">
            {gitEnv.lfsInstalled ? (
              <span className="font-mono">
                {gitEnv.lfsVersion} <span className="text-success">✓</span>
              </span>
            ) : (
              <span className="text-(--text-muted)">
                Not installed{' '}
                <a
                  href="https://git-lfs.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-(--accent-color) hover:underline"
                >
                  Install
                </a>
              </span>
            )}
          </span>
        </div>
      ) : (
        <p className="text-sm text-(--text-muted)">Failed to load environment info</p>
      )}
    </div>
  );
}

function DiffSettings({ settings, updateSetting }: SettingsPanelProps) {
  return (
    <div>
      <h3 className={sectionTitleClass}>Diff & Editor</h3>

      <FormField
        label="Context Lines"
        htmlFor="contextLines"
        hint="Number of context lines to show in diffs (0-20)"
      >
        <Input
          id="contextLines"
          type="number"
          min={0}
          max={20}
          value={settings.diffContextLines}
          onChange={(e) => updateSetting('diffContextLines', parseInt(e.target.value) || 3)}
          className={numberInputClass}
        />
      </FormField>

      <div className={groupClass}>
        <CheckboxField
          id="diff-word-wrap"
          label="Word wrap in diff view"
          description="Wrap long lines in diff view"
          checked={settings.diffWordWrap}
          onCheckedChange={(checked) => updateSetting('diffWordWrap', checked === true)}
        />
      </div>

      <div className={groupClass}>
        <CheckboxField
          id="diff-side-by-side"
          label="Side-by-side diff view"
          description="Show diffs in split view by default"
          checked={settings.diffSideBySide}
          onCheckedChange={(checked) => updateSetting('diffSideBySide', checked === true)}
        />
      </div>

      <h3 className={sectionTitleClass}>Commit</h3>

      <div className={groupClass}>
        <CheckboxField
          id="spell-check-commit-messages"
          label="Spell check commit messages"
          description="Enable spell checking in commit message editor"
          checked={settings.spellCheckCommitMessages}
          onCheckedChange={(checked) => updateSetting('spellCheckCommitMessages', checked === true)}
        />
      </div>

      <div className={groupClass}>
        <CheckboxField
          id="conventional-commits-enabled"
          label="Enable conventional commits"
          description="Use structured commit message format (type[scope]: description)"
          checked={settings.conventionalCommitsEnabled}
          onCheckedChange={(checked) =>
            updateSetting('conventionalCommitsEnabled', checked === true)
          }
        />
      </div>

      <FormField
        label="Custom Scopes"
        htmlFor="conventionalCommitsScopes"
        hint="Comma-separated list of scopes for quick access (e.g., ui, api, auth)"
      >
        <Input
          id="conventionalCommitsScopes"
          type="text"
          value={settings.conventionalCommitsScopes?.join(', ') || ''}
          onChange={(e) => {
            const scopes = e.target.value
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean);
            updateSetting('conventionalCommitsScopes', scopes.length > 0 ? scopes : null);
          }}
          placeholder="ui, api, auth, core"
          disabled={!settings.conventionalCommitsEnabled}
        />
      </FormField>
    </div>
  );
}

function AiSettings({ settings, updateSetting }: SettingsPanelProps) {
  const [apiKey, setApiKey] = useState('');
  const [hasKey, setHasKey] = useState(false);
  const [isLoadingKey, setIsLoadingKey] = useState(false);
  const [isSavingKey, setIsSavingKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [ollamaModels, setOllamaModels] = useState<string[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);

  useEffect(() => {
    const checkApiKey = async () => {
      if (settings.aiProvider === AiProvider.Ollama) {
        setHasKey(true);
        return;
      }
      setIsLoadingKey(true);
      try {
        const has = await aiApi.hasApiKey(settings.aiProvider);
        setHasKey(has);
      } catch (err) {
        console.error('Failed to check API key:', err);
      } finally {
        setIsLoadingKey(false);
      }
    };
    checkApiKey();
  }, [settings.aiProvider]);

  useEffect(() => {
    const loadModels = async () => {
      setIsLoadingModels(true);
      try {
        const models = await aiApi.listOllamaModels(settings.aiOllamaUrl ?? undefined);
        setOllamaModels(models);
      } catch (err) {
        console.error('Failed to load Ollama models:', err);
        setOllamaModels([]);
      } finally {
        setIsLoadingModels(false);
      }
    };
    if (settings.aiProvider === AiProvider.Ollama) {
      loadModels();
    }
  }, [settings.aiProvider, settings.aiOllamaUrl]);

  const loadOllamaModels = async () => {
    setIsLoadingModels(true);
    try {
      const models = await aiApi.listOllamaModels(settings.aiOllamaUrl ?? undefined);
      setOllamaModels(models);
    } catch (err) {
      console.error('Failed to load Ollama models:', err);
      setOllamaModels([]);
    } finally {
      setIsLoadingModels(false);
    }
  };

  const handleSaveApiKey = async () => {
    if (!apiKey.trim()) return;
    setIsSavingKey(true);
    setTestResult(null);
    try {
      await aiApi.setApiKey(settings.aiProvider, apiKey.trim());
      setHasKey(true);
      setApiKey('');
      toast.success('API key saved');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsSavingKey(false);
    }
  };

  const handleDeleteApiKey = async () => {
    try {
      await aiApi.deleteApiKey(settings.aiProvider);
      setHasKey(false);
      setTestResult(null);
      toast.success('API key deleted');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const success = await aiApi.testConnection(settings.aiProvider);
      if (success) {
        setTestResult({ success: true, message: 'Connection successful' });
      } else {
        setTestResult({ success: false, message: 'Connection failed' });
      }
    } catch (err) {
      setTestResult({ success: false, message: getErrorMessage(err) });
    } finally {
      setIsTesting(false);
    }
  };

  const providerRequiresApiKey = settings.aiProvider !== AiProvider.Ollama;

  const defaultModels: Record<string, string> = {
    [AiProvider.OpenAi]: 'gpt-4o-mini',
    [AiProvider.Anthropic]: 'claude-3-5-haiku-latest',
    [AiProvider.Ollama]: 'llama3.2',
  };

  return (
    <div>
      <h3 className={sectionTitleClass}>AI Commit Messages</h3>

      <div className={groupClass}>
        <CheckboxField
          id="ai-enabled"
          label="Enable AI commit messages"
          description="Generate commit messages from staged changes using AI"
          checked={settings.aiEnabled}
          onCheckedChange={(checked) => updateSetting('aiEnabled', checked === true)}
        />
      </div>

      <FormField label="Provider" htmlFor="aiProvider" hint="Choose your AI provider">
        <Select
          id="aiProvider"
          value={settings.aiProvider}
          onValueChange={(value) => {
            updateSetting('aiProvider', value as AiProviderType);
            updateSetting('aiModel', null);
            setTestResult(null);
          }}
        >
          <SelectItem value={AiProvider.OpenAi}>OpenAI</SelectItem>
          <SelectItem value={AiProvider.Anthropic}>Anthropic</SelectItem>
          <SelectItem value={AiProvider.Ollama}>Ollama (Local)</SelectItem>
        </Select>
      </FormField>

      {providerRequiresApiKey && (
        <FormField
          label="API Key"
          htmlFor="aiApiKey"
          hint={hasKey ? 'API key is configured' : 'Enter your API key'}
        >
          <div className="flex gap-2">
            {hasKey ? (
              <>
                <Input
                  id="aiApiKey"
                  type="password"
                  value="••••••••••••••••"
                  disabled
                  className="flex-1"
                />
                <Button variant="secondary" onClick={handleDeleteApiKey}>
                  Remove
                </Button>
              </>
            ) : (
              <>
                <Input
                  id="aiApiKey"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter API key..."
                  className="flex-1"
                  disabled={isLoadingKey}
                />
                <Button
                  variant="primary"
                  onClick={handleSaveApiKey}
                  disabled={!apiKey.trim() || isSavingKey}
                >
                  {isSavingKey ? 'Saving...' : 'Save'}
                </Button>
              </>
            )}
          </div>
        </FormField>
      )}

      {settings.aiProvider === AiProvider.Ollama && (
        <FormField
          label="Ollama URL"
          htmlFor="aiOllamaUrl"
          hint="URL of your Ollama server (default: http://localhost:11434)"
        >
          <Input
            id="aiOllamaUrl"
            type="text"
            value={settings.aiOllamaUrl || ''}
            onChange={(e) => updateSetting('aiOllamaUrl', e.target.value || null)}
            placeholder="http://localhost:11434"
          />
        </FormField>
      )}

      <FormField
        label="Model"
        htmlFor="aiModel"
        hint={`Default: ${defaultModels[settings.aiProvider]}`}
      >
        {settings.aiProvider === AiProvider.Ollama ? (
          <div className="flex gap-2">
            <Select
              id="aiModel"
              value={settings.aiModel || ''}
              onValueChange={(value) => updateSetting('aiModel', value || null)}
              className="flex-1"
              disabled={isLoadingModels}
              placeholder={
                isLoadingModels
                  ? 'Loading models...'
                  : `Default (${defaultModels[settings.aiProvider]})`
              }
            >
              {ollamaModels.map((model) => (
                <SelectItem key={model} value={model}>
                  {model}
                </SelectItem>
              ))}
            </Select>
            <Button variant="secondary" onClick={loadOllamaModels} disabled={isLoadingModels}>
              Refresh
            </Button>
          </div>
        ) : (
          <Input
            id="aiModel"
            type="text"
            value={settings.aiModel || ''}
            onChange={(e) => updateSetting('aiModel', e.target.value || null)}
            placeholder={defaultModels[settings.aiProvider]}
          />
        )}
      </FormField>

      <div className={groupClass}>
        <Button
          variant="secondary"
          onClick={handleTestConnection}
          disabled={isTesting || (providerRequiresApiKey && !hasKey)}
        >
          {isTesting ? 'Testing...' : 'Test Connection'}
        </Button>
        {testResult && (
          <p className={cn('mt-2 text-xs', testResult.success ? 'text-success' : 'text-error')}>
            {testResult.message}
          </p>
        )}
      </div>
    </div>
  );
}

type ProviderTab = 'github' | 'gitlab' | 'bitbucket' | 'gitea';

const PROVIDERS: { id: ProviderTab; name: string; supported: boolean }[] = [
  { id: 'github', name: 'GitHub', supported: true },
  { id: 'gitlab', name: 'GitLab', supported: false },
  { id: 'bitbucket', name: 'Bitbucket', supported: false },
  { id: 'gitea', name: 'Gitea', supported: false },
];

function IntegrationsSettings() {
  const {
    detectedProvider,
    connectionStatus,
    isConnecting,
    error,
    detectProvider,
    startOAuth,
    cancelOAuth,
    disconnect,
    clearError,
  } = useIntegrationStore();

  // Compute initial tab based on detected provider
  const initialTab = useMemo((): ProviderTab => {
    if (detectedProvider?.provider) {
      const providerTab = detectedProvider.provider as ProviderTab;
      if (PROVIDERS.some((p) => p.id === providerTab)) {
        return providerTab;
      }
    }
    return 'github';
  }, [detectedProvider]);

  const [activeTab, setActiveTab] = useState<ProviderTab>(initialTab);
  const hasSetInitialTab = useRef(false);

  useEffect(() => {
    initIntegrationListeners();
    detectProvider();
  }, [detectProvider]);

  // Update tab when detected provider changes (only once)
  useEffect(() => {
    if (!hasSetInitialTab.current && detectedProvider?.provider) {
      const providerTab = detectedProvider.provider as ProviderTab;
      if (PROVIDERS.some((p) => p.id === providerTab)) {
        hasSetInitialTab.current = true;
        startTransition(() => {
          setActiveTab(providerTab);
        });
      }
    }
  }, [detectedProvider]);

  const handleConnect = async () => {
    clearError();
    await startOAuth();
  };

  const handleDisconnect = async () => {
    clearError();
    await disconnect();
  };

  const activeProvider = PROVIDERS.find((p) => p.id === activeTab);
  const isDetectedProvider = detectedProvider?.provider === activeTab;

  return (
    <div>
      <h3 className={sectionTitleClass}>Integrations</h3>

      {/* Provider Tabs */}
      <div className="flex border-b border-(--border-color) mb-4">
        {PROVIDERS.map((provider) => (
          <button
            key={provider.id}
            onClick={() => setActiveTab(provider.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === provider.id
                ? 'border-(--accent-primary) text-(--accent-primary)'
                : 'border-transparent text-(--text-muted) hover:text-(--text-primary)'
            }`}
          >
            {provider.name}
            {detectedProvider?.provider === provider.id && (
              <span className="ml-2 w-2 h-2 inline-block rounded-full bg-(--accent-primary)" />
            )}
          </button>
        ))}
      </div>

      {/* Provider Content */}
      {!activeProvider?.supported ? (
        <div className="py-4 text-(--text-muted) text-sm">
          <p>{activeProvider?.name} integration is coming soon.</p>
        </div>
      ) : !isDetectedProvider ? (
        <div className="py-4 text-(--text-muted) text-sm">
          <p>
            The current repository is not hosted on {activeProvider?.name}.
            {detectedProvider && (
              <span>
                {' '}
                It appears to be hosted on{' '}
                {PROVIDERS.find((p) => p.id === detectedProvider.provider)?.name ||
                  detectedProvider.provider}
                .
              </span>
            )}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-(--bg-tertiary) rounded-lg border border-(--border-color)">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-(--bg-primary) flex items-center justify-center">
                {connectionStatus?.avatarUrl ? (
                  <img
                    src={connectionStatus.avatarUrl}
                    alt={connectionStatus.username || ''}
                    className="w-10 h-10 rounded-full"
                  />
                ) : (
                  <Link2 size={20} className="text-(--text-muted)" />
                )}
              </div>
              <div>
                <div className="font-medium text-(--text-primary)">{activeProvider?.name}</div>
                <div className="text-sm text-(--text-secondary)">
                  {detectedProvider.owner}/{detectedProvider.repo}
                </div>
                {connectionStatus?.connected && connectionStatus.username && (
                  <div className="text-xs text-(--text-muted) mt-0.5">
                    Connected as {connectionStatus.username}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              {connectionStatus?.connected ? (
                <Button variant="secondary" onClick={handleDisconnect}>
                  Disconnect
                </Button>
              ) : isConnecting ? (
                <Button variant="secondary" onClick={cancelOAuth}>
                  Cancel
                </Button>
              ) : (
                <Button variant="primary" onClick={handleConnect}>
                  Connect
                </Button>
              )}
            </div>
          </div>

          {error && <Alert variant="error">{error}</Alert>}

          {connectionStatus?.connected && (
            <div className="text-sm text-(--text-secondary)">
              <p>
                Connected to {activeProvider?.name}. You can now view pull requests, issues, and CI
                status in the sidebar.
              </p>
            </div>
          )}

          {!connectionStatus?.connected && (
            <div className="text-sm text-(--text-muted)">
              <p>
                Connect to {activeProvider?.name} to access pull requests, issues, CI/CD status, and
                notifications.
              </p>
              <p className="mt-2">
                <strong>Note:</strong> You will be redirected to {activeProvider?.name} to authorize
                Axis. After authorization, you will be returned to the app automatically.
              </p>
            </div>
          )}
        </div>
      )}

      <h3 className={sectionTitleClass}>About Integrations</h3>

      <div className="text-sm text-(--text-secondary) space-y-2">
        <p>Axis can connect to your Git hosting provider to show additional information:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Pull/Merge Requests - view, create, and merge PRs</li>
          <li>Issues - view and create issues</li>
          <li>CI/CD Status - see build and test status for commits</li>
          <li>Notifications - stay updated on activity</li>
        </ul>
      </div>
    </div>
  );
}
