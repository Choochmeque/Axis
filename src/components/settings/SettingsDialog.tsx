import { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Checkbox from '@radix-ui/react-checkbox';
import {
  X,
  Settings,
  Palette,
  GitBranch,
  FileText,
  Terminal,
  Save,
  RotateCcw,
  Check,
} from 'lucide-react';
import { settingsApi, signingApi } from '../../services/api';
import type { AppSettings, Theme, SigningFormat, GpgKey, SshKey } from '../../types';
import { cn } from '../../lib/utils';

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsChange?: (settings: AppSettings) => void;
}

type SettingsTab = 'appearance' | 'git' | 'diff' | 'terminal';

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  font_size: 13,
  show_line_numbers: true,
  default_branch_name: 'main',
  auto_fetch_interval: 0,
  confirm_before_discard: true,
  sign_commits: false,
  signing_format: 'gpg',
  signing_key: undefined,
  gpg_program: undefined,
  ssh_program: undefined,
  diff_context_lines: 3,
  diff_word_wrap: false,
  diff_side_by_side: false,
  commit_message_width: 72,
  spell_check_commit_messages: false,
  terminal_font_family: 'monospace',
  terminal_font_size: 13,
};

export function SettingsDialog({ isOpen, onClose, onSettingsChange }: SettingsDialogProps) {
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
      await settingsApi.save(settings);
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
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay-animated" />
        <Dialog.Content className="dialog-content max-w-175 max-h-[80vh] flex flex-col overflow-hidden">
          <Dialog.Title className="dialog-title">
            <Settings size={20} />
            Settings
          </Dialog.Title>

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
            <div className="mx-4 p-3 bg-error/10 text-error rounded text-[13px]">{error}</div>
          )}

          <div className="dialog-footer justify-between">
            <button
              className="btn-icon btn-secondary"
              onClick={handleReset}
              disabled={!hasChanges || isSaving}
            >
              <RotateCcw size={14} />
              Reset
            </button>
            <div className="flex gap-2">
              <Dialog.Close asChild>
                <button className="btn-icon btn-secondary" disabled={isSaving}>
                  Cancel
                </button>
              </Dialog.Close>
              <button
                className="btn-icon btn-primary"
                onClick={handleSave}
                disabled={!hasChanges || isSaving}
              >
                <Save size={14} />
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>

          <Dialog.Close asChild>
            <button className="btn-close absolute top-3 right-3" aria-label="Close">
              <X size={16} />
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
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
const hintClass = 'mt-1.5 text-xs text-(--text-muted)';

function AppearanceSettings({ settings, updateSetting }: SettingsPanelProps) {
  return (
    <div>
      <h3 className={sectionTitleClass}>Appearance</h3>

      <div className={groupClass}>
        <label htmlFor="theme" className="label">
          Theme
        </label>
        <select
          id="theme"
          value={settings.theme}
          onChange={(e) => updateSetting('theme', e.target.value as Theme)}
          className="input"
        >
          <option value="system">System</option>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
        <p className={hintClass}>Choose your preferred color theme</p>
      </div>

      <div className={groupClass}>
        <label htmlFor="fontSize" className="label">
          Font Size
        </label>
        <input
          id="fontSize"
          type="number"
          min="10"
          max="24"
          value={settings.font_size}
          onChange={(e) => updateSetting('font_size', parseInt(e.target.value) || 13)}
          className={numberInputClass}
        />
        <p className={hintClass}>Base font size for the interface (10-24)</p>
      </div>

      <div className={groupClass}>
        <div className="checkbox-field">
          <Checkbox.Root
            id="show-line-numbers"
            className="checkbox"
            checked={settings.show_line_numbers}
            onCheckedChange={(checked) => updateSetting('show_line_numbers', checked === true)}
          >
            <Checkbox.Indicator>
              <Check size={10} className="text-white" />
            </Checkbox.Indicator>
          </Checkbox.Root>
          <label htmlFor="show-line-numbers" className="checkbox-label">
            Show line numbers
          </label>
        </div>
        <p className={hintClass}>Display line numbers in diff and file views</p>
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
      if (config.signing_key) {
        updateSetting('signing_format', config.format);
        updateSetting('signing_key', config.signing_key);
        if (config.gpg_program) updateSetting('gpg_program', config.gpg_program);
        if (config.ssh_program) updateSetting('ssh_program', config.ssh_program);
        setTestResult({ success: true, message: 'Configuration detected from git config' });
      } else {
        setTestResult({ success: false, message: 'No signing key found in git config' });
      }
    } catch (err) {
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
        format: settings.signing_format,
        signing_key: settings.signing_key,
        gpg_program: settings.gpg_program,
        ssh_program: settings.ssh_program,
      });
      if (result.success) {
        setTestResult({ success: true, message: `Signing works! Using: ${result.program_used}` });
      } else {
        setTestResult({ success: false, message: result.error || 'Signing test failed' });
      }
    } catch (err) {
      setTestResult({ success: false, message: 'Failed to test signing' });
    } finally {
      setIsTesting(false);
    }
  };

  const availableKeys =
    settings.signing_format === 'gpg'
      ? gpgKeys.map((k) => ({ value: k.key_id, label: `${k.key_id} - ${k.user_id}` }))
      : sshKeys.map((k) => ({ value: k.path, label: `${k.key_type} - ${k.comment || k.path}` }));

  return (
    <div>
      <h3 className={sectionTitleClass}>Git</h3>

      <div className={groupClass}>
        <label htmlFor="defaultBranch" className="label">
          Default Branch Name
        </label>
        <input
          id="defaultBranch"
          type="text"
          value={settings.default_branch_name}
          onChange={(e) => updateSetting('default_branch_name', e.target.value)}
          className="input"
        />
        <p className={hintClass}>Default branch name for new repositories</p>
      </div>

      <div className={groupClass}>
        <label htmlFor="autoFetch" className="label">
          Auto-fetch Interval (minutes)
        </label>
        <input
          id="autoFetch"
          type="number"
          min="0"
          max="60"
          value={settings.auto_fetch_interval}
          onChange={(e) => updateSetting('auto_fetch_interval', parseInt(e.target.value) || 0)}
          className={numberInputClass}
        />
        <p className={hintClass}>Automatically fetch from remote (0 = disabled)</p>
      </div>

      <div className={groupClass}>
        <div className="checkbox-field">
          <Checkbox.Root
            id="confirm-before-discard"
            className="checkbox"
            checked={settings.confirm_before_discard}
            onCheckedChange={(checked) => updateSetting('confirm_before_discard', checked === true)}
          >
            <Checkbox.Indicator>
              <Check size={10} className="text-white" />
            </Checkbox.Indicator>
          </Checkbox.Root>
          <label htmlFor="confirm-before-discard" className="checkbox-label">
            Confirm before discarding changes
          </label>
        </div>
        <p className={hintClass}>Show confirmation dialog before discarding changes</p>
      </div>

      <h3 className={sectionTitleClass}>Commit Signing</h3>

      <div className={groupClass}>
        <div className="checkbox-field">
          <Checkbox.Root
            id="sign-commits"
            className="checkbox"
            checked={settings.sign_commits}
            onCheckedChange={(checked) => updateSetting('sign_commits', checked === true)}
          >
            <Checkbox.Indicator>
              <Check size={10} className="text-white" />
            </Checkbox.Indicator>
          </Checkbox.Root>
          <label htmlFor="sign-commits" className="checkbox-label">
            Sign commits by default
          </label>
        </div>
        <p className={hintClass}>Automatically sign all commits</p>
      </div>

      <div className={groupClass}>
        <label htmlFor="signingFormat" className="label">
          Signing Format
        </label>
        <select
          id="signingFormat"
          value={settings.signing_format}
          onChange={(e) => {
            updateSetting('signing_format', e.target.value as SigningFormat);
            updateSetting('signing_key', undefined);
            setTestResult(null);
          }}
          className="input"
        >
          <option value="gpg">GPG</option>
          <option value="ssh">SSH</option>
        </select>
        <p className={hintClass}>Choose GPG or SSH for signing commits</p>
      </div>

      <div className={groupClass}>
        <label htmlFor="signingKey" className="label">
          Signing Key
        </label>
        <div className="flex gap-2">
          <select
            id="signingKey"
            value={settings.signing_key || ''}
            onChange={(e) => {
              updateSetting('signing_key', e.target.value || undefined);
              setTestResult(null);
            }}
            className="input flex-1"
            disabled={isLoadingKeys}
          >
            <option value="">
              {isLoadingKeys ? 'Loading keys...' : 'Select a key...'}
            </option>
            {availableKeys.map((key) => (
              <option key={key.value} value={key.value}>
                {key.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn-icon btn-secondary"
            onClick={handleDetectConfig}
            disabled={isDetecting}
          >
            {isDetecting ? 'Detecting...' : 'Auto-detect'}
          </button>
        </div>
        <p className={hintClass}>
          {settings.signing_format === 'gpg'
            ? 'Select your GPG key or enter a key ID'
            : 'Select your SSH key file'}
        </p>
        {!settings.signing_key && availableKeys.length === 0 && !isLoadingKeys && (
          <p className="mt-1.5 text-xs text-warning">
            No {settings.signing_format === 'gpg' ? 'GPG' : 'SSH'} keys found on this system
          </p>
        )}
      </div>

      {settings.signing_format === 'gpg' && (
        <div className={groupClass}>
          <label htmlFor="gpgProgram" className="label">
            GPG Program (optional)
          </label>
          <input
            id="gpgProgram"
            type="text"
            value={settings.gpg_program || ''}
            onChange={(e) => updateSetting('gpg_program', e.target.value || undefined)}
            className="input"
            placeholder="Auto-detect"
          />
          <p className={hintClass}>Custom path to GPG executable (leave empty for auto-detect)</p>
        </div>
      )}

      {settings.signing_format === 'ssh' && (
        <div className={groupClass}>
          <label htmlFor="sshProgram" className="label">
            SSH Program (optional)
          </label>
          <input
            id="sshProgram"
            type="text"
            value={settings.ssh_program || ''}
            onChange={(e) => updateSetting('ssh_program', e.target.value || undefined)}
            className="input"
            placeholder="Auto-detect"
          />
          <p className={hintClass}>Custom path to ssh-keygen executable (leave empty for auto-detect)</p>
        </div>
      )}

      <div className={groupClass}>
        <button
          type="button"
          className="btn-icon btn-secondary"
          onClick={handleTestSigning}
          disabled={!settings.signing_key || isTesting}
        >
          {isTesting ? 'Testing...' : 'Test Signing'}
        </button>
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

      <div className={groupClass}>
        <label htmlFor="contextLines" className="label">
          Context Lines
        </label>
        <input
          id="contextLines"
          type="number"
          min="0"
          max="20"
          value={settings.diff_context_lines}
          onChange={(e) => updateSetting('diff_context_lines', parseInt(e.target.value) || 3)}
          className={numberInputClass}
        />
        <p className={hintClass}>Number of context lines to show in diffs (0-20)</p>
      </div>

      <div className={groupClass}>
        <div className="checkbox-field">
          <Checkbox.Root
            id="diff-word-wrap"
            className="checkbox"
            checked={settings.diff_word_wrap}
            onCheckedChange={(checked) => updateSetting('diff_word_wrap', checked === true)}
          >
            <Checkbox.Indicator>
              <Check size={10} className="text-white" />
            </Checkbox.Indicator>
          </Checkbox.Root>
          <label htmlFor="diff-word-wrap" className="checkbox-label">
            Word wrap in diff view
          </label>
        </div>
        <p className={hintClass}>Wrap long lines in diff view</p>
      </div>

      <div className={groupClass}>
        <div className="checkbox-field">
          <Checkbox.Root
            id="diff-side-by-side"
            className="checkbox"
            checked={settings.diff_side_by_side}
            onCheckedChange={(checked) => updateSetting('diff_side_by_side', checked === true)}
          >
            <Checkbox.Indicator>
              <Check size={10} className="text-white" />
            </Checkbox.Indicator>
          </Checkbox.Root>
          <label htmlFor="diff-side-by-side" className="checkbox-label">
            Side-by-side diff view
          </label>
        </div>
        <p className={hintClass}>Show diffs in split view by default</p>
      </div>

      <h3 className={sectionTitleClass}>Commit</h3>

      <div className={groupClass}>
        <label htmlFor="commitWidth" className="label">
          Commit Message Width
        </label>
        <input
          id="commitWidth"
          type="number"
          min="50"
          max="120"
          value={settings.commit_message_width}
          onChange={(e) => updateSetting('commit_message_width', parseInt(e.target.value) || 72)}
          className={numberInputClass}
        />
        <p className={hintClass}>Maximum width for commit messages (50-120)</p>
      </div>

      <div className={groupClass}>
        <div className="checkbox-field">
          <Checkbox.Root
            id="spell-check-commit-messages"
            className="checkbox"
            checked={settings.spell_check_commit_messages}
            onCheckedChange={(checked) =>
              updateSetting('spell_check_commit_messages', checked === true)
            }
          >
            <Checkbox.Indicator>
              <Check size={10} className="text-white" />
            </Checkbox.Indicator>
          </Checkbox.Root>
          <label htmlFor="spell-check-commit-messages" className="checkbox-label">
            Spell check commit messages
          </label>
        </div>
        <p className={hintClass}>Enable spell checking in commit message editor</p>
      </div>
    </div>
  );
}

function TerminalSettings({ settings, updateSetting }: SettingsPanelProps) {
  return (
    <div>
      <h3 className={sectionTitleClass}>Terminal</h3>

      <div className={groupClass}>
        <label htmlFor="terminalFont" className="label">
          Font Family
        </label>
        <input
          id="terminalFont"
          type="text"
          value={settings.terminal_font_family}
          onChange={(e) => updateSetting('terminal_font_family', e.target.value)}
          className="input"
        />
        <p className={hintClass}>Font family for terminal output</p>
      </div>

      <div className={groupClass}>
        <label htmlFor="terminalFontSize" className="label">
          Font Size
        </label>
        <input
          id="terminalFontSize"
          type="number"
          min="10"
          max="24"
          value={settings.terminal_font_size}
          onChange={(e) => updateSetting('terminal_font_size', parseInt(e.target.value) || 13)}
          className={numberInputClass}
        />
        <p className={hintClass}>Font size for terminal output (10-24)</p>
      </div>
    </div>
  );
}
