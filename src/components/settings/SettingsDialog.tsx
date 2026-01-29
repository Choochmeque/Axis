import { useState, useEffect, useMemo, useRef, startTransition } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Settings,
  Palette,
  GitBranch,
  FileText,
  Sparkles,
  Link2,
  Terminal,
  KeyRound,
} from 'lucide-react';
import { toast } from '@/hooks';
import { getErrorMessage } from '@/lib/errorUtils';
import { settingsApi, signingApi, aiApi, lfsApi, avatarApi, sshKeysApi } from '@/services/api';
import type { GitEnvironment } from '@/bindings/api';
import { useSettingsStore } from '@/store/settingsStore';
import { useIntegrationStore, initIntegrationListeners } from '@/store/integrationStore';
import { SigningFormat, Theme, AiProvider, ProviderType } from '@/types';
import type {
  AppSettings,
  Theme as ThemeType,
  SigningFormat as SigningFormatType,
  AiProvider as AiProviderType,
  GpgKey,
  SshKey,
  SshKeyInfo,
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
import { GlobalActionsSettings } from './GlobalActionsSettings';
import { SshKeysSettings } from './SshKeysSettings';

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsChange?: (settings: AppSettings) => void;
}

type SettingsTab = 'appearance' | 'git' | 'diff' | 'ai' | 'integrations' | 'actions' | 'ssh-keys';

const DEFAULT_SETTINGS: AppSettings = {
  theme: Theme.System,
  language: 'system',
  fontSize: 12,
  showLineNumbers: true,
  autoFetchInterval: 5,
  confirmBeforeDiscard: true,
  signCommits: false,
  bypassHooks: false,
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
  defaultSshKey: null,
  gravatarEnabled: false,
};

export function SettingsDialog({ isOpen, onClose, onSettingsChange }: SettingsDialogProps) {
  const { t } = useTranslation();
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
      toast.success(t('settings.settingsSaved'));
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
    { id: 'appearance', label: t('settings.tabs.appearance'), icon: <Palette size={16} /> },
    { id: 'git', label: t('settings.tabs.git'), icon: <GitBranch size={16} /> },
    { id: 'diff', label: t('settings.tabs.diff'), icon: <FileText size={16} /> },
    { id: 'ai', label: t('settings.tabs.ai'), icon: <Sparkles size={16} /> },
    { id: 'integrations', label: t('settings.tabs.integrations'), icon: <Link2 size={16} /> },
    { id: 'actions', label: t('settings.tabs.actions'), icon: <Terminal size={16} /> },
    { id: 'ssh-keys', label: t('settings.tabs.sshKeys'), icon: <KeyRound size={16} /> },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-175 max-h-[80vh] flex flex-col overflow-hidden">
        <DialogTitle icon={Settings}>{t('settings.title')}</DialogTitle>

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
                {t('settings.loadingSettings')}
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
                {activeTab === 'actions' && <GlobalActionsSettings />}
                {activeTab === 'ssh-keys' && <SshKeysSettings />}
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
            {t('common.reset')}
          </Button>
          <div className="flex gap-2">
            <DialogClose asChild>
              <Button variant="secondary" disabled={isSaving}>
                {t('common.cancel')}
              </Button>
            </DialogClose>
            <Button variant="primary" onClick={handleSave} disabled={!hasChanges || isSaving}>
              {isSaving ? t('common.saving') : t('common.save')}
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

const LANGUAGES = [
  { value: 'system', labelKey: 'settings.appearance.language.system' },
  { value: 'en', label: 'English' },
];

function AppearanceSettings({ settings, updateSetting }: SettingsPanelProps) {
  const { t } = useTranslation();
  const [isClearingCache, setIsClearingCache] = useState(false);

  const handleClearAvatarCache = async () => {
    setIsClearingCache(true);
    try {
      await avatarApi.clearCache();
      toast.success(t('settings.avatars.cacheCleared'));
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsClearingCache(false);
    }
  };

  return (
    <div>
      <h3 className={sectionTitleClass}>{t('settings.appearance.title')}</h3>

      <FormField
        label={t('settings.appearance.theme.label')}
        htmlFor="theme"
        hint={t('settings.appearance.theme.hint')}
      >
        <Select
          id="theme"
          value={settings.theme}
          onValueChange={(value) => updateSetting('theme', value as ThemeType)}
        >
          <SelectItem value={Theme.System}>{t('settings.appearance.theme.system')}</SelectItem>
          <SelectItem value={Theme.Light}>{t('settings.appearance.theme.light')}</SelectItem>
          <SelectItem value={Theme.Dark}>{t('settings.appearance.theme.dark')}</SelectItem>
        </Select>
      </FormField>

      <FormField
        label={t('settings.appearance.language.label')}
        htmlFor="language"
        hint={t('settings.appearance.language.hint')}
      >
        <Select
          id="language"
          value={settings.language}
          onValueChange={(value) => updateSetting('language', value)}
        >
          {LANGUAGES.map((lang) => (
            <SelectItem key={lang.value} value={lang.value}>
              {lang.labelKey ? t(lang.labelKey) : lang.label}
            </SelectItem>
          ))}
        </Select>
      </FormField>

      <FormField
        label={t('settings.appearance.fontSize.label')}
        htmlFor="fontSize"
        hint={t('settings.appearance.fontSize.hint')}
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
          label={t('settings.appearance.showLineNumbers.label')}
          description={t('settings.appearance.showLineNumbers.description')}
          checked={settings.showLineNumbers}
          onCheckedChange={(checked) => updateSetting('showLineNumbers', checked === true)}
        />
      </div>

      <h3 className={sectionTitleClass}>{t('settings.avatars.title')}</h3>

      <div className={groupClass}>
        <CheckboxField
          id="gravatar-enabled"
          label={t('settings.avatars.gravatar.label')}
          description={t('settings.avatars.gravatar.description')}
          checked={settings.gravatarEnabled}
          onCheckedChange={(checked) => updateSetting('gravatarEnabled', checked === true)}
        />
      </div>

      <div className={groupClass}>
        <Button variant="secondary" onClick={handleClearAvatarCache} disabled={isClearingCache}>
          {isClearingCache ? t('settings.avatars.clearingCache') : t('settings.avatars.clearCache')}
        </Button>
        <p className="mt-1.5 text-xs text-(--text-muted)">{t('settings.avatars.cacheHint')}</p>
      </div>

      <h3 className={sectionTitleClass}>{t('settings.notifications.title')}</h3>

      <FormField
        label={t('settings.notifications.historyCapacity.label')}
        htmlFor="notificationHistoryCapacity"
        hint={t('settings.notifications.historyCapacity.hint')}
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
  const { t } = useTranslation();
  const [gpgKeys, setGpgKeys] = useState<GpgKey[]>([]);
  const [sshKeys, setSshKeys] = useState<SshKey[]>([]);
  const [sshKeyInfos, setSshKeyInfos] = useState<SshKeyInfo[]>([]);
  const [isLoadingKeys, setIsLoadingKeys] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [gitEnv, setGitEnv] = useState<GitEnvironment | null>(null);
  const [isLoadingEnv, setIsLoadingEnv] = useState(false);

  useEffect(() => {
    loadKeys();
    loadGitEnvironment();
    loadSshKeyInfos();
  }, []);

  const loadSshKeyInfos = async () => {
    try {
      const keys = await sshKeysApi.list();
      setSshKeyInfos(keys);
    } catch (err) {
      console.error('Failed to load SSH keys:', err);
    }
  };

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
        setTestResult({ success: true, message: t('settings.signing.configDetected') });
      } else {
        setTestResult({ success: false, message: t('settings.signing.noKeyFound') });
      }
    } catch {
      setTestResult({ success: false, message: t('settings.signing.detectFailed') });
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
        setTestResult({
          success: true,
          message: t('settings.signing.signingWorks', { program: result.programUsed }),
        });
      } else {
        setTestResult({
          success: false,
          message: result.error || t('settings.signing.signingFailed'),
        });
      }
    } catch {
      setTestResult({ success: false, message: t('settings.signing.signingFailed') });
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
      <h3 className={sectionTitleClass}>{t('settings.git.title')}</h3>

      <FormField
        label={t('settings.git.autoFetch.label')}
        htmlFor="autoFetch"
        hint={t('settings.git.autoFetch.hint')}
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
          label={t('settings.git.confirmBeforeDiscard.label')}
          description={t('settings.git.confirmBeforeDiscard.description')}
          checked={settings.confirmBeforeDiscard}
          onCheckedChange={(checked) => updateSetting('confirmBeforeDiscard', checked === true)}
        />
      </div>

      <FormField
        label={t('settings.git.defaultSshKey.label')}
        htmlFor="defaultSshKey"
        hint={t('settings.git.defaultSshKey.hint')}
      >
        <Select
          id="defaultSshKey"
          value={settings.defaultSshKey || 'auto'}
          onValueChange={(value) => updateSetting('defaultSshKey', value === 'auto' ? null : value)}
          placeholder={t('settings.git.defaultSshKey.auto')}
        >
          <SelectItem value="auto">{t('settings.git.defaultSshKey.auto')}</SelectItem>
          {sshKeyInfos.map((key) => (
            <SelectItem key={key.path} value={key.path}>
              {key.comment || key.path.split('/').pop() || key.path}
            </SelectItem>
          ))}
        </Select>
        {!settings.defaultSshKey && (
          <p className="mt-1.5 text-xs text-(--text-muted)">
            {t('settings.git.defaultSshKey.autoDescription')}
          </p>
        )}
      </FormField>

      <h3 className={sectionTitleClass}>{t('settings.signing.title')}</h3>

      <div className={groupClass}>
        <CheckboxField
          id="sign-commits"
          label={t('settings.signing.signCommits.label')}
          description={t('settings.signing.signCommits.description')}
          checked={settings.signCommits}
          onCheckedChange={(checked) => updateSetting('signCommits', checked === true)}
        />
      </div>

      <FormField
        label={t('settings.signing.format.label')}
        htmlFor="signingFormat"
        hint={t('settings.signing.format.hint')}
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
        label={t('settings.signing.key.label')}
        htmlFor="signingKey"
        hint={
          settings.signingFormat === SigningFormat.Gpg
            ? t('settings.signing.key.hintGpg')
            : t('settings.signing.key.hintSsh')
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
            placeholder={
              isLoadingKeys
                ? t('settings.signing.key.loadingKeys')
                : t('settings.signing.key.placeholder')
            }
          >
            {availableKeys.map((key) => (
              <SelectItem key={key.value} value={key.value}>
                {key.label}
              </SelectItem>
            ))}
          </Select>
          <Button variant="secondary" onClick={handleDetectConfig} disabled={isDetecting}>
            {isDetecting ? t('settings.signing.detecting') : t('settings.signing.autoDetect')}
          </Button>
        </div>
        {!settings.signingKey && availableKeys.length === 0 && !isLoadingKeys && (
          <p className="mt-1.5 text-xs text-warning">
            {t('settings.signing.key.noKeysFound', {
              format: settings.signingFormat === SigningFormat.Gpg ? 'GPG' : 'SSH',
            })}
          </p>
        )}
      </FormField>

      {settings.signingFormat === SigningFormat.Gpg && (
        <FormField
          label={t('settings.signing.gpgProgram.label')}
          htmlFor="gpgProgram"
          hint={t('settings.signing.gpgProgram.hint')}
        >
          <Input
            id="gpgProgram"
            type="text"
            value={settings.gpgProgram || ''}
            onChange={(e) => updateSetting('gpgProgram', e.target.value || null)}
            placeholder={t('settings.signing.gpgProgram.placeholder')}
          />
        </FormField>
      )}

      {settings.signingFormat === SigningFormat.Ssh && (
        <FormField
          label={t('settings.signing.sshProgram.label')}
          htmlFor="sshProgram"
          hint={t('settings.signing.sshProgram.hint')}
        >
          <Input
            id="sshProgram"
            type="text"
            value={settings.sshProgram || ''}
            onChange={(e) => updateSetting('sshProgram', e.target.value || null)}
            placeholder={t('settings.signing.sshProgram.placeholder')}
          />
        </FormField>
      )}

      <div className={groupClass}>
        <Button
          variant="secondary"
          onClick={handleTestSigning}
          disabled={!settings.signingKey || isTesting}
        >
          {isTesting ? t('settings.signing.testing') : t('settings.signing.testSigning')}
        </Button>
        {testResult && (
          <p className={cn('mt-2 text-xs', testResult.success ? 'text-success' : 'text-error')}>
            {testResult.message}
          </p>
        )}
      </div>

      <h3 className={sectionTitleClass}>{t('settings.environment.title')}</h3>

      {isLoadingEnv ? (
        <p className="text-sm text-(--text-muted)">{t('settings.environment.loading')}</p>
      ) : gitEnv ? (
        <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <span className="text-(--text-secondary)">{t('settings.environment.gitCli')}</span>
          <span className="text-(--text-primary) font-mono">
            {gitEnv.gitVersion || t('settings.environment.notFound')}
          </span>

          <span className="text-(--text-secondary)">{t('settings.environment.gitPath')}</span>
          <span className="text-(--text-primary) font-mono text-xs break-all">
            {gitEnv.gitPath || t('settings.environment.notFound')}
          </span>

          <span className="text-(--text-secondary)">{t('settings.environment.libgit2')}</span>
          <span className="text-(--text-primary) font-mono">{gitEnv.libgit2Version}</span>

          <span className="text-(--text-secondary)">{t('settings.environment.gitLfs')}</span>
          <span className="text-(--text-primary)">
            {gitEnv.lfsInstalled ? (
              <span className="font-mono">
                {gitEnv.lfsVersion} <span className="text-success">✓</span>
              </span>
            ) : (
              <span className="text-(--text-muted)">
                {t('settings.environment.notInstalled')}{' '}
                <a
                  href="https://git-lfs.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-(--accent-color) hover:underline"
                >
                  {t('common.install')}
                </a>
              </span>
            )}
          </span>
        </div>
      ) : (
        <p className="text-sm text-(--text-muted)">{t('settings.environment.loadFailed')}</p>
      )}
    </div>
  );
}

function DiffSettings({ settings, updateSetting }: SettingsPanelProps) {
  const { t } = useTranslation();

  return (
    <div>
      <h3 className={sectionTitleClass}>{t('settings.diff.title')}</h3>

      <FormField
        label={t('settings.diff.contextLines.label')}
        htmlFor="contextLines"
        hint={t('settings.diff.contextLines.hint')}
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
          label={t('settings.diff.wordWrap.label')}
          description={t('settings.diff.wordWrap.description')}
          checked={settings.diffWordWrap}
          onCheckedChange={(checked) => updateSetting('diffWordWrap', checked === true)}
        />
      </div>

      <div className={groupClass}>
        <CheckboxField
          id="diff-side-by-side"
          label={t('settings.diff.sideBySide.label')}
          description={t('settings.diff.sideBySide.description')}
          checked={settings.diffSideBySide}
          onCheckedChange={(checked) => updateSetting('diffSideBySide', checked === true)}
        />
      </div>

      <h3 className={sectionTitleClass}>{t('settings.commit.title')}</h3>

      <div className={groupClass}>
        <CheckboxField
          id="spell-check-commit-messages"
          label={t('settings.commit.spellCheck.label')}
          description={t('settings.commit.spellCheck.description')}
          checked={settings.spellCheckCommitMessages}
          onCheckedChange={(checked) => updateSetting('spellCheckCommitMessages', checked === true)}
        />
      </div>

      <div className={groupClass}>
        <CheckboxField
          id="conventional-commits-enabled"
          label={t('settings.commit.conventionalCommits.label')}
          description={t('settings.commit.conventionalCommits.description')}
          checked={settings.conventionalCommitsEnabled}
          onCheckedChange={(checked) =>
            updateSetting('conventionalCommitsEnabled', checked === true)
          }
        />
      </div>

      <FormField
        label={t('settings.commit.customScopes.label')}
        htmlFor="conventionalCommitsScopes"
        hint={t('settings.commit.customScopes.hint')}
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
          placeholder={t('settings.commit.customScopes.placeholder')}
          disabled={!settings.conventionalCommitsEnabled}
        />
      </FormField>
    </div>
  );
}

function AiSettings({ settings, updateSetting }: SettingsPanelProps) {
  const { t } = useTranslation();
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
      toast.success(t('settings.ai.apiKey.saved'));
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
      toast.success(t('settings.ai.apiKey.deleted'));
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
        setTestResult({ success: true, message: t('settings.ai.connectionSuccess') });
      } else {
        setTestResult({ success: false, message: t('settings.ai.connectionFailed') });
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
      <h3 className={sectionTitleClass}>{t('settings.ai.title')}</h3>

      <div className={groupClass}>
        <CheckboxField
          id="ai-enabled"
          label={t('settings.ai.enabled.label')}
          description={t('settings.ai.enabled.description')}
          checked={settings.aiEnabled}
          onCheckedChange={(checked) => updateSetting('aiEnabled', checked === true)}
        />
      </div>

      <FormField
        label={t('settings.ai.provider.label')}
        htmlFor="aiProvider"
        hint={t('settings.ai.provider.hint')}
      >
        <Select
          id="aiProvider"
          value={settings.aiProvider}
          onValueChange={(value) => {
            updateSetting('aiProvider', value as AiProviderType);
            updateSetting('aiModel', null);
            setTestResult(null);
          }}
        >
          <SelectItem value={AiProvider.OpenAi}>{t('settings.ai.provider.openai')}</SelectItem>
          <SelectItem value={AiProvider.Anthropic}>
            {t('settings.ai.provider.anthropic')}
          </SelectItem>
          <SelectItem value={AiProvider.Ollama}>{t('settings.ai.provider.ollama')}</SelectItem>
        </Select>
      </FormField>

      {providerRequiresApiKey && (
        <FormField
          label={t('settings.ai.apiKey.label')}
          htmlFor="aiApiKey"
          hint={hasKey ? t('settings.ai.apiKey.hintConfigured') : t('settings.ai.apiKey.hintEnter')}
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
                  {t('common.remove')}
                </Button>
              </>
            ) : (
              <>
                <Input
                  id="aiApiKey"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={t('settings.ai.apiKey.placeholder')}
                  className="flex-1"
                  disabled={isLoadingKey}
                />
                <Button
                  variant="primary"
                  onClick={handleSaveApiKey}
                  disabled={!apiKey.trim() || isSavingKey}
                >
                  {isSavingKey ? t('common.saving') : t('common.save')}
                </Button>
              </>
            )}
          </div>
        </FormField>
      )}

      {settings.aiProvider === AiProvider.Ollama && (
        <FormField
          label={t('settings.ai.ollamaUrl.label')}
          htmlFor="aiOllamaUrl"
          hint={t('settings.ai.ollamaUrl.hint')}
        >
          <Input
            id="aiOllamaUrl"
            type="text"
            value={settings.aiOllamaUrl || ''}
            onChange={(e) => updateSetting('aiOllamaUrl', e.target.value || null)}
            placeholder={t('settings.ai.ollamaUrl.placeholder')}
          />
        </FormField>
      )}

      <FormField
        label={t('settings.ai.model.label')}
        htmlFor="aiModel"
        hint={t('settings.ai.model.hint', { model: defaultModels[settings.aiProvider] })}
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
                  ? t('settings.ai.model.loadingModels')
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
              {t('common.refresh')}
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
          {isTesting ? t('settings.signing.testing') : t('settings.ai.testConnection')}
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

const PROVIDERS: { id: ProviderType; name: string; supported: boolean }[] = [
  { id: ProviderType.GitHub, name: 'GitHub', supported: true },
  { id: ProviderType.GitLab, name: 'GitLab', supported: false },
  { id: ProviderType.Bitbucket, name: 'Bitbucket', supported: false },
  { id: ProviderType.Gitea, name: 'Gitea', supported: false },
];

function IntegrationsSettings() {
  const { t } = useTranslation();
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
  const initialTab = useMemo((): ProviderType => {
    if (detectedProvider?.provider) {
      const providerTab = detectedProvider.provider as ProviderType;
      if (PROVIDERS.some((p) => p.id === providerTab)) {
        return providerTab;
      }
    }
    return ProviderType.GitHub;
  }, [detectedProvider]);

  const [activeTab, setActiveTab] = useState<ProviderType>(initialTab);
  const hasSetInitialTab = useRef(false);

  useEffect(() => {
    initIntegrationListeners();
    detectProvider();
  }, [detectProvider]);

  // Update tab when detected provider changes (only once)
  useEffect(() => {
    if (!hasSetInitialTab.current && detectedProvider?.provider) {
      const providerTab = detectedProvider.provider as ProviderType;
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

  return (
    <div>
      <h3 className={sectionTitleClass}>{t('settings.integrations.title')}</h3>

      {/* Provider Tabs */}
      <div className="flex border-b border-(--border-color) mb-4">
        {PROVIDERS.map((provider) => (
          <button
            key={provider.id}
            onClick={() => setActiveTab(provider.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === provider.id
                ? 'border-(--accent-color) text-(--accent-color)'
                : 'border-transparent text-(--text-muted) hover:text-(--text-primary)'
            }`}
          >
            {provider.name}
            {detectedProvider?.provider === provider.id && (
              <span className="ml-2 w-2 h-2 inline-block rounded-full bg-(--accent-color)" />
            )}
          </button>
        ))}
      </div>

      {/* Provider Content */}
      {!activeProvider?.supported ? (
        <div className="py-4 text-(--text-muted) text-sm">
          <p>{t('settings.integrations.comingSoon', { provider: activeProvider?.name })}</p>
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
                {connectionStatus?.connected && connectionStatus.username && (
                  <div className="text-sm text-(--text-muted)">
                    {t('settings.integrations.connectedAs', {
                      username: connectionStatus.username,
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              {connectionStatus?.connected ? (
                <Button variant="secondary" onClick={handleDisconnect}>
                  {t('common.disconnect')}
                </Button>
              ) : isConnecting ? (
                <Button variant="secondary" onClick={cancelOAuth}>
                  {t('common.cancel')}
                </Button>
              ) : (
                <Button variant="primary" onClick={handleConnect}>
                  {t('common.connect')}
                </Button>
              )}
            </div>
          </div>

          {error && <Alert variant="error">{error}</Alert>}

          {connectionStatus?.connected && (
            <div className="text-sm text-(--text-secondary)">
              <p>
                {t('settings.integrations.connectedDescription', {
                  provider: activeProvider?.name,
                })}
              </p>
            </div>
          )}

          {!connectionStatus?.connected && (
            <div className="text-sm text-(--text-muted)">
              <p>
                {t('settings.integrations.connectDescription', { provider: activeProvider?.name })}
              </p>
              <p className="mt-2">
                <strong>Note:</strong>{' '}
                {t('settings.integrations.authNote', { provider: activeProvider?.name })}
              </p>
            </div>
          )}
        </div>
      )}

      <h3 className={sectionTitleClass}>{t('settings.integrations.aboutTitle')}</h3>

      <div className="text-sm text-(--text-secondary) space-y-2">
        <p>{t('settings.integrations.aboutDescription')}</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>{t('settings.integrations.features.pullRequests')}</li>
          <li>{t('settings.integrations.features.issues')}</li>
          <li>{t('settings.integrations.features.cicd')}</li>
          <li>{t('settings.integrations.features.notifications')}</li>
        </ul>
      </div>
    </div>
  );
}
