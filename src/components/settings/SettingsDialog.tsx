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
import { cn } from '../../lib/utils';

const overlayClass = "fixed inset-0 bg-black/50 flex items-center justify-center z-9999";
const dialogClass = "bg-(--bg-primary) rounded-lg shadow-xl w-175 max-w-[90vw] max-h-[80vh] flex flex-col z-10000";
const headerClass = "flex items-center justify-between py-4 px-4 border-b border-(--border-color)";
const titleClass = "flex items-center gap-2 text-base font-semibold text-(--text-primary)";
const closeClass = "flex items-center justify-center w-7 h-7 p-0 bg-transparent border-none rounded text-(--text-secondary) cursor-pointer transition-colors hover:bg-(--bg-hover) hover:text-(--text-primary)";
const footerClass = "flex justify-between items-center py-3 px-4 border-t border-(--border-color)";
const btnClass = "flex items-center gap-1.5 py-2 px-4 text-[13px] font-medium border-none rounded-md cursor-pointer transition-colors disabled:opacity-60 disabled:cursor-not-allowed";

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
    <div className={overlayClass} onClick={onClose}>
      <div className={dialogClass} onClick={(e) => e.stopPropagation()}>
        <div className={headerClass}>
          <div className={titleClass}>
            <Settings size={20} />
            <span>Settings</span>
          </div>
          <button className={closeClass} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-1 min-h-0 overflow-hidden">
          <div className="w-45 shrink-0 p-3 bg-(--bg-tertiary) border-r border-(--border-color) flex flex-col gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={cn(
                  "flex items-center gap-2 py-2.5 px-3 bg-transparent border-none rounded-md text-[13px] cursor-pointer text-left transition-colors",
                  activeTab === tab.id
                    ? "bg-(--accent-color) text-white"
                    : "text-(--text-secondary) hover:bg-(--bg-hover) hover:text-(--text-primary)"
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
              <div className="flex items-center justify-center h-50 text-(--text-muted)">Loading settings...</div>
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
          <div className="mx-4 p-3 bg-error/10 text-error rounded text-[13px]">
            {error}
          </div>
        )}

        <div className={footerClass}>
          <button
            className={cn(btnClass, "bg-(--bg-secondary) text-(--text-primary) border border-(--border-color) hover:bg-(--bg-hover)")}
            onClick={handleReset}
            disabled={!hasChanges || isSaving}
          >
            <RotateCcw size={14} />
            Reset
          </button>
          <div className="flex gap-2">
            <button className={cn(btnClass, "bg-(--bg-secondary) text-(--text-primary) border border-(--border-color) hover:bg-(--bg-hover)")} onClick={onClose} disabled={isSaving}>
              Cancel
            </button>
            <button
              className={cn(btnClass, "bg-(--accent-color) text-white hover:opacity-90")}
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

const sectionTitleClass = "m-0 mb-4 pb-2 border-b border-(--border-color) text-sm font-semibold text-(--text-primary) first:mt-0 not-first:mt-6";
const groupClass = "mb-5";
const labelClass = "block mb-1.5 text-[13px] font-medium text-(--text-primary)";
const inputClass = "w-full max-w-75 py-2 px-3 border border-(--border-color) rounded bg-(--bg-primary) text-(--text-primary) text-[13px] outline-none focus:border-(--accent-color)";
const numberInputClass = "w-full max-w-30 py-2 px-3 border border-(--border-color) rounded bg-(--bg-primary) text-(--text-primary) text-[13px] outline-none focus:border-(--accent-color)";
const checkboxLabelClass = "flex items-center gap-2 text-[13px] text-(--text-primary) cursor-pointer";
const hintClass = "mt-1.5 text-xs text-(--text-muted)";

function AppearanceSettings({ settings, updateSetting }: SettingsPanelProps) {
  return (
    <div>
      <h3 className={sectionTitleClass}>Appearance</h3>

      <div className={groupClass}>
        <label htmlFor="theme" className={labelClass}>Theme</label>
        <select
          id="theme"
          value={settings.theme}
          onChange={(e) => updateSetting('theme', e.target.value as Theme)}
          className={inputClass}
        >
          <option value="system">System</option>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
        <p className={hintClass}>Choose your preferred color theme</p>
      </div>

      <div className={groupClass}>
        <label htmlFor="fontSize" className={labelClass}>Font Size</label>
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
        <label className={checkboxLabelClass}>
          <input
            type="checkbox"
            checked={settings.show_line_numbers}
            onChange={(e) => updateSetting('show_line_numbers', e.target.checked)}
            className="w-4 h-4 cursor-pointer"
          />
          <span>Show line numbers</span>
        </label>
        <p className={hintClass}>Display line numbers in diff and file views</p>
      </div>
    </div>
  );
}

function GitSettings({ settings, updateSetting }: SettingsPanelProps) {
  return (
    <div>
      <h3 className={sectionTitleClass}>Git</h3>

      <div className={groupClass}>
        <label htmlFor="defaultBranch" className={labelClass}>Default Branch Name</label>
        <input
          id="defaultBranch"
          type="text"
          value={settings.default_branch_name}
          onChange={(e) => updateSetting('default_branch_name', e.target.value)}
          className={inputClass}
        />
        <p className={hintClass}>Default branch name for new repositories</p>
      </div>

      <div className={groupClass}>
        <label htmlFor="autoFetch" className={labelClass}>Auto-fetch Interval (minutes)</label>
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
        <label className={checkboxLabelClass}>
          <input
            type="checkbox"
            checked={settings.confirm_before_discard}
            onChange={(e) => updateSetting('confirm_before_discard', e.target.checked)}
            className="w-4 h-4 cursor-pointer"
          />
          <span>Confirm before discarding changes</span>
        </label>
        <p className={hintClass}>Show confirmation dialog before discarding changes</p>
      </div>

      <div className={groupClass}>
        <label className={checkboxLabelClass}>
          <input
            type="checkbox"
            checked={settings.sign_commits}
            onChange={(e) => updateSetting('sign_commits', e.target.checked)}
            className="w-4 h-4 cursor-pointer"
          />
          <span>Sign commits with GPG</span>
        </label>
        <p className={hintClass}>Automatically sign commits using GPG</p>
      </div>
    </div>
  );
}

function DiffSettings({ settings, updateSetting }: SettingsPanelProps) {
  return (
    <div>
      <h3 className={sectionTitleClass}>Diff & Editor</h3>

      <div className={groupClass}>
        <label htmlFor="contextLines" className={labelClass}>Context Lines</label>
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
        <label className={checkboxLabelClass}>
          <input
            type="checkbox"
            checked={settings.diff_word_wrap}
            onChange={(e) => updateSetting('diff_word_wrap', e.target.checked)}
            className="w-4 h-4 cursor-pointer"
          />
          <span>Word wrap in diff view</span>
        </label>
        <p className={hintClass}>Wrap long lines in diff view</p>
      </div>

      <div className={groupClass}>
        <label className={checkboxLabelClass}>
          <input
            type="checkbox"
            checked={settings.diff_side_by_side}
            onChange={(e) => updateSetting('diff_side_by_side', e.target.checked)}
            className="w-4 h-4 cursor-pointer"
          />
          <span>Side-by-side diff view</span>
        </label>
        <p className={hintClass}>Show diffs in split view by default</p>
      </div>

      <h3 className={sectionTitleClass}>Commit</h3>

      <div className={groupClass}>
        <label htmlFor="commitWidth" className={labelClass}>Commit Message Width</label>
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
        <label className={checkboxLabelClass}>
          <input
            type="checkbox"
            checked={settings.spell_check_commit_messages}
            onChange={(e) => updateSetting('spell_check_commit_messages', e.target.checked)}
            className="w-4 h-4 cursor-pointer"
          />
          <span>Spell check commit messages</span>
        </label>
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
        <label htmlFor="terminalFont" className={labelClass}>Font Family</label>
        <input
          id="terminalFont"
          type="text"
          value={settings.terminal_font_family}
          onChange={(e) => updateSetting('terminal_font_family', e.target.value)}
          className={inputClass}
        />
        <p className={hintClass}>Font family for terminal output</p>
      </div>

      <div className={groupClass}>
        <label htmlFor="terminalFontSize" className={labelClass}>Font Size</label>
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
