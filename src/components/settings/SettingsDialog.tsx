import { useState, useEffect } from 'react';
import {
  X,
  Settings,
  Palette,
  GitBranch,
  FileText,
  Terminal,
  Save,
  RotateCcw,
} from 'lucide-react';
import { settingsApi } from '../../services/api';
import type { AppSettings, Theme } from '../../types';
import './SettingsDialog.css';

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
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  if (!isOpen) return null;

  const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
    { id: 'appearance', label: 'Appearance', icon: <Palette size={16} /> },
    { id: 'git', label: 'Git', icon: <GitBranch size={16} /> },
    { id: 'diff', label: 'Diff & Editor', icon: <FileText size={16} /> },
    { id: 'terminal', label: 'Terminal', icon: <Terminal size={16} /> },
  ];

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog settings-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <div className="dialog-title">
            <Settings size={20} />
            <span>Settings</span>
          </div>
          <button className="dialog-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="settings-content">
          <div className="settings-tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`settings-tab ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="settings-panel">
            {isLoading ? (
              <div className="settings-loading">Loading settings...</div>
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
          <div className="settings-error">
            {error}
          </div>
        )}

        <div className="dialog-footer">
          <button
            className="btn btn-secondary"
            onClick={handleReset}
            disabled={!hasChanges || isSaving}
          >
            <RotateCcw size={14} />
            Reset
          </button>
          <div className="dialog-footer-right">
            <button className="btn btn-secondary" onClick={onClose} disabled={isSaving}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
            >
              <Save size={14} />
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface SettingsPanelProps {
  settings: AppSettings;
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
}

function AppearanceSettings({ settings, updateSetting }: SettingsPanelProps) {
  return (
    <div className="settings-section">
      <h3>Appearance</h3>

      <div className="settings-group">
        <label htmlFor="theme">Theme</label>
        <select
          id="theme"
          value={settings.theme}
          onChange={(e) => updateSetting('theme', e.target.value as Theme)}
        >
          <option value="system">System</option>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
        <p className="settings-hint">Choose your preferred color theme</p>
      </div>

      <div className="settings-group">
        <label htmlFor="fontSize">Font Size</label>
        <input
          id="fontSize"
          type="number"
          min="10"
          max="24"
          value={settings.font_size}
          onChange={(e) => updateSetting('font_size', parseInt(e.target.value) || 13)}
        />
        <p className="settings-hint">Base font size for the interface (10-24)</p>
      </div>

      <div className="settings-group">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={settings.show_line_numbers}
            onChange={(e) => updateSetting('show_line_numbers', e.target.checked)}
          />
          <span>Show line numbers</span>
        </label>
        <p className="settings-hint">Display line numbers in diff and file views</p>
      </div>
    </div>
  );
}

function GitSettings({ settings, updateSetting }: SettingsPanelProps) {
  return (
    <div className="settings-section">
      <h3>Git</h3>

      <div className="settings-group">
        <label htmlFor="defaultBranch">Default Branch Name</label>
        <input
          id="defaultBranch"
          type="text"
          value={settings.default_branch_name}
          onChange={(e) => updateSetting('default_branch_name', e.target.value)}
        />
        <p className="settings-hint">Default branch name for new repositories</p>
      </div>

      <div className="settings-group">
        <label htmlFor="autoFetch">Auto-fetch Interval (minutes)</label>
        <input
          id="autoFetch"
          type="number"
          min="0"
          max="60"
          value={settings.auto_fetch_interval}
          onChange={(e) => updateSetting('auto_fetch_interval', parseInt(e.target.value) || 0)}
        />
        <p className="settings-hint">Automatically fetch from remote (0 = disabled)</p>
      </div>

      <div className="settings-group">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={settings.confirm_before_discard}
            onChange={(e) => updateSetting('confirm_before_discard', e.target.checked)}
          />
          <span>Confirm before discarding changes</span>
        </label>
        <p className="settings-hint">Show confirmation dialog before discarding changes</p>
      </div>

      <div className="settings-group">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={settings.sign_commits}
            onChange={(e) => updateSetting('sign_commits', e.target.checked)}
          />
          <span>Sign commits with GPG</span>
        </label>
        <p className="settings-hint">Automatically sign commits using GPG</p>
      </div>
    </div>
  );
}

function DiffSettings({ settings, updateSetting }: SettingsPanelProps) {
  return (
    <div className="settings-section">
      <h3>Diff & Editor</h3>

      <div className="settings-group">
        <label htmlFor="contextLines">Context Lines</label>
        <input
          id="contextLines"
          type="number"
          min="0"
          max="20"
          value={settings.diff_context_lines}
          onChange={(e) => updateSetting('diff_context_lines', parseInt(e.target.value) || 3)}
        />
        <p className="settings-hint">Number of context lines to show in diffs (0-20)</p>
      </div>

      <div className="settings-group">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={settings.diff_word_wrap}
            onChange={(e) => updateSetting('diff_word_wrap', e.target.checked)}
          />
          <span>Word wrap in diff view</span>
        </label>
        <p className="settings-hint">Wrap long lines in diff view</p>
      </div>

      <div className="settings-group">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={settings.diff_side_by_side}
            onChange={(e) => updateSetting('diff_side_by_side', e.target.checked)}
          />
          <span>Side-by-side diff view</span>
        </label>
        <p className="settings-hint">Show diffs in split view by default</p>
      </div>

      <h3>Commit</h3>

      <div className="settings-group">
        <label htmlFor="commitWidth">Commit Message Width</label>
        <input
          id="commitWidth"
          type="number"
          min="50"
          max="120"
          value={settings.commit_message_width}
          onChange={(e) => updateSetting('commit_message_width', parseInt(e.target.value) || 72)}
        />
        <p className="settings-hint">Maximum width for commit messages (50-120)</p>
      </div>

      <div className="settings-group">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={settings.spell_check_commit_messages}
            onChange={(e) => updateSetting('spell_check_commit_messages', e.target.checked)}
          />
          <span>Spell check commit messages</span>
        </label>
        <p className="settings-hint">Enable spell checking in commit message editor</p>
      </div>
    </div>
  );
}

function TerminalSettings({ settings, updateSetting }: SettingsPanelProps) {
  return (
    <div className="settings-section">
      <h3>Terminal</h3>

      <div className="settings-group">
        <label htmlFor="terminalFont">Font Family</label>
        <input
          id="terminalFont"
          type="text"
          value={settings.terminal_font_family}
          onChange={(e) => updateSetting('terminal_font_family', e.target.value)}
        />
        <p className="settings-hint">Font family for terminal output</p>
      </div>

      <div className="settings-group">
        <label htmlFor="terminalFontSize">Font Size</label>
        <input
          id="terminalFontSize"
          type="number"
          min="10"
          max="24"
          value={settings.terminal_font_size}
          onChange={(e) => updateSetting('terminal_font_size', parseInt(e.target.value) || 13)}
        />
        <p className="settings-hint">Font size for terminal output (10-24)</p>
      </div>
    </div>
  );
}
