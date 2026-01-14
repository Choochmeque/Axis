import { useState, useEffect } from 'react';
import { Settings, Palette, GitBranch, FileText, Terminal, Save, RotateCcw } from 'lucide-react';
import { settingsApi, signingApi } from '@/services/api';
import { useSettingsStore } from '@/store/settingsStore';
import { SigningFormat, Theme } from '@/types';
import type {
  AppSettings,
  Theme as ThemeType,
  SigningFormat as SigningFormatType,
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
  CheckboxField,
  Alert,
} from '@/components/ui';

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsChange?: (settings: AppSettings) => void;
}

type SettingsTab = 'appearance' | 'git' | 'diff' | 'terminal';

const DEFAULT_SETTINGS: AppSettings = {
  theme: Theme.System,
  fontSize: 13,
  showLineNumbers: true,
  defaultBranchName: 'main',
  autoFetchInterval: 0,
  confirmBeforeDiscard: true,
  signCommits: false,
  signingFormat: SigningFormat.Gpg,
  signingKey: null,
  gpgProgram: null,
  sshProgram: null,
  diffContextLines: 3,
  diffWordWrap: false,
  diffSideBySide: false,
  commitMessageWidth: 72,
  spellCheckCommitMessages: false,
  terminalFontFamily: 'monospace',
  terminalFontSize: 13,
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
      console.error('Failed to load settings:', err);
      setError('Failed to load settings');
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
    } catch (err) {
      console.error('Failed to save settings:', err);
      setError('Failed to save settings');
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
    { id: 'terminal', label: 'Terminal', icon: <Terminal size={16} /> },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-175 max-h-[80vh] flex flex-col overflow-hidden">
        <DialogTitle>
          <Settings size={20} />
          Settings
        </DialogTitle>

        <div className="flex flex-1 min-h-0 overflow-hidden">
          <div className="w-45 shrink-0 p-3 bg-(--bg-tertiary) border-r border-(--border-color) flex flex-col gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={cn(
                  'flex items-center gap-2 py-2.5 px-3 bg-transparent border-none rounded-md text-[13px] cursor-pointer text-left transition-colors',
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
                {activeTab === 'terminal' && (
                  <TerminalSettings settings={settings} updateSetting={updateSetting} />
                )}
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
            <RotateCcw size={14} />
            Reset
          </Button>
          <div className="flex gap-2">
            <DialogClose asChild>
              <Button variant="secondary" disabled={isSaving}>
                Cancel
              </Button>
            </DialogClose>
            <Button variant="primary" onClick={handleSave} disabled={!hasChanges || isSaving}>
              <Save size={14} />
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
  'w-full max-w-30 py-2 px-3 border border-(--border-color) rounded bg-(--bg-primary) text-(--text-primary) text-[13px] outline-none focus:border-(--accent-color)';

function AppearanceSettings({ settings, updateSetting }: SettingsPanelProps) {
  return (
    <div>
      <h3 className={sectionTitleClass}>Appearance</h3>

      <FormField label="Theme" htmlFor="theme" hint="Choose your preferred color theme">
        <Select
          id="theme"
          value={settings.theme}
          onChange={(e) => updateSetting('theme', e.target.value as ThemeType)}
        >
          <option value={Theme.System}>System</option>
          <option value={Theme.Light}>Light</option>
          <option value={Theme.Dark}>Dark</option>
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

  useEffect(() => {
    loadKeys();
  }, []);

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
        label="Default Branch Name"
        htmlFor="defaultBranch"
        hint="Default branch name for new repositories"
      >
        <Input
          id="defaultBranch"
          type="text"
          value={settings.defaultBranchName}
          onChange={(e) => updateSetting('defaultBranchName', e.target.value)}
        />
      </FormField>

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
          onChange={(e) => {
            updateSetting('signingFormat', e.target.value as SigningFormatType);
            updateSetting('signingKey', null);
            setTestResult(null);
          }}
        >
          <option value={SigningFormat.Gpg}>GPG</option>
          <option value={SigningFormat.Ssh}>SSH</option>
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
            onChange={(e) => {
              updateSetting('signingKey', e.target.value || null);
              setTestResult(null);
            }}
            className="flex-1"
            disabled={isLoadingKeys}
          >
            <option value="">{isLoadingKeys ? 'Loading keys...' : 'Select a key...'}</option>
            {availableKeys.map((key) => (
              <option key={key.value} value={key.value}>
                {key.label}
              </option>
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

      <FormField
        label="Commit Message Width"
        htmlFor="commitWidth"
        hint="Maximum width for commit messages (50-120)"
      >
        <Input
          id="commitWidth"
          type="number"
          min={50}
          max={120}
          value={settings.commitMessageWidth}
          onChange={(e) => updateSetting('commitMessageWidth', parseInt(e.target.value) || 72)}
          className={numberInputClass}
        />
      </FormField>

      <div className={groupClass}>
        <CheckboxField
          id="spell-check-commit-messages"
          label="Spell check commit messages"
          description="Enable spell checking in commit message editor"
          checked={settings.spellCheckCommitMessages}
          onCheckedChange={(checked) => updateSetting('spellCheckCommitMessages', checked === true)}
        />
      </div>
    </div>
  );
}

function TerminalSettings({ settings, updateSetting }: SettingsPanelProps) {
  return (
    <div>
      <h3 className={sectionTitleClass}>Terminal</h3>

      <FormField label="Font Family" htmlFor="terminalFont" hint="Font family for terminal output">
        <Input
          id="terminalFont"
          type="text"
          value={settings.terminalFontFamily}
          onChange={(e) => updateSetting('terminalFontFamily', e.target.value)}
        />
      </FormField>

      <FormField
        label="Font Size"
        htmlFor="terminalFontSize"
        hint="Font size for terminal output (10-24)"
      >
        <Input
          id="terminalFontSize"
          type="number"
          min={10}
          max={24}
          value={settings.terminalFontSize}
          onChange={(e) => updateSetting('terminalFontSize', parseInt(e.target.value) || 13)}
          className={numberInputClass}
        />
      </FormField>
    </div>
  );
}
