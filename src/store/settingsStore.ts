import { create } from 'zustand';
import type { AppSettings, Theme } from '../types';
import { settingsApi } from '../services/api';

interface SettingsState {
  settings: AppSettings | null;
  isLoading: boolean;
  error: string | null;

  loadSettings: () => Promise<void>;
  updateSettings: (settings: AppSettings) => Promise<void>;
  setTheme: (theme: Theme) => void;
  getEffectiveTheme: () => 'light' | 'dark';
}

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

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: null,
  isLoading: false,
  error: null,

  loadSettings: async () => {
    set({ isLoading: true, error: null });
    try {
      const settings = await settingsApi.get();
      set({ settings, isLoading: false });
      // Apply theme on load
      applyTheme(settings.theme);
    } catch (error) {
      console.error('Failed to load settings:', error);
      set({ settings: DEFAULT_SETTINGS, isLoading: false, error: 'Failed to load settings' });
      applyTheme(DEFAULT_SETTINGS.theme);
    }
  },

  updateSettings: async (settings: AppSettings) => {
    try {
      await settingsApi.save(settings);
      set({ settings });
      applyTheme(settings.theme);
    } catch (error) {
      console.error('Failed to save settings:', error);
      throw error;
    }
  },

  setTheme: (theme: Theme) => {
    const { settings } = get();
    if (settings) {
      set({ settings: { ...settings, theme } });
      applyTheme(theme);
    }
  },

  getEffectiveTheme: () => {
    const { settings } = get();
    const theme = settings?.theme || 'system';
    if (theme === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return theme;
  },
}));

function applyTheme(theme: Theme) {
  const effectiveTheme = theme === 'system'
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : theme;

  document.documentElement.setAttribute('data-theme', effectiveTheme);
}

// Listen for system theme changes
if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const { settings } = useSettingsStore.getState();
    if (settings?.theme === 'system') {
      applyTheme('system');
    }
  });
}
